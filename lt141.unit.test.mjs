// M-459 · LT125 · Wargling ("Ferocious — Whenever this creature attacks while you control a creature with power 4 or greater, until end of turn, this
// creature gets +1/+0 and creatures you control gain trample."). Texto da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json), caminho de
// produção (APROVADAS). Pedido da trilha `listas`. Condição da M-455; frase nova do efeito (611.2c: as suas criaturas daquele momento). Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const c0 = OF.find(x => x.name === 'Wargling');
const cr = (name, p, t) => ({ name, type_line: 'Creature — Test', mana_cost: '{2}', cmc: 2, keywords: [], oracle_text: '', colors: [], power: String(p), toughness: String(t) });
const C = { Wargling: { name: c0.name, type_line: c0.type_line, mana_cost: c0.mana_cost, cmc: 2, keywords: ['Ferocious'], oracle_text: c0.oracle_text, colors: ['G'], power: c0.power, toughness: c0.toughness },
  Gigante: cr('Gigante', 4, 4), Urso: cr('Urso', 3, 3),
  Forest: { name: 'Forest', type_line: 'Basic Land — Forest', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {G}.)', colors: [] } };
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 89, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b(['Wargling', 'Gigante', 'Urso', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const ataque = s => passaAte(s, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 0);

test('LT125 · Wargling joga pelo leitor aprovado', () => {
  assert.equal(S.coverage(C.Wargling).level, 'completo'); assert.equal(S.APROVADAS.Wargling.leva, 'M-459');
});

test('LT125 · ataca com o Gigante no campo: Wargling 3/2 e as suas com atropelar até o fim do turno; a do oponente não', () => {
  let s = mesa(), w, g, ui; [s, w] = poe(s, 0, 'Wargling'); [s, g] = poe(s, 0, 'Gigante'); [s, ui] = poe(s, 1, 'Urso'); s = J(s); s.objects[w].sick = false;
  s = act(ataque(s), { t: 'attack', p: 0, attackers: [w] }); s = passaAte(s, x => !x.stack.length && !x.pending, 40);
  assert.equal(E.stats(s, s.objects[w]).power, 3);
  assert.ok(E.hasKeyword(s, s.objects[w], 'trample') && E.hasKeyword(s, s.objects[g], 'trample')); assert.ok(!E.hasKeyword(s, s.objects[ui], 'trample'));
});

test('LT125 · sem criatura de poder 4: nada', () => {
  let s = mesa(), w, u; [s, w] = poe(s, 0, 'Wargling'); [s, u] = poe(s, 0, 'Urso'); s = J(s); s.objects[w].sick = false;
  s = act(ataque(s), { t: 'attack', p: 0, attackers: [w] }); s = passaAte(s, x => !x.stack.length && !x.pending, 40);
  assert.equal(E.stats(s, s.objects[w]).power, 2); assert.ok(!E.hasKeyword(s, s.objects[u], 'trample'));
});
