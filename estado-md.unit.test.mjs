// Q27 · ESTADO.md, a porta de entrada de toda conversa (I-321, completado na I-322).
// Guarda o que faz o arquivo servir de entrada barata: teto de 8 KB, as seções que toda
// conversa procura, uma linha completa por trilha e o rodapé com data e leva.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const texto = readFileSync(new URL('./ESTADO.md', import.meta.url), 'utf8');

test('Q27 · ESTADO.md cabe no teto de 8 KB', () => {
  const bytes = Buffer.byteLength(texto, 'utf8');
  assert.ok(bytes <= 8192, `ESTADO.md tem ${bytes} bytes; o teto é 8192 — resuma, não acrescente`);
});

test('Q27 · ESTADO.md tem as seções que toda conversa procura', () => {
  const secoes = [
    '## Regra de leitura',
    '## Trilhas',
    '## Rotinas agendadas',
    '## Relatos do dono abertos',
    '## Decisões e pendências do dono',
    '## Onde mora o detalhe',
    '## Como atualizar',
  ];
  for (const s of secoes) assert.ok(texto.includes(s), `falta a seção "${s}"`);
});

test('Q27 · cada trilha da tabela tem foco, última leva e próximo', () => {
  const linhas = texto.split('\n').filter((l) => /^\| `[a-z]+` \|/.test(l));
  assert.ok(linhas.length >= 5, `só ${linhas.length} trilhas na tabela`);
  for (const l of linhas) {
    const col = l.split('|').slice(1, -1).map((c) => c.trim());
    assert.equal(col.length, 5, `linha com ${col.length} colunas: ${l.slice(0, 60)}`);
    for (const c of col) assert.ok(c.length > 0, `coluna vazia: ${l.slice(0, 60)}`);
    assert.match(col[3], /^(?:[A-Z]-\d+ · \d{2}\/\d{2}|—)/, `última leva sem "P-N · dd/mm": ${col[3]}`);
  }
});

test('Q27 · rodapé diz quando e em que leva o estado foi atualizado', () => {
  assert.match(texto, /\nAtualizado: \d{2}\/\d{2}\/\d{4} · [A-Z]-\d+/);
});
