// P-1 · HTML seguro nos avisos (auditoria de segurança de 09/10/2026): `Note` trata texto como texto; HTML só entra por
// `seguro\`…\``, que escapa toda interpolação. Prova controlada com DOM mínimo e contrato estático sobre o index.html.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadModules } from './_load.mjs';
const { components: F5 } = loadModules();
const FONTE = readFileSync(new URL('./index.html', import.meta.url), 'utf8');

function comDomMinimo(fn) {
  const el = () => ({ attrs: {}, children: [], style: {}, dataset: {}, className: '', html: null, set innerHTML(v) { this.html = v; }, get innerHTML() { return this.html; },
    setAttribute(k, v) { this.attrs[k] = v; }, appendChild(c) { this.children.push(c); return c; }, addEventListener() {} });
  const realm = F5.h.constructor('return this')();
  const antes = realm.document; realm.document = { createElement: el, createTextNode: t => ({ text: t }) };
  try { return fn(); } finally { realm.document = antes; }
}
const CARGA = '<img src=x onerror="window.__sonda=1">';

test('P-1 · Note com texto de fora mostra o texto, nunca vira HTML; com seguro`…` o HTML do código entra e o que é interpolado sai escapado', () => comDomMinimo(() => {
  const n = F5.Note(`Cartas: ${CARGA}`, 'warning');
  assert.equal(n.html, null, 'texto não vai para innerHTML');
  assert.deepEqual(n.children.map(c => c.text), [`Cartas: ${CARGA}`]);
  const s = F5.seguro`<b>Esta lista ainda não joga.</b> ${['Bolt', CARGA].join(', ')} · ${3} · ${null}${undefined}`;
  assert.equal(F5.Note(s).html, '<b>Esta lista ainda não joga.</b> Bolt, &lt;img src=x onerror=&quot;window.__sonda=1&quot;&gt; · 3 · ');
  // aninhar: o HTML de dentro vale; lista de pedaços seguros é juntada
  const linhas = ['um', CARGA].map((t, i) => F5.seguro`${i ? F5.seguro`<br>` : ''}<b>!</b> ${t}`);
  assert.equal(F5.Note(F5.seguro`${linhas}`).html, '<b>!</b> um<br><b>!</b> &lt;img src=x onerror=&quot;window.__sonda=1&quot;&gt;');
  assert.equal(F5.Note(F5.seguro`a & b`).html, 'a & b', 'o texto fixo do código não é tocado');
}));

// contrato: lê cada chamada Note( no index.html e o primeiro argumento dela
function leModelo(src, i) { // src[i] === '`' → índice depois do fechamento, com ${…} e modelos aninhados
  for (let j = i + 1; j < src.length; j++) {
    if (src[j] === '\\') { j++; continue; }
    if (src[j] === '`') return j + 1;
    if (src[j] === '$' && src[j + 1] === '{') { let d = 1; j += 2; for (; j < src.length && d; j++) { if (src[j] === '`') { j = leModelo(src, j) - 1; continue; } if (src[j] === "'" || src[j] === '"') { const q = src[j]; for (j++; j < src.length && src[j] !== q; j++) if (src[j] === '\\') j++; continue; } if (src[j] === '{') d++; else if (src[j] === '}') d--; } j--; }
  }
  throw new Error('modelo sem fim em ' + i);
}
const linhaDe = i => FONTE.slice(0, i).split('\n').length;
test('P-1 · contrato: nenhuma chamada de Note recebe modelo sem `seguro` nem texto fixo com marcação; dentro de `seguro` nada de esc/escapa (escaparia duas vezes)', () => {
  const ruins = [], chamadas = [];
  for (const m of FONTE.matchAll(/\bNote\(/g)) {
    const ini = m.index + m[0].length, resto = FONTE.slice(ini, ini + 40);
    if (/^content, tone\)/.test(resto) || /^\s*\)/.test(resto)) continue; // a própria definição
    chamadas.push(linhaDe(m.index));
    const c = FONTE[ini];
    if (c === '`') ruins.push(`${linhaDe(m.index)}: modelo sem seguro`);
    else if ((c === "'" || c === '"') && /^.[^'"]*</.test(FONTE.slice(ini, ini + 400))) ruins.push(`${linhaDe(m.index)}: texto fixo com marcação`);
  }
  for (const m of FONTE.matchAll(/seguro`/g)) {
    const i = m.index + m[0].length - 1, corpo = FONTE.slice(i, leModelo(FONTE, i));
    if (/\b(esc|escapa|escapeHtml)\(/.test(corpo)) ruins.push(`${linhaDe(m.index)}: esc dentro de seguro`);
  }
  assert.ok(chamadas.length >= 30, 'achou as chamadas: ' + chamadas.length);
  assert.deepEqual(ruins, []);
});
