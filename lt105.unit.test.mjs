// M-423 · LT89 · mana e vida por contagem: Rite of Flame ("Add {R}{R}, then add {R} for each card named Rite of Flame in each graveyard."), Songs of the Damned
// ("Add {B} for each creature card in your graveyard.") e Respite ("Prevent all combat damage that would be dealt this turn. You gain 1 life for each attacking
// creature."). Texto da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json), caminho de produção (APROVADAS). Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, valorDeMana, S } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Respite', 'Rite of Flame', 'Songs of the Damned'];
const C = {}; for (const n of NOMES) { const c = OF.find(x => x.name === n); C[n] = { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: [...new Set(c.mana_cost.match(/[WUBRG]/g))] }; }
C.Urso = { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' };
C.Pedra = { name: 'Pedra', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] };
for (const [n, k] of Object.entries({ Mountain: 'R', Swamp: 'B', Forest: 'G' })) C[n] = { name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${k}}.)`, colors: [] };
function mesa(seed = 33) {
  const b = ns => ns.map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Urso', 'Pedra', 'Mountain', 'Swamp', 'Forest']) }, { name: 'B', deck: b(['Rite of Flame', 'Urso', 'Mountain', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending);

test('LT89 · as três jogam pelo leitor aprovado', () => {
  for (const n of NOMES) { assert.equal(S.coverage(C[n]).level, 'completo', n); assert.equal(S.APROVADAS[n].leva, 'M-423'); }
});

test('LT89 · Rite of Flame: {R}{R} mais {R} por carta com o mesmo nome em cada cemitério (as dos dois jogadores; ela mesma não)', () => {
  let s = mesa(), rf; [s, rf] = poe(s, 0, 'Rite of Flame', 'hand'); [s] = poe(s, 0, 'Mountain');
  const r = x => resolve(act(x, legais(x, 0, a => a.t === 'cast' && a.oid === rf)[0])).players[0].pool.R;
  assert.equal(r(s), 2);
  let g = J(s); [g] = poe(g, 0, 'Rite of Flame', 'graveyard'); [g] = poe(g, 1, 'Rite of Flame', 'graveyard'); [g] = poe(g, 1, 'Rite of Flame', 'graveyard');
  assert.equal(r(g), 5, '2 + 3 no cemitério dos dois');
});

test('LT89 · Songs of the Damned: {B} por carta de criatura no seu cemitério (não o do oponente; artefato não conta)', () => {
  let s = mesa(), sd; [s, sd] = poe(s, 0, 'Songs of the Damned', 'hand'); [s] = poe(s, 0, 'Swamp');
  for (let i = 0; i < 3; i++) [s] = poe(s, 0, 'Urso', 'graveyard'); [s] = poe(s, 0, 'Pedra', 'graveyard'); [s] = poe(s, 1, 'Urso', 'graveyard');
  assert.equal(resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === sd)[0])).players[0].pool.B, 3);
});

test('LT89 · Respite: previne o dano de combate e você ganha 1 por criatura atacando', () => {
  let s = mesa(), rs; [s, rs] = poe(s, 0, 'Respite', 'hand'); for (let i = 0; i < 2; i++) [s] = poe(s, 0, 'Forest');
  let t = J(s); for (let i = 0; i < 3; i++) { let u; [t, u] = poe(t, 1, 'Urso'); } t.turn.active = 1;
  t.combat = { ...(t.combat || {}), attackers: t.zones[1].battlefield.filter(o => t.objects[o].name === 'Urso') }; t.turn.priority = 0;
  const a = legais(t, 0, x => x.t === 'cast' && x.oid === rs)[0]; assert.ok(a); const r = resolve(act(t, a));
  assert.equal(r.players[0].life, 23);
});
