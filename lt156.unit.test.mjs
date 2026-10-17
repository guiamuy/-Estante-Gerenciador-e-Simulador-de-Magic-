// M-474 · LT140 · revisão por lote CXX: nove cartas que o leitor já lia por inteiro e que travam as listas iniciantes passam a jogar (APROVADAS).
// Textos da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json). Cobertura completa e o comportamento das frases que pedem. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Aethersnipe', 'Faerie Mechanist', 'Civic Wayfinder', 'Omenspeaker', "Jace's Ingenuity", 'Magma Spray', 'Flames of the Firebrand', 'Krosan Tusker', 'Beast Attack'];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [/^Flying/m.test(c.oracle_text) && 'Flying', /^Evoke/m.test(c.oracle_text) && 'Evoke', /^Cycling/m.test(c.oracle_text) && 'Cycling', /^Flashback/m.test(c.oracle_text) && 'Flashback'].filter(Boolean), oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Mountain: terra('Mountain', 'Mountain', 'R'), Plains: terra('Plains', 'Plains', 'W'), Island: terra('Island', 'Island', 'U'), Swamp: terra('Swamp', 'Swamp', 'B'), Forest: terra('Forest', 'Forest', 'G') });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: C[name].type_line.startsWith('Basic Land') ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 144, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Mountain', 'Plains', 'Island', 'Swamp', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const tudo = s => { for (let i = 0; i < 80 && (s.stack.length || s.pending); i++) { const pk = s.pending; const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pass') || l[0]); } return s; };
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };


const resolveCom = (s, quer) => { for (let i = 0; i < 60 && (s.stack.length || s.pending); i++) { const pk = s.pending; if (pk && pk.kind === 'pick_target') { s = act(s, { t: 'pick_target', p: pk.p, index: Math.max(0, pk.options.findIndex(o => o.oid === quer)) }); continue; } const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'yes' || x.t === 'accept' || x.t === 'pay') || l.find(x => x.t === 'pass') || l[0]); } return s; };

test('LT140 · as nove jogam pelo leitor aprovado', () => {
  for (const n of NOMES) { assert.equal(S.coverage(C[n]).level, 'completo', n); assert.equal(S.APROVADAS[n].leva, 'M-474', n); }
});

test('LT140 · Aethersnipe evocada por {1}{U}{U}: devolve a permanente não terreno alvo e é sacrificada', () => {
  let s = mesa(), ae, u; [s, u] = poe(s, 1, 'Urso'); [s, ae] = poe(s, 0, 'Aethersnipe', 'hand'); s = terras(s, 'Island', 3);
  const ev = legais(s, 0, a => a.t === 'cast' && a.oid === ae); assert.ok(ev.length > 0, 'evocar com três Ilhas');
  s = resolveCom(act(s, ev[0]), u);
  assert.equal(s.objects[ae].zone, 'graveyard', 'sacrificada'); assert.equal(s.objects[u].zone, 'hand');
});

test('LT140 · Magma Spray: 2 de dano e, se morrer, vai para o exílio; Flames of the Firebrand divide 3', () => {
  let s = mesa(), ms, u; [s, u] = poe(s, 1, 'Urso'); [s, ms] = poe(s, 0, 'Magma Spray', 'hand'); s = terras(s, 'Mountain', 1);
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === ms && a.targets[0].oid === u)[0])); assert.equal(s.objects[u].zone, 'exile');
  let t = mesa(), fl; [t, fl] = poe(t, 0, 'Flames of the Firebrand', 'hand'); t = terras(t, 'Mountain', 3);
  t = tudo(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === fl)[0]));
  assert.equal(t.objects[fl].zone, 'graveyard'); assert.equal((20 - t.players[1].life) + (20 - t.players[0].life), 3);
});

test("LT140 · Jace's Ingenuity compra três; Omenspeaker faz vidência 2; Beast Attack cria um 4/4 e volta do cemitério com lampejo do passado", () => {
  let s = mesa(), ji; [s, ji] = poe(s, 0, "Jace's Ingenuity", 'hand'); s = terras(s, 'Island', 5); const m0 = s.zones[0].hand.length;
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === ji)[0])); assert.equal(s.zones[0].hand.length, m0 - 1 + 3);
  let o = mesa(), om; [o, om] = poe(o, 0, 'Omenspeaker', 'hand'); o = terras(o, 'Island', 2);
  o = act(o, legais(o, 0, a => a.t === 'cast' && a.oid === om)[0]); const kinds = [];
  for (let i = 0; i < 40 && (o.stack.length || o.pending); i++) { const pk = o.pending; if (pk) kinds.push(JSON.stringify(pk).slice(0, 160)); const l = legais(o, pk ? pk.p : o.turn.priority); o = act(o, l.find(x => x.t === 'pass') || l[0]); }
  assert.ok(kinds.some(k => /scry/.test(k)), 'pede a vidência: ' + kinds.join(','));
  let t = mesa(), ba; [t, ba] = poe(t, 0, 'Beast Attack', 'graveyard'); t = terras(t, 'Forest', 5);
  const fb = legais(t, 0, a => a.oid === ba); assert.ok(fb.length > 0, 'lampejo do passado');
  t = tudo(act(t, fb[0])); assert.equal(t.objects[ba].zone, 'exile');
  const fichas = t.zones[0].battlefield.filter(x => t.objects[x].token); assert.equal(fichas.length, 1); assert.equal(E.stats(t, t.objects[fichas[0]]).power, 4);
});

test('LT140 · Civic Wayfinder busca um terreno básico para a mão (opcional); Krosan Tusker recicla e o gatilho resolve antes da compra', () => {
  let s = mesa(), cw; [s, cw] = poe(s, 0, 'Civic Wayfinder', 'hand'); s = terras(s, 'Forest', 3); const m0 = s.zones[0].hand.length;
  s = resolveCom(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === cw)[0]));
  assert.equal(s.zones[0].hand.length, m0 - 1 + 1); assert.ok(/Basic Land/.test(C[s.objects[s.zones[0].hand.at(-1)].name].type_line), 'terreno básico na mão');
  let t = mesa(), kt; [t, kt] = poe(t, 0, 'Krosan Tusker', 'hand'); t = terras(t, 'Forest', 3); const n0 = t.zones[0].hand.length;
  t = act(t, legais(t, 0, a => a.t === 'cycle' && a.oid === kt)[0]);
  assert.equal(t.objects[kt].zone, 'graveyard');
  assert.equal(t.stack.length, 2, 'reciclagem e o gatilho na pilha');
  let u = act(act(t, { t: 'pass', p: 0 }), { t: 'pass', p: 1 });
  assert.ok(u.pending && u.pending.p === 0, 'o gatilho (busca opcional) resolve primeiro'); assert.equal(u.zones[0].hand.length, n0 - 1, 'ainda sem a compra');
  t = resolveCom(t); assert.equal(t.zones[0].hand.length, n0 - 1 + 2, 'terreno e a carta comprada');
});
