// M-529 · LT191 · revisão por lote CLXVII (textos da Scryfall de 19/10/2026): Disintegrate ("If it's a creature, it can't be regenerated this
// turn, and if it would die this turn, exile it instead": 701.15c e 614.1a, valem o turno inteiro) e Alabaster Potion (o X na vida e no
// escudo de prevenção, 615.7). Falham no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Disintegrate', 'Alabaster Potion'];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))] }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Mountain: terra('Mountain', 'Mountain', 'R'), Plains: terra('Plains', 'Plains', 'W'), Forest: terra('Forest', 'Forest', 'G'),
  'Lightning Bolt': { name: 'Lightning Bolt', type_line: 'Instant', mana_cost: '{R}', cmc: 1, keywords: [], oracle_text: 'Lightning Bolt deals 3 damage to any target.', colors: ['R'] },
  Andarilho: { name: 'Andarilho', type_line: 'Legendary Planeswalker — Teste', mana_cost: '{3}', cmc: 3, keywords: [], oracle_text: '', loyalty: '5', colors: [] },
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', power: '2', toughness: '2', colors: ['G'] } });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: /Land/.test(C[name].type_line) ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 211, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Lightning Bolt', 'Mountain', 'Plains', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Andarilho', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };
const limpa = s => passaAte(s, x => !x.stack.length && !x.pending && !(x.queued || []).length);
const conj = (s, oid, f) => { const a = legais(s, 0, x => x.t === 'cast' && x.oid === oid && f(x))[0]; assert.ok(a, 'conjurar ' + s.objects[oid].name); return act(s, a); };
const alvoOid = (oid, x) => a => a.x === x && a.targets && a.targets[0] && a.targets[0].oid === oid;

test('M-529 · Disintegrate: X de dano; a criatura que morreria é exilada', () => {
  let s = mesa(), d, u; [s, d] = poe(s, 0, 'Disintegrate', 'hand'); s = terras(s, 'Mountain', 4); [s, u] = poe(s, 1, 'Urso');
  s = limpa(conj(s, d, alvoOid(u, 3))); assert.equal(s.objects[u].zone, 'exile');
  let t = mesa(), d2; [t, d2] = poe(t, 0, 'Disintegrate', 'hand'); t = terras(t, 'Mountain', 4); const v = t.players[1].life;
  t = limpa(conj(t, d2, a => a.x === 3 && a.targets && a.targets[0] && a.targets[0].player === 1)); assert.equal(t.players[1].life, v - 3, 'no jogador: só o dano');
});

test('M-529 · Disintegrate: não pode ser regenerada neste turno, e o exílio vale o turno inteiro', () => {
  let s = mesa(), d, u; [s, d] = poe(s, 0, 'Disintegrate', 'hand'); s = terras(s, 'Mountain', 4); [s, u] = poe(s, 1, 'Urso');
  s = J(s); s.objects[u].regenerar = 1; s = limpa(conj(s, d, alvoOid(u, 2))); assert.equal(s.objects[u].zone, 'exile', 'o escudo de regeneração não salva');
  let t = mesa(), d2, u2, lb; [t, d2] = poe(t, 0, 'Disintegrate', 'hand'); [t, lb] = poe(t, 0, 'Lightning Bolt', 'hand'); t = terras(t, 'Mountain', 3); [t, u2] = poe(t, 1, 'Urso');
  t = limpa(conj(t, d2, alvoOid(u2, 1))); assert.equal(t.objects[u2].zone, 'battlefield', '1 de dano: sobrevive');
  t = J(t); t.objects[u2].regenerar = 1; t = limpa(conj(t, lb, a => a.targets && a.targets[0] && a.targets[0].oid === u2));
  assert.equal(t.objects[u2].zone, 'exile', 'mais tarde no turno: sem regenerar e exilada');
});

test('M-529 · Alabaster Potion: o jogador alvo ganha X, ou previne os próximos X de dano', () => {
  let s = mesa(), ap; [s, ap] = poe(s, 0, 'Alabaster Potion', 'hand'); s = terras(s, 'Plains', 5); const v = s.players[0].life;
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === ap && a.x === 3 && (a.mode === 0 || (a.modes && a.modes[0] === 0)) && a.targets && a.targets[0] && a.targets[0].player === 0)[0]);
  s = limpa(s); assert.equal(s.players[0].life, v + 3);
  let t = mesa(), a2, lb; [t, a2] = poe(t, 0, 'Alabaster Potion', 'hand'); [t, lb] = poe(t, 0, 'Lightning Bolt', 'hand'); t = terras(t, 'Plains', 4); const w = t.players[1].life;
  t = act(t, legais(t, 0, a => a.t === 'cast' && a.oid === a2 && a.x === 2 && (a.mode === 1 || (a.modes && a.modes[0] === 1)) && a.targets && a.targets[0] && a.targets[0].player === 1)[0]); t = limpa(t); [t] = poe(t, 0, 'Mountain');
  t = limpa(conj(t, lb, a => a.targets && a.targets[0] && a.targets[0].player === 1)); assert.equal(t.players[1].life, w - 1, '3 do Raio, 2 prevenidos');
});

test('M-529 · Disintegrate num planeswalker: só o dano ("se for criatura"); morrer mais tarde no turno vai ao cemitério (achado da revisão)', () => {
  let s = mesa(), d, pw, lb; [s, d] = poe(s, 0, 'Disintegrate', 'hand'); [s, lb] = poe(s, 0, 'Lightning Bolt', 'hand'); s = terras(s, 'Mountain', 4); [s, pw] = poe(s, 1, 'Andarilho');
  s = J(s); s.objects[pw].counters = { ...(s.objects[pw].counters || {}), loyalty: 5 };
  s = limpa(conj(s, d, alvoOid(pw, 2))); assert.equal(s.objects[pw].zone, 'battlefield'); assert.equal(s.objects[pw].counters.loyalty, 3);
  s = limpa(conj(s, lb, a => a.targets && a.targets[0] && a.targets[0].oid === pw)); assert.equal(s.objects[pw].zone, 'graveyard');
});
