// M-387 · LT54 · Gorilla Shaman: "{X}{X}{1}: Destroy target noncreature artifact with mana value X." (Oracle do Forge, consulta de 12/10/2026;
// .listas/oficiais-revisadas.json), caminho de produção (APROVADAS). 107.3a/601.2c: o alvo depende do X escolhido ao ativar. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, act, poe, legais, passaAte, CARTAS } from './cmd.mjs';
import { valorDeMana, palavrasDoTexto } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const r = OF.find(x => x.name === 'Gorilla Shaman');
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: valorDeMana(mana_cost), keywords: [], oracle_text: '', colors: [], ...extra });
const CARDS = { ...CARTAS, 'Gorilla Shaman': { name: r.name, type_line: r.type_line, mana_cost: r.mana_cost, cmc: valorDeMana(r.mana_cost), keywords: palavrasDoTexto(r.oracle_text), oracle_text: r.oracle_text, colors: ['R'], power: r.power || '1', toughness: r.toughness || '1' },
  Pedra: c0('Pedra', 'Artifact', '{1}'), Rocha: c0('Rocha', 'Artifact', '{2}'), Golem: c0('Golem', 'Artifact Creature — Golem', '{1}', { power: '1', toughness: '1' }) };
function mesa() {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 29, mode: 'full', cards: CARDS, first: 0,
    players: [{ name: 'A', deck: baralho(['Gorilla Shaman', 'Mountain']) }, { name: 'B', deck: baralho(['Pedra', 'Rocha', 'Golem', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending);

test('LT54 · Gorilla Shaman com 3 Montanhas: X = 1 mira só o artefato de valor 1 (não a criatura-artefato, nem o de valor 2) e o destrói; X errado é recusado', () => {
  let s = mesa(), g, pe, ro, go; [s, g] = poe(s, 0, 'Gorilla Shaman'); for (let i = 0; i < 3; i++) [s] = poe(s, 0, 'Mountain'); [s, pe] = poe(s, 1, 'Pedra'); [s, ro] = poe(s, 1, 'Rocha'); [s, go] = poe(s, 1, 'Golem');
  const os = legais(s, 0, a => a.t === 'activate' && a.oid === g);
  assert.ok(os.length && os.every(a => a.targets[0].oid === pe && a.x === 1), 'só Pedra com X = 1: ' + JSON.stringify(os));
  assert.throws(() => E.apply(s, { ...os[0], x: 0 }), /alvo/);
  s = resolve(act(s, os[0])); assert.equal(s.objects[pe].zone, 'graveyard'); assert.equal(s.objects[ro].zone, 'battlefield'); assert.equal(s.objects[go].zone, 'battlefield');
});

test('LT54 · com 5 Montanhas, X = 2 alcança a Rocha', () => {
  let s = mesa(), g, ro; [s, g] = poe(s, 0, 'Gorilla Shaman'); for (let i = 0; i < 5; i++) [s] = poe(s, 0, 'Mountain'); [s] = poe(s, 1, 'Pedra'); [s, ro] = poe(s, 1, 'Rocha');
  const a = legais(s, 0, x => x.t === 'activate' && x.oid === g && x.targets[0].oid === ro)[0];
  assert.ok(a && a.x === 2, JSON.stringify(a)); s = resolve(act(s, a)); assert.equal(s.objects[ro].zone, 'graveyard');
});
