// I5 · histórico e estatísticas de partidas: registro, recorte e os números do painel.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
const { partidas: P, platform: PL } = loadModules();
const J = x => JSON.parse(JSON.stringify(x));
const DIA = 24 * 3600 * 1000, AGORA = 1_800_000_000_000;
const p = (id, diasAtras, resultado, tipo = 'shark', extra = {}) => ({ id, em: AGORA - diasAtras * DIA, formato: 'pauper', resultado, motivo: '', turnos: 8, duracao: 10 * 60000, comecou: true, vida: [20, 0],
  eu: { nome: 'Gui', lista: 'Boros', cores: 'RW' }, oponente: { tipo, nome: tipo === 'shark' ? 'Shark' : 'Goldfish' }, serie: null, ...extra });

test('I5 · registro: o mais novo primeiro, o mesmo id troca em vez de repetir, lixo fica de fora, teto de 500, remover', () => {
  let l = P.registra([], p('a', 3, 'vitoria')); l = P.registra(l, p('b', 1, 'derrota')); l = P.registra(l, p('c', 2, 'empate'));
  assert.deepEqual(J(l.map(x => x.id)), ['b', 'c', 'a']);
  l = P.registra(l, p('a', 0, 'derrota')); assert.deepEqual(J(l.map(x => x.id + ':' + x.resultado)), ['a:derrota', 'b:derrota', 'c:empate'], 'desfazer e terminar de novo troca o registro');
  assert.deepEqual(J(P.remove(l, 'b').map(x => x.id)), ['a', 'c']);
  assert.equal(P.normaliza([null, { id: 1 }, { id: 'x', resultado: 'ganhei', em: 1 }, { id: 'y', resultado: 'vitoria' }, p('ok', 1, 'vitoria')]).length, 1);
  assert.equal(P.normaliza('nada').length, 0);
  assert.equal(P.normaliza(Array.from({ length: 620 }, (_, i) => p('k' + i, i / 10, 'vitoria'))).length, P.LIMITE);
});

test('I5 · registro a partir da mesa: resultado do meu ponto de vista, tipo de oponente, motivo, série, quem começou e duração', () => {
  const s = { winner: 1, turn: { number: 9 }, players: [{ name: 'Gui', life: 0, lost: true, lossReason: 'vida' }, { name: 'Shark', life: 7, lost: false }] };
  const setup = { seed: 42, format: 'pauper', players: [{ name: 'Gui', deck: [] }, { name: 'Shark', deck: [] }] };
  const r = P.daMesa({ s, eu: 0, setup, options: { bot: { seat: 1 }, iniciada: AGORA - 12 * 60000, minhaLista: 'Boros Bully' }, serie: { jogo: 2, melhorDe: 3 }, agora: AGORA, cores: 'RW', primeiro: 1 });
  assert.deepEqual(J([r.resultado, r.oponente, r.motivo, r.turnos, r.vida, r.eu, r.serie, r.comecou, r.duracao, r.formato]),
    ['derrota', { tipo: 'shark', nome: 'Shark' }, 'vida a zero', 9, [0, 7], { nome: 'Gui', lista: 'Boros Bully', cores: 'RW' }, { jogo: 2, melhorDe: 3 }, false, 12 * 60000, 'pauper']);
  assert.equal(P.daMesa({ s, eu: 0, setup, options: {}, agora: AGORA, desistiu: true }).motivo, 'desistência', 'o motor diz "vida" na desistência; o registro diz o que foi');
  assert.equal(r.id, `${AGORA - 12 * 60000}-42-2`, 'o id junta início, semente e número do jogo');
  assert.equal(P.daMesa({ s, eu: 1, setup, options: { online: { codigo: 'ESTA-AAAA' } }, agora: AGORA }).resultado, 'vitoria', 'online, do assento 1');
  assert.equal(P.daMesa({ s, eu: 1, setup, options: { online: {} }, agora: AGORA }).oponente.tipo, 'online');
  assert.equal(P.daMesa({ s: { ...s, winner: null }, eu: 0, setup: { ...setup, players: [{ name: 'Gui' }, { name: 'Goldfish', dummy: true }] }, options: {}, agora: AGORA }).oponente.tipo, 'goldfish');
  const dois = P.daMesa({ s: { ...s, winner: null }, eu: 0, setup, options: { iniciada: AGORA - 9 * 3600 * 1000 }, agora: AGORA });
  assert.deepEqual(J([dois.resultado, dois.oponente.tipo, dois.duracao, dois.comecou, dois.serie]), ['empate', 'a-dois', null, null, null], 'partida deixada aberta por horas não conta duração');
});

