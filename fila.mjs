#!/usr/bin/env node
/* =====================================================================
   Q17 · FILA DE PUBLICAÇÃO — um portão no CI para todas as levas da fila

   Antes: cada conversa rodava o portão inteiro (30 a 40 min) sobre o `main`
   parado; quem publicasse no meio obrigava as outras a recomeçar. A fila
   estava saturada: 1,5 publicação por hora num caminho que comporta 1,5 a 2.

   Agora a conversa envia a leva para `fila/<nome>` e segue. O fluxo
   `fila.yml`, um por vez:
     monta    põe os ramos da fila, em ordem de chegada, sobre o `main`
              (cherry-pick: mensagem, rodapés e data de autoria ficam iguais).
              Ramo com conflito, guarda ou conferência vermelha sai da soma.
     portão   roda o portão inteiro UMA vez sobre a soma.
     avança   verde: `main` avança (nunca force), ramos publicados somem.
              vermelho com uma leva só: a leva é recusada.
              vermelho com várias: a mais antiga é testada sozinha na rodada seguinte.
   Leva recusada vira `recusada/<nome>`, com o motivo na mensagem do commit
   de cima; o `main` não muda.

   Q22 · `main` vermelho não recusa inocente. Quando o portão cai, os testes
   que caíram rodam de novo, sozinhos, sobre o `main` sem leva nenhuma. Se
   todos caem lá também, a culpa não é da soma: ninguém é recusado, as levas
   ficam na fila e o ramo `aviso/main-vermelho` guarda as quedas. Enquanto o
   aviso vale (mesmo `main`), cada rodada roda primeiro só essas quedas sobre
   a soma (pré-sonda, minutos); o portão inteiro só roda quando elas passam,
   isto é, quando chegou a leva que conserta. O aviso some quando o `main` anda.

     node fila.mjs monta   [--so <nome>] [--plano plano.json]
     node fila.mjs aplica  --plano plano.json          (remonta a soma e confere a árvore; o plano também vem por FILA_PLANO)
     node fila.mjs avanca  --plano plano.json --portao success|failure|…   (motivo da queda por FILA_MOTIVO)
     node fila.mjs situacao                            (o que está na fila, recusado ou publicado)
     node fila.mjs presonda --cwd <clone>              (Q22 · as quedas do aviso, sobre a soma; quedas por FILA_SONDA)
     node fila.mjs herdadas --cwd <clone> --log <log>  (Q22 · as quedas do log, sobre o main sozinho; plano por FILA_PLANO)
   ===================================================================== */
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { conferirFaixa, relatar, conferirArvore, lerRodapes } from './agregacao.mjs';

export const PREFIXO_FILA = 'fila/';
export const PREFIXO_RECUSADA = 'recusada/';
/** Quantos commits do `main` são lidos para saber o que já foi publicado. */
export const JANELA_PUBLICADOS = 400;
/** Nome de ramo que a fila aceita: letras, números, ponto, traço e sublinhado (sem barra, sem espaço, sem opção de linha de comando). */
export const NOME_VALIDO = /^[A-Za-z0-9][A-Za-z0-9._-]{0,60}$/;
const SHA_VALIDO = /^[0-9a-f]{40}$/;
/** O plano vem de outro job: só entra em comando git o que tem forma de nome e de sha. */
export function planoValido(p) {
  const itens = [...(p.aceitos || []), ...(p.recusados || []), ...(p.vazios || [])];
  return SHA_VALIDO.test(p.base || '') && SHA_VALIDO.test(p.arvore || '') && itens.every((i) => NOME_VALIDO.test(i.nome || '') && SHA_VALIDO.test(i.sha || ''));
}
const AUTOR_DA_FILA = ['-c', 'user.name=estante-fila', '-c', 'user.email=41898282+github-actions[bot]@users.noreply.github.com'];

/* ---------- parte pura ---------- */

/** Identidade de uma leva que sobrevive ao cherry-pick: instante de autoria + assunto. O sha muda quando a fila põe o commit
    sobre o `main`; a data de autoria e a mensagem não. É por ela que a fila (e o publicar) sabem o que já está publicado. */
export const chave = (c) => `${c.autorEm}|${c.assunto}`;

/** Nome do ramo de fila de um conjunto de commits: a leva do último (`G-252`, `207`); sem leva, trilha e sha curto. */
export function nomeDoRamo(commits) {
  const ultimo = commits[commits.length - 1];
  if (!ultimo) return '';
  const r = lerRodapes(ultimo.corpo || ultimo.assunto || '');
  if (r.leva != null) return `${r.prefixo ? r.prefixo + '-' : ''}${r.leva}`;
  return `${(r.trilha || 'sem-trilha').replace(/[^a-z0-9-]/g, '')}-${String(ultimo.sha).slice(0, 7)}`;
}

/** Ordem de chegada: o ramo cujo topo foi gravado primeiro vai na frente; empate pelo nome. `so` restringe a um ramo. */
export function ordemDaFila(ramos, so = '') {
  return ramos.filter((r) => !so || r.nome === so).sort((a, b) => (a.em - b.em) || (a.nome < b.nome ? -1 : 1));
}

/* ---------- Q22 · main vermelho ---------- */

export const AVISO_MAIN = 'aviso/main-vermelho';
/** Quantos testes que caíram são reexecutados (o resto não muda a decisão: basta um que não caia no main). */
export const MAX_REEXECUCOES = 12;
const ARQUIVO_DE_TESTE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,80}\.test\.mjs$/;

