// M-372 · a face de trás de um script só entra nos fatos da partida que tem a carta (pedido da trilha listas, L-8): antes, todo script com `back`
// sem `self.duplaFace` (Sorin, Kytheon, Lunarch Veteran, Sagu Wildling, um craft novo) punha o verso nos fatos de TODA partida — estado maior
// (16% do estado da partida-referência pauper-42 eram versos sem a frente) e partidas-referência mudando por carta que nem está em jogo. Os testes falham no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E } from './cmd.mjs';
import { S } from './listas.mjs';
import * as F from './fixtures.mjs';

const orfas = s => Object.keys(s.facts).filter(n => s.facts[n].backOf && !s.facts[s.facts[n].backOf]);

test('M-372 · partida sem Sorin, Kytheon, Lunarch Veteran e Sagu Wildling não carrega os versos deles; o verso da Delver (em jogo) continua', () => {
  const s = E.createGame(F.setup('pauper', 42));
  assert.deepEqual([...orfas(s)], []);
  assert.ok(s.facts['Insectile Aberration'] && s.facts['Insectile Aberration'].backOf === 'Delver of Secrets');
});

test('M-372 · com a carta na partida, o verso entra (Lunarch Veteran → Luminous Phantom, branca, Spirit); script de craft trazido pelo setup só põe o verso se a carta estiver', () => {
  const c = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: 1, keywords: [], oracle_text: '', colors: ['W'], ...extra });
  const cards = { 'Lunarch Veteran': c('Lunarch Veteran', 'Creature — Human Cleric', '{W}', { power: '1', toughness: '1' }), Plains: c('Plains', 'Basic Land — Plains', '', { colors: [] }) };
  const craft = { name: 'Lamina', self: { craft: { mana: '{2}', types: ['artifact'], amount: 1 } }, back: { name: 'Lamina Desperta', types: ['artifact', 'creature'], power: 2, toughness: 2, colors: [] }, effects: [], example: { target: 'none', expect: { selfLife: 20 } } };
  assert.deepEqual([...S.validateScript(craft)], [], 'o script de craft do teste é válido (senão o teste passaria à toa)');
  const deck = ns => ns.map(name => ({ name, qty: 20, zone: 'main' }));
  const jogo = (comLamina) => E.createGame({ format: 'livre', seed: 3, mode: 'full', first: 0, scripts: { Lamina: craft },
    cards: { ...cards, ...(comLamina ? { Lamina: c('Lamina', 'Artifact', '{1}', { colors: [] }) } : {}) },
    players: [{ name: 'A', deck: deck(['Lunarch Veteran', 'Plains', ...(comLamina ? ['Lamina'] : [])]) }, { name: 'B', deck: deck(['Plains']) }] });
  const s = jogo(false);
  assert.equal(s.facts['Luminous Phantom'].backOf, 'Lunarch Veteran');
  assert.equal(s.facts['Lamina Desperta'], undefined, 'sem a Lamina na partida, o verso dela não entra');
  assert.deepEqual([...orfas(s)], []);
  assert.equal(jogo(true).facts['Lamina Desperta'].backOf, 'Lamina');
});
