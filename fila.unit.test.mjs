/* Q17 · fila de publicação: um portão no CI para todas as levas da fila; nenhuma leva chega ao main sem ele, nenhuma some. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, mkdirSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EPOCA } from './agregacao.mjs';
import { chave, nomeDoRamo, ordemDaFila, decisao, limparMotivo, quedasDoLog, planoValido, NOME_VALIDO, montar, avancar, ramosDaFila, commitsDa, publicados, situacao, formatarQuedas, limparAvisos,
  AVISO_MAIN, limparQueda, quedasComArquivo, reexecutar, mainVermelho, resultadoDaPresonda, sondaDoAviso, lerAvisoMain, herdadasNoMain } from './fila.mjs';

const RAIZ = dirname(fileURLToPath(import.meta.url));
const DEPOIS = Math.floor(EPOCA / 1000) + 3600;

/** Um "GitHub" de mentira (repositório nu) e clones com relógio próprio: cada commit anda 10 minutos. */
function mundo() {
  const raiz = mkdtempSync(join(tmpdir(), 'estante-fila-'));
  let relogio = DEPOIS;
  const gitEm = (dir) => (...a) => execFileSync('git', a, {
    cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t',
      GIT_AUTHOR_DATE: `${relogio} +0000`, GIT_COMMITTER_DATE: `${relogio} +0000`, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null' },
  }).trim();
  const origem = join(raiz, 'origem.git');
  mkdirSync(origem); gitEm(origem)('init', '-q', '--bare', '-b', 'main');
  const clone = (nome) => {
    const dir = join(raiz, nome);
    gitEm(raiz)('clone', '-q', origem, dir);
    const git = gitEm(dir);
    return {
      dir, git,
      escreve(arquivo, linhas) { writeFileSync(join(dir, arquivo), linhas.join('\n') + '\n'); },
      acrescenta(arquivo, linha) { appendFileSync(join(dir, arquivo), linha + '\n'); },
      le(arquivo) { return readFileSync(join(dir, arquivo), 'utf8'); },
      commit(mensagem) { relogio += 600; git('add', '-A'); git('commit', '-q', '-m', mensagem); return git('rev-parse', 'HEAD'); },
      /** leva nova a partir do main publicado, enviada para fila/<nome> */
      enfileira(nomeDoRamoNaFila, mensagem, mudar) { git('fetch', '-q', 'origin'); git('checkout', '-q', '-B', 'trabalho', 'origin/main'); mudar(); const sha = this.commit(mensagem); git('push', '-q', 'origin', `HEAD:refs/heads/fila/${nomeDoRamoNaFila}`); return sha; },
      busca() { git('fetch', '-q', '--prune', 'origin', '+refs/heads/*:refs/remotes/origin/*'); },
    };
  };
  const base = clone('base');
  base.escreve('.gitattributes', ['ROADMAP.md merge=union']);
  base.escreve('index.html', ['function mesa() {', '  const placar = desenharPlacar(estado);', '  return montarMesa(placar);', '}', 'const ENGINE_VERSION = 98; // motor']);
  base.escreve('ROADMAP.md', ['| id | história |', '|---|---|', '| 16º-aa ✅ | primeira história da ordem |']);
  base.commit('Leva G-1 · base\n\nTrilha: geral');
  base.git('push', '-q', 'origin', 'HEAD:main');
  return { raiz, origem, clone, fim() { rmSync(raiz, { recursive: true, force: true }); }, cabeca: (ref) => gitEm(origem)('rev-parse', ref), existe: (ref) => { try { gitEm(origem)('rev-parse', '--verify', '--quiet', ref); return true; } catch (e) { return false; } }, logDoMain: () => gitEm(origem)('log', '--format=%s|%at|%B', 'main') };
}
/** O clone que faz o papel do CI: enxerga o main e os ramos da fila como o fluxo os busca. */
function ci(m) { const c = m.clone('ci'); c.busca(); return c; }
const plano = (c) => { c.busca(); return montar({ cwd: c.dir, base: 'origin/main', ramos: ordemDaFila(ramosDaFila(c.dir)) }); };

test('Q17 · parte pura: nome do ramo pela leva, ordem de chegada, decisão depois do portão, motivo limpo e quedas lidas do log', () => {
  assert.equal(nomeDoRamo([{ sha: 'a'.repeat(40), assunto: 'Leva G-251 · x', corpo: 'Leva G-251 · x\n\nTrilha: geral' }, { sha: 'b'.repeat(40), assunto: 'Leva G-252 · y', corpo: 'Leva G-252 · y\n\nTrilha: geral' }]), 'G-252');
  assert.equal(nomeDoRamo([{ sha: 'c'.repeat(40), assunto: 'Leva 207 · z', corpo: 'Leva 207 · z\n\nTrilha: geral' }]), '207');
  assert.equal(nomeDoRamo([{ sha: 'abcdef1234', assunto: 'ROADMAP em dia', corpo: 'ROADMAP em dia\n\nTrilha: motor' }]), 'motor-abcdef1');
  assert.equal(nomeDoRamo([]), '');
  assert.deepEqual(ordemDaFila([{ nome: 'M-3', em: 30 }, { nome: 'G-9', em: 10 }, { nome: 'A-2', em: 10 }]).map((r) => r.nome), ['A-2', 'G-9', 'M-3']);
  assert.deepEqual(ordemDaFila([{ nome: 'M-3', em: 30 }, { nome: 'G-9', em: 10 }], 'M-3').map((r) => r.nome), ['M-3']);
  const um = [{ nome: 'G-9' }], dois = [{ nome: 'G-9' }, { nome: 'M-3' }];
  assert.deepEqual(decisao({ aceitos: [], portao: 'skipped' }), { acao: 'nada' });
  assert.deepEqual(decisao({ aceitos: dois, portao: 'success' }), { acao: 'publicar' });
  assert.deepEqual(decisao({ aceitos: um, portao: 'failure' }), { acao: 'recusar', nome: 'G-9' });
  assert.deepEqual(decisao({ aceitos: dois, portao: 'failure' }), { acao: 'isolar', nome: 'G-9' }, 'com várias levas, a mais antiga é testada sozinha');
  assert.equal(decisao({ aceitos: dois, portao: 'cancelled' }).acao, 'manter', 'portão cancelado não publica nem recusa');
  assert.equal(limparMotivo('a\u0000b\u001b[31m  c\td'), 'a b [31m c d'); assert.ok(limparMotivo('x'.repeat(5000)).length < 1900);
  assert.deepEqual(quedasDoLog('ok 1 - a\nnot ok 2 - e2e · H7 imagens\n  ---\nnot ok 3 - e2e · I7 foco\nnot ok 1 - e2e.test.mjs\nnot ok 9 - e2e · H7 imagens'), ['e2e · H7 imagens', 'e2e · I7 foco']);
  assert.equal(chave({ autorEm: 5, assunto: 'Leva M-1' }), '5|Leva M-1');
});

