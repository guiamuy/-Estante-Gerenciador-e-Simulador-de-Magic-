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

/* ---------------- M9 · habilidades ativadas e disparadas · M10 · ordem dos gatilhos ---------------- */
const { scripts: SCR } = loadModules();
const ABILITY_CARDS = {
  'Island': COMBAT_CARDS['Island'], 'Mountain': COMBAT_CARDS['Mountain'],
  'Pinger': { name: 'Pinger', type_line: 'Creature — Human Wizard', mana_cost: '{1}{U}', power: '1', toughness: '1', keywords: [], oracle_text: '{T}: deals 1 damage to any target.' },
  'Greeter': { name: 'Greeter', type_line: 'Creature — Elf', mana_cost: '{1}{U}', power: '1', toughness: '1', keywords: [], oracle_text: 'When Greeter enters, draw a card.' },
  'Martyr': { name: 'Martyr', type_line: 'Creature — Human', mana_cost: '{U}', power: '1', toughness: '1', keywords: [], oracle_text: 'When Martyr dies, you gain 2 life.' },
  'Beacon': { name: 'Beacon', type_line: 'Enchantment', mana_cost: '{1}', keywords: [], oracle_text: 'At the beginning of your upkeep, draw a card.' },
  'Charger': { name: 'Charger', type_line: 'Creature — Beast', mana_cost: '{2}', power: '2', toughness: '2', keywords: [], oracle_text: 'Whenever Charger attacks, it gets +1/+0.' }
};
const ABILITY_SCRIPTS = {
  Pinger: { name: 'Pinger', abilities: [{ kind: 'activated', cost: { tap: true }, effects: [{ do: 'damage', amount: 1, target: 'any' }] }], example: { action: 'activate:0', target: 'opponent', expect: { opponentLife: -1 } } },
  Greeter: { name: 'Greeter', abilities: [{ kind: 'triggered', when: 'etb', effects: [{ do: 'draw', amount: 1 }] }], example: { action: 'etb', target: 'none', expect: { handDelta: 1 } } },
  Martyr: { name: 'Martyr', abilities: [{ kind: 'triggered', when: 'dies', effects: [{ do: 'gain', amount: 2 }] }], example: { action: 'etb', target: 'none', expect: { selfLife: 0 } } },
  Beacon: { name: 'Beacon', abilities: [{ kind: 'triggered', when: 'upkeep', effects: [{ do: 'draw', amount: 1 }] }], example: { action: 'etb', target: 'none', expect: { handDelta: 0 } } },
  Charger: { name: 'Charger', abilities: [{ kind: 'triggered', when: 'attacks', effects: [{ do: 'gain', amount: 1 }] }], example: { action: 'etb', target: 'none', expect: { selfLife: 0 } } }
};
const ADECK = [{ name: 'Island', qty: 20, zone: 'main' }, { name: 'Mountain', qty: 10, zone: 'main' },
  ...Object.keys(ABILITY_SCRIPTS).map(n => ({ name: n, qty: 4, zone: 'main' }))];
