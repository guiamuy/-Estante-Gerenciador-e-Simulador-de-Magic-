// U5 · cópias iguais em leque na mesa: o que junta, o que separa e em que ordem.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
import { COMBAT_CARDS } from './fixtures.mjs';
const { table: T, engine: E } = loadModules();
const J = x => JSON.parse(JSON.stringify(x));

/** Mesa mínima com fatos reais das cartas de combate. */
function mesa(objs) {
  const facts = {}; for (const [n, c] of Object.entries(COMBAT_CARDS)) facts[n] = E.cardFacts(c);
  const objects = {}; const bf = [[], []];
  for (const o of objs) { objects[o.oid] = { tapped: false, sick: false, damage: 0, counters: {}, controller: 0, owner: 0, zone: 'battlefield', ...o }; bf[objects[o.oid].controller].push(o.oid); }
  return { facts, objects, zones: bf.map(b => ({ battlefield: b })) };
}
const resumo = pilhas => J(pilhas.map(p => [p.name, p.total, p.viradas]));

test('U5 · criaturas iguais juntam; nomes diferentes não; ordem é a de chegada', () => {
  const s = mesa([{ oid: 'a', name: 'Sky Pike' }, { oid: 'b', name: 'Venom Eel' }, { oid: 'c', name: 'Sky Pike' }, { oid: 'd', name: 'Sky Pike' }]);
  const p = T.agrupaLeque(s, ['a', 'b', 'c', 'd']);
  assert.deepEqual(resumo(p), [['Sky Pike', 3, 0], ['Venom Eel', 1, 0]]);
  assert.deepEqual(J(p[0].oids), ['a', 'c', 'd']);
  assert.equal(p[0].primeiraDesvirada, 'a');
});

test('U5 · estado diferente separa: virada, enjoo, marcador, dano, efeito do turno, combate', () => {
  const s = mesa([
    { oid: 'a', name: 'Sky Pike' }, { oid: 'b', name: 'Sky Pike', tapped: true }, { oid: 'c', name: 'Sky Pike', sick: true },
    { oid: 'd', name: 'Sky Pike', counters: { p1p1: 1 } }, { oid: 'e', name: 'Sky Pike', damage: 1 },
    { oid: 'f', name: 'Sky Pike', pump: { p: 2, t: 2 } }, { oid: 'g', name: 'Sky Pike', attacking: true },
    { oid: 'h', name: 'Sky Pike', tempKeywords: ['haste'] }, { oid: 'i', name: 'Sky Pike' }]);
  const p = T.agrupaLeque(s, ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']);
  assert.equal(p.length, 8, 'só a e i juntam');
  assert.deepEqual(J(p[0].oids), ['a', 'i']);
  // lista vazia de efeitos não separa
  const s2 = mesa([{ oid: 'a', name: 'Sky Pike', tempKeywords: [] }, { oid: 'b', name: 'Sky Pike', pump: {} }]);
  assert.equal(T.agrupaLeque(s2, ['a', 'b']).length, 1);
});

test('Q10 · vínculo de alma, proteção até o fim do turno e "uma vez por turno" também separam', () => {
  const s = mesa([{ oid: 'a', name: 'Sky Pike' }, { oid: 'b', name: 'Sky Pike', paired: 'x' }, { oid: 'c', name: 'Sky Pike', tempProtection: ['R'] },
    { oid: 'd', name: 'Sky Pike', usedThisTurn: true }, { oid: 'e', name: 'Sky Pike' }]);
  const p = T.agrupaLeque(s, ['a', 'b', 'c', 'd', 'e']);
  assert.equal(p.length, 4); assert.deepEqual(J(p[0].oids), ['a', 'e']);
});

test('U5 · enjoo só importa para criatura; terreno recém-jogado junta com os outros', () => {
  const s = mesa([{ oid: 'a', name: 'Island' }, { oid: 'b', name: 'Island', sick: true }, { oid: 'c', name: 'Island' }]);
  assert.deepEqual(resumo(T.agrupaLeque(s, ['a', 'b', 'c'])), [['Island', 3, 0]]);
});

test('U5 · anexo separa o hospedeiro e o anexado; controladores diferentes nunca juntam', () => {
  const s = mesa([{ oid: 'a', name: 'Sky Pike' }, { oid: 'b', name: 'Sky Pike' }, { oid: 'eq', name: 'Mind Stone', attachedTo: 'b' },
    { oid: 'x', name: 'Sky Pike', controller: 1 }]);
  const p = T.agrupaLeque(s, ['a', 'b', 'x']);
  assert.equal(p.length, 3);
});

test('U5 · separa(oid): a tela tira do leque quem precisa de toque próprio (atacante elegível)', () => {
  const s = mesa([{ oid: 'a', name: 'Sky Pike' }, { oid: 'b', name: 'Sky Pike' }, { oid: 'c', name: 'Sky Pike' }]);
  const p = T.agrupaLeque(s, ['a', 'b', 'c'], { separa: oid => oid !== 'c' });
  assert.deepEqual(resumo(p), [['Sky Pike', 1, 0], ['Sky Pike', 1, 0], ['Sky Pike', 1, 0]]);
  assert.equal(T.agrupaLeque(s, ['a', 'b', 'c'], { separa: () => false }).length, 1);
});

test('U5 · tudo virado: o toque vai para a primeira; mesa sem fatos não quebra', () => {
  const s = mesa([{ oid: 'a', name: 'Island', tapped: true }, { oid: 'b', name: 'Island', tapped: true }]);
  const [p] = T.agrupaLeque(s, ['a', 'b']);
  assert.equal(p.primeiraDesvirada, null); assert.equal(p.primeira, 'a'); assert.equal(p.viradas, 2);
  const semFatos = { objects: { a: { oid: 'a', name: 'X', counters: {} } }, zones: [] };
  assert.equal(T.agrupaLeque(semFatos, ['a', 'fantasma']).length, 1, 'oid inexistente é ignorado');
  assert.deepEqual(J(T.agrupaTerrenos(s, ['a', 'b'])), J(T.agrupaLeque(s, ['a', 'b'])), 'nome antigo dá o mesmo resultado');
});
