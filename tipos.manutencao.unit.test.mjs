// T-112 · CR5 · Auras com gatilho de manutenção: "enchanted player's upkeep ... that player or a planeswalker that player controls"
// (303.4b, 603.2, 120.3) e "the upkeep of enchanted creature's controller" (303.4, 603.2, 122.1). Texto da regra: .regras/cr-2026-09-25.txt.
// Cartas com o texto oficial de .listas/oficiais-tipos.json (Oracle pelo mtg.wtf, consulta de 17/10/2026): Curse of the Pierced Heart e
// Unstable Mutation. "Urso", "Andarilho" e "Volta" são cartas de teste.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S as SC, T, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const PH = 'Curse of the Pierced Heart', UM = 'Unstable Mutation';
const C = {};
for (const c of L('oficiais-tipos.json').filter(x => [PH, UM].includes(x.name)))
  C[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: [] };
C.Island = { name: 'Island', type_line: 'Basic Land — Island', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {U}.)', colors: [] };
const carta = (name, type_line, extra = {}) => { C[name] = { name, type_line, mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra }; };
carta('Urso', 'Creature — Bear', { power: '2', toughness: '2' }); carta('Volta', 'Instant'); carta('Andarilho', 'Legendary Planeswalker — Teste', { loyalty: '3' });
const EX = { example: { target: 'none', expect: { selfLife: 0 } } };
const SCRIPTS = {
  'Volta': { name: 'Volta', effects: [{ do: 'bounce', target: 'permanent' }], ...EX },
  'Andarilho': { name: 'Andarilho', loyalty: [{ cost: 1, label: '+1', effects: [{ do: 'gain', amount: 1 }] }], ...EX },
};
function mesa(seed = 1) {
  const deck = [...Object.keys(C).filter(n => n !== 'Island').map(name => ({ name, qty: 3, zone: 'main' })), { name: 'Island', qty: 16, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p = 0, n = 9) => { s = J(s); for (const c of 'WUBRGC') s.players[p].pool[c] += n; return s; };
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending);
const manutencaoDe = (s, p) => resolve(passaAte(s, x => x.turn.active === p && x.turn.step === 'upkeep' && x.turn.number > s.turn.number && (!!x.stack.length || !!x.pending)));
const conjuraEm = (s, nome, alvo) => { let o; [s, o] = poe(s, 0, nome, 'hand'); s = mana(s); const a = legais(s, 0, x => x.t === 'cast' && x.oid === o && J(x.targets) && JSON.stringify(x.targets[0]) === JSON.stringify(alvo))[0]; assert.ok(a, 'conjurar ' + nome); return [resolve(act(s, a)), o]; };

test('CR 303.4b · Curse of the Pierced Heart (texto oficial): na manutenção do jogador encantado, sem planeswalker, 1 de dano nele; na manutenção de quem conjurou, nada', () => {
  let s = mesa(); [s] = conjuraEm(s, PH, { player: 1 });
  const vidaA = s.players[0].life;
  s = manutencaoDe(s, 1);
  eq([s.players[1].life, s.pending], [19, null], 'sem planeswalker não há pergunta');
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  eq(s.players[0].life, vidaA, 'na manutenção de A, nada');
});

test('CR 303.4b / 120.3 · "that player or a planeswalker that player controls": com planeswalker, quem controla a Maldição escolhe na resolução — o jogador ou o planeswalker (perde 1 de lealdade)', () => {
  let s = mesa(); [s] = conjuraEm(s, PH, { player: 1 }); let pw; [s, pw] = poe(s, 1, 'Andarilho', 'battlefield', { counters: { loyalty: 3 } });
  s = manutencaoDe(s, 1);
  assert.ok(s.pending && s.pending.p === 0, 'quem controla a Maldição escolhe');
  const opcoes = legais(s, 0); eq(opcoes.length, 2, 'o jogador ou o planeswalker');
  let a = act(s, opcoes[0]); a = resolve(a);
  let b = act(s, opcoes[1]); b = resolve(b);
  const r = x => [x.players[1].life, x.objects[pw].counters.loyalty];
  eq([r(a), r(b)].sort(), [[19, 3], [20, 2]].sort());
});

test('CR 303.4b · a Maldição de Pierced Heart não mira: não cobra salvaguarda e não depende de alvo legal na resolução; em si mesmo, causa o dano em quem conjurou', () => {
  let s = mesa(); [s] = conjuraEm(s, PH, { player: 0 });
  s = manutencaoDe(s, 0);
  eq(s.players[0].life, 19);
  const item = SC.validateScript({ name: PH, aura: { enchant: 'player' }, abilities: [{ kind: 'triggered', when: 'enchanted-player-upkeep', effects: [{ do: 'dano_jogador_ou_pw', amount: 1, target: 'enchanted-player' }] }], example: { target: 'opponent', expect: { attached: false } } });
  eq(item, []);
});

test('CR 303.4 / 603.2 · Unstable Mutation (texto oficial): +3/+3; na manutenção de quem controla a criatura encantada, um marcador −1/−1 nela — inclusive se a criatura for do oponente', () => {
  let s = mesa(); let u, um; [s, u] = poe(s, 0, 'Urso');
  [s, um] = conjuraEm(s, UM, { oid: u });
  let st = E.stats(s, s.objects[u]); eq([st.power, st.toughness], [5, 5]);
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  eq((s.objects[u].counters || {}).m1m1 || 0, 0, 'na manutenção de B (não controla o Urso), nada');
  s = manutencaoDe(s, 0);
  eq(s.objects[u].counters.m1m1, 1); st = E.stats(s, s.objects[u]); eq([st.power, st.toughness], [4, 4]);
  // na criatura do oponente: dispara na manutenção do oponente
  let s2 = mesa(); let v; [s2, v] = poe(s2, 1, 'Urso');
  [s2] = conjuraEm(s2, UM, { oid: v });
  s2 = manutencaoDe(s2, 1);
  eq(s2.objects[v].counters.m1m1, 1, 'na manutenção de B, quem controla a criatura');
});

test('CR 303.4 · ruling de 01/08/2005: o marcador −1/−1 fica sem a Aura; o +3/+3 sai com ela. "That creature" é a encantada quando disparou (400.7)', () => {
  let s = mesa(); let u, um; [s, u] = poe(s, 0, 'Urso');
  [s, um] = conjuraEm(s, UM, { oid: u });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'upkeep' && x.turn.number > s.turn.number && !!x.stack.length);
  // com o gatilho na pilha, a Aura volta para a mão: o marcador ainda vai para o Urso
  s = J(s); const bf = s.zones[0].battlefield; bf.splice(bf.indexOf(um), 1); s.zones[0].hand.push(um); Object.assign(s.objects[um], { zone: 'hand', zc: (s.objects[um].zc || 0) + 1 }); delete s.objects[um].attachedTo;
  s = resolve(s);
  eq(s.objects[u].counters.m1m1, 1);
  const st = E.stats(s, s.objects[u]); eq([st.power, st.toughness], [1, 1], 'sem a Aura: 2/2 com um −1/−1');
});

