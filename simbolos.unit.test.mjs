// U3 · símbolos de Magic: o analisador que separa texto e símbolos, e o nome falado de cada um.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
const { components: K } = loadModules();
const J = x => JSON.parse(JSON.stringify(x));

test('U3 · separa texto e símbolos, preservando tudo o que não é símbolo', () => {
  assert.deepEqual(J(K.analisaSimbolos('{T}: Add {G}.')), [{ simbolo: 'T', bruto: '{T}' }, { texto: ': Add ' }, { simbolo: 'G', bruto: '{G}' }, { texto: '.' }]);
  assert.deepEqual(J(K.analisaSimbolos('Conjurar · {1}{U}')), [{ texto: 'Conjurar · ' }, { simbolo: '1', bruto: '{1}' }, { simbolo: 'U', bruto: '{U}' }]);
  assert.deepEqual(J(K.analisaSimbolos('sem símbolo')), [{ texto: 'sem símbolo' }]);
  assert.deepEqual(J(K.analisaSimbolos('')), []);
  assert.deepEqual(J(K.analisaSimbolos(null)), []);
});

test('U3 · reconhece números, X, virar/desvirar, energia, neve, híbridos, "2/cor" e phyrexianos; minúsculas também', () => {
  const s = t => J(K.analisaSimbolos(t)).filter(p => p.simbolo).map(p => p.simbolo);
  assert.deepEqual(s('{0}{1}{10}{15}{X}{Y}{Z}{T}{Q}{E}{S}{C}'), ['0', '1', '10', '15', 'X', 'Y', 'Z', 'T', 'Q', 'E', 'S', 'C']);
  assert.deepEqual(s('{W/U}{b/r}{2/W}{C/G}{G/P}'), ['W/U', 'B/R', '2/W', 'C/G', 'G/P']);
});

test('U3 · o que não é símbolo de Magic continua texto (nada de engolir chaves alheias)', () => {
  for (const t of ['{abc}', '{}', '{100}', '{W/U/B}', '{ W }', 'objeto {"a":1}', '{H}']) {
    assert.deepEqual(J(K.analisaSimbolos(t)), [{ texto: t }], t);
  }
});

test('U3 · nome falado em português', () => {
  assert.equal(K.nomeDoSimbolo('W'), 'branco'); assert.equal(K.nomeDoSimbolo('u'), 'azul');
  assert.equal(K.nomeDoSimbolo('3'), '3 genérico'); assert.equal(K.nomeDoSimbolo('T'), 'virar');
  assert.equal(K.nomeDoSimbolo('W/U'), 'branco ou azul'); assert.equal(K.nomeDoSimbolo('2/W'), '2 genérico ou branco');
  assert.equal(K.nomeDoSimbolo('R/P'), 'vermelho phyrexiano'); assert.equal(K.nomeDoSimbolo('X'), 'X');
});

test('U3 · o analisador é reentrante (regex global não guarda estado entre chamadas)', () => {
  for (let i = 0; i < 3; i++) assert.equal(J(K.analisaSimbolos('{G}{G}')).length, 2);
});

// Leva 104 · achado do portão no seletor de X: "Você paga {3}{G}" mostrava o {3} como texto. O teste de
// simbolizar() deixava o lastIndex da expressão global no fim do primeiro símbolo, e o matchAll herdava esse
// ponto de partida, pulando o primeiro símbolo do texto. Agora o analisador não depende de estado anterior.
test('Leva 104 · analisar duas vezes o mesmo texto dá o mesmo resultado (sem estado preso na expressão)', () => {
  const um = J(K.analisaSimbolos('Você paga {3}{G}'));
  K.SIMBOLO_RX.lastIndex = 0; K.SIMBOLO_RX.test('Você paga {3}{G}'); // o que o simbolizar() fazia antes de trocar o texto
  assert.deepEqual(J(K.analisaSimbolos('Você paga {3}{G}')), um);
  assert.deepEqual(um.filter(p => p.simbolo).map(p => p.simbolo), ['3', 'G']);
});
