// U6 · bandeja da mão recolhível: quando fica recolhida e quando abre sozinha.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
const { table: T } = loadModules();
const J = x => JSON.parse(JSON.stringify(x));
const mesa = (extra = {}) => ({ status: 'playing', pending: null, zones: [{ hand: ['a', 'b', 'c'] }, { hand: ['x'] }], ...extra });

test('U6 · aberta por padrão; recolhida quando a pessoa pede; a contagem é da mão de quem vê', () => {
  assert.deepEqual(J(T.bandejaDaMao(mesa(), 0, false)), { aberta: true, forcada: false, motivo: null, total: 3 });
  assert.deepEqual(J(T.bandejaDaMao(mesa(), 0, true)), { aberta: false, forcada: false, motivo: null, total: 3 });
  assert.equal(T.bandejaDaMao(mesa(), 1, true).total, 1);
});

test('U6 · mão inicial e descarte abrem sozinhos e dizem por quê', () => {
  assert.deepEqual(J(T.bandejaDaMao(mesa({ status: 'mulligan' }), 0, true)), { aberta: true, forcada: true, motivo: 'mão inicial', total: 3 });
  const descarte = mesa({ pending: { kind: 'discard', p: 0, n: 1 } });
  assert.deepEqual(J(T.bandejaDaMao(descarte, 0, true)), { aberta: true, forcada: true, motivo: 'descarte', total: 3 });
  assert.equal(T.bandejaDaMao(descarte, 1, true).aberta, false, 'o descarte do outro não abre a minha');
  assert.equal(T.bandejaDaMao(mesa({ pending: { kind: 'attackers', p: 0 } }), 0, true).aberta, false, 'outras decisões não precisam da mão');
  assert.equal(T.bandejaDaMao(descarte, 0, false).forcada, false, 'aberta por escolha não conta como forçada');
});

test('U6 · mesa sem zonas não quebra', () => {
  assert.equal(T.bandejaDaMao({ zones: [] }, 0, true).total, 0);
});

/* ---------------- U6b · gesto na borda de cima da bandeja ---------------- */
const { mesaUi: K } = loadModules();
test('U6b · arrasto para baixo recolhe, para cima abre; curto e lento não muda; lateral não é da bandeja', () => {
  const g = K.gestoDeBandeja;
  assert.equal(g({ dy: 60, aberta: true }), 'recolher');
  assert.equal(g({ dy: -60, aberta: false }), 'abrir');
  assert.equal(g({ dy: 60, aberta: false }), null, 'já recolhida: para baixo não faz nada');
  assert.equal(g({ dy: -60, aberta: true }), null, 'já aberta: para cima não faz nada');
  assert.equal(g({ dy: 20, v: 0.1, aberta: true }), null, 'curto e lento: volta');
  assert.equal(g({ dy: 20, v: 0.8, aberta: true }), 'recolher', 'curto mas rápido (peteleco): vale');
  assert.equal(g({ dy: 8, v: 2, aberta: true }), null, 'toque trêmulo não vira gesto');
  assert.equal(g({ dy: 50, dx: 80, aberta: true }), null, 'arrasto mais lateral que vertical: não é da bandeja');
});
