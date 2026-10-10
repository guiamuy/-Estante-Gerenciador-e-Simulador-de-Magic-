// M-244 · CR2-G R6 · durações gerais dos efeitos temporários (611.2): "até o fim do seu próximo turno", "enquanto você
// controlar <a fonte>" e "torna" até o seu próximo turno, numa lista própria lida pelo caminho dos contínuos. As durações
// antigas (até o fim do turno, até o seu próximo turno) seguem na guarda de sempre (provado em continuo.equivalencia).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, S, T, J, jogo, poe, passaAte } from './listas.mjs';

const fonteDe = (s, oid) => s.objects[oid];
const fim = (s, ativo) => passaAte(s, x => x.turn.active === ativo && x.turn.step === 'main1');

test('M-244 · R6 · "até o fim do seu próximo turno": vale no turno do oponente e no seu próximo, e acaba na limpeza desse', () => {
  let s = jogo({ lista: 'Pauper Boros Bully', oponente: 'Pauper Elves', seed: 6 }), kor;
  [s, kor] = poe(s, 0, 'Kor Skyfisher'); s = J(s);
  const base = E.stats(s, s.objects[kor]);
  E.applyEffect(s, s.objects[kor], { do: 'continuo', target: 'self-source', poder: 2, palavras: ['trample'], ate: 'fim-do-seu-proximo-turno' }, null, []);
  const conta = x => [E.stats(x, x.objects[kor]).power - base.power, E.hasKeyword(x, x.objects[kor], 'trample')];
  assert.deepEqual(conta(s), [2, true]);
  s = fim(s, 1); assert.deepEqual(conta(s), [2, true], 'turno do oponente');
  s = fim(s, 0); assert.deepEqual(conta(s), [2, true], 'o seu próximo turno');
  s = fim(s, 1); assert.deepEqual(conta(s), [0, false], 'acabou na limpeza do seu próximo turno');
  assert.equal(s.objects[kor].temporarios, undefined, 'sem resto no estado');
});

test('M-244 · R6 · "enquanto você controlar esta permanente": acaba quando a fonte sai do campo, e só vale para a mesma encarnação', () => {
  let s = jogo({ lista: 'Pauper Boros Bully', oponente: 'Pauper Elves', seed: 7 }), fonte, kor;
  [s, fonte] = poe(s, 0, 'Lunarch Veteran'); [s, kor] = poe(s, 0, 'Kor Skyfisher'); s = J(s);
  const base = E.stats(s, s.objects[kor]).power;
  E.applyEffect(s, fonteDe(s, fonte), { do: 'continuo', target: 'creature', poder: 3, ate: { enquanto: 'controlar-fonte' } }, { oid: kor }, []);
  assert.equal(E.stats(s, s.objects[kor]).power, base + 3);
  let x = fim(J(s), 1); assert.equal(E.stats(x, x.objects[kor]).power, base + 3, 'atravessa turnos');
  x = J(s); E.moveObject(x, fonte, 'graveyard');
  assert.equal(E.stats(x, x.objects[kor]).power, base, 'a fonte saiu: acabou');
  E.moveObject(x, fonte, 'battlefield');
  assert.equal(E.stats(x, x.objects[kor]).power, base, 'voltou como outro objeto: não volta a valer');
  x = fim(x, 1); assert.equal(x.objects[kor].temporarios, undefined, 'a limpeza tira o que perdeu a fonte');
});

test('M-244 · R6 · "torna-se uma Rã 1/1 até o seu próximo turno": vale no turno do oponente e cai quando o seu começa', () => {
  let s = jogo({ lista: 'Pauper Boros Bully', oponente: 'Pauper Elves', seed: 8 }), kor;
  [s, kor] = poe(s, 0, 'Kor Skyfisher'); s = J(s);
  E.applyEffect(s, s.objects[kor], { do: 'continuo', target: 'self-source', torna: { tipos: ['creature'], subtipos: ['Frog'], base: [1, 1], perdeHabilidades: true }, ate: 'seu-proximo-turno' }, null, []);
  assert.deepEqual(J(E.stats(s, s.objects[kor])), { power: 1, toughness: 1 });
  s = fim(s, 1); assert.deepEqual(J(E.stats(s, s.objects[kor])), { power: 1, toughness: 1 }, 'passou pela limpeza do seu turno');
  assert.equal(E.hasKeyword(s, s.objects[kor], 'flying'), false);
  s = fim(s, 0); assert.equal(E.hasKeyword(s, s.objects[kor], 'flying'), true, 'o seu turno começou: voltou a voar');
  assert.equal(s.objects[kor].vira, undefined);
});

test('M-244 · R6 · validador e português das durações', () => {
  assert.equal(S.duracaoValida('fim-do-seu-proximo-turno'), true);
  assert.equal(S.duracaoValida({ enquanto: 'controlar-fonte' }), true);
  assert.equal(S.duracaoValida({ enquanto: 'sempre' }), false);
  const erros = e => J(S.validateScript({ name: 'Teste', effects: [e] })).filter(x => !/cenário/.test(x));
  assert.ok(erros({ do: 'continuo', target: 'creature', poder: 1, ate: 'para-sempre' }).some(x => /duração/.test(x)));
  assert.equal(T.descreveEfeitos([{ do: 'continuo', target: 'self-source', poder: 2, ate: 'fim-do-seu-proximo-turno' }]), 'esta criatura recebe +2/+0 até o fim do seu próximo turno');
  assert.equal(T.descreveEfeitos([{ do: 'continuo', target: 'creature', poder: 3, ate: { enquanto: 'controlar-fonte' } }]), 'uma criatura recebe +3/+0 enquanto você controlar esta permanente');
});
