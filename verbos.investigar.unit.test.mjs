// V-9 · CR 701.16 · investigar ("Create a Clue token", 111.10f). Texto oficial em .listas/oficiais-verbos.json (Oracle do Forge, 11/10/2026):
// Deduce — "Draw a card. Investigate."
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
import { E, J, act, poe, legais, mesa, comMana, tudo, conjura } from './verbos.mjs';
const { scripts: S, table: T } = loadModules();
const pistas = (s, p = 0) => Object.values(s.objects).filter(o => o.token && o.name === 'Clue' && o.controller === p && o.zone === 'battlefield');

test('CR 701.16 · investigar: cria uma ficha de Pista — artefato incolor do subtipo Clue com "{2}, sacrifique esta ficha: compre uma carta"', () => {
  let s = mesa(['Deduce'], []), m; [s, m] = poe(s, 0, 'Deduce', 'hand'); const mao = s.zones[0].hand.length;
  s = tudo(conjura(comMana(s, 'UU'), 0, m));
  const [pista] = pistas(s); assert.ok(pista, 'uma Pista'); assert.equal(pistas(s).length, 1); assert.equal(s.zones[0].hand.length, mao, 'e comprou a carta (−1 da mágica, +1)');
  const f = s.facts.Clue; assert.deepEqual([...f.types], ['artifact']); assert.match(f.typeText, /Clue/); assert.deepEqual([...f.colors], []);
  // a habilidade da Pista: {2}, sacrificar: compre
  const hab = legais(comMana(s, 'CC'), 0, a => a.t === 'activate' && a.oid === pista.oid); assert.ok(hab.length > 0);
  const r = tudo(act(comMana(s, 'CC'), hab[0])); assert.equal(r.zones[0].hand.length, mao + 1); assert.equal(pistas(r).length, 0, 'sacrificada');
  assert.equal(legais(s, 0, a => a.t === 'activate' && a.oid === pista.oid).length, 0, 'sem {2}, não ativa');
});

test('CR 701.16 · investigar mais de uma vez cria uma Pista por vez, e a Pista é a mesma das cartas que já investigavam (Thraben Inspector)', () => {
  let s = mesa(['Deduce', 'Thraben Inspector'], []); s = J(s);
  E.applyEffect(s, { oid: 'h', name: 'Teste', controller: 0, ability: true, source: null }, { do: 'investigate', amount: 2 }, null, []);
  assert.equal(pistas(s).length, 2);
  const daLista = S.SCRIPTS['Thraben Inspector'].abilities[0].effects[0].token;
  assert.deepEqual(J(s.facts.Clue.script.abilities), J(daLista.abilities), 'mesma habilidade');
  const erros = effects => S.validateScript({ name: 'X', effects, example: { target: 'none', expect: { tokens: 1 } } }).join(' | ');
  assert.equal(erros([{ do: 'investigate' }]), ''); assert.equal(erros([{ do: 'investigate', amount: { per: 'x' } }]), '');
  assert.equal(T.descreveEfeitos(S.SCRIPTS.Deduce.effects), 'compra 1 carta; investiga (cria uma ficha de Pista: {2}, sacrificar: compre uma carta)');
});
