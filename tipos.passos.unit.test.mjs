// T-101 · CR5 · Gatilhos do começo do passo de compra e da fase principal pré-combate (500.6) e passos a mais (500.9).
// Texto da regra: .regras/cr-2026-09-25.txt. Cartas com o texto oficial de .listas/oficiais-tipos.json (Oracle do Forge, clone de 13/10/2026,
// conferido no master em 14/10/2026): Kami of the Crescent Moon, Font of Mythos, Dictate of Kruphix, Howling Mine, Grafted Skullcap e Paradox Haze.
// "Ritual" e "Vigia" são cartas de teste.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S as SC, T, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const NOMES = ['Kami of the Crescent Moon', 'Font of Mythos', 'Dictate of Kruphix', 'Howling Mine', 'Grafted Skullcap', 'Paradox Haze'];
const C = {};
for (const c of L('oficiais-tipos.json').filter(x => NOMES.includes(x.name)))
  C[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: c.name === 'Dictate of Kruphix' ? ['Flash'] : [], oracle_text: c.oracle_text, colors: [], power: c.power, toughness: c.toughness };
C.Island = { name: 'Island', type_line: 'Basic Land — Island', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {U}.)', colors: [] };
const carta = (name, type_line, extra = {}) => { C[name] = { name, type_line, mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra }; };
carta('Ritual', 'Enchantment'); carta('Vigia', 'Enchantment'); carta('Relógio', 'Enchantment'); carta('Ampulheta', 'Instant');
const EXP = { example: { action: 'etb', target: 'none', expect: { attached: false } } };
const SCRIPTS = {
  'Ritual': { name: 'Ritual', abilities: [{ kind: 'triggered', when: 'precombat-main', effects: [{ do: 'gain', amount: 2 }] }], ...EXP }, // "At the beginning of your precombat main phase, you gain 2 life."
  'Vigia': { name: 'Vigia', abilities: [{ kind: 'triggered', when: 'upkeep', effects: [{ do: 'gain', amount: 1 }] }], ...EXP }, // "At the beginning of your upkeep, you gain 1 life."
  'Relógio': { name: 'Relógio', abilities: [{ kind: 'triggered', when: 'upkeep', effects: [{ do: 'passo_extra', passo: 'draw', target: 'self' }] }], ...EXP }, // "At the beginning of your upkeep, you get an additional draw step after this step."
  'Ampulheta': { name: 'Ampulheta', effects: [{ do: 'passo_extra', passo: 'upkeep', target: 'self' }], example: { target: 'none', expect: { selfLife: 0 } } }, // "You get an additional upkeep step after this step."
};
function mesa(seed = 1) {
  const deck = [...Object.keys(C).filter(n => n !== 'Island').map(name => ({ name, qty: 2, zone: 'main' })), { name: 'Island', qty: 16, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p = 0, n = 9) => { s = J(s); for (const c of 'WUBRGC') s.players[p].pool[c] += n; return s; };
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const resolve = s => { for (let i = 0; i < 30; i++) { s = passaAte(s, x => !x.stack.length || !!x.pending); if (!s.pending) return s; s = act(s, legais(s, s.pending.p)[0]); } return s; };
const ate = (s, p, passo) => resolve(passaAte(s, x => x.turn.active === p && x.turn.step === passo && x.turn.number > s.turn.number && (!x.stack.length || !!x.pending)));
/** passa a prioridade e resolve as decisões pela primeira oferta até a condição. */
const joga = (s, fim) => { for (let i = 0; i < 400 && !fim(s); i++) { const p = s.pending ? s.pending.p : s.turn.priority; const os = legais(s, p); s = act(s, os.find(x => x.t === 'pass') || os.find(x => x.t === 'discard') || os[0]); } return s; };
const maoNoMain1 = (s, p) => { s = passaAte(s, x => x.turn.active === p && x.turn.step === 'main1' && x.turn.number > s.turn.number && !x.stack.length && !x.pending); return [s, s.zones[p].hand.length]; };

test('CR 500.6 · Kami of the Crescent Moon (texto oficial): no começo do passo de compra de cada jogador, esse jogador compra mais uma — depois da compra do turno', () => {
  let s = mesa(); [s] = poe(s, 0, 'Kami of the Crescent Moon', 'battlefield');
  const mB = s.zones[1].hand.length; let m1; [s, m1] = maoNoMain1(s, 1);
  eq(m1 - mB, 2, 'B: a do turno e a do Kami');
  const mA = s.zones[0].hand.length; let m2; [s, m2] = maoNoMain1(s, 0);
  eq(m2 - mA, 2, 'A também');
});

test('CR 500.6 · Font of Mythos e Dictate of Kruphix (textos oficiais): duas e uma a mais; os dois juntos, três', () => {
  let s = mesa(); [s] = poe(s, 0, 'Font of Mythos', 'battlefield'); [s] = poe(s, 1, 'Dictate of Kruphix', 'battlefield');
  const mB = s.zones[1].hand.length; let m1; [s, m1] = maoNoMain1(s, 1);
  eq(m1 - mB, 4, '1 + 2 + 1');
});

test('CR 603.4 · Howling Mine (texto oficial): só desvirada', () => {
  let s = mesa(); let h; [s, h] = poe(s, 0, 'Howling Mine', 'battlefield');
  const mB = s.zones[1].hand.length; let m1; [s, m1] = maoNoMain1(s, 1);
  eq(m1 - mB, 2, 'desvirada: uma a mais');
  s = J(s); s.objects[h].tapped = true; s.objects[h].naoDesviraProximo = true;
  const mA = s.zones[0].hand.length; let m2; [s, m2] = maoNoMain1(s, 0);
  eq(m2 - mA, 1, 'virada: só a do turno');
});

test('CR 500.6 · Grafted Skullcap (texto oficial): no seu passo de compra, mais uma; no seu passo final, descarta a mão', () => {
  let s = mesa(); [s] = poe(s, 0, 'Grafted Skullcap', 'battlefield');
  s = joga(s, x => x.turn.active === 1);
  eq(s.zones[0].hand.length, 0, 'descartou a mão no passo final');
  const mB = s.zones[1].hand.length; let m1; [s, m1] = maoNoMain1(s, 1);
  eq(m1 - mB, 1, 'no turno de B, nada');
  let m2; [s, m2] = maoNoMain1(s, 0);
  eq(m2, 2, 'A: a do turno e a do Skullcap');
});

test('CR 500.6 · "at the beginning of your precombat main phase" dispara só na principal pré-combate de quem controla', () => {
  let s = mesa(); [s] = poe(s, 0, 'Ritual', 'battlefield'); const v = s.players[0].life;
  s = ate(s, 1, 'main1'); eq(s.players[0].life, v, 'na principal de B, nada');
  s = ate(s, 0, 'main1'); eq(s.players[0].life, v + 2);
  s = resolve(passaAte(s, x => x.turn.step === 'main2')); eq(s.players[0].life, v + 2, 'a principal 2 não é pré-combate');
});

test('CR 500.9 · Paradox Haze (texto oficial): na primeira manutenção do jogador encantado, uma manutenção a mais depois dela — os gatilhos de manutenção disparam duas vezes, o Haze uma', () => {
  let s = mesa(); let ph; [s, ph] = poe(s, 0, 'Paradox Haze', 'hand'); s = mana(s);
  s = resolve(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === ph && x.targets && x.targets[0] && x.targets[0].player === 0)[0]));
  [s] = poe(s, 0, 'Vigia', 'battlefield'); const v = s.players[0].life;
  const n = s.turn.number; s = joga(s, x => x.turn.active === 0 && x.turn.number > n && x.turn.step === 'draw');
  eq([s.players[0].life - v, s.emPassoExtraT, s.passosExtrasT], [2, undefined, undefined], 'duas manutenções: Vigia duas vezes; o Haze não pediu a terceira');
});

