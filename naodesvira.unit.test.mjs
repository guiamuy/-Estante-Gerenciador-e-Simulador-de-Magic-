// CR2g.6 · 502.3 e 122.1d: "não desvira no passo de desvirar" (Claustrophobia: "Enchanted creature doesn't untap during its controller's untap
// step"; efeito "no próximo passo de desvirar") e marcador de atordoamento (em vez de desvirar, tira um). Texto oficial da Claustrophobia em
// .listas/oficiais-motor.json (mtg.wtf, 11/10/2026). Falham no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, comMana, tudo, CARTAS } from './cmd.mjs';

const OF = Object.fromEntries(JSON.parse(readFileSync(new URL('./.listas/oficiais-motor.json', import.meta.url), 'utf8')).cartas.map(c => [c.name, { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: 3, keywords: [], oracle_text: c.oracle_text, colors: ['U'], power: c.power, toughness: c.toughness }]));
const c = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: 1, keywords: [], oracle_text: '', colors: [...new Set((mana_cost.match(/[WUBRG]/g) || []))], ...extra });
const cards = { ...OF, Ursa: c('Ursa', 'Creature — Bear', '{G}', { power: '2', toughness: '2' }), Gelo: c('Gelo', 'Instant', '{U}'), Atordoa: c('Atordoa', 'Instant', '{U}'), Acorda: c('Acorda', 'Instant', '{G}') };
const scripts = { Gelo: { name: 'Gelo', effects: [{ do: 'tap', target: 'creature' }, { do: 'nao_desvira', target: 'first-target' }], example: { target: 'enemy-creature', expect: { tapped: true } } },
  Atordoa: { name: 'Atordoa', effects: [{ do: 'tap', target: 'creature' }, { do: 'counters', tipo: 'stun', amount: 2, target: 'first-target' }], example: { target: 'enemy-creature', expect: { tapped: true } } },
  Acorda: { name: 'Acorda', effects: [{ do: 'untap', target: 'creature' }], example: { target: 'own-creature', expect: { tapped: false } } } };
function mesaX(a = [], b = []) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 12, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 1, mode: 'full', cards: { ...CARTAS, ...cards }, scripts, first: 0, players: [{ name: 'A', deck: baralho([...a, 'Island', 'Forest']) }, { name: 'B', deck: baralho([...b, 'Island', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const conjuraEm = (s, oid, alvo, mana, p = 0) => { s = comMana(s, mana, p); const a = legais(s, p, x => x.t === 'cast' && x.oid === oid && x.targets && x.targets[0] && x.targets[0].oid === alvo)[0]; assert.ok(a, 'conjurar mirando'); return tudo(act(act(act(s, a), { t: 'pass', p }), { t: 'pass', p: p ? 0 : 1 })); };
const turnoDe = (s, p) => { const t0 = s.turn.number; return passaAte(s, x => x.turn.number > t0 && x.turn.active === p && x.turn.step === 'main1' && !x.stack.length && !x.pending); };

test('CR 502.3 · Claustrophobia: vira a criatura ao entrar e ela não desvira nos passos de desvirar do controlador (mas desvira por efeito)', () => {
  let s = mesaX(['Claustrophobia'], ['Ursa', 'Acorda']), cl, u, ac;
  [s, u] = poe(s, 1, 'Ursa'); [s, cl] = poe(s, 0, 'Claustrophobia', 'hand'); [s, ac] = poe(s, 1, 'Acorda', 'hand');
  s = conjuraEm(s, cl, u, 'UUU');
  assert.equal(s.objects[cl].attachedTo, u); assert.equal(s.objects[u].tapped, true, 'virou ao entrar');
  s = turnoDe(s, 1); assert.equal(s.objects[u].tapped, true, 'não desvirou no passo de desvirar de B');
  s = J(s); s.turn.priority = 1; s = conjuraEm(s, ac, u, 'G', 1);
  assert.equal(s.objects[u].tapped, false, 'ruling: ainda desvira por outros meios');
});

test('CR 502.3 · "não desvira no próximo passo de desvirar": fica virada um passo e desvira no seguinte', () => {
  let s = mesaX(['Gelo'], ['Ursa']), g, u;
  [s, u] = poe(s, 1, 'Ursa'); [s, g] = poe(s, 0, 'Gelo', 'hand');
  s = conjuraEm(s, g, u, 'U');
  assert.equal(s.objects[u].tapped, true);
  s = turnoDe(s, 1); assert.equal(s.objects[u].tapped, true, 'o próximo passo de desvirar de B passou sem desvirar');
  s = turnoDe(s, 0); s = turnoDe(s, 1); assert.equal(s.objects[u].tapped, false, 'no seguinte, desvira');
});

test('CR 122.1d · marcador de atordoamento: em vez de desvirar, tira um (2 marcadores = dois passos virada)', () => {
  let s = mesaX(['Atordoa'], ['Ursa']), at, u;
  [s, u] = poe(s, 1, 'Ursa'); [s, at] = poe(s, 0, 'Atordoa', 'hand');
  s = conjuraEm(s, at, u, 'U');
  assert.equal(s.objects[u].counters.stun, 2);
  s = turnoDe(s, 1); assert.equal(s.objects[u].tapped, true); assert.equal(s.objects[u].counters.stun, 1);
  s = turnoDe(s, 0); s = turnoDe(s, 1); assert.equal(s.objects[u].tapped, true); assert.equal(s.objects[u].counters.stun || 0, 0);
  s = turnoDe(s, 0); s = turnoDe(s, 1); assert.equal(s.objects[u].tapped, false, 'sem marcador, desvira');
});