/** Queda que entra em comando: nome sem caractere de controle e com teto; arquivo só com forma de arquivo de teste da raiz. */
export function limparQueda(q) {
  const nome = String((q && q.nome) || '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 200);
  const arquivo = ARQUIVO_DE_TESTE.test(String((q && q.arquivo) || '')) ? q.arquivo : '';
  return { nome, arquivo };
}

/** Testes que caíram, com o arquivo de cada um, lidos da saída TAP do portão (a linha `location:` do bloco do teste).
    Sem repetição (a segunda chance da fase de tela repete o nome); linhas de arquivo (`x.test.mjs`) não contam. */
export function quedasComArquivo(log, max = MAX_REEXECUCOES) {
  const linhas = String(log || '').split('\n');
  const saida = [], vistos = new Set();
  for (let i = 0; i < linhas.length && saida.length < max; i++) {
    const m = linhas[i].match(/^not ok \d+ - (.+?)\s*(?:# .*)?$/);
    if (!m || /\.test\.mjs$/.test(m[1].trim())) continue;
    let arquivo = '';
    for (let j = i + 1; j < linhas.length && j < i + 80 && !/^(not )?ok \d+ - /.test(linhas[j]); j++) {
      const l = linhas[j].match(/^\s+location: '(?:.*[\\/])?([^\\/:']+\.test\.mjs):\d+:\d+'/);
      if (l) { arquivo = l[1]; break; }
    }
    const q = limparQueda({ nome: m[1].trim(), arquivo });
    const k = `${q.arquivo}|${q.nome}`;
    if (!q.nome || vistos.has(k)) continue;
    vistos.add(k); saida.push(q);
  }
  return saida;
}

const escapa = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Roda cada queda sozinha (`--test-name-pattern` exato, só no arquivo dela) na árvore de `cwd`.
    Devolve cada uma com `resultado`: 'cai', 'passa' ou '?' (não rodou: nome que não existe mais, arquivo que sumiu, tempo esgotado). */
export function reexecutar({ cwd, quedas, env = process.env, tempoMs = 4 * 60000, orcamentoMs = 8 * 60000, agora = Date.now }) {
  const { NODE_TEST_CONTEXT, ...limpo } = env;   // dentro de outro `node --test`, a saída do filho deixaria de ser TAP
  // parecer de escala (25/10): o job do portão tem teto de tempo; a reexecução inteira cabe em `orcamentoMs`, e o que passar dele fica "?"
  const fim = agora() + orcamentoMs;
  return quedas.map(limparQueda).map((q) => {
    const resta = fim - agora();
    if (!q.nome || !q.arquivo || resta < 5000) return { ...q, resultado: '?' };
    const r = spawnSync(process.execPath, ['--test', '--test-reporter=tap', `--test-name-pattern=^${escapa(q.nome)}$`, q.arquivo], { cwd, env: limpo, encoding: 'utf8', maxBuffer: 1 << 28, timeout: Math.min(tempoMs, resta) });
    const saida = String(r.stdout || '');
    const nome = escapa(q.nome);
    if (new RegExp(`^not ok \\d+ - ${nome}\\s*$`, 'm').test(saida)) return { ...q, resultado: 'cai' };
    if (new RegExp(`^ok \\d+ - ${nome}\\s*$`, 'm').test(saida) && r.status === 0) return { ...q, resultado: 'passa' };
    return { ...q, resultado: '?' };
  });
}

/** O portão caiu só pelo que já cai no main? Exige ao menos uma queda e todas reproduzidas no main sozinho. */
export const mainVermelho = (h) => Boolean(h && h.total > 0 && Array.isArray(h.quedas) && h.quedas.length === h.total && h.quedas.every((q) => q.noMain === 'cai'));

/** A pré-sonda (as quedas do aviso sobre a soma): 'caem' se alguma ainda cai; 'passam' se todas passam; '?' se alguma não rodou
    (a leva que conserta pode ter renomeado o teste: aí o portão inteiro decide). */
export function resultadoDaPresonda(resultados) {
  if (!resultados.length) return '?';
  if (resultados.some((r) => r.resultado === 'cai')) return 'caem';
  return resultados.every((r) => r.resultado === 'passa') ? 'passam' : '?';
}

/** Aviso que vale para esta rodada: o do mesmo `main` (se o `main` andou, o aviso é velho e o portão inteiro decide). */
export const sondaDoAviso = (aviso, base) => (aviso && aviso.base === base && aviso.quedas.length ? aviso.quedas : []);

/* ---------- Q23 · portão em dois jobs paralelos ---------- */

/** Resultado do portão a partir dos dois jobs (rápida e tela): verde só com os dois verdes; qualquer queda é vermelho; os dois pulados
    (nada a testar, ou pré-sonda "caem") é "skipped"; o resto (cancelado, um pulado e outro não, job que não existiu) não publica. */
export function resultadoDoPortao(rapida, tela) {
  if (rapida === 'success' && tela === 'success') return 'success';
  if (rapida === 'failure' || tela === 'failure') return 'failure';
  if (rapida === 'skipped' && tela === 'skipped') return 'skipped';
  return 'cancelled';
}

/** Junta a reexecução no main dos jobs que caíram. Vale só se TODO job que caiu trouxe a sua (com quedas identificadas e o mesmo main);
    senão devolve null e a fila decide como antes (um job que caiu sem dizer por quê nunca vira "culpa do main"). */
export function juntarHerdadas(jobs) {
  const caidos = jobs.filter((j) => j.resultado === 'failure');
  if (!caidos.length) return null;
  const hs = caidos.map((j) => j.herdadas);
  if (hs.some((h) => !h || typeof h.total !== 'number' || h.total < 1 || !Array.isArray(h.quedas) || h.base !== hs[0].base)) return null;
  return { base: hs[0].base, total: hs.reduce((t, h) => t + h.total, 0), quedas: hs.flatMap((h) => h.quedas) };
}

/** Junta o resumo das duas fases (cada job grava só a sua) no formato que a telemetria da rodada já lê. */
export function juntarResumos(...textos) {
  const rs = textos.map((t) => { try { const v = JSON.parse(String(t || '')); return v && typeof v === 'object' ? v : null; } catch (e) { return null; } }).filter(Boolean);
  if (!rs.length) return '';
  return JSON.stringify({ kind: (rs.find((r) => r.kind) || {}).kind || 'estante.portao', rapido: (rs.find((r) => r.rapido) || {}).rapido || null, tela: (rs.find((r) => r.tela) || {}).tela || null });
}

/** O que fazer depois do portão. `aceitos` são os ramos somados; `portao` é o resultado do job (success, failure, cancelled…);
    `presonda` e `herdadas` (Q22) dizem se o vermelho é do `main`. A pré-sonda vem antes do "success": quando ela acha as quedas
    do aviso, o job termina verde sem rodar as fases, e isso nunca publica. */
export function decisao({ aceitos, portao, presonda = '', herdadas = null }) {
  if (!aceitos.length) return { acao: 'nada' };
  if (presonda === 'caem') return { acao: 'esperar-main', porque: 'as quedas que deixam o main vermelho ainda caem com estas levas: elas esperam na fila (ninguém é recusado)' };
  if (portao === 'success') return { acao: 'publicar' };
  if (portao !== 'failure') return { acao: 'manter', porque: `o portão terminou como "${portao}" (cancelado ou sem resultado): nada muda e a fila roda de novo` };
  if (mainVermelho(herdadas)) return { acao: 'esperar-main', porque: 'tudo o que caiu cai também no main sozinho: o vermelho é do main, não destas levas; elas esperam na fila (ninguém é recusado)' };
  if (aceitos.length === 1) return { acao: 'recusar', nome: aceitos[0].nome };
  return { acao: 'isolar', nome: aceitos[0].nome };
}

/** Motivo que vai para a mensagem do commit de recusa: texto simples, sem caractere de controle, com teto de tamanho. */
export function limparMotivo(texto, teto = 1800) {
  const limpo = String(texto || '').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, ' ').replace(/[ \t]+/g, ' ').trim();
  return limpo.length > teto ? limpo.slice(0, teto) + ' …' : limpo;
}

/** O fluxo entrega as quedas numa linha só, separadas por ";" e com a repetição do teste sozinho junto ("not ok 119 - X;not ok 1 - X").
    Aqui viram uma lista sem repetição, um teste por linha, para quem lê o motivo da recusa. */
export function formatarQuedas(texto) {
  // Q23 · forma nova: lista JSON de nomes (vinda das quedas de cada job do portão); nome com ";" não se parte mais em pedaços
  // ("meno", "menos" na recusa da B-184 de 25/10). A forma antiga (linhas "not ok" separadas por ";") continua aceita.
  let lista = null;
  try { const v = JSON.parse(String(texto || '')); if (Array.isArray(v)) lista = v.map(String); } catch (e) { lista = null; }
  const nomes = (lista || String(texto || '').split(/;|\n/)).map((l) => l.replace(/^\s*not ok \d+ - /, '').trim()).filter(Boolean);
  const unicos = [...new Set(nomes)];
  return unicos.length ? `Testes que caíram (${unicos.length}):\n${unicos.map((n) => `- ${n}`).join('\n')}` : '';
}

/** Nomes dos testes que caíram, lidos do log do portão (linhas `not ok` de teste, não de arquivo). */
export function quedasDoLog(log, max = 12) {
  const nomes = [...String(log).matchAll(/^not ok \d+ - (.+)$/gm)].map((m) => m[1].trim()).filter((n) => !/\.test\.mjs$/.test(n));
  return [...new Set(nomes)].slice(0, max);
}

/* ---------- git ---------- */

function gitEm(cwd) {
  return (args, opts = {}) => execFileSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 1 << 30, stdio: ['ignore', 'pipe', 'pipe'], ...opts }).trim();
}
const tenta = (g, args) => { try { return g(args); } catch (e) { return null; } };

