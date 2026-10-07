// Q14 · portão em duas fases: o que entra em cada fase, como as quedas são lidas da saída e como um teste é repetido sozinho.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { arquivosDaFase, falhasDoTap, padraoExato, ARQUIVO_DE_TELA } from './portao.mjs';
const RAIZ = dirname(fileURLToPath(import.meta.url));

test('Q14 · as duas fases cobrem todos os arquivos de teste, sem repetir nenhum; o navegador fica sozinho na segunda', () => {
  const todos = readdirSync(RAIZ).filter(n => n.endsWith('.test.mjs')).sort();
  const rapida = arquivosDaFase('rapido'), tela = arquivosDaFase('e2e');
  assert.deepEqual(tela, [ARQUIVO_DE_TELA]); assert.equal(rapida.includes(ARQUIVO_DE_TELA), false);
  assert.deepEqual([...rapida, ...tela].sort(), todos, 'nenhum arquivo de teste fica fora do portão');
  // só o arquivo de tela abre navegador: se outro passar a abrir, ele precisa ir para a fase 2
  for (const f of rapida) assert.doesNotMatch(readFileSync(join(RAIZ, f), 'utf8'), /chromium\.launch\(/, `${f} abre navegador e está na fase rápida`);
});

test('Q14 · a queda é lida pelo nome do teste; o resumo do arquivo não conta como teste', () => {
  const tap = ['TAP version 13', 'ok 1 - e2e · um', 'not ok 2 - e2e · dois: com (parênteses) e ponto.', '  ---', '  error: x', 'not ok 3 - e2e · três', 'not ok 1 - e2e.test.mjs'].join('\n');
  assert.deepEqual(falhasDoTap(tap), ['e2e · dois: com (parênteses) e ponto.', 'e2e · três']);
  assert.deepEqual(falhasDoTap('ok 1 - tudo certo'), []);
});

test('Q14 · a repetição casa só com o teste que caiu, mesmo com símbolos no nome', () => {
  const nome = 'e2e · H2 contra o Shark (v2): volta 1.5 jogadas [bot] + turno?';
  const rx = new RegExp(padraoExato(nome));
  assert.equal(rx.test(nome), true); assert.equal(rx.test(nome + ' e mais'), false); assert.equal(rx.test('e2e · H2 contra o Shark (v2): volta 105 jogadas [bot] + turno?'), false);
});

test('Q14 · `npm test`, o publicar e o CI passam todos pelo mesmo portão', () => {
  const pkg = JSON.parse(readFileSync(join(RAIZ, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts.test, 'node portao.mjs'); assert.match(pkg.scripts['test:rapido'], /portao\.mjs rapido/); assert.match(pkg.scripts['test:e2e'], /portao\.mjs e2e/);
  const gate = readFileSync(join(RAIZ, '.github/workflows/gate.yml'), 'utf8');
  assert.match(gate, /npm run (-s )?test:rapido/); assert.match(gate, /npm run (-s )?test:e2e/);
  assert.match(readFileSync(join(RAIZ, 'publicar.mjs'), 'utf8'), /test:rapido/);
});
