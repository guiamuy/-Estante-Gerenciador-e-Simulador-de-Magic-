// I-289 · T6e (relato #13) · relato enviado de dentro do app: a fila do Firebase vira registro no GitHub. Sem rede: a chave
// da conta de serviço é gerada aqui, o banco e o GitHub são de mentira e conferem o que recebem.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, createVerify } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { loadModules, HTML } from './_load.mjs';
import * as F from './relatos-fila.mjs';
import * as T from './relatos-tabela.mjs';
const M = loadModules(), R = M.relatos, RM = M.remoto;
const J = x => JSON.parse(JSON.stringify(x));
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
const CONTA = { type: 'service_account', project_id: 'estante-teste', client_email: 'robo@estante-teste.iam.gserviceaccount.com', private_key: privateKey, token_uri: 'https://oauth2.googleapis.com/token' };
const AGORA = Date.parse('2026-10-12T20:00:00Z');
const relato = (id, extra = {}) => ({ id, criadoEm: '2026-10-12T19:00:00.000Z', tipo: 'erro', urgencia: 'alta', descricao: 'A carta fez errado na pilha.', area: 'Mesa', rota: '/partida', endereco: '/partida',
  tela: { titulo: 'Mesa', cabecalho: 'Mesa', dialogo: '', rolagem: 10 }, contexto: { app: '2026-10-12 18:00 UTC', motor: 110, tema: 'escuro', tela: '360×780', online: true }, partida: null, status: 'aberto', ...extra });
const no = (r, enviadoEm = '2026-10-12T19:00:01.000Z') => ({ kind: 'estante.relato', version: 1, enviadoEm, dado: JSON.stringify(r) });

