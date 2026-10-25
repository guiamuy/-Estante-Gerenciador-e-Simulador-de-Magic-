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

// I-300 · o Commander ganha passo próprio (falha de um não apaga o relatório do outro). Falha antes da I-300.
test('I-300 · catalogo.yml: passo da sentinela do Commander depois da do Pauper e antes de publicar, com --textos 300', () => {
  const j = wf.indexOf('- name: Sentinela de cobertura do Pauper'), c = wf.indexOf('- name: Sentinela de cobertura do Commander'), k = wf.indexOf('- name: Publicar no ramo catalogo');
  assert.ok(j >= 0 && c > j && k > c, 'ordem: Pauper → Commander → publicar');
  const passo = wf.slice(c, k);
  assert.match(passo, /continue-on-error: true/); assert.match(passo, /if: always\(\) && steps\.coleta\.conclusion != 'skipped'/);
  assert.match(passo, /run: node cobertura\.mjs --catalogo saida --formato commander --textos 300/);
  assert.doesNotMatch(passo, /secrets\./);
});

// Q10-7c · relato #32, fatia 3: todos os formatos do catálogo têm o selo do motor. Falha antes (o passo não existia).
test('Q10-7c · catalogo.yml: passo dos demais formatos depois do Commander e antes de publicar, sem texto do dia, sem segredo', () => {
  const c = wf.indexOf('- name: Sentinela de cobertura do Commander'), d = wf.indexOf('- name: Sentinela de cobertura dos demais formatos'), k = wf.indexOf('- name: Publicar no ramo catalogo');
  assert.ok(c >= 0 && d > c && k > d, 'ordem: Commander → demais → publicar');
  const passo = wf.slice(d, k);
  assert.match(passo, /continue-on-error: true/); assert.match(passo, /if: always\(\) && steps\.coleta\.conclusion != 'skipped'/);
  assert.match(passo, /run: node cobertura\.mjs --catalogo saida --formato todos --exceto pauper,commander --textos 0/);
  assert.doesNotMatch(passo, /secrets\./);
});

// I-303 · plano do dono de 24/10 (competitivos primeiro): o passo dos demais formatos põe o texto do dia nas 150 primeiras cartas da
// ordem gulosa dos competitivos (H-17); Iniciante, Brawl e Construído seguem sem o texto das `nova`. Falha antes da I-303.
test('I-303 · catalogo.yml: o passo dos demais formatos passa --textos-competitivos 150, sem segredo nem permissão nova', () => {
  const d = wf.indexOf('- name: Sentinela de cobertura dos demais formatos'), k = wf.indexOf('- name: Publicar no ramo catalogo');
  const passo = wf.slice(d, k);
  assert.match(passo, /run: node cobertura\.mjs --catalogo saida --formato todos --exceto pauper,commander --textos 0 --textos-competitivos 150\n/);
  assert.doesNotMatch(passo, /secrets\./); assert.match(wf, /permissions:\n  contents: write\n/);
});
