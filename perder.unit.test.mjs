// CR2d.7 · camada 6 com "perde" (613.9): o efeito mais novo vence. "Perde voar" tira a palavra impressa e a concedida antes; a
// concedida depois fica. Efeitos sintéticos (nenhuma carta das listas tem "perde [palavra-chave]" ainda).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, poe, mesa, passaAte } from './cmd.mjs';
import { S, T } from './listas.mjs';

const efeito = (s, alvo, eff) => { s = J(s); E.applyEffect(s, { oid: 'efeito', name: 'Teste', controller: 0 }, { do: 'continuo', target: 'creature', ...eff }, { oid: alvo }, []); return s; };

test('CR 613.9 · "perde voar até o fim do turno": tira a palavra impressa; na limpeza ela volta', () => {
  let s = mesa(['Faerie Seer'], []), seer; [s, seer] = poe(s, 0, 'Faerie Seer');
  assert.equal(E.hasKeyword(s, s.objects[seer], 'flying'), true, 'impressa');
  s = efeito(s, seer, { perde: ['flying'] });
  assert.equal(E.hasKeyword(s, s.objects[seer], 'flying'), false, 'perdeu');
  const x = passaAte(s, y => y.turn.active === 1);
  assert.equal(E.hasKeyword(x, x.objects[seer], 'flying'), true, 'acabou: voa de novo');
  assert.equal(T.descreveEfeitos([{ do: 'continuo', target: 'creature', perde: ['flying'] }]), 'uma criatura perde voar até o fim do turno');
});

test('CR 613.7 · ordem por carimbo: ganhou voar, perdeu voar (não voa), ganhou de novo (voa); outras palavras não mudam', () => {
  let s = mesa(['Thraben Inspector'], []), ins; [s, ins] = poe(s, 0, 'Thraben Inspector');
  s = efeito(s, ins, { palavras: ['flying', 'lifelink'] }); assert.equal(E.hasKeyword(s, s.objects[ins], 'flying'), true);
  s = efeito(s, ins, { perde: ['flying'] });
  assert.equal(E.hasKeyword(s, s.objects[ins], 'flying'), false, 'o "perde" é mais novo');
  assert.equal(E.hasKeyword(s, s.objects[ins], 'lifelink'), true, 'só voar foi perdido');
  s = efeito(s, ins, { palavras: ['flying'] });
  assert.equal(E.hasKeyword(s, s.objects[ins], 'flying'), true, 'concedida depois do "perde": fica');
  assert.ok(J(S.validateScript({ name: 'T', continuo: [{ afetados: { tipos: ['creature'], de: 'opponent' }, perde: ['voar'] }], example: { action: 'etb', target: 'none', expect: { attached: false } } })).some(e => /perde/.test(e)));
  assert.deepEqual(J(S.validateScript({ name: 'T', continuo: [{ afetados: { tipos: ['creature'], de: 'opponent' }, perde: ['flying'] }], example: { action: 'etb', target: 'none', expect: { attached: false } } })).filter(e => /perde|não muda/.test(e)), [], 'estático com "perde" é aceito');
  assert.equal(T.descreveContinuo({ afetados: { tipos: ['creature'], de: 'opponent' }, perde: ['flying'] }), T.descreveContinuo({ afetados: { tipos: ['creature'], de: 'opponent' }, palavras: ['reach'] }).replace('tem alcance', 'perde voar'));
});
