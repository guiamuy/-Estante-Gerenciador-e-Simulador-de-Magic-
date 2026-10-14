// T-103 · CR5 · Passo a mais depois de uma fase (500.10, 500.10a) e fase inicial a mais (500.8, 501.1).
// Texto da regra: .regras/cr-2026-09-25.txt. Cartas com o texto oficial de .listas/oficiais-tipos.json (Oracle do Forge, clone de 13/10/2026,
// conferido no master em 14/10/2026): Obeka, Splitter of Seconds, Sphinx of the Second Sun, Shadow of the Second Sun e Fatigue.
// "Vigia", "Urso" e "Ampulheta" são cartas de teste.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S as SC, T, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const NOMES = ['Obeka, Splitter of Seconds', 'Sphinx of the Second Sun', 'Shadow of the Second Sun', 'Fatigue', 'Mandate of Peace'];
const KW = { 'Obeka, Splitter of Seconds': ['Menace'], 'Sphinx of the Second Sun': ['Flying'] };
const C = {};
for (const c of L('oficiais-tipos.json').filter(x => NOMES.includes(x.name)))
  C[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: KW[c.name] || [], oracle_text: c.oracle_text, colors: [], power: c.power, toughness: c.toughness };
C.Island = { name: 'Island', type_line: 'Basic Land — Island', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {U}.)', colors: [] };
const carta = (name, type_line, extra = {}) => { C[name] = { name, type_line, mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra }; };
carta('Vigia', 'Enchantment'); carta('Urso', 'Creature — Bear', { power: '2', toughness: '2' }); carta('Ampulheta', 'Instant');
const EXP = { example: { action: 'etb', target: 'none', expect: { attached: false } } };
const SCRIPTS = {
  'Vigia': { name: 'Vigia', abilities: [{ kind: 'triggered', when: 'upkeep', effects: [{ do: 'gain', amount: 1 }] }], ...EXP }, // "At the beginning of your upkeep, you gain 1 life."
  'Ampulheta': { name: 'Ampulheta', effects: [{ do: 'passo_extra', passo: 'upkeep', apos: 'fase', target: 'self' }], example: { target: 'none', expect: { selfLife: 0 } } }, // "You get an additional upkeep step after this phase."
};
function mesa(seed = 1) {
  const deck = [...Object.keys(C).filter(n => n !== 'Island').map(name => ({ name, qty: 2, zone: 'main' })), { name: 'Island', qty: 16, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p = 0, n = 9) => { s = J(s); for (const c of 'WUBRGC') s.players[p].pool[c] += n; return s; };
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
/** passa a prioridade (bloqueio: nenhum; atacantes: os dados) e registra cada passo por onde a partida passou (* = passo a mais). */
const trilha = (s, fim, atacantes = []) => { const vistos = [], durante = []; for (let i = 0; i < 400 && !fim(s); i++) {
  const p = s.pending ? s.pending.p : s.turn.priority; const os = legais(s, p);
  const a = s.pending && s.pending.kind === 'attackers' ? { t: 'attack', p, attackers: atacantes } : s.pending && s.pending.kind === 'blockers' ? { t: 'block', p, blocks: [] } : (os.find(x => x.t === 'pass') || os[0]);
  s = act(s, a); const k = `${s.turn.active}:${s.turn.step}${s.emPassoExtraT ? '*' : ''}`; if (vistos[vistos.length - 1] !== k) { vistos.push(k); durante.push(J(s)); } }
  return [s, vistos, durante]; };

test('CR 500.10 · Obeka (texto oficial): 2 de dano de combate ao jogador, duas manutenções a mais depois da fase de combate — com as criaturas já fora do combate — e depois a principal 2', () => {
  let s = mesa(); let o; [s, o] = poe(s, 0, 'Obeka, Splitter of Seconds', 'battlefield'); [s] = poe(s, 0, 'Vigia', 'battlefield'); s = J(s); s.objects[o].sick = false;
  const v = s.players[0].life;
  let vistos, durante; [s, vistos, durante] = trilha(s, x => x.turn.step === 'main2', [o]);
  const i = vistos.indexOf('0:upkeep*');
  eq([vistos.slice(vistos.indexOf('0:combat_end')), s.players[0].life - v, s.players[1].life], [['0:combat_end', '0:upkeep*', '0:main2'], 2, 18], 'duas manutenções (a Vigia duas vezes), depois a principal 2');
  eq([durante[i].objects[o].attacking, durante[i].combat], [undefined, null], 'na manutenção a mais, Obeka já não está atacando (511.3)');
  for (const k of ['emPassoExtraT', 'filaExtraT', 'voltaDoExtraT', 'passosExtrasT']) assert.equal(s[k], undefined, 'nada sobra: ' + k);
});

test('CR 500.10 · Obeka bloqueada não causa dano ao jogador: nenhum passo a mais', () => {
  let s = mesa(); let o, u1, u2; [s, o] = poe(s, 0, 'Obeka, Splitter of Seconds', 'battlefield'); [s, u1] = poe(s, 1, 'Urso', 'battlefield'); [s, u2] = poe(s, 1, 'Urso', 'battlefield'); s = J(s); s.objects[o].sick = false;
  s = passaAte(s, x => x.turn.step === 'combat_attackers' || !!x.pending); s = act(s, { t: 'attack', p: 0, attackers: [o] });
  s = passaAte(s, x => !!x.pending && x.pending.kind === 'blockers'); s = act(s, { t: 'block', p: 1, blocks: [[u1, o], [u2, o]] });
  let vistos; [s, vistos] = trilha(s, x => x.turn.step === 'main2');
  eq([vistos.some(x => x.endsWith('*')), s.players[1].life], [false, 20]);
});

test('CR 500.8 / 501.1 · Sphinx of the Second Sun (texto oficial): na principal 2, uma fase inicial a mais — desvira, manutenção (gatilhos) e compra — e depois o passo final', () => {
  let s = mesa(); let ilha; [s] = poe(s, 0, 'Sphinx of the Second Sun', 'battlefield'); [s] = poe(s, 0, 'Vigia', 'battlefield'); [s, ilha] = poe(s, 0, 'Island', 'battlefield');
  s = J(s); s.objects[ilha].tapped = true; const v = s.players[0].life, mao = s.zones[0].hand.length;
  let vistos, durante; [s, vistos, durante] = trilha(s, x => x.turn.step === 'end' || x.turn.active === 1);
  eq([vistos.slice(vistos.indexOf('0:main2')), s.players[0].life - v, s.zones[0].hand.length - mao, s.objects[ilha].tapped], [['0:main2', '0:upkeep*', '0:draw*', '0:end'], 1, 1, false], 'desvirou a Ilha, a Vigia ganhou 1, comprou 1, e veio o passo final');
});

test('CR 500.8 · Shadow of the Second Sun (texto oficial): só na principal 2 do jogador encantado', () => {
  let s = mesa(); let sh; [s, sh] = poe(s, 0, 'Shadow of the Second Sun', 'hand'); s = mana(s);
  s = passaAte(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === sh && x.targets && x.targets[0] && x.targets[0].player === 1)[0]), x => !x.stack.length || !!x.pending);
  let vistos; [s, vistos] = trilha(s, x => x.turn.active === 1 && x.turn.step === 'end');
  eq([vistos.filter(x => x.endsWith('*'))], [['1:upkeep*', '1:draw*']], 'no turno de A nada; no de B, a fase inicial a mais');
});

