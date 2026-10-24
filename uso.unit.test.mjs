// G-286 · BI2-2b · uso agregado opt-in: as contas puras (listas, cartas, cópias, leituras do scanner) e o registro
// que vai para o banco (só os campos da regra, inteiros). O caminho inteiro sob as regras do banco está no regras.unit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
const { uso: U, saida: S } = loadModules();

test('G-286 · contaUso: listas pelos ids, cartas distintas e cópias só dos itens com qty > 0, scanner pelo contador; nada de nome', () => {
  const c = U.contaUso({ ids: ['a', 'b', 'c'], items: [{ name: 'Sol Ring', qty: 2 }, { name: 'Zero', qty: 0 }, { name: 'X', qty: '3' }, null], lidas: 7 });
  assert.equal(JSON.stringify(c), JSON.stringify({ listas: 3, cartas: 2, copias: 5, scanner: 7 }));
  assert.equal(JSON.stringify(U.contaUso({})), JSON.stringify({ listas: 0, cartas: 0, copias: 0, scanner: 0 }));
  assert.equal(JSON.stringify(U.contaUso({ ids: 'x', items: 'y', lidas: -4 })), JSON.stringify({ listas: 0, cartas: 0, copias: 0, scanner: 0 }), 'dado estranho vira zero, nunca erro');
  assert.ok(!JSON.stringify(c).includes('Sol Ring'));
});

test('G-286 · registroDeUso: kind e version fixos, inteiros, carimbo do app opcional e curto', () => {
  const r = U.registroDeUso({ listas: 1.9, cartas: 2, copias: 3, scanner: 4 }, { agora: 123, app: 'x'.repeat(60) });
  assert.equal(JSON.stringify(r), JSON.stringify({ kind: 'estante.uso', version: 1, em: 123, listas: 1, cartas: 2, copias: 3, scanner: 4, app: 'x'.repeat(40) }));
  assert.equal('app' in U.registroDeUso({ listas: 0 }, { agora: 1 }), false, 'sem carimbo, sem campo');
  assert.equal(U.diaDe(Date.parse('2026-10-24T23:59:59Z')), '2026-10-24');
});

test('G-286 · o texto da tela diz que são só números, que é desligado por padrão e como apagar', () => {
  assert.match(S.TEXTO_USO.vai, /Só números/); assert.match(S.TEXTO_USO.vai, /Nenhum nome de carta, de lista ou de pessoa/);
  assert.match(S.TEXTO_USO.evitar, /desligada \(é o padrão\)/); assert.match(S.TEXTO_USO.evitar, /Desligar apaga o que já foi/);
  assert.match(S.TEXTO_USO.quando, /Uma vez por dia/);
});
