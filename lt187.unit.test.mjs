// M-505 · LT170 · revisão por lote CXLVI: nove cartas que o leitor já lia por inteiro e que travam as listas iniciantes passam a jogar (APROVADAS).
// Textos da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json). Cobertura completa e o comportamento das frases que pedem. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Metropolis Sprite', 'Quicksilver Fisher', 'Mist-Cloaked Herald', 'Uncomfortable Chill', 'Quick Study', 'Ghostly Changeling', 'Shimmering Grotto', 'Aerial Maneuver', 'Fortress Cyclops'];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [...['Flying', 'Changeling'].filter(k => c.oracle_text.split(String.fromCharCode(10)).some(l => l === k || l.startsWith(k + ' ')))].filter(Boolean), oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Reliquia: { name: 'Reliquia', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] }, Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Mountain: terra('Mountain', 'Mountain', 'R'), Plains: terra('Plains', 'Plains', 'W'), Island: terra('Island', 'Island', 'U'), Swamp: terra('Swamp', 'Swamp', 'B'), Forest: terra('Forest', 'Forest', 'G') });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: C[name].type_line.startsWith('Basic Land') ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 174, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Mountain', 'Plains', 'Island', 'Swamp', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Forest', 'Reliquia']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const tudo = s => { for (let i = 0; i < 80 && (s.stack.length || s.pending); i++) { const pk = s.pending; const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pass') || l[0]); } return s; };
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };

const semKw = n => ({ ...C[n], keywords: [] });
const resolve = (s, pref, alvo) => { for (let i = 0; i < 60 && (s.stack.length || s.pending); i++) { const pk = s.pending; if (pk && pk.kind === 'pick_target' && alvo != null) { s = act(s, { t: 'pick_target', p: pk.p, index: pk.options.findIndex(o => (typeof alvo === 'number' ? o.player === alvo : o.oid === alvo)) }); continue; } const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, (pref && l.find(pref)) || l.find(x => x.t === 'pass') || l[0]); } return s; };

test('LT170 · as nove jogam pelo leitor aprovado', () => {
  for (const n of NOMES) { assert.equal(S.coverage(C[n]).level, 'completo', n); assert.equal(S.APROVADAS[n].leva, 'M-505', n); }
});

test('LT170 · Metropolis Sprite voa e ganha +1/-1 por {U}; Ghostly Changeling é de todo tipo de criatura e ganha +1/+1 por {1}{B}', () => {
  let s = mesa(), ms; [s, ms] = poe(s, 0, 'Metropolis Sprite'); s = terras(s, 'Island', 1); assert.ok(E.hasKeyword(s, s.objects[ms], 'flying'));
  s = tudo(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === ms)[0])); assert.equal(E.stats(s, s.objects[ms]).power, 2); assert.equal(E.stats(s, s.objects[ms]).toughness, 1);
  let t = mesa(), gc; [t, gc] = poe(t, 0, 'Ghostly Changeling'); t = terras(t, 'Swamp', 2);
  assert.ok(E.metamorfoK(t, t.objects[gc], 'Elf') && E.metamorfoK(t, t.objects[gc], 'Goblin'), 'todo tipo de criatura');
  t = tudo(act(t, legais(t, 0, a => a.t === 'activate' && a.oid === gc)[0])); assert.equal(E.stats(t, t.objects[gc]).power, 3); assert.equal(E.stats(t, t.objects[gc]).toughness, 3);
});

test('LT170 · Quicksilver Fisher compra e descarta ao entrar; Quick Study compra duas; Uncomfortable Chill: criaturas do oponente -2/-0 e compra', () => {
  let s = mesa(), qf; [s, qf] = poe(s, 0, 'Quicksilver Fisher', 'hand'); s = terras(s, 'Island', 5); const h0 = s.zones[0].hand.length, g0 = s.zones[0].graveyard.length;
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === qf)[0])); assert.equal(s.zones[0].hand.length, h0 - 1); assert.equal(s.zones[0].graveyard.length, g0 + 1); assert.ok(E.hasKeyword(s, s.objects[qf], 'flying'));
  let t = mesa(), qs; [t, qs] = poe(t, 0, 'Quick Study', 'hand'); t = terras(t, 'Island', 3); const k0 = t.zones[0].hand.length;
  t = tudo(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === qs)[0])); assert.equal(t.zones[0].hand.length, k0 - 1 + 2);
  let q = mesa(), uc, u, ms; [q, u] = poe(q, 1, 'Urso'); [q, ms] = poe(q, 0, 'Metropolis Sprite'); [q, uc] = poe(q, 0, 'Uncomfortable Chill', 'hand'); q = terras(q, 'Island', 3); const m0 = q.zones[0].hand.length;
  q = tudo(act(q, legais(q, 0, a => a.t === 'cast' && a.oid === uc)[0])); assert.equal(E.stats(q, q.objects[u]).power, 0); assert.equal(E.stats(q, q.objects[ms]).power, 1); assert.equal(q.zones[0].hand.length, m0 - 1 + 1);
});

test('LT170 · Mist-Cloaked Herald não pode ser bloqueada; Aerial Maneuver dá +1/+1, voar e golpe primeiro', () => {
  let s = mesa(), mh, u; [s, u] = poe(s, 1, 'Urso'); [s, mh] = poe(s, 0, 'Mist-Cloaked Herald'); s = J(s); s.objects[mh].sick = false;
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers', 20); s = act(s, { t: 'attack', p: 0, attackers: [mh] });
  s = passaAte(s, x => (x.pending && x.pending.kind === 'blockers') || x.turn.step === 'main2' || x.turn.active === 1, 20);
  assert.ok(!(s.pending && s.pending.kind === 'blockers' && legais(s, 1).some(a => JSON.stringify(a).includes('"' + mh + '"'))), 'ninguém bloqueia');
  let t = mesa(), am, gc; [t, gc] = poe(t, 0, 'Ghostly Changeling'); [t, am] = poe(t, 0, 'Aerial Maneuver', 'hand'); t = terras(t, 'Plains', 2);
  t = tudo(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === am && a.targets[0].oid === gc)[0])); assert.equal(E.stats(t, t.objects[gc]).power, 3);
  assert.ok(E.hasKeyword(t, t.objects[gc], 'flying') && E.hasKeyword(t, t.objects[gc], 'first strike'));
});

test('LT170 · Fortress Cyclops +3/+0 ao atacar; Shimmering Grotto dá {C} ou, com {1}, qualquer cor sem pilha', () => {
  let s = mesa(), fc; [s, fc] = poe(s, 0, 'Fortress Cyclops'); s = J(s); s.objects[fc].sick = false;
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers', 20); s = act(s, { t: 'attack', p: 0, attackers: [fc] });
  for (let i = 0; i < 10 && s.stack.length && !s.pending; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  assert.equal(E.stats(s, s.objects[fc]).power, 6); assert.equal(E.stats(s, s.objects[fc]).toughness, 3);
  let t = mesa(), sg; [t, sg] = poe(t, 0, 'Shimmering Grotto'); t = terras(t, 'Plains', 1);
  assert.ok(legais(t, 0, a => a.t === 'tap_mana' && a.oid === sg).length > 0);
  t = act(t, legais(t, 0, a => a.t === 'activate' && a.oid === sg && a.color === 'R')[0]); assert.equal(t.stack.length, 0); assert.equal(t.players[0].pool.R, 1);
});
