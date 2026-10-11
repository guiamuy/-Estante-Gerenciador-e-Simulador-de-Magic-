// V-13 · CR 701.48 · aprender. Texto oficial em .listas/oficiais-verbos.json (Oracle do Forge, 11/10/2026):
// Igneous Inspiration — "Igneous Inspiration deals 3 damage to any target. Learn." · Guiding Voice — "Put a +1/+1 counter on target creature. Learn."
// PARCIAL declarada: a Lição de fora do jogo não existe no app (não há reserva durante a partida).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
import { E, J, act, poe, legais, mesa, comMana, tudo, criatura, conjura } from './verbos.mjs';
const { scripts: S, table: T } = loadModules();
const URSO = criatura('Urso de Teste 3/3', 3, 3), LOBO = criatura('Lobo de Teste 2/2', 2, 2);
const ate = (s, para) => { for (let i = 0; i < 20 && !para(s); i++) s = s.pending ? act(s, legais(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority }); return s; };
const lanca = (s, n = 2) => { let ii, maos = []; [s, ii] = poe(s, 0, 'Igneous Inspiration', 'hand'); for (let i = 0; i < n; i++) { let c; [s, c] = poe(s, 0, i ? LOBO : URSO, 'hand'); maos.push(c); }
  s = conjura(comMana(s, 'RRR'), 0, ii, [{ player: 1 }]); return [ate(s, x => x.pending && x.pending.kind === 'may_pay'), ii, maos]; };

test('CR 701.48 · aprender: descartar é escolha de quem controla; quem descarta escolhe a carta e compra uma — e a mágica termina de resolver', () => {
  let [s, ii, [urso, lobo]] = lanca(mesa(['Igneous Inspiration', URSO, LOBO, URSO, URSO], []));
  assert.equal(s.players[1].life, 17, 'o dano vem antes'); assert.equal(s.pending.p, 0);
  assert.equal(legais(s, 0).map(a => a.t).filter(t => t !== 'concede').sort().join(), 'decline,pay');
  const grim = s.zones[0].library.length;
  s = act(s, legais(s, 0, a => a.t === 'pay')[0]);
  assert.equal(s.pending.kind, 'discard', 'com duas cartas na mão, o jogador escolhe qual'); assert.equal(s.zones[0].library.length, grim, 'ainda não comprou');
  s = act(s, legais(s, 0, a => a.t === 'discard' && a.oid === lobo)[0]);
  assert.equal(s.objects[lobo].zone, 'graveyard'); assert.equal(s.objects[urso].zone, 'hand');
  assert.equal(s.zones[0].library.length, grim - 1, 'descartou: compra uma'); assert.equal(s.pending, null);
  assert.equal(s.objects[ii].zone, 'graveyard'); assert.equal(s.stack.length, 0);
});

test('CR 701.48 · aprender: recusar não descarta nem compra; de mão vazia não há pergunta', () => {
  let [s, ii, [urso]] = lanca(mesa(['Igneous Inspiration', URSO, LOBO, URSO, URSO], []));
  const grim = s.zones[0].library.length, mao = s.zones[0].hand.length;
  s = act(s, legais(s, 0, a => a.t === 'decline')[0]);
  assert.equal(s.zones[0].library.length, grim); assert.equal(s.zones[0].hand.length, mao); assert.equal(s.objects[urso].zone, 'hand'); assert.equal(s.pending, null); assert.equal(s.objects[ii].zone, 'graveyard');
  // mão vazia (a própria mágica já saiu da mão): resolve sem pergunta
  let x = mesa(['Igneous Inspiration'], []), jj; [x, jj] = poe(x, 0, 'Igneous Inspiration', 'hand'); x = J(x);
  for (const oid of x.zones[0].hand.filter(o => o !== jj)) E.moveObject(x, oid, 'library');
  x = tudo(conjura(comMana(x, 'RRR'), 0, jj, [{ player: 1 }]), y => { throw new Error('não deveria haver decisão: ' + y.pending.kind); });
  assert.equal(x.players[1].life, 17); assert.equal(x.objects[jj].zone, 'graveyard');
});

test('CR 701.48 · aprender: com uma carta só na mão o descarte ainda é escolha (sim ou não); Guiding Voice põe o marcador antes', () => {
  let s = mesa(['Guiding Voice', URSO, LOBO, LOBO], []), gv, urso, lobo; [s, urso] = poe(s, 0, URSO); [s, gv] = poe(s, 0, 'Guiding Voice', 'hand'); s = J(s);
  for (const oid of s.zones[0].hand.filter(o => o !== gv)) E.moveObject(s, oid, 'library');
  [s, lobo] = poe(s, 0, LOBO, 'hand');
  s = ate(conjura(comMana(s, 'W'), 0, gv, [urso]), x => x.pending && x.pending.kind === 'may_pay');
  assert.equal(s.objects[urso].counters.p1p1, 1);
  s = tudo(act(s, legais(s, 0, a => a.t === 'pay')[0]));
  assert.equal(s.objects[lobo].zone, 'graveyard'); assert.equal(s.zones[0].hand.length, 1, 'descartou a única e comprou uma');
});

test('CR 701.48 · aprender: o validador, os scripts e a frase em português', () => {
  assert.match(S.validateScript({ name: 'X', effects: [{ do: 'learn', target: 'player' }], example: { target: 'opponent', expect: { handDelta: 0 } } }).join(), /learn/);
  assert.equal(T.descreveEfeitos(S.SCRIPTS['Guiding Voice'].effects), 'põe 1 marcador +1/+1 em uma criatura; aprende (você pode descartar uma carta; se descartar, compra uma)');
});
