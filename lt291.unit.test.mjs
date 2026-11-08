// M-611 · leitor, competitivos na ordem gulosa (texto da API da Scryfall de 08/11/2026 em cobertura/<formato>.json do ramo catalogo):
// Requiting Hex — "As an additional cost to cast this spell, you may blight 1. (You may put a -1/-1 counter on a creature you control.)
// Destroy target creature with mana value 2 or less. If this spell's additional cost was paid, you gain 2 life." Afligir como custo
// (601.2b/601.2h, 701.68): quem conjura escolhe a criatura SUA que recebe o marcador; sem criatura sua não há como pagar (701.68b).
// A restrição do alvo vale ao conjurar e de novo na resolução (608.2b). Cartas de teste com nomes inventados; a aprovação das cartas
// do catálogo é da homologacao. Falha no motor anterior (as frases ficavam sem leitura e o custo `blight` não existia).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, act, poe, legais, passaAte, limpaMao } from './listas.mjs';
import { loadModules } from './_load.mjs';
const L = loadModules().leitor;
const C = {
  Feitico: { name: 'Feitico', mana_cost: '{B}', cmc: 1, type_line: 'Instant', oracle_text: "As an additional cost to cast this spell, you may blight 1. (You may put a -1/-1 counter on a creature you control.)\nDestroy target creature with mana value 2 or less. If this spell's additional cost was paid, you gain 2 life.", keywords: ['Blight'], colors: ['B'] },
  Urso: { name: 'Urso', mana_cost: '{1}{G}', cmc: 2, type_line: 'Creature — Bear', oracle_text: '', power: '2', toughness: '2', keywords: [], colors: ['G'] },
  Ogro: { name: 'Ogro', mana_cost: '{2}{R}', cmc: 3, type_line: 'Creature — Ogre', oracle_text: '', power: '3', toughness: '3', keywords: [], colors: ['R'] },
  Swamp: { name: 'Swamp', type_line: 'Basic Land — Swamp', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {B}.)', colors: [] },
  Forest: { name: 'Forest', type_line: 'Basic Land — Forest', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {G}.)', colors: [] },
};
const ex = { example: { target: 'none', expect: { selfLife: 0 } } };
const lido = n => { const r = L.ler(C[n]); assert.ok(r && r.completa, `${n} lida por inteiro`); return { ...r.script, ...ex }; };
const SC = { Feitico: lido('Feitico'), Urso: { name: 'Urso', ...ex }, Ogro: { name: 'Ogro', ...ex } };
function mesa(seed = 291) {
  const d = xs => xs.map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SC, first: 0, players: [{ name: 'A', deck: d([['Feitico', 4], ['Urso', 4], ['Swamp', 32]]) }, { name: 'B', deck: d([['Urso', 4], ['Ogro', 4], ['Forest', 32]]) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  return limpaMao(s, 0);
}
const passa = s => act(s, { t: 'pass', p: s.turn.priority });
const resolve = s => { for (let i = 0; i < 40 && (s.stack.length || s.pending); i++) s = s.pending ? act(s, legais(s, s.pending.p)[0]) : passa(s); return s; };
const conjuracoes = (s, f) => legais(s, 0, a => a.t === 'cast' && a.oid === f);
const alvoDe = a => ((a.targets || [])[0] || {}).oid;

test('M-611 · leitura: afligir 1 como custo adicional opcional, alvo de valor de mana 2 ou menos, vida só se pagou', () => {
  assert.equal(JSON.stringify(SC.Feitico.additional), JSON.stringify({ blight: 1 }));
  assert.equal(SC.Feitico.additionalOptional, true);
  assert.equal(JSON.stringify(SC.Feitico.effects), JSON.stringify([{ do: 'destroy', target: { tipos: ['creature'], mvMax: 2 } }, { do: 'gain', amount: 2, onlyIf: 'paid-additional' }]));
  assert.equal(loadModules().scripts.validateScript(SC.Feitico).length, 0);
});

test('M-611 · 601.2h: afligindo a sua criatura, o alvo morre e você ganha 2; sem afligir, o alvo morre e a vida fica', () => {
  let s = mesa(), f, meu, dele, ogro; [s, meu] = poe(s, 0, 'Urso'); [s, dele] = poe(s, 1, 'Urso'); [s, ogro] = poe(s, 1, 'Ogro'); [s, f] = poe(s, 0, 'Feitico', 'hand'); [s] = poe(s, 0, 'Swamp');
  const op = conjuracoes(s, f);
  assert.ok(op.length, 'a mágica é oferecida');
  assert.ok(!op.some(a => alvoDe(a) === ogro), 'a criatura de valor 3 não pode ser alvo');
  const comCusto = op.find(a => alvoDe(a) === dele && a.pay && a.pay.blight === meu), semCusto = op.find(a => alvoDe(a) === dele && a.add === null);
  assert.ok(comCusto && semCusto, 'as duas formas são oferecidas: afligir o Urso de A ou não pagar');
  const vida = s.players[0].life;
  const pago = act(s, comCusto);
  assert.equal((pago.objects[meu].counters || {}).m1m1, 1, 'o marcador −1/−1 entra ao pagar, antes da resolução');
  const fim = resolve(pago);
  assert.equal(fim.objects[dele].zone, 'graveyard', 'o alvo é destruído');
  assert.equal(fim.players[0].life, vida + 2, 'ganha 2 porque pagou');
  assert.equal(fim.objects[meu].zone, 'battlefield', 'o Urso de A fica, 1/1');
  const fim2 = resolve(act(s, semCusto));
  assert.equal(fim2.objects[dele].zone, 'graveyard');
  assert.equal(fim2.players[0].life, vida, 'sem pagar, sem vida');
  assert.ok(!((fim2.objects[meu].counters || {}).m1m1), 'sem pagar, nenhum marcador');
});

test('M-611 · 701.68b: sem criatura sua, o custo opcional não é oferecido; quem paga escolhe entre as suas, nunca a do oponente', () => {
  let s = mesa(), f, dele; [s, dele] = poe(s, 1, 'Urso'); [s, f] = poe(s, 0, 'Feitico', 'hand'); [s] = poe(s, 0, 'Swamp');
  const op = conjuracoes(s, f);
  assert.ok(op.length && op.every(a => !(a.pay && a.pay.blight)), 'só a forma sem afligir');
  let t = mesa(), g, a1, a2, b1; [t, a1] = poe(t, 0, 'Urso'); [t, a2] = poe(t, 0, 'Urso'); [t, b1] = poe(t, 1, 'Urso'); [t, g] = poe(t, 0, 'Feitico', 'hand'); [t] = poe(t, 0, 'Swamp');
  const quem = new Set(conjuracoes(t, g).filter(a => alvoDe(a) === b1 && a.pay && a.pay.blight).map(a => a.pay.blight));
  assert.deepEqual([...quem].sort(), [a1, a2].sort(), 'uma forma por criatura de A');
  assert.throws(() => act(t, { ...conjuracoes(t, g).find(a => alvoDe(a) === b1 && a.pay && a.pay.blight), pay: { blight: b1 } }), /afligir/, 'afligir a criatura do oponente é recusado');
});

test('M-611 · 608.2b: o alvo que passou a ter valor de mana maior não é destruído; afligir a própria criatura alvo vale', () => {
  let s = mesa(), f, meu, dele; [s, meu] = poe(s, 0, 'Urso'); [s, dele] = poe(s, 1, 'Urso'); [s, f] = poe(s, 0, 'Feitico', 'hand'); [s] = poe(s, 0, 'Swamp');
  const proprio = conjuracoes(s, f).find(a => alvoDe(a) === meu && a.pay && a.pay.blight === meu);
  assert.ok(proprio, 'pode mirar a própria criatura e afligir a mesma');
  const vida = s.players[0].life, fim = resolve(act(s, proprio));
  assert.equal(fim.objects[meu].zone, 'graveyard'); assert.equal(fim.players[0].life, vida + 2);
  let pilha = act(s, conjuracoes(s, f).find(a => alvoDe(a) === dele && a.add === null));
  pilha = JSON.parse(JSON.stringify(pilha)); pilha.facts.Urso = { ...pilha.facts.Urso, cmc: 3 };
  const fim2 = resolve(pilha);
  assert.equal(fim2.objects[dele].zone, 'battlefield', 'alvo ilegal na resolução: nada acontece');
});
