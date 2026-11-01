// M-590 · leitor e núcleo, competitivos na ordem gulosa da sentinela (texto da Scryfall de 25/10/2026 em cobertura/resumo.json):
// "When this creature enters or dies, mill three cards." (Stitcher's Supplier: dois gatilhos com o mesmo efeito) e "Mill three cards,
// then return a creature or planeswalker card from your graveyard to your hand." (Takenuma, Abandoned Mire: sem "target", a carta é
// escolhida na resolução, depois de moer, então pode ser uma das moídas; 608.2c). Cartas de teste com nomes inventados; a aprovação das
// cartas do catálogo é da homologacao. Falha no motor anterior (as frases ficavam sem leitura).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, act, poe, legais, passaAte, limpaMao } from './listas.mjs';
import { loadModules } from './_load.mjs';
const L = loadModules().leitor;
const C = {
  Costureiro: { name: 'Costureiro', mana_cost: '{B}', cmc: 1, type_line: 'Creature — Zombie', oracle_text: 'When this creature enters or dies, mill three cards.', power: '1', toughness: '1', keywords: [], colors: ['B'] },
  Pantano: { name: 'Pantano', mana_cost: '', cmc: 0, type_line: 'Legendary Land', oracle_text: '{T}: Add {B}.\nChannel — {3}{B}, Discard this card: Mill three cards, then return a creature or planeswalker card from your graveyard to your hand. This ability costs {1} less to activate for each legendary creature you control.', keywords: [], colors: [] },
  Raio: { name: 'Raio', mana_cost: '{B}', cmc: 1, type_line: 'Instant', oracle_text: 'Raio deals 3 damage to any target.', keywords: [], colors: ['B'] },
  Swamp: { name: 'Swamp', type_line: 'Basic Land — Swamp', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {B}.)', colors: [] },
};
const ex = { example: { target: 'none', expect: { selfLife: 0 } } };
const lido = n => { const r = L.ler(C[n]); assert.ok(r && r.completa, `${n} lida por inteiro`); return { ...r.script, ...ex }; };
const SC = { Costureiro: lido('Costureiro'), Pantano: lido('Pantano'), Raio: { name: 'Raio', effects: [{ do: 'damage', amount: 3, target: 'any' }], ...ex } };
function mesa(deck, seed = 271) {
  const d = xs => xs.map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SC, first: 0, players: [{ name: 'A', deck: d(deck) }, { name: 'B', deck: d([['Swamp', 40]]) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  return limpaMao(s, 0);
}
const resolve = s => { for (let i = 0; i < 40 && s.stack.length && !s.pending; i++) s = act(s, { t: 'pass', p: s.turn.priority }); return s; };

test('M-590 · leitura: dois gatilhos (entra · morre) e a escolha no cemitério sem alvo', () => {
  assert.equal(JSON.stringify(SC.Costureiro.abilities.map(a => [a.when, a.effects])), JSON.stringify([['etb', [{ do: 'mill', amount: 3 }]], ['dies', [{ do: 'mill', amount: 3 }]]]));
  assert.equal(JSON.stringify(SC.Pantano.abilities[0].effects), JSON.stringify([{ do: 'mill', amount: 3 }, { do: 'search', amount: 1, zona: 'graveyard', filter: { types: ['creature', 'planeswalker'] }, to: 'hand' }]));
});

test('M-590 · o Costureiro mói três ao entrar e mais três ao morrer', () => {
  let s = mesa([['Costureiro', 4], ['Raio', 2], ['Swamp', 34]]), c, r;
  [s, c] = poe(s, 0, 'Costureiro', 'hand'); [s, r] = poe(s, 0, 'Raio', 'hand'); for (let i = 0; i < 2; i++) [s] = poe(s, 0, 'Swamp');
  const gy0 = s.zones[0].graveyard.length;
  s = resolve(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === c)[0])); s = resolve(s);
  assert.equal(s.objects[c].zone, 'battlefield'); assert.equal(s.zones[0].graveyard.length, gy0 + 3, 'moeu três ao entrar');
  s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === r && JSON.stringify(x).includes(`"${c}"`))[0]); s = resolve(s); s = resolve(s);
  assert.equal(s.objects[c].zone, 'graveyard');
  assert.equal(s.zones[0].graveyard.length, gy0 + 3 + 3 + 2, 'moeu mais três ao morrer (+ o Costureiro e o Raio)');
});

test('M-590 · 608.2c: o Pântano mói três e então devolve uma criatura do cemitério, inclusive uma das moídas; só criatura', () => {
  let s = mesa([['Pantano', 2], ['Costureiro', 20], ['Swamp', 18]], 2711), pa;
  [s, pa] = poe(s, 0, 'Pantano', 'hand'); for (let i = 0; i < 4; i++) [s] = poe(s, 0, 'Swamp'); let sw; [s, sw] = poe(s, 0, 'Swamp', 'graveyard');
  const topo = s.zones[0].library.slice(0, 3);
  s = resolve(act(s, legais(s, 0, x => x.oid === pa && x.t === 'activate')[0]));
  assert.ok(topo.every(o => s.objects[o].zone === 'graveyard' || s.pending), 'moeu antes de escolher');
  assert.ok(s.pending && s.pending.kind === 'pick', 'escolha na resolução'); assert.ok(!s.pending.from.includes(sw), 'o Pântano básico não serve');
  assert.ok(s.pending.from.every(o => s.objects[o].name === 'Costureiro'), 'só criatura');
  assert.ok(s.pending.from.some(o => topo.includes(o)) || !topo.some(o => s.objects[o].name === 'Costureiro'), 'uma das moídas pode voltar');
  assert.ok(!legais(s, 0).some(x => x.t !== 'pick'), 'achando, devolver é obrigatório');
  const pk = legais(s, 0).find(x => x.t === 'pick'); s = act(s, pk); for (let i = 0; i < 3 && s.pending; i++) s = act(s, legais(s, 0)[0]);
  assert.equal(s.objects[pk.oid].zone, 'hand');
});