test('CR 614.10 · Fatigue (texto oficial) em si mesmo na principal 1: o próximo passo de compra é o da fase inicial a mais — pulado, vem o passo final (não a principal 1)', () => {
  let s = mesa(); let f; [s] = poe(s, 0, 'Sphinx of the Second Sun', 'battlefield'); [s, f] = poe(s, 0, 'Fatigue', 'hand'); s = mana(s);
  s = passaAte(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === f && x.targets && x.targets[0] && x.targets[0].player === 0)[0]), x => !x.stack.length || !!x.pending);
  const mao = s.zones[0].hand.length;
  let vistos; [s, vistos] = trilha(s, x => x.turn.step === 'end' || x.turn.active === 1);
  eq([vistos.slice(vistos.indexOf('0:main2')), s.zones[0].hand.length - mao], [['0:main2', '0:upkeep*', '0:end'], 0]); assert.equal(s.pulosT, undefined);
});

test('CR 500.10a · "you get" no turno de outro jogador: nada é acrescentado', () => {
  let s = mesa(); s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  let a; [s, a] = poe(s, 0, 'Ampulheta', 'hand'); s = mana(s); s = J(s); s.turn.priority = 0;
  s = passaAte(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === a)[0]), x => !x.stack.length || !!x.pending);
  let vistos; [s, vistos] = trilha(s, x => x.turn.active === 0);
  eq(vistos.some(x => x.endsWith('*')), false); assert.equal(s.passosExtrasT, undefined);
});