test('I5 · estatísticas: totais e taxa, sequência atual e melhor, por oponente, por lista, quem começou, semanas, últimas e médias', () => {
  const l = [p('1', 0, 'vitoria'), p('2', 1, 'vitoria'), p('3', 2, 'derrota', 'shark', { comecou: false }), p('4', 3, 'vitoria', 'goldfish', { eu: { nome: 'Gui', lista: 'Elfos' }, turnos: 6 }),
    p('5', 9, 'vitoria', 'shark', { comecou: false }), p('6', 10, 'vitoria'), p('7', 11, 'vitoria'), p('8', 30, 'empate', 'goldfish', { duracao: null }), p('9', 70, 'derrota')];
  const e = P.estatisticas(l, { agora: AGORA });
  assert.deepEqual([e.total, e.v, e.d, e.e, e.taxa, e.todas], [9, 6, 2, 1, 67, 9]);
  assert.deepEqual(J(e.atual), { resultado: 'vitoria', n: 2 }); assert.equal(e.melhor, 4, 'quatro vitórias seguidas (7, 6, 5, 4)');
  assert.deepEqual(J(e.porOponente.map(o => [o.chave, o.total, o.v, o.taxa])), [['shark', 7, 5, 71], ['goldfish', 2, 1, 50]], 'na ordem fixa dos oponentes, só quem tem partida');
  assert.deepEqual(J(e.porLista.map(x => [x.rotulo, x.total, x.taxa])), [['Boros', 8, 63], ['Elfos', 1, 100]]);
  assert.deepEqual(J([e.comecando.primeiro.total, e.comecando.primeiro.taxa, e.comecando.segundo.total, e.comecando.segundo.taxa]), [7, 71, 2, 50]);
  assert.equal(e.porSemana.length, 8); assert.deepEqual(J(e.porSemana.map(x => x.total)), [0, 0, 0, 1, 0, 0, 3, 4], 'da mais antiga para a atual; a de 70 dias fica fora da régua');
  assert.equal(e.porSemana.at(-1).v, 3); assert.equal(e.porSemana.at(-1).ate, AGORA);
  assert.deepEqual(J(e.ultimas.map(u => u.id)), ['9', '8', '7', '6', '5', '4', '3', '2', '1'], 'da mais antiga para a mais nova');
  assert.equal(e.turnosMedios, 7.8); assert.equal(e.minutosMedios, 10);
  // recorte por oponente: os números mudam, a lista de oponentes continua inteira (é o filtro)
  const g = P.estatisticas(l, { tipo: 'goldfish', agora: AGORA });
  assert.deepEqual([g.total, g.v, g.e, g.taxa, g.todas], [2, 1, 1, 50, 9]); assert.equal(g.porOponente.length, 2); assert.deepEqual(J(g.atual), { resultado: 'vitoria', n: 1 }, 'empate quebra a sequência');
  // vazio
  const z = P.estatisticas([], { agora: AGORA });
  assert.deepEqual([z.total, z.taxa, z.melhor, z.atual.n, z.turnosMedios, z.minutosMedios, z.porOponente.length, z.ultimas.length], [0, 0, 0, 0, 0, null, 0, 0]);
});

test('I5 · serviço: registra, lista, remove, limpa e repõe (desfazer); fica na chave que vai no backup', async () => {
  const store = PL.memoryStore(); const sv = P.createPartidas({ store, agora: () => AGORA });
  await sv.registra(p('a', 1, 'vitoria')); await sv.registra(p('b', 0, 'derrota'));
  assert.deepEqual(J((await sv.lista()).map(x => x.id)), ['b', 'a']); assert.equal((await store.get('partidas.historico')).length, 2);
  await sv.remove('b'); assert.deepEqual(J((await sv.lista()).map(x => x.id)), ['a']);
  const antes = await sv.limpa(); assert.equal((await sv.lista()).length, 0); await sv.repoe(antes); assert.equal((await sv.lista()).length, 1);
  await store.set('partidas.historico', 'lixo'); assert.deepEqual(J(await sv.lista()), [], 'dado estragado não derruba a tela');
});
