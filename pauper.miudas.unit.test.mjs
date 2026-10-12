// M-331 · peças miúdas que travavam listas de Pauper do catálogo: alvo com "total power and toughness N or less" (Cut Down), metalurgia como
// condição de efeito e de quantidade (Dispatch, Galvanic Blast), "if this spell was cast from a graveyard … instead" (Plunder the Trollshaws) e
// lampejo do passado que sacrifica uma Montanha (Lava Dart). Os scripts são os que o leitor monta do texto oficial (Oracle do Forge, 12/10/2026).
// Cada teste falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, passaAte, comMana, tudo, CARTAS } from './cmd.mjs';

const EX = { action: 'etb', target: 'none', expect: { attached: false } };
const c = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra });
const cards = { 'Cut Down': c('Cut Down', 'Instant', '{B}'), Dispatch: c('Dispatch', 'Instant', '{W}'), 'Galvanic Blast': c('Galvanic Blast', 'Instant', '{R}'),
  'Plunder the Trollshaws': c('Plunder the Trollshaws', 'Sorcery', '{U}'), 'Lava Dart': c('Lava Dart', 'Instant', '{R}'),
  Ursa: c('Ursa', 'Creature — Bear', '{G}', { power: '2', toughness: '2' }), Grande: c('Grande', 'Creature — Giant', '{G}', { power: '3', toughness: '3' }), Peca: c('Peca', 'Artifact', '{1}') };
const scripts = {
  'Cut Down': { name: 'Cut Down', effects: [{ do: 'destroy', target: 'creature', targetPTTotalMax: 5 }], example: EX },
  Dispatch: { name: 'Dispatch', effects: [{ do: 'tap', target: 'creature' }, { do: 'exile', target: 'first-target', onlyIf: 'metalcraft' }], example: EX },
  'Galvanic Blast': { name: 'Galvanic Blast', effects: [{ do: 'damage', amount: { per: 'se', se: 'metalcraft', sim: 4, nao: 2 }, target: 'any' }], example: EX },
  'Plunder the Trollshaws': { name: 'Plunder the Trollshaws', effects: [{ do: 'draw', amount: { per: 'se', se: 'cast-from-graveyard', sim: 2, nao: 1 } }], flashback: { mana: '{3}{U}' }, example: EX },
  'Lava Dart': { name: 'Lava Dart', effects: [{ do: 'damage', amount: 1, target: 'any' }], flashback: { sacrificeOther: { types: ['land'], subtype: 'Mountain' } }, example: EX } };
function mesaX(a, b = []) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 10, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 1, mode: 'full', cards: { ...CARTAS, ...cards }, scripts, first: 0, players: [{ name: 'A', deck: baralho([...a, 'Mountain', 'Island']) }, { name: 'B', deck: baralho([...b, 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => tudo(act(act(s, { t: 'pass', p: 0 }), { t: 'pass', p: 1 }));
const alvosDe = (s, oid) => [...new Set(legais(s, 0, x => x.oid === oid && x.t === 'cast').flatMap(x => (x.targets || []).map(t => t.oid != null ? s.objects[t.oid].name : 'jogador')))].sort();

test('M-331 · Cut Down mira só criatura com poder + resistência até 5 (2/2 sim, 3/3 não)', () => {
  let s = mesaX(['Cut Down'], ['Ursa', 'Grande']), cd;
  [s, cd] = poe(s, 0, 'Cut Down', 'hand'); [s] = poe(s, 1, 'Ursa'); [s] = poe(s, 1, 'Grande'); s = comMana(s, 'B');
  assert.deepEqual(alvosDe(s, cd), ['Ursa']);
});

test('M-331 · metalurgia: Dispatch exila só com três artefatos; Galvanic Blast causa 2, ou 4 com três artefatos', () => {
  for (const n of [2, 3]) {
    let s = mesaX(['Dispatch', 'Galvanic Blast', 'Peca'], ['Ursa']), d, g, u;
    [s, d] = poe(s, 0, 'Dispatch', 'hand'); [s, g] = poe(s, 0, 'Galvanic Blast', 'hand'); [s, u] = poe(s, 1, 'Ursa');
    for (let i = 0; i < n; i++) [s] = poe(s, 0, 'Peca');
    s = comMana(s, 'WR');
    s = resolve(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === d && x.targets[0].oid === u)[0]));
    assert.equal(s.objects[u].zone, n === 3 ? 'exile' : 'battlefield', `${n} artefatos: Dispatch`);
    const v = s.players[1].life;
    s = resolve(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === g && x.targets[0].player === 1)[0]));
    assert.equal(v - s.players[1].life, n === 3 ? 4 : 2, `${n} artefatos: Galvanic Blast`);
  }
});

test('M-331 · Plunder the Trollshaws compra 1 da mão e 2 pelo lampejo do cemitério', () => {
  let s = mesaX(['Plunder the Trollshaws']), pl;
  [s, pl] = poe(s, 0, 'Plunder the Trollshaws', 'hand'); s = comMana(s, 'UUUUU');
  let m = s.zones[0].hand.length;
  s = resolve(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === pl && !x.flashback)[0]));
  assert.equal(s.zones[0].hand.length - m, 0, 'saiu da mão e comprou 1');
  m = s.zones[0].hand.length;
  s = resolve(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === pl && x.flashback)[0]));
  assert.equal(s.zones[0].hand.length - m, 2, 'do cemitério: 2');
});

test('M-331 · Lava Dart: o lampejo do passado sacrifica uma Montanha (sem Montanha, não há lampejo)', () => {
  let s = mesaX(['Lava Dart']), ld, mt;
  [s, ld] = poe(s, 0, 'Lava Dart', 'graveyard');
  assert.equal(legais(s, 0, x => x.t === 'cast' && x.oid === ld && x.flashback).length, 0, 'sem Montanha');
  [s, mt] = poe(s, 0, 'Mountain');
  const a = legais(s, 0, x => x.t === 'cast' && x.oid === ld && x.flashback && x.targets && x.targets[0].player === 1)[0];
  assert.ok(a, 'com Montanha'); const v = s.players[1].life;
  s = resolve(act(s, a));
  assert.equal(s.objects[mt].zone, 'graveyard', 'a Montanha foi sacrificada');
  assert.equal(v - s.players[1].life, 1); assert.equal(s.objects[ld].zone, 'exile');
});