test('CR 500.10 · validador e pilha explicada', () => {
  const v = sc => J(SC.validateScript({ name: 'X', ...sc, example: { target: 'none', expect: { selfLife: 0 } } }));
  eq(v({ effects: [{ do: 'passo_extra', fase: 'inicial', target: 'self' }] }), []);
  assert.ok(v({ effects: [{ do: 'passo_extra', fase: 'combate', target: 'self' }] }).some(e => /fase/.test(e)));
  assert.ok(v({ effects: [{ do: 'passo_extra', passo: 'upkeep', apos: 'turno', target: 'self' }] }).some(e => /apos/.test(e)));
  assert.match(T.descreveEfeitos([{ do: 'passo_extra', passo: 'upkeep', apos: 'fase', n: { per: 'trigger-value' }, target: 'self' }]), /manutenções a mais depois desta fase/);
});

test('CR 302.6 / 701.35a · T-106: o desvirar da fase inicial a mais não é começo de turno — a criatura que entrou segue enjoada e a detenção segue', () => {
  let s = mesa(); let u, x; [s] = poe(s, 0, 'Sphinx of the Second Sun', 'battlefield'); [s, u] = poe(s, 0, 'Urso', 'battlefield'); [s, x] = poe(s, 1, 'Urso', 'battlefield');
  s = J(s); s.objects[u].sick = true; s.objects[x].detidaV = [{ by: 0, z: s.objects[x].zc || 0 }]; s.objects[x].cantAttackNext = { by: 0 };
  let vistos, durante; [s, vistos, durante] = trilha(s, y => y.turn.step === 'end' || y.turn.active === 1);
  const i = vistos.indexOf('0:upkeep*'); assert.ok(i >= 0, vistos.join(' '));
  eq([durante[i].objects[u].sick, !!durante[i].objects[x].detidaV], [true, true]);
});

test('CR 724.2d · T-106: Mandate of Peace (texto oficial) depois do gatilho de Obeka — a fase de combate acaba e as manutenções pedidas "depois desta fase" acontecem', () => {
  let s = mesa(); let o, m; [s, o] = poe(s, 0, 'Obeka, Splitter of Seconds', 'battlefield'); [s] = poe(s, 0, 'Vigia', 'battlefield'); [s, m] = poe(s, 0, 'Mandate of Peace', 'hand'); s = J(s); s.objects[o].sick = false;
  const v = s.players[0].life;
  s = passaAte(s, x => x.turn.step === 'combat_attackers' || !!x.pending); s = act(s, { t: 'attack', p: 0, attackers: [o] });
  for (let i = 0; i < 40 && !(s.turn.step === 'combat_damage' && !s.stack.length && !s.pending && s.turn.priority === 0); i++) s = s.pending && s.pending.kind === 'blockers' ? act(s, { t: 'block', p: 1, blocks: [] }) : act(s, legais(s, s.pending ? s.pending.p : s.turn.priority).find(x => x.t === 'pass') || legais(s, s.pending ? s.pending.p : s.turn.priority)[0]);
  assert.equal((s.passosExtrasT || []).length, 1, 'o pedido de Obeka está lá');
  s = mana(s); s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === m)[0]);
  let vistos; [s, vistos] = trilha(s, x => x.turn.step === 'main2');
  eq([vistos.filter(x => x.endsWith('*')).length > 0, s.players[0].life - v], [true, 2], 'as duas manutenções aconteceram');
});

test('CR 500.10 / 614.10 · T-106: pedido "depois desta fase" feito na manutenção, com o passo de compra pulado — a manutenção a mais acontece depois da fase', () => {
  let s = mesa(); let f; [s] = poe(s, 0, 'Vigia', 'battlefield'); [s, f] = poe(s, 0, 'Fatigue', 'hand'); s = mana(s);
  s = passaAte(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === f && x.targets && x.targets[0] && x.targets[0].player === 0)[0]), x => !x.stack.length || !!x.pending);
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'upkeep' && x.turn.number > 2 && !x.stack.length && !x.pending);
  const v = s.players[0].life; let a; [s, a] = poe(s, 0, 'Ampulheta', 'hand'); s = mana(s); s = J(s); s.turn.priority = 0;
  s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === a)[0]);
  let vistos; [s, vistos] = trilha(s, x => x.turn.step === 'main1');
  eq([vistos.includes('0:draw'), vistos.includes('0:upkeep*'), s.players[0].life - v], [false, true, 1], 'sem compra; a manutenção a mais (a Vigia +1)');
});
