// M-378 · LT46 · 603.3d / 601.2d · dano dividido em habilidade disparada: "Whenever Inferno Titan enters or attacks, it deals 3 damage divided as
// you choose among one, two, or three targets" (Oracle do Forge, consulta de 12/10/2026). O gatilho escolhe alvos e divisão ao ir para a pilha;
// "enters or attacks" vira dois gatilhos com o mesmo efeito (precedente: Cryogen Relic, M-349). Os testes falham no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, act, poe, legais, passaAte, CARTAS } from './cmd.mjs';
import { S, valorDeMana } from './listas.mjs';
const cores = c => [...new Set((c || '').match(/[WUBRG]/g) || [])];
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: valorDeMana(mana_cost), keywords: [], oracle_text: '', colors: cores(mana_cost), ...extra });
const EX = { example: { target: 'none', expect: { selfLife: 20 } } };
const TITA = { name: 'Tita', abilities: [{ kind: 'triggered', when: 'etb', effects: [{ do: 'damage', amount: 3, target: 'any', dividido: { max: 3 } }] }, { kind: 'triggered', when: 'attacks', effects: [{ do: 'damage', amount: 3, target: 'any', dividido: { max: 3 } }] }], ...EX };
const CARDS = { ...CARTAS, Tita: c0('Tita', 'Creature — Giant', '{4}{R}{R}', { power: '6', toughness: '6' }), Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2' }), Esquilo: c0('Esquilo', 'Creature — Squirrel', '{G}', { power: '1', toughness: '1' }) };
function mesa() {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 6, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 8, mode: 'full', cards: CARDS, scripts: { Tita: TITA }, first: 0,
    players: [{ name: 'A', deck: baralho(['Tita', 'Mountain']) }, { name: 'B', deck: baralho(['Urso', 'Esquilo', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending);
const ponto = (s, i) => act(s, { t: 'dividir_ponto', p: 0, index: i });

test('LT46 · o script é válido; habilidade ativada com dano dividido ainda é recusada pelo validador', () => {
  assert.deepEqual([...S.validateScript(TITA)], []);
  assert.ok(S.validateScript({ name: 'X', abilities: [{ kind: 'activated', cost: { mana: '{R}' }, effects: [{ do: 'damage', amount: 2, target: 'any', dividido: { max: 2 } }] }], ...EX }).length);
});

test('LT46 · Tita entra: o gatilho pede a divisão de 3 (2 no Urso, 1 no Esquilo) e, ao resolver, os dois morrem', () => {
  let s = mesa(), t, u, e; [s, t] = poe(s, 0, 'Tita', 'hand'); for (let i = 0; i < 6; i++) [s] = poe(s, 0, 'Mountain'); [s, u] = poe(s, 1, 'Urso'); [s, e] = poe(s, 1, 'Esquilo');
  s = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === t)[0]));
  assert.equal(s.pending && s.pending.kind, 'dividir_magia'); assert.equal(s.pending.total, 3);
  const iu = s.pending.options.findIndex(o => o.oid === u), ie = s.pending.options.findIndex(o => o.oid === e);
  s = ponto(ponto(ponto(s, iu), ie), iu); assert.ok(!s.pending);
  const ab = s.stack.map(o => s.objects[o]).find(o => o.ability); assert.ok(ab, 'o gatilho na pilha'); assert.deepEqual([...ab.divisao], [2, 1]);
  s = resolve(s); assert.equal(s.objects[u].zone, 'graveyard'); assert.equal(s.objects[e].zone, 'graveyard');
});

test('LT46 · Tita ataca: o gatilho de ataque também divide (3 no oponente)', () => {
  let s = mesa(), t; [s, t] = poe(s, 0, 'Tita', 'battlefield'); s.objects[t].sick = false;
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers'); s = act(s, { t: 'attack', p: 0, attackers: [t] });
  s = passaAte(s, x => !!x.pending && x.pending.kind === 'dividir_magia');
  const ij = s.pending.options.findIndex(o => o.player === 1); s = ponto(ponto(ponto(s, ij), ij), ij);
  s = resolve(s); assert.equal(s.players[1].life, 17);
});
