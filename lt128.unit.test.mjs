// M-446 · LT112 · correções da revisão independente de M-441/M-442 (Lightning Axe): (1) a redução de custo alcança o {5} do custo adicional (601.2f) —
// com Goblin Anarchomancer, "pay {5}" sai por {4}{R}; (2) conjurada sem pagar (cascata, 118.9d), as formas do custo adicional são oferecidas e o {5}
// escolhido é cobrado. Textos da Scryfall (.listas/oficiais-revisadas.json). Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const C = {}; for (const n of ['Lightning Axe', 'Goblin Anarchomancer']) { const c = OF.find(x => x.name === n); C[n] = { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: [...new Set(c.mana_cost.match(/[WUBRG]/g))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; }
C.Cascateira = { name: 'Cascateira', type_line: 'Creature — Test', mana_cost: '{3}{R}', cmc: 4, keywords: ['Cascade'], oracle_text: 'Cascade', colors: ['R'], power: '3', toughness: '3' };
C.Urso = { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' };
C.Mountain = { name: 'Mountain', type_line: 'Basic Land — Mountain', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {R}.)', colors: [] };
function mesa(seed = 55) {
  const b = ns => ns.map(name => ({ name, qty: name === 'Mountain' ? 20 : 6, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b(['Lightning Axe', 'Goblin Anarchomancer', 'Cascateira', 'Mountain']) }, { name: 'B', deck: b(['Urso', 'Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending, 40);
const maoSo = (s, keep) => { s = J(s); const z = s.zones[0]; for (const o of z.hand.filter(o => !keep.includes(o))) { z.hand.splice(z.hand.indexOf(o), 1); z.library.push(o); s.objects[o].zone = 'library'; } return s; };
const viradas = s => s.zones[0].battlefield.filter(o => s.objects[o].name === 'Mountain' && s.objects[o].tapped).length;

test('LT112 · Goblin Anarchomancer reduz também o {5}: com cinco Montanhas e a mão vazia, "pay {5}" sai por {4}{R}', () => {
  let s = mesa(), ax, u; [s, ax] = poe(s, 0, 'Lightning Axe', 'hand'); [s] = poe(s, 0, 'Goblin Anarchomancer'); [s, u] = poe(s, 1, 'Urso'); for (let i = 0; i < 5; i++) [s] = poe(s, 0, 'Mountain'); s = maoSo(s, [ax]);
  const as = legais(s, 0, a => a.t === 'cast' && a.oid === ax && a.targets && a.targets[0].oid === u); assert.ok(as.length && as.every(a => a.add === 1), JSON.stringify(as.map(a => a.add)));
  const t = resolve(act(s, as[0])); assert.equal(t.objects[u].zone, 'graveyard'); assert.equal(viradas(t), 5);
});

test('LT112 · cascata revela a Axe com a mão vazia: a conjuração sem pagar oferece "pay {5}" e cobra os cinco', () => {
  let s = mesa(), cs, u; [s, cs] = poe(s, 0, 'Cascateira', 'hand'); [s, u] = poe(s, 1, 'Urso'); for (let i = 0; i < 9; i++) [s] = poe(s, 0, 'Mountain'); s = maoSo(s, [cs]);
  s = J(s); const lib = s.zones[0].library; const ax = lib.find(o => s.objects[o].name === 'Lightning Axe'); lib.splice(lib.indexOf(ax), 1); lib.unshift(ax);
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === cs)[0]); for (let i = 0; i < 6 && !(s.pending && s.pending.kind === 'free_cast'); i++) s = act(s, { t: 'pass', p: s.turn.priority });
  assert.equal(s.pending && s.pending.kind, 'free_cast');
  const fr = legais(s, 0, a => a.t === 'cast_free' && a.oid === ax); assert.ok(fr.length && fr.every(a => a.add === 1), JSON.stringify(fr.map(a => a.add)));
  const antes = viradas(s); const t = resolve(act(s, fr.find(a => a.targets && a.targets[0].oid === u) || fr[0])); assert.equal(viradas(t) - antes, 5); assert.equal(t.objects[u].zone, 'graveyard');
});
