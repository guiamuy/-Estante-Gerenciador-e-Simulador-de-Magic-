#!/usr/bin/env node
// I-296 · S3 (decisão do dono, 22/10/2026: "retrato pelo CI, sem token"). Roda no GitHub Actions (fluxo "Retrato"): com o
// token do próprio fluxo (só em cabeçalho, nunca na URL) lê pela API o que o Painel Estante (`painel.html`) hoje pede ao
// GitHub com a cota do aparelho — ramos da fila e das recusas (com a data e o motivo do commit de cada um), rodadas da fila,
// jobs da rodada em curso, execuções recentes (Pages), fluxos, commits do `main` dos últimos dias e o tamanho do `index.html`
// por leva (pela árvore do commit, sem baixar o arquivo) — e grava tudo, só o que o painel usa, em `telemetria/retrato.json`
// (arquivo inteiro regravado) e, por dia UTC, `telemetria/commits/<AAAA-MM-DD>.json` (o dia que passou não muda mais). O painel lê o retrato pelo raw, sem cota e sem token (R-28); a API fica para o que o retrato
// não tem. Nenhum e-mail sai daqui: da mensagem de commit fica a primeira linha (os rodapés Co-Authored-By ficam fora) e
// toda cadeia passa por `semEmail`. Sem o token, termina sem fazer nada. O `main` não recebe commit daqui. Sem dependência: Node 22.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const VERSAO = 1;
export const KIND = 'estante.retrato';
export const DIA_MS = 86400000;
/** Quantos commits do `main` e quantos dias o retrato cobre; quantos tamanhos novos lê por rodada (a árvore do commit é leve, mas é um pedido cada). */
export const LIMITES = { dias: 31, commits: 1500, main: 100, tamanhosPorRodada: 40, ramosPorRodada: 30, bytes: 600000 };   // 31 dias cobrem o período "tudo" do painel; ~45 levas/dia
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
/** Toda cadeia que sai do GitHub passa por aqui: e-mail vira [e-mail]; o resto fica. */
export const semEmail = t => String(t ?? '').replace(EMAIL, '[e-mail]');
const corta = (t, n) => semEmail(t).slice(0, n);
const primeiraLinha = t => corta(String(t || '').split('\n')[0], 160);   // o painel mostra até 80 caracteres do assunto
const data = v => (typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? v : null);
const inteiro = v => (Number.isInteger(v) ? v : null);

/* ---------- compactação (puro, com teste): só o que o painel lê de cada resposta, na mesma forma da API ---------- */
/** API `branches` → `[{ name, commit: { sha } }]`. */
export const compactaRamos = lista => (Array.isArray(lista) ? lista : []).map(r => ({ name: corta(r && r.name, 120), commit: { sha: String((r && r.commit && r.commit.sha) || '') } })).filter(r => r.name && /^[0-9a-f]{40}$/.test(r.commit.sha));
/** API `branches/<nome>` → o que `linhasDaFila` lê: data do committer e a mensagem inteira do commit do topo (o motivo da recusa
    mora no corpo), sem rodapés de autoria. */
export function compactaDetalhe(d) {
  const c = (d && d.commit) || {}, cc = c.commit || {};
  const linhas = String(cc.message || '').split('\n').filter(l => !/^(Co-Authored-By|Claude-Session|Signed-off-by|Trilha|Sobrescreve):/i.test(l.trim()));
  return { name: corta(d && d.name, 120), commit: { sha: String(c.sha || ''), commit: { message: corta(linhas.join('\n').trim(), 4000), committer: { date: data(cc.committer && cc.committer.date) }, author: { date: data(cc.author && cc.author.date) } } } };
}
/** Uma execução do Actions (`actions/runs`, `actions/workflows/<f>/runs`) → os campos de `linhasDasRodadas` e `linhasDosFluxos`. */
export const compactaExecucao = e => ({ id: inteiro(e && e.id), name: corta(e && e.name, 120), workflow_id: inteiro(e && e.workflow_id), status: corta(e && e.status, 20), conclusion: e && e.conclusion != null ? corta(e.conclusion, 20) : null, event: corta(e && e.event, 30), run_attempt: inteiro(e && e.run_attempt), created_at: data(e && e.created_at), run_started_at: data(e && e.run_started_at), updated_at: data(e && e.updated_at), display_title: corta(e && e.display_title, 120), html_url: corta(e && e.html_url, 200) });
export const compactaExecucoes = j => ({ workflow_runs: (Array.isArray(j && j.workflow_runs) ? j.workflow_runs : []).map(compactaExecucao).filter(e => e.id != null) });
/** `actions/runs/<id>/jobs` → nome e situação de cada job (o cartão "Rodada em curso" mostra o job que está rodando). */
export const compactaJobs = j => ({ jobs: (Array.isArray(j && j.jobs) ? j.jobs : []).map(x => ({ id: inteiro(x && x.id), name: corta(x && x.name, 120), status: corta(x && x.status, 20), conclusion: x && x.conclusion != null ? corta(x.conclusion, 20) : null, started_at: data(x && x.started_at), completed_at: data(x && x.completed_at) })) });
/** `actions/workflows` → id, nome, caminho e estado. */
export const compactaFluxos = j => ({ workflows: (Array.isArray(j && j.workflows) ? j.workflows : []).map(f => ({ id: inteiro(f && f.id), name: corta(f && f.name, 120), path: corta(f && f.path, 160), state: corta(f && f.state, 30) })).filter(f => f.id != null) });
/** `commits` → a mesma forma que o painel guarda (`compactaCommits` em painel.html): sha, primeira linha, datas. */
export const compactaCommits = cs => (Array.isArray(cs) ? cs : []).map(c => ({ sha: String((c && c.sha) || ''), commit: { message: primeiraLinha(c && c.commit && c.commit.message), committer: { date: data(c && c.commit && c.commit.committer && c.commit.committer.date) }, author: { date: data(c && c.commit && c.commit.author && c.commit.author.date) } } })).filter(c => /^[0-9a-f]{40}$/.test(c.sha));
/** `git/trees/<sha>` → tamanho do `index.html` naquele commit (null quando a árvore não o tem). */
export const tamanhoDaArvore = t => { const b = (Array.isArray(t && t.tree) ? t.tree : []).find(x => x && x.path === 'index.html' && x.type === 'blob'); return b && Number.isInteger(b.size) ? b.size : null; };

