#!/usr/bin/env node
// I-293 · BI2-3 Pessoas (decisão D13 do dono, 17/10/2026: "B · Sim"). Roda no GitHub Actions (fluxo "Pessoas", uma vez
// por dia e a cada avanço do main): com a conta de serviço do Firebase (segredo FIREBASE_SERVICE_ACCOUNT, só neste passo)
// conta as contas (Firebase Authentication), os perfis sincronizados (`perfis/`) e as salas (`salas/`) e grava, por dia e
// SÓ TOTAIS, uma linha em `telemetria/pessoas.jsonl` (regravada por dia). Nenhum uid, e-mail, nome, código de sala ou
// texto sai daqui: o que chega ao ramo público é `{ dia, contas, contas_novas, perfis, salas_criadas, salas_total }`.
// Sem o segredo, termina sem fazer nada. O `main` não recebe commit daqui. Sem dependência: Node 22.
// A lista de contas que a API devolve é lida inteira na memória do runner e descartada; só a contagem por dia de
// criação fica. Se a API de contas não responder (permissão da conta de serviço), `contas` fica null e `obs` diz.
import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { leConta, urlDoBanco } from './relatos-fila.mjs';

export const ESCOPOS = 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/identitytoolkit';
const TOKEN_URI = 'https://oauth2.googleapis.com/token';
const b64url = x => Buffer.from(x).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
export const DIA_MS = 86400000;

/** Mesmo mecanismo da relatos-fila.mjs, com os escopos desta rotina (o Identity Toolkit lista as contas). */
export function assercao(conta, escopos = ESCOPOS, agora = Date.now()) {
  const iat = Math.floor(agora / 1000);
  const cabeca = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const corpo = b64url(JSON.stringify({ iss: conta.client_email, scope: escopos, aud: conta.token_uri || TOKEN_URI, iat, exp: iat + 3600 }));
  const assina = createSign('RSA-SHA256'); assina.update(`${cabeca}.${corpo}`);
  return `${cabeca}.${corpo}.${b64url(assina.sign(conta.private_key))}`;
}
export async function tokenDaConta(conta, { busca = globalThis.fetch, agora = Date.now(), escopos = ESCOPOS } = {}) {
  const r = await busca(conta.token_uri || TOKEN_URI, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: assercao(conta, escopos, agora) }).toString() });
  if (!r.ok) throw new Error(`token da conta de serviço: HTTP ${r.status}`);
  const j = await r.json(); if (!j || !j.access_token) throw new Error('token da conta de serviço: resposta sem token');
  return j.access_token;
}

/** AAAA-MM-DD em UTC. */
export const diaDe = ms => new Date(ms).toISOString().slice(0, 10);

/** Puro. `contas`: lista de carimbos de criação (ms) ou null quando a API não respondeu; `salas`: lista de { criadaEm };
    `perfis`: contagem. Devolve uma linha por dia dos últimos `dias` (o dia de `agora` incluso), só totais:
    contas = contas criadas até o fim daquele dia; contas_novas = criadas naquele dia; salas_criadas idem; salas_total = até o fim do dia. */
export function contagens({ contas = null, salas = [], perfis = null, agora = Date.now(), dias = 30, obs = null } = {}) {
  const criacoes = Array.isArray(contas) ? contas.filter(x => Number.isFinite(x)).sort((a, b) => a - b) : null;
  const abertas = (salas || []).map(s => s && Number(s.criadaEm)).filter(x => Number.isFinite(x) && x > 0).sort((a, b) => a - b);
  const hoje = Date.parse(diaDe(agora) + 'T00:00:00Z');
  const linhas = [];
  for (let i = dias - 1; i >= 0; i--) {
    const inicio = hoje - i * DIA_MS, fim = inicio + DIA_MS;
    const l = { dia: diaDe(inicio), em: new Date(agora).toISOString(), salas_criadas: abertas.filter(x => x >= inicio && x < fim).length, salas_total: abertas.filter(x => x < fim).length };
    if (criacoes) { l.contas = criacoes.filter(x => x < fim).length; l.contas_novas = criacoes.filter(x => x >= inicio && x < fim).length; }
    else { l.contas = null; l.contas_novas = null; }
    if (i === 0 && Number.isInteger(perfis)) l.perfis = perfis;   // o banco não guarda quando o perfil subiu: só o total de hoje
    if (obs) l.obs = obs;
    linhas.push(l);
  }
  return linhas;
}

