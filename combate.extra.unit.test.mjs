// CR2g.4 · 500.8: Relentless Assault — "Untap all creatures that attacked this turn. After this main phase, there is an additional combat
// phase followed by an additional main phase." Texto oficial em .listas/oficiais-motor.json (mtg.wtf, 11/10/2026). Falha no motor v109.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, comMana, tudo, CARTAS } from './cmd.mjs';

const OF = Object.fromEntries(JSON.parse(readFileSync(new URL('./.listas/oficiais-motor.json', import.meta.url), 'utf8')).cartas.map(c => [c.name, { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: 4, keywords: [], oracle_text: c.oracle_text, colors: ['R'] }]));
const Ursa = { name: 'Ursa', type_line: 'Creature — Bear', mana_cost: '{G}', cmc: 1, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' };
function mesaX(a = [], b = []) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 12, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 1, mode: 'full', cards: { ...CARTAS, ...OF, Ursa }, first: 0, players: [{ name: 'A', deck: baralho([...a, 'Mountain', 'Forest']) }, { name: 'B', deck: baralho([...b, 'Island', 'Plains']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const passa = s => act(s, { t: 'pass', p: s.turn.priority });
const ate = (s, step) => { for (let i = 0; i < 60 && !(s.turn.step === step && !s.stack.length && !s.pending); i++) s = s.pending ? act(s, legais(s, s.pending.p).find(a => a.t === 'attack' && a.attackers && a.attackers.length) || legais(s, s.pending.p)[0]) : passa(s); return s; };
const ataca = s => { assert.equal(s.pending && s.pending.kind, 'attackers'); const a = legais(s, 0, x => x.t === 'attack' && x.attackers && x.attackers.length).sort((x, y) => y.attackers.length - x.attackers.length)[0]; return act(s, a); };
const conjura = (s, oid) => { s = comMana(s, 'RRRR'); return tudo(act(act(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === oid)[0]), { t: 'pass', p: 0 }), { t: 'pass', p: 1 })); };

test('CR 500.8 · na segunda fase principal: desvira quem atacou, e vem combate adicional + principal adicional; a Ursa ataca duas vezes', () => {
  let s = mesaX(['Ursa', 'Relentless Assault']), u, r;
  [s, u] = poe(s, 0, 'Ursa'); s = J(s); s.objects[u].sick = false; [s, r] = poe(s, 0, 'Relentless Assault', 'hand');
  const v0 = s.players[1].life;
  for (let i = 0; i < 10 && s.turn.step !== 'combat_attackers'; i++) s = passa(s);
  s = ataca(s); s = ate(s, 'main2');
  assert.equal(v0 - s.players[1].life, 2); assert.equal(s.objects[u].tapped, true);
  s = conjura(s, r);
  assert.equal(s.objects[u].tapped, false, 'desvirou quem atacou neste turno');
  assert.equal(J(s).combatesExtras, 1);
  s = passa(s); s = passa(s);
  assert.equal(s.turn.step === 'combat_begin' || s.turn.step === 'combat_attackers', true, 'depois desta principal: combate adicional, não o passo final');
  for (let i = 0; i < 10 && s.turn.step !== 'combat_attackers'; i++) s = passa(s);
  s = ataca(s); s = ate(s, 'main2');
  assert.equal(v0 - s.players[1].life, 4, 'atacou de novo');
  assert.equal(s.turn.active, 0, 'principal adicional, ainda no turno de A');
  s = passa(s); s = passa(s);
  assert.equal(s.turn.step, 'end', 'depois da principal adicional, o passo final');
});

test('CR 500.8 · na primeira fase principal: combate adicional + principal adicional vêm antes do combate normal', () => {
  let s = mesaX(['Ursa', 'Relentless Assault']), u, r;
  [s, u] = poe(s, 0, 'Ursa'); s = J(s); s.objects[u].sick = false; [s, r] = poe(s, 0, 'Relentless Assault', 'hand');
  s = conjura(s, r); assert.equal(s.turn.step, 'main1');
  const passos = []; let ultimo = null;
  for (let i = 0; i < 80 && s.turn.active === 0; i++) { if (s.turn.step !== ultimo) { passos.push(s.turn.step); ultimo = s.turn.step; } s = s.pending ? (s.pending.kind === 'attackers' ? ataca(s) : act(s, legais(s, s.pending.p)[0])) : passa(s); }
  const seq = passos.filter(x => ['main1', 'combat_attackers', 'main2', 'end'].includes(x));
  assert.deepEqual(seq.slice(0, 6), ['main1', 'combat_attackers', 'main2', 'combat_attackers', 'main2', 'end']);
});

test('CR 500.8 · ruling: fora da fase principal (com lampejo), não cria fases', () => {
  let s = mesaX(['Relentless Assault']), r;
  [s, r] = poe(s, 0, 'Relentless Assault', 'hand');
  for (let i = 0; i < 10 && s.turn.step !== 'combat_begin'; i++) s = passa(s);
  s = J(s); s.facts['Relentless Assault'].flash = true; s = comMana(s, 'RRRR');
  const a = legais(s, 0, x => x.t === 'cast' && x.oid === r)[0]; assert.ok(a, 'com lampejo no começo do combate');
  s = tudo(act(act(act(s, a), { t: 'pass', p: 0 }), { t: 'pass', p: 1 }));
  assert.equal(s.combatesExtras, undefined);
});