/** Commits de `faixa`, do mais antigo para o mais novo: { sha, autorEm, assunto, corpo }. */
export function commitsDa(cwd, faixa, extra = []) {
  const bruto = gitEm(cwd)(['log', '--reverse', '--no-merges', '--format=%H%x00%at%x00%s%x00%B%x01', ...extra, faixa]);
  return bruto.split('\x01').map((b) => b.trim()).filter(Boolean).map((b) => { const [sha, autorEm, assunto, corpo] = b.split('\0'); return { sha, autorEm: Number(autorEm), assunto, corpo }; });
}

/** Chaves do que já está em `ref` (janela recente). */
export function publicados(cwd, ref) {
  return new Set(commitsDa(cwd, ref, [`--max-count=${JANELA_PUBLICADOS}`]).map(chave));
}

/** Ramos `fila/*` do remoto, como o clone os vê depois do fetch: { nome, sha, em }. */
export function ramosDaFila(cwd, { remoto = 'origin', prefixo = PREFIXO_FILA } = {}) {
  const saida = gitEm(cwd)(['for-each-ref', '--format=%(refname:short)%00%(objectname)%00%(committerdate:unix)', `refs/remotes/${remoto}/${prefixo}`]);
  return saida.split('\n').filter(Boolean).map((l) => { const [ref, sha, em] = l.split('\0'); return { nome: ref.slice(`${remoto}/${prefixo}`.length), sha, em: Number(em) }; }).filter((r) => NOME_VALIDO.test(r.nome));
}

