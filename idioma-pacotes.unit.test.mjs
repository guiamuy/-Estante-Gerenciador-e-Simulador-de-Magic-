// G-361 · T-IDIOMA fatia 4 (relatos #53/#66): a camada de idioma e os pacotes en/es.
// A camada obrigatória: todo texto de tela em português do index.html tem tradução nos dois pacotes. Texto novo sem
// tradução derruba o portão; para ver o que falta: `node idioma-extrai.mjs --faltam en` (e `es`).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadModules } from './_load.mjs';
import { extrai, faltam, literais, ehTela, pedacos } from './idioma-extrai.mjs';
const { idioma: I } = loadModules();
const HTML = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const PACOTES = Object.fromEntries(['en', 'es'].map(id => [id, JSON.parse(readFileSync(new URL(`./idiomas/${id}.json`, import.meta.url), 'utf8'))]));
const lacunas = s => (String(s).match(/\{\d+\}/g) || []).sort().join(',');

test('G-361 · tradutor: frase exata, a mesma frase com outros números, modelo com lacunas (o trecho da lacuna também traduz), espaços da ponta preservados pela camada, o que não tem tradução fica', () => {
  const t = I.criaTradutor({ exato: { 'Salvar': 'Save', '3 esclarecimentos': '3 rulings', 'aberto': 'open', 'Você tem 2 cartas.': 'You have 2 cards.' },
    modelos: [['{0} de {1} cartas', '{0} of {1} cards'], ['Relatos: {0}', 'Reports: {0}'], ['{0} {1}', '{0} {1}']] });
  assert.equal(t.traduz('Salvar'), 'Save');
  assert.equal(t.traduz('  Salvar  '), 'Save', 'a camada repõe os espaços; o tradutor olha o texto limpo');
  assert.equal(t.traduz('12 esclarecimentos'), '12 rulings', 'mesma frase, outro número');
  assert.equal(t.traduz('Você tem 40 cartas.'), 'You have 40 cards.');
  assert.equal(t.traduz('7 de 60 cartas'), '7 of 60 cards');
  assert.equal(t.traduz('Relatos: aberto'), 'Reports: open', 'o que cai na lacuna também é traduzido');
  assert.equal(t.traduz('Lightning Bolt'), null, 'sem tradução: fica como está');
  assert.equal(t.traduz('123'), null, 'só número: nada a traduzir');
  assert.equal(t.traduz(''), null);
  // modelo só de lacunas ("{0} {1}") não entra: casaria com qualquer texto
  assert.equal(t.traduz('Lightning Bolt'), null);
});

test('G-361 · leitor do código: literais simples e modelos (lacuna vira {n}), sem comentários nem expressões regulares; marcação HTML parte o texto', () => {
  const js = "const a = 'Salvar lista'; // 'comentário não conta'\n/* 'nem este' */ const r = /'não é texto'/g; const b = `Você tem ${n} cartas`; const c = x / 2 + 'Fechar a folha';";
  const l = literais(js).map(x => x.texto);
  assert.deepEqual(l, ['Salvar lista', 'Você tem {0} cartas', 'Fechar a folha']);
  assert.deepEqual(pedacos('<b>Não foi possível</b> Confira a conexão.').map(s => s.trim()).filter(Boolean), ['Não foi possível', 'Confira a conexão.']);
  assert.equal(ehTela('Salvar lista'), true);
  assert.equal(ehTela('ds-surface ds-expansivel__cabeca perfil-atalho'), false, 'classes CSS ficam fora');
  assert.equal(ehTela('cartas.texto.pt'), false, 'chave do armazenamento fica fora');
  assert.equal(ehTela('https://api.scryfall.com'), false);
  assert.equal(ehTela('Lightning Bolt deals 3 damage to any target.'), false, 'texto em inglês fica fora');
});

