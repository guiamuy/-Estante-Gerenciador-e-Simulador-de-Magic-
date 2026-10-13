// H-10 · CR 118.9d / 601.2f · a redução por cor ("Green spells and blue spells you cast cost {1} less", Sunscape Familiar) também tira do {2}
// do aerobender (701.65a, custo alternativo). Pedido da trilha motor (achado da prenunciada, M-382). Texto oficial em .listas/oficiais-listas.json.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CARTAS, E, J, act, poe, legais, mesa, comMana, criatura } from './verbos.mjs';
const oficial = JSON.parse(readFileSync(new URL('./.listas/oficiais-listas.json', import.meta.url), 'utf8')).cartas.find(c => c.name === 'Sunscape Familiar');
CARTAS['Sunscape Familiar'] = { name: oficial.name, type_line: oficial.type_line, mana_cost: oficial.mana_cost, cmc: 2, keywords: ['Defender'], oracle_text: oficial.oracle_text, colors: ['W'], power: oficial.power, toughness: oficial.toughness };
const VERDE = criatura('Urso Verde de Teste', 2, 2, { mana_cost: '{3}{G}{G}', colors: ['G'] });
const VERMELHO = criatura('Urso Vermelho de Teste', 2, 2, { mana_cost: '{3}{R}{R}', colors: ['R'] });
const aero = (s, p, oid) => { s = J(s); E.applyEffect(s, { oid: 'h', name: 'X', controller: p, ability: true, source: null }, { do: 'airbend', target: 'permanent' }, { oid }, []); return s; };
const sobra = s => Object.values(s.players[0].pool).reduce((a, b) => a + b, 0);

test('H-10 · 601.2f/118.9d · com Sunscape Familiar, a criatura verde aerobendida custa {1} em vez de {2}', () => {
  let s = mesa(['Sunscape Familiar', VERDE], []), o; [s] = poe(s, 0, 'Sunscape Familiar'); [s, o] = poe(s, 0, VERDE);
  s = comMana(aero(s, 0, o), 'W');
  assert.equal(s.objects[o].zone, 'exile');
  const oferta = legais(s, 0, a => a.oid === o && a.aerobend);
  assert.equal(oferta.length, 1, 'com uma mana só, a conjuração pelo aerobender é oferecida');
  const x = act(s, oferta[0]); assert.equal(x.objects[o].zone, 'stack'); assert.equal(sobra(x), 0, 'pagou {1}');
});

test('H-10 · a redução vale só para a cor dela: a criatura vermelha aerobendida segue custando {2}', () => {
  let s = mesa(['Sunscape Familiar', VERMELHO], []), o; [s] = poe(s, 0, 'Sunscape Familiar'); [s, o] = poe(s, 0, VERMELHO);
  s = aero(s, 0, o);
  assert.equal(legais(comMana(s, 'W'), 0, a => a.oid === o && a.aerobend).length, 0, 'uma mana não basta');
  assert.equal(legais(comMana(s, 'WW'), 0, a => a.oid === o && a.aerobend).length, 1);
});
