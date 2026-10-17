// M-417 · LT83 · Cabal Ritual: "Add {B}{B}{B}. Threshold — Add {B}{B}{B}{B}{B} instead if there are seven or more cards in your graveyard." (texto da Scryfall
// de 17/10/2026 UTC, .listas/oficiais-revisadas.json), caminho de produção (APROVADAS). O limiar (207.2c) é contado no começo da resolução; a mágica na pilha
// não conta. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const c0 = OF.find(x => x.name === 'Cabal Ritual');
const C = { 'Cabal Ritual': { name: c0.name, type_line: c0.type_line, mana_cost: c0.mana_cost, cmc: 2, keywords: [], oracle_text: c0.oracle_text, colors: ['B'] },
  Swamp: { name: 'Swamp', type_line: 'Basic Land — Swamp', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {B}.)', colors: [] },
  Pedra: { name: 'Pedra', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] } };
function mesa(seed = 21) {
  const b = ns => ns.map(name => ({ name, qty: 12, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b(['Cabal Ritual', 'Swamp', 'Pedra']) }, { name: 'B', deck: b(['Swamp']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending);
const ritual = n => { let s = mesa(), cr; [s, cr] = poe(s, 0, 'Cabal Ritual', 'hand'); for (let i = 0; i < 2; i++) [s] = poe(s, 0, 'Swamp'); for (let i = 0; i < n; i++) [s] = poe(s, 0, 'Pedra', 'graveyard');
  const a = legais(s, 0, x => x.t === 'cast' && x.oid === cr)[0]; assert.ok(a); return resolve(act(s, a)); };

test('LT83 · Cabal Ritual joga pelo leitor aprovado', () => {
  assert.equal(S.coverage(C['Cabal Ritual']).level, 'completo'); assert.equal(S.APROVADAS['Cabal Ritual'].leva, 'M-417');
});

test('LT83 · {B}{B}{B} sem limiar; {B}{B}{B}{B}{B} (e só isso) com sete cartas no cemitério; a própria mágica não conta', () => {
  assert.equal(ritual(0).players[0].pool.B, 3);
  assert.equal(ritual(6).players[0].pool.B, 3, 'seis no cemitério: a mágica na pilha não conta');
  assert.equal(ritual(7).players[0].pool.B, 5, 'com limiar: troca, não soma');
});

test('LT83 · a pilha explicada diz as duas manas e a condição', async () => {
  const { loadModules } = await import('./_load.mjs'); const M = loadModules();
  const d = M.table.descreveEfeitos([{ do: 'add_mana', symbols: ['B', 'B', 'B'], onlyIf: 'sem-limiar' }, { do: 'add_mana', symbols: ['B', 'B', 'B', 'B', 'B'], onlyIf: 'threshold' }]);
  assert.match(d, /sem limiar/); assert.match(d, /com limiar/);
});
