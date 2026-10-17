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
import { readdirSync, appendFileSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
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
/** R-21 · BI2-6 · Resumo de uma fase lido da saída TAP: passaram/caíram (linhas `# pass`/`# fail`), quedas em testes de
    orçamento (nome com "orçamento"), telas auditadas (linhas `# auditaTela · <nome>` que o helper do e2e imprime). Puro. */
export function resumoDoTap(tap) {
  const s = String(tap || '');
  // I-292 · em fatias (CI) a saída tem um `# pass` por fatia: soma; sem nenhuma linha, null
  const n = (rx) => { const ms = [...s.matchAll(rx)]; return ms.length ? ms.reduce((t, m) => t + Number(m[1]), 0) : null; };
  const caidos = [...s.matchAll(/^\s*not ok \d+ - (.+?)\s*(?:# .*)?$/gm)].map((m) => m[1]).filter((x) => !/\.test\.mjs$/.test(x));
  const quedasOrcamento = [...new Set(caidos.filter((x) => /or[çc]amento/i.test(x)))];
  // o relator TAP do Node escreve o console.log do teste como `# \# auditaTela · nome` (escapa o # do texto): aceitar as duas formas
  const telas = [...new Set([...s.matchAll(/^\s*#\s*(?:\\#\s*)?auditaTela · (.+?)\s*$/gm)].map((m) => m[1]))];
  // R-24 · linhas `# medida · <nome> · chave=valor · …` (X11 e X14 do scanner imprimem as suas): as chaves do mesmo nome se juntam, a última de cada chave vale (R-26)
  const medidas = {};
  for (const m of s.matchAll(/^\s*#\s*(?:\\#\s*)?medida · ([a-z_]{2,30})((?: · [a-z_]{2,30}=-?\d+(?:\.\d+)?)+)\s*$/gm)) {
    const v = {}; for (const par of m[2].split(' · ').filter(Boolean)) { const [k, x] = par.split('='); v[k] = Number(x); }
    medidas[m[1]] = { ...(medidas[m[1]] || {}), ...v };
  }
  return { passaram: n(/^# pass (\d+)/gm), cairam: n(/^# fail (\d+)/gm), quedasOrcamento, telas, medidas };
}
/** R-21 · o resumo do portão vai para `.tmp/portao.json` (fora do git), por fase: a fase rápida e a de tela cada uma grava a sua parte,
    o histórico guarda as últimas 30 corridas (verde ou vermelha). `node telemetria.mjs leva … --portao` carrega isso na leva. */
export function juntaResumo(atual, parcial, agora = new Date().toISOString()) {
  const base = atual && typeof atual === 'object' ? atual : {};
  const historico = [...(base.historico || []), { em: agora, fase: parcial.fase, verde: !!parcial.verde, quedasOrcamento: (parcial.quedasOrcamento || []).length, instaveis: (parcial.instaveis || []).length }].slice(-30);
  const novo = { kind: 'estante.portao', version: 1, em: agora, rapido: base.rapido || null, tela: base.tela || null, consumidoEm: base.consumidoEm || null, historico };
  if (parcial.fase === 'rapido') novo.rapido = { em: agora, verde: !!parcial.verde, minutos: parcial.minutos ?? null, passaram: parcial.passaram, cairam: parcial.cairam, quedasOrcamento: parcial.quedasOrcamento || [] };
  if (parcial.fase === 'tela') novo.tela = { em: agora, verde: !!parcial.verde, minutos: parcial.minutos ?? null, passaram: parcial.passaram, cairam: parcial.cairam, quedasOrcamento: parcial.quedasOrcamento || [], instaveis: parcial.instaveis || [], telas: parcial.telas || [], medidas: parcial.medidas || {} };
  return novo;
}
const ARQUIVO_RESUMO = join(RAIZ, '.tmp', 'portao.json');
function gravaResumo(parcial) {
  try {
    let atual = null; try { atual = JSON.parse(readFileSync(ARQUIVO_RESUMO, 'utf8')); } catch (e) { atual = null; }
    mkdirSync(dirname(ARQUIVO_RESUMO), { recursive: true });
    writeFileSync(ARQUIVO_RESUMO, JSON.stringify(juntaResumo(atual, parcial), null, 1) + '\n');
  } catch (e) { /* o resumo nunca derruba o portão */ }
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

/* ---------- Q19 · fase de tela em fatias ---------- */

/** Em quantos processos a fase de tela roda. Cada fatia tem o seu Chromium, e os testes de tela dependem de tempo: só vale
    dividir com dois núcleos por fatia. Dois núcleos (conversas de nuvem) → 1, como sempre foi; quatro (CI) → 2. `PORTAO_FATIAS` manda. */
export function fatiasDeTela(nucleos = availableParallelism(), env = process.env) {
  const pedido = Number(env.PORTAO_FATIAS);
  if (Number.isInteger(pedido) && pedido >= 1) return Math.min(pedido, 8);
  return Math.max(1, Math.min(4, Math.floor(nucleos / 2)));
}
/** Embrulha o `test` do Node: com `fatia` = "i/n", o teste de ordem k (pela ordem em que o arquivo os registra) só roda quando
    k % n === i - 1; os outros saem como pulados, com o motivo. Sem fatia (ou com fatia inválida), devolve o `test` como veio.
    Cada teste de tela abre o seu servidor e o seu navegador, então não há estado entre eles para a divisão quebrar. */
export function fatiar(test, fatia) {
  const [, i, n] = String(fatia || '').match(/^(\d+)\/(\d+)$/) || [];
  if (!n || +n < 2 || +i < 1 || +i > +n) return test;
  let k = 0;
  return (nome, ...resto) => {
    const minha = k++ % +n === +i - 1;
    if (minha) return test(nome, ...resto);
    const fn = resto[resto.length - 1], opcoes = resto.length > 1 && typeof resto[0] === 'object' ? resto[0] : {};
    return test(nome, { ...opcoes, skip: opcoes.skip || `fatia ${i}/${n}: roda em outra fatia` }, fn);
  };
}
/** Lê as saídas TAP das fatias e confere que cada teste rodou em exatamente uma. Devolve { total, faltando, repetidos }. */
export function conferirFatias(saidas) {
  const vezes = new Map();
  for (const tap of saidas) {
    for (const m of String(tap).matchAll(/^(?:not )?ok \d+ - (.+?)( # SKIP\b.*)?$/gm)) {
      const nome = m[1].trim();
      if (/\.test\.mjs$/.test(nome)) continue;
      vezes.set(nome, (vezes.get(nome) || 0) + (m[2] ? 0 : 1));
    }
  }
  const nomes = [...vezes.keys()];
  return { total: nomes.length, faltando: nomes.filter((n) => vezes.get(n) === 0), repetidos: nomes.filter((n) => vezes.get(n) > 1) };
}

function roda(args, { eco = true, env = process.env } = {}) {
  return new Promise((resolve) => {
    const filho = spawn(process.execPath, args, { cwd: RAIZ, env, stdio: ['ignore', 'pipe', 'inherit'] });
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
    gravaResumo({ fase: 'rapido', verde: r.ok, minutos: Math.round((Date.now() - inicio) / 6000) / 10, ...resumoDoTap(r.saida) });
    if (!r.ok) { console.error('\n✗ Fase rápida vermelha: a fase de tela nem começou.'); process.exit(1); }
  }
  if (fase === 'tudo' || fase === 'e2e') {
    const t0 = Date.now();
    const fatias = fatiasDeTela();
    titulo(fatias > 1 ? `fase 2 · tela (navegador, sozinha) em ${fatias} fatias, um Chromium por fatia` : 'fase 2 · tela (navegador, sozinha)');
    let r;
    if (fatias === 1) r = await roda(['--test', ...arquivosDaFase('e2e')]);
    else {
      // Q19 · o mesmo arquivo, uma vez por fatia; a primeira aparece ao vivo e as outras em seguida, inteiras
      const partes = await Promise.all(Array.from({ length: fatias }, (_, i) => roda(['--test', ...arquivosDaFase('e2e')], { eco: i === 0, env: { ...process.env, E2E_FATIA: `${i + 1}/${fatias}` } })));
      partes.slice(1).forEach((p, i) => { console.log(`\n# ── fatia ${i + 2}/${fatias}`); process.stdout.write(p.saida); });
      r = { ok: partes.every((p) => p.ok), saida: partes.map((p) => p.saida).join('\n') };
      const c = conferirFatias(partes.map((p) => p.saida));
      console.log(`# fatias: ${c.total} testes, cada um numa fatia só`);
      if (c.faltando.length || c.repetidos.length) {
        console.error(`\n✗ A divisão em fatias deixou teste de fora ou repetiu teste:${c.faltando.map((n) => `\n  não rodou: ${n}`).join('')}${c.repetidos.map((n) => `\n  rodou mais de uma vez: ${n}`).join('')}`);
        process.exit(1);
      }
    }
    console.log(`# fase 2 em ${minutos(Date.now() - t0)}`);
    const resumoTela = { fase: 'tela', verde: r.ok, minutos: Math.round((Date.now() - t0) / 6000) / 10, ...resumoDoTap(r.saida), instaveis: [] };
    process.on('exit', () => gravaResumo(resumoTela));   // R-21 · grava no fim, verde ou vermelho (os instáveis entram abaixo)
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
      resumoTela.verde = true; resumoTela.instaveis = instaveis;
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