test('Q17 · o plano que vem de outro job só entra em comando git com forma de nome e de sha', () => {
  const sha = 'a'.repeat(40);
  assert.equal(planoValido({ base: sha, arvore: sha, aceitos: [{ nome: 'G-252', sha }], recusados: [], vazios: [] }), true);
  for (const nome of ['--upload-pack=x', 'a/b', '../main', 'G 1', '', 'x;rm']) assert.equal(NOME_VALIDO.test(nome), false, nome);
  assert.equal(planoValido({ base: sha, arvore: sha, aceitos: [{ nome: '--force', sha }] }), false);
  assert.equal(planoValido({ base: 'main', arvore: sha, aceitos: [] }), false);
  assert.equal(planoValido({ base: sha, arvore: sha, aceitos: [{ nome: 'G-1', sha: 'HEAD' }] }), false);
});

test('Q17 · duas levas de trilhas diferentes somam num portão só; mensagem, rodapé e data de autoria chegam iguais ao main; os ramos somem', () => {
  const m = mundo();
  try {
    const motor = m.clone('motor'), geral = m.clone('geral');
    const shaM = motor.enfileira('M-10', 'Leva M-10 · mana em combinação\n\nTrilha: motor', () => { motor.escreve('regras.js', ['const mana = motor.pagarEmQualquerCombinacao(custo);']); motor.acrescenta('ROADMAP.md', '| 16º-ab ✅ | mana em combinação (leva M-10) |'); });
    const shaG = geral.enfileira('G-2', 'Leva G-2 · fichas do seu jeito\n\nTrilha: geral', () => { geral.escreve('fichas.js', ['const fichas = perfil.fichasDoJogador(estado);']); geral.acrescenta('ROADMAP.md', '| 16º-ac ✅ | fichas do seu jeito (leva G-2) |'); });
    const c = ci(m);
    const p = plano(c);
    assert.deepEqual(p.aceitos.map((a) => [a.nome, a.sha, a.commits]), [['M-10', shaM, 1], ['G-2', shaG, 1]], 'ordem de chegada');
    assert.deepEqual([p.recusados, p.vazios], [[], []]);
    assert.match(c.le('ROADMAP.md'), /16º-ab[\s\S]*16º-ac/, 'o ROADMAP junta as duas linhas (merge=union)');
    const antes = m.cabeca('main');
    const r = avancar({ cwd: c.dir, plano: p, portao: 'success' });
    assert.equal(r.acao, 'publicar'); assert.equal(m.cabeca('main'), r.publicado); assert.notEqual(r.publicado, antes);
    assert.equal(execFileSync('git', ['merge-base', '--is-ancestor', antes, r.publicado], { cwd: m.origem }).length, 0, 'o main só avançou');
    const log = m.logDoMain();
    assert.match(log, /Leva M-10 · mana em combinação[\s\S]*Trilha: motor/); assert.match(log, /Leva G-2 · fichas do seu jeito[\s\S]*Trilha: geral/);
    // a identidade da leva (autoria + assunto) é a mesma no clone de quem enviou e no main
    motor.busca();
    const local = commitsDa(motor.dir, `${shaM}~1..${shaM}`)[0];
    assert.ok(publicados(motor.dir, 'origin/main').has(chave(local)), 'o publicar reconhece a própria leva no main, com outro sha');
    assert.equal(m.existe('refs/heads/fila/M-10'), false); assert.equal(m.existe('refs/heads/fila/G-2'), false);
    assert.deepEqual(plano(c).aceitos, [], 'fila vazia depois de publicar');
  } finally { m.fim(); }
});

test('Q17 · leva em conflito com a que está na frente fica de fora, com o motivo; a da frente publica; a de trás vira recusada/<nome> e o main não leva nada dela', () => {
  const m = mundo();
  try {
    const a = m.clone('a'), b = m.clone('b');
    a.enfileira('M-11', 'Leva M-11 · placar novo\n\nTrilha: motor', () => a.escreve('index.html', ['function mesa() {', '  const placar = desenharPlacarDoMotor(estado);', '  return montarMesa(placar);', '}', 'const ENGINE_VERSION = 98; // motor']));
    const shaB = b.enfileira('G-3', 'Leva G-3 · placar em balão\n\nTrilha: geral', () => b.escreve('index.html', ['function mesa() {', '  const placar = desenharPlacarEmBalao(estado);', '  return montarMesa(placar);', '}', 'const ENGINE_VERSION = 98; // motor']));
    const c = ci(m);
    const p = plano(c);
    assert.deepEqual(p.aceitos.map((x) => x.nome), ['M-11']);
    assert.equal(p.recusados.length, 1); assert.equal(p.recusados[0].nome, 'G-3');
    assert.match(p.recusados[0].motivo, /CONFLITO[\s\S]*somado a M-11[\s\S]*index\.html[\s\S]*rebase origin\/main/);
    assert.match(c.le('index.html'), /desenharPlacarDoMotor/); assert.doesNotMatch(c.le('index.html'), /<<<<<<<|EmBalao/);
    const r = avancar({ cwd: c.dir, plano: p, portao: 'success' });
    assert.ok(r.publicado); assert.deepEqual(r.recusadas, ['G-3']);
    assert.equal(m.existe('refs/heads/fila/G-3'), false); assert.equal(m.existe('refs/heads/recusada/G-3'), true);
    b.busca();
    const s = situacao({ cwd: b.dir });
    assert.equal(s.recusadas.length, 1); assert.match(s.recusadas[0].motivo, /CONFLITO/);
    assert.deepEqual(s.recusadas[0].levas.map((l) => l.assunto), ['Leva G-3 · placar em balão'], 'a leva recusada continua inteira no ramo de aviso');
    assert.equal(b.git('rev-parse', 'origin/recusada/G-3~1'), shaB);
    assert.doesNotMatch(m.logDoMain(), /G-3/);
  } finally { m.fim(); }
});

