// M-456 · LT122 · Duskwatch Hunter ("This creature can't be blocked by tokens. / When this creature enters, put a +1/+1 counter on target creature.").
// Texto da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json), caminho de produção (APROVADAS). Pedido da trilha `listas`. Evasão nova
// `not-tokens` (509.1b). Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const c0 = OF.find(x => x.name === 'Duskwatch Hunter');
const C = { 'Duskwatch Hunter': { name: c0.name, type_line: c0.type_line, mana_cost: c0.mana_cost, cmc: 3, keywords: [], oracle_text: c0.oracle_text, colors: ['B', 'G'], power: c0.power, toughness: c0.toughness },
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Forest: { name: 'Forest', type_line: 'Basic Land — Forest', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {G}.)', colors: [] } };
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 73, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b(['Duskwatch Hunter', 'Urso', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}

test('LT122 · Duskwatch Hunter joga pelo leitor aprovado', () => {
  assert.equal(S.coverage(C['Duskwatch Hunter']).level, 'completo'); assert.equal(S.APROVADAS['Duskwatch Hunter'].leva, 'M-456');
});

test('LT122 · ficha não bloqueia o Hunter; criatura que é carta bloqueia', () => {
  let s = mesa(), h, u, f; [s, h] = poe(s, 0, 'Duskwatch Hunter'); [s, u] = poe(s, 1, 'Urso'); [s, f] = poe(s, 1, 'Urso');
  s = J(s); s.objects[h].sick = false; s.objects[f].token = true;
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 0);
  s = act(s, { t: 'attack', p: 0, attackers: [h] });
  s = passaAte(s, x => x.pending && x.pending.kind === 'blockers');
  assert.throws(() => E.apply(s, { t: 'block', p: 1, blocks: [[f, h]] }));
  assert.doesNotThrow(() => E.apply(s, { t: 'block', p: 1, blocks: [[u, h]] }));
  assert.ok(!legais(s, 1, a => a.t === 'block').some(a => (a.blocks || []).some(([b]) => b === f)), 'a ficha não aparece como bloqueadora');
});
