// M-441 · LT107 · Lightning Axe ("As an additional cost to cast this spell, discard a card or pay {5}. / Lightning Axe deals 5 damage to target creature.").
// Texto da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json), caminho de produção (APROVADAS). Custo adicional novo `generico` (a mana entra no
// custo total, 601.2f; um ou outro, 601.2b). Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const c0 = OF.find(x => x.name === 'Lightning Axe');
const C = { 'Lightning Axe': { name: c0.name, type_line: c0.type_line, mana_cost: c0.mana_cost, cmc: 1, keywords: [], oracle_text: c0.oracle_text, colors: ['R'] },
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Mountain: { name: 'Mountain', type_line: 'Basic Land — Mountain', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {R}.)', colors: [] } };
function mesa(seed = 50) {
  const b = ns => ns.map(name => ({ name, qty: 12, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b(['Lightning Axe', 'Urso', 'Mountain']) }, { name: 'B', deck: b(['Urso', 'Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => { for (let i = 0; i < 40; i++) { if (s.pending && s.pending.kind !== 'priority') { s = act(s, legais(s, s.pending.p)[0]); continue; } if (s.stack.length) { s = passaAte(s, x => !x.stack.length || (!!x.pending && x.pending.kind !== 'priority'), 40); continue; } return s; } return s; };
function cena(terras, maoVazia = false) {
  let s = mesa(), ax, u; [s, ax] = poe(s, 0, 'Lightning Axe', 'hand'); [s, u] = poe(s, 1, 'Urso'); for (let i = 0; i < terras; i++) [s] = poe(s, 0, 'Mountain');
  if (maoVazia) { s = J(s); const z = s.zones[0]; for (const o of z.hand.filter(o => o !== ax)) { z.hand.splice(z.hand.indexOf(o), 1); z.library.push(o); s.objects[o].zone = 'library'; } }
  return { s, ax, u };
}

test('LT107 · Lightning Axe joga pelo leitor aprovado', () => {
  assert.equal(S.coverage(C['Lightning Axe']).level, 'completo'); assert.equal(S.APROVADAS['Lightning Axe'].leva, 'M-441');
});

test('LT107 · com uma terra: só descartando; mata a criatura e a carta descartada vai ao cemitério', () => {
  const { s, ax, u } = cena(1); const as = legais(s, 0, a => a.t === 'cast' && a.oid === ax && a.targets && a.targets[0].oid === u);
  assert.ok(as.length && as.every(a => a.add === 0), JSON.stringify(as.map(a => a.add)));
  const mao = s.zones[0].hand.length; const t = resolve(act(s, as[0])); assert.equal(t.objects[u].zone, 'graveyard'); assert.equal(t.zones[0].hand.length, mao - 2);
});

test('LT107 · sem outra carta na mão e com seis terras: paga {5} a mais ({5}{R}, as seis viradas); com cinco, não dá', () => {
  let { s, ax, u } = cena(6, true); let as = legais(s, 0, a => a.t === 'cast' && a.oid === ax && a.targets && a.targets[0].oid === u);
  assert.ok(as.length && as.every(a => a.add === 1), JSON.stringify(as.map(a => a.add)));
  const t = resolve(act(s, as[0])); assert.equal(t.objects[u].zone, 'graveyard'); assert.equal(t.zones[0].battlefield.filter(o => t.objects[o].name === 'Mountain' && t.objects[o].tapped).length, 6);
  ({ s, ax } = cena(5, true)); assert.equal(legais(s, 0, a => a.t === 'cast' && a.oid === ax).length, 0);
});

test('LT107 · com carta na mão e seis terras, as duas formas são oferecidas; pagar {5} não descarta', () => {
  const { s, ax, u } = cena(6); const as = legais(s, 0, a => a.t === 'cast' && a.oid === ax && a.targets && a.targets[0].oid === u);
  assert.deepEqual([...new Set(as.map(a => a.add))].sort(), [0, 1]);
  const mao = s.zones[0].hand.length; const t = resolve(act(s, as.find(a => a.add === 1))); assert.equal(t.zones[0].hand.length, mao - 1);
});
