// M-588 · leitor, competitivos na ordem gulosa da sentinela (texto da Scryfall de 25/10/2026 em cobertura/resumo.json): alvo
// "target spell or nonland permanent an opponent controls" (Sink into Stupor // Soporific Springs; 115.1 e 608.2b: a mágica na pilha
// também é alvo, e volta à mão do dono sem resolver; a face de terreno já era lida) e "Search your library for a blue instant card,
// reveal that card, put it into your hand" (Merchant Scroll; cor e tipo da carta buscada, 701.20a). Cartas de teste com nomes inventados; a
// aprovação das cartas do catálogo é da homologacao. Falha no motor anterior (a frase ficava sem leitura).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, act, poe, legais, passaAte, limpaMao } from './listas.mjs';
import { loadModules } from './_load.mjs';
const L = loadModules().leitor;
const C = {
  Sono: { name: 'Sono', mana_cost: '{1}{U}{U}', cmc: 3, type_line: 'Instant', oracle_text: "Return target spell or nonland permanent an opponent controls to its owner's hand.", keywords: [], colors: ['U'] },
  Raio: { name: 'Raio', mana_cost: '{R}', cmc: 1, type_line: 'Instant', oracle_text: 'Raio deals 3 damage to any target.', keywords: [], colors: ['R'] },
  Pedra: { name: 'Pedra', mana_cost: '{1}', cmc: 1, type_line: 'Artifact', oracle_text: '', keywords: [], colors: [] },
  Rolo: { name: 'Rolo', mana_cost: '{1}{U}', cmc: 2, type_line: 'Sorcery', oracle_text: 'Search your library for a blue instant card, reveal that card, put it into your hand, then shuffle.', keywords: [], colors: ['U'] },
  Island: { name: 'Island', type_line: 'Basic Land — Island', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {U}.)', colors: [] },
  Mountain: { name: 'Mountain', type_line: 'Basic Land — Mountain', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {R}.)', colors: [] },
};
const r0 = L.ler(C.Sono), r1 = L.ler(C.Rolo);
const ex = { example: { target: 'none', expect: { selfLife: 0 } } };
const SC = { Sono: { ...r0.script, ...ex }, Rolo: { ...r1.script, ...ex }, Raio: { name: 'Raio', effects: [{ do: 'damage', amount: 3, target: 'any' }], ...ex } };
function mesa(seed = 269) {
  const d = xs => xs.map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SC, first: 0, players: [{ name: 'A', deck: d([['Sono', 4], ['Pedra', 4], ['Island', 32]]) }, { name: 'B', deck: d([['Raio', 4], ['Pedra', 4], ['Mountain', 32]]) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  s = limpaMao(s, 0);
  let so, mp, op, ilha; [s, so] = poe(s, 0, 'Sono', 'hand'); [s, mp] = poe(s, 0, 'Pedra', 'hand');
  for (let i = 0; i < 4; i++) [s, ilha] = poe(s, 0, 'Island');
  [s, op] = poe(s, 1, 'Pedra'); let mt; [s, mt] = poe(s, 1, 'Mountain'); let ra; [s, ra] = poe(s, 1, 'Raio', 'hand');
  return { s, so, mp, op, mt, ra, ilha };
}
const alvos = (s, oid) => { let st = s; const of = legais(st, 0, x => x.t === 'cast' && x.oid === oid); return of.map(x => JSON.stringify(x)).join(' '); };
// conjura a mágica e, se o alvo vier por decisão, escolhe o objeto pedido
function conjura(s, p, oid, alvo) {
  const of = legais(s, p, x => x.t === 'cast' && x.oid === oid); let a = of.find(x => JSON.stringify(x).includes(`"${alvo}"`)) || of[0];
  assert.ok(a, 'há como conjurar'); s = act(s, a);
  for (let i = 0; i < 6 && s.pending && s.pending.p === p; i++) { const o = legais(s, p).find(x => JSON.stringify(x).includes(`"${alvo}"`)); assert.ok(o, `o alvo ${alvo} é oferecido`); s = act(s, o); }
  return s;
}

test('M-588 · leitura: alvo "spell or nonland permanent an opponent controls"', () => {
  assert.ok(r0 && r0.completa, 'lida por inteiro');
  assert.equal(JSON.stringify(r0.script.effects), JSON.stringify([{ do: 'bounce', target: { ou: [{ zona: 'stack', de: 'opponent' }, { semTipos: ['land'], de: 'opponent' }] } }]));
});

test('M-588 · alvo: permanente não terreno do oponente sim; terreno e o que é seu não', () => {
  let { s, so, op, mt, ilha } = mesa();
  const a = alvos(s, so); assert.ok(a.includes(`"${op}"`), 'a Pedra do oponente é alvo');
  assert.ok(!a.includes(`"${mt}"`), 'a Montanha não é alvo'); assert.ok(!a.includes(`"${ilha}"`), 'a sua Ilha não é alvo');
  s = conjura(s, 0, so, op); for (let i = 0; i < 20 && s.stack.length; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  assert.equal(s.objects[op].zone, 'hand', 'a Pedra voltou à mão do dono');
});

test('M-588 · 608.2b: a mágica do oponente na pilha volta à mão sem resolver; a sua mágica não é alvo', () => {
  let { s, so, mp, ra } = mesa();
  s = conjura(s, 0, mp, mp); assert.equal(s.objects[mp].zone, 'stack');
  assert.ok(!alvos(s, so).includes(`"${mp}"`), 'a sua Pedra na pilha não é alvo');
  s = act(s, { t: 'pass', p: 0 }); assert.equal(s.turn.priority, 1);
  const vida = s.players[0].life;
  s = conjura(s, 1, ra, 'p0'); assert.equal(s.objects[ra].zone, 'stack', 'o Raio está na pilha');
  s = act(s, { t: 'pass', p: 1 }); assert.equal(s.turn.priority, 0, 'B passa e a prioridade volta para A');
  s = conjura(s, 0, so, ra);
  for (let i = 0; i < 20 && s.stack.length; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  assert.equal(s.objects[ra].zone, 'hand', 'o Raio voltou à mão de B'); assert.equal(s.players[0].life, vida, 'o Raio não resolveu');
  assert.equal(s.objects[mp].zone, 'battlefield', 'a Pedra de A resolveu');
});

test('M-588 · Merchant Scroll: busca só mágica instantânea azul, revela e põe na mão', () => {
  assert.ok(r1 && r1.completa, 'lida por inteiro');
  assert.equal(JSON.stringify(r1.script.effects), JSON.stringify([{ do: 'search', amount: 1, filter: { types: ['instant'], cores: ['U'] }, to: 'hand', revela: true }]));
  const d = xs => xs.map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 2691, mode: 'full', cards: C, scripts: SC, first: 0, players: [{ name: 'A', deck: d([['Rolo', 2], ['Sono', 3], ['Raio', 3], ['Pedra', 4], ['Island', 28]]) }, { name: 'B', deck: d([['Mountain', 40]]) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  s = limpaMao(s, 0); let ro; [s, ro] = poe(s, 0, 'Rolo', 'hand'); for (let i = 0; i < 2; i++) [s] = poe(s, 0, 'Island');
  s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === ro)[0]);
  for (let i = 0; i < 10 && s.stack.length && !s.pending; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  assert.ok(s.pending && s.pending.kind === 'pick', 'a busca é uma escolha');
  const nomes = new Set(s.pending.from.map(o => s.objects[o].name)); assert.deepEqual([...nomes], ['Sono'], 'só a instantânea azul; Raio (vermelha) e Pedra ficam de fora');
  const pega = legais(s, 0).find(x => x.t === 'pick'); s = act(s, pega);
  for (let i = 0; i < 4 && s.pending && s.pending.p === 0; i++) s = act(s, legais(s, 0).find(x => x.t !== 'pick'));
  assert.equal(s.objects[pega.oid].zone, 'hand', 'a carta achada foi para a mão');
});
