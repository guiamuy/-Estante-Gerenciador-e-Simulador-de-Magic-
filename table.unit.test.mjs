// Camadas 1 e 2 · modelo da mesa assistida (A2, A7, A8, A9): goldfish,
// hot-seat, paradas automáticas, registro, desfazer e salvar/retomar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
import { CARDS, PAUPER_DECK, COMBAT_CARDS } from './fixtures.mjs';
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

test('A13 · escolha que cai no goldfish: ele escolhe, em vez de desistir da partida', () => {
  // goldfish com grimório, para ter cemitério: é o único jeito de a escolha cair nele
  const comRelic = [...PAUPER_DECK.filter(e => e.zone === 'main'), { name: 'Relic of Progenitus', qty: 2, zone: 'main' }];
  const t = T.createTable({ format: 'pauper', seed: 7, mode: 'assisted', cards: CARDS,
    players: [{ name: 'Você', deck: comRelic }, { name: 'Goldfish', deck: comRelic, dummy: true }] });
  t.act({ t: 'keep', p: 0, bottom: [] });
  toMain(t);
  // uma carta no cemitério do goldfish e o artefato no meu campo
  const dele = t.state.zones[1].library[0];
  t.act({ t: 'move', p: 0, oid: dele, to: 'graveyard' });
  const relic = t.state.zones[0].library.find(o => t.state.objects[o].name === 'Relic of Progenitus');
  t.act({ t: 'move', p: 0, oid: relic, to: 'battlefield' });
  t.act({ t: 'activate', p: 0, oid: relic, index: 0, targets: [{ player: 1 }] });
  while (t.state.stack.length && !t.state.pending) t.act({ t: 'pass', p: t.state.turn.priority });
  assert.equal(t.state.players[1].lost, false, 'o goldfish não desistiu por causa da escolha');
  assert.equal(t.state.objects[dele].zone, 'exile', 'ele escolheu uma carta e ela foi exilada');
  assert.equal(t.state.pending, null, 'e a escolha não ficou pendurada');
});

/* ---------------- B3 · a mesa com o bot no comando de um assento ---------------- */
test('A14 · o assento do bot joga sozinho e explica cada jogada no registro', () => {
  const setup = T.buildSetup({ format: 'pauper', seed: 21, cards: CARDS,
    seats: [{ name: 'Você', deck: { entries: PAUPER_DECK } }, { name: 'Bot amador', deck: { entries: PAUPER_DECK } }],
    manaCheck: true, mode: 'full' });
  // U10 (leva 87) · a partida é criada como antes (nível e nome antigos): a mesa precisa abrir como Shark
  const mesa = T.createTable(setup, { options: { autoPass: true, bot: { nivel: 'amador', seat: 1 } } });
  mesa.act({ t: 'keep', p: 0, bottom: [] });
  // o bot mantém a mão sozinho e joga a vez dele sem nenhuma ação humana
  for (let i = 0; i < 60 && mesa.state.status === 'playing'; i++) {
    const s = mesa.state;
    const quem = s.pending ? s.pending.p : s.turn.priority;
    if (quem !== 0) break;                       // parou de vez: é a vez do humano
    if (s.pending && s.pending.kind === 'attackers') mesa.act({ t: 'attack', p: 0, attackers: [] });
    else if (s.pending && s.pending.kind === 'blockers') mesa.act({ t: 'block', p: 0, blocks: [] });
    else if (s.pending && s.pending.kind === 'discard') mesa.act({ t: 'discard', p: 0, oid: s.zones[0].hand[0] });
    else if (s.pending) break;                   // qualquer outra decisão é do humano mesmo
    else mesa.act({ t: 'pass', p: 0 });
  }
  assert.equal(mesa.state.players[1].kept, true, 'o bot decidiu o mulligan sozinho');
  assert.equal(mesa.state.turn.number >= 1, true, 'a partida andou');
  const registro = mesa.lines.join('\n');
  // U10 · expectativa mudou de propósito: o nome antigo "Bot amador" vira "Shark", e o nível guardado vira "shark"
  assert.match(registro, /Shark: /, 'o registro traz o motivo da jogada do bot');
  assert.doesNotMatch(registro, /Bot amador/, 'o nome antigo não aparece mais');
  // B7 · e o resumo do turno dele aparece quando o turno vira
  assert.match(registro, /Resumo do turno \d+ · Shark/, 'o resumo do turno do bot entra no registro');
  // e a escolha do bot sobrevive a salvar e continuar
  const salvo = JSON.parse(JSON.stringify(mesa.serialize()));
  assert.deepEqual(JSON.parse(JSON.stringify(salvo.options.bot)), { nivel: 'shark', seat: 1 });
  assert.equal(salvo.setup.players[1].name, 'Shark');
  const voltou = T.restoreTable(salvo);
  assert.equal(voltou.state.turn.number, mesa.state.turn.number, 'continuou do mesmo ponto');
});