/**
 * Soma os ramos sobre `base`, na ordem dada, num HEAD solto do clone em `cwd`.
 * Cada ramo entra inteiro ou não entra: conflito, guarda ou conferência vermelha desfaz só ele.
 * Devolve { base, topo, arvore, aceitos:[{nome, sha, commits}], recusados:[{nome, sha, motivo}], vazios:[{nome, sha}] }.
 */
export function montar({ cwd, base, ramos, conferir = true }) {
  const g = gitEm(cwd);
  const baseSha = g(['rev-parse', base]);
  g(['checkout', '--quiet', '--detach', baseSha]);
  const ja = publicados(cwd, baseSha);
  const aceitos = [], recusados = [], vazios = [];
  for (const ramo of ramos) {
    const antes = g(['rev-parse', 'HEAD']);
    const novos = commitsDa(cwd, `${baseSha}..${ramo.sha}`).filter((c) => !ja.has(chave(c)));
    if (!novos.length) { vazios.push({ nome: ramo.nome, sha: ramo.sha }); continue; }
    let motivo = '';
    for (const c of novos) {
      if (tenta(g, [...AUTOR_DA_FILA, 'cherry-pick', '--allow-empty', c.sha]) !== null) continue;
      const emConflito = (tenta(g, ['diff', '--name-only', '--diff-filter=U']) || '').split('\n').filter(Boolean);
      if (!emConflito.length && tenta(g, ['diff', '--cached', '--quiet']) !== null) { tenta(g, ['cherry-pick', '--skip']); continue; } // a mudança já estava lá
      tenta(g, ['cherry-pick', '--abort']);
      const naFrente = aceitos.map((a) => a.nome).join(', ');
      motivo = `CONFLITO ao pôr "${c.assunto.slice(0, 90)}" sobre o main${naFrente ? ` somado a ${naFrente}` : ''}, em: ${emConflito.join(', ') || '(arquivo não identificado)'}.\n`
        + 'Saída: git fetch origin main && git rebase origin/main, resolva ficando com os dois lados, e envie de novo (npm run publicar).';
      break;
    }
    if (!motivo && conferir) {
      const { achados } = conferirFaixa(antes, 'HEAD', { cwd });
      const graves = achados.filter((a) => !a.leve);
      const arvore = conferirArvore(cwd);
      if (graves.length) motivo = `GUARDA DE AGREGAÇÃO: ${graves.length} achado(s).\n${relatar(graves)}`;
      else if (arvore.length) motivo = `CONFERÊNCIA ANTES DO PORTÃO: ${arvore.length} achado(s).\n${arvore.map((a) => a.texto).join('\n')}`;
    }
    if (motivo) { g(['reset', '--quiet', '--hard', antes]); recusados.push({ nome: ramo.nome, sha: ramo.sha, motivo }); continue; }
    for (const c of novos) ja.add(chave(c));
    aceitos.push({ nome: ramo.nome, sha: ramo.sha, commits: novos.length });
  }
  return { base: baseSha, topo: g(['rev-parse', 'HEAD']), arvore: g(['rev-parse', 'HEAD^{tree}']), aceitos, recusados, vazios };
}

/** Grava a recusa: `recusada/<nome>` = o ramo com um commit vazio por cima dizendo o motivo; `fila/<nome>` some (se ninguém mexeu nele). */
export function recusar({ cwd, remoto = 'origin', nome, sha, motivo }) {
  const g = gitEm(cwd);
  const texto = `RECUSADA pela fila · ${nome}\n\n${limparMotivo(motivo)}\n\nO main não mudou. Corrija no seu clone e envie de novo: npm run publicar`;
  const marca = g([...AUTOR_DA_FILA, 'commit-tree', `${sha}^{tree}`, '-p', sha, '-m', texto]);
  g(['push', '--quiet', '--force', remoto, `${marca}:refs/heads/${PREFIXO_RECUSADA}${nome}`]); // ramo de aviso, só da fila: pode ser regravado
  return apagarDaFila({ cwd, remoto, nome, sha });
}

/** Tira o aviso `recusada/<nome>` de uma leva que acabou de chegar ao main (ou que já estava lá): aviso velho de leva publicada confunde. */
export function apagarAviso({ cwd, remoto = 'origin', nome }) {
  const g = gitEm(cwd);
  if (!tenta(g, ['ls-remote', '--exit-code', '--heads', remoto, `${PREFIXO_RECUSADA}${nome}`])) return false;
  return tenta(g, ['push', '--quiet', remoto, `:refs/heads/${PREFIXO_RECUSADA}${nome}`]) !== null;
}

