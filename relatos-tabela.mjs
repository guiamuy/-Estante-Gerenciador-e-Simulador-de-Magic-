// Y5 · Tabela de relatos. Roda no GitHub Actions (fluxo "Relatos") a cada registro aberto, editado, fechado ou reaberto:
// lê os registros (issues) que o app preencheu — o bloco <!-- estante-relato {...} --> no corpo —, põe as etiquetas de
// tipo, urgência e área, e grava a tabela no ramo `relatos` (relatos.json e relatos.csv), que a conversa de correção
// consulta com `gh api`. Fechar o registro é marcar o relato como resolvido. Sem dependência: Node 22.
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const MARCA = 'estante-relato';
const TIPOS = { erro: 'Erro', regra: 'Regra ou carta', visual: 'Visual', melhoria: 'Melhoria', ideia: 'Ideia', lentidao: 'Lentidão', infra: 'Infraestrutura', outro: 'Outro' };
const URGENCIAS = { bloqueia: 'Impede o uso', alta: 'Alta', media: 'Média', baixa: 'Baixa' };
const PESO = { bloqueia: 4, alta: 3, media: 2, baixa: 1 };
// P-2 · as áreas que o app escreve (iguais às de `__m38.AREAS`): qualquer conta do GitHub abre registro e dispara o fluxo,
// então etiqueta só nasce de lista fechada — área inventada no corpo não cria etiqueta nova no repositório
export const AREAS = ['Mesa', 'Jogar', 'Série', 'Lista', 'Listas', 'Coleção', 'Scanner', 'Cartas', 'Notícias', 'Relatos', 'Perfil', 'Design system', 'Início'];
// cores das etiquetas (o GitHub pede hexadecimal sem #; isto não é CSS do app)
const COR_TIPO = 'c5a15a', COR_URGENCIA = { bloqueia: 'b60205', alta: 'd93f0b', media: 'fbca04', baixa: 'c2e0c6' }, COR_AREA = '5b7a99', COR_RELATO = '7a5a17';

