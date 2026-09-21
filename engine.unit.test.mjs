// Camada 1 · unidade: regras do motor, puras, sem DOM.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
import { setup } from './fixtures.mjs';
const { engine: E } = loadModules();

const keepAll = s => { for (let p = 0; p < s.players.length; p++) s = E.apply(s, { t: 'keep', p, bottom: [] }).state; return s; };
const passUntil = (s, pred, max = 200) => {
  for (let i = 0; i < max && !pred(s); i++) s = E.apply(s, { t: 'pass', p: s.turn.priority }).state;
  assert.ok(pred(s), 'condição não alcançada'); return s;
};
const handOf = (s, p, name) => s.zones[p].hand.find(o => s.objects[o].name === name);
const withInHand = (s, p, name) => { // coloca a carta na mão pelo controle direto, para o teste não depender do sorteio
  const oid = [...s.zones[p].library].find(o => s.objects[o].name === name);
  return oid ? E.apply(s, { t: 'move', p: s.turn.priority, oid, to: 'hand' }).state : s;
};

test('M1 · mesma semente, mesmo jogo; semente diferente, jogo diferente', () => {
  assert.equal(E.hashState(E.createGame(setup('pauper', 7))), E.hashState(E.createGame(setup('pauper', 7))));
  assert.notEqual(E.hashState(E.createGame(setup('pauper', 7))), E.hashState(E.createGame(setup('pauper', 8))));
});

test('M1 · reserva fica fora da partida e ninguém começa sem 7 cartas', () => {
  const s = E.createGame(setup());
  s.players.forEach((_, p) => {
    assert.equal(s.zones[p].hand.length, 7);
    assert.equal(s.zones[p].library.length, 38 - 7);
    assert.ok(!Object.values(s.objects).some(o => o.name === 'Sol Ring'));
  });
  assert.equal(E.invariants(s).join('; '), '');
});

test('M1 · apply nunca muta o estado recebido', () => {
  const s = E.createGame(setup()); const before = E.hashState(s);
  E.apply(s, { t: 'mulligan', p: 0 });
  assert.equal(E.hashState(s), before);
});

test('M2 · Pauper começa com 20 de vida; Commander com 40 e comandante na zona de comando', () => {
  const p = E.createGame(setup('pauper'));
  assert.equal(p.players[0].life, 20);
  const c = E.createGame(setup('commander'));
  assert.equal(c.players[0].life, 40);
  assert.equal(c.zones[0].command.length, 1);
  assert.equal(c.objects[c.zones[0].command[0]].name, 'Malcolm, Alluring Scoundrel');
  assert.equal(c.zones[0].library.length + c.zones[0].hand.length, 99);
});

test('M2 · mulligan London: compra 7 de novo e manda N para o fundo', () => {
  let s = E.createGame(setup());
  s = E.apply(s, { t: 'mulligan', p: 0 }).state;
  assert.equal(s.zones[0].hand.length, 7);
  assert.throws(() => E.apply(s, { t: 'keep', p: 0, bottom: [] }), /fundo/);
  const chosen = s.zones[0].hand[3];
  s = E.apply(s, { t: 'keep', p: 0, bottom: [chosen] }).state;
  assert.equal(s.zones[0].hand.length, 6);
  assert.equal(s.zones[0].library.at(-1), chosen);
  assert.throws(() => E.apply(s, { t: 'pass', p: 0 }), /mulligan/);
});

test('M3 · quem começa não compra no primeiro turno e o turno passa por todos os passos', () => {
  let s = keepAll(E.createGame(setup()));
  const a = s.turn.active;
  assert.equal(s.turn.step, 'upkeep');
  s = passUntil(s, x => x.turn.step === 'main1');
  assert.equal(s.zones[a].hand.length, 7, 'não comprou no primeiro turno');
  const seen = new Set();
  s = passUntil(s, x => { seen.add(x.turn.step); return x.turn.active !== a; });
  for (const st of ['main1', 'combat_begin', 'combat_attackers', 'combat_end', 'main2', 'end']) assert.ok(seen.has(st), st);
  assert.ok(!seen.has('combat_blockers'), 'sem atacantes não há bloqueio (508.8)');
  s = passUntil(s, x => x.turn.step === 'main1');
  assert.equal(s.zones[s.turn.active].hand.length, 8, 'segundo jogador compra');
});

