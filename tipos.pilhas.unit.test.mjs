// T-83 · CR5 · Separar objetos em pilhas (Comprehensive Rules 700.3, com 701.20).
// Texto da regra: .regras/cr-2026-09-25.txt. Cartas com o texto oficial de .listas/oficiais-tipos.json (Oracle do Forge, clone de
// 13/10/2026): Fact or Fiction, Steam Augury e Sphinx of Uthuun. "Urso" e "Choque" são cartas de teste.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S as SC, T, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const C = {};
for (const c of L('oficiais-tipos.json').filter(x => ['Fact or Fiction', 'Steam Augury', 'Sphinx of Uthuun'].includes(x.name)))
  C[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: c.name === 'Sphinx of Uthuun' ? ['Flying'] : [], oracle_text: c.oracle_text, colors: [], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) };
C.Island = { name: 'Island', type_line: 'Basic Land — Island', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {U}.)', colors: [] };
const carta = (name, type_line, extra = {}) => { C[name] = { name, type_line, mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra }; };
carta('Urso', 'Creature — Bear', { power: '2', toughness: '2' }); carta('Choque', 'Instant');
const SCRIPTS = { 'Choque': { name: 'Choque', effects: [{ do: 'damage', amount: 2, target: 'any' }], example: { target: 'none', expect: { selfLife: 0 } } } };
const FOF = 'Fact or Fiction', SA = 'Steam Augury', SU = 'Sphinx of Uthuun';
function mesa(seed = 1) {
  const deck = [...[FOF, SA, SU, 'Urso', 'Choque'].map(name => ({ name, qty: 4, zone: 'main' })), { name: 'Island', qty: 20, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p = 0, n = 9) => { s = J(s); for (const c of 'WUBRGC') s.players[p].pool[c] += n; return s; };
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const conjura = (s, nome) => { let o; [s, o] = poe(s, 0, nome, 'hand'); s = mana(s); s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === o)[0]); return passaAte(s, x => !!x.pending || !x.stack.length); };

test('CR 700.3 · Fact or Fiction (texto oficial): revela as cinco de cima; o oponente separa em duas pilhas; quem conjurou fica com uma na mão e a outra vai para o cemitério', () => {
  let s = mesa(); const topo = s.zones[0].library.slice(0, 5), mao = s.zones[0].hand.length, gy = s.zones[0].graveyard.length;
  s = conjura(s, FOF);
  eq([s.pending.kind, s.pending.p, J(s.pending.oids)], ['pilha_separa', 1, topo], 'o oponente separa as cinco do topo');
  assert.ok(topo.every(o => s.objects[o].zone === 'library'), '700.3c: enquanto separa, continuam no grimório');
  eq(legais(s, 1).filter(a => a.t === 'pilha_separa').length, 32, 'cada divisão (2^5) é uma oferta');
  s = act(s, { t: 'pilha_separa', p: 1, pilha: topo.slice(0, 2) });
  eq([s.pending.kind, s.pending.p], ['pilha_escolhe', 0]);
  s = act(s, { t: 'pilha_escolhe', p: 0, pilha: 1 });
  s = passaAte(s, x => !x.stack.length || !!x.pending);
  eq([topo.slice(2).every(o => s.objects[o].zone === 'hand'), topo.slice(0, 2).every(o => s.objects[o].zone === 'graveyard')], [true, true]);
  eq([s.zones[0].hand.length - mao, s.zones[0].graveyard.length - gy], [3, 3], 'três na mão; duas e a própria mágica no cemitério');
});

test('CR 700.3a / 700.3d · cada carta numa pilha só, e uma pilha pode ficar vazia: a separação com carta repetida ou de fora é recusada; a pilha vazia vale', () => {
  let s = mesa(); const topo = s.zones[0].library.slice(0, 5);
  s = conjura(s, FOF);
  assert.throws(() => E.apply(s, { t: 'pilha_separa', p: 1, pilha: [topo[0], topo[0]] }), /pilha/);
  assert.throws(() => E.apply(s, { t: 'pilha_separa', p: 1, pilha: [s.zones[0].library[7]] }), /pilha/);
  assert.throws(() => E.apply(s, { t: 'pilha_separa', p: 0, pilha: [] }), /pilha|nenhuma/);
  s = act(s, { t: 'pilha_separa', p: 1, pilha: [] });
  s = act(s, { t: 'pilha_escolhe', p: 0, pilha: 1 });
  s = passaAte(s, x => !x.stack.length || !!x.pending);
  eq(topo.every(o => s.objects[o].zone === 'hand'), true, 'a pilha com as cinco foi para a mão');
});

