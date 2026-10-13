// H-6 · CR 701.34a · proliferar também escolhe jogadores com marcador de energia (107.14, 122.1): "choose any number of permanents and/or
// players that have a counter, then give each one additional counter of each kind that permanent or player already has".
// Pedido da trilha motor (M-367 trouxe a energia do jogador em `players[i].energia`). Steady Progress — "Proliferate. Draw a card."
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, mesa, comMana, tudo, criatura, conjura } from './verbos.mjs';
const URSO = criatura('Urso de Teste 3/3', 3, 3);
function arma() {
  let s = mesa(['Steady Progress', URSO], [URSO]), m;
  [s, m] = poe(s, 0, 'Steady Progress', 'hand');
  return [comMana(s, 'UUU'), m];
}
const ateDecisao = s => { for (let i = 0; i < 10 && !s.pending && s.stack.length; i++) s = act(s, { t: 'pass', p: s.turn.priority }); return s; };

test('H-6 · CR 701.34a · jogador só com energia pode ser escolhido ao proliferar e ganha mais um marcador de energia', () => {
  let [s, m] = arma(); s = J(s); s.players[0].energia = 2;
  s = ateDecisao(conjura(s, 0, m));
  assert.equal(s.pending && s.pending.kind, 'may_pay', 'a pergunta do jogador com energia aparece (sem ela, a mágica só compra)');
  assert.match(s.pending.name, /energia em A/);
  const r = E.apply(s, { t: 'pay', p: 0 }); s = tudo(r.state);
  assert.equal(s.players[0].energia, 3);
  assert.equal(s.players[0].poison || 0, 0, 'não ganha veneno que não tinha');
  assert.ok(r.events.some(e => e.do === 'counters' && e.tipo === 'energia' && e.target === 'A' && e.amount === 1), 'o registro conta o marcador de energia');
});

test('H-6 · CR 701.34a · jogador com veneno e energia: uma pergunta só, e o "sim" dá mais um de cada tipo; o "não" deixa os dois', () => {
  let [s, m] = arma(); s = J(s); s.players[1].poison = 2; s.players[1].energia = 4; s.players[0].energia = 1;
  s = ateDecisao(conjura(s, 0, m));
  assert.match(s.pending.name, /energia em A/); s = act(s, { t: 'pay', p: 0 }); // você: sim
  assert.match(s.pending.name, /veneno e um de energia em B/, 'uma pergunta para B, com os dois tipos');
  const nao = tudo(act(s, { t: 'decline', p: 0 }));
  assert.deepEqual([nao.players[1].poison, nao.players[1].energia, nao.players[0].energia], [2, 4, 2]);
  const sim = tudo(act(s, { t: 'pay', p: 0 }));
  assert.deepEqual([sim.players[1].poison, sim.players[1].energia, sim.players[0].energia], [3, 5, 2]);
});

test('H-6 · jogador com energia 0 não entra na escolha (não tem marcador)', () => {
  let [s, m] = arma(); s = J(s); s.players[0].energia = 0; s.players[1].energia = 0;
  const mao = s.zones[0].hand.length;
  s = tudo(conjura(s, 0, m));
  assert.equal(s.pending, null); assert.equal(s.zones[0].hand.length, mao, 'só comprou');
});
