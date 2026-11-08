// I-328 · decisão do dono (08/11/2026): rotina agendada junta o próprio PR no main sem homologação, com portão, prévia, ramo em dia e aviso.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const regras = readFileSync(new URL('./CLAUDE.md', import.meta.url), 'utf8');
const secao = (regras.split('## Exceção: rotinas agendadas publicam sozinhas')[1] || '').split('\n## ')[0];

test('I-328 · a exceção das rotinas agendadas existe e traz as seis condições, na ordem', () => {
  assert.ok(secao, 'seção da exceção no CLAUDE.md');
  const ordem = ['Portão inteiro verde', 'Prévia montada', 'Ramo em cima do `main` de agora', 'Merge pelo caminho de sempre', 'Conferência em produção', 'Aviso ao dono'];
  let i = -1; for (const o of ordem) { const j = secao.indexOf(o); assert.ok(j > i, `${o} na ordem`); i = j; }
});

test('I-328 · o que fica fora da exceção e as travas que continuam', () => {
  for (const f of ['`Sobrescreve:`', '`ENGINE_VERSION`', 'golden', '`.claude/settings.json`', 'dados salvos do usuário', 'git revert']) assert.ok(secao.includes(f), f);
  assert.match(secao, /Nunca `push` no `main`, nunca `--force`/);
  assert.match(regras, /nunca merge sem o pedido do dono \(exceto a rotina agendada/);
  const s = JSON.parse(readFileSync(new URL('./.claude/settings.json', import.meta.url), 'utf8'));
  assert.ok(s.permissions.deny.includes('Bash(git push origin main)'), 'o push no main segue negado');
});
