// I-289 · T6e (relato #13) · relato enviado de dentro do app. Roda no GitHub Actions (fluxo "Relatos pela fila", a cada
// 10 minutos): lê a fila de relatos no Realtime Database (`relatos/fila/<conta>/<id>`, forma da A-262) com a conta de
// serviço do Firebase (segredo FIREBASE_SERVICE_ACCOUNT, só neste passo), cria o registro (issue) com o mesmo título e
// corpo do caminho de antes (o app abria a página do GitHub preenchida) e só então tira o relato da fila. Sem o segredo,
// não faz nada. Sem dependência: Node 22.
// O que vem da fila é dado de terceiro (qualquer pessoa com conta da Estante escreve na sua fila): é validado pela mesma
// regra do app, vira texto do registro e nunca comando; o registro sai em nome do robô do repositório com a etiqueta
// `relato-fila`, que só um fluxo deste repositório consegue pôr. Limite: 3 por conta e 20 por rodada (o resto fica para
// a rodada seguinte).
import { createSign } from 'node:crypto';
import { readFileSync, appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const POR_CONTA = 3, POR_RODADA = 20;
export const ETIQUETA_FILA = 'relato-fila';
export const ESCOPOS = 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/firebase.database';
const TOKEN_URI = 'https://oauth2.googleapis.com/token';
const b64url = x => Buffer.from(x).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

/** A chave da conta de serviço (o JSON que o Firebase gera). Devolve null quando não serve. */
export function leConta(texto) {
  let c; try { c = JSON.parse(String(texto || '')); } catch (e) { return null; }
  return c && c.type === 'service_account' && typeof c.client_email === 'string' && typeof c.private_key === 'string' && c.private_key.includes('PRIVATE KEY') ? c : null;
}
/** A assercao assinada (RS256) que troca a conta de serviço por um token de acesso. */
export function assercao(conta, agora = Date.now()) {
  const iat = Math.floor(agora / 1000);
  const cabeca = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const corpo = b64url(JSON.stringify({ iss: conta.client_email, scope: ESCOPOS, aud: conta.token_uri || TOKEN_URI, iat, exp: iat + 3600 }));
  const assina = createSign('RSA-SHA256'); assina.update(`${cabeca}.${corpo}`);
  return `${cabeca}.${corpo}.${assina.sign(conta.private_key).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')}`;
}
export async function tokenDaConta(conta, { busca = globalThis.fetch, agora = Date.now() } = {}) {
  const r = await busca(conta.token_uri || TOKEN_URI, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: assercao(conta, agora) }).toString() });
  if (!r.ok) throw new Error(`token da conta de serviço: HTTP ${r.status}`);
  const j = await r.json(); if (!j || !j.access_token) throw new Error('token da conta de serviço: resposta sem token');
  return j.access_token;
}
/** A URL do banco é a do app (constante FIREBASE_DB_URL do index.html): uma fonte só. */
export function urlDoBanco(html) {
  const m = String(html).match(/const FIREBASE_DB_URL = [^\n]*?'(https:\/\/[a-z0-9-]+(?:-default-rtdb)?\.(?:firebaseio\.com|[a-z0-9-]+\.firebasedatabase\.app))'/);
  return m ? m[1] : null;
}
const ID_OK = /^[A-Za-z0-9_-]{1,64}$/, UID_OK = /^[A-Za-z0-9_-]{1,128}$/;
/** O que entra nesta rodada: mais antigos primeiro, no máximo `porConta` de cada conta e `porRodada` no total. */
export function escolhe(fila, { porConta = POR_CONTA, porRodada = POR_RODADA } = {}) {
  const todos = [];
  for (const [uid, nos] of Object.entries(fila && typeof fila === 'object' ? fila : {})) {
    if (!UID_OK.test(uid) || !nos || typeof nos !== 'object') continue;
    for (const [id, no] of Object.entries(nos)) if (ID_OK.test(id)) todos.push({ uid, id, no, em: no && typeof no.enviadoEm === 'string' ? no.enviadoEm : '' });
  }
  todos.sort((a, b) => a.em.localeCompare(b.em) || a.uid.localeCompare(b.uid) || a.id.localeCompare(b.id));
  const porUid = new Map(), out = [];
  for (const x of todos) { const n = porUid.get(x.uid) || 0; if (n >= porConta || out.length >= porRodada) continue; porUid.set(x.uid, n + 1); out.push(x); }
  return { escolhidos: out, ficaram: todos.length - out.length };
}
/** O registro de um relato da fila: o mesmo título e corpo do Enviar de antes, mais a linha de origem. Null se o relato
    não passa na regra do app (tipo, urgência, texto) ou se o id do nó não é o do relato. */
