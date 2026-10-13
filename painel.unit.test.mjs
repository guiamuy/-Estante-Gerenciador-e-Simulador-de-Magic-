// R-2 · BI1-1 · Painel Estante (painel.html): espelho do design system, contrato visual próprio, política de conteúdo,
// sessão só para os e-mails da lista, fonte do GitHub com ETag e orçamento, modelo puro da tela.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { HTML as INDEX, ROOT } from './_load.mjs';
import { join } from 'node:path';

const PAINEL = readFileSync(join(ROOT, 'painel.html'), 'utf8');
const cssDe = html => html.slice(html.indexOf('<style>') + 7, html.indexOf('</style>'));
const tokensDoIndex = cssDe(INDEX).slice(0, cssDe(INDEX).indexOf('F5 · BASE + COMPONENTES'));
const cssPainel = cssDe(PAINEL);
const I_TOK = cssPainel.indexOf('/* ==== ds:tokens'), I_COMP = cssPainel.indexOf('/* ==== ds:componentes'), I_PROP = cssPainel.indexOf('/* ==== src/painel/painel.css ==== */');
const tokensDoPainel = cssPainel.slice(cssPainel.indexOf('\n', I_TOK) + 1, I_COMP);
const espelho = cssPainel.slice(cssPainel.indexOf('\n', I_COMP) + 1, I_PROP);
const proprio = cssPainel.slice(I_PROP);
const script = PAINEL.slice(PAINEL.indexOf('<script>') + 8, PAINEL.lastIndexOf('</script>'));

/** Carrega os módulos do painel sem navegador (como o _load.mjs faz com o index.html). */
export function loadPainel(window = {}) {
  // No mesmo reino do teste (não num vm à parte): os objetos devolvidos comparam com deepEqual estrito.
  const fabrica = new Function('window', script + '\n;return { base: __p0, sessao: __p1, modelo: __p2, ui: __p3, app: __p4 };');
  return fabrica({ __PAINEL_NO_AUTOBOOT: true, ...window });
}

test('R-2 · o painel espelha o design system: o bloco de tokens é idêntico ao do index.html e cada bloco de componente existe, idêntico, lá', () => {
  assert.equal(tokensDoPainel.trim(), tokensDoIndex.trim(), 'bloco de tokens diferente do index.html: copie de novo (gera-painel) em vez de editar à mão');
  const blocos = []; let pos = 0;
  while (pos < espelho.length) {
    const j = espelho.indexOf('{', pos); if (j < 0) break;
    let d = 1, p = j + 1; while (p < espelho.length && d > 0) { if (espelho[p] === '{') d++; else if (espelho[p] === '}') d--; p++; }
    blocos.push(espelho.slice(espelho.lastIndexOf('\n', j) + 1, p).trim()); pos = p;
  }
  assert.ok(blocos.length > 40, 'o espelho tem os blocos dos componentes usados');
  const faltam = blocos.filter(b => !INDEX.includes(b));
  assert.deepEqual(faltam.map(b => b.slice(0, 60)), [], 'bloco do espelho que não existe (ou mudou) no index.html');
});

