// I-333 · juntador dos pacotes de idioma (idiomas/*.json): duas levas que traduzem frases diferentes
// não podem mais bater na soma do trem nem no rebase de cada conversa.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { juntarTextos, juntarValor, noFormatoDe } from './idioma-merge.mjs';

const ler = (f) => readFileSync(new URL(`./${f}`, import.meta.url), 'utf8');
const DRIVER = new URL('./idioma-merge.mjs', import.meta.url).pathname;
const pacote = (exato, modelos) => JSON.stringify({ v: 1, idioma: 'en', exato, modelos }) + '\n';

test('I-333 · frases novas dos dois lados entram as duas, na ordem nossa e depois a deles', () => {
  const base = pacote({ a: 'A' }, [['{0} sai', '{0} leaves']]);
  const nosso = pacote({ a: 'A', b: 'B' }, [['{0} sai', '{0} leaves'], ['{0} entra', '{0} enters']]);
  const deles = pacote({ a: 'A', c: 'C' }, [['{0} sai', '{0} leaves'], ['{0} vira', '{0} turns']]);
  const r = juntarTextos(base, nosso, deles);
  assert.equal(r.conflito, undefined);
  assert.equal(r.texto, pacote({ a: 'A', b: 'B', c: 'C' }, [['{0} sai', '{0} leaves'], ['{0} entra', '{0} enters'], ['{0} vira', '{0} turns']]));
});

test('I-333 · tradução corrigida de um lado e intocada do outro: fica a corrigida; apagada de um lado: sai', () => {
  const base = pacote({ a: 'A', b: 'B' }, [['x {0}', 'x {0}'], ['y {0}', 'y {0}']]);
  const nosso = pacote({ a: 'A!', b: 'B' }, [['x {0}', 'x {0}']]);
  const deles = pacote({ a: 'A', b: 'B', c: 'C' }, [['x {0}', 'X {0}'], ['y {0}', 'y {0}']]);
  assert.equal(juntarTextos(base, nosso, deles).texto, pacote({ a: 'A!', b: 'B', c: 'C' }, [['x {0}', 'X {0}']]));
});

test('I-333 · a mesma frase traduzida de jeitos diferentes dos dois lados é conflito de verdade', () => {
  const base = pacote({ a: 'A' }, []);
  assert.equal(juntarTextos(base, pacote({ a: 'A1' }, []), pacote({ a: 'A2' }, [])).conflito, 'exato.a');
  assert.match(juntarTextos(base, pacote({}, [['m {0}', 'one {0}']]), pacote({}, [['m {0}', 'two {0}']])).conflito, /^modelos\[/);
  assert.equal(juntarTextos(base, pacote({ b: 'B' }, []), pacote({ b: 'C' }, [])).conflito, 'exato.b', 'a mesma frase nova com duas traduções');
  assert.equal(juntarTextos('{', base, base).conflito, '(JSON inválido)');
  assert.throws(() => juntarValor(1, 2, 3), /conflito/);
});

test('I-333 · a saída mantém o formato do nosso lado: uma linha só, ou recuado, e a quebra do fim', () => {
  assert.equal(noFormatoDe('{"a":1}\n', { a: 2 }), '{"a":2}\n');
  assert.equal(noFormatoDe('{"a":1}', { a: 2 }), '{"a":2}');
  assert.equal(noFormatoDe('{\n "a": 1\n}\n', { a: 2, b: [1] }), '{\n "a": 2,\n "b": [\n  1\n ]\n}\n');
  assert.equal(noFormatoDe('{\n  "a": 1\n}\n', { a: 2 }), '{\n  "a": 2\n}\n');
});

test('I-333 · os pacotes de verdade: duas levas que acrescentam frases ao en.json não conflitam', () => {
  const real = ler('idiomas/en.json'), p = JSON.parse(real);
  const com = (k, v) => noFormatoDe(real, { ...p, exato: { ...p.exato, [k]: v }, modelos: [...p.modelos, [`${k} {0}`, `${v} {0}`]] });
  const r = juntarTextos(real, com('frase nova da leva um', 'leva one'), com('frase nova da leva dois', 'leva two'));
  assert.equal(r.conflito, undefined);
  const j = JSON.parse(r.texto);
  assert.equal(j.exato['frase nova da leva um'], 'leva one');
  assert.equal(j.exato['frase nova da leva dois'], 'leva two');
  assert.equal(Object.keys(j.exato).length, Object.keys(p.exato).length + 2);
  assert.equal(j.modelos.length, p.modelos.length + 2);
  assert.equal(r.texto.split('\n').length, real.split('\n').length, 'continua uma linha só');
});

test('I-333 · ligado no repositório: .gitattributes e npm install (prepare)', () => {
  assert.match(ler('.gitattributes'), /^idiomas\/\*\.json merge=idiomas$/m);
  const pkg = JSON.parse(ler('package.json'));
  assert.match(pkg.scripts.prepare, /merge\.idiomas\.driver "node idioma-merge\.mjs %O %A %B"/);
  assert.match(pkg.scripts.prepare, /merge\.estado\.driver "node estado-merge\.mjs %O %A %B"/);
});

test('I-333 · ponta a ponta no git: cherry-pick de duas levas sobre o mesmo main junta; conflito real devolve as marcas', () => {
  const d = mkdtempSync(join(tmpdir(), 'idiomas-'));
  const g = (...a) => execFileSync('git', a, { cwd: d, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  g('init', '-q', '-b', 'main'); g('config', 'user.email', 't@t'); g('config', 'user.name', 't'); g('config', 'commit.gpgsign', 'false');
  g('config', 'merge.idiomas.driver', `node ${JSON.stringify(DRIVER).slice(1, -1)} %O %A %B`);
  mkdirSync(join(d, 'idiomas'));
  writeFileSync(join(d, '.gitattributes'), 'idiomas/*.json merge=idiomas\n');
  const f = join(d, 'idiomas', 'en.json');
  writeFileSync(f, pacote({ a: 'A' }, [])); g('add', '.'); g('commit', '-qm', 'base');
  g('switch', '-qc', 'um'); writeFileSync(f, pacote({ a: 'A', b: 'B' }, [])); g('commit', '-qam', 'Leva G-1');
  g('switch', '-q', 'main'); g('switch', '-qc', 'dois'); writeFileSync(f, pacote({ a: 'A', c: 'C' }, [['z {0}', 'Z {0}']])); g('commit', '-qam', 'Leva M-1');
  const sd = g('rev-parse', 'HEAD'); g('switch', '-q', 'um'); g('cherry-pick', sd);
  assert.equal(readFileSync(f, 'utf8'), pacote({ a: 'A', b: 'B', c: 'C' }, [['z {0}', 'Z {0}']]));
  // conflito de verdade: a mesma frase com duas traduções; o git para e o arquivo traz as marcas
  g('switch', '-q', 'main'); g('switch', '-qc', 'tres'); writeFileSync(f, pacote({ a: 'A3' }, [])); g('commit', '-qam', 'Leva J-1');
  const st = g('rev-parse', 'HEAD'); g('switch', '-q', 'um');
  writeFileSync(f, pacote({ a: 'A4', b: 'B', c: 'C' }, [['z {0}', 'Z {0}']])); g('commit', '-qam', 'Leva G-2');
  const r = spawnSync('git', ['cherry-pick', st], { cwd: d, encoding: 'utf8' });
  assert.notEqual(r.status, 0);
  assert.match(readFileSync(f, 'utf8'), /^<<<<<<< /m);
  assert.match(r.stderr + r.stdout, /idioma-merge: exato\.a mudou dos dois lados/);
});
