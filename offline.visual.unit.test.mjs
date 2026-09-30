// U4 · o painel "sem internet" em números: estado de cada item e o anel de progresso.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
const { offline: O } = loadModules();
const J = x => JSON.parse(JSON.stringify(x));
const base = { listas: { total: 2, prontas: 2 }, colecao: { cartas: 4, guardadas: 4, pronta: true }, nomes: true, nomesInfo: { count: 31000 }, leitor: true, imagens: { total: 10, guardadas: 10 } };

test('U4 · tudo guardado: cinco itens prontos, anel em 100', () => {
  const r = O.resumoOffline(base);
  assert.deepEqual(J(r.itens.map(i => [i.id, i.estado])), [['listas', 'pronto'], ['colecao', 'pronto'], ['nomes', 'pronto'], ['leitor', 'pronto'], ['imagens', 'pronto']]);
  assert.equal(r.pct, 100); assert.equal(r.tudoPronto, true); assert.equal(r.faltam, 0);
  assert.match(r.itens[2].detalhe, /31\.000 nomes/);
});

test('U4 · parcial e falta: o anel é a média das frações; o que não tem nada a guardar fica de fora', () => {
  const r = O.resumoOffline({ ...base, listas: { total: 4, prontas: 1 }, leitor: false, imagens: { total: 0, guardadas: 0 }, colecao: { cartas: 0, guardadas: 0 } });
  assert.deepEqual(J(r.itens.map(i => [i.id, i.estado])), [['listas', 'parcial'], ['colecao', 'vazio'], ['nomes', 'pronto'], ['leitor', 'falta']]);
  // listas 0,25 + nomes 1 + leitor 0 → 1,25 / 3 = 42%
  assert.equal(r.pct, 42); assert.equal(r.tudoPronto, false); assert.equal(r.faltam, 2);
  assert.equal(r.itens[1].detalhe, 'coleção vazia');
});

test('U4 · aparelho novo: nada a guardar além de nomes e leitor, os dois faltando → 0%', () => {
  const r = O.resumoOffline({ listas: { total: 0, prontas: 0 }, colecao: { cartas: 0, guardadas: 0 }, nomes: false, leitor: false, imagens: null });
  assert.equal(r.pct, 0); assert.equal(r.tudoPronto, false);
  assert.equal(r.itens.find(i => i.id === 'listas').estado, 'vazio');
  assert.equal(r.itens.length, 4, 'sem imagens a contar, a linha some');
});
