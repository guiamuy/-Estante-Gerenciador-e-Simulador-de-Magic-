// P-5 · SEG4 · todo ponto do index.html que vira HTML (chave `html:` de h(), `.innerHTML =`) está numa lista fechada,
// com o que pode ser interpolado em cada um; sumidouros que o app não usa (insertAdjacentHTML, outerHTML, document.write,
// DOMParser, createContextualFragment, srcdoc) não podem aparecer. Prova controlada com DOM mínimo: o símbolo de mana
// com código estranho vira texto, e tamanho que não é número não entra no desenho.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadModules } from './_load.mjs';
const { components: F5 } = loadModules();
const FONTE = readFileSync(new URL('./index.html', import.meta.url), 'utf8');

function comDomMinimo(fn) {
  const el = tag => ({ tag, attrs: {}, children: [], style: { setProperty() {} }, dataset: {}, className: '', html: null, set innerHTML(v) { this.html = v; }, get innerHTML() { return this.html; },
    setAttribute(k, v) { this.attrs[k] = v; }, removeAttribute(k) { delete this.attrs[k]; }, appendChild(c) { this.children.push(c); return c; }, addEventListener() {},
    querySelector() { return { appendChild() {} }; } });
  const realm = F5.h.constructor('return this')();
  const antes = realm.document; realm.document = { createElement: el, createTextNode: t => ({ text: t }) };
  try { return fn(); } finally { realm.document = antes; }
}
const CARGA = '<img src=x onerror="window.__sonda=1">';
const textoDe = el => (el.children || []).map(c => (c && c.text !== undefined ? c.text : textoDe(c))).join('');

test('P-5 · símbolo de mana com código fora do alfabeto vira texto; os de verdade continuam desenhados', () => comDomMinimo(() => {
  const ruim = F5.Simbolo(CARGA);
  assert.ok(!/<img/i.test(String(ruim.html || '')), 'nada do código estranho entra no HTML (o código sai em maiúsculas, que o HTML aceita igual): ' + ruim.html);
  assert.equal(textoDe(ruim), '{' + CARGA + '}', 'aparece como texto, como estava escrito');
  for (const c of ['W', 'u', '2', '10', 'X', 'T', 'W/U', '2/W', 'U/P', 'C']) {
    const s = F5.Simbolo(c);
    assert.match(String(s.html), /<svg viewBox="0 0 24 24"/, 'desenhado: ' + c);
    assert.ok(String(s.html).includes(`{${c.toUpperCase()}}`), 'com o texto original escondido: ' + c);
  }
}));

test('P-5 · tamanho que não é número não entra no desenho (ícone, símbolo, bandeira, anel)', () => comDomMinimo(() => {
  const t = '20" onload="window.__sonda=1';
  for (const [nome, el] of [['Icone', F5.Icone('marcar', { tamanho: t })], ['Simbolo', F5.Simbolo('W', { tamanho: t })],
    ['Bandeira', F5.Bandeira('br', { tamanho: t })], ['AnelProgresso', F5.AnelProgresso(50, { tamanho: t })]]) {
    assert.ok(!/onload/.test(String(el.html)), nome + ' sem o texto do tamanho: ' + el.html);
  }
  assert.match(String(F5.Icone('marcar', { tamanho: 24 }).html), /width="24" height="24"/, 'número continua valendo');
}));