/** Limpeza a cada rodada: aviso `recusada/<nome>` cujas levas já estão todas no main é velho (a leva foi corrigida e publicada) e sai.
    As conversas de nuvem não conseguem apagar ramo no remoto; quem limpa é a fila. Devolve os nomes apagados. */
export function limparAvisos({ cwd, remoto = 'origin', principal = 'main' }) {
  const g = gitEm(cwd);
  tenta(g, ['fetch', '--quiet', '--prune', '--depth=60', remoto, `+refs/heads/${PREFIXO_RECUSADA}*:refs/remotes/${remoto}/${PREFIXO_RECUSADA}*`]);
  const ja = publicados(cwd, `${remoto}/${principal}`);
  const apagados = [];
  for (const r of ramosDaFila(cwd, { remoto, prefixo: PREFIXO_RECUSADA })) {
    let levas = [];
    try { levas = commitsDa(cwd, `${remoto}/${principal}..${r.sha}`).filter((c) => !/^RECUSADA pela fila/.test(c.assunto)); } catch (e) { continue; }
    if (levas.some((c) => !ja.has(chave(c)))) continue;   // ainda há leva deste aviso fora do main: a recusa vale
    if (apagarAviso({ cwd, remoto, nome: r.nome })) apagados.push(r.nome);
  }
  return apagados;
}

/** Q22 · grava (ou regrava) o aviso `aviso/main-vermelho`: um commit vazio sobre o `main` testado, com as quedas em texto e em JSON. */
export function gravarAvisoMain({ cwd, remoto = 'origin', base, quedas }) {
  const g = gitEm(cwd);
  const limpas = quedas.map(limparQueda).filter((q) => q.nome).slice(0, MAX_REEXECUCOES);
  const texto = [`MAIN VERMELHO no CI · ${base.slice(0, 7)}`, '',
    'Estes testes caem no main sozinho, sem leva nenhuma. Por isso a fila não recusa ninguém: as levas esperam na fila (não reenvie).',
    ...limpas.map((q) => `- ${q.nome}${q.arquivo ? ` (${q.arquivo})` : ''}`), '',
    'Destrava: a trilha dona do teste, com uma leva que o faça passar no CI. Cada rodada roda primeiro só estes testes sobre a soma (pré-sonda);',
    'o portão inteiro roda quando eles passam. O aviso some quando o main anda.', '',
    `base: ${base}`, `quedas: ${JSON.stringify(limpas)}`].join('\n');
  const marca = g([...AUTOR_DA_FILA, 'commit-tree', `${base}^{tree}`, '-p', base, '-m', texto]);
  g(['push', '--quiet', '--force', remoto, `${marca}:refs/heads/${AVISO_MAIN}`]); // ramo de aviso, só da fila: pode ser regravado
  return limpas;
}

/** Q22 · lê o aviso do remoto (já buscado em `refs/remotes/<remoto>/aviso/*`): { base, quedas, desde } ou null. */
export function lerAvisoMain({ cwd, remoto = 'origin' }) {
  const g = gitEm(cwd);
  const corpo = tenta(g, ['log', '-1', '--format=%ct%x00%B', `refs/remotes/${remoto}/${AVISO_MAIN}`]);
  if (!corpo) return null;
  const [em, texto] = corpo.split('\0');
  const base = ((texto || '').match(/^base: ([0-9a-f]{40})$/m) || [])[1];
  let quedas = [];
  try { quedas = JSON.parse(((texto || '').match(/^quedas: (\[.*\])$/m) || [])[1] || '[]'); } catch (e) { quedas = []; }
  if (!base || !Array.isArray(quedas)) return null;
  return { base, quedas: quedas.map(limparQueda).filter((q) => q.nome).slice(0, MAX_REEXECUCOES), desde: Number(em) || 0 };
}

/** Q22 · tira o aviso (o `main` andou com o portão verde). */
export function apagarAvisoMain({ cwd, remoto = 'origin' }) {
  const g = gitEm(cwd);
  if (!tenta(g, ['ls-remote', '--exit-code', '--heads', remoto, AVISO_MAIN])) return false;
  return tenta(g, ['push', '--quiet', remoto, `:refs/heads/${AVISO_MAIN}`]) !== null;
}

/** Q22 · as quedas do log rodam de novo sobre o `main` sozinho (o `base` do plano), no clone `cwd` (o do portão, sem credencial).
    Se as dependências mudaram entre o `main` e a soma, não dá para comparar: devolve sem quedas e a fila decide como antes. */
export function herdadasNoMain({ cwd, plano, log, env = process.env }) {
  const g = gitEm(cwd);
  const quedas = quedasComArquivo(log);
  const total = quedas.length;
  if (!total) return { base: plano.base, total: 0, quedas: [], porque: 'nenhum teste identificado no log' };
  if (tenta(g, ['diff', '--quiet', plano.base, 'HEAD', '--', 'package.json', 'package-lock.json']) === null) return { base: plano.base, total, quedas: [], porque: 'as dependências mudaram na soma: sem comparação' };
  g(['checkout', '--quiet', '--force', '--detach', plano.base]);
  const resultados = reexecutar({ cwd, quedas, env });
  return { base: plano.base, total, quedas: resultados.map((r) => ({ nome: r.nome, arquivo: r.arquivo, noMain: r.resultado })) };
}

