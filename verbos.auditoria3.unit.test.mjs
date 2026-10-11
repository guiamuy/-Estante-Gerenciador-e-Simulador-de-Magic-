// V-16 · auditoria independente do lote 3 (suspeitar 701.60, aprender 701.48, descartar ao acaso 701.9b): revisor sem acesso à
// implementação, 9 sondas. Três divergências reproduzidas, todas no aprender; D1 e D2 eram do código da trilha e viraram estes testes
// antes da correção; D3 (a insanidade é decidida antes da compra) é de código anterior do motor e fica declarada.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
import { E, J, act, poe, legais, mesa, comMana, tudo, criatura, conjura } from './verbos.mjs';
const { scripts: S } = loadModules();
const URSO = criatura('Urso de Teste 3/3', 3, 3), LOBO = criatura('Lobo de Teste 2/2', 2, 2), APR = criatura('Aprendiz de Teste 1/1', 1, 1);
const ate = (s, para) => { for (let i = 0; i < 20 && !para(s); i++) s = s.pending ? act(s, legais(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority }); return s; };

test('V-16 · auditoria D1 (608.2c, 701.48a): o que vem escrito depois de "aprender" resolve também quando o jogador descarta', () => {
  for (const resposta of ['pay', 'decline']) {
    let s = mesa(['Igneous Inspiration', URSO, LOBO, URSO, URSO], []), ii, urso; [s, ii] = poe(s, 0, 'Igneous Inspiration', 'hand'); [s, urso] = poe(s, 0, URSO, 'hand'); s = J(s);
    s.facts['Igneous Inspiration'] = { ...s.facts['Igneous Inspiration'], script: { ...s.facts['Igneous Inspiration'].script, effects: [{ do: 'learn' }, { do: 'damage', amount: 2, target: 'each-opponent' }] } };
    s = ate(act(comMana(s, 'RRR'), legais(comMana(s, 'RRR'), 0, a => a.t === 'cast' && a.oid === ii)[0]), x => x.pending && x.pending.kind === 'may_pay');
    assert.equal(s.players[1].life, 20, 'o dano vem depois do aprender');
    s = tudo(act(s, legais(s, 0, a => a.t === resposta)[0]));
    assert.equal(s.players[1].life, 18, `respondendo "${resposta}", o resto da mágica resolve`); assert.equal(s.zones[0].graveyard.length, resposta === 'pay' ? 2 : 1, 'a mágica e, se aceitou, a carta descartada');
    assert.equal(s.resume || null, null); assert.equal(s.verbo, undefined); assert.equal(s.aprendeV, undefined);
  }
});

test('V-16 · auditoria D2 (603.3a, 701.48a): quem aprende é quem controla a habilidade — a criatura do oponente que você controlava morre: você descarta e compra, não o dono', () => {
  let s = mesa([URSO, LOBO, URSO, URSO], [APR, LOBO, LOBO, LOBO]), apr, minha, dele; [s, apr] = poe(s, 1, APR); [s, minha] = poe(s, 0, URSO, 'hand'); [s, dele] = poe(s, 1, LOBO, 'hand'); s = J(s);
  s.facts[APR] = { ...s.facts[APR], script: { name: APR, effects: [], abilities: [{ kind: 'triggered', when: 'dies', effects: [{ do: 'learn' }] }] } };
  s.objects[apr].controller = 0; s.zones[1].battlefield = s.zones[1].battlefield.filter(x => x !== apr); s.zones[0].battlefield.push(apr); // o jogador 0 controla a criatura do jogador 1
  const ev = []; E.applyEffect(s, { oid: 'h', name: 'T', controller: 1, ability: true, source: null }, { do: 'destroy', target: 'creature' }, { oid: apr }, ev);
  s = ate(act(s, { t: 'pass', p: s.turn.priority }), x => x.pending && x.pending.kind === 'may_pay');
  assert.equal(s.objects[apr].zone, 'graveyard'); assert.equal(s.pending.p, 0, 'a pergunta é de quem controlava');
  const g0 = s.zones[0].library.length, g1 = s.zones[1].library.length;
  s = act(s, legais(s, 0, a => a.t === 'pay')[0]);
  assert.equal(s.pending.kind, 'discard'); assert.equal(s.pending.p, 0, 'quem aceitou é quem descarta');
  s = tudo(act(s, legais(s, 0, a => a.t === 'discard' && a.oid === minha)[0]));
  assert.equal(s.objects[minha].zone, 'graveyard'); assert.equal(s.objects[dele].zone, 'hand');
  assert.equal(s.zones[0].library.length, g0 - 1, 'e é quem compra'); assert.equal(s.zones[1].library.length, g1);
});

test('V-16 · auditoria: "discard_random" e os efeitos internos não aceitam forma errada no validador; aprender de mão vazia não pergunta nem deixa passo na fila', () => {
  assert.match(S.validateScript({ name: 'X', effects: [{ do: 'discard_random', amount: -1 }], example: { target: 'none', expect: { handDelta: 0 } } }).join(), /discard_random/);
  assert.match(S.validateScript({ name: 'X', effects: [{ do: 'learn_sim' }], example: { target: 'none', expect: { handDelta: 0 } } }).join(), /learn_sim/);
  let s = mesa([URSO], []); s = J(s); for (const oid of s.zones[0].hand.slice()) E.moveObject(s, oid, 'library');
  const ev = []; E.applyEffect(s, { oid: 'h', name: 'T', controller: 0, ability: true, source: null }, { do: 'learn' }, null, ev);
  assert.equal(s.pending, null); assert.equal(s.verbo, undefined);
});