const trilha = (s, fim) => { const vistos = []; for (let i = 0; i < 400 && !fim(s); i++) { const p = s.pending ? s.pending.p : s.turn.priority; const os = legais(s, p); s = act(s, os.find(x => x.t === 'pass') || os[0]); const k = s.turn.step + (s.emPassoExtraT ? '*' : ''); if (vistos[vistos.length - 1] !== k) vistos.push(k); } return [s, vistos]; };

test('CR 500.9 · passo a mais de outro tipo: um passo de compra a mais depois da manutenção — e depois dele vem o passo de compra normal (a ordem segue do passo em que foi pedido)', () => {
  let s = mesa(); [s] = poe(s, 0, 'Relógio', 'battlefield');
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1'); const mao = s.zones[0].hand.length;
  let vistos; [s, vistos] = trilha(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  eq([vistos.filter(v => /^(upkeep|draw)/.test(v)), s.zones[0].hand.length - mao], [['upkeep', 'draw*', 'draw'], 2], 'duas compras: a do passo a mais e a do passo normal');
});

test('CR 500.9 · manutenção a mais pedida no passo de compra: depois dela vem a principal, não outro passo de compra', () => {
  let s = mesa(); s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1');
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'draw' && !x.stack.length && !x.pending); const mao = s.zones[0].hand.length;
  let a; [s, a] = poe(s, 0, 'Ampulheta', 'hand'); s = J(s); s.players[0].pool.C += 1; s.turn.priority = 0;
  s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === a)[0]);
  let vistos; [s, vistos] = trilha(s, x => x.turn.step === 'main1' && !x.stack.length && !x.pending);
  eq([vistos.filter(v => /^(upkeep|draw)/.test(v)), s.zones[0].hand.length - mao, s.voltaDoExtraT], [['draw', 'upkeep*'], 0, undefined]);
});

