// T-128 · CR5 · "Exile up to two target cards from a single graveyard" (115.1, 601.2c/603.3d, 608.2b) e o presságio Dusk Sight (720):
// Feral Deathgorger // Dusk Sight. Texto oficial em .listas/oficiais-tipos.json (Scryfall, consulta de 17/10/2026, rulings de 04/04/2025).
// "Urso", "Pedra", "Exila" são cartas de teste.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, valorDeMana, palavrasDoTexto } from './listas.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const FD = 'Feral Deathgorger';
const C = {};
for (const c of L('oficiais-tipos.json').filter(x => x.name === FD))
  C[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: palavrasDoTexto(c.oracle_text), oracle_text: c.oracle_text, colors: ['B'], power: c.power, toughness: c.toughness };
C.Swamp = { name: 'Swamp', type_line: 'Basic Land — Swamp', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {B}.)', colors: [] };
const carta = (name, type_line, extra = {}) => { C[name] = { name, type_line, mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra }; };
carta('Urso', 'Creature — Bear', { power: '2', toughness: '2' }); carta('Pedra', 'Artifact'); carta('Exila', 'Instant');
const SCRIPTS = { 'Exila': { name: 'Exila', effects: [{ do: 'mover', target: { zona: 'graveyard' }, para: 'exile' }], example: { target: 'none', expect: { selfLife: 0 } } } };
function mesa(seed = 1) {
  const deck = [...Object.keys(C).filter(n => n !== 'Swamp').map(name => ({ name, qty: 4, zone: 'main' })), { name: 'Swamp', qty: 16, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p = 0, n = 9) => { s = J(s); for (const c of 'WUBRGC') s.players[p].pool[c] += n; return s; };
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
/** Cemitérios: A com Urso e Pedra; B com Urso e Pedra. */
function cemiterios(s) { const g = {}; for (const [p, k] of [[0, 'a'], [1, 'b']]) { let u, r; [s, u] = poe(s, p, 'Urso', 'graveyard'); [s, r] = poe(s, p, 'Pedra', 'graveyard'); g[k + 'u'] = u; g[k + 'p'] = r; } return [s, g]; }
/** Conjura o dragão e para na primeira escolha de alvo do gatilho de entrada. */
function entra(s) { let d; [s, d] = poe(s, 0, FD, 'hand'); s = mana(s); s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === d && !x.omen)[0]); return [passaAte(s, x => !!x.pending), d]; }
const escolhe = (s, oid) => { const i = s.pending.options.findIndex(o => o.oid === oid); assert.ok(i >= 0, `${oid} entre as opções`); return act(s, { t: 'pick_target', p: s.pending.p, index: i }); };
const nenhum = s => act(s, { t: 'pick_target', p: s.pending.p, nenhum: true });
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending);
const ids = s => s.pending.options.map(o => o.oid).sort();

test('CR 115.1 / 601.2c · Feral Deathgorger (texto oficial): voar e toque mortífero; ao entrar exila até duas cartas de UM cemitério — o segundo alvo só do cemitério do primeiro', () => {
  let s = mesa(); let g; [s, g] = cemiterios(s);
  let d; [s, d] = entra(s);
  eq(s.pending.kind, 'pick_target'); eq(ids(s), [g.au, g.ap, g.bu, g.bp].sort(), 'o primeiro: de qualquer cemitério');
  s = escolhe(s, g.bu);
  eq(ids(s), [g.bp], 'o segundo: só o cemitério de B');
  s = escolhe(s, g.bp); s = resolve(s);
  eq([g.bu, g.bp, g.au, g.ap].map(o => s.objects[o].zone), ['exile', 'exile', 'graveyard', 'graveyard']);
  assert.ok(E.hasKeyword(s, s.objects[d], 'flying') && E.hasKeyword(s, s.objects[d], 'deathtouch'));
  eq([E.stats(s, s.objects[d]).power, E.stats(s, s.objects[d]).toughness], [3, 5]);
});

test('CR 115.1 · Feral Deathgorger: "up to two" — nenhum alvo, ou só um', () => {
  let s = mesa(); let g; [s, g] = cemiterios(s);
  [s] = entra(s); s = nenhum(s); if (s.pending && s.pending.kind === 'pick_target') s = nenhum(s); s = resolve(s);
  eq([g.au, g.ap, g.bu, g.bp].map(o => s.objects[o].zone), ['graveyard', 'graveyard', 'graveyard', 'graveyard'], 'nenhum');
  [s] = entra(s); s = escolhe(s, g.ap); s = nenhum(s); s = resolve(s);
  eq([g.ap, g.au].map(o => s.objects[o].zone), ['exile', 'graveyard'], 'só um');
});

test('CR 608.2b · Feral Deathgorger: um dos alvos sai do cemitério antes da resolução — o outro é exilado mesmo assim', () => {
  let s = mesa(); let g; [s, g] = cemiterios(s);
  [s] = entra(s); s = escolhe(s, g.au); s = escolhe(s, g.ap);
  s = passaAte(s, x => x.stack.some(i => x.objects[i].ability) || !!x.pending);
  let e; [s, e] = poe(s, 0, 'Exila', 'hand'); s = mana(s);
  s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === e && (x.targets || []).some(t => t.oid === g.au))[0]);
  s = resolve(s);
  eq([g.au, g.ap].map(o => s.objects[o].zone), ['exile', 'exile']);
});

test('CR 720.3 · Dusk Sight (presságio, texto oficial): {1}{B}, um marcador +1/+1 em até uma criatura alvo, compra uma carta e a carta volta embaralhada ao grimório', () => {
  let s = mesa(); let u; [s, u] = poe(s, 0, 'Urso');
  let d; [s, d] = poe(s, 0, FD, 'hand'); s = J(s); s.players[0].pool.B += 2;
  const om = legais(s, 0, x => x.t === 'cast' && x.oid === d && x.omen && (x.targets || []).some(t => t.oid === u));
  assert.ok(om.length, 'conjura o presságio por {1}{B}');
  const mao = s.zones[0].hand.length;
  s = resolve(act(s, om[0]));
  eq([s.objects[u].counters.p1p1 || 0, s.zones[0].hand.length, s.objects[d].zone], [1, mao, 'library'], 'marcador, a compra repõe a carta que saiu da mão, e ela no grimório');
});

test('CR 720.3 / 115.1 · Dusk Sight sem alvo ("up to one"): só compra, e volta ao grimório', () => {
  let s = mesa();
  let d; [s, d] = poe(s, 0, FD, 'hand'); s = J(s); s.players[0].pool.B += 2;
  for (const o of s.zones[0].battlefield.concat(s.zones[1].battlefield)) if (s.objects[o].power != null || /Creature/.test((C[s.objects[o].name] || {}).type_line || '')) throw new Error('mesa com criatura');
  const om = legais(s, 0, x => x.t === 'cast' && x.oid === d && x.omen);
  assert.ok(om.length);
  const mao = s.zones[0].hand.length;
  s = resolve(act(s, om[0]));
  eq([s.zones[0].hand.length, s.objects[d].zone], [mao, 'library']);
});