/* ---------------- A13 · o que a carta mostra sem toque ---------------- */
/** Estado mínimo de mesa assistida: campo com o que o teste precisar, sem passar pelo motor. */
function mesa(objetos, extra = {}) {
  const facts = {};
  for (const [name, c] of Object.entries({ ...CARDS, ...COMBAT_CARDS })) facts[name] = E.cardFacts(c);
  const objects = {}; const battlefield = [];
  objetos.forEach((o, i) => { const oid = 'o' + i; objects[oid] = { oid, zone: 'battlefield', controller: 0, counters: {}, damage: 0, tapped: false, sick: false, ...o }; battlefield.push(oid); });
  return { facts, objects, stack: [], zones: [{ battlefield, hand: [], library: [], graveyard: [], exile: [], command: [], companion: [] }, { battlefield: [], hand: [], library: [], graveyard: [], exile: [], command: [], companion: [] }], players: [{ life: 20 }, { life: 20 }], turn: { active: 0, step: 'main1', priority: 0 }, mode: 'assisted', ...extra };
}
const marcas = est => JSON.parse(JSON.stringify(est.marcas.map(m => m.texto)));

test('A13 · criatura mostra P/T com marcadores, bônus e dano; terreno não tem P/T; enjoo só em criatura sem ímpeto', () => {
  const s = mesa([{ name: 'Sky Pike', sick: true, counters: { p1p1: 2 }, damage: 1 }, { name: 'Island', sick: true, tapped: true }, { name: 'Wall Guard', pump: { p: 1, t: 1 } }]);
  const pike = T.estadoDaCarta(s, s.objects.o0);
  assert.deepEqual(JSON.parse(JSON.stringify(pike.pt)), { p: 4, t: 3 }, '2/1 com dois +1/+1');
  assert.equal(pike.sick, true); assert.equal(pike.criatura, true);
  assert.deepEqual(marcas(pike), ['+2/+2', '1 dano']);
  assert.equal(pike.tipo, 'Creature');
  const ilha = T.estadoDaCarta(s, s.objects.o1);
  assert.equal(ilha.pt, null); assert.equal(ilha.sick, false, 'terreno não tem enjoo'); assert.equal(ilha.tapped, true);
  const muro = T.estadoDaCarta(s, s.objects.o2);
  assert.deepEqual(JSON.parse(JSON.stringify(muro.pt)), { p: 1, t: 5 }, 'bônus até o fim do turno entra no P/T');
  const cao = T.estadoDaCarta(mesa([{ name: 'Raging Hound', sick: true }]), mesa([{ name: 'Raging Hound', sick: true }]).objects.o0);
  assert.equal(cao.sick, false, 'ímpeto: recém-chegada mas sem selo de enjoo');
});

