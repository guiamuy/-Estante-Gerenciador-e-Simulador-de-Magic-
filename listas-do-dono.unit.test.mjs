// G-262 · relato #17: o arquivo das listas do dono importa as nove como listas comuns, sem mexer na coleção, sem duplicar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
import { backupDasListas } from './listas-do-dono.mjs';
const M = loadModules();
const { platform: P, decks: D, starter: ST } = M;

test('G-262 · o backup das listas do dono: nove listas, ids fixos, sem coleção; importar duas vezes não duplica nem mexe na coleção', async () => {
  const b = backupDasListas(M);
  assert.equal(b.kind, 'estante.backup'); assert.equal(b.version, 2); assert.equal('items' in b || 'owned' in b, false, 'sem coleção');
  assert.equal(b.decks.length, ST.STARTER_DECKS.length); assert.equal(new Set(b.decks.map(d => d.id)).size, b.decks.length);
  assert.ok(b.decks.every(d => /^guilherme-[a-z0-9-]+$/.test(d.id) && d.entries.length && d.name && d.format));
  const store = P.memoryStore(), decks = D.createDeckStore({ store }), colecao = D.createCollection({ store });
  await colecao.set('Sol Ring', 2);
  await decks.save({ name: 'Minha lista', format: 'pauper', entries: [{ name: 'Island', qty: 20, zone: 'main' }] });
  const texto = JSON.stringify(b);
  assert.equal((await decks.importAll(texto, colecao)).decks, 9); assert.equal((await decks.importAll(texto, colecao)).decks, 9);
  const todas = await decks.list();
  assert.equal(todas.length, 10, 'a lista de antes fica e as nove entram uma vez');
  assert.equal(await colecao.qty('Sol Ring'), 2, 'a coleção não muda');
  const elves = todas.find(d => d.name === 'Pauper Elves');
  assert.equal(elves.entries.filter(e => e.zone !== 'side').reduce((n, e) => n + e.qty, 0), 60); assert.equal(elves.entries.filter(e => e.zone === 'side').reduce((n, e) => n + e.qty, 0), 15);
});
