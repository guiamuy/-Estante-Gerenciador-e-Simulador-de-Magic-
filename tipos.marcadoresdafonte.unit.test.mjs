// T-115 · CR5 · "When this creature dies, put its counters on target creature you control" (603.10a, 122.1, 702.165 reforço).
// Texto da regra: .regras/cr-2026-09-25.txt. Carta com o texto oficial de .listas/oficiais-tipos.json (Scryfall, consulta de 17/10/2026,
// com os rulings de 14/04/2023): Enduring Bondwarden. "Urso", "Choque" e "Murcha" são cartas de teste.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S as SC, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const EB = 'Enduring Bondwarden';
const C = {};
for (const c of L('oficiais-tipos.json').filter(x => x.name === EB))
  C[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: ['Backup'], oracle_text: c.oracle_text, colors: ['W'], power: c.power, toughness: c.toughness };
C.Plains = { name: 'Plains', type_line: 'Basic Land — Plains', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {W}.)', colors: [] };
const carta = (name, type_line, extra = {}) => { C[name] = { name, type_line, mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra }; };
carta('Urso', 'Creature — Bear', { power: '2', toughness: '2' }); carta('Choque', 'Instant'); carta('Murcha', 'Instant');
const EX = { example: { target: 'opponent', expect: { selfLife: 0 } } };
const SCRIPTS = {
  'Choque': { name: 'Choque', effects: [{ do: 'damage', amount: 3, target: 'creature' }], ...EX },
  'Murcha': { name: 'Murcha', effects: [{ do: 'counters', amount: 1, tipo: 'm1m1', target: 'creature' }], ...EX },
};
function mesa(seed = 1) {
  const deck = [...Object.keys(C).filter(n => n !== 'Plains').map(name => ({ name, qty: 3, zone: 'main' })), { name: 'Plains', qty: 16, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p = 0, n = 9) => { s = J(s); for (const c of 'WUBRGC') s.players[p].pool[c] += n; return s; };
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending);
const lanca = (s, nome, alvo, p = 0) => { let c; [s, c] = poe(s, p, nome, 'hand'); s = mana(s, p); const a = legais(s, p, x => x.t === 'cast' && x.oid === c && (x.targets || []).some(t => t.oid === alvo))[0]; assert.ok(a, nome); return act(s, a); };
const escolheAlvo = (s, oid) => { const a = legais(s, s.pending.p, x => (x.targets || []).some(t => t.oid === oid) || x.oid === oid)[0]; assert.ok(a, 'alvo do gatilho'); return act(s, a); };
const k = (s, oid, t = 'p1p1') => (s.objects[oid].counters || {})[t] || 0;

test('CR 603.10a · Enduring Bondwarden (texto oficial): ao morrer com marcadores +1/+1, põe o mesmo número na criatura alvo que você controla', () => {
  let s = mesa(); let eb, u; [s, u] = poe(s, 0, 'Urso'); [s, eb] = poe(s, 0, EB, 'battlefield', { counters: { p1p1: 2 } });
  s = resolve(lanca(s, 'Choque', eb));
  eq(s.objects[eb].zone, 'graveyard');
  if (s.pending) s = escolheAlvo(s, u); s = resolve(s);
  eq(k(s, u), 2);
});

test('CR 122.1 · ruling de 14/04/2023: todos os tipos de marcador que ela tinha, inclusive −1/−1 (o que pode matar quem recebe); não é mover', () => {
  let s = mesa(); let eb, u; [s, u] = poe(s, 0, 'Urso'); [s, eb] = poe(s, 0, EB, 'battlefield', { counters: { p1p1: 3, m1m1: 2, charge: 1 } });
  s = resolve(lanca(s, 'Choque', eb));
  if (s.pending) s = escolheAlvo(s, u); s = resolve(s);
  eq([k(s, u), k(s, u, 'm1m1'), k(s, u, 'charge')], [1, 0, 1], 'três +1/+1, dois −1/−1 (anulam-se, 704.5q) e um de carga');
  let z = mesa(); let e2, w; [z, w] = poe(z, 0, 'Urso'); [z, e2] = poe(z, 0, EB);
  z = resolve(lanca(z, 'Murcha', e2)); // 0/1 com um −1/−1 morre
  if (z.pending) z = escolheAlvo(z, w); z = resolve(z);
  const st = E.stats(z, z.objects[w]);
  eq([z.objects[e2].zone, k(z, w, 'm1m1'), st.power, st.toughness], ['graveyard', 1, 1, 1], 'o −1/−1 que a matou também vai para o Urso');
});

test('CR 603.10a · sem marcador ao morrer, o gatilho resolve sem nada; o alvo é só criatura sua', () => {
  let s = mesa(); let eb, u, v; [s, u] = poe(s, 0, 'Urso'); [s, v] = poe(s, 1, 'Urso'); [s, eb] = poe(s, 0, EB, 'battlefield', { counters: { p1p1: 1 } });
  s = resolve(lanca(s, 'Choque', eb));
  if (s.pending) { const alvos = legais(s, s.pending.p).flatMap(x => (x.targets || []).map(t => t.oid)); eq(alvos.includes(v), false, 'criatura do oponente não é alvo'); s = escolheAlvo(s, u); }
  s = resolve(s);
  eq([k(s, u), k(s, v)], [1, 0]);
  let z = mesa(); let e2, w; [z, w] = poe(z, 0, 'Urso'); [z, e2] = poe(z, 0, EB);
  z = resolve(lanca(z, 'Choque', e2)); if (z.pending) z = escolheAlvo(z, w); z = resolve(z);
  eq(k(z, w), 0);
});
