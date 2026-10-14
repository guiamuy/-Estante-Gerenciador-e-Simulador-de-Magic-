// M-399 · LT66 · Temur Battle Rage: "Target creature gains double strike until end of turn. Ferocious — That creature also gains trample until end
// of turn if you control a creature with power 4 or greater." (Oracle do Forge, consulta de 12/10/2026; .listas/oficiais-revisadas.json), caminho
// de produção (APROVADAS). A ferocidade é conferida na resolução. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, act, poe, legais, passaAte, CARTAS } from './cmd.mjs';
import { valorDeMana, palavrasDoTexto } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const r = OF.find(x => x.name === 'Temur Battle Rage');
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: valorDeMana(mana_cost), keywords: [], oracle_text: '', colors: [], ...extra });
const CARDS = { ...CARTAS, 'Temur Battle Rage': { name: r.name, type_line: r.type_line, mana_cost: r.mana_cost, cmc: valorDeMana(r.mana_cost), keywords: palavrasDoTexto(r.oracle_text), oracle_text: r.oracle_text, colors: ['R'] },
  Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2', colors: ['G'] }), Gigante: c0('Gigante', 'Creature — Giant', '{3}{G}', { power: '4', toughness: '4', colors: ['G'] }) };
function mesa() {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 83, mode: 'full', cards: CARDS, first: 0,
    players: [{ name: 'A', deck: baralho(['Temur Battle Rage', 'Urso', 'Gigante', 'Mountain']) }, { name: 'B', deck: baralho(['Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending);
const tem = (s, oid, k) => E.hasKeyword(s, s.objects[oid], k);

test('LT66 · Temur Battle Rage: golpe duplo sempre; atropelar só se você controla criatura de poder 4 ou mais', () => {
  let s = mesa(), t, u; [s, t] = poe(s, 0, 'Temur Battle Rage', 'hand'); for (let i = 0; i < 2; i++) [s] = poe(s, 0, 'Mountain'); [s, u] = poe(s, 0, 'Urso');
  let s1 = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === t && a.targets[0].oid === u)[0]));
  assert.ok(tem(s1, u, 'double strike')); assert.ok(!tem(s1, u, 'trample'), 'sem ferocidade');
  let g; [s, g] = poe(s, 0, 'Gigante');
  let s2 = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === t && a.targets[0].oid === u)[0]));
  assert.ok(tem(s2, u, 'double strike') && tem(s2, u, 'trample'), 'com o Gigante 4/4');
});
