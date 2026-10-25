// M-582 · leitor, competitivos na ordem gulosa da sentinela (texto da Scryfall de 25/10/2026 em cobertura/resumo.json): alvo por lista de
// tipos de carta ("target artifact, creature, enchantment, or planeswalker", Otawara, Soaring City), "Return up to three target land cards
// from your graveyard to your hand" (Life from the Loam; 115.3 e 601.2c: de zero a três, cartas diferentes) e "put target instant or sorcery
// card from your graveyard on top of your library" (Mystic Sanctuary). Cartas de teste com nomes inventados; a aprovação das cartas do
// catálogo é da homologacao. Falha no motor anterior (as três frases ficavam sem leitura).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, act, poe, legais, passaAte, limpaMao } from './listas.mjs';
import { loadModules } from './_load.mjs';
const L = loadModules().leitor;
const C = {
  Cidade: { name: 'Cidade', mana_cost: '', cmc: 0, type_line: 'Legendary Land', oracle_text: '{T}: Add {U}.\nChannel — {U}, Discard this card: Return target artifact, creature, enchantment, or planeswalker to its owner\'s hand.', keywords: [], colors: [] },
  Lodo: { name: 'Lodo', mana_cost: '{U}', cmc: 1, type_line: 'Sorcery', oracle_text: 'Return up to three target land cards from your graveyard to your hand.', keywords: [], colors: ['G'] },
  Santuario: { name: 'Santuario', mana_cost: '', cmc: 0, type_line: 'Land — Island', oracle_text: '({T}: Add {U}.)\nWhen this land enters, you may put target instant or sorcery card from your graveyard on top of your library.', keywords: [], colors: [] },
  Raio: { name: 'Raio', mana_cost: '{U}', cmc: 1, type_line: 'Instant', oracle_text: 'Raio deals 3 damage to any target.', keywords: [], colors: ['U'] },
  Pedra: { name: 'Pedra', mana_cost: '{1}', cmc: 1, type_line: 'Artifact', oracle_text: '', keywords: [], colors: [] },
  Island: { name: 'Island', type_line: 'Basic Land — Island', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {U}.)', colors: [] },
  Swamp: { name: 'Swamp', type_line: 'Basic Land — Swamp', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {B}.)', colors: [] },
};
const lido = n => { const r = L.ler(C[n]); assert.ok(r && r.completa, `${n} lida por inteiro`); return { ...r.script, example: { target: 'none', expect: { selfLife: 0 } } }; };
const SC = { Cidade: lido('Cidade'), Lodo: lido('Lodo'), Santuario: lido('Santuario'), Raio: { name: 'Raio', effects: [{ do: 'damage', amount: 3, target: 'any' }], example: { target: 'none', expect: { selfLife: 0 } } } };
function mesa(a, b, seed = 263) {
  const d = xs => xs.map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SC, first: 0, players: [{ name: 'A', deck: d(a) }, { name: 'B', deck: d(b) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  return limpaMao(s, 0);
}
const resolve = s => { for (let i = 0; i < 60 && (s.stack.length || s.pending); i++) { const pd = s.pending; s = pd ? act(s, legais(s, pd.p)[0]) : act(s, { t: 'pass', p: s.turn.priority }); } return s; };

test('M-582 · leitura: alvo por lista de tipos; três alvos "até" no cemitério; topo do grimório', () => {
  assert.equal(JSON.stringify(SC.Cidade.abilities[0].effects), JSON.stringify([{ do: 'bounce', target: { tipos: ['artifact', 'creature', 'enchantment', 'planeswalker'] } }]));
  assert.equal(SC.Lodo.effects.length, 3); assert.ok(SC.Lodo.effects.every(e => e.do === 'to_hand' && e.upTo === true));
  assert.equal(JSON.stringify(SC.Santuario.abilities[0].effects[0].target), JSON.stringify({ zona: 'graveyard', de: 'you', tipos: ['instant', 'sorcery'] }));
});

test('M-582 · canalizar: devolve o artefato do oponente à mão; terreno não é alvo', () => {
  let s = mesa([['Cidade', 4], ['Island', 36]], [['Pedra', 4], ['Swamp', 36]]), c, p, sw;
  [s, c] = poe(s, 0, 'Cidade', 'hand'); [s] = poe(s, 0, 'Island'); [s, p] = poe(s, 1, 'Pedra'); [s, sw] = poe(s, 1, 'Swamp');
  const of = legais(s, 0, x => x.oid === c && !/play/.test(x.t));
  assert.ok(of.some(x => JSON.stringify(x).includes(`"${p}"`)), 'a Pedra é alvo'); assert.ok(!of.some(x => JSON.stringify(x).includes(`"${sw}"`)), 'o Pântano não é alvo');
  s = resolve(act(s, of.find(x => JSON.stringify(x).includes(`"${p}"`))));
  assert.equal(s.objects[p].zone, 'hand'); assert.equal(s.objects[c].zone, 'graveyard', 'canalizar descarta a carta');
});

test('M-582 · 115.3/601.2c: o Lodo devolve até três terrenos diferentes do cemitério; zero também vale', () => {
  let s = mesa([['Lodo', 4], ['Island', 36]], [['Swamp', 40]]), l; const t = [];
  [s, l] = poe(s, 0, 'Lodo', 'hand'); [s] = poe(s, 0, 'Island');
  for (let i = 0; i < 3; i++) { let x; [s, x] = poe(s, 0, 'Island', 'graveyard'); t.push(x); }
  const of = legais(s, 0, x => x.t === 'cast' && x.oid === l);
  assert.ok(of.some(x => !(x.targets || []).length), 'pode conjurar sem alvo');
  assert.ok(of.every(x => new Set((x.targets || []).map(y => y.oid)).size === (x.targets || []).length), 'nunca o mesmo terreno duas vezes');
  const tres = of.find(x => (x.targets || []).length === 3); assert.ok(tres, 'oferece os três');
  s = resolve(act(s, tres));
  assert.ok(t.every(x => s.objects[x].zone === 'hand'), 'os três voltaram à mão');
});

test('M-582 · o Santuário põe a mágica instantânea do cemitério no topo do grimório', () => {
  let s = mesa([['Santuario', 4], ['Raio', 2], ['Island', 34]], [['Swamp', 40]]), sa, r;
  [s, sa] = poe(s, 0, 'Santuario', 'hand'); [s, r] = poe(s, 0, 'Raio', 'graveyard');
  s = resolve(act(s, legais(s, 0, x => x.oid === sa && /play/.test(x.t))[0]));
  assert.equal(s.zones[0].library[0], r, 'o Raio está no topo do grimório');
});
