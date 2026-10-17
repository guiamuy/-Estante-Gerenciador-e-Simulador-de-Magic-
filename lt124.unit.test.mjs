// M-442 · LT108 · Codespell Cleric ("Vigilance / When this creature enters, if it was the second spell you cast this turn, put a +1/+1 counter on target
// creature."). Texto da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json), caminho de produção (APROVADAS). Condição nova `segundaMagiaDoTurno`
// (603.4; a ordem da mágica entre as do jogador no turno fica marcada nela e vai com ela ao campo). Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const c0 = OF.find(x => x.name === 'Codespell Cleric');
const C = { 'Codespell Cleric': { name: c0.name, type_line: c0.type_line, mana_cost: c0.mana_cost, cmc: 1, keywords: ['Vigilance'], oracle_text: c0.oracle_text, colors: ['W'], power: c0.power, toughness: c0.toughness },
  'Lightning Bolt': { name: 'Lightning Bolt', type_line: 'Instant', mana_cost: '{R}', cmc: 1, keywords: [], oracle_text: 'Lightning Bolt deals 3 damage to any target.', colors: ['R'] }, // .listas/oficiais.json
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Plains: { name: 'Plains', type_line: 'Basic Land — Plains', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {W}.)', colors: [] },
  Mountain: { name: 'Mountain', type_line: 'Basic Land — Mountain', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {R}.)', colors: [] } };
function mesa(seed = 51) {
  const b = ns => ns.map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b(['Codespell Cleric', 'Lightning Bolt', 'Urso', 'Plains', 'Mountain']) }, { name: 'B', deck: b(['Lightning Bolt', 'Urso', 'Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => { for (let i = 0; i < 60; i++) { if (s.pending && s.pending.kind !== 'priority') { s = act(s, legais(s, s.pending.p)[0]); continue; } if (s.stack.length) { s = passaAte(s, x => !x.stack.length || (!!x.pending && x.pending.kind !== 'priority'), 40); continue; }
  if (s.queued && s.queued.length) { const f = s.zones[0].battlefield.find(o => /Plains|Mountain/.test(s.objects[o].name) && !s.objects[o].tapped); s = act(s, { t: 'tap_mana', p: 0, oid: f, option: 0 }); continue; } return s; } return s; };
function cena() { let s = mesa(), cc, lb, u; [s, u] = poe(s, 0, 'Urso'); [s, cc] = poe(s, 0, 'Codespell Cleric', 'hand'); [s, lb] = poe(s, 0, 'Lightning Bolt', 'hand'); for (let i = 0; i < 3; i++) { [s] = poe(s, 0, 'Plains'); [s] = poe(s, 0, 'Mountain'); } return { s, cc, lb, u }; }
const marcadores = (s, o) => (s.objects[o].counters || {}).p1p1 || 0;
const totalP1 = s => s.zones[0].battlefield.reduce((n, o) => n + marcadores(s, o), 0);

test('LT108 · Codespell Cleric joga pelo leitor aprovado', () => {
  assert.equal(S.coverage(C['Codespell Cleric']).level, 'completo'); assert.equal(S.APROVADAS['Codespell Cleric'].leva, 'M-442');
});

test('LT108 · segunda mágica sua no turno: põe +1/+1 numa criatura; primeira: nada', () => {
  let { s, cc, lb } = cena(); let t = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === cc)[0])); assert.equal(totalP1(t), 0, 'primeira mágica');
  ({ s, cc, lb } = cena()); s = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === lb && a.targets && a.targets[0].player === 1)[0]));
  t = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === cc)[0])); assert.equal(totalP1(t), 1, 'segunda mágica');
});

test('LT108 · a mágica do oponente não conta (a contagem é sua); terceira mágica: nada', () => {
  let { s, cc, lb } = cena(); let ob; s = J(s); [s, ob] = poe(s, 1, 'Lightning Bolt', 'hand'); [s] = poe(s, 1, 'Mountain');
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === lb && a.targets && a.targets[0].player === 1)[0]);
  s = passaAte(s, x => x.turn.priority === 1, 5); s = act(s, legais(s, 1, a => a.t === 'cast' && a.oid === ob && a.targets && a.targets[0].player === 0)[0]); s = resolve(s);
  let t = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === cc)[0])); assert.equal(totalP1(t), 1, 'é a sua segunda, mesmo com a do oponente no meio');
  let g = cena(), lb2; let x = resolve(act(g.s, legais(g.s, 0, a => a.t === 'cast' && a.oid === g.lb && a.targets && a.targets[0].player === 1)[0])); [x, lb2] = poe(x, 0, 'Lightning Bolt', 'hand');
  x = resolve(act(x, legais(x, 0, a => a.t === 'cast' && a.oid === lb2 && a.targets && a.targets[0].player === 1)[0]));
  x = resolve(act(x, legais(x, 0, a => a.t === 'cast' && a.oid === g.cc)[0])); assert.equal(totalP1(x), 0, 'terceira mágica');
});
