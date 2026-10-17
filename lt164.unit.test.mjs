// M-482 · LT148 · revisão por lote CXXVI: nove cartas que o leitor já lia por inteiro e que travam as listas iniciantes passam a jogar (APROVADAS).
// Textos da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json). Cobertura completa e o comportamento das frases que pedem. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Skarrg, the Rage Pits', 'Vulshok Sorcerer', 'Skeleton Archer', 'Vampire Interloper', 'Pulse Tracker', 'Blighted Fen', "Demon's Grasp", 'Foul Orchard', 'Destructive Revelry'];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [/^Flying/m.test(c.oracle_text) && 'Flying', /^Haste$/m.test(c.oracle_text) && 'Haste', /^Flashback/m.test(c.oracle_text) && 'Flashback'].filter(Boolean), oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Reliquia: { name: 'Reliquia', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] }, Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Mountain: terra('Mountain', 'Mountain', 'R'), Plains: terra('Plains', 'Plains', 'W'), Island: terra('Island', 'Island', 'U'), Swamp: terra('Swamp', 'Swamp', 'B'), Forest: terra('Forest', 'Forest', 'G') });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: C[name].type_line.startsWith('Basic Land') ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 152, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Mountain', 'Plains', 'Island', 'Swamp', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Forest', 'Vampire Interloper', 'Reliquia']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const tudo = s => { for (let i = 0; i < 80 && (s.stack.length || s.pending); i++) { const pk = s.pending; const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pass') || l[0]); } return s; };
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };


const resolveCom = (s, quer) => { for (let i = 0; i < 60 && (s.stack.length || s.pending); i++) { const pk = s.pending; if (pk && pk.kind === 'pick_target') { s = act(s, { t: 'pick_target', p: pk.p, index: Math.max(0, pk.options.findIndex(o => quer === 'p1' ? o.player === 1 : o.oid === quer)) }); continue; } const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pass') || l[0]); } return s; };

test('LT148 · as nove jogam pelo leitor aprovado', () => {
  for (const n of NOMES) { assert.equal(S.coverage(C[n]).level, 'completo', n); assert.equal(S.APROVADAS[n].leva, 'M-482', n); }
});

test('LT148 · Destructive Revelry destrói o artefato ou encantamento e causa 2 ao controlador dele', () => {
  let s = mesa(), dr, rl; [s, rl] = poe(s, 1, 'Reliquia'); [s, dr] = poe(s, 0, 'Destructive Revelry', 'hand'); s = terras(s, 'Mountain', 1); s = terras(s, 'Forest', 1);
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === dr && a.targets[0].oid === rl)[0]));
  assert.equal(s.objects[rl].zone, 'graveyard'); assert.equal(s.players[1].life, 18); assert.equal(s.players[0].life, 20);
});

test('LT148 · Vulshok Sorcerer (ímpeto) causa 1 com {T}; Skeleton Archer causa 1 ao entrar', () => {
  let s = mesa(), vs; [s, vs] = poe(s, 0, 'Vulshok Sorcerer', 'hand'); s = terras(s, 'Mountain', 3);
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === vs)[0]));
  s = tudo(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === vs && a.targets && a.targets[0].player === 1)[0])); assert.equal(s.players[1].life, 19, 'ativou no turno em que entrou');
  let t = mesa(), sa; [t, sa] = poe(t, 0, 'Skeleton Archer', 'hand'); t = terras(t, 'Swamp', 4);
  t = resolveCom(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === sa)[0]), 'p1'); assert.equal(t.players[1].life, 19);
});

test("LT148 · Blighted Fen: o oponente sacrifica uma criatura; Demon's Grasp dá -5/-5", () => {
  let s = mesa(), bf, u; [s, bf] = poe(s, 0, 'Blighted Fen'); [s, u] = poe(s, 1, 'Urso'); s = terras(s, 'Swamp', 5);
  s = tudo(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === bf && (!a.targets || a.targets[0].player === 1))[0])); assert.equal(s.objects[u].zone, 'graveyard'); assert.equal(s.objects[bf].zone, 'graveyard');
  let t = mesa(), dg, u2; [t, u2] = poe(t, 1, 'Urso'); [t, dg] = poe(t, 0, "Demon's Grasp", 'hand'); t = terras(t, 'Swamp', 5);
  t = tudo(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === dg && a.targets[0].oid === u2)[0])); assert.equal(t.objects[u2].zone, 'graveyard');
});

test('LT148 · Skarrg dá +1/+1 e atropelar; Foul Orchard entra virado; Vampire Interloper não bloqueia', () => {
  let s = mesa(), sk, vs; [s, sk] = poe(s, 0, 'Skarrg, the Rage Pits'); [s, vs] = poe(s, 0, 'Vulshok Sorcerer'); s = terras(s, 'Mountain', 1); s = terras(s, 'Forest', 1);
  s = tudo(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === sk && a.targets && a.targets[0].oid === vs)[0])); assert.equal(E.stats(s, s.objects[vs]).power, 2); assert.ok(E.hasKeyword(s, s.objects[vs], 'trample'));
  let t = mesa(), fo; [t, fo] = poe(t, 0, 'Foul Orchard', 'hand'); t = tudo(act(t, legais(t, 0, a => a.t === 'play_land' && a.oid === fo)[0])); assert.ok(t.objects[fo].tapped);
  let q = mesa(), vi; [q, vi] = poe(q, 1, 'Vampire Interloper'); assert.ok(!E.eligibleBlockers(q, 1).includes(vi));
});

test('LT148 · Pulse Tracker: ao atacar, cada oponente perde 1', () => {
  let s = mesa(), pt; [s, pt] = poe(s, 0, 'Pulse Tracker'); s = J(s); s.objects[pt].sick = false;
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers', 20);
  s = act(s, legais(s, 0, a => a.t === 'attack' && (a.attackers || []).length === 1)[0] || { t: 'attack', p: 0, attackers: [pt] });
  s = passaAte(s, x => x.turn.step === 'main2', 30); assert.equal(s.players[1].life, 18, 'perde 1 e toma 1 de combate');
});
