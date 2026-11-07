// I-325 · executor dos robôs nas rotinas da nuvem do Claude: segredos no formato dos scripts, ramo de dados trazido e
// gravado só quando muda, sem tocar no main.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ambiente, trazer, gravar, ROBOS, GRUPOS, RAMOS } from './robos.mjs';

const g = (cwd, ...a) => { const r = spawnSync('git', a, { cwd, encoding: 'utf8' }); if (r.status !== 0) throw new Error(`git ${a.join(' ')}: ${r.stderr}`); return r.stdout.trim(); };

test('I-325 · os segredos do ambiente viram o que cada script espera; o token da sessão não abre registros', () => {
  const conta = { type: 'service_account', client_email: 'robo@x.iam', private_key: '-----BEGIN-----\nabc\n-----END-----\n' };
  const env = ambiente({ FIREBASE_SERVICE_ACCOUNT_B64: Buffer.from(JSON.stringify(conta)).toString('base64'), ESTANTE_GITHUB_TOKEN: 'meu', GITHUB_TOKEN: 'da-sessao', PATH: '/bin' });
  assert.deepEqual(JSON.parse(env.FIREBASE_SERVICE_ACCOUNT), conta);
  assert.equal(env.GITHUB_TOKEN, 'meu');
  assert.equal(env.FIREBASE_SERVICE_ACCOUNT_B64, undefined, 'a cópia em base64 não passa adiante');
  assert.equal(env.PATH, '/bin');
  assert.equal(ambiente({ FIREBASE_SERVICE_ACCOUNT: '{"ja":1}', FIREBASE_SERVICE_ACCOUNT_B64: 'eyJ4IjoxfQ==' }).FIREBASE_SERVICE_ACCOUNT, '{"ja":1}', 'o JSON direto vale mais');
  assert.equal(ambiente({ GITHUB_TOKEN: 'da-sessao' }).GITHUB_TOKEN, 'da-sessao');
});

test('I-325 · grupos: de hora em hora notícias e fila de relatos; por dia o catálogo; cada robô grava num ramo de dados conhecido', () => {
  assert.deepEqual(GRUPOS, { hora: ['noticias', 'relatos-fila'], dia: ['catalogo'] });
  for (const nomes of Object.values(GRUPOS)) for (const n of nomes) assert.equal(typeof ROBOS[n], 'function', n);
  assert.deepEqual(Object.keys(RAMOS).sort(), ['catalogo', 'noticias', 'relatos']);
  const fonte = readFileSync(new URL('./robos.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(fonte, /refs\/heads\/main|push[^\n]*--force|--no-verify/, 'o executor nunca grava no main nem força');
});

test('I-325 · traz o ramo (ou começa com o README), grava só quando muda e nunca mexe no main', () => {
  const raiz = mkdtempSync(join(tmpdir(), 'robos-'));
  try {
    const origem = join(raiz, 'origem.git'), clone = join(raiz, 'clone');
    g(raiz, 'init', '--quiet', '--bare', '-b', 'main', origem);
    g(raiz, 'clone', '--quiet', origem, clone);
    g(clone, 'config', 'user.name', 't'); g(clone, 'config', 'user.email', 't@t'); g(clone, 'config', 'core.autocrlf', 'false');
    writeFileSync(join(clone, 'app.txt'), 'app\n'); g(clone, 'add', '-A'); g(clone, 'commit', '--quiet', '-m', 'app'); g(clone, 'push', '--quiet', 'origin', 'main');
    const main = g(origem, 'rev-parse', 'main');

    let s = trazer('noticias', clone);
    assert.equal(readFileSync(join(s, 'README.md'), 'utf8'), RAMOS.noticias.join('\n') + '\n');
    assert.equal(existsSync(join(s, 'app.txt')), false, 'o ramo de dados começa sem os arquivos do app');
    writeFileSync(join(s, 'en-pagina-1.json'), '{"n":1}\n');
    assert.equal(gravar(s, 'noticias', 'estante-noticias', 'Notícias · 1'), 'gravado');
    assert.deepEqual(g(origem, 'ls-tree', '--name-only', 'noticias').split('\n'), ['README.md', 'en-pagina-1.json']);
    g(clone, 'worktree', 'remove', '--force', s);

    s = trazer('noticias', clone);
    assert.equal(readFileSync(join(s, 'en-pagina-1.json'), 'utf8'), '{"n":1}\n');
    assert.equal(gravar(s, 'noticias', 'estante-noticias', 'Notícias · 2'), 'sem mudança');
    writeFileSync(join(s, 'en-pagina-1.json'), '{"n":2}\n');
    assert.equal(gravar(s, 'noticias', 'estante-noticias', 'Notícias · 3'), 'gravado');
    assert.equal(g(origem, 'log', '--format=%an %s', 'noticias'), 'estante-noticias Notícias · 3\nestante-noticias Notícias · 1');
    assert.equal(g(origem, 'rev-parse', 'main'), main, 'o main não muda');
    g(clone, 'worktree', 'remove', '--force', s);
  } finally { rmSync(raiz, { recursive: true, force: true }); }
});

test('I-325 · o executor roda os mesmos comandos dos fluxos de reserva (sentinelas do catálogo iguais às do catalogo.yml)', () => {
  const fonte = readFileSync(new URL('./robos.mjs', import.meta.url), 'utf8');
  const doFluxo = (arq) => [...readFileSync(new URL(`./.github/workflows/${arq}`, import.meta.url), 'utf8').matchAll(/run: node (\S+\.mjs) --(?:saida|catalogo) saida([^\n#]*)/g)].map((m) => [m[1], m[2].trim()]);
  const cob = doFluxo('catalogo.yml').filter(([s]) => s === 'cobertura.mjs').map(([, a]) => a);
  const doRobo = [...fonte.matchAll(/\[\[([^\]]*'--formato'[^\]]*)\], \d+\]/g)].map((m) => m[1].replace(/'/g, '').split(', ').join(' '));
  assert.deepEqual(doRobo, cob);
  for (const [script] of [...doFluxo('noticias.yml'), ...doFluxo('relatos-fila.yml')]) assert.match(fonte, new RegExp(`'${script.replace('.', '\\.')}', '--saida', s`), script);
});

test('I-325 · a fila de relatos não roda sem os segredos (avisa em vez de gravar pela metade)', () => {
  assert.throws(() => ROBOS['relatos-fila'](ambiente({})), /FIREBASE_SERVICE_ACCOUNT_B64 ou ESTANTE_GITHUB_TOKEN/);
});
