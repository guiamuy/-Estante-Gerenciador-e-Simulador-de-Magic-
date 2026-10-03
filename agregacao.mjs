#!/usr/bin/env node
/* =====================================================================
   Q12 · GUARDA DE AGREGAÇÃO
   Várias conversas publicam no mesmo `main`. Publicar tem de somar: um
   commit não pode apagar o que outra trilha acabou de entregar, a menos
   que diga isso com todas as letras.

   Regra única: um commit novo D não pode apagar linhas que um commit
   recente C, de outra trilha, acrescentou. Passa se D declarar no rodapé

       Sobrescreve: <sha de C> — motivo

   Rodapés lidos na mensagem do commit:
       Trilha: bot | motor | geral | infra | ...   (quem publica)
       Sobrescreve: abc1234, def5678 — motivo      (intenção declarada)

   Também confere: número de leva repetido entre trilhas e histórico
   reescrito (push forçado).

   Uso:
     node agregacao.mjs                       confere origin/main..HEAD
     node agregacao.mjs --faixa A..B          confere uma faixa (CI)
     node agregacao.mjs --pre-push            gancho do git (lê stdin)
     node agregacao.mjs --auditar 40          relatório dos últimos 40, sem falhar
   ===================================================================== */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const JANELA_HORAS = 72;
export const JANELA_COMMITS = 60;
/** Antes desta data havia uma conversa só: commit sem trilha daquele tempo é evolução normal, não disputa. */
export const EPOCA = Date.UTC(2026, 9, 3, 0, 0, 0);
const ZERO = /^0+$/;
const BINARIO = /\.(png|jpe?g|webp|gif|ico|woff2?|ttf|otf|traineddata|gz|zip|pdf)$/i;

/** Commits publicados antes de existir o rodapé `Trilha:`. Só para a janela de 72 h do primeiro dia. */
const LEGADO = {
  '6465a78': 'bot', '56b730f': 'bot', '09946d4': 'bot', '8e53d65': 'bot',
  'b0f6197': 'motor', 'ae01b19': 'motor', 'f9f27d7': 'motor',
  'fd62e03': 'geral', 'f2acf4d': 'geral', '3a0af3b': 'geral', 'e44a413': 'geral', '845dc0d': 'geral', '1bb1d0c': 'geral', 'ada731c': 'geral',
};

/* ---------- parte pura (testável sem git) ---------- */

/** Linha que conta: texto de verdade, não chave solta nem linha em branco. */
export function linhaConta(texto) {
  const t = texto.trim();
  if (t.length < 12) return false;
  return (t.match(/[\p{L}\p{N}]/gu) || []).length >= 6;
}

/** Palavras e números de uma linha, com repetição. */
function fichas(linha) {
  const m = new Map();
  for (const t of linha.match(/[\p{L}\p{N}_$]+/gu) || []) m.set(t, (m.get(t) || 0) + 1);
  return m;
}

/** A linha antiga continua inteira dentro de alguma linha nova? (linha estendida não é perda) */
export function estendida(antiga, novas) {
  const a = fichas(antiga);
  for (const n of novas) {
    if (n.length < antiga.length) continue;
    const b = fichas(n);
    let cabe = true;
    for (const [t, q] of a) if ((b.get(t) || 0) < q) { cabe = false; break; }
    if (cabe) return true;
  }
  return false;
}

/** `git diff --unified=0` → Map(arquivo → { mais:Set, menos:Set }) com linhas aparadas. */
export function lerDiff(texto) {
  const porArquivo = new Map();
  let atual = null, de = null;
  for (const l of texto.split('\n')) {
    if (l.startsWith('diff --git ')) { atual = null; de = null; continue; }
    if (l.startsWith('--- ')) { de = l.slice(4) === '/dev/null' ? null : l.slice(6); continue; }
    if (l.startsWith('+++ ')) {
      const para = l.slice(4) === '/dev/null' ? de : l.slice(6);
      if (!para || BINARIO.test(para)) { atual = null; continue; }
      atual = porArquivo.get(para) || { mais: new Set(), menos: new Set() };
      porArquivo.set(para, atual);
      continue;
    }
    if (!atual || l.startsWith('@@') || l.startsWith('\\')) continue;
    if (l[0] !== '+' && l[0] !== '-') continue;
    const t = l.slice(1).trim();
    if (!linhaConta(t)) continue;
    (l[0] === '+' ? atual.mais : atual.menos).add(t);
  }
  return porArquivo;
}

