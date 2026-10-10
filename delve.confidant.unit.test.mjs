// M-263 · delve (702.66) com a escolha das cartas e Dark Confidant (texto oficial em .listas/oficiais-commander.json, 05/10/2026;
// segunda fonte, Oracle do Forge, 10/10/2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, mesa, comMana, tudo, passaAte } from './cmd.mjs';
const ateDecisao = s => { for (let i = 0; i < 10 && !s.pending && (s.stack.length || s.queued.length); i++) s = act(s, { t: 'pass', p: s.turn.priority }); return s; };
const enterra = (s, p, n) => { s = J(s); for (let i = 0; i < n; i++) { const oid = s.zones[p].library.pop(); s.zones[p].graveyard.push(oid); s.objects[oid].zone = 'graveyard'; } return s; };

test('M-263 · Treasure Cruise: delve — cada carta exilada do cemitério paga {1}; quem conjura escolhe quantas e quais', () => {
  let s = mesa(['Treasure Cruise'], []), tc; [s, tc] = poe(s, 0, 'Treasure Cruise', 'hand');
  s = enterra(s, 0, 5); s = comMana(s, 'UCC');
  const ofs = legais(s, 0, a => a.t === 'cast' && a.oid === tc);
  assert.deepEqual([...new Set(ofs.map(a => a.delve))].sort(), [5], 'com {U}{C}{C} e 5 no cemitério: só exilando 5 ({7}{U} = 5 + 2 + {U})');
  const gy = s.zones[0].graveyard.slice();
  let x = act(s, ofs[0]); assert.equal(x.pending.kind, 'pick'); assert.equal(x.pending.label, 'delve'); assert.equal(x.pending.min, 5);
  for (const oid of gy) if (x.pending && x.pending.kind === 'pick') x = act(x, { t: 'pick', p: 0, oid });
  if (x.pending && x.pending.kind === 'pick') x = act(x, { t: 'pick_done', p: 0 });
  assert.ok(gy.every(o => x.objects[o].zone === 'exile'), 'as cinco exiladas'); assert.equal(x.players[0].pool.U + x.players[0].pool.C, 0, 'pagou {U}{C}{C}');
  const mao = x.zones[0].hand.length; x = tudo(x); assert.equal(x.zones[0].hand.length, mao + 3, 'comprou três');
  // escolher quais: com 7 no cemitério e mana para delve 5, escolhe 5 das 7
  let y = enterra(s, 0, 2); y = act(y, legais(y, 0, a => a.t === 'cast' && a.oid === tc && a.delve === 5)[0]);
  assert.equal(y.pending.from.length, 7, 'escolhe entre as sete'); assert.equal(y.pending.max, 5);
  assert.throws(() => act(s, { t: 'cast', p: 0, oid: tc, delve: 9 }), /delve/);
});

test('M-263 · Dig Through Time: "Put two of them into your hand and the rest on the bottom of your library" (antes o resto ia para o cemitério)', () => {
  let s = mesa(['Dig Through Time'], []), d; [s, d] = poe(s, 0, 'Dig Through Time', 'hand');
  s = enterra(s, 0, 6); s = comMana(s, 'UUCC');
  const ofs = legais(s, 0, a => a.t === 'cast' && a.oid === d && a.delve === 6); assert.ok(ofs.length > 0);
  let x = act(s, ofs[0]); const gy = x.pending.from.slice(); for (const oid of gy) if (x.pending && x.pending.kind === 'pick') x = act(x, { t: 'pick', p: 0, oid });
  const topo = x.zones[0].library.slice(0, 7); const cemAntes = x.zones[0].graveyard.length;
  x = ateDecisao(x); assert.equal(x.pending.kind, 'pick'); assert.equal(x.pending.min, 2);
  x = act(x, { t: 'pick', p: 0, oid: x.pending.from[0] }); if (x.pending && x.pending.kind === 'pick') x = act(x, { t: 'pick', p: 0, oid: x.pending.from[1] }); if (x.pending && x.pending.kind === 'pick') x = act(x, { t: 'pick_done', p: 0 }); x = tudo(x);
  assert.equal(topo.filter(o => x.objects[o].zone === 'hand').length, 2);
  assert.equal(topo.filter(o => x.objects[o].zone === 'library').length, 5, 'o resto no grimório');
  assert.ok(topo.filter(o => x.objects[o].zone === 'library').every(o => x.zones[0].library.slice(-5).includes(o)), 'no fundo');
});

test('M-263 · Dark Confidant: "At the beginning of your upkeep, reveal the top card of your library and put that card into your hand. You lose life equal to its mana value."', () => {
  let s = mesa(['Dark Confidant', 'Treasure Cruise'], []), dc; [s, dc] = poe(s, 0, 'Dark Confidant');
  s = passaAte(s, x => x.turn.active === 1);
  s = J(s); const tc = s.zones[0].hand.concat(s.zones[0].library).find(o => s.objects[o].name === 'Treasure Cruise');
  for (const z of ['hand', 'library']) { const i = s.zones[0][z].indexOf(tc); if (i >= 0) s.zones[0][z].splice(i, 1); }
  s.zones[0].library.unshift(tc); s.objects[tc].zone = 'library';
  const vida = s.players[0].life, mao = s.zones[0].hand.length;
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'upkeep'); s = tudo(ateDecisao(s));
  assert.equal(s.objects[tc].zone, 'hand', 'a carta do topo foi para a mão');
  assert.equal(s.players[0].life, vida - 8, 'Treasure Cruise vale 8: perdeu 8');
  assert.equal(s.players[0].lifeLost >= 8, true, 'é perda de vida');
});
