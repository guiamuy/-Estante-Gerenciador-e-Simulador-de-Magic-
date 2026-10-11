// CR2d.9 · camada 7 (613.4): 7a P/T definido por habilidade (604.3, em todas as zonas), 7b fixado por efeito (vence o 7a), 7c
// modificações e marcadores, 7d troca de poder e resistência por último. Efeitos sintéticos (as listas não têm */* nem troca).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, poe, mesa, passaAte } from './cmd.mjs';
import { S, T } from './listas.mjs';

const efeito = (s, alvo, eff) => { s = J(s); E.applyEffect(s, { oid: 'efeito', name: 'Teste', controller: 0 }, { do: 'continuo', target: 'creature', ...eff }, { oid: alvo }, []); return s; };
const pt = (s, o) => { const st = E.stats(s, s.objects[o]); return [st.power, st.toughness]; };

test('CR 613.4 · 7a: P/T definido por habilidade (criaturas que você controla); 7c soma por cima; 7b fixa e vence o 7a', () => {
  let s = mesa(['Thraben Inspector', 'Faerie Seer'], []), ins, a, b;
  [s, ins] = poe(s, 0, 'Thraben Inspector'); [s, a] = poe(s, 0, 'Faerie Seer'); [s, b] = poe(s, 0, 'Faerie Seer');
  s = J(s); s.facts['Thraben Inspector'].script = { ...(s.facts['Thraben Inspector'].script || {}), self: { ptDefinido: { poder: { per: 'creatures-you-control' }, resistencia: { per: 'creatures-you-control' } } } };
  assert.deepEqual(pt(s, ins), [3, 3], 'três criaturas suas');
  s = efeito(s, ins, { poder: 2, resistencia: 0 }); assert.deepEqual(pt(s, ins), [5, 3], '7c por cima do 7a');
  s = efeito(s, ins, { torna: { base: [0, 1] } }); assert.deepEqual(pt(s, ins), [2, 1], '7b fixa 0/1 e vence o 7a; o +2/+0 (7c) continua');
});

test('CR 613.4 · 7d: trocar poder e resistência vem depois de tudo; duas trocas se anulam; acaba na limpeza', () => {
  let s = mesa(['Faerie Seer'], []), seer; [s, seer] = poe(s, 0, 'Faerie Seer');
  s = efeito(s, seer, { poder: 3, resistencia: 0 }); assert.deepEqual(pt(s, seer), [4, 1]);
  s = efeito(s, seer, { troca: true }); assert.deepEqual(pt(s, seer), [1, 4], 'troca o resultado final');
  s = J(s); s.objects[seer].counters.p1p1 = 1; assert.deepEqual(pt(s, seer), [2, 5], 'marcador entra antes da troca');
  const duas = efeito(s, seer, { troca: true }); assert.deepEqual(pt(duas, seer), [5, 2], 'duas trocas se anulam');
  const x = passaAte(s, y => y.turn.active === 1); assert.deepEqual(pt(x, seer), [2, 2], 'na limpeza acabam o +3/+0 e a troca; fica o marcador');
  assert.equal(T.descreveEfeitos([{ do: 'continuo', target: 'creature', troca: true }]), 'uma criatura troca o poder e a resistência até o fim do turno');
  assert.ok(J(S.validateScript({ name: 'T', self: { ptDefinido: {} }, effects: [{ do: 'draw', amount: 1 }], example: { target: 'none', expect: { handDelta: 1 } } })).some(e => /P\/T definido/.test(e)));
});
