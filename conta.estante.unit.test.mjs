// Leva P-7 · T6c-2a · conta da Estante: o token do Google vira sessão do Firebase (Identity Toolkit por REST), renovada
// pelo Secure Token, só na memória. Rede falsa: nada sai do processo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules, HTML } from './_load.mjs';
const { conta: C } = loadModules();

/** Google falso (o Identity Toolkit e o Secure Token) com relógio controlado. */
function googleFalso({ uid = 'uidAna_1', recusa = false, fora = false } = {}) {
  const pedidos = []; let n = 0; let usuarioDaRenovacao = uid; let semRede = false;
  const resp = (status, corpo) => ({ ok: status < 400, status, json: async () => corpo });
  const fetch = async (url, init = {}) => {
    pedidos.push({ url, metodo: init.method, tipo: init.headers && init.headers['Content-Type'], corpo: init.body });
    if (semRede || fora) throw new TypeError('Failed to fetch');
    if (url.startsWith('https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=')) {
      if (recusa) return resp(400, { error: { message: 'INVALID_IDP_RESPONSE' } });
      return resp(200, { localId: uid, idToken: 'id-' + (++n), refreshToken: 'ref-' + n, expiresIn: '3600', email: 'ana@example.com' });
    }
    if (url.startsWith('https://securetoken.googleapis.com/v1/token?key=')) {
      return resp(200, { id_token: 'id-' + (++n), refresh_token: 'ref-' + n, expires_in: '3600', user_id: usuarioDaRenovacao });
    }
    return resp(404, {});
  };
  return { fetch, pedidos, trocaUsuario: u => { usuarioDaRenovacao = u; }, rede: sim => { semRede = !sim; } };
}

