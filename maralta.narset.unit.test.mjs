// M-262 · High Tide e Narset, Parter of Veils (texto oficial em .listas/oficiais-commander.json, 05/10/2026; segunda fonte, Oracle do
// Forge, 10/10/2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, mesa, comMana, tudo, passaAte } from './cmd.mjs';
import { T, S } from './listas.mjs';

test('M-262 · High Tide: "Until end of turn, whenever a player taps an Island for mana, that player adds an additional {U}." — para os dois jogadores, só Ilhas, acaba no fim do turno', () => {
  let s = mesa(['High Tide', 'Island'], []), ht, il, pl, ilOp;
  [s, ht] = poe(s, 0, 'High Tide', 'hand'); [s, il] = poe(s, 0, 'Island'); [s, pl] = poe(s, 0, 'Plains'); [s, ilOp] = poe(s, 1, 'Island');
  s = comMana(s, 'U'); s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === ht)[0]));
  assert.deepEqual(J(E.productions(s, s.objects[il])), [['U', 'U']], 'Ilha: {U}{U}');
  assert.deepEqual(J(E.productions(s, s.objects[pl])), [['W']], 'Planície: igual');
  assert.deepEqual(J(E.productions(s, s.objects[ilOp])), [['U', 'U']], 'a Ilha do oponente também');
  const dois = J(s); dois.mareAlta = 2; assert.deepEqual(J(E.productions(dois, dois.objects[il])), [['U', 'U', 'U']], 'duas High Tides somam');
  const fim = passaAte(s, x => x.turn.active === 1); assert.deepEqual(J(E.productions(fim, fim.objects[il])), [['U']], 'acaba no fim do turno');
  assert.equal(T.descreveEfeitos(S.SCRIPTS['High Tide'].effects), 'até o fim do turno, cada Ilha virada para mana dá {U} a mais (para qualquer jogador)');
});

test('M-262 · Narset: "Each opponent can\'t draw more than one card each turn." e o −2 (olha quatro, pode pegar uma que não seja criatura nem terreno, o resto no fundo)', () => {
  let s = mesa(['Narset, Parter of Veils', 'Lightning Bolt', 'Thraben Inspector'], []), n;
  [s, n] = poe(s, 0, 'Narset, Parter of Veils', 'battlefield', { counters: { loyalty: 5 } });
  s = J(s);
  const mao1 = s.zones[1].hand.length;
  E.applyEffect(s, { oid: 'h', name: 'Teste', controller: 1, ability: true, source: null }, { do: 'draw', amount: 3 }, null, []);
  assert.equal(s.zones[1].hand.length, mao1 + 1, 'o oponente comprou só uma das três');
  const mao0 = s.zones[0].hand.length;
  E.applyEffect(s, { oid: 'h', name: 'Teste', controller: 0, ability: true, source: null }, { do: 'draw', amount: 2 }, null, []);
  assert.equal(s.zones[0].hand.length, mao0 + 2, 'quem controla a Narset compra normalmente');
  // −2
  let x = J(s); const topo = x.zones[0].library.slice(0, 4);
  x = act(x, legais(x, 0, a => a.t === 'activate' && a.oid === n)[0]); x = tudo(x, y => legais(y, y.pending.p, a => a.t === 'pick_done')[0] || legais(y, y.pending.p)[0]);
  assert.equal(x.objects[n].counters.loyalty, 3, 'lealdade 5 − 2');
  assert.ok(topo.every(o => x.objects[o].zone === 'hand' ? !/Creature|Land/.test(x.facts[x.objects[o].name].typeText) : true), 'só pega o que não é criatura nem terreno');
  assert.ok(topo.filter(o => x.objects[o].zone === 'library').every(o => x.zones[0].library.slice(-4).includes(o)), 'o resto foi para o fundo');
});