test('R-2 · CSS próprio do painel: só tokens (nenhuma cor literal), hover só em @media (hover: hover), todo token usado existe, z-index pelos tokens', () => {
  const linhas = proprio.split('\n').filter(l => !l.trim().startsWith('/*'));
  assert.deepEqual(linhas.filter(l => /#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i.test(l)), [], 'cor literal no CSS do painel');
  assert.deepEqual(linhas.filter(l => /:hover/.test(l) && !/@media \(hover: hover\)/.test(l) && !/^\s+\./.test(l)), [], ':hover fora do @media (hover: hover)');
  const definidos = new Set([...cssPainel.matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)].map(m => m[1]));
  const usados = [...new Set([...proprio.matchAll(/var\((--[a-zA-Z0-9-]+)/g)].map(m => m[1]))];
  assert.deepEqual(usados.filter(t => !definidos.has(t)), [], 'token usado e nunca definido');
  assert.deepEqual(linhas.filter(l => { const m = l.match(/z-index:\s*(\d+)/); return m && Number(m[1]) > 5; }), []);
});

test('R-2 · política de conteúdo do painel: sem eval, toda origem que o script chama está na política, e o painel não chama Scryfall nem CDN', () => {
  const meta = PAINEL.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/);
  assert.ok(meta, 'meta Content-Security-Policy no painel.html');
  const csp = meta[1];
  assert.doesNotMatch(csp, /unsafe-eval/);
  assert.match(csp, /object-src 'none'/); assert.match(csp, /base-uri 'none'/); assert.match(csp, /frame-src https:\/\/accounts\.google\.com/);
  const connect = (csp.match(/connect-src ([^;]+)/) || [])[1] || '';
  const hosts = [...new Set([...script.matchAll(/https:\/\/([a-z0-9.-]+)/g)].map(m => m[1]))];
  const cobre = h => connect.split(/\s+/).some(o => o === 'https://' + h || (o.startsWith('https://*.') && h.endsWith(o.slice('https://*.'.length))));
  assert.deepEqual(hosts.filter(h => !cobre(h) && h !== 'accounts.google.com'), [], 'origem chamada pelo script fora de connect-src');
  assert.match(csp, /script-src [^;]*https:\/\/accounts\.google\.com/, 'o script do Google entra pelo script-src');
  assert.ok(!/scryfall|jsdelivr/.test(script), 'o painel não fala com Scryfall nem com CDN');
});

test('R-2 · texto de fora nunca vira HTML: o único innerHTML do painel desenha ícones nascidos no código', () => {
  const usos = [...script.matchAll(/innerHTML/g)].length;
  assert.equal(usos, 1, 'innerHTML só no Icone()');
  const i = script.indexOf('innerHTML');
  assert.match(script.slice(i - 400, i), /function Icone\(nome/, 'o innerHTML está dentro de Icone()');
  assert.doesNotMatch(script, /html:\s/, 'sem a chave html: no h() do painel');
});

/* ---------- sessão ---------- */
const jwt = email => 'h.' + Buffer.from(JSON.stringify({ email, sub: 'x' })).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') + '.s';
function sessaoFalsa({ email = 'gui.amuy@gmail.com', permitidos = ['gui.amuy@gmail.com'], guarda = null, respostas = {} } = {}) {
  const { sessao, base } = loadPainel();
  const g = guarda || base.createGuarda(null);
  const chamadas = [];
  const revogados = [];
  const google = { accounts: { oauth2: { initTokenClient: cfg => ({ requestAccessToken: () => cfg.callback({ access_token: 'tok-google', expires_in: 3600 }) }), revoke: (tk, cb) => { revogados.push(tk); cb && cb(); } } } };
  const fetch = async (url, init) => {
    chamadas.push({ url, corpo: JSON.parse(init.body) });
    if (respostas.falha) throw new Error('rede');
    const corpo = url.includes('securetoken') ? { user_id: 'uid1', id_token: jwt(email), refresh_token: 'ref-2', expires_in: '3600' } : { localId: 'uid1', idToken: jwt(email), refreshToken: 'ref-1', expiresIn: '3600', email };
    return { ok: true, status: 200, json: async () => corpo };
  };
  const s = sessao.createSessao({ apiKey: 'k', clientId: 'c', permitidos, fetch, google, guarda: g, origem: 'https://guiamuy.github.io' });
  return { s, g, chamadas, revogados, CHAVE: sessao.CHAVE };
}

test('R-2 · entrar: o token do Google é trocado no Identity Toolkit; o e-mail da lista entra e a sessão fica guardada sem o token de acesso', async () => {
  const { s, g, chamadas, CHAVE } = sessaoFalsa();
  assert.deepEqual(await s.entrar(), { uid: 'uid1', email: 'gui.amuy@gmail.com' });
  assert.match(chamadas[0].url, /identitytoolkit.*signInWithIdp\?key=k$/);
  assert.match(chamadas[0].corpo.postBody, /access_token=tok-google&providerId=google\.com/);
  assert.equal(chamadas[0].corpo.requestUri, 'https://guiamuy.github.io');
  assert.deepEqual(g.ler(CHAVE), { uid: 'uid1', refreshToken: 'ref-1', email: 'gui.amuy@gmail.com' });
  assert.equal(JSON.stringify(g.ler(CHAVE)).includes('tok-google'), false, 'o token do Google nunca vai para o aparelho');
  assert.equal(await s.token(), jwt('gui.amuy@gmail.com'));
});

test('R-2 · e-mail fora da lista é recusado: o token do Google é revogado, nada fica guardado e a sessão não abre', async () => {
  const { s, g, revogados, CHAVE } = sessaoFalsa({ email: 'Outra@gmail.com' });
  await assert.rejects(s.entrar(), e => e.message === 'nao-permitido' && e.email === 'outra@gmail.com');
  assert.deepEqual(revogados, ['tok-google']);
  assert.equal(g.ler(CHAVE), null);
  assert.equal(s.atual(), null);
  // a lista compara sem diferenciar maiúsculas
  const ok = sessaoFalsa({ email: 'GUI.AMUY@gmail.com' });
  assert.equal((await ok.s.entrar()).email, 'gui.amuy@gmail.com');
});

test('R-2 · retomar: a sessão guardada renova pelo Secure Token e volta sem pedir o Google; e-mail que saiu da lista apaga a guarda; sem rede não apaga', async () => {
  const { s, g, CHAVE } = sessaoFalsa();
  await s.entrar();
  const outra = sessaoFalsa({ guarda: g });
  assert.deepEqual(await outra.s.retomar(), { uid: 'uid1', email: 'gui.amuy@gmail.com' });
  assert.match(outra.chamadas[0].url, /securetoken/);
  assert.equal(outra.chamadas[0].corpo.grant_type, 'refresh_token');
  const fora = sessaoFalsa({ guarda: g, permitidos: ['ninguem@x.com'] });
  await assert.rejects(fora.s.retomar(), /nao-permitido/);
  assert.equal(g.ler(CHAVE), null, 'conta fora da lista some do aparelho');
  await s.entrar();
  const semRede = sessaoFalsa({ guarda: g, respostas: { falha: true } });
  await assert.rejects(semRede.s.retomar(), /sem-rede/);
  assert.ok(g.ler(CHAVE), 'sem rede a guarda fica para a próxima abertura');
  await s.sair(); assert.equal(g.ler(CHAVE), null); assert.equal(s.atual(), null);
});

test('R-2 · resposta do Identity Toolkit sem uid válido ou sem token é recusada', async () => {
  const { sessao, base } = loadPainel();
  const fetch = async () => ({ ok: true, status: 200, json: async () => ({ localId: 'uid com espaço', idToken: 'x.y.z', refreshToken: 'r' }) });
  const google = { accounts: { oauth2: { initTokenClient: cfg => ({ requestAccessToken: () => cfg.callback({ access_token: 't', expires_in: 3600 }) }), revoke: (t, cb) => cb() } } };
  const s = sessao.createSessao({ apiKey: 'k', clientId: 'c', permitidos: ['a@b.c'], fetch, google, guarda: base.createGuarda(null) });
  await assert.rejects(s.entrar(), /firebase-recusou/);
});

/* ---------- fonte do GitHub ---------- */
function fonteFalsa(respostas) {
  const { base } = loadPainel();
  const guarda = base.createGuarda(null);
  const pedidos = [];
  let agora = 1000;
  const fetch = async (url, init) => { pedidos.push({ url, headers: init.headers }); const r = respostas.shift(); if (r instanceof Error) throw r; return r; };
  const resp = (status, corpo, headers = {}) => ({ ok: status >= 200 && status < 300, status, headers: { get: n => headers[n.toLowerCase()] ?? null }, json: async () => corpo });
  const fonte = base.createFonte({ fetch, guarda, agora: () => agora, ttl: 600000 });
  return { fonte, pedidos, resp, avanca: ms => { agora += ms; }, guarda };
}

test('R-2 · fonte do GitHub: um pedido, cache por 10 min, ETag no pedido seguinte (304 mantém o dado e renova o carimbo), cota lida nos cabeçalhos', async () => {
  const { resp } = fonteFalsa([]);
  const r1 = { commits: 1 };
  const F = fonteFalsa([resp(200, [r1], { etag: '"e1"', 'x-ratelimit-remaining': '57', 'x-ratelimit-limit': '60' }), resp(304, null, { 'x-ratelimit-remaining': '57' })]);
  // primeira leitura
  const a = await F.fonte.api('/commits?sha=main&per_page=1', { nome: 'main' });
  assert.deepEqual(a, { dado: [r1], em: 1000, deCache: false });
  assert.equal(F.fonte.pedidos, 1); assert.deepEqual(F.fonte.cota, { restante: 57, limite: 60, reinicia: 0 });
  // dentro do prazo: nem fetch
  const b = await F.fonte.api('/commits?sha=main&per_page=1', { nome: 'main' });
  assert.equal(b.deCache, true); assert.equal(F.fonte.pedidos, 1);
  // passado o prazo: pedido condicional e 304
  F.avanca(601000);
  const c = await F.fonte.api('/commits?sha=main&per_page=1', { nome: 'main' });
  assert.equal(F.pedidos[1].headers['If-None-Match'], '"e1"');
  assert.deepEqual(c, { dado: [r1], em: 602000, deCache: false });
  assert.equal(F.fonte.pedidos, 2);
});

test('R-2 · fonte sem rede ou com a cota esgotada devolve o que havia guardado e diz por quê; sem nada guardado, erro nomeado', async () => {
  const F = fonteFalsa([new Error('rede')]);
  await assert.rejects(F.fonte.api('/x'), /sem-rede/);
  const G = fonteFalsa([F.resp(200, { a: 1 }, {}), new Error('rede'), F.resp(403, { message: 'rate limit' }, { 'x-ratelimit-remaining': '0' })]);
  await G.fonte.api('/x'); G.avanca(700000);
  const semRede = await G.fonte.api('/x'); assert.equal(semRede.semRede, true); assert.deepEqual(semRede.dado, { a: 1 });
  G.avanca(700000);
  const cota = await G.fonte.api('/x'); assert.equal(cota.cotaEsgotada, true); assert.deepEqual(cota.dado, { a: 1 });
  const H = fonteFalsa([F.resp(403, {}, {})]);
  await assert.rejects(H.fonte.api('/x'), /cota/);
});

/* ---------- modelo puro ---------- */
test('R-2 · modelo: oito sub-abas na ordem das fatias (Pipeline antes da Eficiência), todas com a leva e o que trazem; nenhuma pronta ainda', () => {
  const { modelo } = loadPainel();
  assert.deepEqual(modelo.SUBABAS.map(a => a.id), ['pipeline', 'eficiencia', 'roadmap', 'motor', 'qualidade', 'curso', 'skills', 'modelos']);
  for (const a of modelo.SUBABAS) { assert.match(a.leva, /^R-\d+$/); assert.ok(a.traz.length > 20); assert.ok(!a.pronta); }
  assert.deepEqual(modelo.SUBABAS.map(a => a.leva), ['R-4', 'R-5', 'R-6', 'R-7', 'R-8', 'R-9', 'R-10', 'R-11']);
});

test('R-2 · modelo: carimbo dos dados, idade e farol com limiar declarado', () => {
  const { modelo } = loadPainel();
  const agora = new Date(2026, 9, 13, 18, 40).getTime();
  assert.equal(modelo.carimbo(null, agora), 'sem dados ainda');
  assert.equal(modelo.carimbo(agora - 5 * 60000, agora), 'dados de hoje às 18:35');
  assert.equal(modelo.carimbo(new Date(2026, 9, 12, 9, 3).getTime(), agora), 'dados de 12/10 às 09:03');
  assert.equal(modelo.haQuanto(agora - 30000, agora), 'agora');
  assert.equal(modelo.haQuanto(agora - 7 * 60000, agora), 'há 7 min');
  assert.equal(modelo.haQuanto(agora - 3 * 3600000, agora), 'há 3 h');
  assert.equal(modelo.haQuanto(agora - 3 * 86400000, agora), 'há 3 dias');
  const L = modelo.LIMIARES;
  assert.equal(modelo.farol(30 * 60000, L.dadosHa), 'verde'); assert.equal(modelo.farol(5 * 3600000, L.dadosHa), 'amarelo'); assert.equal(modelo.farol(48 * 3600000, L.dadosHa), 'vermelho');
  assert.equal(modelo.farol(57, L.cotaGithub), 'verde'); assert.equal(modelo.farol(10, L.cotaGithub), 'amarelo'); assert.equal(modelo.farol(2, L.cotaGithub), 'vermelho');
  assert.equal(modelo.farol(null, L.cotaGithub), 'cinza');
  for (const l of Object.values(L)) assert.ok(l.texto, 'todo limiar tem o texto que a tela mostra');
});

test('R-2 · modelo: o resumo do main lê leva, assunto e data do último commit; lista vazia não vira resumo; estado da tela por sessão e erro', () => {
  const { modelo } = loadPainel();
  const r = modelo.resumoDoMain([{ sha: 'abc1234def', commit: { message: 'Leva G-264 · T6f-2 · Esqueci a senha (fatia 2 de 6)\n\nTrilha: geral', committer: { date: '2026-10-13T19:44:30Z' } } }]);
  assert.deepEqual(r, { sha: 'abc1234', leva: 'G-264', assunto: 'T6f-2 · Esqueci a senha (fatia 2 de 6)', em: Date.parse('2026-10-13T19:44:30Z') });
  assert.equal(modelo.resumoDoMain([]), null); assert.equal(modelo.resumoDoMain(null), null);
  assert.equal(modelo.estadoTela({}), 'entrar');
  assert.equal(modelo.estadoTela({ carregando: true }), 'carregando');
  assert.equal(modelo.estadoTela({ sessao: { uid: 'u' } }), 'pronto');
  assert.equal(modelo.estadoTela({ erro: 'nao-permitido' }), 'recusado');
  assert.equal(modelo.estadoTela({ erro: 'sem-rede' }), 'erro');
  assert.match(modelo.motivo('nao-permitido'), /só do dono/); assert.match(modelo.motivo('xyz'), /Tente de novo/);
});

test('R-2 · a lista de permitidos do painel é só o e-mail do dono, e a configuração pública é a mesma do app', () => {
  const { app } = loadPainel();
  assert.deepEqual(app.PERMITIDOS, ['gui.amuy@gmail.com']);
  assert.ok(INDEX.includes(app.GOOGLE_CLIENT_ID), 'o Client ID é o do app');
  assert.ok(INDEX.includes(app.FIREBASE_API_KEY), 'a chave web é a do app');
});
