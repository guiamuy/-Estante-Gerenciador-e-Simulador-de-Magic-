#!/usr/bin/env node
/* I-325 · executor dos robôs de dados nas rotinas da nuvem do Claude (no lugar dos fluxos do GitHub Actions, que com o
   repositório privado gastariam os minutos grátis em dias). Faz o mesmo que cada fluxo fazia: traz o ramo de dados,
   roda o script do robô e grava no ramo só se mudou.

     node robos.mjs hora            notícias e fila de relatos (rotina de hora em hora; menos de um minuto)
     node robos.mjs dia --fundo     catálogo e sentinelas de cobertura (rotina diária; 15 a 25 min, roda em segundo plano)
     node robos.mjs esperar         acompanha o --fundo por até 9 min; repita até aparecer "FIM"
     node robos.mjs <robo>          um robô só: noticias, relatos-fila, catalogo

   Ficam no GitHub Actions (poucos minutos por mês): artes (semanal), relatos (quando um registro muda), pessoas e
   regras do banco (diários, segundos cada).

   Segredos (variáveis do ambiente "estante-robos" na nuvem do Claude, nunca no repositório):
     TOPDECK_KEY                    catálogo
     FIREBASE_SERVICE_ACCOUNT_B64   fila de relatos (a conta de serviço do Firebase em base64; o JSON vira uma linha só)
     ESTANTE_GITHUB_TOKEN           fila de relatos (token só com Issues: leitura e escrita) */
import { spawnSync, spawn } from 'node:child_process';
import { mkdtempSync, existsSync, writeFileSync, readFileSync, appendFileSync, rmSync, openSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('.', import.meta.url));
const LOG = join(tmpdir(), 'estante-robos.log');
const FIM = join(tmpdir(), 'estante-robos.fim');

/** Ramo de cada robô e o README de quando o ramo ainda não existe (o mesmo texto dos fluxos). */
export const RAMOS = {
  noticias: ['# Estante · notícias', '', 'Ramo gerado pelo robô "Notícias" (`noticias.mjs`, no `main`). Não edite à mão: cada coleta regrava os arquivos.'],
  catalogo: ['# Estante · catálogo de listas', '', 'Ramo gerado pelo robô "Catálogo" (`catalogo.mjs`, no `main`). Não edite à mão.', '', 'Fonte: MTGJSON (https://mtgjson.com), licença MIT.'],
  relatos: ['# Estante · relatos', '', 'Ramo gerado pelo robô "Relatos" (`relatos-tabela.mjs`, no `main`). Não edite à mão.'],
};

/** Variáveis para os scripts: os segredos do ambiente no formato que cada script espera. */
export function ambiente(base = process.env) {
  const env = { ...base };
  if (!env.FIREBASE_SERVICE_ACCOUNT && env.FIREBASE_SERVICE_ACCOUNT_B64) env.FIREBASE_SERVICE_ACCOUNT = Buffer.from(env.FIREBASE_SERVICE_ACCOUNT_B64, 'base64').toString('utf8');
  if (env.ESTANTE_GITHUB_TOKEN) env.GITHUB_TOKEN = env.ESTANTE_GITHUB_TOKEN; // o token da sessão na nuvem não abre registros
  delete env.FIREBASE_SERVICE_ACCOUNT_B64;
  return env;
}

const diz = (t) => console.log(t);
const git = (args, opc = {}) => spawnSync('git', args, { encoding: 'utf8', cwd: RAIZ, ...opc });
const node = (args, env, opc = {}) => spawnSync(process.execPath, args, { cwd: RAIZ, env, stdio: 'inherit', timeout: 25 * 60000, ...opc });

/** Traz o ramo publicado para uma pasta à parte (ou começa o ramo vazio com o README). */
export function trazer(ramo, cwd = RAIZ) {
  const saida = mkdtempSync(join(tmpdir(), `robo-${ramo}-`));
  rmSync(saida, { recursive: true, force: true });
  const existe = git(['ls-remote', '--exit-code', '--heads', 'origin', ramo], { cwd }).status === 0;
  if (existe) {
    if (git(['fetch', '--quiet', '--depth', '1', 'origin', ramo], { cwd }).status !== 0) throw new Error(`não consegui buscar o ramo ${ramo}`);
    if (git(['worktree', 'add', '--quiet', '--detach', saida, 'FETCH_HEAD'], { cwd }).status !== 0) throw new Error(`não consegui abrir o ramo ${ramo}`);
  } else {
    git(['worktree', 'add', '--quiet', '--detach', saida], { cwd });
    git(['switch', '--quiet', '--orphan', `robo-${ramo}`], { cwd: saida });
    writeFileSync(join(saida, 'README.md'), (RAMOS[ramo] || [`# Estante · ${ramo}`]).join('\n') + '\n');
  }
  return saida;
}

/** Grava no ramo só se mudou. Devolve 'sem mudança', 'gravado' ou lança erro. */
export function gravar(saida, ramo, autor, mensagem) {
  git(['add', '-A'], { cwd: saida });
  if (git(['diff', '--cached', '--quiet'], { cwd: saida }).status === 0) return 'sem mudança';
  const c = git(['-c', `user.name=${autor}`, '-c', 'user.email=noreply@anthropic.com', 'commit', '--quiet', '-m', mensagem], { cwd: saida });
  if (c.status !== 0) throw new Error(`commit no ramo ${ramo} falhou: ${c.stderr}`);
  const p = git(['push', '--quiet', 'origin', `HEAD:refs/heads/${ramo}`], { cwd: saida });
  if (p.status !== 0) throw new Error(`push no ramo ${ramo} recusado (alguém gravou no meio? a próxima rodada refaz): ${p.stderr}`);
  return 'gravado';
}

