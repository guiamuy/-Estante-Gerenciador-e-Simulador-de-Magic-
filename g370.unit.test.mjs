// Leva G-370 · relato do dono (09/11): na Vercel a conta não conectava e os relatos não saíam. Medido (10/11): a chave web do
// app recusa o endereço novo ("Requests from referer … are blocked", 403) — a tela dizia "Entrada recusada. Saia e entre de
// novo." e a renovação apagava a sessão guardada. E restaurar o backup (ou trazer pela ponte do endereço antigo) trocava os
// relatos deste aparelho pelos do arquivo. Agora: a causa aparece com o nome certo, a sessão fica, e as listas com id juntam.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
const { perfil: PF, platform: P, conta: C } = loadModules();
const js = v => JSON.parse(JSON.stringify(v));

const relato = (id, extra = {}) => ({ id, criadoEm: '2026-11-0' + (extra.dia || 5) + 'T10:00:00.000Z', tipo: 'erro', urgencia: 'alta', area: 'Coleção', descricao: 'texto ' + id, ...extra });

test('G-370 · relatos de dois aparelhos juntam por id: nada some, o mais adiantado fica', () => {
  const daqui = [relato('a'), relato('b', { enviadoEm: '2026-11-06T00:00:00Z', pelaFila: true }), relato('c', { descricao: 'versão daqui' })];
  const deFora = [relato('a', { registro: { numero: 91 }, enviadoEm: '2026-11-05T11:00:00Z' }), relato('b'), relato('c', { descricao: 'versão de fora' }), relato('d')];
  const r = PF.juntaPorId(daqui, deFora, 'relatos.itens');
  const por = Object.fromEntries(r.map(x => [x.id, x]));
  assert.deepEqual(Object.keys(por).sort(), ['a', 'b', 'c', 'd'], 'o que só existia de um lado continua');
  assert.equal(por.a.registro.numero, 91, 'registrado vence o guardado');
  assert.equal(por.b.pelaFila, true, 'na fila vence o guardado, venha de onde vier');
  assert.equal(por.c.descricao, 'versão daqui', 'empate: fica a deste aparelho');
  const editado = PF.juntaPorId([relato('e')], [relato('e', { editadoEm: '2026-11-07T00:00:00Z', descricao: 'corrigido' })], 'relatos.itens');
  assert.equal(editado[0].descricao, 'corrigido', 'mesmo passo: o editado por último');
  assert.equal(PF.listaComId([{ id: 'x' }]), true);
  assert.equal(PF.listaComId([]), false);
  assert.equal(PF.listaComId({ a: 1 }), false);
  assert.equal(PF.listaComId([{ nome: 'sem id' }]), false);
});

test('G-370 · restaurar o backup junta os relatos e as listas com id; preferência simples continua trocando', async () => {
  const store = P.memoryStore();
  const p = PF.createPerfil({ store, agora: () => Date.parse('2026-11-10T00:00:00Z') });
  await store.set('relatos.itens', [relato('vercel-1', { dia: 9 }), relato('ambos')]);
  await store.set('ui.theme', 'escuro');
  const n = await p.importaPreferencias({ 'relatos.itens': [relato('github-1', { dia: 4 }), relato('ambos', { registro: { numero: 77 }, enviadoEm: '2026-11-05T11:00:00Z' })], 'ui.theme': 'claro' });
  assert.equal(n, 2);
  const itens = js(await store.get('relatos.itens'));
  assert.deepEqual(itens.map(x => x.id).sort(), ['ambos', 'github-1', 'vercel-1'], 'antes: só os do arquivo ficavam (o vercel-1 sumia)');
  assert.equal(itens.find(x => x.id === 'ambos').registro.numero, 77);
  assert.equal(await store.get('ui.theme'), 'claro', 'preferência de escolha segue a do arquivo, como antes');
  // aparelho sem relatos: entra a lista do arquivo inteira
  const vazio = P.memoryStore(); const p2 = PF.createPerfil({ store: vazio });
  await p2.importaPreferencias({ 'relatos.itens': [relato('só-de-fora')] });
  assert.deepEqual(js(await vazio.get('relatos.itens')).map(x => x.id), ['só-de-fora']);
});

/** Firebase falso que responde como a chave do app responde a um endereço fora da lista dela. */
function chaveQueRecusaOEndereco() {
  const bloqueado = { error: { code: 403, message: 'Requests from referer https://estante-magic.vercel.app/ are blocked.', status: 'PERMISSION_DENIED',
    details: [{ '@type': 'type.googleapis.com/google.rpc.ErrorInfo', reason: 'API_KEY_HTTP_REFERRER_BLOCKED', domain: 'googleapis.com' }] } };
  const pedidos = [];
  return { pedidos, fetch: async (url) => { pedidos.push(String(url)); return { ok: false, status: 403, json: async () => bloqueado }; } };
}

test('G-370 · endereço que a chave do Google ainda não aceita: a tela diz isso, e a sessão guardada não é apagada', async () => {
  const g = chaveQueRecusaOEndereco();
  const s = C.createSessaoFirebase({ apiKey: 'k', fetch: g.fetch, origem: 'https://estante-magic.vercel.app' });
  await assert.rejects(() => s.entrar('token-do-google'), e => e.message === 'endereco-bloqueado');
  assert.match(C.motivoDe(new Error('endereco-bloqueado')), /endereço do app ainda não foi liberado/);
  assert.doesNotMatch(C.motivoDe(new Error('endereco-bloqueado')), /Saia e entre de novo/);
  // sessão guardada de antes: a renovação recusada pelo endereço não a apaga (antes: "firebase-recusou" e grava(null))
  const gravados = [];
  const s2 = C.createSessaoFirebase({ apiKey: 'k', fetch: g.fetch, guarda: d => { gravados.push(d); } });
  assert.equal(s2.retoma({ uid: 'uidAna_1', refreshToken: 'rt' }), true);
  await assert.rejects(() => s2.token(), e => e.message === 'endereco-bloqueado');
  assert.equal(s2.ativa(), true, 'a sessão continua: quando o endereço for liberado, ela volta sem entrar de novo');
  assert.deepEqual(gravados, [], 'nada foi apagado do aparelho');
  // outro 403 (não é o endereço) continua sendo recusa da entrada
  const outro = C.createSessaoFirebase({ apiKey: 'k', fetch: async () => ({ ok: false, status: 400, json: async () => ({ error: { message: 'INVALID_IDP_RESPONSE' } }) }) });
  await assert.rejects(() => outro.entrar('t'), e => e.message === 'firebase-recusou');
});