/** Rodapés da mensagem de commit. */
export function lerRodapes(mensagem) {
  const trilha = (mensagem.match(/^Trilha:\s*([\p{L}\p{N}_-]+)/imu) || [])[1] || '';
  const sobrescreve = [];
  let semMotivo = false;
  for (const m of mensagem.matchAll(/^Sobrescreve:\s*(.+)$/gim)) {
    const [alvos, ...resto] = m[1].split(/\s+[—–-]\s+/);
    const motivo = resto.join(' — ').trim();
    const shas = (alvos.match(/\b[0-9a-f]{7,40}\b/g) || []);
    if (motivo.length < 10) semMotivo = true;
    else sobrescreve.push(...shas.map((s) => s.slice(0, 7)));
  }
  const leva = (mensagem.match(/^Leva (\d+)\b/) || [])[1];
  return { trilha: trilha.toLowerCase(), sobrescreve, semMotivo, leva: leva ? Number(leva) : null };
}

/**
 * Coração da guarda. Tudo o que precisa do git vem pronto:
 *   novos:  commits que vão subir, do mais antigo para o mais novo
 *   janela: commits já publicados, recentes
 *   cada commit: { sha, assunto, trilha, sobrescreve[], semMotivo, leva, data(ms), diff: Map }
 *   linhasDe(sha, arquivo) → Set das linhas (aparadas) do arquivo naquele commit; vazio se não existe
 *   levasPublicadas: [{ leva, sha, trilha }] de todo o histórico já publicado
 */
export function conferir({ novos, janela, linhasDe, levasPublicadas = [] }) {
  const achados = [];
  for (const d of novos) {
    if (d.semMotivo) {
      achados.push({ tipo: 'sem-motivo', commit: d, texto: 'rodapé `Sobrescreve:` sem motivo (use: Sobrescreve: <sha> — motivo com pelo menos 10 letras)' });
    }
    if (!d.trilha) {
      achados.push({ tipo: 'sem-trilha', leve: true, commit: d, texto: 'commit sem o rodapé `Trilha: <nome>`; sem ele a guarda trata tudo como de outra trilha' });
    }
    const limite = d.data - JANELA_HORAS * 3600 * 1000;
    for (const c of janela) {
      if (c.data < limite) continue;
      if (!c.trilha && c.data < EPOCA) continue;                         // tempo de conversa única
      if (c.trilha && d.trilha && c.trilha === d.trilha) continue;      // a própria trilha evolui o que é dela
      if (d.sobrescreve.includes(c.sha.slice(0, 7))) continue;           // intenção declarada
      const apagadas = [], devolvidas = [];
      for (const [arquivo, dc] of c.diff) {
        const dd = d.diff.get(arquivo);
        if (!dd) continue;
        let depois = null;
        for (const linha of dc.mais) {
          if (!dd.menos.has(linha)) continue;
          depois = depois || linhasDe(d.sha, arquivo);
          if (depois.has(linha)) continue;                                 // movida de lugar não conta
          if (estendida(linha, dd.mais)) continue;                         // ganhou conteúdo, não perdeu nenhum
          apagadas.push({ arquivo, linha });
        }
        for (const linha of dc.menos) {
          if (dd.mais.has(linha) && !dc.mais.has(linha)) devolvidas.push({ arquivo, linha });
        }
      }
      if (apagadas.length) achados.push({ tipo: 'sobrescrita', commit: d, de: c, apagadas, devolvidas });
    }
    if (d.leva != null) {
      const choque = levasPublicadas.find((p) => p.leva === d.leva && !(p.trilha && d.trilha && p.trilha === d.trilha));
      if (choque) {
        const usadas = [...levasPublicadas.map((p) => p.leva), ...novos.map((n) => n.leva || 0)];
        achados.push({ tipo: 'leva-repetida', commit: d, de: choque, livre: Math.max(...usadas) + 1 });
      }
    }
  }
  return achados;
}

