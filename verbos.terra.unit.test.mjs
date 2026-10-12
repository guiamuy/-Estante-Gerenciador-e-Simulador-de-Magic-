// V-28 · CR 701.66 · terrabender (earthbend). Texto oficial em .listas/oficiais-verbos.json (Oracle do Forge, clone de 12/10/2026):
// Earthbending Lesson — "Earthbend 4. (Target land you control becomes a 0/0 creature with haste that's still a land. Put four +1/+1
// counters on it. When it dies or is exiled, return it to the battlefield tapped.)"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
import { E, J, act, poe, legais, mesa, comMana, tudo, criatura, conjura } from './verbos.mjs';
const { scripts: S, table: T } = loadModules();
const URSO = criatura('Urso de Teste 3/3', 3, 3);
const fonte = (p = 0) => ({ oid: 'h', name: 'Terra de Teste', controller: p, ability: true, source: null });
const resolveTudo = s => tudo(s, x => legais(x, x.pending.p)[0]);
const terra = (s, oid, n, p = 0) => { s = J(s); const ev = []; E.applyEffect(s, fonte(p), { do: 'earthbend', amount: n, target: 'land-you-control' }, { oid }, ev); return [s, ev]; };
const flui = s => { for (let i = 0; i < 12 && (s.stack.length || s.pending || (s.queued || []).length); i++) s = s.pending ? act(s, legais(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority }); return s; };

test('CR 701.66a · terrabender N: o terreno seu alvo vira criatura 0/0 com ímpeto que continua terreno, com N marcadores +1/+1 — ataca no mesmo turno e ainda dá mana', () => {
  let s = mesa([URSO], []), pl; [s, pl] = poe(s, 0, 'Plains'); s = J(s); s.objects[pl].sick = false;
  let [x, ev] = terra(s, pl, 3);
  const o = x.objects[pl]; assert.ok(E.isCreature(x, o)); assert.ok([...E.tiposDe(x, o)].includes('land'), 'continua terreno'); assert.match(E.linhaDeTipo(x, o), /Plains/);
  assert.deepEqual({ ...E.stats(x, o) }, { power: 3, toughness: 3 }); assert.equal(E.hasKeyword(x, o, 'haste'), true);
  assert.equal(ev.find(e => e.do === 'earthbend').amount, 3);
  assert.equal(E.productions(x, o).length >= 1, true, 'ainda é terreno que dá mana');
  for (let i = 0; i < 40 && !(x.pending && x.pending.kind === 'attackers'); i++) x = x.pending ? act(x, legais(x, x.pending.p)[0]) : act(x, { t: 'pass', p: x.turn.priority });
  assert.ok(E.eligibleAttackers(x, 0).includes(pl), 'com ímpeto ataca no turno em que virou criatura');
});

test('CR 701.66a · só terreno que você controla é alvo; terreno do oponente e criatura não', () => {
  let s = mesa([URSO], []), meu, dele, ur; [s, meu] = poe(s, 0, 'Plains'); [s, dele] = poe(s, 1, 'Island'); [s, ur] = poe(s, 0, URSO);
  const alvos = [...E.legalTargets(s, 0, 'land-you-control', null)].map(t => t.oid);
  assert.ok(alvos.includes(meu)); assert.equal(alvos.includes(dele), false); assert.equal(alvos.includes(ur), false);
  let [x, ev] = terra(s, dele, 2); assert.equal(E.isCreature(x, x.objects[dele]), false); assert.equal(ev.find(e => e.do === 'earthbend').failed, true);
});

test('CR 701.66a · quando o terreno morre ou é exilado, volta ao campo virado sob o seu controle — como terreno comum (objeto novo), uma vez', () => {
  for (const zona of ['graveyard', 'exile']) {
    let s = mesa([URSO], []), pl; [s, pl] = poe(s, 0, 'Plains'); [s] = terra(s, pl, 2);
    s = J(s); const ev = []; if (zona === 'graveyard') E.applyEffect(s, fonte(1), { do: 'destroy', target: 'creature' }, { oid: pl }, ev); else E.moveObject(s, pl, 'exile');
    assert.equal(s.objects[pl].zone, zona);
    s = flui(s);
    const o = s.objects[pl]; assert.equal(o.zone, 'battlefield', `voltou de ${zona}`); assert.equal(o.tapped, true, 'virado'); assert.equal(o.controller, 0);
    assert.equal(E.isCreature(s, o), false, '400.7: volta como terreno comum'); assert.equal(o.counters.p1p1 || 0, 0);
    assert.equal([...E.legalTargets(s, 1, 'creature', null)].some(x => x.oid === pl), false, 'não é mais alvo de "destrua a criatura alvo"');
    let y = J(s); E.moveObject(y, pl, 'graveyard'); y = flui(y); assert.equal(y.objects[pl].zone, 'graveyard', 'o gatilho atrasado já foi usado');
    assert.equal(E.invariants(s).length, 0);
  }
});

test('CR 701.66a · para a mão o terreno não volta (o gatilho fala de morrer ou ser exilado); terrabender duas vezes soma os marcadores e o terreno volta uma vez só', () => {
  let s = mesa([URSO], []), pl; [s, pl] = poe(s, 0, 'Plains'); [s] = terra(s, pl, 1);
  let x = J(s); E.moveObject(x, pl, 'hand'); x = flui(x); assert.equal(x.objects[pl].zone, 'hand'); assert.equal(x.terraV, undefined);
  [s] = terra(s, pl, 2); assert.deepEqual({ ...E.stats(s, s.objects[pl]) }, { power: 3, toughness: 3 });
  x = J(s); E.moveObject(x, pl, 'graveyard'); assert.equal((x.queued || []).length, 2, 'um gatilho por terrabender'); x = flui(x);
  assert.equal(x.objects[pl].zone, 'battlefield'); assert.equal(x.zones[0].battlefield.filter(o => o === pl).length, 1);
});

test('Earthbending Lesson: o script, o alvo e a frase em português', () => {
  let s = mesa([URSO, 'Earthbending Lesson'], []), pl, el; [s, pl] = poe(s, 0, 'Plains'); [s, el] = poe(s, 0, 'Earthbending Lesson', 'hand');
  let x = resolveTudo(conjura(comMana(s, 'GGGG'), 0, el, [pl]));
  assert.deepEqual({ ...E.stats(x, x.objects[pl]) }, { power: 4, toughness: 4 }); assert.equal(x.objects[el].zone, 'graveyard');
  assert.match(S.validateScript({ name: 'X', effects: [{ do: 'earthbend', amount: 0, target: 'land-you-control' }], example: { target: 'own-land', expect: { stats: [0, 0] } } }).join(), /earthbend/);
  assert.match(T.descreveEfeitos([{ do: 'earthbend', amount: 4, target: 'land-you-control' }]), /^terrabende 4: .* vira uma criatura 0\/0 com ímpeto que continua sendo terreno/);
});
