// L-12 · trilha listas · Pauper de M a Z, lote 12 (plano paralelo de cobertura): barganha com o "if bargained" na resolução e ficha
// Eldrazi Spawn, numa partida em modo único (mana cobrada), com o texto oficial de .listas/oficiais-listas.json (Scryfall, consulta de
// 17/10/2026). Cada teste cita a frase.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, act, poe, legais, passaAte, mesa, comMana, tudo, fichas, CARTAS } from './trilha-listas.mjs';

CARTAS['Bugiganga de Teste'] = { name: 'Bugiganga de Teste', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] };

const conjura = (s, oid, mana, f = () => true) => { const m = comMana(s, mana); const a = legais(m, 0, x => x.t === 'cast' && x.oid === oid && f(x)); if (!a.length) throw new Error('não ofereceu'); return passaAte(act(m, a[0]), y => !y.stack.length || !!y.pending); };

test('L-12 · Rowan\'s Grim Search barganhada: olha as quatro de cima, devolve até duas ao topo, o resto vai ao cemitério; depois compra duas e perde 2', () => {
  let s = mesa(["Rowan's Grim Search", 'Bugiganga de Teste']), r, b; [s, r] = poe(s, 0, "Rowan's Grim Search", 'hand'); [s, b] = poe(s, 0, 'Bugiganga de Teste');
  const vida = s.players[0].life, topo = s.zones[0].library.slice(0, 4), mao = s.zones[0].hand.length;
  let x = conjura(s, r, 'BBB', a => a.bargain);
  assert.equal(x.objects[b].zone, 'graveyard', '"Bargain": sacrificou o artefato ao conjurar');
  assert.equal(x.pending && x.pending.kind, 'pick'); assert.deepEqual([...x.pending.from].sort(), [...topo].sort(), 'as quatro de cima');
  assert.equal(x.pending.min, 0, '"up to two": aceita nenhuma'); assert.equal(x.pending.max, 2);
  const [a1, a2] = x.pending.from;
  x = act(x, { t: 'pick', p: 0, oid: a1 }); x = act(x, { t: 'pick', p: 0, oid: a2 });
  if (x.pending && x.pending.kind === 'pick') x = act(x, { t: 'pick_done', p: 0 });
  x = tudo(x);
  assert.equal(x.objects[a1].zone, 'hand'); assert.equal(x.objects[a2].zone, 'hand', 'as duas devolvidas ao topo são as compradas');
  assert.equal(topo.filter(o => x.objects[o].zone === 'graveyard').length, 2, '"the rest into your graveyard"');
  assert.equal(x.zones[0].hand.length, mao - 1 + 2); assert.equal(x.players[0].life, vida - 2, '"you lose 2 life"');
});

test('L-12 · Rowan\'s Grim Search sem barganha: só compra duas e perde 2 (o grimório não é mexido)', () => {
  let s = mesa(["Rowan's Grim Search", 'Bugiganga de Teste']), r; [s, r] = poe(s, 0, "Rowan's Grim Search", 'hand');
  const vida = s.players[0].life, topo2 = s.zones[0].library.slice(0, 2), cemi = s.zones[0].graveyard.length;
  const x = tudo(conjura(s, r, 'BBB', a => !a.bargain));
  assert.ok(topo2.every(o => x.objects[o].zone === 'hand'), 'comprou as duas de cima');
  assert.equal(x.zones[0].graveyard.length, cemi + 1, 'só a própria mágica foi ao cemitério');
  assert.equal(x.players[0].life, vida - 2);
});

test('L-12 · Nest Invader: "When this creature enters, create a 0/1 colorless Eldrazi Spawn creature token. It has "Sacrifice this token: Add {C}.""', () => {
  let s = mesa(['Nest Invader']), n; [s, n] = poe(s, 0, 'Nest Invader', 'hand');
  const x = tudo(conjura(s, n, 'GG'));
  const sp = fichas(x, 0, 'Eldrazi Spawn'); assert.equal(sp.length, 1);
  assert.deepEqual([E.stats(x, sp[0]).power, E.stats(x, sp[0]).toughness], [0, 1]);
  const at = legais(x, 0, a => a.t === 'activate' && a.oid === sp[0].oid); assert.ok(at.length, 'sacrifica para mana');
  const y = act(x, at[0]);
  assert.notEqual(y.objects[sp[0].oid] && y.objects[sp[0].oid].zone, 'battlefield'); assert.equal(y.players[0].pool.C, (x.players[0].pool.C || 0) + 1, '{C}');
});