/** Texto para humano e para agente: o que sumiu, de quem, e as duas saídas. */
export function relatar(achados) {
  const out = [];
  for (const a of achados) {
    const quem = `${a.commit.sha.slice(0, 7)} "${a.commit.assunto.slice(0, 70)}"`;
    if (a.tipo === 'sobrescrita') {
      const de = `${a.de.sha.slice(0, 7)} "${a.de.assunto.slice(0, 70)}"${a.de.trilha ? ` [trilha ${a.de.trilha}]` : ''}`;
      out.push(`✗ SOBRESCRITA  ${quem}`);
      out.push(`  apaga ${a.apagadas.length} linha(s) entregue(s) por ${de}`);
      const porArquivo = {};
      for (const x of a.apagadas) (porArquivo[x.arquivo] = porArquivo[x.arquivo] || []).push(x.linha);
      for (const [arq, ls] of Object.entries(porArquivo)) {
        out.push(`  ${arq} (${ls.length}):`);
        ls.slice(0, 4).forEach((l) => out.push(`    - ${l.slice(0, 150)}`));
        if (ls.length > 4) out.push(`    … e mais ${ls.length - 4}`);
      }
      if (a.devolvidas.length) out.push(`  e devolve ${a.devolvidas.length} linha(s) que aquele commit tinha apagado: sinal de cópia antiga do arquivo por cima da nova.`);
      out.push(`  Saída 1 (padrão): traga as linhas de volta — git show ${a.de.sha.slice(0, 7)} -- ${Object.keys(porArquivo).join(' ')}`);
      out.push(`  Saída 2 (só se for de propósito): acrescente ao commit o rodapé`);
      out.push(`      Sobrescreve: ${a.de.sha.slice(0, 7)} — <por que a entrega da outra trilha sai>`);
    } else if (a.tipo === 'leva-repetida') {
      out.push(`✗ LEVA REPETIDA  ${quem}`);
      out.push(`  a leva ${a.commit.leva} já foi publicada em ${a.de.sha.slice(0, 7)}${a.de.trilha ? ` [trilha ${a.de.trilha}]` : ''}. Próxima livre: ${a.livre}. Renumere no commit e no ROADMAP.`);
    } else {
      out.push(`✗ ${quem}: ${a.texto}`);
    }
    out.push('');
  }
  return out.join('\n');
}

/* ---------- adaptador git ---------- */

function git(args, opts = {}) {
  return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 30, stdio: ['ignore', 'pipe', 'pipe'], ...opts });
}
function tenta(args) { try { return git(args).trim(); } catch (e) { return null; } }

export function commitDoGit(sha, cwd) {
  const g = (a) => git(a, cwd ? { cwd } : {});
  const bruto = g(['log', '-1', '--format=%H%x00%ct%x00%s%x00%B', sha]);
  const [h, ct, assunto, corpo] = bruto.split('\0');
  const r = lerRodapes(corpo);
  const temPai = (() => { try { g(['rev-parse', '--verify', '--quiet', `${h}^`]); return true; } catch (e) { return false; } })();
  const diff = temPai ? lerDiff(g(['diff', '--unified=0', '--no-color', '--no-renames', `${h}^`, h])) : new Map();
  return { sha: h, assunto, data: Number(ct) * 1000, diff, ...r, trilha: r.trilha || LEGADO[h.slice(0, 7)] || '', semPai: !temPai };
}

function linhasDoGit(cwd) {
  const cache = new Map();
  return (sha, arquivo) => {
    const k = sha + ':' + arquivo;
    if (!cache.has(k)) {
      let texto = '';
      try { texto = git(['show', `${sha}:${arquivo}`], cwd ? { cwd } : {}); } catch (e) { texto = ''; }
      cache.set(k, new Set(texto.split('\n').map((l) => l.trim())));
    }
    return cache.get(k);
  };
}

/** Clone raso não enxerga a janela: busca mais histórico, sem `--unshallow`. */
function garantirHistorico(cwd) {
  const o = cwd ? { cwd } : {};
  let raso = false;
  try { raso = git(['rev-parse', '--is-shallow-repository'], o).trim() === 'true'; } catch (e) { /* git antigo */ }
  if (!raso) return;
  const tem = Number(git(['rev-list', '--count', 'HEAD'], o).trim());
  if (tem > JANELA_COMMITS + 5) return;
  try { git(['fetch', '--quiet', `--depth=${JANELA_COMMITS * 2}`, 'origin', 'main'], o); } catch (e) {
    console.error('aviso: não consegui buscar mais histórico; a janela de conferência fica menor.');
  }
}

/** Confere a faixa base..topo do repositório em `cwd`. */
export function conferirFaixa(base, topo, { cwd } = {}) {
  const o = cwd ? { cwd } : {};
  const lista = (a) => { const s = git(a, o).trim(); return s ? s.split('\n') : []; };
  const shasNovos = lista(['rev-list', '--reverse', '--first-parent', `${base}..${topo}`]);
  if (!shasNovos.length) return { achados: [], novos: [], janela: [] };
  const shasJanela = lista(['rev-list', `--max-count=${JANELA_COMMITS}`, base]);
  const novos = shasNovos.map((s) => commitDoGit(s, cwd));
  const janela = shasJanela.map((s) => commitDoGit(s, cwd)).filter((c) => !c.semPai);
  const levasPublicadas = lista(['log', '--format=%h%x00%B%x01', base]).join('\n').split('\x01').map((bloco) => {
    const [h, corpo = ''] = bloco.trim().split('\0');
    const r = lerRodapes(corpo);
    return r.leva == null ? null : { leva: r.leva, sha: h, trilha: r.trilha || LEGADO[h.slice(0, 7)] || '' };
  }).filter(Boolean);
  const achados = conferir({ novos, janela, linhasDe: linhasDoGit(cwd), levasPublicadas });
  return { achados, novos, janela };
}

