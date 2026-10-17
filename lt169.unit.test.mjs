// M-487 · LT153 · revisão por lote CXXIX: nove cartas que o leitor já lia por inteiro e que travam as listas iniciantes passam a jogar (APROVADAS).
// Textos da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json). Cobertura completa e o comportamento das frases que pedem. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Sangrite Surge', 'Oran-Rief Invoker', 'Fleeting Distraction', 'Hordeling Outburst', 'Moan of the Unhallowed', 'Mausoleum Guard', 'Selfless Cathar', 'Gavony Unhallowed', 'Serpent Warrior'];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [/^Flying/m.test(c.oracle_text) && 'Flying', /^Flashback/m.test(c.oracle_text) && 'Flashback', /^Flashback/m.test(c.oracle_text) && 'Flashback'].filter(Boolean), oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Reliquia: { name: 'Reliquia', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] }, Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Mountain: terra('Mountain', 'Mountain', 'R'), Plains: terra('Plains', 'Plains', 'W'), Island: terra('Island', 'Island', 'U'), Swamp: terra('Swamp', 'Swamp', 'B'), Forest: terra('Forest', 'Forest', 'G') });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: C[name].type_line.startsWith('Basic Land') ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 157, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Mountain', 'Plains', 'Island', 'Swamp', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Forest', 'Island', 'Reliquia']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const tudo = s => { for (let i = 0; i < 80 && (s.stack.length || s.pending); i++) { const pk = s.pending; const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pass') || l[0]); } return s; };
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };


const fichas = s => s.zones[0].battlefield.filter(x => s.objects[x].token);

test('LT153 · as nove jogam pelo leitor aprovado', () => {
  for (const n of NOMES) { assert.equal(S.coverage(C[n]).level, 'completo', n); assert.equal(S.APROVADAS[n].leva, 'M-487', n); }
});

test('LT153 · Sangrite Surge: +3/+3 e golpe duplo; Fleeting Distraction: -1/-0 e compra', () => {
  let s = mesa(), ss, u; [s, u] = poe(s, 1, 'Urso'); [s, ss] = poe(s, 0, 'Sangrite Surge', 'hand'); s = terras(s, 'Mountain', 3); s = terras(s, 'Forest', 3);
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === ss && a.targets[0].oid === u)[0])); assert.equal(E.stats(s, s.objects[u]).power, 5); assert.ok(E.hasKeyword(s, s.objects[u], 'double strike'));
  let t = mesa(), fd, u2; [t, u2] = poe(t, 1, 'Urso'); [t, fd] = poe(t, 0, 'Fleeting Distraction', 'hand'); t = terras(t, 'Island', 1); const m0 = t.zones[0].hand.length;
  t = tudo(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === fd && a.targets[0].oid === u2)[0])); assert.equal(E.stats(t, t.objects[u2]).power, 1); assert.equal(t.zones[0].hand.length, m0);
});

test('LT153 · Hordeling Outburst cria três Goblins 1/1; Moan of the Unhallowed cria dois Zombies e volta com lampejo do passado', () => {
  let s = mesa(), ho; [s, ho] = poe(s, 0, 'Hordeling Outburst', 'hand'); s = terras(s, 'Mountain', 3);
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === ho)[0])); assert.equal(fichas(s).length, 3);
  let t = mesa(), mu; [t, mu] = poe(t, 0, 'Moan of the Unhallowed', 'graveyard'); t = terras(t, 'Swamp', 7);
  const fb = legais(t, 0, a => a.oid === mu); assert.ok(fb.length > 0); t = tudo(act(t, fb[0])); assert.equal(t.objects[mu].zone, 'exile'); assert.equal(fichas(t).length, 2); assert.equal(E.stats(t, t.objects[fichas(t)[0]]).power, 2);
});

test('LT153 · Mausoleum Guard morre e cria dois Espíritos voadores; Gavony Unhallowed ganha um marcador', () => {
  let s = mesa(), mg, gu; [s, mg] = poe(s, 0, 'Mausoleum Guard'); [s, gu] = poe(s, 0, 'Gavony Unhallowed');
  let m = J(s); m.objects[mg].damage = 9; m = tudo(act(m, { t: 'pass', p: 0 }));
  assert.equal(m.objects[mg].zone, 'graveyard'); const f = fichas(m); assert.equal(f.length, 2); assert.ok(E.hasKeyword(m, m.objects[f[0]], 'flying')); assert.equal((m.objects[gu].counters || {}).p1p1, 1);
});

test('LT153 · Selfless Cathar sacrifica e dá +1/+1 às suas; Oran-Rief Invoker {8}: +5/+5 e atropelar; Serpent Warrior perde 3', () => {
  let s = mesa(), sc, gu, u; [s, sc] = poe(s, 0, 'Selfless Cathar'); [s, gu] = poe(s, 0, 'Gavony Unhallowed'); [s, u] = poe(s, 1, 'Urso'); s = terras(s, 'Plains', 2);
  s = tudo(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === sc)[0])); assert.equal(s.objects[sc].zone, 'graveyard'); assert.equal(E.stats(s, s.objects[gu]).power, 2 + 1 + 1, '+1/+1 e o marcador da morte do Cathar'); assert.equal(E.stats(s, s.objects[u]).power, 2);
  let t = mesa(), oi; [t, oi] = poe(t, 0, 'Oran-Rief Invoker'); t = terras(t, 'Forest', 8);
  t = tudo(act(t, legais(t, 0, a => a.t === 'activate' && a.oid === oi)[0])); assert.equal(E.stats(t, t.objects[oi]).power, 7); assert.ok(E.hasKeyword(t, t.objects[oi], 'trample'));
  let q = mesa(), sw; [q, sw] = poe(q, 0, 'Serpent Warrior', 'hand'); q = terras(q, 'Swamp', 3);
  q = tudo(act(q, legais(q, 0, a => a.t === 'cast' && a.oid === sw)[0])); assert.equal(q.players[0].life, 17);
});
