// Camadas 1 e 2 · modelo da mesa assistida (A2, A7, A8, A9): goldfish,
// hot-seat, paradas automáticas, registro, desfazer e salvar/retomar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
import { CARDS, PAUPER_DECK, COMBAT_CARDS } from './fixtures.mjs';
const { engine: E, table: T } = loadModules();
const J = x => JSON.parse(JSON.stringify(x));

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

// K3 (leva G-215) · expectativa mudou de propósito, a pedido do dono (08/10/2026): a política de paradas fixa
// (principal 1, ataque, principal 2; no turno alheio, ataque e final com resposta) virou "parar sempre" por etapa,
// e com ação ou resposta possível a mesa para em qualquer etapa. Os testes "K3 ·" abaixo medem a regra nova.
test('A9 · paradas automáticas: no padrão, seu turno para na principal 1 e na principal 2, e o turno do goldfish passa sozinho', () => {
  const t = T.createTable(T.buildSetup({ format: 'livre', seed: 3, cards: CARDS, manaCheck: true, seats: [{ name: 'Você', deck: { entries: [{ name: 'Island', qty: 60, zone: 'main' }] } }, { name: 'Goldfish', dummy: true }] }), { options: { paradas: T.PARADAS_PADRAO } });
  t.act({ t: 'keep', p: 0, bottom: [] });
  assert.deepEqual([t.state.turn.active, t.state.turn.step], [0, 'main1'], 'para na principal 1 (tem terreno para jogar)');
  const turno = t.state.turn.number;
  t.act({ t: 'play_land', p: 0, oid: t.state.zones[0].hand[0] });
  assert.equal(t.state.turn.step, 'main1', 'sem mais nada a fazer, a principal 1 ligada segura a mesa');
  t.act({ t: 'pass', p: 0 }); assert.equal(t.state.turn.step, 'main2');
  t.act({ t: 'pass', p: 0 });
  while (t.state.pending) t.act({ t: 'discard', p: 0, oid: t.state.zones[0].hand[0] });
  assert.deepEqual([t.state.turn.active, t.state.turn.step, t.state.turn.number], [0, 'main1', turno + 2], 'o turno do goldfish e o seu começo passaram sozinhos');
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
  // K3 (leva G-215) · sem conferência de mana (manaCheck desligado) toda instantânea na mão conta como resposta, então a
  // mesa agora para já na manutenção de Ana; o teste anda até a principal 1 para conjurar ali, como antes
  for (let i = 0; i < 10 && t.state.turn.step !== 'main1'; i++) t.act({ t: 'pass', p: t.state.turn.priority });
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
// leva 110: registro reescrito (mão mantida, zonas com preposição, vida como "perdeu N (antes → depois)")
  assert.match(L, /Você manteve a mão \(7 cartas\)/);
  assert.match(L, /— Turno 1 · /);
  assert.match(L, /Você jogou Island/);
  assert.match(L, /Você moveu Island do grimório para a mão/);
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
  // E50 P2 · expectativa mudou: a bloqueadora diz QUEM bloqueia ("→ Sky Pike"), não só "bloqueia"
  const b = T.estadoDaCarta(s, s.objects.o1); assert.equal(b.anel, 'bloqueia'); assert.deepEqual(marcas(b), ['→ Sky Pike']);
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
  assert.equal(T.descreveEfeitos([{ do: 'scry', amount: 1 }, { do: 'draw', amount: 1 }]), 'vidência 1: olha 1 carta de cima e decide o que fica no topo; compra 1 carta'); // R9b · expectativa ajustada: a frase dizia "scry" (a mesa chama vidência desde a leva 131) e "as 1"
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
  // E50 P6 · expectativa mudou: o texto oficial, quando guardado, vale inteiro (antes só a primeira linha);
  // sem texto guardado, a descrição do script em português continua valendo
  assert.deepEqual(JSON.parse(JSON.stringify(p.itens.map(i => [i.nome, i.quem, i.oQueFaz, i.alvos, i.topo, i.oficial]))), [
    ['Habilidade de Sky Pike', 'Bot', 'compra 1 carta', ['Você'], true, false],
    ['Lightning Bolt', 'Você', 'causa 3 de dano a qualquer alvo', ['Sky Pike'], false, false],
    ['Sky Pike', 'Você', 'entra no campo de batalha', [], false, false],
    ['Mystery Ritual', 'Você', 'Faz algo estranho.\nSegunda linha.', [], false, true]
  ]);
  assert.equal(p.itens[0].origem, undefined, 'habilidade sem origem guardada'); assert.equal(p.itens[1].origem, 'bolt');
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
    { texto: 'Você manteve a mão (7 cartas)', turno: 0, passo: 'mulligan', ativo: 'Você' },
    { texto: '— Turno 1 · Você —', turno: 1, passo: 'untap', ativo: 'Você' },
    { texto: 'Você jogou Island', turno: 1, passo: 'main1', ativo: 'Você' },
    { texto: 'Você conjurou Sky Pike', turno: 1, passo: 'main1', ativo: 'Você' },
    { texto: 'Você atacou com Sky Pike', turno: 1, passo: 'combat_attackers', ativo: 'Você' },
    { texto: 'Bot perdeu 2 de vida (20 → 18)', turno: 1, passo: 'combat_damage', ativo: 'Você' },
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

test('E50 P6 · com o texto oficial guardado, a pilha fala inglês: a mágica mostra o texto inteiro e a habilidade mostra só a sua linha', () => {
  const s = mesa([{ name: 'Sky Pike' }], { turn: { active: 0, step: 'main1', priority: 0 }, players: [{ name: 'Você', life: 20 }, { name: 'Shark', life: 20 }] });
  const ORACLE = {
    'Kor Skyfisher': 'Flying\nWhen Kor Skyfisher enters the battlefield, return a permanent you control to its owner\'s hand.',
    'Timberwatch Elf': '{T}: Target creature gets +X/+X until end of turn, where X is the number of Elves on the battlefield.',
    'Lightning Bolt': 'Lightning Bolt deals 3 damage to any target.',
    'Dupla': 'Whenever you gain life, draw a card.\n{T}: Add {G}.\nWhenever a creature dies, you lose 1 life.'
  };
  s.facts['Kor Skyfisher'] = { types: ['creature'], script: { triggers: [{ on: 'etb', effects: [{ do: 'bounce', target: 'permanent-you-control' }] }] } };
  s.facts['Timberwatch Elf'] = { types: ['creature'], script: { abilities: [{ cost: '{T}', effects: [{ do: 'pump', target: 'creature' }] }] } };
  s.facts['Lightning Bolt'] = { types: ['instant'], script: { effects: [{ do: 'damage', amount: 3, target: 'any' }] } };
  s.facts['Dupla'] = { types: ['creature'], script: { triggers: [{ effects: [{ do: 'draw', amount: 1 }] }, { effects: [{ do: 'lose', amount: 1 }] }], abilities: [{ effects: [{ do: 'add_mana' }] }] } };
  s.objects.kor = { oid: 'kor', name: 'Kor Skyfisher', zone: 'battlefield', controller: 1 };
  s.objects.ab1 = { oid: 'ab1', name: 'Kor Skyfisher', ability: true, source: 'kor', zone: 'stack', controller: 1, effects: [{ do: 'bounce', target: 'permanent-you-control' }], targets: [] };
  s.objects.ab2 = { oid: 'ab2', name: 'Timberwatch Elf', ability: true, source: 'x', zone: 'stack', controller: 0, effects: [{ do: 'pump', target: 'creature' }], targets: [{ oid: 'o0' }] };
  s.objects.ab3 = { oid: 'ab3', name: 'Dupla', ability: true, source: 'y', zone: 'stack', controller: 0, effects: [{ do: 'lose', amount: 1 }], targets: [] };
  s.objects.bolt = { oid: 'bolt', name: 'Lightning Bolt', zone: 'stack', controller: 0, targets: [{ oid: 'o0' }] };
  s.stack = ['bolt', 'ab3', 'ab2', 'ab1'];
  const p = T.explicaPilha(s, { oracleDe: n => ORACLE[n] || '' });
  assert.deepEqual(JSON.parse(JSON.stringify(p.itens.map(i => [i.nome, i.oQueFaz, i.oficial, i.origem, i.imagemDe]))), [
    ['Habilidade de Kor Skyfisher', "When Kor Skyfisher enters the battlefield, return a permanent you control to its owner's hand.", true, 'kor', 'Kor Skyfisher'],
    ['Habilidade de Timberwatch Elf', ORACLE['Timberwatch Elf'], true, 'x', 'Timberwatch Elf'],
    ['Habilidade de Dupla', 'Whenever a creature dies, you lose 1 life.', true, 'y', 'Dupla'],
    ['Lightning Bolt', 'Lightning Bolt deals 3 damage to any target.', true, 'bolt', 'Lightning Bolt']
  ]);
  for (const it of p.itens) assert.doesNotMatch(it.oQueFaz, /[a-z]+-[a-z]+-[a-z]+|devolve|causa/, 'nada de chave de script nem português misturado: ' + it.oQueFaz);
  // linha oficial: sem correspondência segura (duas ativadas, script só com uma) devolve o texto inteiro
  const facts2 = { script: { abilities: [{ effects: [{ do: 'add_mana' }] }] } };
  assert.equal(T.linhaOficialDaHabilidade({ effects: [{ do: 'add_mana' }] }, facts2, '{T}: Add {G}.\n{T}: Add {R}.'), '{T}: Add {G}.\n{T}: Add {R}.');
  assert.equal(T.linhaOficialDaHabilidade({ effects: [] }, {}, ''), '');
  // sem texto guardado, a descrição em português não vaza chaves do script
  assert.equal(T.descreveEfeito({ do: 'bounce', target: 'permanent-you-control' }), 'devolve uma permanente que você controla para a mão do dono');
  assert.equal(T.descreveAlvo('each-creature-opponent-controls'), 'cada criatura de um oponente');
  assert.equal(T.descreveAlvo('creature-blocked-by-source'), 'uma criatura blocked by source');
  assert.equal(T.descreveAlvo('own-forest'), 'own forest');
});

test('E50 P2 · depois dos bloqueios: resumo por atacante, marcas "← bloqueador" e "livre", e a janela de cada lado', () => {
  const s = mesa([{ name: 'Sky Pike', attacking: 1 }, { name: 'Sky Pike', attacking: 1 }, { name: 'Wall Guard', controller: 1, blocking: 'o0' }],
    { turn: { active: 0, step: 'combat_blockers', priority: 0 }, players: [{ name: 'Ana', life: 20 }, { name: 'Bia', life: 20 }] });
  s.objects.o0.blockedBy = ['o2']; s.objects.o0.blocked = true;
  s.combat = { attackers: ['o0', 'o1'] };
  const r = T.resumoDosBloqueios(s, 0);
  assert.equal(r.titulo, 'Bloqueios declarados'); assert.equal(r.atacante, true);
  assert.equal(r.texto, 'Sky Pike ← Wall Guard · Sky Pike: sem bloqueio');
  assert.equal(r.bloqueados, 1); assert.equal(r.livres, 1);
  assert.match(r.dica, /Sua janela/);
  const rd = T.resumoDosBloqueios(s, 1); assert.equal(rd.titulo, 'Bloqueios feitos'); assert.equal(rd.atacante, false);
  assert.deepEqual(marcas(T.estadoDaCarta(s, s.objects.o0)), ['← Wall Guard']);
  assert.deepEqual(marcas(T.estadoDaCarta(s, s.objects.o1)), ['livre']);
  assert.deepEqual(marcas(T.estadoDaCarta(s, s.objects.o2)), ['→ Sky Pike']);
  // ainda declarando (pendência), não há resumo e o atacante sem bloqueio ainda só "ataca"
  s.pending = { kind: 'blockers', p: 1 };
  assert.equal(T.resumoDosBloqueios(s, 0), null);
  assert.deepEqual(marcas(T.estadoDaCarta(s, s.objects.o1)), ['ataca']);
  s.pending = null; s.turn.step = 'combat_damage';
  assert.equal(T.resumoDosBloqueios(s, 0), null, 'só no passo de bloqueadores');
  // a parada automática depois dos bloqueios (quem tem resposta para; quem não tem, não) é coberta no e2e "E50 janela"
});

test('Leva 110 · marca que cita outra carta vira ícone com o nome inteiro no rótulo (nada de nome dentro da carta)', () => {
  const s = mesa([
    { name: 'Sky Pike', attacking: 1 },
    { name: 'Wall Guard', blocking: 'o0' },
    { name: 'Sky Pike' },
    { name: 'Wall Guard', attachedTo: 'o2' },
    { name: 'Sky Pike', attachedTo: 'o2' }
  ]);
  s.objects.o0.blockedBy = ['o1'];
  const icones = est => J(est.marcas.filter(m => m.icone).map(m => [m.k, m.icone, m.qtd || 1, m.rotulo]));
  assert.deepEqual(icones(T.estadoDaCarta(s, s.objects.o0)), [['ataca', 'escudo', 1, 'Bloqueada por Wall Guard']]);
  assert.deepEqual(icones(T.estadoDaCarta(s, s.objects.o1)), [['bloqueia', 'escudo', 1, 'Bloqueia Sky Pike']]);
  assert.deepEqual(icones(T.estadoDaCarta(s, s.objects.o2)), [['encantada', 'anexo', 2, 'Com Wall Guard, Sky Pike']], 'duas anexadas: um selo com o número');
  assert.deepEqual(icones(T.estadoDaCarta(s, s.objects.o3)), [['anexo', 'anexo', 1, 'Anexada a Sky Pike']]);
  // toda marca que leva nome de carta tem ícone: o texto na carta nunca depende do tamanho do nome
  for (const o of Object.values(s.objects)) for (const m of T.estadoDaCarta(s, o).marcas) if (/Sky Pike|Wall Guard/.test(m.texto)) assert.ok(m.icone, `${m.k}: "${m.texto}" sem ícone`);
});

test('Leva 110 · registro: ficha com o nome certo, pagar/recusar dizem o quê, alvo e bloqueio por extenso', () => {
  const ficha = T.describe({ players: [{ name: 'Ana' }], objects: {}, zones: [] }, { t: 'noop', p: 0 }, [{ kind: 'effect', do: 'token', name: 'Goblin', target: 'Ana', amount: 1 }], { status: 'x', players: [{ name: 'Ana' }], turn: {} });
  assert.deepEqual(J(ficha), ['Ana criou a ficha Goblin'], 'antes: "Goblin criou 1 ficha"');
  const base = { players: [{ name: 'Ana', life: 20 }, { name: 'Bia', life: 20 }], objects: { m: { oid: 'm', name: 'Lightning Bolt' } }, zones: [], status: 'playing', turn: { number: 3 } };
  const comPend = pending => ({ ...base, pending });
  const linha = (a, antes) => J(T.describe(antes, a, [], base));
  assert.deepEqual(linha({ t: 'pay', p: 1 }, comPend({ kind: 'may_pay', p: 1, cost: '{1}', target: 'm', name: 'Mana Leak' })), ['Bia pagou {1}: Lightning Bolt não foi anulada']);
  assert.deepEqual(linha({ t: 'decline', p: 1 }, comPend({ kind: 'may_pay', p: 1, cost: '{1}', target: 'm', name: 'Mana Leak' })), ['Bia não pagou {1}: Lightning Bolt será anulada']);
  assert.deepEqual(linha({ t: 'decline', p: 0 }, comPend({ kind: 'may_pay', p: 0, cost: null, name: 'Masked Vandal', then: [{}] })), ['Ana recusou o efeito de Masked Vandal'], 'antes: "deixou a mágica ser anulada" num efeito opcional');
  assert.deepEqual(linha({ t: 'pick_done', p: 0 }, base), [], 'sem "terminou a escolha"');
  const efeitos = [{ do: 'draw', name: 'Preordain', target: 'Ana', amount: 1 }, { do: 'counters', name: 'Urso', amount: 2 }, { do: 'pump', name: 'Rancor', target: 'Urso', power: 2, toughness: 0 }];
  assert.deepEqual(J(efeitos.map(e => T.describe(base, { t: 'noop', p: 0 }, [{ kind: 'effect', ...e }], base)[0])),
    ['Ana comprou 1 carta (Preordain)', 'Urso recebeu 2 marcadores +1/+1', 'Urso ganhou +2/+0 até o fim do turno (Rancor)']);
});

// Leva 114 · série e troca com a reserva
const LISTA = [{ name: 'Island', qty: 20, zone: 'main' }, { name: 'Counterspell', qty: 40, zone: 'main' }, { name: 'Hydroblast', qty: 4, zone: 'side' }, { name: 'Dispel', qty: 11, zone: 'side' }];
test('Leva 114 · série melhor de 3: fecha com duas vitórias, registra cada partida uma vez, empate não conta vitória', () => {
  let s = T.novaSerie({ melhorDe: 3, formato: 'pauper', assentos: [{ name: 'Você', entries: LISTA }, { name: 'Shark', entries: LISTA, bot: true }] });
  assert.equal(T.resultadoDaSerie(s), null);
  s = T.registraJogo(s, 0); s = T.registraJogo(s, 0);
  assert.deepEqual(J(s.vitorias), [1, 0], 'pintar a tela de novo não soma outra vitória');
  assert.equal(s.ultimoPerdedor, 1);
  s = T.registraJogo(T.proximoJogo(s, 1), 1);
  assert.deepEqual(J(s.vitorias), [1, 1]); assert.equal(T.resultadoDaSerie(s), null); assert.equal(s.primeiro, 1);
  s = T.registraJogo(T.proximoJogo(s, 0), 0);
  assert.equal(T.resultadoDaSerie(s), 0, '2 a 1');
  let e = T.novaSerie({ melhorDe: 3, formato: 'pauper', assentos: [{ name: 'A', entries: LISTA }, { name: 'B', entries: LISTA }] });
  e = T.registraJogo(e, null); e = T.registraJogo(T.proximoJogo(e, 0), 0); assert.equal(T.resultadoDaSerie(e), null, 'empate e uma vitória: ainda há a terceira');
  e = T.registraJogo(T.proximoJogo(e, 0), null); assert.equal(T.resultadoDaSerie(e), 0, 'três partidas jogadas: quem tem mais vitórias leva');
  const unica = T.registraJogo(T.novaSerie({ melhorDe: 1, formato: 'pauper', assentos: [{ name: 'A', entries: LISTA }, { name: 'B', entries: LISTA }] }), 1);
  assert.equal(T.resultadoDaSerie(unica), 1);
});

test('Leva 114 · troca com a reserva: uma cópia por toque, sem mutar, limites do formato (60 no deck, 15 na reserva) e o que mudou', () => {
  let es = T.moveNaTroca(LISTA, 'Counterspell', 'main');
  assert.equal(LISTA[1].qty, 40, 'a lista original não muda');
  let v = T.validaTroca(es, 'pauper', LISTA);
  assert.deepEqual([v.deck, v.reserva, v.ok], [59, 16, false]);
  assert.deepEqual(J(v.erros), ['O deck precisa de pelo menos 60 cartas (tem 59).', 'A reserva aceita no máximo 15 cartas (tem 16).']);
  es = T.moveNaTroca(es, 'Hydroblast', 'side');
  v = T.validaTroca(es, 'pauper', LISTA); assert.equal(v.ok, true);
  assert.deepEqual(J(T.diffDaTroca(es, LISTA)), { entram: [{ name: 'Hydroblast', qty: 1 }], saem: [{ name: 'Counterspell', qty: 1 }] });
  // não precisa ser uma por uma: 61 no deck e 14 na reserva vale
  es = T.moveNaTroca(es, 'Dispel', 'side');
  assert.equal(T.validaTroca(es, 'pauper', LISTA).ok, true, '61 + 14');
  // desfazer um a um volta ao original
  es = T.moveNaTroca(T.moveNaTroca(T.moveNaTroca(es, 'Dispel', 'main'), 'Hydroblast', 'main'), 'Counterspell', 'side');
  assert.deepEqual(J(T.diffDaTroca(es, LISTA)), { entram: [], saem: [] });
  assert.equal(T.moveNaTroca(LISTA, 'Não Existe', 'main'), LISTA, 'carta que não está lá: nada muda');
  // formato livre com deck menor: o mínimo é o tamanho original
  const pequena = [{ name: 'Island', qty: 30, zone: 'main' }, { name: 'Dispel', qty: 2, zone: 'side' }];
  assert.deepEqual([T.limitesDaTroca('livre', pequena).minDeck, T.limitesDaTroca('livre', pequena).maxReserva], [30, 15]);
});

test('Leva 114 · quem começa: a escolha entra no setup e o embaralhamento da semente não muda', () => {
  const base = { format: 'pauper', seed: 9, cards: CARDS, seats: [{ name: 'A', deck }, { name: 'B', deck }] };
  const livre = E.createGame(T.buildSetup(base)), a0 = E.createGame(T.buildSetup({ ...base, first: 0 })), a1 = E.createGame(T.buildSetup({ ...base, first: 1 }));
  assert.equal(a0.turn.active, 0); assert.equal(a1.turn.active, 1);
  assert.deepEqual(J(a1.zones[0].hand.map(o => a1.objects[o].name)), J(livre.zones[0].hand.map(o => livre.objects[o].name)), 'mesma mão com a mesma semente');
});

test('Leva 115 · na mesa, o Shark faz mulligan de mão sem terreno, manda cartas para o fundo e diz por quê no registro', () => {
  // deck com 2 terrenos em 60: a mão inicial quase certamente vem sem terreno
  const semTerreno = [{ name: 'Island', qty: 2, zone: 'main' }, { name: 'Counterspell', qty: 58, zone: 'main' }];
  const setup = T.buildSetup({ format: 'livre', seed: 21, cards: CARDS, seats: [{ name: 'Você', deck: { entries: PAUPER_DECK } }, { name: 'Shark', deck: { entries: semTerreno } }], mode: 'full' });
  const mesa = T.createTable(setup, { options: { autoPass: true, bot: { nivel: 'shark', seat: 1 } } });
  mesa.act({ t: 'keep', p: 0, bottom: [] });
  const s = mesa.state, bot = s.players[1];
  assert.equal(bot.kept, true, 'o Shark decidiu a mão sozinho');
  assert.ok(bot.mulligans >= 1 && bot.mulligans <= 3, 'fez mulligan e parou até o terceiro: ' + bot.mulligans);
  const naMao = Object.values(s.objects).filter(o => o.owner === 1 && o.zone === 'hand').length, comprou = s.turn.active === 1 && s.turn.number > 1 ? 1 : 0;
  assert.ok(naMao <= 7 - bot.mulligans + 1, `mão com ${naMao} depois de ${bot.mulligans} mulligan(s)`);
  assert.match(mesa.lines.join('\n'), /Shark fez mulligan/);
  assert.match(mesa.lines.join('\n'), /Shark: mulligan: mão sem terreno/);
  void comprou;
});

test('H1 · a carta que a mesa desenha: o nome do verso de uma dupla face acha a própria face (imagem, texto, tipo); o da frente devolve a carta inteira', () => {
  const frente = { small: 'f-s', normal: 'f-n', large: 'f-l' }, verso = { small: 'v-s', normal: 'v-n', large: 'v-l' };
  const cards = {
    'Delver of Secrets': { name: 'Delver of Secrets', type_line: 'Creature — Human Wizard', oracle_text: 'frente\n//\nverso', images: frente, cmc: 1,
      faces: [{ name: 'Delver of Secrets', type_line: 'Creature — Human Wizard', oracle_text: 'frente', mana_cost: '{U}', power: '1', toughness: '1', images: frente },
        { name: 'Insectile Aberration', type_line: 'Creature — Human Insect', oracle_text: 'Flying', mana_cost: '', power: '3', toughness: '2', images: verso }] },
    Island: { name: 'Island', type_line: 'Basic Land — Island', images: { normal: 'i-n' }, faces: [] }
  };
  assert.equal(T.cartaDaMesa(cards, 'Delver of Secrets'), cards['Delver of Secrets'], 'nome da frente: a carta inteira, sem cópia');
  const v = J(T.cartaDaMesa(cards, 'Insectile Aberration'));
  assert.deepEqual([v.name, v.type_line, v.oracle_text, v.power, v.toughness, v.images, v.faceDe, v.face, v.faces, v.cmc], ['Insectile Aberration', 'Creature — Human Insect', 'Flying', '3', '2', verso, 'Delver of Secrets', 1, [], 1]);
  assert.equal(T.cartaDaMesa(cards, 'Island'), cards.Island);
  assert.equal(T.cartaDaMesa(cards, 'Carta que não existe'), null); assert.equal(T.cartaDaMesa(null, 'Island'), null); assert.equal(T.cartaDaMesa(cards, ''), null);
  // face sem imagem própria (aventura, carta dividida): fica sem imagem em vez de mostrar a arte da outra face como se fosse dela
  const div = { 'Fire // Ice': { name: 'Fire // Ice', images: { normal: 'x' }, faces: [{ name: 'Fire', images: null }, { name: 'Ice', images: null }] } };
  assert.deepEqual(J(T.cartaDaMesa(div, 'Fire').images), { normal: 'x' }, 'a primeira face de uma carta de imagem única usa a imagem da carta');
  assert.equal(T.cartaDaMesa(div, 'Ice').images, null);
});

test('H2 · contra o bot dá para voltar quantas jogadas quiser, atravessando compra e turno do bot; a dois a barreira continua', () => {
  const setup = T.buildSetup({ format: 'pauper', seed: 21, cards: CARDS, seats: [{ name: 'Você', deck: { entries: PAUPER_DECK } }, { name: 'Shark', deck: { entries: PAUPER_DECK } }], manaCheck: true, mode: 'full' });
  const mesa = T.createTable(setup, { options: { autoPass: true, bot: { nivel: 'shark', seat: 1 } } });
  assert.equal(mesa.semBarreira(), true); assert.equal(mesa.canUndo(), false, 'nada feito ainda');
  const inicio = E.hashState(mesa.state);
  mesa.act({ t: 'keep', p: 0, bottom: [] });
  assert.equal(mesa.canUndo(), true, 'contra o bot, manter a mão também se desfaz');
  // joga alguns turnos: cada passo meu é uma jogada; o bot joga a vez dele no meio
  const fotos = [];
  for (let i = 0; i < 40 && mesa.state.status === 'playing' && mesa.state.turn.number < 5; i++) {
    const s = mesa.state, eu = s.pending ? s.pending.p : s.turn.priority; assert.equal(eu, 0, 'o bot nunca deixa a decisão com ele');
    fotos.push({ hash: E.hashState(s), n: mesa.desfaziveis(), turno: s.turn.number });
    const legais = E.legalActions(s, 0);
    mesa.act(s.pending ? legais[0] : (legais.find(a => a.t === 'play_land') || { t: 'pass', p: 0 }));
  }
  assert.ok(mesa.state.turn.number >= 4 && fotos.length >= 6, 'a partida andou: turno ' + mesa.state.turn.number);
  assert.ok(mesa.state.zones[0].library.length < 53, 'houve compra no caminho (a barreira antiga pararia aqui)');
  assert.equal(mesa.desfaziveis(), fotos.length + 1, 'todas as jogadas minhas contam, mais a de manter a mão');
  // uma por uma: cada volta cai exatamente no estado de antes daquela jogada
  for (let k = fotos.length - 1; k >= Math.max(0, fotos.length - 4); k--) { assert.equal(mesa.undo(), 1); assert.equal(E.hashState(mesa.state), fotos[k].hash, 'volta ' + k); assert.equal(mesa.desfaziveis(), fotos[k].n); }
  // várias de uma vez, e voltar ao começo de um turno
  const alvo = fotos.find(f => f.turno === 2); assert.ok(alvo, 'houve jogada minha no turno 2');
  const n = mesa.jogadasDesde(2); assert.ok(n >= 1);
  assert.equal(mesa.undo(n), n); assert.equal(E.hashState(mesa.state), alvo.hash, 'voltou ao estado em que o turno 2 chegou para mim');
  assert.equal(mesa.jogadasDesde(2), 0, 'não sobrou jogada minha do turno 2 em diante');
  // pedir mais do que existe volta tudo e para no começo da partida
  const tudo = mesa.desfaziveis(); assert.equal(mesa.undo(999), tudo); assert.equal(E.hashState(mesa.state), inicio); assert.equal(mesa.canUndo(), false); assert.equal(mesa.undo(), false);
  // depois de voltar, a partida segue: a jogada refeita vale e o bot decide de novo (ele pensa com relógio; não é repetição exata)
  mesa.act({ t: 'keep', p: 0, bottom: [] }); assert.equal(mesa.state.players[0].kept, true); assert.equal(mesa.desfaziveis(), 1);
  // salvar e retomar guarda as jogadas: quem reabre a partida continua podendo voltar
  const antes = E.hashState(mesa.state); const s2 = mesa.state; mesa.act(s2.pending ? E.legalActions(s2, 0)[0] : { t: 'pass', p: 0 });
  const retomada = T.restoreTable(J(mesa.serialize()));
  assert.equal(retomada.desfaziveis(), mesa.desfaziveis()); assert.equal(retomada.undo(), 1); assert.equal(E.hashState(retomada.state), antes);
  // a dois humanos nada muda: manter a mão e comprar continuam fechando a porta
  const dois = hotseat(7); assert.equal(dois.semBarreira(), false);
  dois.act({ t: 'keep', p: 0, bottom: [] }); assert.equal(dois.canUndo(), false);
  // goldfish (sem bot) também fica como estava
  const gf = goldfish(7); assert.equal(gf.semBarreira(), false); gf.act({ t: 'keep', p: 0, bottom: [] }); assert.equal(gf.canUndo(), false);
});

test('H4 · sinais do resumo do turno: só o que aconteceu, contado, com ícone; cada linha tem o ícone do que conta', () => {
  assert.deepEqual(J(T.sinaisDoResumo({ fatos: { vida: 1, compras: 2, entrou: 0, cemiterio: 3, saiu: 0 } })),
    [{ k: 'vida', icone: 'vida', n: 1, fala: 'vida de 1 jogador(es) mudou' }, { k: 'compras', icone: 'comprar', n: 2, fala: '2 carta(s) comprada(s)' }, { k: 'cemiterio', icone: 'lixeira', n: 3, fala: '3 foi(ram) para o cemitério' }]);
  assert.deepEqual(J(T.sinaisDoResumo({ fatos: { vida: 0, compras: 0, entrou: 0, cemiterio: 0, saiu: 0 } })), []);
  assert.deepEqual(J(T.sinaisDoResumo({ linhas: ['resumo antigo, sem fatos'] })), [], 'partida salva antes da H4 não quebra'); assert.deepEqual(J(T.sinaisDoResumo(null)), []);
  assert.deepEqual(['Vida: Você 20 → 17', 'Compraram: Você 1', 'Entrou: Island', 'Morreu ou foi para o cemitério: Delver of Secrets', 'Saiu do campo: Clue (ficha)', 'Nada mudou no campo nem na vida.'].map(T.iconeDaLinhaDoResumo),
    ['vida', 'comprar', 'cartaMais', 'lixeira', 'cartaSai', 'registro']);
  // os fatos saem do modelo junto com as linhas
  const t = goldfish(3); t.act({ t: 'keep', p: 0, bottom: [] }); toMain(t);
  const terra = handOf(t, 'Island') || handOf(t, 'Mountain') || pull(t, 'Island'); t.act({ t: 'play_land', p: 0, oid: terra });
  t.passUntil(0, n => n.turn.number > t.state.turn.number); while (t.state.pending) t.act({ t: 'discard', p: 0, oid: t.state.zones[0].hand[0] });
  const r = t.resumos.find(x => x.linhas.some(l => l.startsWith('Entrou:'))); assert.ok(r, 'há um resumo com a entrada do terreno');
  assert.equal(r.fatos.entrou, 1); assert.ok(T.sinaisDoResumo(r).some(x => x.k === 'entrou' && x.n === 1));
});

/* ---------------- I1 · registro e bloqueios com ícone ---------------- */
test('I1 · ícone de cada linha do registro pelo que ela conta, e o tom de combate, defesa, vida e perda', () => {
  const ic = t => { const r = T.iconeDaLinhaDoRegistro(t); return r.icone + (r.tipo ? ':' + r.tipo : ''); };
  assert.equal(ic('Ana atacou com Sky Pike, Sky Pike'), 'espada:combate'); assert.equal(ic('Ana não atacou'), 'espada:combate');
  assert.equal(ic('Bia bloqueou Sky Pike com Wall Guard'), 'escudo:defesa'); assert.equal(ic('Bia não bloqueou'), 'escudo:defesa');
  assert.equal(ic('Bia perdeu 2 (20 → 18)'), 'vida:vida'); assert.equal(ic('Ana ganhou 3 (17 → 20)'), 'vida:vida');
  assert.equal(ic('Wall Guard morreu'), 'lixeira:perda'); assert.equal(ic('Ana descartou Fiery Temper'), 'lixeira:perda');
  assert.equal(ic('Lightning Bolt não resolveu: alvo ilegal'), 'fechar:perda');
  assert.equal(ic('Ana comprou 1 carta'), 'comprar'); assert.equal(ic('Ana jogou Mountain'), 'terreno');
  assert.equal(ic('Ana conjurou Lightning Bolt · alvo: Wall Guard'), 'camadas'); assert.equal(ic('Ana ativou Prodigal Sorcerer · alvo: Bia'), 'raio');
  assert.equal(ic('Gatilho de Kitchen Imp (ao entrar)'), 'raio'); assert.equal(ic('Ana gerou {R} com Mountain'), 'virar');
  assert.equal(ic('Sky Pike entrou no campo'), 'cartaMais'); assert.equal(ic('Ana manteve a mão (7 cartas)'), 'mao');
  assert.equal(ic('Ana escolheu Wall Guard como alvo de Kitchen Imp'), 'alvo'); assert.equal(ic('Ana desistiu'), 'fim');
  assert.equal(ic('uma linha que ninguém previu'), 'registro'); assert.equal(ic(''), 'registro');
  assert.equal(T.iconeDaFase('Combate'), 'espada'); assert.equal(T.iconeDaFase('Principal 1'), 'jogar'); assert.equal(T.iconeDaFase('Mão inicial'), 'mao'); assert.equal(T.iconeDaFase('fase nova'), 'registro');
});
test('I1 · de quem é a linha: o nome que abre o texto, o mais longo primeiro; linha sem jogador é de ninguém', () => {
  assert.equal(T.donoDaLinha('Ana jogou Mountain', ['Ana', 'Bia']), 0); assert.equal(T.donoDaLinha('Bia perdeu 2 (20 → 18)', ['Ana', 'Bia']), 1);
  assert.equal(T.donoDaLinha('Ana Maria atacou com Sky Pike', ['Ana', 'Ana Maria']), 1, '"Ana" não rouba a linha de "Ana Maria"');
  assert.equal(T.donoDaLinha('Wall Guard morreu', ['Ana', 'Bia']), -1); assert.equal(T.donoDaLinha('Anabela jogou', ['Ana', 'Bia']), -1, 'só nome inteiro');
  assert.equal(T.donoDaLinha('Vida: Ana 20 → 18', ['Ana', 'Bia']), -1); assert.equal(T.donoDaLinha('', ['Ana']), -1); assert.equal(T.donoDaLinha('Ana jogou', null), -1);
});

/* ---------------- K3 · parar sempre por etapa ---------------- */
const soTerrenos = (paradas, seed = 3) => T.createTable(T.buildSetup({ format: 'livre', seed, cards: CARDS, manaCheck: true, seats: [{ name: 'Você', deck: { entries: [{ name: 'Island', qty: 60, zone: 'main' }] } }, { name: 'Goldfish', dummy: true }] }), { options: { paradas } });
test('K3 · chaves limpas: só etapas conhecidas, na ordem do turno; nada guardado vira o padrão (principal 1 e 2 do seu turno); cada passo cai num grupo', () => {
  assert.deepEqual(J(T.paradasValidas({ meu: ['final', 'main1', 'lixo'], dele: ['inicio'] })), { meu: ['main1', 'final'], dele: ['inicio'] });
  for (const ruim of [null, undefined, 'x', {}, { meu: 'main1' }]) assert.deepEqual(J(T.paradasValidas(ruim)), { meu: ['main1', 'main2'], dele: [] });
  assert.deepEqual(J(T.GRUPOS_DE_PARADA.map(g => [g[0], g[1]])), [['inicio', 'Início'], ['main1', 'Principal 1'], ['combate', 'Combate'], ['main2', 'Principal 2'], ['final', 'Final']]);
  assert.deepEqual(['upkeep', 'draw', 'main1', 'combat_begin', 'combat_damage', 'main2', 'end', 'untap', 'cleanup'].map(T.grupoDoPasso), ['inicio', 'inicio', 'main1', 'combate', 'combate', 'main2', 'final', null, null]);
  const antes = T.paradasAtuais(); assert.deepEqual(J(T.usaParadas({ meu: ['final'], dele: [] })), { meu: ['final'], dele: [] }); assert.deepEqual(J(T.paradasAtuais()), { meu: ['final'], dele: [] }); T.usaParadas(antes);
});
test('K3 · ligada é parar em toda passagem pela etapa, nos dois turnos, mesmo sem nada a fazer', () => {
  const t = soTerrenos({ meu: ['main1', 'main2', 'final'], dele: ['inicio', 'final'] });
  t.act({ t: 'keep', p: 0, bottom: [] });
  // a semente dá o primeiro turno ao goldfish: a manutenção dele (ligada) já segura a mesa
  assert.deepEqual([t.state.turn.active, t.state.turn.step, t.state.turn.priority], [1, 'upkeep', 0]);
  toMain(t); t.act({ t: 'play_land', p: 0, oid: t.state.zones[0].hand[0] });
  const paradas = [];
  for (let i = 0; i < 8; i++) { t.act({ t: 'pass', p: 0 }); while (t.state.pending) t.act({ t: 'discard', p: 0, oid: t.state.zones[0].hand[0] }); paradas.push(`${t.state.turn.active ? 'dele' : 'meu'}:${t.state.turn.step}`); }
  assert.deepEqual(paradas.slice(0, 6), ['meu:main2', 'meu:end', 'dele:upkeep', 'dele:draw', 'dele:end', 'meu:main1']);
});
test('K3 · desligada é seguir sozinho quando não há nada a fazer; tudo desligado, a mesa só para onde há ação (a principal com terreno na mão)', () => {
  const t = soTerrenos({ meu: [], dele: [] });
  t.act({ t: 'keep', p: 0, bottom: [] });
  assert.deepEqual([t.state.turn.active, t.state.turn.step], [0, 'main1'], 'terreno para jogar: há ação');
  const turno = t.state.turn.number;
  t.act({ t: 'play_land', p: 0, oid: t.state.zones[0].hand[0] });
  while (t.state.pending) t.act({ t: 'discard', p: 0, oid: t.state.zones[0].hand[0] });
  assert.deepEqual([t.state.turn.active, t.state.turn.step, t.state.turn.number], [0, 'main1', turno + 2], 'sem ação possível, nem a principal desligada segura a mesa: o turno inteiro do goldfish passa e ela para na sua próxima principal 1');
});
test('K3 · com resposta possível a mesa para em qualquer etapa, ligada ou não (Lightning Bolt com terreno desvirado na manutenção do oponente)', () => {
  // o Bolt das cartas de teste não tem custo; aqui ele custa {R}, como a carta, para a conferência de mana valer
  const cartas = { ...CARDS, 'Lightning Bolt': { ...CARDS['Lightning Bolt'], mana_cost: '{R}' } };
  const t = T.createTable(T.buildSetup({ format: 'livre', seed: 5, cards: cartas, manaCheck: true, seats: [{ name: 'Você', deck: { entries: [{ name: 'Mountain', qty: 30, zone: 'main' }, { name: 'Lightning Bolt', qty: 30, zone: 'main' }] } }, { name: 'Goldfish', dummy: true }] }), { options: { paradas: { meu: ['main1'], dele: [] } } });
  t.act({ t: 'keep', p: 0, bottom: [] });
  assert.deepEqual([t.state.turn.active, t.state.turn.step], [0, 'main1'], 'sem terreno em campo o Bolt não é resposta: a manutenção e a compra passaram sozinhas');
  const s = t.state, temBolt = s.zones[0].hand.some(o => s.objects[o].name === 'Lightning Bolt'), monte = s.zones[0].hand.find(o => s.objects[o].name === 'Mountain');
  assert.ok(temBolt && monte != null, 'a semente dá Mountain e Bolt na mão');
  t.act({ t: 'play_land', p: 0, oid: monte });
  t.act({ t: 'pass', p: 0 });
  assert.equal(t.state.turn.active, 0, 'no seu turno, com Bolt e mana, para no combate e na principal 2 também');
  for (let i = 0; i < 12 && t.state.turn.active === 0; i++) { t.act({ t: 'pass', p: 0 }); while (t.state.pending) t.act({ t: 'discard', p: 0, oid: t.state.zones[0].hand.find(o => t.state.objects[o].name === 'Mountain') || t.state.zones[0].hand[0] }); }
  assert.deepEqual([t.state.turn.active, t.state.turn.step, t.state.turn.priority], [1, 'upkeep', 0], 'na manutenção do goldfish, com resposta possível, a mesa para para você');
  assert.equal(T.shouldStop(t.state, 0, { meu: [], dele: [] }), true); assert.equal(T.shouldStop(t.state, 0, { meu: [], dele: ['inicio'] }), true);
});