test('Q17 · a fila aplica a guarda e a conferência: leva que apaga entrega de outra trilha, ou que repete id da ordem, não entra na soma', () => {
  const m = mundo();
  try {
    const bot = m.clone('bot'), geral = m.clone('geral'), motor = m.clone('motor');
    bot.enfileira('B-5', 'Leva B-5 · jogada do Shark\n\nTrilha: bot', () => { bot.escreve('bot.js', ['const jogada = shark.escolherMelhorJogada(estado);', 'const plano = shark.planoDoBaralho(lista);']); bot.acrescenta('ROADMAP.md', '| 16º-ab ✅ | jogada do Shark (leva B-5) |'); });
    const c = ci(m);
    avancar({ cwd: c.dir, plano: plano(c), portao: 'success' });
    // cópia antiga por cima: a leva da geral apaga a linha que o bot acabou de publicar
    geral.enfileira('G-4', 'Leva G-4 · limpeza\n\nTrilha: geral', () => geral.escreve('bot.js', ['const plano = shark.planoDoBaralho(lista);']));
    // id repetido: o motor pegou a mesma letra que o bot
    motor.enfileira('M-12', 'Leva M-12 · fase\n\nTrilha: motor', () => { motor.escreve('fase.js', ['const fase = motor.saiDeFase(permanente);']); motor.acrescenta('ROADMAP.md', '| 16º-ab ✅ | fase (leva M-12) |'); });
    const p = plano(c);
    assert.deepEqual(p.aceitos, []);
    const motivo = Object.fromEntries(p.recusados.map((r) => [r.nome, r.motivo]));
    assert.match(motivo['G-4'], /GUARDA DE AGREGAÇÃO[\s\S]*SOBRESCRITA[\s\S]*escolherMelhorJogada/);
    assert.match(motivo['M-12'], /CONFERÊNCIA ANTES DO PORTÃO[\s\S]*16º-ab aparece em mais de uma linha/);
    const antes = m.cabeca('main');
    const r = avancar({ cwd: c.dir, plano: p, portao: 'skipped' });
    assert.equal(r.acao, 'nada'); assert.equal(m.cabeca('main'), antes); assert.deepEqual(r.recusadas.sort(), ['G-4', 'M-12']);
  } finally { m.fim(); }
});

test('Q17 · portão vermelho: com uma leva, ela é recusada com as quedas no motivo; com várias, nada muda e a mais antiga é testada sozinha', () => {
  const m = mundo();
  try {
    const a = m.clone('a'), b = m.clone('b');
    a.enfileira('M-13', 'Leva M-13 · regra\n\nTrilha: motor', () => a.escreve('regra.js', ['const regra = motor.aplicarRegraNova(estado);']));
    b.enfileira('G-5', 'Leva G-5 · tela\n\nTrilha: geral', () => b.escreve('tela.js', ['const tela = app.desenharTelaNova(estado);']));
    const c = ci(m), antes = m.cabeca('main');
    const dois = plano(c);
    const r2 = avancar({ cwd: c.dir, plano: dois, portao: 'failure', motivo: 'not ok 3 - e2e · H7 imagens' });
    assert.equal(r2.acao, 'isolar'); assert.equal(r2.isolar, 'M-13'); assert.equal(m.cabeca('main'), antes);
    assert.ok(m.existe('refs/heads/fila/M-13') && m.existe('refs/heads/fila/G-5'), 'as duas continuam na fila');
    c.busca();
    const um = montar({ cwd: c.dir, base: 'origin/main', ramos: ordemDaFila(ramosDaFila(c.dir), 'M-13') });
    assert.deepEqual(um.aceitos.map((x) => x.nome), ['M-13']);
    const r1 = avancar({ cwd: c.dir, plano: um, portao: 'failure', motivo: 'not ok 3 - e2e · H7 imagens' });
    assert.equal(r1.acao, 'recusar'); assert.equal(m.cabeca('main'), antes);
    assert.equal(m.existe('refs/heads/fila/M-13'), false); assert.ok(m.existe('refs/heads/fila/G-5'));
    c.busca();
    assert.match(c.git('log', '-1', '--format=%B', 'origin/recusada/M-13'), /RECUSADA pela fila · M-13[\s\S]*PORTÃO VERMELHO[\s\S]*e2e · H7 imagens[\s\S]*O main não mudou/);
    // cancelado ou sem resultado: nem publica nem recusa
    const resto = plano(c);
    const rc = avancar({ cwd: c.dir, plano: resto, portao: 'cancelled' });
    assert.equal(rc.acao, 'manter'); assert.equal(m.cabeca('main'), antes); assert.ok(m.existe('refs/heads/fila/G-5'));
  } finally { m.fim(); }
});

test('Q17 · só chega ao main a árvore que o portão testou: main que andou por fora, plano adulterado e ramo que recebeu commit no meio não publicam às cegas', () => {
  const m = mundo();
  try {
    const a = m.clone('a'), fora = m.clone('fora');
    a.enfileira('M-14', 'Leva M-14 · regra\n\nTrilha: motor', () => a.escreve('regra.js', ['const regra = motor.aplicarRegraNova(estado);']));
    const c = ci(m);
    const p = plano(c);
    // 1. plano com outra árvore (job do portão não pode trocar o que vai ao main)
    assert.throws(() => avancar({ cwd: c.dir, plano: { ...p, arvore: 'b'.repeat(40) }, portao: 'success' }), /não é a que o portão testou/);
    assert.throws(() => avancar({ cwd: c.dir, plano: { ...p, aceitos: [{ ...p.aceitos[0], nome: '--force' }] }, portao: 'success' }), /fora do formato/);
    // 2. alguém publicou direto no main enquanto o portão rodava
    fora.git('fetch', '-q', 'origin'); fora.git('checkout', '-q', '-B', 't', 'origin/main'); fora.escreve('direto.js', ['const direto = publicarPeloCaminhoAntigo();']); fora.commit('Leva G-6 · direto\n\nTrilha: geral'); fora.git('push', '-q', 'origin', 'HEAD:main');
    const depois = m.cabeca('main');
    c.busca();
    const r = avancar({ cwd: c.dir, plano: p, portao: 'success' });
    assert.equal(r.acao, 'manter'); assert.equal(r.deNovo, true); assert.equal(m.cabeca('main'), depois); assert.ok(m.existe('refs/heads/fila/M-14'));
    // 3. rodada seguinte soma sobre o main novo; no meio, a conversa envia mais um commit para o mesmo ramo: publica o testado, o ramo fica
    const p2 = plano(c);
    a.git('checkout', '-q', 'trabalho'); a.escreve('mais.js', ['const mais = motor.outraRegra(estado);']); a.commit('Leva M-15 · outra regra\n\nTrilha: motor'); a.git('push', '-q', 'origin', 'HEAD:refs/heads/fila/M-14');
    const r3 = avancar({ cwd: c.dir, plano: p2, portao: 'success' });
    assert.ok(r3.publicado); assert.match(m.logDoMain(), /Leva M-14/); assert.doesNotMatch(m.logDoMain(), /Leva M-15/);
    assert.ok(m.existe('refs/heads/fila/M-14'), 'o ramo que recebeu commit novo não é apagado');
    const p3 = plano(c);
    assert.deepEqual(p3.aceitos.map((x) => [x.nome, x.commits]), [['M-14', 1]], 'na rodada seguinte só o commit novo entra (o outro já está no main)');
    avancar({ cwd: c.dir, plano: p3, portao: 'success' });
    assert.match(m.logDoMain(), /Leva M-15/); assert.equal(m.existe('refs/heads/fila/M-14'), false);
    assert.equal(m.logDoMain().split('Leva M-14 · regra|').length - 1, 1, 'nenhuma leva entra duas vezes');
  } finally { m.fim(); }
});

