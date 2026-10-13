// M-382 · LT49 · 702.143 prenunciar (foretell): "During your turn, you may pay {2} and exile this card from your hand face down. Cast it on a later
// turn for its foretell cost." — revisão por lote XL: Behold the Multiverse (Oracle do Forge, consulta de 12/10/2026; .listas/oficiais-revisadas.json),
// caminho de produção (APROVADAS). Os testes falham no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, act, poe, legais, passaAte, CARTAS } from './cmd.mjs';
import { valorDeMana, palavrasDoTexto, T } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const b = OF.find(x => x.name === 'Behold the Multiverse');
const CARDS = { ...CARTAS, 'Sunscape Familiar': { name: 'Sunscape Familiar', type_line: 'Creature — Wall', mana_cost: '{1}{W}', cmc: 2, keywords: ['defender'], oracle_text: 'Defender\nGreen spells and blue spells you cast cost {1} less to cast.', colors: ['W'], power: '0', toughness: '3' }, 'Behold the Multiverse': { name: b.name, type_line: b.type_line, mana_cost: b.mana_cost, cmc: valorDeMana(b.mana_cost), keywords: palavrasDoTexto(b.oracle_text), oracle_text: b.oracle_text, colors: ['U'] } };
function mesa() {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 10, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 12, mode: 'full', cards: CARDS, first: 0,
    players: [{ name: 'A', deck: baralho(['Behold the Multiverse', 'Island', 'Sunscape Familiar']) }, { name: 'B', deck: baralho(['Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending);

test('LT49 · prenunciar: no seu turno, paga {2} e exila virada para baixo; no mesmo turno não conjura; no turno seguinte (até no do oponente, é instantânea) conjura por {1}{U}', () => {
  let s = mesa(), bh; [s, bh] = poe(s, 0, 'Behold the Multiverse', 'hand'); for (let i = 0; i < 4; i++) [s] = poe(s, 0, 'Island');
  const pv = legais(s, 0, a => a.t === 'prever' && a.oid === bh); assert.equal(pv.length, 1, 'oferece prenunciar');
  s = act(s, pv[0]);
  assert.equal(s.objects[bh].zone, 'exile'); assert.equal(s.objects[bh].faceDown, true);
  assert.equal(s.zones[0].battlefield.filter(o => s.objects[o].name === 'Island' && s.objects[o].tapped).length, 2, 'pagou {2}');
  assert.equal(legais(s, 0, a => a.oid === bh && a.t === 'cast').length, 0, 'no mesmo turno, não');
  assert.ok(T.describe(s, { t: 'prever', p: 0, oid: bh }, [], s).join(' ').includes('prenunciou uma carta'), 'o registro não revela a carta');
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  s = act(s, { t: 'pass', p: 1 }); assert.equal(s.turn.priority, 0);
  const c = legais(s, 0, a => a.oid === bh && a.t === 'cast'); assert.ok(c.length && c.every(a => a.prevista), 'no turno do oponente, só pela prenunciada');
  const mao = s.zones[0].hand.length;
  s = resolve(act(s, c[0])); while (s.pending) s = act(s, legais(s, s.pending.p).find(a => a.t !== 'concede'));
  assert.equal(s.zones[0].hand.length, mao + 2, 'vidência 2 e compra 2'); assert.equal(s.objects[bh].zone, 'graveyard');
});

test('LT49 · prenunciar só no seu turno, e não sem mana para {2}', () => {
  let s = mesa(), bh; [s, bh] = poe(s, 0, 'Behold the Multiverse', 'hand');
  assert.equal(legais(s, 0, a => a.t === 'prever').length, 0, 'sem mana, não');
  [s] = poe(s, 0, 'Island'); [s] = poe(s, 0, 'Island');
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending); s = act(s, { t: 'pass', p: 1 });
  assert.equal(legais(s, 0, a => a.t === 'prever').length, 0, 'no turno do oponente, não');
});

test('LT49 · achado da revisão: a redução por cor (Sunscape Familiar: azuis custam {1} a menos) vale no custo de prenunciar — {1}{U} vira {U}', () => {
  let s = mesa(), bh, sf; [s, bh] = poe(s, 0, 'Behold the Multiverse', 'hand'); for (let i = 0; i < 2; i++) [s] = poe(s, 0, 'Island');
  s = act(s, legais(s, 0, a => a.t === 'prever' && a.oid === bh)[0]);
  s = passaAte(s, x => x.turn.active === 0 && x.turn.number > 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  [s, sf] = poe(s, 0, 'Sunscape Familiar');
  for (const o of s.zones[0].battlefield.filter(o => s.objects[o].name === 'Island').slice(1)) s.objects[o].tapped = true;
  const c = legais(s, 0, a => a.oid === bh && a.t === 'cast'); assert.ok(c.length, 'com uma Ilha só, a prenunciada sai por {U}');
  E.apply(s, c[0]);
});
