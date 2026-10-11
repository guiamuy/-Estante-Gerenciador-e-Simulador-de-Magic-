// Q14 · portão em duas fases: o que entra em cada fase, como as quedas são lidas da saída e como um teste é repetido sozinho.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { arquivosDaFase, falhasDoTap, padraoExato, pushSemFiltro, ARQUIVO_DE_TELA } from './portao.mjs';
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

// Q15 · CI só onde precisa
const FLUXOS = join(RAIZ, '.github/workflows');
test('Q15 · push sem filtro de ramo é reconhecido nas três formas do YAML; com `branches:` não', () => {
  assert.equal(pushSemFiltro('on:\n  push:\n  pull_request:\njobs:\n'), true);
  assert.equal(pushSemFiltro('on: push\njobs:\n'), true);
  assert.equal(pushSemFiltro('on: [push, pull_request]\njobs:\n'), true);
  assert.equal(pushSemFiltro('on:\n  push:   # todo ramo\n    paths: [a]\n  schedule:\n    - cron: x\njobs:\n'), true);
  assert.equal(pushSemFiltro('on:\n  push:\n    branches: [main]\n  pull_request:\njobs:\n'), false);
  assert.equal(pushSemFiltro('on:\n  push:\n\n    branches:\n      - main\njobs:\n'), false);
  assert.equal(pushSemFiltro('on:\n  schedule:\n    - cron: x\n  workflow_dispatch:\njobs:\n  a:\n    steps:\n      - run: git push origin x\n'), false);
});

test('Q15 · nenhum fluxo do repositório dispara em push de qualquer ramo (ramo de fila ou de sonda não roda portão)', () => {
  const ruins = readdirSync(FLUXOS).filter((n) => /\.ya?ml$/.test(n)).filter((n) => pushSemFiltro(readFileSync(join(FLUXOS, n), 'utf8')));
  assert.deepEqual(ruins, []);
  assert.match(readFileSync(join(FLUXOS, 'gate.yml'), 'utf8'), /^  push:\n    branches: \[main\]$/m, 'o portão roda em push só no main');
});

test('Q15 · o fuzz pesado da madrugada roda num job só dele; o portão não roda no agendamento', () => {
  const gate = readFileSync(join(FLUXOS, 'gate.yml'), 'utf8');
  const [, portao, fuzz] = gate.match(/\n  gate:\n([\s\S]*?)\n  fuzz:\n([\s\S]*)$/) || [];
  assert.ok(portao && fuzz, 'gate.yml tem os jobs gate e fuzz');
  assert.match(portao, /if: github\.event_name != 'schedule'/); assert.doesNotMatch(portao, /3000/);
  assert.match(fuzz, /if: github\.event_name == 'schedule'/); assert.match(fuzz, /npm run (-s )?test:fuzz:full/);
  assert.doesNotMatch(fuzz, /test:e2e|test:rapido|playwright/, 'o job do fuzz não roda a fase de tela nem o resto do portão');
  const limite = Number((fuzz.match(/timeout-minutes: (\d+)/) || [])[1]);
  assert.ok(limite >= 45 && limite <= 90, `tempo-limite próprio do fuzz (${limite})`);
  assert.match(JSON.parse(readFileSync(join(RAIZ, 'package.json'), 'utf8')).scripts['test:fuzz:full'], /FUZZ_GAMES=3000/);
});
