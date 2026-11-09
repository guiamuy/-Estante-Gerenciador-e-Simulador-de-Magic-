// G-353 · relatos #53/#66 (pedido do dono, 07/11/2026): "a aplicação está misturada em inglês e português, e isso não pode
// acontecer. Apenas as imagens das cartas podem estar em inglês". Esta fatia: o português, idioma padrão, cobre a interface.
// O texto e o nome das cartas (Oracle da Scryfall) ficam fora: aguardam a decisão do dono entre texto oficial e tradução.
// Três barreiras, sem navegador:
//   1. toda palavra-chave que o motor conhece tem nome em português na mesa (o registro e a carta caíam na chave: "ganhou flash");
//   2. todo tipo de marcador tem nome em português no registro e na carta (a carta dizia "charge 2", o registro "marcador stun");
//   3. nenhum texto de interface (literal das telas) usa as palavras inglesas encontradas no levantamento desta leva.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules, HTML } from './_load.mjs';
const { scripts: SC, table: T, mesaUi: U } = loadModules();

// o termo oficial em português é o mesmo do inglês (modular, blitz, mentor, bushido): não é chave vazando
const MESMO_TERMO = ['modular', 'blitz', 'mentor', 'bushido'];

test('G-353 · idioma · toda palavra-chave do motor (e todo marcador de palavra-chave) tem nome em português na mesa', () => {
  const faltam = [...new Set([...SC.KEYWORDS, ...SC.KEYWORD_COUNTERS].map(k => k.toLowerCase()))].filter(k => !T.PALAVRA_PT[k]);
  assert.deepEqual(faltam, [], 'palavras sem nome em português (a mesa mostraria em inglês): ' + faltam.join(', '));
  for (const [k, v] of Object.entries(T.PALAVRA_PT)) assert.ok(typeof v === 'string' && v && v !== k || MESMO_TERMO.includes(k), `${k}: o nome é o próprio termo inglês`);
});

// chave de marcador que já é a palavra portuguesa (H-6 · energia)
const JA_EM_PORTUGUES = ['energia'];

test('G-353 · idioma · todo tipo de marcador tem nome em português no registro e na carta, nunca a chave inglesa', () => {
  const doMotor = [...HTML.matchAll(/counters\.([a-z][a-z0-9]*)\b/g)].map(m => m[1]).filter(t => !['length'].includes(t));
  const tipos = [...new Set([...doMotor, ...Object.keys(SC.MARCADOR_PT), ...SC.KEYWORD_COUNTERS, ...Object.keys(U.MARCADOR_NOME)])];
  assert.ok(tipos.includes('stun') && tipos.includes('charge') && tipos.includes('lifelink'), 'tipos lidos: ' + tipos.join(', '));
  for (const tipo of tipos) {
    assert.ok(SC.MARCADOR_PT[tipo], `${tipo}: sem nome no registro ("marcador ${tipo}")`);
    assert.ok(U.MARCADOR_NOME[tipo], `${tipo}: sem nome na carta da mesa`);
    const curto = U.nomeCurtoDoMarcador(tipo);
    if (/^[a-z ]+$/.test(tipo) && !JA_EM_PORTUGUES.includes(tipo)) {
      assert.notEqual(curto, tipo, `${tipo}: a carta mostraria a chave inglesa`);
      const e = U.estadoDesenhavel({ k: 'marcador', tipo, qtd: 2 });
      assert.ok(!new RegExp(`\\b${tipo}\\b`).test(e.explica), `${tipo}: a explicação diz "${e.explica}"`);
    }
  }
  assert.equal(U.nomeCurtoDoMarcador('charge'), 'carga');
  assert.equal(U.nomeCurtoDoMarcador('stun'), 'atordoamento');
  // os dois lugares que montam o texto do marcador na carta (modelo da mesa e carta sem modelo) não caem mais na chave
  assert.ok(!/texto: k === 'p1p1'[^\n]*: `\$\{k\} \$\{v\}`/.test(HTML), 'a carta montava "${k} ${v}" (ex.: "charge 2")');
});

