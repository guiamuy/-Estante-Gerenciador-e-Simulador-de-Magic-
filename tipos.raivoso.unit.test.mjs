// T-123 · CR5 · "Attacks each combat if able" (508.1d) e "escapes with a +1/+1 counter on it" (702.138c). Texto: .regras/cr-2026-09-25.txt.
// Carta com o texto oficial de .listas/oficiais-tipos.json (Scryfall, consulta de 17/10/2026, rulings de 24/01/2020): Underworld Rage-Hound.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const RH = 'Underworld Rage-Hound';
const C = {};
for (const c of L('oficiais-tipos.json').filter(x => x.name === RH)) C[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: ['Escape'], oracle_text: c.oracle_text, colors: ['R'], power: c.power, toughness: c.toughness };
C.Mountain = { name: 'Mountain', type_line: 'Basic Land — Mountain', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {R}.)', colors: [] };
C.Urso = { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], power: '2', toughness: '2' };
function mesa(seed = 1) {
  const deck = [{ name: RH, qty: 6, zone: 'main' }, { name: 'Urso', qty: 8, zone: 'main' }, { name: 'Mountain', qty: 16, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending);
const aoAtaque = s => passaAte(s, x => x.turn.active === 0 && x.pending && x.pending.kind === 'attackers' || (x.turn.active === 0 && x.turn.step === 'declare_attackers'));

test('CR 508.1d · Underworld Rage-Hound (texto oficial): ataca em todo combate se puder — o conjunto de atacantes sem ela é recusado e o Urso pode ficar', () => {
  let s = mesa(); let rh, u; [s, rh] = poe(s, 0, RH); [s, u] = poe(s, 0, 'Urso');
  eq(E.mustAttack(s, 0).includes(rh), true);
  eq(E.mustAttack(s, 0).includes(u), false);
});

test('CR 508.1d · ruling de 24/01/2020: virada ou com enjoo, não precisa atacar', () => {
  let s = mesa(); let rh; [s, rh] = poe(s, 0, RH, 'battlefield', { tapped: true });
  eq(E.mustAttack(s, 0).includes(rh), false, 'virada');
  let z = mesa(); let r2; [z, r2] = poe(z, 0, RH, 'battlefield', { sick: true });
  eq(E.mustAttack(z, 0).includes(r2), false, 'enjoo');
});

test('CR 702.138c · fuga: do cemitério por {3}{R} e exilar três outras cartas; ela entra com um marcador +1/+1 (4/2); conjurada da mão, não', () => {
  let s = mesa(); let rh; [s, rh] = poe(s, 0, RH, 'graveyard'); for (let i = 0; i < 3; i++) [s] = poe(s, 0, 'Urso', 'graveyard');
  s = J(s); s.players[0].pool.R += 1; s.players[0].pool.C += 3;
  const a = legais(s, 0, x => x.t === 'cast' && x.oid === rh && x.escape)[0]; assert.ok(a, 'fuga oferecida');
  s = resolve(act(s, a));
  const st = E.stats(s, s.objects[rh]); eq([s.objects[rh].zone, s.objects[rh].counters.p1p1, st.power, st.toughness, s.zones[0].exile.length], ['battlefield', 1, 4, 2, 3]);
  let m = mesa(); let r2; [m, r2] = poe(m, 0, RH, 'hand'); m = J(m); m.players[0].pool.R += 1; m.players[0].pool.C += 1;
  m = resolve(act(m, legais(m, 0, x => x.t === 'cast' && x.oid === r2 && !x.escape)[0]));
  eq((m.objects[r2].counters || {}).p1p1 || 0, 0, 'da mão, sem marcador');
});
