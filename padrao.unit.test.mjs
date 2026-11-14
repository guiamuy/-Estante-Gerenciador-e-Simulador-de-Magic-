// G-399 · Padrão de entrega (decisão do dono, 14/11/2026): a régua de excelência e de economia mora
// num lugar só, o CLAUDE.md (carregado em toda sessão), e o ESTADO.md aponta para ela sem copiar.
// O teto de bytes é a própria regra de economia: o bloco não pode crescer até encarecer toda sessão.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ler = (f) => readFileSync(new URL(`./${f}`, import.meta.url), 'utf8');
const bloco = (() => {
  const t = ler('CLAUDE.md');
  const i = t.indexOf('\n## Padrão de entrega');
  assert.ok(i >= 0, 'CLAUDE.md sem a seção "## Padrão de entrega"');
  const j = t.indexOf('\n## ', i + 1);
  return t.slice(i, j < 0 ? undefined : j);
})();

test('G-399 · CLAUDE.md traz o Padrão de entrega com excelência, economia e a linha da entrega', () => {
  for (const s of ['**Excelência:**', '**Economia:**', '**Na entrega:**', 'ds-*', 'tokens']) {
    assert.ok(bloco.includes(s), `Padrão de entrega sem "${s}"`);
  }
});

test('G-399 · o Padrão de entrega cabe em 1 KB (regra de economia: custa pouco em toda sessão)', () => {
  const bytes = Buffer.byteLength(bloco, 'utf8');
  assert.ok(bytes <= 1024, `Padrão de entrega tem ${bytes} bytes; o teto é 1024 — resuma, não acrescente`);
});

test('G-399 · ESTADO.md aponta para o Padrão de entrega sem copiar o texto', () => {
  const estado = ler('ESTADO.md');
  assert.match(estado, /Padrão de entrega .*`CLAUDE\.md`/);
  assert.ok(!estado.includes('**Excelência:**'), 'ESTADO.md copiou o bloco; deve só apontar');
});
