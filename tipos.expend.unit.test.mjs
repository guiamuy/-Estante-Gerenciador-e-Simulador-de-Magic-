// T-85 · CR5 · "Whenever you expend N" (Comprehensive Rules 700.14, com 601.2h e 603.2).
// Texto da regra: .regras/cr-2026-09-25.txt. Cartas com o texto oficial de .listas/oficiais-tipos.json (Oracle do Forge, clone de
// 13/10/2026): Teapot Slinger, Bakersbane Duo, Bark-Knuckle Boxer e Wandertale Mentor. "Três", "Um" e "Pedra" são cartas de teste.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S as SC, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const C = {};
for (const c of L('oficiais-tipos.json').filter(x => ['Teapot Slinger', 'Bakersbane Duo', 'Bark-Knuckle Boxer', 'Wandertale Mentor'].includes(x.name)))
  C[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: [], power: c.power, toughness: c.toughness };
C.Forest = { name: 'Forest', type_line: 'Basic Land — Forest', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {G}.)', colors: [] };
const carta = (name, type_line, extra = {}) => { C[name] = { name, type_line, mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra }; };
carta('Três', 'Sorcery', { mana_cost: '{3}', cmc: 3 }); carta('Um', 'Instant'); carta('Pedra', 'Artifact', { mana_cost: '{0}', cmc: 0 });
const EX = { example: { target: 'none', expect: { selfLife: 0 } } };
const SCRIPTS = {
  'Três': { name: 'Três', effects: [{ do: 'gain', amount: 1 }], ...EX }, 'Um': { name: 'Um', effects: [{ do: 'gain', amount: 1 }], ...EX },
  'Pedra': { name: 'Pedra', abilities: [{ kind: 'activated', cost: { mana: '{2}' }, effects: [{ do: 'gain', amount: 1 }] }], ...EX }, // "{2}: You gain 1 life."
};
function mesa(seed = 1) {
  const deck = [...Object.keys(C).filter(n => n !== 'Forest').map(name => ({ name, qty: 3, zone: 'main' })), { name: 'Forest', qty: 16, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p = 0, n = 9) => { s = J(s); for (const c of 'WUBRGC') s.players[p].pool[c] += n; return s; };
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const resolve = s => { for (let i = 0; i < 20; i++) { s = passaAte(s, x => !x.stack.length || !!x.pending); if (!s.pending) return s; s = act(s, legais(s, s.pending.p)[0]); } return s; };
const conjura = (s, nome) => { let o; [s, o] = poe(s, 0, nome, 'hand'); s = mana(s); const a = legais(s, 0, x => x.t === 'cast' && x.oid === o)[0]; assert.ok(a, 'conjurar ' + nome); return [resolve(act(s, a)), o]; };

test('CR 700.14 · Teapot Slinger (texto oficial): dispara quando o total de mana gasta em mágicas no turno chega a 4 — uma vez só', () => {
  let s = mesa(); [s] = poe(s, 0, 'Teapot Slinger', 'battlefield');
  const v = s.players[1].life;
  [s] = conjura(s, 'Três');
  eq([E.manaGastaNoTurnoT(s, 0), s.players[1].life], [3, v], 'três: ainda não');
  [s] = conjura(s, 'Um');
  eq([E.manaGastaNoTurnoT(s, 0), s.players[1].life], [4, v - 2], 'a quarta mana: 2 de dano no oponente');
  [s] = conjura(s, 'Um');
  eq([E.manaGastaNoTurnoT(s, 0), s.players[1].life], [5, v - 2], 'já tinha passado de 4: não dispara de novo');
});

test('CR 700.14 · o total conta as mágicas de antes de a permanente entrar: Teapot Slinger conjurada por {3}{R} já leva o total a 4 e não dispara depois', () => {
  let s = mesa(); const v = s.players[1].life;
  [s] = conjura(s, 'Teapot Slinger');
  eq(E.manaGastaNoTurnoT(s, 0), 4);
  [s] = conjura(s, 'Um');
  eq(s.players[1].life, v, 'passou de 4 enquanto ela estava na pilha');
});

test('CR 700.14 · só mana gasta para conjurar mágicas: a mana de uma habilidade ativada não conta; o total recomeça no turno seguinte', () => {
  let s = mesa(); let p; [s, p] = poe(s, 0, 'Pedra', 'battlefield'); [s] = poe(s, 0, 'Teapot Slinger', 'battlefield');
  s = mana(s); s = resolve(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === p)[0]));
  eq(E.manaGastaNoTurnoT(s, 0), 0, 'a habilidade não conta');
  [s] = conjura(s, 'Três');
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1');
  eq(E.manaGastaNoTurnoT(s, 0), 0, 'outro turno');
});

test('CR 700.14 · Bakersbane Duo, Bark-Knuckle Boxer e Wandertale Mentor (textos oficiais): +1/+1 até o fim do turno, indestrutível até o fim do turno e um marcador', () => {
  let s = mesa(); let b, k, w; [s, b] = poe(s, 0, 'Bakersbane Duo', 'battlefield'); [s, k] = poe(s, 0, 'Bark-Knuckle Boxer', 'battlefield'); [s, w] = poe(s, 0, 'Wandertale Mentor', 'battlefield');
  [s] = conjura(s, 'Três'); [s] = conjura(s, 'Um');
  const st = o => { const x = E.stats(s, s.objects[o]); return [x.power, x.toughness]; };
  eq([st(b), E.hasKeyword(s, s.objects[k], 'indestructible'), (s.objects[w].counters || {}).p1p1 || 0], [[3, 3], true, 1]);
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1');
  eq([st(b), E.hasKeyword(s, s.objects[k], 'indestructible'), (s.objects[w].counters || {}).p1p1 || 0], [[2, 2], false, 1], 'o +1/+1 e o indestrutível acabam; o marcador fica');
});

test('CR 700.14 · validador: o gatilho "expend" pede o N', () => {
  const v = sc => J(SC.validateScript({ name: 'X', ...sc, example: { action: 'etb', target: 'none', expect: { attached: false } } }));
  eq(v({ abilities: [{ kind: 'triggered', when: 'expend', n: 4, effects: [{ do: 'gain', amount: 1 }] }] }), []);
  assert.ok(v({ abilities: [{ kind: 'triggered', when: 'expend', effects: [{ do: 'gain', amount: 1 }] }] }).some(e => /expend/.test(e)));
});
