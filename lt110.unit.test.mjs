// M-428 · LT94 · correções da revisão independente de M-414, M-415, M-422 e M-423: (1) Glorious Gale ("If it was a legendary spell, the Ring tempts you"):
// a mágica virada para baixo não tem nome nem supertipo (708.2) — o Anel não tenta; (2) a conferência de invariantes não conta o emblema do Anel como carta
// (V-25; o fuzz dava falso vermelho "cartas 51, esperadas 50"); (3) a pilha explicada do Songs of the Damned diz "para cada carta de criatura". Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, T, act, poe, legais, passaAte } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const g0 = OF.find(x => x.name === 'Glorious Gale');
const C = { 'Glorious Gale': { name: g0.name, type_line: g0.type_line, mana_cost: g0.mana_cost, cmc: 2, keywords: [], oracle_text: g0.oracle_text, colors: ['U'] },
  Rei: { name: 'Rei', type_line: 'Legendary Creature — Human Noble', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Island: { name: 'Island', type_line: 'Basic Land — Island', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {U}.)', colors: [] },
  Forest: { name: 'Forest', type_line: 'Basic Land — Forest', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {G}.)', colors: [] } };
function mesa(seed = 15) {
  const b = ns => ns.map(name => ({ name, qty: 10, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, first: 1, players: [{ name: 'A', deck: b(['Glorious Gale', 'Island']) }, { name: 'B', deck: b(['Rei', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending);
const tentado = s => s.zones[0].command.some(o => s.objects[o] && s.objects[o].emblemaV);
const cartas = s => Object.values(s.objects).filter(o => !o.ability && !o.token && !o.copiaDeMagia && !o.emblemaV).length;
function gale(viradaParaBaixo) {
  let s = mesa(), gg, c; [s, gg] = poe(s, 0, 'Glorious Gale', 'hand'); for (let i = 0; i < 2; i++) [s] = poe(s, 0, 'Island'); for (let i = 0; i < 2; i++) [s] = poe(s, 1, 'Forest'); [s, c] = poe(s, 1, 'Rei', 'hand');
  s = act(s, legais(s, 1, a => a.t === 'cast' && a.oid === c)[0]); s = act(s, { t: 'pass', p: 1 });
  if (viradaParaBaixo) { s = J(s); s.objects[c].faceDown = true; } // como a conjurada com metamorfose (702.37c): na pilha, uma criatura 2/2 sem nome nem supertipo
  const n = cartas(s); return { s: resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === gg && a.targets[0].oid === c)[0])), n, c };
}

test('LT94 · Glorious Gale: a mágica lendária virada para baixo não é lendária (708.2) — anulada, o Anel não tenta', () => {
  const { s, c } = gale(true); assert.notEqual(s.objects[c].zone, 'stack'); assert.ok(!tentado(s));
  assert.ok(tentado(gale(false).s), 'virada para cima, o Anel tenta');
});

test('LT94 · invariantes: o emblema do Anel não é carta', () => {
  const { s, n } = gale(false); assert.ok(tentado(s));
  const errs = E.invariants(s, n); assert.ok(!errs.some(e => /cartas/.test(e)), errs.join('; '));
});

test('LT94 · Songs of the Damned: "para cada carta de criatura no seu cemitério"', () => {
  assert.equal(T.descreveEfeito({ do: 'add_mana', symbols: ['B'], porContagem: 'creature-cards-in-your-graveyard' }), 'adiciona {B} para cada carta de criatura no seu cemitério');
});