test('M3 · limpeza obriga descartar até 7', () => {
  let s = keepAll(E.createGame(setup()));
  const a = s.turn.active;
  s = passUntil(s, x => x.turn.step === 'main1');
  s = E.apply(s, { t: 'draw', p: a, n: 2 }).state;
  s = passUntil(s, x => x.pending);
  assert.deepEqual({ kind: s.pending.kind, n: s.pending.n }, { kind: 'discard', n: 2 });
  assert.throws(() => E.apply(s, { t: 'pass', p: a }), /descarte/);
  s = E.apply(s, { t: 'discard', p: a, oid: s.zones[a].hand[0] }).state;
  s = E.apply(s, { t: 'discard', p: a, oid: s.zones[a].hand[0] }).state;
  assert.equal(s.pending, null);
  assert.notEqual(s.turn.active, a);
});

test('M4 · um terreno por turno, só na fase principal com pilha vazia', () => {
  let s = keepAll(E.createGame(setup()));
  const a = s.turn.active;
  s = withInHand(withInHand(s, a, 'Island'), a, 'Mountain');
  const land = handOf(s, a, 'Island');
  assert.throws(() => E.apply(s, { t: 'play_land', p: a, oid: land }), /principal/);
  s = passUntil(s, x => x.turn.step === 'main1');
  s = E.apply(s, { t: 'play_land', p: a, oid: land }).state;
  assert.equal(s.objects[land].zone, 'battlefield');
  assert.throws(() => E.apply(s, { t: 'play_land', p: a, oid: handOf(s, a, 'Mountain') }), /já jogou/);
});

test('M4 · feitiço só na sua principal; instantânea a qualquer momento com prioridade', () => {
  let s = keepAll(E.createGame(setup()));
  const a = s.turn.active, o = 1 - a;
  s = withInHand(withInHand(s, a, 'Preordain'), o, 'Lightning Bolt');
  assert.throws(() => E.apply(s, { t: 'cast', p: a, oid: handOf(s, a, 'Preordain') }), /principal/);
  s = E.apply(s, { t: 'pass', p: a }).state; // upkeep, prioridade no oponente
  s = E.apply(s, { t: 'cast', p: o, oid: handOf(s, o, 'Lightning Bolt') }).state;
  assert.equal(s.stack.length, 1);
  assert.equal(s.turn.priority, o, 'quem conjura mantém a prioridade (117.3c)');
});

test('M4 · pilha resolve do topo e só quando todos passam em sequência', () => {
  let s = keepAll(E.createGame(setup()));
  const a = s.turn.active, o = 1 - a;
  s = withInHand(withInHand(s, a, 'Delver of Secrets'), o, 'Counterspell');
  s = passUntil(s, x => x.turn.step === 'main1');
  const delver = handOf(s, a, 'Delver of Secrets'), cs = handOf(s, o, 'Counterspell');
  s = E.apply(s, { t: 'cast', p: a, oid: delver }).state;
  s = E.apply(s, { t: 'pass', p: a }).state;
  s = E.apply(s, { t: 'cast', p: o, oid: cs }).state;
  s = E.apply(s, { t: 'pass', p: o }).state;
  const r = E.apply(s, { t: 'pass', p: a });
  s = r.state;
  assert.equal(r.events[0].name, 'Counterspell', 'último a entrar é o primeiro a resolver');
  assert.equal(s.objects[cs].zone, 'graveyard');
  assert.equal(s.objects[delver].zone, 'stack');
  assert.equal(s.turn.step, 'main1', 'resolver não avança o passo');
  assert.ok(r.events[0].adjudicate, 'mesa assistida pede adjudicação do efeito');
  // mesa assistida: o jogador aplica o efeito do Counterspell movendo a mágica
  s = E.apply(s, { t: 'move', p: s.turn.priority, oid: delver, to: 'graveyard' }).state;
  assert.equal(s.stack.length, 0);
});

