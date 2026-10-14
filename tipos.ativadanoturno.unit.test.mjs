// T-87 · CR5 · "That was activated this turn" (Comprehensive Rules 700.10) e o seletor de permanente virada (tapped).
// Texto da regra: .regras/cr-2026-09-25.txt. Carta com o texto oficial de .listas/oficiais-tipos.json (Oracle do Forge, clone de 13/10/2026):
// Cut Short. "Andarilho" (planeswalker) e "Urso" são cartas de teste.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S as SC, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const C = {};
for (const c of L('oficiais-tipos.json').filter(x => x.name === 'Cut Short')) C[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: ['Convoke'], oracle_text: c.oracle_text, colors: ['W'] };
C.Plains = { name: 'Plains', type_line: 'Basic Land — Plains', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {W}.)', colors: [] };
const carta = (name, type_line, extra = {}) => { C[name] = { name, type_line, mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra }; };
carta('Urso', 'Creature — Bear', { power: '2', toughness: '2' }); carta('Andarilho', 'Legendary Planeswalker — Test', { loyalty: '3', mana_cost: '{2}', cmc: 2 });
const SCRIPTS = { 'Andarilho': { name: 'Andarilho', loyalty: [{ cost: 1, label: '+1: Ganhe 1 de vida', effects: [{ do: 'gain', amount: 1 }] }], example: { action: 'etb', target: 'none', expect: { attached: false } } } };
const CS = 'Cut Short';
function mesa(seed = 1) {
  const deck = [{ name: CS, qty: 4, zone: 'main' }, { name: 'Urso', qty: 4, zone: 'main' }, { name: 'Andarilho', qty: 4, zone: 'main' }, { name: 'Plains', qty: 16, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p = 0, n = 9) => { s = J(s); for (const c of 'WUBRGC') s.players[p].pool[c] += n; return s; };
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const alvos = (s, p) => { let c; [s, c] = poe(s, p, CS, 'hand'); s = mana(s, p); s = J(s); s.turn.priority = p; return legais(s, p, a => a.t === 'cast' && a.oid === c).map(a => a.targets[0].oid); };
const ativa = (s, p, oid) => { s = J(s); s.objects[oid].counters.loyalty = s.objects[oid].counters.loyalty || 3; const a = legais(s, p, x => x.t === 'activate' && x.oid === oid)[0]; assert.ok(a, 'ativa a lealdade'); return passaAte(act(s, a), x => !x.stack.length || !!x.pending); };

test('CR 700.10 · Cut Short (texto oficial): o planeswalker que ativou uma habilidade neste turno é alvo; o que não ativou, não', () => {
  let s = mesa(); let w0, w1; [s, w0] = poe(s, 0, 'Andarilho', 'battlefield'); [s, w1] = poe(s, 1, 'Andarilho', 'battlefield');
  s = J(s); s.objects[w0].counters.loyalty = 3; s.objects[w1].counters.loyalty = 3;
  eq(alvos(s, 1).filter(o => o === w0 || o === w1), [], 'ninguém ativou');
  s = ativa(s, 0, w0);
  eq(alvos(s, 1).filter(o => o === w0 || o === w1), [w0], 'o de A ativou a lealdade neste turno');
});

test('CR 700.10 · "this turn": no turno seguinte a marca acabou; a permanente que sai e volta é outro objeto (400.7)', () => {
  let s = mesa(); let w; [s, w] = poe(s, 0, 'Andarilho', 'battlefield');
  s = ativa(s, 0, w);
  assert.ok(alvos(s, 1).includes(w));
  let t = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1');
  assert.ok(!alvos(t, 1).includes(w), 'outro turno');
  t = J(s); const z = t.zones[0]; z.battlefield.splice(z.battlefield.indexOf(w), 1); z.hand.push(w); t.objects[w].zone = 'hand'; t.objects[w].zc = (t.objects[w].zc || 0) + 1;
  z.hand.splice(z.hand.indexOf(w), 1); z.battlefield.push(w); t.objects[w].zone = 'battlefield'; t.objects[w].zc += 1;
  assert.ok(!alvos(t, 1).includes(w), 'objeto novo, sem a marca');
});

test('Cut Short · "or tapped creature": a criatura virada é alvo; a desvirada, não', () => {
  let s = mesa(); let u, v; [s, u] = poe(s, 0, 'Urso', 'battlefield'); [s, v] = poe(s, 0, 'Urso', 'battlefield'); s = J(s); s.objects[u].tapped = true;
  const al = alvos(s, 1);
  eq([al.includes(u), al.includes(v)], [true, false]);
  s = mana(s, 1); s = J(s); s.turn.priority = 1; let c; [s, c] = poe(s, 1, CS, 'hand'); s = mana(s, 1); s = J(s); s.turn.priority = 1;
  s = passaAte(act(s, legais(s, 1, a => a.t === 'cast' && a.oid === c && a.targets[0].oid === u)[0]), x => !x.stack.length || !!x.pending);
  eq(s.objects[u].zone, 'graveyard');
});

test('CR 700.10 · validador: "ativadaNoTurno" e "tapped" só aceitam verdadeiro ou falso', () => {
  const v = sel => J(SC.validateScript({ name: 'X', effects: [{ do: 'destroy', target: sel }], example: { target: 'none', expect: { selfLife: 0 } } }));
  eq(v({ tipos: ['planeswalker'], ativadaNoTurno: true }), []);
  assert.ok(v({ tipos: ['creature'], tapped: 'sim' }).some(e => /tapped/.test(e)));
  assert.ok(v({ tipos: ['planeswalker'], ativadaNoTurno: 1 }).some(e => /ativadaNoTurno/.test(e)));
});
