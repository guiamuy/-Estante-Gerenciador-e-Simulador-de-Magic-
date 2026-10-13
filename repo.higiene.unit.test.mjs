// M-350 · higiene do repositório: `node_modules` nunca entra no git. A C-2 (379b59c) gravou por engano um link simbólico
// `node_modules` → pasta de outro ambiente; o `.gitignore` tinha `node_modules/` (com barra), que só casa pasta e deixa passar
// link e arquivo. Todo clone que recebia o link ficava sem as dependências ("o pacote playwright não está instalado") e
// `npm install` trocava o link por pasta, o que aparece como alteração fora de commit e trava `npm run publicar`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const AQUI = new URL('.', import.meta.url).pathname;

test('M-350 · node_modules não é rastreado pelo git e o .gitignore o ignora como pasta, link ou arquivo', () => {
  const linhas = readFileSync(new URL('./.gitignore', import.meta.url), 'utf8').split('\n').map(x => x.trim());
  assert.ok(linhas.includes('node_modules'), '`node_modules` sem barra no .gitignore (a barra só casa pasta)');
  if (!existsSync(new URL('./.git', import.meta.url))) return; // cópia sem histórico: a regra do .gitignore basta
  const rastreados = execFileSync('git', ['ls-files', '--', 'node_modules'], { cwd: AQUI, encoding: 'utf8' }).trim();
  assert.equal(rastreados, '', 'nada em node_modules rastreado');
});