/** Apaga `fila/<nome>` só se o topo ainda é o que a fila processou (quem enviou mais commits no meio fica para a próxima rodada). */
export function apagarDaFila({ cwd, remoto = 'origin', nome, sha }) {
  const ref = `refs/heads/${PREFIXO_FILA}${nome}`;
  return tenta(gitEm(cwd), ['push', '--quiet', `--force-with-lease=${ref}:${sha}`, remoto, `:${ref}`]) !== null;
}

/**
 * Depois do portão. Remonta a soma a partir do plano (sem rodar código da leva), exige a mesma árvore que o portão testou e o
 * mesmo `main` de quando o plano foi feito, e só então avança o `main`. Devolve { acao, publicado?, isolar?, recusadas, restam }.
 */
export function avancar({ cwd, plano, portao, motivo = '', remoto = 'origin', principal = 'main', presonda = '', herdadas = null }) {
  if (!planoValido(plano)) throw new Error('plano fora do formato (nome de ramo ou sha inválido): nada foi feito');
  const g = gitEm(cwd);
  const saida = { acao: 'nada', recusadas: [], apagados: [], isolar: '', deNovo: false };
  for (const r of plano.recusados || []) { recusar({ cwd, remoto, ...r }); saida.recusadas.push(r.nome); }
  for (const v of plano.vazios || []) { if (apagarDaFila({ cwd, remoto, ...v })) saida.apagados.push(v.nome); apagarAviso({ cwd, remoto, nome: v.nome }); }
  // as quedas e o resultado da pré-sonda vêm do job que roda código de leva: servem só para NÃO publicar e NÃO recusar, nunca para publicar
  const h = herdadas && herdadas.base === plano.base ? herdadas : null;
  const d = decisao({ aceitos: plano.aceitos || [], portao, presonda, herdadas: h });
  saida.acao = d.acao;
  if (d.porque) saida.porque = d.porque;
  if (d.acao === 'esperar-main') {
    if (h) saida.aviso = gravarAvisoMain({ cwd, remoto, base: plano.base, quedas: h.quedas });
    return saida;
  }
  const doMain = h ? h.quedas.filter((q) => q.noMain === 'cai').map((q) => q.nome) : [];
  const notaDoMain = doMain.length ? `\nCaem também no main sozinho (não são desta leva): ${doMain.join('; ')}.` : '';
  if (d.acao === 'recusar') {
    const a = plano.aceitos[0];
    recusar({ cwd, remoto, nome: a.nome, sha: a.sha, motivo: `PORTÃO VERMELHO com esta leva sozinha sobre o main (${plano.base.slice(0, 7)}).\n${formatarQuedas(motivo) || 'Veja o log do portão na execução do fluxo "Fila de publicação".'}${notaDoMain}` });
    saida.recusadas.push(a.nome);
  } else if (d.acao === 'isolar') {
    saida.isolar = d.nome;
  } else if (d.acao === 'publicar') {
    const agora = g(['rev-parse', `${remoto}/${principal}`]);
    if (agora !== plano.base) { saida.acao = 'manter'; saida.deNovo = true; saida.porque = `o ${principal} andou (${plano.base.slice(0, 7)} → ${agora.slice(0, 7)}) por fora da fila enquanto o portão rodava: a soma testada não vale mais; a fila roda de novo`; return saida; }
    const de = montar({ cwd, base: plano.base, ramos: plano.aceitos, conferir: false });
    if (de.arvore !== plano.arvore || de.aceitos.length !== plano.aceitos.length) throw new Error(`a soma remontada (${de.arvore.slice(0, 7)}) não é a que o portão testou (${plano.arvore.slice(0, 7)}): nada foi publicado`);
    // nunca force: se o main andou no último segundo, o push é recusado e a fila roda de novo
    if (tenta(g, ['push', '--quiet', remoto, `${de.topo}:refs/heads/${principal}`]) === null) { saida.acao = 'manter'; saida.deNovo = true; saida.porque = `o ${principal} andou no instante do envio: nada publicado; a fila roda de novo`; return saida; }
    saida.publicado = de.topo;
    for (const a of plano.aceitos) { if (apagarDaFila({ cwd, remoto, ...a })) saida.apagados.push(a.nome); apagarAviso({ cwd, remoto, nome: a.nome }); }
    saida.avisoMainApagado = apagarAvisoMain({ cwd, remoto });
  }
  return saida;
}

