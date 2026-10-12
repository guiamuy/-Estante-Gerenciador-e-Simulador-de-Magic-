// V-31 · auditoria independente do lote 7 (V-29 Empower Jace, V-30 aerobender): as divergências reproduzidas viram teste antes da correção.
// CR 118.9d: "If an alternative cost is being paid to cast a spell, any additional costs, cost increases, and cost reductions that affect
// that spell are applied to that alternative cost." — o {2} do aerobender (701.65a) é custo alternativo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, mesa, comMana, criatura } from './verbos.mjs';
const URSO5 = criatura('Urso de Teste 5', 2, 2, { mana_cost: '{3}{G}{G}' });
const aero = (s, p, oid) => { s = J(s); E.applyEffect(s, { oid: 'h', name: 'X', controller: p, ability: true, source: null }, { do: 'airbend', target: 'permanent' }, { oid }, []); return s; };
const sobra = s => Object.values(s.players[0].pool).reduce((a, b) => a + b, 0);

test('V-31 · auditoria A9 (118.9d): reforço é custo adicional e soma ao {2} do aerobender — Benalish Sleeper oferece {2} e {2}+{B}, e cobra os dois', () => {
  let s = mesa(['Benalish Sleeper'], []), o; [s, o] = poe(s, 0, 'Benalish Sleeper');
  s = comMana(aero(s, 0, o), 'WWB');
  const ofertas = legais(s, 0, a => a.oid === o && a.aerobend);
  assert.ok(ofertas.some(a => !a.kick), 'sem reforço'); assert.ok(ofertas.some(a => a.kick === 1), 'com reforço');
  const x = act(s, ofertas.find(a => a.kick === 1));
  assert.equal(x.objects[o].kicked, 1); assert.equal(sobra(x), 0, 'pagou {2} + {B}');
  assert.equal(legais(comMana(aero(mesa(['Benalish Sleeper'], []), 0, poe(mesa(['Benalish Sleeper'], []), 0, 'Benalish Sleeper')[1]), 'WW'), 0, a => a.aerobend && a.kick).length, 0, 'sem a mana do reforço, só a conjuração simples');
});

test('V-31 · auditoria A10 (118.9d, 601.2f): reduções tiram do {2} — Salt Road Packbeast com duas criaturas suas custa {0} pelo aerobender', () => {
  let s = mesa(['Salt Road Packbeast', URSO5], []), o; [s, o] = poe(s, 0, 'Salt Road Packbeast'); [s] = poe(s, 0, URSO5); [s] = poe(s, 0, URSO5);
  s = aero(s, 0, o);
  const oferta = legais(s, 0, a => a.oid === o && a.aerobend); assert.equal(oferta.length, 1, 'oferecida sem mana nenhuma');
  const x = act(s, oferta[0]); assert.equal(x.objects[o].zone, 'stack');
  let u = mesa(['Salt Road Packbeast', URSO5], []), pb; [u, pb] = poe(u, 0, 'Salt Road Packbeast'); [u] = poe(u, 0, URSO5); u = comMana(aero(u, 0, pb), 'W');
  assert.equal(sobra(act(u, legais(u, 0, a => a.oid === pb && a.aerobend)[0])), 0, 'com uma criatura: custa {1}');
});

test('V-31 · auditoria A10b (118.9d): "custa {2} a menos se mira uma criatura" (Killian) também tira do {2} — Rancor aerobendida sai de graça mirando uma criatura', () => {
  let s = mesa(['Killian, Ink Duelist', URSO5, 'Rancor'], []), u, r; [s] = poe(s, 0, 'Killian, Ink Duelist'); [s, u] = poe(s, 0, URSO5); [s, r] = poe(s, 0, 'Rancor');
  s = J(s); s.objects[r].attachedTo = u; s = aero(s, 0, r); assert.equal(s.objects[r].zone, 'exile');
  // a oferta: com Killian no campo o legalActions sai pelo filtro "otimista" (M-259) antes das âncoras K, V e T — pendência da trilha motor;
  // aqui se prova o pagamento: a ação é aceita sem mana e não sobra nada
  const x = act(s, { t: 'cast', p: 0, oid: r, aerobend: true, targets: [{ oid: u }] });
  assert.equal(x.objects[r].zone, 'stack'); assert.equal(sobra(x), 0);
});
