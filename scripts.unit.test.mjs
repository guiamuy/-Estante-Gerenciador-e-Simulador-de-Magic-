// Camada 1 · scripts de carta (S1, S2, S4, S5) e cenário de cada script da biblioteca.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
const { engine: E, scripts: S } = loadModules();
const J = x => JSON.parse(JSON.stringify(x));

const card = (name, type_line, extra = {}) => ({ name, type_line, mana_cost: extra.mana_cost || '', cmc: 0, keywords: extra.keywords || [], oracle_text: extra.oracle_text || '',
  ...(extra.pt ? { power: String(extra.pt[0]), toughness: String(extra.pt[1]) } : {}) });
const CARDS = {
  'Island': card('Island', 'Basic Land — Island'),
  'Grizzly Bear': card('Grizzly Bear', 'Creature — Bear', { pt: [2, 2] }),
  'Hexproof Bear': card('Hexproof Bear', 'Creature — Bear', { pt: [2, 2], keywords: ['Hexproof'], oracle_text: 'Hexproof' }),
  'Shroud Ox': card('Shroud Ox', 'Creature — Ox', { pt: [3, 3], keywords: ['Shroud'], oracle_text: 'Shroud' }),
  'Steel Wall': card('Steel Wall', 'Artifact Creature — Wall', { pt: [0, 4], keywords: ['Defender', 'Indestructible'], oracle_text: 'Defender, indestructible' }),
  'Mind Stone': card('Mind Stone', 'Artifact', { oracle_text: '{T}: Add {C}.\n{1}, {T}, Sacrifice Mind Stone: Draw a card.' }),
  'Preordain': card('Preordain', 'Sorcery', { oracle_text: 'Scry 2, then draw a card.' }),
  'Mystery Enchantment': card('Mystery Enchantment', 'Enchantment', { oracle_text: 'At the beginning of your upkeep, do something strange.' })
};
for (const sc of S.RAW_SCRIPTS) CARDS[sc.name] = card(sc.name, /counter|Unsummon|Vapor|Giant|Twiddle|Salve/i.test(sc.name) ? 'Instant' : 'Sorcery');
CARDS['Lightning Bolt'].type_line = 'Instant'; CARDS['Shock'].type_line = 'Instant'; CARDS['Counterspell'].type_line = 'Instant';
CARDS['Essence Scatter'].type_line = 'Instant'; CARDS['Negate'].type_line = 'Instant'; CARDS['Disenchant'].type_line = 'Instant';
CARDS['Doom Blade'].type_line = 'Instant'; CARDS['Murder'].type_line = 'Instant'; CARDS['Disfigure'].type_line = 'Instant';

const DECK = [{ name: 'Island', qty: 20, zone: 'main' }, { name: 'Grizzly Bear', qty: 4, zone: 'main' },
  { name: 'Hexproof Bear', qty: 2, zone: 'main' }, { name: 'Shroud Ox', qty: 2, zone: 'main' }, { name: 'Steel Wall', qty: 2, zone: 'main' },
  ...S.RAW_SCRIPTS.map(sc => ({ name: sc.name, qty: 2, zone: 'main' }))];
const setup = (seed = 1) => ({ format: 'livre', seed, mode: 'assisted', manaCheck: false, cards: CARDS, players: [{ name: 'A', deck: DECK }, { name: 'B', deck: DECK }] });

function game(seed = 1) {
  let s = E.createGame(setup(seed));
  for (let p = 0; p < 2; p++) s = E.apply(s, { t: 'keep', p, bottom: [] }).state;
  for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = E.apply(s, { t: 'pass', p: s.turn.priority }).state;
  return s;
}
function put(s, p, name, zone = 'battlefield', opts = {}) {
  s = J(s);
  const from = ['library', 'hand'].map(z => s.zones[p][z]).find(z => z.some(o => s.objects[o].name === name));
  const oid = from.find(o => s.objects[o].name === name);
  from.splice(from.indexOf(oid), 1); s.zones[p][zone].push(oid);
  Object.assign(s.objects[oid], { zone, sick: false, ...opts });
  return [s, oid];
}
const act = (s, a) => E.apply(s, a).state;
const resolve = s => { const a = s.turn.priority; s = act(s, { t: 'pass', p: a }); return act(s, { t: 'pass', p: s.turn.priority }); };

