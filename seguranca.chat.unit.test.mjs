// P-12 · silenciar a conversa da partida online: só as minhas aparecem, as do outro viram contagem; nada sai da sala.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
const { online: O } = loadModules();

test('P-12 · conversa silenciada mostra só as minhas e conta as escondidas; sem silêncio, tudo como antes', () => {
  const sala = { mensagens: { a: { de: 1, texto: 'oi', em: 1 }, b: { de: 0, texto: 'olá', em: 2 }, c: { de: 1, texto: '<b>x</b>', em: 3 } } };
  const ms = O.mensagensDe(sala, 0);
  const sil = O.visiveisDaConversa(ms, true);
  assert.equal(JSON.stringify(sil.lista.map(m => m.texto)), JSON.stringify(['olá']));
  assert.equal(sil.escondidas, 2);
  const tudo = O.visiveisDaConversa(ms, false);
  assert.equal(tudo.lista.length, 3); assert.equal(tudo.escondidas, 0);
});
