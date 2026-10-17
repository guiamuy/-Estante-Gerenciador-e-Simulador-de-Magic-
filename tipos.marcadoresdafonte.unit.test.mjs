// T-115 · CR5 · "When this creature dies, put its counters on target creature you control" (603.10a, 122.1, 702.165 reforço).
// Texto da regra: .regras/cr-2026-09-25.txt. Carta com o texto oficial de .listas/oficiais-tipos.json (Scryfall, consulta de 17/10/2026,
// com os rulings de 14/04/2023): Enduring Bondwarden; T-120: Iron Apprentice (Scryfall, 17/10/2026, rulings de 18/02/2022). "Urso", "Choque" e "Murcha" são cartas de teste.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S as SC, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const EB = 'Enduring Bondwarden', IA = 'Iron Apprentice';
const C = {};
for (const c of L('oficiais-tipos.json').filter(x => [EB, IA].includes(x.name)))
  C[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: c.name === EB ? ['Backup'] : [], oracle_text: c.oracle_text, colors: c.name === EB ? ['W'] : [], power: c.power, toughness: c.toughness };
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

test('CR 603.4 · Iron Apprentice (texto oficial): entra com um +1/+1; ao morrer, "if it had counters on it", põe esses marcadores na criatura alvo sua', () => {
  let s = mesa(); let u, ia; [s, u] = poe(s, 0, 'Urso'); [s, ia] = poe(s, 0, IA, 'hand'); s = mana(s);
  s = resolve(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === ia)[0]));
  const st = E.stats(s, s.objects[ia]); eq([s.objects[ia].counters.p1p1, st.power, st.toughness], [1, 1, 1]);
  s = resolve(lanca(s, 'Choque', ia));
  if (s.pending) s = escolheAlvo(s, u); s = resolve(s);
  eq(k(s, u), 1);
});

test('CR 704.3 / 704.5q · auditoria D1 (T-125): Iron Apprentice morto por um −1/−1 morre com os dois marcadores (anular e morrer são simultâneos) — o gatilho dispara e o alvo recebe +1/+1 e −1/−1', () => {
  let s = mesa(); let u, ia; [s, u] = poe(s, 0, 'Urso'); [s, ia] = poe(s, 0, IA, 'hand'); s = mana(s);
  s = resolve(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === ia)[0]));
  s = lanca(s, 'Murcha', ia); const murcha = s.stack.at(-1);
  s = passaAte(s, x => !x.stack.includes(murcha) || !!x.pending);
  eq([s.objects[ia].zone, J(s.objects[ia].ultima.counters)], ['graveyard', { p1p1: 1, m1m1: 1 }]);
  assert.ok(s.pending || s.stack.some(x => s.objects[x].name === IA), 'o gatilho disparou');
  if (s.pending) s = escolheAlvo(s, u); s = resolve(s);
  const st = E.stats(s, s.objects[u]); eq([st.power, st.toughness], [2, 2], 'os dois chegam ao Urso e se anulam');
});

test('CR 603.10a · auditoria D2 (T-125): a foto vai com o gatilho — Iron Apprentice com três marcadores que volta ao campo antes de o gatilho resolver ainda dá três', () => {
  let s = mesa(); let u, ia; [s, u] = poe(s, 0, 'Urso'); [s, ia] = poe(s, 0, IA, 'battlefield', { counters: { p1p1: 3 } });
  s = lanca(s, 'Choque', ia); const ch = s.stack.at(-1); // 3/3 com 3 de dano morre
  s = passaAte(s, x => !x.stack.includes(ch) || !!x.pending);
  if (s.pending) s = escolheAlvo(s, u);
  assert.ok(s.stack.some(x => s.objects[x].name === IA), 'o gatilho está na pilha');
  s = J(s); const gy = s.zones[0].graveyard; gy.splice(gy.indexOf(ia), 1); s.zones[0].battlefield.push(ia); Object.assign(s.objects[ia], { zone: 'battlefield', zc: (s.objects[ia].zc || 0) + 1, counters: { p1p1: 1 } }); delete s.objects[ia].ultima;
  s = resolve(s);
  eq(k(s, u), 3);
});
