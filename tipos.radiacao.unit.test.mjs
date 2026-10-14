// T-91 · CR5 · Marcadores de radiação (Comprehensive Rules 728.1 e 728.1a, com 122.1, 603.4 e 701.34a).
// Texto da regra: .regras/cr-2026-09-25.txt. Cartas com o texto oficial de .listas/oficiais-tipos.json (Oracle do Forge, clone de 13/10/2026,
// conferido no master em 14/10/2026): Megaton's Fate, Nuclear Fallout, Feral Ghoul, Contaminated Drink, Vault 12: The Necropolis e
// Strong, the Brutish Thespian. "Urso", "Pedra", "Zumbi", "Choque" e "Prolifera" são cartas de teste.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S as SC, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const NOMES = ["Megaton's Fate", 'Nuclear Fallout', 'Feral Ghoul', 'Contaminated Drink', 'Vault 12: The Necropolis', 'Strong, the Brutish Thespian'];
const C = {};
for (const c of L('oficiais-tipos.json').filter(x => NOMES.includes(x.name)))
  C[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: c.name === 'Feral Ghoul' ? ['Menace'] : [], oracle_text: c.oracle_text, colors: [], power: c.power, toughness: c.toughness };
C.Swamp = { name: 'Swamp', type_line: 'Basic Land — Swamp', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {B}.)', colors: [] };
const carta = (name, type_line, extra = {}) => { C[name] = { name, type_line, mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra }; };
carta('Urso', 'Creature — Bear', { power: '2', toughness: '2' }); carta('Zumbi', 'Creature — Zombie', { power: '2', toughness: '2' }); carta('Pedra', 'Artifact');
carta('Choque', 'Instant'); carta('Prolifera', 'Sorcery');
const EX = { example: { target: 'none', expect: { selfLife: 0 } } };
const SCRIPTS = {
  'Choque': { name: 'Choque', effects: [{ do: 'damage', amount: 2, target: 'any' }], ...EX },
  'Prolifera': { name: 'Prolifera', effects: [{ do: 'proliferate' }], ...EX }, // "Proliferate."
};
function mesa(seed = 1) {
  const deck = [...Object.keys(C).filter(n => n !== 'Swamp').map(name => ({ name, qty: 3, zone: 'main' })), { name: 'Swamp', qty: 16, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p = 0, n = 9) => { s = J(s); for (const c of 'WUBRGC') s.players[p].pool[c] += n; return s; };
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const rad = (s, p) => s.players[p].rad || 0;
const resolve = s => { for (let i = 0; i < 30; i++) { s = passaAte(s, x => !x.stack.length || !!x.pending); if (!s.pending) return s; const os = legais(s, s.pending.p); s = act(s, os.find(a => a.t === 'pay') || os[0]); } return s; };
const conjura = (s, nome, f = () => true, extra = {}) => { let o; [s, o] = poe(s, 0, nome, 'hand'); s = mana(s); const a = legais(s, 0, x => x.t === 'cast' && x.oid === o && f(x))[0]; assert.ok(a, 'conjurar ' + nome); return [resolve(act(s, { ...a, ...extra })), o]; };
/** o topo do grimório de p passa a ser estas cartas (na ordem). */
const topo = (s, p, nomes) => { s = J(s); const lib = s.zones[p].library, ids = []; for (const n of nomes) { const i = lib.findIndex(o => s.objects[o].name === n && !ids.includes(o)); assert.ok(i >= 0, n); ids.push(lib[i]); } s.zones[p].library = [...ids, ...lib.filter(o => !ids.includes(o))]; return [s, ids]; };
const comRad = (s, p, n) => { s = J(s); s.players[p].rad = n; return s; };
/** para no começo da próxima fase principal pré-combate de p (o que disparou ali ainda não resolveu). */
const proximaPrincipal = (s, p) => passaAte(s, x => x.turn.active === p && x.turn.step === 'main1' && x.turn.number > s.turn.number);

test('CR 728.1 · na fase principal pré-combate, quem tem radiação mói tantas cartas quantos marcadores; perde 1 de vida e 1 marcador por carta que não é terreno', () => {
  let s = mesa(); s = comRad(s, 1, 3); let ids; [s, ids] = topo(s, 1, ['Swamp', 'Urso', 'Swamp', 'Pedra']); ids = ids.slice(1); // a primeira é a compra do turno
  const v = s.players[1].life;
  s = resolve(proximaPrincipal(s, 1));
  eq(ids.map(o => s.objects[o].zone), ['graveyard', 'graveyard', 'graveyard'], 'moeu três');
  eq([v - s.players[1].life, rad(s, 1)], [2, 1], 'duas não são terreno: 2 de vida e 2 marcadores');
});

test('CR 728.1 · a habilidade é só na fase principal de quem tem radiação; sem marcador não dispara; o "if" vale de novo na resolução (603.4)', () => {
  let s = mesa(); s = comRad(s, 1, 2); let ids; [s, ids] = topo(s, 1, ['Swamp', 'Urso', 'Urso']); ids = ids.slice(1); // a primeira é a compra do turno
  let t = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'combat_begin' || x.turn.active === 1);
  eq(ids.map(o => t.objects[o].zone), ['library', 'library'], 'na principal de A, B não mói');
  t = mesa(); const g = t.zones[0].graveyard.length; t = resolve(proximaPrincipal(t, 0));
  eq(t.zones[0].graveyard.length, g, 'sem radiação, nada');
  t = proximaPrincipal(s, 1);
  assert.ok(t.stack.length || t.pending, 'disparou');
  t = comRad(t, 1, 0); t = resolve(t);
  eq(ids.map(o => t.objects[o].zone), ['library', 'library'], 'sem marcador na resolução, não mói');
});

test("CR 728.1 · Megaton's Fate (texto oficial): Detonate — 8 de dano em cada criatura e quatro marcadores em cada jogador; Disarm — destrói o artefato e cria quatro Tesouros", () => {
  let s = mesa(); let u, k; [s, u] = poe(s, 1, 'Urso', 'battlefield'); [s, k] = poe(s, 1, 'Pedra', 'battlefield');
  let [t] = conjura(s, "Megaton's Fate", a => a.mode === 1);
  eq([t.objects[u].zone, rad(t, 0), rad(t, 1)], ['graveyard', 4, 4]);
  [t] = conjura(s, "Megaton's Fate", a => a.mode === 0 && a.targets[0].oid === k);
  eq([t.objects[k].zone, Object.values(t.objects).filter(o => o.token && o.name === 'Treasure' && o.zone === 'battlefield' && o.controller === 0).length, rad(t, 0)], ['graveyard', 4, 0]);
});

test('CR 728.1 · Nuclear Fallout e Contaminated Drink (textos oficiais): X no −X/−X dobrado e nos marcadores; metade de X arredondada para cima', () => {
  let s = mesa(); let u; [s, u] = poe(s, 1, 'Urso', 'battlefield'); let z; [s, z] = poe(s, 0, 'Zumbi', 'battlefield');
  let [t] = conjura(s, 'Nuclear Fallout', () => true, { x: 1 });
  eq([t.objects[u].zone, t.objects[z].zone, rad(t, 0), rad(t, 1)], ['graveyard', 'graveyard', 1, 1], 'X = 1: −2/−2 mata os 2/2');
  for (const [x, esperado] of [[3, 2], [4, 2], [1, 1]]) {
    const mao = s.zones[0].hand.length;
    [t] = conjura(s, 'Contaminated Drink', () => true, { x });
    eq([t.zones[0].hand.length - mao, rad(t, 0)], [x, esperado], 'X = ' + x);
  }
});

test('CR 728.1 · Feral Ghoul (texto oficial): marcador quando outra criatura sua morre; ao morrer, cada oponente recebe radiação igual ao poder dela', () => {
  let s = mesa(); let g, u; [s, g] = poe(s, 0, 'Feral Ghoul', 'battlefield'); [s, u] = poe(s, 0, 'Urso', 'battlefield');
  [s] = conjura(s, 'Choque', a => a.targets && a.targets[0] && a.targets[0].oid === u);
  eq((s.objects[g].counters || {}).p1p1 || 0, 1, 'o Urso morreu');
  [s] = conjura(s, 'Choque', a => a.targets && a.targets[0] && a.targets[0].oid === g);
  [s] = conjura(s, 'Choque', a => a.targets && a.targets[0] && a.targets[0].oid === g);
  eq([s.objects[g].zone, rad(s, 1), rad(s, 0)], ['graveyard', 3, 0], 'poder 3 ao morrer (a última informação)');
});

test('CR 714 / 728.1 · Vault 12: The Necropolis (texto oficial): I três marcadores em cada jogador; II fichas iguais ao total; III dois marcadores em cada Zumbi ou Mutante seu', () => {
  let s = mesa(); let v; [s, v] = conjura(s, 'Vault 12: The Necropolis');
  eq([rad(s, 0), rad(s, 1)], [3, 3], 'capítulo I');
  s = comRad(s, 0, 0); s = comRad(s, 1, 0); s = proximaPrincipal(s, 0); s = comRad(s, 1, 5);
  s = resolve(s);
  const fichas = Object.values(s.objects).filter(o => o.token && o.zone === 'battlefield' && o.controller === 0 && o.name === 'Zombie Mutant');
  eq(fichas.length, 5, 'capítulo II: X = 0 + 5');
  let z, u; [s, z] = poe(s, 0, 'Zumbi', 'battlefield'); [s, u] = poe(s, 0, 'Urso', 'battlefield');
  s = comRad(s, 0, 0); s = comRad(s, 1, 0);
  s = resolve(proximaPrincipal(s, 0));
  const k = o => (s.objects[o].counters || {}).p1p1 || 0;
  eq([k(fichas[0].oid), k(z), k(u)], [2, 2, 0], 'capítulo III: Zumbi Mutante e Zumbi, sim; Urso, não');
});

test('CR 728.1a · Strong, the Brutish Thespian (texto oficial): ganha vida em vez de perder pela radiação; ao sofrer dano, três marcadores e três +1/+1', () => {
  let s = mesa(); let st; [s, st] = poe(s, 0, 'Strong, the Brutish Thespian', 'battlefield');
  [s] = conjura(s, 'Choque', a => a.targets && a.targets[0] && a.targets[0].oid === st);
  eq([rad(s, 0), (s.objects[st].counters || {}).p1p1 || 0], [3, 3], 'Enrage');
  [s] = topo(s, 0, ['Swamp', 'Urso', 'Pedra', 'Swamp']); // a primeira é a compra do turno
  const v = s.players[0].life;
  s = resolve(proximaPrincipal(s, 0));
  eq([s.players[0].life - v, rad(s, 0)], [2, 1], 'ganhou 2 em vez de perder 2');
});

test('CR 701.34a / 122.1 · proliferar também dá mais um marcador de radiação ao jogador que tem', () => {
  let s = mesa(); s = comRad(s, 1, 2);
  let [t] = conjura(s, 'Prolifera');
  eq(rad(t, 1), 3);
});

test('CR 728.1 · validador: "rad" pede a quantidade e um jogador', () => {
  const v = sc => J(SC.validateScript({ name: 'X', ...sc, example: { target: 'none', expect: { selfLife: 0 } } }));
  eq(v({ effects: [{ do: 'rad', amount: 2, target: 'player' }] }), []);
  eq(v({ effects: [{ do: 'rad', amount: { per: 'metade-de-x' }, target: 'self' }] }), []);
  assert.ok(v({ effects: [{ do: 'rad', amount: 2, target: 'creature' }] }).length > 0, 'criatura não recebe radiação');
  assert.ok(v({ self: { radGanhaVida: 1 }, effects: [{ do: 'gain', amount: 1 }] }).some(e => /radGanhaVida/.test(e)));
});