/** Puro: monta o retrato a partir das partes compactadas. `anterior` reaproveita detalhes de ramo e tamanhos já lidos. */
export function montaRetrato({ id = null, agora = new Date().toISOString(), ramos = [], detalhes = {}, rodadas = { workflow_runs: [] }, jobs = null, execucoes = { workflow_runs: [] }, fluxos = { workflows: [] }, commits = [], tamanhos = {}, dias = [], pedidos = 0, avisos = [] } = {}) {
  const respostas = { ramos, rodadas, pages: execucoes, fluxos, commits, tamanhos: {} };
  for (const [sha, d] of Object.entries(detalhes || {})) if (/^[0-9a-f]{40}$/.test(sha) && d) respostas['ramo.' + sha] = d;
  if (jobs && jobs.id != null) respostas['jobs.' + jobs.id] = { jobs: jobs.jobs };
  for (const [sha, n] of Object.entries(tamanhos || {})) if (/^[0-9a-f]{40}$/.test(sha) && Number.isInteger(n) && n > 0) respostas.tamanhos[sha] = n;
  const desde = commits.length ? commits.map(c => c.commit.committer.date || c.commit.author.date).filter(Boolean).sort()[0] || null : null;
  const r = { kind: KIND, version: VERSAO, em: agora, pedidos, cobertura: { commits: commits.length, commitsDesde: desde, ramos: ramos.length, rodadas: (rodadas.workflow_runs || []).length, dias: [...new Set(dias)].filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort() }, respostas };
  if (id != null) r.id = String(id);
  if (avisos.length) r.avisos = avisos.slice(0, 10).map(a => corta(a, 160));
  return r;
}
/** Puro: os commits do main agrupados por dia UTC do committer (a data em que a fila pôs a leva no main). Devolve os arquivos
    `commits/<dia>.json` a gravar: o dia de hoje e o de ontem sempre (ainda recebem commit); um dia mais antigo só se ainda não
    está gravado e a lista o cobre inteiro (começa antes dele). `dias` = todos os dias disponíveis depois da gravação. */
export function arquivosPorDia({ commits = [], agora = Date.now(), diasGravados = [], em = new Date(agora).toISOString() } = {}) {
  const dia = c => String(c.commit.committer.date || c.commit.author.date || '').slice(0, 10);
  const porDia = {};
  for (const c of commits) { const d = dia(c); if (/^\d{4}-\d{2}-\d{2}$/.test(d)) (porDia[d] = porDia[d] || []).push(c); }
  const hoje = new Date(agora).toISOString().slice(0, 10), ontem = new Date(agora - DIA_MS).toISOString().slice(0, 10);
  const datas = commits.map(dia).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  const desde = datas[0] || null;
  const gravados = new Set(diasGravados);
  const arquivos = {};
  // I-297 · todo dia inteiro coberto pela lista ganha arquivo, mesmo sem commit (dia parado): senão o painel volta à API nesse dia
  const cobertos = []; if (desde) for (let t = Date.parse(desde + 'T00:00:00Z') + DIA_MS; t <= Date.parse(hoje + 'T00:00:00Z'); t += DIA_MS) cobertos.push(new Date(t).toISOString().slice(0, 10));
  for (const d of [hoje, ontem, ...cobertos]) {
    if (arquivos['commits/' + d + '.json']) continue;
    const inteiro = desde != null && d > desde;   // o primeiro dia da lista pode estar cortado pelo teto de commits
    if (d !== hoje && d !== ontem && (gravados.has(d) || !inteiro)) continue;
    arquivos['commits/' + d + '.json'] = JSON.stringify({ dia: d, em, commits: porDia[d] || [] }) + '\n';
  }
  const dias = [...new Set([...gravados, ...Object.keys(arquivos).map(a => a.slice(8, 18))])].sort();
  return { arquivos, dias };
}
/** Dois retratos são "iguais" quando só o carimbo e o id mudaram: aí não vale um commit novo no ramo. */
export const mesmoRetrato = (a, b) => !!a && !!b && JSON.stringify({ ...a, em: null, id: null, pedidos: null }) === JSON.stringify({ ...b, em: null, id: null, pedidos: null });

