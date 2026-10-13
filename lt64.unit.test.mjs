// M-381 · 107.4f · o símbolo phyrexiano híbrido ({G/U/P}) se paga com G, com U ou com 2 de vida — pedido da trilha tipos (T-47: Tamiyo, Compleated Sage;
// Ajani, Sleeper Agent). Antes, sem pagar vida, o motor só aceitava a primeira cor. Os testes falham no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, act, poe, legais, passaAte, CARTAS, comMana } from './cmd.mjs';
import { valorDeMana } from './listas.mjs';
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: valorDeMana(mana_cost), keywords: [], oracle_text: '', colors: ['G', 'U'], ...extra });
const EX = { example: { target: 'none', expect: { selfLife: 20 } } };
const CARDS = { ...CARTAS, Hibrida: c0('Hibrida', 'Sorcery', '{1}{G/U/P}') };
function mesa() {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 11, mode: 'full', cards: CARDS, scripts: { Hibrida: { name: 'Hibrida', effects: [{ do: 'draw', amount: 1 }], ...EX } }, first: 0,
    players: [{ name: 'A', deck: baralho(['Hibrida', 'Island']) }, { name: 'B', deck: baralho(['Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}

test('M-381 · {1}{G/U/P} com duas Ilhas: a mesa oferece pagar com U (sem vida) e o motor aceita', () => {
  let s = mesa(), h; [s, h] = poe(s, 0, 'Hibrida', 'hand'); [s] = poe(s, 0, 'Island'); [s] = poe(s, 0, 'Island');
  const ofs = legais(s, 0, a => a.t === 'cast' && a.oid === h);
  const semVida = ofs.find(a => !a.vida); assert.ok(semVida, 'há a oferta sem pagar vida: ' + JSON.stringify(ofs));
  const t = act(s, semVida); assert.equal(t.players[0].life, 20); assert.equal(t.objects[h].zone, 'stack');
});

test('M-381 · com uma Ilha só, paga o símbolo com 2 de vida; com G e U na reserva, também sem vida', () => {
  let s = mesa(), h; [s, h] = poe(s, 0, 'Hibrida', 'hand'); [s] = poe(s, 0, 'Island');
  const ofs = legais(s, 0, a => a.t === 'cast' && a.oid === h); assert.ok(ofs.length && ofs.every(a => a.vida === 1), JSON.stringify(ofs));
  assert.equal(act(s, ofs[0]).players[0].life, 18);
  let r = mesa(), h2; [r, h2] = poe(r, 0, 'Hibrida', 'hand'); r = comMana(r, 'GU');
  assert.ok(legais(r, 0, a => a.t === 'cast' && a.oid === h2 && !a.vida).length, 'G e U pagam {1}{G/U/P}');
});