/* ---------- linha de comando ---------- */

function sair(todos, contexto, { tolerarLeves = false } = {}) {
  const leves = tolerarLeves ? todos.filter((a) => a.leve) : [];
  const achados = todos.filter((a) => !leves.includes(a));
  for (const a of leves) console.log(`aviso: ${a.commit.sha.slice(0, 7)} ${a.texto}`);
  if (!achados.length) { console.log(`agregação ✓ ${contexto}`); process.exit(0); }
  console.error(`\nGuarda de agregação: ${achados.length} achado(s) — ${contexto}\n`);
  console.error(relatar(achados));
  console.error('Nada foi publicado. Ver CLAUDE.md, seção "Publicar".');
  process.exit(1);
}

function principal(argv) {
  const i = (f) => argv.indexOf(f);
  if (i('--auditar') >= 0) {
    garantirHistorico();
    const n = Number(argv[i('--auditar') + 1]) || 30;
    const shas = git(['rev-list', '--reverse', `--max-count=${n}`, 'HEAD']).trim().split('\n');
    let total = 0;
    for (const s of shas) {
      if (!tenta(['rev-parse', '--verify', '--quiet', `${s}^`])) continue;
      const { achados } = conferirFaixa(`${s}^`, s);
      const sobrescritas = achados.filter((a) => a.tipo === 'sobrescrita');
      total += sobrescritas.length;
      const d = commitDoGit(s);
      console.log(`${sobrescritas.length ? '✗' : '✓'} ${s.slice(0, 7)} [${d.trilha || '?'}] ${d.assunto.slice(0, 80)}`);
      for (const a of sobrescritas) console.log(`    apaga ${a.apagadas.length} linha(s) de ${a.de.sha.slice(0, 7)} [${a.de.trilha || '?'}] em ${[...new Set(a.apagadas.map((x) => x.arquivo))].join(', ')}${a.devolvidas.length ? ` · devolve ${a.devolvidas.length}` : ''}`);
    }
    console.log(`\n${total} sobrescrita(s) entre trilhas nos últimos ${shas.length} commits.`);
    return;
  }
  if (i('--pre-push') >= 0) {
    const entrada = readFileSync(0, 'utf8').trim();
    const achados = [];
    for (const l of entrada ? entrada.split('\n') : []) {
      const [, local, refRemota, remoto] = l.split(' ');
      if (refRemota !== 'refs/heads/main' || ZERO.test(local)) continue;
      if (ZERO.test(remoto)) continue;
      if (tenta(['cat-file', '-e', `${remoto}^{commit}`]) === null) {
        console.error('✗ O main remoto tem commits que este clone ainda não buscou. Rode: npm run publicar'); process.exit(1);
      }
      if (tenta(['merge-base', '--is-ancestor', remoto, local]) === null) {
        console.error('✗ Push forçado no main: apagaria commits publicados por outra trilha. Rode: npm run publicar'); process.exit(1);
      }
      garantirHistorico();
      achados.push(...conferirFaixa(remoto, local).achados);
    }
    sair(achados, 'antes do push');
  }
  let base = 'origin/main', topo = 'HEAD';
  if (i('--faixa') >= 0) {
    [base, topo] = argv[i('--faixa') + 1].split('..');
    if (!base || ZERO.test(base)) { console.log('agregação: primeiro push do ramo, nada a comparar.'); return; }
    garantirHistorico();
    if (tenta(['cat-file', '-e', `${base}^{commit}`]) === null) {
      console.error(`✗ HISTÓRICO REESCRITO: o commit anterior do main (${base.slice(0, 7)}) não está mais no histórico. Houve push forçado.`); process.exit(1);
    }
    if (tenta(['merge-base', '--is-ancestor', base, topo]) === null) {
      console.error(`✗ HISTÓRICO REESCRITO: ${base.slice(0, 7)} não é ancestral de ${topo.slice(0, 7)}. Houve push forçado; commits publicados sumiram do main.`); process.exit(1);
    }
  } else {
    garantirHistorico();
  }
  const { achados, novos } = conferirFaixa(base, topo);
  sair(achados, `${novos.length} commit(s) em ${base.slice(0, 12)}..${topo.slice(0, 12)}`, { tolerarLeves: i('--faixa') >= 0 });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) principal(process.argv.slice(2));
