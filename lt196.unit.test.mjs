// M-514 · Pegasus Guardian // Rescue the Foal (texto da Scryfall de 18/10/2026, .listas/oficiais-motor.json): Aventura (715) que pisca uma
// criatura sua, e o gatilho do passo final com "if" intermediário de revolta (603.4) — "if a permanent you controlled left the battlefield
// this turn". Falham no motor anterior (a carta não tinha script; a condição não existia).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte } from './listas.mjs';
import { loadModules } from './_load.mjs';
const { leitor: L } = loadModules();
const PG = JSON.parse(readFileSync(new URL('./.listas/oficiais-motor.json', import.meta.url), 'utf8')).cartas.find(c => c.name === 'Pegasus Guardian');
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
const C = {
  'Pegasus Guardian': { name: PG.name, type_line: PG.type_line, mana_cost: PG.mana_cost, cmc: 6, keywords: ['Flying'], oracle_text: PG.oracle_text, colors: ['W'], power: PG.power, toughness: PG.toughness },
  'Lightning Bolt': { name: 'Lightning Bolt', type_line: 'Instant', mana_cost: '{R}', cmc: 1, keywords: [], oracle_text: 'Lightning Bolt deals 3 damage to any target.', colors: ['R'] },
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', power: '2', toughness: '2', colors: ['G'] },
  Plains: terra('Plains', 'Plains', 'W'), Mountain: terra('Mountain', 'Mountain', 'R'), Forest: terra('Forest', 'Forest', 'G') };
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: /Land/.test(C[name].type_line) ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 196, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b(['Pegasus Guardian', 'Lightning Bolt', 'Urso', 'Plains', 'Mountain']) }, { name: 'B', deck: b(['Urso', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };
const pegasos = (s, p = 0) => s.zones[p].battlefield.filter(o => s.objects[o].name === 'Pegasus' && s.objects[o].token).length;
/** Passa até o fim do turno de A (o gatilho do passo final já resolvido) — para no começo do turno seguinte. */
const fimDoTurno = s => { const n = s.turn.number; return passaAte(s, x => x.turn.number > n); };
const limpa = s => passaAte(s, x => !x.stack.length && !x.pending);

test('M-514 · sem permanente sua saindo do campo no turno, o Pegasus Guardian não cria ficha', () => {
  let s = mesa(); [s] = poe(s, 0, 'Pegasus Guardian'); [s] = poe(s, 0, 'Urso');
  s = fimDoTurno(s); assert.equal(pegasos(s), 0);
});

test('M-514 · Rescue the Foal (Aventura) pisca a criatura: ela sai e volta, a carta vai ao exílio e, no passo final, nasce um Pégaso 1/1 voador', () => {
  let s = mesa(), pg, u; [s, pg] = poe(s, 0, 'Pegasus Guardian', 'hand'); [s, u] = poe(s, 0, 'Urso'); s = terras(s, 'Plains', 8);
  const z0 = s.objects[u].zc || 0;
  const a = legais(s, 0, x => x.t === 'cast' && x.oid === pg && x.omen && x.targets && x.targets[0].oid === u)[0]; assert.ok(a, 'a Aventura mira criatura sua');
  s = limpa(act(s, a));
  assert.equal(s.objects[u].zone, 'battlefield'); assert.notEqual(s.objects[u].zc || 0, z0, 'objeto novo (400.7)');
  assert.equal(s.objects[pg].zone, 'exile', 'Aventura resolvida vai ao exílio (715.4)');
  assert.ok(legais(s, 0, x => x.t === 'cast' && x.oid === pg && !x.omen).length, 'do exílio, o Pegasus Guardian');
  s = limpa(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === pg && !x.omen)[0])); assert.equal(s.objects[pg].zone, 'battlefield');
  s = fimDoTurno(s); assert.equal(pegasos(s), 1);
  const t = s.zones[0].battlefield.find(o => s.objects[o].name === 'Pegasus'); const st = E.stats(s, s.objects[t]); assert.equal(st.power, 1); assert.equal(st.toughness, 1);
  assert.ok(E.hasKeyword(s, s.objects[t], 'flying'));
});

test('M-514 · conta permanente que você controlava; permanente do oponente não conta; vale só no turno', () => {
  let s = mesa(), b, u; [s] = poe(s, 0, 'Pegasus Guardian'); [s, u] = poe(s, 1, 'Urso'); [s, b] = poe(s, 0, 'Lightning Bolt', 'hand'); s = terras(s, 'Mountain', 1);
  s = limpa(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === b && x.targets && x.targets[0].oid === u)[0])); assert.equal(s.objects[u].zone, 'graveyard');
  s = fimDoTurno(s); assert.equal(pegasos(s), 0, 'o Urso do oponente não conta');
  let t = mesa(), b2, u2; [t] = poe(t, 0, 'Pegasus Guardian'); [t, u2] = poe(t, 0, 'Urso'); [t, b2] = poe(t, 0, 'Lightning Bolt', 'hand'); t = terras(t, 'Mountain', 1);
  t = limpa(act(t, legais(t, 0, x => x.t === 'cast' && x.oid === b2 && x.targets && x.targets[0].oid === u2)[0]));
  t = fimDoTurno(t); assert.equal(pegasos(t), 1, 'o seu Urso morreu: uma ficha');
  t = passaAte(t, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending); t = fimDoTurno(t); assert.equal(pegasos(t), 1, 'no turno seguinte, sem nova saída, nada');
});

test('M-514 · leitor lê a condição de revolta no gatilho', () => {
  const r = L.ler({ name: 'Teste', type_line: 'Creature — Test', mana_cost: '{1}{B}', oracle_text: 'Revolt — When this creature enters, if a permanent you controlled left the battlefield this turn, draw a card.' });
  assert.equal(r.completa, true); assert.deepEqual(JSON.parse(JSON.stringify(r.script.abilities[0].condition)), { saiuPermanenteNoTurno: true });
});
