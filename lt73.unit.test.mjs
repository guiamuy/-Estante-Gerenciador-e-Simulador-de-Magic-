// M-390 · LT57 · Ethereal Haze: "Prevent all damage that would be dealt by creatures this turn." (Oracle do Forge, consulta de 12/10/2026;
// .listas/oficiais-revisadas.json), caminho de produção (APROVADAS). 615.1: escudo de todos, só para fonte que é criatura. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, act, poe, legais, passaAte, CARTAS } from './cmd.mjs';
import { valorDeMana, palavrasDoTexto } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const r = OF.find(x => x.name === 'Ethereal Haze');
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: valorDeMana(mana_cost), keywords: [], oracle_text: '', colors: [], ...extra });
const CARDS = { ...CARTAS, 'Ethereal Haze': { name: r.name, type_line: r.type_line, mana_cost: r.mana_cost, cmc: valorDeMana(r.mana_cost), keywords: palavrasDoTexto(r.oracle_text), oracle_text: r.oracle_text, colors: ['W'] },
  Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2', colors: ['G'] }) };
function mesa() {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 41, mode: 'full', cards: CARDS, first: 1,
    players: [{ name: 'A', deck: baralho(['Ethereal Haze', 'Lightning Bolt', 'Plains', 'Mountain']) }, { name: 'B', deck: baralho(['Urso', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending);

test('LT57 · Ethereal Haze: o Urso atacante não causa dano; o Lightning Bolt (fonte que não é criatura) ainda causa; no turno seguinte o escudo acabou', () => {
  let s = mesa(), h, b, u; [s, h] = poe(s, 0, 'Ethereal Haze', 'hand'); [s, b] = poe(s, 0, 'Lightning Bolt', 'hand'); [s] = poe(s, 0, 'Plains'); [s] = poe(s, 0, 'Mountain'); [s, u] = poe(s, 1, 'Urso');
  s = passaAte(s, x => !!x.pending && x.pending.kind === 'attackers');
  s = act(s, { t: 'attack', p: 1, attackers: [u] });
  s = passaAte(s, x => x.turn.priority === 0 && legais(x, 0, a => a.t === 'cast' && a.oid === h).length > 0);
  assert.ok(s.objects[u].attacking != null, 'o Urso está atacando');
  s = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === h)[0]));
  const antes = s.players[0].life; assert.equal(antes, 20);
  s = passaAte(s, x => x.turn.step === 'main2' || x.turn.active === 0);
  assert.equal(s.players[0].life, antes, 'o Urso não causou dano');
  s = passaAte(s, x => x.turn.priority === 0 && legais(x, 0, a => a.t === 'cast' && a.oid === b).length > 0);
  s = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === b && a.targets[0].player === 1)[0]));
  assert.equal(s.players[1].life, 17, 'o Bolt causou 3');
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1');
  assert.ok(!(s.prevencoes || []).length, 'o escudo acabou na limpeza');
});

test('LT57 · achado da revisão (113.7a): a habilidade de uma ficha de criatura que deixou de existir (704.5d) continua sendo dano de criatura', () => {
  const pp = OF.find(x => x.name === 'Prodigal Pyromancer');
  const CARDS2 = { ...CARDS, 'Prodigal Pyromancer': { name: pp.name, type_line: pp.type_line, mana_cost: pp.mana_cost, cmc: valorDeMana(pp.mana_cost), keywords: palavrasDoTexto(pp.oracle_text), oracle_text: pp.oracle_text, colors: ['R'], power: pp.power, toughness: pp.toughness } };
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 43, mode: 'full', cards: CARDS2, first: 0,
    players: [{ name: 'A', deck: baralho(['Ethereal Haze', 'Prodigal Pyromancer', 'Plains']) }, { name: 'B', deck: baralho(['Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  let h, pi; [s, h] = poe(s, 0, 'Ethereal Haze', 'hand'); [s] = poe(s, 0, 'Plains'); [s, pi] = poe(s, 0, 'Prodigal Pyromancer', 'battlefield', { token: true });
  s = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === h)[0]));
  s = act(s, legais(s, 0, a => a.t === 'activate' && a.oid === pi && a.targets && a.targets[0].player === 1)[0]);
  s = JSON.parse(JSON.stringify(s)); s.zones[0].battlefield = s.zones[0].battlefield.filter(x => x !== pi); delete s.objects[pi]; // a ficha saiu e deixou de existir antes de a habilidade resolver
  s = resolve(s); assert.equal(s.players[1].life, 20, 'o dano da ficha de criatura foi prevenido');
});
