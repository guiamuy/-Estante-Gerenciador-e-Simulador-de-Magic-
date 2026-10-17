// Q14 · portão em duas fases: o que entra em cada fase, como as quedas são lidas da saída e como um teste é repetido sozinho.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { arquivosDaFase, falhasDoTap, padraoExato, pushSemFiltro, navegadorDeTela, fatiasDeTela, fatiar, conferirFatias, resumoDoTap, juntaResumo, ARQUIVO_DE_TELA } from './portao.mjs';
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

// Q16 · navegador da fase de tela conferido antes do portão
test('Q16 · o navegador da fase de tela: PW_CHROMIUM, o do Playwright instalado, ou outra revisão na pasta de navegadores; sem nenhum, erro antes do portão', () => {
  const tem = (...c) => (p) => c.includes(p);
  assert.deepEqual(navegadorDeTela({ env: { PW_CHROMIUM: '/x/chrome' }, existe: tem('/x/chrome') }), { caminho: '/x/chrome', origem: 'PW_CHROMIUM' });
  assert.match(navegadorDeTela({ env: { PW_CHROMIUM: '/x/sumiu' }, existe: tem() }).erro, /PW_CHROMIUM aponta para um arquivo que não existe/);
  assert.deepEqual(navegadorDeTela({ env: {}, existe: tem('/pw/chromium_headless_shell-1187/chrome-linux/headless_shell'), padrao: '/pw/chromium_headless_shell-1187/chrome-linux/headless_shell' }), { caminho: '', origem: 'playwright' });
  // sessão de nuvem: o pacote pede a 1187 e a imagem traz a 1194
  const nuvem = { env: { PLAYWRIGHT_BROWSERS_PATH: '/pw' }, padrao: '/pw/chromium_headless_shell-1187/chrome-linux/headless_shell', lista: () => ['chromium-1194', 'chromium_headless_shell-1194', 'ffmpeg-1011'] };
  assert.deepEqual(navegadorDeTela({ ...nuvem, existe: tem('/pw/chromium_headless_shell-1194/chrome-linux/headless_shell', '/pw/chromium-1194/chrome-linux/chrome') }), { caminho: '/pw/chromium_headless_shell-1194/chrome-linux/headless_shell', origem: 'outra revisão' });
  assert.deepEqual(navegadorDeTela({ ...nuvem, existe: tem('/pw/chromium-1194/chrome-linux/chrome') }), { caminho: '/pw/chromium-1194/chrome-linux/chrome', origem: 'outra revisão' });
  assert.match(navegadorDeTela({ ...nuvem, existe: tem() }).erro, /playwright install chromium/);
  assert.match(navegadorDeTela({ env: {}, existe: tem() }).erro, /Não achei o Chromium/);
});

// Q19 · fase de tela em fatias
test('Q19 · quantas fatias: duas por quatro núcleos, uma só com dois (teste de tela depende de tempo); PORTAO_FATIAS manda', () => {
  assert.equal(fatiasDeTela(2, {}), 1); assert.equal(fatiasDeTela(3, {}), 1); assert.equal(fatiasDeTela(4, {}), 2); assert.equal(fatiasDeTela(8, {}), 4); assert.equal(fatiasDeTela(64, {}), 4);
  assert.equal(fatiasDeTela(1, {}), 1);
  assert.equal(fatiasDeTela(2, { PORTAO_FATIAS: '2' }), 2); assert.equal(fatiasDeTela(8, { PORTAO_FATIAS: '1' }), 1); assert.equal(fatiasDeTela(4, { PORTAO_FATIAS: 'x' }), 2); assert.equal(fatiasDeTela(4, { PORTAO_FATIAS: '0' }), 2);
});

