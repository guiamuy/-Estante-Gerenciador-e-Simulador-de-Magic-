// M-383 · LT50 · Ride's End: "This spell costs {3} less to cast if it targets a tapped permanent. Exile target creature or Vehicle." (Oracle do
// Forge, consulta de 12/10/2026; .listas/oficiais-revisadas.json), caminho de produção (APROVADAS). Os testes falham no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, act, poe, legais, passaAte, CARTAS } from './cmd.mjs';
import { valorDeMana, palavrasDoTexto } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const r = OF.find(x => x.name === "Ride's End");
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: valorDeMana(mana_cost), keywords: [], oracle_text: '', colors: [], ...extra });
const CARDS = { ...CARTAS, "Ride's End": { name: r.name, type_line: r.type_line, mana_cost: r.mana_cost, cmc: valorDeMana(r.mana_cost), keywords: palavrasDoTexto(r.oracle_text), oracle_text: r.oracle_text, colors: ['W'] },
  Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2', colors: ['G'] }), Carroca: c0('Carroca', 'Artifact — Vehicle', '{2}', { power: '3', toughness: '3' }) };
function mesa() {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 13, mode: 'full', cards: CARDS, first: 0,
    players: [{ name: 'A', deck: baralho(["Ride's End", 'Plains']) }, { name: 'B', deck: baralho(['Urso', 'Carroca', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending);

test("LT50 · Ride's End com duas Planícies: mira o Urso virado ({4}{W} − {3}) e o exila; o Urso desvirado não é oferecido com essa mana", () => {
  let s = mesa(), re, u1, u2; [s, re] = poe(s, 0, "Ride's End", 'hand'); [s] = poe(s, 0, 'Plains'); [s] = poe(s, 0, 'Plains');
  [s, u1] = poe(s, 1, 'Urso'); [s, u2] = poe(s, 1, 'Urso'); s.objects[u1].tapped = true;
  const alvos = legais(s, 0, a => a.t === 'cast' && a.oid === re).map(a => a.targets[0].oid);
  assert.ok(alvos.includes(u1), 'o virado custa {1}{W}'); assert.ok(!alvos.includes(u2), 'o desvirado custa {4}{W}');
  s = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === re && a.targets[0].oid === u1)[0])); assert.equal(s.objects[u1].zone, 'exile');
});

test("LT50 · Ride's End mira Veículo (mesmo sem ser criatura) e criatura; o Veículo tripulado aparece uma vez só", () => {
  let s = mesa(), re, c; [s, re] = poe(s, 0, "Ride's End", 'hand'); for (let i = 0; i < 5; i++) [s] = poe(s, 0, 'Plains'); [s, c] = poe(s, 1, 'Carroca');
  const alvos = legais(s, 0, a => a.t === 'cast' && a.oid === re).map(a => a.targets[0].oid);
  assert.equal(alvos.filter(x => x === c).length, 1, 'o Veículo é alvo');
});