test('A13 · anel e marcas: ataca, bloqueia, alvo de mágica, ficha, aura anexada e encantada', () => {
  const s = mesa([
    { name: 'Sky Pike', attacking: 1 },
    { name: 'Wall Guard', blocking: 'o0' },
    { name: 'Sky Pike', token: true },
    { name: 'Wall Guard', attachedTo: 'o2' },
    { name: 'Sky Pike' }
  ]);
  // uma mágica na pilha mirando a última criatura
  s.objects.feitico = { oid: 'feitico', name: 'Lightning Bolt', zone: 'stack', controller: 1, targets: [{ oid: 'o4' }] };
  s.stack = ['feitico'];
  const a = T.estadoDaCarta(s, s.objects.o0); assert.equal(a.anel, 'ataca'); assert.deepEqual(marcas(a), ['ataca']);
  const b = T.estadoDaCarta(s, s.objects.o1); assert.equal(b.anel, 'bloqueia'); assert.deepEqual(marcas(b), ['bloqueia']);
  const c = T.estadoDaCarta(s, s.objects.o2); assert.deepEqual(marcas(c), ['ficha', 'com Wall Guard'], 'ficha e "encantada" pela anexada');
  const d = T.estadoDaCarta(s, s.objects.o3); assert.deepEqual(marcas(d), ['→ Sky Pike'], 'a anexada aponta para quem está');
  const e = T.estadoDaCarta(s, s.objects.o4); assert.equal(e.anel, 'alvo'); assert.deepEqual(marcas(e), ['alvo de Lightning Bolt']);
  // o plano de bloqueio em montagem também aparece, antes de confirmar
  const plano = { attack: new Set(), blocks: new Map([['o4', 'o0']]), eligible: new Set() };
  const f = T.estadoDaCarta(s, s.objects.o4, plano); assert.equal(f.anel, 'bloqueia'); assert.ok(marcas(f).includes('→ Sky Pike'));
  const planoAtaque = { attack: new Set(['o2']), blocks: new Map(), eligible: new Set() };
  assert.equal(T.estadoDaCarta(s, s.objects.o2, planoAtaque).anel, 'ataca', 'atacante escolhido já mostra o anel');
});

test('A13 · terrenos iguais viram pilha: total, viradas e a primeira desvirada para tocar', () => {
  // expectativa mudada na homologação (H9): virados e desvirados não dividem pilha — senão não há como
  // escolher o terreno virado para desvirar, e o toque sempre cai no primeiro desvirado
  const s = mesa([{ name: 'Island', tapped: true }, { name: 'Island' }, { name: 'Island', tapped: true }, { name: 'Sky Pike' }, { name: 'Island' }]);
  const pilhas = T.agrupaTerrenos(s, ['o0', 'o1', 'o2', 'o4']);
  assert.equal(pilhas.length, 2, 'uma pilha virada e uma desvirada');
  const [viradas, desviradas] = pilhas;
  assert.equal(viradas.total, 2); assert.equal(viradas.viradas, 2); assert.equal(viradas.primeira, 'o0'); assert.equal(viradas.primeiraDesvirada, null);
  assert.equal(desviradas.total, 2); assert.equal(desviradas.viradas, 0); assert.equal(desviradas.primeiraDesvirada, 'o1');
  const todas = T.agrupaTerrenos(mesa([{ name: 'Island', tapped: true }, { name: 'Island', tapped: true }]), ['o0', 'o1'])[0];
  assert.equal(todas.primeiraDesvirada, null, 'todas viradas: tocar cai na primeira');
  assert.equal(T.agrupaTerrenos(s, []).length, 0);
});

/* ---------------- A14 · a pilha explicada ---------------- */
test('A14 · efeitos em português de jogador, um por um, e o desconhecido não some', () => {
  const d = T.descreveEfeito;
  assert.equal(d({ do: 'draw', amount: 2 }), 'compra 2 cartas');
  assert.equal(d({ do: 'draw', amount: 1 }), 'compra 1 carta');
  assert.equal(d({ do: 'damage', amount: 3, target: 'any' }), 'causa 3 de dano a qualquer alvo');
  assert.equal(d({ do: 'counter', target: 'spell' }), 'anula uma mágica');
  assert.equal(d({ do: 'destroy', target: 'creature' }), 'destrói uma criatura');
  assert.equal(d({ do: 'pump', power: 2, toughness: -1, target: 'creature' }), 'uma criatura recebe +2/−1 até o fim do turno');
  assert.equal(d({ do: 'token', amount: 2, token: { name: 'Goblin', power: 1, toughness: 1 } }), 'cria 2 fichas de Goblin 1/1');
  assert.equal(d({ do: 'lose', amount: 1, target: 'each-opponent' }), 'cada oponente perde 1 de vida');
  assert.equal(d({ do: 'draw', amount: { per: 'opponents-empty-hand' } }), 'compra X cartas');
  assert.equal(d({ do: 'coisa_nova' }), 'coisa nova', 'efeito fora do dicionário aparece pelo nome');
  assert.equal(T.descreveEfeitos([{ do: 'scry', amount: 1 }, { do: 'draw', amount: 1 }]), 'olha as 1 de cima e decide (scry 1); compra 1 carta');
  assert.equal(T.descreveEfeitos([]), '');
});

