// Camada 1 · regras de mana (M7), combate (M6) e companheiro (M14).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
import { COMBAT_CARDS, combatSetup } from './fixtures.mjs';
const { engine: E } = loadModules();
const J = x => JSON.parse(JSON.stringify(x));

/* ---- montagem de cenários: edita o estado (JSON) antes da primeira ação ---- */
function start(seed = 1, opts) {
  let s = E.createGame(combatSetup(seed, opts));
  for (let p = 0; p < 2; p++) s = E.apply(s, { t: 'keep', p, bottom: [] }).state;
  return s;
}
function put(s, p, name, { zone = 'battlefield', sick = false, tapped = false } = {}) {
  s = J(s);
  const src = ['library', 'hand', 'graveyard'].map(z => s.zones[p][z]).find(z => z.some(o => s.objects[o].name === name));
  const oid = src.find(o => s.objects[o].name === name);
  src.splice(src.indexOf(oid), 1);
  s.zones[p][zone].push(oid);
  Object.assign(s.objects[oid], { zone, sick, tapped });
  return [s, oid];
}
const act = (s, a) => E.apply(s, a).state;
const passTo = (s, step, max = 60) => { for (let i = 0; i < max && s.turn.step !== step; i++) s = act(s, { t: 'pass', p: s.turn.priority }); assert.equal(s.turn.step, step); return s; };
const toMain = s => passTo(s, 'main1');

/* ---------------- M7 · mana ---------------- */
test('M7 · custo: genérico, colorido, híbrido, phyrexiano e X', () => {
  assert.deepEqual(J(E.parseCost('{2}{U}{U}')), { generic: 2, colored: { U: 2 }, hybrid: [], x: 0 });
  assert.deepEqual(J(E.parseCost('{R/U}{2/W}{G/P}{X}')), { generic: 0, colored: {}, hybrid: [['R', 'U'], [2, 'W'], ['G', 'P']], x: 1 });
});

test('M7 · produção: terreno básico, "ou", qualquer cor, {C}{C} e texto sem mana', () => {
  assert.deepEqual(J(E.parseProduction(COMBAT_CARDS['Island'])), [['U']]);
  assert.deepEqual(J(E.parseProduction(COMBAT_CARDS['Izzet Guildgate'])), [['U'], ['R']]);
  assert.deepEqual(J(E.parseProduction(COMBAT_CARDS['Sol Ring'])), [['C', 'C']]);
  assert.deepEqual(J(E.parseProduction({ type_line: 'Land', oracle_text: '{T}: Add one mana of any color.' })).length, 5);
  assert.deepEqual(J(E.parseProduction(COMBAT_CARDS['Sky Pike'])), []);
});

test('M7 · conjurar toca terrenos sozinho; sem mana suficiente é recusado', () => {
  let s = toMain(start(3));
  const a = s.turn.active;
  let pike, isl, mtn;
  [s, pike] = put(s, a, 'Sky Pike', { zone: 'hand' });
  assert.throws(() => act(s, { t: 'cast', p: a, oid: pike }), /mana insuficiente/);
  assert.ok(!E.legalActions(s, a).some(x => x.t === 'cast' && x.oid === pike), 'não oferece o que não dá para pagar');
  [s, isl] = put(s, a, 'Island'); [s, mtn] = put(s, a, 'Mountain');
  s = act(s, { t: 'cast', p: a, oid: pike });
  assert.equal(s.objects[isl].tapped, true); assert.equal(s.objects[mtn].tapped, true);
  assert.equal(s.objects[pike].zone, 'stack');
});

test('M7 · híbrido paga com qualquer das cores; fonte com duas cores escolhe a que falta', () => {
  let s = toMain(start(4));
  const a = s.turn.active;
  let duel, gate, mtn;
  [s, duel] = put(s, a, 'Duelist', { zone: 'hand' });
  [s, gate] = put(s, a, 'Izzet Guildgate'); [s, mtn] = put(s, a, 'Mountain');
  s = act(s, { t: 'cast', p: a, oid: duel });
  assert.equal(s.objects[duel].zone, 'stack');
});

test('M7 · reserva de mana esvazia ao trocar de passo; tocar fonte gera mana', () => {
  let s = toMain(start(5));
  const a = s.turn.active;
  let stone; [s, stone] = put(s, a, 'Mind Stone');
  s = act(s, { t: 'tap_mana', p: a, oid: stone, option: 0 });
  assert.equal(s.players[a].pool.C, 1);
  s = act(s, { t: 'pass', p: a }); s = act(s, { t: 'pass', p: 1 - a });
  assert.equal(s.turn.step, 'combat_begin');
  assert.equal(s.players[a].pool.C, 0);
});