/** Situação de cada leva local e de cada ramo da fila, para a conversa saber onde está a sua entrega. */
export function situacao({ cwd, remoto = 'origin', principal = 'main' }) {
  const g = gitEm(cwd);
  const noMain = new Map(commitsDa(cwd, `${remoto}/${principal}`, [`--max-count=${JANELA_PUBLICADOS}`]).map((c) => [chave(c), c.sha]));
  const linha = (r, estado) => {
    const commits = commitsDa(cwd, `${remoto}/${principal}..${r.sha}`).filter((c) => !/^RECUSADA pela fila/.test(c.assunto));
    return { nome: r.nome, estado, levas: commits.map((c) => ({ assunto: c.assunto, publicado: noMain.get(chave(c)) || '' })) };
  };
  const fila = ordemDaFila(ramosDaFila(cwd, { remoto })).map((r) => linha(r, 'na fila'));
  const recusadas = ramosDaFila(cwd, { remoto, prefixo: PREFIXO_RECUSADA }).map((r) => ({ ...linha(r, 'recusada'), motivo: g(['log', '-1', '--format=%b', r.sha]) }))
    .filter((r) => !r.levas.length || r.levas.some((l) => !l.publicado)); // aviso velho de leva que já chegou ao main não é recusa pendente
  const locais = commitsDa(cwd, `${remoto}/${principal}..HEAD`).map((c) => ({ assunto: c.assunto, publicado: noMain.get(chave(c)) || '' }));
  // Q22 · aviso de main vermelho só vale para o main de agora
  const aviso = lerAvisoMain({ cwd, remoto });
  const mainVermelhoAgora = aviso && aviso.base === tenta(g, ['rev-parse', `${remoto}/${principal}`]) ? aviso : null;
  return { fila, recusadas, locais, mainVermelho: mainVermelhoAgora };
}

/* ---------- linha de comando (usada pelo fluxo fila.yml) ---------- */

