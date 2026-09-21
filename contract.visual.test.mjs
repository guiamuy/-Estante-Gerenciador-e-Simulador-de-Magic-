// Camada 5 · contrato visual: tokens como única fonte de cor, contraste AA
// nos dois temas, alvo de toque e temas claros sem divergência.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HTML } from './_load.mjs';

const css = HTML.slice(HTML.indexOf('<style>') + 7, HTML.indexOf('</style>'));
const TOKENS_END = css.indexOf('F5 · BASE + COMPONENTES');
const tokenCss = css.slice(0, TOKENS_END), componentCss = css.slice(TOKENS_END);

const block = sel => { const i = tokenCss.indexOf(sel); const j = tokenCss.indexOf('}', i); return tokenCss.slice(i, j); };
const vars = txt => Object.fromEntries([...txt.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)].map(m => [m[1], m[2].trim()]));
const DARK = vars(block(':root {'));
const LIGHT = { ...DARK, ...vars(block(':root[data-theme="light"]')) };
const AUTO_LIGHT = vars(block(':root:not([data-theme="dark"]):not([data-theme="light"])'));

function lum(hex) {
  const n = hex.replace('#', ''); const f = n.length === 3 ? n.split('').map(c => c + c).join('') : n;
  return [0, 2, 4].map(i => parseInt(f.slice(i, i + 2), 16) / 255)
    .map(c => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
    .reduce((acc, c, i) => acc + c * [0.2126, 0.7152, 0.0722][i], 0);
}
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

// Pares texto/fundo que a interface realmente usa.
const PAIRS = [
  ['--fg', '--bg'], ['--fg', '--bg-elev-1'], ['--fg', '--bg-elev-2'], ['--fg', '--bg-elev-3'],
  ['--fg-muted', '--bg'], ['--fg-muted', '--bg-elev-1'],
  ['--accent', '--bg'], ['--accent', '--bg-elev-1'], ['--accent-fg', '--accent'],
  ['--positive', '--bg-elev-1'], ['--negative', '--bg-elev-1'], ['--positive-fg', '--positive'], ['--negative-fg', '--negative']
];

for (const [name, theme] of [['escuro', DARK], ['claro', LIGHT]]) {
  test(`contraste AA (4,5:1) no tema ${name}`, () => {
    const fails = PAIRS.map(([f, b]) => [f, b, ratio(theme[f], theme[b])]).filter(([, , r]) => r < 4.5);
    assert.equal(fails.map(([f, b, r]) => `${f} sobre ${b}: ${r.toFixed(2)}`).join('; '), '');
  });
  test(`texto sutil atinge ao menos 3:1 (texto grande e auxiliar) no tema ${name}`, () => {
    assert.ok(ratio(theme['--fg-subtle'], theme['--bg']) >= 3, ratio(theme['--fg-subtle'], theme['--bg']).toFixed(2));
  });
}

test('nenhuma cor literal fora do bloco de tokens', () => {
  const offenders = componentCss.split('\n').filter(l => /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i.test(l) && !l.trim().startsWith('/*'));
  assert.equal(offenders.join('\n'), '');
});

test('tema claro automático e tema claro escolhido são idênticos', () => {
  const light = vars(block(':root[data-theme="light"]'));
  assert.deepEqual(AUTO_LIGHT, light);
});

test('alvo de toque mínimo é 44px e os controles o usam', () => {
  assert.equal(DARK['--tap-min'], '44px');
  for (const sel of ['.ds-btn {', '.ds-chip {', '.ds-input, .ds-select, .ds-textarea {', '.ds-tab {']) {
    const i = componentCss.indexOf(sel); assert.ok(i >= 0, sel);
    assert.match(componentCss.slice(i, componentCss.indexOf('}', i)), /min-height: var\(--tap-min\)/, sel);
  }
});
