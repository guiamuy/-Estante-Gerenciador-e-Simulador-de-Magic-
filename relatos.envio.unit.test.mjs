// T6e-2 · relato #13 · Enviar sem sair do app: com a conta conectada e a fila ligada, o relato vai para a fila do Firebase.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
const { relatos: R, remoto: RM, online: O } = loadModules();
const J = x => JSON.parse(JSON.stringify(x));
const RELATO = { id: 'rmvENVIO1', criadoEm: '2026-10-12T19:00:00.000Z', tipo: 'erro', urgencia: 'alta', descricao: 'A carta fez errado na pilha.', area: 'Mesa', rota: '/partida', endereco: '/partida',
  tela: null, contexto: { motor: 110, partida: { modo: 'contra o Shark', turno: 4, etapa: 'Combate' } }, partida: { kind: 'estante.match', estado: 'x'.repeat(40000) }, status: 'aberto', enviadoEm: null };

test('T6e-2 · aviso de fila ligada: só o formato do fluxo vale', () => {
  assert.equal(R.filaLigada({ versao: 1, ligada: true, desde: '2026-10-12T20:00:00.000Z' }), true);
  for (const ruim of [null, {}, { versao: 2, ligada: true, desde: '2026-10-12T20:00:00Z' }, { versao: 1, ligada: 'sim', desde: '2026-10-12T20:00:00Z' }, { versao: 1, ligada: true, desde: 'ontem' }, { versao: 1, ligada: true }])
    assert.equal(R.filaLigada(ruim), false, JSON.stringify(ruim));
  assert.match(R.URL_FILA_LIGADA, /^https:\/\/raw\.githubusercontent\.com\/guiamuy\/-Estante-Gerenciador-e-Simulador-de-Magic-\/relatos\/fila\.json$/);
});

test('T6e-2 · o que vai para a fila: sem a partida inteira e sem o que só o aparelho sabe; cabe no limite da fila', () => {
  const r = R.relatoParaFila({ ...RELATO, registro: { numero: 3 }, enviadoEm: 'x', pelaFila: true, resolvidoPeloRegistro: 'y' });
  assert.equal(r.partida, null); assert.equal('registro' in r || 'enviadoEm' in r || 'pelaFila' in r || 'resolvidoPeloRegistro' in r, false);
  assert.deepEqual(J(r.contexto.partida), RELATO.contexto.partida, 'o resumo da partida vai (vai pelo GitHub também)');
  assert.ok(JSON.stringify(r).length < RM.RELATO_MAX, 'sem a partida anexada, cabe nos 24 KB');
  assert.equal(RELATO.partida.kind, 'estante.match', 'não mexe no relato guardado');
});

test('T6e-2 · disponível só com a conta da fila e a fila ligada; a resposta fica 10 minutos na memória; sem rede, não', async () => {
  let t = 1e12, pedidos = 0, resposta = { versao: 1, ligada: true, desde: '2026-10-12T20:00:00.000Z' }, cai = false, conta = true;
  const busca = async url => { pedidos++; assert.equal(url, R.URL_FILA_LIGADA); if (cai) throw new Error('rede'); return resposta ? { ok: true, json: async () => resposta } : { ok: false, status: 404 }; };
  const filaFalsa = { enfileira: async () => ({ conferido: true, enviadoEm: 'agora' }) };
  const E = R.createEnvioPelaFila({ filaDe: () => (conta ? filaFalsa : null), busca, agora: () => t });
  assert.equal(await E.disponivel(), true); assert.equal(pedidos, 1);
  t += 60000; assert.equal(await E.disponivel(), true); assert.equal(pedidos, 1, 'dentro de 10 minutos não pergunta de novo');
  conta = false; assert.equal(await E.disponivel(), false); assert.equal(pedidos, 1, 'sem conta nem pergunta');
  conta = true; t += R.FILA_MEMORIA_MS; resposta = null; assert.equal(await E.disponivel(), false); assert.equal(pedidos, 2, 'fila ainda não ligada (404)');
  t += R.FILA_MEMORIA_MS; cai = true; assert.equal(await E.disponivel(), false, 'sem rede: o GitHub também não abriria');
  const F2 = R.createEnvioPelaFila({ filaDe: () => filaFalsa, busca: null }); assert.equal(await F2.disponivel(), false);
});

test('T6e-2 · enviar: põe na fila da conta e confere; sem rede, relato grande e falha dizem o motivo; o mesmo relato duas vezes é um nó só', async () => {
  const banco = O.transporteMemoria();
  const E = R.createEnvioPelaFila({ filaDe: () => RM.createFilaDeRelatos({ transporte: banco, uid: 'uidA', agora: () => Date.parse('2026-10-12T20:00:00Z') }), busca: async () => ({ ok: true, json: async () => ({}) }) });
  const r = await E.envia(RELATO);
  assert.deepEqual(J(r), { ok: true, enviadoEm: '2026-10-12T20:00:00.000Z' });
  const no = await banco.ler('relatos/fila/uidA/rmvENVIO1');
  const volta = RM.relatoDaFila(no); assert.equal(volta.descricao, RELATO.descricao); assert.equal(volta.partida, null);
  assert.deepEqual(J(await E.envia(RELATO)), { ok: true, enviadoEm: '2026-10-12T20:00:00.000Z' }); assert.deepEqual(J(Object.keys(await banco.ler('relatos/fila/uidA'))), ['rmvENVIO1']);
  banco._rede(false); assert.deepEqual(J(await E.envia(RELATO)), { ok: false, motivo: 'sem-rede' }); banco._rede(true);
  assert.deepEqual(J(await E.envia({ ...RELATO, id: 'rmvGRANDE', descricao: 'x'.repeat(RM.RELATO_MAX) })), { ok: false, motivo: 'grande' });
  const surdo = R.createEnvioPelaFila({ filaDe: () => ({ enfileira: async () => ({ conferido: false }) }) });
  assert.deepEqual(J(await surdo.envia(RELATO)), { ok: false, motivo: 'erro' }, '"enviado" só depois de ler de volta');
  assert.deepEqual(J(await R.createEnvioPelaFila({ filaDe: () => null }).envia(RELATO)), { ok: false, motivo: 'sem-conta' });
  assert.deepEqual(J(await R.createEnvioPelaFila({ filaDe: () => ({ enfileira: async () => { throw new Error('api'); } }) }).envia(RELATO)), { ok: false, motivo: 'erro' });
});
