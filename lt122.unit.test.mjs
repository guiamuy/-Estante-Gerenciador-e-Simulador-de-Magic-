// M-440 · LT106 · Bone Picker ("This spell costs {3} less to cast if a creature died this turn. / Flying, deathtouch"). Texto da Scryfall de 17/10/2026 UTC
// (.listas/oficiais-revisadas.json), caminho de produção (APROVADAS). Redução nova `reduzPor: { per: 'morbid' }` (601.2f; a marca do mórbido da M-416).
// Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const c0 = OF.find(x => x.name === 'Bone Picker');
const C = { 'Bone Picker': { name: c0.name, type_line: c0.type_line, mana_cost: c0.mana_cost, cmc: 4, keywords: ['Flying', 'Deathtouch'], oracle_text: c0.oracle_text, colors: ['B'], power: c0.power, toughness: c0.toughness },
  'Lightning Bolt': { name: 'Lightning Bolt', type_line: 'Instant', mana_cost: '{R}', cmc: 1, keywords: [], oracle_text: 'Lightning Bolt deals 3 damage to any target.', colors: ['R'] }, // .listas/oficiais.json
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Swamp: { name: 'Swamp', type_line: 'Basic Land — Swamp', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {B}.)', colors: [] },
  Mountain: { name: 'Mountain', type_line: 'Basic Land — Mountain', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {R}.)', colors: [] } };
function mesa(seed = 49) {
  const b = ns => ns.map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b(['Bone Picker', 'Lightning Bolt', 'Swamp', 'Mountain']) }, { name: 'B', deck: b(['Urso', 'Swamp']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending, 40);

test('LT106 · Bone Picker joga pelo leitor aprovado', () => {
  assert.equal(S.coverage(C['Bone Picker']).level, 'completo'); assert.equal(S.APROVADAS['Bone Picker'].leva, 'M-440');
});

test('LT106 · custa {B} se uma criatura morreu neste turno; senão, {3}{B}', () => {
  let s = mesa(), bp, lb, u; [s, bp] = poe(s, 0, 'Bone Picker', 'hand'); [s, lb] = poe(s, 0, 'Lightning Bolt', 'hand'); [s] = poe(s, 0, 'Swamp'); [s] = poe(s, 0, 'Mountain'); [s, u] = poe(s, 1, 'Urso');
  assert.equal(legais(s, 0, a => a.t === 'cast' && a.oid === bp).length, 0, 'com dois terrenos e ninguém morto, não dá');
  s = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === lb && a.targets && a.targets[0].oid === u)[0])); assert.equal(s.objects[u].zone, 'graveyard');
  const a = legais(s, 0, x => x.t === 'cast' && x.oid === bp); assert.ok(a.length, 'com a Urso morta, custa {B}');
  const t = resolve(act(s, a[0])); assert.equal(t.objects[bp].zone, 'battlefield');
});

test('LT106 · a morte do turno anterior não reduz', () => {
  let s = mesa(), bp, lb, u; [s, lb] = poe(s, 0, 'Lightning Bolt', 'hand'); [s] = poe(s, 0, 'Mountain'); [s, u] = poe(s, 1, 'Urso');
  s = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === lb && a.targets && a.targets[0].oid === u)[0]));
  s = passaAte(s, x => x.turn.active === 0 && x.turn.number > 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending, 400);
  s = J(s); for (const o of s.zones[0].battlefield) s.objects[o].tapped = false; [s, bp] = poe(s, 0, 'Bone Picker', 'hand'); [s] = poe(s, 0, 'Swamp');
  assert.equal(s.zones[0].battlefield.filter(o => /Swamp|Mountain/.test(s.objects[o].name)).length, 2);
  assert.equal(legais(s, 0, a => a.t === 'cast' && a.oid === bp).length, 0, 'com dois terrenos, sem morte neste turno, não dá');
});
