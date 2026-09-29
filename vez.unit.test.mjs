// U7 · de quem é a vez: turno e prioridade vistos por quem segura o aparelho.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
const { table: T } = loadModules();
const J = x => JSON.parse(JSON.stringify(x));
const mesa = (extra = {}) => ({ status: 'playing', pending: null, players: [{ name: 'Ana' }, { name: 'Shark' }],
  turn: { number: 3, active: 0, priority: 0 }, ...extra });

test('U7 · seu turno e turno do outro, com inicial do nome', () => {
  const eu = T.vezDaMesa(mesa(), 0);
  assert.equal(eu.rotulo, 'Seu turno'); assert.equal(eu.meuTurno, true); assert.equal(eu.inicial, 'A'); assert.equal(eu.turno, 3);
  assert.equal(eu.prioridadeRotulo, null, 'prioridade com quem joga: nada a mais para dizer');
  const outro = T.vezDaMesa(mesa(), 1);
  assert.equal(outro.rotulo, 'Turno de Ana'); assert.equal(outro.meuTurno, false);
});

test('U7 · prioridade separada do turno: no seu turno o oponente responde, e vice-versa', () => {
  const s = mesa({ turn: { number: 3, active: 0, priority: 1 } });
  assert.equal(T.vezDaMesa(s, 0).prioridadeRotulo, 'Shark responde');
  assert.equal(T.vezDaMesa(s, 1).prioridadeRotulo, 'você responde');
  assert.equal(T.vezDaMesa(s, 1).minhaPrioridade, true);
  // decisão pendente (bloqueio) conta como a vez de quem decide
  const bloq = mesa({ turn: { number: 3, active: 0, priority: 0 }, pending: { kind: 'blockers', p: 1 } });
  assert.equal(T.vezDaMesa(bloq, 0).prioridadeRotulo, 'Shark responde');
});

test('U7 · mão inicial e fim de partida têm rótulo próprio', () => {
  assert.equal(T.vezDaMesa(mesa({ status: 'mulligan' }), 0).rotulo, 'Mão inicial');
  assert.equal(T.vezDaMesa(mesa({ status: 'over', winner: 0 }), 0).rotulo, 'Você venceu');
  assert.equal(T.vezDaMesa(mesa({ status: 'over', winner: 0 }), 1).rotulo, 'Ana venceu');
  assert.equal(T.vezDaMesa(mesa({ status: 'over', winner: null }), 1).rotulo, 'Empate');
});

test('U7 · jogador sem nome não quebra', () => {
  const s = mesa({ players: [{}, {}], turn: { number: 1, active: 1, priority: 1 } });
  assert.equal(T.vezDaMesa(s, 0).rotulo, 'Turno de Jogador 2');
  assert.deepEqual(J(Object.keys(T.vezDaMesa(s, 0))).sort(), ['fase', 'inicial', 'meuTurno', 'minhaPrioridade', 'prioridadeDe', 'prioridadeRotulo', 'rotulo', 'turno', 'turnoDe'].sort());
});