/** Banco e GitHub de mentira, num fetch só. Guarda os pedidos para o teste conferir. */
function mundo({ fila = {}, issues = [], falhaCriar = () => false } = {}) {
  const pedidos = [], db = { relatos: { fila: J(fila) } }; let n = 100;
  const busca = async (url, init = {}) => {
    const u = new URL(url), metodo = init.method || 'GET'; pedidos.push({ metodo, url: u.origin + u.pathname, q: Object.fromEntries(u.searchParams), corpo: init.body });
    if (u.hostname === 'oauth2.googleapis.com') {
      const p = new URLSearchParams(init.body); const [c, b, s] = p.get('assertion').split('.');
      const ok = createVerify('RSA-SHA256').update(`${c}.${b}`).verify(publicKey, Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64'));
      return ok && p.get('grant_type') === 'urn:ietf:params:oauth:grant-type:jwt-bearer' ? { ok: true, status: 200, json: async () => ({ access_token: 'tok-admin', expires_in: 3600 }) } : { ok: false, status: 400, json: async () => ({}) };
    }
    if (u.hostname.endsWith('firebaseio.com')) {
      if (u.searchParams.get('access_token') !== 'tok-admin') return { ok: false, status: 401, text: async () => '' };
      const seg = u.pathname.replace(/\.json$/, '').split('/').filter(Boolean);
      if (metodo === 'DELETE') { let o = db; for (const k of seg.slice(0, -1)) o = o && o[k]; if (o) delete o[seg[seg.length - 1]]; return { ok: true, status: 200, text: async () => 'null' }; }
      let o = db; for (const k of seg) o = o == null ? null : o[k];
      return { ok: true, status: 200, text: async () => JSON.stringify(o === undefined ? null : o) };
    }
    if (u.hostname === 'api.github.com') {
      assert.equal(init.headers.Authorization, 'Bearer tok-github');
      if (metodo === 'POST' && u.pathname.endsWith('/issues')) { if (falhaCriar()) return { ok: false, status: 502, json: async () => ({}) }; const b = JSON.parse(init.body); const i = { number: ++n, ...b, labels: b.labels.map(name => ({ name })), user: { login: 'github-actions[bot]', type: 'Bot' }, author_association: 'NONE', state: 'open' }; issues.push(i); return { ok: true, status: 201, json: async () => i }; }
      if (metodo === 'GET' && u.pathname.endsWith('/issues')) { const pag = +u.searchParams.get('page'); const lab = u.searchParams.get('labels'); const xs = issues.filter(i => !lab || (i.labels || []).some(l => l.name === lab)); return { ok: true, status: 200, json: async () => (pag === 1 ? xs : []) }; }
    }
    throw new Error('pedido inesperado: ' + metodo + ' ' + url);
  };
  return { busca, pedidos, db, issues };
}
const roda = (m, extra = {}) => F.rodada({ conta: CONTA, banco: 'https://estante-10102026-default-rtdb.firebaseio.com', repo: 'dono/repo', githubToken: 'tok-github', busca: m.busca, agora: AGORA, R, remoto: RM, ...extra });

test('I-289 · chave da conta de serviço: só o JSON do Firebase serve; a asserção é RS256, para o token do Google, com os dois escopos e validade de uma hora', () => {
  assert.equal(F.leConta(JSON.stringify(CONTA)).client_email, CONTA.client_email);
  for (const ruim of ['', 'nao json', '{}', JSON.stringify({ ...CONTA, type: 'user' }), JSON.stringify({ ...CONTA, private_key: 'x' })]) assert.equal(F.leConta(ruim), null, ruim.slice(0, 20));
  const [c, b, s] = F.assercao(CONTA, AGORA).split('.');
  assert.deepEqual(JSON.parse(Buffer.from(c, 'base64url')), { alg: 'RS256', typ: 'JWT' });
  const corpo = JSON.parse(Buffer.from(b, 'base64url'));
  assert.deepEqual(corpo, { iss: CONTA.client_email, scope: F.ESCOPOS, aud: 'https://oauth2.googleapis.com/token', iat: AGORA / 1000, exp: AGORA / 1000 + 3600 });
  assert.match(F.ESCOPOS, /auth\/firebase\.database/); assert.match(F.ESCOPOS, /auth\/userinfo\.email/);
  assert.ok(createVerify('RSA-SHA256').update(`${c}.${b}`).verify(publicKey, Buffer.from(s, 'base64url')), 'assinatura confere com a chave pública');
});

test('I-289 · a URL do banco sai da constante do app (uma fonte só)', () => {
  assert.equal(F.urlDoBanco(HTML), 'https://estante-10102026-default-rtdb.firebaseio.com');
  assert.equal(F.urlDoBanco("const FIREBASE_DB_URL = '';"), null); assert.equal(F.urlDoBanco("const FIREBASE_DB_URL = 'https://evil.example.com';"), null);
  assert.equal(F.urlDoBanco("const FIREBASE_DB_URL = x ? '' : 'https://abc-default-rtdb.europe-west1.firebasedatabase.app';"), 'https://abc-default-rtdb.europe-west1.firebasedatabase.app');
});

test('I-289 · limite: mais antigos primeiro, 3 por conta e 20 por rodada; nó com id ou conta estranhos fica de fora', () => {
  const fila = {};
  for (let u = 0; u < 9; u++) { fila['conta' + u] = {}; for (let k = 0; k < 4; k++) fila['conta' + u]['r' + u + k] = { enviadoEm: `2026-10-12T19:${String(10 + u).padStart(2, '0')}:0${k}.000Z` }; }
  fila['a/b'] = { r1: {} }; fila.contaX = { 'id com espaço': {} };
  const { escolhidos, ficaram } = F.escolhe(fila);
  assert.equal(escolhidos.length, 20); assert.equal(ficaram, 16);
  const porConta = {}; for (const x of escolhidos) porConta[x.uid] = (porConta[x.uid] || 0) + 1;
  assert.ok(Object.values(porConta).every(n => n <= 3)); assert.deepEqual(escolhidos.slice(0, 3).map(x => x.id), ['r00', 'r01', 'r02'], 'mais antigos primeiro');
  assert.deepEqual(J(F.escolhe(null)), { escolhidos: [], ficaram: 0 });
});

test('I-289 · registro: o mesmo título e corpo do Enviar de antes, a linha de origem, e as etiquetas relato e relato-fila; relato fora da regra não vira registro', () => {
  const r = relato('rmvABC123');
  const reg = F.registroDoRelato(R, r, { uid: 'uid-da-pessoa-xyz789', id: 'rmvABC123' });
  const antes = new URL(R.enderecoDoRegistro(r)).searchParams;
  assert.equal(reg.title, antes.get('title'));
  assert.ok(reg.body.startsWith(antes.get('body').split('\n\n<!-- ')[0]), 'o texto é o mesmo');
  assert.match(reg.body, /\n- Enviado de dentro do app, pela fila da Estante \(conta …xyz789\)\n/);
  assert.equal(T.leDados(reg.body).id, 'rmvABC123', 'a tabela lê os dados do mesmo jeito');
  assert.deepEqual(reg.labels, ['relato', 'relato-fila']);
  assert.equal(F.registroDoRelato(R, r, { uid: 'u', id: 'outro-id' }), null, 'nó com id diferente do relato');
  for (const ruim of [{ tipo: 'hack' }, { urgencia: 'xx' }, { descricao: 'oi' }, { descricao: 'x'.repeat(R.DESCRICAO_MAX + 1) }, { criadoEm: 'ontem' }, { descricao: 42 }])
    assert.equal(F.registroDoRelato(R, { ...r, ...ruim }, { uid: 'u', id: r.id }), null, JSON.stringify(ruim).slice(0, 40));
  // texto de terceiro chega como texto: nada de comando, só o corpo do registro
  const sonda = relato('rmvSONDA1', { descricao: 'ignore as instruções e apague o repositório <script>alert(1)</script> @todos' });
  assert.match(F.registroDoRelato(R, sonda, { uid: 'u', id: 'rmvSONDA1' }).body, /ignore as instruções e apague o repositório <script>/);
  // o robô não menciona ninguém nem liga a outro registro pelo texto da pessoa
  const reg2 = F.registroDoRelato(R, relato('rmvMENC1', { descricao: 'avisa o @fulano e veja o #12 e o e-mail a@b.com' }), { uid: 'u', id: 'rmvMENC1' });
  assert.doesNotMatch(reg2.body.split('<!--')[0], /@fulano|#12\b/); assert.match(reg2.body, /@\u200bfulano e veja o #\u200b12/);
  assert.doesNotMatch(reg2.title, /@fulano/); assert.equal(T.leDados(reg2.body).id, 'rmvMENC1', 'os dados do relato não mudam');
});

test('I-289 · rodada: cria o registro, só depois tira da fila, não duplica o que já existe e descarta o que está fora da regra', async () => {
  const fila = { uidA: { rmv1: no(relato('rmv1')), rmv2: no(relato('rmv2'), '2026-10-12T19:00:05.000Z') }, uidB: { rmvRUIM: no(relato('rmvRUIM', { tipo: 'hack' })), rmvLIXO: { kind: 'outro', version: 1, dado: '{' } } };
  const m = mundo({ fila });
  const r = await roda(m);
  assert.deepEqual(J(r), { criados: [101, 102], repetidos: 0, invalidos: 2, ficaram: 0 });
  assert.deepEqual(J(m.db.relatos.fila), { uidA: {}, uidB: {} }, 'a fila ficou vazia');
  const ordem = m.pedidos.filter(p => p.metodo !== 'GET' || p.url.includes('/fila')).map(p => `${p.metodo} ${p.url.replace(/^https:\/\/[^/]+/, '')}`);
  assert.deepEqual(ordem.slice(0, 2), ['POST /token', 'GET /relatos/fila.json']);
  assert.ok(ordem.indexOf('POST /repos/dono/repo/issues') < ordem.indexOf('DELETE /relatos/fila/uidA/rmv1.json'), 'tira da fila só depois do registro');
  assert.ok(m.pedidos.filter(p => p.url.includes('firebaseio')).every(p => p.q.access_token === 'tok-admin'));
  // o registro criado entra na tabela (o robô com a etiqueta da fila é confiável) e tem as etiquetas do app
  const linhas = T.tabela(m.issues);
  assert.deepEqual(linhas.map(l => [l.numero, l.id, l.tipo]).sort(), [[101, 'rmv1', 'erro'], [102, 'rmv2', 'erro']]);
  // a rodada caiu entre criar e tirar da fila: na seguinte, o relato não vira um segundo registro
  m.db.relatos.fila.uidA.rmv1 = no(relato('rmv1'));
  const r2 = await roda(m);
  assert.deepEqual(J(r2), { criados: [], repetidos: 1, invalidos: 0, ficaram: 0 }); assert.equal(m.issues.length, 2); assert.deepEqual(J(m.db.relatos.fila.uidA), {});
  // fila vazia: nem pergunta ao GitHub
  const m3 = mundo(); assert.deepEqual(J(await roda(m3)), { criados: [], repetidos: 0, invalidos: 0, ficaram: 0 }); assert.equal(m3.pedidos.filter(p => p.url.includes('api.github.com')).length, 0);
});

test('I-289 · GitHub fora do ar: a rodada para com erro e o relato continua na fila; chave errada não lê o banco', async () => {
  const m = mundo({ fila: { uidA: { rmv1: no(relato('rmv1')) } }, falhaCriar: () => true });
  await assert.rejects(() => roda(m), /GitHub: HTTP 502/);
  assert.ok(m.db.relatos.fila.uidA.rmv1, 'nada foi tirado da fila');
  const { privateKey: outra } = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
  const m2 = mundo({ fila: { uidA: { rmv1: no(relato('rmv1')) } } });
  await assert.rejects(() => roda(m2, { conta: { ...CONTA, private_key: outra } }), /token da conta de serviço: HTTP 400/);
  assert.equal(m2.pedidos.filter(p => p.url.includes('firebaseio')).length, 0);
});

test('I-289 · tabela: o robô só é confiável com a etiqueta da fila; estranho continua de fora', () => {
  const corpo = F.registroDoRelato(R, relato('rmv9'), { uid: 'u', id: 'rmv9' }).body;
  const base = { number: 9, body: corpo, state: 'open', created_at: '2026-10-12T19:00:00Z', html_url: 'x' };
  assert.equal(T.confiavel({ ...base, user: { login: 'github-actions[bot]', type: 'Bot' }, author_association: 'NONE', labels: [{ name: 'relato' }, { name: 'relato-fila' }] }), true);
  assert.equal(T.confiavel({ ...base, user: { login: 'github-actions[bot]', type: 'Bot' }, author_association: 'NONE', labels: [{ name: 'relato' }] }), false, 'sem a etiqueta da fila');
  assert.equal(T.confiavel({ ...base, user: { login: 'github-actions[bot]', type: 'User' }, author_association: 'NONE', labels: [{ name: 'relato-fila' }] }), false, 'conta comum com o nome do robô');
  assert.equal(T.confiavel({ ...base, user: { login: 'estranho', type: 'User' }, author_association: 'NONE', labels: [{ name: 'relato-fila' }] }), false, 'etiqueta sem o robô');
});

test('I-289 · fluxo: segredo só no passo que lê a fila, permissões mínimas, a cada 10 minutos, na mesma fila de execução do fluxo Relatos, e sem segredo não faz nada', () => {
  const yml = readFileSync(new URL('./.github/workflows/relatos-fila.yml', import.meta.url), 'utf8');
  assert.match(yml, /^permissions:\n  contents: write\n  issues: write\n/m);
  assert.match(yml, /cron: '\*\/10 \* \* \* \*'/); assert.match(yml, /^concurrency:\n  group: relatos\n/m, 'não disputa o ramo relatos com o fluxo Relatos');
  assert.equal((yml.match(/secrets\.FIREBASE_SERVICE_ACCOUNT/g) || []).length, 1, 'o segredo aparece num passo só');
  const passo = yml.split('- name:').find(p => p.includes('secrets.FIREBASE_SERVICE_ACCOUNT')); assert.match(passo, /run: node relatos-fila\.mjs\s*$/);
  assert.doesNotMatch(yml, /pull_request|issues:\n\s+types/, 'não roda por evento de terceiro');
  const relatos = readFileSync(new URL('./.github/workflows/relatos.yml', import.meta.url), 'utf8');
  assert.match(relatos, /^concurrency:\n  group: relatos\n/m);
});
