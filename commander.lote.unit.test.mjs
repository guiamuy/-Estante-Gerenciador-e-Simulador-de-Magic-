// R10 · plano do lote Commander: os dados do plano não podem ficar para trás das listas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8'));
const decks = L('decks.json'), BASICOS = ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest'];
const nomes = [...new Set(Object.keys(decks).filter(k => /Commander/.test(k)).flatMap(k => Object.keys(decks[k])))].filter(n => !BASICOS.includes(n));

test('R10 · toda carta das listas Commander tem texto oficial com fonte e data', () => {
  const txt = new Map([...L('oficiais.json').cartas, ...L('oficiais-commander.json').cartas].map(c => [c.name, c]));
  assert.deepEqual(nomes.filter(n => !txt.has(n)), [], 'cartas sem texto oficial');
  const novas = L('oficiais-commander.json').cartas;
  assert.deepEqual(novas.filter(c => !c.oracle_text || !c.type_line || !c.fonte || !c.consulta).map(c => c.name), [], 'texto, tipo, fonte e data em todas');
  assert.deepEqual(novas.filter(c => c.incerto).map(c => c.name).sort(), ['Kytheon, Hero of Akros', 'Sorin of House Markov'], 'incertas conhecidas: não escrever script delas sem nova conferência');
});

test('R10 · a triagem cobre as mesmas cartas, cada uma num balde, e toda carta B ou C diz a primitiva ou estrutura que falta', () => {
  const tri = L('triagem-commander.json').cartas;
  assert.deepEqual(tri.map(c => c.name).sort(), nomes.slice().sort());
  assert.deepEqual(tri.filter(c => !['ok', 'A', 'B', 'C'].includes(c.balde)).map(c => c.name), []);
  assert.deepEqual(tri.filter(c => ['B', 'C'].includes(c.balde) && !(c.primitivas || []).length).map(c => c.name), []);
});
