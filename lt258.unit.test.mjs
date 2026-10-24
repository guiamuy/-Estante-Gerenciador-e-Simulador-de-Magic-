// M-577 · Commander, núcleo cEDH (ordem gulosa da I-300): "If you control a commander, you may cast this spell without paying its mana cost."
// (texto da API da Scryfall de 24/10/2026). CR 903.3d: controlar um comandante é controlar uma permanente no campo que é um comandante —
// o comandante na zona de comando não conta; CR 118.9: conjurar sem pagar é custo alternativo. Fierce Guardianship (137 listas),
// Flawless Maneuver e Deadly Rollick passam a jogar; Deflecting Swat e Obscuring Haze têm uma segunda frase ainda sem leitura. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, S, act, poe, legais, passaAte, limpaMao } from './listas.mjs';
const T = {
  'Fierce Guardianship': 'If you control a commander, you may cast this spell without paying its mana cost.\nCounter target noncreature spell.',
  'Flawless Maneuver': 'If you control a commander, you may cast this spell without paying its mana cost.\nCreatures you control gain indestructible until end of turn.',
  'Deadly Rollick': 'If you control a commander, you may cast this spell without paying its mana cost.\nExile target creature.',
  'Deflecting Swat': 'If you control a commander, you may cast this spell without paying its mana cost.\nYou may choose new targets for target spell or ability.',
};
const C = {
  'Fierce Guardianship': { name: 'Fierce Guardianship', mana_cost: '{2}{U}', cmc: 3, type_line: 'Instant', oracle_text: T['Fierce Guardianship'], keywords: [], colors: ['U'] },
  'Flawless Maneuver': { name: 'Flawless Maneuver', mana_cost: '{2}{W}', cmc: 3, type_line: 'Instant', oracle_text: T['Flawless Maneuver'], keywords: [], colors: ['W'] },
  'Deadly Rollick': { name: 'Deadly Rollick', mana_cost: '{3}{B}', cmc: 4, type_line: 'Instant', oracle_text: T['Deadly Rollick'], keywords: [], colors: ['B'] },
  'Deflecting Swat': { name: 'Deflecting Swat', mana_cost: '{2}{R}', cmc: 3, type_line: 'Instant', oracle_text: T['Deflecting Swat'], keywords: [], colors: ['R'] },
  Island: { name: 'Island', type_line: 'Basic Land — Island', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {U}.)', colors: [] },
  Swamp: { name: 'Swamp', type_line: 'Basic Land — Swamp', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {B}.)', colors: [] },
  'Capitã': { name: 'Capitã', type_line: 'Legendary Creature — Human Soldier', mana_cost: '{U}', cmc: 1, keywords: [], oracle_text: '', power: '1', toughness: '1', colors: ['U'] },
  'Rival': { name: 'Rival', type_line: 'Legendary Creature — Human Rogue', mana_cost: '{B}', cmc: 1, keywords: [], oracle_text: '', power: '1', toughness: '1', colors: ['B'] },
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{B}', cmc: 2, keywords: [], oracle_text: '', power: '2', toughness: '2', colors: ['B'] },
  'Lightning Bolt': { name: 'Lightning Bolt', type_line: 'Instant', mana_cost: '{R}', cmc: 1, keywords: [], oracle_text: 'Lightning Bolt deals 3 damage to any target.', colors: ['R'] },
  Mountain: { name: 'Mountain', type_line: 'Basic Land — Mountain', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {R}.)', colors: [] },
};
function mesa({ formato = 'commander', mao = 'Fierce Guardianship', seed = 258 } = {}) {
  const d = (cmd, resto) => [{ name: cmd, qty: 1, zone: formato === 'commander' ? 'commander' : 'main' }, ...resto.map(([name, qty]) => ({ name, qty, zone: 'main' }))];
  let s = E.createGame({ format: formato, seed, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: d('Capitã', [[mao, 1], ['Island', 98]]) }, { name: 'B', deck: d('Rival', [['Lightning Bolt', 4], ['Urso', 4], ['Mountain', 91]]) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  return limpaMao(s, 0);
}
const gratis = (s, p, oid) => legais(s, p, x => x.t === 'cast' && x.oid === oid && x.alt != null);
const resolve = s => { for (let i = 0; i < 60 && (s.stack.length || s.pending); i++) { const pd = s.pending; s = pd ? act(s, legais(s, pd.p)[0]) : act(s, { t: 'pass', p: s.turn.priority }); } return s; };
const comandanteNoCampo = s => { const oid = s.zones[0].command[0]; assert.ok(oid && s.objects[oid].commander, 'Capitã na zona de comando'); [s] = poe(s, 0, 'Island'); s = resolve(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === oid)[0])); assert.equal(s.objects[oid].zone, 'battlefield'); return [s, oid]; };

