// CR2b.8 · heroico (207.2c): Akroan Skyguard — "Heroic — Whenever you cast a spell that targets this creature, put a +1/+1 counter on this
// creature." Rulings (2013-09-15): resolve antes da mágica; uma vez por mágica; cópia não dispara. Texto oficial em .listas/oficiais-motor.json
// (mtg.wtf, 11/10/2026). Cada teste falha no motor anterior (o gatilho não existia).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, comMana, tudo, CARTAS } from './cmd.mjs';

const OF = Object.fromEntries(JSON.parse(readFileSync(new URL('./.listas/oficiais-motor.json', import.meta.url), 'utf8')).cartas.map(c => [c.name, { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: 2, keywords: /^Flying/.test(c.oracle_text) ? ['Flying'] : [], oracle_text: c.oracle_text, colors: ['W'], power: c.power, toughness: c.toughness }]));
const c = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: 1, keywords: [], oracle_text: '', colors: [...new Set((mana_cost.match(/[WUBRG]/g) || []))], ...extra });
const cards = { ...OF, Forca: c('Forca', 'Instant', '{W}'), Manto: c('Manto', 'Enchantment — Aura', '{W}'), Ursa: c('Ursa', 'Creature — Bear', '{G}', { power: '2', toughness: '2' }) };
const scripts = { Forca: { name: 'Forca', effects: [{ do: 'pump', power: 2, toughness: 2, target: 'creature' }], example: { target: 'own-creature', expect: { pump: [2, 2] } } },
  Manto: { name: 'Manto', aura: { enchant: 'creature' }, grants: { power: 1, toughness: 1 }, example: { action: 'aura', target: 'own-creature', expect: { attached: true } } } };
function mesaX(a = [], b = []) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 12, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 1, mode: 'full', cards: { ...CARTAS, ...cards }, scripts, first: 0, players: [{ name: 'A', deck: baralho([...a, 'Plains', 'Forest']) }, { name: 'B', deck: baralho([...b, 'Plains', 'Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const conjuraEm = (s, oid, alvo, p = 0) => { s = comMana(s, 'W', p); const a = legais(s, p, x => x.t === 'cast' && x.oid === oid && x.targets && x.targets[0] && x.targets[0].oid === alvo)[0]; assert.ok(a, 'conjurar mirando'); return act(s, a); };
const resolve = (s, p = 0) => tudo(act(act(s, { t: 'pass', p }), { t: 'pass', p: p === 0 ? 1 : 0 }));

test('CR 207.2c · heroico: instantânea mirando a Skyguard dispara; o gatilho fica por cima e resolve antes da mágica', () => {
  let s = mesaX(['Akroan Skyguard', 'Forca']), k, f;
  [s, k] = poe(s, 0, 'Akroan Skyguard'); [s, f] = poe(s, 0, 'Forca', 'hand');
  s = conjuraEm(s, f, k);
  assert.equal(s.stack.length, 2, 'mágica + gatilho heroico');
  assert.equal(s.objects[s.stack[s.stack.length - 1]].ability, true, 'o heroico fica por cima');
  s = resolve(s);
  assert.equal(s.objects[k].counters.p1p1, 1);
});

test('CR 207.2c · heroico também com Aura conjurada nela; mágica mirando outra criatura, ou do oponente, não dispara', () => {
  let s = mesaX(['Akroan Skyguard', 'Manto', 'Forca', 'Ursa'], ['Forca']), k, m, f, u, fb;
  [s, k] = poe(s, 0, 'Akroan Skyguard'); [s, u] = poe(s, 0, 'Ursa'); [s, m] = poe(s, 0, 'Manto', 'hand'); [s, f] = poe(s, 0, 'Forca', 'hand'); [s, fb] = poe(s, 1, 'Forca', 'hand');
  s = resolve(conjuraEm(s, m, k));
  assert.equal(s.objects[k].counters.p1p1, 1, 'a Aura mira ao ser conjurada');
  s = resolve(conjuraEm(s, f, u));
  assert.equal(s.objects[k].counters.p1p1, 1, 'mirou a Ursa: nada');
  s = J(s); s.turn.priority = 1; s = resolve(conjuraEm(s, fb, k, 1), 1);
  assert.equal(s.objects[k].counters.p1p1, 1, '"you cast": a mágica do oponente não dispara');
});
