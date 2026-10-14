// T-86 · CR5 · Cometer um crime (Comprehensive Rules 700.13, com 603.2h e 115.1).
// Texto da regra: .regras/cr-2026-09-25.txt. Cartas com o texto oficial de .listas/oficiais-tipos.json (Oracle do Forge, clone de
// 13/10/2026): Raven of Fell Omens, Blood Hustler, Deepmuck Desperado, Hardbristle Bandit e Forsaken Miner. As outras são cartas de teste.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S as SC, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const C = {};
for (const c of L('oficiais-tipos.json').filter(x => ['Raven of Fell Omens', 'Blood Hustler', 'Deepmuck Desperado', 'Hardbristle Bandit', 'Forsaken Miner'].includes(x.name)))
  C[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: [], power: c.power, toughness: c.toughness };
C.Swamp = { name: 'Swamp', type_line: 'Basic Land — Swamp', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {B}.)', colors: [] };
const carta = (name, type_line, extra = {}) => { C[name] = { name, type_line, mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra }; };
carta('Urso', 'Creature — Bear', { power: '2', toughness: '2' }); carta('Choque', 'Instant'); carta('Coveiro', 'Sorcery'); carta('Batedor', 'Creature — Goblin', { power: '1', toughness: '1' }); carta('Fogueira', 'Sorcery');
const EX = { example: { target: 'none', expect: { selfLife: 0 } } };
const SCRIPTS = {
  'Choque': { name: 'Choque', effects: [{ do: 'damage', amount: 2, target: 'any' }], ...EX },
  'Coveiro': { name: 'Coveiro', effects: [{ do: 'exile', target: { zona: 'graveyard' } }], ...EX }, // "Exile target card from a graveyard."
  'Batedor': { name: 'Batedor', abilities: [{ kind: 'triggered', when: 'etb', effects: [{ do: 'damage', amount: 1, target: 'player' }] }], ...EX }, // "When this enters, it deals 1 damage to target player."
  'Fogueira': { name: 'Fogueira', effects: [{ do: 'damage', amount: 1, target: 'each-opponent' }], ...EX }, // "This deals 1 damage to each opponent." (não mira)
};
const RV = 'Raven of Fell Omens';
function mesa(seed = 1) {
  const deck = [...Object.keys(C).filter(n => n !== 'Swamp').map(name => ({ name, qty: 3, zone: 'main' })), { name: 'Swamp', qty: 16, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p = 0, n = 9) => { s = J(s); for (const c of 'WUBRGC') s.players[p].pool[c] += n; return s; };
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const resolve = s => { for (let i = 0; i < 20; i++) { s = passaAte(s, x => !x.stack.length || !!x.pending); if (!s.pending) return s; const os = legais(s, s.pending.p); s = act(s, os.find(a => a.t === 'pick_target' && ((s.pending.options || [])[a.index] || {}).player === 1) || os.find(a => a.t === 'pay') || os[0]); } return s; }; // o alvo do gatilho: o oponente
const conjura = (s, nome, f = () => true) => { let o; [s, o] = poe(s, 0, nome, 'hand'); s = mana(s); const a = legais(s, 0, x => x.t === 'cast' && x.oid === o && f(x))[0]; assert.ok(a, 'conjurar ' + nome); return resolve(act(s, a)); };
const noOponente = a => a.targets && a.targets[0] && a.targets[0].player === 1;
const vidas = s => [s.players[0].life, s.players[1].life];

test('CR 700.13 · Raven of Fell Omens (texto oficial): mirar o oponente com uma mágica é crime — ele perde 1 e você ganha 1; "only once each turn"', () => {
  let s = mesa(); [s] = poe(s, 0, RV, 'battlefield'); const [a0, b0] = vidas(s);
  s = conjura(s, 'Choque', noOponente);
  eq([vidas(s), E.crimesNoTurnoT(s, 0)], [[a0 + 1, b0 - 3], 1], 'Choque: 2 de dano; o Corvo: 1 de perda e 1 de ganho');
  s = conjura(s, 'Choque', noOponente);
  eq([vidas(s), E.crimesNoTurnoT(s, 0)], [[a0 + 1, b0 - 5], 2], 'o segundo crime não dispara o Corvo de novo');
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && x.turn.number > 2);
  const [a1, b1] = vidas(s);
  s = conjura(s, 'Choque', noOponente);
  eq(vidas(s), [a1 + 1, b1 - 3], 'no turno seguinte, de novo');
});

test('CR 700.13 · o que é crime: a criatura do oponente e a carta no cemitério dele, sim; a sua criatura e o efeito que não mira ("each opponent"), não', () => {
  let s = mesa(); let u0, u1, g; [s, u0] = poe(s, 0, 'Urso', 'battlefield'); [s, u1] = poe(s, 1, 'Urso', 'battlefield'); [s, g] = poe(s, 1, 'Urso', 'graveyard');
  let t = conjura(s, 'Choque', a => a.targets && a.targets[0] && a.targets[0].oid === u0); eq(E.crimesNoTurnoT(t, 0), 0, 'a sua criatura');
  t = conjura(s, 'Fogueira'); eq(E.crimesNoTurnoT(t, 0), 0, '"each opponent" não mira');
  t = conjura(s, 'Choque', a => a.targets && a.targets[0] && a.targets[0].oid === u1); eq(E.crimesNoTurnoT(t, 0), 1, 'a criatura do oponente');
  t = conjura(s, 'Coveiro', a => a.targets && a.targets[0] && a.targets[0].oid === g); eq(E.crimesNoTurnoT(t, 0), 1, 'a carta no cemitério do oponente');
});

test('CR 700.13 · habilidade ativada e gatilho também: Blood Hustler mira o oponente com a própria ativada (crime, marcador); o gatilho de entrar que mira o oponente é crime', () => {
  let s = mesa(); let h; [s, h] = poe(s, 0, 'Blood Hustler', 'battlefield');
  s = mana(s); s = resolve(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === h && noOponente(a))[0]));
  eq([E.crimesNoTurnoT(s, 0), (s.objects[h].counters || {}).p1p1 || 0], [1, 1]);
  let t = mesa(); [t] = poe(t, 0, RV, 'battlefield'); const [a0, b0] = vidas(t);
  t = conjura(t, 'Batedor');
  eq([E.crimesNoTurnoT(t, 0), vidas(t)], [1, [a0 + 1, b0 - 2]], 'o gatilho do Batedor mirou o oponente');
});

