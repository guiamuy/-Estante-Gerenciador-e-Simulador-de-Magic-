// V-14 · CR 701.9b · descartar ao acaso. Texto oficial em .listas/oficiais-verbos.json (Oracle do Forge, 11/10/2026):
// Goblin Lore — "Draw four cards, then discard three cards at random." · Hymn to Tourach — "Target player discards two cards at random."
// Mind Knives — "Target opponent discards a card at random."
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
import { E, J, act, poe, legais, mesa, comMana, tudo, criatura, conjura } from './verbos.mjs';
import { alvos } from './cmd.mjs';
const { scripts: S, table: T } = loadModules();
const NOMES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(x => criatura('Carta ' + x, 1, 1));
const semDecisao = s => tudo(s, y => { throw new Error('ninguém escolhe no descarte ao acaso: ' + y.pending.kind); });
const maoSo = (s, p, nomes) => { s = J(s); for (const oid of s.zones[p].hand.slice()) E.moveObject(s, oid, 'library'); const oids = []; for (const n of nomes) { let o; [s, o] = poe(s, p, n, 'hand'); oids.push(o); } return [s, oids]; };

test('CR 701.9 · descartar ao acaso (b): ninguém escolhe; saem N cartas pela semente do jogo, e não sempre as mesmas posições', () => {
  const vistos = new Set();
  for (let seed = 1; seed <= 12; seed++) {
    let s = mesa(['Hymn to Tourach', ...NOMES], [...NOMES], seed), hy, mao; [s, mao] = maoSo(s, 1, NOMES.slice(0, 5)); [s, hy] = poe(s, 0, 'Hymn to Tourach', 'hand');
    const r = semDecisao(conjura(comMana(s, 'BB'), 0, hy, [{ player: 1 }]));
    const foram = mao.filter(o => r.objects[o].zone === 'graveyard');
    assert.equal(foram.length, 2); assert.equal(r.zones[1].hand.length, 3);
    vistos.add(foram.map(o => mao.indexOf(o)).join());
    const r2 = semDecisao(conjura(comMana(s, 'BB'), 0, hy, [{ player: 1 }]));
    assert.equal(E.hashState(r2), E.hashState(r), 'mesma semente, mesmo descarte (replay)');
  }
  assert.ok(vistos.size >= 4, 'o sorteio varia com a semente: ' + [...vistos].join(' | '));
});

test('CR 701.9 · descartar ao acaso: com menos cartas do que o pedido vão todas; de mão vazia nada acontece; "jogador alvo" pode ser você, "oponente alvo" não', () => {
  let s = mesa(['Hymn to Tourach', 'Mind Knives', ...NOMES], [...NOMES]), hy, mk, mao; [s, mao] = maoSo(s, 1, NOMES.slice(0, 1)); [s, hy] = poe(s, 0, 'Hymn to Tourach', 'hand'); [s, mk] = poe(s, 0, 'Mind Knives', 'hand');
  assert.deepEqual([...alvos(comMana(s, 'BB'), 0, hy)], ['jogador ' + s.players[0].name, 'jogador ' + s.players[1].name].sort());
  assert.deepEqual([...alvos(comMana(s, 'BB'), 0, mk)], ['jogador ' + s.players[1].name]);
  let r = semDecisao(conjura(comMana(s, 'BB'), 0, hy, [{ player: 1 }]));
  assert.equal(r.objects[mao[0]].zone, 'graveyard'); assert.equal(r.zones[1].hand.length, 0);
  r = semDecisao(conjura(comMana(r, 'BB'), 0, mk, [{ player: 1 }])); assert.equal(r.zones[1].hand.length, 0); assert.equal(r.objects[mk].zone, 'graveyard');
});

test('CR 701.9 · Goblin Lore: compra quatro e depois descarta três ao acaso — as recém-compradas também concorrem', () => {
  let s = mesa(['Goblin Lore', ...NOMES, ...NOMES], []), gl; [s] = maoSo(s, 0, NOMES.slice(0, 2)); [s, gl] = poe(s, 0, 'Goblin Lore', 'hand');
  const cemAntes = s.zones[0].graveyard.length, topo = s.zones[0].library.slice(0, 4);
  let algumaNova = false;
  for (let seed = 1; seed <= 10; seed++) { const x = J(s); x.rng = seed * 7919;
    const r = semDecisao(conjura(comMana(x, 'RR'), 0, gl));
    assert.equal(r.zones[0].hand.length, 3, '2 + 4 − 3'); assert.equal(r.zones[0].graveyard.length, cemAntes + 4, 'três descartadas e a própria mágica');
    if (topo.some(o => r.objects[o].zone === 'graveyard')) algumaNova = true; }
  assert.ok(algumaNova);
});

test('CR 701.9 · descartar ao acaso é descarte: insanidade é oferecida e "sempre que você descarta" dispara', () => {
  let s = mesa(['Hymn to Tourach', ...NOMES], ['Fiery Temper', 'Glint-Horn Buccaneer', ...NOMES]), hy, mao, buc; [s, mao] = maoSo(s, 1, ['Fiery Temper']); [s, buc] = poe(s, 1, 'Glint-Horn Buccaneer'); [s, hy] = poe(s, 0, 'Hymn to Tourach', 'hand');
  let r = conjura(comMana(s, 'BB'), 0, hy, [{ player: 1 }]);
  for (let i = 0; i < 6 && !r.pending; i++) r = act(r, { t: 'pass', p: r.turn.priority });
  assert.equal(r.pending && r.pending.kind, 'madness'); assert.equal(r.objects[mao[0]].zone, 'exile');
  r = tudo(act(r, legais(r, 1, a => a.t === 'decline_madness')[0]));
  assert.equal(r.objects[mao[0]].zone, 'graveyard'); assert.equal(r.players[0].life, s.players[0].life - 1, 'Glint-Horn Buccaneer viu o descarte');
});

test('CR 701.9 · descartar ao acaso: o validador, o registro com os nomes e a frase em português', () => {
  assert.match(S.validateScript({ name: 'X', effects: [{ do: 'discard_random' }], example: { target: 'none', expect: { handDelta: 0 } } }).join(), /amount/);
  let s = mesa([], [...NOMES]), mao; [s, mao] = maoSo(s, 1, NOMES.slice(0, 3)); const ev = [];
  E.applyEffect(s, { oid: 'h', name: 'T', controller: 0, ability: true, source: null }, { do: 'discard_random', amount: 2, target: 'opponent' }, { player: 1 }, ev);
  const e = ev.find(x => x.do === 'discard_random'); assert.equal(e.amount, 2); assert.equal(e.nomes.length, 2);
  assert.equal(T.descreveEfeitos(S.SCRIPTS['Goblin Lore'].effects), 'compra 4 cartas; descarta 3 cartas ao acaso');
  assert.equal(T.descreveEfeitos(S.SCRIPTS['Mind Knives'].effects), 'o oponente alvo descarta 1 carta ao acaso');
});
