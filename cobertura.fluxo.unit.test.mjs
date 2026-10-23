// I-299 · o fluxo "Catálogo" roda a sentinela de cobertura (H-15) depois da coleta e antes de publicar o ramo, sem nunca derrubar a
// coleta. Falha antes da I-299 (o passo não existia).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const wf = readFileSync(new URL('./.github/workflows/catalogo.yml', import.meta.url), 'utf8');

test('I-299 · catalogo.yml: passo da sentinela entre "Coletar" e "Publicar no ramo catalogo", continue-on-error, gravando na pasta do ramo', () => {
  const i = wf.indexOf('- name: Coletar'), j = wf.indexOf('- name: Sentinela de cobertura do Pauper'), k = wf.indexOf('- name: Publicar no ramo catalogo');
  assert.ok(i >= 0 && j > i && k > j, 'ordem: coletar → sentinela → publicar');
  const passo = wf.slice(j, k);
  assert.match(passo, /continue-on-error: true/); assert.match(passo, /if: always\(\) && steps\.coleta\.conclusion != 'skipped'/);
  assert.match(passo, /run: node cobertura\.mjs --catalogo saida --formato pauper/);
  assert.doesNotMatch(passo, /secrets\./, 'a sentinela não usa segredo');
  assert.match(wf, /permissions:\n  contents: write\n/, 'nenhuma permissão nova');
});