/* ---------------- S1 · formato e validador ---------------- */
test('S1 · validador recusa script sem efeito, com efeito desconhecido, sem campo e com alvo errado', () => {
  assert.deepEqual([...S.validateScript({ name: 'X', effects: [{ do: 'damage', amount: 3, target: 'any' }] })], []);
  assert.match(S.validateScript({ name: 'X', effects: [] }).join(), /sem efeitos/);
  assert.match(S.validateScript({ name: 'X', effects: [{ do: 'teletransportar' }] }).join(), /desconhecido/);
  assert.match(S.validateScript({ name: 'X', effects: [{ do: 'damage', target: 'any' }] }).join(), /falta amount/);
  assert.match(S.validateScript({ name: 'X', effects: [{ do: 'counter', target: 'creature' }] }).join(), /alvo "creature" não vale/);
  assert.match(S.validateScript({ effects: [{ do: 'draw', amount: 1 }] }).join(), /sem nome/);
});

test('S1 · a biblioteca inteira é válida e só vale para mágicas', () => {
  assert.deepEqual(J(S.SCRIPT_ERRORS), {});
  assert.equal(Object.keys(S.SCRIPTS).length, S.RAW_SCRIPTS.length);
  const s = E.createGame({ ...setup(2), scripts: { 'Grizzly Bear': { name: 'Grizzly Bear', effects: [{ do: 'draw', amount: 9 }] }, 'Bad': { name: 'Bad', effects: [] } } });
  assert.equal(s.facts['Grizzly Bear'].script, null, 'criatura não recebe script de mágica');
  assert.equal(s.facts['Lightning Bolt'].script.effects[0].amount, 3);
});

/* ---------------- S2 · cobertura ---------------- */
test('S2 · nível de cobertura por carta', () => {
  const lv = c => S.coverage(c).level;
  assert.equal(lv(CARDS['Lightning Bolt']), 'completo', 'tem script');
  assert.equal(lv(CARDS['Grizzly Bear']), 'completo', 'baunilha');
  assert.equal(lv(CARDS['Steel Wall']), 'completo', 'só palavras-chave conhecidas');
  assert.equal(lv(CARDS['Island']), 'completo');
  assert.equal(lv(CARDS['Mind Stone']), 'parcial', 'mana conhecida + habilidade que o motor não resolve');
  assert.equal(lv(CARDS['Preordain']), 'manual', 'mágica sem script');
  assert.equal(lv(CARDS['Mystery Enchantment']), 'manual');
  assert.equal(lv({ name: 'Desconhecida' }), 'manual');
});

test('S2 · cobertura da lista: percentual, contagem e o que falta; reserva não conta', () => {
  const cards = new Map(Object.entries(CARDS).map(([k, v]) => [k, v]));
  const cov = S.deckCoverage([{ name: 'Lightning Bolt', qty: 4, zone: 'main' }, { name: 'Grizzly Bear', qty: 4, zone: 'main' },
    { name: 'Preordain', qty: 2, zone: 'main' }, { name: 'Mind Stone', qty: 2, zone: 'main' }, { name: 'Preordain', qty: 10, zone: 'side' }], cards);
  assert.deepEqual({ c: cov.completo, p: cov.parcial, m: cov.manual, total: cov.total, pct: cov.pct }, { c: 8, p: 2, m: 2, total: 12, pct: 67 });
  assert.deepEqual([...cov.worst].sort(), ['Mind Stone', 'Preordain']);
});

