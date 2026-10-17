// M-458 · LT124 · Nivix Cyclops ("Defender / Whenever you cast an instant or sorcery spell, this creature gets +3/+0 until end of turn and can attack
// this turn as though it didn't have defender."). Texto da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json), caminho de produção
// (APROVADAS). Pedido da trilha `listas`. Efeito novo `ataca_com_defensor` (702.3b, marca do turno; 400.7). Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const c0 = OF.find(x => x.name === 'Nivix Cyclops');
const C = { 'Nivix Cyclops': { name: c0.name, type_line: c0.type_line, mana_cost: c0.mana_cost, cmc: 3, keywords: ['Defender'], oracle_text: c0.oracle_text, colors: ['U', 'R'], power: c0.power, toughness: c0.toughness },
  'Lightning Bolt': { name: 'Lightning Bolt', type_line: 'Instant', mana_cost: '{R}', cmc: 1, keywords: [], oracle_text: 'Lightning Bolt deals 3 damage to any target.', colors: ['R'] }, // .listas/oficiais.json
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Mountain: { name: 'Mountain', type_line: 'Basic Land — Mountain', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {R}.)', colors: [] } };
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 83, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b(['Nivix Cyclops', 'Lightning Bolt', 'Mountain']) }, { name: 'B', deck: b(['Urso', 'Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const ataque = s => passaAte(s, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 0);
const podeAtacar = (s, c) => legais(s, 0, a => a.t === 'attack').some(a => (a.attackers || []).includes(c));

test('LT124 · Nivix Cyclops joga pelo leitor aprovado', () => {
  assert.equal(S.coverage(C['Nivix Cyclops']).level, 'completo'); assert.equal(S.APROVADAS['Nivix Cyclops'].leva, 'M-458');
});

test('LT124 · sem mágica, o defensor não ataca; depois do Bolt, 4/4 e ataca neste turno; no turno seguinte, de novo não', () => {
  let s = mesa(), c, lb; [s, c] = poe(s, 0, 'Nivix Cyclops'); [s, lb] = poe(s, 0, 'Lightning Bolt', 'hand'); [s] = poe(s, 0, 'Mountain'); s = J(s); s.objects[c].sick = false;
  assert.ok(!E.eligibleAttackers(s, 0).includes(c), 'defensor sem mágica');
  s = passaAte(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === lb && a.targets[0].player === 1)[0]), x => !x.stack.length && !x.pending, 40);
  assert.equal(E.stats(s, s.objects[c]).power, 4);
  s = ataque(s); assert.ok(podeAtacar(s, c), 'ataca depois da instantânea');
  s = act(s, { t: 'attack', p: 0, attackers: [c] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.number > 2 && x.turn.step === 'main1', 600);
  assert.equal(E.stats(s, s.objects[c]).power, 1); assert.ok(!E.eligibleAttackers(s, 0).includes(c), 'no turno seguinte, defensor de novo');
});
