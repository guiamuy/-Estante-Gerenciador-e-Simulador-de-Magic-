// Carrega o index.html publicado como fonte da verdade: os testes rodam
// exatamente o código que vai para o GitHub Pages, sem build intermediário.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const HTML = readFileSync(join(ROOT, 'index.html'), 'utf8');

export function loadModules() {
  const start = HTML.indexOf('<script>') + '<script>'.length;
  const end = HTML.lastIndexOf('</script>');
  const code = HTML.slice(start, end) +
    '\n;globalThis.__mods = { platform: __m0, components: __m3, scryfall: __m6, cards: __m7, decks: __m14, engine: __m16 };';
  const ctx = vm.createContext({
    window: { __MTG_NO_AUTOBOOT: true }, document: {}, console, structuredClone,
    setTimeout, clearTimeout, URLSearchParams, URL, TextEncoder, Promise
  });
  vm.runInContext(code, ctx, { filename: 'index.html' });
  return ctx.__mods;
}
