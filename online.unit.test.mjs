// Leva 130 · U14 · partida online: código, transporte, sala e sincronização de duas mesas pelo registro de ações.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
import { CARDS, PAUPER_DECK } from './fixtures.mjs';
const { online: O, table: T } = loadModules();
const J = x => JSON.parse(JSON.stringify(x));
const tique = () => new Promise(r => setTimeout(r, 0));
const deck = { entries: PAUPER_DECK };
const setupDe = seed => T.buildSetup({ format: 'pauper', seed, cards: CARDS, seats: [{ name: 'Ana', deck }, { name: 'Bia', deck }], mode: 'assisted' });
const criaMesa = setup => T.createTable(setup, { options: { autoPass: true } });

test('Leva 130 · código de sala: ESTA-XXXX sem letras ambíguas; o digitado é normalizado (minúsculas, espaço, 0/1)', () => {
  let n = 0; const cod = O.gerarCodigo(() => (n++ % 7) / 7);
  assert.match(cod, /^ESTA-[A-HJ-NP-Z2-9]{4}$/);
  assert.equal(O.normalizaCodigo(' esta-4k7q '), 'ESTA-4K7Q');
  assert.equal(O.normalizaCodigo('4k7q'), 'ESTA-4K7Q', 'o prefixo é opcional');
  assert.equal(O.normalizaCodigo('ESTA-4K7'), null, 'curto demais');
  assert.equal(O.normalizaCodigo('ESTA-4K7Q9'), null);
  assert.equal(O.normalizaCodigo(''), null);
});

test('Leva 130 · transporte em memória: ler, escrever, atualizar, empurrar em ordem e ouvir recebe o nó inteiro', async () => {
  let t0 = 1000; const tr = O.transporteMemoria({ agora: () => t0 });
  assert.equal(await tr.ler('salas/X'), null);
  await tr.escrever('salas/X', { estado: 'esperando', anfitriao: { nome: 'Ana' } });
  await tr.atualizar('salas/X', { estado: 'pronta', convidado: { nome: 'Bia' } });
  assert.deepEqual(J(await tr.ler('salas/X')), { estado: 'pronta', anfitriao: { nome: 'Ana' }, convidado: { nome: 'Bia' } });
  const k1 = await tr.empurrar('salas/X/acoes', { n: 1 }); t0 = 1001; const k2 = await tr.empurrar('salas/X/acoes', { n: 2 });
  assert.ok(k1 < k2, 'chaves crescem com o tempo');
  const vistos = []; const parar = tr.ouvir('salas/X', v => vistos.push(v && v.estado));
  await tique(); assert.deepEqual(vistos, ['pronta'], 'ouvir entrega o estado atual na hora');
  await tr.atualizar('salas/X', { estado: 'jogando' }); assert.deepEqual(vistos, ['pronta', 'jogando']);
  parar(); await tr.atualizar('salas/X', { estado: 'encerrada' }); assert.equal(vistos.length, 2, 'depois de parar, nada chega');
  tr._rede(false); await assert.rejects(tr.ler('salas/X'), /sem-rede/); tr._rede(true);
});

test('Leva 130 · transporte local (storage + canal): duas "abas" veem o mesmo e se avisam', async () => {
  const mem = new Map();
  const storage = { get length() { return mem.size; }, key: i => [...mem.keys()][i], getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) };
  const ouvintesA = [], ouvintesB = [];
  const canalA = { postMessage: m => ouvintesB.forEach(f => f({ data: m })), addEventListener: (_, f) => ouvintesA.push(f) };
  const canalB = { postMessage: m => ouvintesA.forEach(f => f({ data: m })), addEventListener: (_, f) => ouvintesB.push(f) };
  const a = O.transporteLocal({ storage, canal: canalA }), b = O.transporteLocal({ storage, canal: canalB });
  const vistosB = []; b.ouvir('salas/Z', v => vistosB.push(v)); await tique();
  await a.escrever('salas/Z', { estado: 'esperando' });
  assert.deepEqual(J(vistosB.at(-1)), { estado: 'esperando' }, 'a aba B foi avisada pelo canal');
  await a.empurrar('salas/Z/acoes', { antes: 0 });
  assert.equal(Object.keys((await b.ler('salas/Z')).acoes).length, 1);
});

