/* Q12 · guarda de agregação: publicar soma, nunca apaga a entrega de outra trilha sem declarar. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { conferirFaixa, lerRodapes, lerDiff, linhaConta, relatar, estendida, EPOCA } from './agregacao.mjs';

const RAIZ = dirname(fileURLToPath(import.meta.url));
const DEPOIS = Math.floor(EPOCA / 1000) + 3600; // todos os commits de teste nascem depois da época

/** Repositório de mentira com relógio próprio: cada commit anda 10 minutos. */
function repo() {
  const dir = mkdtempSync(join(tmpdir(), 'estante-agregacao-'));
  let relogio = DEPOIS;
  const git = (...a) => execFileSync('git', a, {
    cwd: dir, encoding: 'utf8',
    env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t',
      GIT_AUTHOR_DATE: `${relogio} +0000`, GIT_COMMITTER_DATE: `${relogio} +0000`, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_SYSTEM: '/dev/null' },
  }).trim();
  git('init', '-q', '-b', 'main');
  const api = {
    dir, git,
    escreve(arquivo, linhas) { writeFileSync(join(dir, arquivo), linhas.join('\n') + '\n'); },
    le(arquivo) { return readFileSync(join(dir, arquivo), 'utf8').split('\n').filter((l) => l !== ''); },
    commit(mensagem, horas = 0) { relogio += 600 + horas * 3600; git('add', '-A'); git('commit', '-q', '-m', mensagem); return git('rev-parse', 'HEAD'); },
    fim() { rmSync(dir, { recursive: true, force: true }); },
  };
  return api;
}

const BASE = ['function mesa() {', '  const placar = desenharPlacar(estado);', '  return montarMesa(placar);', '}'];
const BOT = '  const jogada = shark.escolherMelhorJogada(estado);';
const MOTOR = '  const mana = motor.pagarEmQualquerCombinacao(custo);';

/** main com uma base e a entrega do bot publicada; devolve os shas. */
function comBotPublicado() {
  const r = repo();
  r.escreve('index.html', BASE);
  const base = r.commit('Base\n\nTrilha: geral');
  r.escreve('index.html', [BASE[0], BASE[1], BOT, BASE[2], BASE[3]]);
  const bot = r.commit('Leva 10 · bot joga melhor\n\nTrilha: bot');
  return { r, base, bot };
}

test('Q12 · duas trilhas que só acrescentam passam', () => {
  const { r, bot } = comBotPublicado();
  try {
    r.escreve('index.html', [...r.le('index.html').slice(0, 3), MOTOR, ...r.le('index.html').slice(3)]);
    const motor = r.commit('Leva 11 · mana em combinação\n\nTrilha: motor');
    const { achados } = conferirFaixa(bot, motor, { cwd: r.dir });
    assert.deepEqual(achados, []);
    assert.ok(r.le('index.html').includes(BOT) && r.le('index.html').includes(MOTOR), 'as duas entregas ficam no arquivo');
  } finally { r.fim(); }
});

test('Q12 · cópia antiga do arquivo por cima da nova é barrada e diz o que sumiu', () => {
  const { r, bot } = comBotPublicado();
  try {
    // a trilha do motor trabalhou sobre a base, sem a linha do bot, e gravou o arquivo inteiro
    r.escreve('index.html', [BASE[0], BASE[1], MOTOR, BASE[2], BASE[3]]);
    const motor = r.commit('Leva 11 · mana em combinação\n\nTrilha: motor');
    const { achados } = conferirFaixa(bot, motor, { cwd: r.dir });
    assert.equal(achados.length, 1);
    assert.equal(achados[0].tipo, 'sobrescrita');
    assert.equal(achados[0].de.sha, bot);
    assert.deepEqual(achados[0].apagadas, [{ arquivo: 'index.html', linha: BOT.trim() }]);
    const texto = relatar(achados);
    assert.match(texto, /SOBRESCRITA/);
    assert.match(texto, new RegExp(`Sobrescreve: ${bot.slice(0, 7)}`), 'o relato entrega o rodapé pronto');
    assert.match(texto, /shark\.escolherMelhorJogada/, 'o relato mostra a linha perdida');
  } finally { r.fim(); }
});

