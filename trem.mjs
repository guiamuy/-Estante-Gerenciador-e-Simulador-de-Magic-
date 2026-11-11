#!/usr/bin/env node
/* =====================================================================
   I-331 · TREM DE PRODUÇÃO — a Vercel nunca mais barra a publicação por limite
   O plano gratuito (Hobby) aceita 100 deployments por 24 h, prévias incluídas (vercel.com/docs/limits,
   consulta de 11/11/2026). Até a I-329 cada push num ramo `claude/<leva>` montava uma prévia (média de
   quatro por leva, com os rebases) e cada merge montava a produção: 89 deployments em 24 h e, em 11/11,
   os PRs #141, #143 e #145 voltaram com "Deployment rate limited — retry in 24 hours".

   Agora:
     · `claude/*` não monta prévia (vercel.json → git.deploymentEnabled). A leva só abre o PR, com o portão
       inteiro verde no clone, e espera o trem.
     · O trem junta, em ordem, os PRs abertos (os que a Vercel recusou primeiro, depois do mais antigo ao
       mais novo) num ramo `trem/<hora>` em cima do main, roda o portão UMA vez sobre a soma, monta UMA
       prévia (homologação) e entra no main com UM merge: dois deployments por trem, com N levas dentro.
     · Antes de montar, confere o orçamento das últimas 24 h; sem vaga, não gasta nada e diz quando abre.

     node trem.mjs situacao            orçamento, PRs na ordem do trem e trem aberto
     node trem.mjs orcamento           só o orçamento (exit 0 cabe um trem · 3 não cabe)
     node trem.mjs montar [--max N]    soma os PRs, portão inteiro, envia trem/<hora>, abre o PR do trem e espera a prévia
     node trem.mjs partir <n>          merge do PR do trem n (rebase) e fecha os PRs das levas que entraram
   Exit: 0 ok · 1 erro · 3 sem orçamento · 4 nada para levar.
   ===================================================================== */
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

export const LIMITE_VERCEL = 100;      // Hobby · deployments criados por 24 h, prévias incluídas
export const RESERVA = 30;             // folga: em 11/11 a Vercel barrou com 80 a 88 visíveis (tentativa barrada também conta);
                                       // sobra para prévia avulsa que o dono pedir e revert de emergência
export const CUSTO_DO_TREM = 2;        // uma prévia (trem/<hora>) + uma produção (merge no main)
export const MAX_LEVAS = 8;            // trem grande demais: mais conflito e portão vermelho mais caro de achar
export const PREFIXO_TREM = 'trem/';
export const PREFIXO_LEVA = 'claude/';
export const ETIQUETA_SEGURA = 'segura'; // PR com esta etiqueta não entra no trem (o dono quer ver antes)
export const ETIQUETA_PRIMEIRO = 'primeiro'; // vai na frente de todos (mudança da própria esteira, conserto urgente)
export const DIA_MS = 86400000;
const MARCA = 'Trem-leva:';            // linha do corpo do PR do trem: "Trem-leva: #145 claude/J-70"

/** Orçamento da janela móvel de 24 h. `datas`: instantes (ms) dos deployments. */
export function orcamento(datas, agora = Date.now(), { limite = LIMITE_VERCEL, reserva = RESERVA, custo = CUSTO_DO_TREM } = {}) {
  const dentro = datas.filter((t) => t <= agora && agora - t < DIA_MS).sort((a, b) => a - b);
  const livres = limite - reserva - dentro.length;
  const faltam = Math.max(0, custo - livres);
  const abreEm = faltam === 0 ? agora : dentro[faltam - 1] + DIA_MS;
  return { usados: dentro.length, livres, cabe: faltam === 0, abreEm };
}

/** Ordem do trem: só PRs `claude/*` abertos, fora rascunho e `segura`; `primeiro` na frente, depois os recusados pela Vercel, depois o mais antigo. */
export function ordemDoTrem(prs) {
  return prs
    .filter((p) => p.ramo && p.ramo.startsWith(PREFIXO_LEVA) && !p.rascunho && !(p.etiquetas || []).includes(ETIQUETA_SEGURA))
    .sort((a, b) => (Number((b.etiquetas || []).includes(ETIQUETA_PRIMEIRO)) - Number((a.etiquetas || []).includes(ETIQUETA_PRIMEIRO))) || (Number(!!b.atrasada) - Number(!!a.atrasada)) || (Date.parse(a.criado) - Date.parse(b.criado)) || (a.numero - b.numero));
}