test('M7 · imposto do comandante é cobrado; mesa assistida pode conjurar sem pagar; motor completo não', () => {
  let s = E.createGame({ ...combatSetup(6, { format: 'commander' }), players: [
    { name: 'A', deck: [{ name: 'Test Commander', qty: 1, zone: 'commander' }, { name: 'Island', qty: 50, zone: 'main' }, { name: 'Mountain', qty: 49, zone: 'main' }] },
    { name: 'B', deck: [{ name: 'Island', qty: 99, zone: 'main' }] }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = toMain(s);
  const a = s.turn.active;
  if (a !== 0) return; // o cenário depende de A começar; a semente 6 garante (checado abaixo)
  const cmd = s.zones[0].command[0];
  let i1, m1; [s, i1] = put(s, 0, 'Island'); [s, m1] = put(s, 0, 'Mountain');
  s = act(s, { t: 'cast', p: 0, oid: cmd });
  s = act(s, { t: 'move', p: 0, oid: cmd, to: 'command' });
  assert.equal(E.commanderTax(s, 0, cmd), 2);
  assert.throws(() => act(s, { t: 'cast', p: 0, oid: cmd }), /mana insuficiente/, 'agora custa {U}{R} + {2}');
  assert.equal(act(s, { t: 'cast', p: 0, oid: cmd, free: true }).objects[cmd].zone, 'stack', 'adjudicação: conjurar sem pagar');
  const full = J(s); full.mode = 'full';
  assert.throws(() => act(full, { t: 'cast', p: 0, oid: cmd, free: true }), /mesa assistida/);
});
test('M7 · a semente do cenário de comandante dá o primeiro turno a A', () => {
  let s = E.createGame({ ...combatSetup(6, { format: 'commander' }), players: [{ name: 'A', deck: [{ name: 'Island', qty: 60, zone: 'main' }] }, { name: 'B', deck: [{ name: 'Island', qty: 60, zone: 'main' }] }] });
  assert.equal(s.turn.active, 0);
});

/* ---------------- M6 · combate ---------------- */
function toAttack(seed, setupFn) {
  let s = toMain(start(seed, { manaCheck: false }));
  const a = s.turn.active, d = 1 - a;
  const ids = {};
  s = setupFn((name, p, o) => { let oid; [s, oid] = put(s, p === 'a' ? a : d, name, o); ids[name + (p === 'd' ? '@d' : '')] = oid; }) || s;
  s = passTo(s, 'combat_attackers');
  return { s, a, d, ids };
}

test('M6 · quem pode atacar: enjoo não, ímpeto sim, defensor não, virada não; vigilância não vira', () => {
  const { s, a, ids } = toAttack(7, put => {
    put('Sky Pike', 'a', { sick: true }); put('Raging Hound', 'a', { sick: true }); put('Wall Guard', 'a');
    put('Twin Blade', 'a', { tapped: true }); put('Leech Knight', 'a');
  });
  assert.equal(s.pending.kind, 'attackers');
  assert.deepEqual([...E.eligibleAttackers(s, a)].sort(), [ids['Raging Hound'], ids['Leech Knight']].sort());
  const n = act(s, { t: 'attack', p: a, attackers: [ids['Leech Knight'], ids['Raging Hound']] });
  assert.equal(n.objects[ids['Leech Knight']].tapped, false, 'vigilância');
  assert.equal(n.objects[ids['Raging Hound']].tapped, true);
  assert.throws(() => act(s, { t: 'attack', p: a, attackers: [ids['Sky Pike']] }), /atacante inválido/);
});

test('M6 · sem atacantes pula bloqueio e dano; sem bloqueio o dano vai no jogador, com vínculo com a vida', () => {
  let { s, a, d, ids } = toAttack(8, put => { put('Leech Knight', 'a'); });
  let n = act(s, { t: 'attack', p: a, attackers: [] });
  n = act(n, { t: 'pass', p: a }); n = act(n, { t: 'pass', p: d });
  assert.equal(n.turn.step, 'combat_end');
  s = act(s, { t: 'attack', p: a, attackers: [ids['Leech Knight']] });
  s = passTo(s, 'combat_damage');
  assert.equal(s.players[d].life, 18); assert.equal(s.players[a].life, 22);
  s = passTo(s, 'main2');
  assert.equal(s.objects[ids['Leech Knight']].attacking, undefined, 'fim do combate limpa o estado');
});

test('M6 · voar só é bloqueado por voar ou alcance; ameaça exige dois bloqueadores', () => {
  let { s, a, d, ids } = toAttack(9, put => { put('Sky Pike', 'a'); put('Brute', 'a'); put('Venom Eel', 'd'); put('Wall Guard', 'd'); put('Duelist', 'd'); });
  s = act(s, { t: 'attack', p: a, attackers: [ids['Sky Pike'], ids['Brute']] });
  s = passTo(s, 'combat_blockers');
  assert.equal(s.pending.kind, 'blockers'); assert.equal(s.pending.p, d);
  assert.throws(() => act(s, { t: 'block', p: d, blocks: [[ids['Venom Eel@d'], ids['Sky Pike']]] }), /voar/);
  assert.throws(() => act(s, { t: 'block', p: d, blocks: [[ids['Venom Eel@d'], ids['Brute']]] }), /ameaça/);
  const ok = act(s, { t: 'block', p: d, blocks: [[ids['Wall Guard@d'], ids['Sky Pike']], [ids['Venom Eel@d'], ids['Brute']], [ids['Duelist@d'], ids['Brute']]] });
  assert.equal(ok.objects[ids['Brute']].blockedBy.length, 2);
});

test('M6 · iniciativa mata antes; toque mortífero mata; indestrutível sobrevive; atropelar passa o excesso', () => {
  let { s, a, d, ids } = toAttack(10, put => { put('Twin Blade', 'a'); put('Raging Hound', 'a'); put('Brute', 'a'); put('Sky Pike', 'd'); put('Venom Eel', 'd'); put('Wall Guard', 'd'); });
  s = act(s, { t: 'attack', p: a, attackers: [ids['Twin Blade'], ids['Raging Hound'], ids['Brute']] });
  s = passTo(s, 'combat_blockers');
  s = act(s, { t: 'block', p: d, blocks: [[ids['Sky Pike@d'], ids['Twin Blade']], [ids['Venom Eel@d'], ids['Brute']], [ids['Wall Guard@d'], ids['Brute']]] });
  const life = s.players[d].life;
  s = passTo(s, 'combat_damage');
  assert.equal(s.objects[ids['Sky Pike@d']].zone, 'graveyard', 'golpe duplo: 1 de iniciativa + 1 normal mata a 2/1');
  assert.equal(s.objects[ids['Twin Blade']].zone, 'battlefield', 'Sky Pike morreu antes de causar dano');
  assert.equal(s.objects[ids['Brute']].zone, 'battlefield', 'indestrutível ignora toque mortífero e dano');
  assert.equal(s.objects[ids['Venom Eel@d']].zone, 'graveyard');
  assert.equal(s.players[d].life, life - 3, 'Raging Hound sem bloqueio: 3; golpe duplo bloqueado não atropela');
});

test('M6 · atropelar com bloqueio e dano de comandante', () => {
  let { s, a, d, ids } = toAttack(11, put => { put('Raging Hound', 'a'); put('Venom Eel', 'd'); });
  s = act(s, { t: 'attack', p: a, attackers: [ids['Raging Hound']] });
  s = passTo(s, 'combat_blockers');
  s = act(s, { t: 'block', p: d, blocks: [[ids['Venom Eel@d'], ids['Raging Hound']]] });
  s = J(s); s.objects[ids['Raging Hound']].commander = true; // trata o atacante como comandante
  const life = s.players[d].life;
  s = passTo(s, 'combat_damage');
  assert.equal(s.players[d].life, life - 2, '3 de poder, 1 letal no bloqueador, 2 atropelam');
  assert.equal(s.players[d].commanderDamage[ids['Raging Hound']], 2, 'dano de comandante contado');
  assert.equal(s.objects[ids['Raging Hound']].zone, 'graveyard', 'toque mortífero do bloqueador');
});

test('A6 · prévia de dano não muda o estado', () => {
  let { s, a, d, ids } = toAttack(12, put => { put('Leech Knight', 'a'); put('Venom Eel', 'd'); });
  s = act(s, { t: 'attack', p: a, attackers: [ids['Leech Knight']] });
  s = passTo(s, 'combat_blockers');
  const h = E.hashState(s);
  const none = E.previewCombat(s, []);
  assert.equal(none.life[d], -2); assert.equal(none.life[a], 2);
  const blk = E.previewCombat(s, [[ids['Venom Eel@d'], ids['Leech Knight']]]);
  assert.deepEqual([...blk.died].sort(), ['Leech Knight', 'Venom Eel']);
  assert.equal(E.hashState(s), h);
});

/* ---------------- M14 · companheiro ---------------- */
test('M14 · companheiro começa fora do jogo, revelado, fora do grimório', () => {
  const s = start(13);
  for (let p = 0; p < 2; p++) {
    assert.equal(s.zones[p].companion.length, 1);
    assert.ok(![...s.zones[p].library, ...s.zones[p].hand].some(o => s.objects[o].name === 'Pal of Tests'));
  }
});

test('M14 · ação especial: só no tempo de feitiço, custa {3}, uma vez por partida, não usa a pilha', () => {
  let s = start(14);
  const a = s.turn.active;
  const pal = s.zones[a].companion[0];
  assert.throws(() => act(s, { t: 'companion', p: a, oid: pal }), /feitiço/, 'na manutenção não');
  s = toMain(s);
  assert.throws(() => act(s, { t: 'companion', p: a, oid: pal }), /mana insuficiente/);
  let x; for (const n of ['Island', 'Mountain', 'Island']) [s, x] = put(s, a, n);
  assert.ok(E.legalActions(s, a).some(z => z.t === 'companion'));
  s = act(s, { t: 'companion', p: a, oid: pal });
  assert.equal(s.objects[pal].zone, 'hand'); assert.equal(s.stack.length, 0);
  assert.equal(s.players[a].companionUsed, true);
  assert.ok(!E.legalActions(s, a).some(z => z.t === 'companion'));
  assert.throws(() => act(s, { t: 'move', p: a, oid: pal, to: 'companion' }), /fora do jogo/);
});
