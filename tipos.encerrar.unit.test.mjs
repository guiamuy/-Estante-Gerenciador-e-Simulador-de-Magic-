// T-92 · CR5 · Encerrar o turno (724.1) e encerrar a fase de combate (724.2).
// Texto da regra: .regras/cr-2026-09-25.txt. Cartas com o texto oficial de .listas/oficiais-tipos.json (Oracle do Forge, clone de 13/10/2026,
// conferido no master em 14/10/2026): Time Stop, Sundial of the Infinite, Ultima e Mandate of Peace. "Urso", "Pedra", "Fim", "Combate",
// "Lembrança", "Raio" e "Fora" são cartas de teste.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S as SC, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const NOMES = ['Time Stop', 'Sundial of the Infinite', 'Ultima', 'Mandate of Peace'];
const C = {};
for (const c of L('oficiais-tipos.json').filter(x => NOMES.includes(x.name)))
  C[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: [] };
C.Island = { name: 'Island', type_line: 'Basic Land — Island', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {U}.)', colors: [] };
const carta = (name, type_line, extra = {}) => { C[name] = { name, type_line, mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra }; };
carta('Urso', 'Creature — Bear', { power: '2', toughness: '2' }); carta('Pedra', 'Artifact'); carta('Raio', 'Instant'); carta('Fora', 'Instant');
carta('Fim', 'Creature — Spirit', { power: '1', toughness: '1' }); carta('Combate', 'Creature — Soldier', { power: '1', toughness: '1' }); carta('Lembrança', 'Creature — Spirit', { power: '1', toughness: '1' });
const EX = { example: { target: 'none', expect: { selfLife: 0 } } }, EXP = { example: { action: 'etb', target: 'none', expect: { attached: false } } };
const SCRIPTS = {
  'Raio': { name: 'Raio', effects: [{ do: 'pump', power: 2, toughness: 0, target: 'creature' }], ...EX }, // "Target creature gets +2/+0 until end of turn."
  'Fora': { name: 'Fora', effects: [{ do: 'encerra_combate' }], ...EX }, // "End the combat phase." (para a 724.2g)
  'Fim': { name: 'Fim', abilities: [{ kind: 'triggered', when: 'end-step', effects: [{ do: 'gain', amount: 5 }] }], ...EXP }, // "At the beginning of your end step, you gain 5 life."
  'Combate': { name: 'Combate', abilities: [{ kind: 'triggered', when: 'end-of-combat', effects: [{ do: 'gain', amount: 7 }] }], ...EXP }, // "At end of combat, you gain 7 life."
  'Lembrança': { name: 'Lembrança', abilities: [{ kind: 'triggered', when: 'dies', effects: [{ do: 'gain', amount: 3 }] }], ...EXP }, // "When this dies, you gain 3 life."
};
function mesa(seed = 1) {
  const deck = [...Object.keys(C).filter(n => n !== 'Island').map(name => ({ name, qty: 3, zone: 'main' })), { name: 'Island', qty: 16, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p = 0, n = 9) => { s = J(s); for (const c of 'WUBRGC') s.players[p].pool[c] += n; return s; };
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const comPrioridade = (s, p) => { s = J(s); s.turn.priority = p; return s; };
const lanca = (s, p, nome, f = () => true) => { let o; [s, o] = poe(s, p, nome, 'hand'); s = mana(s, p); s = comPrioridade(s, p); const a = legais(s, p, x => x.t === 'cast' && x.oid === o && f(x))[0]; assert.ok(a, 'conjurar ' + nome); return [act(s, a), o]; };
const resolve = s => { for (let i = 0; i < 40; i++) { s = passaAte(s, x => !x.stack.length || !!x.pending); if (!s.pending) return s; const os = legais(s, s.pending.p); s = act(s, os.find(a => a.t === 'discard') || os[0]); } return s; };
const ataca = (s, oids) => { s = passaAte(s, x => x.turn.step === 'combat_attackers' || !!x.pending); return act(s, { t: 'attack', p: 0, attackers: oids }); };

test('CR 724.1b · Time Stop (texto oficial): a mágica que estava embaixo e o próprio Time Stop vão para o exílio; o turno passa para o oponente', () => {
  let s = mesa(); let u, t; [s, u] = lanca(s, 0, 'Urso'); [s, t] = lanca(s, 0, 'Time Stop');
  eq(s.stack.length, 2);
  const n = s.turn.number; s = resolve(s);
  eq([s.objects[u].zone, s.objects[t].zone], ['exile', 'exile']);
  eq([s.turn.active, s.turn.number], [1, n + 1], 'o turno acabou');
});

test('CR 724.1d / 724.1e · no combate as criaturas saem do combate e não causam dano; o passo final não acontece ("at the beginning of your end step" não dispara); a limpeza acontece ("until end of turn" acaba)', () => {
  let s = mesa(); let u, f; [s, u] = poe(s, 0, 'Urso', 'battlefield'); [s, f] = poe(s, 0, 'Fim', 'battlefield'); s = J(s); s.objects[u].sick = false;
  [s] = lanca(s, 0, 'Raio', a => a.targets[0].oid === u); s = resolve(s);
  eq(E.stats(s, s.objects[u]).power, 4);
  s = ataca(s, [u]); s = passaAte(s, x => x.turn.step === 'combat_blockers' || !!x.pending); if (s.pending && s.pending.kind === 'blockers') s = act(s, { t: 'block', p: 1, blocks: [] });
  s = passaAte(s, x => x.turn.step === 'combat_blockers' && x.turn.priority === 1);
  const vB = s.players[1].life, vA = s.players[0].life;
  [s] = lanca(s, 1, 'Time Stop'); s = resolve(s);
  eq([s.players[1].life, s.players[0].life, s.turn.active], [vB, vA, 1], 'nenhum dano; o Fim não deu vida; agora é o turno de B');
  eq([!!s.objects[u].attacking, E.stats(s, s.objects[u]).power], [false, 2], 'fora do combate; o +2/+0 acabou na limpeza');
});

test('CR 724.1a · Ultima (texto oficial): destrói artefatos e criaturas e encerra o turno — o gatilho de morrer que disparou antes do encerramento deixa de existir', () => {
  let s = mesa(); let l, k, b; [s, l] = poe(s, 0, 'Lembrança', 'battlefield'); [s, k] = poe(s, 1, 'Pedra', 'battlefield'); [s, b] = poe(s, 1, 'Urso', 'battlefield');
  const v = s.players[0].life;
  [s] = lanca(s, 0, 'Ultima'); s = resolve(s);
  eq([s.objects[l].zone, s.objects[k].zone, s.objects[b].zone], ['graveyard', 'graveyard', 'graveyard'], 'destruiu artefatos e criaturas');
  eq([s.players[0].life - v, s.turn.active], [0, 1], 'a Lembrança não deu vida (724.1a); o turno passou');
});

test('CR 724.1c / 724.1f · o que a ação de estado do encerramento dispara vai para a pilha na limpeza, com prioridade, e depois vem outra limpeza', () => {
  let s = mesa(); let l; [s, l] = poe(s, 0, 'Lembrança', 'battlefield');
  const v = s.players[0].life;
  [s] = lanca(s, 0, 'Time Stop'); s = act(s, { t: 'pass', p: 0 });
  s = J(s); s.objects[l].damage = 5; // a ação de estado só é conferida no encerramento (724.1c)
  s = act(s, { t: 'pass', p: 1 });
  eq([s.turn.step, s.turn.active, s.objects[l].zone], ['cleanup', 0, 'graveyard'], 'na limpeza, com o gatilho de morrer');
  s = resolve(s); eq([s.players[0].life - v, s.turn.step], [3, 'cleanup'], 'resolveu na limpeza (514.3a: os jogadores têm prioridade)');
  s = passaAte(s, x => x.turn.active === 1);
  eq([s.turn.active, s.turn.step === 'cleanup'], [1, false], 'outra limpeza e o turno passou');
});

test('CR 724.1 / 514.1 · na limpeza de um turno encerrado o jogador ativo descarta até o tamanho máximo da mão', () => {
  let s = mesa(); s = J(s);
  while (s.zones[0].hand.length < 9) { const o = s.zones[0].library.shift(); s.zones[0].hand.push(o); s.objects[o].zone = 'hand'; }
  [s] = lanca(s, 0, 'Time Stop');
  s = passaAte(s, x => !x.stack.length || !!x.pending);
  eq([s.pending && s.pending.kind, s.pending && s.pending.n], ['discard', 2]);
});

test('Sundial of the Infinite (texto oficial): só no seu turno; {1},{T} encerra o turno', () => {
  let s = mesa(); let d; [s, d] = poe(s, 1, 'Sundial of the Infinite', 'battlefield'); s = mana(s, 1); s = comPrioridade(s, 1);
  eq(legais(s, 1, a => a.t === 'activate' && a.oid === d).length, 0, 'no turno de A, B não ativa');
  assert.throws(() => E.apply(s, { t: 'activate', p: 1, oid: d, index: 0 }), /só no seu turno/);
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending); s = mana(s, 1);
  const n = s.turn.number; s = resolve(act(s, legais(s, 1, a => a.t === 'activate' && a.oid === d)[0]));
  eq([s.turn.active, s.turn.number], [0, n + 1]);
});

test('CR 724.2 · Mandate of Peace (texto oficial): só no combate; acaba o combate (sem dano, sem "at end of combat") e vai para a fase principal; os oponentes não conjuram mais neste turno', () => {
  let s = mesa(); let u, c; [s, u] = poe(s, 0, 'Urso', 'battlefield'); [s, c] = poe(s, 0, 'Combate', 'battlefield'); s = J(s); s.objects[u].sick = false;
  let m; [s, m] = poe(s, 1, 'Mandate of Peace', 'hand'); s = mana(s, 1); s = comPrioridade(s, 1);
  eq(legais(s, 1, a => a.t === 'cast' && a.oid === m).length, 0, 'fora do combate, não');
  s = comPrioridade(s, 0); s = ataca(s, [u]); s = passaAte(s, x => x.turn.step === 'combat_blockers' || !!x.pending); if (s.pending && s.pending.kind === 'blockers') s = act(s, { t: 'block', p: 1, blocks: [] });
  s = passaAte(s, x => x.turn.step === 'combat_blockers' && x.turn.priority === 1); s = mana(s, 1);
  const vA = s.players[0].life, vB = s.players[1].life;
  s = resolve(act(s, legais(s, 1, a => a.t === 'cast' && a.oid === m)[0]));
  eq([s.turn.step, s.turn.active, s.players[1].life, s.players[0].life, !!s.objects[u].attacking], ['main2', 0, vB, vA, false], 'principal 2, sem dano, sem os 7 de vida do Combate');
  let r; [s, r] = poe(s, 0, 'Urso', 'hand'); s = mana(s, 0);
  eq(legais(s, 0, a => a.t === 'cast' && a.oid === r).length, 0, 'A não conjura mais neste turno');
  s = passaAte(s, x => x.turn.active === 0 && x.turn.number > s.turn.number + 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending); s = mana(s, 0);
  assert.ok(legais(s, 0, a => a.t === 'cast' && a.oid === r).length > 0, 'no turno seguinte, sim');
});

test('CR 724.2g · fora da fase de combate, encerrar o combate não faz nada (a pilha fica)', () => {
  let s = mesa(); let u; [s, u] = lanca(s, 0, 'Urso'); [s] = lanca(s, 0, 'Fora');
  s = passaAte(s, x => x.stack.length === 1 || !!x.pending);
  eq([s.stack.length, s.turn.step, s.objects[u].zone], [1, 'main1', 'stack']);
});

test('CR 724 · validador: soNoSeuTurno só numa ativada; soEmCombate só como true', () => {
  const v = sc => J(SC.validateScript({ name: 'X', ...sc, example: { action: 'etb', target: 'none', expect: { attached: false } } }));
  eq(v({ abilities: [{ kind: 'activated', cost: { mana: '{1}' }, soNoSeuTurno: true, effects: [{ do: 'encerra_turno' }] }] }), []);
  assert.ok(v({ abilities: [{ kind: 'triggered', when: 'etb', soNoSeuTurno: true, effects: [{ do: 'gain', amount: 1 }] }] }).some(e => /soNoSeuTurno/.test(e)));
  assert.ok(v({ self: { soEmCombate: 'sim' }, effects: [{ do: 'gain', amount: 1 }] }).some(e => /soEmCombate/.test(e)));
});
