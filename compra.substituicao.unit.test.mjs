// CR2e.3 · 614.11: substituição de compra. Laboratory Maniac ("If you would draw a card while your library has no cards in it, you win
// the game instead.") e Notion Thief ("If an opponent would draw a card except the first one they draw in each of their draw steps, instead
// that player skips that draw and you draw a card."). Texto oficial em .listas/oficiais-motor.json (11/10/2026). Falham no motor v110 anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, comMana, tudo, CARTAS } from './cmd.mjs';

const OF = Object.fromEntries(JSON.parse(readFileSync(new URL('./.listas/oficiais-motor.json', import.meta.url), 'utf8')).cartas.map(c => [c.name, { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: 3, keywords: /^Flash/.test(c.oracle_text) ? ['Flash'] : [], oracle_text: c.oracle_text, colors: ['U'], power: c.power, toughness: c.toughness }]));
const c = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: 0, keywords: [], oracle_text: '', colors: [...new Set((mana_cost.match(/[WUBRG]/g) || []))], ...extra });
const cards = { ...OF, Saber: c('Saber', 'Instant', '{U}') };
const scripts = { Saber: { name: 'Saber', effects: [{ do: 'draw', amount: 2 }], example: { target: 'none', expect: { handDelta: 1 } } } };
function mesaX(a = [], b = []) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 12, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 1, mode: 'full', cards: { ...CARTAS, ...cards }, scripts, first: 0, players: [{ name: 'A', deck: baralho([...a, 'Island', 'Plains']) }, { name: 'B', deck: baralho([...b, 'Island', 'Swamp']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const conjura = (s, oid, p = 0) => { s = comMana(s, 'U', p); const o = p === 0 ? 1 : 0; return tudo(act(act(act(s, legais(s, p, x => x.t === 'cast' && x.oid === oid)[0]), { t: 'pass', p }), { t: 'pass', p: o })); };
const passa = s => act(s, { t: 'pass', p: s.turn.priority });

test('CR 614.11 · Laboratory Maniac: comprar com o grimório vazio vence o jogo em vez de perder (sem ela, perde)', () => {
  for (const comManiac of [true, false]) {
    let s = mesaX(['Laboratory Maniac', 'Saber']), sa;
    if (comManiac) [s] = poe(s, 0, 'Laboratory Maniac');
    [s, sa] = poe(s, 0, 'Saber', 'hand'); s = J(s); for (const oid of s.zones[0].library.splice(0)) s.objects[oid].zone = 'gone';
    s = conjura(s, sa);
    assert.equal(s.status, 'over', comManiac ? 'o jogo acaba' : 'o jogo acaba');
    assert.equal(s.winner, comManiac ? 0 : 1, comManiac ? 'A vence pela Laboratory Maniac' : 'sem ela, A perde por comprar de grimório vazio');
  }
});

test('CR 614.11 · Notion Thief: compra extra do oponente vira compra sua; a primeira do passo de compra dele não', () => {
  let s = mesaX(['Notion Thief'], ['Saber']), sa;
  [s] = poe(s, 0, 'Notion Thief'); [s, sa] = poe(s, 1, 'Saber', 'hand');
  const m0 = s.zones[0].hand.length, m1 = s.zones[1].hand.length;
  s = J(s); s.turn.priority = 1; s = comMana(s, 'U', 1);
  s = tudo(act(act(act(s, legais(s, 1, x => x.t === 'cast' && x.oid === sa)[0]), { t: 'pass', p: 1 }), { t: 'pass', p: 0 }));
  assert.equal(s.zones[1].hand.length, m1 - 1, 'B não comprou nada (só gastou a Saber)');
  assert.equal(s.zones[0].hand.length, m0 + 2, 'A comprou as duas');
  // passa ao turno de B: a compra do passo de compra dele é dele
  const t0 = s.turn.number, h1 = s.zones[1].hand.length, l0 = s.zones[0].library.length;
  s = passaAte(s, x => x.turn.number > t0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  assert.equal(s.zones[1].hand.length, h1 + 1, 'B comprou a do passo de compra'); assert.equal(s.zones[0].library.length, l0, 'A não comprou (a mão de A desce a 7 na limpeza: conta-se o grimório)');
});

test('CR 614.11 · ruling: um Notion Thief de cada lado — quem ia comprar compra (cada efeito vale uma vez)', () => {
  let s = mesaX(['Notion Thief', 'Saber'], ['Notion Thief']), sa;
  [s] = poe(s, 0, 'Notion Thief'); [s] = poe(s, 1, 'Notion Thief'); [s, sa] = poe(s, 0, 'Saber', 'hand');
  const m0 = s.zones[0].hand.length, m1 = s.zones[1].hand.length;
  s = conjura(s, sa);
  assert.equal(s.zones[0].hand.length, m0 - 1 + 2, 'A comprou as duas'); assert.equal(s.zones[1].hand.length, m1);
});