test('Q12 · sobrescrever passa quando a intenção é declarada, com motivo', () => {
  const { r, bot } = comBotPublicado();
  try {
    r.escreve('index.html', [BASE[0], BASE[1], MOTOR, BASE[2], BASE[3]]);
    const semMotivo = r.commit(`Leva 11 · troca a jogada\n\nTrilha: motor\nSobrescreve: ${bot.slice(0, 7)}`);
    let res = conferirFaixa(bot, semMotivo, { cwd: r.dir });
    assert.deepEqual(res.achados.map((a) => a.tipo).sort(), ['sem-motivo', 'sobrescrita'], 'declarar sem motivo não vale');

    r.git('commit', '-q', '--amend', '-m', `Leva 11 · troca a jogada\n\nTrilha: motor\nSobrescreve: ${bot.slice(0, 7)} — a escolha da jogada passou para dentro do motor`);
    res = conferirFaixa(bot, r.git('rev-parse', 'HEAD'), { cwd: r.dir });
    assert.deepEqual(res.achados, []);
  } finally { r.fim(); }
});

test('Q12 · a própria trilha reescreve o que é dela sem declarar', () => {
  const { r, bot } = comBotPublicado();
  try {
    r.escreve('index.html', [BASE[0], BASE[1], '  const jogada = shark.escolherComLeituraDeMao(estado);', BASE[2], BASE[3]]);
    const bot2 = r.commit('Leva 11 · bot lê a mão\n\nTrilha: bot');
    assert.deepEqual(conferirFaixa(bot, bot2, { cwd: r.dir }).achados, []);
  } finally { r.fim(); }
});

test('Q12 · linha mudada de lugar não é perda', () => {
  const { r, bot } = comBotPublicado();
  try {
    r.escreve('index.html', [BASE[0], BOT, BASE[1], BASE[2], BASE[3]]);
    const motor = r.commit('Leva 11 · reordena a mesa\n\nTrilha: motor');
    assert.deepEqual(conferirFaixa(bot, motor, { cwd: r.dir }).achados, []);
  } finally { r.fim(); }
});

test('Q12 · linha que só ganhou conteúdo não é perda; trocar um número dela é', () => {
  const { r, bot } = comBotPublicado();
  try {
    // caso real da leva 123: outra trilha acrescentou um argumento a uma linha da leva 121
    r.escreve('index.html', [BASE[0], BASE[1], '  const jogada = shark.escolherMelhorJogada(estado, { relogio: orcamento });', BASE[2], BASE[3]]);
    const soma = r.commit('Leva 11 · relógio na jogada\n\nTrilha: motor');
    assert.deepEqual(conferirFaixa(bot, soma, { cwd: r.dir }).achados, []);
  } finally { r.fim(); }
  assert.equal(estendida('if (mana > 5) pagar(custo);', ['if (mana > 5 && livre) pagar(custo);']), true);
  assert.equal(estendida('if (mana > 5) pagar(custo);', ['if (mana > 3 && livre) pagar(custo);']), false, 'o 5 sumiu');
  assert.equal(estendida('pagar(custo); pagar(custo);', ['pagar(custo); avisar(custo);']), false, 'repetição conta');
});

test('Q12 · entrega antiga (fora da janela de 72 h) pode evoluir sem declaração', () => {
  const { r, bot } = comBotPublicado();
  try {
    r.escreve('index.html', BASE);
    const motor = r.commit('Leva 11 · limpa a mesa\n\nTrilha: motor', 80);
    assert.deepEqual(conferirFaixa(bot, motor, { cwd: r.dir }).achados, []);
  } finally { r.fim(); }
});

