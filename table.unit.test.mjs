// Camadas 1 e 2 · modelo da mesa assistida (A2, A7, A8, A9): goldfish,
// hot-seat, paradas automáticas, registro, desfazer e salvar/retomar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
import { CARDS, PAUPER_DECK } from './fixtures.mjs';
const { engine: E, table: T } = loadModules();

const deck = { entries: PAUPER_DECK };
const goldfish = (seed = 11, options) => T.createTable(T.buildSetup({ format: 'pauper', seed, cards: CARDS, seats: [{ name: 'Você', deck }, { name: 'Goldfish', dummy: true }] }), { options });
const hotseat = (seed = 11) => T.createTable(T.buildSetup({ format: 'pauper', seed, cards: CARDS, seats: [{ name: 'Ana', deck }, { name: 'Bia', deck }] }));
const handOf = (t, name) => t.state.zones[0].hand.find(o => t.state.objects[o].name === name);
const pull = (t, name) => { const oid = t.state.zones[0].library.find(o => t.state.objects[o].name === name); t.act({ t: 'move', p: 0, oid, to: 'hand' }); return oid; };
const toMain = t => { for (let i = 0; i < 50 && !(t.state.turn.active === 0 && t.state.turn.step === 'main1' && t.state.turn.priority === 0); i++) t.act({ t: 'pass', p: t.state.turn.priority }); };

test('A9 · goldfish mantém a mão sozinho, não compra e nunca fica com a prioridade', () => {
  const t = goldfish();
  assert.equal(t.state.players[1].kept, true);
  assert.equal(t.state.zones[1].hand.length, 0);
  t.act({ t: 'keep', p: 0, bottom: [] });
  for (let i = 0; i < 30; i++) {
    assert.notEqual(t.state.turn.priority, 1, 'goldfish nunca segura a prioridade');
    assert.equal(t.viewer(), 0);
    t.passUntil(0, n => n.turn.active === 0 && n.turn.step === 'main1');
    while (t.state.pending) t.act({ t: 'discard', p: 0, oid: t.state.zones[0].hand[0] }); // limpeza: mão acima de 7
  }
  assert.ok(t.state.turn.number > 20);
  assert.equal(t.state.players[1].lost, false, 'goldfish não perde por grimório vazio');
});

test('A9 · paradas automáticas: seu turno para na principal 1, no ataque e na principal 2', () => {
  const t = goldfish(3);
  t.act({ t: 'keep', p: 0, bottom: [] });
  toMain(t);
  const seen = [];
  for (let i = 0; i < 3; i++) {
    t.act({ t: 'pass', p: 0 });
    while (t.state.pending) t.act({ t: 'discard', p: 0, oid: t.state.zones[0].hand[0] });
    seen.push(t.state.turn.step);
  }
  assert.deepEqual(seen.slice(0, 2), ['combat_attackers', 'main2']);
  const respond = E.legalActions(t.state, 0).some(x => x.t !== 'pass');
  if (t.state.turn.active === 0) assert.equal(seen[2], 'main1', 'turno do goldfish passou sozinho até sua próxima principal 1');
  else assert.ok(seen[2] === 'end' && respond, 'no turno do goldfish só para no passo final, e só se houver o que conjurar');
});

test('A9 · "parar em todos os passos" desliga as paradas automáticas', () => {
  const t = goldfish(3, { autoPass: false });
  t.act({ t: 'keep', p: 0, bottom: [] });
  const steps = new Set();
  for (let i = 0; i < 12; i++) { steps.add(t.state.turn.step); t.act({ t: 'pass', p: t.state.turn.priority }); }
  assert.ok(steps.has('upkeep') && steps.has('combat_begin'));
});

test('A9 · hot-seat: a tela acompanha quem tem a prioridade', () => {
  const t = hotseat();
  assert.equal(t.viewer(), 0);
  t.act({ t: 'keep', p: 0, bottom: [] });
  assert.equal(t.viewer(), 1, 'segundo jogador decide a própria mão');
  t.act({ t: 'keep', p: 1, bottom: [] });
  assert.equal(t.viewer(), t.state.turn.priority);
});

