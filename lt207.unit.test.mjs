// M-525 · LT187 · revisão por lote CLXIII: delírio estático (textos da Scryfall de 19/10/2026) — "as long as there are four or more card
// types among cards in your graveyard" (205.2a; 611.2b: vale enquanto for verdade). Dragon's Rage Channeler (+2/+2, voar e "attacks each
// combat if able" só com delírio, 508.1d), Moldgraf Scavenger, Kessig Dire Swine e Hound of the Farbogs. Falham no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ["Dragon's Rage Channeler", 'Moldgraf Scavenger', 'Kessig Dire Swine', 'Hound of the Farbogs'];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Mountain: terra('Mountain', 'Mountain', 'R'), Forest: terra('Forest', 'Forest', 'G'),
  'Lightning Bolt': { name: 'Lightning Bolt', type_line: 'Instant', mana_cost: '{R}', cmc: 1, keywords: [], oracle_text: 'Lightning Bolt deals 3 damage to any target.', colors: ['R'] },
  Feitico: { name: 'Feitico', type_line: 'Sorcery', mana_cost: '{3}', cmc: 3, keywords: [], oracle_text: '', colors: [] },
  Amuleto: { name: 'Amuleto', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] },
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', power: '2', toughness: '2', colors: ['G'] } });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: /Land/.test(C[name].type_line) ? 10 : 4, zone: 'main' }));
  const extras = ['Lightning Bolt', 'Feitico', 'Amuleto', 'Urso'];
  let s = E.createGame({ format: 'livre', seed: 207, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, ...extras, 'Mountain', 'Forest']) }, { name: 'B', deck: b([...extras, 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const limpa = s => passaAte(s, x => !x.stack.length && !x.pending && !(x.queued || []).length);
const cemiterio = (s, p, ns) => { for (const n of ns) [s] = poe(s, p, n, 'graveyard'); return s; };
const TRES = ['Forest', 'Lightning Bolt', 'Feitico'], QUATRO = [...TRES, 'Urso'];

test("M-525 · Dragon's Rage Channeler: com três tipos no cemitério é 1/1 sem voar; com quatro, 3/3 com voar", () => {
  let s = mesa(), d; [s, d] = poe(s, 0, "Dragon's Rage Channeler"); s = cemiterio(s, 0, TRES);
  assert.equal(E.stats(s, s.objects[d]).power, 1); assert.equal(E.hasKeyword(s, s.objects[d], 'flying'), false);
  s = cemiterio(s, 0, ['Lightning Bolt', 'Feitico']); assert.equal(E.stats(s, s.objects[d]).power, 1, 'cartas repetidas do mesmo tipo não somam');
  s = cemiterio(s, 0, ['Amuleto']); assert.equal(E.stats(s, s.objects[d]).power, 3); assert.equal(E.stats(s, s.objects[d]).toughness, 3); assert.ok(E.hasKeyword(s, s.objects[d], 'flying'));
});

test("M-525 · Dragon's Rage Channeler: o cemitério do oponente não conta", () => {
  let s = mesa(), d; [s, d] = poe(s, 0, "Dragon's Rage Channeler"); s = cemiterio(s, 1, QUATRO);
  assert.equal(E.stats(s, s.objects[d]).power, 1);
});

test("M-525 · Dragon's Rage Channeler ataca se puder só com delírio", () => {
  let s = mesa(), d; [s, d] = poe(s, 0, "Dragon's Rage Channeler"); s = passaAte(s, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 0);
  assert.doesNotThrow(() => E.apply(s, { t: 'attack', p: 0, attackers: [] }), 'sem delírio pode ficar');
  let t = mesa(), d2; [t, d2] = poe(t, 0, "Dragon's Rage Channeler"); t = cemiterio(t, 0, QUATRO); t = passaAte(t, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 0);
  assert.throws(() => E.apply(t, { t: 'attack', p: 0, attackers: [] }), 'com delírio precisa atacar');
  assert.doesNotThrow(() => E.apply(t, { t: 'attack', p: 0, attackers: [d2] }));
});

test("M-525 · Dragon's Rage Channeler: vidência 1 a cada mágica não criatura sua", () => {
  let s = mesa(), d, lb; [s, d] = poe(s, 0, "Dragon's Rage Channeler"); [s, lb] = poe(s, 0, 'Lightning Bolt', 'hand'); [s] = poe(s, 0, 'Mountain');
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === lb && a.targets && a.targets[0] && a.targets[0].player === 1)[0]);
  s = passaAte(s, x => !!x.pending && x.pending.kind !== 'priority' || !x.stack.length);
  assert.ok(s.pending, 'a vidência pergunta'); const topo = s.zones[0].library[0];
  s = limpa(act(s, legais(s, 0, a => a.oid === topo)[0] || legais(s, 0)[0])); assert.ok(['graveyard', 'library'].includes(s.objects[topo].zone));
});

test('M-525 · Moldgraf Scavenger +3/+0, Kessig Dire Swine atropelar e Hound of the Farbogs ameaça, só com delírio', () => {
  let s = mesa(), m, k, h; [s, m] = poe(s, 0, 'Moldgraf Scavenger'); [s, k] = poe(s, 0, 'Kessig Dire Swine'); [s, h] = poe(s, 0, 'Hound of the Farbogs');
  assert.equal(E.stats(s, s.objects[m]).power, 0); assert.equal(E.hasKeyword(s, s.objects[k], 'trample'), false); assert.equal(E.hasKeyword(s, s.objects[h], 'menace'), false);
  s = cemiterio(s, 0, QUATRO);
  assert.equal(E.stats(s, s.objects[m]).power, 3); assert.equal(E.stats(s, s.objects[m]).toughness, 4); assert.ok(E.hasKeyword(s, s.objects[k], 'trample')); assert.ok(E.hasKeyword(s, s.objects[h], 'menace'));
});
