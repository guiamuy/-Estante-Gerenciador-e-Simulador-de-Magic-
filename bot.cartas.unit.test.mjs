// B-180 · a contagem da auditoria carta a carta (bot.cartas.mjs) é pura: estes testes montam estados mínimos à mão.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { novaAuditoria, registraDecisao, fechaPartida, junta, classifica } from './bot.cartas.mjs';

const estado = () => ({
  turn: { number: 3, step: 'main1', active: 0 },
  stack: [],
  objects: {
    o1: { name: 'Lightning Bolt', owner: 0, controller: 0 }, o2: { name: 'Lightning Bolt', owner: 0, controller: 0 },
    o3: { name: 'Mountain', owner: 0, controller: 0 }, o4: { name: 'Guttersnipe', owner: 0, controller: 0 },
    o5: { name: 'Elvish Mystic', owner: 1, controller: 1 }, o6: { name: 'Counterspell', owner: 1, controller: 1 },
  },
  zones: [{ hand: ['o1', 'o2', 'o3'] }, { hand: ['o6'] }],
});

test('B-180 · registraDecisao: cada carta conta uma vez por decisão em "podia"; "usou" só a escolhida; passar e virar terreno não são uso', () => {
  const s = estado(), acc = novaAuditoria(), vistas = new Set();
  const acoes = [{ t: 'pass', p: 0 }, { t: 'tap_mana', p: 0, oid: 'o3' }, { t: 'play_land', p: 0, oid: 'o3' },
    { t: 'cast', p: 0, oid: 'o1', targets: [{ oid: 'o5' }] }, { t: 'cast', p: 0, oid: 'o2', targets: [{ oid: 'o4' }] }, { t: 'cast', p: 0, oid: 'o1', targets: [{ player: 1 }] }];
  registraDecisao(acc, s, 0, acoes, acoes[3], vistas, 'conjurei Lightning Bolt');
  assert.equal(acc.cartas['Lightning Bolt'].podia, 1, 'duas cópias e três alvos: uma decisão');
  assert.equal(acc.cartas['Lightning Bolt'].usou, 1);
  assert.deepEqual(acc.cartas['Lightning Bolt'].alvos, { dele: 1 });
  assert.deepEqual(acc.cartas['Lightning Bolt'].passos, { main1: 1 });
  assert.equal(acc.cartas.Mountain.podia, 1); assert.equal(acc.cartas.Mountain.usou, 0);
  assert.equal(acc.cartas.Mountain.exemplos[0].escolheu, 'cast Lightning Bolt');
  assert.deepEqual([...vistas].sort(), ['o1', 'o2', 'o3']);
  registraDecisao(acc, s, 0, acoes, acoes[0], vistas);
  assert.equal(acc.cartas['Lightning Bolt'].podia, 2); assert.equal(acc.cartas['Lightning Bolt'].usou, 1, 'passar não é uso');
  registraDecisao(acc, s, 0, acoes, acoes[4], vistas);
  assert.deepEqual(acc.cartas['Lightning Bolt'].alvos, { dele: 1, meu: 1 }, 'o Bolt na própria Guttersnipe conta como alvo meu');
  assert.equal(acc.decisoes, 3);
  registraDecisao(acc, s, 0, acoes, { t: 'cast', p: 0, oid: 'o2', alt: 0, targets: [{ oid: 'o5' }] }, vistas);
  assert.equal(acc.cartas['Lightning Bolt'].alvos['custo alternativo'], 1, 'o custo alternativo de índice 0 conta');
});

test('B-180 · registraDecisao: na pilha e no turno do outro o passo diz isso; carta do oponente nunca entra na conta de quem decide', () => {
  const s = { ...estado(), turn: { number: 4, step: 'end', active: 1 }, stack: ['o6'] };
  const acc = novaAuditoria();
  const acoes = [{ t: 'cast', p: 0, oid: 'o1', targets: [{ oid: 'o6' }] }, { t: 'cast', p: 0, oid: 'o6' }];
  registraDecisao(acc, s, 0, acoes, acoes[0]);
  assert.deepEqual(acc.cartas['Lightning Bolt'].passos, { 'end+pilha·dele': 1 });
  assert.deepEqual(acc.cartas['Lightning Bolt'].alvos, { 'pilha-dele': 1 });
  assert.equal(acc.cartas.Counterspell, undefined, 'a carta é do outro jogador');
});

test('B-180 · fechaPartida conta na mão no fim só a carta que pôde sair, e por cópia quantas puderam sair e quantas saíram; junta soma processos', () => {
  const s = estado(), a = novaAuditoria(), vistas = [new Set(['o1', 'o4']), new Set()];
  fechaPartida(a, s, vistas, [new Set(['o4'])]);
  assert.equal(a.cartas['Lightning Bolt'].maoNoFim, 1); assert.equal(a.cartas.Mountain, undefined, 'a Montanha não pôde sair');
  assert.equal(a.cartas['Lightning Bolt'].copias, 1); assert.equal(a.cartas['Lightning Bolt'].copiasUsadas, 0);
  assert.equal(a.cartas.Guttersnipe.copias, 1); assert.equal(a.cartas.Guttersnipe.copiasUsadas, 1);
  const b = novaAuditoria(); fechaPartida(b, s, vistas);
  const ficha = novaAuditoria(), s2 = estado(); s2.objects.o9 = { name: 'Blood', owner: 0, controller: 0 };
  const v2 = new Set(); registraDecisao(ficha, s2, 0, [{ t: 'activate', p: 0, oid: 'o9' }], { t: 'pass', p: 0 }, v2);
  delete s2.objects.o9; fechaPartida(ficha, s2, [v2, new Set()]);
  assert.equal(ficha.cartas.Blood.copias, 1, 'a ficha que saiu do jogo ainda conta pelo nome guardado');
  const r = junta(a, b);
  assert.equal(r.partidas, 2); assert.equal(r.cartas['Lightning Bolt'].maoNoFim, 2); assert.equal(r.cartas.Guttersnipe.copias, 2);
});

test('B-180 · classifica por cópia: não usa (3+ cópias puderam sair, nenhuma saiu), a revisar (menos da metade saiu; ou remoção no próprio lado), pouca evidência (menos de 3)', () => {
  const acc = novaAuditoria();
  const f = (copias, copiasUsadas, alvos = {}) => ({ podia: 50, usou: copiasUsadas, copias, copiasUsadas, tipos: {}, passos: {}, alvos, maoNoFim: 0, outras: 0, exemplos: [] });
  acc.cartas.A = f(4, 0); acc.cartas.B = f(6, 5, { meu: 1, dele: 4 }); acc.cartas.C = f(6, 5, { meu: 5 }); acc.cartas.D = f(10, 3); acc.cartas.E = f(2, 0);
  const facts = { B: { script: { effects: [{ do: 'damage', amount: 3 }] } }, C: { script: { effects: [{ do: 'pump' }] } } };
  const c = Object.fromEntries(classifica(acc, facts).map(l => [l.nome, l.classe]));
  assert.deepEqual(c, { A: 'não usa', B: 'a revisar', C: 'usa', D: 'a revisar', E: 'pouca evidência' });
});