test('A4 · pilha com resposta possível para o oponente; sem resposta, resolve sozinha', () => {
  const t = hotseat(2);
  t.act({ t: 'keep', p: 0, bottom: [] }); t.act({ t: 'keep', p: 1, bottom: [] });
  const a = t.state.turn.active;
  assert.equal(a, 0, 'a semente fixa deve dar o primeiro turno para Ana');
  const s = t.state;
  const delver = s.zones[0].library.find(o => s.objects[o].name === 'Delver of Secrets');
  t.act({ t: 'move', p: 0, oid: delver, to: 'hand' });
  t.act({ t: 'cast', p: 0, oid: delver });
  t.act({ t: 'pass', p: 0 });
  const bHasResponse = E.legalActions(t.state, 1).some(x => x.t !== 'pass');
  if (bHasResponse) assert.equal(t.state.turn.priority, 1, 'Bia pode responder: a mesa para para ela');
  else assert.equal(t.state.objects[delver].zone, 'battlefield', 'sem resposta, o Delver resolve sozinho');
});

test('A7 · registro em pt-BR com separador de turno', () => {
  const t = goldfish(7);
  t.act({ t: 'keep', p: 0, bottom: [] });
  toMain(t);
  const land = pull(t, 'Island');
  t.act({ t: 'play_land', p: 0, oid: land });
  const L = t.lines.join('\n');
  assert.match(L, /Você manteve 7 carta\(s\)/);
  assert.match(L, /— Turno 1 · /);
  assert.match(L, /Você jogou Island/);
  assert.match(L, /Você moveu Island: grimório → mão/);
});

test('A7 · desfazer volta a última ação humana e não atravessa compra', () => {
  const t = goldfish(7);
  t.act({ t: 'keep', p: 0, bottom: [] });
  assert.equal(t.canUndo(), false, 'manter a mão revela informação: não desfaz');
  toMain(t);
  const land = handOf(t, 'Island') || handOf(t, 'Mountain') || pull(t, 'Island');
  const h = E.hashState(t.state);
  t.act({ t: 'play_land', p: 0, oid: land });
  assert.equal(t.canUndo(), true);
  t.undo();
  assert.equal(E.hashState(t.state), h);
  const before = t.state.zones[0].hand.length;
  t.act({ t: 'draw', p: 0, target: 0, n: 1 });
  assert.equal(t.state.zones[0].hand.length, before + 1);
  assert.equal(t.canUndo(), false, 'compra revelou carta: desfazer bloqueado');
});

test('A8 · salvar e retomar reproduz o mesmo estado e o mesmo registro', () => {
  const t = goldfish(9);
  t.act({ t: 'keep', p: 0, bottom: [] });
  t.passUntil(0, n => n.turn.number >= 3 && n.turn.active === 0 && n.turn.step === 'main1');
  const data = JSON.parse(JSON.stringify(t.serialize()));
  const r = T.restoreTable(data);
  assert.equal(E.hashState(r.state), E.hashState(t.state));
  assert.equal(r.lines.join('\n'), t.lines.join('\n'));
  assert.throws(() => T.restoreTable({ ...data, engine: 999 }), /versao-do-motor/);
  assert.throws(() => T.restoreTable({ kind: 'x' }), /formato-desconhecido/);
});

test('fuzz · 150 partidas goldfish com ações humanas aleatórias e paradas automáticas', () => {
  for (let seed = 1; seed <= 150; seed++) {
    const t = goldfish(seed);
    const total = Object.keys(t.state.objects).length;
    const pol = E.randomPolicy(seed * 31, { adjudication: true });
    for (let i = 0; i < 200 && t.state.status !== 'over'; i++) {
      const v = t.viewer();
      const acts = E.legalActions(t.state, v, { adjudication: true });
      assert.ok(acts.length, `semente ${seed}: humano sem ação no passo ${t.state.turn.step}`);
      const a = pol(t.state);
      t.act(a && a.p === v ? a : acts[0]);
      const errs = E.invariants(t.state, total);
      assert.equal(errs.join('; '), '', `semente ${seed}, ação ${i}`);
    }
  }
});