test('Q17 · o fluxo da fila: só o job que avança tem escrita e ele não executa código de leva; o portão roda sem credencial; uma rodada por vez', () => {
  const yml = readFileSync(join(RAIZ, '.github/workflows/fila.yml'), 'utf8');
  assert.match(yml, /^on:\n  push:\n    branches: \['fila\/\*\*'\]\n  workflow_dispatch:/m);
  assert.match(yml, /^concurrency:\n  group: \S+\n  cancel-in-progress: false$/m);
  assert.match(yml, /^permissions:\n  contents: read$/m, 'padrão do fluxo: só leitura');
  const job = (nome) => (yml.match(new RegExp(`\\n  ${nome}:\\n([\\s\\S]*?)(?=\\n  [a-z]+:\\n|$)`)) || [])[1] || '';
  const monta = job('monta'), portao = job('portao'), avanca = job('avanca');
  assert.ok(monta && portao && avanca, 'três jobs');
  for (const [nome, j] of [['monta', monta], ['portao', portao]]) {
    assert.doesNotMatch(j, /write/, `${nome} não escreve em nada`);
    assert.match(j, /persist-credentials: false/, `${nome} não deixa credencial no disco`);
    assert.doesNotMatch(j, /github\.token|secrets\./, `${nome} não recebe token nem segredo`);
  }
  assert.match(portao, /npm ci\b/); assert.match(portao, /npm run (-s )?test:rapido/); assert.match(portao, /npm run (-s )?test:e2e/);
  assert.match(portao, /needs\.monta\.outputs\.portao == 'sim'/);
  assert.match(avanca, /contents: write/);
  assert.doesNotMatch(avanca, /npm (ci|install|run|test)|npx |playwright/, 'o job com escrita não instala nem roda nada da leva');
  assert.match(avanca, /cp fila\.mjs agregacao\.mjs "\$RUNNER_TEMP\/"/, 'o código que avança o main é copiado do main antes de a árvore mudar');
  assert.match(avanca, /needs\.portao\.result/, 'quem diz se o portão passou é o resultado do job, não uma saída que o código testado escreve');
  for (const j of [monta, portao, avanca]) assert.match(j, /ref: main/, 'todo job parte do main');
  assert.doesNotMatch(yml, /--force(?!-)|push -f\b/, 'nenhum push forçado no fluxo');
});

test('I-291 · a cada avanço do main, a fila dispara "Relatos pela fila" (o agendamento do GitHub não roda), sem permissão nova', () => {
  const yml = readFileSync(join(RAIZ, '.github/workflows/fila.yml'), 'utf8');
  const avanca = (yml.match(/\n  avanca:\n([\s\S]*?)(?=\n  [a-z]+:\n|$)/) || [])[1] || '';
  const passos = avanca.split('\n      - ');
  const passo = passos.find(p => /^name: .*\n[\s\S]*gh workflow run relatos-fila/.test(p));
  assert.ok(passo, 'há um passo que dispara relatos-fila.yml');
  assert.match(passo, /if: steps\.avanca\.outputs\.publicado != ''/, 'só quando o main avançou');
  assert.match(passo, /GH_TOKEN: \$\{\{ github\.token \}\}/, 'com o token do próprio fluxo, nenhum segredo');
  assert.match(passo, /gh workflow run relatos-fila\.yml --repo "\$GITHUB_REPOSITORY" --ref main/);
  assert.match(passo, /\|\| (true|echo)/, 'falhar o disparo não derruba a rodada (o main já avançou)');
  assert.ok(passos.indexOf(passo) > passos.findIndex(p => /Marcar o commit publicado/.test(p)), 'depois de marcar o commit publicado');
  const perms = (avanca.match(/permissions:\n((?:      [a-z].*\n)+)/) || [])[1] || '';
  assert.deepEqual(perms.trim().split('\n').map(l => l.trim().split(':')[0]).sort(), ['actions', 'contents', 'statuses'], 'as mesmas três permissões de antes');
});

