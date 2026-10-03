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
  // Leva 121 · expectativa ajustada com justificativa: a faixa passou a dizer "Turno Ana" (duas palavras, a pedido do
  // usuário: "Turno de Shark" com o selo de prioridade saía cortado no aparelho)
  assert.equal(outro.rotulo, 'Turno Ana'); assert.equal(outro.meuTurno, false);
});

test('Leva 121 · faixa em duas palavras com o ícone de quem joga; o resto vai nos detalhes', () => {
  const shark = T.vezDaMesa(mesa({ turn: { number: 5, active: 1, priority: 0, step: 'combat_attackers' } }), 0, { bot: 1 });
  assert.equal(shark.rotulo, 'Turno Shark'); assert.equal(shark.icone, 'tubarao', 'o bot é a barbatana do design system');
  assert.ok(shark.rotulo.split(' ').length <= 2, 'duas palavras');
  assert.deepEqual(J(shark.detalhes), [
    { k: 'turno', rotulo: 'Turno', valor: '5' }, { k: 'etapa', rotulo: 'Etapa', valor: 'Declarar atacantes' },
    { k: 'joga', rotulo: 'Joga', valor: 'Shark' }, { k: 'prioridade', rotulo: 'Prioridade', valor: 'Você' }]);
  const eu = T.vezDaMesa(mesa({ turn: { number: 6, active: 0, priority: 0, step: 'main1' } }), 0, { bot: 1 });
  assert.equal(eu.rotulo, 'Seu turno'); assert.equal(eu.icone, null, 'no seu turno fica a inicial');
  assert.equal(eu.detalhes.find(d => d.k === 'joga').valor, 'Você');
  // sem bot (a dois), ninguém vira barbatana; decisão pendente troca "Prioridade" por "Decide"
  const dois = T.vezDaMesa(mesa({ turn: { number: 3, active: 0, priority: 0, step: 'combat_blockers' }, pending: { kind: 'blockers', p: 1 } }), 0);
  assert.equal(dois.icone, null);
  assert.deepEqual(J(dois.detalhes.find(d => d.k === 'prioridade')), { k: 'prioridade', rotulo: 'Decide', valor: 'Shark' });
  // mão inicial e fim de partida não têm detalhes (a faixa não abre balão vazio)
  assert.deepEqual(J(T.vezDaMesa(mesa({ status: 'mulligan' }), 0).detalhes), []);
  assert.equal(T.vezDaMesa(mesa({ status: 'mulligan' }), 0).icone, 'mao');
  assert.deepEqual(J(T.vezDaMesa(mesa({ status: 'over', winner: 1 }), 0, { bot: 1 }).detalhes), []);
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
  assert.equal(T.vezDaMesa(s, 0).rotulo, 'Turno Jogador 2'); // Leva 121 · sem o "de" (ver acima)
  assert.deepEqual(J(Object.keys(T.vezDaMesa(s, 0))).sort(), ['detalhes', 'fase', 'icone', 'inicial', 'meuTurno', 'minhaPrioridade', 'prioridadeDe', 'prioridadeRotulo', 'rotulo', 'turno', 'turnoDe'].sort()); // Leva 121 · + icone e detalhes
});

test('Leva 121 · em série, o placar é o primeiro detalhe em qualquer fase (saiu da linha da faixa)', () => {
  const serie = { melhorDe: 3, jogo: 2, vitorias: [1, 0] };
  const linha = { k: 'serie', rotulo: 'Série', valor: 'Partida 2 de 3 · Ana 1–0 Shark' };
  assert.deepEqual(J(T.vezDaMesa(mesa({ turn: { number: 1, active: 0, priority: 0, step: 'main1' } }), 0, { serie }).detalhes[0]), linha);
  assert.deepEqual(J(T.vezDaMesa(mesa({ status: 'mulligan' }), 0, { serie }).detalhes), [linha]);
  assert.deepEqual(J(T.vezDaMesa(mesa({ status: 'over', winner: 0 }), 0, { serie }).detalhes), [linha]);
  assert.equal(T.vezDaMesa(mesa(), 0, { serie: { melhorDe: 1, jogo: 1, vitorias: [0, 0] } }).detalhes.some(d => d.k === 'serie'), false, 'partida única não tem placar');
});