test('Leva 130 · sala: criar, entrar (erros com nome), publicar setup, ações em ordem e encerrar', async () => {
  let t0 = 10_000; const tr = O.transporteMemoria({ agora: () => t0 });
  let n = 0; const sala = O.createSala({ transporte: tr, agora: () => t0, aleatorio: () => (n++ % 5) / 5 });
  const codigo = await sala.criar({ nome: 'Ana', deck: PAUPER_DECK, formato: 'pauper' });
  assert.match(codigo, /^ESTA-/);
  assert.equal((await sala.ler(codigo)).estado, 'esperando');
  await assert.rejects(sala.entrar('ESTA-ZZZZ', { nome: 'Bia', deck: PAUPER_DECK, formato: 'pauper' }), /sala-inexistente/);
  await assert.rejects(sala.entrar('abc', { nome: 'Bia', deck: PAUPER_DECK }), /codigo-invalido/);
  await assert.rejects(sala.entrar(codigo, { nome: 'Bia', deck: PAUPER_DECK, formato: 'commander' }), /formato-diferente/);
  await sala.entrar(codigo.toLowerCase(), { nome: 'Bia', deck: PAUPER_DECK, formato: 'pauper' });
  assert.equal((await sala.ler(codigo)).estado, 'pronta');
  await assert.rejects(sala.entrar(codigo, { nome: 'Caio', deck: PAUPER_DECK, formato: 'pauper' }), /sala-cheia/);
  await sala.publicarSetup(codigo, { seed: 7 });
  assert.equal((await sala.ler(codigo)).estado, 'jogando');
  await sala.enviarAcao(codigo, { antes: 0, p: 0, action: { t: 'keep', p: 0 }, de: 0 }); t0++;
  await sala.enviarAcao(codigo, { antes: 1, p: 1, action: { t: 'keep', p: 1 }, de: 1 });
  const vistos = []; sala.ouvir(codigo, d => vistos.push(d)); await tique();
  assert.deepEqual(J(vistos.at(-1).acoes.map(a => a.antes)), [0, 1], "ações ordenadas pela chave");
  await sala.encerrar(codigo, 'desistiu');
  assert.equal((await sala.ler(codigo)).estado, 'encerrada');
  t0 += O.VALIDADE_MS + 1;
  await assert.rejects(sala.entrar(codigo, { nome: 'Dani', deck: PAUPER_DECK, formato: 'pauper' }), /sala-velha/);
  // sala criada com código já ocupado: sorteia outro
  const c2 = await sala.criar({ nome: 'Eva', deck: PAUPER_DECK, formato: 'pauper' }); assert.notEqual(c2, codigo);
});

/** Dois aparelhos na mesma sala, cada um com a própria mesa. */
async function doisLados() {
  let t0 = 50_000; const tr = O.transporteMemoria({ agora: () => t0++ });
  const sala = O.createSala({ transporte: tr, agora: () => t0 });
  const codigo = await sala.criar({ nome: 'Ana', deck: PAUPER_DECK, formato: 'pauper' });
  await sala.entrar(codigo, { nome: 'Bia', deck: PAUPER_DECK, formato: 'pauper' });
  const setup = setupDe(11); await sala.publicarSetup(codigo, setup);
  const mudancas = { 0: [], 1: [] };
  const lado = assento => { const s = O.criaSincronizador({ sala, codigo, setup, assento, criaMesa, aoMudar: (m, motivo) => mudancas[assento].push(motivo), aoErro: e => mudancas[assento].push('erro:' + e.message) }); s.ligar(); return s; };
  const A = lado(0), B = lado(1); await tique();
  return { tr, sala, codigo, setup, A, B, mudancas };
}
const mesmoEstado = (A, B) => { assert.equal(A.mesa.log.length, B.mesa.log.length, 'registros do mesmo tamanho'); assert.deepEqual(J(A.mesa.state), J(B.mesa.state), 'o mesmo estado nos dois aparelhos'); };

