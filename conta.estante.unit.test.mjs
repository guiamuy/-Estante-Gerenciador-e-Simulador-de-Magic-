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

test('P-9 · sessão mantida: entrar guarda só uid e token de renovação; renovação que troca o token regrava; sair e recusa apagam', async () => {
  const G = googleFalso(); let agora = 0; const guardados = [];
  const s = C.createSessaoFirebase({ apiKey: 'k', fetch: G.fetch, agora: () => agora, guarda: d => { guardados.push(d && { ...d }); } });
  await s.entrar('tok-google');
  assert.deepEqual(guardados.at(-1), { uid: 'uidAna_1', refreshToken: 'ref-1' }, 'nem o token de acesso nem o do Google');
  agora = 56 * 60000; await s.token();
  assert.deepEqual(guardados.at(-1), { uid: 'uidAna_1', refreshToken: 'ref-2' });
  s.sair(); assert.equal(guardados.at(-1), null);
  await s.entrar('tok'); agora += 56 * 60000; G.trocaUsuario('outra'); await s.token().catch(() => {});
  assert.equal(guardados.at(-1), null, 'renovação recusada apaga o que foi guardado');
  const falha = C.createSessaoFirebase({ apiKey: 'k', fetch: googleFalso().fetch, guarda: () => { throw new Error('disco cheio'); } });
  assert.deepEqual({ ...(await falha.entrar('tok')) }, { uid: 'uidAna_1' }, 'guardar que falha não derruba a entrada');
});

test('P-9 · retomar: a sessão guardada volta e o primeiro token renova; dado estranho é ignorado; sem conta Google não retoma', async () => {
  const G = googleFalso({ uid: 'uidAna_1' });
  const s = C.createSessaoFirebase({ apiKey: 'k', fetch: G.fetch });
  assert.equal(s.retoma({ uid: '../x', refreshToken: 'r' }), false);
  assert.equal(s.retoma({ uid: 'uidAna_1' }), false);
  assert.equal(s.retoma(null), false);
  assert.equal(s.retoma({ uid: 'uidAna_1', refreshToken: 'ref-guardado' }), true);
  assert.equal(s.ativa(), true); assert.equal(s.uid(), 'uidAna_1');
  assert.equal(await s.token(), 'id-1');
  assert.equal(G.pedidos[0].corpo, 'grant_type=refresh_token&refresh_token=ref-guardado');
  assert.equal(s.retoma({ uid: 'outro', refreshToken: 'x' }), false, 'com sessão ativa não troca');
  assert.equal(C.createSessaoFirebase({ apiKey: '' }).retoma({ uid: 'a', refreshToken: 'b' }), false, 'sem chave não retoma');
  const { conta } = contaCom(C.createSessaoFirebase({ apiKey: 'k', fetch: G.fetch }));
  assert.equal(await conta.retomaEstante({ uid: 'uidAna_1', refreshToken: 'r' }), false, 'sem conta Google no aparelho');
  await conta.entrar(); conta.sessao.sair();
  assert.equal(await conta.retomaEstante({ uid: 'uidAna_1', refreshToken: 'r' }), true);
  assert.equal(conta.estante().estado, 'conectada');
});

test('P-9 · a sessão guardada é do aparelho: classe "aparelho" no registro, fora do backup e do documento de perfil', () => {
  const { perfil: PF } = loadModules();
  assert.equal(PF.classeDe('conta.sessao'), 'aparelho');
  assert.ok(!PF.PREFERENCIAS.includes('conta.sessao') && !PF.DO_DOCUMENTO.includes('conta.sessao'));
});

/* G-263 · T6f-1 · relato #18: conta com e-mail e senha (Identity Toolkit accounts:signUp e accounts:signInWithPassword) */
function senhaFalsa(respostas = {}) {
  const pedidos = []; let n = 0;
  const resp = (status, corpo) => ({ ok: status < 400, status, json: async () => corpo });
  const fetch = async (url, init = {}) => {
    pedidos.push({ url, corpo: init.body && init.body[0] === '{' ? JSON.parse(init.body) : init.body, tipo: init.headers && init.headers['Content-Type'] });
    const rota = Object.keys(respostas).find(k => url.includes(k));
    if (rota) return resp(400, { error: { message: respostas[rota] } });
    if (url.includes('accounts:signUp') || url.includes('accounts:signInWithPassword')) { const c = JSON.parse(init.body); return resp(200, { localId: 'uidSenha_1', email: c.email, idToken: 'id-' + (++n), refreshToken: 'ref-' + n, expiresIn: '3600' }); }
    if (url.includes('securetoken')) return resp(200, { id_token: 'id-' + (++n), refresh_token: 'ref-' + n, expires_in: '3600', user_id: 'uidSenha_1' });
    return resp(404, {});
  };
  return { fetch, pedidos };
}

