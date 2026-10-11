// CR2g.2 · 500.7: turnos extras. "Target player takes an extra turn after this one" (Time Warp) e "Take an extra turn after this one"
// (Temporal Manipulation); com vários, o criado por último é jogado primeiro (ruling de 2022-12-08). Texto oficial em
// .listas/oficiais-motor.json (mtg.wtf, 11/10/2026). Cada teste falha no motor v109 (o verbo não existia).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, comMana, tudo, CARTAS } from './cmd.mjs';

const OF = Object.fromEntries(JSON.parse(readFileSync(new URL('./.listas/oficiais-motor.json', import.meta.url), 'utf8')).cartas.map(c => [c.name, { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: 5, keywords: [], oracle_text: c.oracle_text, colors: ['U'] }]));
function mesaX(a = [], b = []) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 12, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 1, mode: 'full', cards: { ...CARTAS, ...OF }, first: 0, players: [{ name: 'A', deck: baralho([...a, 'Island', 'Plains']) }, { name: 'B', deck: baralho([...b, 'Island', 'Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const conjura = (s, oid, alvoJogador) => { s = comMana(s, 'UUUUU'); const a = legais(s, 0, x => x.t === 'cast' && x.oid === oid && (alvoJogador == null || (x.targets && x.targets[0] && x.targets[0].player === alvoJogador)))[0]; assert.ok(a, 'conjurar'); return tudo(act(act(act(s, a), { t: 'pass', p: 0 }), { t: 'pass', p: 1 })); };
const proximoTurno = s => { const t0 = s.turn.number; return passaAte(s, x => x.turn.number > t0 && x.turn.step === 'main1' && !x.stack.length && !x.pending); };

test('CR 500.7 · Temporal Manipulation: quem conjurou joga o turno seguinte de novo; depois a vez volta ao oponente', () => {
  let s = mesaX(['Temporal Manipulation']), t;
  [s, t] = poe(s, 0, 'Temporal Manipulation', 'hand');
  s = conjura(s, t);
  assert.deepEqual(J(s).turnosExtras, [0]);
  s = proximoTurno(s); assert.equal(s.turn.active, 0, 'turno extra de A');
  assert.equal(s.turnosExtras, undefined, 'consumido');
  s = proximoTurno(s); assert.equal(s.turn.active, 1, 'depois, o oponente');
});

test('CR 500.7 · Time Warp mira qualquer jogador: dado ao oponente, B joga dois turnos seguidos', () => {
  let s = mesaX(['Time Warp']), t;
  [s, t] = poe(s, 0, 'Time Warp', 'hand');
  const alvos = new Set(legais(comMana(s, 'UUUUU'), 0, x => x.t === 'cast' && x.oid === t).map(x => x.targets && x.targets[0] && x.targets[0].player));
  assert.ok(alvos.has(0) && alvos.has(1), 'os dois jogadores são alvos legais');
  s = conjura(s, t, 1);
  s = proximoTurno(s); assert.equal(s.turn.active, 1);
  s = proximoTurno(s); assert.equal(s.turn.active, 1, 'o extra de B');
  s = proximoTurno(s); assert.equal(s.turn.active, 0);
});

test('CR 500.7 · dois turnos extras no mesmo turno: o criado por último é jogado primeiro (B, depois A)', () => {
  let s = mesaX(['Temporal Manipulation', 'Time Warp']), t, w;
  [s, t] = poe(s, 0, 'Temporal Manipulation', 'hand'); [s, w] = poe(s, 0, 'Time Warp', 'hand');
  s = conjura(s, t); s = conjura(s, w, 1);
  assert.deepEqual(J(s).turnosExtras, [0, 1]);
  s = proximoTurno(s); assert.equal(s.turn.active, 1, 'o de B, criado por último');
  s = proximoTurno(s); assert.equal(s.turn.active, 0, 'depois o de A');
  s = proximoTurno(s); assert.equal(s.turn.active, 1, 'e a ordem normal volta');
});
