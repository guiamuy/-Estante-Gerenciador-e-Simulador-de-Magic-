// M-592 · leitor e núcleo, competitivos na ordem gulosa da sentinela (texto da Scryfall de 25/10/2026 em cobertura/resumo.json):
// "Each opponent sacrifices a nontoken creature of their choice" e "Each opponent sacrifices a creature token of their choice"
// (Sheoldred's Edict, modal com o modo de planeswalker que já era lido). 701.21a: quem sacrifica escolhe; 111.1: ficha. Cartas de teste
// com nomes inventados; a aprovação das cartas do catálogo é da homologacao. Falha no motor anterior (os dois modos ficavam sem leitura
// e o edito não sabia restringir a fichas).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, act, poe, legais, passaAte, limpaMao } from './listas.mjs';
import { loadModules } from './_load.mjs';
const L = loadModules().leitor;
const C = {
  Edito: { name: 'Edito', mana_cost: '{1}{B}', cmc: 2, type_line: 'Instant', oracle_text: "Choose one —\n• Each opponent sacrifices a nontoken creature of their choice.\n• Each opponent sacrifices a creature token of their choice.\n• Each opponent sacrifices a planeswalker of their choice.", keywords: [], colors: ['B'] },
  Urso: { name: 'Urso', mana_cost: '{1}{G}', cmc: 2, type_line: 'Creature — Bear', oracle_text: '', power: '2', toughness: '2', keywords: [], colors: ['G'] },
  Chamado: { name: 'Chamado', mana_cost: '{G}', cmc: 1, type_line: 'Sorcery', oracle_text: 'Create a 1/1 green Saproling creature token.', keywords: [], colors: ['G'] },
  Swamp: { name: 'Swamp', type_line: 'Basic Land — Swamp', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {B}.)', colors: [] },
  Forest: { name: 'Forest', type_line: 'Basic Land — Forest', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {G}.)', colors: [] },
};
const ex = { example: { target: 'none', expect: { selfLife: 0 } } };
const r0 = L.ler(C.Edito);
const SC = { Edito: { ...r0.script, ...ex }, Urso: { name: 'Urso', ...ex }, Chamado: { name: 'Chamado', effects: [{ do: 'token', token: { name: 'Saproling', power: 1, toughness: 1, types: ['creature'], subtypes: ['Saproling'], colors: ['G'] }, amount: 1 }], ...ex } };
function mesa(seed = 273) {
  const d = xs => xs.map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SC, first: 1, players: [{ name: 'A', deck: d([['Edito', 4], ['Swamp', 36]]) }, { name: 'B', deck: d([['Urso', 4], ['Chamado', 4], ['Forest', 32]]) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  let ch; [s, ch] = poe(s, 1, 'Chamado', 'hand'); [s] = poe(s, 1, 'Forest');
  s = act(s, legais(s, 1, x => x.t === 'cast' && x.oid === ch)[0]); for (let i = 0; i < 10 && s.stack.length; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  let u; [s, u] = poe(s, 1, 'Urso');
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  s = limpaMao(s, 0); let e; [s, e] = poe(s, 0, 'Edito', 'hand'); for (let i = 0; i < 2; i++) [s] = poe(s, 0, 'Swamp');
  const ficha = s.zones[1].battlefield.find(o => s.objects[o].token);
  return { s, e, u, ficha };
}
const resolve = s => { for (let i = 0; i < 40 && s.stack.length && !s.pending; i++) s = act(s, { t: 'pass', p: s.turn.priority }); return s; };

test('M-592 · leitura: três modos, "nontoken" e "token" no edito', () => {
  assert.ok(r0 && r0.completa, 'lida por inteiro');
  assert.equal(JSON.stringify(r0.script.modes.map(m => m.effects[0])), JSON.stringify([
    { do: 'sacrificar', tipos: ['creature'], jogadores: 'cada-oponente', naoFicha: true },
    { do: 'sacrificar', tipos: ['creature'], jogadores: 'cada-oponente', soFicha: true },
    { do: 'sacrificar', tipos: ['planeswalker'], jogadores: 'cada-oponente' }]));
});

for (const [modo, sai, fica] of [[0, 'u', 'ficha'], [1, 'ficha', 'u']]) {
  test(`M-592 · 701.21a: modo ${modo + 1} — sai ${sai === 'u' ? 'a criatura que não é ficha' : 'a ficha'}, a outra fica`, () => {
    let { s, e, u, ficha } = mesa(); const o = { u, ficha }; assert.ok(ficha, 'B tem uma ficha');
    const of = legais(s, 0, x => x.t === 'cast' && x.oid === e && (x.mode === modo || (x.modes || []).includes(modo) || x.modo === modo));
    assert.ok(of.length, `o modo ${modo + 1} é oferecido`); s = resolve(act(s, of[0]));
    for (let i = 0; i < 4 && s.pending; i++) s = act(s, legais(s, s.pending.p)[0]);
    assert.ok(!s.objects[o[sai]] || s.objects[o[sai]].zone !== 'battlefield', 'a escolhida saiu');
    assert.equal(s.objects[o[fica]].zone, 'battlefield', 'a outra ficou');
  });
}
