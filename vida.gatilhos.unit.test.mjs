// CR2b.7 · 119.9: gatilhos "whenever you gain life" — Ajani's Pridemate, Sanguine Bond, Epicure of Blood. Rulings: um disparo por evento de
// ganho, qualquer que seja a quantidade; cada criatura com vínculo vital que causa dano de combate é um evento; uma só criatura causando dano
// a vários recebedores ao mesmo tempo dispara uma vez. Texto oficial em .listas/oficiais-motor.json (mtg.wtf, 11/10/2026). Falham no v110.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, comMana, tudo, CARTAS } from './cmd.mjs';

const OF = Object.fromEntries(JSON.parse(readFileSync(new URL('./.listas/oficiais-motor.json', import.meta.url), 'utf8')).cartas.map(c => [c.name, { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: 2, keywords: [], oracle_text: c.oracle_text, colors: [], power: c.power, toughness: c.toughness }]));
const c = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: 0, keywords: [], oracle_text: '', colors: [...new Set((mana_cost.match(/[WUBRG]/g) || []))], ...extra });
const cards = { ...OF, Cura: c('Cura', 'Instant', '{W}'), Vampiro: c('Vampiro', 'Creature — Vampire', '{B}', { power: '2', toughness: '2', keywords: ['Lifelink'], oracle_text: 'Lifelink' }),
  Muro: c('Muro', 'Creature — Wall', '{W}', { power: '0', toughness: '1' }), Rolo: c('Rolo', 'Creature — Beast', '{B}', { power: '3', toughness: '3', keywords: ['Lifelink', 'Trample'], oracle_text: 'Trample, lifelink' }) };
const scripts = { Cura: { name: 'Cura', effects: [{ do: 'gain', amount: 3 }], example: { target: 'none', expect: { selfLife: 3 } } } };
function mesaX(a = [], b = []) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 12, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 1, mode: 'full', cards: { ...CARTAS, ...cards }, scripts, first: 0, players: [{ name: 'A', deck: baralho([...a, 'Plains', 'Swamp']) }, { name: 'B', deck: baralho([...b, 'Island', 'Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const cura = (s, oid) => { s = comMana(s, 'W'); return tudo(act(act(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === oid)[0]), { t: 'pass', p: 0 }), { t: 'pass', p: 1 })); };
const passa = s => act(s, { t: 'pass', p: s.turn.priority });

test('CR 119.9 · ganhar 3 de vida: Pridemate ganha um marcador (um evento), Sanguine Bond faz o oponente perder 3, Epicure faz perder 1', () => {
  let s = mesaX(["Ajani's Pridemate", 'Sanguine Bond', 'Epicure of Blood', 'Cura']), pm, cu;
  [s, pm] = poe(s, 0, "Ajani's Pridemate"); [s] = poe(s, 0, 'Sanguine Bond'); [s] = poe(s, 0, 'Epicure of Blood'); [s, cu] = poe(s, 0, 'Cura', 'hand');
  const v0 = s.players[0].life, v1 = s.players[1].life;
  s = cura(s, cu);
  assert.equal(s.players[0].life, v0 + 3);
  assert.equal(s.objects[pm].counters.p1p1, 1, 'um marcador, qualquer que seja a quantidade');
  assert.equal(v1 - s.players[1].life, 3 + 1, 'Sanguine Bond (that much: 3) + Epicure (1)');
});

test('CR 119.9 · ruling: dois atacantes com vínculo vital acertando juntos = dois eventos (Pridemate +2)', () => {
  let s = mesaX(["Ajani's Pridemate", 'Vampiro']), pm, v1, v2;
  [s, pm] = poe(s, 0, "Ajani's Pridemate"); [s, v1] = poe(s, 0, 'Vampiro'); [s, v2] = poe(s, 0, 'Vampiro');
  s = J(s); for (const o of [pm, v1, v2]) s.objects[o].sick = false;
  for (let i = 0; i < 10 && s.turn.step !== 'combat_attackers'; i++) s = passa(s);
  const at = legais(s, 0, x => x.t === 'attack' && x.attackers.includes(v1) && x.attackers.includes(v2) && !x.attackers.includes(pm))[0] || legais(s, 0, x => x.t === 'attack' && x.attackers.includes(v1) && x.attackers.includes(v2))[0];
  assert.ok(at, 'atacar com os dois Vampiros (passo ' + s.turn.step + ')'); s = act(s, at);
  for (let i = 0; i < 30 && s.turn.step !== 'main2'; i++) s = s.pending ? act(s, legais(s, s.pending.p)[0]) : passa(s);
  assert.equal(s.objects[pm].counters.p1p1, 2, 'dois eventos de ganho');
});

test('CR 119.9 · ruling: uma criatura com vínculo vital e atropelar causando dano ao bloqueador e ao jogador ao mesmo tempo = um evento (Pridemate +1)', () => {
  let s = mesaX(["Ajani's Pridemate", 'Rolo'], ['Muro']), pm, r, m;
  [s, pm] = poe(s, 0, "Ajani's Pridemate"); [s, r] = poe(s, 0, 'Rolo'); [s, m] = poe(s, 1, 'Muro');
  s = J(s); s.objects[r].sick = false;
  const v0 = s.players[0].life;
  for (let i = 0; i < 10 && s.turn.step !== 'combat_attackers'; i++) s = passa(s);
  s = act(s, legais(s, 0, x => x.t === 'attack' && x.attackers.length === 1 && x.attackers[0] === r)[0]);
  for (let i = 0; i < 6 && !(s.pending && s.pending.kind === 'blockers'); i++) s = passa(s);
  const bl = legais(s, 1, x => x.t === 'block' && JSON.stringify(x).includes(m))[0]; assert.ok(bl, 'o Muro bloqueia'); s = act(s, bl);
  for (let i = 0; i < 30 && s.turn.step !== 'main2'; i++) s = s.pending ? act(s, legais(s, s.pending.p).find(a => a.t !== 'concede')) : passa(s);
  assert.equal(s.players[0].life, v0 + 3, 'ganhou os 3 do dano (1 no Muro, 2 no jogador)');
  assert.equal(s.objects[pm].counters.p1p1, 1, 'um evento só');
});

test('CR 119.9 · sem ganho de vida (efeito "não pode ganhar vida"), nada dispara', () => {
  let s = mesaX(["Ajani's Pridemate", 'Cura']), pm, cu;
  [s, pm] = poe(s, 0, "Ajani's Pridemate"); [s, cu] = poe(s, 0, 'Cura', 'hand');
  s = J(s); s.players[0].efeitos = [{ naoGanhaVida: true, ate: 'fim-do-turno', by: 1 }];
  s = cura(s, cu);
  assert.equal(s.objects[pm].counters.p1p1 || 0, 0);
});
