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

/* ---------------- C13 · as visões da coleção seguem o contrato ---------------- */
test('C13 · linha densa e pilha são alvos de toque de 44px, e as visões usam só tokens', () => {
  for (const sel of ['.col-dense__row {', '.col-pile {']) {
    const i = componentCss.indexOf(sel); assert.ok(i >= 0, sel);
    assert.match(componentCss.slice(i, componentCss.indexOf('}', i)), /min-height: var\(--tap-min\)/, sel);
  }
  const bloco = componentCss.slice(componentCss.indexOf('/* C13 · visões da coleção */'), componentCss.indexOf('/* C12b · visão salva'));
  assert.ok(bloco.length > 200, 'o bloco de CSS das visões existe');
  assert.ok(!/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i.test(bloco), 'sem cor literal: tudo sai dos tokens');
  assert.match(bloco, /\.col-pile__card \{[^}]*aspect-ratio: 63 \/ 88/, 'a carta da pilha tem a proporção da carta');
});

test('C14 · barras e colunas do painel são alvos de 44px e só usam tokens (cores de mana vêm dos tokens)', () => {
  for (const sel of ['.col-dash__bar {', '.col-dash__col {']) {
    const i = componentCss.indexOf(sel); assert.ok(i >= 0, sel);
    assert.match(componentCss.slice(i, componentCss.indexOf('}', i)), /min-height: var\(--tap-min\)/, sel);
  }
  const bloco = componentCss.slice(componentCss.indexOf('/* C14 · painel da coleção'), componentCss.indexOf('/* C13 · visões da coleção */'));
  assert.ok(bloco.length > 200);
  assert.ok(!/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i.test(bloco), 'sem cor literal');
  for (const c of ['w', 'u', 'b', 'r', 'g', 'c']) assert.match(bloco, new RegExp(`\\.col-dash__fill--${c} \\{ background: var\\(--mana-${c}\\); \\}`), `cor ${c} pelo token de mana`);
});

/* ---------------- A13 · mesa que se lê de relance ---------------- */
test('A13 · carta da mesa: maior, com nome e P/T por cima da arte, anéis de estado só com tokens, e movimento que respeita "reduzir animações"', () => {
  const carta = componentCss.slice(componentCss.indexOf('.tb-card {'), componentCss.indexOf('.tb-card[data-tapped="true"] {'));
  assert.match(carta, /\.tb-card \{[^}]*width: 84px/, 'carta do campo com 84 px (era 64)');
  assert.match(carta, /\.tb-card--hand \{ width: 100px; \}/);
  assert.ok(carta.includes('.tb-card__label {') && carta.includes('.tb-card__pt {'), 'nome e P/T têm estilo próprio');
  for (const estado of ['ataca', 'bloqueia', 'alvo']) assert.match(carta, new RegExp(`\\.tb-card\\[data-estado="${estado}"\\] \\.tb-card__face \\{ outline: 3px (solid|dashed) var\\(--(negative|accent|warning)\\); \\}`), `anel de ${estado}`);
  assert.match(carta, /@keyframes tb-entrou/);
  assert.match(carta, /@media \(prefers-reduced-motion: reduce\) \{ \.tb-card--entrou \{ animation: none; \}/, 'reduzir animações desliga o movimento');
  assert.ok(!/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i.test(carta), 'sem cor literal');
  assert.ok(Number(DARK['--dur-2'].replace('ms', '')) <= 200, 'movimento de zona até 200 ms');
});

test('A14 · pilha explicada e linha do tempo: cartão da pilha com 44px, destaque do topo por token, sem cor literal', () => {
  const i = componentCss.indexOf('.tb-stack__card {'); assert.ok(i >= 0);
  assert.match(componentCss.slice(i, componentCss.indexOf('}', i)), /min-height: var\(--tap-min\)/);
  assert.match(componentCss, /\.tb-stack__item\[data-top="true"\] \.tb-stack__card \{ background: var\(--accent-soft\); \}/);
  const bloco = componentCss.slice(componentCss.indexOf('/* A14 · linha do tempo'), componentCss.indexOf('.tb-stack__target {'));
  assert.ok(!/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i.test(bloco), 'sem cor literal');
});

test('A15 · espiar a carta: sobreposição sem capturar o dedo, arte na proporção da carta, só tokens', () => {
  const bloco = componentCss.slice(componentCss.indexOf('/* A15 · espiar a carta'), componentCss.indexOf('/* A14 · pilha explicada */'));
  assert.ok(bloco.length > 200);
  assert.match(bloco, /\.tb-peek \{[^}]*pointer-events: none/, 'a sobreposição não rouba o toque: soltar continua chegando na carta');
  assert.match(bloco, /\.tb-peek \{[^}]*position: fixed/);
  assert.match(bloco, /\.tb-peek__semimagem \{[^}]*aspect-ratio: 63 \/ 88/);
  assert.match(bloco, /prefers-reduced-motion: no-preference/, 'animação só para quem não pediu para reduzir');
  assert.ok(!/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i.test(bloco), 'sem cor literal');
});

test('A16 · cartão de resumo do turno só com tokens', () => {
  const bloco = componentCss.slice(componentCss.indexOf('/* A16 · resumo do turno */'), componentCss.indexOf('/* A14 · pilha explicada */'));
  assert.ok(bloco.includes('.tb-resumo {'));
  assert.ok(!/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i.test(bloco), 'sem cor literal');
});