test('I-292 · telemetria da rodada: o portão entrega só um resumo agregado como saída do job; o avanca grava a rodada com o telemetria.mjs do main, copiado antes de a árvore virar a soma, tudo pelo ambiente, sem permissão nova e sem derrubar a rodada', () => {
  const yml = readFileSync(join(RAIZ, '.github/workflows/fila.yml'), 'utf8');
  const job = (nome) => (yml.match(new RegExp(`\\n  ${nome}:\\n([\\s\\S]*?)(?=\\n  [a-z]+:\\n|$)`)) || [])[1] || '';
  const portao = job('portao'), avanca = job('avanca');
  assert.match(portao, /outputs:\n(?:      \w+: .*\n)*      resumo: \$\{\{ steps\.resumo\.outputs\.resumo \}\}/, 'o portão expõe o resumo como saída do job');
  const pResumo = portao.split('\n      - ').find(p => /^name: Resumo do portão/.test(p));
  assert.ok(pResumo, 'passo do resumo'); assert.match(pResumo, /if: always\(\)/, 'roda com o portão verde ou vermelho');
  assert.match(pResumo, /\.tmp\/portao\.json/); assert.doesNotMatch(pResumo, /upload-artifact|gh api|github\.token/, 'nenhum artefato, nenhuma chamada à API: só a saída do job');
  for (const campo of ['passaram', 'minutos', 'instaveis', 'telas', 'medidas']) assert.ok(pResumo.includes(campo), `o resumo leva ${campo}`);
  assert.match(pResumo, /telas: Array\.isArray\(x\.telas\) \? x\.telas\.length : 0/, 'telas vai como contagem (818 nomes não cabem numa saída)');
  const passos = avanca.split('\n      - ');
  const iGuarda = passos.findIndex(p => /^name: Guardar o telemetria\.mjs do main/.test(p)), iAvanca = passos.findIndex(p => /^name: Avançar o main/.test(p)), iTel = passos.findIndex(p => /^name: Telemetria da rodada/.test(p));
  assert.ok(iGuarda >= 0 && iAvanca >= 0 && iTel >= 0, 'três passos');
  assert.ok(iGuarda < iAvanca, 'o telemetria.mjs do main sai da árvore antes de a árvore virar a soma');
  assert.match(passos[iGuarda], /cp telemetria\.mjs "\$RUNNER_TEMP\/"/);
  assert.ok(iTel > passos.findIndex(p => /Marcar o commit publicado/.test(p)), 'depois de marcar o commit publicado');
  const tel = passos[iTel];
  assert.match(tel, /if: always\(\) && needs\.portao\.result != 'skipped'/, 'grava verde ou vermelho; sem portão (nada para testar) não há rodada');
  for (const v of ['FILA_PLANO: ${{ needs.monta.outputs.plano }}', 'FILA_PORTAO: ${{ needs.portao.result }}', 'FILA_RESUMO: ${{ needs.portao.outputs.resumo }}', 'FILA_PUBLICADO: ${{ steps.avanca.outputs.publicado }}', 'GH_TOKEN: ${{ github.token }}']) assert.ok(tel.includes(v), `ambiente: ${v}`);
  assert.doesNotMatch(tel.split('run: |')[1] || '', /\$\{\{/, 'nada do plano ou do resumo interpolado no shell: tudo pelo ambiente');
  assert.match(tel, /cd "\$RUNNER_TEMP" && node telemetria\.mjs rodada --ci --remoto "\$\{GITHUB_SERVER_URL\}\/\$\{GITHUB_REPOSITORY\}\.git"/, 'roda a cópia do main, fora da árvore, e a URL do remoto não leva o token');
  assert.match(tel, /git config --global "http\.\$\{GITHUB_SERVER_URL\}\/\.extraheader"/, 'o token vai pelo cabeçalho do git do runner (como o checkout faz)');
  assert.match(tel, /\|\| echo "::warning::/, 'falhar não derruba a rodada');
  assert.doesNotMatch(avanca, /npm (ci|install|run|test)|npx |playwright/, 'continua sem instalar nem rodar nada da leva');
  const perms = (avanca.match(/permissions:\n((?:      [a-z].*\n)+)/) || [])[1] || '';
  assert.deepEqual(perms.trim().split('\n').map(l => l.trim().split(':')[0]).sort(), ['actions', 'contents', 'statuses'], 'nenhuma permissão nova (contents: write já cobre o ramo telemetria)');
});

test('Q17 · do lado da conversa: `publicar --fila` envia para fila/<leva>; número já na fila por outra conversa é recusado; o que a fila publicou sai da frente no rebase seguinte', () => {
  const m = mundo();
  try {
    const publicar = (c, ...args) => spawnSync(process.execPath, [join(RAIZ, 'publicar.mjs'), ...args], { cwd: c.dir, encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t', GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null' } });
    const a = m.clone('a'), b = m.clone('b');
    a.escreve('fichas.js', ['const fichas = perfil.fichasDoJogador(estado);']); a.acrescenta('ROADMAP.md', '| 16º-ab ✅ | fichas (leva G-2) |');
    a.commit('Leva G-2 · fichas do seu jeito\n\nTrilha: geral');
    const r1 = publicar(a, '--sem-rapida'); // a fila é o caminho padrão: sem `--direto`, nada vai ao main por este clone
    assert.equal(r1.status, 0, r1.stdout + r1.stderr); assert.match(r1.stdout, /✓ Na fila: fila\/G-2 \(1 commit/);
    assert.equal(m.cabeca('refs/heads/fila/G-2'), a.git('rev-parse', 'HEAD'));
    assert.notEqual(m.cabeca('main'), a.git('rev-parse', 'HEAD'), 'o publicar não envia para o main');
    assert.match(readFileSync(join(RAIZ, 'publicar.mjs'), 'utf8'), /const pelaFila = !direto;/);
    // outra conversa da mesma trilha, sem ver a primeira, com o mesmo número
    b.escreve('catalogo.js', ['const catalogo = app.catalogoDeListas(estado);']);
    b.commit('Leva G-2 · catálogo com valor\n\nTrilha: geral');
    const r2 = publicar(b, '--fila', '--sem-rapida');
    assert.equal(r2.status, 1); assert.match(r2.stderr, /Já existe fila\/G-2 na fila, de outra conversa[\s\S]*fichas do seu jeito[\s\S]*Renumere/);
    assert.equal(m.cabeca('refs/heads/fila/G-2'), a.git('rev-parse', 'HEAD'), 'a leva de quem chegou antes fica intacta');
    // a conversa segue trabalhando por cima da leva enfileirada; a fila publica a primeira
    a.escreve('mais.js', ['const mais = app.outraTela(estado);']); a.acrescenta('ROADMAP.md', '| 16º-ac ✅ | outra tela (leva G-3) |');
    a.commit('Leva G-3 · outra tela\n\nTrilha: geral');
    const c = ci(m);
    assert.ok(avancar({ cwd: c.dir, plano: plano(c), portao: 'success' }).publicado);
    const sit = publicar(a, '--situacao');
    assert.match(sit.stdout, /✓ no main [0-9a-f]{7}  Leva G-2[\s\S]*· aguardando  Leva G-3/);
    const r3 = publicar(a, '--fila', '--sem-rapida');
    assert.equal(r3.status, 0, r3.stdout + r3.stderr);
    assert.match(r3.stdout, /1 commit\(s\) local\(is\) já estão no main \(publicados pela fila\): saem da frente/); assert.match(r3.stdout, /✓ Na fila: fila\/G-3 \(1 commit/);
    assert.equal((a.le('ROADMAP.md').match(/16º-ab/g) || []).length, 1, 'a linha da leva já publicada não é duplicada pelo rebase');
    assert.equal(a.git('rev-list', '--count', 'origin/main..HEAD'), '1');
    assert.ok(avancar({ cwd: c.dir, plano: plano(c), portao: 'success' }).publicado);
    assert.equal((m.logDoMain().match(/^Leva G-[23] /gm) || []).length, 2);
  } finally { m.fim(); }
});

test('Q17 · leva recusada, corrigida e publicada: o aviso recusada/<nome> some com a publicação, e aviso velho não aparece como recusa pendente', () => {
  const m = mundo();
  try {
    const a = m.clone('a');
    a.enfileira('P-6', 'Leva P-6 · o que sai do aparelho\n\nTrilha: protecao', () => a.escreve('dados.js', ['const destinos = app.oQueSaiDoAparelho(estado);']));
    const c = ci(m);
    avancar({ cwd: c.dir, plano: plano(c), portao: 'failure', motivo: 'not ok 119 - e2e · D5 dados num lugar só;not ok 1 - e2e · D5 dados num lugar só;' });
    assert.ok(m.existe('refs/heads/recusada/P-6'));
    c.busca();
    const motivo = c.git('log', '-1', '--format=%B', 'origin/recusada/P-6');
    assert.match(motivo, /Testes que caíram \(1\):\n- e2e · D5 dados num lugar só\n/, 'um teste por linha, sem a repetição do teste sozinho');
    assert.doesNotMatch(motivo, /not ok|;/);
    // a conversa corrige com um commit por cima e reenvia sem apagar o aviso (clone que não enxergava o ramo recusada/)
    a.git('checkout', '-q', 'trabalho'); a.escreve('dados.js', ['const destinos = app.oQueSaiDoAparelho(estado);', 'const lista = destinos.filter(visivel);']);
    a.commit('Leva P-6 · correção do teste D5\n\nTrilha: protecao'); a.git('push', '-q', 'origin', 'HEAD:refs/heads/fila/P-6');
    a.busca();
    assert.equal(situacao({ cwd: a.dir }).recusadas.length, 1, 'enquanto a leva não chega ao main, a recusa aparece');
    const pl = plano(c);
    assert.deepEqual(pl.recusados, [], 'a correção por cima, com o mesmo número de leva, não é leva repetida');
    assert.ok(avancar({ cwd: c.dir, plano: pl, portao: 'success' }).publicado);
    assert.equal(m.existe('refs/heads/recusada/P-6'), false, 'publicou: o aviso sai');
    assert.equal(m.existe('refs/heads/fila/P-6'), false);
  } finally { m.fim(); }
});

test('Q17 · motivo da recusa por portão: lista sem repetição, um teste por linha; sem quedas informadas, aponta o log', () => {
  assert.equal(formatarQuedas('not ok 3 - e2e · H7 imagens;not ok 12 - e2e · I7 foco;not ok 1 - e2e · H7 imagens;'), 'Testes que caíram (2):\n- e2e · H7 imagens\n- e2e · I7 foco');
  assert.equal(formatarQuedas(''), ''); assert.equal(formatarQuedas(undefined), '');
});

test('Q17 · a fila limpa aviso velho: recusada/<nome> de leva que já está no main sai; aviso de leva ainda fora do main fica', () => {
  const m = mundo();
  try {
    const a = m.clone('a'), b = m.clone('b');
    const shaA = a.enfileira('P-6', 'Leva P-6 · o que sai do aparelho\n\nTrilha: protecao', () => a.escreve('dados.js', ['const destinos = app.oQueSaiDoAparelho(estado);']));
    b.enfileira('G-9', 'Leva G-9 · tela\n\nTrilha: geral', () => b.escreve('tela.js', ['const tela = app.desenharTelaNova(estado);']));
    const c = ci(m);
    // dois avisos: o da P-6 (que depois publica por outro caminho, sem a fila apagar) e o da G-9 (que continua recusada)
    c.git('push', '-q', 'origin', `${c.git('commit-tree', `${shaA}^{tree}`, '-p', shaA, '-m', 'RECUSADA pela fila · P-6')}:refs/heads/recusada/P-6`);
    const um = montar({ cwd: c.dir, base: 'origin/main', ramos: ordemDaFila(ramosDaFila(c.dir), 'G-9') });
    avancar({ cwd: c.dir, plano: um, portao: 'failure', motivo: 'not ok 1 - e2e · x' });
    a.git('push', '-q', 'origin', `${shaA}:main`);            // a P-6 chega ao main (reenvio de clone que não apagou o aviso)
    c.busca();
    assert.ok(m.existe('refs/heads/recusada/P-6') && m.existe('refs/heads/recusada/G-9'));
    assert.deepEqual(limparAvisos({ cwd: c.dir }), ['P-6']);
    assert.equal(m.existe('refs/heads/recusada/P-6'), false); assert.equal(m.existe('refs/heads/recusada/G-9'), true, 'recusa pendente não é apagada');
    assert.deepEqual(limparAvisos({ cwd: c.dir }), []);
  } finally { m.fim(); }
});

test('Q17 · `publicar --esperar` só trata como recusa o aviso gravado por cima do commit enviado (aviso velho, que a conversa não consegue apagar, não conta)', () => {
  const pub = readFileSync(join(RAIZ, 'publicar.mjs'), 'utf8');
  assert.match(pub, /const enviado = git\('rev-parse', 'HEAD'\);/);
  assert.match(pub, /refExiste\(`origin\/\$\{PREFIXO_RECUSADA\}\$\{nome\}`\) && git\('rev-parse', `origin\/\$\{PREFIXO_RECUSADA\}\$\{nome\}\^`\) === enviado/);
});

/* ---------- Q22 · main vermelho não recusa inocente ---------- */

const TESTE_QUE_CAI = (nome) => ["import { test } from 'node:test';", "test('Q22 · sempre verde', () => {});", `test(${JSON.stringify(nome)}, () => { throw new Error('caiu'); });`];
const TESTE_QUE_PASSA = (nome) => ["import { test } from 'node:test';", "test('Q22 · sempre verde', () => {});", `test(${JSON.stringify(nome)}, () => {});`];
/** Saída TAP como a do portão: a queda com a linha `location:` (caminho do runner) e a repetição da segunda chance. */
const logDoPortao = (nome, arquivo) => [`not ok 7 - ${nome}`, '  ---', '  duration_ms: 12', `  location: '/home/runner/work/x/x/${arquivo}:3:1'`, "  failureType: 'testCodeFailure'", '  ...', `not ok 1 - ${nome}`, `  location: '/home/runner/work/x/x/${arquivo}:3:1'`, `not ok 9 - ${arquivo}`, '# fail 1'].join('\n');

test('Q22 · parte pura: quedas com o arquivo lidas do TAP, sem repetição; main vermelho só com todas as quedas reproduzidas; pré-sonda "caem" nunca publica', () => {
  const log = logDoPortao('e2e · MJ11b campo cheio', 'e2e.test.mjs') + '\nnot ok 12 - fila · sem arquivo\n# fail 2';
  assert.deepEqual(quedasComArquivo(log), [{ nome: 'e2e · MJ11b campo cheio', arquivo: 'e2e.test.mjs' }, { nome: 'fila · sem arquivo', arquivo: '' }]);
  assert.deepEqual(limparQueda({ nome: 'a\u0000b', arquivo: '../x.test.mjs' }), { nome: 'a b', arquivo: '' }, 'arquivo só com forma de teste da raiz');
  assert.equal(limparQueda({ nome: 'x', arquivo: '--require=evil.test.mjs' }).arquivo, '', 'nada que pareça opção de linha de comando');
  const q = (noMain) => ({ nome: 'x', arquivo: 'e2e.test.mjs', noMain });
  assert.equal(mainVermelho({ total: 2, quedas: [q('cai'), q('cai')] }), true);
  assert.equal(mainVermelho({ total: 2, quedas: [q('cai'), q('passa')] }), false, 'uma queda que não cai no main é da soma');
  assert.equal(mainVermelho({ total: 3, quedas: [q('cai'), q('cai')] }), false, 'queda que não foi reexecutada não vira culpa do main');
  assert.equal(mainVermelho({ total: 1, quedas: [q('?')] }), false); assert.equal(mainVermelho({ total: 0, quedas: [] }), false); assert.equal(mainVermelho(null), false);
  assert.equal(resultadoDaPresonda([{ resultado: 'passa' }, { resultado: 'cai' }]), 'caem');
  assert.equal(resultadoDaPresonda([{ resultado: 'passa' }]), 'passam');
  assert.equal(resultadoDaPresonda([{ resultado: 'passa' }, { resultado: '?' }]), '?', 'teste renomeado pela correção: o portão inteiro decide');
  assert.equal(resultadoDaPresonda([]), '?');
  const um = [{ nome: 'H-19' }], dois = [{ nome: 'H-19' }, { nome: 'J-27' }], mv = { total: 1, quedas: [q('cai')] };
  assert.equal(decisao({ aceitos: um, portao: 'success', presonda: 'caem' }).acao, 'esperar-main', 'job verde sem fases (pré-sonda "caem") nunca publica');
  assert.equal(decisao({ aceitos: um, portao: 'success', presonda: 'passam' }).acao, 'publicar');
  assert.equal(decisao({ aceitos: um, portao: 'failure', herdadas: mv }).acao, 'esperar-main', 'uma leva inocente não é recusada');
  assert.equal(decisao({ aceitos: dois, portao: 'failure', herdadas: mv }).acao, 'esperar-main', 'nem isolada');
  assert.equal(decisao({ aceitos: um, portao: 'failure', herdadas: { total: 1, quedas: [q('passa')] } }).acao, 'recusar', 'culpa da leva continua recusando');
  assert.equal(decisao({ aceitos: dois, portao: 'failure' }).acao, 'isolar', 'sem reexecução, como antes');
  const aviso = { base: 'a'.repeat(40), quedas: [{ nome: 'x', arquivo: 'e2e.test.mjs' }] };
  assert.equal(sondaDoAviso(aviso, 'a'.repeat(40)).length, 1); assert.equal(sondaDoAviso(aviso, 'b'.repeat(40)).length, 0, 'aviso de outro main é velho'); assert.equal(sondaDoAviso(null, 'a'.repeat(40)).length, 0);
});

test('Q22 · reexecutar roda cada queda sozinha no arquivo dela: cai, passa ou "?" (nome que não existe, arquivo que sumiu)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'estante-q22-'));
  try {
    writeFileSync(join(dir, 'a.test.mjs'), TESTE_QUE_CAI('Q22 · cai (com parênteses) e [colchetes]').join('\n') + '\n');
    writeFileSync(join(dir, 'b.test.mjs'), TESTE_QUE_PASSA('Q22 · passa').join('\n') + '\n');
    const r = reexecutar({ cwd: dir, quedas: [{ nome: 'Q22 · cai (com parênteses) e [colchetes]', arquivo: 'a.test.mjs' }, { nome: 'Q22 · passa', arquivo: 'b.test.mjs' }, { nome: 'Q22 · não existe', arquivo: 'b.test.mjs' }, { nome: 'Q22 · passa', arquivo: 'sumiu.test.mjs' }, { nome: 'sem arquivo', arquivo: '' }] });
    assert.deepEqual(r.map((x) => x.resultado), ['cai', 'passa', '?', '?', '?']);
    // orçamento da reexecução inteira (o job do portão tem teto de tempo): esgotado, o resto fica "?" e não vira culpa do main
    let t = 0; const relogio = () => (t += 4 * 60000);
    assert.deepEqual(reexecutar({ cwd: dir, quedas: [{ nome: 'Q22 · passa', arquivo: 'b.test.mjs' }, { nome: 'Q22 · passa', arquivo: 'b.test.mjs' }], orcamentoMs: 7 * 60000, agora: relogio }).map((x) => x.resultado), ['passa', '?']);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('Q22 · main vermelho: a leva inocente fica na fila (sem recusada/), o aviso guarda as quedas, a pré-sonda segura o portão, e a leva que conserta publica tudo e apaga o aviso', () => {
  const m = mundo();
  try {
    const NOME = 'e2e · MJ11b orçamento de tempo';
    const dono = m.clone('dono');   // o main entra vermelho no CI (teste que mede relógio), por fora da fila
    dono.git('fetch', '-q', 'origin'); dono.git('checkout', '-q', '-B', 't', 'origin/main'); dono.escreve('sonda.test.mjs', TESTE_QUE_CAI(NOME)); dono.commit('Leva J-24 · MJ11b\n\nTrilha: jogabilidade'); dono.git('push', '-q', 'origin', 'HEAD:main');
    const base = m.cabeca('main');
    const h = m.clone('h');
    h.enfileira('H-19', 'Leva H-19 · aprova cartas\n\nTrilha: homologacao', () => h.escreve('aprovadas.json', ['["Lightning Bolt"]']));
    const c = ci(m);
    const p = plano(c);
    assert.deepEqual(p.aceitos.map((x) => x.nome), ['H-19']);
    // o portão caiu: as quedas rodam de novo sobre o main sozinho
    const herdadas = herdadasNoMain({ cwd: c.dir, plano: p, log: logDoPortao(NOME, 'sonda.test.mjs') });
    assert.deepEqual(herdadas.quedas.map((x) => x.noMain), ['cai']); assert.equal(herdadas.base, base);
    const r = avancar({ cwd: c.dir, plano: p, portao: 'failure', motivo: `not ok 7 - ${NOME}`, herdadas });
    assert.equal(r.acao, 'esperar-main'); assert.deepEqual(r.recusadas, []); assert.equal(m.cabeca('main'), base);
    assert.ok(m.existe('refs/heads/fila/H-19'), 'a leva inocente continua na fila');
    assert.equal(m.existe('refs/heads/recusada/H-19'), false, 'nenhuma recusa: nada para a conversa reenviar');
    assert.ok(m.existe(`refs/heads/${AVISO_MAIN}`));
    c.git('fetch', '-q', 'origin', `+refs/heads/aviso/*:refs/remotes/origin/aviso/*`);
    const aviso = lerAvisoMain({ cwd: c.dir });
    assert.equal(aviso.base, base); assert.deepEqual(aviso.quedas, [{ nome: NOME, arquivo: 'sonda.test.mjs' }]);
    assert.match(c.git('log', '-1', '--format=%B', `origin/${AVISO_MAIN}`), /MAIN VERMELHO no CI[\s\S]*não recusa ninguém[\s\S]*MJ11b orçamento de tempo \(sonda\.test\.mjs\)/);
    assert.equal(situacao({ cwd: c.dir }).mainVermelho.base, base, 'o publicar --situacao mostra o aviso');
    // uma herança forjada de outro main não vale (o job do portão roda código de leva)
    assert.equal(avancar({ cwd: c.dir, plano: p, portao: 'failure', herdadas: { ...herdadas, base: 'b'.repeat(40) } }).acao, 'recusar');
    h.git('push', '-q', 'origin', 'HEAD:refs/heads/fila/H-19'); // a recusa do teste acima volta a leva para a fila
    // rodada seguinte com outra leva inocente: a pré-sonda acha a queda e o portão inteiro não roda
    const j = m.clone('j');
    j.enfileira('B-183', 'Leva B-183 · bot\n\nTrilha: bot', () => j.escreve('bot.js', ['const bot = shark.joga(estado);']));
    const p2 = plano(c);
    assert.deepEqual(sondaDoAviso(lerAvisoMain({ cwd: c.dir }), p2.base), [{ nome: NOME, arquivo: 'sonda.test.mjs' }]);
    const pre = resultadoDaPresonda(reexecutar({ cwd: c.dir, quedas: [{ nome: NOME, arquivo: 'sonda.test.mjs' }] }));
    assert.equal(pre, 'caem');
    const r2 = avancar({ cwd: c.dir, plano: p2, portao: 'success', presonda: pre });
    assert.equal(r2.acao, 'esperar-main'); assert.equal(m.cabeca('main'), base); assert.ok(m.existe('refs/heads/fila/B-183') && m.existe('refs/heads/fila/H-19'));
    // a trilha dona envia a correção: a pré-sonda passa, o portão inteiro passa, as três publicam juntas e o aviso some
    const d2 = m.clone('d2');
    d2.enfileira('J-28', 'Leva J-28 · MJ11b mede em proporção\n\nTrilha: jogabilidade', () => d2.escreve('sonda.test.mjs', TESTE_QUE_PASSA(NOME)));
    const p3 = plano(c);
    assert.equal(p3.aceitos.length, 3);
    assert.equal(resultadoDaPresonda(reexecutar({ cwd: c.dir, quedas: [{ nome: NOME, arquivo: 'sonda.test.mjs' }] })), 'passam');
    const r3 = avancar({ cwd: c.dir, plano: p3, portao: 'success', presonda: 'passam' });
    assert.ok(r3.publicado); assert.equal(r3.avisoMainApagado, true); assert.equal(m.existe(`refs/heads/${AVISO_MAIN}`), false);
    for (const l of ['H-19', 'B-183', 'J-28']) assert.match(m.logDoMain(), new RegExp(`Leva ${l}`));
  } finally { m.fim(); }
});

test('Q22 · culpa da leva continua recusando: a queda que passa no main sozinho é da soma, e o motivo separa o que já caía no main', () => {
  const m = mundo();
  try {
    const NOME = 'regra · placar soma', OUTRO = 'tela · antiga';
    const dono = m.clone('dono');
    dono.git('fetch', '-q', 'origin'); dono.git('checkout', '-q', '-B', 't', 'origin/main');
    dono.escreve('regra.test.mjs', TESTE_QUE_PASSA(NOME)); dono.escreve('tela.test.mjs', TESTE_QUE_CAI(OUTRO)); dono.commit('Leva M-600 · regra\n\nTrilha: motor'); dono.git('push', '-q', 'origin', 'HEAD:main');
    const a = m.clone('a');
    a.enfileira('M-601', 'Leva M-601 · quebra a regra\n\nTrilha: motor', () => a.escreve('regra.test.mjs', TESTE_QUE_CAI(NOME)));
    const c = ci(m), p = plano(c);
    const log = logDoPortao(NOME, 'regra.test.mjs') + '\n' + logDoPortao(OUTRO, 'tela.test.mjs');
    const herdadas = herdadasNoMain({ cwd: c.dir, plano: p, log });
    assert.deepEqual(herdadas.quedas.map((x) => [x.nome, x.noMain]), [[NOME, 'passa'], [OUTRO, 'cai']]);
    const r = avancar({ cwd: c.dir, plano: p, portao: 'failure', motivo: `not ok 7 - ${NOME};not ok 8 - ${OUTRO}`, herdadas });
    assert.equal(r.acao, 'recusar'); assert.equal(m.existe(`refs/heads/${AVISO_MAIN}`), false);
    c.busca();
    assert.match(c.git('log', '-1', '--format=%B', 'origin/recusada/M-601'), /PORTÃO VERMELHO[\s\S]*Caem também no main sozinho \(não são desta leva\): tela · antiga\./);
  } finally { m.fim(); }
});

test('Q22 · o fluxo: pré-sonda antes das fases (que não rodam com "caem"), reexecução no main no job sem credencial, aviso lido no monta, nenhuma permissão nova', () => {
  const yml = readFileSync(join(RAIZ, '.github/workflows/fila.yml'), 'utf8');
  const job = (nome) => (yml.match(new RegExp(`\\n  ${nome}:\\n([\\s\\S]*?)(?=\\n  [a-z]+:\\n|$)`)) || [])[1] || '';
  const monta = job('monta'), portao = job('portao'), avanca = job('avanca');
  assert.match(monta, /sonda: \$\{\{ steps\.monta\.outputs\.sonda \}\}/);
  assert.match(monta, /'\+refs\/heads\/aviso\/\*:refs\/remotes\/origin\/aviso\/\*'/, 'o monta busca o aviso');
  const passos = portao.split('\n      - ');
  const i = (rx) => passos.findIndex((x) => rx.test(x));
  const iPre = i(/^name: Pré-sonda/), iRap = i(/^name: Fase rápida/), iTela = i(/^name: Fase de tela/), iHer = i(/^name: As quedas caem também no main/), iQue = i(/^name: Testes que caíram/);
  assert.ok(iPre > 0 && iPre < iRap && iRap < iTela && iTela < iQue && iQue < iHer, 'ordem: pré-sonda, fases, quedas, reexecução no main');
  assert.match(passos[iPre], /if: needs\.monta\.outputs\.sonda != ''/);
  assert.match(passos[iPre], /FILA_SONDA: \$\{\{ needs\.monta\.outputs\.sonda \}\}/); assert.match(passos[iPre], /cd "\$RUNNER_TEMP" && node fila\.mjs presonda/, 'o fila.mjs do main');
  for (const k of [iRap, iTela]) assert.match(passos[k], /if: steps\.presonda\.outputs\.presonda != 'caem'/);
  assert.match(passos[iHer], /if: failure\(\) && steps\.presonda\.outputs\.presonda != 'caem'/);
  assert.match(passos[iHer], /cd "\$RUNNER_TEMP" && node fila\.mjs herdadas --cwd "\$GITHUB_WORKSPACE" --log "\$GITHUB_WORKSPACE\/portao\.log"/);
  for (const s of ['presonda: ${{ steps.presonda.outputs.presonda }}', 'herdadas: ${{ steps.herdadas.outputs.herdadas }}']) assert.ok(portao.includes(s), s);
  for (const s of ['FILA_PRESONDA: ${{ needs.portao.outputs.presonda }}', 'FILA_HERDADAS: ${{ needs.portao.outputs.herdadas }}']) assert.ok(avanca.includes(s), `pelo ambiente: ${s}`);
  assert.match(avanca, /name: Telemetria da rodada\n        if: always\(\) && needs\.portao\.result != 'skipped' && needs\.portao\.outputs\.presonda != 'caem'/, 'rodada que parou na pré-sonda não é portão');
  assert.doesNotMatch(portao, /write|github\.token|secrets\./, 'o portão continua sem escrita e sem token');
  assert.doesNotMatch(avanca, /npm (ci|install|run|test)|npx |playwright|--test/, 'o job com escrita continua sem rodar nada da leva (a reexecução é no portão)');
});
