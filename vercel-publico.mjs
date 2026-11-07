// I-322 · Monta a pasta que a Vercel publica (outputDirectory "publico" no vercel.json).
// Só entram os arquivos do app: testes, scripts, documentos e fixtures do repositório não vão para a internet.
// Sem dependência: roda com o Node puro no build da Vercel (installCommand não instala nada).
import { cp, mkdir, rm, access } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const PASTA = 'publico';
export const ARQUIVOS = [
  'index.html',
  'painel.html',
  'sw.js',
  'manifest.webmanifest',
  'icon-512.png',
  'icon.svg',
  'fonte-cormorant-garamond-600.woff2',
  'fonte-cormorant-garamond-LICENSE.txt',
  'fonte-figtree-400.woff2',
  'fonte-figtree-600.woff2',
  'fonte-figtree-LICENSE.txt',
  'LICENSE',
];

export async function monta({ raiz = '.', destino = join(raiz, PASTA), arquivos = ARQUIVOS } = {}) {
  await rm(destino, { recursive: true, force: true });
  await mkdir(destino, { recursive: true });
  for (const a of arquivos) {
    await access(join(raiz, a)); // arquivo do app sumiu: o build cai em vez de publicar um app pela metade
    await cp(join(raiz, a), join(destino, a));
  }
  return arquivos.length;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const n = await monta();
  console.log(`publico/: ${n} arquivos do app`);
}