test('M4 · permanente resolvida entra no campo; criatura entra com enjoo', () => {
  let s = keepAll(E.createGame(setup()));
  const a = s.turn.active;
  s = withInHand(s, a, 'Delver of Secrets');
  s = passUntil(s, x => x.turn.step === 'main1');
  const d = handOf(s, a, 'Delver of Secrets');
  s = E.apply(s, { t: 'cast', p: a, oid: d }).state;
  s = passUntil(s, x => !x.stack.length);
  assert.equal(s.objects[d].zone, 'battlefield');
  assert.equal(s.objects[d].sick, true);
});

test('M4 · comandante sai da zona de comando e o imposto cresce 2 por conjuração', () => {
  let s = keepAll(E.createGame(setup('commander')));
  const a = s.turn.active; const cmd = s.zones[a].command[0];
  s = E.apply(s, { t: 'cast', p: a, oid: cmd }).state; // tem lampejo: vale no upkeep
  assert.equal(E.commanderTax(s, a, cmd), 2);
  s = E.apply(s, { t: 'move', p: a, oid: cmd, to: 'command' }).state;
  s = E.apply(s, { t: 'cast', p: a, oid: cmd }).state;
  assert.equal(E.commanderTax(s, a, cmd), 4);
});

test('M5 · vida zero, grimório vazio e 21 de dano de comandante encerram a partida', () => {
  let s = keepAll(E.createGame(setup()));
  const a = s.turn.active;
  let r = E.apply(s, { t: 'life', p: a, target: 1 - a, delta: -20 });
  assert.equal(r.state.status, 'over'); assert.equal(r.state.winner, a);
  assert.throws(() => E.apply(r.state, { t: 'pass', p: a }), /encerrada/);

  r = E.apply(s, { t: 'draw', p: a, target: 1 - a, n: 99 });
  assert.equal(r.state.players[1 - a].lossReason, 'grimório vazio');

  let c = keepAll(E.createGame(setup('commander')));
  const ca = c.turn.active; const cmd = c.zones[ca].command[0];
  c = E.apply(c, { t: 'commander_damage', p: ca, target: 1 - ca, source: cmd, delta: 21 }).state;
  assert.equal(c.players[1 - ca].lossReason, 'dano de comandante');
});

test('M5 · criatura com dano letal vai para o cemitério', () => {
  let s = keepAll(E.createGame(setup()));
  const a = s.turn.active;
  s = withInHand(s, a, 'Delver of Secrets');
  s = passUntil(s, x => x.turn.step === 'main1');
  const d = handOf(s, a, 'Delver of Secrets');
  s = E.apply(s, { t: 'cast', p: a, oid: d }).state;
  s = passUntil(s, x => !x.stack.length);
  const r = E.apply(s, { t: 'damage', p: s.turn.priority, oid: d, delta: 1 });
  assert.equal(r.state.objects[d].zone, 'graveyard');
  assert.equal(r.events[0].kind, 'died');
});

test('M8 · desfazer volta exatamente ao estado anterior', () => {
  const m = E.createMatch(setup());
  m.act({ t: 'keep', p: 0, bottom: [] }); m.act({ t: 'keep', p: 1, bottom: [] });
  const h = E.hashState(m.state);
  m.act({ t: 'pass', p: m.state.turn.priority });
  assert.notEqual(E.hashState(m.state), h);
  m.undo();
  assert.equal(E.hashState(m.state), h);
});

test('modo motor completo recusa controle direto de estado', () => {
  const s = keepAll(E.createGame(setup('pauper', 42, 'full')));
  assert.throws(() => E.apply(s, { t: 'life', p: s.turn.priority, target: 0, delta: -1 }), /mesa assistida/);
});

test('ação malformada é recusada com erro de regra, nunca com exceção genérica', () => {
  const s = keepAll(E.createGame(setup()));
  for (const bad of [null, {}, { t: 'x', p: 0 }, { t: 'pass', p: 9 }, { t: 'cast', p: s.turn.priority, oid: 'o99999' }, { t: 'move', p: s.turn.priority, oid: s.zones[0].hand[0], to: 'lua' }]) {
    assert.throws(() => E.apply(s, bad), err => err instanceof E.RuleError || err.name === 'Error' && err.code);
  }
});