for (const id of ['en', 'es']) {
  test(`G-361 · camada obrigatória: todo texto de tela do app tem tradução no pacote ${id} (texto novo nasce traduzido)`, () => {
    const f = faltam(extrai(HTML), PACOTES[id]);
    assert.deepEqual(f.exatos.slice(0, 15), [], `${f.exatos.length} texto(s) sem tradução em idiomas/${id}.json — veja: node idioma-extrai.mjs --faltam ${id}`);
    assert.deepEqual(f.modelos.slice(0, 15), [], `${f.modelos.length} modelo(s) sem tradução em idiomas/${id}.json — veja: node idioma-extrai.mjs --faltam ${id}`);
  });
  test(`G-361 · pacote ${id}: toda tradução tem as mesmas lacunas do português, nenhuma vazia, e os nomes próprios ficam como estão`, () => {
    const p = PACOTES[id];
    for (const [pt, tr] of Object.entries(p.exato)) { assert.equal(typeof tr, 'string', pt); assert.ok(tr.trim(), `vazia: ${pt}`); }
    for (const [pt, tr] of p.modelos) { assert.equal(lacunas(tr), lacunas(pt), `lacunas diferentes: "${pt}" → "${tr}"`); assert.ok(tr.trim()); }
    for (const nome of ['Estante', 'Shark', 'Scryfall', 'Pauper', 'Commander']) {
      for (const [pt, tr] of Object.entries(p.exato)) if (new RegExp(`\\b${nome}\\b`).test(pt)) assert.match(tr, new RegExp(`\\b${nome}\\b`), `"${nome}" sumiu em: ${pt} → ${tr}`);
    }
  });
}

test('G-361 · serviço: o idioma guardado volta na abertura; trocar baixa o pacote, guarda no aparelho e avisa quem ouve; sem internet e sem cópia, o idioma de antes fica e o erro sobe', async () => {
  const local = new Map(); const ls = { getItem: k => local.get(k) ?? null, setItem: (k, v) => local.set(k, v) };
  const store = new Map(); const st = { get: async k => store.get(k), set: async (k, v) => { store.set(k, v); } };
  let rede = true, pedidos = 0;
  const fetch = async url => { pedidos++; if (!rede) throw new Error('sem rede'); return { ok: true, json: async () => ({ exato: { Salvar: url.includes('en') ? 'Save' : 'Guardar' }, modelos: [] }) }; };
  const S = I.createIdioma({ store: st, fetch, local: ls, raiz: null });
  assert.equal(S.atual, 'pt');
  const ouvidos = []; S.aoTrocar(id => ouvidos.push(id));
  await S.escolhe('en');
  assert.equal(S.atual, 'en'); assert.equal(local.get('estante.idioma'), 'en'); assert.equal(store.get('idioma'), 'en');
  assert.ok(store.get('idioma.pacote.en'), 'o pacote fica no aparelho'); assert.deepEqual(ouvidos, ['en']);
  assert.equal(await S.guardado('en'), true); assert.equal(await S.guardado('es'), false); assert.equal(await S.guardado('pt'), true);
  // sem internet: espanhol (sem cópia) falha e o inglês continua
  rede = false;
  await assert.rejects(S.escolhe('es'));
  assert.equal(S.atual, 'en'); assert.equal(local.get('estante.idioma'), 'en');
  // sem internet, mas com cópia: vale na hora
  await S.escolhe('pt'); await S.escolhe('en'); assert.equal(S.atual, 'en');
  // na próxima abertura, o idioma guardado volta
  const S2 = I.createIdioma({ store: st, fetch, local: ls, raiz: null });
  assert.equal(S2.atual, 'en');
  await assert.rejects(S.escolhe('xx'));
  assert.ok(pedidos >= 2);
});

test('G-361 · tradutor: frases que o código junta ("A · B", duas frases seguidas) traduzem pedaço a pedaço', () => {
  const t = I.criaTradutor({ exato: { 'Tema claro': 'Light theme', 'toque para o escuro': 'tap for dark', 'Sem internet.': 'Offline.', 'Tente de novo.': 'Try again.' }, modelos: [] });
  assert.equal(t.traduz('Tema claro · toque para o escuro'), 'Light theme · tap for dark');
  assert.equal(t.traduz('Sem internet. Tente de novo.'), 'Offline. Try again.');
  assert.equal(t.traduz('Lightning Bolt · Counterspell'), null, 'nada traduzível: fica como está');
});

test('G-361 · tradutor: número ou sinal na ponta, lacuna vazia no fim do modelo e frases juntadas por vírgula', () => {
  const t = I.criaTradutor({ exato: { 'guardado para jogar sem internet': 'saved to play offline', 'Motor': 'Engine', 'pronta para jogar sem internet': 'ready to play offline' },
    modelos: [['Motor: roda a lista inteira (100%){0}', 'Engine: runs the whole deck (100%){0}']] });
  assert.equal(t.traduz('0% guardado para jogar sem internet'), '0% saved to play offline');
  assert.equal(t.traduz('Motor: roda a lista inteira (100%)'), 'Engine: runs the whole deck (100%)', 'a lacuna do fim pode vir vazia');
  assert.equal(t.traduz('Motor 100%, pronta para jogar sem internet'), 'Engine 100%, ready to play offline');
});