test('CR 303.4 · Unstable Mutation mata a criatura com o tempo: 2/2 encantada morre na quinta manutenção de quem a controla (5/5 menos cinco)', () => {
  let s = mesa(); let u; [s, u] = poe(s, 0, 'Urso');
  [s] = conjuraEm(s, UM, { oid: u });
  for (let i = 0; i < 5; i++) s = manutencaoDe(s, 0);
  eq(s.objects[u].zone, 'graveyard');
});

test('CR 303.4 · auditoria D2/D3 (T-112): o registro diz "marcador −1/−1" e a escolha da Maldição mantém o nome do jogador e do planeswalker', () => {
  let s = mesa(); let u; [s, u] = poe(s, 0, 'Urso');
  [s] = conjuraEm(s, UM, { oid: u });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'upkeep' && x.turn.number > s.turn.number && !!x.stack.length);
  let pa = legais(s, s.turn.priority).find(a => a.t === 'pass'), r = E.apply(s, pa);
  if (!r.events.some(e => e.do === 'counters')) { s = r.state; pa = legais(s, s.turn.priority).find(a => a.t === 'pass'); r = E.apply(s, pa); } // os dois passam
  const ev = r.events.filter(e => e.do === 'counters'); eq(ev.length, 1, 'o gatilho resolveu nesta passada');
  const L = T.describe(s, pa, r.events, r.state).join(' | ');
  assert.match(L, /marcador −1\/−1/); assert.doesNotMatch(L, /m1m1/);
  let c = mesa(); [c] = conjuraEm(c, PH, { player: 1 }); [c] = poe(c, 1, 'Andarilho', 'battlefield', { counters: { loyalty: 3 } });
  c = manutencaoDe(c, 1);
  for (const [i, nome] of [[0, 'B'], [1, 'Andarilho']]) {
    const a = legais(c, 0)[i], rr = E.apply(c, a);
    assert.match(T.describe(c, a, rr.events, rr.state).join(' | '), new RegExp('A escolheu ' + nome + ' '));
  }
});