/** Os dados do relato no corpo do registro, ou null quando o registro não veio do app. */
export function leDados(corpo) {
  const m = String(corpo || '').match(new RegExp(`<!--\\s*${MARCA}\\s+(\\{[\\s\\S]*?\\})\\s*-->`));
  if (!m) return null;
  try { const d = JSON.parse(m[1]); return d && typeof d === 'object' && d.tipo && d.urgencia ? d : null; } catch (e) { return null; }
}
/** O texto que a pessoa escreveu: o que vem depois do cabeçalho (as linhas "- …") e antes do bloco de dados. */
export function leDescricao(corpo) {
  const antes = String(corpo || '').split('<!--')[0].replace(/\r/g, '');
  const partes = antes.split(/\n\s*\n/);
  return partes.slice(1).join('\n\n').trim();
}
/** As etiquetas que o registro deve ter. */
export function etiquetasDe(d) {
  const out = [{ nome: 'relato', cor: COR_RELATO }];
  if (TIPOS[d.tipo]) out.push({ nome: `tipo: ${TIPOS[d.tipo]}`, cor: COR_TIPO });
  if (URGENCIAS[d.urgencia]) out.push({ nome: `urgência: ${URGENCIAS[d.urgencia]}`, cor: COR_URGENCIA[d.urgencia] });
  if (AREAS.includes(d.area)) out.push({ nome: `área: ${d.area}`, cor: COR_AREA });
  return out;
}
/** Uma linha da tabela para um registro do app (null para os outros). */
export function linhaDe(issue) {
  if (!issue || issue.pull_request) return null;
  const d = leDados(issue.body); if (!d) return null;
  const tela = d.tela || {};
  return {
    numero: issue.number, url: issue.html_url, situacao: issue.state === 'closed' ? 'resolvido' : 'aberto',
    tipo: d.tipo, tipoRotulo: TIPOS[d.tipo] || d.tipo, urgencia: d.urgencia, urgenciaRotulo: URGENCIAS[d.urgencia] || d.urgencia,
    area: d.area || '', titulo_da_tela: tela.cabecalho || tela.titulo || '', endereco: d.endereco || d.rota || '', dialogo: tela.dialogo || '', rolagem: tela.rolagem ?? null,
    criadoEm: d.criadoEm || issue.created_at, enviadoEm: issue.created_at, resolvidoEm: issue.state === 'closed' ? issue.closed_at : null,
    app: d.app || '', motor: d.motor ?? null, tema: d.tema || '', viewport: d.viewport || '', online: d.online !== false,
    partida: d.partida || null, partidaAnexada: !!d.partidaAnexada, id: d.id || '', editadoEm: d.editadoEm || null, descricao: leDescricao(issue.body),
    autor: (issue.user && issue.user.login) || '' // G-243 · quem abriu: o reenvio só vale da mesma conta
  };
}
/** G-243 · o que o app lê para marcar os seus relatos: só id, número, endereço e situação (sem o texto). */
export function situacoes(linhas, agora = new Date()) {
  return { versao: 1, geradoEm: agora.toISOString(), relatos: (linhas || []).filter(l => l.id).map(l => ({ id: l.id, numero: l.numero, url: l.url, situacao: l.situacao, resolvidoEm: l.resolvidoEm || null, reenvios: l.reenvios || [] })) };
}
/** A tabela: abertos primeiro, depois a urgência maior, depois o mais recente. */
export function tabela(issues) {
  // T1 · relato corrigido e reenviado: vale o registro mais novo do mesmo relato; os outros números ficam em `reenvios`
  const porId = new Map(), soltas = [], donos = new Map();
  // G-243 · o id do relato está no corpo de um registro público: outra conta pode copiá-lo num registro novo (e fechá-lo).
  // Vale a conta que abriu o PRIMEIRO registro daquele id; o de outra conta entra na tabela solto, sem o id do relato.
  const linhas = (issues || []).map(linhaDe).filter(Boolean).sort((x, y) => x.numero - y.numero);
  for (const l of linhas) if (l.id && !donos.has(l.id)) donos.set(l.id, l.autor);
  for (const l0 of linhas) {
    const l = l0.id && l0.autor && donos.get(l0.id) && l0.autor !== donos.get(l0.id) ? { ...l0, id: '' } : l0;
    if (!l.id) { soltas.push(l); continue; }
    const v = porId.get(l.id);
    if (!v) { porId.set(l.id, { ...l, reenvios: [] }); continue; }
    const [novo, velho] = l.numero > v.numero ? [l, v] : [v, l];
    porId.set(l.id, { ...novo, reenvios: [...(v.reenvios || []), velho.numero].filter(n => n !== novo.numero).sort((x, y) => x - y) });
  }
  return [...porId.values(), ...soltas].sort((a, b) =>
    (a.situacao === 'resolvido') - (b.situacao === 'resolvido') || (PESO[b.urgencia] || 0) - (PESO[a.urgencia] || 0) || String(b.criadoEm).localeCompare(String(a.criadoEm)));
}
export function csv(linhas) {
  // P-2 · célula que começa com = + - @ (ou tab) vira fórmula na planilha: entra como texto, com apóstrofo
  const q = v => { let t = v == null ? '' : String(v); if (/^[=+\-@\t\r]/.test(t)) t = "'" + t; return /[",\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
  const cab = ['numero', 'situacao', 'tipo', 'urgencia', 'area', 'titulo_da_tela', 'endereco', 'criado_em', 'resolvido_em', 'motor', 'app', 'viewport', 'descricao', 'url'];
  return '\ufeff' + [cab.join(','), ...linhas.map(l => [l.numero, l.situacao, l.tipoRotulo, l.urgenciaRotulo, l.area, l.titulo_da_tela, l.endereco, l.criadoEm, l.resolvidoEm || '', l.motor ?? '', l.app, l.viewport, l.descricao, l.url].map(q).join(','))].join('\r\n') + '\r\n';
}

/* ---------------- GitHub ---------------- */
function api({ token, busca = globalThis.fetch, base = 'https://api.github.com' }) {
  const pede = async (caminho, { method = 'GET', corpo } = {}) => {
    const r = await busca(base + caminho, { method, headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(corpo ? { 'Content-Type': 'application/json' } : {}) }, body: corpo ? JSON.stringify(corpo) : undefined });
    if (!r.ok && r.status !== 422) throw new Error(`HTTP ${r.status} em ${method} ${caminho}`);
    return r.status === 204 ? null : r.json();
  };
  return { pede };
}
async function todas(pede, caminho) {
  const out = [];
  for (let p = 1; p < 50; p++) { const pagina = await pede(`${caminho}${caminho.includes('?') ? '&' : '?'}per_page=100&page=${p}`); if (!Array.isArray(pagina) || !pagina.length) break; out.push(...pagina); if (pagina.length < 100) break; }
  return out;
}
/** Etiqueta os registros do app e grava a tabela em `pasta`. */
export async function atualiza(pasta, { token, repo, busca = globalThis.fetch, log = () => {} } = {}) {
  const { pede } = api({ token, busca });
  const issues = await todas(pede, `/repos/${repo}/issues?state=all`);
  const existentes = new Set((await todas(pede, `/repos/${repo}/labels`)).map(l => l.name));
  for (const issue of issues) {
    if (issue.pull_request) continue;
    const d = leDados(issue.body); if (!d) continue;
    const tem = new Set((issue.labels || []).map(l => (typeof l === 'string' ? l : l.name)));
    const faltam = etiquetasDe(d).filter(e => !tem.has(e.nome));
    if (!faltam.length) continue;
    for (const e of faltam) if (!existentes.has(e.nome)) { await pede(`/repos/${repo}/labels`, { method: 'POST', corpo: { name: e.nome, color: e.cor } }); existentes.add(e.nome); }
    await pede(`/repos/${repo}/issues/${issue.number}/labels`, { method: 'POST', corpo: { labels: faltam.map(e => e.nome) } });
    log(`#${issue.number}: ${faltam.map(e => e.nome).join(', ')}`);
  }
  const linhas = tabela(issues);
  await mkdir(pasta, { recursive: true });
  await writeFile(join(pasta, 'relatos.json'), JSON.stringify({ versao: 1, repositorio: repo, total: linhas.length, abertos: linhas.filter(l => l.situacao === 'aberto').length, relatos: linhas }, null, 1) + '\n');
  await writeFile(join(pasta, 'relatos.csv'), csv(linhas));
  await writeFile(join(pasta, 'situacao.json'), JSON.stringify(situacoes(linhas)) + '\n'); // G-243 · o app lê este (pequeno)
  return linhas;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const i = process.argv.indexOf('--saida'); const pasta = i > 0 ? process.argv[i + 1] : '';
  const token = process.env.GITHUB_TOKEN || '', repo = process.env.GITHUB_REPOSITORY || '';
  if (!pasta || !token || !repo) { console.error('uso: GITHUB_TOKEN=… GITHUB_REPOSITORY=dono/repo node relatos-tabela.mjs --saida <pasta>'); process.exit(2); }
  const linhas = await atualiza(pasta, { token, repo, log: m => console.log(m) });
  console.log(`tabela: ${linhas.length} relato(s), ${linhas.filter(l => l.situacao === 'aberto').length} aberto(s)`);
}
