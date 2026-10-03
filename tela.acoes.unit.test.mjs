// Leva 120 · guarda-corpo "toda ação legal tem botão": o motor oferecia `plot` e `unmorph` em legalActions e a tela
// não desenhava nenhum dos dois (a Highway Robbery não podia ser tramada; a metamorfose não virava para cima).
// Este teste lê o arquivo publicado e cobra que cada tipo de ação que legalActions devolve apareça na tela da mesa
// (__m19) como ação disparada ou rótulo. Tipo novo no motor sem tratamento na tela derruba o portão.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, loadModules } from './_load.mjs';
const { engine: E, table: T } = loadModules();
const src = readFileSync(join(ROOT, 'index.html'), 'utf8');
const trecho = (de, ate) => { const a = src.indexOf(de); assert.ok(a > 0, 'marco não encontrado: ' + de); const b = src.indexOf(ate, a + de.length); assert.ok(b > a, 'fim não encontrado: ' + ate); return src.slice(a, b); };

test('Leva 120 · toda ação que legalActions oferece é tratada pela tela da mesa', () => {
  const motor = trecho('function legalActions(s, p, { adjudication = false } = {}) {', '\nfunction previewCombat');
  const tipos = [...new Set([...motor.matchAll(/\bt: '([a-z_]+)'/g)].map(m => m[1]))].sort();
  assert.ok(tipos.length >= 35, 'achou os tipos de ação: ' + tipos.length);
  for (const obrigatorio of ['plot', 'unmorph', 'cast', 'cycle', 'transmute', 'ninjutsu', 'activate', 'pick', 'pick_done']) assert.ok(tipos.includes(obrigatorio), obrigatorio + ' entre os tipos lidos');
  const tela = trecho('/* ---------------- A1–A9 · a mesa ---------------- */', '\nreturn { createTableSetup');
  const semTela = tipos.filter(t => !new RegExp(`t: '${t}'|t === '${t}'`).test(tela));
  assert.deepEqual(semTela, [], 'ações que o motor oferece e a tela não desenha');
});

test('Leva 120 · variantes de conjurar que a folha precisa separar: virada para baixo e tramada', () => {
  const tela = trecho('function acoesDe(oid) {', '/* ---- A15 · espiar');
  assert.match(tela, /a\.t === 'cast' && a\.faceDown/, 'metamorfose: conjurar virada para baixo tem botão próprio (antes se fundia com "Conjurar")');
  assert.match(tela, /a\.t === 'cast' && a\.plotted/, 'carta tramada: conjurar sem pagar tem botão próprio');
});

test('Leva 120 · registro: tramar, virar para cima e conjurar virada para baixo sem dizer o nome', () => {
  assert.equal(typeof T.describe, 'function');
  const antes = { players: [{ name: 'Ana' }, { name: 'Bia' }], objects: { c1: { oid: 'c1', name: 'Highway Robbery', zone: 'hand' } } };
  assert.match(T.describe(antes, { t: 'plot', p: 0, oid: 'c1' }, [], antes).join(' '), /Ana tramou Highway Robbery/);
  const oculta = T.describe(antes, { t: 'cast', p: 0, oid: 'c1', faceDown: true }, [], antes).join(' ');
  assert.match(oculta, /virada para baixo/); assert.doesNotMatch(oculta, /Highway Robbery/, 'carta virada para baixo é informação oculta');
});
