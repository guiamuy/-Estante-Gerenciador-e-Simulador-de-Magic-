// Carrega o index.html publicado como fonte da verdade: os testes rodam
// exatamente o código que vai para o GitHub Pages, sem build intermediário.
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Layout plano (ADR-07): testes na raiz, ao lado do index.html. Aceita também tests/.
export const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = existsSync(join(HERE, 'index.html')) ? HERE : join(HERE, '..');
export const HTML = readFileSync(join(ROOT, 'index.html'), 'utf8');

export function loadModules() {
  const start = HTML.indexOf('<script>') + '<script>'.length;
  const end = HTML.lastIndexOf('</script>');
  const code = HTML.slice(start, end) +
    '\n;globalThis.__mods = { platform: __m0, theme: __m1, imagesMod: __m8, env: __m10, mesaUi: __m17, components: __m3, pwa: __m11, brand: __m4, scryfall: __m6, cards: __m7, decks: __m14, engine: __m16, table: __m18, perfil: __m28, conta: __m29, online: __m30, cambio: __m31, etiquetas: __m32, fichas: __m34, terrenos: __m36, noticias: __m37, relatos: __m38, catalogo: __m39, partidas: __m35, sentidos: __m33, scanner: __m21, scripts: __m23, starter: __m24, bot: __m25, offline: __m26, filter: __m27, gestures: __m20 };';
  const ctx = vm.createContext({
    window: { __MTG_NO_AUTOBOOT: true }, document: {}, console, structuredClone,
    setTimeout, clearTimeout, URLSearchParams, URL, TextEncoder, Promise
  });
  vm.runInContext(code, ctx, { filename: 'index.html' });
  return ctx.__mods;
}