/* ---------------- S4 · efeitos ---------------- */
test('S4 · dano, destruir, devolver, anular, comprar, vida e pump', () => {
  let s = game(3); const a = s.turn.active, d = 1 - a;
  let bolt, bear, murder, unsummon, growth, div;
  [s, bear] = put(s, d, 'Grizzly Bear');
  [s, bolt] = put(s, a, 'Lightning Bolt', 'hand');
  s = resolve(act(s, { t: 'cast', p: a, oid: bolt, targets: [{ player: d }] }));
  assert.equal(s.players[d].life, 17);

  [s, murder] = put(s, a, 'Murder', 'hand');
  s = resolve(act(s, { t: 'cast', p: a, oid: murder, targets: [{ oid: bear }] }));
  assert.equal(s.objects[bear].zone, 'graveyard');

  let bear2; [s, bear2] = put(s, d, 'Grizzly Bear');
  [s, unsummon] = put(s, a, 'Unsummon', 'hand');
  s = resolve(act(s, { t: 'cast', p: a, oid: unsummon, targets: [{ oid: bear2 }] }));
  assert.equal(s.objects[bear2].zone, 'hand');

  let bear3; [s, bear3] = put(s, a, 'Grizzly Bear');
  [s, growth] = put(s, a, 'Giant Growth', 'hand');
  s = resolve(act(s, { t: 'cast', p: a, oid: growth, targets: [{ oid: bear3 }] }));
  assert.deepEqual(J(s.objects[bear3].pump), { p: 3, t: 3 });

  const hand = s.zones[a].hand.length;
  [s, div] = put(s, a, 'Divination', 'hand');
  s = resolve(act(s, { t: 'cast', p: a, oid: div }));
  assert.equal(s.zones[a].hand.length, hand + 2 - 1 + 1, 'comprou 2, gastou a carta (e o put tirou do grimório)');
});

test('S4 · efeito até o fim do turno acaba na limpeza; indestrutível resiste a destruir', () => {
  let s = game(4); const a = s.turn.active;
  let wall, growth, disen;
  [s, wall] = put(s, a, 'Steel Wall');
  [s, growth] = put(s, a, 'Giant Growth', 'hand');
  s = resolve(act(s, { t: 'cast', p: a, oid: growth, targets: [{ oid: wall }] }));
  [s, disen] = put(s, a, 'Disenchant', 'hand');
  const r = E.apply(act(s, { t: 'cast', p: a, oid: disen, targets: [{ oid: wall }] }), { t: 'pass', p: a });
  const r2 = E.apply(r.state, { t: 'pass', p: r.state.turn.priority });
  assert.equal(r2.state.objects[wall].zone, 'battlefield');
  assert.ok(r2.events.some(e => e.do === 'destroy' && e.failed), 'o registro diz que não destruiu');
  let t = r2.state;
  for (let i = 0; i < 40 && t.turn.number === s.turn.number; i++) { t = t.pending ? act(t, { t: 'discard', p: t.pending.p, oid: t.zones[t.pending.p].hand[0] }) : act(t, { t: 'pass', p: t.turn.priority }); }
  assert.equal(t.objects[wall].pump, undefined, 'o +3/+3 não passa do turno');
});

test('S4 · Vapor Snag: devolve e o controlador do alvo perde 1', () => {
  let s = game(5); const a = s.turn.active, d = 1 - a;
  let bear, snag;
  [s, bear] = put(s, d, 'Grizzly Bear');
  [s, snag] = put(s, a, 'Vapor Snag', 'hand');
  s = resolve(act(s, { t: 'cast', p: a, oid: snag, targets: [{ oid: bear }] }));
  assert.equal(s.objects[bear].zone, 'hand');
  assert.equal(s.players[d].life, 19);
  assert.equal(s.players[a].life, 20);
});

