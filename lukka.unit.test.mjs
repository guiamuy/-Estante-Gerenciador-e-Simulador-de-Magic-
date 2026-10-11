// M-270 · Lukka, Coppercoat Outcast completo: +1 (exila as três de cima; as criaturas exiladas assim podem ser conjuradas do exílio enquanto
// você controlar um planeswalker Lukka) e −7 (cada criatura sua causa dano igual ao poder a cada oponente). Texto oficial em
// .listas/oficiais-commander.json (05/10/2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, mesa, comMana, tudo } from './cmd.mjs';
import { S, T } from './listas.mjs';

const ativa = (s, lk, index) => tudo(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === lk && a.index === index)[0]));

test('M-270 · Lukka +1: exila as três de cima; só as criaturas podem ser conjuradas do exílio, pagando, e só enquanto você controla um Lukka', () => {
  let s = mesa(['Lukka, Coppercoat Outcast', 'Faerie Seer', 'Lightning Bolt', 'Thraben Inspector'], []), lk;
  [s, lk] = poe(s, 0, 'Lukka, Coppercoat Outcast', 'battlefield', { counters: { loyalty: 5 } });
  s = J(s); const t3 = s.zones[0].library.slice(0, 3); ['Faerie Seer', 'Lightning Bolt', 'Thraben Inspector'].forEach((n, i) => { s.objects[t3[i]].name = n; });
  s = ativa(s, lk, 0);
  assert.equal(s.objects[lk].counters.loyalty, 6);
  assert.ok(t3.every(o => s.objects[o].zone === 'exile'), 'as três exiladas');
  s = comMana(s, 'UWRR');
  assert.ok(legais(s, 0, a => a.t === 'cast' && a.oid === t3[0]).length, 'Faerie Seer: pode conjurar do exílio');
  assert.ok(legais(s, 0, a => a.t === 'cast' && a.oid === t3[2]).length, 'Thraben Inspector também');
  assert.equal(legais(s, 0, a => a.t === 'cast' && a.oid === t3[1]).length, 0, 'o raio não é criatura: não');
  const sem = J(s); E.moveObject(sem, lk, 'graveyard');
  assert.equal(legais(sem, 0, a => a.t === 'cast' && a.oid === t3[0]).length, 0, 'sem um Lukka no campo: não');
  assert.throws(() => act(sem, { t: 'cast', p: 0, oid: t3[0] }));
  const volta = J(sem); E.moveObject(volta, lk, 'battlefield');
  assert.ok(legais(volta, 0, a => a.t === 'cast' && a.oid === t3[0]).length, 'Lukka de volta (outro objeto, mesmo subtipo): pode de novo');
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === t3[0])[0]));
  assert.equal(s.objects[t3[0]].zone, 'battlefield'); assert.equal(s.players[0].pool.U || 0, 0, 'pagou {U}');
  assert.equal(T.descreveEfeitos(S.SCRIPTS['Lukka, Coppercoat Outcast'].loyalty[0].effects), 'exila as 3 cartas de cima; as criaturas exiladas assim podem ser conjuradas do exílio enquanto você controlar um planeswalker Lukka');
});

test('M-270 · Lukka −7: cada criatura sua causa dano igual ao poder a cada oponente — a criatura é a fonte (vínculo com a vida conta)', () => {
  let s = mesa(['Lukka, Coppercoat Outcast', 'Thraben Inspector', 'Faerie Seer'], ['Faerie Seer']), lk, a, b, op;
  [s, lk] = poe(s, 0, 'Lukka, Coppercoat Outcast', 'battlefield', { counters: { loyalty: 7 } });
  [s, a] = poe(s, 0, 'Thraben Inspector'); [s, b] = poe(s, 0, 'Faerie Seer'); [s, op] = poe(s, 1, 'Faerie Seer');
  s = J(s); s.objects[b].tempHabilidades = undefined;
  // vínculo com a vida na Seer até o fim do turno: o dano dela dá vida a quem a controla
  E.applyEffect(s, s.objects[a], { do: 'continuo', target: 'self-source', palavras: ['lifelink'] }, null, []);
  const vida1 = s.players[1].life, vida0 = s.players[0].life;
  s = ativa(s, lk, 2);
  assert.equal(s.objects[lk].zone, 'graveyard', 'lealdade 7 − 7: vai para o cemitério');
  assert.equal(s.players[1].life, vida1 - 2, 'Inspector (1) + Seer (1)');
  assert.equal(s.players[0].life, vida0 + 1, 'o Inspector com vínculo com a vida deu 1 de vida');
  assert.equal(s.objects[op].damage, 0, 'criatura do oponente não recebe nada');
});