/** Lê as contas pela API do Identity Toolkit (páginas de até 1000). Devolve só os carimbos de criação; a lista some. */
export async function carimbosDasContas({ projeto, token, busca = globalThis.fetch }) {
  const carimbos = []; let pagina = '';
  for (let n = 0; n < 50; n++) {
    const r = await busca(`https://identitytoolkit.googleapis.com/v1/projects/${encodeURIComponent(projeto)}/accounts:batchGet?maxResults=1000${pagina ? '&nextPageToken=' + encodeURIComponent(pagina) : ''}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Error(`contas: HTTP ${r.status}`);
    const j = await r.json();
    for (const u of j.users || []) { const c = Number(u.createdAt); if (Number.isFinite(c) && c > 0) carimbos.push(c); }
    pagina = j.nextPageToken || ''; if (!pagina) break;
  }
  return carimbos;
}
/** Lê `salas/` (só `criadaEm` de cada uma fica) e a contagem de `perfis/` (shallow: só as chaves, descartadas). */
export async function doBanco({ banco, token, busca = globalThis.fetch }) {
  const cab = { headers: { Authorization: `Bearer ${token}` } };
  const rs = await busca(`${banco}/salas.json?shallow=false`, cab); if (!rs.ok) throw new Error(`salas: HTTP ${rs.status}`);
  const salas = Object.values((await rs.json()) || {}).map(s => ({ criadaEm: s && typeof s === 'object' ? s.criadaEm : null }));
  const rp = await busca(`${banco}/perfis.json?shallow=true`, cab); if (!rp.ok) throw new Error(`perfis: HTTP ${rp.status}`);
  const perfis = Object.keys((await rp.json()) || {}).length;
  return { salas, perfis };
}
/** Uma rodada: token → contas (ou null com o motivo em `obs`) → banco → linhas por dia. Puro fora das buscas. */
export async function rodada({ conta, banco, busca = globalThis.fetch, agora = Date.now(), dias = 30, log = () => {} }) {
  const token = await tokenDaConta(conta, { busca, agora });
  let contas = null, obs = null;
  try { contas = await carimbosDasContas({ projeto: conta.project_id, token, busca }); }
  catch (e) { obs = 'contas indisponíveis: ' + String(e.message || e).slice(0, 60); log(obs); }
  const { salas, perfis } = await doBanco({ banco, token, busca });
  return contagens({ contas, salas, perfis, agora, dias, obs });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const segredo = process.env.FIREBASE_SERVICE_ACCOUNT || '';
  if (!segredo) { console.log('sem segredo FIREBASE_SERVICE_ACCOUNT: nada a fazer'); process.exit(0); }
  const conta = leConta(segredo); if (!conta || !conta.project_id) { console.error('FIREBASE_SERVICE_ACCOUNT não é a chave de uma conta de serviço'); process.exit(1); }
  const banco = urlDoBanco(readFileSync(new URL('./index.html', import.meta.url), 'utf8')); if (!banco) { console.error('FIREBASE_DB_URL não está no index.html'); process.exit(1); }
  const args = process.argv.slice(2), opt = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
  const linhas = await rodada({ conta, banco, dias: Number(opt('--dias')) || 30, log: m => console.log(m) });
  const { gravar, RAMO, remotoDoClone } = await import('./telemetria.mjs');
  const { resolve } = await import('node:path');
  const r = gravar({ tipo: 'pessoas', registro: linhas, remoto: opt('--remoto') || remotoDoClone(process.cwd()), pasta: resolve(opt('--pasta') || '.tmp/telemetria'), semPush: args.includes('--sem-push') });
  const u = linhas[linhas.length - 1];
  console.log(`✓ pessoas: ${linhas.length} dia(s) gravado(s) em ${RAMO}/${r.arquivo}${r.enviado ? ' (enviado)' : ' (só na pasta)'} · hoje: contas ${u.contas ?? '?'} (+${u.contas_novas ?? '?'}), perfis ${u.perfis ?? '?'}, salas ${u.salas_total} (+${u.salas_criadas})`);
}
