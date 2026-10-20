// M-534 · LT196 · revisão por lote CLXXII (textos da Scryfall de 19/10/2026): Hearth Elemental // Stoke Genius ("This spell costs {X} less
// to cast, where X is the number of cards in your graveyard that are instant cards, sorcery cards, and/or have an Adventure", 601.2f;
// "Discard your hand, then draw two cards") e Carnivorous Cultivator // Enroot ("Search your library for a land card, put it into your
// graveyard, then shuffle"). Falham no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const HE = 'Hearth Elemental // Stoke Genius', CC = 'Carnivorous Cultivator // Enroot', BR = 'Brazen Borrower // Petty Theft';
const of = n => { const c = OF.find(x => x.name === n); return { name: n, layout: c.layout, faces: c.faces, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: c.keywords || [], oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], power: c.power, toughness: c.toughness }; };
const C = { 'Hearth Elemental': of(HE), 'Carnivorous Cultivator': of(CC), 'Brazen Borrower': of(BR) };
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Mountain: terra('Mountain', 'Mountain', 'R'), Forest: terra('Forest', 'Forest', 'G'),
  'Lightning Bolt': { name: 'Lightning Bolt', type_line: 'Instant', mana_cost: '{R}', cmc: 1, keywords: [], oracle_text: 'Lightning Bolt deals 3 damage to any target.', colors: ['R'] },
  Feitico: { name: 'Feitico', type_line: 'Sorcery', mana_cost: '{3}', cmc: 3, keywords: [], oracle_text: '', colors: [] },
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', power: '2', toughness: '2', colors: ['G'] } });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: /Land/.test(C[name].type_line) ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 216, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b(['Hearth Elemental', 'Carnivorous Cultivator', 'Brazen Borrower', 'Lightning Bolt', 'Feitico', 'Urso', 'Mountain', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };
const limpa = s => passaAte(s, x => !x.stack.length && !x.pending && !(x.queued || []).length);
const cemiterio = (s, ns) => { for (const n of ns) [s] = poe(s, 0, n, 'graveyard'); return s; };

test('M-534 · as duas jogam (lidas e aprovadas)', () => { for (const n of [HE, CC]) assert.equal(S.coverage(of(n)).level, 'completo', n); });

test('M-534 · Hearth Elemental custa {1} a menos por instantânea, feitiço ou carta de Aventura no seu cemitério (criatura e terreno não contam)', () => {
  const conjuravel = (gy, terrasN) => { let s = mesa(), he; [s, he] = poe(s, 0, 'Hearth Elemental', 'hand'); s = cemiterio(s, gy); s = terras(s, 'Mountain', terrasN);
    return legais(s, 0, a => a.t === 'cast' && a.oid === he && !a.omen).length > 0; };
  assert.equal(conjuravel([], 5), false, 'sem nada: {5}{R}');
  assert.equal(conjuravel(['Lightning Bolt', 'Feitico', 'Brazen Borrower', 'Urso', 'Forest'], 3), true, '3 a menos: {2}{R}');
  assert.equal(conjuravel(['Lightning Bolt', 'Feitico', 'Brazen Borrower', 'Urso', 'Forest'], 2), false, 'a criatura e o terreno não reduzem');
});

test('M-534 · Stoke Genius ({1}{R}, sem a redução): descarta a mão e compra duas; a carta vai ao exílio', () => {
  let s = mesa(), he; [s, he] = poe(s, 0, 'Hearth Elemental', 'hand'); s = cemiterio(s, ['Lightning Bolt', 'Feitico', 'Lightning Bolt', 'Feitico', 'Lightning Bolt']); s = terras(s, 'Mountain', 1);
  assert.equal(legais(s, 0, a => a.t === 'cast' && a.oid === he && a.omen).length, 0, 'a redução é da criatura: com 1 terreno a Aventura não sai');
  s = terras(s, 'Mountain', 1); const mao = s.zones[0].hand.filter(o => o !== he), gy = s.zones[0].graveyard.length;
  s = limpa(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === he && a.omen)[0]));
  assert.equal(s.zones[0].hand.length, 2); assert.ok(mao.every(o => s.objects[o].zone === 'graveyard')); assert.equal(s.zones[0].graveyard.length, gy + mao.length); assert.equal(s.objects[he].zone, 'exile');
});

test('M-534 · Carnivorous Cultivator entra preparado; Enroot põe um terreno do grimório no cemitério', () => {
  let s = mesa(), cc; [s, cc] = poe(s, 0, 'Carnivorous Cultivator', 'hand'); s = terras(s, 'Forest', 3);
  s = limpa(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === cc)[0])); assert.equal(E.preparadaT(s, s.objects[cc]), true);
  const cp = s.zones[0].exile.map(x => s.objects[x]).find(o => o && o.copiaPreparoT); assert.equal(cp.name, 'Enroot');
  const gy = s.zones[0].graveyard.length; s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === cp.oid)[0]);
  s = passaAte(s, x => !!x.pending && x.pending.kind === 'pick' || (!x.stack.length && !x.pending));
  assert.ok(s.pending.from.every(o => /Land/.test(C[s.objects[o].name].type_line)), 'só terrenos');
  const t = s.pending.from[0]; s = limpa(act(s, { t: 'pick', p: 0, oid: t }));
  assert.equal(s.objects[t].zone, 'graveyard'); assert.equal(s.zones[0].graveyard.length, gy + 1);
});