/* ---------- 3 · literais das telas ---------- */
// Módulos de interface: tudo menos o motor (scripts, core, leitor e bot falam a língua do Oracle, que é dado) e as listas prontas.
const FORA = /src\/engine\/|src\/data\/starter-decks\.js|src\/data\/scryfall\.js/;
function literaisDaInterface() {
  const marcas = [...HTML.matchAll(/\/\* ==== (src\/[^ ]+) ==== \*\//g)].map(m => ({ nome: m[1], i: m.index }));
  const out = [];
  marcas.forEach((m, k) => {
    if (FORA.test(m.nome)) return;
    const trecho = HTML.slice(m.i, k + 1 < marcas.length ? marcas[k + 1].i : HTML.lastIndexOf('</script>'));
    const linhas = trecho.split('\n');
    linhas.forEach((l, n) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(l)) return; // comentário
      for (const x of l.matchAll(/(["'`])((?:(?!\1)[^\\\n]|\\.){2,240})\1/g)) out.push({ modulo: m.nome, linha: l, texto: x[2] });
    });
  });
  return out;
}
// As palavras e expressões inglesas que o levantamento desta leva achou em texto de interface (e as de sempre, para não voltarem).
// Cada uma casa só em literal que parece texto (tem espaço ou começa com maiúscula), nunca em id, classe ou chave de dados.
const BARRADAS = [
  [/\bRulings?\b/i, 'a seção da carta é "Esclarecimentos"'],
  [/\bNear Mint\b/, 'condição "Quase nova" (NM)'],
  [/\bEtched\b/, 'acabamento "Foil gravado"'],
  [/^Offline$/, 'ladrilho "Sem internet"'],
  [/\b(disponível|pronta|pronto|jogar|usar) offline\b/, '"sem internet", na voz do app'],
  [/^(Loading|Cancel|Save|Delete|Retry|Settings|Search|Undo|Close|Back|Next|Done|Error|Share|Submit|Untap|Upkeep|Cleanup|Graveyard|Library|Battlefield|Tokens|Sideboard|Mulligan again|Keep)$/, 'rótulo inglês solto'],
  [/\b(Loading|Please|Failed|[Tt]ry again|[Ss]omething went wrong|[Aa]re you sure)\b/, 'frase de sistema em inglês'],
];
// Exceções explícitas: o literal fica como está, com o motivo.
const EXCECOES = [
  [l => /COND_EXPORT|LANG_EXPORT/.test(l), 'exportação CSV: o arquivo segue o formato dos outros apps (ManaBox, Moxfield), em inglês'],
  [l => /Section\('Tokens'/.test(l), 'rota /ds: catálogo do design system para quem desenvolve; "tokens" é o nome técnico'],
  [l => /"Sideboard"|'Sideboard'/.test(l) && /Moxfield|Arena|sob \\?"Sideboard|cabeçalho/i.test(l), 'cabeçalho do formato de exportação de listas: é o que o usuário cola de outro app'],
  [l => /block\('side', 'Sideboard'\)/.test(l), 'texto exportado da lista (formato Moxfield/Arena), lido por outros apps'],
  // G-364 · saiu a exceção "Submit new issue": o app não abre mais a página de registro do GitHub
];
const pareceTexto = s => / /.test(s.replace(/\$\{[^}]*\}/g, 'X').trim()) || /^[A-Z][a-z]+$/.test(s);

test('G-353 · idioma · nenhum texto de interface com as palavras inglesas do levantamento (exceções comentadas)', () => {
  const achados = [];
  for (const { modulo, linha, texto } of literaisDaInterface()) {
    if (!pareceTexto(texto)) continue;
    if (/[{}();=<>[\]|&]/.test(texto.replace(/\$\{[^}]*\}/g, ''))) continue; // código, não texto
    if (/^\s*[,:]|[\w]: *$/.test(texto)) continue; // pedaço de código entre duas aspas (", loading: ")
    const hit = BARRADAS.find(([re]) => re.test(texto));
    if (!hit) continue;
    if (EXCECOES.some(([f]) => f(linha))) continue;
    achados.push(`${modulo}: "${texto.slice(0, 80)}" → ${hit[1]}`);
  }
  assert.deepEqual(achados, [], 'texto de interface em inglês:\n' + achados.join('\n'));
});

test('G-353 · idioma · as exceções e as barreiras não estão mortas (cada uma ainda casa com algo, ou com o caso que barra)', () => {
  assert.ok(BARRADAS[0][0].test('Rulings') && BARRADAS[3][0].test('Offline') && !BARRADAS[3][0].test('offline.prontas'));
  assert.ok(pareceTexto('Rulings') && pareceTexto('Buscando rulings…') && !pareceTexto('card-rulings') && !pareceTexto('offline.prontas'));
  assert.match(HTML, /COND_EXPORT = \{ NM: 'Near Mint'/, 'a exportação CSV continua em inglês, de propósito');
  for (const [, motivo] of EXCECOES) assert.ok(motivo.length > 20);
});
