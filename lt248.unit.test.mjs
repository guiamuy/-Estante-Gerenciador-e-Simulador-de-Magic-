// M-566 · LT225 · revisão por lote CCI (texto e rulings da Scryfall de 22/10/2026): Ragavan, Nimble Pilferer — "Whenever Ragavan deals combat damage to a
// player, create a Treasure token and exile the top card of that player's library. Until end of turn, you may cast that card." A carta é do oponente:
// você a conjura do exílio (601.2a), pagando o custo, e ela vai ao cemitério do dono; terreno exilado não pode ser jogado (ruling de 18/06/2021).
// Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, act, poe, legais, passaAte } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const RG = 'Ragavan, Nimble Pilferer', rg = OF.find(x => x.name === RG);
const C = { [RG]: { name: RG, type_line: rg.type_line, mana_cost: rg.mana_cost, cmc: 1, keywords: ['Dash'], oracle_text: rg.oracle_text, power: '2', toughness: '1', colors: ['R'] },
  Mountain: { name: 'Mountain', type_line: 'Basic Land — Mountain', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {R}.)', colors: [] },
  Island: { name: 'Island', type_line: 'Basic Land — Island', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {U}.)', colors: [] },
  Chute: { name: 'Chute', type_line: 'Instant', mana_cost: '{1}', cmc: 1, keywords: ['Kicker'], oracle_text: 'Kicker {1}', colors: [] },
  Sorte: { name: 'Sorte', type_line: 'Instant', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] } };
const SCRIPTS = { Chute: { name: 'Chute', kicker: { mana: '{1}' }, effects: [{ do: 'gain', amount: 1 }, { do: 'draw', amount: 1, onlyIf: 'kicked' }], example: { target: 'none', expect: { selfLife: 1 } } }, Sorte: { name: 'Sorte', effects: [{ do: 'gain', amount: 3 }], example: { target: 'none', expect: { selfLife: 3 } } } };
function mesa(topoDeB) {
  const b = ns => ns.map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 248, mode: 'full', cards: C, scripts: SCRIPTS, first: 0, players: [
    { name: 'A', deck: b([[RG, 2], ['Mountain', 38]]) }, { name: 'B', deck: b([['Sorte', 4], ['Chute', 2], ['Island', 34]]) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  let r; [s, r] = poe(s, 0, RG); for (let i = 0; i < 2; i++) [s] = poe(s, 0, 'Mountain');
  const t = s.zones[1].library.find(x => s.objects[x].name === topoDeB); s.zones[1].library.splice(s.zones[1].library.indexOf(t), 1); s.zones[1].library.unshift(t);
  return [s, r, t];
}
const ataca = (s, r) => { s = passaAte(s, x => !!x.pending && x.pending.kind === 'attackers');
  s = act(s, { t: 'attack', p: 0, attackers: [r] }); return passaAte(s, x => x.turn.step === 'main2' && !x.stack.length && !x.pending); };

test('M-566 · Ragavan joga (lido e aprovado)', () => { assert.equal(S.coverage(C[RG]).level, 'completo'); });

test('M-566 · dano de combate: Tesouro e a carta do topo DELE exilada; você a conjura até o fim do turno e ela vai ao cemitério do dono', () => {
  let [s, r, t] = mesa('Sorte'); const vidaA = s.players[0].life;
  s = ataca(s, r); assert.equal(s.players[1].life, 18);
  assert.ok(s.zones[0].battlefield.some(o => s.objects[o].name === 'Treasure'), 'Tesouro');
  assert.equal(s.objects[t].zone, 'exile'); assert.equal(s.objects[t].owner, 1, 'continua de B');
  const c = legais(s, 0, a => a.t === 'cast' && a.oid === t); assert.ok(c.length, 'A pode conjurar a carta de B');
  s = passaAte(act(s, c[0]), x => !x.stack.length && !x.pending);
  assert.equal(s.players[0].life, vidaA + 3, 'o efeito é de quem conjurou'); assert.equal(s.objects[t].zone, 'graveyard'); assert.ok(s.zones[1].graveyard.includes(t), 'no cemitério do dono');
});

test('M-566 · terreno exilado não pode ser jogado; a permissão acaba no fim do turno', () => {
  let [s, r, t] = mesa('Island'); s = ataca(s, r);
  assert.equal(s.objects[t].zone, 'exile'); assert.equal(legais(s, 0, a => (a.t === 'play_land' || a.t === 'cast') && a.oid === t).length, 0, 'terreno: nem jogar nem conjurar');
  let [u, r2, t2] = mesa('Sorte'); u = ataca(u, r2);
  u = passaAte(u, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  assert.equal(legais(u, 0, a => a.t === 'cast' && a.oid === t2).length, 0); assert.ok(!u.objects[t2].playableFromExile, 'sem permissão depois do turno');
});

test('M-566 · achado da revisão: do exílio, a carta de outro dono também oferece reforço (e custo adicional e alternativo, pelas mesmas ofertas da mão)', () => {
  let [s, r, t] = mesa('Chute'); s = ataca(s, r); [s] = poe(s, 0, 'Mountain');
  const cs = legais(s, 0, a => a.t === 'cast' && a.oid === t); assert.ok(cs.some(a => a.kick === 1), JSON.stringify(cs));
  const m0 = s.zones[0].hand.length; s = passaAte(act(s, cs.find(a => a.kick === 1)), x => !x.stack.length && !x.pending);
  assert.equal(s.zones[0].hand.length, m0 + 1, 'com reforço, A compra'); assert.ok(s.zones[1].graveyard.includes(t));
});

test('M-566 · achado do portão: carta com dobra exilada pelo Ragavan não oferece nem aceita a dobra ("cast this card from your hand", 702.185a)', () => {
  const DB = 'Dobrador';
  C[DB] = { name: DB, type_line: 'Creature — Eldrazi', mana_cost: '{5}', cmc: 5, keywords: ['Warp'], oracle_text: 'Warp {1} (You may cast this card from your hand for its warp cost. Exile this creature at the beginning of the next end step, then you may cast it from exile on a later turn.)', power: '5', toughness: '5', colors: [] };
  try {
    let [s, r] = mesa('Island'); const t = s.zones[1].library[0]; s = JSON.parse(JSON.stringify(s));
    s.objects[t].name = DB; s.facts[DB] = { ...s.facts.Island, ...E.createGame({ format: 'livre', seed: 1, mode: 'full', cards: C, scripts: SCRIPTS, first: 0, players: [{ name: 'X', deck: [{ name: DB, qty: 40, zone: 'main' }] }, { name: 'Y', deck: [{ name: DB, qty: 40, zone: 'main' }] }] }).facts[DB] };
    s = ataca(s, r); assert.equal(s.objects[t].zone, 'exile');
    assert.equal(legais(s, 0, a => a.t === 'cast' && a.oid === t && a.alt != null).length, 0, 'sem dobra do exílio');
    assert.throws(() => E.apply(s, { t: 'cast', p: 0, oid: t, alt: 0 }), /dobra só se paga conjurando da mão/);
  } finally { delete C[DB]; }
});
