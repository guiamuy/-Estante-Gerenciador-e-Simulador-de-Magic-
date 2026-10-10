// M-264 · Priest of Forgotten Gods ("any number of target players", sacrificar duas como custo) e Moonsnare Prototype (mana com custo
// de virar outra; canalizar com a escolha de topo ou fundo pelo dono). Texto oficial em .listas/oficiais-commander.json (05/10/2026;
// segunda fonte, Oracle do Forge, 10/10/2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, mesa, comMana, tudo } from './cmd.mjs';

test('M-264 · Priest of Forgotten Gods: "{T}, Sacrifice two other creatures: Any number of target players each lose 2 life and sacrifice a creature of their choice. You add {B}{B} and draw a card."', () => {
  let s = mesa(['Priest of Forgotten Gods', 'Thraben Inspector', 'Faerie Seer', 'Kor Skyfisher'], ['Faerie Seer', 'Thraben Inspector']), pr, a1, a2, a3, b1, b2;
  [s, pr] = poe(s, 0, 'Priest of Forgotten Gods'); [s, a1] = poe(s, 0, 'Thraben Inspector'); [s, a2] = poe(s, 0, 'Faerie Seer'); [s, a3] = poe(s, 0, 'Kor Skyfisher');
  [s, b1] = poe(s, 1, 'Faerie Seer'); [s, b2] = poe(s, 1, 'Thraben Inspector');
  const ofs = J(legais(s, 0, a => a.t === 'activate' && a.oid === pr));
  assert.ok(ofs.length > 0); assert.ok(ofs.every(a => [].concat(a.pay.sacrifice).length === 2 && !a.pay.sacrifice.includes(pr)), 'duas outras criaturas');
  const alvosVistos = new Set(ofs.map(a => (a.targets || []).map(t => t.player).sort().join(',')));
  assert.ok(alvosVistos.has('1') && alvosVistos.has('0,1') && alvosVistos.has(''), 'qualquer número de jogadores: nenhum, um ou os dois');
  assert.ok(![...alvosVistos].some(k => k === '1,1' || k === '0,0'), 'o mesmo jogador não é mirado duas vezes');
  // mira só o oponente, sacrificando Inspector e Seer
  const escolha = ofs.find(a => (a.targets || []).length === 1 && a.targets[0].player === 1 && [a1, a2].every(x => a.pay.sacrifice.includes(x)));
  const mao = s.zones[0].hand.length;
  let x = act(s, escolha); x = tudo(x, y => legais(y, y.pending.p, a => a.t === 'sacrifice')[0] || legais(y, y.pending.p)[0]);
  assert.equal(x.objects[a1].zone, 'graveyard'); assert.equal(x.objects[a2].zone, 'graveyard'); assert.equal(x.objects[a3].zone, 'battlefield');
  assert.equal(x.players[1].life, 18, 'o oponente perdeu 2'); assert.equal(x.players[0].life, 20);
  assert.equal([b1, b2].filter(o => x.objects[o].zone !== 'battlefield').length, 1, 'o oponente sacrificou uma criatura, à escolha dele');
  assert.equal(x.players[0].pool.B, 2, '{B}{B}'); assert.equal(x.zones[0].hand.length, mao + 1, 'comprou uma');
  const semDuas = J(s); E.moveObject(semDuas, a2, 'graveyard'); E.moveObject(semDuas, a3, 'graveyard');
  assert.equal(legais(semDuas, 0, a => a.t === 'activate' && a.oid === pr).length, 0, 'com uma só outra criatura, não ativa');
});

test('M-264 · Moonsnare Prototype: mana com "vire outro artefato ou criatura sua"; canalizar — o dono da permanente escolhe topo ou fundo', () => {
  let s = mesa(['Moonsnare Prototype', 'Thraben Inspector'], ['Faerie Seer']), ms, ins, seer;
  [s, ms] = poe(s, 0, 'Moonsnare Prototype'); [s, ins] = poe(s, 0, 'Thraben Inspector', 'battlefield', { sick: true }); [s, seer] = poe(s, 1, 'Faerie Seer');
  const mana = legais(s, 0, a => a.t === 'activate' && a.oid === ms);
  assert.ok(mana.length > 0, 'vira o Inspector (enjoado pode, não é {T} dele)');
  let x = act(s, mana[0]); assert.equal(x.players[0].pool.C, 1); assert.equal(x.objects[ins].tapped, true); assert.equal(x.stack.length, 0, 'habilidade de mana, sem pilha');
  // canalizar: da mão
  let c, t = mesa(['Moonsnare Prototype'], ['Faerie Seer']); [t, c] = poe(t, 0, 'Moonsnare Prototype', 'hand'); let sr; [t, sr] = poe(t, 1, 'Faerie Seer'); t = comMana(t, 'UCCCC');
  const canal = legais(t, 0, a => a.t === 'activate' && a.oid === c && a.fromHand && (a.targets || []).some(q => q.oid === sr));
  assert.ok(canal.length > 0);
  t = act(t, canal[0]); assert.equal(t.objects[c].zone, 'graveyard', 'descartada como custo');
  for (let i = 0; i < 6 && !t.pending; i++) t = act(t, { t: 'pass', p: t.turn.priority });
  assert.equal(t.pending.kind, 'topo_fundo'); assert.equal(t.pending.p, 1, 'quem escolhe é o dono');
  const fundo = act(t, { t: 'topo_fundo', p: 1, topo: false }); assert.equal(fundo.zones[1].library[fundo.zones[1].library.length - 1], sr, 'no fundo');
  const topo = act(t, { t: 'topo_fundo', p: 1, topo: true }); assert.equal(topo.zones[1].library[0], sr, 'no topo');
  assert.throws(() => act(t, { t: 'topo_fundo', p: 0, topo: true }), /nada a pôr/);
});
