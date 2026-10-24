// M-578 · Sentinela do Pauper (cobertura/pauper.json de 24/10/2026, a única pendente: 531 de 532 listas a 100%): Demand Answers.
// Texto da API da Scryfall de 24/10/2026: "As an additional cost to cast this spell, sacrifice an artifact or discard a card. / Draw two cards."
// CR 601.2b: o custo adicional com "or" é um ou outro, escolhido ao conjurar; sem artefato e sem outra carta na mão, não dá para conjurar
// (601.2f-h: custo obrigatório que não se paga). Falha no motor anterior (a frase não tinha leitura).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, S, act, poe, legais, passaAte, limpaMao } from './listas.mjs';
const T = 'As an additional cost to cast this spell, sacrifice an artifact or discard a card.\nDraw two cards.';
const C = {
  'Demand Answers': { name: 'Demand Answers', mana_cost: '{1}{R}', cmc: 2, type_line: 'Instant', oracle_text: T, keywords: [], colors: ['R'] },
  Mountain: { name: 'Mountain', type_line: 'Basic Land — Mountain', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {R}.)', colors: [] },
  'Ornithopter': { name: 'Ornithopter', type_line: 'Artifact Creature — Thopter', mana_cost: '{0}', cmc: 0, keywords: ['Flying'], oracle_text: 'Flying', power: '0', toughness: '2', colors: [] },
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', power: '2', toughness: '2', colors: ['G'] },
};
function mesa() {
  const d = resto => resto.map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'pauper', seed: 259, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: d([['Demand Answers', 1], ['Urso', 4], ['Ornithopter', 2], ['Mountain', 53]]) }, { name: 'B', deck: d([['Mountain', 60]]) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  s = limpaMao(s, 0);
  [s] = poe(s, 0, 'Mountain'); [s] = poe(s, 0, 'Mountain');
  return s;
}
const conjura = (s, oid) => legais(s, 0, x => x.t === 'cast' && x.oid === oid);
const resolve = s => { for (let i = 0; i < 60 && (s.stack.length || s.pending); i++) { const pd = s.pending; s = pd ? act(s, legais(s, pd.p)[0]) : act(s, { t: 'pass', p: s.turn.priority }); } return s; };

test('M-578 · Demand Answers é lida por inteiro e aprovada (joga no app)', () => {
  assert.equal(S.coverage(C['Demand Answers']).level, 'completo');
});

test('M-578 · 601.2b: sem artefato e sem outra carta na mão, não há como conjurar', () => {
  let s = mesa(), d; [s, d] = poe(s, 0, 'Demand Answers', 'hand');
  assert.equal(conjura(s, d).length, 0);
});

test('M-578 · descartando uma carta: a carta vai ao cemitério e compra duas', () => {
  let s = mesa(), d, u; [s, d] = poe(s, 0, 'Demand Answers', 'hand'); [s, u] = poe(s, 0, 'Urso', 'hand');
  const ofertas = conjura(s, d); assert.ok(ofertas.length >= 1, 'oferece conjurar descartando');
  const mao0 = s.zones[0].hand.length;
  s = act(s, ofertas[0]);
  s = resolve(s);
  assert.equal(s.objects[u].zone, 'graveyard', 'Urso descartado');
  assert.equal(s.objects[d].zone, 'graveyard');
  assert.equal(s.zones[0].hand.length, mao0 - 2 + 2, 'saem Demand Answers e Urso, entram duas');
});

test('M-578 · sacrificando um artefato: o artefato vai ao cemitério e a mão fica com as duas compradas', () => {
  let s = mesa(), d, o; [s, d] = poe(s, 0, 'Demand Answers', 'hand'); [s, o] = poe(s, 0, 'Ornithopter');
  const ofertas = conjura(s, d); assert.ok(ofertas.length >= 1, 'oferece conjurar sacrificando');
  s = resolve(act(s, ofertas[0]));
  assert.equal(s.objects[o].zone, 'graveyard', 'Ornithopter sacrificado');
  assert.equal(s.zones[0].hand.length, 2);
});

test('M-578 · com as duas formas possíveis, a escolha é do jogador (601.2b)', () => {
  let s = mesa(), d, u, o; [s, d] = poe(s, 0, 'Demand Answers', 'hand'); [s, u] = poe(s, 0, 'Urso', 'hand'); [s, o] = poe(s, 0, 'Ornithopter');
  const ofertas = conjura(s, d);
  const formas = new Set(ofertas.map(x => x.add));
  assert.ok(formas.size >= 2 || ofertas.length >= 2, 'duas formas de pagar oferecidas');
  // a forma que sacrifica deixa o Urso na mão
  let ok = false;
  for (const of of ofertas) { const t = resolve(act(s, of)); if (t.objects[o].zone === 'graveyard' && t.objects[u].zone === 'hand') ok = true; }
  assert.ok(ok, 'existe a escolha de sacrificar o artefato e guardar a carta');
});