test('CR 700.3 · Steam Augury (texto oficial): quem conjura separa; o oponente escolhe a pilha que vai para a mão de quem conjurou', () => {
  let s = mesa(); const topo = s.zones[0].library.slice(0, 5);
  s = conjura(s, SA);
  eq([s.pending.kind, s.pending.p], ['pilha_separa', 0]);
  s = act(s, { t: 'pilha_separa', p: 0, pilha: topo.slice(0, 4) });
  eq([s.pending.kind, s.pending.p], ['pilha_escolhe', 1]);
  s = act(s, { t: 'pilha_escolhe', p: 1, pilha: 1 });
  s = passaAte(s, x => !x.stack.length || !!x.pending);
  eq([s.objects[topo[4]].zone, topo.slice(0, 4).every(o => s.objects[o].zone === 'graveyard')], ['hand', true]);
});

test('CR 700.3 · Sphinx of Uthuun (texto oficial): o gatilho de entrar faz o mesmo que Fact or Fiction', () => {
  let s = mesa(); const topo = s.zones[0].library.slice(0, 5);
  s = conjura(s, SU);
  for (let i = 0; i < 5 && s.pending && s.pending.kind !== 'pilha_separa'; i++) s = act(s, legais(s, s.pending.p)[0]);
  eq([s.pending && s.pending.kind, s.pending && s.pending.p], ['pilha_separa', 1]);
  s = act(s, { t: 'pilha_separa', p: 1, pilha: topo.slice(0, 1) });
  s = act(s, { t: 'pilha_escolhe', p: 0, pilha: 0 });
  s = passaAte(s, x => !x.stack.length || !!x.pending);
  eq([s.objects[topo[0]].zone, topo.slice(1).every(o => s.objects[o].zone === 'graveyard')], ['hand', true]);
});

test('CR 700.3 · com menos de cinco no grimório, revela as que tem; com nenhuma, não pergunta nada', () => {
  let s = mesa(); s = J(s); const z = s.zones[0]; const sobra = z.library.splice(2); z.graveyard.push(...sobra); for (const o of sobra) s.objects[o].zone = 'graveyard';
  s = conjura(s, FOF);
  eq(J(s.pending.oids).length, 2);
  s = mesa(); s = J(s); const z2 = s.zones[0]; const tudo = z2.library.splice(0); z2.graveyard.push(...tudo); for (const o of tudo) s.objects[o].zone = 'graveyard';
  s = conjura(s, FOF);
  assert.ok(!s.pending, 'nada a separar');
});

test('CR 700.3 / 701.20 · registro e validador: as cartas reveladas, as duas pilhas e a escolhida aparecem; parâmetros inválidos são recusados', () => {
  let s = mesa(); const topo = s.zones[0].library.slice(0, 5);
  let o; [s, o] = poe(s, 0, FOF, 'hand'); s = mana(s);
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === o)[0]);
  const r1 = E.apply(s, { t: 'pass', p: 0 }), r2 = E.apply(r1.state, { t: 'pass', p: 1 });
  const nomes = topo.map(x => s.objects[x].name);
  assert.match(T.describe(r1.state, { t: 'pass', p: 1 }, r2.events, r2.state).join(' | '), new RegExp('revelou ' + nomes[0]));
  s = passaAte(r2.state, x => !!x.pending);
  const r3 = E.apply(s, { t: 'pilha_separa', p: 1, pilha: topo.slice(0, 2) });
  assert.match(T.describe(s, { t: 'pilha_separa', p: 1, pilha: topo.slice(0, 2) }, r3.events, r3.state).join(' | '), /separou em duas pilhas/);
  const r4 = E.apply(r3.state, { t: 'pilha_escolhe', p: 0, pilha: 0 });
  assert.match(T.describe(r3.state, { t: 'pilha_escolhe', p: 0, pilha: 0 }, r4.events, r4.state).join(' | '), /ficou com a pilha/);
  const v = e => J(SC.validateScript({ name: 'X', effects: [e], example: { target: 'none', expect: { selfLife: 0 } } }));
  eq(v({ do: 'pilhas', amount: 5, separa: 'oponente', escolhe: 'voce' }), []);
  assert.ok(v({ do: 'pilhas', amount: 5, separa: 'todos' }).some(e => /separa/.test(e)));
  assert.ok(v({ do: 'pilhas', amount: 5, escolhe: 'alguem' }).some(e => /escolhe/.test(e)));
});