test('P-7 · entrar troca o token do Google pela sessão da Estante: pedido no formato do Identity Toolkit, uid da resposta', async () => {
  const G = googleFalso(); let agora = 1_000_000;
  const s = C.createSessaoFirebase({ apiKey: 'chave-x', fetch: G.fetch, agora: () => agora, origem: 'https://guiamuy.github.io' });
  assert.equal(s.disponivel(), true); assert.equal(s.ativa(), false); assert.equal(await s.token(), null);
  assert.deepEqual({ ...(await s.entrar('tok-google')) }, { uid: 'uidAna_1' });
  const p = G.pedidos[0];
  assert.equal(p.url, 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=chave-x');
  assert.equal(p.metodo, 'POST'); assert.equal(p.tipo, 'application/json');
  assert.deepEqual(JSON.parse(p.corpo), { postBody: 'access_token=tok-google&providerId=google.com', requestUri: 'https://guiamuy.github.io', returnSecureToken: true, returnIdpCredential: false });
  assert.equal(s.uid(), 'uidAna_1'); assert.equal(s.ativa(), true);
  assert.equal(await s.token(), 'id-1');
  agora += 50 * 60000; assert.equal(await s.token(), 'id-1', 'faltando mais de 5 min, reusa');
  assert.equal(G.pedidos.length, 1);
});

test('P-7 · renovação 5 min antes de vencer: Secure Token com o token de renovação; pedidos ao mesmo tempo viram um só', async () => {
  const G = googleFalso(); let agora = 0;
  const s = C.createSessaoFirebase({ apiKey: 'k', fetch: G.fetch, agora: () => agora });
  await s.entrar('tok');
  agora = 56 * 60000;
  const [a, b] = await Promise.all([s.token(), s.token()]);
  assert.equal(a, 'id-2'); assert.equal(b, 'id-2');
  const ren = G.pedidos.filter(p => p.url.startsWith('https://securetoken'));
  assert.equal(ren.length, 1, 'uma renovação para dois pedidos');
  assert.equal(ren[0].url, 'https://securetoken.googleapis.com/v1/token?key=k');
  assert.equal(ren[0].tipo, 'application/x-www-form-urlencoded');
  assert.equal(ren[0].corpo, 'grant_type=refresh_token&refresh_token=ref-1');
  agora += 56 * 60000; assert.equal(await s.token(), 'id-3', 'a renovação seguinte usa o token de renovação novo');
  assert.equal(G.pedidos.at(-1).corpo, 'grant_type=refresh_token&refresh_token=ref-2');
});

test('P-7 · renovação: sem rede a sessão fica (tenta de novo depois); resposta de outro usuário encerra a sessão', async () => {
  const G = googleFalso(); let agora = 0;
  const s = C.createSessaoFirebase({ apiKey: 'k', fetch: G.fetch, agora: () => agora });
  await s.entrar('tok'); agora = 58 * 60000;
  G.rede(false); await assert.rejects(s.token(), /sem-rede/); assert.equal(s.ativa(), true);
  G.rede(true); assert.equal(await s.token(), 'id-2');
  agora += 58 * 60000; G.trocaUsuario('outraPessoa');
  await assert.rejects(s.token(), /firebase-recusou/); assert.equal(s.ativa(), false); assert.equal(s.uid(), null);
});

test('P-7 · sair no meio de uma renovação não ressuscita a sessão', async () => {
  const G = googleFalso(); let agora = 0; let solta;
  const lento = async (url, init) => { if (url.includes('securetoken')) await new Promise(r => { solta = r; }); return G.fetch(url, init); };
  const s = C.createSessaoFirebase({ apiKey: 'k', fetch: lento, agora: () => agora });
  await s.entrar('tok'); agora = 58 * 60000;
  const p = s.token(); await new Promise(r => setTimeout(r, 0)); s.sair(); solta();
  assert.equal(await p, null); assert.equal(s.ativa(), false);
});

test('P-7 · recusas: sem chave, sem token do Google, resposta 400 e resposta sem uid válido', async () => {
  await assert.rejects(C.createSessaoFirebase({ apiKey: '' }).entrar('tok'), /sem-firebase/);
  assert.equal(C.createSessaoFirebase({ apiKey: '' }).disponivel(), false);
  await assert.rejects(C.createSessaoFirebase({ apiKey: 'k', fetch: googleFalso().fetch }).entrar(''), /recusado/);
  const e = await C.createSessaoFirebase({ apiKey: 'k', fetch: googleFalso({ recusa: true }).fetch }).entrar('tok').catch(x => x);
  assert.equal(e.message, 'firebase-recusou'); assert.equal(e.status, 400); assert.equal(e.detalhe, 'INVALID_IDP_RESPONSE');
  await assert.rejects(C.createSessaoFirebase({ apiKey: 'k', fetch: googleFalso({ uid: '../perfis/x' }).fetch }).entrar('tok'), /firebase-recusou/);
  await assert.rejects(C.createSessaoFirebase({ apiKey: 'k', fetch: googleFalso({ fora: true }).fetch }).entrar('tok'), /sem-rede/);
  for (const k of ['sem-firebase', 'firebase-recusou', 'firebase-fora']) assert.ok(C.MOTIVO[k] && !/firebase|token|uid/i.test(C.MOTIVO[k].replace(/Estante/g, '')), `frase de pessoa para ${k}`);
});

/** Conta Google falsa (GIS) + store em memória. */
function contaCom(sessao) {
  const store = new Map(); const gravados = [];
  const st = { get: async k => store.get(k), set: async (k, v) => { gravados.push(JSON.stringify(v)); store.set(k, v); }, remove: async k => store.delete(k) };
  const google = { accounts: { oauth2: { initTokenClient: cfg => ({ requestAccessToken: () => setTimeout(() => cfg.callback({ access_token: 'tok-google', expires_in: 3600 }), 0) }), revoke: (t, cb) => cb && cb() } } };
  const fetch = async () => ({ ok: true, status: 200, json: async () => ({ name: 'Ana', email: 'ana@example.com' }) });
  return { conta: C.createConta({ clientId: 'x.apps.googleusercontent.com', store: st, google, fetch, sessao }), gravados };
}

test('P-7 · conta Google + conta da Estante: entrar abre as duas; tokens nunca vão para o armazenamento; sair fecha as duas', async () => {
  const G = googleFalso();
  const { conta, gravados } = contaCom(C.createSessaoFirebase({ apiKey: 'k', fetch: G.fetch }));
  assert.equal(conta.estante().estado, 'desconectada');
  const c = await conta.entrar();
  assert.equal(c.email, 'ana@example.com');
  assert.deepEqual({ ...conta.estante() }, { estado: 'conectada', uid: 'uidAna_1' });
  assert.equal(JSON.parse(G.pedidos[0].corpo).postBody, 'access_token=tok-google&providerId=google.com');
  assert.ok(gravados.every(g => !/tok-google|id-1|ref-1/.test(g)), 'nenhum token no store');
  await conta.sair();
  assert.equal(conta.estante().estado, 'desconectada'); assert.equal(conta.sessao.ativa(), false);
});

test('P-7 · Firebase recusou: a conta Google entra mesmo assim, a tela recebe o motivo e Conectar tenta de novo', async () => {
  let recusa = true; const G1 = googleFalso({ recusa: true }), G2 = googleFalso();
  const sessao = C.createSessaoFirebase({ apiKey: 'k', fetch: (u, i) => (recusa ? G1 : G2).fetch(u, i) });
  const { conta } = contaCom(sessao);
  assert.equal((await conta.entrar()).email, 'ana@example.com');
  assert.deepEqual({ ...conta.estante() }, { estado: 'desconectada', motivo: 'firebase-recusou' });
  recusa = false; await conta.conectarEstante();
  assert.equal(conta.estante().estado, 'conectada');
});

test('P-7 · sem chave da Estante a conta Google segue como antes (nenhum pedido ao Firebase)', async () => {
  const G = googleFalso();
  const { conta } = contaCom(C.createSessaoFirebase({ apiKey: '', fetch: G.fetch }));
  await conta.entrar(); assert.equal(conta.estante().estado, 'desligada'); assert.equal(G.pedidos.length, 0);
  assert.equal(await conta.conectarEstante(), null);
  const { conta: semSessao } = contaCom(null); await semSessao.entrar(); assert.equal(semSessao.estante().estado, 'desligada');
});

test('P-7/P-8 · contrato: Client ID, chave e banco do projeto estante-10102026 no app', () => {
  const id = HTML.match(/'(\d+-[a-z0-9]+\.apps\.googleusercontent\.com)'/);
  assert.ok(id && id[1].startsWith('993924277405-'), 'Client ID do mesmo projeto do Firebase (número do projeto 993924277405)');
  assert.match(HTML, /'AIzaSyD6WvzlsJ4KZ9b5QZOEdQnd-liaNeJ0xRk'/);
  assert.match(HTML, /^const FIREBASE_DB_URL = .*'https:\/\/estante-10102026-default-rtdb\.firebaseio\.com';$/m, 'P-8 · banco do mesmo projeto, ligado com a sala presa à conta');
  const csp = HTML.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
  for (const o of ['https://identitytoolkit.googleapis.com', 'https://securetoken.googleapis.com', 'https://accounts.google.com']) assert.ok(csp.includes(o), o + ' na política');
});
