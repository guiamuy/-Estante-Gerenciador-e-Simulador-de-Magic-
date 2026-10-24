// Camada 5 · contrato visual: tokens como única fonte de cor, contraste AA
// nos dois temas, alvo de toque e temas claros sem divergência.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HTML } from './_load.mjs';
import { readFileSync } from 'node:fs';

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
  ['--positive', '--bg-elev-1'], ['--negative', '--bg-elev-1'], ['--positive-fg', '--positive'], ['--negative-fg', '--negative'],
  // U7 · cor do oponente: legível sobre o fundo e com texto próprio legível sobre ela
  ['--player-opp', '--bg'], ['--player-opp', '--bg-elev-1'], ['--player-opp-fg', '--player-opp']
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
  // U8 (leva 99) · expectativa mudou: o tamanho vem de tokens por faixa de aparelho; o padrão continua 84/100 e as faixas
  // estreita (76/92) e larga (92/110) ficam no bloco U8
  assert.match(carta, /\.tb-card \{[^}]*width: var\(--carta-campo\)/, 'carta do campo pelo token');
  assert.match(carta, /\.tb-card--hand \{ width: var\(--carta-mao\); \}/);
  // MJ1d (leva J-5) · expectativa mudou de propósito: o bloco padrão ganhou o token dos terrenos compactos (60 px)
  assert.match(componentCss, /:root \{ --carta-campo: 84px; --carta-mao: 100px; --carta-pilha: 56px; --carta-terreno: 60px; \}/, 'padrão 84/100/56, terreno 60');
  assert.match(componentCss, /@media \(max-width: 374px\) \{\s*:root \{ --carta-campo: 76px; --carta-mao: 92px;/, 'Galaxy S');
  assert.match(componentCss, /@media \(min-width: 400px\) \{\s*:root \{ --carta-campo: 92px; --carta-mao: 110px;/, 'S+ e Ultra');
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

/* ---------------- leva 123 · guarda-corpos do design system ---------------- */
const script = HTML.slice(HTML.indexOf('</style>'));

test('Leva 123 · todo token referenciado em CSS existe (definido no CSS ou atribuído pelo JS)', () => {
  // Antes: --font-body, --surface, --surface-2, --line e --muted eram usados e nunca definidos; a regra inteira
  // sumia na tela (sem borda, sem fundo) e ninguém via. Tokens atribuídos pelo JS (--i, --atras, --doca-h, --anel)
  // contam como definidos quando aparecem entre aspas no script.
  const definidos = new Set([...css.matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)].map(m => m[1]));
  const peloJs = new Set([...script.matchAll(/['"`](--[a-zA-Z0-9-]+)['"`]/g)].map(m => m[1]));
  const usados = [...new Set([...css.matchAll(/var\((--[a-zA-Z0-9-]+)/g)].map(m => m[1]))];
  const faltam = usados.filter(t => !definidos.has(t) && !peloJs.has(t));
  assert.deepEqual(faltam, [], 'tokens usados em CSS e nunca definidos');
});

test('leva 123 · :hover só dentro de @media (hover: hover) — no celular, hover gruda depois do toque', () => {
  const fora = componentCss.split('\n').filter(l => /:hover/.test(l) && !/@media \(hover: hover\)/.test(l) && !l.trim().startsWith('/*'));
  assert.equal(fora.map(l => l.trim().slice(0, 80)).join('\n'), '');
});

test('leva 123 · z-index de camada vem dos tokens; literal só para ordem local (≤ 5)', () => {
  const ruins = componentCss.split('\n').filter(l => { const m = l.match(/z-index:\s*(\d+)/); return m && Number(m[1]) > 5; });
  assert.equal(ruins.map(l => l.trim().slice(0, 80)).join('\n'), '');
});

test('leva 123 · áreas seguras do aparelho: barra do topo, diálogo, aviso e bandeja respeitam o recorte', () => {
  for (const [sel, inset] of [['.ds-appbar {', 'safe-area-inset-top'], ['.ds-overlay {', 'safe-area-inset-top'], ['.ds-overlay {', 'safe-area-inset-bottom'],
    ['.ds-toast {', 'safe-area-inset-bottom'], ['.tb-dock {', 'safe-area-inset-bottom']]) {
    const i = componentCss.search(new RegExp('^' + sel.replace(/[.{]/g, '\\$&'), 'm')); assert.ok(i >= 0, sel); // a regra no começo da linha, não um seletor composto
    assert.match(componentCss.slice(i, componentCss.indexOf('}', i)), new RegExp(inset), `${sel} sem ${inset}`);
  }
  assert.match(HTML, /viewport-fit=cover/);
});

test('leva 123 · todo tom pedido a Badge e Note no código tem regra CSS', () => {
  // Antes: Badge({ tone: 'warning' }) gerava .ds-badge--warning sem CSS, e Note(x, { tone: 'danger' }) gerava
  // "ds-note--[object Object]". O tom 'danger' é apelido de 'negative' e 'info' é o tom padrão (sem classe).
  const tons = new Set([...script.matchAll(/(?:Badge|Note)\([^()\n]*(?:\([^()\n]*\)[^()\n]*)*\{ tone: '([a-z]+)'/g)].map(m => m[1])
    .concat([...script.matchAll(/Note\([^()\n]*(?:\([^()\n]*\)[^()\n]*)*, '([a-z]+)'\)/g)].map(m => m[1])));
  assert.ok(tons.has('warning') && tons.has('danger'), 'a varredura acha os tons de verdade: ' + [...tons].join(','));
  const alias = { danger: 'negative', info: '' };
  for (const t of tons) {
    const real = t in alias ? alias[t] : t; if (!real) continue;
    assert.ok(componentCss.includes(`.ds-badge--${real}`) || componentCss.includes(`.ds-note--${real}`), `tom "${t}" sem CSS`);
  }
  assert.ok(componentCss.includes('.ds-badge--warning'));
});

test('leva 123 · botão de ícone tem uma regra só (as duas grafias), diálogo e aviso só com tokens', () => {
  assert.equal((componentCss.match(/^\.ds-btn--icon(e)? \{/gm) || []).length, 0, 'regra separada por grafia');
  assert.match(componentCss, /\.ds-btn--icon, \.ds-btn--icone \{/);
  for (const sel of ['.ds-toast__acao {', '.ds-toast[data-acao="true"] {']) {
    const i = componentCss.indexOf(sel); assert.ok(i >= 0, sel);
    assert.doesNotMatch(componentCss.slice(i, componentCss.indexOf('}', i)), /#[0-9a-f]{3,8}\b|\d+px(?! ?var)|\b\d+ms\b/i, sel);
  }
});

for (const [name, theme] of [['escuro', DARK], ['claro', LIGHT]]) {
  test(`leva 123 · aviso (warning) legível sobre o fundo e a superfície no tema ${name}`, () => {
    for (const bg of ['--bg', '--bg-elev-1']) assert.ok(ratio(theme['--warning'], theme[bg]) >= 4.5, `${bg}: ${ratio(theme['--warning'], theme[bg]).toFixed(2)}`);
  });
}

/* ---------------- D1 · fundamentos: escala, densidade e fim dos literais ---------------- */
test('D1 · nenhum tamanho de fonte, duração ou raio em literal nos componentes: tudo por token', () => {
  const linhas = componentCss.split('\n').filter(l => !l.trim().startsWith('/*'));
  const fonte = linhas.filter(l => /font-size:\s*[\d.]+px/.test(l)).map(l => l.trim().slice(0, 70));
  const ms = linhas.filter(l => /\b\d+ms\b/.test(l)).map(l => l.trim().slice(0, 70));
  const raio = linhas.filter(l => /border-radius:\s*[\d.]+px/.test(l) && !/border-radius:\s*0px/.test(l)).map(l => l.trim().slice(0, 70));
  assert.deepEqual(fonte, [], 'font-size literal'); assert.deepEqual(ms, [], 'duração literal'); assert.deepEqual(raio, [], 'raio literal');
});

test('D1 · escala de texto e densidade são tokens multiplicadores aplicados por atributo no <html>; o alvo de toque não encolhe', () => {
  assert.equal(DARK['--escala-texto'], '1'); assert.equal(DARK['--densidade'], '1');
  for (const t of ['--text-xs', '--text-sm', '--text-md', '--text-lg', '--text-xl', '--text-2xl', '--text-3xl', '--text-2xs', '--text-3xs']) assert.match(DARK[t], /calc\(.*var\(--escala-texto\)\)/, t);
  for (const t of ['--space-1', '--space-2', '--space-3', '--space-4', '--space-5', '--space-6', '--space-7', '--space-8']) assert.match(DARK[t], /calc\(.*var\(--densidade\)\)/, t);
  assert.equal(DARK['--tap-min'], '44px', 'o alvo de toque é fixo');
  assert.match(css, /:root\[data-escala="pequena"\] \{ --escala-texto: \.92; \}/);
  assert.match(css, /:root\[data-escala="grande"\] \{ --escala-texto: 1\.12; \}/);
  assert.match(css, /:root\[data-densidade="compacta"\] \{ --densidade: \.85; \}/);
});

/* ---------------- D2 · acentos: AA nos dois temas ---------------- */
test('D2 · cada acento (latão, cobre, prata, jade) tem AA sobre o fundo e a superfície, e o texto do botão legível sobre ele, nos dois temas', () => {
  const bloco = sel => { const i = css.indexOf(sel); assert.ok(i >= 0, sel); return vars(css.slice(i, css.indexOf('}', i))); };
  for (const acento of ['cobre', 'prata', 'jade']) {
    const escuro = { ...DARK, ...bloco(`:root[data-acento="${acento}"] {`) };
    const claro = { ...LIGHT, ...bloco(`:root[data-theme="light"][data-acento="${acento}"] {`) };
    for (const [nome, t] of [['escuro', escuro], ['claro', claro]]) {
      for (const bg of ['--bg', '--bg-elev-1']) assert.ok(ratio(t['--accent'], t[bg]) >= 4.5, `${acento} ${nome}: acento sobre ${bg} = ${ratio(t['--accent'], t[bg]).toFixed(2)}`);
      assert.ok(ratio(t['--accent-fg'], t['--accent']) >= 4.5, `${acento} ${nome}: texto sobre o acento`);
      assert.ok(ratio(t['--accent-hover'], t['--bg']) >= 4.5, `${acento} ${nome}: hover sobre o fundo`);
    }
  }
  // as amostras existem nos dois temas e a de latão é o acento padrão
  assert.equal(DARK['--acento-latao'] || bloco(':root {\n  --acento-latao')['--acento-latao'], undefined === DARK['--acento-latao'] ? bloco(':root {\n  --acento-latao')['--acento-latao'] : DARK['--acento-latao']);
  const amostrasEscuro = bloco(':root {\n  --acento-latao'), amostrasClaro = bloco(':root[data-theme="light"] {\n  --acento-latao');
  assert.equal(amostrasEscuro['--acento-latao'], DARK['--accent']); assert.equal(amostrasClaro['--acento-latao'], LIGHT['--accent']);
  for (const k of ['cobre', 'prata', 'jade']) { assert.ok(amostrasEscuro['--acento-' + k]); assert.ok(amostrasClaro['--acento-' + k]); }
});

/* ---------------- D7 · mesa do seu jeito: superfície, cor do oponente e verso ---------------- */
test('D7 · cada superfície da mesa mantém o texto AA nos dois temas; cada cor do oponente tem texto legível sobre ela e se destaca do fundo; os versos só usam tokens', () => {
  const bloco = sel => { const i = css.indexOf(sel); assert.ok(i >= 0, sel); return vars(css.slice(i, css.indexOf('}', i))); };
  for (const sup of ['feltro', 'oceano', 'vinho', 'pedra', 'linho']) { // K2 · dois feltros novos
    const escuro = bloco(`:root[data-superficie="${sup}"] {`), claro = bloco(`:root[data-theme="light"][data-superficie="${sup}"] {`);
    for (const [nome, t, base] of [['escuro', escuro, DARK], ['claro', claro, LIGHT]]) {
      for (const fg of ['--fg', '--fg-muted']) assert.ok(ratio(base[fg], t['--mesa-bg']) >= 4.5, `${sup} ${nome}: ${fg} sobre a mesa = ${ratio(base[fg], t['--mesa-bg']).toFixed(2)}`);
      assert.ok(t['--mesa-veio-1'] && t['--mesa-veio-2'], `${sup} ${nome}: veios definidos`);
    }
  }
  for (const op of ['rubi', 'ametista']) {
    const escuro = { ...DARK, ...bloco(`:root[data-oponente="${op}"] {`) }, claro = { ...LIGHT, ...bloco(`:root[data-theme="light"][data-oponente="${op}"] {`) };
    for (const [nome, t] of [['escuro', escuro], ['claro', claro]]) {
      assert.ok(ratio(t['--player-opp-fg'], t['--player-opp']) >= 4.5, `${op} ${nome}: texto sobre a cor do oponente = ${ratio(t['--player-opp-fg'], t['--player-opp']).toFixed(2)}`);
      assert.ok(ratio(t['--player-opp'], t['--bg']) >= 3, `${op} ${nome}: a cor do oponente se destaca do fundo = ${ratio(t['--player-opp'], t['--bg']).toFixed(2)}`);
      assert.ok(t['--player-opp-soft'], `${op} ${nome}: tom suave`);
    }
  }
  // a cor padrão também cumpre (azul, já no :root)
  for (const t of [DARK, LIGHT]) { assert.ok(ratio(t['--player-opp-fg'], t['--player-opp']) >= 4.5); assert.ok(ratio(t['--player-opp'], t['--bg']) >= 3); }
  // só a tela da partida troca o fundo
  assert.match(css, /body\[data-tela="partida"\] \{ --bg: var\(--mesa-bg\);/);
  // versos: três desenhos, nenhum literal de cor (só var(--…) e transparent)
  const versos = css.match(/\.ds-verso[^{]*\{[^}]*\}/g) || [];
  assert.ok(versos.length >= 3, 'três desenhos de verso');
  for (const v of versos) assert.doesNotMatch(v, /#[0-9a-f]{3,8}|rgba?\(/i, 'verso sem cor literal: ' + v.slice(0, 60));
  for (const k of ['selo', 'trama']) assert.match(css, new RegExp(`:root\\[data-verso="${k}"\\] \\.ds-verso:not\\(\\[data-desenho\\]\\), \\.ds-verso\\[data-desenho="${k}"\\]`));
});

/* ---------------- D10 · movimento com sistema ---------------- */
test('D10 · toda animação tem regra de menos movimento, nenhuma duração em segundos fora de token, e cada @keyframes é usado (o scanner fica para a X16)', () => {
  // a regra global cobre tudo o que anima ou transiciona quando o sistema pede menos movimento; a escolha na Aparência faz o mesmo
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\s*\*, \*::before, \*::after \{ animation: none !important; transition: none !important; \}/);
  assert.match(css, /:root\[data-movimento="reduzido"\] \*, :root\[data-movimento="reduzido"\] \*::before, :root\[data-movimento="reduzido"\] \*::after \{ animation-duration: \.01ms !important/);
  // durações em segundos (1.2s, 2.4s…) só por token; o scanner (.scan-*) é dívida declarada da X16
  const linhas = componentCss.split('\n').filter(l => !l.trim().startsWith('/*') && !/\.scan-/.test(l));
  const segundos = linhas.filter(l => /(animation|transition)[^;]*\b(?:\d*\.\d+|[1-9]\d*)s\b/.test(l)).map(l => l.trim().slice(0, 80)); // 0s (atraso nulo) é legítimo
  assert.deepEqual(segundos, [], 'duração literal em segundos');
  // cada @keyframes definido é usado por alguma animação, e cada animação nomeada tem @keyframes
  const definidos = new Set([...css.matchAll(/@keyframes ([a-zA-Z0-9_-]+)/g)].map(m => m[1]));
  const usados = new Set([...css.matchAll(/animation:\s*([a-zA-Z][a-zA-Z0-9_-]*)/g)].map(m => m[1]).filter(n => n !== 'none'));
  for (const n of usados) assert.ok(definidos.has(n), `animação sem @keyframes: ${n}`);
  for (const n of definidos) assert.ok(usados.has(n), `@keyframes sem uso: ${n}`);
  // tokens de pulso existem
  for (const t of ['--dur-pulso', '--dur-pulso-lento', '--dur-brilho']) assert.match(DARK[t] || '', /^\d+ms$/, t);
});

/* ---------------- D12 · guia visual vivo ---------------- */
test('D12 · todo componente visual exportado pelo DS aparece no catálogo /ds, e o catálogo documenta tokens, estados, movimento e checklist', () => {
  const html = HTML;
  const exportacao = html.match(/return \{ h, (?:seguro, )?Text, Button, Field, Select, Chip,[^}]*\};/s);
  assert.ok(exportacao, 'linha de exportação do DS');
  const nomes = exportacao[0].replace(/^return \{|\};$/g, '').split(',').map(x => x.trim()).filter(Boolean);
  // o que não é visual (utilitários, símbolos de mana parseados, fechamento) fica fora da exigência
  const NAO_VISUAL = new Set(['h', 'seguro', /* P-1 · monta HTML seguro, não desenha */ 'usaRelatar', /* Y1 · liga o item Relatar, não desenha */ 'clear', 'mount', 'closeDialog', 'fechaToast', 'reservaDoca', 'analisaSimbolos', 'SIMBOLO_RX', 'nomeDoSimbolo', 'simbolizar', 'srcsetDaCarta', 'ICONES', 'ImagemCarta',
    'deveAncorar', 'instalaAncora', 'levaAte', 'levaSeEscondido', 'oQueEsconde', 'RECEITAS_DE_ANIMACAO' /* DS-K · dados das receitas; o catálogo as desenha em ds-receitas */]); // J1 · comportamento de rolagem, sem desenho próprio
  const i = html.indexOf('const Section = (title, ...kids)'); const j = html.indexOf('\n}\n', html.indexOf('function renderDS()')); const catalogo = html.slice(i, j); // o módulo do catálogo inteiro (Section usa Surface)
  const faltam = nomes.filter(n => !NAO_VISUAL.has(n)).filter(n => !new RegExp(`\\b${n}\\(`).test(catalogo) && !catalogo.includes(`${n}(`));
  assert.deepEqual(faltam, [], 'componentes do DS fora do catálogo');
  for (const secao of ['Tokens', 'Tipografia', 'Botões', 'Perfil e progresso', 'Estados', 'Movimento', 'Mesa', 'Sobreposições', 'Checklist de design por leva']) assert.ok(catalogo.includes(`'${secao}'`), `seção ${secao}`);
  for (const id of ['ds-tokens-cor', 'ds-tokens-texto', 'ds-tokens-espaco', 'ds-checklist', 'ds-movimentos', 'ds-versos', 'ds-linha-estado']) assert.ok(html.includes(`'${id}'`), id);
});

test('T3 · Jogar com volume: relevo em tokens nos três blocos, texto AA até no ponto mais escuro da placa, keyframe com menos movimento', () => {
  for (const [nome, t] of [['escuro', DARK], ['claro', LIGHT], ['claro automático', { ...DARK, ...AUTO_LIGHT }]])
    for (const k of ['--relevo-escuro', '--relevo-claro', '--relevo-sombra']) assert.ok(t[k], `${k} no tema ${nome}`);
  assert.equal(AUTO_LIGHT['--relevo-escuro'], LIGHT['--relevo-escuro']);
  // o pé da placa: o acento coberto pelo escuro do relevo a 34% da opacidade dele (o gradiente de baixo)
  const rgba = v => v.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([.\d]+)\)/).slice(1).map(Number);
  const hex = h => h.replace('#', '').match(/../g).map(x => parseInt(x, 16));
  const toHex = c => '#' + c.map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
  for (const [nome, t] of [['escuro', DARK], ['claro', LIGHT]]) {
    const [r, g, b, a] = rgba(t['--relevo-escuro']), k = a * 0.34, base = hex(t['--accent']);
    const pe = toHex(base.map((c, i) => c * (1 - k) + [r, g, b][i] * k));
    assert.ok(ratio(t['--accent-fg'], pe) >= 4.5, `texto do Jogar no pé da placa (${nome}): ${ratio(t['--accent-fg'], pe).toFixed(2)}`);
  }
  assert.match(componentCss, /\.inicio-jogar--brilho::after \{ animation: jogar-brilho var\(--dur-4\)/);
  assert.match(componentCss, /@media \(prefers-reduced-motion: reduce\) \{ \.inicio-jogar\.ds-btn:active:not\(\[disabled\]\)[^}]*transform: none; \} \.inicio-jogar--brilho::after \{ animation: none; \} \}/);
});

/* ---------------- MJ7 (J-17) · material da mesa ---------------- */
test('MJ7 · material: os tokens de sombra da carta, luz do feltro e latão existem nos três blocos; a sombra que cresce só anima opacidade e transform; a luz do feltro é fundo parado só na partida; o texto continua AA no lábio do latão', () => {
  const novos = ['--sombra-carta', '--sombra-carta-alta', '--mesa-luz', '--mesa-penumbra', '--latao-luz', '--latao-labio'];
  for (const [nome, t] of [['escuro', DARK], ['claro', LIGHT], ['claro automático', { ...DARK, ...AUTO_LIGHT }]])
    for (const k of novos) assert.ok(t[k], `${k} no tema ${nome}`);
  for (const k of novos) assert.equal(AUTO_LIGHT[k], LIGHT[k], `${k}: claro automático idêntico ao escolhido`);
  // a carta em repouso tem espessura; levantada, a sombra alta vem de um ::after que só muda opacidade e transform (compositor)
  assert.match(css, /\.tb-card__face \{[^}]*box-shadow: var\(--sombra-carta\)/);
  const after = css.match(/\.tb-card::before \{([^}]*)\}/); assert.ok(after, '.tb-card::before');
  assert.match(after[1], /box-shadow: var\(--sombra-carta-alta\)/); assert.match(after[1], /opacity: 0/);
  assert.match(after[1], /transition: opacity var\(--dur-2\) var\(--ease-out\), transform var\(--dur-2\) var\(--ease-out\);/, 'só opacidade e transform transicionam');
  for (const sel of ['.tb-card[data-selected="true"]::before', '.tb-card[data-segurando="true"]::before', '.tb-fx-camada > .tb-mira__carta::before']) assert.ok(css.includes(sel), sel + ' levanta a sombra');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ \.tb-card::before \{ transition: none; \} \}/);
  // a luz do feltro: gradientes parados, só na partida, com os veios por cima; nada em @keyframes
  const luz = css.match(/body\[data-tela="partida"\] \{\n  background-image:([^}]*)\}/); assert.ok(luz, 'vinheta da partida');
  assert.match(luz[1], /var\(--mesa-luz\)/); assert.match(luz[1], /var\(--mesa-penumbra\)/); assert.match(luz[1], /var\(--grain-1\)/);
  assert.doesNotMatch(css, /@keyframes[^{]*\{[^}]*--mesa-luz/);
  // o latão: fio de luz e lábio na faixa de vez (não na mão inicial nem no fim, que são papel) e no marcador de vida de quem joga
  assert.match(css, /\.tb-top > \.tb-vez:not\(\[data-papel="mulligan"\]\):not\(\[data-papel="fim"\]\)[^{]*\{[^}]*inset 0 1px 0 var\(--latao-luz\), inset 0 -1px 0 var\(--latao-labio\)/);
  assert.match(css, /\.tb-life\[data-active="true"\] \{ background-image: linear-gradient\(180deg, var\(--latao-luz\)/);
  // o texto sobre o latão continua AA no ponto mais claro (o fio de luz a toda força, no topo da faixa); o lábio é uma linha
  // de 1 px na borda de baixo, fora do texto (inset 0 -1px), e por isso não entra na conta
  const rgba = v => v.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([.\d]+)\)/).slice(1).map(Number);
  const hex = h => h.replace('#', '').match(/../g).map(x => parseInt(x, 16));
  const toHex = c => '#' + c.map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
  for (const [nome, t] of [['escuro', DARK], ['claro', LIGHT]]) {
    const [r, g, b, a] = rgba(t['--latao-luz']), base = hex(t['--accent']);
    const ponto = toHex(base.map((c, i) => c * (1 - a) + [r, g, b][i] * a));
    assert.ok(ratio(t['--accent-fg'], ponto) >= 4.5, `texto sobre o latão no fio de luz (${nome}): ${ratio(t['--accent-fg'], ponto).toFixed(2)}`);
    assert.match(t['--latao-labio'], /^rgba\(/, 'lábio em token');
  }
  // o palco do material no catálogo
  assert.ok(HTML.includes("id: 'ds-material'") && HTML.includes("id: 'ds-virar'"), 'o /ds mostra repouso, escolhida, segurada e a dupla face que vira');
});

/* ---------------- MJ8 (J-18) · ritmo do turno ---------------- */
test('MJ8 · ritmo do turno: o trilho acende em sequência por um fio só de opacidade com demora por token, a faixa de vez desliza do lado de quem recebe a vez, e tudo tem regra de menos movimento', () => {
  const trilho = css.match(/\.tb-steps__list li::after \{([^}]*)\}/); assert.ok(trilho, 'fio do trilho');
  assert.match(trilho[1], /opacity: 0/); assert.match(trilho[1], /background: var\(--accent\)/); assert.match(trilho[1], /pointer-events: none/);
  assert.match(css, /\.tb-steps__list li\[data-acende="passa"\]::after \{ animation: tb-fase-passa var\(--dur-3\) var\(--ease-out\) calc\(var\(--i, 0\) \* var\(--dur-1\)\) both; \}/);
  assert.match(css, /\.tb-steps__list li\[data-acende="fica"\]::after \{ animation: tb-fase-chega var\(--dur-2\)/);
  const passa = css.match(/@keyframes tb-fase-passa \{([^}]*\}[^}]*\}[^}]*)\}/); assert.ok(passa); assert.doesNotMatch(passa[1], /transform|width|height|left|top/, 'o fio só muda opacidade');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ \.tb-steps__list li\[data-acende\]::after, \.tb-steps__list li\[data-acende="fica"\] \{ animation: none; \} \}/);
  // a faixa de vez: desce para o oponente (que fica em cima), sobe para você; o selo da Conversa acompanha; só transform e opacidade
  for (const [papel, nome] of [['oponente', 'tb-vez-desce'], ['eu', 'tb-vez-sobe']]) {
    assert.match(css, new RegExp(`\\.tb-vez--troca\\[data-papel="${papel}"\\], \\.tb-vez-selo--troca\\[data-papel="${papel}"\\] \\{ animation: ${nome} var\\(--dur-3\\) var\\(--ease-out\\); \\}`));
    const kf = css.match(new RegExp(`@keyframes ${nome} \\{([^}]*\\}[^}]*)\\}`)); assert.ok(kf, nome); assert.doesNotMatch(kf[1], /width|height|left|top|margin/, nome + ' só transform e opacidade');
  }
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ \.tb-vez--troca\[data-papel\], \.tb-vez-selo--troca\[data-papel\] \{ animation: none; \} \}/);
});

/* ---------------- DS-K (G-287) · Ébano e Ouro, F0.1: tokens, latão por acento, receitas e contenção de texto ---------------- */
test('DS-K · os tokens de ébano e latão existem nos três blocos; a superfície profunda segura o texto, o texto apagado, o sutil e o oponente em AA e o acento em texto grande (3:1); o texto do botão segue AA nos dois extremos do latão em cada acento', () => {
  const novos = ['--bg-elev-0', '--accent-hi', '--accent-lo', '--sheen'];
  for (const [nome, t] of [['escuro', DARK], ['claro', LIGHT], ['claro automático', { ...DARK, ...AUTO_LIGHT }]])
    for (const k of novos) assert.ok(t[k], `${k} no tema ${nome}`);
  for (const k of novos) assert.equal(AUTO_LIGHT[k], LIGHT[k], `${k}: claro automático idêntico ao escolhido`);
  for (const k of ['--ease-spring', '--dur-abertura', '--escalona']) assert.ok(DARK[k], k);
  assert.match(DARK['--escalona'], /^\d+ms$/);
  assert.match(DARK['--dur-abertura'], /^\d+ms$/); assert.match(DARK['--ease-spring'], /^cubic-bezier\(/);
  for (const [nome, t] of [['escuro', DARK], ['claro', LIGHT]]) {
    for (const f of ['--fg', '--fg-muted', '--fg-subtle', '--player-opp', '--positive', '--negative'])
      assert.ok(ratio(t[f], t['--bg-elev-0']) >= 4.5, `${f} sobre --bg-elev-0 (${nome}): ${ratio(t[f], t['--bg-elev-0']).toFixed(2)}`);
    assert.ok(ratio(t['--accent'], t['--bg-elev-0']) >= 3, `acento (texto grande) sobre --bg-elev-0 (${nome}): ${ratio(t['--accent'], t['--bg-elev-0']).toFixed(2)}`);
    // a superfície profunda se separa do fundo e da superfície 1 (senão não é "profunda")
    assert.ok(ratio(t['--bg-elev-0'], t['--bg']) >= 1.03 && ratio(t['--bg-elev-0'], t['--bg-elev-1']) >= 1.12, `--bg-elev-0 se distingue (${nome}): ${ratio(t['--bg-elev-0'], t['--bg']).toFixed(2)} / ${ratio(t['--bg-elev-0'], t['--bg-elev-1']).toFixed(2)}`); // no escuro a razão comprime: a separação visível vem da superfície 1
  }
  // o trio de latão por acento: hi e lo definidos para cobre, prata e jade nos dois temas, e o texto do botão AA sobre os dois
  const acento = (sel) => vars(block(sel));
  const trios = [['escuro', DARK, ['', ':root[data-acento="cobre"]', ':root[data-acento="prata"]', ':root[data-acento="jade"]']],
    ['claro', LIGHT, ['', ':root[data-theme="light"][data-acento="cobre"]', ':root[data-theme="light"][data-acento="prata"]', ':root[data-theme="light"][data-acento="jade"]']]];
  for (const [nome, base, sels] of trios) for (const sel of sels) {
    // o bloco do acento aparece duas vezes (D2 e DS-K): junta os dois
    const partes = sel ? [...tokenCss.matchAll(new RegExp(sel.replace(/[[\]()*+?.\\^$|]/g, '\\$&') + ' \\{([^}]*)\\}', 'g'))].map(m => vars(m[1])) : [{}];
    const t = Object.assign({}, base, ...partes);
    assert.ok(t['--accent-hi'] && t['--accent-lo'], `${sel || 'latão'} (${nome}) tem --accent-hi e --accent-lo`);
    for (const k of ['--accent-hi', '--accent-lo']) assert.ok(ratio(t['--accent-fg'], t[k]) >= 4.5, `texto do botão sobre ${k} em ${sel || 'latão'} (${nome}): ${ratio(t['--accent-fg'], t[k]).toFixed(2)}`);
  }
  // a varredura é translúcida (nunca uma cor sólida) e o latão metálico só usa os tokens do trio
  for (const t of [DARK, LIGHT]) assert.match(t['--sheen'], /^rgba\(/);
  assert.match(componentCss, /\.ds-latao \{[^}]*linear-gradient\(160deg, var\(--accent-hi\), var\(--accent\) 55%, var\(--accent-lo\)\)/);
  assert.match(componentCss, /\.ds-latao::after \{[^}]*var\(--sheen\)/);
});

test('DS-K · as receitas de animação declaram os cinco campos (plano, luz, curva, etapas, reduzido) e a dona; curvas e durações só por token; o palco tem profundidade e cada receita com palco tem @keyframes próprios usados', () => {
  const inicio = HTML.indexOf('const RECEITAS_DE_ANIMACAO = Object.freeze(['); assert.ok(inicio > 0, 'RECEITAS_DE_ANIMACAO no módulo de componentes');
  const bloco = HTML.slice(inicio, HTML.indexOf(']);', inicio));
  const receitas = [...bloco.matchAll(/\{ id: '([a-z]+)'[^\n]*\}/g)].map(m => m[0]);
  assert.equal(receitas.length, 10, 'dez receitas');
  for (const r of receitas) {
    for (const campo of ['nome', 'evento', 'dona', 'plano', 'luz', 'curva', 'etapas', 'reduzido']) assert.match(r, new RegExp(`\\b${campo}: '[^']+'`), `${r.slice(0, 24)}: campo ${campo}`);
    assert.match(r, /dona: '(design|jogabilidade)'/);
    // nenhuma duração ou curva literal na receita: só tokens --dur-* e --ease-*
    assert.doesNotMatch(r, /\d+\s?ms\b/, 'duração literal na receita');
    assert.doesNotMatch(r, /cubic-bezier/, 'curva literal na receita');
    assert.match(r, /--dur-|--ease-/);
  }
  assert.match(HTML, /id: 'ds-receitas'/); assert.match(HTML, /Section\('Receitas de animação'/);
  assert.match(componentCss, /\.ds-palco \{[^}]*perspective: \d+px/);
  for (const n of ['ds-acende', 'ds-ladrilho', 'ds-traco', 'ds-varre', 'ds-revela', 'ds-pousa', 'ds-sombra-pousa', 'ds-estende', 'ds-afunda', 'ds-sobe', 'ds-aperta', 'ds-investe', 'ds-sombra-sobe', 'ds-golpe', 'ds-treme', 'ds-salta'])
    assert.ok(componentCss.includes(`@keyframes ${n} `) && componentCss.includes(`animation: ${n} `), n);
  // três planos: luz (fundo), objeto e sombra animados em regras separadas; o 3D só por transform
  assert.match(componentCss, /\.ds-palco\[data-on="pousar"\] \.ds-palco__carta \{ animation: ds-pousa/);
  assert.match(componentCss, /\.ds-palco\[data-on="pousar"\] \.ds-palco__carta::after \{ animation: ds-sombra-pousa/);
  assert.match(componentCss, /\.ds-palco\[data-on="abertura"\] \.ds-palco__luz \{ animation: ds-acende/);
});

test('DS-K · contenção de texto: os controles do design system não deixam o texto vazar nem quebrar — selo e chip sem quebra por CSS, botão com rótulo numa linha; a quebra permitida é simétrica (text-wrap: balance)', () => {
  assert.match(componentCss, /\.ds-badge \{[^}]*white-space: nowrap/);
  assert.match(componentCss, /\.ds-chip \{[^}]*white-space: nowrap/);
  assert.match(componentCss, /\.ds-btn \{[^}]*white-space: nowrap/);
  assert.match(componentCss, /\.ds-btn \{[^}]*flex-shrink: 0/, 'o botão não encolhe abaixo do rótulo');
  assert.doesNotMatch(componentCss.slice(componentCss.indexOf('.ds-btn {'), componentCss.indexOf('}', componentCss.indexOf('.ds-btn {'))), /min-width: 0/, 'min-width: 0 deixaria o rótulo vazar');
  assert.match(componentCss, /\.ds-tab \{[^}]*white-space: nowrap/);
  // texto corrido que pode quebrar (títulos de diálogo, estado vazio, receitas) quebra de forma equilibrada
  for (const sel of ['.ds-dialog__title', '.ds-empty__titulo', '.ds-receita__campos dd']) {
    const i = componentCss.indexOf(sel + ' {'); assert.ok(i >= 0, sel);
    assert.match(componentCss.slice(i, componentCss.indexOf('}', i)), /text-wrap: (balance|pretty)/, sel + ' quebra simétrica');
  }
  // o guarda-corpo de tela existe e mede caixa e linhas de todo controle
  const e2e = readFileSync(new URL('./e2e.test.mjs', import.meta.url), 'utf8');
  assert.match(e2e, /const CONTIDOS = '\.ds-btn, \.ds-chip, \.ds-badge, \.ds-tab, \.tb-pill, \.tb-chip';/);
  assert.match(e2e, /transbordos, \[\], `\$\{nome\}: texto fora da caixa ou quebrado em controle \(DS-K\)`/);
});

test('DS-K · as escolhas da faixa de decisão não passam da largura dela e quebram de forma simétrica quando não cabem (achado da fila: divisão de dano na fonte do CI)', () => {
  assert.match(componentCss, /\.tb-banner__actions \{[^}]*max-width: 100%/);
  assert.match(componentCss, /\.tb-banner__actions \.ds-btn \{[^}]*max-width: 100%;[^}]*white-space: normal;[^}]*text-wrap: balance;[^}]*text-align: center/);
});
test('DS-K · a opção em bloco (folha da carta, escolhas) quebra de forma simétrica e cresce para o texto ficar dentro; o botão comum segue numa linha', () => {
  const regra = componentCss.match(/\.ds-btn--block \{ white-space: normal;([^}]*)\}/); assert.ok(regra, '.ds-btn--block com quebra declarada');
  assert.match(regra[1], /text-wrap: balance/); assert.match(regra[1], /text-align: center/); assert.match(regra[1], /padding-block: var\(--space-2\)/);
  assert.match(componentCss, /\.ds-btn \{[^}]*white-space: nowrap/);
});

/* ---------------- DS-K (G-288) · fontes do app ---------------- */
test('DS-K · as fontes da direção K vêm do próprio app (sem rede de terceiros), com swap, faixa de peso que evita negrito sintético e a pilha antiga de reserva', () => {
  const faces = [...css.matchAll(/@font-face \{([^}]*)\}/g)].map(m => m[1]);
  assert.equal(faces.length, 3, 'três faces: Cormorant 600 e Figtree 400/600');
  for (const f of faces) {
    assert.match(f, /src: url\("fonte-[a-z-]+-\d00\.woff2"\) format\("woff2"\)/, 'arquivo local woff2');
    assert.match(f, /font-display: swap/); assert.match(f, /font-weight: \d00 \d00/, 'faixa de peso');
    assert.doesNotMatch(f, /https?:/, 'nada de fonte de terceiros (CSP font-src self)');
  }
  assert.match(DARK['--font-display'], /^"Cormorant Garamond Estante", "Iowan Old Style"/);
  assert.match(DARK['--font-ui'], /^"Figtree Estante", system-ui/);
  assert.match(HTML.slice(0, 2000), /font-src 'self'/);
});

/* ---------------- DS-K (G-289) · F1.1 primário em latão ---------------- */
test('DS-K · F1.1 o primário é de latão (gradiente dos tokens do acento, fio de luz e lábio) e a varredura da receita "confirmar" passa atrás do rótulo, uma vez, só por token', () => {
  const regras = [...componentCss.matchAll(/\.ds-btn--primary \{([^}]*)\}/g)].map(m => m[1]).join(';');
  assert.match(regras, /linear-gradient\(160deg, var\(--accent-hi\), var\(--accent\) 55%, var\(--accent-lo\)\)/, 'latão pelo trio do acento');
  assert.match(regras, /inset 0 1px 0 var\(--latao-luz\)/); assert.match(regras, /inset 0 -1px 0 var\(--latao-labio\)/);
  assert.match(regras, /isolation: isolate/, 'a luz fica atrás do rótulo');
  assert.match(regras, /overflow: hidden/, 'a varredura não sai da caixa');
  const luz = componentCss.match(/\.ds-btn--primary:not\(\.inicio-jogar\)::after \{([^}]*)\}/);
  assert.ok(luz, 'faixa de luz do primário');
  assert.match(luz[1], /z-index: -1/); assert.match(luz[1], /var\(--sheen\)/); assert.match(luz[1], /pointer-events: none/);
  assert.match(luz[1], /inset: 0/, 'a camada de luz tem o tamanho do botão: nada sai da caixa');
  const anda = componentCss.match(/\.ds-btn--primary\[data-varre\]:not\(\.inicio-jogar\)::after \{([^}]*)\}/);
  assert.ok(anda, 'a varredura só anda com data-varre');
  assert.match(anda[1], /animation: ds-varre-latao var\(--dur-4\) var\(--ease-out\) both/, 'uma vez (sem infinite), curva e duração por token');
  assert.match(componentCss, /@keyframes ds-varre-latao \{ 0% \{ opacity: 1; background-position: 160% 0; \} 100% \{ opacity: 1; background-position: -60% 0; \} \}/);
  assert.match(componentCss, /\.inicio-jogar\.ds-btn--primary \{[^}]*linear-gradient\(160deg, var\(--accent-hi\), var\(--accent\) 55%, var\(--accent-lo\)\)/, 'o Jogar é placa de latão');
  assert.match(componentCss, /\.inicio-jogar::after \{[^}]*var\(--sheen\)/, 'o brilho do Jogar é a mesma luz');
  assert.match(HTML, /document\.addEventListener\('click', e => \{\s*const b = e\.target && e\.target\.closest \? e\.target\.closest\('\.ds-btn--primary'\)/, 'um ouvinte só para todo primário');
});

/* ---------------- DS-K (G-290) · F1.2 cinco estados iguais ---------------- */
test('DS-K · F1.2 os cinco estados saem da mesma linguagem em botão, chip, aba, linha e selo: afunda com --btn-pressed, selecionado em latão, carregando com o giro, desabilitado a 45 %', () => {
  const LATAO = 'linear-gradient\\(160deg, var\\(--accent-hi\\), var\\(--accent\\) 55%, var\\(--accent-lo\\)\\)';
  assert.match(componentCss, new RegExp(`\\.ds-chip\\[aria-pressed="true"\\] \\{ background-image: ${LATAO}`), 'chip marcado em latão');
  assert.match(componentCss, new RegExp(`\\.ds-btn:where\\(\\[aria-pressed="true"\\][^{]*\\{[^}]*background-image: ${LATAO}`), 'botão de alternar em latão');
  assert.match(componentCss, new RegExp(`\\.ds-badge--solid \\{ background-image: ${LATAO}`), 'selo cheio em latão');
  assert.match(componentCss, /\.ds-tab\[aria-selected="true"\] \{ border-bottom-color: transparent; background: linear-gradient\(90deg, var\(--accent-lo\), var\(--accent-hi\) 50%, var\(--accent-lo\)\) bottom \/ 100% 2px no-repeat; \}/, 'aba com o fio de latão');
  assert.match(componentCss, /\.ds-list__item:is\(\[aria-selected="true"\], \[aria-current="true"\], \[aria-current="page"\]\) \{ background-color: var\(--accent-soft\); box-shadow: inset 3px 0 0 var\(--accent\); \}/, 'linha escolhida com a borda de latão');
  for (const sel of ['.ds-chip:active', '.ds-tab:active', '.ds-list__item:is(button, a, [role="button"], [role="option"]):active']) assert.ok(componentCss.includes(sel), 'pressionado em ' + sel);
  assert.match(componentCss, /\.ds-chip:active:not\(\[disabled\]\):not\(\[aria-disabled="true"\]\) \{ transform: translateY\(1px\) scale\(\.97\); box-shadow: var\(--btn-pressed\); \}/, 'o chip afunda como o botão');
  assert.match(componentCss, /\.ds-btn\[data-estado="pressionado"\] \{ background-color: var\(--bg-elev-2\); box-shadow: var\(--btn-pressed\); \}/);
  assert.match(componentCss, /:is\(\.ds-chip, \.ds-tab, \.ds-list__item, \.ds-badge\)\[aria-busy="true"\]::before \{[^}]*animation: ds-spin var\(--dur-giro\) linear infinite/, 'o mesmo giro do botão');
  assert.match(componentCss, /:is\(\.ds-chip, \.ds-tab, \.ds-list__item, \.ds-badge\):is\(\[disabled\], \[aria-disabled="true"\]\) \{ opacity: \.45;/, 'desabilitado a 45 % como o botão');
  assert.match(componentCss, /\.ds-btn\[disabled\] \{ opacity: \.45;/);
});

/* ---------------- DS-K (G-291) · F1.3 destaque em ébano ---------------- */
test('DS-K · F1.3 o cartão de destaque é ébano (--bg-elev-0) com filete de latão no alto e borda tingida; o Continuar do Início usa ele e a partida em andamento é latão', () => {
  const r = componentCss.match(/\.ds-surface\.ds-destaque \{([^}]*)\}/); assert.ok(r, 'regra do destaque');
  assert.match(r[1], /background-color: var\(--bg-elev-0\)/);
  assert.match(r[1], /linear-gradient\(90deg, transparent, var\(--accent-lo\) 18%, var\(--accent-hi\) 50%, var\(--accent-lo\) 82%, transparent\)/, 'filete de latão');
  assert.match(r[1], /background-size: 100% 1px/); assert.match(r[1], /color-mix\(in srgb, var\(--accent-lo\) 40%, var\(--border\)\)/);
  assert.match(HTML, /Surface\(\{ class: 'home-continuar ds-destaque', id: 'home-continuar'/, 'o Continuar é o destaque');
  assert.match(componentCss, /\.home-continuar__item\[data-tipo="partida"\] \.home-continuar__icone\.ds-destaque__icone-latao \{ background-image: linear-gradient\(160deg, var\(--accent-hi\), var\(--accent\) 55%, var\(--accent-lo\)\); \}/);
});

/* ---------------- DS-K (G-294) · F2.2 cabeçalho 44 · 1fr · 44 ---------------- */
test('DS-K · F2.2 o cabeçalho de tela é a grade 44 · 1fr · 44 com o título no centro e os lados do mesmo tamanho; Listas, Coleção e Scanner usam ele', () => {
  assert.match(componentCss, /\.ds-cabecalho \{ display: grid; grid-template-columns: var\(--tap-min\) minmax\(0, 1fr\) var\(--tap-min\);/);
  assert.match(componentCss, /\.ds-cabecalho__titulo \{[^}]*text-align: center;[^}]*text-wrap: balance;/);
  for (const t of ["Cabecalho('Coleção'", "Cabecalho('Listas'", "Cabecalho('Scanner'"]) assert.ok(HTML.includes(t), t);
  assert.match(HTML, /Cabecalho\('Scanner', \{ classe: 'scan-head', direita: IconButton\('colecao', 'Coleção', \{ id: 'scan-colecao'/, 'Coleção vira ícone com o mesmo id e nome falado');
});

/* ---------------- DS-K (G-295) · F2.3 topo da Lista em ébano ---------------- */
test('DS-K · F2.3 o topo da Lista é o destaque em ébano (nome, formato em latão, contagens) e o latão em texto pequeno sobre o ébano usa --accent-lo', () => {
  assert.match(HTML, /Surface\(\{ class: 'ds-destaque ds-surface--pad deck-topo', id: 'deck-topo' \}/);
  assert.match(componentCss, /\.ds-destaque \.ds-badge--accent \{ color: var\(--accent-lo\); border-color: var\(--accent-lo\); \}/);
  for (const [nome, t] of [['escuro', DARK], ['claro', LIGHT]]) assert.ok(ratio(t['--accent-lo'], t['--bg-elev-0']) >= 4.5, `--accent-lo sobre --bg-elev-0 (${nome}): ${ratio(t['--accent-lo'], t['--bg-elev-0']).toFixed(2)}`);
});

/* ---------------- DS-K (G-296) · F2.4 Painel da Coleção em ébano ---------------- */
test('DS-K · F2.4 o Painel da Coleção é o destaque em ébano: Expansivel aceita classe, o selo do bloco é latão e as placas ficam um degrau acima do ébano', () => {
  assert.match(HTML, /function Expansivel\(\{ titulo, icone, aberto = true, onToggle, id, toggleId, resumo = '', classe = '' \}/);
  assert.match(HTML, /id: 'col-dash-bloco', toggleId: 'col-dash-toggle', classe: 'ds-destaque'/);
  assert.match(componentCss, /\.ds-destaque \.ds-expansivel__selo \{[^}]*linear-gradient\(160deg, var\(--accent-hi\), var\(--accent\) 55%, var\(--accent-lo\)\)/);
  assert.match(componentCss, /\.ds-destaque \.col-dash__tile \{ background: var\(--bg-elev-1\);/);
  assert.match(componentCss, /\.ds-destaque \.ds-valor--destaque \.ds-valor__principal \{ color: var\(--accent-lo\); \}/, 'valor em destaque legível sobre o ébano');
});

/* ---------------- DS-K (G-297) · F2.5 doca do Scanner em ébano ---------------- */
test('DS-K · F2.5 a doca do Scanner é a bandeja de ébano (destaque), com respiro igual e os botões secundários um degrau acima', () => {
  assert.match(HTML, /reservaDoca\(h\('div', \{ class: 'scan-dock-wrap ds-surface ds-destaque' \}, dock\)\)/);
  assert.match(componentCss, /\.scan-dock-wrap\.ds-destaque \{ padding: var\(--space-3\) var\(--space-3\) calc\(var\(--space-3\) \+ env\(safe-area-inset-bottom, 0px\)\); \}/);
  assert.match(componentCss, /\.ds-destaque \.scan-dock \.ds-btn:not\(\.ds-btn--primary\):not\(\.ds-btn--ghost\) \{ background-color: var\(--bg-elev-1\); \}/);
});

/* ---------------- DS-K (G-298) · FA.1 orçamento da abertura ---------------- */
test('DS-K · FA.1 a abertura anima só transform e opacity (roda no compositor e não trava enquanto o app inicia por baixo)', () => {
  for (const nome of ['ab-acende', 'ab-gira', 'ab-assenta', 'ab-varre', 'ab-nome']) {
    const k = componentCss.match(new RegExp(`@keyframes ${nome} \\{(.*)\\}\\s*$`, 'm')); assert.ok(k, nome);
    const props = [...k[1].matchAll(/([a-z-]+):/g)].map(m => m[1]);
    assert.deepEqual([...new Set(props)].filter(p => !['transform', 'opacity'].includes(p)), [], `${nome} anima só transform e opacity: ${props}`);
  }
});

/* ---------------- DS-K (G-299) · FA.2 saída da folha ---------------- */
test('DS-K · FA.2 fechar a folha tem saída pela receita (mais curta que a entrada, só transform e opacity, sem toque) e o fechamento lógico segue imediato', () => {
  assert.match(componentCss, /\.ds-folha-sai \{[^}]*pointer-events: none;[^}]*animation: ds-folha-desce var\(--dur-2\) var\(--ease-out\) both;/);
  assert.match(componentCss, /\.ds-veu-sai \{[^}]*pointer-events: none;[^}]*animation: ds-veu-some var\(--dur-2\) var\(--ease-out\) both;/);
  assert.match(componentCss, /@keyframes ds-folha-desce \{ from \{ opacity: 1; transform: none; \} to \{ opacity: 0; transform: translateY\(18px\) scale\(\.98\); \} \}/);
  assert.match(componentCss, /:root\[data-movimento="reduzido"\] \.ds-dialog \{ animation: none; \}/, 'com menos movimento a folha nasce no estado final');
  assert.match(HTML, /saidaDaFolha\(overlayEl\.querySelector\('\.ds-dialog'\)\);\n  overlayEl\.dataset\.open = 'false'; clear\(overlayEl\);/, 'a silhueta nasce e o diálogo fecha na mesma hora');
});

/* ---------------- DS-K (G-292) · F1.4 folha, diálogo e aviso pela receita ---------------- */
test('DS-K · F1.4 diálogo e aviso seguem a receita "folha": véu com vinheta, a folha sobe com mola e a sombra assenta (só por token); o aviso sobe com mola e sai reto', () => {
  assert.match(componentCss, /\.ds-overlay \{ background-image: radial-gradient\(ellipse 120% 90% at 50% 42%, transparent 38%, var\(--overlay\)\); \}/, 'véu com vinheta');
  assert.match(componentCss, /\.ds-dialog \{ animation: ds-folha-sobe var\(--dur-3\) var\(--ease-spring\) both;/, 'a folha sobe com mola');
  const k = componentCss.match(/@keyframes ds-folha-sobe \{([^\n]*)\}/); assert.ok(k, 'keyframes da folha');
  assert.match(k[1], /from \{ opacity: 0; transform: translateY\(24px\) scale\(\.97\); box-shadow: var\(--shadow-1\)/, 'sombra curta no começo');
  assert.match(k[1], /to \{ opacity: 1; transform: none; box-shadow: var\(--shadow-3\)/, 'sombra longa no fim');
  assert.match(componentCss, /\.ds-toast\[data-open="true"\] \{ transform: translateX\(-50%\) translateY\(0\); transition: opacity var\(--dur-2\) var\(--ease-out\), transform var\(--dur-3\) var\(--ease-spring\); \}/, 'aviso entra com mola');
  assert.match(componentCss, /\.ds-toast \{ transform: translateX\(-50%\) translateY\(14px\); \}/, 'sem encolher: fechado, o botão do aviso segue com 44 px');
});
