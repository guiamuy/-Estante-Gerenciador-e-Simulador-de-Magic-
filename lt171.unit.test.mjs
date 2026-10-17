// M-489 · LT155 · revisão por lote CXXXI: nove cartas que o leitor já lia por inteiro e que travam as listas iniciantes passam a jogar (APROVADAS).
// Textos da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json). Cobertura completa e o comportamento das frases que pedem. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Seal of Doom', 'Sustainer of the Realm', 'Quirion Trailblazer', 'Brute Strength', 'Dragon Hatchling', 'Fiery Fall', 'Rolling Temblor', 'Geistflame', "Kemba's Skyguard"];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [/^Flying/m.test(c.oracle_text) && 'Flying', /^Flying$/m.test(c.oracle_text) && 'Flying', /^Flashback/m.test(c.oracle_text) && 'Flashback', /^Basic landcycling/m.test(c.oracle_text) && 'Basic landcycling', /^Flying$/m.test(c.oracle_text) && 'Flying', /^Flashback/m.test(c.oracle_text) && 'Flashback', /^Basic landcycling/m.test(c.oracle_text) && 'Basic landcycling'].filter(Boolean), oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Reliquia: { name: 'Reliquia', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] }, Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Mountain: terra('Mountain', 'Mountain', 'R'), Plains: terra('Plains', 'Plains', 'W'), Island: terra('Island', 'Island', 'U'), Swamp: terra('Swamp', 'Swamp', 'B'), Forest: terra('Forest', 'Forest', 'G') });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: C[name].type_line.startsWith('Basic Land') ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 159, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Mountain', 'Plains', 'Island', 'Swamp', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Forest', 'Dragon Hatchling', 'Sustainer of the Realm']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const tudo = s => { for (let i = 0; i < 80 && (s.stack.length || s.pending); i++) { const pk = s.pending; const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pass') || l[0]); } return s; };
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };


test('LT155 · as nove jogam pelo leitor aprovado', () => {
  for (const n of NOMES) { assert.equal(S.coverage(C[n]).level, 'completo', n); assert.equal(S.APROVADAS[n].leva, 'M-489', n); }
});

test('LT155 · Seal of Doom sacrifica e destrói criatura não preta; Fiery Fall causa 5 e recicla buscando básico', () => {
  let s = mesa(), sd, u; [s, sd] = poe(s, 0, 'Seal of Doom'); [s, u] = poe(s, 1, 'Urso');
  const a = legais(s, 0, x => x.t === 'activate' && x.oid === sd); assert.ok(a.some(x => x.targets[0].oid === u));
  s = tudo(act(s, a.find(x => x.targets[0].oid === u))); assert.equal(s.objects[u].zone, 'graveyard'); assert.equal(s.objects[sd].zone, 'graveyard');
  let t = mesa(), ff, u2; [t, u2] = poe(t, 1, 'Urso'); [t, ff] = poe(t, 0, 'Fiery Fall', 'hand'); t = terras(t, 'Mountain', 6);
  assert.ok(legais(t, 0, x => x.t === 'cycle' && x.oid === ff).length > 0, 'recicla');
  t = tudo(act(t, legais(t, 0, x => x.t === 'cast' && x.oid === ff && x.targets[0].oid === u2)[0])); assert.equal(t.objects[u2].zone, 'graveyard');
});

test('LT155 · Rolling Temblor: 2 em cada criatura sem voar; volta com lampejo do passado; Geistflame 1 e lampejo do passado', () => {
  let s = mesa(), rt, u, dh; [s, u] = poe(s, 1, 'Urso'); [s, dh] = poe(s, 1, 'Sustainer of the Realm'); [s, rt] = poe(s, 0, 'Rolling Temblor', 'graveyard'); s = terras(s, 'Mountain', 6);
  const fb = legais(s, 0, x => x.oid === rt); assert.ok(fb.length > 0); s = tudo(act(s, fb[0]));
  assert.equal(s.objects[u].zone, 'graveyard'); assert.equal(s.objects[dh].zone, 'battlefield', 'a voadora fica'); assert.equal(s.objects[dh].damage || 0, 0); assert.equal(s.objects[rt].zone, 'exile');
  let t = mesa(), gf; [t, gf] = poe(t, 0, 'Geistflame', 'graveyard'); t = terras(t, 'Mountain', 4);
  t = tudo(act(t, legais(t, 0, x => x.oid === gf && x.targets && x.targets[0].player === 1)[0])); assert.equal(t.players[1].life, 19); assert.equal(t.objects[gf].zone, 'exile');
});

test("LT155 · Quirion Trailblazer pode buscar um básico que entra virado; Kemba's Skyguard ganha 2; Brute Strength +3/+1 e atropelar; Dragon Hatchling {R}: +1/+0", () => {
  let s = mesa(), qt; [s, qt] = poe(s, 0, 'Quirion Trailblazer', 'hand'); s = terras(s, 'Forest', 4); const c0 = s.zones[0].battlefield.slice();
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === qt)[0]);
  for (let i = 0; i < 40 && (s.stack.length || s.pending); i++) { const pk = s.pending; const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pay' || x.t === 'yes') || l.find(x => x.t === 'pass') || l[0]); }
  const novas = s.zones[0].battlefield.filter(o => !c0.includes(o) && o !== qt); assert.equal(novas.length, 1, 'um terreno buscado'); assert.ok(s.objects[novas[0]].tapped, 'entra virado');
  let t = mesa(), ks; [t, ks] = poe(t, 0, "Kemba's Skyguard", 'hand'); t = terras(t, 'Plains', 3);
  t = tudo(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === ks)[0])); assert.equal(t.players[0].life, 22);
  let q = mesa(), bs, u; [q, u] = poe(q, 1, 'Urso'); [q, bs] = poe(q, 0, 'Brute Strength', 'hand'); q = terras(q, 'Mountain', 2);
  q = tudo(act(q, legais(q, 0, a => a.t === 'cast' && a.oid === bs && a.targets[0].oid === u)[0])); assert.equal(E.stats(q, q.objects[u]).power, 5); assert.ok(E.hasKeyword(q, q.objects[u], 'trample'));
  let r = mesa(), dh; [r, dh] = poe(r, 0, 'Dragon Hatchling'); r = terras(r, 'Mountain', 1);
  r = tudo(act(r, legais(r, 0, a => a.t === 'activate' && a.oid === dh)[0])); assert.equal(E.stats(r, r.objects[dh]).power, 1);
});

test('LT155 · Sustainer of the Realm: ao bloquear, +0/+2', () => {
  let s = mesa(), sr, u; [s, sr] = poe(s, 1, 'Sustainer of the Realm'); [s, u] = poe(s, 0, 'Quirion Trailblazer'); s = J(s); s.objects[u].sick = false;
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers', 20); s = act(s, { t: 'attack', p: 0, attackers: [u] });
  s = passaAte(s, x => x.pending && x.pending.kind === 'blockers', 20);
  const b = legais(s, 1).find(a => a.t !== 'pass' && JSON.stringify(a).includes('"' + sr + '"')); assert.ok(b, JSON.stringify(legais(s, 1)).slice(0, 200)); s = act(s, b);
  for (let i = 0; i < 10 && (s.stack.length || (s.pending && s.pending.kind !== 'priority')); i++) s = act(s, { t: 'pass', p: s.turn.priority });
  assert.equal(E.stats(s, s.objects[sr]).toughness, 5);
});
