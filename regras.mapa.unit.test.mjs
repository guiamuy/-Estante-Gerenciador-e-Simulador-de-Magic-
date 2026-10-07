// Épico CR · o mapa regra × motor (.regras/mapa.json) não pode ficar para trás do índice das Comprehensive Rules, e não pode
// afirmar cobertura sem evidência. Quando um item muda de status numa leva, o teste que prova a mudança entra em `testes`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { STATUS, faseDe, conta } from './.regras/medir.mjs';
const L = n => JSON.parse(readFileSync(new URL('./.regras/' + n, import.meta.url), 'utf8'));
const indice = L('indice.json'), mapa = L('mapa.json');

test('CR · o mapa classifica todos os itens numerados das Comprehensive Rules, uma vez cada', () => {
  const esperados = indice.regras.flatMap(r => r.itens.map(x => x.n));
  assert.ok(esperados.length > 1100, 'índice carregado: ' + esperados.length);
  assert.deepEqual(mapa.itens.map(i => i.n), esperados);
  assert.deepEqual(mapa.itens.filter(i => !STATUS.includes(i.status)).map(i => i.n), [], 'status válido em todos');
});

test('CR · quem diz "coberta" ou "parcial" mostra a evidência; quem não está coberto diz o que falta', () => {
  assert.deepEqual(mapa.itens.filter(i => ['coberta', 'parcial'].includes(i.status) && !(i.evidencia || '').trim()).map(i => i.n), [], 'sem evidência');
  assert.deepEqual(mapa.itens.filter(i => ['parcial', 'ausente', 'fora'].includes(i.status) && !(i.falta || '').trim()).map(i => i.n), [], 'sem dizer o que falta');
  assert.deepEqual(mapa.itens.filter(i => ['parcial', 'ausente'].includes(i.status) && !['P', 'M', 'G'].includes(i.esforco)).map(i => i.n), [], 'sem tamanho estimado');
});

test('CR · toda regra cai numa fase do épico, e teste que cita "CR NNN.N" cita item que existe', () => {
  for (const i of mapa.itens) assert.match(faseDe(i.n), /^CR\d/);
  const nums = new Set(mapa.itens.map(i => i.n));
  const citados = readdirSync(new URL('.', import.meta.url)).filter(f => f.endsWith('.test.mjs')).flatMap(f => [...readFileSync(new URL('./' + f, import.meta.url), 'utf8').matchAll(/test\('CR (\d{3}\.\d+)/g)].map(m => [f, m[1]]));
  assert.deepEqual(citados.filter(([, n]) => !nums.has(n)), []);
  // todo item com `testes` aponta para um título de teste que existe
  const titulos = new Set(readdirSync(new URL('.', import.meta.url)).filter(f => f.endsWith('.test.mjs')).flatMap(f => [...readFileSync(new URL('./' + f, import.meta.url), 'utf8').matchAll(/test\('([^']+)'/g)].map(m => m[1])));
  assert.deepEqual(mapa.itens.flatMap(i => (i.testes || []).filter(t => !titulos.has(t)).map(t => i.n + ': ' + t)), []);
});

test('CR · o retrato da auditoria de 06/10/2026 (motor v72) é a linha de base: a cobertura só pode subir', () => {
  const c = conta(mapa.itens);
  assert.ok(c.coberta >= 212, 'itens cobertos: ' + c.coberta); assert.ok(c.ausente <= 468, 'itens ausentes: ' + c.ausente); // piso sobe a cada leva do épico (CR2a.3: 212 / 468)
});
