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
  assert.deepEqual(linhas.filter(l => /:hover/.test(l) && !/@media \(hover: hover\)/.test(l) && !/^\s+\S/.test(l)), [], ':hover fora do @media (hover: hover)');
  const definidos = new Set([...cssPainel.matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)].map(m => m[1]));
  for (const m of script.matchAll(/['"`](--[a-zA-Z0-9-]+)['"`]/g)) definidos.add(m[1]); // atribuído pelo JS (ex.: --pn-largura)
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
test('R-2/R-18 · modelo: nove sub-abas na ordem das fatias (Pipeline antes da Eficiência; Jogo depois do Motor), todas com a leva e o que trazem; prontas: Pipeline (R-4), Eficiência (R-5), Roadmap (R-6), Motor (R-7), Jogo (R-18), Qualidade (R-8), Em curso (R-9), Skills (R-10) e Modelos (R-11): todas', () => {
  const { modelo, app } = loadPainel();
  assert.deepEqual(modelo.SUBABAS.map(a => a.id), ['pipeline', 'eficiencia', 'roadmap', 'motor', 'jogo', 'qualidade', 'curso', 'skills', 'modelos']);
  for (const a of modelo.SUBABAS) { assert.match(a.leva, /^R-\d+$/); assert.ok(a.traz.length > 20); assert.equal(!!a.pronta, true, a.id + ' pronta'); assert.equal(!!app.VISOES[a.id], !!a.pronta, 'toda sub-aba pronta tem a visão que a desenha'); }
  assert.deepEqual(modelo.SUBABAS.map(a => a.leva), ['R-4', 'R-5', 'R-6', 'R-7', 'R-18', 'R-8', 'R-9', 'R-10', 'R-11']);
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


/* ---------- R-4 · incremento 1: filtros em tudo ---------- */
test('R-4 · recorte(): cada dimensão filtra por valor ou lista; período usa a data; linha sem a dimensão passa e a dimensão volta em naoAplica; combinação vazia dá zero linhas', () => {
  const { modelo } = loadPainel();
  const agora = Date.parse('2026-10-13T20:00:00Z');
  const h = n => agora - n * 3600000;
  const linhas = [
    { id: 1, data: h(1), trilha: 'motor', skill: ['mtg-engine-architect'], situacao: 'publicada' },
    { id: 2, data: h(30), trilha: 'radar', skill: ['mtg-bi-specialist', 'mtg-app-design-architect'], situacao: 'na-fila' },
    { id: 3, data: h(200), trilha: 'motor', situacao: 'recusada' },
    { id: 4, trilha: 'geral', situacao: 'editando' }
  ];
  assert.deepEqual(modelo.recorte(linhas, {}, agora).linhas.map(l => l.id), [1, 2, 3, 4]);
  assert.deepEqual(modelo.recorte(linhas, { periodo: '24h' }, agora).linhas.map(l => l.id), [1, 4], 'linha sem data passa pelo período');
  assert.deepEqual(modelo.recorte(linhas, { periodo: '24h' }, agora).naoAplica, ['periodo']);
  assert.deepEqual(modelo.recorte(linhas, { periodo: '7d' }, agora).linhas.map(l => l.id), [1, 2, 4]);
  assert.deepEqual(modelo.recorte(linhas, { periodo: 'tudo' }, agora).linhas.length, 4);
  assert.deepEqual(modelo.recorte(linhas, { trilha: 'motor' }, agora).linhas.map(l => l.id), [1, 3]);
  const porSkill = modelo.recorte(linhas, { skill: 'mtg-bi-specialist' }, agora);
  assert.deepEqual(porSkill.linhas.map(l => l.id), [2, 3, 4], 'lista contém o valor; linhas sem skill passam');
  assert.deepEqual(porSkill.naoAplica, ['skill']);
  assert.deepEqual(modelo.recorte(linhas, { trilha: 'motor', situacao: 'na-fila' }, agora).linhas, [], 'combinação vazia dá vazio, não zero inventado');
  assert.deepEqual(modelo.recorte(linhas, { cor: 'azul', periodo: '' }, agora).linhas.length, 4, 'dimensão desconhecida ou vazia é ignorada');
  assert.equal(modelo.recorte(linhas, { trilha: 'motor' }, agora).total, 4, 'o total sem filtro vem junto');
});

test('R-4 · o filtro vive no endereço: #aba?periodo=7d&trilha=motor vai e volta; valores fora das dimensões caem; período "tudo" não vai para a URL', () => {
  const { modelo } = loadPainel();
  assert.deepEqual(modelo.filtrosDaUrl('#pipeline?periodo=7d&trilha=motor&cor=azul&conversa=radar%20%C2%B7%2013%2F10'), { aba: 'pipeline', filtros: { periodo: '7d', trilha: 'motor', conversa: 'radar · 13/10' } });
  assert.deepEqual(modelo.filtrosDaUrl(''), { aba: null, filtros: {} });
  assert.deepEqual(modelo.filtrosDaUrl('#motor'), { aba: 'motor', filtros: {} });
  assert.equal(modelo.urlDosFiltros('pipeline', { periodo: '7d', trilha: 'motor', vazio: '', cor: 'x' }), '#pipeline?periodo=7d&trilha=motor');
  assert.equal(modelo.urlDosFiltros('pipeline', { periodo: 'tudo' }), '#pipeline');
  assert.equal(modelo.fraseDoRecorte({ periodo: '7d', trilha: 'motor' }), '7 dias · trilha motor');
  assert.equal(modelo.fraseDoRecorte({}), '7 dias');
  assert.deepEqual(modelo.valoresDe([{ t: 'a' }, { t: 'b' }, { t: 'a' }, { t: ['c', 'a'] }, {}], 't'), [{ valor: 'a', n: 3 }, { valor: 'b', n: 1 }, { valor: 'c', n: 1 }]);
});

/* ---------- R-4 · Pipeline ---------- */
test('R-4 · Pipeline: leva e trilha pelo nome do ramo; o motivo da recusa é lido da mensagem que a fila escreve (conflito com arquivos, guarda, conferência, portão vermelho com os testes)', () => {
  const { modelo } = loadPainel();
  assert.deepEqual(modelo.levaDoRamo('fila/M-351'), { tipo: 'fila', leva: 'M-351', trilha: 'motor' });
  assert.deepEqual(modelo.levaDoRamo('recusada/R-2'), { tipo: 'recusada', leva: 'R-2', trilha: 'radar' });
  assert.equal(modelo.levaDoRamo('main'), null); assert.equal(modelo.levaDoRamo('acumulado/bot-b16'), null);
  assert.equal(modelo.trilhaDaLeva('X-1'), null);
  const c = modelo.motivoDaRecusa('RECUSADA pela fila · M-351\n\nCONFLITO ao pôr "Leva M-349 · LT31" sobre o main somado a M-350, em: index.html, ROADMAP.md.\n\nO main não mudou. Corrija no seu clone e envie de novo: npm run publicar');
  assert.deepEqual(c, { classe: 'conflito', rotulo: 'conflito', detalhe: 'index.html, ROADMAP.md', arquivos: ['index.html', 'ROADMAP.md'] });
  assert.equal(modelo.motivoDaRecusa('RECUSADA pela fila · G-1\n\nGUARDA DE AGREGAÇÃO: 2 achado(s).\n- linha sumida').classe, 'guarda');
  assert.equal(modelo.motivoDaRecusa('RECUSADA pela fila · G-1\n\nCONFERÊNCIA ANTES DO PORTÃO: 1 achado(s).\nid repetido').rotulo, 'conferência antes do portão');
  const p = modelo.motivoDaRecusa('RECUSADA pela fila · T-9\n\nPORTÃO VERMELHO com esta leva sozinha sobre o main (abc1234).\nTestes que caíram (2):\n- e2e · P-12 silenciar\n- tipos.sagas.unit · capítulo 3\n\nO main não mudou.');
  assert.equal(p.classe, 'portao'); assert.deepEqual(p.testes, ['e2e · P-12 silenciar', 'tipos.sagas.unit · capítulo 3']); assert.match(p.detalhe, /2 teste\(s\)/);
  assert.equal(modelo.motivoDaRecusa('sei lá').classe, 'outro');
});

test('R-4 · Pipeline: ramos + detalhes viram linhas da fila (espera, posição por data, recusa com motivo; sem detalhe a linha fica sem data); rodadas viram linhas com portão e duração; levas da telemetria ganham data e reprocessando', () => {
  const { modelo } = loadPainel();
  const agora = Date.parse('2026-10-13T20:00:00Z');
  const ramos = [{ name: 'main', commit: { sha: 'm' } }, { name: 'fila/T-62', commit: { sha: 'aaaa111' } }, { name: 'fila/R-2', commit: { sha: 'bbbb222' } }, { name: 'recusada/M-351', commit: { sha: 'cccc333' } }, { name: 'fila/H-12', commit: { sha: 'dddd444' } }];
  const det = { aaaa111: { commit: { message: 'Leva T-62', committer: { date: '2026-10-13T19:00:00Z' } } }, bbbb222: { commit: { message: 'Leva R-2', committer: { date: '2026-10-13T19:30:00Z' } } }, cccc333: { commit: { message: 'RECUSADA pela fila · M-351\n\nCONFLITO ao pôr "x" sobre o main, em: index.html.\n', committer: { date: '2026-10-13T12:00:00Z' } } } };
  const linhas = modelo.linhasDaFila(ramos, det, agora);
  assert.deepEqual(linhas.map(l => l.leva), ['M-351', 'T-62', 'R-2', 'H-12'], 'por data; sem detalhe vai para o fim');
  assert.equal(linhas[1].espera, 3600000); assert.equal(linhas[1].situacao, 'na-fila'); assert.equal(linhas[1].trilha, 'tipos');
  assert.equal(linhas[0].motivo.classe, 'conflito'); assert.equal(linhas[0].situacao, 'recusada');
  assert.equal(linhas[3].data, null); assert.equal(linhas[3].detalhe, false);
  const rod = modelo.linhasDasRodadas([
    { id: 1, status: 'completed', conclusion: 'success', run_started_at: '2026-10-13T18:00:00Z', updated_at: '2026-10-13T18:20:00Z', display_title: 'Fila' },
    { id: 2, status: 'completed', conclusion: 'failure', run_started_at: '2026-10-13T19:00:00Z', updated_at: '2026-10-13T19:30:00Z' },
    { id: 3, status: 'in_progress', run_started_at: '2026-10-13T19:50:00Z', updated_at: '2026-10-13T19:55:00Z' },
    { id: 4, status: 'completed', conclusion: 'cancelled', run_started_at: '2026-10-13T17:00:00Z', updated_at: '2026-10-13T17:01:00Z' }]);
  assert.deepEqual(rod.map(r => [r.id, r.portao, r.duracao]), [[3, 'em-curso', null], [2, 'vermelho', 1800000], [1, 'verde', 1200000], [4, 'cancelada', 60000]]);
  assert.equal(modelo.mediana([1200000, 1800000]), 1500000); assert.equal(modelo.p95([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]), 10); assert.equal(modelo.mediana([]), null);
  assert.equal(modelo.minutos(1500000), '25 min'); assert.equal(modelo.minutos(5400000), '1,5 h'); assert.equal(modelo.minutos(3600000), '1 h'); assert.equal(modelo.minutos(20000), '20 s'); assert.equal(modelo.minutos(null), '—');
  const levas = modelo.linhasDasLevas([{ id: 'R-1', trilha: 'radar', situacao: 'na-fila', inicio: '2026-10-13T18:00:00Z', fim: '2026-10-13T18:30:00Z', skills: ['a'] }, { id: 'M-351', trilha: 'motor', situacao: 'recusada', em: '2026-10-13T12:00:00Z', tentativas_fila: 2 }]);
  assert.equal(levas[0].data, Date.parse('2026-10-13T18:30:00Z')); assert.deepEqual(levas[0].skill, ['a']); assert.equal(levas[0].reprocessando, false);
  assert.equal(levas[1].reprocessando, true);
  assert.deepEqual(modelo.porDia([{ data: Date.parse('2026-10-13T12:00:00Z') }, { data: Date.parse('2026-10-13T20:00:00Z') }, { data: Date.parse('2026-10-12T12:00:00Z') }]).map(d => [d.dia, d.itens.length]), [['2026-10-12', 1], ['2026-10-13', 2]]);
});

test('R-4 · orçamento de pedidos da Pipeline: primeira abertura ≤ 4 fixos + ≤ 4 detalhes; a atualização seguinte ≤ 4 (detalhes guardados por sha para sempre); o raw da telemetria não entra na cota', async () => {
  const { app, base, modelo } = loadPainel();
  const guarda = base.createGuarda(null);
  const chamadas = [];
  const corpo = url => {
    if (/\/branches\?/.test(url)) return Array.from({ length: 7 }, (_, i) => ({ name: `fila/M-${300 + i}`, commit: { sha: `sha${i}sha${i}` } }));
    if (/\/branches\//.test(url)) return { commit: { message: 'Leva', committer: { date: '2026-10-13T19:00:00Z' } } };
    if (/fila\.yml\/runs/.test(url)) return { workflow_runs: [{ id: 9, status: 'in_progress', run_started_at: '2026-10-13T19:50:00Z', updated_at: '2026-10-13T19:55:00Z' }, { id: 8, status: 'completed', conclusion: 'success', run_started_at: '2026-10-13T18:00:00Z', updated_at: '2026-10-13T18:20:00Z' }] };
    if (/\/jobs/.test(url)) return { jobs: [{ name: 'portao', status: 'in_progress' }] };
    if (/actions\/runs\?/.test(url)) return { workflow_runs: [{ name: 'pages build and deployment', conclusion: 'success', updated_at: '2026-10-13T18:25:00Z' }] };
    if (/commits\?sha=main/.test(url)) return [{ sha: 'aaaa111', commit: { message: 'Leva M-301 · x\n\nTrilha: motor', committer: { date: '2026-10-13T19:20:00Z' }, author: { date: '2026-10-13T18:00:00Z' } } }];
    return null;
  };
  const fetch = async url => { chamadas.push(url); const texto = /raw\.githubusercontent/.test(url); return { ok: true, status: 200, headers: { get: n => n === 'etag' ? '"e"' : null }, json: async () => corpo(url), text: async () => '{"id":"R-1","trilha":"radar","conversa":"c","situacao":"na-fila","fim":"2026-10-13T18:30:00Z"}\n' }; };
  const fonte = base.createFonte({ fetch, guarda });
  // R-16 · a faixa lê os 100 commits do main antes de toda sub-aba (mesmo nome de cache): a Pipeline reaproveita sem pedido novo
  await fonte.api(modelo.MAIN_URL, { nome: 'main', transforma: modelo.compactaCommits }); fonte.zerar(); chamadas.length = 0;
  const d1 = await app.VISOES.pipeline.carrega(fonte, false);
  const api1 = chamadas.filter(u => u.startsWith(base.API)).length, raw1 = chamadas.filter(u => u.startsWith(base.RAW)).length;
  assert.equal(raw1, 1);
  assert.equal(fonte.pedidos, api1);
  assert.ok(api1 <= app.ORCAMENTO.fixos + app.ORCAMENTO.detalhes, `primeira abertura: ${api1} pedidos`);
  assert.equal(Object.keys(d1.detalhes).length, 4, 'só 4 detalhes por atualização');
  assert.match(d1.avisos.join(' '), /orçamento/);
  // segunda atualização: fixos de novo (forçar) + os 3 detalhes que faltavam; terceira: só os fixos
  fonte.zerar(); chamadas.length = 0;
  await app.VISOES.pipeline.carrega(fonte, true);
  assert.ok(fonte.pedidos <= app.ORCAMENTO.fixos + 3, `segunda: ${fonte.pedidos}`);
  fonte.zerar(); chamadas.length = 0;
  const d3 = await app.VISOES.pipeline.carrega(fonte, true);
  assert.ok(fonte.pedidos <= app.ORCAMENTO.fixos, `em regime: ${fonte.pedidos} pedidos (≤ ${app.ORCAMENTO.fixos})`);
  assert.equal(Object.keys(d3.detalhes).length, 7); assert.equal(d3.levas.length, 1); assert.equal(d3.emCurso.id, 9); assert.equal(d3.jobs.jobs[0].name, 'portao'); assert.match(d3.pages.name, /pages/);
});


/* ---------- R-5 · Eficiência ---------- */
test('R-5 · Eficiência: commits do main viram levas (trilha pela letra, data do committer = quando a fila avançou); intervalos entre publicações; dias do período; semanas', () => {
  const { modelo } = loadPainel();
  const c = (leva, data, autoria) => ({ sha: 'abcdef0123', commit: { message: `Leva ${leva} · assunto\n\nTrilha: x`, committer: { date: data }, author: { date: autoria || data } } });
  const linhas = modelo.linhasDosCommits([c('M-390', '2026-10-13T20:00:00Z', '2026-10-13T18:00:00Z'), { sha: 'x', commit: { message: 'merge sem leva', committer: { date: '2026-10-13T19:00:00Z' } } }, c('R-2', '2026-10-13T19:30:00Z'), c('G-266', '2026-10-13T18:00:00Z')]);
  assert.deepEqual(linhas.map(l => [l.leva, l.trilha]), [['G-266', 'geral'], ['R-2', 'radar'], ['M-390', 'motor']], 'ordem por data; commit sem "Leva" fica de fora');
  assert.equal(linhas[2].autoria, Date.parse('2026-10-13T18:00:00Z')); assert.equal(linhas[2].situacao, 'publicada');
  assert.deepEqual(modelo.intervalos(linhas), [90 * 60000, 30 * 60000]);
  assert.deepEqual(modelo.intervalos([]), []);
  const agora = new Date(2026, 9, 13, 20, 0).getTime();
  assert.deepEqual(modelo.diasDoPeriodo('24h', agora), ['2026-10-13', '2026-10-12']);
  assert.equal(modelo.diasDoPeriodo('7d', agora).length, 7); assert.equal(modelo.diasDoPeriodo('7d', agora)[6], '2026-10-07');
  assert.equal(modelo.diasDoPeriodo('30d', agora).length, 30); assert.equal(modelo.diasDoPeriodo('tudo', agora).length, 30, '"tudo" é limitado a 30 dias por orçamento');
  const sem = modelo.porSemana([{ data: new Date(2026, 9, 13).getTime() }, { data: new Date(2026, 9, 12).getTime() }, { data: new Date(2026, 9, 11).getTime() }]);
  assert.deepEqual(sem.map(x => [x.semana, x.itens.length]), [['2026-10-05', 1], ['2026-10-12', 2]], 'semana começa na segunda');
});

test('R-5 · orçamento da Eficiência: um pedido por dia do período, dias passados guardados para sempre, hoje volta a cada atualização; "tudo" lê no máximo 4 dias novos por vez e avisa; em regime ≤ 4 pedidos', async () => {
  const { app, base } = loadPainel();
  const guarda = base.createGuarda(null);
  const chamadas = [];
  const fetch = async url => { chamadas.push(url); return { ok: true, status: 200, headers: { get: () => null }, json: async () => /commits\?/.test(url) ? [{ sha: 'a', commit: { message: 'Leva M-1 · x', committer: { date: '2026-10-13T12:00:00Z' } } }] : { workflow_runs: [] }, text: async () => '' }; };
  const fonte = base.createFonte({ fetch, guarda });
  const d = await app.VISOES.eficiencia.carrega(fonte, false, { periodo: '7d' });
  assert.ok(fonte.pedidos <= app.ORCAMENTO.fixos + app.ORCAMENTO.detalhes, `7 dias na primeira abertura: ${fonte.pedidos}`);
  assert.equal(Object.keys(d.commits).length, 5, 'hoje + 4 dias novos; 2 pendentes'); assert.equal(d.pendentes.length, 2); assert.match(d.avisos.join(' '), /não lidos/);
  fonte.zerar(); const d2 = await app.VISOES.eficiencia.carrega(fonte, true, { periodo: '7d' });
  assert.equal(Object.keys(d2.commits).length, 7); assert.ok(fonte.pedidos <= 1 + 2 + 1, `segunda: ${fonte.pedidos}`);
  fonte.zerar(); const d3 = await app.VISOES.eficiencia.carrega(fonte, true, { periodo: '7d' });
  assert.equal(Object.keys(d3.commits).length, 7); assert.ok(fonte.pedidos <= app.ORCAMENTO.fixos, `em regime: ${fonte.pedidos} (hoje + rodadas)`);
  fonte.zerar(); const d4 = await app.VISOES.eficiencia.carrega(fonte, false, { periodo: 'tudo' });
  assert.match(d4.avisos.join(' '), /30 dias/); assert.ok(fonte.pedidos <= app.ORCAMENTO.fixos + app.ORCAMENTO.detalhes);
  assert.equal(chamadas.filter(u => /raw\.githubusercontent/.test(u)).length, 3, 'a telemetria é lida pelo raw (fora da cota): sem cache, e nas duas atualizações forçadas; a quarta vem do cache');
});


/* ---------- R-6 · Roadmap ---------- */
test('R-6 · parseRoadmap: linhas da ordem (id, status, épico, leva, trilha) e histórias da seção 7 com épico, status, data e leva; o arquivo real do repositório lê com folga', () => {
  const { modelo } = loadPainel();
  const fx = [
    '## 6. Ordem por dependência técnica', '', '| Ordem | História | Épico | Rodadas | Observação |', '|---|---|---|---|---|',
    '| 1º ✅ | U1 tema em dois estados (leva 82) | E43 | 1 | — |',
    '| 16º-rb ✅ | BI1-1 entrar no painel: `painel.html` (leva R-2) | BI | 1 | — |',
    '| 16º-rl | BI1-2b Pipeline + filtros | BI | 1 a 2 | 16º-rb |',
    '| 16º-ab 🟡 | GW Bogles carta a carta (leva 139) | R5 | 1 | teste no aparelho |',
    '', '## 7. Épicos e histórias', '', '### Q · Qualidade', '',
    '**Q17 · Fila com portão no CI** ✅ (leva I-282, 11/10/2026)', '- **Valor:** x', '',
    '**Q22 · Portão leve** (ainda não)', '',
    '## Trilha radar · Painel Estante (BI)', '',
    '**BI1 · Painel Estante** 🟡 planejado (leva R-1, 13/10/2026)', '',
    '**BI1-1 · Entrar no painel** ✅ (leva R-2, 13/10/2026)', ''
  ].join('\n');
  const r = modelo.parseRoadmap(fx);
  assert.deepEqual(r.ordem.map(l => [l.id, l.situacao, l.epico, l.leva, l.trilha]), [['1º', 'entregue', 'E43', '82', null], ['16º-rb', 'entregue', 'BI', 'R-2', 'radar'], ['16º-rl', 'planejada', 'BI', null, null], ['16º-ab', 'parcial', 'R5', '139', null]]);
  assert.deepEqual(r.historias.map(x => [x.id, x.situacao, x.epico, x.leva, x.data && new Date(x.data).toISOString().slice(0, 10)]), [['Q17', 'entregue', 'Q', 'I-282', '2026-10-11'], ['Q22', 'planejada', 'Q', null, null], ['BI1', 'parcial', 'BI', 'R-1', '2026-10-13'], ['BI1-1', 'entregue', 'BI', 'R-2', '2026-10-13']], 'a sigla entre parênteses do título da trilha casa com a coluna Épico da ordem');
  const real = modelo.parseRoadmap(readFileSync(join(ROOT, 'ROADMAP.md'), 'utf8'));
  assert.ok(real.ordem.length >= 150, `ordem: ${real.ordem.length} linhas`); assert.ok(real.historias.length >= 500, `histórias: ${real.historias.length}`);
  assert.ok(real.ordem.some(l => l.id === '16º-rb' && l.situacao === 'entregue' && l.leva === 'R-2'));
  assert.ok(real.historias.filter(x => x.data).length >= 100, 'histórias datadas para o burn-up');
});

test('R-6 · a fonte transforma o texto antes de guardar: o cache do ROADMAP guarda só o resumo, não o arquivo', async () => {
  const { base, modelo } = loadPainel();
  const guarda = base.createGuarda(null);
  const fetch = async () => ({ ok: true, status: 200, headers: { get: () => null }, text: async () => '| 16º-rb ✅ | x (leva R-2) | BI | 1 | — |\n' });
  const fonte = base.createFonte({ fetch, guarda });
  const r = await fonte.raw('main', 'ROADMAP.md', { nome: 'roadmap', transforma: modelo.parseRoadmap });
  assert.equal(r.dado.ordem.length, 1); assert.equal(fonte.brutos, 1); assert.equal(fonte.pedidos, 0, 'raw não conta na cota da API');
  assert.equal(guarda.ler('painel.cache.roadmap').dado.ordem[0].id, '16º-rb');
  assert.equal(typeof guarda.ler('painel.cache.roadmap').dado, 'object');
});


/* ---------- R-7 · Motor ---------- */
test('R-7 · resumoDoMapa: contagem por status e por seção da CR; aplicáveis = coberta + parcial + ausente; o mapa real do repositório lê com folga; placares viram linhas por data', () => {
  const { modelo } = loadPainel();
  const r = modelo.resumoDoMapa({ motor: 109, cr: '2026-09-25', auditoria: '2026-10-06', itens: [{ n: '100.1', status: 'coberta' }, { n: '100.6', status: 'fora' }, { n: '702.9', status: 'parcial' }, { n: '702.10', status: 'ausente' }, { n: '708.1', status: 'definicao' }, { n: '702.11', status: 'coberta' }] });
  assert.equal(r.total, 6); assert.deepEqual(r.porStatus, { coberta: 2, fora: 1, parcial: 1, ausente: 1, definicao: 1 }); assert.equal(r.aplicaveis, 4);
  assert.deepEqual(r.secoes.map(s => [s.secao, s.nome, s.coberta, s.parcial, s.ausente]), [[1, 'Conceitos do jogo', 1, 0, 0], [7, 'Regras adicionais', 1, 1, 1]]);
  assert.equal(r.motor, 109);
  const real = modelo.resumoDoMapa(JSON.parse(readFileSync(join(ROOT, '.regras', 'mapa.json'), 'utf8')));
  assert.ok(real.total >= 1000 && real.porStatus.coberta >= 300 && real.secoes.length === 9, `mapa real: ${real.total} itens, ${real.porStatus.coberta} cobertas, ${real.secoes.length} seções`);
  const pl = modelo.linhasDosPlacares([{ trilha: 'homologacao', motor: 112, formato: 'pauper', listas_total: 341, listas_jogam: 272, em: '2026-10-13T23:00:00Z' }, { trilha: 'tipos', motor: 112, regras_cobertas: 382, em: '2026-10-13T20:25:00Z' }]);
  assert.deepEqual(pl.map(p => p.trilha), ['tipos', 'homologacao']); assert.equal(pl[1].data, Date.parse('2026-10-13T23:00:00Z'));
});


/* ---------- R-8 · Qualidade ---------- */
test('R-8 · linhasDosRelatos: a tabela do ramo relatos vira linhas com data, resolvido, situação, tipo, urgência, área e tempo até a correção; área, tipo e urgência são dimensões de filtro', () => {
  const { modelo } = loadPainel();
  const r = modelo.linhasDosRelatos({ versao: 1, relatos: [
    { numero: 18, situacao: 'aberto', tipo: 'infra', tipoRotulo: 'Infraestrutura', urgencia: 'bloqueia', urgenciaRotulo: 'Impede o uso', area: 'Início', criadoEm: '2026-10-13T01:20:28Z', resolvidoEm: null, motor: 110, descricao: 'Precisamos ter um sistema de criação de conta' },
    { numero: 20, situacao: 'resolvido', tipoRotulo: 'Erro', urgenciaRotulo: 'Alta', area: 'Mesa', criadoEm: '2026-10-13T04:38:26Z', resolvidoEm: '2026-10-13T16:01:46Z', motor: 112, titulo: 'Fichas de tesouro' }] });
  assert.deepEqual(r.map(x => [x.numero, x.situacao, x.tipo, x.urgencia, x.area]), [[20, 'resolvido', 'Erro', 'Alta', 'Mesa'], [18, 'aberto', 'Infraestrutura', 'Impede o uso', 'Início']]);
  assert.equal(r[0].duracao, Date.parse('2026-10-13T16:01:46Z') - Date.parse('2026-10-13T04:38:26Z')); assert.equal(r[1].duracao, null);
  assert.equal(r[1].titulo, 'Precisamos ter um sistema de criação de conta');
  assert.deepEqual(modelo.linhasDosRelatos(null), []); assert.equal(modelo.linhasDosRelatos([{ numero: 1, criadoEm: '2026-10-01T00:00:00Z' }]).length, 1);
  for (const dim of ['area', 'tipo', 'urgencia']) assert.ok(modelo.DIMENSOES.includes(dim), dim);
  assert.deepEqual(modelo.recorte(r, { area: 'Mesa' }).linhas.map(x => x.numero), [20]);
});


/* ---------- R-9 · Trabalho em curso ---------- */
test('R-9 · linhasDasTrilhas: espelho do check-in com idade; editando sem atualização há 48 h vira parada; ordem pela atualização', () => {
  const { modelo } = loadPainel();
  const agora = Date.parse('2026-10-14T00:00:00Z');
  const r = modelo.linhasDasTrilhas([
    { conversa: 'a', trilha: 'motor', situacao: 'editando', atualizado: '2026-10-13T22:00:00Z' },
    { conversa: 'b', trilha: 'listas', situacao: 'editando', atualizado: '2026-10-11T10:00:00Z' },
    { conversa: 'c', trilha: 'geral', situacao: 'na-fila', atualizado: '2026-10-13T23:00:00Z' },
    { conversa: 'd', trilha: 'tipos', situacao: 'parada', atualizado: '2026-10-13T23:30:00Z' }], agora);
  assert.deepEqual(r.map(t => [t.conversa, t.situacaoEfetiva]), [['d', 'parada'], ['c', 'na-fila'], ['a', 'editando'], ['b', 'parada']]);
  assert.equal(r[2].idade, 2 * 3600000);
  assert.deepEqual(modelo.linhasDasTrilhas(null), []);
});


/* ---------- R-10 · Skills & rotinas ---------- */
test('R-10 · fluxos: o yml dá nome, crons e gatilhos; o cron vira frase; a lista da API + últimas execuções viram linhas por fluxo; rotinas atrasadas', () => {
  const { modelo } = loadPainel();
  const r = modelo.resumoDoFluxo("name: Notícias\n\non:\n  schedule:\n    - cron: '17 * * * *'   # de hora em hora\n  workflow_dispatch:\n", 'noticias.yml');
  assert.deepEqual(r, { caminho: 'noticias.yml', nome: 'Notícias', crons: ['17 * * * *'], gatilhos: ['workflow_dispatch', 'schedule'] });
  assert.equal(modelo.fraseDoCron('17 * * * *'), 'de hora em hora (minuto 17)');
  assert.equal(modelo.fraseDoCron('*/10 * * * *'), 'a cada 10 min');
  assert.equal(modelo.fraseDoCron('23 6 * * *'), 'todo dia às 06:23 UTC (03:23 em Brasília)');
  assert.equal(modelo.fraseDoCron('0 */4 * * *'), 'a cada 4 h');
  assert.equal(modelo.fraseDoCron('52 8 * * 1-5'), 'seg a sex às 08:52 UTC');
  assert.equal(modelo.fraseDoCron('x'), 'x');
  const fluxos = modelo.linhasDosFluxos([{ id: 1, name: 'Fila de publicação', path: '.github/workflows/fila.yml', state: 'active' }, { id: 2, name: 'Notícias', path: '.github/workflows/noticias.yml', state: 'active' }],
    [{ workflow_id: 2, status: 'completed', conclusion: 'failure', run_started_at: '2026-10-13T20:00:00Z', updated_at: '2026-10-13T20:05:00Z' }, { workflow_id: 2, status: 'completed', conclusion: 'success', run_started_at: '2026-10-13T19:00:00Z', updated_at: '2026-10-13T19:05:00Z' }],
    { 'noticias.yml': r, 'fila.yml': { caminho: 'fila.yml', nome: 'Fila de publicação', crons: [], gatilhos: ['workflow_dispatch', 'push'] } });
  assert.deepEqual(fluxos.map(f => [f.nome, f.agendamento, f.conclusao, f.portao]), [['Notícias', 'de hora em hora (minuto 17)', 'failure', 'vermelho'], ['Fila de publicação', 'push', null, null]]);
  assert.equal(fluxos[0].ultima, Date.parse('2026-10-13T20:05:00Z'), 'a execução mais recente de cada fluxo');
  const rot = modelo.linhasDasRotinas([{ id: 'a', nome: 'x', quando: '2026-10-13T21:51:00Z', status: 'agendada', atualizado: '2026-10-13T21:05:00Z' }, { id: 'b', nome: 'y', quando: '2026-10-14T21:51:00Z', status: 'agendada', atualizado: '2026-10-13T22:00:00Z' }], Date.parse('2026-10-13T23:00:00Z'));
  assert.deepEqual(rot.map(x => [x.id, x.atrasada]), [['b', false], ['a', true]]);
  for (const f of ['catalogo.yml', 'fila.yml', 'gate.yml', 'noticias.yml', 'relatos-fila.yml', 'relatos.yml']) { const x = modelo.resumoDoFluxo(readFileSync(join(ROOT, '.github', 'workflows', f), 'utf8'), f); assert.ok(x.nome && x.gatilhos.length, f); }
});


/* ---------- R-11 · Modelos ---------- */
test('R-11 · porModelo: levas, tempo mediano, portão verde na primeira (só das que registraram portão; reenvio não conta como verde), tokens e bugs por modelo', () => {
  const { modelo } = loadPainel();
  const r = modelo.porModelo(modelo.linhasDasLevas([
    { id: 'R-2', modelo: 'Fable 5.1', inicio: '2026-10-13T21:55:00Z', fim: '2026-10-13T22:35:00Z', portao: 'verde', tokens_estimados: 90000, bugs_achados: 0 },
    { id: 'R-3', modelo: 'Fable 5.1', inicio: '2026-10-13T22:40:00Z', fim: '2026-10-13T23:40:00Z', portao: 'verde', tentativas_fila: 2 },
    { id: 'M-390', modelo: 'Opus 5.5', fim: '2026-10-13T20:00:00Z', portao: 'vermelho', bugs_achados: 2 },
    { id: 'X-1', inicio: '2026-10-13T20:00:00Z', fim: '2026-10-13T20:10:00Z' }]));
  assert.deepEqual(r.map(m => [m.modelo, m.levas, m.tempoMediano, m.pctVerde, m.tokens, m.bugs]), [['Fable 5.1', 2, 50 * 60000, 50, 90000, 0], ['Opus 5.5', 1, null, 0, 0, 2], ['sem modelo', 1, 10 * 60000, null, 0, 0]]);
});

/* ---------- R-11b · plano no banco ---------- */
function planoFalso({ respostas = [], dbUrl = 'https://db.exemplo', token = async () => 'tok', uid = () => 'uidDono', guarda } = {}) {
  const { base } = loadPainel();
  const g = guarda || base.createGuarda(null);
  const pedidos = [];
  const fetch = async (url, opts = {}) => {
    pedidos.push({ url, method: opts.method || 'GET', body: opts.body ? JSON.parse(opts.body) : null });
    const r = respostas.shift();
    if (!r) throw new TypeError('sem rede');
    if (typeof r === 'function') return r(pedidos[pedidos.length - 1]);
    return r;
  };
  const resp = (status, json) => ({ ok: status >= 200 && status < 300, status, json: async () => json });
  return { plano: base.createPlano({ fetch, dbUrl, token, uid, guarda: g }), guarda: g, pedidos, resp };
}

test('R-11b · plano no banco: gravar faz PUT em /painel/<uid>/plano.json?auth=<token>, só diz "no banco" depois de ler de volta o mesmo registro; o aparelho guarda a cópia com a origem', async () => {
  const F = planoFalso({ respostas: [p => ({ ok: true, status: 200, json: async () => p.body })] });
  const p = { kind: 'estante.painel.plano', version: 1, atualizadoEm: 5, nome: 'Max 5x', consumoPct: 82, renovaEm: '2026-11-01' };
  assert.deepEqual(await F.plano.gravar(p), { onde: 'banco', motivo: null });
  assert.equal(F.pedidos[0].url, 'https://db.exemplo/painel/uidDono/plano.json?auth=tok');
  assert.equal(F.pedidos[0].method, 'PUT'); assert.deepEqual(F.pedidos[0].body, p);
  assert.deepEqual(F.guarda.ler('painel.plano'), { ...p, origem: 'banco' });
  // o banco devolveu outra coisa: não é "no banco"
  const G = planoFalso({ respostas: [{ ok: true, status: 200, json: async () => ({ ...p, consumoPct: 10 }) }] });
  assert.deepEqual(await G.plano.gravar(p), { onde: 'aparelho', motivo: 'conferencia' });
  assert.equal(G.guarda.ler('painel.plano').pendente, true);
});

test('R-11b · plano no banco: sem rede, recusa (401) ou banco fora, o plano fica no aparelho marcado pendente e o motivo é nomeado; sem banco configurado, só o aparelho', async () => {
  const A = planoFalso({ respostas: [] });
  const p = { kind: 'estante.painel.plano', version: 1, atualizadoEm: 7, nome: 'Pro' };
  assert.deepEqual(await A.plano.gravar(p), { onde: 'aparelho', motivo: 'sem-rede' });
  assert.deepEqual(A.guarda.ler('painel.plano'), { ...p, pendente: true });
  const B = planoFalso({ respostas: [{ ok: false, status: 401, json: async () => ({ error: 'Permission denied' }) }] });
  assert.deepEqual(await B.plano.gravar(p), { onde: 'aparelho', motivo: 'recusado' });
  const C = planoFalso({ respostas: [{ ok: false, status: 503, json: async () => null }] });
  assert.deepEqual(await C.plano.gravar(p), { onde: 'aparelho', motivo: 'fora' });
  const D = planoFalso({ dbUrl: '' });
  assert.deepEqual(await D.plano.gravar(p), { onde: 'aparelho', motivo: 'sem-banco' });
  assert.deepEqual(D.guarda.ler('painel.plano'), { ...p, pendente: false });
  assert.equal(D.pedidos.length, 0, 'sem banco não há pedido');
  const E = planoFalso({ uid: () => null });
  assert.deepEqual(await E.plano.gravar(p), { onde: 'aparelho', motivo: 'sem-sessao' });
});

test('R-11b · plano no banco: ler traz o do banco e guarda no aparelho; o mais novo vence (aparelho pendente mais novo fica); banco vazio diz vazio; recusa e sem rede devolvem o do aparelho', async () => {
  const p = { kind: 'estante.painel.plano', version: 1, atualizadoEm: 10, nome: 'Max 20x', consumoPct: 40 };
  const A = planoFalso({ respostas: [{ ok: true, status: 200, json: async () => p }] });
  assert.deepEqual(await A.plano.ler(), { plano: { ...p, origem: 'banco' }, onde: 'banco', motivo: null });
  assert.equal(A.pedidos[0].method, 'GET');
  assert.deepEqual(A.guarda.ler('painel.plano'), { ...p, origem: 'banco' });
  // aparelho com registro pendente mais novo: fica o do aparelho
  const B = planoFalso({ respostas: [{ ok: true, status: 200, json: async () => p }] });
  B.guarda.gravar('painel.plano', { ...p, atualizadoEm: 11, consumoPct: 55, pendente: true });
  const rb = await B.plano.ler(); assert.equal(rb.onde, 'aparelho'); assert.equal(rb.motivo, 'pendente'); assert.equal(rb.plano.consumoPct, 55);
  // banco vazio e aparelho com valor antigo (de antes da R-11b): aparelho, motivo vazio
  const C = planoFalso({ respostas: [{ ok: true, status: 200, json: async () => null }] });
  C.guarda.gravar('painel.plano', p);
  assert.deepEqual(await C.plano.ler(), { plano: p, onde: 'aparelho', motivo: 'vazio' });
  // banco vazio e aparelho vazio
  const D = planoFalso({ respostas: [{ ok: true, status: 200, json: async () => null }] });
  assert.deepEqual(await D.plano.ler(), { plano: null, onde: 'banco', motivo: 'vazio' });
  // recusa e sem rede
  const E = planoFalso({ respostas: [{ ok: false, status: 401, json: async () => null }] }); E.guarda.gravar('painel.plano', p);
  assert.deepEqual(await E.plano.ler(), { plano: p, onde: 'aparelho', motivo: 'recusado' });
  const F = planoFalso({ respostas: [] }); F.guarda.gravar('painel.plano', p);
  assert.deepEqual(await F.plano.ler(), { plano: p, onde: 'aparelho', motivo: 'sem-rede' });
});

test('R-11b · o painel lê e grava o plano no banco do app (mesma URL do index.html) e a política de conteúdo já autoriza o banco', () => {
  const { app } = loadPainel();
  assert.match(app.FIREBASE_DB_URL, /^https:\/\/estante-10102026-default-rtdb\.firebaseio\.com$/);
  assert.ok(INDEX.includes(app.FIREBASE_DB_URL), 'a URL do banco é a mesma do app');
  assert.match(PAINEL, /connect-src[^"]*https:\/\/\*\.firebaseio\.com/);
  assert.equal(loadPainel({ __PAINEL_DB_URL: '' }).app.FIREBASE_DB_URL, '', 'nos testes o banco pode ser desligado');
});

test('R-16 · levasPorRodada: cada rodada verde leva os commits do main com carimbo dentro dela (committer, não autoria); rodada vermelha fica sem levas; commit fora de toda rodada é "fora da fila"; média só das verdes; compactaCommits guarda só o que o painel usa', () => {
  const { modelo } = loadPainel();
  const runs = modelo.linhasDasRodadas([
    { id: 1, status: 'completed', conclusion: 'success', run_started_at: '2026-10-13T10:00:00Z', updated_at: '2026-10-13T10:20:00Z' },
    { id: 2, status: 'completed', conclusion: 'failure', run_started_at: '2026-10-13T11:00:00Z', updated_at: '2026-10-13T11:20:00Z' },
    { id: 3, status: 'completed', conclusion: 'success', run_started_at: '2026-10-13T12:00:00Z', updated_at: '2026-10-13T12:25:00Z' },
    { id: 4, status: 'in_progress', run_started_at: '2026-10-13T13:00:00Z', updated_at: '2026-10-13T13:05:00Z' }]);
  const c = (sha, leva, committer, author = '2026-10-13T08:00:00Z') => ({ sha, commit: { message: `Leva ${leva} · assunto`, committer: { date: committer }, author: { date: author } } });
  const commits = modelo.linhasDosCommits(modelo.compactaCommits([
    c('a1a1a1a', 'M-300', '2026-10-13T10:10:00Z'), c('b2b2b2b', 'G-200', '2026-10-13T10:12:00Z'),
    c('c3c3c3c', 'T-50', '2026-10-13T11:10:00Z'),            // dentro da rodada vermelha: não foi ela que publicou (é fora da fila)
    c('d4d4d4d', 'R-9', '2026-10-13T12:20:00Z'), c('e5e5e5e', 'R-10', '2026-10-13T12:21:00Z'), c('f6f6f6f', 'R-11', '2026-10-13T12:22:00Z'),
    c('0707070', 'I-5', '2026-10-13T09:00:00Z')]));           // antes de toda rodada: fora da janela, não conta
  const r = modelo.levasPorRodada(runs, commits);
  assert.deepEqual(r.rodadas.map(x => [x.id, x.portao, x.levas, x.trilhas]), [[3, 'verde', ['R-9', 'R-10', 'R-11'], ['radar']], [2, 'vermelho', [], []], [1, 'verde', ['M-300', 'G-200'], ['motor', 'geral']]]);
  assert.equal(r.media, 2.5);
  assert.deepEqual(r.foraDaFila, ['T-50']);
  assert.deepEqual(modelo.levasPorRodada([], commits), { rodadas: [], media: null, foraDaFila: [] });
  const compacto = modelo.compactaCommits([{ sha: 'x', html_url: 'https://…', commit: { message: 'Leva M-1 · a\n\ncorpo', committer: { date: 'd1', name: 'n' }, author: { date: 'd0' } }, files: [1, 2] }]);
  assert.deepEqual(compacto, [{ sha: 'x', commit: { message: 'Leva M-1 · a', committer: { date: 'd1' }, author: { date: 'd0' } } }]);
  assert.deepEqual(modelo.compactaCommits(null), []);
  assert.equal(modelo.MAIN_URL, '/commits?sha=main&per_page=100');
});

test('R-18 · sharkPorVersao: soma partidas, até o fim e falhas por versão do motor, pior jogada é o máximo, tempo médio é a média dos placares; placar sem Shark não entra; ordem pela versão', () => {
  const { modelo } = loadPainel();
  const r = modelo.sharkPorVersao([
    { motor: 112, shark_partidas: 100, shark_ate_fim: 98, shark_falhas: 0, pior_jogada_ms: 3300, tempo_medio_ms: 6 },
    { motor: 110, shark_partidas: 50, shark_ate_fim: 40, shark_falhas: 2, pior_jogada_ms: 700, tempo_medio_ms: 5 },
    { motor: 112, shark_partidas: 200, shark_ate_fim: 199, shark_falhas: 1, pior_jogada_ms: 4200, tempo_medio_ms: 8 },
    { motor: 112, listas_jogam: 300, listas_total: 355 }]);
  assert.deepEqual(r, [
    { motor: 110, partidas: 50, ateFim: 40, falhas: 2, pior: 700, pctFim: 80, tempoMedio: 5, tempos: undefined },
    { motor: 112, partidas: 300, ateFim: 297, falhas: 1, pior: 4200, pctFim: 99, tempoMedio: 7, tempos: undefined }]);
  assert.deepEqual(modelo.sharkPorVersao([]), []);
  assert.deepEqual(modelo.LIMIARES.falhasProva, { verde: 0, amarelo: 2, unidade: 'listas com falha', texto: 'falhas na prova: 0 · até 2 · mais' });
  assert.equal(modelo.farol(0, modelo.LIMIARES.falhasProva), 'verde'); assert.equal(modelo.farol(3, modelo.LIMIARES.falhasProva), 'vermelho');
  assert.equal(modelo.farol(96, modelo.LIMIARES.sharkFim), 'verde'); assert.equal(modelo.farol(79, modelo.LIMIARES.sharkFim), 'vermelho');
  assert.equal(modelo.farol(3300, modelo.LIMIARES.piorJogada), 'vermelho'); assert.equal(modelo.farol(900, modelo.LIMIARES.piorJogada), 'verde');
});
