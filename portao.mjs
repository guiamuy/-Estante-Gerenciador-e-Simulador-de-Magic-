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
import { readdirSync, appendFileSync } from 'node:fs';
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

function roda(args, { eco = true } = {}) {
  return new Promise((resolve) => {
    const filho = spawn(process.execPath, args, { cwd: RAIZ, env: process.env, stdio: ['ignore', 'pipe', 'inherit'] });
    let saida = '';
    filho.stdout.on('data', (d) => { saida += d; if (eco) process.stdout.write(d); });
    filho.on('close', (codigo) => resolve({ ok: codigo === 0, saida }));
  });
}
const titulo = (t) => console.log(`\n# ── portão · ${t}`);
const minutos = (ms) => `${(ms / 60000).toFixed(1)} min`;

async function principal() {
  const fase = process.env.PORTAO_FASE || process.argv[2] || 'tudo';
  const inicio = Date.now();
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
