// Leva 129 · U13 fase 2 · conta Google e backup na nuvem, com Google e rede falsos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
const { conta: C, platform: P } = loadModules();
const J = x => JSON.parse(JSON.stringify(x));

/** Google Identity falso: entrega o token que o teste mandar, ou recusa. */
function googleFalso({ token = 'tok1', recusa = false, expiresIn = 3600 } = {}) {
  const log = [];
  return { log, g: { accounts: { oauth2: {
    initTokenClient: cfg => ({ requestAccessToken: o => { log.push(['pede', cfg.scope, o.prompt]); if (recusa) cfg.callback({ error: 'access_denied' }); else cfg.callback({ access_token: token, expires_in: expiresIn }); } }),
    revoke: (t, cb) => { log.push(['revoga', t]); cb && cb(); }
  } } } };
}
/** Drive e userinfo falsos: guarda um arquivo em memória. */
function redeFalsa({ fora = false } = {}) {
  const chamadas = []; let arquivo = null;
  const fetch = async (url, init = {}) => {
    chamadas.push([init.method || 'GET', url.replace('https://www.googleapis.com', ''), (init.headers || {}).Authorization || null]);
    if (fora) throw new TypeError('Failed to fetch');
    if (!(init.headers || {}).Authorization) return { ok: false, status: 401 };
    const ok = body => ({ ok: true, status: 200, json: async () => body, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) });
    if (url.includes('/oauth2/v3/userinfo')) return ok({ name: 'Gui Amuy', email: 'gui@example.com', picture: 'https://lh3.googleusercontent.com/a/x' });
    if (url.includes('/drive/v3/files?spaces=appDataFolder')) return ok({ files: arquivo ? [{ id: arquivo.id, modifiedTime: '2026-10-02T00:00:00Z', size: String(arquivo.texto.length) }] : [] });
    if (url.includes('/upload/drive/v3/files')) {
      const texto = init.body.split('\r\n\r\n')[2].split('\r\n--')[0];
      if ((init.method || 'POST') === 'POST') { assert.match(init.body, /"parents":\["appDataFolder"\]/, 'arquivo novo nasce na pasta do app'); arquivo = { id: 'f1', texto }; }
      else { assert.match(url, /\/files\/f1\?/); arquivo = { ...arquivo, texto }; }
      return ok({ id: arquivo.id });
    }
    if (/\/drive\/v3\/files\/f1\?alt=media/.test(url)) return ok(arquivo.texto);
    return { ok: false, status: 404 };
  };
  return { fetch, chamadas, arquivo: () => arquivo };
}

test('Leva 129 · sem Client ID a conta não liga e cada ação diz o motivo', async () => {
  const c = C.createConta({ clientId: '', store: P.memoryStore() });
  assert.equal(c.disponivel(), false);
  await assert.rejects(c.entrar(), /sem-client-id/);
  await assert.rejects(c.enviarBackup('{}'), /sem-client-id/);
  await assert.rejects(c.baixarBackup(), /sem-client-id/);
  assert.equal(await c.get(), null);
  assert.equal(C.motivoDe(new Error('sem-client-id')), C.MOTIVO['sem-client-id']);
  assert.equal(C.motivoDe(new Error('qualquer')), C.MOTIVO.api);
});

test('Leva 129 · entrar pede o token com os escopos certos, guarda nome/e-mail/foto, e sair apaga e revoga', async () => {
  const store = P.memoryStore(); const G = googleFalso(); const R = redeFalsa(); let t = 1000;
  const c = C.createConta({ clientId: 'id-1.apps.googleusercontent.com', store, fetch: R.fetch, google: G.g, agora: () => t });
  assert.equal(c.disponivel(), true);
  const u = await c.entrar();
  assert.deepEqual(J(u), { nome: 'Gui Amuy', email: 'gui@example.com', foto: 'https://lh3.googleusercontent.com/a/x', entradaEm: 1000, backupEm: 0 });
  assert.deepEqual(J(G.log[0]), ['pede', c.ESCOPOS, 'consent']);
  assert.match(c.ESCOPOS, /drive\.appdata/); assert.doesNotMatch(c.ESCOPOS, /auth\/drive(\s|$)/, 'nunca o Drive inteiro: só a pasta do app');
  assert.equal(c.autenticado(), true);
  assert.deepEqual(J(await c.get()), J(u), 'a conta fica no aparelho');
  assert.equal(await store.get('conta') !== null && !('token' in (await store.get('conta'))), true, 'o token não é guardado');
  await c.sair();
  assert.equal(await c.get(), null); assert.equal(c.autenticado(), false);
  assert.deepEqual(J(G.log.at(-1)), ['revoga', 'tok1']);
});

test('Leva 129 · recusa no consentimento e falta de rede viram erros com nome', async () => {
  const store = P.memoryStore();
  const recusa = C.createConta({ clientId: 'id', store, fetch: redeFalsa().fetch, google: googleFalso({ recusa: true }).g });
  await assert.rejects(recusa.entrar(), /recusado/);
  assert.equal(await recusa.get(), null);
  const fora = C.createConta({ clientId: 'id', store, fetch: redeFalsa({ fora: true }).fetch, google: googleFalso().g });
  await assert.rejects(fora.entrar(), /sem-rede/);
});

test('Leva 129 · backup na nuvem: cria na primeira vez, substitui depois, baixa o que enviou, e reusa o token em silêncio', async () => {
  const store = P.memoryStore(); const G = googleFalso(); const R = redeFalsa(); let t = 5000;
  const c = C.createConta({ clientId: 'id', store, fetch: R.fetch, google: G.g, agora: () => t });
  await c.entrar();
  assert.equal(await c.baixarBackup(), null, 'nada na nuvem ainda');
  const r1 = await c.enviarBackup('{"kind":"estante.backup","version":3,"n":1}');
  assert.deepEqual(J(r1), { id: 'f1', substituiu: false });
  t = 6000;
  const r2 = await c.enviarBackup('{"kind":"estante.backup","version":3,"n":2}');
  assert.deepEqual(J(r2), { id: 'f1', substituiu: true });
  assert.equal(R.arquivo().texto, '{"kind":"estante.backup","version":3,"n":2}');
  assert.equal((await c.get()).backupEm, 6000, 'a hora do último backup fica no aparelho');
  const b = await c.baixarBackup();
  assert.equal(b.texto, '{"kind":"estante.backup","version":3,"n":2}'); assert.equal(b.modificadoEm, '2026-10-02T00:00:00Z');
  assert.equal(G.log.filter(x => x[0] === 'pede').length, 1, 'o token válido é reusado: um pedido só');
  // token expirado: o próximo uso pede de novo, sem tela de consentimento
  t = 5000 + 3600 * 1000 + 1;
  await c.baixarBackup();
  assert.deepEqual(J(G.log.filter(x => x[0] === 'pede').at(-1)), ['pede', c.ESCOPOS, '']);
});

test('Leva 129 · 401 do Google derruba o token e pede entrada de novo', async () => {
  const store = P.memoryStore(); const G = googleFalso({ token: '' }); const R = redeFalsa();
  const c = C.createConta({ clientId: 'id', store, fetch: R.fetch, google: G.g });
  await assert.rejects(c.entrar(), /recusado/, 'token vazio é recusa');
  const ok = googleFalso(); const c2 = C.createConta({ clientId: 'id', store, fetch: async (u, i) => (u.includes('userinfo') ? { ok: false, status: 401 } : R.fetch(u, i)), google: ok.g });
  await assert.rejects(c2.entrar(), /expirado/);
  assert.equal(c2.autenticado(), false);
});