test('Q12 · commit sem trilha: aviso, e é tratado como de outra trilha', () => {
  const { r, bot } = comBotPublicado();
  try {
    r.escreve('index.html', BASE);
    const solto = r.commit('Add files via upload');
    const tipos = conferirFaixa(bot, solto, { cwd: r.dir }).achados.map((a) => a.tipo).sort();
    assert.deepEqual(tipos, ['sem-trilha', 'sobrescrita']);
  } finally { r.fim(); }
});

test('Q12 · número de leva repetido entre trilhas é barrado, com a próxima livre', () => {
  const { r, bot } = comBotPublicado();
  try {
    r.escreve('regras.test.mjs', ['// teste novo da trilha do motor, sem tocar no que é do bot']);
    const motor = r.commit('Leva 10 · mana em combinação\n\nTrilha: motor');
    const { achados } = conferirFaixa(bot, motor, { cwd: r.dir });
    assert.equal(achados.length, 1);
    assert.equal(achados[0].tipo, 'leva-repetida');
    assert.equal(achados[0].livre, 11);
    // a mesma trilha pode fechar a leva dela em dois commits
    r.git('commit', '-q', '--amend', '-m', 'Leva 10 · bot joga melhor (ROADMAP)\n\nTrilha: bot');
    assert.deepEqual(conferirFaixa(bot, r.git('rev-parse', 'HEAD'), { cwd: r.dir }).achados, []);
  } finally { r.fim(); }
});

test('Q12 · rebase sem conflito soma as duas trilhas; ROADMAP em conflito fica com os dois lados', () => {
  const { r, base, bot } = comBotPublicado();
  try {
    writeFileSync(join(r.dir, '.gitattributes'), readFileSync(join(RAIZ, '.gitattributes')));
    r.escreve('ROADMAP.md', ['# Roadmap', '', '**B1 · bot joga melhor** entregue na leva 10']);
    const main = r.commit('ROADMAP da leva 10\n\nTrilha: bot');
    // a trilha do motor saiu da base, antes do bot, e escreveu no mesmo ponto do ROADMAP
    r.git('checkout', '-q', '-b', 'motor', base);
    writeFileSync(join(r.dir, '.gitattributes'), readFileSync(join(RAIZ, '.gitattributes')));
    r.escreve('ROADMAP.md', ['# Roadmap', '', '**R1 · mana em combinação** entregue na leva 11']);
    r.escreve('index.html', [...BASE.slice(0, 3), MOTOR, BASE[3]]);
    r.commit('Leva 11 · mana em combinação\n\nTrilha: motor');
    r.git('rebase', '-q', main);
    const roadmap = r.le('ROADMAP.md').join('\n');
    assert.match(roadmap, /B1 · bot joga melhor/, 'a entrada do bot continua no ROADMAP');
    assert.match(roadmap, /R1 · mana em combinação/, 'a entrada do motor entrou');
    assert.ok(r.le('index.html').includes(BOT) && r.le('index.html').includes(MOTOR));
    assert.deepEqual(conferirFaixa(main, r.git('rev-parse', 'HEAD'), { cwd: r.dir }).achados, []);
    assert.ok(bot);
  } finally { r.fim(); }
});