test('Q19 · fatiar: cada teste cai numa fatia só, pela ordem de registro; os outros saem pulados com o motivo; sem fatia nada muda', () => {
  const registra = (fatia) => { const visto = []; const t = fatiar((nome, ...r) => { const o = r.length > 1 ? r[0] : {}; visto.push([nome, o.skip || false]); }, fatia); for (const n of ['a', 'b', 'c', 'd', 'e']) t(n, { skip: false }, () => {}); return visto; };
  const f1 = registra('1/2'), f2 = registra('2/2');
  assert.deepEqual(f1.filter((x) => !x[1]).map((x) => x[0]), ['a', 'c', 'e']); assert.deepEqual(f2.filter((x) => !x[1]).map((x) => x[0]), ['b', 'd']);
  assert.match(f1[1][1], /fatia 1\/2: roda em outra fatia/);
  const dePular = []; fatiar((nome, o) => dePular.push(o.skip), '1/2')('x', { skip: 'Playwright não instalado' }, () => {});
  assert.deepEqual(dePular, ['Playwright não instalado'], 'teste já pulado por outro motivo continua pulado, com o motivo dele');
  const mesmo = () => {}; for (const ruim of [undefined, '', '1/1', '0/2', '3/2', 'x']) assert.equal(fatiar(mesmo, ruim), mesmo, String(ruim));
  // teste sem opções (nome, fn) também é fatiado
  const semOpc = []; const t = fatiar((nome, ...r) => semOpc.push([nome, r.length]), '2/2'); t('a', () => {}); t('b', () => {});
  assert.deepEqual(semOpc, [['a', 2], ['b', 1]]);
});

test('Q19 · a conferência das fatias acusa teste que não rodou em nenhuma e teste que rodou em duas', () => {
  const f1 = 'ok 1 - e2e · a\nok 2 - e2e · b # SKIP fatia 1/2: roda em outra fatia\nnot ok 3 - e2e · c\nok 1 - e2e.test.mjs';
  const f2 = 'ok 1 - e2e · a # SKIP fatia 2/2: roda em outra fatia\nok 2 - e2e · b\nok 3 - e2e · c # SKIP fatia 2/2: roda em outra fatia';
  assert.deepEqual(conferirFatias([f1, f2]), { total: 3, faltando: [], repetidos: [] });
  assert.deepEqual(conferirFatias([f1, f1]), { total: 3, faltando: ['e2e · b'], repetidos: ['e2e · a', 'e2e · c'] });
});

