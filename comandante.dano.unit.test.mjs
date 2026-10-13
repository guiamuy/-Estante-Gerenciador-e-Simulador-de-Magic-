// G-259 · relato #20 (parte 2): o dano de comandante à vista. O motor já soma o dano de combate de cada comandante
// (903.10a) e faz perder com 21 (704.6c); aqui, o que a mesa mostra a partir disso.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
import { setup } from './fixtures.mjs';
const { engine: E, table: T } = loadModules();
const J = x => JSON.parse(JSON.stringify(x));
const keepAll = s => { for (let p = 0; p < s.players.length; p++) s = E.apply(s, { t: 'keep', p, bottom: [] }).state; return s; };

test('G-259 · dano de comandante por comandante, do maior para o menor; fora do Commander, nada', () => {
  let s = keepAll(E.createGame(setup('commander')));
  const a = s.turn.active, b = 1 - a, cmdA = s.zones[a].command[0];
  assert.equal(T.LIMITE_COMANDANTE, 21);
  assert.deepEqual(J(T.danoDeComandante(s, b)), []); assert.equal(T.textoDoDanoDeComandante(s, b), null, 'sem dano, sem linha');
  s = E.apply(s, { t: 'commander_damage', p: a, target: b, source: cmdA, delta: 12 }).state;
  assert.deepEqual(J(T.danoDeComandante(s, b)), [{ oid: String(cmdA), nome: s.objects[cmdA].name, dano: 12 }]);
  assert.equal(T.textoDoDanoDeComandante(s, b), 'Comandante 12 de 21');
  assert.equal(T.textoDoDanoDeComandante(s, a), null, 'quem causou não leva');
  // dois comandantes (parceiros): o maior na linha, e quantos outros
  const s2 = J(s); s2.players[b].commanderDamage['x9'] = 5; s2.objects['x9'] = { name: 'Parceiro' };
  assert.deepEqual(J(T.danoDeComandante(s2, b).map(c => [c.nome, c.dano])), [[s.objects[cmdA].name, 12], ['Parceiro', 5]]);
  assert.equal(T.textoDoDanoDeComandante(s2, b), 'Comandante 12 de 21 (+1)');
  // com 21, o motor tira o jogador (o mesmo número que a mesa mostra)
  s = E.apply(s, { t: 'commander_damage', p: a, target: b, source: cmdA, delta: 9 }).state;
  assert.equal(s.players[b].lossReason, 'dano de comandante'); assert.equal(T.textoDoDanoDeComandante(s, b), 'Comandante 21 de 21');
  // fora do Commander: nada, mesmo com o campo preenchido
  const p = J(s); p.format = 'pauper';
  assert.deepEqual(J(T.danoDeComandante(p, b)), []); assert.equal(T.danoDeComandante(null, 0).length, 0);
});