/* ---------------- S5 · alvos ---------------- */
test('S5 · maldição de véu e proteção; anular só pega mágica do tipo certo', () => {
  let s = game(6); const a = s.turn.active, d = 1 - a;
  let hex, ox, mine, bolt;
  [s, hex] = put(s, d, 'Hexproof Bear'); [s, ox] = put(s, d, 'Shroud Ox'); [s, mine] = put(s, a, 'Hexproof Bear');
  [s, bolt] = put(s, a, 'Lightning Bolt', 'hand');
  const targets = E.legalTargets(s, a, 'creature');
  assert.ok(!targets.some(t => t.oid === hex), 'protegida do oponente não pode ser alvo');
  assert.ok(!targets.some(t => t.oid === ox), 'maldição de véu não pode ser alvo de ninguém');
  assert.ok(targets.some(t => t.oid === mine), 'a sua protegida você mesmo pode mirar');
  assert.throws(() => act(s, { t: 'cast', p: a, oid: bolt, targets: [{ oid: hex }] }), /alvo ilegal/);
  assert.throws(() => act(s, { t: 'cast', p: a, oid: bolt }), /escolha 1 alvo/);

  let bear, scatter, negate;
  [s, bear] = put(s, a, 'Grizzly Bear', 'hand');
  s = act(s, { t: 'cast', p: a, oid: bear });
  [s, negate] = put(s, d, 'Negate', 'hand');
  assert.equal(E.legalTargets(s, d, 'noncreature-spell').length, 0, 'Negate não pega mágica de criatura');
  [s, scatter] = put(s, d, 'Essence Scatter', 'hand');
  s = act(s, { t: 'pass', p: a });
  s = act(s, { t: 'cast', p: d, oid: scatter, targets: [{ oid: bear }] });
  s = resolve(s);
  assert.equal(s.objects[bear].zone, 'graveyard', 'criatura anulada vai para o cemitério');
});

test('S5 · alvo que some antes da resolução anula a mágica (608.2b)', () => {
  let s = game(7); const a = s.turn.active, d = 1 - a;
  let bear, bolt, bolt2;
  [s, bear] = put(s, d, 'Grizzly Bear');
  [s, bolt] = put(s, a, 'Lightning Bolt', 'hand'); [s, bolt2] = put(s, a, 'Lightning Bolt', 'hand');
  s = act(s, { t: 'cast', p: a, oid: bolt, targets: [{ oid: bear }] });
  s = act(s, { t: 'cast', p: a, oid: bolt2, targets: [{ oid: bear }] });
  const r1 = E.apply(E.apply(s, { t: 'pass', p: a }).state, { t: 'pass', p: d }); // resolve o segundo: mata o urso
  assert.equal(r1.state.objects[bear].zone, 'graveyard');
  const r2 = E.apply(E.apply(r1.state, { t: 'pass', p: a }).state, { t: 'pass', p: d });
  assert.ok(r2.events.some(e => e.kind === 'fizzled'), 'sem alvo legal, a mágica é anulada na resolução');
  assert.equal(r2.state.players[d].life, 20, 'e não causa dano a ninguém');
  assert.equal(r2.state.objects[bolt].zone, 'graveyard');
});

/* ---------------- S8-lite · cenário de cada script ---------------- */
test('cada script da biblioteca resolve numa mesa real sem quebrar invariante', () => {
  for (const sc of S.RAW_SCRIPTS) {
    let s = game(8); const a = s.turn.active, d = 1 - a;
    [s] = put(s, d, 'Grizzly Bear'); [s] = put(s, a, 'Grizzly Bear');
    let oid; [s, oid] = put(s, a, sc.name, 'hand');
    const total = Object.keys(s.objects).length;
    const opts = E.legalActions(s, a).filter(x => x.t === 'cast' && x.oid === oid);
    if (!opts.length) { // só mágicas que exigem alvo na pilha ficam sem opção aqui
      assert.ok(sc.effects.some(e => /spell/.test(e.target || '')), `${sc.name} deveria ter alvo legal`);
      continue;
    }
    s = resolve(act(s, opts[0]));
    assert.equal(E.invariants(s, total).join('; '), '', sc.name);
    assert.equal(s.objects[oid].zone, 'graveyard', `${sc.name} foi para o cemitério`);
  }
});
