// M-392 · LT59 · 702.188 · Web-slinging: "Web-slinging {W} (You may cast this spell for {W} if you also return a tapped creature you control to its
// owner's hand.)" — Spider-Man, Web-Slinger (Oracle do Forge, consulta de 12/10/2026; .listas/oficiais-revisadas.json), caminho de produção (APROVADAS).
// Custo alternativo (118.9) com custo de devolver (601.2h). Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, act, poe, legais, passaAte, CARTAS } from './cmd.mjs';
import { valorDeMana, palavrasDoTexto } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const r = OF.find(x => x.name === 'Spider-Man, Web-Slinger');
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: valorDeMana(mana_cost), keywords: [], oracle_text: '', colors: [], ...extra });
const CARDS = { ...CARTAS, [r.name]: { name: r.name, type_line: r.type_line, mana_cost: r.mana_cost, cmc: valorDeMana(r.mana_cost), keywords: palavrasDoTexto(r.oracle_text), oracle_text: r.oracle_text, colors: ['W'], power: r.power, toughness: r.toughness },
  Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2', colors: ['G'] }), Pedra: c0('Pedra', 'Artifact', '{1}') };
function mesa() {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 53, mode: 'full', cards: CARDS, first: 0,
    players: [{ name: 'A', deck: baralho([r.name, 'Urso', 'Pedra', 'Plains']) }, { name: 'B', deck: baralho(['Urso', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending);

test('LT59 · Spider-Man por {W}: devolve uma criatura virada sua (uma ação por criatura virada); sem criatura virada sua, só o custo normal', () => {
  let s = mesa(), sp, u1, u2, ub, pe; [s, sp] = poe(s, 0, r.name, 'hand'); [s] = poe(s, 0, 'Plains'); [s, u1] = poe(s, 0, 'Urso', 'battlefield', { tapped: true }); [s, u2] = poe(s, 0, 'Urso');
  [s, pe] = poe(s, 0, 'Pedra', 'battlefield', { tapped: true }); [s, ub] = poe(s, 1, 'Urso', 'battlefield', { tapped: true });
  const alt = legais(s, 0, a => a.t === 'cast' && a.oid === sp && a.alt != null);
  assert.deepEqual([...alt.map(a => a.pay.devolve)], [u1], 'só o Urso virado seu (não o desvirado, não o artefato, não o do oponente)');
  s = resolve(act(s, alt[0]));
  assert.equal(s.objects[sp].zone, 'battlefield'); assert.equal(s.objects[u1].zone, 'hand', 'o Urso voltou para a mão do dono');
  assert.throws(() => E.apply(mesa(), { ...alt[0] }));
  let t = mesa(), sp2; [t, sp2] = poe(t, 0, r.name, 'hand'); [t] = poe(t, 0, 'Plains'); [t] = poe(t, 0, 'Urso');
  assert.equal(legais(t, 0, a => a.t === 'cast' && a.oid === sp2 && a.alt != null).length, 0, 'sem criatura virada, sem teia');
});