test('A14 · a pilha explicada: topo primeiro, quem, o que faz (script, permanente, oracle ou sem script), alvo e prioridade', () => {
  const s = mesa([{ name: 'Sky Pike' }], { turn: { active: 0, step: 'main1', priority: 1 }, players: [{ name: 'Você', life: 20 }, { name: 'Bot', life: 20 }] });
  s.facts['Lightning Bolt'] = { types: ['instant'], typeText: 'Instant', script: { effects: [{ do: 'damage', amount: 3, target: 'any' }] } };
  s.facts['Mystery Ritual'] = { types: ['sorcery'], typeText: 'Sorcery', script: null };
  s.objects.bolt = { oid: 'bolt', name: 'Lightning Bolt', zone: 'stack', controller: 0, targets: [{ oid: 'o0' }] };
  s.objects.hab = { oid: 'hab', name: 'Sky Pike', ability: true, zone: 'stack', controller: 1, effects: [{ do: 'draw', amount: 1 }], targets: [{ player: 0 }] };
  s.objects.crit = { oid: 'crit', name: 'Sky Pike', zone: 'stack', controller: 0, targets: [] };
  s.objects.mist = { oid: 'mist', name: 'Mystery Ritual', zone: 'stack', controller: 0, targets: [] };
  s.stack = ['mist', 'crit', 'bolt', 'hab'];
  const p = T.explicaPilha(s, { oracleDe: n => n === 'Mystery Ritual' ? 'Faz algo estranho.\nSegunda linha.' : '' });
  assert.equal(p.prioridade, 'Bot');
  assert.deepEqual(JSON.parse(JSON.stringify(p.itens.map(i => [i.nome, i.quem, i.oQueFaz, i.alvos, i.topo]))), [
    ['Habilidade de Sky Pike', 'Bot', 'compra 1 carta', ['Você'], true],
    ['Lightning Bolt', 'Você', 'causa 3 de dano a qualquer alvo', ['Sky Pike'], false],
    ['Sky Pike', 'Você', 'entra no campo de batalha', [], false],
    ['Mystery Ritual', 'Você', 'Faz algo estranho.', [], false]
  ]);
  const vazia = T.explicaPilha(mesa([]));
  assert.equal(vazia.vazia, true); assert.equal(vazia.itens.length, 0);
  const semOracle = T.explicaPilha({ ...s, stack: ['mist'] });
  assert.equal(semOracle.itens[0].oQueFaz, 'sem script: você aplica o efeito na mesa');
});

test('A14 · ação recusada vira uma frase: o que tentou, por que não deu, o que fazer', () => {
  const s = mesa([{ name: 'Island' }]);
  const erro = new E.RuleError('tempo', 'terreno só na sua fase principal, com a pilha vazia');
  const r = T.explicaRecusa(erro, { t: 'play_land', p: 0, oid: 'o0' }, s);
  assert.equal(r.titulo, 'Não dá para jogar o terreno Island agora');
  assert.equal(r.motivo, 'Terreno só na sua fase principal, com a pilha vazia');
  assert.match(r.dica, /trilho do topo/);
  assert.equal(r.frase, 'Não dá para jogar o terreno Island agora: terreno só na sua fase principal, com a pilha vazia. Veja em que fase a mesa está no trilho do topo.');
  const prio = T.explicaRecusa(new E.RuleError('prioridade', 'jogador sem prioridade'), { t: 'cast', p: 0 }, s);
  assert.equal(prio.titulo, 'Não dá para conjurar agora'); assert.match(prio.dica, /sua vez de agir/);
  const generica = T.explicaRecusa(new Error('boom'), { t: 'coisa' }, s);
  assert.equal(generica.frase, 'Ação recusada: boom.');
  assert.equal(T.explicaRecusa(null, null, null).frase, 'Ação recusada: ação recusada.');
});