function saidaDoFluxo(pares) {
  if (!process.env.GITHUB_OUTPUT) return;
  for (const [k, v] of Object.entries(pares)) appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${String(v).replace(/\r?\n/g, ' ')}\n`);
}
const resumo = (texto) => { console.log(texto); if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, texto + '\n'); };

function principal(argv) {
  const [comando] = argv;
  const opc = (f, padrao = '') => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : padrao; };
  const cwd = opc('--cwd') || process.cwd();   // o fluxo roda esta cópia de fora da árvore: remontar a soma troca os arquivos do clone
  if (comando === 'monta') {
    const ramos = ordemDaFila(ramosDaFila(cwd), opc('--so'));
    const plano = montar({ cwd, base: 'origin/main', ramos });
    if (opc('--plano')) writeFileSync(opc('--plano'), JSON.stringify(plano));
    resumo(`### Fila · ${ramos.length} ramo(s) sobre o main ${plano.base.slice(0, 7)}${opc('--so') ? ` (só ${opc('--so')})` : ''}`);
    for (const a of plano.aceitos) resumo(`- ✓ somado: \`${a.nome}\` (${a.commits} commit(s))`);
    for (const v of plano.vazios) resumo(`- · já publicado: \`${v.nome}\``);
    for (const r of plano.recusados) resumo(`- ✗ fora da soma: \`${r.nome}\` — ${r.motivo.split('\n')[0]}`);
    // Q22 · main vermelho conhecido (aviso do mesmo main): a rodada roda primeiro só essas quedas sobre a soma
    const sonda = sondaDoAviso(lerAvisoMain({ cwd }), plano.base);
    if (sonda.length) resumo(`- ⚠ main vermelho no CI: pré-sonda com ${sonda.length} teste(s) antes do portão inteiro (${sonda.map((q) => q.nome.slice(0, 60)).join('; ')})`);
    saidaDoFluxo({ plano: JSON.stringify(plano), portao: plano.aceitos.length ? 'sim' : 'nao', pendencias: plano.recusados.length + plano.vazios.length ? 'sim' : 'nao', sonda: sonda.length ? JSON.stringify(sonda) : '' });
    return;
  }
  if (comando === 'quedas') {
    let log = '';
    try { log = readFileSync(opc('--log'), 'utf8'); } catch (e) { log = ''; }
    saidaDoFluxo({ quedas: JSON.stringify(quedasComArquivo(log).map((q) => q.nome)) });
    return;
  }
  if (comando === 'presonda') {
    let quedas = [];
    try { quedas = JSON.parse(process.env.FILA_SONDA || '[]'); } catch (e) { quedas = []; }
    const res = reexecutar({ cwd, quedas: Array.isArray(quedas) ? quedas.slice(0, MAX_REEXECUCOES) : [] });
    const veredito = resultadoDaPresonda(res);
    resumo(`### Pré-sonda (main vermelho): ${veredito === 'caem' ? 'as quedas ainda caem com estas levas — o portão inteiro não roda, as levas esperam' : veredito === 'passam' ? 'as quedas passam com estas levas — segue o portão inteiro' : 'sem resultado claro — segue o portão inteiro'}`);
    for (const q of res) resumo(`- ${q.resultado === 'cai' ? '✗' : q.resultado === 'passa' ? '✓' : '?'} ${q.nome}${q.arquivo ? ` (${q.arquivo})` : ''}`);
    saidaDoFluxo({ presonda: veredito });
    return;
  }
  const plano = JSON.parse(process.env.FILA_PLANO || readFileSync(opc('--plano'), 'utf8'));
  if (!planoValido(plano)) { console.error('✗ plano fora do formato: nada foi feito.'); process.exit(1); }
  if (comando === 'aplica') {
    const de = montar({ cwd, base: plano.base, ramos: plano.aceitos, conferir: false });
    if (de.arvore !== plano.arvore) { console.error(`✗ a soma remontada (${de.arvore.slice(0, 7)}) não é a do plano (${plano.arvore.slice(0, 7)}).`); process.exit(1); }
    console.log(`soma pronta: ${plano.aceitos.map((a) => a.nome).join(' + ')} sobre ${plano.base.slice(0, 7)} → árvore ${de.arvore.slice(0, 7)}`);
    return;
  }
  if (comando === 'herdadas') {
    let log = '';
    try { log = readFileSync(opc('--log'), 'utf8'); } catch (e) { log = ''; }
    const h = herdadasNoMain({ cwd, plano, log });
    const doMain = h.quedas.filter((q) => q.noMain === 'cai').length;
    resumo(`### As quedas caem no main sozinho (${plano.base.slice(0, 7)})? ${h.total ? `${doMain} de ${h.total}` : 'nenhuma queda identificada'}${h.porque ? ` — ${h.porque}` : ''}${mainVermelho(h) ? ' → o vermelho é do main: ninguém é recusado' : ''}`);
    for (const q of h.quedas) resumo(`- ${q.noMain === 'cai' ? '✗ cai no main' : q.noMain === 'passa' ? '✓ passa no main' : '? não rodou'} · ${q.nome}${q.arquivo ? ` (${q.arquivo})` : ''}`);
    saidaDoFluxo({ herdadas: JSON.stringify(h) });
    return;
  }
  if (comando === 'avanca') {
    const json = (v) => { try { return JSON.parse(v || 'null'); } catch (e) { return null; } };
    const valida = (h) => (h && Array.isArray(h.quedas) && typeof h.total === 'number' ? h : null);
    // Q23 · dois jobs de portão: o resultado e as quedas de cada um se juntam aqui (com o fila.mjs do main); a forma de um job só continua aceita
    const doisJobs = process.env.FILA_PORTAO_RAPIDA !== undefined || process.env.FILA_PORTAO_TELA !== undefined;
    const portao = doisJobs ? resultadoDoPortao(process.env.FILA_PORTAO_RAPIDA || '', process.env.FILA_PORTAO_TELA || '') : opc('--portao');
    const herdadas = doisJobs
      ? juntarHerdadas([{ resultado: process.env.FILA_PORTAO_RAPIDA, herdadas: valida(json(process.env.FILA_HERDADAS)) }, { resultado: process.env.FILA_PORTAO_TELA, herdadas: valida(json(process.env.FILA_HERDADAS_TELA)) }])
      : valida(json(process.env.FILA_HERDADAS));
    const lista = (v) => { const x = json(v); return Array.isArray(x) ? x : (v ? [v] : []); };
    const motivo = doisJobs ? JSON.stringify([...lista(process.env.FILA_MOTIVO), ...lista(process.env.FILA_MOTIVO_TELA)]) : (process.env.FILA_MOTIVO || opc('--motivo'));
    // o resultado juntado e o resumo saem antes de qualquer passo que possa falhar: a telemetria da rodada depende deles
    saidaDoFluxo({ portao, resumo: doisJobs ? juntarResumos(process.env.FILA_RESUMO_RAPIDA, process.env.FILA_RESUMO_TELA) : (process.env.FILA_RESUMO || '') });
    const r = avancar({ cwd, plano, portao, motivo, presonda: process.env.FILA_PRESONDA || '', herdadas });
    const velhos = tenta(gitEm(cwd), ['fetch', '--quiet', '--depth=200', 'origin', 'main']) === null ? [] : limparAvisos({ cwd });
    const nomes = plano.aceitos.map((a) => `\`${a.nome}\``).join(' + ');
    if (r.publicado) resumo(`### Fila · publicado ${r.publicado.slice(0, 7)} — ${nomes} com um portão`);
    else if (r.acao === 'isolar') resumo(`### Fila · portão vermelho com ${nomes}: nada publicado; a próxima rodada testa \`${r.isolar}\` sozinha`);
    else if (r.acao === 'recusar') resumo(`### Fila · \`${plano.aceitos[0].nome}\` recusada (portão vermelho sozinha); o main não mudou`);
    else if (r.porque) resumo(`### Fila · ${r.porque}`);
    if (r.aviso) resumo(`- ⚠ aviso gravado: \`${AVISO_MAIN}\` (${r.aviso.length} teste(s)); as levas ficam na fila, sem recusa`);
    if (r.avisoMainApagado) resumo(`- · \`${AVISO_MAIN}\` apagado: o main andou com o portão verde`);
    for (const n of velhos) resumo(`- · aviso velho apagado: \`${PREFIXO_RECUSADA}${n}\` (a leva já está no main)`);
    for (const n of r.recusadas) resumo(`- ✗ recusada: \`${n}\` → ramo \`${PREFIXO_RECUSADA}${n}\` com o motivo`);
    tenta(gitEm(cwd), ['fetch', '--quiet', '--prune', 'origin', `+refs/heads/${PREFIXO_FILA}*:refs/remotes/origin/${PREFIXO_FILA}*`]);
    const restam = ramosDaFila(cwd).length;
    // roda de novo quando há o que isolar, quando o main andou por fora, ou quando esta rodada andou e ainda sobrou ramo na fila
    const andou = Boolean(r.publicado || r.recusadas.length || r.apagados.length);
    saidaDoFluxo({ publicado: r.publicado || '', isolar: r.isolar, restam, de_novo: r.isolar || r.deNovo || (andou && restam > 0) ? 'sim' : 'nao' });
    return;
  }
  if (comando === 'situacao') { console.log(JSON.stringify(situacao({ cwd }), null, 2)); return; }
  console.error('uso: node fila.mjs monta|aplica|avanca|situacao (ver o cabeçalho do arquivo)'); process.exit(2);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) principal(process.argv.slice(2));
