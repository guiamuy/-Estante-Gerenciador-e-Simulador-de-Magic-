// T-84 · CR5 · "Descended this turn" (Comprehensive Rules 700.11, com 603.4 e 111.7).
// Texto da regra: .regras/cr-2026-09-25.txt. Cartas com o texto oficial de .listas/oficiais-tipos.json (Oracle do Forge, clone de
// 13/10/2026): Child of the Volcano, Deep Goblin Skulltaker, Ruin-Lurker Bat e Enterprising Scallywag. As outras são cartas de teste.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S as SC, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const C = {};
for (const c of L('oficiais-tipos.json').filter(x => ['Child of the Volcano', 'Deep Goblin Skulltaker', 'Ruin-Lurker Bat', 'Enterprising Scallywag'].includes(x.name)))
  C[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: [], power: c.power, toughness: c.toughness };
C.Mountain = { name: 'Mountain', type_line: 'Basic Land — Mountain', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {R}.)', colors: [] };
const carta = (name, type_line, extra = {}) => { C[name] = { name, type_line, mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra }; };
carta('Urso', 'Creature — Bear', { power: '2', toughness: '2' }); carta('Choque', 'Instant'); carta('Descarte', 'Sorcery'); carta('Fichário', 'Sorcery'); carta('Contador', 'Sorcery');
const EX = { example: { target: 'none', expect: { selfLife: 0 } } };
const SCRIPTS = {
  'Choque': { name: 'Choque', effects: [{ do: 'damage', amount: 2, target: 'any' }], ...EX },
  'Descarte': { name: 'Descarte', effects: [{ do: 'discard', amount: 1, target: 'self' }], ...EX },
  'Fichário': { name: 'Fichário', effects: [{ do: 'token', amount: 1, token: { name: 'Golem', power: 1, toughness: 1, types: ['artifact', 'creature'], subtypes: ['Golem'] } }], ...EX },
  'Contador': { name: 'Contador', effects: [{ do: 'gain', amount: { per: 'vezes-que-desceu' } }], ...EX }, // "You gain 1 life for each time you descended this turn."
};
const CV = 'Child of the Volcano';
function mesa(seed = 1) {
  const deck = [...Object.keys(C).filter(n => n !== 'Mountain').map(name => ({ name, qty: 3, zone: 'main' })), { name: 'Mountain', qty: 16, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p = 0, n = 9) => { s = J(s); for (const c of 'WUBRGC') s.players[p].pool[c] += n; return s; };
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const conjura = (s, nome, f = () => true) => { let o; [s, o] = poe(s, 0, nome, 'hand'); s = mana(s); const a = legais(s, 0, x => x.t === 'cast' && x.oid === o && f(x))[0]; assert.ok(a, 'conjurar ' + nome); return passaAte(act(s, a), x => !x.stack.length || !!x.pending); };
const fimDoTurno = s => passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1');
const p1 = (s, oid) => (s.objects[oid].counters || {}).p1p1 || 0;

test('CR 700.11 · Child of the Volcano (texto oficial): na etapa final, ganha um marcador se uma carta de permanente foi para o seu cemitério neste turno', () => {
  let s = mesa(); let c; [s, c] = poe(s, 0, CV, 'battlefield');
  eq(p1(fimDoTurno(s), c), 0, 'sem descer, nada');
  let u; [s, u] = poe(s, 0, 'Urso', 'battlefield');
  s = conjura(s, 'Choque', a => a.targets && a.targets[0] && a.targets[0].oid === u);
  eq([s.objects[u].zone, E.vezesQueDesceuT(s, 0)], ['graveyard', 1], 'o Urso morreu: desceu uma vez');
  eq(p1(fimDoTurno(s), c), 1);
});

test('CR 700.11 · instantânea e feitiço não contam; ficha não é carta; descer "de qualquer lugar" conta (descarte de terreno)', () => {
  let s = mesa(); let c; [s, c] = poe(s, 0, CV, 'battlefield');
  s = conjura(s, 'Choque', a => a.targets && a.targets[0] && a.targets[0].player === 1);
  eq(E.vezesQueDesceuT(s, 0), 0, 'o Choque foi para o cemitério, mas não é carta de permanente');
  s = conjura(s, 'Fichário'); const g = Object.values(s.objects).find(o => o.token && o.name === 'Golem');
  s = conjura(s, 'Choque', a => a.targets && a.targets[0] && a.targets[0].oid === g.oid);
  eq(E.vezesQueDesceuT(s, 0), 0, 'a ficha que morre não é carta');
  let m; [s, m] = poe(s, 0, 'Mountain', 'hand'); s = J(s); s.zones[0].hand = s.zones[0].hand.filter(x => x === m);
  s = conjura(s, 'Descarte'); if (s.pending && s.pending.kind === 'discard') s = act(s, { t: 'discard', p: 0, oid: m });
  eq(E.vezesQueDesceuT(s, 0), 1, 'o terreno descartado conta');
});

test('CR 700.11 · conta para o dono do cemitério: a criatura do oponente que morre não faz você descer', () => {
  let s = mesa(); let u; [s, u] = poe(s, 1, 'Urso', 'battlefield');
  s = conjura(s, 'Choque', a => a.targets && a.targets[0] && a.targets[0].oid === u);
  eq([E.vezesQueDesceuT(s, 0), E.vezesQueDesceuT(s, 1)], [0, 1]);
});

test('CR 700.11 · é "neste turno": a descida do turno anterior não conta na etapa final do turno seguinte', () => {
  let s = mesa(); let u; [s, u] = poe(s, 0, 'Urso', 'battlefield');
  s = conjura(s, 'Choque', a => a.targets && a.targets[0] && a.targets[0].oid === u);
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1');
  let c; [s, c] = poe(s, 1, 'Deep Goblin Skulltaker', 'battlefield');
  eq(E.vezesQueDesceuT(s, 0), 0, 'virou o turno');
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1');
  eq(p1(s, c), 0, 'B não desceu no turno dele');
});

test('CR 700.11 · "the number of times you descended this turn": duas cartas de permanente, dois de vida; Enterprising Scallywag cria um Tesouro na etapa final', () => {
  let s = mesa(); let e; [s, e] = poe(s, 0, 'Enterprising Scallywag', 'battlefield');
  for (let i = 0; i < 2; i++) { let u; [s, u] = poe(s, 0, 'Urso', 'battlefield'); s = conjura(s, 'Choque', a => a.targets && a.targets[0] && a.targets[0].oid === u); }
  const v = s.players[0].life; s = conjura(s, 'Contador');
  eq(s.players[0].life - v, 2);
  s = fimDoTurno(s);
  eq(Object.values(s.objects).filter(o => o.token && o.name === 'Treasure' && o.controller === 0 && o.zone === 'battlefield').length, 1);
});

test('CR 700.11 · validador: a condição "desceu" do gatilho só vale como true', () => {
  const v = sc => J(SC.validateScript({ name: 'X', ...sc, example: { action: 'etb', target: 'none', expect: { attached: false } } }));
  eq(v({ abilities: [{ kind: 'triggered', when: 'end-step', condition: { desceu: true }, effects: [{ do: 'gain', amount: 1 }] }] }), []);
  assert.ok(v({ abilities: [{ kind: 'triggered', when: 'end-step', condition: { desceu: 2 }, effects: [{ do: 'gain', amount: 1 }] }] }).some(e => /desceu/.test(e)));
});