test('A14 · registro vira linha do tempo por turno e fase; separadores somem; a mesa grava turno e passo de cada linha', () => {
  const entradas = [
    { texto: 'Você manteve 7 carta(s)', turno: 0, passo: 'mulligan', ativo: 'Você' },
    { texto: '— Turno 1 · Você —', turno: 1, passo: 'untap', ativo: 'Você' },
    { texto: 'Você jogou Island', turno: 1, passo: 'main1', ativo: 'Você' },
    { texto: 'Você conjurou Sky Pike', turno: 1, passo: 'main1', ativo: 'Você' },
    { texto: 'Você atacou com Sky Pike', turno: 1, passo: 'combat_attackers', ativo: 'Você' },
    { texto: 'Bot: vida 20 → 18', turno: 1, passo: 'combat_damage', ativo: 'Você' },
    { texto: '— Turno 2 · Bot —', turno: 2, passo: 'untap', ativo: 'Bot' },
    { texto: 'Bot jogou Mountain', turno: 2, passo: 'main1', ativo: 'Bot' }
  ];
  const lt = T.linhaDoTempo(entradas);
  assert.deepEqual(JSON.parse(JSON.stringify(lt.map(t => [t.turno, t.ativo, t.fases.map(f => [f.rotulo, f.linhas.length])]))), [
    [0, 'Você', [['Mão inicial', 1]]],
    [1, 'Você', [['Principal 1', 2], ['Combate', 2]]],
    [2, 'Bot', [['Principal 1', 1]]]
  ]);
  // a mesa de verdade grava turno e passo
  const t = goldfish(4);
  t.act({ t: 'keep', p: 0, bottom: [] });
  toMain(t);
  const oid = handOf(t, 'Island') || pull(t, 'Island');
  t.act({ t: 'play_land', p: 0, oid });
  const e = t.entradas;
  assert.ok(e.length >= 2);
  const jogou = e.find(x => /jogou Island/.test(x.texto));
  assert.ok(jogou && jogou.passo === 'main1' && jogou.turno >= 1, 'a linha sabe o passo em que aconteceu');
  assert.ok(e.some(x => x.passo === 'mulligan'), 'a mão inicial fica antes do primeiro turno');
  assert.equal(T.linhaDoTempo(e).some(tt => tt.fases.some(f => f.linhas.some(l => /^— Turno/.test(l)))), false, 'sem separadores dentro das fases');
});

/* ---------------- A15 · toque longo ---------------- */
const { gestures: G } = loadModules();
/** Elemento falso: só o que o gesto usa. */
function elemento() {
  const ls = {};
  return { dataset: {}, style: {},
    addEventListener(t, fn) { (ls[t] = ls[t] || []).push(fn); },
    fire(t, e = {}) { const ev = { clientX: 0, clientY: 0, button: 0, stopped: false, prevented: false, stopImmediatePropagation() { this.stopped = true; }, preventDefault() { this.prevented = true; }, ...e }; for (const fn of ls[t] || []) fn(ev); return ev; } };
}
const espera = ms => new Promise(r => setTimeout(r, ms));

test('A15 · segurar abre, soltar fecha, e o clique que vem depois é engolido', async () => {
  const el = elemento(); const log = [];
  G.onLongPress(el, { start: () => log.push('start'), end: () => log.push('end'), ms: 30 });
  el.fire('pointerdown'); await espera(60);
  assert.deepEqual(log, ['start'], 'abriu depois do tempo');
  el.fire('pointerup');
  assert.deepEqual(log, ['start', 'end'], 'fechou ao soltar');
  const click = el.fire('click');
  assert.equal(click.stopped, true, 'o clique do soltar não vira toque simples');
  const outro = el.fire('click');
  assert.equal(outro.stopped, false, 'o próximo clique é normal');
});

