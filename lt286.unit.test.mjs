// M-605 · leitor e núcleo, competitivos na ordem gulosa da sentinela (texto da Scryfall de 01/11/2026 em cobertura/<formato>.json):
// Once Upon a Time — "If this spell is the first spell you've cast this game, you may cast it without paying its mana cost." (118.9:
// custo alternativo; conta só as mágicas que você conjurou na partida, as do oponente não; a própria mágica entra na conta quando fica
// conjurada, 601.2i). O resto da carta (olhar cinco, pegar criatura ou terreno) o leitor já lia. Cartas de teste com nomes inventados;
// a aprovação das cartas do catálogo é da homologacao. Falha no motor anterior (a frase ficava sem leitura).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, act, poe, legais, passaAte, limpaMao } from './listas.mjs';
import { loadModules } from './_load.mjs';
const L = loadModules().leitor;
const C = {
  Conto: { name: 'Conto', mana_cost: '{1}{G}', cmc: 2, type_line: 'Instant', oracle_text: "If this spell is the first spell you've cast this game, you may cast it without paying its mana cost.\nLook at the top five cards of your library. You may reveal a creature or land card from among them and put it into your hand. Put the rest on the bottom of your library in a random order.", keywords: [], colors: ['G'] },
  Pedra: { name: 'Pedra', mana_cost: '{1}', cmc: 1, type_line: 'Artifact', oracle_text: '', keywords: [], colors: [] },
  Forest: { name: 'Forest', type_line: 'Basic Land — Forest', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {G}.)', colors: [] },
};
const ex = { example: { target: 'none', expect: { selfLife: 0 } } };
const lido = n => { const r = L.ler(C[n]); assert.ok(r && r.completa, `${n} lida por inteiro`); return { ...r.script, ...ex }; };
const SC = { Conto: lido('Conto'), Pedra: { name: 'Pedra', ...ex } };
function mesa(seed = 286, comConto = true) {
  const d = xs => xs.map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: comConto ? SC : { Pedra: SC.Pedra }, first: 0, players: [{ name: 'A', deck: d([...(comConto ? [['Conto', 3]] : []), ['Pedra', 4], ['Forest', 33]]) }, { name: 'B', deck: d([['Pedra', 4], ['Forest', 36]]) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  return limpaMao(s, 0);
}
const passa = s => act(s, { t: 'pass', p: s.turn.priority });
const resolve = s => { for (let i = 0; i < 40 && (s.stack.length || s.pending); i++) s = s.pending ? act(s, legais(s, s.pending.p)[0]) : passa(s); return s; };
const gratis = (s, oid) => legais(s, 0, a => a.t === 'cast' && a.oid === oid && a.alt != null);

test('M-605 · leitura: custo alternativo de graça só para a primeira mágica da partida', () => {
  assert.equal(JSON.stringify(SC.Conto.alt), JSON.stringify([{ label: 'De graça: a primeira mágica que você conjura na partida', cost: { free: true }, when: { primeiraMagiaDoJogo: true } }]));
  assert.equal(SC.Conto.effects[0].do, 'look');
  const V = loadModules().scripts.validateScript; assert.equal(V(SC.Conto).length, 0);
  assert.ok(V({ name: 'X', effects: [{ do: 'draw', amount: 1 }], alt: [{ cost: { free: true }, when: { primeiraMagiaDoX: true } }], ...ex }).length > 0, 'condição desconhecida é recusada');
});

test('M-605 · 118.9: sem terreno nenhum, a primeira mágica da partida sai de graça; a segunda cópia já não', () => {
  let s = mesa(), c1, c2; [s, c1] = poe(s, 0, 'Conto', 'hand'); [s, c2] = poe(s, 0, 'Conto', 'hand');
  const g = gratis(s, c1); assert.ok(g.length, 'de graça oferecida sem mana nenhuma');
  s = resolve(act(s, g[0])); assert.equal(s.objects[c1].zone, 'graveyard', 'resolveu');
  assert.equal(gratis(s, c2).length, 0, 'a segunda não é a primeira mágica da partida');
});

test('M-605 · outra mágica antes tira o de graça; as mágicas do oponente não contam', () => {
  let s = mesa(), c, p; [s, c] = poe(s, 0, 'Conto', 'hand'); [s, p] = poe(s, 0, 'Pedra', 'hand'); [s] = poe(s, 0, 'Forest');
  s = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === p)[0]));
  assert.equal(gratis(s, c).length, 0, 'depois da Pedra, não é mais a primeira');
  let t = mesa(287), c2, pb; [t, c2] = poe(t, 0, 'Conto', 'hand');
  t = passaAte(t, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  [t, pb] = poe(t, 1, 'Pedra', 'hand'); [t] = poe(t, 1, 'Forest'); t = resolve(act(t, legais(t, 1, a => a.t === 'cast' && a.oid === pb)[0]));
  assert.equal(t.objects[pb].zone, 'battlefield', 'o oponente conjurou a Pedra');
  t = passaAte(t, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  assert.ok(gratis(t, c2).length, 'a mágica do oponente não conta para a sua primeira');
});

test('M-605 · partida sem a carta não guarda a contagem (estado das partidas-referência intacto)', () => {
  let s = mesa(288, false), p; [s, p] = poe(s, 0, 'Pedra', 'hand'); [s] = poe(s, 0, 'Forest');
  s = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === p)[0]));
  assert.equal(s.players[0].magiasNoJogoM, undefined);
});