const agora = () => new Date().toISOString().slice(0, 16) + 'Z';
function fechar(saida) { git(['worktree', 'remove', '--force', saida]); }

export const ROBOS = {
  noticias(env) {
    const s = trazer('noticias');
    try {
      const r = node(['noticias.mjs', '--saida', s], env);
      // como no fluxo: grava também quando a coleta acusa (índice com as falhas; o que estava no ar continua)
      const g = gravar(s, 'noticias', 'estante-noticias', `Notícias · coleta de ${agora()}`);
      if (r.status !== 0) throw new Error(`notícias: a coleta acusou falha (${g})`);
      return g;
    } finally { fechar(s); }
  },
  'relatos-fila'(env) {
    if (!env.FIREBASE_SERVICE_ACCOUNT || !env.ESTANTE_GITHUB_TOKEN) throw new Error('relatos-fila: faltam FIREBASE_SERVICE_ACCOUNT_B64 ou ESTANTE_GITHUB_TOKEN no ambiente');
    const s = trazer('relatos');
    const saidas = join(tmpdir(), `robo-saidas-${process.pid}`);
    writeFileSync(saidas, '');
    try {
      const r = node(['relatos-fila.mjs', '--saida', s], { ...env, GITHUB_OUTPUT: saidas });
      if (r.status !== 0) throw new Error('relatos-fila: falhou');
      const o = Object.fromEntries(readFileSync(saidas, 'utf8').split('\n').filter(Boolean).map((l) => l.split('=')));
      const criados = Number(o.criados || 0);
      if (criados && node(['relatos-tabela.mjs', '--saida', s], env).status !== 0) throw new Error('relatos-tabela: falhou');
      if (!criados && o.ligou !== '1') return 'nada na fila';
      return gravar(s, 'relatos', 'estante-relatos', `Relatos · tabela de ${agora()} (fila)`);
    } finally { fechar(s); rmSync(saidas, { force: true }); }
  },
  catalogo(env) {
    if (!env.TOPDECK_KEY) diz('⚠ sem TOPDECK_KEY: o catálogo sai sem as listas do TopDeck');
    const s = trazer('catalogo');
    try {
      const r = node(['catalogo.mjs', '--saida', s], env);
      // sentinelas: como no fluxo, rodam mesmo se a coleta acusar, e a falha delas não impede a gravação
      const sentinelas = [
        [['--formato', 'pauper'], 10],
        [['--formato', 'commander', '--textos', '300'], 15],
        [['--formato', 'todos', '--exceto', 'pauper,commander', '--textos', '0', '--textos-competitivos', '150'], 20],
      ];
      for (const [a, min] of sentinelas) {
        const c = node(['cobertura.mjs', '--catalogo', s, ...a], env, { timeout: min * 60000 });
        if (c.status !== 0) diz(`⚠ sentinela ${a[1]} não terminou (segue)`);
      }
      const g = gravar(s, 'catalogo', 'estante-catalogo', `Catálogo · coleta de ${agora()}`);
      if (r.status !== 0) throw new Error(`catálogo: a coleta acusou falha (${g})`);
      return g;
    } finally { fechar(s); }
  },
};
export const GRUPOS = { hora: ['noticias', 'relatos-fila'], dia: ['catalogo'] };

/** Roda os robôs pedidos; um que cai não impede os outros. Devolve true se todos passaram. */
export function rodar(nomes, env = ambiente()) {
  git(['fetch', '--quiet', 'origin', 'main']);
  let ok = true;
  for (const n of nomes) {
    const t = Date.now();
    diz(`\n── ${n}`);
    try { diz(`✓ ${n}: ${ROBOS[n](env)} (${Math.round((Date.now() - t) / 1000)} s)`); } catch (e) { ok = false; diz(`✗ ${n}: ${e.message}`); }
  }
  return ok;
}

function esperar() {
  const ate = Date.now() + 9 * 60000;
  let lido = 0;
  for (;;) {
    if (existsSync(LOG)) { const t = readFileSync(LOG, 'utf8'); if (t.length > lido) { process.stdout.write(t.slice(lido)); lido = t.length; } }
    if (existsSync(FIM)) { diz(`\nFIM ${readFileSync(FIM, 'utf8').trim()}`); return; }
    if (!existsSync(LOG)) { diz('Nada rodando em segundo plano (rode com --fundo).'); return; }
    if (Date.now() > ate) { diz(`\nCONTINUA (rodando há ${Math.round((Date.now() - statSync(LOG).birthtimeMs) / 60000)} min): rode "node robos.mjs esperar" de novo`); return; }
    spawnSync('sleep', ['10']);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [pedido] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  if (pedido === 'esperar') { esperar(); process.exit(0); }
  const nomes = GRUPOS[pedido] || (ROBOS[pedido] ? [pedido] : null);
  if (!nomes) { console.error(`Uso: node robos.mjs <${[...Object.keys(GRUPOS), ...Object.keys(ROBOS), 'esperar'].join('|')}> [--fundo]`); process.exit(2); }
  if (process.argv.includes('--fundo') && !process.env.ROBOS_FILHO) {
    rmSync(FIM, { force: true });
    writeFileSync(LOG, `robôs ${nomes.join(', ')} · início ${agora()}\n`);
    const fd = openSync(LOG, 'a');
    spawn(process.execPath, [fileURLToPath(import.meta.url), pedido], { detached: true, stdio: ['ignore', fd, fd], env: { ...process.env, ROBOS_FILHO: '1' } }).unref();
    diz(`Em segundo plano. Acompanhe com: node robos.mjs esperar`);
    process.exit(0);
  }
  const ok = rodar(nomes);
  if (process.env.ROBOS_FILHO) appendFileSync(FIM, ok ? 'ok' : 'falhou');
  process.exit(ok ? 0 : 1);
}