export const nomeDoTrem = (d = new Date()) => `${PREFIXO_TREM}${d.toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '-')}`;

/** Lê o `git.deploymentEnabled` do vercel.json como a Vercel: regra que casa com `true` vence; sem regra, monta. */
export function vercelMonta(cfg, ramo) {
  const regras = (cfg && cfg.git && cfg.git.deploymentEnabled);
  if (regras === false) return false;
  if (!regras || typeof regras !== 'object') return true;
  const casa = (p) => new RegExp('^' + p.split('**').map((s) => s.split('*').map((x) => x.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*')).join('.*') + '$').test(ramo);
  const valores = Object.entries(regras).filter(([p]) => casa(p)).map(([, v]) => v);
  return !valores.length || valores.includes(true);
}

/** Corpo do PR do trem: legível para o dono e com uma linha por leva que o `partir` lê. */
export function corpoDoTrem(aceitos, recusados, previaFixa) {
  return [
    `Trem de produção (I-331): ${aceitos.length} leva(s) somada(s) sobre o main, portão inteiro verde sobre a soma.`,
    '',
    ...aceitos.map((a) => `${MARCA} #${a.numero} ${a.ramo} · ${a.titulo.slice(0, 120)}`),
    ...(recusados.length ? ['', 'Ficaram para o próximo trem:', ...recusados.map((r) => `- #${r.numero} ${r.ramo}: ${r.motivo.split('\n')[0].slice(0, 200)}`)] : []),
    '',
    `Homologação: a Vercel monta a prévia deste ramo (uma só para o trem inteiro); endereço fixo ${previaFixa}.`,
    'Produção: um merge (rebase) deste PR = um deployment. Os PRs das levas fecham sozinhos depois do merge.',
    '',
    '🤖 Generated with [Claude Code](https://claude.com/claude-code)',
  ].join('\n');
}
export const levasDoCorpo = (corpo) => (corpo || '').split('\n').map((l) => l.match(new RegExp(`^${MARCA} #(\\d+) (\\S+)`))).filter(Boolean).map((m) => ({ numero: Number(m[1]), ramo: m[2] }));

/* ---------------- daqui para baixo: rede, git e gh (a linha de comando) ---------------- */
const git = (...a) => execFileSync('git', a, { encoding: 'utf8', maxBuffer: 1 << 30 }).trim();
const roda = (cmd, args, env) => spawnSync(cmd, args, { stdio: 'inherit', env }).status === 0;
const para = (msg, codigo = 1) => { console.error(`\n✗ ${msg}`); process.exit(codigo); };
/** Só a API REST do GitHub (`gh api`): o GraphQL (gh pr create/view/merge/close) é barrado nas sessões de nuvem.
    Sessão com GH_TOKEN vencido e GITHUB_TOKEN bom (visto em 11/11): tira só o GH_TOKEN e tenta de novo. */
let ENV_GH = process.env;
function gh(...a) {
  try { return execFileSync('gh', a, { encoding: 'utf8', maxBuffer: 1 << 26, env: ENV_GH, stdio: ['ignore', 'pipe', 'pipe'] }).trim(); }
  catch (e) {
    if (ENV_GH === process.env && process.env.GH_TOKEN && /401|Bad credentials|invalid|authentication|gh auth login/i.test(String(e.stderr || e.message))) {
      ENV_GH = { ...process.env }; delete ENV_GH.GH_TOKEN;
      return gh(...a);
    }
    throw e;
  }
}
const api = (metodo, caminho, campos = {}) => {
  const args = ['api', '-X', metodo, `repos/${repo()}/${caminho}`];
  for (const [k, v] of Object.entries(campos)) args.push('-f', `${k}=${v}`);
  const saida = gh(...args);
  return saida ? JSON.parse(saida) : {};
};
const comentar = (numero, texto) => api('POST', `issues/${numero}/comments`, { body: texto });
const fecharPR = (numero, texto) => { if (texto) comentar(numero, texto); return api('PATCH', `pulls/${numero}`, { state: 'closed' }); };
const repo = () => { const m = git('remote', 'get-url', 'origin').match(/github\.com[/:]([^/]+\/[^/]+?)(?:\.git)?\/?$/i); if (!m) para('origin não é um repositório do GitHub.'); return m[1]; };
const PREVIA_FIXA = 'https://estante-magic-previa.vercel.app';

/** Instantes dos deployments da Vercel nas últimas 24 h (a Vercel registra cada um como deployment no GitHub). */
function deploysDoDia() {
  const datas = [];
  for (let pag = 1; pag <= 3; pag++) {
    const lote = JSON.parse(gh('api', `repos/${repo()}/deployments?per_page=100&page=${pag}`));
    for (const d of lote) if (/vercel/i.test((d.creator && d.creator.login) || '')) datas.push(Date.parse(d.created_at));
    if (lote.length < 100 || Date.parse(lote[lote.length - 1].created_at) < Date.now() - DIA_MS) break;
  }
  return datas;
}
function statusVercel(sha) {
  try { return JSON.parse(gh('api', `repos/${repo()}/commits/${sha}/statuses?per_page=30`)).filter((s) => /vercel/i.test(s.context || '')); } catch (e) { return []; }
}
function prsAbertos() {
  const lista = JSON.parse(gh('api', `repos/${repo()}/pulls?state=open&per_page=100`));
  return lista.map((p) => {
    const st = p.head.ref.startsWith(PREFIXO_LEVA) ? statusVercel(p.head.sha) : [];
    return { numero: p.number, ramo: p.head.ref, sha: p.head.sha, titulo: p.title, criado: p.created_at, rascunho: p.draft, etiquetas: (p.labels || []).map((l) => l.name), atrasada: st.some((s) => /rate.?limit|limite/i.test(s.description || '')), corpo: p.body || '' };
  });
}
function mostrarOrcamento() {
  const o = orcamento(deploysDoDia());
  const quando = new Date(o.abreEm).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });
  console.log(`Vercel nas últimas 24 h: ${o.usados} de ${LIMITE_VERCEL} (reserva ${RESERVA}; um trem custa ${CUSTO_DO_TREM}). ${o.cabe ? `Cabe: ${Math.floor(o.livres / CUSTO_DO_TREM)} trem(ns).` : `Não cabe agora; abre vaga às ${quando} (Brasília).`}`);
  return o;
}
function ligarJuntadorDoEstado() {
  git('config', 'merge.estado.name', 'ESTADO.md (I-331)');
  git('config', 'merge.estado.driver', 'node estado-merge.mjs %O %A %B');
}
/** Espera a prévia do commit (até 15 min). Devolve o link, `null` se não veio, ou { falhou }. */
async function esperarPrevia(sha) {
  const inicio = Date.now();
  while (Date.now() - inicio < 15 * 60000) {
    try {
      for (const d of JSON.parse(gh('api', `repos/${repo()}/deployments?sha=${sha}&per_page=10`))) {
        for (const s of JSON.parse(gh('api', `repos/${repo()}/deployments/${d.id}/statuses?per_page=5`))) {
          if (s.state === 'success' && (s.environment_url || s.target_url)) return s.environment_url || s.target_url;
          if (s.state === 'failure' || s.state === 'error') return { falhou: s.description || s.target_url || '' };
        }
      }
      const limite = statusVercel(sha).find((s) => /rate.?limit/i.test(s.description || ''));
      if (limite) return { falhou: limite.description };
    } catch (e) { /* rede instável: tenta de novo */ }
    await new Promise((r) => setTimeout(r, 20000));
  }
  return null;
}

async function montarTrem(max) {
  const { montar } = await import('./fila.mjs');
  if (git('status', '--porcelain')) para('Há alteração fora de commit neste clone. O trem precisa de um clone limpo.');
  const abertos = prsAbertos();
  const tremAberto = abertos.find((p) => p.ramo.startsWith(PREFIXO_TREM));
  if (tremAberto) para(`Já há um trem aberto: #${tremAberto.numero} (${tremAberto.ramo}). Termine-o antes (node trem.mjs partir ${tremAberto.numero}) ou feche-o.`);
  const fila = ordemDoTrem(abertos).slice(0, max);
  if (!fila.length) para('Nenhum PR de leva aberto: nada para levar.', 4);
  const o = mostrarOrcamento();
  if (!o.cabe) process.exit(3);
  ligarJuntadorDoEstado();
  if (!roda('git', ['fetch', '--quiet', 'origin', 'main', ...fila.map((p) => `+refs/heads/${p.ramo}:refs/remotes/origin/${p.ramo}`)])) para('Não consegui buscar o main e os ramos das levas.');
  let candidatos = fila.map((p) => ({ ...p, nome: p.ramo }));
  const fora = [];
  for (let volta = 1; volta <= 3; volta++) {
    console.log(`\n── volta ${volta}: somando ${candidatos.length} leva(s) sobre o main: ${candidatos.map((c) => `#${c.numero}`).join(' ')}`);
    const r = montar({ cwd: process.cwd(), base: 'origin/main', ramos: candidatos.map((c) => ({ nome: c.ramo, sha: c.sha })) });
    for (const x of [...r.recusados, ...r.vazios.map((v) => ({ ...v, motivo: 'já está toda no main' }))]) {
      const p = candidatos.find((c) => c.ramo === x.nome);
      fora.push({ ...p, motivo: x.motivo });
      console.log(`   fora: #${p.numero} ${p.ramo} · ${x.motivo.split('\n')[0].slice(0, 160)}`);
    }
    candidatos = candidatos.filter((c) => r.aceitos.some((a) => a.nome === c.ramo));
    if (!candidatos.length) para('Nenhuma leva entrou na soma (conflito ou guarda em todas). Os motivos estão acima; a skill dona de cada uma resolve.', 4);
    console.log(`\n── portão inteiro sobre a soma (${candidatos.length} leva(s))`);
    if (roda(process.execPath, [fileURLToPath(new URL('./portao.mjs', import.meta.url))])) {
      const ramo = nomeDoTrem();
      if (!roda('git', ['push', 'origin', `HEAD:refs/heads/${ramo}`])) para(`Não consegui enviar ${ramo}.`);
      const titulo = `Trem ${ramo.slice(PREFIXO_TREM.length)} · ${candidatos.length} leva(s): ${candidatos.map((c) => c.ramo.slice(PREFIXO_LEVA.length)).join(', ')}`.slice(0, 240);
      const novo = api('POST', 'pulls', { title: titulo, head: ramo, base: 'main', body: corpoDoTrem(candidatos, fora, PREVIA_FIXA) });
      const url = novo.html_url, n = novo.number;
      console.log(`\n✓ Trem enviado: ${ramo}\n  PR #${n}: ${url}`);
      for (const p of fora.filter((f) => f.motivo !== 'já está toda no main')) { try { comentar(p.numero, `Ficou fora do trem ${ramo} (PR #${n}): ${p.motivo.slice(0, 1500)}\n\nA leva continua na fila e entra no próximo trem quando estiver em dia com o main (\`npm run publicar\` no ramo dela).`); } catch (e) { /* comentário é aviso, não trava */ } }
      const previa = await esperarPrevia(git('rev-parse', 'HEAD'));
      if (typeof previa === 'string') { console.log(`✓ Prévia do trem: ${previa}\n  Aponte ${PREVIA_FIXA} para ela (conector da Vercel ou \`vercel alias set\`). Produção: node trem.mjs partir ${n}`); process.exit(0); }
      if (previa && previa.falhou) para(`A Vercel não montou a prévia do trem: ${previa.falhou}. O PR #${n} do trem fica aberto; o próximo horário confere (node trem.mjs situacao).`);
      console.log('Quinze minutos sem prévia. O PR do trem fica aberto; confira de novo com node trem.mjs situacao.');
      process.exit(0);
    }
    if (candidatos.length === 1) { fora.push({ ...candidatos[0], motivo: 'portão vermelho sozinha sobre o main' }); para(`Portão vermelho com a #${candidatos[0].numero} sozinha sobre o main: a skill dona dela corrige.`); }
    const ultima = candidatos.pop();
    fora.push({ ...ultima, motivo: 'tirada do trem depois de portão vermelho na soma (pode não ser dela; vai sozinha no próximo trem)' });
    console.log(`\n✗ Portão vermelho na soma. Tiro a última (#${ultima.numero} ${ultima.ramo}) e somo de novo.`);
  }
  para('Portão vermelho em três voltas. Nada foi enviado; os PRs seguem abertos.');
}

function partir(numero) {
  const { conferirFaixa, relatar } = awaitImport;
  const bruto = api('GET', `pulls/${numero}`);
  const pr = { number: bruto.number, state: bruto.state, headRefName: bruto.head.ref, headRefOid: bruto.head.sha, body: bruto.body || '' };
  if (pr.state !== 'open') para(`O PR #${pr.number} não está aberto (${pr.state}).`);
  if (!pr.headRefName.startsWith(PREFIXO_TREM)) para(`O PR #${pr.number} não é um trem (${pr.headRefName}). Leva avulsa entra no próximo trem.`);
  roda('git', ['fetch', '--quiet', 'origin', 'main', `+refs/heads/${pr.headRefName}:refs/remotes/origin/${pr.headRefName}`]);
  const ramo = `origin/${pr.headRefName}`;
  if (git('rev-parse', ramo) !== pr.headRefOid) para('O ramo do trem mudou durante a conferência. Rode de novo.');
  if (Number(git('rev-list', '--count', `${ramo}..origin/main`))) {
    try { fecharPR(pr.number, 'O main andou depois que este trem foi testado: fechado sem merge. As levas continuam nos PRs delas e voltam no próximo trem (node trem.mjs montar).'); } catch (e) { /* segue */ }
    para('O main andou desde o portão do trem: trem fechado sem merge. Monte de novo (node trem.mjs montar).');
  }
  const previa = statusVercel(pr.headRefOid);
  if (!previa.some((s) => s.state === 'success')) para('A prévia do trem ainda não está pronta (ou a Vercel recusou). Nada mudou; confira mais tarde.');
  const { achados } = conferirFaixa('origin/main', ramo);
  if (achados.filter((a) => !a.leve).length) { console.error(relatar(achados)); para('Guarda de agregação no trem.'); }
  try { api('PUT', `pulls/${pr.number}/merge`, { merge_method: 'rebase', sha: pr.headRefOid }); } catch (e) { para(`O GitHub recusou o merge do trem: ${String(e.stderr || e.message).slice(0, 300)}`); }
  try { api('DELETE', `git/refs/heads/${pr.headRefName}`); } catch (e) { /* ramo do trem fica; não atrapalha */ }
  roda('git', ['fetch', '--quiet', 'origin', 'main']);
  const main = git('rev-parse', '--short', 'origin/main');
  for (const l of levasDoCorpo(pr.body)) {
    try { fecharPR(l.numero, `Entregue em produção no trem #${pr.number} (main em ${main}). https://estante-magic.vercel.app`); } catch (e) { console.log(`  (não consegui fechar o #${l.numero}: feche à mão)`); }
  }
  console.log(`\n✓ Trem #${pr.number} no main (${main}). A Vercel publica em https://estante-magic.vercel.app em um ou dois minutos.`);
}

let awaitImport = null;
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  awaitImport = await import('./agregacao.mjs');
  const [cmd, arg] = process.argv.slice(2);
  const maxI = process.argv.indexOf('--max');
  const max = maxI > 0 ? Number(process.argv[maxI + 1]) || MAX_LEVAS : MAX_LEVAS;
  if (cmd === 'orcamento') { const o = mostrarOrcamento(); process.exit(o.cabe ? 0 : 3); }
  else if (cmd === 'situacao' || !cmd) {
    mostrarOrcamento();
    const abertos = prsAbertos();
    const t = abertos.filter((p) => p.ramo.startsWith(PREFIXO_TREM));
    console.log(t.length ? `Trem aberto: ${t.map((p) => `#${p.numero} ${p.ramo}`).join(', ')}` : 'Nenhum trem aberto.');
    const f = ordemDoTrem(abertos);
    console.log(`Na fila do próximo trem (${f.length}; vão até ${MAX_LEVAS}):`);
    for (const p of f) console.log(`  ${p.atrasada ? '⏫ recusada pela Vercel · ' : ''}#${p.numero} ${p.ramo} · ${p.titulo.slice(0, 80)}`);
  }
  else if (cmd === 'montar') await montarTrem(max);
  else if (cmd === 'partir') { if (!arg) para('Diga o número do PR do trem: node trem.mjs partir <n>'); partir(arg); }
  else para(`Comando desconhecido: ${cmd}. Use situacao, orcamento, montar ou partir.`);
}
