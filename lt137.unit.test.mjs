// M-455 · LT121 · Ravening Warg ("Deathtouch / Ferocious — Whenever this creature attacks while you control a creature with power 4 or greater, you gain
// 2 life."). Texto da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json), caminho de produção (APROVADAS). Pedido da trilha `listas`. Condição
// nova `ferociousAoDisparar`: o "while" é parte do evento — conferido só no disparo, não de novo na resolução (diferente do "if" de 603.4).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const c0 = OF.find(x => x.name === 'Ravening Warg');
const cr = (name, p, t) => ({ name, type_line: 'Creature — Test', mana_cost: '{2}', cmc: 2, keywords: [], oracle_text: '', colors: [], power: String(p), toughness: String(t) });
const C = { 'Ravening Warg': { name: c0.name, type_line: c0.type_line, mana_cost: c0.mana_cost, cmc: 2, keywords: ['Deathtouch', 'Ferocious'], oracle_text: c0.oracle_text, colors: ['B'], power: c0.power, toughness: c0.toughness },
  Gigante: cr('Gigante', 4, 4), Urso: cr('Urso', 3, 3),
  Swamp: { name: 'Swamp', type_line: 'Basic Land — Swamp', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {B}.)', colors: [] } };
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 71, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b(['Ravening Warg', 'Gigante', 'Urso', 'Swamp']) }, { name: 'B', deck: b(['Urso', 'Swamp']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const ataque = s => passaAte(s, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 0);
function cena(grande) { let s = mesa(), w, g; [s, w] = poe(s, 0, 'Ravening Warg'); [s, g] = poe(s, 0, grande); s = J(s); s.objects[w].sick = false; s.objects[g].sick = false; return { s: ataque(s), w, g }; }

test('LT121 · Ravening Warg joga pelo leitor aprovado', () => {
  assert.equal(S.coverage(C['Ravening Warg']).level, 'completo'); assert.equal(S.APROVADAS['Ravening Warg'].leva, 'M-455');
});

test('LT121 · ataca com uma criatura de poder 4 sua no campo: ganha 2; com poder 3: nada', () => {
  let { s, w } = cena('Gigante'); s = act(s, { t: 'attack', p: 0, attackers: [w] }); s = passaAte(s, x => !x.stack.length && !x.pending, 40);
  assert.equal(s.players[0].life, 22);
  ({ s, w } = cena('Urso')); s = act(s, { t: 'attack', p: 0, attackers: [w] }); s = passaAte(s, x => !x.stack.length && !x.pending, 40);
  assert.equal(s.players[0].life, 20);
});

test('LT121 · o "while" é só do disparo: a criatura de poder 4 sai antes da resolução e a vida vem assim mesmo', () => {
  let { s, w, g } = cena('Gigante'); s = act(s, { t: 'attack', p: 0, attackers: [w] });
  assert.ok(s.stack.length > 0, 'gatilho na pilha');
  s = J(s); const bf = s.zones[0].battlefield; bf.splice(bf.indexOf(g), 1); s.zones[0].graveyard.push(g); s.objects[g].zone = 'graveyard';
  s = passaAte(s, x => !x.stack.length && !x.pending, 40);
  assert.equal(s.players[0].life, 22);
});
