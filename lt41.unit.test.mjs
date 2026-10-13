// M-358 · 604.3 / 613.4a · P/T definido por contagem em ficha, com soma de contagens — Seize the Storm (texto do Oracle do Forge em
// .listas/oficiais-listas.json, consulta de 12/10/2026, trilha listas): "Create a red Elemental creature token with trample and 'This token's power
// and toughness are each equal to the number of instant and sorcery cards in your graveyard, plus the number of cards with flashback you own in
// exile.' Flashback {6}{R}". O script aqui é de teste; o da carta (M a Z) é da trilha listas. Todos os testes falham no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S as SC, T, J, act, poe, legais, passaAte } from './listas.mjs';
import { CARTAS, comMana } from './cmd.mjs';

const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-listas.json', import.meta.url), 'utf8'));
const acha = (o, n) => { if (Array.isArray(o)) { for (const v of o) { const r = acha(v, n); if (r) return r; } } else if (o && typeof o === 'object') { if (o.name === n) return o; for (const v of Object.values(o)) { const r = acha(v, n); if (r) return r; } } return null; };
const st = acha(OF, 'Seize the Storm');
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: 1, keywords: [], oracle_text: '', colors: [...new Set((mana_cost.match(/[WUBRG]/g) || []))], ...extra });
const cards = { 'Seize the Storm': { name: st.name, type_line: st.type_line, mana_cost: st.mana_cost, cmc: 5, keywords: ['Flashback'], oracle_text: st.oracle_text, colors: ['R'] },
  Faisca: c0('Faisca', 'Instant', '{R}'), Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2' }) };
const X = { per: 'soma', partes: [{ per: 'instants-sorceries-in-your-graveyard' }, { per: 'flashback-cards-you-own-in-exile' }] };
const SEIZE = { name: 'Seize the Storm', flashback: { mana: '{6}{R}' },
  effects: [{ do: 'token', amount: 1, token: { name: 'Elemental', types: ['creature'], subtypes: ['Elemental'], colors: ['R'], keywords: ['trample'], power: 0, toughness: 0, self: { ptDefinido: { poder: X, resistencia: X } } } }],
  example: { action: 'cast', target: 'none', expect: { selfLife: 20 } } };
const scripts = { 'Seize the Storm': SEIZE, Faisca: { name: 'Faisca', effects: [{ do: 'damage', amount: 1, target: 'any' }], example: { target: 'enemy-player', expect: { selfLife: 20 } } } };
function mesaS(seed = 61) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: { ...CARTAS, ...cards }, scripts, first: 0, players: [{ name: 'A', deck: baralho(['Seize the Storm', 'Faisca', 'Urso', 'Mountain']) }, { name: 'B', deck: baralho(['Plains', 'Island']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolveSo = s => act(act(s, { t: 'pass', p: s.turn.priority }), { t: 'pass', p: 1 - s.turn.priority });
const fichas = s => s.zones[0].battlefield.map(o => s.objects[o]).filter(o => o.name === 'Elemental');

test('M-358 · validador: "soma" precisa de duas ou mais contagens conhecidas', () => {
  assert.deepEqual([...SC.validateScript(SEIZE)], []);
  const com = v => ({ ...SEIZE, effects: [{ do: 'gain', amount: v }] });
  assert.ok(SC.validateScript(com({ per: 'soma', partes: [{ per: 'cards-in-hand' }] })).some(e => /soma/.test(e)));
  assert.ok(SC.validateScript(com({ per: 'soma', partes: [{ per: 'cards-in-hand' }, { per: 'inventada' }] })).some(e => /inventada/.test(e)));
  assert.deepEqual([...SC.validateScript(com({ per: 'soma', partes: [{ per: 'cards-in-hand' }, { per: 'instants-sorceries-in-your-graveyard' }] }))], []);
});

test('M-358 · 604.3: a ficha conta instantâneas e feitiços no seu cemitério (a própria Seize, depois de resolver) e lampejos seus no exílio', () => {
  let s = mesaS(), se, f1, f2;
  [s, f1] = poe(s, 0, 'Faisca', 'graveyard'); [s, f2] = poe(s, 0, 'Faisca', 'graveyard'); [s, se] = poe(s, 0, 'Seize the Storm', 'hand');
  let m = comMana(s, 'RRRRR'); s = resolveSo(act(m, legais(m, 0, a => a.t === 'cast' && a.oid === se && !a.flashback)[0]));
  let [el] = fichas(s); assert.ok(el, 'criou a ficha');
  assert.deepEqual((st => [st.power, st.toughness])(E.stats(s, el)), [3, 3], 'duas Faisca + a própria Seize no cemitério');
  assert.ok(s.facts.Elemental.kw.includes('trample'), 'atropelar');
  m = comMana(s, 'RRRRRRR'); const fb = legais(m, 0, a => a.t === 'cast' && a.oid === se && a.flashback)[0]; assert.ok(fb, 'lampejo do passado oferecido');
  s = resolveSo(act(m, fb));
  assert.equal(s.objects[se].zone, 'exile');
  const els = fichas(s); assert.equal(els.length, 2);
  for (const x of els) assert.deepEqual((st => [st.power, st.toughness])(E.stats(s, x)), [3, 3], 'duas Faisca no cemitério + a Seize (lampejo) no exílio');
  s = J(s); s.zones[0].graveyard = s.zones[0].graveyard.filter(x => x !== f1); s.zones[0].exile.push(f1); s.objects[f1].zone = 'exile';
  assert.deepEqual((st => [st.power, st.toughness])(E.stats(s, s.objects[els[0].oid])), [2, 2], 'Faisca exilada sem lampejo não conta em lugar nenhum');
});

test('M-358 · a contagem é de quem controla a ficha: cartas do oponente não contam; ficha com 0 de resistência morre (704.5f)', () => {
  let s = mesaS(), se;
  [s, se] = poe(s, 0, 'Seize the Storm', 'hand');
  s = J(s); s.zones[1].graveyard.push(...s.zones[1].library.splice(0, 3)); for (const o of s.zones[1].graveyard) s.objects[o].zone = 'graveyard';
  const m = comMana(s, 'RRRRR'); s = resolveSo(act(m, legais(m, 0, a => a.t === 'cast' && a.oid === se && !a.flashback)[0]));
  const [el] = fichas(s); assert.ok(el);
  assert.deepEqual((st => [st.power, st.toughness])(E.stats(s, el)), [1, 1], 'só a própria Seize no cemitério de A');
  let t = J(s); t.zones[0].graveyard = t.zones[0].graveyard.filter(x => x !== se); t.zones[0].hand.push(se); t.objects[se].zone = 'hand';
  t = act(t, { t: 'pass', p: t.turn.priority });
  assert.equal(fichas(t).length, 0, 'com 0 de resistência, a ficha vai para o cemitério e some');
});

test('M-358 · achados da revisão: carta com lampejo exilada virada para baixo não conta (708.2); a pilha explicada diz como a ficha é medida', () => {
  let s = mesaS(), se, f1;
  [s, f1] = poe(s, 0, 'Faisca', 'graveyard'); [s, se] = poe(s, 0, 'Seize the Storm', 'hand');
  const m = comMana(s, 'RRRRR'), c = act(m, legais(m, 0, a => a.t === 'cast' && a.oid === se && !a.flashback)[0]);
  const txt = JSON.stringify(T.explicaPilha(c, { oracleDe: () => '' }));
  assert.match(txt, /poder e resistência iguais a mágicas instantâneas e feitiços no seu cemitério mais cartas com lampejo do passado suas no exílio e atropelar/);
  s = resolveSo(c);
  const [el] = fichas(s); assert.deepEqual((st => [st.power, st.toughness])(E.stats(s, el)), [2, 2]);
  s = J(s); s.zones[0].graveyard = s.zones[0].graveyard.filter(x => x !== se); s.zones[0].exile.push(se); s.objects[se].zone = 'exile';
  assert.deepEqual((st => [st.power, st.toughness])(E.stats(s, s.objects[el.oid])), [2, 2], 'Seize no exílio conta (lampejo impresso)');
  s.objects[se].faceDown = true;
  assert.deepEqual((st => [st.power, st.toughness])(E.stats(s, s.objects[el.oid])), [1, 1], 'virada para baixo não tem lampejo');
});