test('Q12 · gancho de pre-push: deixa passar o que soma, barra push forçado e cópia antiga', () => {
  const { r, base, bot } = comBotPublicado();
  try {
    const gancho = (local, remoto) => spawnSync('node', [join(RAIZ, 'agregacao.mjs'), '--pre-push'], {
      cwd: r.dir, encoding: 'utf8', input: `refs/heads/main ${local} refs/heads/main ${remoto}\n`,
    });
    // regressão: commit remoto presente era lido como ausente e todo push era recusado
    let res = gancho(bot, base);
    assert.equal(res.status, 0, res.stderr);
    assert.match(res.stdout, /agregação ✓/);
    // push forçado: o remoto tem o commit do bot e o local saiu da base
    r.git('checkout', '-q', '-b', 'motor', base);
    r.escreve('index.html', [...BASE.slice(0, 3), MOTOR, BASE[3]]);
    const lado = r.commit('Leva 11 · mana\n\nTrilha: motor');
    res = gancho(lado, bot);
    assert.equal(res.status, 1);
    assert.match(res.stderr, /Push forçado/);
    // cópia antiga por cima do main novo
    r.git('checkout', '-q', 'main');
    r.escreve('index.html', [BASE[0], BASE[1], MOTOR, BASE[2], BASE[3]]);
    const velho = r.commit('Leva 11 · mana\n\nTrilha: motor');
    res = gancho(velho, bot);
    assert.equal(res.status, 1);
    assert.match(res.stderr, /SOBRESCRITA/);
    // primeiro push de um ramo e push fora do main não são conferidos
    assert.equal(gancho(velho, '0'.repeat(40)).status, 0);
  } finally { r.fim(); }
});

test('Q12 · leitura dos rodapés e das linhas', () => {
  const r = lerRodapes('Leva 123 · algo\n\ncorpo\n\nTrilha: Motor\nSobrescreve: abc1234, 0123456789abcdef — placar passou para o balão');
  assert.deepEqual(r, { trilha: 'motor', sobrescreve: ['abc1234', '0123456'], semMotivo: false, leva: 123 });
  assert.equal(lerRodapes('ROADMAP · leva 106 entregue').leva, null);
  assert.equal(linhaConta('    });'), false);
  assert.equal(linhaConta('const x = calcular(estado);'), true);
  const d = lerDiff('diff --git a/a.js b/a.js\n--- a/a.js\n+++ b/a.js\n@@ -1 +1 @@\n-const velho = valorAntigo(1);\n+const novo = valorNovo(2);\n');
  assert.deepEqual([...d.get('a.js').menos], ['const velho = valorAntigo(1);']);
  assert.deepEqual([...d.get('a.js').mais], ['const novo = valorNovo(2);']);
});

test('Q12 · o repositório está instalado para agregar', () => {
  const pkg = JSON.parse(readFileSync(join(RAIZ, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts.publicar, 'node publicar.mjs');
  assert.match(pkg.scripts.prepare, /core\.hooksPath \.githooks/, 'o npm install liga o gancho de pre-push');
  assert.ok(existsSync(join(RAIZ, '.githooks/pre-push')));
  assert.match(readFileSync(join(RAIZ, '.gitattributes'), 'utf8'), /^ROADMAP\.md merge=union$/m);
  assert.match(readFileSync(join(RAIZ, '.github/workflows/gate.yml'), 'utf8'), /agregacao\.mjs --faixa/);
  assert.match(readFileSync(join(RAIZ, 'CLAUDE.md'), 'utf8'), /npm run publicar/);
});

test('Q12 · nenhum arquivo publicado carrega marca de conflito nem linha repetida na ordem das levas', () => {
  for (const arq of ['index.html', 'ROADMAP.md', 'sw.js', 'e2e.test.mjs', 'rules.unit.test.mjs', 'pauper.regras.test.mjs', 'bot.unit.test.mjs', 'scanner.unit.test.mjs']) {
    const texto = readFileSync(join(RAIZ, arq), 'utf8');
    assert.doesNotMatch(texto, /^(<{7} |={7}$|>{7} )/m, `${arq} tem marca de conflito`);
  }
  const ids = [...readFileSync(join(RAIZ, 'ROADMAP.md'), 'utf8').matchAll(/^\| (16º-[a-z0-9]+)/gm)].map((m) => m[1]);
  const repetidos = ids.filter((id, i) => ids.indexOf(id) !== i);
  assert.deepEqual(repetidos, [], 'id repetido na ordem por dependência: duas trilhas pegaram a mesma letra');
});
