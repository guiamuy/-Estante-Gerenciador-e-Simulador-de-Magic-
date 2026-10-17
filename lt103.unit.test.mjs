// M-421 · LT87 · Nested Shambler: "When this creature dies, create X tapped 1/1 green Squirrel creature tokens, where X is this creature's power." (texto da
// Scryfall de 17/10/2026 UTC, .listas/oficiais-revisadas.json), caminho de produção (APROVADAS). 608.2h/603.10a: o poder como era no campo. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const n0 = OF.find(x => x.name === 'Nested Shambler');
const C = { 'Nested Shambler': { name: n0.name, type_line: n0.type_line, mana_cost: n0.mana_cost, cmc: 1, keywords: [], oracle_text: n0.oracle_text, colors: ['B'], power: n0.power, toughness: n0.toughness },
  Swamp: { name: 'Swamp', type_line: 'Basic Land — Swamp', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {B}.)', colors: [] } };
function mesa(seed = 29) {
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: [{ name: 'Nested Shambler', qty: 10, zone: 'main' }, { name: 'Swamp', qty: 20, zone: 'main' }] }, { name: 'B', deck: [{ name: 'Swamp', qty: 30, zone: 'main' }] }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const esquilos = s => s.zones[0].battlefield.filter(o => s.objects[o].name === 'Squirrel');
const morre = s => { let f; [s, f] = poe(s, 0, 'Swamp'); s = act(s, { t: 'tap_mana', p: 0, oid: f, option: 0 }); return passaAte(s, x => !x.stack.length && !x.pending, 20); };

test('LT87 · Nested Shambler joga pelo leitor aprovado', () => {
  assert.equal(S.coverage(C['Nested Shambler']).level, 'completo'); assert.equal(S.APROVADAS['Nested Shambler'].leva, 'M-421');
});

test('LT87 · ao morrer, X fichas 1/1 verdes de Esquilo viradas, com X = o poder que ela tinha no campo (1; 3 com +2/+0 de marcadores)', () => {
  let s = mesa(), ns; [s, ns] = poe(s, 0, 'Nested Shambler'); let a = J(s); E.sacrifice(a, ns, []); a = morre(a);
  assert.equal(esquilos(a).length, 1); const sq = a.objects[esquilos(a)[0]]; assert.equal(sq.tapped, true);
  assert.deepEqual([...a.facts.Squirrel.colors || []], ['G']);
  let b = J(s); b.objects[ns].counters = { p1p1: 2 }; E.sacrifice(b, ns, []); b = morre(b); assert.equal(esquilos(b).length, 3, 'poder 3 no campo');
  let c = J(s); c.objects[ns].counters = { m1m1: 1 }; E.sacrifice(c, ns, []); c = morre(c); assert.equal(esquilos(c).length, 0, 'poder 0: nenhuma');
});
