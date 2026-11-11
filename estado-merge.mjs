#!/usr/bin/env node
/* =====================================================================
   I-331 · JUNTADOR DO ESTADO.md (driver de merge do git)
   Toda leva reescreve a sua linha na tabela de trilhas e o rodapé do ESTADO.md. Por isso duas levas
   que nascem do mesmo main batem sempre nessas linhas, no rebase de cada conversa e no trem de
   produção (trem.mjs), que soma vários PRs de uma vez. Este driver resolve sozinho o que é previsível:
     · linha de trilha (| `motor` | …): fica a de leva mais nova da trilha (empate: a que chega);
     · rodapé "Atualizado:": data mais recente e as levas dos dois lados, sem repetir;
       passou de 8 KB, saem as levas mais antigas do rodapé (o histórico mora no git log);
     · qualquer outro trecho em conflito: os dois lados, sem linha repetida.
   Se nem assim couber em 8 KB, devolve conflito (exit 1) para uma pessoa resolver.
   Ligado por .gitattributes (ESTADO.md merge=estado) e pelo `npm install` (prepare).
     node estado-merge.mjs %O %A %B     (o git chama; grava o resultado em %A)
   ===================================================================== */
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const TETO_ESTADO = 8192;
const LINHA_TRILHA = /^\| `([a-z]+)` \|/;
const RODAPE = /^Atualizado: (\d{2})\/(\d{2})\/(\d{4}) · (.*)$/;

const numeroDaLeva = (linha) => { const c = linha.split('|')[4] || ''; const m = c.match(/[A-Z]-(\d+)/); return m ? Number(m[1]) : -1; };
const dataDoRodape = (m) => Number(`${m[3]}${m[2]}${m[1]}`);

/** Junta dois rodapés: data mais nova, levas dos dois lados na ordem em que aparecem, sem repetir. */
export function juntarRodapes(a, b) {
  const ma = a.match(RODAPE), mb = b.match(RODAPE);
  if (!ma || !mb) return b || a;
  const data = dataDoRodape(ma) >= dataDoRodape(mb) ? `${ma[1]}/${ma[2]}/${ma[3]}` : `${mb[1]}/${mb[2]}/${mb[3]}`;
  const itens = [];
  for (const i of [...ma[4].split(' · '), ...mb[4].split(' · ')].map((s) => s.trim()).filter(Boolean)) if (!itens.includes(i)) itens.push(i);
  return `Atualizado: ${data} · ${itens.join(' · ')}`;
}

/** Resolve um bloco em conflito (linhas de um lado e do outro). Devolve as linhas resolvidas. */
export function resolverBloco(nosso, deles) {
  const trilhas = new Map(), outras = [];
  let rodape = '';
  for (const [lado, linhas] of [['nosso', nosso], ['deles', deles]]) {
    for (const l of linhas) {
      const t = l.match(LINHA_TRILHA);
      if (t) {
        const atual = trilhas.get(t[1]);
        if (!atual || numeroDaLeva(l) > numeroDaLeva(atual.linha) || (numeroDaLeva(l) === numeroDaLeva(atual.linha) && lado === 'deles')) trilhas.set(t[1], { linha: l, ordem: atual ? atual.ordem : trilhas.size });
      } else if (RODAPE.test(l)) rodape = rodape ? juntarRodapes(rodape, l) : l;
      else if (!outras.includes(l) || l.trim() === '') outras.push(l);
    }
  }
  const linhasTrilha = [...trilhas.values()].sort((a, b) => a.ordem - b.ordem).map((x) => x.linha);
  return [...linhasTrilha, ...outras, ...(rodape ? [rodape] : [])];
}

/** Corta as levas mais antigas do rodapé até o arquivo caber no teto. O primeiro item fica sempre uma leva ("P-N"). */
export function caberNoTeto(texto, teto = TETO_ESTADO) {
  const linhas = texto.split('\n');
  const i = linhas.findIndex((l) => RODAPE.test(l));
  if (i < 0) return texto;
  const m = linhas[i].match(RODAPE);
  let itens = m[4].split(' · ');
  const montar = () => { linhas[i] = `Atualizado: ${m[1]}/${m[2]}/${m[3]} · ${itens.join(' · ')}`; return linhas.join('\n'); };
  let saida = montar();
  while (Buffer.byteLength(saida, 'utf8') > teto && itens.length > 3) { itens = itens.slice(1); saida = montar(); }
  while (itens.length > 1 && !/^[A-Z]-\d+/.test(itens[0])) { itens = itens.slice(1); saida = montar(); }
  return saida;
}

/** Junta o texto com marcas de conflito do `git merge-file`. Devolve { texto, limpo }. */
export function juntarMarcado(marcado) {
  const saida = [];
  const linhas = marcado.split('\n');
  let modo = '', nosso = [], deles = [];
  for (const l of linhas) {
    if (l.startsWith('<<<<<<< ')) { modo = 'nosso'; nosso = []; deles = []; continue; }
    if (modo && l.startsWith('||||||| ')) { modo = 'base'; continue; }
    if (modo && l === '=======') { modo = 'deles'; continue; }
    if (modo && l.startsWith('>>>>>>> ')) { saida.push(...resolverBloco(nosso, deles)); modo = ''; continue; }
    if (modo === 'nosso') nosso.push(l); else if (modo === 'deles') deles.push(l); else if (modo !== 'base') saida.push(l);
  }
  const texto = caberNoTeto(saida.join('\n'));
  return { texto, limpo: Buffer.byteLength(texto, 'utf8') <= TETO_ESTADO };
}

/** Faz o merge de três vias de base/nosso/deles (textos). Devolve { texto, limpo }. */
export function juntarEstado(base, nosso, deles) {
  const dir = mkdtempSync(join(tmpdir(), 'estado-'));
  const [o, a, b] = ['base', 'nosso', 'deles'].map((n) => join(dir, n));
  writeFileSync(o, base); writeFileSync(a, nosso); writeFileSync(b, deles);
  const r = spawnSync('git', ['merge-file', '-p', '-L', 'nosso', '-L', 'base', '-L', 'deles', a, o, b], { encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.status === 0) return { texto: caberNoTeto(r.stdout), limpo: true };
  if (r.status < 0 || r.status === null || r.status > 127) return { texto: nosso, limpo: false };
  return juntarMarcado(r.stdout);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [O, A, B] = process.argv.slice(2);
  if (!O || !A || !B) { console.error('uso: node estado-merge.mjs <base> <nosso> <deles>'); process.exit(2); }
  const { texto, limpo } = juntarEstado(readFileSync(O, 'utf8'), readFileSync(A, 'utf8'), readFileSync(B, 'utf8'));
  writeFileSync(A, texto);
  if (!limpo) console.error('ESTADO.md: os dois lados não cabem em 8 KB; resolva à mão (resuma, não acrescente).');
  process.exit(limpo ? 0 : 1);
}