test('M-577 · Fierce Guardianship, Flawless Maneuver e Deadly Rollick jogam (lidas e aprovadas); Deflecting Swat ainda não', () => {
  for (const n of ['Fierce Guardianship', 'Flawless Maneuver', 'Deadly Rollick']) assert.equal(S.coverage(C[n]).level, 'completo', n);
  assert.notEqual(S.coverage(C['Deflecting Swat']).level, 'completo', 'a segunda frase (novos alvos) ainda não tem leitura');
});

test('M-577 · CR 903.3d: com o comandante na zona de comando não há conjuração de graça; com ele no campo, há — e a mágica do oponente é anulada sem gastar mana', () => {
  let s = mesa(), f, c;
  [s, f] = poe(s, 0, 'Fierce Guardianship', 'hand');
  assert.equal(gratis(s, 0, f).length, 0, 'sem alvo e sem comandante no campo, nada');
  let oid; [s, oid] = comandanteNoCampo(s);
  assert.equal(s.objects[oid].commander, true, 'a Capitã continua sendo comandante no campo (903.3)');
  // o oponente conjura Lightning Bolt na Capitã; A responde de graça
  [s] = poe(s, 1, 'Mountain'); [s, c] = poe(s, 1, 'Lightning Bolt', 'hand');
  let t = JSON.parse(JSON.stringify(s)); t.turn.priority = 1;
  t = act(t, legais(t, 1, x => x.t === 'cast' && x.oid === c && (x.targets || []).some(y => y.oid === oid))[0]); t = act(t, { t: 'pass', p: 1 });
  const desvirados = t.zones[0].battlefield.filter(x => /Island/.test(t.objects[x].name) && !t.objects[x].tapped).length;
  const g = gratis(t, 0, f); assert.ok(g.length, 'oferece conjurar de graça');
  t = act(t, g[0]);
  assert.equal(t.zones[0].battlefield.filter(x => /Island/.test(t.objects[x].name) && !t.objects[x].tapped).length, desvirados, 'nenhuma Ilha virada');
  t = resolve(t);
  assert.equal(t.objects[c].zone, 'graveyard'); assert.equal(t.objects[oid].zone, 'battlefield'); assert.equal(t.objects[oid].damage || 0, 0, 'Lightning Bolt anulado');
});

test('M-577 · sem o comandante no campo e fora do Commander, só o custo normal', () => {
  let s = mesa({ mao: 'Deadly Rollick' }), d, u, oid;
  [s, d] = poe(s, 0, 'Deadly Rollick', 'hand'); [s, u] = poe(s, 1, 'Urso');
  [s, oid] = comandanteNoCampo(s);
  assert.ok(gratis(s, 0, d).length, 'com a Capitã no campo, de graça no Urso');
  const t = JSON.parse(JSON.stringify(s)); t.objects[oid].controller = 1; // controlar um comandante: é preciso controlar a permanente
  assert.equal(gratis(t, 0, d).length, 0, 'o comandante controlado pelo oponente não serve');
  let l = mesa({ formato: 'livre', mao: 'Deadly Rollick' }), d2; [l, d2] = poe(l, 0, 'Deadly Rollick', 'hand'); [l] = poe(l, 1, 'Urso'); [l] = poe(l, 0, 'Capitã');
  assert.equal(gratis(l, 0, d2).length, 0, 'na partida livre a lendária não é comandante');
  s = resolve(act(s, gratis(s, 0, d).find(x => (x.targets || []).some(y => y.oid === u)))); assert.equal(s.objects[u].zone, 'exile'); assert.equal(s.objects[oid].zone, 'battlefield');
});

test('M-577 · Flawless Maneuver de graça: suas criaturas ficam indestrutíveis até o fim do turno', () => {
  let s = mesa({ mao: 'Flawless Maneuver' }), f, oid;
  [s, f] = poe(s, 0, 'Flawless Maneuver', 'hand'); [s, oid] = comandanteNoCampo(s);
  s = resolve(act(s, gratis(s, 0, f)[0]));
  assert.ok(E.hasKeyword(s, s.objects[oid], 'indestructible'), 'a Capitã indestrutível'); s = passaAte(s, x => x.turn.active === 1); assert.ok(!E.hasKeyword(s, s.objects[oid], 'indestructible'), 'só até o fim do turno');
});
