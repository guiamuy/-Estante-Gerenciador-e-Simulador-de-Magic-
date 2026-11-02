// M-603 · leitor, competitivos na ordem gulosa da sentinela (texto da Scryfall de 01/11/2026 em cobertura/<formato>.json):
// Mossborn Hydra — "This creature enters with a +1/+1 counter on it." (122.6: entra já com o marcador) e "Landfall — Whenever a land you
// control enters, double the number of +1/+1 counters on this creature." (701.10: dobrar = pôr outros tantos, contados na resolução; só os
// terrenos que você controla). Cartas de teste com nomes inventados; a aprovação das cartas do catálogo é da homologacao. Falha no motor
// anterior (as duas frases ficavam sem leitura).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, act, poe, legais, passaAte, limpaMao } from './listas.mjs';
import { loadModules } from './_load.mjs';
const L = loadModules().leitor;
const C = {
  Hidra: { name: 'Hidra', mana_cost: '{2}{G}', cmc: 3, type_line: 'Creature — Elemental Hydra', oracle_text: "Trample (This creature can deal excess combat damage to the player or planeswalker it's attacking.)\nThis creature enters with a +1/+1 counter on it.\nLandfall — Whenever a land you control enters, double the number of +1/+1 counters on this creature.", power: '0', toughness: '0', keywords: ['Trample', 'Landfall'], colors: ['G'] },
  Forest: { name: 'Forest', type_line: 'Basic Land — Forest', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {G}.)', colors: [] },
};
const ex = { example: { target: 'none', expect: { selfLife: 0 } } };
const lido = n => { const r = L.ler(C[n]); assert.ok(r && r.completa, `${n} lida por inteiro`); return { ...r.script, ...ex }; };
const SC = { Hidra: lido('Hidra') };
function mesa(seed = 284) {
  const d = xs => xs.map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SC, first: 0, players: [{ name: 'A', deck: d([['Hidra', 4], ['Forest', 36]]) }, { name: 'B', deck: d([['Forest', 40]]) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  return limpaMao(s, 0);
}
const passa = s => act(s, { t: 'pass', p: s.turn.priority });
const resolve = s => { for (let i = 0; i < 40 && (s.stack.length || s.pending); i++) s = s.pending ? act(s, legais(s, s.pending.p)[0]) : passa(s); return s; };
const p1 = (s, o) => (s.objects[o].counters || {}).p1p1 || 0;

test('M-603 · leitura: entra com um marcador; dobrar os marcadores da própria criatura', () => {
  assert.equal(SC.Hidra.self.entersWithCounters, 1);
  const g = SC.Hidra.abilities[0]; assert.equal(g.kind, 'triggered');
  assert.equal(JSON.stringify(g.effects), JSON.stringify([{ do: 'counters', tipo: 'p1p1', amount: { per: 'counters-on-source' }, target: 'self-source' }]));
  assert.equal(loadModules().scripts.validateScript(SC.Hidra).length, 0);
});

test('M-603 · 122.6 e 701.10: conjurada entra 1/1; cada terreno seu dobra: 2, depois 4', () => {
  let s = mesa(), h, f1, f2; [s, h] = poe(s, 0, 'Hidra', 'hand'); for (let i = 0; i < 3; i++) [s] = poe(s, 0, 'Forest');
  s = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === h)[0]));
  assert.equal(s.objects[h].zone, 'battlefield'); assert.equal(p1(s, h), 1); assert.equal(E.stats(s, s.objects[h]).power, 1);
  [s, f1] = poe(s, 0, 'Forest', 'hand'); s = resolve(act(s, { t: 'play_land', p: 0, oid: f1 }));
  assert.equal(p1(s, h), 2, 'dobrou para 2');
  const t = s.turn.number; s = passaAte(s, x => x.turn.active === 0 && x.turn.number > t && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  [s, f2] = poe(s, 0, 'Forest', 'hand'); s = resolve(act(s, { t: 'play_land', p: 0, oid: f2 }));
  assert.equal(p1(s, h), 4, 'no turno seguinte, dobrou para 4');
});

test('M-603 · terreno do oponente não dispara', () => {
  let s = mesa(), h, fo; [s, h] = poe(s, 0, 'Hidra'); s = JSON.parse(JSON.stringify(s)); s.objects[h].counters = { p1p1: 3 };
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  [s, fo] = poe(s, 1, 'Forest', 'hand'); s = resolve(act(s, { t: 'play_land', p: 1, oid: fo }));
  assert.equal(p1(s, h), 3, 'o terreno do oponente não conta');
});
