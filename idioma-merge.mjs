#!/usr/bin/env node
/* =====================================================================
   I-333 · JUNTADOR DOS PACOTES DE IDIOMA (driver de merge do git)
   Os pacotes em idiomas/*.json são JSON de UMA linha só (en.json e es.json passam de 450 KB) e
   cada leva acrescenta as suas frases no fim de `exato` e de `modelos`. Para o git, duas levas que
   traduzem qualquer coisa mudaram a mesma linha: conflito certo no rebase de cada conversa e na soma
   do trem de produção (13/11: G-384, G-385, J-73 e M-625 ficaram fora do trem por isso).
   Este driver junta pelo conteúdo, chave a chave, como uma pessoa faria:
     · objeto: cada chave fica com o lado que mudou em relação à base (os dois iguais: tanto faz);
       chaves novas dos dois lados entram (as nossas na nossa ordem, depois as deles);
     · lista de pares [frase, tradução] (os `modelos`): vale a frase como chave, com a mesma regra;
     · qualquer outro valor que os dois lados mudaram de jeitos diferentes é conflito de verdade:
       devolve exit 1 com as marcas do git (merge-file) e diz no stderr qual chave bateu.
   A saída mantém o formato do nosso lado (uma linha só, ou recuado) e a quebra de linha do fim.
   Ligado por .gitattributes (idiomas/*.json merge=idiomas) e pelo `npm install` (prepare).
     node idioma-merge.mjs %O %A %B     (o git chama; grava o resultado em %A)
   ===================================================================== */
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const AUSENTE = Symbol('ausente');
const ehObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const igual = (a, b) => a === b || (a !== AUSENTE && b !== AUSENTE && JSON.stringify(a) === JSON.stringify(b));

class Conflito extends Error { constructor(caminho) { super(`conflito em ${caminho || '(raiz)'}`); this.caminho = caminho; } }

/** Lista de pares [texto, …] com o texto único: pode ser juntada pela primeira posição. */
const ehListaDePares = (v) => Array.isArray(v) && v.every((p) => Array.isArray(p) && typeof p[0] === 'string')
  && new Set(v.map((p) => p[0])).size === v.length;

/** Junta três versões de um mesmo valor. Lança Conflito quando os dois lados mudaram de jeitos diferentes. */
export function juntarValor(base, nosso, deles, caminho = '') {
  if (igual(nosso, deles)) return nosso;
  if (igual(base, nosso)) return deles;
  if (igual(base, deles)) return nosso;
  if (ehObjeto(nosso) && ehObjeto(deles)) return juntarObjeto(ehObjeto(base) ? base : {}, nosso, deles, caminho);
  const b = base === AUSENTE ? [] : base;
  if (ehListaDePares(nosso) && ehListaDePares(deles) && ehListaDePares(b)) return juntarPares(b, nosso, deles, caminho);
  throw new Conflito(caminho);
}

function juntarObjeto(base, nosso, deles, caminho) {
  const saida = {};
  const chaves = [...Object.keys(nosso), ...Object.keys(deles).filter((k) => !(k in nosso))];
  for (const k of chaves) {
    const pega = (o) => (Object.prototype.hasOwnProperty.call(o, k) ? o[k] : AUSENTE);
    const v = juntarValor(pega(base), pega(nosso), pega(deles), caminho ? `${caminho}.${k}` : k);
    if (v !== AUSENTE) saida[k] = v;
  }
  return saida;
}

function juntarPares(base, nosso, deles, caminho) {
  const mapa = (l) => new Map(l.map((p) => [p[0], p]));
  const mb = mapa(base), mn = mapa(nosso), md = mapa(deles);
  const saida = [];
  for (const k of [...mn.keys(), ...[...md.keys()].filter((k) => !mn.has(k))]) {
    const pega = (m) => (m.has(k) ? m.get(k) : AUSENTE);
    const v = juntarValor(pega(mb), pega(mn), pega(md), `${caminho}[${JSON.stringify(k).slice(0, 60)}]`);
    if (v !== AUSENTE) saida.push(v);
  }
  return saida;
}

/** Escreve no formato do texto de referência: uma linha só ou recuado, com a mesma quebra no fim. */
export function noFormatoDe(referencia, valor) {
  const corpo = referencia.trimEnd();
  const recuo = corpo.includes('\n') ? ((corpo.match(/\n([ \t]+)\S/) || [, ' '])[1]) : 0;
  const fim = referencia.slice(corpo.length);
  return JSON.stringify(valor, null, recuo) + fim;
}

/** Junta os três textos. Devolve { texto } ou { conflito: caminho }. */
export function juntarTextos(base, nosso, deles) {
  let b, n, d;
  try { b = JSON.parse(base); n = JSON.parse(nosso); d = JSON.parse(deles); } catch (e) { return { conflito: '(JSON inválido)' }; }
  try { return { texto: noFormatoDe(nosso, juntarValor(b, n, d)) }; } catch (e) { if (e instanceof Conflito) return { conflito: e.caminho || '(raiz)' }; throw e; }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [O, A, B] = process.argv.slice(2);
  if (!O || !A || !B) { console.error('uso: node idioma-merge.mjs <base> <nosso> <deles>'); process.exit(2); }
  const r = juntarTextos(readFileSync(O, 'utf8'), readFileSync(A, 'utf8'), readFileSync(B, 'utf8'));
  if (r.texto !== undefined) { writeFileSync(A, r.texto); process.exit(0); }
  console.error(`idioma-merge: ${r.conflito} mudou dos dois lados; resolva à mão ficando com os dois.`);
  spawnSync('git', ['merge-file', '-L', 'nosso', '-L', 'base', '-L', 'deles', A, O, B], { stdio: 'ignore' });
  process.exit(1);
}