test('Q19 · de verdade: um arquivo de teste rodado em duas fatias executa cada teste uma vez, e o arquivo de tela usa a mesma divisão', () => {
  const dir = mkdtempSync(join(tmpdir(), 'estante-fatias-'));
  try {
    const arq = join(dir, 'x.test.mjs');
    writeFileSync(arq, `import { test as t0 } from 'node:test';\nimport { fatiar } from ${JSON.stringify(join(RAIZ, 'portao.mjs'))};\nconst test = fatiar(t0, process.env.E2E_FATIA);\nfor (const n of ['um', 'dois', 'três', 'quatro', 'cinco']) test('caso ' + n, { skip: false }, () => {});\n`);
    const { NODE_TEST_CONTEXT, ...ambiente } = process.env; // sem isto o Node filho fala com o executor de testes pai, não em TAP
    const saidas = ['1/2', '2/2'].map((f) => spawnSync(process.execPath, ['--test', '--test-reporter=tap', arq], { encoding: 'utf8', env: { ...ambiente, E2E_FATIA: f } }).stdout);
    assert.deepEqual(conferirFatias(saidas), { total: 5, faltando: [], repetidos: [] });
    assert.match(saidas[0], /ok \d+ - caso dois # SKIP fatia 1\/2/); assert.match(saidas[1], /ok \d+ - caso dois\n/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
  const e2e = readFileSync(join(RAIZ, ARQUIVO_DE_TELA), 'utf8');
  assert.match(e2e, /const test = fatiar\(testeDoNode, process\.env\.E2E_FATIA\);/);
  assert.doesNotMatch(e2e, /\btest\.(only|describe|before|after)\b|^describe\(/m, 'o arquivo de tela só usa test(nome, opções, fn): é o que a divisão em fatias sabe repartir');
});

// Q21 · o portão não muda de sistema sozinho
test('Q21 · os fluxos que rodam o portão fixam a versão do sistema (ubuntu-latest troca de versão sem aviso e o Playwright instala dependências do sistema)', () => {
  for (const nome of ['gate.yml', 'fila.yml']) {
    const yml = readFileSync(join(FLUXOS, nome), 'utf8');
    const onde = [...yml.matchAll(/runs-on: (\S+)/g)].map((m) => m[1]);
    assert.ok(onde.length >= 2, nome);
    assert.deepEqual(onde.filter((o) => !/^ubuntu-\d\d\.\d\d$/.test(o)), [], `${nome}: todo job em versão fixa`);
  }
});

test('Q21 · toda ação de terceiro diz, ao lado do SHA, que versão é; nenhuma ficou na v4 (Node 20, que o GitHub está aposentando)', () => {
  for (const nome of readdirSync(FLUXOS).filter((n) => /\.ya?ml$/.test(n))) {
    const usos = [...readFileSync(join(FLUXOS, nome), 'utf8').matchAll(/^\s*-?\s*uses:\s*(\S+)(.*)$/gm)];
    for (const [, acao, resto] of usos) {
      const versao = (resto.match(/#\s*v(\d+)\b/) || [])[1];
      assert.ok(versao, `${nome}: ${acao} sem a versão no comentário`);
      assert.ok(Number(versao) >= 5, `${nome}: ${acao} está na v${versao}`);
    }
  }
});

test('Q21 · o Playwright tem versão exata (sem faixa): versão nova pede outro Chromium, e isso é leva da infra, não surpresa de um npm install', () => {
  const pkg = JSON.parse(readFileSync(join(RAIZ, 'package.json'), 'utf8'));
  assert.match(pkg.devDependencies.playwright, /^\d+\.\d+\.\d+$/);
  const lock = JSON.parse(readFileSync(join(RAIZ, 'package-lock.json'), 'utf8'));
  assert.equal(lock.packages['node_modules/playwright'].version, pkg.devDependencies.playwright, 'o lockfile instala a mesma versão');
  assert.equal(lock.packages['node_modules/playwright-core'].version, pkg.devDependencies.playwright);
});

test('R-21 · resumoDoTap: passaram e caíram pelas linhas # pass/# fail, quedas em testes de orçamento pelo nome (sem repetir), telas auditadas pelas linhas "# auditaTela · nome" (sem repetir); arquivo que caiu não conta como queda de orçamento', () => {
  const tap = ['TAP version 13', '# Subtest: painel.unit.test.mjs', '    ok 1 - R-19 · orçamento do Custo: rodadas', '    not ok 2 - Q8 · orçamento do apply com listas reais # TODO', '    not ok 3 - R-20 · orçamento do Acervo', '    not ok 4 - X11 scanner lento',
    'not ok 1 - painel.unit.test.mjs', '# auditaTela · custo 360', '    # auditaTela · acervo 360', '# auditaTela · custo 360', '# pass 3060', '# fail 3', '# skipped 0'].join('\n');
  assert.deepEqual(resumoDoTap(tap), { passaram: 3060, cairam: 3, quedasOrcamento: ['Q8 · orçamento do apply com listas reais', 'R-20 · orçamento do Acervo'], telas: ['custo 360', 'acervo 360'] });
  assert.deepEqual(resumoDoTap(''), { passaram: null, cairam: null, quedasOrcamento: [], telas: [] });
});

test('R-21 · juntaResumo: cada fase grava a sua parte sem apagar a outra, o histórico guarda até 30 corridas (verde ou vermelha) e consumidoEm sobrevive', () => {
  const r1 = juntaResumo(null, { fase: 'rapido', verde: true, minutos: 15.2, passaram: 3063, cairam: 0, quedasOrcamento: [] }, '2026-10-17T00:00:00Z');
  assert.equal(r1.kind, 'estante.portao'); assert.equal(r1.version, 1); assert.equal(r1.tela, null); assert.equal(r1.rapido.passaram, 3063); assert.equal(r1.historico.length, 1);
  const r2 = juntaResumo({ ...r1, consumidoEm: '2026-10-16T23:00:00Z' }, { fase: 'tela', verde: true, minutos: 9.9, passaram: 246, cairam: 1, quedasOrcamento: [], instaveis: ['e2e · X11 scanner'], telas: ['custo 360'] }, '2026-10-17T00:10:00Z');
  assert.equal(r2.rapido.passaram, 3063, 'a fase de tela não apaga a rápida'); assert.deepEqual(r2.tela.instaveis, ['e2e · X11 scanner']); assert.deepEqual(r2.tela.telas, ['custo 360']);
  assert.equal(r2.consumidoEm, '2026-10-16T23:00:00Z'); assert.deepEqual(r2.historico.map(h => [h.fase, h.verde, h.instaveis]), [['rapido', true, 0], ['tela', true, 1]]);
  let r = r2; for (let i = 0; i < 40; i++) r = juntaResumo(r, { fase: 'rapido', verde: false, quedasOrcamento: ['Q8 · orçamento'] }, '2026-10-17T01:00:00Z');
  assert.equal(r.historico.length, 30); assert.equal(r.rapido.verde, false); assert.equal(r.historico[29].quedasOrcamento, 1);
});