test('Leva 130 · duas mesas convergem: cada lado só age pelo próprio assento e a outra recebe pela sala', async () => {
  const { A, B, mudancas } = await doisLados();
  assert.equal(A.mesa.state.status, 'mulligan');
  await assert.rejects(A.agir({ t: 'keep', p: 1, bottom: [] }), /nao-e-seu-assento/, 'não dá para agir pelo outro');
  await A.agir({ t: 'keep', p: 0, bottom: [] }); await tique();
  mesmoEstado(A, B);
  assert.ok(mudancas[1].includes('remota'), 'B foi avisado de uma ação remota');
  await B.agir({ t: 'keep', p: 1, bottom: [] }); await tique();
  mesmoEstado(A, B); assert.equal(A.mesa.state.status, 'playing');
  // alguns passes de prioridade de quem a tem
  for (let i = 0; i < 6; i++) { const s = A.mesa.state; if (s.status !== 'playing' || s.pending) break; const quem = s.turn.priority; await (quem === 0 ? A : B).agir({ t: 'pass', p: quem }); await tique(); mesmoEstado(A, B); }
  assert.deepEqual([A.estado().pendentes, B.estado().pendentes, A.estado().reconstrucoes, B.estado().reconstrucoes], [0, 0, 0, 0], 'sem pendência e sem reconstrução no caminho feliz');
});

test('Leva 130 · quem chega depois (ou volta de uma queda) reconstrói a mesa pela lista da sala', async () => {
  const { sala, codigo, setup, A, B } = await doisLados();
  await A.agir({ t: 'keep', p: 0, bottom: [] }); await tique(); await B.agir({ t: 'keep', p: 1, bottom: [] }); await tique();
  // um terceiro aparelho do jogador 1 (voltou depois de fechar o app) começa do zero e alcança
  const C = O.criaSincronizador({ sala, codigo, setup, assento: 1, criaMesa }); C.ligar(); await tique();
  mesmoEstado(A, C); assert.equal(C.estado().reconstrucoes, 0, 'alcançar aplicando em ordem não é reconstrução');
  // queda: B perde uma ação (não ouviu), depois recebe a lista inteira → percebe e reconstrói
  B.parar();
  const quem = A.mesa.state.turn.priority; await (quem === 0 ? A : C).agir({ t: 'pass', p: quem }); await tique();
  assert.notEqual(B.mesa.log.length, A.mesa.log.length, 'B ficou para trás');
  B.ligar(); await tique();
  mesmoEstado(A, B);
});

test('Leva 130 · ação local atropelada por uma remota: a ordem da sala vence e a mesa é reconstruída, sem ação perdida', async () => {
  const { A, B, mudancas } = await doisLados();
  // os dois mandam o keep "ao mesmo tempo": cada um aplicou o seu antes de ver o do outro
  const pa = A.agir({ t: 'keep', p: 0, bottom: [] }); const pb = B.agir({ t: 'keep', p: 1, bottom: [] });
  await Promise.all([pa, pb]); await tique(); await tique();
  mesmoEstado(A, B);
  assert.equal(A.mesa.state.status, 'playing', 'as duas decisões entraram');
  assert.ok(A.estado().reconstrucoes + B.estado().reconstrucoes >= 1, 'pelo menos um lado refez pela ordem da sala');
  assert.ok(!mudancas[0].some(m => m.startsWith('erro')) && !mudancas[1].some(m => m.startsWith('erro')));
});

test('Leva 130 · sem rede, a jogada não valeu: a mesa volta ao que a sala tem e a tela é avisada', async () => {
  const { tr, A, B, mudancas } = await doisLados();
  tr._rede(false);
  await A.agir({ t: 'keep', p: 0, bottom: [] });
  // não chegou à sala: a mesa de A volta ao que a sala tem (a jogada não valeu) e a tela ouve o motivo
  assert.equal(A.estado().pendentes, 0); assert.equal(A.mesa.state.players[0].kept, false);
  assert.ok(mudancas[0].includes('erro:nao-enviada') && mudancas[0].includes('reconstruida'));
  assert.equal(B.mesa.state.players[0].kept, false, 'B não viu nada');
  tr._rede(true); await tique();
  await A.agir({ t: 'keep', p: 0, bottom: [] }); await tique();
  mesmoEstado(A, B);
});
