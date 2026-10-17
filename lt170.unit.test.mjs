// M-488 · LT154 · revisão por lote CXXX: nove cartas que o leitor já lia por inteiro e que travam as listas iniciantes passam a jogar (APROVADAS).
// Textos da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json). Cobertura completa e o comportamento das frases que pedem. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Ancient Craving', 'Returned Centaur', 'Weight of the Underworld', 'Wall of Fire', 'Searing Spear', 'Dimir Guildmage', 'Last Gasp', 'Vedalken Entrancer', 'Rain of Tears'];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [/^Flying/m.test(c.oracle_text) && 'Flying', /^Defender/m.test(c.oracle_text) && 'Defender', /^Defender/m.test(c.oracle_text) && 'Defender'].filter(Boolean), oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Reliquia: { name: 'Reliquia', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] }, Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Mountain: terra('Mountain', 'Mountain', 'R'), Plains: terra('Plains', 'Plains', 'W'), Island: terra('Island', 'Island', 'U'), Swamp: terra('Swamp', 'Swamp', 'B'), Forest: terra('Forest', 'Forest', 'G') });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: C[name].type_line.startsWith('Basic Land') ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 158, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Mountain', 'Plains', 'Island', 'Swamp', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Forest', 'Island', 'Reliquia']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const tudo = s => { for (let i = 0; i < 80 && (s.stack.length || s.pending); i++) { const pk = s.pending; const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pass') || l[0]); } return s; };
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };


const resolveCom = (s, quer) => { for (let i = 0; i < 60 && (s.stack.length || s.pending); i++) { const pk = s.pending; if (pk && pk.kind === 'pick_target') { s = act(s, { t: 'pick_target', p: pk.p, index: Math.max(0, pk.options.findIndex(o => quer === 'p1' ? o.player === 1 : o.oid === quer)) }); continue; } const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pass') || l[0]); } return s; };

test('LT154 · as nove jogam pelo leitor aprovado', () => {
  for (const n of NOMES) { assert.equal(S.coverage(C[n]).level, 'completo', n); assert.equal(S.APROVADAS[n].leva, 'M-488', n); }
});

test('LT154 · Ancient Craving compra três e perde 3; Searing Spear causa 3; Rain of Tears destrói o terreno alvo', () => {
  let s = mesa(), ac; [s, ac] = poe(s, 0, 'Ancient Craving', 'hand'); s = terras(s, 'Swamp', 4); const m0 = s.zones[0].hand.length;
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === ac)[0])); assert.equal(s.zones[0].hand.length, m0 - 1 + 3); assert.equal(s.players[0].life, 17);
  let t = mesa(), ss; [t, ss] = poe(t, 0, 'Searing Spear', 'hand'); t = terras(t, 'Mountain', 2);
  t = tudo(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === ss && a.targets[0].player === 1)[0])); assert.equal(t.players[1].life, 17);
  let q = mesa(), rt, fo; [q, fo] = poe(q, 1, 'Forest'); [q, rt] = poe(q, 0, 'Rain of Tears', 'hand'); q = terras(q, 'Swamp', 3);
  q = tudo(act(q, legais(q, 0, a => a.t === 'cast' && a.oid === rt && a.targets[0].oid === fo)[0])); assert.equal(q.objects[fo].zone, 'graveyard');
});

test('LT154 · Returned Centaur: o jogador alvo mói quatro; Vedalken Entrancer: {U},{T} mói dois', () => {
  let s = mesa(), rc; [s, rc] = poe(s, 0, 'Returned Centaur', 'hand'); s = terras(s, 'Swamp', 4); const g0 = s.zones[1].graveyard.length;
  s = resolveCom(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === rc)[0]), 'p1'); assert.equal(s.zones[1].graveyard.length, g0 + 4);
  let t = mesa(), ve; [t, ve] = poe(t, 0, 'Vedalken Entrancer'); t = terras(t, 'Island', 1); t = J(t); t.objects[ve].sick = false; const g1 = t.zones[1].graveyard.length;
  t = tudo(act(t, legais(t, 0, a => a.t === 'activate' && a.oid === ve && a.targets && a.targets[0].player === 1)[0])); assert.equal(t.zones[1].graveyard.length, g1 + 2);
});

test('LT154 · Dimir Guildmage: o alvo compra ({3}{U}) ou descarta e escolhe ({3}{B}), só como feitiço', () => {
  let s = mesa(), dg; [s, dg] = poe(s, 0, 'Dimir Guildmage'); s = terras(s, 'Island', 4); s = terras(s, 'Swamp', 4); const h1 = s.zones[1].hand.length, h0 = s.zones[0].hand.length;
  const compra = tudo(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === dg && a.index === 0 && a.targets[0].player === 0)[0])); assert.equal(compra.zones[0].hand.length, h0 + 1);
  let d = act(s, legais(s, 0, a => a.t === 'activate' && a.oid === dg && a.index === 1 && a.targets[0].player === 1)[0]); d = act(act(d, { t: 'pass', p: 0 }), { t: 'pass', p: 1 });
  assert.equal(d.pending && d.pending.kind, 'discard'); assert.equal(d.pending.p, 1, 'o jogador alvo escolhe'); d = tudo(d); assert.equal(d.zones[1].hand.length, h1 - 1);
  let o = J(s); o.stack = []; o.turn.step = 'combat_begin'; assert.equal(legais(o, 0, a => a.t === 'activate' && a.oid === dg).length, 0, 'fora da fase principal não');
});

test('LT154 · Weight of the Underworld (-3/-2) e Last Gasp (-3/-3) matam o Urso; Wall of Fire tem defensor e {R}: +1/+0', () => {
  let s = mesa(), wu, u; [s, u] = poe(s, 1, 'Urso'); [s, wu] = poe(s, 0, 'Weight of the Underworld', 'hand'); s = terras(s, 'Swamp', 4);
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === wu && a.targets[0].oid === u)[0])); assert.equal(s.objects[u].zone, 'graveyard');
  let t = mesa(), lg, u2; [t, u2] = poe(t, 1, 'Urso'); [t, lg] = poe(t, 0, 'Last Gasp', 'hand'); t = terras(t, 'Swamp', 2);
  t = tudo(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === lg && a.targets[0].oid === u2)[0])); assert.equal(t.objects[u2].zone, 'graveyard');
  let q = mesa(), wf; [q, wf] = poe(q, 0, 'Wall of Fire'); q = terras(q, 'Mountain', 2); q = J(q); q.objects[wf].sick = false;
  assert.ok(!E.eligibleAttackers(q, 0).includes(wf), 'defensor'); q = tudo(act(q, legais(q, 0, a => a.t === 'activate' && a.oid === wf)[0])); assert.equal(E.stats(q, q.objects[wf]).power, 1);
});
