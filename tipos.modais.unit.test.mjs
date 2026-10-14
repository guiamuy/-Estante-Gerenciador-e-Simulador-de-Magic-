// T-104 · CR5 · Mágicas modais com número variável de modos: "Choose one or both —" e "Choose one or more —" (Comprehensive Rules 700.2a, 700.2c, 700.2d).
// Texto da regra: .regras/cr-2026-09-25.txt. Cartas com o texto oficial de .listas/oficiais-tipos.json (Oracle do Forge, clone de 13/10/2026,
// conferido no master em 14/10/2026): Grim Discovery, Branching Bolt, Winterflame, Fissure Vent, Crush Contraband, Vandalize, Rain of Thorns e
// Casualties of War. "Urso", "Ave", "Totem", "Aura Solta", "Andarilho" e "Ermo" são cartas de teste.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S as SC, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const NOMES = ['Grim Discovery', 'Branching Bolt', 'Winterflame', 'Fissure Vent', 'Crush Contraband', 'Vandalize', 'Rain of Thorns', 'Casualties of War'];
const C = {};
for (const c of L('oficiais-tipos.json').filter(x => NOMES.includes(x.name)))
  C[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: [] };
C.Mountain = { name: 'Mountain', type_line: 'Basic Land — Mountain', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {R}.)', colors: [] };
const carta = (name, type_line, extra = {}) => { C[name] = { name, type_line, mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra }; };
carta('Urso', 'Creature — Bear', { power: '2', toughness: '2' }); carta('Ave', 'Creature — Bird', { power: '1', toughness: '1', keywords: ['Flying'], oracle_text: 'Flying' });
carta('Totem', 'Artifact'); carta('Aura Solta', 'Enchantment'); carta('Andarilho', 'Legendary Planeswalker — Teste', { loyalty: '3' }); carta('Ermo', 'Land');
function mesa(seed = 1) {
  const deck = [...Object.keys(C).filter(n => n !== 'Mountain').map(name => ({ name, qty: 2, zone: 'main' })), { name: 'Mountain', qty: 16, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: {}, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p = 0, n = 9) => { s = J(s); for (const c of 'WUBRGC') s.players[p].pool[c] += n; return s; };
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const ofertas = (s, oid) => legais(s, 0, x => x.t === 'cast' && x.oid === oid);
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending);
const no = (s, oid) => s.objects[oid].zone;

test('CR 700.2d · Branching Bolt (texto oficial): "one or both" — oferece um modo só e os dois; com os dois, cada modo tem o seu alvo e as duas criaturas morrem', () => {
  let s = mesa(); let b, ave, urso; [s, b] = poe(s, 0, 'Branching Bolt', 'hand'); [s, ave] = poe(s, 1, 'Ave', 'battlefield'); [s, urso] = poe(s, 1, 'Urso', 'battlefield'); s = mana(s);
  const os = ofertas(s, b).filter(x => x.targets.every(t => t.oid === ave || t.oid === urso));
  eq([...new Set(os.map(x => x.modes.join('+')))].sort(), ['0', '0+1', '1'], 'um, outro ou os dois');
  assert.ok(os.filter(x => x.modes.includes(0)).every(x => x.targets[0].oid === ave), 'o primeiro modo só mira criatura com voar');
  const ambos = os.find(x => x.modes.length === 2 && x.targets[0].oid === ave && x.targets[1].oid === urso);
  s = resolve(act(s, ambos));
  eq([no(s, ave), no(s, urso)], ['graveyard', 'graveyard']);
});

test('CR 700.2a · Grim Discovery (texto oficial): o modo sem alvo legal não pode ser escolhido — sem terreno no cemitério, só o da criatura; com os dois, as duas voltam à mão', () => {
  let s = mesa(); let g, u, t; [s, g] = poe(s, 0, 'Grim Discovery', 'hand'); [s, u] = poe(s, 0, 'Urso', 'graveyard'); s = mana(s);
  eq([...new Set(ofertas(s, g).map(x => x.modes.join('+')))], ['0'], 'sem terreno no cemitério, só o modo da criatura');
  [s, t] = poe(s, 0, 'Ermo', 'graveyard');
  const ambos = ofertas(s, g).find(x => x.modes.length === 2 && x.targets[0].oid === u && x.targets[1].oid === t);
  assert.ok(ambos, 'com terreno no cemitério, os dois modos');
  const mao = s.zones[0].hand.length; s = resolve(act(s, ambos));
  eq([no(s, u), no(s, t), s.zones[0].hand.length - mao], ['hand', 'hand', 1], 'as duas na mão (a mágica saiu dela)');
});

test('CR 700.2d · nenhum modo ou modos demais: a conjuração é recusada', () => {
  let s = mesa(); let w, u; [s, w] = poe(s, 0, 'Winterflame', 'hand'); [s, u] = poe(s, 1, 'Urso', 'battlefield'); s = mana(s);
  assert.throws(() => act(s, { t: 'cast', p: 0, oid: w, modes: [], targets: [] }), /de 1 a 2 modos/);
  assert.throws(() => act(s, { t: 'cast', p: 0, oid: w, modes: [0, 1, 1], targets: [{ oid: u }, { oid: u }, { oid: u }] }), /modos/);
});

test('CR 700.2d · Winterflame (texto oficial): os dois modos podem mirar a mesma criatura (cada "alvo" é de um modo)', () => {
  let s = mesa(); let w, u; [s, w] = poe(s, 0, 'Winterflame', 'hand'); [s, u] = poe(s, 1, 'Urso', 'battlefield'); s = mana(s);
  const a = ofertas(s, w).find(x => x.modes.length === 2 && x.targets[0].oid === u && x.targets[1].oid === u);
  assert.ok(a, 'a mesma criatura nos dois modos');
  s = resolve(act(s, a));
  eq(no(s, u), 'graveyard', 'virada e com 2 de dano: morreu');
});

test('CR 700.2d · Casualties of War (texto oficial): "one or more" — os cinco modos de uma vez, cada um no seu alvo', () => {
  let s = mesa(); let c; [s, c] = poe(s, 0, 'Casualties of War', 'hand'); s = mana(s);
  const alvos = {}; for (const n of ['Totem', 'Urso', 'Aura Solta', 'Ermo', 'Andarilho']) { let o; [s, o] = poe(s, 1, n, 'battlefield'); alvos[n] = o; }
  s = J(s); s.objects[alvos.Andarilho].counters.loyalty = 3;
  const todos = ofertas(s, c).find(x => x.modes.length === 5 && ['Totem', 'Urso', 'Aura Solta', 'Ermo', 'Andarilho'].every((n, k) => x.targets[k].oid === alvos[n]));
  assert.ok(todos, 'os cinco modos, um alvo cada');
  s = resolve(act(s, todos));
  eq(Object.values(alvos).map(o => no(s, o)), Array(5).fill('graveyard'));
});

test('CR 700.2d · Rain of Thorns, Crush Contraband, Fissure Vent e Vandalize (textos oficiais): um modo só também vale', () => {
  let s = mesa(); let r, cc, fv, v, en, art, ter; [s, r] = poe(s, 0, 'Rain of Thorns', 'hand'); [s, cc] = poe(s, 0, 'Crush Contraband', 'hand'); [s, fv] = poe(s, 0, 'Fissure Vent', 'hand'); [s, v] = poe(s, 0, 'Vandalize', 'hand');
  [s, en] = poe(s, 1, 'Aura Solta', 'battlefield'); [s, art] = poe(s, 1, 'Totem', 'battlefield'); [s, ter] = poe(s, 1, 'Mountain', 'battlefield'); s = mana(s);
  s = resolve(act(s, ofertas(s, cc).find(x => x.modes.join() === '1' && x.targets[0].oid === en)));
  eq(no(s, en), 'exile', 'Crush Contraband: exilou o encantamento');
  assert.ok(!ofertas(s, fv).some(x => x.modes.includes(1) && x.targets.some(t => t.oid === ter)), 'Fissure Vent não mira terreno básico');
  s = resolve(act(s, ofertas(s, v).find(x => x.modes.join() === '1' && x.targets[0].oid === ter)));
  s = resolve(act(s, ofertas(s, r).find(x => x.modes.join() === '0' && x.targets[0].oid === art)));
  eq([no(s, ter), no(s, art)], ['graveyard', 'graveyard']);
});

test('CR 700.2d · validador', () => {
  const v = sc => J(SC.validateScript({ name: 'X', ...sc, example: { action: 'mode:0', target: 'none', expect: { selfLife: 0 } } }));
  const M = [{ label: 'a', effects: [{ do: 'gain', amount: 1 }] }, { label: 'b', effects: [{ do: 'gain', amount: 2 }] }];
  eq(v({ modeCount: 2, modeMin: 1, modes: M }), []);
  assert.ok(v({ modeCount: 2, modeMin: 2, modes: M }).some(e => /modeMin/.test(e)), 'modeMin menor que modeCount');
  assert.ok(v({ modeMin: 1, modes: M }).some(e => /modeMin/.test(e)), 'modeMin só com modeCount');
  assert.ok(v({ modeCount: 2, modeMin: 1, modeRepeat: true, modes: M }).some(e => /modeMin/.test(e)), 'sem repetir');
});