test('CR 700.13 · Deepmuck Desperado e Hardbristle Bandit (textos oficiais): o oponente mói três; o Bandit desvira', () => {
  let s = mesa(); let b; [s] = poe(s, 0, 'Deepmuck Desperado', 'battlefield'); [s, b] = poe(s, 0, 'Hardbristle Bandit', 'battlefield'); s = J(s); s.objects[b].tapped = true;
  const gy = s.zones[1].graveyard.length;
  s = conjura(s, 'Choque', noOponente);
  eq([s.zones[1].graveyard.length - gy, s.objects[b].tapped], [3, false]);
});

test('CR 700.13 · Forsaken Miner (texto oficial): do cemitério, num crime, pode pagar {B} e voltar ao campo', () => {
  let s = mesa(); let m; [s, m] = poe(s, 0, 'Forsaken Miner', 'graveyard');
  s = conjura(s, 'Choque', noOponente);
  eq(s.objects[m].zone, 'battlefield');
});

test('CR 603.2h · validador: "umaVezPorTurno" só num gatilho "crime"', () => {
  const v = sc => J(SC.validateScript({ name: 'X', ...sc, example: { action: 'etb', target: 'none', expect: { attached: false } } }));
  eq(v({ abilities: [{ kind: 'triggered', when: 'crime', umaVezPorTurno: true, effects: [{ do: 'gain', amount: 1 }] }] }), []);
  assert.ok(v({ abilities: [{ kind: 'triggered', when: 'etb', umaVezPorTurno: true, effects: [{ do: 'gain', amount: 1 }] }] }).some(e => /umaVezPorTurno/.test(e)));
});
