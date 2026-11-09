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
  const NAO_VISUAL = new Set(['h', 'seguro', /* P-1 · monta HTML seguro, não desenha */ 'usaRelatar', /* Y1 · liga o item Relatar, não desenha */ 'clear', 'mount', 'closeDialog', 'fechaToast', 'usaDestinoDoAviso', /* J-30 · liga o aviso da partida à faixa de vez, não desenha */ 'reservaDoca', 'analisaSimbolos', 'SIMBOLO_RX', 'nomeDoSimbolo', 'simbolizar', 'srcsetDaCarta', 'ICONES', 'MOVIMENTOS_DE_ICONE', 'MOVIMENTO_DO_ICONE', 'movimentoDoToque', 'instalaIconesVivos' /* G-340 · dados e ouvinte do ícone vivo; o catálogo os mostra em ds-icones */, 'ImagemCarta',
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
  assert.equal(receitas.length, 11, 'onze receitas'); // G-340 · relato #59: a receita do ícone vivo
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
  // S-609 · relato #60: a barra do app sai do scanner, então o Voltar entra no lado esquerdo do cabeçalho (Coleção continua à direita)
  assert.match(HTML, /Cabecalho\('Scanner', \{ classe: 'scan-head', esquerda: IconButton\('voltar', 'Voltar ao início', \{ id: 'scan-voltar'[^\n]*\n\s*direita: IconButton\('colecao', 'Coleção', \{ id: 'scan-colecao'/, 'Coleção vira ícone com o mesmo id e nome falado');
});

/* ---------------- DS-K (G-308) · F4.2 Perfil e subtelas ---------------- */
test('DS-K · F4.2 Perfil e as subtelas usam o cabeçalho 44 · 1fr · 44 (o voltar sai da linha do título e vai para o lado esquerdo); o topo do Perfil é o destaque', () => {
  for (const t of ["Cabecalho('Perfil')", "Cabecalho('Partidas'", "Cabecalho(C.titulo", "Cabecalho('Relatos'", "Cabecalho('O que sai do aparelho'", "Cabecalho('Apoiar a Estante'", "Cabecalho('Guardadas'"]) assert.ok(HTML.includes(t), t);
  for (const id of ['partidas-voltar', 'relatos-voltar', 'saida-voltar', 'apoio-voltar', 'guardadas-voltar']) assert.ok(new RegExp(`esquerda: IconButton\\('voltar', '[^']+', \\{ id: '${id}'`).test(HTML), `${id} no lado esquerdo do cabeçalho`);
  assert.ok(!/IconButton\('voltar', 'Voltar ao perfil', \{[^}]*variant: 'ghost'/.test(HTML), 'nenhum voltar ao perfil ficou na linha antiga');
  assert.match(HTML, /Surface\(\{ class: 'ds-surface--pad ds-destaque perfil-topo' \}/);
});

/* ---------------- DS-K (G-309) · F4.3 Cartas ---------------- */
test('DS-K · F4.3 Cartas usa o cabeçalho 44 · 1fr · 44 e a caixa de busca é o destaque em ébano', () => {
  assert.ok(HTML.includes("__m3.Cabecalho('Cartas')"), 'cabeçalho da busca de cartas');
  assert.match(HTML, /Surface\(\{ class: 'ds-surface--pad ds-destaque cards-busca' \}/);
  assert.ok(!HTML.includes("Text('Cartas', { size: '2xl', display: true, as: 'h1' })"), 'o título solto saiu');
});

/* ---------------- DS-K (G-310) · F4.5 segue o dedo ---------------- */
test('DS-K · F4.5 a folha fecha puxando pelo cabeçalho: pega sem seleção nem rolagem do navegador, alça sem toque, volta com a mola e menos movimento sem transição', () => {
  assert.ok(HTML.includes('seguirODedo(dlg, head); // DS-K F4.5'), 'todo Dialog liga o gesto');
  assert.match(componentCss, /\.ds-dialog__head \{ touch-action: none; user-select: none; -webkit-user-select: none; \}/);
  assert.match(componentCss, /\.ds-dialog__head::before \{[^}]*width: 36px; height: 4px;[^}]*pointer-events: none; \}/);
  assert.match(componentCss, /\.ds-dialog--volta \{ transition: transform var\(--dur-2\) var\(--ease-spring\); \}/);
  assert.match(componentCss, /:root\[data-movimento="reduzido"\] \.ds-dialog--volta \{ transition: none; \}/);
});

/* ---------------- DS-K (G-315) · F5.1 Nova e Editar lista ---------------- */
test('DS-K · F5.1 Nova e Editar lista usam o cabeçalho com voltar e a caixa de colar é o destaque', () => {
  assert.match(HTML, /__m3\.Cabecalho\(d \? 'Editar lista' : 'Nova lista', \{ esquerda: IconButton\('voltar', d \? 'Voltar para a lista' : 'Voltar para Minhas listas', \{ id: 'deck-editor-voltar'/);
  assert.match(HTML, /Surface\(\{ class: 'ds-surface--pad ds-destaque deck-form' \}/);
  assert.ok(!HTML.includes("Text(d ? 'Editar lista' : 'Nova lista', { size: '2xl'"), 'o título solto saiu');
});

/* ---------------- DS-K (G-316) · F5.2 telas sem saída ---------------- */
test('DS-K · F5.2 endereço inexistente e lista inexistente têm cabeçalho com voltar e botão de volta, sem a palavra "rota"', () => {
  assert.match(HTML, /path: '\*', title: 'Não encontrado', render: \(\) => h\('div'[^\n]*\n\s*__m3\.Cabecalho\('Página não encontrada', \{ esquerda: __m3\.IconButton\('voltar', 'Voltar para o Início', \{ id: 'nao-encontrado-voltar'/);
  assert.ok(HTML.includes("id: 'nao-encontrado-inicio'"), 'botão de volta no estado vazio');
  assert.ok(!HTML.includes("Empty('Rota não encontrada.')"), 'o texto com jargão saiu');
  assert.match(HTML, /__m3\.Cabecalho\('Lista', \{ esquerda: IconButton\('voltar', 'Voltar para Minhas listas', \{ id: 'deck-voltar'/);
});

/* ---------------- DS-K2 (G-324) · L1 hero da Lista ---------------- */
test('DS-K2 · L1 o topo da Lista tem a carta-chave (helper compartilhado com o Jogar) e a posse na coleção', () => {
  assert.ok(HTML.includes('function cartaChaveDaLista(d, cards) {') && HTML.includes('function LadrilhoDaCarta(c, {'), 'helpers em decks.js');
  assert.ok(HTML.includes("return { cartaChaveDaLista, LadrilhoDaCarta, createPortaDeEntrada"), 'exportados');
  assert.ok(HTML.includes("LadrilhoDaCarta(cartaChaveDaLista(d, state.cards), { classe: 'deck-hero__arte deck-topo__arte', tamanho: '72px' })"), 'o topo da lista usa a carta-chave');
  assert.ok(HTML.includes("el.prepend(__m15.LadrilhoDaCarta(__m15.cartaChaveDaLista(d, guardadas)))"), 'o Jogar usa o mesmo helper');
  assert.match(componentCss, /\.deck-hero__arte\.deck-topo__arte \{ width: 72px; flex: none; \}/);
  assert.ok(HTML.includes("id: 'deck-posse' }"), 'barra de posse no topo');
});

/* ---------------- DS-K2 (G-322) · N1 barra de navegação embaixo ---------------- */
test('DS-K2 · N1 a barra de navegação mora embaixo com cinco destinos e o Jogar em latão; toda tela reserva --navbar-h; a barra some na partida, no scanner e na porta de entrada; a de cima fica sem destinos', () => {
  // DS-K3 K3-2 (G-362) · a barra passou a flutuar (a --navbar-folga das bordas); --navbar-h segue sendo o pé até o topo dela
  assert.match(componentCss, /\.ds-navbar \{ position: fixed; left: var\(--navbar-folga\); right: var\(--navbar-folga\); bottom: calc\(var\(--navbar-folga\) \+ env\(safe-area-inset-bottom, 0px\)\);[^}]*grid-template-columns: repeat\(5, 1fr\);/);
  assert.match(componentCss, /body:not\(\[data-tela="partida"\]\):not\(\[data-tela="scanner"\]\):not\(\[data-tela="entrar"\]\):not\(\[data-mesa-cheia="true"\]\) \{ --navbar-h: calc\(var\(--navbar-alt\) \+ var\(--navbar-folga\) \+ env\(safe-area-inset-bottom, 0px\)\);/);
  assert.match(componentCss, /body:is\(\[data-tela="partida"\], \[data-tela="scanner"\], \[data-tela="entrar"\], \[data-mesa-cheia="true"\]\) \.ds-navbar \{ display: none; \}/);
  assert.match(componentCss, /#outlet \{ padding-bottom: var\(--navbar-reserva\); \}/);
  for (const sel of ['.ds-fab { position: fixed;', '.ds-relatar { position: fixed;', '.mesa-doca { position: sticky;']) { const i = componentCss.indexOf(sel); assert.ok(i >= 0 && /--navbar-h/.test(componentCss.slice(i, i + 400)), sel + ' sobe com a barra'); }
  assert.match(HTML, /function navBar\(\) \{[\s\S]*?NavBotao\('Início', \{ icone: 'estante', id: 'nav-home'[\s\S]*?NavBotao\('Listas', \{ icone: 'listas', id: 'nav-decks'[\s\S]*?NavBotao\('Coleção', \{ icone: 'colecao', id: 'nav-collection'[\s\S]*?NavBotao\('Scanner', \{ icone: 'scanner', id: 'nav-scanner'/);
  const appbar = HTML.slice(HTML.indexOf('function appBar() {'), HTML.indexOf('function navBar() {'));
  assert.ok(!/NavBotao\('(Jogar|Listas|Coleção)'/.test(appbar), 'a barra de cima não tem mais os destinos');
  assert.ok(HTML.includes("estante: '<path d=\"M4.5 4v16M19.5 4v16M4.5 20h15\"/>"), 'ícone da estante para o Início');
});

/* ---------------- DS-K2 (G-318) · J2 Jogar como mesa de preparação ---------------- */
test('DS-K2 · J2 o Jogar tem a sua lista como cartão com a carta-chave dentro do destaque, a doca do Começar reserva a altura e o Relatar sobe acima dela', () => {
  assert.match(componentCss, /\.deck-picker--hero > \.deck-item \{ display: grid; grid-template-columns: 64px minmax\(0, 1fr\) 24px;/);
  assert.match(componentCss, /\.deck-hero__arte \{ width: 64px; aspect-ratio: 488 \/ 680;/);
  assert.match(componentCss, /\.mesa-doca \{ position: sticky; bottom: var\(--navbar-h, 0px\);/); // G-322 · a doca senta em cima da barra de baixo
  assert.match(componentCss, /body\[data-tela="mesa"\] \.ds-relatar \{ bottom: calc\(var\(--space-4\) \+ env\(safe-area-inset-bottom, 0px\) \+ var\(--doca-h, 0px\) \+ var\(--navbar-h, 0px\)\); \}/);
  assert.ok(HTML.includes("Surface({ class: 'ds-surface--pad ds-destaque mesa-hero', id: 'mesa-hero' }"), 'o destaque da tela é a sua lista');
  assert.ok(HTML.includes("__m3.reservaDoca(h('div', { class: 'mesa-doca', id: 'mesa-doca' }, resumoDaDoca, startBtn))"), 'o Começar mora na doca');
  assert.ok(!HTML.includes("ChipField('Formato', formatBox),\n        mineField,\n        covBox,\n        ChipField('Oponente'"), 'o formulário único saiu');
});

/* ---------------- DS-K2 M2 (J-37) · a mão em leque ---------------- */
test('DS-K2 · M2 a mão em leque: largura e passo por conta de CSS sobre a largura da bandeja, sobreposição e largura mínima por token, giro e arco só por rotate/translate, sem transição com menos movimento', () => {
  assert.match(css, /:root \{ --carta-mao-min: \d+px; --leque-sobrepoe: 0\.4; \}/, 'os dois valores do leque são tokens, iguais nos dois temas');
  assert.match(componentCss, /--leque-pad: var\(--space-3\); container-type: inline-size;/, "a conta é feita pelo navegador sobre a largura da própria fileira (que não muda de altura quando a bandeja desliza)");
  const regra = componentCss.slice(componentCss.indexOf('.tb-row--leque > .tb-card--leque {'), componentCss.indexOf('}', componentCss.indexOf('.tb-row--leque > .tb-card--leque {')));
  assert.match(regra, /rotate: var\(--leque-rot, 0deg\); translate: 0 var\(--leque-y, 0px\);/, 'giro e arco são propriedades próprias (não brigam com o transform dos efeitos)');
  const props = [...regra.matchAll(/transition: ([^;]+);/g)].flatMap(m => m[1].split(',').map(x => x.trim().split(' ')[0]));
  assert.deepEqual(props, ['transform', 'rotate', 'translate'], 'só propriedades que o compositor anima sozinho');
  assert.ok(/var\(--dur-2\) var\(--ease-out\)/.test(regra) && !/\d+ms/.test(regra), 'duração e curva por token');
  assert.match(componentCss, /@media \(prefers-reduced-motion: reduce\) \{ \.tb-row--leque > \.tb-card--leque \{ transition: none; \} \}/);
  assert.match(componentCss, /\.tb-row--leque > \.tb-card--leque:is\(\[data-segurando="true"\], \[data-selected="true"\], :active\) \{ rotate: 0deg;[^}]*z-index: 2; \}/, 'a carta em foco endireita e fica por cima');
  assert.ok(HTML.includes("h('div', { class: 'tb-row tb-row--leque', dataset: { sobrepoe: 'leque'"), 'a sobreposição da mão é intencional e declarada');
  assert.ok(!/tb-mao-na-decisao'[^\n]*tb-row--leque|tb-pick-cards'[^\n]*tb-row--leque/.test(HTML), 'as fileiras de decisão continuam fileiras (cada carta inteira)');
});

test('DS-K2 · I2 o painel sem internet do Início é sempre a faixa de uma linha; o corpo vai para a folha do Ver e volta ao fechar', () => {
  assert.match(HTML, /box\.dataset\.compacto = 'true';/, 'a faixa é sempre compacta');
  assert.match(HTML, /const ver = Button\('Ver', \{ variant: 'ghost', icone: 'seguir', id: 'home-offline-detalhes'/);
  assert.match(HTML, /Dialog\(\{ title: 'Jogar sem internet', body: h\('div', \{ class: 'ds-offline ds-offline--folha', id: 'home-offline-folha' \}, corpo\)/, 'o painel inteiro abre numa folha');
  assert.match(HTML, /aoFechar: \(\) => \{ folhaAberta = false; paint\(\); \}/, 'ao fechar, o corpo volta à faixa');
  assert.match(componentCss + css, /#home-offline\[data-compacto="true"\] \.ds-offline__corpo \{ display: none; \}/);
  assert.ok(!/'Detalhes' : 'Recolher'/.test(HTML), 'o abre-no-lugar saiu');
});

test('DS-K2 · M4 a bandeja: a primária cresce até ocupar o que sobra (com teto), as outras ficam sem fundo; com três ações ou mais vale a quebra de antes', () => {
  assert.match(componentCss, /\.tb-dock__bar \.tb-banner__actions:has\(> \.ds-btn--primary\):not\(:has\(> :nth-child\(3\)\)\) \{ flex: 1 1 0%; min-width: min-content; flex-wrap: nowrap; justify-content: flex-end; \}/);
  assert.match(componentCss, /\.tb-dock__bar \.tb-banner__actions > \.ds-btn--primary \{ flex: 1 1 auto; min-width: 72px; max-width: 220px; \}/);
  assert.match(componentCss, /\.tb-dock__bar \.tb-banner__actions:has\(> \.ds-btn--primary\) > \.ds-btn:not\(\.ds-btn--primary\):not\(\.ds-btn--danger\) \{ background-color: transparent; background-image: none; box-shadow: none; \}/);
  assert.match(componentCss, /\.tb-dock__bar \.tb-banner:has\(\.tb-banner__actions > :nth-child\(3\)\) \.tb-banner__actions \{ flex: 1 1 100%;/, 'decisões com muitas opções continuam quebrando linha');
});

test('DS-K2 · M3 a barra da mesa: vidas na barra na cor de cada um (texto e borda; fundo suave por token), ⋯ com menu declarado por cima da mesa, trilho em pontos, o que acompanhava a vida fica no lado', () => {
  assert.match(HTML, /if \(lado\) return h\('button', \{ class: 'tb-life tb-life--barra'/, 'a vida da barra é só o número, com o nome falado');
  assert.match(componentCss, /\.tb-top > \.tb-life--barra\[data-lado="oponente"\] \{[^}]*color: var\(--player-opp\); border-color: var\(--player-opp\); background-color: var\(--player-opp-soft\);/);
  assert.match(componentCss, /\.tb-top > \.tb-life--barra\[data-lado="eu"\] \{[^}]*color: var\(--accent\); border-color: var\(--accent\); background-color: var\(--accent-soft\);/);
  assert.match(HTML, /maisMenu = h\('div', \{ class: 'tb-mais', id: 'tb-mais-menu', role: 'menu', 'aria-label': 'Mais ações', hidden: !maisAberto, dataset: \{ sobrepoe: 'true' \} \}/, 'o menu por cima da mesa é sobreposição declarada');
  assert.match(componentCss, /\.tb-mais \{ position: absolute; z-index: var\(--z-overlay\);/, 'camada por token');
  assert.match(componentCss, /@media \(prefers-reduced-motion: reduce\) \{ \.tb-mais:not\(\[hidden\]\) \{ animation: none; \} \}/);
  assert.match(componentCss, /body\[data-mesa-cheia="true"\] \.tb-steps__list li\[data-current="true"\] \{ width: 18px; background: var\(--accent\); \}/, 'a fase atual é o ponto longo em latão');
  assert.ok(!/class: 'tb-top__actions'/.test(HTML), 'a linha das três ferramentas saiu');
  for (const [nome, t] of [['escuro', DARK], ['claro', LIGHT]]) for (const k of ['--player-opp', '--accent']) {
    const r = ratio(t[k], t['--bg-elev-1']); assert.ok(r >= 3, `${k} (número grande) sobre a barra (${nome}): ${r.toFixed(2)}`);
  }
});

test('DS-K2 · M1 a carta do campo na moldura K: janela da arte por token sobre a mesma imagem, faixa do nome opaca, pé só com P/T, fileira centralizada sem perder a rolagem', () => {
  assert.match(css, /:root \{ --moldura-hd: calc\(var\(--text-3xs\) \* 1\.2 \+ 6px\); --moldura-ft: calc\(var\(--text-xs\) \* 1\.4 \+ 6px\); --moldura-borda: 3px;\s*--arte-topo: 0\.112; --arte-alto: 0\.442; \}/, 'a moldura e a janela da arte são tokens, iguais nos dois temas');
  // a janela da arte da moldura de 2015 (8,2–91,8% × 11,18–55,44%) cobre a caixa: a imagem cresce pela altura e centraliza
  assert.ok(0.112 >= 76 / 680 - 0.0005 && 0.112 + 0.442 <= 377 / 680 + 0.0005, 'a caixa da arte nunca mostra a moldura impressa em cima nem embaixo');
  assert.match(componentCss, /\.tb-card__face \.tb-card__arte img \{ position: absolute; left: 50%; top: calc\(100% \* var\(--arte-topo\) \/ var\(--arte-alto\) \* -1\); height: calc\(100% \/ var\(--arte-alto\)\);\s*width: auto; min-width: 100%; max-width: none; object-fit: cover; transform: translateX\(-50%\); \}/);
  assert.match(componentCss, /\.tb-card\[data-moldura-pe="true"\] \.tb-card__arte \{ bottom: var\(--moldura-ft\); \}/, 'o pé só existe quando há P/T');
  assert.match(componentCss, /\.tb-card\[data-moldura="true"\] \.tb-card__face > \.tb-card__label \{[^}]*background: var\(--bg-elev-1\);/, 'o nome vira faixa opaca (J-54: dentro da face, gira com a carta virada)');
  // J-42 (relato #48) · a faixa do nome numa linha, com a letra da faixa (--text-3xs, a mesma do --moldura-hd), reticências e sem hífen:
  // duas linhas desciam sobre a arte e "Moun-tain" quebrava o nome do terreno
  // J-46 · o nome nunca é abreviado: a letra encolhe por --nome-escala (medida pela mesa) até --nome-piso, depois duas linhas no piso; sem reticências
  assert.match(componentCss, /\.tb-card\[data-moldura="true"\] \.tb-card__face > \.tb-card__label \{[^}]*font-size: calc\(var\(--text-3xs\) \* var\(--nome-escala, 1\)\); line-height: 1\.2; display: block; white-space: nowrap; text-overflow: clip; hyphens: manual;/);
  assert.match(css, /:root \{ --nome-piso: 0\.78; \}/, 'o piso da letra do nome é token');
  assert.match(componentCss, /\.tb-card\[data-nome-duas="true"\], \.tb-leque\[data-nome-duas="true"\] \{ --moldura-hd: calc\(var\(--text-3xs\) \* var\(--nome-piso\) \* 1\.15 \* 2 \+ 6px\); \}/, 'em duas linhas a faixa cresce e a janela da arte encurta, na carta e nas cópias de trás');
  assert.match(componentCss, /\.tb-leque__camada \.tb-card__arte img \{ position: absolute; left: 50%;/, 'as cópias de trás da pilha levam a arte na mesma janela');
  // J-54 (decisão do dono, 02/11/2026) · deitada, a faixa gira com a face (não há mais regra que a ponha acima da carta deitada)
  assert.ok(!/\.tb-card\[data-moldura="true"\]\[data-tapped="true"\] > \.tb-card__label/.test(componentCss), 'deitada, a faixa não sai da face');
  assert.match(css, /:root \{ --vida-disco: 34px; \}/, 'o disco da vida é token');
  // J-43 (relato #48 parte 2) · os dois lados com o mesmo playmat, por token nos três blocos de tema; nenhum lado transparente
  assert.match(css, /:root \{ --playmat: var\(--bg-elev-1\); \}/, 'o playmat é o papel do lado, que muda com o tema (vale nos dois temas e no claro automático)');
  assert.match(componentCss, /\.tb-side \{[^}]*background: var\(--playmat\);/);
  assert.ok(!/\.tb-side--opp \{ background: transparent; \}/.test(componentCss), 'o lado do outro não é mais transparente');
  assert.match(componentCss, /\.tb-top > \.tb-life--barra \{[^}]*padding: calc\(\(var\(--tap-min\) - var\(--vida-disco\)\) \/ 2\);[^}]*background-clip: content-box;/, 'o alvo continua com 44 px; só o disco é pintado');
  assert.match(componentCss, /\.tb-side \.tb-row \{ justify-content: safe center; \}/, 'a fila do campo centraliza; com muitas cartas a rolagem começa na primeira');
  assert.match(HTML, /const moldura = !opts\.size && !opts\.verso && !!card\.image;/, 'só a carta do campo: mão, pilha e verso seguem com a carta inteira');
  assert.match(HTML, /moldura \? h\('span', \{ class: 'tb-card__arte' \}, SimboloDoBasico\(card\.name\), imgDaMesa\(card, opts\.size\)\)/, 'a arte é a mesma imagem guardada da carta (sem endereço novo: joga sem internet do mesmo jeito)');
  for (const [nome, t] of [['escuro', DARK], ['claro', LIGHT]]) {
    assert.ok(ratio(t['--fg'], t['--bg-elev-1']) >= 4.5, `nome e P/T sobre a faixa (${nome}): ${ratio(t['--fg'], t['--bg-elev-1']).toFixed(2)}`);
    assert.ok(ratio(t['--border-strong'], t['--bg-elev-0']) >= 1.3, `a borda da moldura se separa do feltro (${nome})`);
  }
});

/* ---------------- J-60 · os tokens da MJ25 no catálogo ---------------- */
test('J-60 · o catálogo /ds nomeia os tokens de medida da MJ25 (piso do ícone, folga da rolagem, crescimento da fileira, miniatura da origem) e a faixa de paisagem', () => {
  for (const t of ['--estado-piso', '--rolagem-folga', '--campo-cresce', '--decisao-origem']) {
    assert.match(HTML, new RegExp(t + ': '), `${t} definido`);
    assert.ok(/id: 'ds-campo-tokens'/.test(HTML) && HTML.slice(HTML.indexOf("Text('Tokens: --carta-campo"), HTML.indexOf("id: 'ds-campo-tokens'")).includes(t), `${t} no /ds`);
  }
  assert.match(componentCss, /@media \(orientation: landscape\) and \(max-height: 540px\)/, 'a faixa de paisagem existe');
});

/* ---------------- J-56 · escolher pela carta ampliada ---------------- */
test('J-56 · escolher carta para um efeito passa pela carta ampliada: fileira de escolha, alvo tocado na mesa, sacrifício, descarte e lista de alvos', () => {
  assert.match(HTML, /function ampliaParaEscolher\(oid, verbo, executa/);
  for (const [onde, re] of [['fileira de escolha', /ampliaParaEscolher\(oid, pk\.tudoOuNada \? 'Descartar' : 'Escolher', \(\) => act\(\{ t: 'pick'/], ['sacrifício', /ampliaParaEscolher\(oid, 'Sacrificar'/],
    ['alvo na mesa', /ampliaParaEscolher\(oid, 'Escolher', \(\) => act\(\{ t: 'pick_target'/], ['descarte', /ampliaParaEscolher\(oid, 'Descartar', \(\) => act\(\{ t: 'discard'/], ['lista de alvos', /ampliaParaEscolher\(ts\[0\]\.oid, 'Escolher'/]])
    assert.match(HTML, re, onde);
});

/* ---------------- J-55 · a decisão mostra a carta de origem ---------------- */
test('J-55 · a decisão com carta de origem ganha a miniatura ao lado (à esquerda, de largura por token; título e dica à direita, fora do texto da decisão) e o texto da decisão não pinta a miniatura', () => {
  assert.match(componentCss, /\.tb-decisao-origem \{ display: flex; align-items: center;/);
  assert.match(componentCss, /\.tb-decisao__carta \.tb-card \{ width: var\(--decisao-origem\); \}/);
  assert.match(HTML, /--decisao-origem: \d+px;/);
  assert.ok(!/\.tb-decisao span \{/.test(componentCss), 'a regra de texto da decisão não alcança a miniatura');
  assert.match(HTML, /images: f\.images \|\| c\.images \|\| null/, 'face sem imagem própria usa a arte da carta');
});

/* ---------------- J-53 · ícones de estado que cabem e rolagem afastada ---------------- */
test('J-53 · o ícone de estado é um quadrado de --estado-tam com o número num selo que não alarga; piso e folga da rolagem são tokens; a fileira que rola ganha a folga', () => {
  assert.match(componentCss, /\.tb-estado \{[^}]*width: var\(--estado-tam\); height: min\(var\(--estado-tam\), 100%\);/);
  assert.match(componentCss, /\.tb-estado \.tb-estado__num \{ position: absolute;/, 'o número fica no canto do próprio ícone');
  assert.match(HTML, /--estado-piso: \d+px; --rolagem-folga: \d+px;/);
  assert.match(componentCss, /\.tb-side \.tb-row\[data-rola="true"\] \{ padding-bottom: calc\(var\(--space-2\) \+ var\(--rolagem-folga\)\); \}/);
  assert.match(HTML, /function ajustaEstados\(raiz\)/, 'a mesa mede a barra');
});

/* ---------------- J-48 · estados como ícones na barra de P/R ---------------- */
test('J-48 · os estados da carta são ícones na barra de P/R (dentro da face, à esquerda do P/T), com cor por família e token do enjoo nos dois temas com contraste de ícone; o selo de enjoo e as pílulas de marca saíram', () => {
  // J-53 · a barra deixou de ser absoluta com largura estimada (3.2ch): é a fileira do pé (estados à esquerda ocupando o que sobra, P/R à direita)
  assert.match(componentCss, /\.tb-card__pe \{ position: absolute; left: 2px; right: 2px; bottom: 2px;[^}]*display: flex;/);
  assert.match(componentCss, /\.tb-card__estados \{ flex: 1 1 0; min-width: 0;[^}]*overflow: hidden;/, 'a barra só ocupa o que sobra ao lado do P/R');
  for (const [fam, tok] of [['enjoo', '--estado-enjoo'], ['ataque', '--negative'], ['bloqueio', '--accent'], ['alvo', '--warning'], ['ganho', '--positive'], ['perda', '--negative']]) assert.match(componentCss, new RegExp(`\\.tb-estado\\[data-familia="${fam}"\\] \\{ color: var\\(${tok}\\);`), `família ${fam} na cor ${tok}`);
  assert.ok(!/\.tb-card__sick \{/.test(componentCss) && !/\.tb-pill--icone/.test(componentCss), 'selo de enjoo e pílula de marca saíram do CSS');
  assert.ok(!/class: 'tb-card__sick'/.test(HTML) && !/tb-pill tb-pill--icone/.test(HTML), 'a carta não desenha mais selo nem pílula de marca');
  assert.match(HTML, /const ESTADOS = \{/, 'a tabela única existe');
  for (const [nome, t] of [['escuro', DARK], ['claro', LIGHT], ['claro automático', { ...DARK, ...AUTO_LIGHT }]]) {
    assert.ok(t['--estado-enjoo'], `token --estado-enjoo no tema ${nome}`);
    for (const fundo of ['--bg-elev-1', '--bg-elev-2']) assert.ok(ratio(t['--estado-enjoo'], t[fundo]) >= 3, `enjoo sobre ${fundo} (${nome}): ${ratio(t['--estado-enjoo'], t[fundo]).toFixed(2)} ≥ 3 (ícone)`);
  }
  assert.equal(LIGHT['--estado-enjoo'], AUTO_LIGHT['--estado-enjoo'], 'o claro automático usa a mesma cor do claro');
});

/* ---------------- J-47 · contadores de zona menores ---------------- */
test('J-47 · o contador de zona pinta uma caixa de 34 px (token) por dentro de um toque de 44 px; o número usa --text-sm; a linha do lado mede pela caixa', () => {
  assert.match(css, /:root \{ --chip-zona-h: 34px; \}/, 'a altura da caixa é token');
  assert.match(componentCss, /\.tb-chip \{[^}]*min-height: var\(--tap-min\); min-width: var\(--tap-min\);\s*margin: 0 0 calc\(var\(--chip-zona-h\) - var\(--tap-min\)\); padding: 0 var\(--space-2\) calc\(var\(--tap-min\) - var\(--chip-zona-h\)\) 6px;/, 'o botão tem 44 px; a sobra de toque fica embaixo (nunca para cima, onde pousa a faixa da pilha) e a linha mede 34');
  assert.match(componentCss, /\.tb-chip::before \{[^}]*top: 0; bottom: calc\(var\(--tap-min\) - var\(--chip-zona-h\)\);[^}]*background: var\(--bg-elev-2\);/, 'a caixa pintada é o ::before, colada em cima, com a borda e o papel do contador');
  assert.match(componentCss, /\.tb-chip b \{ color: var\(--fg\); font-size: var\(--text-sm\);/);
  assert.match(componentCss, /\.tb-side__head \{[^}]*min-height: var\(--chip-zona-h\);/);
  assert.match(HTML, /Icone\(ICONE_DA_ZONA\[label\], \{ tamanho: 16, classe: 'tb-chip__icone' \}\)/, 'ícone de 16');
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
  // S-609 · relato #60 (decisão do dono: funções em ícones translúcidos sobre a câmera): a bandeja continua o destaque da
  // tela, agora dentro da base flutuante (que reserva a altura para o aviso) e em vidro do tema; as placas um degrau acima
  // ficam nos interruptores (automático, lanterna, zoom); as cinco ações são ícone e nome sobre o vidro
  assert.match(HTML, /reservaDoca\(h\('div', \{ class: 'scan-base' \}, result, h\('div', \{ class: 'scan-dock-wrap ds-surface ds-destaque' \}, dock\)\)\)/);
  assert.match(componentCss, /\.scan-dock-wrap\.ds-destaque \{ padding: var\(--space-3\) var\(--space-3\) calc\(var\(--space-3\) \+ env\(safe-area-inset-bottom, 0px\)\); \}/);
  assert.match(componentCss, /\.scan-base \.scan-dock-wrap\.ds-destaque \{ background-color: var\(--scan-vidro\);/);
  assert.match(componentCss, /\.ds-destaque \.scan-dock__chaves \.ds-btn:not\(\.ds-btn--primary\):not\(\.ds-btn--ghost\):not\(\[aria-pressed="true"\]\) \{ background-color: var\(--bg-elev-1\); \}/);
});

/* ---------------- DS-K (G-298) · FA.1 orçamento da abertura ---------------- */
test('DS-K · FA.1 a abertura anima só transform e opacity (roda no compositor e não trava enquanto o app inicia por baixo)', () => {
  // G-306 (relato #35) · a cena da estante entrou: fundo, laterais, tábuas, livros, sombras e câmera, todos no compositor
  for (const nome of ['ab-acende', 'ab-assenta', 'ab-varre', 'ab-nome', 'ab-camera', 'ab-face-surge', 'ab-fundo-chega', 'ab-lado-esq', 'ab-lado-dir', 'ab-topo-pousa', 'ab-tabua-chega', 'ab-base-chega', 'ab-livro-desce', 'ab-sombra-assenta', 'ab-emerge']) {
    const k = componentCss.match(new RegExp(`@keyframes ${nome} \\{(.*)\\}\\s*$`, 'm')); assert.ok(k, nome);
    const props = [...k[1].matchAll(/([a-z-]+):/g)].map(m => m[1]);
    assert.deepEqual([...new Set(props)].filter(p => !['transform', 'opacity'].includes(p)), [], `${nome} anima só transform e opacity: ${props}`);
  }
});

/* ---------------- G-306 (relato #35) · a abertura monta a estante em 3D e vira o ícone, sem salto de raster ---------------- */
test('G-306 · o ícone da abertura nunca muda de escala nem gira (o Chrome rasteriza a camada no tamanho do primeiro quadro: era a "imagem em baixa que vira alta"); a cena some com menos movimento; duração da cena só por token', () => {
  const k = componentCss.match(/@keyframes ab-emerge \{(.*)\}\s*$/m); assert.ok(k, 'ab-emerge');
  assert.doesNotMatch(k[1], /scale|rotate|perspective|matrix/, 'o ladrilho só esmaece (e desliza): nada que mude o tamanho projetado');
  assert.match(componentCss, /\.abertura__ladrilho \{[^}]*animation: ab-emerge /, 'o ladrilho entra por ab-emerge');
  assert.doesNotMatch(componentCss, /@keyframes ab-gira|@keyframes ab-pousa \{/, 'o giro de −90° e o pouso em escala saíram');
  // a luz de fundo é a única peça que ainda nasce em escala: gradiente difuso, sem borda para desfocar
  assert.match(componentCss, /\.abertura__cena \{[^}]*transform-style: preserve-3d;[^}]*animation: ab-camera var\(--ab-cena\)/, 'a câmera é um palco 3D que gira por token');
  assert.match(componentCss, /--ab-cena: calc\(var\(--dur-abertura\) \* 24 \/ 13\);/, 'a duração da cena deriva do token --dur-abertura (2,4 s)');
  for (const peca of ['.ab-estante__fundo', '.ab-estante__lado--esq', '.ab-estante__lado--dir', '.ab-estante__topo', '.ab-estante__tabua', '.ab-estante__base', '.ab-livro--1', '.ab-livro--2', '.ab-livro--3']) assert.match(componentCss, new RegExp(peca.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' \\{[^}]*--d: calc\\(var\\(--ab-cena\\) \\* \\.\\d+\\)'), `${peca} entra em fração da cena`);
  assert.match(componentCss, /\.abertura\[data-parada="true"\] \.abertura__cena, :root\[data-movimento="reduzido"\] \.abertura__cena \{ display: none; \}/, 'com menos movimento a cena não existe: só o ícone, parado');
  assert.match(componentCss, /@media \(prefers-reduced-motion: reduce\) \{ \.abertura__cena \{ display: none; \}/);
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

/* ---------------- DS-K3 K3-0 + MV-0 (G-357) · material por luz e tokens de movimento ---------------- */
test('DS-K3 K3-0 · material: degraus, aresta, laca, três sombras e grão existem nos três blocos (claro automático idêntico); os degraus sobem em direção à luz; texto sobre arte passa AA sobre o véu', () => {
  const novos = ['--elev-0', '--elev-1', '--elev-2', '--elev-3', '--elev-4', '--edge', '--edge-strong', '--shadow-contact', '--shadow-key', '--shadow-float', '--lacquer', '--grain'];
  for (const [nome, t] of [['escuro', DARK], ['claro', LIGHT], ['claro automático', { ...DARK, ...AUTO_LIGHT }]])
    for (const k of novos) assert.ok(t[k], `${k} no tema ${nome}`);
  for (const k of novos) assert.equal(AUTO_LIGHT[k], LIGHT[k], `${k}: claro automático idêntico ao escolhido`);
  // escuro: cada degrau mais claro que o anterior (mais perto da luz); claro: idem (o papel mais alto é o mais claro)
  for (const [nome, t] of [['escuro', DARK], ['claro', LIGHT]])
    for (let n = 1; n <= 4; n++) assert.ok(lum(t[`--elev-${n}`]) > lum(t[`--elev-${n - 1}`]), `E${n} acima de E${n - 1} no ${nome}`);
  // o texto principal passa AA em todos os degraus nos dois temas
  for (const [nome, t] of [['escuro', DARK], ['claro', LIGHT]])
    for (let n = 0; n <= 4; n++) assert.ok(ratio(t['--fg'], t[`--elev-${n}`]) >= 4.5, `--fg sobre E${n} (${nome}): ${ratio(t['--fg'], t[`--elev-${n}`]).toFixed(2)}`);
  // véu sobre arte: no pé do véu (94 % de #0a0704) o texto e o texto apagado passam AA, mesmo sobre arte branca
  const pe = '#' + [10, 7, 4].map(c => Math.round(c * .94 + 255 * .06).toString(16).padStart(2, '0')).join('');
  assert.ok(ratio(DARK['--fg-sobre-arte'], pe) >= 4.5, 'texto sobre arte: ' + ratio(DARK['--fg-sobre-arte'], pe).toFixed(2));
  assert.ok(ratio(DARK['--fg-sobre-arte-muted'], pe) >= 4.5, 'rótulo sobre arte: ' + ratio(DARK['--fg-sobre-arte-muted'], pe).toFixed(2));
  assert.match(DARK['--scrim-art'], /^linear-gradient\(180deg, rgba\(10, 7, 4, 0\) 30%/);
  assert.equal(DARK['--radius-4'], '22px'); assert.equal(DARK['--tilt-max'], '6deg');
  // as amostras do /ds usam só tokens
  assert.match(componentCss, /\.ds-elev\[data-elev="4"\] \{ background: var\(--lacquer\), var\(--elev-4\); box-shadow: inset 0 1px 0 var\(--edge-strong\), var\(--shadow-float\); \}/);
  assert.match(componentCss, /\.ds-arte-amostra \{[^}]*color: var\(--fg-sobre-arte\); background: var\(--scrim-art\)/);
});

test('DS-K3 MV-0 · movimento: durações nas pontas, escalonamento, três molas em linear() que terminam em 1, saída, distâncias e calma; moderado e reduzido trocam os tokens', () => {
  assert.equal(DARK['--dur-0'], '60ms'); assert.equal(DARK['--dur-5'], '600ms'); assert.equal(DARK['--calma'], '300ms');
  assert.deepEqual(['--escalona-1', '--escalona-2', '--escalona-3'].map(k => DARK[k]), ['60ms', '90ms', '140ms']);
  assert.deepEqual(['--desloc-1', '--desloc-2', '--desloc-3', '--z-recuo', '--z-chega'].map(k => DARK[k]), ['8px', '16px', '32px', '-40px', '-120px']);
  for (const k of ['--mola-firme', '--mola-macia', '--mola-suave']) {
    const m = DARK[k].match(/^linear\((.*)\)$/); assert.ok(m, k);
    const pts = m[1].split(',').map(Number); assert.equal(pts[0], 0, k); assert.equal(pts.at(-1), 1, k);
    assert.ok(Math.max(...pts) <= 1.14, `${k} não passa de 14 % de repique`);
  }
  assert.ok(Math.max(...DARK['--mola-suave'].slice(7, -1).split(',').map(Number)) < 1.04, 'a mola suave quase não repica');
  assert.equal(DARK['--sai'], 'cubic-bezier(.4, 0, 1, 1)');
  const mod = vars(css.slice(css.indexOf(':root[data-movimento="moderado"] {'), css.indexOf('}', css.indexOf(':root[data-movimento="moderado"] {'))));
  assert.deepEqual(['--desloc-1', '--desloc-2', '--desloc-3', '--z-recuo', '--z-chega', '--tilt-max'].map(k => mod[k]), ['4px', '6px', '8px', '0px', '0px', '0deg']);
  assert.equal(mod['--dur-5'], 'var(--dur-3)'); assert.equal(mod['--mola-macia'], 'var(--ease-out)');
  assert.match(css, /:root\[data-movimento="reduzido"\] \{ --desloc-1: 0px; --desloc-2: 0px; --desloc-3: 0px; --z-recuo: 0px; --z-chega: 0px; --tilt-max: 0deg; \}/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ :root \{ --desloc-1: 0px;[^}]*--tilt-max: 0deg; \} \}/);
  // o catálogo de movimento demonstra cada mola com a sua curva
  assert.match(componentCss, /\.ds-movimento__demo\.is-on \{ animation: ds-demo var\(--demo, var\(--dur-2\)\) var\(--demo-curva, var\(--ease-out\)\); \}/);
});

test('DS-K3 K3-1 · superfície por luz: fora da mesa o fundo é luz de cima + grão (sem veio); o cartão é E3 com laca, aresta e duas sombras, sem borda; o que flutua é E4; destaque, plano e mesa ficam como estão', () => {
  const corpo = componentCss.match(/body:not\(\[data-tela="partida"\]\) \{([^}]*)\}/); assert.ok(corpo, 'regra do fundo fora da mesa');
  assert.match(corpo[1], /background-image: radial-gradient\(1200px 520px at 50% -12%, var\(--elev-3\) 0%, transparent 62%\), var\(--grain\);/);
  assert.doesNotMatch(corpo[1], /repeating-linear-gradient/, 'o veio sai do fundo (decisão 2A)');
  assert.match(componentCss, /\.ds-surface:where\(:not\(\.ds-surface--flat, \.ds-destaque\)\) \{\s*background: var\(--lacquer\), var\(--elev-3\); border-color: transparent;\s*box-shadow: inset 0 1px 0 var\(--edge\), var\(--shadow-contact\), var\(--shadow-key\);\s*\}/);
  assert.match(componentCss, /\.ds-surface--raised:where\(:not\(\.ds-destaque\)\) \{ background: var\(--lacquer\), var\(--elev-4\); box-shadow: inset 0 1px 0 var\(--edge-strong\), var\(--shadow-float\); \}/);
  assert.match(componentCss, /\.ds-dialog \{ background: var\(--lacquer\), var\(--elev-4\); \}/);
  assert.ok(componentCss.includes(':where(body:not([data-tela="partida"])) :is(.ds-empty.ds-empty--hero, .nt-cartao, .relato-item, .deck-picker, .cat-lista) {\n  background: var(--lacquer), var(--elev-3);'), 'os cartões que não são Surface têm o mesmo material');
  // a mesa continua com o veio e a luz do feltro (MJ7)
  assert.match(componentCss, /body\[data-tela="partida"\] \{\s*background-image:\s*repeating-linear-gradient\(94deg/);
  // o texto apagado também passa AA nos degraus que viram fundo de cartão
  for (const [nome, t] of [['escuro', DARK], ['claro', LIGHT]])
    for (const n of [3, 4]) for (const f of ['--fg-muted', '--accent', '--positive', '--negative', '--player-opp', '--warning']) assert.ok(ratio(t[f], t[`--elev-${n}`]) >= 4.5, `${f} sobre E${n} (${nome}): ${ratio(t[f], t[`--elev-${n}`]).toFixed(2)}`);
});

test('DS-K3 MV-4 · família de espera: o anel que gira saiu (o fio percorre por transform), o esqueleto aparece depois de --calma e tem luz escalonada em vez de pulso; reduzido e o sistema param fio e brilho', () => {
  const sp = componentCss.match(/\.ds-spinner \{([^}]*)\}/); assert.ok(sp);
  assert.match(sp[1], /width: 28px; height: 3px;/); assert.match(sp[1], /animation: none;/);
  assert.doesNotMatch(componentCss, /\.ds-spinner \{[^}]*ds-spin/, 'nenhum anel que gira');
  assert.match(componentCss, /@keyframes ds-fio \{ from \{ transform: translateX\(-100%\); \} to \{ transform: translateX\(250%\); \} \}/);
  assert.match(componentCss, /\.ds-esqueleto \{ animation: ds-espera-aparece var\(--dur-2\) var\(--ease-out\) var\(--calma\) both; \}/);
  assert.doesNotMatch(componentCss, /ds-pulsa-esqueleto/, 'o pulso de opacidade saiu');
  assert.match(componentCss, /\.ds-esqueleto__linha:nth-child\(2\)::after \{ animation-delay: calc\(var\(--calma\) \+ var\(--escalona-2\)\); \}/);
  assert.match(componentCss, /:root\[data-movimento="reduzido"\] \.ds-spinner::after \{ animation: none !important;/);
  assert.match(componentCss, /:root\[data-movimento="reduzido"\] \.ds-esqueleto__linha::after \{ animation: none !important; opacity: 0; \}/);
  assert.match(componentCss, /@media \(prefers-reduced-motion: reduce\) \{ \.ds-esqueleto__linha \{ animation: none; \} \.ds-esqueleto__linha::after \{ animation: none; opacity: 0; \} \}/);
});

/* ---------------- DS-K3 K3-2 (G-362) · barra inferior flutuante ---------------- */
test('DS-K3 K3-2 · barra flutuante: tokens nos três blocos; pílula a --navbar-folga das bordas e da área segura, raio --radius-4; vidro (desfoque) só nela, dentro de @supports e fora do reduzido; reserva opaca com transparência reduzida, contraste alto ou movimento reduzido; texto e ícones AA mesmo com branco (escuro) ou preto (claro) atrás; o fim da tela reserva o ressalto do Jogar; a mesa não muda', () => {
  const novos = ['--navbar-alt', '--navbar-folga', '--navbar-ressalto', '--vidro', '--vidro-reserva', '--vidro-desfoque'];
  for (const [nome, t] of [['escuro', DARK], ['claro', LIGHT], ['claro automático', { ...DARK, ...AUTO_LIGHT }]]) for (const k of novos) assert.ok(t[k], `${k} no tema ${nome}`);
  for (const k of novos) assert.equal(AUTO_LIGHT[k], LIGHT[k], `${k}: claro automático idêntico ao escolhido`);
  assert.deepEqual(['--navbar-alt', '--navbar-folga', '--navbar-ressalto'].map(k => DARK[k]), ['64px', '14px', '16px']);
  // a reserva é o E4 cheio; o vidro é o mesmo E4 a 92 %
  const rgba = v => { const m = v.match(/^rgba\((\d+), (\d+), (\d+), ([\d.]+)\)$/); assert.ok(m, v); return [+m[1], +m[2], +m[3], +m[4]]; };
  const hex = c => '#' + c.map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
  const sobre = (v, atras) => { const [r, g, b, a] = rgba(v); const f = [1, 3, 5].map(i => parseInt(atras.slice(i, i + 2), 16)); return hex([r, g, b].map((c, i) => c * a + f[i] * (1 - a))); };
  for (const [nome, t, atras] of [['escuro', DARK, '#ffffff'], ['claro', LIGHT, '#000000']]) {
    assert.equal(t['--vidro-reserva'], t['--elev-4'], `reserva opaca = E4 (${nome})`);
    const [r, g, b, a] = rgba(t['--vidro']); assert.equal(hex([r, g, b]), t['--elev-4'], `vidro é o E4 (${nome})`); assert.ok(a >= .9, `vidro quase opaco (${nome}): ${a}`);
    // pior caso: o oposto do tema por trás do vidro; a reserva opaca também
    for (const fundo of [sobre(t['--vidro'], atras), t['--vidro-reserva']])
      for (const f of ['--fg', '--fg-muted', '--accent']) assert.ok(ratio(t[f], fundo) >= 4.5, `${f} sobre a barra ${fundo} (${nome}): ${ratio(t[f], fundo).toFixed(2)}`);
  }
  const barra = componentCss.match(/\.ds-navbar \{ position: fixed;([^}]*)\}/); assert.ok(barra);
  assert.match(barra[1], /left: var\(--navbar-folga\); right: var\(--navbar-folga\); bottom: calc\(var\(--navbar-folga\) \+ env\(safe-area-inset-bottom, 0px\)\);/);
  assert.match(barra[1], /height: var\(--navbar-alt\);/); assert.match(barra[1], /border-radius: var\(--radius-4\);/);
  assert.match(barra[1], /background: var\(--lacquer\), var\(--vidro-reserva\); box-shadow: inset 0 1px 0 var\(--edge-strong\), var\(--shadow-float\);/);
  assert.doesNotMatch(barra[1], /backdrop-filter/, 'sem @supports, a barra é opaca');
  assert.match(componentCss, /@supports \(\(backdrop-filter: blur\(1px\)\) or \(-webkit-backdrop-filter: blur\(1px\)\)\) \{\n  :root:not\(\[data-movimento="reduzido"\]\) \.ds-navbar \{ background: var\(--lacquer\), var\(--vidro\); -webkit-backdrop-filter: var\(--vidro-desfoque\); backdrop-filter: var\(--vidro-desfoque\); \}\n\}/);
  assert.match(componentCss, /@media \(prefers-reduced-transparency: reduce\), \(prefers-contrast: more\), \(prefers-reduced-motion: reduce\) \{\n  :root:not\(\[data-movimento="reduzido"\]\) \.ds-navbar \{ background: var\(--lacquer\), var\(--vidro-reserva\); -webkit-backdrop-filter: none; backdrop-filter: none; \}\n\}/);
  assert.ok(componentCss.indexOf('@media (prefers-reduced-transparency') > componentCss.indexOf('@supports ((backdrop-filter'), 'a reserva vem depois do vidro (mesmo seletor)');
  // vidro só na barra: o desfoque do vidro aparece numa regra só, e o fundo de vidro só na barra e na amostra do /ds
  assert.equal(componentCss.split('backdrop-filter: var(--vidro-desfoque)').length - 1, 2, 'desfoque do vidro só na regra da barra (com e sem prefixo)');
  const usosVidro = [...componentCss.matchAll(/([^{}\n]+)\{[^{}]*var\(--vidro\)[^{}]*\}/g)].map(m => m[1].trim());
  assert.deepEqual(usosVidro, ['.ds-vidro[data-vidro="vidro"]', ':root:not([data-movimento="reduzido"]) .ds-navbar']);
  // o fim da tela reserva a barra e o ressalto do Jogar; a mesa (partida) não reserva nada e não mostra a barra
  assert.match(componentCss, /:root \{ --navbar-h: 0px; --navbar-reserva: 0px; \}/);
  assert.match(componentCss, /--navbar-reserva: calc\(var\(--navbar-h\) \+ var\(--navbar-ressalto\)\); \}/);
  assert.match(componentCss, /\.ds-navbar \.ds-nav--jogar \.ds-navbar__latao \{[^}]*width: 56px; height: 56px; flex: none; margin-top: calc\(-1 \* var\(--navbar-ressalto\)\);/);
  // as reservas do Relatar e do botão de ação nunca ficam abaixo da reserva da barra; a doca do Jogar reserva o ressalto
  for (const r of ['#outlet:has(.ds-fab) { padding-bottom: max(var(--navbar-reserva), calc(56px + var(--space-6))); }', '#outlet:not(:has(.ds-fab)) { padding-bottom: max(var(--navbar-reserva), calc(48px + var(--space-6))); }', '#outlet { padding-bottom: max(var(--navbar-reserva), calc(56px + 48px + var(--space-6))); }', 'body[data-tela="mesa"]:not([data-mesa-cheia="true"]) .mesa-doca { padding-bottom: calc(var(--navbar-ressalto) + var(--space-1)); }'])
    assert.ok(componentCss.includes(r), r);
  // alvos: cada destino ocupa a altura da pílula (64 ≥ 44); o atual em acento (AA acima), com um fio de 16 px
  assert.match(componentCss, /\.ds-navbar \.ds-nav \{ width: 100%; min-width: 0; height: 100%;/);
  assert.match(componentCss, /\.ds-navbar \.ds-nav\[aria-current="page"\] \{ color: var\(--accent\); \}/);
  assert.match(componentCss, /\.ds-navbar \.ds-nav--jogar \{[^}]*color: var\(--accent\); \}/);
  assert.match(componentCss, /body:is\(\[data-tela="partida"\], \[data-tela="scanner"\], \[data-tela="entrar"\], \[data-mesa-cheia="true"\]\) \.ds-navbar \{ display: none; \}/);
});
