// I-322 · a pasta publicada na Vercel leva só os arquivos do app, e tudo o que o app e o service worker pedem está nela.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ARQUIVOS, PASTA, monta } from './vercel-publico.mjs';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const ler = a => readFileSync(join(ROOT, a), 'utf8');

test('I-322 · vercel.json publica a pasta montada, sem instalar dependências, com /dados/ no projeto de dados', () => {
  const v = JSON.parse(ler('vercel.json'));
  assert.equal(v.outputDirectory, PASTA);
  assert.equal(v.buildCommand, 'node vercel-publico.mjs');
  assert.match(v.installCommand, /^echo /, 'o build não instala o Playwright nem o resto do devDependencies');
  const r = v.rewrites.find(x => x.source.startsWith('/dados/'));
  assert.ok(r && /^https:\/\/[a-z0-9-]+\.vercel\.app\//.test(r.destination));
});

test('I-322 · nenhum teste, script ou documento vai para a internet', () => {
  for (const a of ARQUIVOS) {
    assert.doesNotMatch(a, /\.(test\.)?mjs$|\.md$|^\.|package/, a);
  }
});

test('I-322 · tudo o que o service worker guarda de antemão e o app referencia por caminho relativo está na lista', () => {
  const sw = ler('sw.js');
  const html = ler('index.html');
  const relativos = new Set([...sw.matchAll(/'\.\/([^'/]+\.[a-z0-9]+)'/g), ...html.matchAll(/(?:src|href)="\.\/([^"/]+\.[a-z0-9]+)"/g)].map(m => m[1]));
  relativos.add('sw.js');
  for (const a of relativos) assert.ok(ARQUIVOS.includes(a), `${a} é pedido pelo app e não seria publicado`);
});

test('I-322 · monta copia exatamente a lista', async () => {
  const destino = mkdtempSync(join(tmpdir(), 'publico-'));
  try {
    const n = await monta({ raiz: ROOT, destino });
    assert.equal(n, ARQUIVOS.length);
    assert.deepEqual(readdirSync(destino).sort(), [...ARQUIVOS].sort());
  } finally { rmSync(destino, { recursive: true, force: true }); }
});
