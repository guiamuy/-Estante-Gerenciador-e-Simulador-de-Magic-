// M-461 · LT127 · Lifecrafter's Gift ("Put a +1/+1 counter on target creature, then put a +1/+1 counter on each creature you control with a +1/+1
// counter on it."). Texto da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json), caminho de produção (APROVADAS). Pedido da trilha
// `listas`. Seletor novo `comMarcador` (os marcadores de agora, depois da primeira frase). Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const c0 = OF.find(x => x.name === "Lifecrafter's Gift");
const C = { "Lifecrafter's Gift": { name: c0.name, type_line: c0.type_line, mana_cost: c0.mana_cost, cmc: 4, keywords: [], oracle_text: c0.oracle_text, colors: ['G'] },
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Forest: { name: 'Forest', type_line: 'Basic Land — Forest', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {G}.)', colors: [] } };
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 101, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b(["Lifecrafter's Gift", 'Urso', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const m = (s, o) => (s.objects[o].counters || {}).p1p1 || 0;

test("LT127 · Lifecrafter's Gift joga pelo leitor aprovado", () => {
  assert.equal(S.coverage(C["Lifecrafter's Gift"]).level, 'completo'); assert.equal(S.APROVADAS["Lifecrafter's Gift"].leva, 'M-461');
});

test('LT127 · o alvo seu ganha dois; a sua com marcador ganha mais um; a sua sem marcador e a do oponente com marcador, nada', () => {
  let s = mesa(), g, a, b, c, d; [s, g] = poe(s, 0, "Lifecrafter's Gift", 'hand'); [s, a] = poe(s, 0, 'Urso'); [s, b] = poe(s, 0, 'Urso'); [s, c] = poe(s, 0, 'Urso'); [s, d] = poe(s, 1, 'Urso');
  for (let i = 0; i < 4; i++) [s] = poe(s, 0, 'Forest');
  s = J(s); s.objects[b].counters = { p1p1: 1 }; s.objects[d].counters = { p1p1: 1 };
  s = passaAte(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === g && x.targets[0].oid === a)[0]), x => !x.stack.length && !x.pending, 40);
  assert.deepEqual([m(s, a), m(s, b), m(s, c), m(s, d)], [2, 2, 0, 1]);
});
