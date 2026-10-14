// T-96 · CR5 · Não poder perder, não poder vencer e substituir a derrota (Comprehensive Rules 104.2a, 104.3, 104.3f e 704.7).
// Texto da regra: .regras/cr-2026-09-25.txt. Cartas com o texto oficial de .listas/oficiais-tipos.json (Oracle do Forge, clone de 13/10/2026,
// conferido no master em 14/10/2026): Platinum Angel, Abyssal Persecutor e Lich's Mirror. "Urso", "Raio", "Perdição" e "Vitória" são cartas de teste.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S as SC, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const NOMES = ['Platinum Angel', 'Abyssal Persecutor', "Lich's Mirror"];
const C = {};
for (const c of L('oficiais-tipos.json').filter(x => NOMES.includes(x.name)))
  C[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: [], power: c.power, toughness: c.toughness };
C.Island = { name: 'Island', type_line: 'Basic Land — Island', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {U}.)', colors: [] };
const carta = (name, type_line, extra = {}) => { C[name] = { name, type_line, mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra }; };
carta('Urso', 'Creature — Bear', { power: '2', toughness: '2' }); carta('Raio', 'Instant'); carta('Perdição', 'Instant'); carta('Vitória', 'Instant');
const EX = { example: { target: 'none', expect: { selfLife: 0 } } };
const SCRIPTS = {
  'Raio': { name: 'Raio', effects: [{ do: 'damage', amount: 3, target: 'any' }], ...EX },
  'Perdição': { name: 'Perdição', effects: [{ do: 'perde', target: 'player' }], ...EX }, // "Target player loses the game."
  'Vitória': { name: 'Vitória', effects: [{ do: 'vence' }], ...EX }, // "You win the game."
};
function mesa(seed = 1) {
  const deck = [...Object.keys(C).filter(n => n !== 'Island').map(name => ({ name, qty: 2, zone: 'main' })), { name: 'Island', qty: 16, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p = 0, n = 9) => { s = J(s); for (const c of 'WUBRGC') s.players[p].pool[c] += n; return s; };
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const conjura = (s, p, nome, f = () => true) => { let o; [s, o] = poe(s, p, nome, 'hand'); s = mana(s, p); s = J(s); s.turn.priority = p; const a = legais(s, p, x => x.t === 'cast' && x.oid === o && f(x))[0]; assert.ok(a, 'conjurar ' + nome); return passaAte(act(s, a), x => !x.stack.length || !!x.pending || x.status !== 'playing'); };
const noJogador = p => a => a.targets && a.targets[0] && a.targets[0].player === p;

test('CR 104.3 · Platinum Angel (texto oficial): com vida 0 e com dez venenos você não perde; ao sair o Anjo, perde na conferência seguinte', () => {
  let s = mesa(); let an; [s, an] = poe(s, 0, 'Platinum Angel', 'battlefield'); s = J(s); s.players[0].life = 2;
  s = conjura(s, 1, 'Raio', noJogador(0));
  eq([s.players[0].life, s.players[0].lost, s.status], [-1, false, 'playing'], 'vida −1 e segue no jogo');
  s = J(s); s.players[0].poison = 10; s = act(s, { t: 'pass', p: s.turn.priority });
  eq(s.players[0].lost, false, 'dez venenos também não');
  s = conjura(s, 1, 'Raio', a => a.targets && a.targets[0] && a.targets[0].oid === an); // 4/4: não morre com 3
  s = J(s); s.objects[an].damage = 4; s = act(s, { t: 'pass', p: s.turn.priority });
  eq([s.objects[an].zone, s.players[0].lost], ['graveyard', true], 'o Anjo morreu: A perde');
});

test('CR 104.3e / 104.3c · com o Anjo, o "perde o jogo" de efeito e a compra em grimório vazio passam: o Anjo saindo depois não faz perder por eles', () => {
  let s = mesa(); let an; [s, an] = poe(s, 0, 'Platinum Angel', 'battlefield');
  s = conjura(s, 1, 'Perdição', noJogador(0));
  eq(s.players[0].lost, false);
  s = J(s); s.zones[0].library = []; s = act(s, { t: 'pass', p: s.turn.priority });
  let t = J(s); t.players[0].drewFromEmpty = true; t = act(t, { t: 'pass', p: t.turn.priority });
  eq(t.players[0].lost, false, 'comprou do grimório vazio: não perde');
  t = J(t); const z = t.zones[0]; z.battlefield.splice(z.battlefield.indexOf(an), 1); z.graveyard.push(an); t.objects[an].zone = 'graveyard'; t = act(t, { t: 'pass', p: t.turn.priority });
  eq(t.players[0].lost, false, 'o Anjo saiu: os eventos já tinham passado');
});

test('CR 104.3 / 104.2b · "your opponents can’t win the game": o "você vence" do oponente não faz nada; desistir sempre vale (104.3a)', () => {
  let s = mesa(); [s] = poe(s, 0, 'Platinum Angel', 'battlefield');
  s = conjura(s, 1, 'Vitória');
  eq([s.players[0].lost, s.status], [false, 'playing'], 'B não vence');
  s = act(s, { t: 'concede', p: 0 });
  eq([s.players[0].lost, s.status], [true, 'over'], 'A desistiu');
});

test('CR 104.3 · Abyssal Persecutor (texto oficial): você não vence e seus oponentes não perdem; sem ele, perdem', () => {
  let s = mesa(); let ap; [s, ap] = poe(s, 0, 'Abyssal Persecutor', 'battlefield'); s = J(s); s.players[1].life = 2;
  s = conjura(s, 0, 'Raio', noJogador(1));
  eq([s.players[1].lost, s.status], [false, 'playing'], 'B com vida −1 segue');
  s = conjura(s, 0, 'Vitória');
  eq([s.players[1].lost, s.status], [false, 'playing'], 'A não pode vencer');
  s = J(s); const z = s.zones[0]; z.battlefield.splice(z.battlefield.indexOf(ap), 1); z.graveyard.push(ap); s.objects[ap].zone = 'graveyard'; s = act(s, { t: 'pass', p: s.turn.priority });
  eq([s.players[1].lost, s.status], [true, 'over'], 'sem o Persecutor, B perde (vida)');
});

test('CR 704.7 · Lich’s Mirror (texto oficial): uma substituição só para vida 0 e veneno ao mesmo tempo; o espelho vai junto para o grimório e o veneno fica — na conferência seguinte, perde', () => {
  let s = mesa(); let m, u, uB; [s, m] = poe(s, 0, "Lich's Mirror", 'battlefield'); [s, u] = poe(s, 0, 'Urso', 'battlefield'); [s, uB] = poe(s, 1, 'Urso', 'battlefield');
  s = J(s); s.objects[uB].owner = 0; s.players[0].life = 2;
  const mine = Object.values(s.objects).filter(o => o.owner === 0 && !o.token && !o.ability).length;
  s = conjura(s, 1, 'Raio', noJogador(0));
  eq([s.players[0].lost, s.players[0].life, s.zones[0].hand.length, s.objects[m].zone, s.objects[u].zone, s.objects[uB].zone], [false, 20, 7, s.zones[0].hand.includes(m) ? 'hand' : 'library', s.zones[0].hand.includes(u) ? 'hand' : 'library', s.zones[0].hand.includes(uB) ? 'hand' : 'library'], 'vida 20, sete na mão; o espelho, o Urso e o Urso dele que estava com B voltaram');
  eq(s.zones[0].library.length + s.zones[0].hand.length, mine);
  let t = mesa(); [t] = poe(t, 0, "Lich's Mirror", 'battlefield'); t = J(t); t.players[0].life = 1; t.players[0].poison = 10;
  t = act(t, { t: 'pass', p: t.turn.priority });
  eq([t.players[0].lost, t.players[0].lossReason], [true, 'veneno'], 'o espelho substituiu uma vez (vida e veneno) e foi para o grimório; o veneno ficou');
});

test('CR 104.3f · quem venceria e perderia ao mesmo tempo perde e não vence', () => {
  let s = mesa(); s = J(s); s.players[1].derrotadoPor = 0; s.players[0].life = 0;
  s = act(s, { t: 'pass', p: s.turn.priority });
  eq([s.players[0].lost, s.players[1].lost], [true, false]);
});

test('CR 104.3 · validador', () => {
  const v = sc => J(SC.validateScript({ name: 'X', ...sc, example: { action: 'etb', target: 'none', expect: { attached: false } } }));
  eq(v({ self: { naoPodePerder: 'voce', naoPodeVencer: 'oponentes' } }), []);
  assert.ok(v({ self: { naoPodePerder: true } }).some(e => /naoPodePerder/.test(e)));
  assert.ok(v({ self: { emVezDePerder: 'x' } }).some(e => /emVezDePerder/.test(e)));
});

/* ---------------- T-97 · achados da auditoria independente (T-94…T-96) ---------------- */
test('CR 104.2b · Lich’s Mirror não substitui a vitória do oponente: o "você vence" de A encerra o jogo', () => {
  let s = mesa(); [s] = poe(s, 1, "Lich's Mirror", 'battlefield');
  s = conjura(s, 0, 'Vitória');
  eq([s.status, s.winner], ['over', 0]);
});

test('CR 704.3 / 104.4b · o espelho que não volta ao grimório substitui de novo sem fim: o jogo empata', () => {
  let s = mesa(); let m; [s, m] = poe(s, 1, "Lich's Mirror", 'battlefield');
  s = J(s); s.objects[m].controller = 0; const z1 = s.zones[1], z0 = s.zones[0]; // o espelho é de B e está com A
  for (const oid of z0.library.slice(3)) { z0.library.splice(z0.library.indexOf(oid), 1); z1.library.push(oid); s.objects[oid].owner = 1; }
  for (const oid of z0.hand.slice()) { z0.hand.splice(z0.hand.indexOf(oid), 1); z1.hand.push(oid); s.objects[oid].owner = 1; }
  s.players[0].life = 0;
  s = act(s, { t: 'pass', p: s.turn.priority });
  eq([s.status, s.winner], ['over', null], 'empate');
});

test('CR 119.5 · "your life total becomes 20" é ganhar a diferença: conta como vida ganha', () => {
  let s = mesa(); [s] = poe(s, 0, "Lich's Mirror", 'battlefield'); s = J(s); s.players[0].life = -2;
  s = act(s, { t: 'pass', p: s.turn.priority });
  eq([s.players[0].life, s.players[0].lifeGained], [20, 22]);
});