// ---- contrato estático ----
function fimModelo(s, i) { for (let j = i + 1; j < s.length; j++) { if (s[j] === '\\') { j++; continue; } if (s[j] === '`') return j + 1; if (s[j] === '$' && s[j + 1] === '{') j = fimExpr(s, j + 2, '}'); } throw new Error('modelo sem fim em ' + i); }
function fimExpr(s, j, fecha) {
  let d = 0;
  for (; j < s.length; j++) {
    const c = s[j];
    if (c === '`') { j = fimModelo(s, j) - 1; continue; }
    if (c === "'" || c === '"') { for (j++; j < s.length && s[j] !== c; j++) if (s[j] === '\\') j++; continue; }
    if ('([{'.includes(c)) d++;
    else if (')]}'.includes(c)) { if (d === 0) return j; d--; }
    else if (d === 0 && (c === fecha || (fecha === ',' && c === ';') || (fecha === ';' && c === '\n'))) return j;
  }
  return j;
}
function interpolacoes(modelo) {
  const out = [];
  for (let j = 1; j < modelo.length - 1; j++) {
    if (modelo[j] === '\\') { j++; continue; }
    if (modelo[j] === '$' && modelo[j + 1] === '{') { const f = fimExpr(modelo, j + 2, '}'); out.push(modelo.slice(j + 2, f).trim()); j = f; }
  }
  return out;
}
const dono = i => { let n = null; for (const m of FONTE.slice(Math.max(0, i - 6000), i).matchAll(/(?:function\s+(\w+)\s*\(|const\s+(\w+)\s*=\s*(?:\([^)]*\)|\w+)\s*=>)/g)) n = m[1] || m[2]; return n; };
function sumidouros() {
  const out = [];
  for (const m of FONTE.matchAll(/\.innerHTML\s*=\s*|[{,]\s*html:\s*/g)) {
    const ini = m.index + m[0].length, tipo = m[0].includes('innerHTML') ? 'innerHTML' : 'html:';
    const o = { onde: `${dono(m.index)} · ${tipo}`, linha: FONTE.slice(0, m.index).split('\n').length };
    if (FONTE[ini] === '`') o.vale = interpolacoes(FONTE.slice(ini, fimModelo(FONTE, ini)));
    else o.vale = [FONTE.slice(ini, fimExpr(FONTE, ini, tipo === 'html:' ? ',' : ';')).trim()];
    out.push(o);
  }
  return out;
}
/** A lista fechada: onde o app monta HTML e o que pode entrar em cada lugar. Tudo nasceu no código ou é número
    conferido; o texto de fora chega por `seguro\`…\`` (escapado) ou por h() com texto. Mudou um destes? Revise o
    caminho do dado até a origem antes de atualizar a lista. */
const PERMITIDOS = [
  { onde: 'h · innerHTML', vale: ['v'], por: 'a chave html: de h(); cada uso dela está nesta lista' },
  { onde: 'Icone · innerHTML', vale: ['px', 'px', "ICONES[nome] || ''"], por: 'tamanho virou número; o desenho vem da tabela ICONES do código' },
  { onde: 'Simbolo · innerHTML', vale: ["px ? ` width=\"${px}\" height=\"${px}\"` : ''", 'corpo', 'c'], por: 'código conferido contra o alfabeto de símbolos antes; corpo montado de tabelas do código' },
  { onde: 'AnelProgresso · innerHTML', vale: ['px', 'px', 'r', 'r', 'c.toFixed(2)', '(c * (1 - v / 100)).toFixed(2)', "v >= 100 ? '' : v + '%'"], por: 'só números (v é limitado a 0–100)' },
  { onde: 'Note · html:', vale: ['ehSeguro(content) ? content[SEGURO] : null'], por: 'só HTML marcado por seguro`…` (P-1)' },
  { onde: 'ArteDeEspera · html:', vale: ['ARTE_CARREGANDO'], por: 'desenho fixo do código' },
  { onde: 'Bandeira · innerHTML', vale: ['Math.round(px * 1.5)', 'px', "BANDEIRAS[pais] || ''"], por: 'tamanho virou número; desenho da tabela BANDEIRAS' },
  { onde: 'mostraAbertura · innerHTML', vale: ['iconeDoApp({ tamanho: 240, animado: true })'], por: 'ícone do app, gerado pelo código' },
  ...[16, 32, 64, 128].map(n => ({ onde: 'pinta · html:', vale: [`logoSvg(${n})`], por: 'catálogo /ds: marca do app' })),
  { onde: 'pinta · html:', vale: ['logoLockup(30)'], por: 'catálogo /ds: marca do app' },
  { onde: 'pinta · html:', vale: ["logoSvg(32, 'mono')"], por: 'catálogo /ds: marca do app' },
  { onde: 'pintaContorno · innerHTML', vale: ['W.toFixed(1)', 'H.toFixed(1)', "pts.map(q => `${(q.x - x0).toFixed(1)},${(q.y - y0).toFixed(1)}`).join(' ')"], por: 'scanner: só números da moldura' },
  { onde: 'appBar · html:', vale: ['logoLockup(30)'], por: 'marca do app na barra' }
];

test('P-5 · contrato: todo ponto que vira HTML está na lista fechada, com exatamente o que pode ser interpolado nele', () => {
  const achados = sumidouros();
  assert.ok(achados.length >= 15, 'achou os pontos: ' + achados.length);
  const chave = x => x.onde + ' ⟶ ' + JSON.stringify(x.vale);
  const esperado = PERMITIDOS.map(chave).sort(), real = achados.map(chave).sort();
  const novos = achados.filter(a => !esperado.includes(chave(a))).map(a => `linha ${a.linha}: ${chave(a)}`);
  const sumiram = PERMITIDOS.filter(p => !real.includes(chave(p))).map(chave);
  assert.deepEqual({ novos, sumiram }, { novos: [], sumiram: [] },
    'ponto novo de HTML ou interpolação nova: siga o dado até a origem; texto de fora vai por h() com texto ou por seguro`…`, e só então acrescente aqui com o motivo');
});

test('P-5 · contrato: os sumidouros de HTML que o app não usa não aparecem', () => {
  const proibidos = [/insertAdjacentHTML/, /\.outerHTML\s*=/, /document\.write\s*\(/, /new\s+DOMParser/, /createContextualFragment/, /\bsrcdoc\b/];
  const achados = proibidos.filter(rx => rx.test(FONTE)).map(String);
  assert.deepEqual(achados, []);
});
