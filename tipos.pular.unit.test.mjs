// T-99 · CR5 · Pular passo, fase e turno (Comprehensive Rules 614.10, 614.10a e 500.11).
// Texto da regra: .regras/cr-2026-09-25.txt. Cartas com o texto oficial de .listas/oficiais-tipos.json (Oracle do Forge, clone de 13/10/2026,
// conferido no master em 14/10/2026): Fatigue, Moment of Silence, False Peace, Meditate e Brine Elemental. "Urso" e "Vigia" são cartas de teste.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S as SC, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const NOMES = ['Fatigue', 'Moment of Silence', 'False Peace', 'Meditate', 'Brine Elemental', 'Wormfang Manta', 'Chronatog', 'Time Stop'];
const C = {};
for (const c of L('oficiais-tipos.json').filter(x => NOMES.includes(x.name)))
  C[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: c.name === 'Brine Elemental' ? ['Morph'] : [], oracle_text: c.oracle_text, colors: [], power: c.power, toughness: c.toughness };
C.Island = { name: 'Island', type_line: 'Basic Land — Island', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {U}.)', colors: [] };
const carta = (name, type_line, extra = {}) => { C[name] = { name, type_line, mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra }; };
carta('Urso', 'Creature — Bear', { power: '2', toughness: '2' }); carta('Vigia', 'Creature — Soldier', { power: '1', toughness: '1' });
const SCRIPTS = { 'Vigia': { name: 'Vigia', abilities: [{ kind: 'triggered', when: 'begin-combat', effects: [{ do: 'gain', amount: 3 }] }], example: { action: 'etb', target: 'none', expect: { attached: false } } } }; // "At the beginning of combat on your turn, you gain 3 life."
function mesa(seed = 1) {
  const deck = [...Object.keys(C).filter(n => n !== 'Island').map(name => ({ name, qty: 3, zone: 'main' })), { name: 'Island', qty: 16, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p = 0, n = 9) => { s = J(s); for (const c of 'WUBRGC') s.players[p].pool[c] += n; return s; };
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const conjura = (s, p, nome, f = () => true) => { let o; [s, o] = poe(s, p, nome, 'hand'); s = mana(s, p); s = J(s); s.turn.priority = p; const a = legais(s, p, x => x.t === 'cast' && x.oid === o && f(x))[0]; assert.ok(a, 'conjurar ' + nome); return passaAte(act(s, a), x => !x.stack.length || !!x.pending); };
const noJogador = p => a => a.targets && a.targets[0] && a.targets[0].player === p;
/** os passos por onde a partida passou até a condição (o registro de `turn.step` a cada ação). */
const passos = (s, fim) => { const vistos = []; for (let i = 0; i < 400 && !fim(s); i++) { const p = s.pending ? s.pending.p : s.turn.priority; const os = legais(s, p); const a = os.find(x => x.t === 'pass') || (s.pending && s.pending.kind === 'attackers' ? { t: 'attack', p, attackers: [] } : os[0]); s = act(s, a); const k = `${s.turn.active}:${s.turn.step}`; if (vistos[vistos.length - 1] !== k) vistos.push(k); } return [s, vistos]; }; // um registro por passo em que a partida esteve

test('CR 614.10 · Fatigue (texto oficial): o jogador alvo pula o próximo passo de compra — o dele, mesmo que não seja o turno de agora', () => {
  let s = mesa(); s = conjura(s, 0, 'Fatigue', noJogador(1));
  const mao = s.zones[1].hand.length; let vistos;
  [s, vistos] = passos(s, x => x.turn.active === 1 && x.turn.step === 'main1');
  eq([s.zones[1].hand.length - mao, vistos.includes('1:draw')], [0, false], 'B não comprou: o passo de compra não aconteceu');
  [s] = passos(s, x => x.turn.active === 1 && x.turn.number > s.turn.number + 1 && x.turn.step === 'main1');
  assert.equal(s.pulosT, undefined, 'consumido');
});

test('CR 614.10a · dois "pule o próximo" pulam dois', () => {
  let s = mesa(); s = conjura(s, 0, 'Fatigue', noJogador(1)); s = conjura(s, 0, 'Fatigue', noJogador(1));
  let vistos; [s, vistos] = passos(s, x => x.turn.active === 1 && x.turn.number > 3 && x.turn.step === 'main1');
  eq(vistos.filter(v => v === '1:draw').length, 0, 'nem no primeiro nem no segundo turno de B');
  [s, vistos] = passos(s, x => x.turn.active === 1 && x.turn.number > 5 && x.turn.step === 'main1');
  eq(vistos.filter(v => v === '1:draw').length, 1, 'no terceiro, compra');
});

test('CR 614.10 / 500.11 · Moment of Silence (texto oficial): o jogador ativo pula a fase de combate deste turno — sem gatilho de início de combate, direto para a principal 2', () => {
  let s = mesa(); let v; [s, v] = poe(s, 0, 'Vigia', 'battlefield'); const vida = s.players[0].life;
  s = conjura(s, 0, 'Moment of Silence', noJogador(0));
  let vistos; [s, vistos] = passos(s, x => x.turn.step === 'main2' || x.turn.active === 1);
  eq([s.turn.step, vistos.some(x => /combat/.test(x)), s.players[0].life - vida], ['main2', false, 0]);
});

test('CR 614.10 · "next combat phase this turn": conjurada no turno do oponente para ele mesmo, não vale no turno dele seguinte', () => {
  let s = mesa(); s = conjura(s, 0, 'Moment of Silence', noJogador(1));
  let vistos; [s, vistos] = passos(s, x => x.turn.active === 1 && x.turn.step === 'main2');
  assert.ok(vistos.includes('1:combat_begin'), 'B tem combate no turno dele');
});

test('CR 614.10 · False Peace (texto oficial): todas as fases de combate do próximo turno do jogador; conjurada no turno dele, vale no seguinte', () => {
  let s = mesa(); s = conjura(s, 0, 'False Peace', noJogador(0));
  let vistos; [s, vistos] = passos(s, x => x.turn.active === 0 && x.turn.number > 2 && x.turn.step === 'main2');
  eq(vistos.filter(v => v === '0:combat_begin').length, 1, 'neste turno, combate; no próximo de A, não');
  [s, vistos] = passos(s, x => x.turn.active === 0 && x.turn.number > 4 && x.turn.step === 'main2');
  eq(vistos.filter(v => v === '0:combat_begin').length, 1, 'no outro, de novo');
});

test('CR 614.10 · Meditate (texto oficial): compra quatro e você pula o próximo turno — o oponente joga dois seguidos', () => {
  let s = mesa(); const mao = s.zones[0].hand.length; const n = s.turn.number;
  s = conjura(s, 0, 'Meditate');
  eq(s.zones[0].hand.length - mao, 4);
  let vistos; [s, vistos] = passos(s, x => x.turn.number === n + 2 && x.turn.step === 'main1');
  eq(s.turn.active, 1, 'o turno n+2 é de B de novo');
  [s] = passos(s, x => x.turn.number === n + 3 && x.turn.step === 'main1');
  eq(s.turn.active, 0, 'depois volta para A');
});

test('CR 614.10 · Brine Elemental (texto oficial): virada para cima, cada oponente pula o próximo passo de desvirar — as permanentes dele seguem viradas', () => {
  let s = mesa(); let b, u; [s, b] = poe(s, 0, 'Brine Elemental', 'battlefield'); [s, u] = poe(s, 1, 'Urso', 'battlefield');
  s = J(s); s.objects[b].faceDown = true; s.objects[u].tapped = true;
  s = mana(s); const a = legais(s, 0, x => x.oid === b && /unmorph|face|desvira|vira/i.test(x.t))[0]; assert.ok(a, 'virar para cima: ' + JSON.stringify(legais(s, 0, x => x.oid === b).map(x => x.t)));
  s = passaAte(act(s, a), x => !x.stack.length || !!x.pending);
  [s] = passos(s, x => x.turn.active === 1 && x.turn.step === 'main1');
  eq(s.objects[u].tapped, true, 'o Urso de B não desvirou');
});

test('CR 302.6 / 701.35a · sem o passo de desvirar, o turno começa do mesmo jeito: a criatura de B deixa de estar enjoada e o que B deteve se solta', () => {
  let s = mesa(); let b, v, x; [s, b] = poe(s, 0, 'Brine Elemental', 'battlefield'); [s, v] = poe(s, 1, 'Vigia', 'battlefield'); [s, x] = poe(s, 0, 'Urso', 'battlefield');
  s = J(s); s.objects[b].faceDown = true; s.objects[v].sick = true; s.objects[x].detidaV = [{ by: 1, z: s.objects[x].zc || 0 }]; s.objects[x].cantAttackNext = { by: 1 };
  s = mana(s); s = passaAte(act(s, legais(s, 0, a => a.oid === b && /unmorph|face|desvira|vira/i.test(a.t))[0]), y => !y.stack.length || !!y.pending);
  [s] = passos(s, y => y.turn.active === 1 && y.turn.step === 'main1');
  eq([(s.puladosT || []).some(r => r.p === 1 && r.o === 'desvirar'), s.objects[v].sick, s.objects[x].detidaV, s.objects[x].cantAttackNext], [true, false, undefined, undefined]);
});

test('CR 614.10 · False Peace no oponente e o turno dele encerrado antes do combate (Time Stop, texto oficial): o "próximo turno" foi aquele — no seguinte, ele tem combate', () => {
  let s = mesa(); s = conjura(s, 0, 'False Peace', noJogador(1));
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'upkeep' && x.turn.priority === 0 && !x.stack.length && !x.pending);
  s = conjura(s, 0, 'Time Stop'); s = passaAte(s, x => !x.stack.length && !x.pending);
  let vistos; [s, vistos] = passos(s, x => x.turn.active === 1 && x.turn.number > 3 && x.turn.step === 'main2');
  assert.ok(vistos.includes('1:combat_begin'), 'B tem combate no turno seguinte: ' + vistos.join(' '));
  assert.equal(s.pulosT, undefined, 'nada sobra');
});

test('Wormfang Manta e Chronatog (textos oficiais): ao entrar, a Manta faz você pular o próximo turno, e ao sair dá um turno extra depois deste; o Chronatog ganha +3/+3 e você pula o próximo turno (uma vez por turno)', () => {
  let s = mesa(); let w; [s, w] = poe(s, 0, 'Wormfang Manta', 'hand'); s = mana(s); s = passaAte(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === w)[0]), x => !x.stack.length || !!x.pending);
  eq((s.pulosT || []).filter(r => r.p === 0 && r.o === 'turno').length, 1, 'a Manta entrou: um turno a pular');
  let c; [s, c] = poe(s, 0, 'Chronatog', 'battlefield'); s = J(s); s.objects[c].sick = false;
  s = passaAte(act(s, legais(s, 0, x => x.t === 'activate' && x.oid === c)[0]), x => !x.stack.length || !!x.pending);
  eq([E.stats(s, s.objects[c]).power, legais(s, 0, x => x.t === 'activate' && x.oid === c).length, (s.pulosT || []).filter(r => r.p === 0 && r.o === 'turno').length], [4, 0, 2], '+3/+3; não ativa de novo neste turno; dois turnos a pular');
});

test('CR 614.10 · validador', () => {
  const v = sc => J(SC.validateScript({ name: 'X', ...sc, example: { target: 'none', expect: { selfLife: 0 } } }));
  eq(v({ effects: [{ do: 'pula', o: 'compra', target: 'player' }] }), []);
  assert.ok(v({ effects: [{ do: 'pula', o: 'limpeza', target: 'player' }] }).some(e => /pula/.test(e)));
  assert.ok(v({ effects: [{ do: 'pula', o: 'compra', quando: 'neste-turno', target: 'player' }] }).some(e => /pula/.test(e)));
  assert.ok(v({ effects: [{ do: 'gain', amount: 1, ate: 'fim-do-combate' }] }).some(e => /fim do combate/.test(e)), 'T-102 · "até o fim do combate" só no contínuo');
});
