// M-477 · LT143 · revisão por lote CXXII: nove cartas que o leitor já lia por inteiro e que travam as listas iniciantes passam a jogar (APROVADAS).
// Textos da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json). Cobertura completa e o comportamento das frases que pedem. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ["Kodama's Might", 'Jayemdae Tome', 'Divine Favor', 'Keening Banshee', 'Roar of the Wurm', 'Dragon Blood', 'Territorial Baloth', 'Murderous Cut', 'Flesh to Dust'];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [/^Flying/m.test(c.oracle_text) && 'Flying', /^Delve/m.test(c.oracle_text) && 'Delve', /^Splice/m.test(c.oracle_text) && 'Splice', /^Flashback/m.test(c.oracle_text) && 'Flashback'].filter(Boolean), oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Mountain: terra('Mountain', 'Mountain', 'R'), Plains: terra('Plains', 'Plains', 'W'), Island: terra('Island', 'Island', 'U'), Swamp: terra('Swamp', 'Swamp', 'B'), Forest: terra('Forest', 'Forest', 'G') });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: C[name].type_line.startsWith('Basic Land') ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 147, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Mountain', 'Plains', 'Island', 'Swamp', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const tudo = s => { for (let i = 0; i < 80 && (s.stack.length || s.pending); i++) { const pk = s.pending; const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pass') || l[0]); } return s; };
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };


const resolveCom = (s, quer) => { for (let i = 0; i < 60 && (s.stack.length || s.pending); i++) { const pk = s.pending; if (pk && pk.kind === 'pick_target') { s = act(s, { t: 'pick_target', p: pk.p, index: Math.max(0, pk.options.findIndex(o => o.oid === quer)) }); continue; } const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pass') || l[0]); } return s; };

test('LT143 · as nove jogam pelo leitor aprovado', () => {
  for (const n of NOMES) { assert.equal(S.coverage(C[n]).level, 'completo', n); assert.equal(S.APROVADAS[n].leva, 'M-477', n); }
});

test('LT143 · Murderous Cut com vasculhar: quatro cartas do cemitério pagam {4}; destrói a criatura alvo', () => {
  let s = mesa(), mc, u; [s, u] = poe(s, 1, 'Urso'); [s, mc] = poe(s, 0, 'Murderous Cut', 'hand'); for (let i = 0; i < 4; i++) [s] = poe(s, 0, 'Forest', 'graveyard'); s = terras(s, 'Swamp', 1);
  const g0 = s.zones[0].graveyard.length; const a = legais(s, 0, x => x.t === 'cast' && x.oid === mc && x.targets[0].oid === u); assert.ok(a.length > 0, 'com um Pântano e quatro no cemitério');
  s = tudo(act(s, a[0])); assert.equal(s.objects[u].zone, 'graveyard'); assert.equal(s.zones[0].graveyard.length, g0 - 4 + 1);
});

test("LT143 · Keening Banshee dá -2/-2 ao entrar; Flesh to Dust destrói; Kodama's Might dá +2/+2", () => {
  let s = mesa(), kb, u; [s, u] = poe(s, 1, 'Urso'); [s, kb] = poe(s, 0, 'Keening Banshee', 'hand'); s = terras(s, 'Swamp', 4);
  s = resolveCom(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === kb)[0]), u); assert.equal(s.objects[u].zone, 'graveyard');
  let t = mesa(), fd, u2; [t, u2] = poe(t, 1, 'Urso'); [t, fd] = poe(t, 0, 'Flesh to Dust', 'hand'); t = terras(t, 'Swamp', 5);
  t = tudo(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === fd && a.targets[0].oid === u2)[0])); assert.equal(t.objects[u2].zone, 'graveyard');
  let q = mesa(), km, u3; [q, u3] = poe(q, 1, 'Urso'); [q, km] = poe(q, 0, "Kodama's Might", 'hand'); q = terras(q, 'Forest', 1);
  q = tudo(act(q, legais(q, 0, a => a.t === 'cast' && a.oid === km && a.targets[0].oid === u3)[0])); assert.equal(E.stats(q, q.objects[u3]).power, 4); assert.equal(E.stats(q, q.objects[u3]).toughness, 4);
});

test('LT143 · Divine Favor: ganha 3 e +1/+3; Dragon Blood põe um marcador +1/+1', () => {
  let s = mesa(), df, tb; [s, tb] = poe(s, 0, 'Territorial Baloth'); [s, df] = poe(s, 0, 'Divine Favor', 'hand'); s = terras(s, 'Plains', 2);
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === df && a.targets[0].oid === tb)[0]));
  assert.equal(s.players[0].life, 23); assert.equal(E.stats(s, s.objects[tb]).power, 5); assert.equal(E.stats(s, s.objects[tb]).toughness, 7);
  let t = mesa(), db, t2; [t, t2] = poe(t, 0, 'Territorial Baloth'); [t, db] = poe(t, 0, 'Dragon Blood'); t = terras(t, 'Forest', 3);
  t = tudo(act(t, legais(t, 0, a => a.t === 'activate' && a.oid === db && a.targets[0].oid === t2)[0])); assert.equal((t.objects[t2].counters || {}).p1p1, 1);
});

test('LT143 · Territorial Baloth: landfall dá +2/+2 até o fim do turno; Jayemdae Tome compra', () => {
  let s = mesa(), tb, f; [s, tb] = poe(s, 0, 'Territorial Baloth'); [s, f] = poe(s, 0, 'Forest', 'hand');
  s = tudo(act(s, legais(s, 0, a => a.t === 'play_land' && a.oid === f)[0])); assert.equal(E.stats(s, s.objects[tb]).power, 6);
  let t = mesa(), jt; [t, jt] = poe(t, 0, 'Jayemdae Tome'); t = terras(t, 'Island', 4); const m0 = t.zones[0].hand.length;
  t = tudo(act(t, legais(t, 0, a => a.t === 'activate' && a.oid === jt)[0])); assert.equal(t.zones[0].hand.length, m0 + 1);
});

test('LT143 · Roar of the Wurm cria um 6/6 e volta do cemitério com lampejo do passado {3}{G}', () => {
  let s = mesa(), rw; [s, rw] = poe(s, 0, 'Roar of the Wurm', 'graveyard'); s = terras(s, 'Forest', 4);
  const fb = legais(s, 0, a => a.oid === rw); assert.ok(fb.length > 0); s = tudo(act(s, fb[0]));
  assert.equal(s.objects[rw].zone, 'exile'); const f = s.zones[0].battlefield.filter(x => s.objects[x].token); assert.equal(f.length, 1); assert.equal(E.stats(s, s.objects[f[0]]).power, 6);
});
