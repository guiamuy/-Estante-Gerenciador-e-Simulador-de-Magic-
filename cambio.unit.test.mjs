// Leva 163 · preço em três moedas: cotação do dólar por API pública, guardada no aparelho; nada de preço inventado.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
const { cambio: C, platform: P } = loadModules();
const J = x => JSON.parse(JSON.stringify(x));
const resposta = corpo => ({ ok: true, json: async () => corpo });

test('leva 163 · cada fonte de cotação é lida no formato dela; resposta estranha é descartada', () => {
  assert.deepEqual(J(C.interpreta('awesomeapi', { USDBRL: { bid: '5.2214' }, USDEUR: { bid: '0.8909' } })), { BRL: 5.2214, EUR: 0.8909 });
  assert.deepEqual(J(C.interpreta('frankfurter', { base: 'USD', rates: { BRL: 5.2214, EUR: 0.89087 } })), { BRL: 5.2214, EUR: 0.89087 });
  assert.deepEqual(J(C.interpreta('er-api', { result: 'success', rates: { BRL: 5.222334, EUR: 0.888752, JPY: 150 } })), { BRL: 5.222334, EUR: 0.888752 });
  assert.equal(C.interpreta('er-api', { result: 'error', rates: { BRL: 5, EUR: 0.9 } }), null);
  assert.equal(C.interpreta('frankfurter', { rates: { BRL: 0, EUR: 0.9 } }), null, 'zero não é cotação');
  assert.equal(C.interpreta('frankfurter', { rates: { BRL: 'abc', EUR: 0.9 } }), null);
  assert.equal(C.interpreta('frankfurter', { rates: { BRL: 5000, EUR: 0.9 } }), null, 'fora da faixa plausível');
  assert.equal(C.interpreta('awesomeapi', { USDBRL: { bid: '' }, USDEUR: { bid: '0.9' } }), null);
  assert.equal(C.interpreta('desconhecida', { rates: { BRL: 5, EUR: 0.9 } }), null);
  assert.equal(C.interpreta('frankfurter', null), null);
});

test('leva 163 · cotação: busca na ordem das fontes, guarda no aparelho, vale por uma hora e sobrevive sem rede', async () => {
  const store = P.memoryStore(); let hora = 1_000_000; const pedidos = [];
  let rede = async url => { pedidos.push(url); if (url.includes('awesomeapi')) throw new Error('429'); if (url.includes('frankfurter')) return resposta({ rates: { BRL: 5.2, EUR: 0.9 } }); return resposta({}); };
  const c = C.createCambio({ store, fetch: (...a) => rede(...a), agora: () => hora });
  const t1 = await c.taxas();
  assert.deepEqual([t1.BRL, t1.EUR, t1.origem, t1.fonte, t1.velha], [5.2, 0.9, 'rede', 'Frankfurter (BCE)', false]);
  assert.equal(pedidos.length, 2, 'a primeira fonte falhou, a segunda respondeu, a terceira nem foi chamada');
  assert.equal(J(await store.get(C.CHAVE)).BRL, 5.2, 'guardada no aparelho');
  // dentro da validade não vai à rede
  hora += C.VALIDADE_MS - 1; const t2 = await c.taxas(); assert.equal(t2.origem, 'guardada'); assert.equal(pedidos.length, 2);
  // passou da validade e a rede caiu: vale a última, marcada como velha
  hora += 10; rede = async () => { throw new Error('offline'); };
  const t3 = await c.taxas(); assert.deepEqual([t3.BRL, t3.origem, t3.velha], [5.2, 'guardada', true]);
  // outro aparelho ligado (nova instância) lê do armazenamento, mesmo sem rede
  const c2 = C.createCambio({ store, fetch: async () => { throw new Error('offline'); }, agora: () => hora });
  assert.equal((await c2.taxas()).BRL, 5.2);
  // nunca houve cotação e não há rede: null, nada inventado
  const c3 = C.createCambio({ store: P.memoryStore(), fetch: async () => { throw new Error('offline'); }, agora: () => hora });
  assert.equal(await c3.taxas(), null);
  // resposta implausível de todas as fontes: null
  const c4 = C.createCambio({ store: P.memoryStore(), fetch: async () => resposta({ rates: { BRL: -1, EUR: 9 } }), agora: () => hora });
  assert.equal(await c4.taxas(), null);
  // duas telas pedindo ao mesmo tempo fazem uma busca só
  let n = 0; const c5 = C.createCambio({ store: P.memoryStore(), fetch: async () => { n++; return resposta({ USDBRL: { bid: '5.3' }, USDEUR: { bid: '0.91' } }); }, agora: () => hora });
  const [a, b] = await Promise.all([c5.taxas(), c5.taxas()]); assert.equal(n, 1); assert.equal(a.BRL, 5.3); assert.equal(b.fonte, 'AwesomeAPI');
});

test('leva 163 · preços da carta: real sai do dólar, euro é o de mercado quando existe, foil separado, sem dado fica sem preço', () => {
  const t = { BRL: 5, EUR: 0.9 };
  const p = C.precosDe({ prices: { usd: '2.00', usd_foil: '10.00', eur: '1.50', eur_foil: null } }, t);
  assert.deepEqual(J(p.normal), { usd: 2, brl: 10, eur: 1.5, eurDeMercado: true, usdDeMercado: true });
  assert.deepEqual(J(p.foil), { usd: 10, brl: 50, eur: 9, eurDeMercado: false, usdDeMercado: true });
  // só euro (carta sem preço em dólar): o dólar e o real saem da cotação
  const so = C.precosDe({ prices: { usd: null, eur: '0.90' } }, t).normal;
  assert.ok(Math.abs(so.usd - 1) < 1e-9 && Math.abs(so.brl - 5) < 1e-9); assert.equal(so.usdDeMercado, false); assert.equal(so.eurDeMercado, true);
  // sem cotação: só o que a Scryfall deu
  assert.deepEqual(J(C.precosDe({ prices: { usd: '2.00' } }, null).normal), { usd: 2, brl: null, eur: null, eurDeMercado: false, usdDeMercado: true });
  // sem preço nenhum, zero ou lixo: null
  for (const prices of [{}, { usd: null }, { usd: '0.00' }, { usd: 'abc' }, undefined]) assert.deepEqual(J(C.precosDe({ prices }, t)), { normal: null, foil: null });
  assert.equal(C.usdDaCopia({ prices: { usd: '2.00', usd_foil: '10.00' } }), 2); assert.equal(C.usdDaCopia({ prices: { usd: '2.00', usd_foil: '10.00' } }, { foil: true }), 10);
  assert.equal(C.usdDaCopia({ prices: { usd_foil: '7.00' } }), 7, 'só existe foil: vale o foil'); assert.equal(C.usdDaCopia({ prices: {} }), null);
});

test('leva 163 · valores escritos como no Brasil; data da cotação curta', () => {
  assert.equal(C.fmt(6.4, 'brl'), 'R$ 6,40'); assert.equal(C.fmt(1234.5, 'usd'), 'US$ 1.234,50'); assert.equal(C.fmt(0.089, 'eur'), '€ 0,09');
  assert.equal(C.fmt(1234567.891, 'brl'), 'R$ 1.234.567,89'); assert.equal(C.fmt(null, 'brl'), '—'); assert.equal(C.fmt(NaN, 'usd'), '—');
  assert.match(C.quando(new Date(2026, 9, 4, 14, 2).getTime()), /^04\/10 14:02$/);
});
