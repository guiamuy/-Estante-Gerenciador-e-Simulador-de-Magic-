// M-479 · LT145 · revisão por lote CXXIV: oito cartas que o leitor já lia por inteiro e que travam as listas iniciantes passam a jogar (APROVADAS).
// Textos da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json). Cobertura completa e o comportamento das frases que pedem. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Flame Lash', 'Pyre Hound', 'Rush of Adrenaline', "Gideon's Lawkeeper", 'Luminous Angel', 'Wingsteed Rider', "Kytheon's Irregulars", 'Siege Rhino'];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [/^Flying/m.test(c.oracle_text) && 'Flying', /^Renown/m.test(c.oracle_text) && 'Renown', /^Trample$/m.test(c.oracle_text) && 'Trample', /^Flashback/m.test(c.oracle_text) && 'Flashback'].filter(Boolean), oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Mountain: terra('Mountain', 'Mountain', 'R'), Plains: terra('Plains', 'Plains', 'W'), Island: terra('Island', 'Island', 'U'), Swamp: terra('Swamp', 'Swamp', 'B'), Forest: terra('Forest', 'Forest', 'G') });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: C[name].type_line.startsWith('Basic Land') ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 149, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Mountain', 'Plains', 'Island', 'Swamp', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const tudo = s => { for (let i = 0; i < 80 && (s.stack.length || s.pending); i++) { const pk = s.pending; const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pass') || l[0]); } return s; };
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };


test('LT145 · as oito jogam pelo leitor aprovado', () => {
  for (const n of NOMES) { assert.equal(S.coverage(C[n]).level, 'completo', n); assert.equal(S.APROVADAS[n].leva, 'M-479', n); }
});

test('LT145 · Siege Rhino: cada oponente perde 3 e você ganha 3', () => {
  let s = mesa(), sr; [s, sr] = poe(s, 0, 'Siege Rhino', 'hand'); s = terras(s, 'Plains', 2); s = terras(s, 'Swamp', 1); s = terras(s, 'Forest', 1);
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === sr)[0])); assert.equal(s.players[1].life, 17); assert.equal(s.players[0].life, 23);
});

test('LT145 · Pyre Hound ganha marcador quando você conjura instantânea; Flame Lash causa 4', () => {
  let s = mesa(), ph, fl; [s, ph] = poe(s, 0, 'Pyre Hound'); [s, fl] = poe(s, 0, 'Flame Lash', 'hand'); s = terras(s, 'Mountain', 4);
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === fl && a.targets[0].player === 1)[0])); assert.equal(s.players[1].life, 16); assert.equal((s.objects[ph].counters || {}).p1p1, 1);
});

test('LT145 · Wingsteed Rider (heroico): Rush of Adrenaline nela dá marcador, +2/+1 e atropelar', () => {
  let s = mesa(), wr, ra; [s, wr] = poe(s, 0, 'Wingsteed Rider'); [s, ra] = poe(s, 0, 'Rush of Adrenaline', 'hand'); s = terras(s, 'Mountain', 1);
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === ra && a.targets[0].oid === wr)[0]));
  assert.equal((s.objects[wr].counters || {}).p1p1, 1); assert.equal(E.stats(s, s.objects[wr]).power, 5); assert.equal(E.stats(s, s.objects[wr]).toughness, 4); assert.ok(E.hasKeyword(s, s.objects[wr], 'trample'));
});

test("LT145 · Gideon's Lawkeeper ({W},{T}) e Kytheon's Irregulars ({W}{W}) viram a criatura alvo", () => {
  let s = mesa(), gl, u; [s, gl] = poe(s, 0, "Gideon's Lawkeeper"); [s, u] = poe(s, 1, 'Urso'); s = terras(s, 'Plains', 1);
  s = tudo(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === gl && a.targets[0].oid === u)[0])); assert.ok(s.objects[u].tapped);
  let t = mesa(), ki, u2; [t, ki] = poe(t, 0, "Kytheon's Irregulars"); [t, u2] = poe(t, 1, 'Urso'); t = terras(t, 'Plains', 2);
  t = tudo(act(t, legais(t, 0, a => a.t === 'activate' && a.oid === ki && a.targets[0].oid === u2)[0])); assert.ok(t.objects[u2].tapped); assert.ok(!t.objects[ki].tapped, 'sem {T}');
});

test('LT145 · Luminous Angel: na sua manutenção, pode criar um Espírito 1/1 voador', () => {
  let s = mesa(), la; [s, la] = poe(s, 0, 'Luminous Angel');
  s = passaAte(s, x => x.pending && x.pending.kind === 'may_pay' && x.pending.p === 0, 400); assert.equal(s.turn.step, 'upkeep'); assert.equal(s.turn.active, 0);
  const sim = tudo(act(s, { t: 'pay', p: 0 })); const f = sim.zones[0].battlefield.filter(x => sim.objects[x].token); assert.equal(f.length, 1); assert.ok(E.hasKeyword(sim, sim.objects[f[0]], 'flying'));
  const nao = tudo(act(s, { t: 'decline', p: 0 })); assert.equal(nao.zones[0].battlefield.filter(x => nao.objects[x].token).length, 0);
});