export function registroDoRelato(R, relato, { uid, id }) {
  if (!relato || relato.id !== id || typeof relato.descricao !== 'string' || typeof relato.criadoEm !== 'string' || isNaN(Date.parse(relato.criadoEm))) return null;
  if (Object.keys(R.confere(relato)).length) return null;
  const limpo = { ...relato, contexto: relato.contexto && typeof relato.contexto === 'object' ? relato.contexto : {}, tela: R.limpaTela(relato.tela), partida: null };
  const q = new URL(R.enderecoDoRegistro(limpo)).searchParams;
  const [texto, ...resto] = q.get('body').split('\n\n<!-- ');
  const origem = `- Enviado de dentro do app, pela fila da Estante (conta …${uid.slice(-6)})`;
  // quem escrevia no GitHub era a própria pessoa; agora é o robô: "@alguém" no texto não pode virar aviso para essa conta
  return { title: semMencao(q.get('title')), body: `${semMencao(texto)}\n${origem}\n\n<!-- ${resto.join('\n\n<!-- ')}`, labels: ['relato', ETIQUETA_FILA] };
}
/** "@conta" e "#123" do texto viram texto (com um separador invisível): o registro não menciona ninguém nem liga a outro registro. */
export const semMencao = t => String(t).replace(/@(?=[A-Za-z0-9-])/g, '@\u200b').replace(/#(?=\d)/g, '#\u200b');
const idDoCorpo = (corpo, marca) => { const m = String(corpo || '').match(new RegExp(`<!--\\s*${marca}\\s+(\\{[\\s\\S]*?\\})\\s*-->`)); try { return m ? JSON.parse(m[1]).id || null : null; } catch (e) { return null; } };

/** Uma rodada. `banco` e `github` recebem a URL e o token; `busca` é o fetch (de mentira nos testes). */
export async function rodada({ conta, banco, repo, githubToken, busca = globalThis.fetch, agora = Date.now(), R, remoto, log = () => {} }) {
  const token = await tokenDaConta(conta, { busca, agora });
  const db = async (caminho, metodo = 'GET') => {
    const r = await busca(`${banco}/${caminho}.json?access_token=${encodeURIComponent(token)}`, { method: metodo });
    if (!r.ok) throw new Error(`banco: HTTP ${r.status} em ${metodo} ${caminho}`);
    const t = await r.text(); return t ? JSON.parse(t) : null;
  };
  const gh = async (caminho, { method = 'GET', corpo } = {}) => {
    const r = await busca('https://api.github.com' + caminho, { method, headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(corpo ? { 'Content-Type': 'application/json' } : {}) }, body: corpo ? JSON.stringify(corpo) : undefined });
    if (!r.ok) throw new Error(`GitHub: HTTP ${r.status} em ${method} ${caminho}`);
    return r.status === 204 ? null : r.json();
  };
  const fila = await db('relatos/fila');
  const { escolhidos, ficaram } = escolhe(fila);
  const out = { criados: [], repetidos: 0, invalidos: 0, ficaram };
  if (!escolhidos.length) return out;
  // registro que já existe (rodada anterior caiu entre criar e tirar da fila): não duplica
  const ja = new Set();
  for (let p = 1; p < 20; p++) { const pg = await gh(`/repos/${repo}/issues?state=all&labels=${ETIQUETA_FILA}&per_page=100&page=${p}`); if (!Array.isArray(pg) || !pg.length) break; for (const i of pg) { const x = idDoCorpo(i.body, R.MARCA); if (x) ja.add(x); } if (pg.length < 100) break; }
  for (const x of escolhidos) {
    const caminho = `relatos/fila/${x.uid}/${x.id}`;
    const relato = remoto.relatoDaFila(x.no), reg = relato && registroDoRelato(R, relato, x);
    if (!reg) { out.invalidos++; log(`✗ ${x.id}: fora da regra, tirado da fila`); await db(caminho, 'DELETE'); continue; }
    if (ja.has(x.id)) { out.repetidos++; log(`= ${x.id}: já tem registro`); await db(caminho, 'DELETE'); continue; }
    const issue = await gh(`/repos/${repo}/issues`, { method: 'POST', corpo: reg });
    ja.add(x.id); out.criados.push(issue.number); log(`#${issue.number}: ${x.id}`);
    await db(caminho, 'DELETE'); // só depois de o registro existir
  }
  return out;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const segredo = process.env.FIREBASE_SERVICE_ACCOUNT || '';
  if (!segredo) { console.log('sem segredo FIREBASE_SERVICE_ACCOUNT: nada a fazer'); process.exit(0); }
  const conta = leConta(segredo); if (!conta) { console.error('FIREBASE_SERVICE_ACCOUNT não é a chave de uma conta de serviço'); process.exit(1); }
  const banco = urlDoBanco(readFileSync(new URL('./index.html', import.meta.url), 'utf8')); if (!banco) { console.error('FIREBASE_DB_URL não está no index.html'); process.exit(1); }
  const repo = process.env.GITHUB_REPOSITORY || '', githubToken = process.env.GITHUB_TOKEN || '';
  if (!repo || !githubToken) { console.error('uso: GITHUB_TOKEN=… GITHUB_REPOSITORY=dono/repo FIREBASE_SERVICE_ACCOUNT=… node relatos-fila.mjs'); process.exit(2); }
  const { loadModules } = await import('./_load.mjs'); const M = loadModules();
  const r = await rodada({ conta, banco, repo, githubToken, R: M.relatos, remoto: M.remoto, log: m => console.log(m) });
  console.log(`fila: ${r.criados.length} registro(s) criado(s), ${r.repetidos} já existiam, ${r.invalidos} fora da regra, ${r.ficaram} para a próxima rodada`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `criados=${r.criados.length + r.repetidos + r.invalidos}\n`);
}