/** Uma rodada: lê pela API (token só no cabeçalho), reaproveita o retrato anterior e devolve o retrato novo. Puro fora das buscas. */
export async function rodada({ repo, token, busca = globalThis.fetch, anterior = null, diasGravados = [], agora = Date.now(), id = null, limites = LIMITES, log = () => {} }) {
  let pedidos = 0; const avisos = [];
  const api = async (caminho) => {
    pedidos++;
    const r = await busca(`https://api.github.com/repos/${repo}${caminho}`, { headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' } });
    if (!r.ok) throw new Error(`${caminho.split('?')[0]}: HTTP ${r.status}`);
    return r.json();
  };
  const antes = (anterior && anterior.respostas) || {};
  // ramos da fila e das recusas, com o detalhe do commit do topo (reaproveitado por sha)
  const ramos = compactaRamos(await api('/branches?per_page=100'));
  const detalhes = {}; let novosRamos = 0;
  for (const r of ramos) {
    if (!/^(fila|recusada)\//.test(r.name)) continue;
    const sha = r.commit.sha;
    if (antes['ramo.' + sha]) { detalhes[sha] = antes['ramo.' + sha]; continue; }
    if (novosRamos >= limites.ramosPorRodada) { avisos.push('detalhes de ramos ficaram para a próxima rodada'); break; }
    novosRamos++;
    try { detalhes[sha] = compactaDetalhe(await api('/branches/' + encodeURIComponent(r.name))); } catch (e) { avisos.push(`ramo ${r.name}: ${e.message}`); }
  }
  // rodadas da fila (as 50 últimas) e os jobs da que estiver em curso
  const rodadas = compactaExecucoes(await api('/actions/workflows/fila.yml/runs?per_page=50'));
  const emCurso = rodadas.workflow_runs.find(e => e.status === 'in_progress' || e.status === 'queued') || null;
  let jobs = null;
  if (emCurso) { try { jobs = { id: emCurso.id, ...compactaJobs(await api(`/actions/runs/${emCurso.id}/jobs`)) }; } catch (e) { avisos.push(`jobs da rodada ${emCurso.id}: ${e.message}`); } }
  // execuções recentes de todos os fluxos (Pages, Notícias, Relatos…) e a lista de fluxos
  const execucoes = compactaExecucoes(await api('/actions/runs?per_page=50'));
  // I-297 · com o próprio Retrato rodando dezenas de vezes por dia, as 50 últimas podem não ter o Pages: as 3 últimas publicações entram sempre
  if (!execucoes.workflow_runs.some(e => /pages build and deployment/i.test(e.name || ''))) {
    try { const pages = compactaExecucoes(await api('/actions/runs?per_page=3&event=dynamic')); const ids = new Set(execucoes.workflow_runs.map(e => e.id)); for (const e of pages.workflow_runs) if (!ids.has(e.id)) execucoes.workflow_runs.push(e); }
    catch (e) { avisos.push(`pages: ${e.message}`); }
  }
  const fluxos = compactaFluxos(await api('/actions/workflows?per_page=50'));
  // commits do main dos últimos dias, em páginas de 100
  const desde = new Date(agora - limites.dias * DIA_MS).toISOString();
  let commits = [];
  for (let pagina = 1; pagina <= Math.ceil(limites.commits / 100); pagina++) {
    const lote = compactaCommits(await api(`/commits?sha=main&since=${desde}&per_page=100&page=${pagina}`));
    commits = commits.concat(lote);
    if (lote.length < 100) break;
  }
  commits = commits.slice(0, limites.commits);
  const porDia = arquivosPorDia({ commits, agora, diasGravados });
  const principais = commits.slice(0, limites.main);   // o que o painel pede como `main` (100 últimos)
  // tamanho do index.html por leva (árvore do commit: só a lista de arquivos, sem o conteúdo), reaproveitado por sha
  const tamanhos = {}; let novosTamanhos = 0;
  for (const c of principais) {
    if (!/^Leva /.test(c.commit.message)) continue;
    const sha = c.sha;
    if (antes.tamanhos && Number.isInteger(antes.tamanhos[sha])) { tamanhos[sha] = antes.tamanhos[sha]; continue; }
    if (novosTamanhos >= limites.tamanhosPorRodada) { avisos.push('tamanhos de algumas levas ficaram para a próxima rodada'); break; }
    novosTamanhos++;
    try { const n = tamanhoDaArvore(await api(`/git/trees/${sha}`)); if (n) tamanhos[sha] = n; } catch (e) { avisos.push(`tamanho ${sha.slice(0, 7)}: ${e.message}`); }
  }
  log(`${pedidos} pedido(s) à API · ${ramos.length} ramos · ${rodadas.workflow_runs.length} rodadas · ${commits.length} commits (${Object.keys(porDia.arquivos).length} dia(s) a gravar, ${porDia.dias.length} disponíveis) · ${Object.keys(tamanhos).length} tamanhos (${novosTamanhos} novos)`);
  return { retrato: montaRetrato({ id, agora: new Date(agora).toISOString(), ramos, detalhes, rodadas, jobs, execucoes, fluxos, commits: principais, tamanhos, dias: porDia.dias, pedidos, avisos }), extras: porDia.arquivos };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const token = process.env.GH_TOKEN || '';
  if (!token) { console.log('sem GH_TOKEN: nada a fazer'); process.exit(0); }
  const repo = process.env.GITHUB_REPOSITORY || '';
  if (!/^[^/\s]+\/[^/\s]+$/.test(repo)) { console.error('GITHUB_REPOSITORY precisa ser dono/repositorio'); process.exit(1); }
  const args = process.argv.slice(2), opt = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
  const sem = t => String(t || '').replace(/ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|:\/\/[^@\/\s]+@/g, '[oculto]').slice(0, 300);
  let etapa = 'preparar';
  try {
    const { gravar, preparaPasta, remotoDoClone, ARQUIVOS, RAMO } = await import('./telemetria.mjs');
    const remoto = opt('--remoto') || remotoDoClone(process.cwd()), pasta = resolve(opt('--pasta') || '.tmp/telemetria');
    preparaPasta({ remoto, pasta });
    const caminho = join(pasta, ARQUIVOS.retrato);
    let anterior = null; try { anterior = existsSync(caminho) ? JSON.parse(readFileSync(caminho, 'utf8')) : null; } catch (e) { anterior = null; }
    const diasGravados = existsSync(join(pasta, 'commits')) ? readdirSync(join(pasta, 'commits')).map(n => (n.match(/^(\d{4}-\d{2}-\d{2})\.json$/) || [])[1]).filter(Boolean) : [];
    etapa = 'ler a API';
    const { retrato, extras } = await rodada({ repo, token, anterior, diasGravados, id: process.env.GITHUB_RUN_ID || null, log: m => console.log(m) });
    if (mesmoRetrato(anterior, retrato) && Object.keys(extras).every(n => existsSync(join(pasta, n)) && readFileSync(join(pasta, n), 'utf8').replace(/"em":"[^"]*"/, '') === extras[n].replace(/"em":"[^"]*"/, ''))) { const m = 'retrato: nada mudou desde ' + (anterior.em || '?') + ' · sem commit'; console.log('✓ ' + m); if (process.env.GITHUB_ACTIONS) console.log('::notice::' + m); process.exit(0); }
    etapa = 'gravar';
    const r = gravar({ tipo: 'retrato', registro: retrato, remoto, pasta, semPush: args.includes('--sem-push'), extras });
    const resumo = `retrato: ${retrato.cobertura.ramos} ramos · ${retrato.cobertura.rodadas} rodadas · ${retrato.cobertura.commits} commits + ${Object.keys(extras).length} dia(s) · ${Object.keys(retrato.respostas.tamanhos).length} tamanhos · ${retrato.pedidos} pedidos à API · gravado em ${RAMO}/${r.arquivo}${r.enviado ? ' (enviado)' : ' (só na pasta)'}`;
    console.log('✓ ' + resumo); if (process.env.GITHUB_ACTIONS) console.log('::notice::' + resumo);
    for (const a of retrato.avisos || []) if (process.env.GITHUB_ACTIONS) console.log('::warning::retrato: ' + sem(a));
  } catch (e) {
    const msg = `retrato: falhou na etapa "${etapa}": ${sem(e && e.message || e)}`;
    console.error(msg); if (process.env.GITHUB_ACTIONS) console.log('::error::' + msg);
    process.exit(1);
  }
}
