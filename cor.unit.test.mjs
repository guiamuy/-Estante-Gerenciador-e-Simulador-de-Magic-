// CR2d.8 · camada 5 (613.1e): "torna-se [cor]" substitui a cor; "além das outras cores" soma; "incolor" tira todas; ordem por carimbo;
// a cor de agora vale para alvos por cor, seletores e proteção. Efeitos sintéticos (as listas ainda não têm efeito de cor).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, poe, mesa, passaAte, legais, comMana, act } from './cmd.mjs';
import { S, T } from './listas.mjs';

const efeito = (s, alvo, eff) => { s = J(s); E.applyEffect(s, { oid: 'efeito', name: 'Teste', controller: 0 }, { do: 'continuo', target: 'creature', ...eff }, { oid: alvo }, []); return s; };

test('CR 613.1 · camada 5: torna-se vermelha até o fim do turno; soma azul; incolor; na limpeza volta à cor impressa', () => {
  let s = mesa(['Faerie Seer', 'Thraben Inspector'], []), seer, ins; [s, seer] = poe(s, 0, 'Faerie Seer'); [s, ins] = poe(s, 0, 'Thraben Inspector');
  assert.deepEqual(J(E.colorsOf(s, s.objects[seer])), ['U']);
  s = efeito(s, seer, { cores: ['R'] }); assert.deepEqual(J(E.colorsOf(s, s.objects[seer])), ['R'], 'torna-se vermelha: substitui');
  s = efeito(s, ins, { cores: ['U'], somaCores: true }); assert.deepEqual(J(E.colorsOf(s, s.objects[ins])).sort(), ['U', 'W'], 'além das outras cores');
  s = efeito(s, ins, { cores: [] }); assert.deepEqual(J(E.colorsOf(s, s.objects[ins])), [], 'incolor (mais novo)');
  const x = passaAte(s, y => y.turn.active === 1);
  assert.deepEqual(J(E.colorsOf(x, x.objects[seer])), ['U']); assert.deepEqual(J(E.colorsOf(x, x.objects[ins])), ['W']);
  assert.equal(T.descreveEfeitos([{ do: 'continuo', target: 'creature', cores: ['R'] }]), 'uma criatura torna-se vermelha até o fim do turno');
});

test('CR 613.7 · a cor de agora vale para "alvo [cor]" e "criatura não-[cor]"', () => {
  let s = mesa(['Faerie Seer'], []), seer; [s, seer] = poe(s, 0, 'Faerie Seer');
  const verm = efeito(s, seer, { cores: ['R'] });
  assert.equal(E.targetAllowed(verm, { do: 'destroy', target: 'creature', targetNotColor: 'R' }, { oid: seer }), false, 'agora é vermelha: "não-vermelha" não serve');
  assert.equal(E.targetAllowed(s, { do: 'destroy', target: 'creature', targetNotColor: 'R' }, { oid: seer }), true);
  assert.ok(J(S.validateScript({ name: 'T', effects: [{ do: 'continuo', target: 'creature', cores: ['X'] }], example: { target: 'none', expect: { handDelta: 0 } } })).some(e => /cores/.test(e)));
});
