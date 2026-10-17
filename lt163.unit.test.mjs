// M-481 · LT147 · revisão por lote CXXV: nove cartas que o leitor já lia por inteiro e que travam as listas iniciantes passam a jogar (APROVADAS).
// Textos da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json). Cobertura completa e o comportamento das frases que pedem. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Sicken', 'Bellows Lizard', 'Swift Justice', "Angel's Mercy", 'Righteous Charge', "Mage's Guile", 'Fires of Yavimaya', 'Kinsbaile Skirmisher', 'One Dozen Eyes'];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [/^Flying/m.test(c.oracle_text) && 'Flying', /^Cycling/m.test(c.oracle_text) && 'Cycling', /^Entwine/m.test(c.oracle_text) && 'Entwine', /^Flashback/m.test(c.oracle_text) && 'Flashback'].filter(Boolean), oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Mountain: terra('Mountain', 'Mountain', 'R'), Plains: terra('Plains', 'Plains', 'W'), Island: terra('Island', 'Island', 'U'), Swamp: terra('Swamp', 'Swamp', 'B'), Forest: terra('Forest', 'Forest', 'G') });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: C[name].type_line.startsWith('Basic Land') ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 151, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Mountain', 'Plains', 'Island', 'Swamp', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const tudo = s => { for (let i = 0; i < 80 && (s.stack.length || s.pending); i++) { const pk = s.pending; const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pass') || l[0]); } return s; };
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };


const resolveCom = (s, quer) => { for (let i = 0; i < 60 && (s.stack.length || s.pending); i++) { const pk = s.pending; if (pk && pk.kind === 'pick_target') { s = act(s, { t: 'pick_target', p: pk.p, index: Math.max(0, pk.options.findIndex(o => o.oid === quer)) }); continue; } const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pass') || l[0]); } return s; };
const fichas = s => s.zones[0].battlefield.filter(x => s.objects[x].token);

test('LT147 · as nove jogam pelo leitor aprovado', () => {
  for (const n of NOMES) { assert.equal(S.coverage(C[n]).level, 'completo', n); assert.equal(S.APROVADAS[n].leva, 'M-481', n); }
});

test('LT147 · One Dozen Eyes: um modo (5/5 ou cinco 1/1) ou, com entrelaçar {G}{G}{G}, os dois', () => {
  let s = mesa(), od; [s, od] = poe(s, 0, 'One Dozen Eyes', 'hand'); s = terras(s, 'Forest', 9);
  const res = legais(s, 0, a => a.t === 'cast' && a.oid === od).map(a => fichas(tudo(act(s, a))).length);
  assert.ok(res.includes(1) && res.includes(5) && res.includes(6), JSON.stringify(res));
  let t = mesa(), o2; [t, o2] = poe(t, 0, 'One Dozen Eyes', 'hand'); t = terras(t, 'Forest', 6);
  const r2 = legais(t, 0, a => a.t === 'cast' && a.oid === o2).map(a => fichas(tudo(act(t, a))).length); assert.ok(!r2.includes(6), 'sem mana para entrelaçar');
});

test('LT147 · Fires of Yavimaya: suas criaturas têm ímpeto; sacrificar dá +2/+2', () => {
  let s = mesa(), fy, ks; [s, fy] = poe(s, 0, 'Fires of Yavimaya'); [s, ks] = poe(s, 0, 'Kinsbaile Skirmisher', 'hand'); s = terras(s, 'Plains', 2);
  s = resolveCom(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === ks)[0]), ks); assert.ok(E.eligibleAttackers(s, 0).includes(ks), 'ímpeto');
  assert.equal(E.stats(s, s.objects[ks]).power, 3, 'Skirmisher deu +1/+1 a ela mesma');
  s = tudo(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === fy && a.targets[0].oid === ks)[0])); assert.equal(s.objects[fy].zone, 'graveyard'); assert.equal(E.stats(s, s.objects[ks]).power, 5);
});

test("LT147 · Righteous Charge dá +2/+2 só às suas; Angel's Mercy dá 7 de vida", () => {
  let s = mesa(), rc, bl, u; [s, bl] = poe(s, 0, 'Bellows Lizard'); [s, u] = poe(s, 1, 'Urso'); [s, rc] = poe(s, 0, 'Righteous Charge', 'hand'); s = terras(s, 'Plains', 3);
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === rc)[0])); assert.equal(E.stats(s, s.objects[bl]).power, 3); assert.equal(E.stats(s, s.objects[u]).power, 2);
  let t = mesa(), am; [t, am] = poe(t, 0, "Angel's Mercy", 'hand'); t = terras(t, 'Plains', 4);
  t = tudo(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === am)[0])); assert.equal(t.players[0].life, 27);
});

test('LT147 · Swift Justice: +1/+0, iniciativa e vínculo com a vida; Bellows Lizard: {1}{R} dá +1/+0', () => {
  let s = mesa(), sj, bl; [s, bl] = poe(s, 0, 'Bellows Lizard'); [s, sj] = poe(s, 0, 'Swift Justice', 'hand'); s = terras(s, 'Plains', 1); s = terras(s, 'Mountain', 2);
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === sj && a.targets[0].oid === bl)[0]));
  assert.equal(E.stats(s, s.objects[bl]).power, 2); assert.ok(E.hasKeyword(s, s.objects[bl], 'first strike') && E.hasKeyword(s, s.objects[bl], 'lifelink'));
  s = tudo(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === bl)[0])); assert.equal(E.stats(s, s.objects[bl]).power, 3);
});

test("LT147 · Sicken dá -1/-1 (a 1/1 morre) e recicla por {2}; Mage's Guile dá manto e recicla por {U}", () => {
  let s = mesa(), sk, bl; [s, bl] = poe(s, 0, 'Bellows Lizard'); [s, sk] = poe(s, 0, 'Sicken', 'hand'); s = terras(s, 'Swamp', 2);
  assert.ok(legais(s, 0, a => a.t === 'cycle' && a.oid === sk).length > 0, 'recicla');
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === sk && a.targets[0].oid === bl)[0])); assert.equal(s.objects[bl].zone, 'graveyard');
  let t = mesa(), mg, b2; [t, b2] = poe(t, 0, 'Bellows Lizard'); [t, mg] = poe(t, 0, "Mage's Guile", 'hand'); t = terras(t, 'Island', 2);
  assert.ok(legais(t, 0, a => a.t === 'cycle' && a.oid === mg).length > 0, 'recicla');
  t = tudo(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === mg && a.targets[0].oid === b2)[0])); assert.ok(E.hasKeyword(t, t.objects[b2], 'shroud'));
});
