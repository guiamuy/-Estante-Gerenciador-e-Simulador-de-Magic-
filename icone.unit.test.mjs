// E50 · ícone do app: fonte única (brand.js) para favicon, icon.svg e icon-512.png; aparência de botão.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadModules, HERE } from './_load.mjs';
import { join } from 'node:path';
const { brand: B } = loadModules();

test('E50 · icon.svg publicado é exatamente o que a fonte gera (rode `node gerar-icone.mjs` depois de mudar o ícone)', () => {
  const svg = readFileSync(join(HERE, 'icon.svg'), 'utf8').trim();
  assert.equal(svg, B.iconeDoApp({ tamanho: 512 }).trim());
});

test('E50 · o favicon usa a mesma fonte, e o ícone tem relevo: fundo em degradê, brilho, verniz e sombra na marca', () => {
  const href = B.faviconHref();
  assert.ok(href.startsWith('data:image/svg+xml,'));
  const svg = decodeURIComponent(href.slice('data:image/svg+xml,'.length));
  assert.equal(svg, B.iconeDoApp({ tamanho: 32 }));
  for (const parte of ['-fundo', '-brilho', '-verniz', '-latao', '-sombra', 'feDropShadow', 'rx="15"']) assert.ok(svg.includes(parte), parte);
  assert.doesNotMatch(svg, /var\(--/, 'sem variáveis de CSS: o data URI não as resolve');
  // marca dentro da zona segura do ícone mascarável (80% centrais de 64 → 6,4 a 57,6)
  for (const m of svg.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"[^>]*(?:marfim|latao|f1e8d7)/g)) {
    const [x, y, w, h] = m.slice(1).map(Number);
    assert.ok(x >= 6.4 && y >= 6.4 && x + w <= 57.6 && y + h <= 57.6, 'fora da zona segura: ' + m[0].slice(0, 60));
  }
});

test('E50 · o PNG de instalação existe em 512×512 e não é o antigo (gerado da mesma fonte)', () => {
  const png = readFileSync(join(HERE, 'icon-512.png'));
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], 'assinatura PNG');
  assert.equal(png.readUInt32BE(16), 512); assert.equal(png.readUInt32BE(20), 512);
  assert.ok(png.length > 20000, 'o ícone com relevo tem degradês e sombra; o antigo, chapado, tinha 3 KB');
});