test('G-263 · criar e entrar com senha: pedido no formato do Identity Toolkit, uid da resposta, só uid e renovação guardados', async () => {
  const F = senhaFalsa(); const guardado = [];
  const s = C.createSessaoFirebase({ apiKey: 'chave-x', fetch: F.fetch, guarda: d => guardado.push(d) });
  assert.deepEqual({ ...(await s.criarComSenha('ana@exemplo.com', 'segredo-123')) }, { uid: 'uidSenha_1', email: 'ana@exemplo.com' });
  assert.equal(F.pedidos[0].url, 'https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=chave-x');
  assert.equal(F.pedidos[0].tipo, 'application/json');
  assert.deepEqual(F.pedidos[0].corpo, { email: 'ana@exemplo.com', password: 'segredo-123', returnSecureToken: true });
  assert.equal(s.ativa(), true); assert.equal(s.uid(), 'uidSenha_1'); assert.equal(await s.token(), 'id-1');
  assert.deepEqual({ ...guardado.at(-1) }, { uid: 'uidSenha_1', refreshToken: 'ref-1' });
  s.sair();
  await s.entrarComSenha('ana@exemplo.com', 'segredo-123');
  assert.equal(F.pedidos.at(-1).url, 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=chave-x');
  assert.equal(s.ativa(), true);
});

test('G-263 · cada recusa do Identity Toolkit vira um motivo de pessoa (sem firebase, token ou uid na frase)', async () => {
  const casos = { EMAIL_EXISTS: 'email-em-uso', INVALID_EMAIL: 'email-invalido', 'WEAK_PASSWORD : Password should be at least 6 characters': 'senha-fraca',
    INVALID_LOGIN_CREDENTIALS: 'senha-nao-confere', EMAIL_NOT_FOUND: 'senha-nao-confere', INVALID_PASSWORD: 'senha-nao-confere', USER_DISABLED: 'conta-desativada',
    'TOO_MANY_ATTEMPTS_TRY_LATER : Access to this account has been temporarily disabled': 'muitas-tentativas', OPERATION_NOT_ALLOWED: 'sem-senha' };
  for (const [mensagem, codigo] of Object.entries(casos)) {
    const s = C.createSessaoFirebase({ apiKey: 'k', fetch: senhaFalsa({ accounts: mensagem }).fetch });
    await assert.rejects(s.entrarComSenha('a@b.co', 'x'), e => e.message === codigo, mensagem);
    assert.equal(s.ativa(), false);
    assert.ok(C.MOTIVO[codigo] && !/firebase|token|uid/i.test(C.MOTIVO[codigo]), `frase de pessoa para ${codigo}`);
  }
  const outro = C.createSessaoFirebase({ apiKey: 'k', fetch: senhaFalsa({ accounts: 'ALGO_NOVO' }).fetch });
  await assert.rejects(outro.entrarComSenha('a@b.co', 'x'), /firebase-recusou/, 'código desconhecido continua genérico');
  await assert.rejects(C.createSessaoFirebase({ apiKey: '' }).criarComSenha('a@b.co', 'x'), /sem-firebase/);
});

test('G-263 · conta com e-mail: confere antes da rede, guarda só o e-mail (provedor senha), retoma ao reabrir, não pede o Google', async () => {
  const F = senhaFalsa();
  const { conta, gravados } = contaCom(C.createSessaoFirebase({ apiKey: 'k', fetch: F.fetch }));
  assert.equal(conta.comEmailDisponivel(), true);
  await assert.rejects(conta.criarComEmail('sem-arroba', 'segredo-123'), /email-invalido/);
  await assert.rejects(conta.criarComEmail('ana@exemplo.com', 'curta'), /senha-curta/);
  await assert.rejects(conta.entrarComEmail('ana@exemplo.com', ''), /senha-vazia/);
  await assert.rejects(conta.criarComEmail('ana@exemplo.com', 'x'.repeat(129)), /senha-longa/);
  assert.equal(F.pedidos.length, 0, 'erro de digitação não vai para a rede');
  const c = await conta.criarComEmail('  Ana@Exemplo.com ', 'segredo-123');
  assert.equal(F.pedidos[0].corpo.email, 'ana@exemplo.com');
  assert.deepEqual({ email: c.email, provedor: c.provedor, nome: c.nome, foto: c.foto }, { email: 'ana@exemplo.com', provedor: 'senha', nome: '', foto: null });
  assert.equal(conta.estante().estado, 'conectada');
  assert.ok(!gravados.some(g => /segredo-123|id-1/.test(g)), 'nem senha nem token de acesso no armazenamento da conta');
  // entrar com senha curta funciona (a regra dos 8 vale só para criar: contas antigas podem ter 6)
  conta.sessao.sair(); await conta.entrarComEmail('ana@exemplo.com', 'seis66');
  // conectar de novo uma conta de senha não abre o Google: pede a senha
  conta.sessao.sair();
  await assert.rejects(conta.conectarEstante(), /entre-de-novo/);
  assert.deepEqual({ ...conta.estante() }, { estado: 'desconectada', motivo: 'entre-de-novo' });
  assert.equal(await conta.retomaEstante({ uid: 'uidSenha_1', refreshToken: 'ref-9' }), true, 'reabrir retoma pela renovação guardada');
  await conta.sair(); assert.equal(await conta.get(), null);
  // sem conta da Estante configurada, não há e-mail
  const { conta: semFirebase } = contaCom(C.createSessaoFirebase({ apiKey: '' }));
  assert.equal(semFirebase.comEmailDisponivel(), false);
  await assert.rejects(semFirebase.entrarComEmail('ana@exemplo.com', 'segredo-123'), /sem-firebase/);
  // conta Google antiga (sem provedor guardado) continua Google
  const { conta: g } = contaCom(C.createSessaoFirebase({ apiKey: 'k', fetch: googleFalso().fetch }));
  assert.equal((await g.entrar()).provedor, 'google');
});
