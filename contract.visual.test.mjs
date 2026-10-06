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
  assert.match(componentCss, /:root \{ --carta-campo: 84px; --carta-mao: 100px; --carta-pilha: 56px; \}/, 'padrão 84/100/56');
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
  for (const sup of ['feltro', 'pedra', 'linho']) {
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
  const exportacao = html.match(/return \{ h, Text, Button, Field, Select, Chip,[^}]*\};/s);
  assert.ok(exportacao, 'linha de exportação do DS');
  const nomes = exportacao[0].replace(/^return \{|\};$/g, '').split(',').map(x => x.trim()).filter(Boolean);
  // o que não é visual (utilitários, símbolos de mana parseados, fechamento) fica fora da exigência
  const NAO_VISUAL = new Set(['h', 'clear', 'mount', 'closeDialog', 'fechaToast', 'reservaDoca', 'analisaSimbolos', 'SIMBOLO_RX', 'nomeDoSimbolo', 'simbolizar', 'srcsetDaCarta', 'ICONES', 'ImagemCarta',
    'deveAncorar', 'instalaAncora', 'levaAte']); // J1 · comportamento de rolagem, sem desenho próprio
  const i = html.indexOf('const Section = (title, ...kids)'); const j = html.indexOf('\n}\n', html.indexOf('function renderDS()')); const catalogo = html.slice(i, j); // o módulo do catálogo inteiro (Section usa Surface)
  const faltam = nomes.filter(n => !NAO_VISUAL.has(n)).filter(n => !new RegExp(`\\b${n}\\(`).test(catalogo) && !catalogo.includes(`${n}(`));
  assert.deepEqual(faltam, [], 'componentes do DS fora do catálogo');
  for (const secao of ['Tokens', 'Tipografia', 'Botões', 'Perfil e progresso', 'Estados', 'Movimento', 'Mesa', 'Sobreposições', 'Checklist de design por leva']) assert.ok(catalogo.includes(`'${secao}'`), `seção ${secao}`);
  for (const id of ['ds-tokens-cor', 'ds-tokens-texto', 'ds-tokens-espaco', 'ds-checklist', 'ds-movimentos', 'ds-versos', 'ds-linha-estado']) assert.ok(html.includes(`'${id}'`), id);
});
