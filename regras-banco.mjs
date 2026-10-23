#!/usr/bin/env node
// I-298 · S4 da triagem de pendências (19/10/2026; "sim" do dono em 23/10): as regras do banco (`database.rules.json`)
// passam a ser publicadas pelo CI, sem o dono colar nada no console. Roda no GitHub Actions (fluxo "Regras do banco",
// disparado a cada avanço do `main` pela fila, uma vez por dia e à mão) com a conta de serviço do Firebase (segredo
// FIREBASE_SERVICE_ACCOUNT, só neste passo). Lê as regras publicadas (GET /.settings/rules.json), compara com as do
// `main` e, só se forem diferentes, publica (PUT) e lê de novo para conferir. O token vai só no cabeçalho, nunca na URL.
// Guarda de segurança antes de enviar: JSON válido, objeto `rules`, raiz fechada (".read" e ".write" = false) e tamanho
// abaixo do limite do Firebase. Sem o segredo, termina sem fazer nada. Sem dependência: Node 22. Trilha: infra.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { leConta, tokenDaConta, urlDoBanco } from './relatos-fila.mjs';
import { semSegredo } from './pessoas.mjs';

/** Limite de tamanho das regras do Realtime Database (256 KB). */
export const LIMITE_BYTES = 256 * 1024;

/** Texto canônico das regras (JSON reescrito sem espaços, na ordem das chaves) ou null quando não é JSON. */
export function canonico(texto) {
  try { return JSON.stringify(JSON.parse(String(texto))); } catch (e) { return null; }
}
/** Impressão curta (12 hex) do texto canônico, para a anotação: nada do conteúdo sai no registro. */
export const impressao = texto => createHash('sha256').update(canonico(texto) ?? String(texto)).digest('hex').slice(0, 12);

/** Puro. Devolve a lista de problemas que impedem publicar estas regras (vazia = pode publicar). */
export function problemas(texto) {
  const p = [];
  if (Buffer.byteLength(String(texto || ''), 'utf8') > LIMITE_BYTES) p.push(`maior que ${LIMITE_BYTES} bytes`);
  let j; try { j = JSON.parse(String(texto)); } catch (e) { p.push('não é JSON válido'); return p; }
  if (!j || typeof j !== 'object' || Array.isArray(j) || !j.rules || typeof j.rules !== 'object' || Array.isArray(j.rules)) { p.push('sem o objeto "rules"'); return p; }
  if (Object.keys(j).length !== 1) p.push('chaves além de "rules" na raiz');
  for (const k of ['.read', '.write']) if (j.rules[k] !== false) p.push(`a raiz precisa de "${k}": false (o banco inteiro ficaria aberto)`);
  return p;
}

/** Puro. Publicar só quando o que está no banco é diferente do que está no `main` (ou não pôde ser lido como JSON). */
export function precisaPublicar(local, remoto) {
  const a = canonico(local), b = canonico(remoto);
  return a === null || b === null || a !== b;
}

const enderecoDasRegras = banco => String(banco).replace(/\/+$/, '') + '/.settings/rules.json';

async function leRemotas({ banco, token, busca }) {
  const r = await busca(enderecoDasRegras(banco), { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error(`ler as regras publicadas: HTTP ${r.status}`);
  return await r.text();
}

/** Uma rodada: token → lê → compara → (publica → lê de novo e confere). `conferir: true` só compara. */
export async function rodada({ conta, banco, regras, conferir = false, busca = globalThis.fetch, agora = Date.now() }) {
  const ruins = problemas(regras);
  if (ruins.length) throw new Error('regras do main recusadas: ' + ruins.join('; '));
  const token = await tokenDaConta(conta, { busca, agora });
  const antes = await leRemotas({ banco, token, busca });
  const resultado = { local: impressao(regras), antes: impressao(antes), mudou: false, conferir };
  if (!precisaPublicar(regras, antes)) return { ...resultado, depois: resultado.antes };
  if (conferir) return { ...resultado, diferente: true };
  const r = await busca(enderecoDasRegras(banco), { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: String(regras) });
  if (!r.ok) {
    let motivo = ''; try { const j = await r.json(); motivo = j && j.error ? ' · ' + String(j.error).slice(0, 200) : ''; } catch (e) { /* sem corpo legível */ }
    throw new Error(`publicar as regras: HTTP ${r.status}${motivo}`);
  }
  const depois = await leRemotas({ banco, token, busca });
  if (precisaPublicar(regras, depois)) throw new Error('as regras publicadas não batem com as do main depois do envio');
  return { ...resultado, mudou: true, depois: impressao(depois) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const segredo = process.env.FIREBASE_SERVICE_ACCOUNT;
  const anota = (tipo, m) => { const t = semSegredo(m); console.log(t); if (process.env.GITHUB_ACTIONS) console.log(`::${tipo}::${t}`); };
  if (!segredo) { anota('notice', 'regras do banco: sem o segredo FIREBASE_SERVICE_ACCOUNT, nada a fazer'); process.exit(0); }
  const conta = leConta(segredo); if (!conta) { anota('error', 'regras do banco: FIREBASE_SERVICE_ACCOUNT não é a chave de uma conta de serviço'); process.exit(1); }
  const banco = urlDoBanco(readFileSync(new URL('./index.html', import.meta.url), 'utf8')); if (!banco) { anota('error', 'regras do banco: FIREBASE_DB_URL não está no index.html'); process.exit(1); }
  const regras = readFileSync(new URL('./database.rules.json', import.meta.url), 'utf8');
  try {
    const r = await rodada({ conta, banco, regras, conferir: process.argv.includes('--conferir') });
    const msg = r.mudou ? `regras do banco: publicadas (${r.antes} → ${r.depois}, iguais às do main)`
      : r.diferente ? `regras do banco: diferentes das do main (${r.antes} ≠ ${r.local}); só conferi, nada enviado`
      : `regras do banco: já iguais às do main (${r.local}), nada a enviar`;
    anota('notice', msg);
  } catch (e) {
    anota('error', 'regras do banco: ' + (e && e.message || e) + ' — sem publicar; o console continua com as regras anteriores');
    process.exit(1);
  }
}