test('CR 500.9 · o turno que acaba com um passo a mais ainda por jogar: nada dele passa ao turno seguinte', () => {
  let s = mesa(); [s] = poe(s, 0, 'Relógio', 'battlefield');
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1');
  s = passaAte(s, x => x.turn.active === 0 && x.emPassoExtraT === 'draw' && !x.stack.length && !x.pending);
  s = J(s); s.passosExtrasT = [{ depois: 'draw', passo: 'upkeep', turno: s.turn.number }]; // um pedido ainda por jogar
  s = J(s); s.turn.step = 'end'; s.turn.passes = 0; // o turno acaba sem jogar o pedido
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'upkeep');
  eq([s.emPassoExtraT, s.passosExtrasT, s.voltaDoExtraT], [undefined, undefined, undefined]);
});

test('CR 500.6 / 500.9 · validador', () => {
  const v = sc => J(SC.validateScript({ name: 'X', ...sc, example: { action: 'etb', target: 'none', expect: { attached: false } } }));
  eq(v({ abilities: [{ kind: 'triggered', when: 'each-draw-step', condition: { fonteDesvirada: true }, effects: [{ do: 'draw', amount: 1, target: 'that-player' }] }] }), []);
  assert.ok(v({ abilities: [{ kind: 'triggered', when: 'upkeep', condition: { primeiraManutencao: 2 }, effects: [{ do: 'gain', amount: 1 }] }] }).some(e => /primeiraManutencao/.test(e)));
  assert.match(T.descreveEfeitos([{ do: 'draw', amount: 1, target: 'that-player' }]), /^esse jogador compra/, 'T-102 · quem compra é o jogador do turno, não quem controla');
});

test('CR 103.8a · T-106: quem começa pula o passo de compra do primeiro turno — Howling Mine (texto oficial) não dá carta nele', () => {
  const C2 = { ...C };
  let s = E.createGame({ format: 'livre', seed: 3, mode: 'full', cards: C2, scripts: SCRIPTS, players: [{ name: 'A', deck: [{ name: 'Howling Mine', qty: 4, zone: 'main' }, { name: 'Island', qty: 20, zone: 'main' }] }, { name: 'B', deck: [{ name: 'Island', qty: 24, zone: 'main' }] }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  assert.equal(s.turn.firstTurn, true);
  const a = s.turn.active; let h; [s, h] = poe(s, a, 'Howling Mine', 'battlefield'); const mao = s.zones[a].hand.length;
  s = passaAte(s, x => x.turn.step === 'main1' && !x.stack.length && !x.pending);
  eq([s.turn.number, s.zones[a].hand.length - mao], [1, 0], 'nem a do turno nem a da Howling Mine');
});
