#!/usr/bin/env node
/* =====================================================================
   Q14 · PORTÃO EM DUAS FASES — `npm test`
   Antes: um `node --test` só, com todos os arquivos em paralelo. O fuzz, os
   torneios do bot e o Chromium disputavam o processador, e os testes de tela
   que dependem de tempo caíam por sorteio (um portão de 25 min por queda).

   Agora:
     fase 1 · rápida   tudo menos o navegador, em paralelo. Caiu, para aqui.
     fase 2 · tela     e2e.test.mjs sozinho, sem concorrência.
     repetição         teste de tela que caiu roda de novo, sozinho, UMA vez.
                       Passou → o portão passa e o teste sai na lista de
                       INSTÁVEIS (aviso alto, e anotação no CI). Caiu de novo →
                       portão vermelho. A fase rápida nunca é repetida.

     npm test                      as duas fases
     npm run test:rapido           só a fase 1
     npm run test:e2e              só a fase 2 (com a repetição)
     PORTAO_SEM_REPETIR=1 npm test sem a segunda chance (para caçar instabilidade)
   ===================================================================== */
import { spawn } from 'node:child_process';
import { readdirSync, appendFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { availableParallelism } from 'node:os';

const RAIZ = dirname(fileURLToPath(import.meta.url));
export const ARQUIVO_DE_TELA = 'e2e.test.mjs';
/** Arquivos de cada fase: tudo o que termina em .test.mjs na raiz; o de tela fica sozinho na fase 2. */
export function arquivosDaFase(fase, nomes = readdirSync(RAIZ)) {
  const testes = nomes.filter((n) => n.endsWith('.test.mjs')).sort();
  return fase === 'e2e' ? testes.filter((n) => n === ARQUIVO_DE_TELA) : testes.filter((n) => n !== ARQUIVO_DE_TELA);
}
/** Nomes dos testes de primeiro nível que falharam, lidos da saída TAP. */
export function falhasDoTap(tap) {
  return [...String(tap).matchAll(/^not ok \d+ - (.+)$/gm)].map((m) => m[1].trim()).filter((n) => !/\.test\.mjs$/.test(n));
}
/** Padrão que casa só com aquele nome de teste (para --test-name-pattern). */
export const padraoExato = (nome) => '^' + nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$';

/** Q15 · um fluxo dispara em push de qualquer ramo? Lê o bloco `on:` do YAML: `push:` sem `branches:` logo abaixo é push sem filtro
    (também nas formas `on: push` e `on: [push, …]`). Ramo de serviço não pode custar um portão de 22 minutos. */
export function pushSemFiltro(yml) {
  const linhas = String(yml).split('\n').map((l) => l.replace(/\s+#.*$/, '').replace(/\s+$/, ''));
  const i = linhas.findIndex((l) => /^on:/.test(l));
  if (i < 0) return false;
  if (/^on:\s*\S/.test(linhas[i])) return /\bpush\b/.test(linhas[i]);
  for (let j = i + 1; j < linhas.length && (!linhas[j] || /^\s/.test(linhas[j])); j++) {
    if (!/^\s+push:/.test(linhas[j])) continue;
    if (/^\s+push:\s*\S/.test(linhas[j])) return false;                 // push: { branches: [...] } numa linha só
    const recuo = linhas[j].match(/^\s+/)[0].length;
    for (let k = j + 1; k < linhas.length && (!linhas[k] || linhas[k].match(/^\s*/)[0].length > recuo); k++) if (/^\s+branches:/.test(linhas[k])) return false;
    return true;
  }
  return false;
}

function roda(args, { eco = true } = {}) {
  return new Promise((resolve) => {
    const filho = spawn(process.execPath, args, { cwd: RAIZ, env: process.env, stdio: ['ignore', 'pipe', 'inherit'] });
    let saida = '';
    filho.stdout.on('data', (d) => { saida += d; if (eco) process.stdout.write(d); });
    filho.on('close', (codigo) => resolve({ ok: codigo === 0, saida }));
  });
}
/** Q16 · o navegador da fase de tela existe? Sem ele cada teste de tela cai em 30 ms, um a um, e a causa some no meio de 180 quedas.
    Ordem: PW_CHROMIUM (se o arquivo existe) → o caminho que o Playwright instalado espera → um Chromium de outra revisão na pasta
    de navegadores (sessões de nuvem trazem a 1194 e o package.json pede outra). Devolve { caminho, origem } ou { erro }. */
export function navegadorDeTela({ env = process.env, existe = existsSync, lista = (d) => { try { return readdirSync(d); } catch (e) { return []; } }, padrao = '' } = {}) {
  if (env.PW_CHROMIUM) return existe(env.PW_CHROMIUM) ? { caminho: env.PW_CHROMIUM, origem: 'PW_CHROMIUM' } : { erro: `PW_CHROMIUM aponta para um arquivo que não existe: ${env.PW_CHROMIUM}` };
  if (padrao && existe(padrao)) return { caminho: '', origem: 'playwright' };
  const pasta = env.PLAYWRIGHT_BROWSERS_PATH || '';
  const nomes = pasta ? lista(pasta).sort().reverse() : [];
  for (const [rx, resto] of [[/^chromium_headless_shell-\d+$/, 'chrome-linux/headless_shell'], [/^chromium-\d+$/, 'chrome-linux/chrome']]) {
    for (const n of nomes.filter((x) => rx.test(x))) { const c = join(pasta, n, resto); if (existe(c)) return { caminho: c, origem: 'outra revisão' }; }
  }
  return { erro: 'Não achei o Chromium da fase de tela. Rode `npx playwright install chromium` ou aponte PW_CHROMIUM para o executável.' };
}
/** Confere o navegador antes de gastar a fase rápida; quando acha um de outra revisão, liga PW_CHROMIUM para os processos filhos. */
export async function garantirNavegador() {
  let padrao = '';
  try { padrao = (await import('playwright')).chromium.executablePath(); } catch (e) { return { erro: 'O pacote `playwright` não está instalado. Rode `npm install`.' }; }
  const r = navegadorDeTela({ padrao });
  if (r.origem === 'outra revisão') { process.env.PW_CHROMIUM = r.caminho; console.log(`# navegador: o Playwright instalado espera outra revisão; usando ${r.caminho}`); }
  return r;
}
const titulo = (t) => console.log(`\n# ── portão · ${t}`);
const minutos = (ms) => `${(ms / 60000).toFixed(1)} min`;

async function principal() {
  const fase = process.env.PORTAO_FASE || process.argv[2] || 'tudo';
  const inicio = Date.now();
  if (fase === 'tudo' || fase === 'e2e') {
    const nav = await garantirNavegador();
    if (nav.erro) { console.error(`\n✗ ${nav.erro}\n  O portão nem começou.`); process.exit(1); }
  }
  if (fase === 'tudo' || fase === 'rapido') {
    const arquivos = arquivosDaFase('rapido');
    titulo(`fase 1 · rápida (${arquivos.length} arquivos, sem navegador)`);
    // um processo por núcleo (o padrão do Node deixa um núcleo livre: em máquina de dois núcleos os arquivos rodavam em fila)
    const r = await roda(['--test', `--test-concurrency=${Math.max(2, availableParallelism())}`, ...arquivos]);
    console.log(`# fase 1 em ${minutos(Date.now() - inicio)}`);
    if (!r.ok) { console.error('\n✗ Fase rápida vermelha: a fase de tela nem começou.'); process.exit(1); }
  }
  if (fase === 'tudo' || fase === 'e2e') {
    const t0 = Date.now();
    titulo('fase 2 · tela (navegador, sozinha)');
    const r = await roda(['--test', ...arquivosDaFase('e2e')]);
    console.log(`# fase 2 em ${minutos(Date.now() - t0)}`);
    if (!r.ok) {
      const caidos = falhasDoTap(r.saida);
      if (process.env.PORTAO_SEM_REPETIR || !caidos.length || caidos.length > 5) {
        console.error(`\n✗ Fase de tela vermelha (${caidos.length || '?'} teste(s))${caidos.length > 5 ? ': mais de cinco quedas não é instabilidade, não repito' : ''}.`);
        process.exit(1);
      }
      const instaveis = [];
      for (const nome of caidos) {
        titulo(`repetição, sozinho · ${nome.slice(0, 110)}`);
        const de = await roda(['--test', `--test-name-pattern=${padraoExato(nome)}`, ARQUIVO_DE_TELA]);
        // precisa ter rodado de verdade: nome que não casa com nada "passa" sem testar coisa alguma
        const rodou = new RegExp(`^ok \\d+ - ${padraoExato(nome).slice(1, -1)}$`, 'm').test(de.saida);
        if (!de.ok || !rodou) { console.error(`\n✗ Caiu de novo, sozinho: ${nome}\n  Não é instabilidade de carga. Portão vermelho.`); process.exit(1); }
        instaveis.push(nome);
      }
      console.log(`\n# ⚠ INSTÁVEIS — caíram com o portão inteiro e passaram sozinhos (${instaveis.length}). O portão passa, mas cada um é dívida da trilha dona:`);
      for (const nome of instaveis) {
        console.log(`#   · ${nome}`);
        if (process.env.GITHUB_ACTIONS) console.log(`::warning title=Teste instável::${nome.slice(0, 180)}`);
      }
      if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Testes instáveis nesta rodada\n${instaveis.map((n) => `- ${n}`).join('\n')}\n`);
    }
  }
  console.log(`\n# portão verde em ${minutos(Date.now() - inicio)}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) principal();