test('A15 · toque curto não abre e o clique passa; arrastar cancela; botão direito não conta', async () => {
  const el = elemento(); const log = [];
  G.onLongPress(el, { start: () => log.push('start'), end: () => log.push('end'), ms: 30 });
  el.fire('pointerdown'); el.fire('pointerup');
  await espera(50);
  assert.deepEqual(log, [], 'toque curto: nada');
  assert.equal(el.fire('click').stopped, false, 'o clique do toque curto passa');
  el.fire('pointerdown', { clientX: 0, clientY: 0 }); el.fire('pointermove', { clientX: 30, clientY: 0 }); await espera(50);
  assert.deepEqual(log, [], 'arrastar (rolar a faixa) cancela');
  el.fire('pointerup');
  el.fire('pointerdown', { button: 2 }); await espera(50);
  assert.deepEqual(log, [], 'botão direito não é toque longo');
  el.fire('pointerdown'); await espera(10);
  assert.equal(el.fire('contextmenu').prevented, true, 'o menu de contexto do navegador não aparece enquanto segura');
  el.fire('pointercancel'); await espera(40);
  assert.deepEqual(log, [], 'cancelamento antes do tempo não abre');
});

/* ---------------- A16 · prévia em palavras e resumo do turno ---------------- */
test('A16 · a prévia contada do ponto de vista de quem olha: vida antes → depois, mortos de cada lado, letal', () => {
  const s = { players: [{ name: 'Você', life: 20 }, { name: 'Bot', life: 3 }] };
  const pv = { life: [0, -4], vida: [20, -1], mortos: [{ name: 'Sky Pike', controller: 0 }, { name: 'Venom Eel', controller: 1 }], died: ['Sky Pike', 'Venom Eel'] };
  const d = T.descrevePrevia(s, pv, 0);
  assert.equal(d.texto, 'Bot 3 → -1 · morrem seus: Sky Pike · morrem do outro lado: Venom Eel');
  assert.equal(d.letal, true);
  const doBot = T.descrevePrevia(s, pv, 1);
  assert.equal(doBot.texto, 'Bot 3 → -1 · morrem seus: Venom Eel · morrem do outro lado: Sky Pike');
  assert.equal(doBot.letal, false, 'letal só conta contra os outros');
  assert.equal(T.descrevePrevia(s, { life: [0, 0], vida: [20, 3], mortos: [] }, 0).texto, 'ninguém perde vida · ninguém morre');
  assert.equal(T.descrevePrevia(s, null, 0), null, 'bloqueio inválido: sem prévia');
});

test('A16 · resumo do turno: vida, compras, o que entrou e o que foi para o cemitério; e a mesa guarda um por turno', () => {
  const s = mesa([{ name: 'Sky Pike' }, { name: 'Island' }], { players: [{ name: 'Você', life: 18 }, { name: 'Bot', life: 17 }] });
  s.objects.morto = { oid: 'morto', name: 'Wall Guard', zone: 'graveyard', controller: 1 };
  const inicio = { turno: 3, ativo: 0, vida: [20, 20], compradas: [0, 0], campo: [['o1'], ['morto']] };
  const fim = { turno: 3, ativo: 0, vida: [18, 17], compradas: [1, 0], campo: [['o0', 'o1'], []] };
  const r = T.resumoDoTurnoMesa(inicio, fim, s);
  assert.equal(r.turno, 3); assert.equal(r.ativo, 'Você');
  assert.deepEqual(JSON.parse(JSON.stringify(r.linhas)), ['Vida: Você 20 → 18 · Bot 20 → 17', 'Compraram: Você 1', 'Entrou: Sky Pike', 'Morreu ou foi para o cemitério: Wall Guard']);
  const parado = { ...fim, compradas: [0, 0] };   // compras são as do próprio turno (o motor zera a cada turno)
  assert.deepEqual(JSON.parse(JSON.stringify(T.resumoDoTurnoMesa(parado, parado, s).linhas)), ['Nada mudou no campo nem na vida.']);
  // a mesa de verdade: jogar um terreno e passar o turno gera o resumo do turno
  const t = goldfish(4);
  t.act({ t: 'keep', p: 0, bottom: [] });
  toMain(t);
  const turno = t.state.turn.number;
  const oid = handOf(t, 'Island') || pull(t, 'Island');
  t.act({ t: 'play_land', p: 0, oid });
  for (let i = 0; i < 60 && t.state.turn.number === turno; i++) t.act({ t: 'pass', p: t.state.turn.priority });
  const meu = t.resumos.find(x => x.turno === turno);
  assert.ok(meu, 'resumo do meu turno guardado');
  assert.ok(meu.linhas.some(l => /Entrou: .*Island/.test(l)), 'o terreno aparece no resumo: ' + meu.linhas.join(' | '));
});