function agame(seed = 1, manaCheck = false) {
  let s = E.createGame({ format: 'livre', seed, mode: 'assisted', manaCheck, cards: ABILITY_CARDS, scripts: ABILITY_SCRIPTS,
    players: [{ name: 'A', deck: ADECK }, { name: 'B', deck: ADECK }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passTo(s, 'main1');
}
const resolveSpell = s => { const a0 = s.turn.priority; s = act(s, { t: 'pass', p: a0 }); return act(s, { t: 'pass', p: s.turn.priority }); };
const settle = s => { for (let i = 0; i < 6 && s.stack.length && !s.pending; i++) { s = act(s, { t: 'pass', p: s.turn.priority }); s = s.stack.length && !s.pending ? act(s, { t: 'pass', p: s.turn.priority }) : s; } return s; };

test('M9 · gatilho de entrada vai para a pilha e resolve; o oponente pode responder antes', () => {
  let s = agame(3); const a = s.turn.active, d = 1 - a;
  let greeter; [s, greeter] = put(s, a, 'Greeter', { zone: 'hand' });
  const hand = s.zones[a].hand.length;
  s = act(s, { t: 'cast', p: a, oid: greeter });
  s = act(s, { t: 'pass', p: a }); s = act(s, { t: 'pass', p: d });
  assert.equal(s.objects[greeter].zone, 'battlefield');
  assert.equal(s.stack.length, 1, 'o gatilho ficou na pilha, e dá para responder');
  assert.equal(s.turn.priority, a);
  s = act(s, { t: 'pass', p: a }); s = act(s, { t: 'pass', p: d });
  assert.equal(s.zones[a].hand.length, hand - 1 + 1, 'comprou pelo gatilho');
  assert.equal(s.stack.length, 0);
});

test('M9 · gatilhos de morte, de manutenção e de ataque', () => {
  let s = agame(4); const a = s.turn.active;
  let martyr; [s, martyr] = put(s, a, 'Martyr');
  const life = s.players[a].life;
  s = settle(act(s, { t: 'move', p: a, oid: martyr, to: 'graveyard' }));
  assert.equal(s.players[a].life, life + 2, 'morreu: ganhou 2');

  let beacon; [s, beacon] = put(s, a, 'Beacon');
  let t = s; for (let i = 0; i < 40 && !(t.turn.active === a && t.turn.step === 'upkeep'); i++) t = t.pending ? act(t, { t: 'discard', p: t.pending.p, oid: t.zones[t.pending.p].hand[0] }) : act(t, { t: 'pass', p: t.turn.priority });
  assert.equal(t.stack.length, 1, 'na manutenção, o gatilho do Beacon está na pilha');

  let s2 = agame(5); const a2 = s2.turn.active;
  let charger; [s2, charger] = put(s2, a2, 'Charger');
  s2 = passTo(s2, 'combat_attackers');
  const life2 = s2.players[a2].life;
  s2 = settle(act(s2, { t: 'attack', p: a2, attackers: [charger] }));
  assert.equal(s2.players[a2].life, life2 + 1, 'atacou: o gatilho resolveu');
});

test('M9 · habilidade ativada: custo de virar, mana e sacrifício; enjoo impede {T}', () => {
  let s = agame(6, true); const a = s.turn.active, d = 1 - a;
  let pinger; [s, pinger] = put(s, a, 'Pinger', { sick: true });
  assert.throws(() => act(s, { t: 'activate', p: a, oid: pinger, index: 0, targets: [{ player: d }] }), /enjoo/);
  s = JSON.parse(JSON.stringify(s)); s.objects[pinger].sick = false;
  assert.ok(E.legalActions(s, a).some(x => x.t === 'activate' && x.oid === pinger));
  s = act(s, { t: 'activate', p: a, oid: pinger, index: 0, targets: [{ player: d }] });
  assert.equal(s.objects[pinger].tapped, true);
  assert.equal(s.stack.length, 1, 'a habilidade usa a pilha');
  assert.throws(() => act(s, { t: 'activate', p: a, oid: pinger, index: 0, targets: [{ player: d }] }), /já está virada/);
  s = settle(s);
  assert.equal(s.players[d].life, 19);
  assert.equal(Object.values(s.objects).filter(o => o.ability).length, 0, 'a habilidade some depois de resolver');
});

test('M9 · habilidade com alvo que some é anulada na resolução', () => {
  let s = agame(7); const a = s.turn.active, d = 1 - a;
  let pinger, target;
  [s, pinger] = put(s, a, 'Pinger'); [s, target] = put(s, d, 'Charger'); // sem gatilho de morte, para a pilha ficar limpa
  s = act(s, { t: 'activate', p: a, oid: pinger, index: 0, targets: [{ oid: target }] });
  s = act(s, { t: 'move', p: a, oid: target, to: 'graveyard' }); // some antes de resolver
  const r = E.apply(E.apply(s, { t: 'pass', p: a }).state, { t: 'pass', p: d });
  assert.ok(r.events.some(e => e.kind === 'fizzled'), 'sem alvo, a habilidade é anulada');
});

test('M10 · dois gatilhos ao mesmo tempo: o controlador escolhe a ordem', () => {
  let s = agame(8); const a = s.turn.active;
  let b1, b2;
  [s, b1] = put(s, a, 'Beacon'); [s, b2] = put(s, a, 'Beacon');
  let t = s; for (let i = 0; i < 40 && !(t.turn.active === a && t.turn.step === 'upkeep'); i++) t = t.pending && t.pending.kind === 'discard' ? act(t, { t: 'discard', p: t.pending.p, oid: t.zones[t.pending.p].hand[0] }) : act(t, { t: 'pass', p: t.turn.priority });
  assert.deepEqual({ kind: t.pending.kind, p: t.pending.p }, { kind: 'triggers', p: a });
  assert.equal(E.legalActions(t, a).length, 2, 'uma opção por gatilho');
  assert.throws(() => act(t, { t: 'pass', p: a }), /ordem dos gatilhos/);
  t = act(t, { t: 'order_trigger', p: a, index: 0 });
  assert.equal(t.pending.kind, 'triggers', 'ainda falta um');
  t = act(t, { t: 'order_trigger', p: a, index: 0 });
  assert.equal(t.pending, null);
  assert.equal(t.stack.length, 2, 'os dois gatilhos na pilha, na ordem escolhida');
});

/* ---------------- S11 · auras e equipamentos ---------------- */
const AURA_CARDS = {
  'Island': COMBAT_CARDS['Island'], 'Forest': { name: 'Forest', type_line: 'Basic Land — Forest', mana_cost: '', keywords: [], oracle_text: '' },
  'Bogle': { name: 'Bogle', type_line: 'Creature — Beast', mana_cost: '{G}', power: '1', toughness: '1', keywords: ['Hexproof'], oracle_text: 'Hexproof' },
  'Ox': { name: 'Ox', type_line: 'Creature — Ox', mana_cost: '{1}{G}', power: '2', toughness: '2', keywords: [], oracle_text: '' },
  'Rancor': { name: 'Rancor', type_line: 'Enchantment — Aura', mana_cost: '{G}', keywords: [], oracle_text: 'Enchant creature' },
  'Ethereal Armor': { name: 'Ethereal Armor', type_line: 'Enchantment — Aura', mana_cost: '{W}', keywords: [], oracle_text: 'Enchant creature' },
  'Skullclamp': { name: 'Skullclamp', type_line: 'Artifact — Equipment', mana_cost: '{1}', keywords: [], oracle_text: 'Equip {1}' },
  'Murder': { name: 'Murder', type_line: 'Instant', mana_cost: '{1}{B}{B}', keywords: [], oracle_text: 'Destroy target creature.' }
};
const AURA_DECK = [{ name: 'Forest', qty: 20, zone: 'main' }, { name: 'Island', qty: 10, zone: 'main' },
  { name: 'Bogle', qty: 8, zone: 'main' }, { name: 'Ox', qty: 6, zone: 'main' }, { name: 'Rancor', qty: 6, zone: 'main' },
  { name: 'Ethereal Armor', qty: 6, zone: 'main' }, { name: 'Skullclamp', qty: 4, zone: 'main' }, { name: 'Murder', qty: 4, zone: 'main' }];
function auraGame(seed = 1) {
  let s = E.createGame({ format: 'livre', seed, mode: 'assisted', manaCheck: false, cards: AURA_CARDS,
    players: [{ name: 'A', deck: AURA_DECK }, { name: 'B', deck: AURA_DECK }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passTo(s, 'main1');
}
const st = (s, oid) => { const x = E.stats(s, s.objects[oid]); return [x.power, x.toughness]; };

test('S11 · aura entra anexada, dá bônus e palavra-chave, e soma com outra aura', () => {
  let s = auraGame(3); const a = s.turn.active;
  let bogle, rancor, armor;
  [s, bogle] = put(s, a, 'Bogle');
  [s, rancor] = put(s, a, 'Rancor', { zone: 'hand' });
  s = resolveSpell(act(s, { t: 'cast', p: a, oid: rancor, targets: [{ oid: bogle }] }));
  assert.equal(s.objects[rancor].attachedTo, bogle);
  assert.deepEqual(st(s, bogle), [3, 1], 'Rancor dá +2/+0');
  assert.equal(E.hasKeyword(s, s.objects[bogle], 'trample'), true);
  [s, armor] = put(s, a, 'Ethereal Armor', { zone: 'hand' });
  s = resolveSpell(act(s, { t: 'cast', p: a, oid: armor, targets: [{ oid: bogle }] }));
  assert.deepEqual(st(s, bogle), [5, 3], 'Ethereal Armor conta os dois encantamentos');
  assert.equal(E.hasKeyword(s, s.objects[bogle], 'first strike'), true);
});

test('S11 · a criatura encantada some: a aura vai para o cemitério e o equipamento só desanexa', () => {
  let s = auraGame(4); const a = s.turn.active;
  let ox, rancor, clamp, murder;
  [s, ox] = put(s, a, 'Ox');
  [s, rancor] = put(s, a, 'Rancor', { zone: 'hand' });
  s = resolveSpell(act(s, { t: 'cast', p: a, oid: rancor, targets: [{ oid: ox }] }));
  [s, clamp] = put(s, a, 'Skullclamp');
  s = resolveSpell(act(s, { t: 'activate', p: a, oid: clamp, index: 0, targets: [{ oid: ox }] }));
  assert.equal(s.objects[clamp].attachedTo, ox);
  assert.deepEqual(st(s, ox), [5, 1], 'Rancor +2/+0 e Skullclamp +1/−1 no 2/2');
  [s, murder] = put(s, a, 'Murder', { zone: 'hand' });
  s = resolveSpell(act(s, { t: 'cast', p: a, oid: murder, targets: [{ oid: ox }] }));
  assert.equal(s.objects[ox].zone, 'graveyard');
  assert.equal(s.objects[rancor].zone, 'graveyard', 'aura sem alvo morre junto');
  assert.equal(s.objects[clamp].zone, 'battlefield', 'equipamento fica');
  assert.equal(s.objects[clamp].attachedTo, undefined);
});

test('S11 · Skullclamp numa criatura 1/1 mata a criatura, como na carta real', () => {
  let s = auraGame(7); const a = s.turn.active;
  let bogle, clamp;
  [s, bogle] = put(s, a, 'Bogle'); [s, clamp] = put(s, a, 'Skullclamp');
  s = resolveSpell(act(s, { t: 'activate', p: a, oid: clamp, index: 0, targets: [{ oid: bogle }] }));
  assert.equal(s.objects[bogle].zone, 'graveyard', 'resistência zero');
  assert.equal(s.objects[clamp].attachedTo, undefined);
});

test('S11 · equipar só na sua fase principal e só nas suas criaturas', () => {
  let s = auraGame(5); const a = s.turn.active, d = 1 - a;
  let clamp, theirs;
  [s, clamp] = put(s, a, 'Skullclamp');
  [s, theirs] = put(s, d, 'Bogle');
  assert.throws(() => act(s, { t: 'activate', p: a, oid: clamp, index: 0, targets: [{ oid: theirs }] }), /alvo ilegal/);
  let mine; [s, mine] = put(s, a, 'Bogle');
  s = passTo(s, 'combat_begin');
  assert.throws(() => act(s, { t: 'activate', p: a, oid: clamp, index: 0, targets: [{ oid: mine }] }), /feitiço/);
});

test('S11 · aura cujo alvo some antes de resolver é anulada e vai para o cemitério', () => {
  let s = auraGame(6); const a = s.turn.active;
  let bogle, rancor, murder;
  [s, bogle] = put(s, a, 'Bogle');
  [s, rancor] = put(s, a, 'Rancor', { zone: 'hand' });
  [s, murder] = put(s, a, 'Murder', { zone: 'hand' });
  s = act(s, { t: 'cast', p: a, oid: rancor, targets: [{ oid: bogle }] });
  s = resolveSpell(act(s, { t: 'cast', p: a, oid: murder, targets: [{ oid: bogle }] }));
  const r = E.apply(E.apply(s, { t: 'pass', p: a }).state, { t: 'pass', p: 1 - a });
  assert.ok(r.events.some(e => e.kind === 'fizzled'));
  assert.equal(r.state.objects[rancor].zone, 'graveyard');
});

/* ---------------- M12 · fichas ---------------- */
const TOKEN_CARDS = {
  'Island': COMBAT_CARDS['Island'],
  'Fodder': { name: 'Fodder', type_line: 'Sorcery', mana_cost: '{1}{R}', keywords: [], oracle_text: 'Create two 1/1 red Goblin tokens.' },
  'Clue Maker': { name: 'Clue Maker', type_line: 'Creature — Human', mana_cost: '{W}', power: '1', toughness: '2', keywords: [], oracle_text: 'When Clue Maker enters, investigate.' },
  'Murder': { name: 'Murder', type_line: 'Instant', mana_cost: '{1}{B}{B}', keywords: [], oracle_text: 'Destroy target creature.' }
};
const CLUE = { name: 'Clue', types: ['artifact'], abilities: [{ kind: 'activated', cost: { mana: '{2}', sacrifice: true }, effects: [{ do: 'draw', amount: 1 }] }] };
const TOKEN_SCRIPTS = {
  Fodder: { name: 'Fodder', effects: [{ do: 'token', amount: 2, token: { name: 'Goblin', types: ['creature'], power: 1, toughness: 1 } }], example: { target: 'none', expect: { tokens: 2 } } },
  'Clue Maker': { name: 'Clue Maker', abilities: [{ kind: 'triggered', when: 'etb', effects: [{ do: 'token', amount: 1, token: CLUE }] }], example: { action: 'etb', target: 'none', expect: { tokens: 1 } } }
};
const TDECK = [{ name: 'Island', qty: 30, zone: 'main' }, { name: 'Fodder', qty: 8, zone: 'main' },
  { name: 'Clue Maker', qty: 8, zone: 'main' }, { name: 'Murder', qty: 4, zone: 'main' }];
function tokenGame(seed = 1) {
  let s = E.createGame({ format: 'livre', seed, mode: 'assisted', manaCheck: false, cards: TOKEN_CARDS, scripts: TOKEN_SCRIPTS,
    players: [{ name: 'A', deck: TDECK }, { name: 'B', deck: TDECK }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passTo(s, 'main1');
}
const tokens = (s, p) => Object.values(s.objects).filter(o => o.token && o.controller === p);

test('M12 · a mágica cria as fichas, que entram como criaturas com enjoo', () => {
  let s = tokenGame(3); const a = s.turn.active;
  let fodder; [s, fodder] = put(s, a, 'Fodder', { zone: 'hand' });
  const total = Object.values(s.objects).filter(o => !o.ability && !o.token).length;
  s = resolveSpell(act(s, { t: 'cast', p: a, oid: fodder }));
  const tk = tokens(s, a);
  assert.equal(tk.length, 2);
  assert.deepEqual(tk.map(o => [o.name, o.sick]), [['Goblin', true], ['Goblin', true]]);
  assert.equal(E.invariants(s, total).join('; '), '', 'fichas não entram na contagem de cartas');
});

test('M12 · ficha que sai do campo deixa de existir', () => {
  let s = tokenGame(4); const a = s.turn.active;
  let fodder, murder;
  [s, fodder] = put(s, a, 'Fodder', { zone: 'hand' });
  s = resolveSpell(act(s, { t: 'cast', p: a, oid: fodder }));
  const goblin = tokens(s, a)[0].oid;
  [s, murder] = put(s, a, 'Murder', { zone: 'hand' });
  s = resolveSpell(act(s, { t: 'cast', p: a, oid: murder, targets: [{ oid: goblin }] }));
  assert.equal(s.objects[goblin], undefined, 'a ficha some em vez de ficar no cemitério');
  assert.equal(s.zones[a].graveyard.filter(x => x === goblin).length, 0);
  assert.equal(tokens(s, a).length, 1);
});

test('M12 · ficha com habilidade: a pista compra ao ser sacrificada', () => {
  let s = tokenGame(5); const a = s.turn.active;
  let maker; [s, maker] = put(s, a, 'Clue Maker', { zone: 'hand' });
  s = resolveSpell(act(s, { t: 'cast', p: a, oid: maker }));
  s = resolveSpell(s); // gatilho de entrada cria a pista
  const clue = tokens(s, a)[0];
  assert.equal(clue.name, 'Clue');
  const hand = s.zones[a].hand.length;
  s = resolveSpell(act(s, { t: 'activate', p: a, oid: clue.oid, index: 0 }));
  assert.equal(s.zones[a].hand.length, hand + 1);
  assert.equal(tokens(s, a).length, 0, 'sacrificada, a pista some');
});

/* ---------------- S12 · escolhas do jogador ---------------- */
const MODE_CARDS = {
  'Island': COMBAT_CARDS['Island'],
  'Redshell': { name: 'Redshell', type_line: 'Creature — Beast', mana_cost: '{R}', power: '2', toughness: '2', colors: ['R'], keywords: [], oracle_text: '' },
  'Blueshell': { name: 'Blueshell', type_line: 'Creature — Beast', mana_cost: '{U}', power: '2', toughness: '2', colors: ['U'], keywords: [], oracle_text: '' },
  'Blast': { name: 'Blast', type_line: 'Instant', mana_cost: '{R}', colors: ['R'], keywords: [], oracle_text: 'Choose one —' },
  'Looting': { name: 'Looting', type_line: 'Sorcery', mana_cost: '{R}', colors: ['R'], keywords: [], oracle_text: 'Draw two cards, then discard two cards.' }
};
const MODE_SCRIPTS = {
  Blast: { name: 'Blast', modes: [
    { label: 'Anular mágica azul', effects: [{ do: 'counter', target: 'spell', targetColor: 'U' }] },
    { label: 'Destruir permanente azul', effects: [{ do: 'destroy', target: 'permanent', targetColor: 'U' }] }],
    example: { action: 'mode:1', target: 'enemy-creature', expect: { gone: true } } },
  Looting: { name: 'Looting', effects: [{ do: 'draw', amount: 2 }, { do: 'discard', amount: 2 }], example: { target: 'none', expect: { discarded: 2 } } }
};
const MDECK = [{ name: 'Island', qty: 20, zone: 'main' }, { name: 'Redshell', qty: 8, zone: 'main' },
  { name: 'Blueshell', qty: 8, zone: 'main' }, { name: 'Blast', qty: 8, zone: 'main' }, { name: 'Looting', qty: 8, zone: 'main' }];
function modeGame(seed = 1) {
  let s = E.createGame({ format: 'livre', seed, mode: 'assisted', manaCheck: false, cards: MODE_CARDS, scripts: MODE_SCRIPTS,
    players: [{ name: 'A', deck: MDECK }, { name: 'B', deck: MDECK }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passTo(s, 'main1');
}

test('S12 · modal: a mesa oferece um modo por vez e o alvo respeita a cor do modo', () => {
  let s = modeGame(3); const a = s.turn.active, d = 1 - a;
  let blast, red, blue;
  [s, red] = put(s, d, 'Redshell'); [s, blue] = put(s, d, 'Blueshell');
  [s, blast] = put(s, a, 'Blast', { zone: 'hand' });
  const opts = E.legalActions(s, a).filter(x => x.t === 'cast' && x.oid === blast);
  assert.ok(opts.every(x => x.mode !== 1 || x.targets[0].oid === blue), 'modo de destruir só mira permanente azul');
  assert.throws(() => act(s, { t: 'cast', p: a, oid: blast, mode: 1, targets: [{ oid: red }] }), /alvo ilegal/);
  assert.throws(() => act(s, { t: 'cast', p: a, oid: blast, targets: [{ oid: blue }] }), /escolha um modo/);
  s = resolveSpell(act(s, { t: 'cast', p: a, oid: blast, mode: 1, targets: [{ oid: blue }] }));
  assert.equal(s.objects[blue].zone, 'graveyard');
  assert.equal(s.objects[red].zone, 'battlefield');
});

test('S12 · descartar é escolha do jogador: a mesa fica pendente até ele escolher', () => {
  let s = modeGame(4); const a = s.turn.active;
  let looting; [s, looting] = put(s, a, 'Looting', { zone: 'hand' });
  const hand = s.zones[a].hand.length;
  s = resolveSpell(act(s, { t: 'cast', p: a, oid: looting }));
  assert.deepEqual({ kind: s.pending.kind, n: s.pending.n, p: s.pending.p }, { kind: 'discard', n: 2, p: a });
  assert.throws(() => act(s, { t: 'pass', p: a }), /descarte/);
  s = act(s, { t: 'discard', p: a, oid: s.zones[a].hand[0] });
  assert.equal(s.pending.n, 1);
  s = act(s, { t: 'discard', p: a, oid: s.zones[a].hand[0] });
  assert.equal(s.pending, null, 'descarte de efeito não mexe na limpeza do turno');
  assert.equal(s.turn.step, 'main1');
  assert.equal(s.zones[a].hand.length, hand - 1 + 2 - 2);
  assert.equal(s.zones[a].graveyard.length >= 3, true);
});

/* ---------------- S13/S14 · zonas ocultas ---------------- */
const HID_CARDS = {
  'Island': COMBAT_CARDS['Island'],
  'Bear': { name: 'Bear', type_line: 'Creature — Bear', mana_cost: '{1}{G}', power: '2', toughness: '2', keywords: [], oracle_text: '' },
  'Scryer': { name: 'Scryer', type_line: 'Sorcery', mana_cost: '{U}', keywords: [], oracle_text: 'Scry 2, then draw a card.' },
  'Tutor': { name: 'Tutor', type_line: 'Instant', mana_cost: '{U}', keywords: [], oracle_text: 'Search your library for a creature card.' },
  'Digger': { name: 'Digger', type_line: 'Sorcery', mana_cost: '{1}{G}', keywords: [], oracle_text: 'Reveal the top four cards.' }
};
const HID_SCRIPTS = {
  Scryer: { name: 'Scryer', effects: [{ do: 'scry', amount: 2 }, { do: 'draw', amount: 1 }], example: { target: 'none', expect: { picked: true } } },
  Tutor: { name: 'Tutor', effects: [{ do: 'search', amount: 1, filter: { types: ['creature'] }, to: 'hand' }], example: { target: 'none', expect: { picked: true } } },
  Digger: { name: 'Digger', effects: [{ do: 'look', count: 4, amount: 4, filter: { types: ['creature'] }, to: 'hand', rest: 'graveyard' }], example: { target: 'none', expect: { picked: true } } }
};
const HDECK = [{ name: 'Island', qty: 24, zone: 'main' }, { name: 'Bear', qty: 12, zone: 'main' },
  { name: 'Scryer', qty: 8, zone: 'main' }, { name: 'Tutor', qty: 8, zone: 'main' }, { name: 'Digger', qty: 8, zone: 'main' }];
function hidGame(seed = 1) {
  let s = E.createGame({ format: 'livre', seed, mode: 'assisted', manaCheck: false, cards: HID_CARDS, scripts: HID_SCRIPTS,
    players: [{ name: 'A', deck: HDECK }, { name: 'B', deck: HDECK }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passTo(s, 'main1');
}

test('S14 · scry: o que você escolhe fica no topo, o resto vai para o fundo, e a compra espera a escolha', () => {
  let s = hidGame(3); const a = s.turn.active;
  let scryer; [s, scryer] = put(s, a, 'Scryer', { zone: 'hand' });
  const [t1, t2] = s.zones[a].library.slice(0, 2);
  const hand = s.zones[a].hand.length;
  s = resolveSpell(act(s, { t: 'cast', p: a, oid: scryer }));
  assert.equal(s.pending.kind, 'pick');
  assert.deepEqual([...s.pending.from], [t1, t2]);
  assert.equal(s.zones[a].hand.length, hand - 1, 'ainda não comprou: a compra vem depois do scry');
  s = act(s, { t: 'pick', p: a, oid: t2 });     // fica no topo
  s = act(s, { t: 'pick_done', p: a });
  assert.equal(s.pending, null);
  assert.equal(s.zones[a].library.at(-1), t1, 'o não escolhido foi para o fundo');
  assert.equal(s.zones[a].hand.includes(t2), true, 'comprou a carta que ficou no topo');
});

test('S13 · vasculhar: só cartas do filtro, e o grimório é embaralhado', () => {
  let s = hidGame(4); const a = s.turn.active;
  let tutor; [s, tutor] = put(s, a, 'Tutor', { zone: 'hand' });
  const before = JSON.stringify(s.zones[a].library);
  s = resolveSpell(act(s, { t: 'cast', p: a, oid: tutor }));
  assert.equal(s.pending.kind, 'pick');
  assert.ok(s.pending.from.every(oid => s.objects[oid].name === 'Bear'), 'só criaturas entram na escolha');
  const chosen = s.pending.from[0];
  const land = s.zones[a].library.find(o => s.objects[o].name === 'Island');
  assert.throws(() => act(s, { t: 'pick', p: a, oid: land }), /carta inválida|não serve/, 'terreno não está na escolha');
  s = act(s, { t: 'pick', p: a, oid: chosen });
  assert.equal(s.pending, null, 'escolheu o máximo: termina sozinho');
  assert.equal(s.zones[a].hand.includes(chosen), true);
  assert.notEqual(JSON.stringify(s.zones[a].library), before, 'embaralhou');
});

test('S13 · olhar o topo: leva as que servem e o resto vai para onde a carta mandar', () => {
  let s = hidGame(5); const a = s.turn.active;
  let digger; [s, digger] = put(s, a, 'Digger', { zone: 'hand' });
  const top4 = s.zones[a].library.slice(0, 4);
  s = resolveSpell(act(s, { t: 'cast', p: a, oid: digger }));
  const creatures = top4.filter(o => s.objects[o].name === 'Bear');
  for (const oid of creatures) s = act(s, { t: 'pick', p: a, oid });
  if (s.pending) s = act(s, { t: 'pick_done', p: a });
  creatures.forEach(oid => assert.equal(s.objects[oid].zone, 'hand'));
  top4.filter(o => !creatures.includes(o)).forEach(oid => assert.equal(s.objects[oid].zone, 'graveyard'));
});

test('S13 · moer manda o topo do alvo para o cemitério, sem escolha', () => {
  let s = hidGame(6); const a = s.turn.active, d = 1 - a;
  s = JSON.parse(JSON.stringify(s));
  s.facts['Mill Spell'] = E.cardFacts({ name: 'Mill Spell', type_line: 'Sorcery' });
  s.facts['Mill Spell'].script = { name: 'Mill Spell', effects: [{ do: 'mill', amount: 3, target: 'opponent' }], abilities: [] };
  const oid = s.zones[a].hand[0];
  s.objects[oid].name = 'Mill Spell';
  const top = s.zones[d].library.slice(0, 3);
  s = resolveSpell(act(s, { t: 'cast', p: a, oid, targets: [{ player: d }] }));
  top.forEach(x => assert.equal(s.objects[x].zone, 'graveyard', s.objects[x].name));
  assert.equal(s.zones[d].graveyard.length, 3);
});

/* ---------------- S15 · gatilhos de outras permanentes e com alvo ---------------- */
const DRAIN_CARDS = {
  'Island': COMBAT_CARDS['Island'],
  'Drainer': { name: 'Drainer', type_line: 'Creature — Human Rogue', mana_cost: '{1}{B}', power: '1', toughness: '1', keywords: [], oracle_text: 'Whenever another creature you control dies…' },
  'Chump': { name: 'Chump', type_line: 'Creature — Goblin', mana_cost: '{R}', power: '1', toughness: '1', keywords: [], oracle_text: '' },
  'Recycler': { name: 'Recycler', type_line: 'Creature — Kor Soldier', mana_cost: '{1}{W}', power: '2', toughness: '3', keywords: [], oracle_text: 'When Recycler enters, return a permanent you control to hand.' },
  'Murder': { name: 'Murder', type_line: 'Instant', mana_cost: '{1}{B}{B}', keywords: [], oracle_text: 'Destroy target creature.' }
};
const DRAIN_SCRIPTS = {
  Drainer: { name: 'Drainer', abilities: [{ kind: 'triggered', when: 'other-dies', filter: { types: ['creature'] },
    effects: [{ do: 'lose', amount: 1, target: 'each-opponent' }, { do: 'gain', amount: 1 }] }], example: { action: 'etb', target: 'none', expect: { selfLife: 0 } } },
  Recycler: { name: 'Recycler', abilities: [{ kind: 'triggered', when: 'etb', effects: [{ do: 'bounce', target: 'permanent-you-control' }] }],
    example: { action: 'etb', target: 'none', expect: { bounced: true } } }
};
const DDECK = [{ name: 'Island', qty: 24, zone: 'main' }, { name: 'Drainer', qty: 8, zone: 'main' },
  { name: 'Chump', qty: 8, zone: 'main' }, { name: 'Recycler', qty: 8, zone: 'main' }, { name: 'Murder', qty: 8, zone: 'main' }];
function drainGame(seed = 1) {
  let s = E.createGame({ format: 'livre', seed, mode: 'assisted', manaCheck: false, cards: DRAIN_CARDS, scripts: DRAIN_SCRIPTS,
    players: [{ name: 'A', deck: DDECK }, { name: 'B', deck: DDECK }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passTo(s, 'main1');
}

test('S15 · gatilho de outra criatura sua que morre: dreno para cada oponente', () => {
  let s = drainGame(3); const a = s.turn.active, d = 1 - a;
  let drainer, chump, theirs, murder;
  [s, drainer] = put(s, a, 'Drainer'); [s, chump] = put(s, a, 'Chump'); [s, theirs] = put(s, d, 'Chump');
  const life = [s.players[0].life, s.players[1].life];
  [s, murder] = put(s, a, 'Murder', { zone: 'hand' });
  s = resolveSpell(act(s, { t: 'cast', p: a, oid: chump ? murder : murder, targets: [{ oid: chump }] }));
  s = resolveSpell(s); // o gatilho do Drainer
  assert.equal(s.players[a].life, life[a] + 1);
  assert.equal(s.players[d].life, life[d] - 1);

  // a criatura do oponente morrendo não dispara o seu Drainer
  let murder2; [s, murder2] = put(s, a, 'Murder', { zone: 'hand' });
  const before = [s.players[0].life, s.players[1].life];
  s = resolveSpell(act(s, { t: 'cast', p: a, oid: murder2, targets: [{ oid: theirs }] }));
  assert.deepEqual([s.players[0].life, s.players[1].life], before);
  assert.equal(s.stack.length, 0);
});

test('S15 · gatilho com alvo: a mesa pergunta qual, e sem alvo legal o gatilho some', () => {
  let s = drainGame(4); const a = s.turn.active;
  let recycler, chump;
  [s, chump] = put(s, a, 'Chump');
  [s, recycler] = put(s, a, 'Recycler', { zone: 'hand' });
  s = resolveSpell(act(s, { t: 'cast', p: a, oid: recycler }));
  assert.equal(s.pending.kind, 'pick_target');
  assert.ok(s.pending.options.length >= 2, 'Chump e o próprio Recycler podem voltar');
  const chosen = s.pending.options.findIndex(o => o.oid === chump);
  s = resolveSpell(act(s, { t: 'pick_target', p: a, index: chosen }));
  assert.equal(s.objects[chump].zone, 'hand');
});

test('S17 · filtros de alvo: lendária escapa do Cast Down e o Spell Snare só pega valor 2', () => {
  let s = drainGame(5); const a = s.turn.active;
  s = JSON.parse(JSON.stringify(s));
  s.facts['Chump'].legendary = true;
  const eff = { do: 'destroy', target: 'creature', targetNotLegendary: true };
  let chump; [s, chump] = put(s, a, 'Chump');
  assert.equal(E.legalTargets(s, a, 'creature').some(t => t.oid === chump), true, 'como alvo normal, ela vale');
  s.facts['Cast Down Test'] = E.cardFacts({ name: 'Cast Down Test', type_line: 'Instant' });
  s.facts['Cast Down Test'].script = { name: 'Cast Down Test', effects: [eff], abilities: [] };
  const oid = s.zones[a].hand[0];
  s.objects[oid].name = 'Cast Down Test';
  assert.ok(!E.legalActions(s, a).some(x => x.t === 'cast' && x.oid === oid && x.targets && x.targets[0].oid === chump), 'a lendária não é oferecida');
  assert.throws(() => act(s, { t: 'cast', p: a, oid, targets: [{ oid: chump }] }), /alvo ilegal/);
});

/* ---------------- S16 · custos alternativos, lampejo do passado e "a menos que pague" ---------------- */
const ALT_CARDS = {
  'Island': COMBAT_CARDS['Island'],
  'Free Counter': { name: 'Free Counter', type_line: 'Instant', mana_cost: '{1}{U}', keywords: [], oracle_text: 'Counter target spell unless its controller pays {1}.' },
  'Looting': { name: 'Looting', type_line: 'Sorcery', mana_cost: '{R}', keywords: [], oracle_text: 'Draw two, discard two. Flashback {2}{R}.' },
  'Bear': { name: 'Bear', type_line: 'Creature — Bear', mana_cost: '{1}{G}', power: '2', toughness: '2', keywords: [], oracle_text: '' }
};
const ALT_SCRIPTS = {
  'Free Counter': { name: 'Free Counter', effects: [{ do: 'counter', target: 'spell', unless: { mana: '{1}' } }],
    alt: [{ label: 'Devolver uma Ilha', cost: { returnLand: 'Island' } }], example: { action: 'alt:0', target: 'enemy-spell', expect: { countered: true } } },
  Looting: { name: 'Looting', effects: [{ do: 'draw', amount: 2 }, { do: 'discard', amount: 2 }], flashback: { mana: '{2}{R}' },
    example: { action: 'flashback', target: 'none', expect: { exiled: true } } }
};
const ALDECK = [{ name: 'Island', qty: 30, zone: 'main' }, { name: 'Free Counter', qty: 8, zone: 'main' },
  { name: 'Looting', qty: 8, zone: 'main' }, { name: 'Bear', qty: 8, zone: 'main' }];
function altGame(seed = 1, manaCheck = true) {
  let s = E.createGame({ format: 'livre', seed, mode: 'assisted', manaCheck, cards: ALT_CARDS, scripts: ALT_SCRIPTS,
    players: [{ name: 'A', deck: ALDECK }, { name: 'B', deck: ALDECK }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passTo(s, 'main1');
}

test('S16 · custo alternativo: devolve a Ilha em vez de pagar mana', () => {
  let s = altGame(3); const a = s.turn.active, d = 1 - a;
  let counter, island, bear;
  [s, counter] = put(s, a, 'Free Counter', { zone: 'hand' });
  [s, bear] = put(s, d, 'Bear', { zone: 'hand' });
  // põe a mágica do oponente na pilha para haver alvo
  s = JSON.parse(JSON.stringify(s));
  s.zones[d].hand = s.zones[d].hand.filter(x => x !== bear); s.stack.push(bear);
  Object.assign(s.objects[bear], { zone: 'stack', controller: d });
  assert.throws(() => act(s, { t: 'cast', p: a, oid: counter, targets: [{ oid: bear }] }), /mana insuficiente/);
  [s, island] = put(s, a, 'Island');
  const alt = E.legalActions(s, a).find(x => x.t === 'cast' && x.oid === counter && x.alt === 0);
  assert.ok(alt && alt.pay && alt.pay.land === island, 'a mesa sugere qual Ilha devolver');
  s = act(s, { t: 'cast', p: a, oid: counter, alt: 0, pay: { land: island }, targets: [{ oid: bear }] });
  assert.equal(s.objects[island].zone, 'hand', 'a Ilha voltou para a mão como custo');
  assert.equal(s.objects[counter].zone, 'stack');
});

test('S16 · "a menos que pague": quem controla a mágica decide, e pagando ela sobrevive', () => {
  let s = altGame(4); const a = s.turn.active, d = 1 - a;
  let counter, bear, i1, i2, i3;
  [s, counter] = put(s, a, 'Free Counter', { zone: 'hand' });
  [s, i1] = put(s, a, 'Island'); [s, i2] = put(s, a, 'Island'); [s, i3] = put(s, d, 'Island');
  [s, bear] = put(s, d, 'Bear', { zone: 'hand' });
  s = JSON.parse(JSON.stringify(s));
  s.zones[d].hand = s.zones[d].hand.filter(x => x !== bear); s.stack.push(bear);
  Object.assign(s.objects[bear], { zone: 'stack', controller: d });
  s = act(s, { t: 'cast', p: a, oid: counter, targets: [{ oid: bear }] });
  s = act(s, { t: 'pass', p: a }); s = act(s, { t: 'pass', p: d });
  assert.deepEqual({ kind: s.pending.kind, p: s.pending.p }, { kind: 'may_pay', p: d });
  assert.throws(() => act(s, { t: 'pass', p: d }), /decida se paga/);
  const paid = act(s, { t: 'pay', p: d });
  assert.equal(paid.objects[bear].zone, 'stack', 'pagou: a mágica continua');
  assert.equal(paid.objects[i3].tapped, true, 'pagou com o próprio terreno');
  const declined = act(s, { t: 'decline', p: d });
  assert.equal(declined.objects[bear].zone, 'graveyard', 'não pagou: anulada');
});

test('S16 · lampejo do passado: conjura do cemitério e exila depois', () => {
  let s = altGame(5, false); const a = s.turn.active;
  let looting; [s, looting] = put(s, a, 'Looting', { zone: 'graveyard' });
  assert.ok(E.legalActions(s, a).some(x => x.t === 'cast' && x.oid === looting && x.flashback), 'a mesa oferece o lampejo');
  s = resolveSpell(act(s, { t: 'cast', p: a, oid: looting, flashback: true }));
  while (s.pending && s.pending.kind === 'discard') s = act(s, { t: 'discard', p: a, oid: s.zones[a].hand[0] });
  assert.equal(s.objects[looting].zone, 'exile', 'o lampejo exila em vez de voltar ao cemitério');
});

/* ---------------- S18 · ninjutsu e insanidade ---------------- */
const NIN_CARDS = {
  'Island': COMBAT_CARDS['Island'],
  'Sneak': { name: 'Sneak', type_line: 'Creature — Human Ninja', mana_cost: '{2}{U}', power: '2', toughness: '2', keywords: [], oracle_text: 'Ninjutsu {1}{U}' },
  'Runner': { name: 'Runner', type_line: 'Creature — Human Rogue', mana_cost: '{U}', power: '1', toughness: '1', keywords: [], oracle_text: '' },
  'Blocker': { name: 'Blocker', type_line: 'Creature — Wall', mana_cost: '{U}', power: '0', toughness: '4', keywords: [], oracle_text: '' },
  'Temper': { name: 'Temper', type_line: 'Instant', mana_cost: '{2}{R}', keywords: [], oracle_text: 'Madness {R}' },
  'Looting': { name: 'Looting', type_line: 'Sorcery', mana_cost: '{R}', keywords: [], oracle_text: 'Draw two, discard two.' }
};
const NIN_SCRIPTS = {
  Sneak: { name: 'Sneak', ninjutsu: { mana: '{1}{U}' }, abilities: [{ kind: 'triggered', when: 'combat-damage', effects: [{ do: 'draw', amount: 1 }] }],
    example: { action: 'ninjutsu', target: 'none', expect: { attacked: true } } },
  Temper: { name: 'Temper', effects: [{ do: 'damage', amount: 3, target: 'any' }], madness: { mana: '{R}' },
    example: { action: 'madness', target: 'opponent', expect: { opponentLife: -3 } } },
  Looting: { name: 'Looting', effects: [{ do: 'draw', amount: 2 }, { do: 'discard', amount: 2 }], example: { target: 'none', expect: { discarded: 2 } } }
};
const NDECK = [{ name: 'Island', qty: 24, zone: 'main' }, { name: 'Sneak', qty: 6, zone: 'main' }, { name: 'Runner', qty: 8, zone: 'main' },
  { name: 'Blocker', qty: 6, zone: 'main' }, { name: 'Temper', qty: 8, zone: 'main' }, { name: 'Looting', qty: 8, zone: 'main' }];
function ninGame(seed = 1, manaCheck = false) {
  let s = E.createGame({ format: 'livre', seed, mode: 'assisted', manaCheck, cards: NIN_CARDS, scripts: NIN_SCRIPTS,
    players: [{ name: 'A', deck: NDECK }, { name: 'B', deck: NDECK }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passTo(s, 'main1');
}

test('S18 · ninjutsu troca o atacante não bloqueado pelo ninja, virado e atacando', () => {
  let s = ninGame(3); const a = s.turn.active, d = 1 - a;
  let runner, sneak;
  [s, runner] = put(s, a, 'Runner');
  [s, sneak] = put(s, a, 'Sneak', { zone: 'hand' });
  s = passTo(s, 'combat_attackers');
  s = act(s, { t: 'attack', p: a, attackers: [runner] });
  s = passTo(s, 'combat_blockers');
  if (s.pending) s = act(s, { t: 'block', p: d, blocks: [] });
  assert.ok(E.legalActions(s, a).some(x => x.t === 'ninjutsu' && x.oid === sneak && x.attacker === runner));
  s = act(s, { t: 'ninjutsu', p: a, oid: sneak, attacker: runner });
  assert.equal(s.objects[runner].zone, 'hand', 'o atacante voltou para a mão');
  assert.equal(s.objects[sneak].zone, 'battlefield');
  assert.equal(s.objects[sneak].tapped, true);
  assert.equal(s.objects[sneak].attacking != null, true);
  const hand = s.zones[a].hand.length;
  s = passTo(s, 'combat_end');
  assert.equal(s.players[d].life, 18, 'o ninja bateu por 2');
  s = settle(s);
  assert.equal(s.zones[a].hand.length, hand + 1, 'gatilho de dano de combate comprou');
});

test('S18 · ninjutsu só com atacante sem bloqueio e só no passo de bloqueio', () => {
  let s = ninGame(4); const a = s.turn.active, d = 1 - a;
  let runner, sneak, blocker;
  [s, runner] = put(s, a, 'Runner'); [s, sneak] = put(s, a, 'Sneak', { zone: 'hand' }); [s, blocker] = put(s, d, 'Blocker');
  assert.equal(E.legalActions(s, a).some(x => x.t === 'ninjutsu'), false, 'fora do combate não dá');
  s = passTo(s, 'combat_attackers');
  s = act(s, { t: 'attack', p: a, attackers: [runner] });
  s = passTo(s, 'combat_blockers');
  s = act(s, { t: 'block', p: d, blocks: [[blocker, runner]] });
  assert.equal(E.legalActions(s, a).some(x => x.t === 'ninjutsu'), false, 'bloqueado não serve');
  assert.throws(() => act(s, { t: 'ninjutsu', p: a, oid: sneak, attacker: runner }), /não foi bloqueado/);
});

test('S18 · insanidade: descartar exila e o dono decide conjurar pelo custo de insanidade', () => {
  let s = ninGame(5); const a = s.turn.active, d = 1 - a;
  let temper; [s, temper] = put(s, a, 'Temper', { zone: 'hand' });
  s = act(s, { t: 'discard', p: a, oid: temper });
  assert.deepEqual({ kind: s.pending.kind, p: s.pending.p }, { kind: 'madness', p: a });
  assert.equal(s.objects[temper].zone, 'exile', 'fica no exílio enquanto decide');
  const recusou = act(s, { t: 'decline_madness', p: a });
  assert.equal(recusou.objects[temper].zone, 'graveyard');
  let s2 = act(s, { t: 'cast_madness', p: a, targets: [{ player: d }] });
  assert.equal(s2.objects[temper].zone, 'stack');
  s2 = resolveSpell(s2);
  assert.equal(s2.players[d].life, 17);
});

test('S18 · insanidade no descarte da limpeza não trava o turno', () => {
  let s = ninGame(6); const a = s.turn.active;
  let temper; [s, temper] = put(s, a, 'Temper', { zone: 'hand' });
  s = act(s, { t: 'draw', p: a, n: 3 });
  for (let i = 0; i < 40 && !(s.pending && s.pending.kind === 'discard'); i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const n = s.pending.n;
  for (let i = 0; i < n; i++) {
    const alvo = s.zones[a].hand.includes(temper) ? temper : s.zones[a].hand[0];
    s = act(s, { t: 'discard', p: a, oid: alvo });
    if (s.pending && s.pending.kind === 'madness') s = act(s, { t: 'decline_madness', p: a });
  }
  assert.equal(s.pending, null);
  assert.notEqual(s.turn.step, 'cleanup', 'a limpeza terminou e o turno passou');
});

/* ---------------- S19 · valores dinâmicos ---------------- */
const DYN_CARDS = {
  'Forest': { name: 'Forest', type_line: 'Basic Land — Forest', mana_cost: '', keywords: [], oracle_text: '' },
  'Priest': { name: 'Priest', type_line: 'Creature — Elf Druid', mana_cost: '{1}{G}', power: '1', toughness: '1', keywords: [], oracle_text: '{T}: Add {G} for each Elf.' },
  'Elf': { name: 'Elf', type_line: 'Creature — Elf Warrior', mana_cost: '{G}', power: '1', toughness: '1', keywords: [], oracle_text: '' },
  'Wall': { name: 'Wall', type_line: 'Creature — Wall', mana_cost: '{G}', power: '0', toughness: '4', keywords: ['Defender'], oracle_text: 'Defender' },
  'Battlement': { name: 'Battlement', type_line: 'Creature — Wall', mana_cost: '{1}{G}', power: '0', toughness: '4', keywords: ['Defender'], oracle_text: 'Defender. {T}: Add {G} for each creature with defender you control.' },
  'Boost': { name: 'Boost', type_line: 'Creature — Elf Warrior', mana_cost: '{2}{G}', power: '1', toughness: '1', keywords: [], oracle_text: '{T}: Target creature gets +X/+X.' },
  'Melody': { name: 'Melody', type_line: 'Sorcery', mana_cost: '{2}{U}', keywords: [], oracle_text: 'Draw a card for each creature you control.' }
};
const DYN_SCRIPTS = {
  Priest: { name: 'Priest', produces: [{ symbol: 'G', per: 'elves-on-battlefield' }], example: { action: 'etb', target: 'none', expect: { attached: false } } },
  Battlement: { name: 'Battlement', produces: [{ symbol: 'G', per: 'defenders-you-control' }], example: { action: 'etb', target: 'none', expect: { attached: false } } },
  Boost: { name: 'Boost', abilities: [{ kind: 'activated', cost: { tap: true }, effects: [{ do: 'pump', power: { per: 'elves-you-control' }, toughness: { per: 'elves-you-control' }, target: 'creature' }] }],
    example: { action: 'activate:0', target: 'own-creature', expect: { pump: [1, 1] } } },
  Melody: { name: 'Melody', effects: [{ do: 'draw', amount: { per: 'creatures-you-control' } }], example: { target: 'none', expect: { handDelta: 1 } } }
};
const DYDECK = [{ name: 'Forest', qty: 24, zone: 'main' }, { name: 'Priest', qty: 6, zone: 'main' }, { name: 'Elf', qty: 8, zone: 'main' },
  { name: 'Wall', qty: 6, zone: 'main' }, { name: 'Battlement', qty: 6, zone: 'main' }, { name: 'Boost', qty: 6, zone: 'main' }, { name: 'Melody', qty: 6, zone: 'main' }];
function dynGame(seed = 1, manaCheck = false) {
  let s = E.createGame({ format: 'livre', seed, mode: 'assisted', manaCheck, cards: DYN_CARDS, scripts: DYN_SCRIPTS,
    players: [{ name: 'A', deck: DYDECK }, { name: 'B', deck: DYDECK }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passTo(s, 'main1');
}

test('S19 · mana que cresce com o campo: Elfos e criaturas com defensor', () => {
  let s = dynGame(3); const a = s.turn.active;
  let priest, elf1, elf2;
  [s, priest] = put(s, a, 'Priest');
  assert.deepEqual(JSON.parse(JSON.stringify(E.productions(s, s.objects[priest]))), [['G']], 'só ele mesmo: 1 Elfo');
  [s, elf1] = put(s, a, 'Elf'); [s, elf2] = put(s, a, 'Elf');
  assert.deepEqual(JSON.parse(JSON.stringify(E.productions(s, s.objects[priest]))), [['G', 'G', 'G']], 'três Elfos, três manas');
  s = act(s, { t: 'tap_mana', p: a, oid: priest, option: 0 });
  assert.equal(s.players[a].pool.G, 3);

  let batt, wall;
  [s, batt] = put(s, a, 'Battlement'); [s, wall] = put(s, a, 'Wall');
  assert.deepEqual(JSON.parse(JSON.stringify(E.productions(s, s.objects[batt]))), [['G', 'G']], 'dois defensores');
});

test('S19 · pump que conta Elfos e compra que conta criaturas', () => {
  let s = dynGame(4); const a = s.turn.active;
  let boost, elf, melody;
  [s, boost] = put(s, a, 'Boost'); [s, elf] = put(s, a, 'Elf');
  s = resolveSpell(act(s, { t: 'activate', p: a, oid: boost, index: 0, targets: [{ oid: elf }] }));
  assert.deepEqual([s.objects[elf].pump.p, s.objects[elf].pump.t], [2, 2], 'Boost e Elf são dois Elfos');
  const hand = s.zones[a].hand.length;
  [s, melody] = put(s, a, 'Melody', { zone: 'hand' });
  s = resolveSpell(act(s, { t: 'cast', p: a, oid: melody }));
  assert.equal(s.zones[a].hand.length, hand - 1 + 1 + 2, 'comprou uma por criatura sua');
});

/* ---------------- S20 · cemitério e custos adicionais ---------------- */
const GY_CARDS = {
  'Forest': DYN_CARDS['Forest'],
  'Bear': { name: 'Bear', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, power: '2', toughness: '2', keywords: [], oracle_text: '' },
  'Giant': { name: 'Giant', type_line: 'Creature — Giant', mana_cost: '{4}{G}', cmc: 5, power: '5', toughness: '5', keywords: [], oracle_text: '' },
  'Recall': { name: 'Recall', type_line: 'Sorcery', mana_cost: '{B}', keywords: [], oracle_text: 'Return target creature card with mana value 3 or less from your graveyard to your hand.' },
  'Revive': { name: 'Revive', type_line: 'Sorcery', mana_cost: '{2}{W}', keywords: [], oracle_text: 'Return target permanent card with mana value 3 or less from your graveyard to the battlefield.' },
  'Offering': { name: 'Offering', type_line: 'Instant', mana_cost: '{1}{B}', keywords: [], oracle_text: 'As an additional cost, sacrifice an artifact or creature. Draw two cards.' },
  'Torch': { name: 'Torch', type_line: 'Creature — Plant Wall', mana_cost: '{G}', power: '0', toughness: '3', keywords: ['Defender'], oracle_text: 'Sacrifice: Add {R}{R}.' }
};
const GY_SCRIPTS = {
  Recall: { name: 'Recall', effects: [{ do: 'to_hand', target: 'creature-in-your-graveyard', targetMvMax: 3 }], example: { target: 'own-graveyard-creature', expect: { returned: true } } },
  Revive: { name: 'Revive', effects: [{ do: 'reanimate', target: 'permanent-in-your-graveyard', targetMvMax: 3 }], example: { target: 'own-graveyard-creature', expect: { reanimated: true } } },
  Offering: { name: 'Offering', additional: { sacrificeOther: { types: ['artifact', 'creature'] } }, effects: [{ do: 'draw', amount: 2 }], example: { target: 'none', expect: { handDelta: 2 } } },
  Torch: { name: 'Torch', abilities: [{ kind: 'activated', cost: { sacrifice: true }, effects: [{ do: 'add_mana', symbols: ['R', 'R'] }] }], example: { action: 'activate:0', target: 'none', expect: { poolAdded: 2 } } }
};
const GDECK = [{ name: 'Forest', qty: 24, zone: 'main' }, { name: 'Bear', qty: 8, zone: 'main' }, { name: 'Giant', qty: 6, zone: 'main' },
  { name: 'Recall', qty: 6, zone: 'main' }, { name: 'Revive', qty: 6, zone: 'main' }, { name: 'Offering', qty: 6, zone: 'main' }, { name: 'Torch', qty: 6, zone: 'main' }];
function gyGame(seed = 1) {
  let s = E.createGame({ format: 'livre', seed, mode: 'assisted', manaCheck: false, cards: GY_CARDS, scripts: GY_SCRIPTS,
    players: [{ name: 'A', deck: GDECK }, { name: 'B', deck: GDECK }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passTo(s, 'main1');
}

test('S20 · devolver e reanimar do seu cemitério, respeitando o valor de mana', () => {
  let s = gyGame(3); const a = s.turn.active;
  let bear, giant, recall, revive;
  [s, bear] = put(s, a, 'Bear', { zone: 'graveyard' }); [s, giant] = put(s, a, 'Giant', { zone: 'graveyard' });
  [s, recall] = put(s, a, 'Recall', { zone: 'hand' });
  const opts = E.legalActions(s, a).filter(x => x.t === 'cast' && x.oid === recall);
  assert.ok(opts.every(x => x.targets[0].oid !== giant), 'o Giant custa 5: fora do alcance');
  s = resolveSpell(act(s, { t: 'cast', p: a, oid: recall, targets: [{ oid: bear }] }));
  assert.equal(s.objects[bear].zone, 'hand');

  let bear2; [s, bear2] = put(s, a, 'Bear', { zone: 'graveyard' });
  [s, revive] = put(s, a, 'Revive', { zone: 'hand' });
  s = resolveSpell(act(s, { t: 'cast', p: a, oid: revive, targets: [{ oid: bear2 }] }));
  assert.equal(s.objects[bear2].zone, 'battlefield');
  assert.equal(s.objects[bear2].sick, true, 'volta com enjoo');
});

test('S20 · custo adicional de sacrifício na conjuração e na habilidade', () => {
  let s = gyGame(4); const a = s.turn.active;
  let offering, bear, torch;
  [s, offering] = put(s, a, 'Offering', { zone: 'hand' });
  assert.equal(E.legalActions(s, a).some(x => x.t === 'cast' && x.oid === offering), false, 'sem nada para sacrificar, não dá para conjurar');
  [s, bear] = put(s, a, 'Bear');
  const cast = E.legalActions(s, a).find(x => x.t === 'cast' && x.oid === offering);
  assert.equal(cast.pay.sacrifice, bear, 'a mesa sugere o que sacrificar');
  const hand = s.zones[a].hand.length;
  s = resolveSpell(act(s, cast));
  assert.equal(s.objects[bear].zone, 'graveyard', 'o custo foi pago');
  assert.equal(s.zones[a].hand.length, hand - 1 + 2);

  [s, torch] = put(s, a, 'Torch');
  s = act(s, { t: 'activate', p: a, oid: torch, index: 0 });
  assert.equal(s.players[a].pool.R, 2, 'mana direto na reserva');
  assert.equal(s.objects[torch].zone, 'graveyard', 'sacrificado no custo');
  assert.equal(s.stack.length, 0, 'habilidade de mana não usa a pilha');
});

/* ---------------- S21 · planeswalkers ---------------- */
const PW_CARDS = {
  'Island': COMBAT_CARDS['Island'],
  'Walker': { name: 'Walker', type_line: 'Legendary Planeswalker — Test', mana_cost: '{2}{U}', loyalty: '3', keywords: [], oracle_text: '+1 / −2' },
  'Bolt': { name: 'Bolt', type_line: 'Instant', mana_cost: '{R}', keywords: [], oracle_text: 'Deals 3 damage to any target.' }
};
const PW_SCRIPTS = {
  Walker: { name: 'Walker', loyalty: [
    { cost: 1, label: '+1: comprar', effects: [{ do: 'draw', amount: 1 }] },
    { cost: -2, label: '−2: dano 2', effects: [{ do: 'damage', amount: 2, target: 'any' }] }],
    example: { action: 'loyalty:0', target: 'none', expect: { loyalty: 4 } } },
  Bolt: { name: 'Bolt', effects: [{ do: 'damage', amount: 3, target: 'any' }], example: { target: 'opponent', expect: { opponentLife: -3 } } }
};
const PWDECK = [{ name: 'Island', qty: 30, zone: 'main' }, { name: 'Walker', qty: 6, zone: 'main' }, { name: 'Bolt', qty: 8, zone: 'main' }];
function pwGame(seed = 1) {
  let s = E.createGame({ format: 'livre', seed, mode: 'assisted', manaCheck: false, cards: PW_CARDS, scripts: PW_SCRIPTS,
    players: [{ name: 'A', deck: PWDECK }, { name: 'B', deck: PWDECK }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passTo(s, 'main1');
}

test('S21 · planeswalker entra com a lealdade da carta e usa uma habilidade por turno', () => {
  let s = pwGame(3); const a = s.turn.active;
  let walker; [s, walker] = put(s, a, 'Walker', { zone: 'hand' });
  s = resolveSpell(act(s, { t: 'cast', p: a, oid: walker }));
  assert.equal(s.objects[walker].counters.loyalty, 3);
  const [mais, menos] = E.legalActions(s, a).filter(x => x.t === 'activate' && x.oid === walker);
  s = resolveSpell(act(s, mais));
  assert.equal(s.objects[walker].counters.loyalty, 4, '+1 sobe a lealdade');
  assert.equal(E.legalActions(s, a).some(x => x.t === 'activate' && x.oid === walker), false, 'só uma por turno');
  assert.throws(() => act(s, menos), /já usou/);
});

test('S21 · lealdade insuficiente, só no tempo de feitiço, e dano tira lealdade', () => {
  let s = pwGame(4); const a = s.turn.active, d = 1 - a;
  let walker; [s, walker] = put(s, a, 'Walker');
  s = JSON.parse(JSON.stringify(s)); s.objects[walker].counters.loyalty = 1;
  assert.equal(E.legalActions(s, a).filter(x => x.t === 'activate' && x.oid === walker).length, 1, 'só o +1 cabe em 1 de lealdade');
  const combat = passTo(s, 'combat_begin');
  assert.equal(E.legalActions(combat, a).some(x => x.t === 'activate' && x.oid === walker), false, 'fora da fase principal não dá');

  let bolt; [s, bolt] = put(s, a, 'Bolt', { zone: 'hand' });
  s = resolveSpell(act(s, { t: 'cast', p: a, oid: bolt, targets: [{ oid: walker }] }));
  assert.equal(s.objects[walker].zone, 'graveyard', '3 de dano em 1 de lealdade mata a planeswalker');
});

/* ---------------- S22 · entra virado, ciclar e busca para o campo ---------------- */
const CY_CARDS = {
  'Forest': DYN_CARDS['Forest'],
  'Tapped Land': { name: 'Tapped Land', type_line: 'Land', mana_cost: '', keywords: [], oracle_text: 'This land enters tapped. {T}: Add {C}.' },
  'Cycler': { name: 'Cycler', type_line: 'Creature — Bear', mana_cost: '{3}{G}', power: '3', toughness: '3', keywords: [], oracle_text: 'Cycling {1}.' },
  'Fetch': { name: 'Fetch', type_line: 'Land', mana_cost: '', keywords: [], oracle_text: '{T}, Sacrifice: Search for a land.' }
};
const CY_SCRIPTS = {
  'Tapped Land': { name: 'Tapped Land', entersTapped: true, produces: [{ symbol: 'C', amount: 1 }], example: { action: 'etb', target: 'none', expect: { tappedOnEntry: true } } },
  Cycler: { name: 'Cycler', cycling: { mana: '{1}' }, self: {}, example: { action: 'cycling', target: 'none', expect: { handDelta: 0 } } },
  Fetch: { name: 'Fetch', abilities: [{ kind: 'activated', cost: { tap: true, sacrifice: true }, effects: [{ do: 'search', amount: 1, filter: { types: ['land'] }, to: 'battlefield-tapped' }] }],
    example: { action: 'activate:0', target: 'none', expect: { picked: true } } }
};
const CYDECK = [{ name: 'Forest', qty: 24, zone: 'main' }, { name: 'Tapped Land', qty: 8, zone: 'main' },
  { name: 'Cycler', qty: 8, zone: 'main' }, { name: 'Fetch', qty: 8, zone: 'main' }];
function cyGame(seed = 1, manaCheck = false) {
  let s = E.createGame({ format: 'livre', seed, mode: 'assisted', manaCheck, cards: CY_CARDS, scripts: CY_SCRIPTS,
    players: [{ name: 'A', deck: CYDECK }, { name: 'B', deck: CYDECK }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passTo(s, 'main1');
}

test('S22 · terreno que entra virado e busca que põe outro terreno virado no campo', () => {
  let s = cyGame(3); const a = s.turn.active;
  let tapped; [s, tapped] = put(s, a, 'Tapped Land', { zone: 'hand' });
  s = act(s, { t: 'play_land', p: a, oid: tapped });
  assert.equal(s.objects[tapped].tapped, true, 'entrou virada');

  let fetch; [s, fetch] = put(s, a, 'Fetch');
  s = resolveSpell(act(s, { t: 'activate', p: a, oid: fetch, index: 0 }));
  assert.equal(s.pending.kind, 'pick');
  const alvo = s.pending.from[0];
  s = act(s, { t: 'pick', p: a, oid: alvo });
  assert.equal(s.objects[alvo].zone, 'battlefield');
  assert.equal(s.objects[alvo].tapped, true, 'a busca põe virado');
  assert.equal(s.objects[fetch].zone, 'graveyard', 'sacrificado no custo');
});

test('S22 · ciclar troca a carta por outra e cobra o custo', () => {
  let s = cyGame(4, true); const a = s.turn.active;
  let cycler; [s, cycler] = put(s, a, 'Cycler', { zone: 'hand' });
  assert.equal(E.legalActions(s, a).some(x => x.t === 'cycle' && x.oid === cycler), false, 'sem mana, não cicla');
  let land; [s, land] = put(s, a, 'Forest');
  assert.ok(E.legalActions(s, a).some(x => x.t === 'cycle' && x.oid === cycler));
  const hand = s.zones[a].hand.length;
  s = act(s, { t: 'cycle', p: a, oid: cycler });
  assert.equal(s.objects[cycler].zone, 'graveyard');
  assert.equal(s.zones[a].hand.length, hand, 'saiu uma, entrou outra');
  assert.equal(s.objects[land].tapped, true, 'pagou o custo com o terreno');
});

/* ---------------- S23 · gatilhos de conjuração e mana de qualquer cor ---------------- */
const CAST_CARDS = {
  'Forest': DYN_CARDS['Forest'],
  'Elf': { name: 'Elf', type_line: 'Creature — Elf Warrior', mana_cost: '{G}', power: '1', toughness: '1', keywords: [], oracle_text: '' },
  'Bear': { name: 'Bear', type_line: 'Creature — Bear', mana_cost: '{1}{G}', power: '2', toughness: '2', keywords: [], oracle_text: '' },
  'Huntmaster': { name: 'Huntmaster', type_line: 'Creature — Elf Warrior', mana_cost: '{3}{G}', power: '2', toughness: '2', keywords: [], oracle_text: 'Whenever you cast an Elf spell, create a 1/1 Elf.' },
  'Drum': { name: 'Drum', type_line: 'Artifact', mana_cost: '{1}', keywords: [], oracle_text: '{T}, Tap an untapped creature you control: Add one mana of any color.' }
};
const CAST_SCRIPTS = {
  Huntmaster: { name: 'Huntmaster', abilities: [{ kind: 'triggered', when: 'other-cast', filter: { subtype: 'Elf' },
    effects: [{ do: 'token', amount: 1, token: { name: 'Elf Warrior', types: ['creature'], power: 1, toughness: 1 } }] }],
    example: { action: 'etb', target: 'none', expect: { attached: false } } },
  Drum: { name: 'Drum', abilities: [{ kind: 'activated', cost: { tap: true, tapOther: { types: ['creature'] } }, effects: [{ do: 'add_mana', anyColor: true }] }],
    example: { action: 'activate:0', target: 'none', expect: { poolAdded: 1 } } }
};
const CDECK = [{ name: 'Forest', qty: 24, zone: 'main' }, { name: 'Elf', qty: 10, zone: 'main' },
  { name: 'Bear', qty: 8, zone: 'main' }, { name: 'Huntmaster', qty: 6, zone: 'main' }, { name: 'Drum', qty: 6, zone: 'main' }];
function castGame(seed = 1) {
  let s = E.createGame({ format: 'livre', seed, mode: 'assisted', manaCheck: false, cards: CAST_CARDS, scripts: CAST_SCRIPTS,
    players: [{ name: 'A', deck: CDECK }, { name: 'B', deck: CDECK }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passTo(s, 'main1');
}
const tokensOf = (s, p) => Object.values(s.objects).filter(o => o.token && o.controller === p);

test('S23 · gatilho ao conjurar: só dispara com a mágica do tipo certo', () => {
  let s = castGame(3); const a = s.turn.active;
  let hunt, elf, bear;
  [s, hunt] = put(s, a, 'Huntmaster');
  [s, elf] = put(s, a, 'Elf', { zone: 'hand' });
  s = act(s, { t: 'cast', p: a, oid: elf });
  assert.equal(s.stack.length, 2, 'a mágica e o gatilho estão na pilha');
  s = settle(s);
  assert.equal(tokensOf(s, a).length, 1, 'criou a ficha de Elfo');

  [s, bear] = put(s, a, 'Bear', { zone: 'hand' });
  s = act(s, { t: 'cast', p: a, oid: bear });
  assert.equal(s.stack.length, 1, 'Urso não é Elfo: sem gatilho');
});

test('S23 · mana de qualquer cor: uma opção por cor e o custo de virar outra criatura', () => {
  let s = castGame(4); const a = s.turn.active;
  let drum, elf;
  [s, drum] = put(s, a, 'Drum');
  assert.equal(E.legalActions(s, a).filter(x => x.t === 'activate' && x.oid === drum).length, 0, 'sem outra criatura, não dá');
  [s, elf] = put(s, a, 'Elf');
  const opts = E.legalActions(s, a).filter(x => x.t === 'activate' && x.oid === drum);
  assert.equal(opts.length, 5, 'uma opção por cor');
  s = act(s, opts.find(x => x.color === 'U'));
  assert.equal(s.players[a].pool.U, 1);
  assert.equal(s.objects[elf].tapped, true, 'a outra criatura virou como custo');
  assert.equal(s.objects[drum].tapped, true);
});

/* ---------------- S24 · faces duplas ---------------- */
const DFC_CARDS = {
  'Plains': { name: 'Plains', type_line: 'Basic Land — Plains', mana_cost: '', keywords: [], oracle_text: '' },
  'Veteran': { name: 'Veteran', type_line: 'Creature — Human Cleric', mana_cost: '{W}', power: '1', toughness: '1', keywords: [], oracle_text: 'Disturb {1}{W}' },
  'Wildling': { name: 'Wildling', type_line: 'Creature — Dragon', mana_cost: '{4}{G}', power: '3', toughness: '3', keywords: ['Flying'], oracle_text: 'Omen {G}' },
  'Bear': { name: 'Bear', type_line: 'Creature — Bear', mana_cost: '{1}{G}', power: '2', toughness: '2', keywords: [], oracle_text: '' }
};
const DFC_SCRIPTS = {
  Veteran: { name: 'Veteran', abilities: [{ kind: 'triggered', when: 'other-etb', filter: { types: ['creature'] }, effects: [{ do: 'gain', amount: 1 }] }],
    disturb: { mana: '{1}{W}' }, back: { name: 'Phantom', types: ['creature'], power: 1, toughness: 1, keywords: ['flying'] },
    example: { action: 'disturb', target: 'none', expect: { transformed: true } } },
  Wildling: { name: 'Wildling', abilities: [{ kind: 'triggered', when: 'etb', effects: [{ do: 'gain', amount: 3 }] }],
    omen: { mana: '{G}' }, back: { name: 'Seek', types: ['sorcery'], effects: [{ do: 'search', amount: 1, filter: { types: ['land'] }, to: 'hand' }] },
    example: { action: 'omen', target: 'none', expect: { picked: true } } }
};
const DFCDECK = [{ name: 'Plains', qty: 24, zone: 'main' }, { name: 'Veteran', qty: 8, zone: 'main' },
  { name: 'Wildling', qty: 8, zone: 'main' }, { name: 'Bear', qty: 8, zone: 'main' }];
function dfcGame(seed = 1, manaCheck = false) {
  let s = E.createGame({ format: 'livre', seed, mode: 'assisted', manaCheck, cards: DFC_CARDS, scripts: DFC_SCRIPTS,
    players: [{ name: 'A', deck: DFCDECK }, { name: 'B', deck: DFCDECK }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passTo(s, 'main1');
}

test('S24 · disturb: conjura do cemitério já com a face de trás e volta à frente se sair do campo', () => {
  let s = dfcGame(3); const a = s.turn.active;
  let vet; [s, vet] = put(s, a, 'Veteran', { zone: 'graveyard' });
  assert.ok(E.legalActions(s, a).some(x => x.t === 'cast' && x.oid === vet && x.disturb));
  s = resolveSpell(act(s, { t: 'cast', p: a, oid: vet, disturb: true }));
  assert.equal(s.objects[vet].name, 'Phantom', 'entrou pela face de trás');
  assert.equal(E.hasKeyword(s, s.objects[vet], 'flying'), true);
  s = act(s, { t: 'move', p: a, oid: vet, to: 'graveyard' });
  assert.equal(s.objects[vet].name, 'Veteran', 'fora do campo, volta para a frente');
});

test('S24 · presságio: conjura a face de trás da mão e a carta volta embaralhada para o grimório', () => {
  let s = dfcGame(4); const a = s.turn.active;
  let wild; [s, wild] = put(s, a, 'Wildling', { zone: 'hand' });
  const opt = E.legalActions(s, a).find(x => x.t === 'cast' && x.oid === wild && x.omen);
  assert.ok(opt, 'a mesa oferece o presságio');
  s = act(s, opt);
  assert.equal(s.objects[wild].name, 'Seek', 'na pilha, é a face de trás');
  s = resolveSpell(s);
  assert.equal(s.pending.kind, 'pick', 'o presságio abriu a busca');
  s = act(s, { t: 'pick', p: a, oid: s.pending.from[0] });
  assert.equal(s.objects[wild].zone, 'library');
  assert.equal(s.objects[wild].name, 'Wildling', 'voltou para a face da frente');
});

test('S24 · conjurada normalmente, a carta usa a face da frente', () => {
  let s = dfcGame(5); const a = s.turn.active;
  let wild; [s, wild] = put(s, a, 'Wildling', { zone: 'hand' });
  const life = s.players[a].life;
  s = resolveSpell(act(s, { t: 'cast', p: a, oid: wild }));
  s = settle(s);
  assert.equal(s.objects[wild].name, 'Wildling');
  assert.equal(s.players[a].life, life + 3, 'gatilho da frente ao entrar');
});

/* ---------------- S25 · transformar no campo ---------------- */
const TR_CARDS = {
  'Plains': DFC_CARDS['Plains'],
  'Noble': { name: 'Noble', type_line: 'Legendary Creature — Human Noble', mana_cost: '{1}{B}', power: '1', toughness: '4', keywords: ['Lifelink'], oracle_text: 'Lifelink' },
  'Hero': { name: 'Hero', type_line: 'Legendary Creature — Human Soldier', mana_cost: '{W}', power: '2', toughness: '1', keywords: [], oracle_text: '{2}{W}: indestructible' },
  'Buddy': { name: 'Buddy', type_line: 'Creature — Soldier', mana_cost: '{W}', power: '1', toughness: '1', keywords: [], oracle_text: '' },
  'Salve': { name: 'Salve', type_line: 'Instant', mana_cost: '{W}', keywords: [], oracle_text: 'You gain 3 life.' }
};
const TR_SCRIPTS = {
  Noble: { name: 'Noble', abilities: [{ kind: 'triggered', when: 'main2', condition: { lifeGained: 3 }, effects: [{ do: 'transform', target: 'self-source' }] }],
    back: { name: 'Neonate', types: ['planeswalker'], loyalty: 3, loyaltyAbilities: [
      { cost: -1, label: '−1: dano igual à vida ganha', effects: [{ do: 'damage', amount: { per: 'life-gained-this-turn' }, target: 'any' }] }] },
    example: { action: 'etb', target: 'none', expect: { attached: false } } },
  Hero: { name: 'Hero', abilities: [
    { kind: 'triggered', when: 'end-of-combat', condition: { attackersAtLeast: 3 }, effects: [{ do: 'transform', target: 'self-source' }] },
    { kind: 'activated', cost: { mana: '{2}{W}' }, effects: [{ do: 'keyword', keyword: 'indestructible', target: 'self-source' }] }],
    back: { name: 'Forged', types: ['planeswalker'], loyalty: 3, loyaltyAbilities: [{ cost: 1, label: '+1: desvirar', effects: [{ do: 'untap', target: 'creature' }] }] },
    example: { action: 'activate:0', target: 'none', expect: { keyword: 'indestructible' } } },
  Salve: { name: 'Salve', effects: [{ do: 'gain', amount: 3 }], example: { target: 'none', expect: { selfLife: 3 } } }
};
const TRDECK = [{ name: 'Plains', qty: 24, zone: 'main' }, { name: 'Noble', qty: 6, zone: 'main' },
  { name: 'Hero', qty: 6, zone: 'main' }, { name: 'Buddy', qty: 10, zone: 'main' }, { name: 'Salve', qty: 8, zone: 'main' }];
/** Avança até a segunda fase principal, declarando nenhum ataque pelo caminho. */
function toMain2(s, max = 60) {
  for (let i = 0; i < max && s.turn.step !== 'main2'; i++) {
    if (s.pending && s.pending.kind === 'attackers') s = act(s, { t: 'attack', p: s.pending.p, attackers: [] });
    else if (s.pending && s.pending.kind === 'blockers') s = act(s, { t: 'block', p: s.pending.p, blocks: [] });
    else s = act(s, { t: 'pass', p: s.turn.priority });
  }
  assert.equal(s.turn.step, 'main2');
  return s;
}
function trGame(seed = 1) {
  let s = E.createGame({ format: 'livre', seed, mode: 'assisted', manaCheck: false, cards: TR_CARDS, scripts: TR_SCRIPTS,
    players: [{ name: 'A', deck: TRDECK }, { name: 'B', deck: TRDECK }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passTo(s, 'main1');
}

test('S25 · transforma na fase pós-combate só se ganhou vida suficiente', () => {
  let s = trGame(3); const a = s.turn.active, d = 1 - a;
  let noble; [s, noble] = put(s, a, 'Noble');
  let sem = toMain2(s);
  sem = settle(sem);
  assert.equal(sem.objects[noble].name, 'Noble', 'sem vida ganha, não transforma');

  let salve; [s, salve] = put(s, a, 'Salve', { zone: 'hand' });
  s = resolveSpell(act(s, { t: 'cast', p: a, oid: salve }));
  assert.equal(s.players[a].lifeGained, 3);
  s = settle(toMain2(s));
  assert.equal(s.objects[noble].name, 'Neonate', 'transformou');
  assert.equal(s.objects[noble].counters.loyalty, 3, 'entrou com a lealdade da face de trás');
  const menos = E.legalActions(s, a).find(x => x.t === 'activate' && x.oid === noble);
  s = settle(act(s, { ...menos, targets: [{ player: d }] }));
  assert.equal(s.players[d].life, 17, 'dano igual à vida ganha no turno');
});

test('S25 · transforma no fim do combate com três atacantes, e a palavra-chave dura até o fim do turno', () => {
  let s = trGame(4); const a = s.turn.active;
  let hero, b1, b2;
  [s, hero] = put(s, a, 'Hero'); [s, b1] = put(s, a, 'Buddy'); [s, b2] = put(s, a, 'Buddy');
  s = resolveSpell(act(s, { t: 'activate', p: a, oid: hero, index: 0 }));
  assert.equal(E.hasKeyword(s, s.objects[hero], 'indestructible'), true);
  s = passTo(s, 'combat_attackers');
  s = act(s, { t: 'attack', p: a, attackers: [hero, b1] });
  s = settle(passTo(s, 'combat_end'));
  assert.equal(s.objects[hero].name, 'Hero', 'dois atacantes não bastam');

  let s2 = trGame(5); const a2 = s2.turn.active;
  let h2, c1, c2;
  [s2, h2] = put(s2, a2, 'Hero'); [s2, c1] = put(s2, a2, 'Buddy'); [s2, c2] = put(s2, a2, 'Buddy');
  s2 = passTo(s2, 'combat_attackers');
  s2 = act(s2, { t: 'attack', p: a2, attackers: [h2, c1, c2] });
  s2 = settle(passTo(s2, 'combat_end'));
  assert.equal(s2.objects[h2].name, 'Forged', 'três atacantes transformam');
  assert.equal(s2.objects[h2].counters.loyalty, 3);
});

/* ---------------- S26 · delve e lampejo com custo de virar criaturas ---------------- */
const DV_CARDS = {
  'Island': COMBAT_CARDS['Island'],
  'Cruise': { name: 'Cruise', type_line: 'Sorcery', mana_cost: '{7}{U}', keywords: [], oracle_text: 'Delve. Draw three cards.' },
  'Screech': { name: 'Screech', type_line: 'Sorcery', mana_cost: '{2}{W}', keywords: [], oracle_text: 'Create two 1/1 Birds. Flashback — tap three creatures.' },
  'Bird': { name: 'Bird', type_line: 'Creature — Bird', mana_cost: '{W}', power: '1', toughness: '1', keywords: [], oracle_text: '' }
};
const DV_SCRIPTS = {
  Cruise: { name: 'Cruise', effects: [{ do: 'draw', amount: 3 }], alt: [{ label: 'Delve: exilar 7', cost: { mana: '{U}', exileGraveyard: 7 } }],
    example: { action: 'alt:0', target: 'none', expect: { handDelta: 3 } } },
  Screech: { name: 'Screech', effects: [{ do: 'token', amount: 2, token: { name: 'Bird', types: ['creature'], power: 1, toughness: 1, keywords: ['flying'] } }],
    flashback: { tapOther: { types: ['creature'], amount: 3 } }, example: { target: 'none', expect: { tokens: 2 } } }
};
const DVDECK = [{ name: 'Island', qty: 24, zone: 'main' }, { name: 'Cruise', qty: 8, zone: 'main' },
  { name: 'Screech', qty: 8, zone: 'main' }, { name: 'Bird', qty: 12, zone: 'main' }];
function dvGame(seed = 1, manaCheck = true) {
  let s = E.createGame({ format: 'livre', seed, mode: 'assisted', manaCheck, cards: DV_CARDS, scripts: DV_SCRIPTS,
    players: [{ name: 'A', deck: DVDECK }, { name: 'B', deck: DVDECK }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passTo(s, 'main1');
}

test('S26 · delve: exila o cemitério e paga só a mana reduzida', () => {
  let s = dvGame(3); const a = s.turn.active;
  let cruise, island;
  [s, cruise] = put(s, a, 'Cruise', { zone: 'hand' });
  [s, island] = put(s, a, 'Island');
  assert.equal(E.legalActions(s, a).some(x => x.t === 'cast' && x.oid === cruise), false, 'sem cemitério, não dá');
  s = JSON.parse(JSON.stringify(s));
  for (let i = 0; i < 7; i++) { const oid = s.zones[a].library.pop(); s.zones[a].graveyard.push(oid); s.objects[oid].zone = 'graveyard'; }
  const alt = E.legalActions(s, a).find(x => x.t === 'cast' && x.oid === cruise && x.alt === 0);
  assert.ok(alt, 'com sete cartas no cemitério, o delve aparece');
  s = act(s, alt);
  assert.equal(s.zones[a].graveyard.length, 0, 'exilou as sete');
  assert.equal(s.objects[island].tapped, true, 'pagou {U} com a Ilha');
});

test('S26 · lampejo do passado pago virando três criaturas', () => {
  let s = dvGame(4, false); const a = s.turn.active;
  let screech, b1, b2, b3;
  [s, screech] = put(s, a, 'Screech', { zone: 'graveyard' });
  [s, b1] = put(s, a, 'Bird'); [s, b2] = put(s, a, 'Bird');
  assert.equal(E.legalActions(s, a).some(x => x.t === 'cast' && x.oid === screech && x.flashback), false, 'duas criaturas não bastam');
  [s, b3] = put(s, a, 'Bird');
  const fb = E.legalActions(s, a).find(x => x.t === 'cast' && x.oid === screech && x.flashback);
  assert.equal(fb.pay.tapOther.length, 3, 'a mesa sugere quais virar');
  s = resolveSpell(act(s, fb));
  assert.deepEqual([b1, b2, b3].map(x => s.objects[x].tapped), [true, true, true]);
  assert.equal(Object.values(s.objects).filter(o => o.token).length, 2);
  assert.equal(s.objects[screech].zone, 'exile', 'o lampejo exila');
});


/* ---------------- S28 · condição de nome, contagem por subtipo e alvo do oponente ---------------- */
const FAE_CARDS = {
  'Island': COMBAT_CARDS['Island'],
  'Sprite': { name: 'Sprite', type_line: 'Creature — Faerie Wizard', mana_cost: '{1}{U}', cmc: 2, power: '1', toughness: '1', keywords: ['Flying', 'Flash'], oracle_text: 'Flash. Counter target spell with mana value X or less.' },
  'Twin': { name: 'Twin', type_line: 'Creature — Faerie Rogue', mana_cost: '{U}', cmc: 1, power: '1', toughness: '1', keywords: ['Flying'], oracle_text: 'If you control another Twin, draw a card.' },
  'Intruder': { name: 'Intruder', type_line: 'Creature — Human Rogue', mana_cost: '{1}{U}', cmc: 2, power: '2', toughness: '1', keywords: [], oracle_text: 'Target creature an opponent controls gets -2/-0.' },
  'Ogre': { name: 'Ogre', type_line: 'Creature — Ogre', mana_cost: '{3}{R}', cmc: 4, power: '4', toughness: '4', keywords: [], oracle_text: '' }
};
const FAE_SCRIPTS = {
  Sprite: { name: 'Sprite', abilities: [{ kind: 'triggered', when: 'etb', effects: [{ do: 'counter', target: 'spell', targetMvMax: { subtype: 'Faerie' } }] }],
    example: { action: 'etb', target: 'none', expect: { attached: false } } },
  Twin: { name: 'Twin', abilities: [{ kind: 'triggered', when: 'etb', condition: { controlsOtherNamed: true }, effects: [{ do: 'draw', amount: 1 }] }],
    example: { action: 'etb', target: 'none', expect: { attached: false } } },
  Intruder: { name: 'Intruder', abilities: [{ kind: 'triggered', when: 'etb', effects: [{ do: 'pump', power: -2, toughness: 0, target: 'creature-opponent-controls' }] }],
    example: { action: 'etb', target: 'none', expect: { attached: false } } }
};
const FDECK = [{ name: 'Island', qty: 24, zone: 'main' }, { name: 'Sprite', qty: 8, zone: 'main' },
  { name: 'Twin', qty: 8, zone: 'main' }, { name: 'Intruder', qty: 8, zone: 'main' }, { name: 'Ogre', qty: 8, zone: 'main' }];
function faeGame(seed = 1) {
  let s = E.createGame({ format: 'livre', seed, mode: 'assisted', manaCheck: false, cards: FAE_CARDS, scripts: FAE_SCRIPTS,
    players: [{ name: 'A', deck: FDECK }, { name: 'B', deck: FDECK }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passTo(s, 'main1');
}

test('S28 · gatilho só dispara com outra permanente de mesmo nome', () => {
  let s = faeGame(3); const a = s.turn.active;
  let t1, t2;
  [s, t1] = put(s, a, 'Twin', { zone: 'hand' });
  const hand = s.zones[a].hand.length;
  s = settle(resolveSpell(act(s, { t: 'cast', p: a, oid: t1 })));
  assert.equal(s.zones[a].hand.length, hand - 1, 'sozinha, não compra');
  [s, t2] = put(s, a, 'Twin', { zone: 'hand' });
  const hand2 = s.zones[a].hand.length;
  s = settle(resolveSpell(act(s, { t: 'cast', p: a, oid: t2 })));
  assert.equal(s.zones[a].hand.length, hand2 - 1 + 1, 'com a irmã no campo, compra');
});

test('S28 · contagem por subtipo limita o alvo do gatilho', () => {
  let s = faeGame(4); const a = s.turn.active, d = 1 - a;
  let sprite, ogre;
  [s, ogre] = put(s, d, 'Ogre', { zone: 'hand' });
  s = JSON.parse(JSON.stringify(s));
  s.zones[d].hand = s.zones[d].hand.filter(x => x !== ogre); s.stack.push(ogre);
  Object.assign(s.objects[ogre], { zone: 'stack', controller: d });
  [s, sprite] = put(s, a, 'Sprite', { zone: 'hand' });
  s = resolveSpell(act(s, { t: 'cast', p: a, oid: sprite }));
  assert.equal(s.stack.includes(ogre), true, 'uma Faerie no campo não anula uma mágica de valor 4');
  assert.equal(s.pending, null, 'sem alvo legal, o gatilho nem vai para a pilha');
});

test('S28 · alvo restrito a criatura do oponente', () => {
  let s = faeGame(5); const a = s.turn.active, d = 1 - a;
  let intruder, meu, dele;
  [s, meu] = put(s, a, 'Ogre'); [s, dele] = put(s, d, 'Ogre');
  [s, intruder] = put(s, a, 'Intruder', { zone: 'hand' });
  s = settle(resolveSpell(act(s, { t: 'cast', p: a, oid: intruder })));
  assert.equal(s.objects[meu].pump, undefined, 'a sua criatura não é alvo');
  assert.deepEqual([s.objects[dele].pump.p, s.objects[dele].pump.t], [-2, 0]);
});

/* ---------------- S29 · Walls: devolver terreno, uma vez por turno, transmutar e Fog ---------------- */
const WL_CARDS = {
  'Forest': DYN_CARDS['Forest'],
  'Ranger': { name: 'Ranger', type_line: 'Creature — Elf Ranger', mana_cost: '{G}', cmc: 1, power: '1', toughness: '1', keywords: [], oracle_text: 'Return a Forest you control to its owner’s hand: Untap target creature. Activate only once each turn.' },
  'Wall': { name: 'Wall', type_line: 'Creature — Wall', mana_cost: '{1}{G}', cmc: 2, power: '0', toughness: '4', keywords: ['Defender'], oracle_text: 'Defender' },
  'Sentinel': { name: 'Sentinel', type_line: 'Creature — Wall', mana_cost: '{2}', cmc: 2, power: '1', toughness: '3', keywords: ['Defender'], oracle_text: 'Defender. Search for a creature with defender.' },
  'Drifter': { name: 'Drifter', type_line: 'Creature — Spirit', mana_cost: '{2}{U}', cmc: 3, power: '0', toughness: '5', keywords: ['Defender', 'Flying'], oracle_text: 'Transmute {1}{U}{U}' },
  'Bear': { name: 'Bear', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 3, power: '2', toughness: '2', keywords: [], oracle_text: '' },
  'Peace': { name: 'Peace', type_line: 'Instant', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: 'Prevent all combat damage this turn.' }
};
const WL_SCRIPTS = {
  Ranger: { name: 'Ranger', abilities: [{ kind: 'activated', cost: { returnLand: 'Forest' }, oncePerTurn: true, effects: [{ do: 'untap', target: 'creature' }] }],
    example: { action: 'activate:0', target: 'own-creature', expect: { untapped: true } } },
  Sentinel: { name: 'Sentinel', abilities: [{ kind: 'triggered', when: 'etb', effects: [{ do: 'search', amount: 1, filter: { types: ['creature'], keyword: 'defender' }, to: 'hand' }] }],
    example: { action: 'etb', target: 'none', expect: { picked: true } } },
  Drifter: { name: 'Drifter', transmute: { mana: '{1}{U}{U}' }, example: { action: 'transmute', target: 'none', expect: { picked: true } } },
  Peace: { name: 'Peace', effects: [{ do: 'fog' }], example: { target: 'none', expect: { fogged: true } } }
};
const WLDECK = [{ name: 'Forest', qty: 20, zone: 'main' }, { name: 'Ranger', qty: 6, zone: 'main' }, { name: 'Wall', qty: 8, zone: 'main' },
  { name: 'Sentinel', qty: 6, zone: 'main' }, { name: 'Drifter', qty: 6, zone: 'main' }, { name: 'Bear', qty: 8, zone: 'main' }, { name: 'Peace', qty: 6, zone: 'main' }];
function wlGame(seed = 1, manaCheck = false) {
  let s = E.createGame({ format: 'livre', seed, mode: 'assisted', manaCheck, cards: WL_CARDS, scripts: WL_SCRIPTS,
    players: [{ name: 'A', deck: WLDECK }, { name: 'B', deck: WLDECK }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passTo(s, 'main1');
}

test('S29 · devolver Floresta como custo, uma vez por turno', () => {
  let s = wlGame(3); const a = s.turn.active;
  let ranger, wall;
  [s, ranger] = put(s, a, 'Ranger'); [s, wall] = put(s, a, 'Wall', { tapped: true });
  assert.equal(E.legalActions(s, a).some(x => x.t === 'activate' && x.oid === ranger), false, 'sem Floresta, não dá');
  let floresta; [s, floresta] = put(s, a, 'Forest');
  s = resolveSpell(act(s, { t: 'activate', p: a, oid: ranger, index: 0, targets: [{ oid: wall }] }));
  assert.equal(s.objects[floresta].zone, 'hand', 'a Floresta voltou como custo');
  assert.equal(s.objects[wall].tapped, false, 'a criatura desvirou');
  let f2; [s, f2] = put(s, a, 'Forest');
  assert.equal(E.legalActions(s, a).some(x => x.t === 'activate' && x.oid === ranger), false, 'só uma vez por turno');
  assert.throws(() => act(s, { t: 'activate', p: a, oid: ranger, index: 0, targets: [{ oid: wall }] }), /uma vez por turno/);
});

test('S29 · busca filtrada por palavra-chave só oferece criaturas com defensor', () => {
  let s = wlGame(4); const a = s.turn.active;
  let sentinel; [s, sentinel] = put(s, a, 'Sentinel', { zone: 'hand' });
  s = resolveSpell(act(s, { t: 'cast', p: a, oid: sentinel }));
  s = resolveSpell(s);
  assert.equal(s.pending.kind, 'pick');
  assert.ok(s.pending.from.every(oid => ['Wall', 'Sentinel', 'Drifter'].includes(s.objects[oid].name)), 'só criaturas com defensor');
});

test('S29 · transmutar descarta e busca carta de mesmo valor de mana', () => {
  let s = wlGame(5); const a = s.turn.active;
  let drifter; [s, drifter] = put(s, a, 'Drifter', { zone: 'hand' });
  assert.ok(E.legalActions(s, a).some(x => x.t === 'transmute' && x.oid === drifter));
  s = act(s, { t: 'transmute', p: a, oid: drifter });
  assert.equal(s.objects[drifter].zone, 'graveyard');
  assert.equal(s.pending.kind, 'pick');
  assert.ok(s.pending.from.every(oid => (s.facts[s.objects[oid].name].cmc || 0) === 3), 'só cartas de valor 3');
});

test('S29 · Fog previne todo o dano de combate do turno', () => {
  let s = wlGame(6); const a = s.turn.active, d = 1 - a;
  let bear, peace;
  [s, bear] = put(s, a, 'Bear');
  [s, peace] = put(s, a, 'Peace', { zone: 'hand' });
  s = resolveSpell(act(s, { t: 'cast', p: a, oid: peace }));
  assert.equal(s.fogged, true);
  s = passTo(s, 'combat_attackers');
  s = act(s, { t: 'attack', p: a, attackers: [bear] });
  s = settle(passTo(s, 'combat_end'));
  assert.equal(s.players[d].life, 20, 'nenhum dano de combate passou');
});

/* ---------------- S30 · prevenção por cor, Flagbearer e custo de revelar ---------------- */
const BB_CARDS = {
  'Plains': DFC_CARDS['Plains'],
  'Strands': { name: 'Strands', type_line: 'Instant', mana_cost: '{2}{W}', colors: ['W'], keywords: [], oracle_text: 'Prevent all damage that sources of the color of your choice would deal this turn.' },
  'Bearer': { name: 'Bearer', type_line: 'Creature — Human Flagbearer', mana_cost: '{1}{W}', colors: ['W'], power: '1', toughness: '1', keywords: [], oracle_text: 'Flagbearer' },
  'Martyr': { name: 'Martyr', type_line: 'Creature — Human Cleric', mana_cost: '{W}', colors: ['W'], power: '1', toughness: '1', keywords: [], oracle_text: '{1}, Reveal X white cards, Sacrifice: gain three times X life.' },
  'RedBolt': { name: 'RedBolt', type_line: 'Instant', mana_cost: '{R}', colors: ['R'], keywords: [], oracle_text: 'Deals 3 damage to any target.' },
  'RedGoblin': { name: 'RedGoblin', type_line: 'Creature — Goblin', mana_cost: '{R}', colors: ['R'], power: '2', toughness: '2', keywords: [], oracle_text: '' },
  'WhiteBear': { name: 'WhiteBear', type_line: 'Creature — Bear', mana_cost: '{1}{W}', colors: ['W'], power: '2', toughness: '2', keywords: [], oracle_text: '' }
};
const BB_SCRIPTS = {
  Strands: { name: 'Strands', choose: 'color', effects: [{ do: 'prevent_color' }], example: { target: 'none', expect: { preventedColor: true } } },
  Bearer: { name: 'Bearer', staticRule: 'flagbearer', example: { action: 'etb', target: 'none', expect: { attached: false } } },
  Martyr: { name: 'Martyr', abilities: [{ kind: 'activated', cost: { mana: '{1}', sacrifice: true, revealColor: 'W' }, effects: [{ do: 'gain_per_revealed', times: 3 }] }],
    example: { action: 'activate:0', target: 'none', expect: { selfLife: 0 } } },
  RedBolt: { name: 'RedBolt', effects: [{ do: 'damage', amount: 3, target: 'any' }], example: { target: 'opponent', expect: { opponentLife: -3 } } }
};
const BBDECK = [{ name: 'Plains', qty: 20, zone: 'main' }, { name: 'Strands', qty: 6, zone: 'main' }, { name: 'Bearer', qty: 6, zone: 'main' },
  { name: 'Martyr', qty: 6, zone: 'main' }, { name: 'RedBolt', qty: 8, zone: 'main' }, { name: 'RedGoblin', qty: 8, zone: 'main' }, { name: 'WhiteBear', qty: 6, zone: 'main' }];
function bbGame(seed = 1) {
  let s = E.createGame({ format: 'livre', seed, mode: 'assisted', manaCheck: false, cards: BB_CARDS, scripts: BB_SCRIPTS,
    players: [{ name: 'A', deck: BBDECK }, { name: 'B', deck: BBDECK }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passTo(s, 'main1');
}

test('S30 · prevenção por cor barra mágica e combate daquela cor, e só naquele turno', () => {
  let s = bbGame(3); const a = s.turn.active, d = 1 - a;
  let strands; [s, strands] = put(s, a, 'Strands', { zone: 'hand' });
  s = resolveSpell(act(s, { t: 'cast', p: a, oid: strands }));
  assert.deepEqual({ kind: s.pending.kind, p: s.pending.p }, { kind: 'choose_color', p: a }, 'a mágica pede a cor ao resolver');
  s = act(s, { t: 'choose_color', p: a, color: 'R' });
  assert.deepEqual(JSON.parse(JSON.stringify(s.preventedColors)), ['R']);

  // dano de mágica vermelha não passa (o oponente conjura com a prioridade dele)
  let bolt; [s, bolt] = put(s, d, 'RedBolt', { zone: 'hand' });
  s = act(s, { t: 'pass', p: a });
  s = resolveSpell(act(s, { t: 'cast', p: d, oid: bolt, targets: [{ player: a }] }));
  assert.equal(s.players[a].life, 20, 'o dano vermelho foi prevenido');

  // dano de combate de criatura vermelha também não
  let goblin; [s, goblin] = put(s, d, 'RedGoblin');
  let t2 = JSON.parse(JSON.stringify(s)); t2.turn.active = d; t2.turn.priority = d;
  t2 = passTo(t2, 'combat_attackers');
  t2 = act(t2, { t: 'attack', p: d, attackers: [goblin] });
  t2 = settle(passTo(t2, 'combat_end'));
  assert.equal(t2.players[a].life, 20, 'o goblin vermelho não causou dano');

  // e a prevenção some na limpeza
  let t3 = s; for (let i = 0; i < 40 && t3.turn.number === s.turn.number; i++) {
    t3 = t3.pending && t3.pending.kind === 'discard' ? act(t3, { t: 'discard', p: t3.pending.p, oid: t3.zones[t3.pending.p].hand[0] })
      : t3.pending && t3.pending.kind === 'attackers' ? act(t3, { t: 'attack', p: t3.pending.p, attackers: [] })
        : t3.pending && t3.pending.kind === 'blockers' ? act(t3, { t: 'block', p: t3.pending.p, blocks: [] })
          : act(t3, { t: 'pass', p: t3.turn.priority });
  }
  assert.equal(t3.preventedColors, undefined, 'a prevenção não atravessa o turno');
});

test('S30 · Flagbearer obriga o oponente a mirar nele quando há alvo legal', () => {
  let s = bbGame(4); const a = s.turn.active, d = 1 - a;
  let bearer, outra, bolt;
  [s, bearer] = put(s, d, 'Bearer'); [s, outra] = put(s, d, 'WhiteBear');
  [s, bolt] = put(s, a, 'RedBolt', { zone: 'hand' });
  const alvos = JSON.parse(JSON.stringify(E.legalTargets(s, a, 'any', bolt))).map(x => x.oid).filter(Boolean);
  assert.deepEqual(alvos, [bearer], 'só o Flagbearer é oferecido');
  assert.throws(() => act(s, { t: 'cast', p: a, oid: bolt, targets: [{ oid: outra }] }), /alvo ilegal/);

  // o dono do Flagbearer não é obrigado
  let meuBolt; [s, meuBolt] = put(s, d, 'RedBolt', { zone: 'hand' });
  const seus = JSON.parse(JSON.stringify(E.legalTargets(s, d, 'any', meuBolt))).map(x => x.oid).filter(Boolean);
  assert.ok(seus.includes(outra), 'quem controla o Flagbearer mira livremente');
});

test('S30 · custo de revelar cartas brancas define a vida ganha', () => {
  let s = bbGame(5); const a = s.turn.active;
  let martyr; [s, martyr] = put(s, a, 'Martyr');
  s = JSON.parse(JSON.stringify(s));
  s.zones[a].hand = []; // mão controlada: duas brancas e uma vermelha
  for (const nome of ['WhiteBear', 'Strands', 'RedGoblin']) {
    const oid = s.zones[a].library.find(x => s.objects[x].name === nome);
    s.zones[a].library = s.zones[a].library.filter(x => x !== oid);
    s.zones[a].hand.push(oid); s.objects[oid].zone = 'hand';
  }
  const vida = s.players[a].life;
  s = resolveSpell(act(s, { t: 'activate', p: a, oid: martyr, index: 0 }));
  assert.equal(s.players[a].life, vida + 6, 'duas cartas brancas viram 6 de vida');
  assert.equal(s.objects[martyr].zone, 'graveyard', 'sacrificada no custo');
  assert.equal(s.zones[a].hand.length, 3, 'revelar não descarta');
});

/* ---------------- S31 · cancelar prevenção, alvos distintos e contagem multiplicada ---------------- */
const FP_CARDS = {
  'Plains': DFC_CARDS['Plains'],
  'Pain': { name: 'Pain', type_line: 'Instant', mana_cost: '{1}{R}', colors: ['R'], keywords: [], oracle_text: "Damage can't be prevented this turn." },
  'Shield': { name: 'Shield', type_line: 'Instant', mana_cost: '{2}{W}', colors: ['W'], keywords: [], oracle_text: 'Prevent damage from a chosen color.' },
  'RedBolt': BB_CARDS['RedBolt'],
  'Charm': { name: 'Charm', type_line: 'Instant', mana_cost: '{1}{W}', colors: ['W'], keywords: [], oracle_text: 'Damage equal to twice your creatures.' },
  'Bear': { name: 'Bear', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, power: '2', toughness: '2', keywords: [], oracle_text: '' },
  'Rock': { name: 'Rock', type_line: 'Artifact', mana_cost: '{2}', cmc: 2, keywords: [], oracle_text: '' },
  'Twin': { name: 'Twin', type_line: 'Sorcery', mana_cost: '{1}{W}{W}', colors: ['W'], keywords: [], oracle_text: 'Exile two target artifacts.' }
};
const FP_SCRIPTS = {
  Pain: { name: 'Pain', effects: [{ do: 'no_prevention' }], example: { target: 'none', expect: { noPrevention: true } } },
  Shield: { name: 'Shield', choose: 'color', effects: [{ do: 'prevent_color' }], example: { target: 'none', expect: { preventedColor: true } } },
  RedBolt: BB_SCRIPTS['RedBolt'],
  Charm: { name: 'Charm', effects: [{ do: 'damage', amount: { per: 'creatures-you-control', times: 2 }, target: 'creature' }],
    example: { target: 'enemy-creature', expect: { damaged: true } } },
  Twin: { name: 'Twin', effects: [{ do: 'exile', target: 'artifact' }, { do: 'exile', target: 'artifact' }],
    example: { target: 'enemy-permanent', expect: { gone: true } } }
};
const FPDECK = [{ name: 'Plains', qty: 18, zone: 'main' }, { name: 'Pain', qty: 6, zone: 'main' }, { name: 'Shield', qty: 6, zone: 'main' },
  { name: 'RedBolt', qty: 8, zone: 'main' }, { name: 'Charm', qty: 6, zone: 'main' }, { name: 'Bear', qty: 8, zone: 'main' },
  { name: 'Rock', qty: 8, zone: 'main' }, { name: 'Twin', qty: 6, zone: 'main' }];
function fpGame(seed = 1) {
  let s = E.createGame({ format: 'livre', seed, mode: 'assisted', manaCheck: false, cards: FP_CARDS, scripts: FP_SCRIPTS,
    players: [{ name: 'A', deck: FPDECK }, { name: 'B', deck: FPDECK }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passTo(s, 'main1');
}

test('S31 · cancelar a prevenção faz o dano da cor escudada voltar a passar', () => {
  let s = fpGame(3); const a = s.turn.active, d = 1 - a;
  let shield; [s, shield] = put(s, d, 'Shield', { zone: 'hand' });
  s = act(s, { t: 'pass', p: a });
  s = resolveSpell(act(s, { t: 'cast', p: d, oid: shield }));
  s = act(s, { t: 'choose_color', p: d, color: 'R' });
  assert.deepEqual(JSON.parse(JSON.stringify(s.preventedColors)), ['R']);

  let bolt1; [s, bolt1] = put(s, a, 'RedBolt', { zone: 'hand' });
  s = resolveSpell(act(s, { t: 'cast', p: a, oid: bolt1, targets: [{ player: d }] }));
  assert.equal(s.players[d].life, 20, 'com o escudo, o dano vermelho não passa');

  let pain; [s, pain] = put(s, a, 'Pain', { zone: 'hand' });
  s = resolveSpell(act(s, { t: 'cast', p: a, oid: pain }));
  assert.equal(s.noPrevention, true);
  let bolt2; [s, bolt2] = put(s, a, 'RedBolt', { zone: 'hand' });
  s = resolveSpell(act(s, { t: 'cast', p: a, oid: bolt2, targets: [{ player: d }] }));
  assert.equal(s.players[d].life, 17, 'com a prevenção cancelada, o dano passa');
});

test('S31 · mágica de dois alvos exige alvos diferentes', () => {
  let s = fpGame(4); const a = s.turn.active, d = 1 - a;
  let r1, r2, twin;
  [s, r1] = put(s, d, 'Rock'); [s, r2] = put(s, d, 'Rock');
  [s, twin] = put(s, a, 'Twin', { zone: 'hand' });
  const opcoes = JSON.parse(JSON.stringify(E.legalActions(s, a))).filter(x => x.t === 'cast' && x.oid === twin);
  assert.ok(opcoes.length > 0, 'a mesa oferece a conjuração');
  assert.ok(opcoes.every(x => x.targets[0].oid !== x.targets[1].oid), 'nenhuma opção repete o mesmo alvo');
  assert.throws(() => act(s, { t: 'cast', p: a, oid: twin, targets: [{ oid: r1 }, { oid: r1 }] }), /alvo/);
  s = resolveSpell(act(s, { t: 'cast', p: a, oid: twin, targets: [{ oid: r1 }, { oid: r2 }] }));
  assert.deepEqual([s.objects[r1].zone, s.objects[r2].zone], ['exile', 'exile']);
});

test('S31 · contagem multiplicada: dano igual ao dobro das suas criaturas', () => {
  let s = fpGame(5); const a = s.turn.active, d = 1 - a;
  let b1, b2, alvo, charm;
  [s, b1] = put(s, a, 'Bear'); [s, b2] = put(s, a, 'Bear'); [s, alvo] = put(s, d, 'Bear');
  [s, charm] = put(s, a, 'Charm', { zone: 'hand' });
  s = resolveSpell(act(s, { t: 'cast', p: a, oid: charm, targets: [{ oid: alvo }] }));
  assert.equal(s.objects[alvo].zone, 'graveyard', 'duas criaturas suas viram 4 de dano num 2/2');
});

/* ---------------- S32 · devoção, sacrifício e exílio do cemitério como custo ---------------- */
const EJ_CARDS = {
  'Forest': DYN_CARDS['Forest'],
  'Disciple': { name: 'Disciple', type_line: 'Creature — Centaur Archer', mana_cost: '{2}{G}{G}', cmc: 4, power: '3', toughness: '3', keywords: [], oracle_text: 'You gain life equal to your devotion to green.' },
  'Elf': { name: 'Elf', type_line: 'Creature — Elf Warrior', mana_cost: '{G}', cmc: 1, power: '1', toughness: '1', keywords: [], oracle_text: '' },
  'Spy': { name: 'Spy', type_line: 'Creature — Phyrexian Human', mana_cost: '{1}{B}', cmc: 2, power: '2', toughness: '1', keywords: [], oracle_text: 'Whenever you sacrifice another permanent, put a +1/+1 counter on this creature.' },
  'Munitions': { name: 'Munitions', type_line: 'Enchantment', mana_cost: '{1}{R}', cmc: 2, keywords: [], oracle_text: '{1}, Sacrifice an artifact or creature: 1 damage.' },
  'Vandal': { name: 'Vandal', type_line: 'Creature — Shapeshifter', mana_cost: '{1}{G}', cmc: 2, power: '1', toughness: '3', keywords: [], oracle_text: 'Exile a creature card from your graveyard: exile target artifact or enchantment an opponent controls.' },
  'Rock': { name: 'Rock', type_line: 'Artifact', mana_cost: '{2}', cmc: 2, keywords: [], oracle_text: '' }
};
const EJ_SCRIPTS = {
  Disciple: { name: 'Disciple', abilities: [{ kind: 'triggered', when: 'etb', effects: [{ do: 'gain', amount: { per: 'devotion-G' } }] }],
    example: { action: 'etb', target: 'none', expect: { attached: false } } },
  Spy: { name: 'Spy', abilities: [{ kind: 'triggered', when: 'other-sacrificed', effects: [{ do: 'counters', amount: 1, target: 'self-source' }] }],
    example: { action: 'etb', target: 'none', expect: { attached: false } } },
  Munitions: { name: 'Munitions', abilities: [{ kind: 'activated', cost: { mana: '{1}', sacrificeOther: { types: ['artifact', 'creature'] } }, effects: [{ do: 'damage', amount: 1, target: 'any' }] }],
    example: { action: 'activate:0', target: 'opponent', expect: { opponentLife: -1 } } },
  Vandal: { name: 'Vandal', abilities: [{ kind: 'triggered', when: 'etb', cost: { exileFromGraveyard: { types: ['creature'] } },
    effects: [{ do: 'exile', target: 'artifact-enchantment-opponent-controls' }] }],
    example: { action: 'etb', target: 'none', expect: { attached: false } } }
};
const EJDECK = [{ name: 'Forest', qty: 18, zone: 'main' }, { name: 'Disciple', qty: 6, zone: 'main' }, { name: 'Elf', qty: 10, zone: 'main' },
  { name: 'Spy', qty: 6, zone: 'main' }, { name: 'Munitions', qty: 6, zone: 'main' }, { name: 'Vandal', qty: 6, zone: 'main' }, { name: 'Rock', qty: 8, zone: 'main' }];
function ejGame(seed = 1) {
  let s = E.createGame({ format: 'livre', seed, mode: 'assisted', manaCheck: false, cards: EJ_CARDS, scripts: EJ_SCRIPTS,
    players: [{ name: 'A', deck: EJDECK }, { name: 'B', deck: EJDECK }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passTo(s, 'main1');
}

test('S32 · devoção conta os símbolos verdes das suas permanentes', () => {
  let s = ejGame(3); const a = s.turn.active;
  let e1, e2, disc;
  [s, e1] = put(s, a, 'Elf'); [s, e2] = put(s, a, 'Elf');
  const vida = s.players[a].life;
  [s, disc] = put(s, a, 'Disciple', { zone: 'hand' });
  s = settle(resolveSpell(act(s, { t: 'cast', p: a, oid: disc })));
  // dois Elfos ({G} cada) mais o próprio Disciple ({G}{G}) = devoção 4
  assert.equal(s.players[a].life, vida + 4);
});

test('S32 · sacrificar outra permanente dispara o gatilho e paga o custo', () => {
  let s = ejGame(4); const a = s.turn.active, d = 1 - a;
  let spy, mun, rock;
  [s, spy] = put(s, a, 'Spy'); [s, mun] = put(s, a, 'Munitions'); [s, rock] = put(s, a, 'Rock');
  const acao = E.legalActions(s, a).find(x => x.t === 'activate' && x.oid === mun && x.targets && x.targets[0].player === d);
  assert.ok(acao && acao.pay && acao.pay.sacrifice, 'a mesa oferece a habilidade com o sacrifício sugerido');
  // sacrifica o artefato, não a própria criatura que observa sacrifícios
  s = settle(resolveSpell(act(s, { ...acao, pay: { sacrifice: rock } })));
  assert.equal(s.players[d].life, 19, 'causou 1 de dano');
  assert.equal(s.objects[rock].zone, 'graveyard', 'o artefato foi sacrificado');
  assert.equal(s.objects[spy].counters.p1p1, 1, 'o gatilho de sacrifício deu um marcador');

  // sacrificar a própria criatura que observa não dispara o gatilho dela
  let s2 = ejGame(4); const a2 = s2.turn.active, d2 = 1 - a2;
  let spy2, mun2;
  [s2, spy2] = put(s2, a2, 'Spy'); [s2, mun2] = put(s2, a2, 'Munitions');
  s2 = settle(resolveSpell(act(s2, { t: 'activate', p: a2, oid: mun2, index: 0, targets: [{ player: d2 }], pay: { sacrifice: spy2 } })));
  assert.equal(s2.objects[spy2].zone, 'graveyard');
  assert.equal(s2.stack.length, 0, 'nenhum gatilho ficou pendente');
});

test('S32 · gatilho com custo de exilar do cemitério: sem carta, ele não acontece', () => {
  let s = ejGame(5); const a = s.turn.active, d = 1 - a;
  let vandal, rock;
  [s, rock] = put(s, d, 'Rock');
  [s, vandal] = put(s, a, 'Vandal', { zone: 'hand' });
  const semCemiterio = settle(resolveSpell(act(s, { t: 'cast', p: a, oid: vandal })));
  assert.equal(semCemiterio.objects[rock].zone, 'battlefield', 'sem criatura no cemitério, nada é exilado');

  let s2 = ejGame(5); const a2 = s2.turn.active, d2 = 1 - a2;
  let rock2, vandal2, morta;
  [s2, rock2] = put(s2, d2, 'Rock');
  [s2, morta] = put(s2, a2, 'Elf', { zone: 'graveyard' });
  [s2, vandal2] = put(s2, a2, 'Vandal', { zone: 'hand' });
  s2 = settle(resolveSpell(act(s2, { t: 'cast', p: a2, oid: vandal2 })));
  assert.equal(s2.objects[morta].zone, 'exile', 'a criatura do cemitério foi exilada como custo');
  assert.equal(s2.objects[rock2].zone, 'exile', 'o artefato do oponente foi exilado');
});

/* ---------------- S33 · afinidade, adaptar, marcadores e terceira compra ---------------- */
const AF_CARDS = {
  'Island': COMBAT_CARDS['Island'],
  'Familiar': { name: 'Familiar', type_line: 'Artifact Creature — Rat', mana_cost: '{4}', cmc: 4, power: '2', toughness: '1', keywords: ['Flying'], oracle_text: 'Affinity for artifacts' },
  'Rock': { name: 'Rock', type_line: 'Artifact', mana_cost: '{2}', cmc: 2, keywords: [], oracle_text: '' },
  'Witness': { name: 'Witness', type_line: 'Creature — Elf Shaman Mutant', mana_cost: '{1}{G}', cmc: 2, power: '2', toughness: '1', keywords: [], oracle_text: 'Adapt 2.' },
  'Snacker': { name: 'Snacker', type_line: 'Creature — Faerie Rogue', mana_cost: '{1}{B}', cmc: 2, power: '2', toughness: '1', keywords: ['Flying'], oracle_text: 'When you draw your third card in a turn, return from graveyard tapped.' },
  'Bear': { name: 'Bear', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, power: '2', toughness: '2', keywords: [], oracle_text: '' }
};
const AF_SCRIPTS = {
  Familiar: { name: 'Familiar', affinity: 'artifact', example: { action: 'etb', target: 'none', expect: { attached: false } } },
  Witness: { name: 'Witness', abilities: [
    { kind: 'activated', cost: { mana: '{1}{G}' }, adapt: 2, effects: [] },
    { kind: 'triggered', when: 'counters-added', effects: [{ do: 'to_hand', target: 'permanent-in-your-graveyard' }] }],
    example: { action: 'activate:0', target: 'none', expect: { counters: 2 } } },
  Snacker: { name: 'Snacker', abilities: [{ kind: 'triggered', when: 'third-draw', fromGraveyard: true, effects: [{ do: 'reanimate_tapped', target: 'self-source' }] }],
    example: { action: 'etb', target: 'none', expect: { attached: false } } }
};
const AFDECK = [{ name: 'Island', qty: 24, zone: 'main' }, { name: 'Familiar', qty: 6, zone: 'main' }, { name: 'Rock', qty: 10, zone: 'main' },
  { name: 'Witness', qty: 6, zone: 'main' }, { name: 'Snacker', qty: 6, zone: 'main' }, { name: 'Bear', qty: 8, zone: 'main' }];
function afGame(seed = 1, manaCheck = true) {
  let s = E.createGame({ format: 'livre', seed, mode: 'assisted', manaCheck, cards: AF_CARDS, scripts: AF_SCRIPTS,
    players: [{ name: 'A', deck: AFDECK }, { name: 'B', deck: AFDECK }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passTo(s, 'main1');
}

test('S33 · afinidade desconta um genérico por artefato seu', () => {
  let s = afGame(3); const a = s.turn.active;
  let fam; [s, fam] = put(s, a, 'Familiar', { zone: 'hand' });
  for (let i = 0; i < 2; i++) { let l; [s, l] = put(s, a, 'Island'); }
  assert.equal(E.legalActions(s, a).some(x => x.t === 'cast' && x.oid === fam), false, 'dois terrenos não pagam {4}');
  let r1, r2; [s, r1] = put(s, a, 'Rock'); [s, r2] = put(s, a, 'Rock');
  assert.ok(E.legalActions(s, a).some(x => x.t === 'cast' && x.oid === fam), 'dois artefatos descontam dois genéricos');
});

test('S33 · adaptar só age sem marcadores, e pôr marcadores dispara o gatilho', () => {
  let s = afGame(4, false); const a = s.turn.active;
  let witness, morta;
  [s, witness] = put(s, a, 'Witness');
  [s, morta] = put(s, a, 'Rock', { zone: 'graveyard' });
  s = act(s, { t: 'activate', p: a, oid: witness, index: 0 });
  assert.equal(s.objects[witness].counters.p1p1, 2, 'adaptou 2');
  s = settle(s);
  assert.equal(s.objects[morta].zone, 'hand', 'o gatilho de marcadores devolveu a permanente do cemitério');

  const antes = s.objects[witness].counters.p1p1;
  s = settle(act(s, { t: 'activate', p: a, oid: witness, index: 0 }));
  assert.equal(s.objects[witness].counters.p1p1, antes, 'com marcadores, adaptar não faz nada');
});

test('S33 · terceira compra do turno traz a criatura do cemitério, virada', () => {
  let s = afGame(5, false); const a = s.turn.active;
  let snacker; [s, snacker] = put(s, a, 'Snacker', { zone: 'graveyard' });
  s = JSON.parse(JSON.stringify(s)); s.players[a].drawnThisTurn = 0;
  s = act(s, { t: 'draw', p: a, n: 2 });
  assert.equal(s.objects[snacker].zone, 'graveyard', 'duas compras não bastam');
  s = settle(act(s, { t: 'draw', p: a, n: 1 }));
  assert.equal(s.objects[snacker].zone, 'battlefield', 'na terceira, ela volta');
  assert.equal(s.objects[snacker].tapped, true, 'volta virada');
});

/* ---------------- S34 · tempestade, conceder e metamorfo ---------------- */
const ST_CARDS = {
  'Forest': DYN_CARDS['Forest'],
  'Storm': { name: 'Storm', type_line: 'Instant', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: 'You gain 3 life. Storm.' },
  'Cantrip': { name: 'Cantrip', type_line: 'Instant', mana_cost: '{U}', cmc: 1, keywords: [], oracle_text: 'Draw a card.' },
  'Hydra': { name: 'Hydra', type_line: 'Creature Enchantment — Hydra', mana_cost: '{X}{G}', cmc: 1, power: '0', toughness: '0', keywords: [], oracle_text: 'Bestow. Reach, trample.' },
  'Elf': { name: 'Elf', type_line: 'Creature — Elf Warrior', mana_cost: '{G}', cmc: 1, power: '1', toughness: '1', keywords: [], oracle_text: '' },
  'Shifter': { name: 'Shifter', type_line: 'Creature — Shapeshifter', mana_cost: '{1}{G}', cmc: 2, power: '1', toughness: '3', keywords: [], oracle_text: 'Changeling' },
  'Chief': { name: 'Chief', type_line: 'Creature — Elf Warrior', mana_cost: '{3}{G}', cmc: 4, power: '2', toughness: '2', keywords: [], oracle_text: 'Whenever another Elf enters, gain 1 life.' }
};
const ST_SCRIPTS = {
  Storm: { name: 'Storm', storm: true, effects: [{ do: 'gain', amount: 3 }], example: { target: 'none', expect: { selfLife: 3 } } },
  Cantrip: { name: 'Cantrip', effects: [{ do: 'draw', amount: 1 }], example: { target: 'none', expect: { handDelta: 1 } } },
  Hydra: { name: 'Hydra', bestow: { mana: '{2}{G}' }, grants: { power: 1, toughness: 1, keywords: ['reach', 'trample'] }, self: { entersWithCounters: 1 },
    example: { action: 'bestow', target: 'own-creature', expect: { attached: true } } },
  Shifter: { name: 'Shifter', changeling: true, example: { action: 'etb', target: 'none', expect: { attached: false } } },
  Chief: { name: 'Chief', abilities: [{ kind: 'triggered', when: 'other-etb', filter: { types: ['creature'], subtype: 'Elf' }, effects: [{ do: 'gain', amount: 1 }] }],
    example: { action: 'etb', target: 'none', expect: { attached: false } } }
};
const STDECK = [{ name: 'Forest', qty: 18, zone: 'main' }, { name: 'Storm', qty: 6, zone: 'main' }, { name: 'Cantrip', qty: 8, zone: 'main' },
  { name: 'Hydra', qty: 6, zone: 'main' }, { name: 'Elf', qty: 8, zone: 'main' }, { name: 'Shifter', qty: 6, zone: 'main' }, { name: 'Chief', qty: 6, zone: 'main' }];
function stGame(seed = 1) {
  let s = E.createGame({ format: 'livre', seed, mode: 'assisted', manaCheck: false, cards: ST_CARDS, scripts: ST_SCRIPTS,
    players: [{ name: 'A', deck: STDECK }, { name: 'B', deck: STDECK }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passTo(s, 'main1');
}

test('S34 · tempestade copia a mágica uma vez por mágica conjurada antes no turno', () => {
  let s = stGame(3); const a = s.turn.active;
  let c1, c2, storm;
  [s, c1] = put(s, a, 'Cantrip', { zone: 'hand' }); [s, c2] = put(s, a, 'Cantrip', { zone: 'hand' });
  [s, storm] = put(s, a, 'Storm', { zone: 'hand' });
  s = resolveSpell(act(s, { t: 'cast', p: a, oid: c1 }));
  s = resolveSpell(act(s, { t: 'cast', p: a, oid: c2 }));
  const vida = s.players[a].life;
  s = resolveSpell(act(s, { t: 'cast', p: a, oid: storm }));
  assert.equal(s.players[a].life, vida + 9, 'duas cópias mais a original: 3 vezes 3 de vida');
});

test('S34 · a contagem de tempestade zera a cada turno', () => {
  let s = stGame(4); const a = s.turn.active;
  let c1; [s, c1] = put(s, a, 'Cantrip', { zone: 'hand' });
  s = resolveSpell(act(s, { t: 'cast', p: a, oid: c1 }));
  assert.equal(s.spellsThisTurn, 1);
  let t = s; for (let i = 0; i < 40 && t.turn.number === s.turn.number; i++) {
    t = t.pending && t.pending.kind === 'discard' ? act(t, { t: 'discard', p: t.pending.p, oid: t.zones[t.pending.p].hand[0] })
      : t.pending && t.pending.kind === 'attackers' ? act(t, { t: 'attack', p: t.pending.p, attackers: [] })
        : t.pending && t.pending.kind === 'blockers' ? act(t, { t: 'block', p: t.pending.p, blocks: [] })
          : act(t, { t: 'pass', p: t.turn.priority });
  }
  assert.equal(t.spellsThisTurn, 0, 'novo turno, contagem zerada');
});

test('S34 · conceder: entra como aura e dá bônus, em vez de entrar como criatura', () => {
  let s = stGame(5); const a = s.turn.active;
  let elf, hydra;
  [s, elf] = put(s, a, 'Elf');
  [s, hydra] = put(s, a, 'Hydra', { zone: 'hand' });
  const opcao = E.legalActions(s, a).find(x => x.t === 'cast' && x.oid === hydra && x.bestow);
  assert.ok(opcao, 'a mesa oferece conceder');
  s = resolveSpell(act(s, { ...opcao, targets: [{ oid: elf }] }));
  assert.equal(s.objects[hydra].attachedTo, elf, 'entrou anexada');
  const st = E.stats(s, s.objects[elf]);
  assert.deepEqual([st.power, st.toughness], [2, 2], 'o Elfo 1/1 virou 2/2');
  assert.equal(E.hasKeyword(s, s.objects[elf], 'trample'), true);

  // conjurada normalmente, entra como criatura e não dá bônus a ninguém
  let s2 = stGame(6); const a2 = s2.turn.active;
  let elf2, hydra2;
  [s2, elf2] = put(s2, a2, 'Elf'); [s2, hydra2] = put(s2, a2, 'Hydra', { zone: 'hand' });
  s2 = resolveSpell(act(s2, { t: 'cast', p: a2, oid: hydra2 }));
  assert.equal(s2.objects[hydra2].zone, 'battlefield');
  assert.equal(s2.objects[hydra2].counters.p1p1, 1, 'entra com um marcador, então sobrevive');
  assert.equal(s2.objects[hydra2].attachedTo, undefined, 'não está anexada');
  const st2 = E.stats(s2, s2.objects[elf2]);
  assert.deepEqual([st2.power, st2.toughness], [1, 1], 'o Elfo continua 1/1');
});

test('S34 · metamorfo conta como qualquer subtipo de criatura', () => {
  let s = stGame(7); const a = s.turn.active;
  let chief, shifter;
  [s, chief] = put(s, a, 'Chief');
  const vida = s.players[a].life;
  [s, shifter] = put(s, a, 'Shifter', { zone: 'hand' });
  s = settle(resolveSpell(act(s, { t: 'cast', p: a, oid: shifter })));
  assert.equal(s.players[a].life, vida + 1, 'o metamorfo entrou como Elfo e disparou o gatilho');
});

/* ---------------- S35 · gatilho da criatura encantada e alvos de artefato ---------------- */
const CS_CARDS = {
  'Island': COMBAT_CARDS['Island'],
  'Frost': { name: 'Frost', type_line: 'Enchantment — Aura', mana_cost: '{U}', cmc: 1, keywords: [], oracle_text: 'Enchanted creature gets -5/-0. When it becomes tapped or is dealt damage, destroy it.' },
  'Ogre': { name: 'Ogre', type_line: 'Creature — Ogre', mana_cost: '{3}{R}', cmc: 4, power: '4', toughness: '4', keywords: [], oracle_text: '' },
  'Rock': { name: 'Rock', type_line: 'Artifact', mana_cost: '{2}', cmc: 2, keywords: [], oracle_text: '' },
  'Sabotage': { name: 'Sabotage', type_line: 'Instant', mana_cost: '{U}', cmc: 1, keywords: [], oracle_text: 'Counter target artifact spell, or return target artifact to its owner hand.' },
  'Bolt': { name: 'Bolt', type_line: 'Instant', mana_cost: '{R}', cmc: 1, colors: ['R'], keywords: [], oracle_text: 'Deals 3 damage.' }
};
const CS_SCRIPTS = {
  Frost: { name: 'Frost', aura: { enchant: 'creature' }, grants: { power: -5, toughness: 0 },
    abilities: [{ kind: 'triggered', when: 'enchanted-tapped-or-damaged', effects: [{ do: 'destroy', target: 'enchanted-creature' }] }],
    example: { action: 'aura', target: 'own-creature', expect: { stats: [-3, 2] } } },
  Sabotage: { name: 'Sabotage', modes: [
    { label: 'Anular mágica de artefato', effects: [{ do: 'counter', target: 'artifact-spell' }] },
    { label: 'Devolver artefato', effects: [{ do: 'bounce', target: 'artifact' }] }],
    example: { action: 'mode:1', target: 'enemy-permanent', expect: { bounced: true } } },
  Bolt: { name: 'Bolt', effects: [{ do: 'damage', amount: 3, target: 'any' }], example: { target: 'opponent', expect: { opponentLife: -3 } } }
};
const CSDECK = [{ name: 'Island', qty: 24, zone: 'main' }, { name: 'Frost', qty: 6, zone: 'main' }, { name: 'Ogre', qty: 8, zone: 'main' },
  { name: 'Rock', qty: 8, zone: 'main' }, { name: 'Sabotage', qty: 6, zone: 'main' }, { name: 'Bolt', qty: 8, zone: 'main' }];
function csGame(seed = 1) {
  let s = E.createGame({ format: 'livre', seed, mode: 'assisted', manaCheck: false, cards: CS_CARDS, scripts: CS_SCRIPTS,
    players: [{ name: 'A', deck: CSDECK }, { name: 'B', deck: CSDECK }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passTo(s, 'main1');
}

test('S35 · a aura destrói a criatura quando ela vira', () => {
  let s = csGame(3); const a = s.turn.active, d = 1 - a;
  let ogre, frost;
  [s, ogre] = put(s, d, 'Ogre');
  [s, frost] = put(s, a, 'Frost', { zone: 'hand' });
  s = resolveSpell(act(s, { t: 'cast', p: a, oid: frost, targets: [{ oid: ogre }] }));
  assert.equal(s.objects[frost].attachedTo, ogre);
  const st = E.stats(s, s.objects[ogre]);
  assert.deepEqual([st.power, st.toughness], [-1, 4], 'o Ogro 4/4 virou -1/4');
  s = JSON.parse(JSON.stringify(s)); s.turn.priority = a;
  s = settle(act(s, { t: 'tap', p: a, oid: ogre }));
  assert.equal(s.objects[ogre].zone, 'graveyard', 'virou, então foi destruída');
});

test('S35 · a aura destrói a criatura quando ela recebe dano', () => {
  let s = csGame(4); const a = s.turn.active, d = 1 - a;
  let ogre, frost, bolt;
  [s, ogre] = put(s, d, 'Ogre');
  [s, frost] = put(s, a, 'Frost', { zone: 'hand' });
  s = resolveSpell(act(s, { t: 'cast', p: a, oid: frost, targets: [{ oid: ogre }] }));
  [s, bolt] = put(s, a, 'Bolt', { zone: 'hand' });
  s = settle(resolveSpell(act(s, { t: 'cast', p: a, oid: bolt, targets: [{ oid: ogre }] })));
  assert.equal(s.objects[ogre].zone, 'graveyard');
});

test('S35 · alvos de artefato: anular a mágica e devolver a permanente', () => {
  let s = csGame(5); const a = s.turn.active, d = 1 - a;
  let rock, sab;
  [s, rock] = put(s, d, 'Rock');
  [s, sab] = put(s, a, 'Sabotage', { zone: 'hand' });
  s = resolveSpell(act(s, { t: 'cast', p: a, oid: sab, mode: 1, targets: [{ oid: rock }] }));
  assert.equal(s.objects[rock].zone, 'hand', 'o artefato voltou para a mão');

  let s2 = csGame(6); const a2 = s2.turn.active, d2 = 1 - a2;
  let rock2, sab2;
  [s2, rock2] = put(s2, d2, 'Rock', { zone: 'hand' });
  s2 = JSON.parse(JSON.stringify(s2));
  s2.zones[d2].hand = s2.zones[d2].hand.filter(x => x !== rock2); s2.stack.push(rock2);
  Object.assign(s2.objects[rock2], { zone: 'stack', controller: d2 });
  [s2, sab2] = put(s2, a2, 'Sabotage', { zone: 'hand' });
  s2 = resolveSpell(act(s2, { t: 'cast', p: a2, oid: sab2, mode: 0, targets: [{ oid: rock2 }] }));
  assert.equal(s2.objects[rock2].zone, 'graveyard', 'a mágica de artefato foi anulada');
});

/* ---------------- S36 · proteção de várias cores e prevenir o dano de uma mágica ---------------- */
const MK_CARDS = {
  'Plains': DFC_CARDS['Plains'],
  'Mask': { name: 'Mask', type_line: 'Enchantment — Aura', mana_cost: '{W}', cmc: 1, colors: ['W'], keywords: [], oracle_text: 'Enchanted creature has protection from black and from red.' },
  'Hallow': { name: 'Hallow', type_line: 'Instant', mana_cost: '{1}{W}', cmc: 2, colors: ['W'], keywords: [], oracle_text: 'Prevent all damage target spell would deal this turn.' },
  'Bear': { name: 'Bear', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, colors: ['G'], power: '2', toughness: '2', keywords: [], oracle_text: '' },
  'RedBolt': BB_CARDS['RedBolt'],
  'BlackBolt': { name: 'BlackBolt', type_line: 'Instant', mana_cost: '{B}', cmc: 1, colors: ['B'], keywords: [], oracle_text: 'Deals 3 damage to any target.' },
  'BlueBolt': { name: 'BlueBolt', type_line: 'Instant', mana_cost: '{U}', cmc: 1, colors: ['U'], keywords: [], oracle_text: 'Deals 3 damage to any target.' }
};
const MK_SCRIPTS = {
  Mask: { name: 'Mask', aura: { enchant: 'creature' }, grants: { protection: ['B', 'R'] }, example: { action: 'aura', target: 'own-creature', expect: { protected: true } } },
  Hallow: { name: 'Hallow', effects: [{ do: 'prevent_spell', target: 'spell' }], example: { target: 'enemy-instant', expect: { preventedColor: false } } },
  RedBolt: BB_SCRIPTS['RedBolt'],
  BlackBolt: { name: 'BlackBolt', effects: [{ do: 'damage', amount: 3, target: 'any' }], example: { target: 'opponent', expect: { opponentLife: -3 } } },
  BlueBolt: { name: 'BlueBolt', effects: [{ do: 'damage', amount: 3, target: 'any' }], example: { target: 'opponent', expect: { opponentLife: -3 } } }
};
const MKDECK = [{ name: 'Plains', qty: 18, zone: 'main' }, { name: 'Mask', qty: 6, zone: 'main' }, { name: 'Hallow', qty: 6, zone: 'main' },
  { name: 'Bear', qty: 8, zone: 'main' }, { name: 'RedBolt', qty: 8, zone: 'main' }, { name: 'BlackBolt', qty: 8, zone: 'main' }, { name: 'BlueBolt', qty: 8, zone: 'main' }];
function mkGame(seed = 1) {
  let s = E.createGame({ format: 'livre', seed, mode: 'assisted', manaCheck: false, cards: MK_CARDS, scripts: MK_SCRIPTS,
    players: [{ name: 'A', deck: MKDECK }, { name: 'B', deck: MKDECK }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passTo(s, 'main1');
}

test('S36 · proteção de duas cores barra as duas, e deixa a terceira passar', () => {
  let s = mkGame(3); const a = s.turn.active, d = 1 - a;
  let bear, mask;
  [s, bear] = put(s, a, 'Bear');
  [s, mask] = put(s, a, 'Mask', { zone: 'hand' });
  s = resolveSpell(act(s, { t: 'cast', p: a, oid: mask, targets: [{ oid: bear }] }));
  assert.deepEqual(JSON.parse(JSON.stringify(E.protections(s, s.objects[bear]))).sort(), ['B', 'R']);
  // preta e vermelha não podem nem mirar
  for (const nome of ['RedBolt', 'BlackBolt']) {
    let bolt; [s, bolt] = put(s, a, nome, { zone: 'hand' });
    assert.equal(E.legalTargets(s, a, 'any', bolt).some(x => x.oid === bear), false, `${nome} não pode mirar`);
  }
  // azul passa e mata
  let azul; [s, azul] = put(s, a, 'BlueBolt', { zone: 'hand' });
  s = settle(resolveSpell(act(s, { t: 'cast', p: a, oid: azul, targets: [{ oid: bear }] })));
  assert.equal(s.objects[bear].zone, 'graveyard');
});

test('S36 · prevenir o dano de uma mágica da pilha, ganhando essa vida', () => {
  let s = mkGame(4); const a = s.turn.active, d = 1 - a;
  let bolt, hallow;
  [s, bolt] = put(s, d, 'RedBolt', { zone: 'hand' });
  s = JSON.parse(JSON.stringify(s));
  s.zones[d].hand = s.zones[d].hand.filter(x => x !== bolt); s.stack.push(bolt);
  Object.assign(s.objects[bolt], { zone: 'stack', controller: d, targets: [{ player: a }] });
  [s, hallow] = put(s, a, 'Hallow', { zone: 'hand' });
  const vida = s.players[a].life;
  s = resolveSpell(act(s, { t: 'cast', p: a, oid: hallow, targets: [{ oid: bolt }] }));
  assert.equal(s.players[a].life, vida + 3, 'ganhou vida igual ao dano previsto');
  s = resolveSpell(s); // agora o raio resolve
  assert.equal(s.players[a].life, vida + 3, 'o dano do raio não passou');
});

/* ---------------- S37 · exilar cemitérios, descarte escolhido, habilidade da mão e barganha ---------------- */
const BG_CARDS = {
  'Forest': DYN_CARDS['Forest'],
  'Relic': { name: 'Relic', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '{T}: Target player exiles a card from their graveyard. {1}, Exile this artifact: Exile all graveyards. Draw a card.' },
  'Macabre': { name: 'Macabre', type_line: 'Creature — Faerie Rogue', mana_cost: '{1}{B}{B}', cmc: 3, colors: ['B'], power: '2', toughness: '2', keywords: ['Flying'], oracle_text: 'Discard this card: Exile up to two target cards from graveyards.' },
  'Press': { name: 'Press', type_line: 'Sorcery', mana_cost: '{B}', cmc: 1, colors: ['B'], keywords: [], oracle_text: 'Target opponent reveals their hand. You choose a noncreature, nonland card from it. That player discards that card.' },
  'Ouphe': { name: 'Ouphe', type_line: 'Creature — Ouphe', mana_cost: '{1}{G}', cmc: 2, colors: ['G'], power: '2', toughness: '2', keywords: [], oracle_text: 'Bargain. When this creature enters, if it was bargained, exile target artifact or enchantment an opponent controls.' },
  'Rock': { name: 'Rock', type_line: 'Artifact', mana_cost: '{2}', cmc: 2, keywords: [], oracle_text: '' },
  'Bear': { name: 'Bear', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, colors: ['G'], power: '2', toughness: '2', keywords: [], oracle_text: '' }
};
const BG_SCRIPTS = {
  Relic: { name: 'Relic', abilities: [
    { kind: 'activated', cost: { tap: true }, effects: [{ do: 'exile_graveyard', target: 'player' }] },
    { kind: 'activated', cost: { mana: '{1}', exileSelf: true }, effects: [{ do: 'exile_graveyard', target: 'all' }, { do: 'draw', amount: 1 }] }],
    example: { action: 'activate:1', target: 'none', expect: { graveyardEmpty: true, handDelta: 1 } } },
  Macabre: { name: 'Macabre', abilities: [{ kind: 'activated', cost: { discardSelf: true, fromHand: true }, effects: [{ do: 'exile_graveyard', target: 'opponent' }] }],
    example: { action: 'activate:0', target: 'opponent', expect: { graveyardEmpty: true } } },
  Press: { name: 'Press', effects: [{ do: 'discard_chosen', amount: 1, target: 'opponent' }],
    example: { target: 'opponent', expect: { opponentLife: 0 } } },
  Ouphe: { name: 'Ouphe', bargain: true,
    abilities: [{ kind: 'triggered', when: 'etb', condition: { bargained: true }, effects: [{ do: 'exile', target: 'artifact-enchantment-opponent-controls' }] }],
    example: { action: 'etb', target: 'none', expect: { attached: false } } }
};
const BGDECK = [{ name: 'Forest', qty: 16, zone: 'main' }, { name: 'Relic', qty: 8, zone: 'main' }, { name: 'Macabre', qty: 8, zone: 'main' },
  { name: 'Press', qty: 8, zone: 'main' }, { name: 'Ouphe', qty: 8, zone: 'main' }, { name: 'Rock', qty: 8, zone: 'main' }, { name: 'Bear', qty: 8, zone: 'main' }];
function bgGame(seed = 1) {
  let s = E.createGame({ format: 'livre', seed, mode: 'assisted', manaCheck: false, cards: BG_CARDS, scripts: BG_SCRIPTS,
    players: [{ name: 'A', deck: BGDECK }, { name: 'B', deck: BGDECK }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passTo(s, 'main1');
}
function esvaziaMao(s, p) { // devolve a mão para a biblioteca, para o cenário ficar previsível
  s = J(s);
  for (const oid of [...s.zones[p].hand]) { s.zones[p].hand.splice(s.zones[p].hand.indexOf(oid), 1); s.zones[p].library.push(oid); s.objects[oid].zone = 'library'; }
  return s;
}

test('S37 · exilar todos os cemitérios de uma vez, e comprar uma carta', () => {
  let s = bgGame(3); const a = s.turn.active, d = 1 - a;
  let relic, meu, dele;
  [s, relic] = put(s, a, 'Relic');
  [s, meu] = put(s, a, 'Bear', { zone: 'graveyard' });
  [s, dele] = put(s, d, 'Bear', { zone: 'graveyard' });
  const acao = E.legalActions(s, a).find(x => x.t === 'activate' && x.oid === relic && x.index === 1);
  assert.ok(acao, 'a mesa oferece exilar todos os cemitérios');
  const mao = s.zones[a].hand.length;
  s = settle(resolveSpell(act(s, acao)));
  assert.equal(s.objects[meu].zone, 'exile', 'exilou o seu cemitério');
  assert.equal(s.objects[dele].zone, 'exile', 'exilou o cemitério do oponente');
  assert.equal(s.objects[relic].zone, 'exile', 'o próprio artefato foi exilado como custo');
  assert.equal(s.zones[a].hand.length, mao + 1, 'comprou uma carta');
});

test('S37 · o descarte escolhido pula criaturas e terrenos', () => {
  let s = bgGame(4); const a = s.turn.active, d = 1 - a;
  s = esvaziaMao(s, d);
  let bear, forest, alvo, press;
  [s, bear] = put(s, d, 'Bear', { zone: 'hand' });
  [s, forest] = put(s, d, 'Forest', { zone: 'hand' });
  [s, alvo] = put(s, d, 'Press', { zone: 'hand' });
  [s, press] = put(s, a, 'Press', { zone: 'hand' });
  s = settle(resolveSpell(act(s, { t: 'cast', p: a, oid: press, targets: [{ player: d }] })));
  assert.equal(s.objects[alvo].zone, 'graveyard', 'descartou a carta que não é criatura nem terreno');
  assert.equal(s.objects[bear].zone, 'hand', 'a criatura ficou na mão');
  assert.equal(s.objects[forest].zone, 'hand', 'o terreno ficou na mão');
});

test('S37 · descartar esta carta é habilidade da mão, e não funciona do campo', () => {
  let s = bgGame(5); const a = s.turn.active, d = 1 - a;
  let mac, morta;
  [s, morta] = put(s, d, 'Bear', { zone: 'graveyard' });
  [s, mac] = put(s, a, 'Macabre', { zone: 'hand' });
  const acao = E.legalActions(s, a).find(x => x.t === 'activate' && x.oid === mac && x.fromHand && x.targets && x.targets[0].player === d);
  assert.ok(acao, 'a mesa oferece a habilidade com a carta na mão');
  const feito = settle(resolveSpell(act(s, acao)));
  assert.equal(feito.objects[mac].zone, 'graveyard', 'a carta foi descartada como custo');
  assert.equal(feito.objects[morta].zone, 'exile', 'o cemitério do oponente foi exilado');

  // a mesma habilidade não existe com a carta no campo de batalha
  let s2 = bgGame(5); const a2 = s2.turn.active, d2 = 1 - a2;
  let mac2; [s2, mac2] = put(s2, a2, 'Macabre');
  assert.equal(E.legalActions(s2, a2).some(x => x.t === 'activate' && x.oid === mac2), false, 'no campo ela não é oferecida');
  assert.throws(() => act(s2, { t: 'activate', p: a2, oid: mac2, index: 0, targets: [{ player: d2 }] }), /mão/);
});

test('S37 · barganha: o gatilho só acontece se algo foi sacrificado ao conjurar', () => {
  let s = bgGame(6); const a = s.turn.active, d = 1 - a;
  let ouphe, rockDele;
  [s, rockDele] = put(s, d, 'Rock');
  [s, ouphe] = put(s, a, 'Ouphe', { zone: 'hand' });
  const simples = settle(resolveSpell(act(s, { t: 'cast', p: a, oid: ouphe })));
  assert.equal(simples.objects[rockDele].zone, 'battlefield', 'sem barganha, nada é exilado');
  assert.throws(() => act(s, { t: 'cast', p: a, oid: ouphe, bargain: true }), /sacrifique/);

  let s2 = bgGame(6); const a2 = s2.turn.active, d2 = 1 - a2;
  let ouphe2, meuRock, rockDele2;
  [s2, meuRock] = put(s2, a2, 'Rock');
  [s2, rockDele2] = put(s2, d2, 'Rock');
  [s2, ouphe2] = put(s2, a2, 'Ouphe', { zone: 'hand' });
  const acao = E.legalActions(s2, a2).find(x => x.t === 'cast' && x.oid === ouphe2 && x.bargain);
  assert.ok(acao && acao.pay.bargain === meuRock, 'a mesa oferece a barganha já com o que sacrificar');
  s2 = settle(resolveSpell(act(s2, acao)));
  assert.equal(s2.objects[meuRock].zone, 'graveyard', 'o artefato foi sacrificado pela barganha');
  assert.equal(s2.objects[rockDele2].zone, 'exile', 'o artefato do oponente foi exilado');
});
