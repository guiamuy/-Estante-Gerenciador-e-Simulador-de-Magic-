// E36 · M13 · regras próprias do Commander no motor.
// Identidade de cor na mana (903.4, rulings de Command Tower e Arcane Signet de 10/11/2020)
// e a volta do comandante para a zona de comando (903.9a/b). Textos conferidos em 29/09/2026.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
const { engine: E, bot: B, table: T } = loadModules();
const J = x => JSON.parse(JSON.stringify(x));

const k = (name, type_line, extra = {}) => ({ name, type_line, cmc: 0, keywords: [], oracle_text: '', ...extra });
const CARDS = {
  'Island': k('Island', 'Basic Land — Island'),
  'Command Tower': k('Command Tower', 'Land', { oracle_text: "{T}: Add one mana of any color in your commander's color identity." }),
  'Arcane Signet': k('Arcane Signet', 'Artifact', { mana_cost: '{2}', cmc: 2, oracle_text: "{T}: Add one mana of any color in your commander's color identity." }),
  'Killian Teste': k('Killian Teste', 'Legendary Creature — Human Warlock', { mana_cost: '{W}{B}', cmc: 2, power: '2', toughness: '2', color_identity: ['W', 'B'] }),
  'Parceiro Azul': k('Parceiro Azul', 'Legendary Creature — Siren', { mana_cost: '{1}{U}', cmc: 2, power: '1', toughness: '1', color_identity: ['U'] }),
  'Parceiro Vermelho': k('Parceiro Vermelho', 'Legendary Creature — Elemental', { mana_cost: '{1}{R}', cmc: 2, power: '1', toughness: '1', color_identity: ['R'] }),
  'Golem Incolor': k('Golem Incolor', 'Legendary Artifact Creature — Golem', { mana_cost: '{3}', cmc: 3, power: '3', toughness: '3', color_identity: [] }),
  'Urso': k('Urso', 'Creature — Bear', { mana_cost: '{1}', cmc: 1, power: '2', toughness: '2' }),
  // M13b · textos conferidos em 30/09/2026 (Scryfall, página da carta C16 295; Hareruya para a Fellwar Stone)
  'Forest': k('Forest', 'Basic Land — Forest'),
  'Wastes': k('Wastes', 'Basic Land'),
  'Exotic Orchard': k('Exotic Orchard', 'Land', { oracle_text: '{T}: Add one mana of any color that a land an opponent controls could produce.' }),
  'Fellwar Stone': k('Fellwar Stone', 'Artifact', { mana_cost: '{2}', cmc: 2, oracle_text: '{T}: Add one mana of any color that a land an opponent controls could produce.' })
};
const deck = cmds => [...cmds.map(name => ({ name, qty: 1, zone: 'commander' })),
  { name: 'Island', qty: 40, zone: 'main' }, { name: 'Urso', qty: 20, zone: 'main' }];

function jogo({ cmds = ['Killian Teste'], cmdsB = ['Killian Teste'], format = 'commander', mode = 'full', seed = 3 } = {}) {
  let s = E.createGame({ format, seed, mode, cards: CARDS, players: [{ name: 'A', deck: format === 'commander' ? deck(cmds) : deck([]).slice(0) }, { name: 'B', deck: deck(cmdsB) }] });
  for (let p = 0; p < 2; p++) s = E.apply(s, { t: 'keep', p, bottom: [] }).state;
  for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = E.apply(s, { t: 'pass', p: s.turn.priority }).state;
  return s;
}
function poe(s, p, name, zone = 'battlefield') {
  s = J(s); const oid = 'x' + (s.nextOid++);
  s.facts[name] = s.facts[name] || E.cardFacts(CARDS[name]);
  s.objects[oid] = { oid, name, owner: p, controller: p, zone, tapped: false, sick: false, damage: 0, counters: {} };
  s.zones[p][zone].push(oid);
  return [s, oid];
}
const act = (s, a) => E.apply(s, a).state;
const comandanteDe = (s, p) => Object.values(s.objects).find(o => o.commander && o.owner === p);

/* ---------------- identidade de cor na mana ---------------- */
test('M13 · identidade: a do comandante fica no jogador; dois comandantes somam; fora do Commander não existe', () => {
  let s = jogo();
  assert.deepEqual(J(s.players[0].identity), ['W', 'B']);
  s = jogo({ cmds: ['Parceiro Azul', 'Parceiro Vermelho'] });
  assert.deepEqual(J(s.players[0].identity), ['U', 'R'], 'as duas identidades juntas, na ordem WUBRG');
  s = jogo({ cmds: ['Golem Incolor'] });
  assert.deepEqual(J(s.players[0].identity), [], 'comandante incolor: identidade vazia');
  const pauper = E.createGame({ format: 'pauper', seed: 1, cards: CARDS, players: [{ deck: deck([]) }, { deck: deck([]) }] });
  assert.equal(pauper.players[0].identity, undefined, 'fora do Commander o estado não muda (goldens do Pauper intactos)');
});

test('M13 · Command Tower lida do texto: só as cores da identidade; incolor não produz nada, nem {C}', () => {
  let s = jogo(); const a = s.turn.active; let torre;
  s = J(s); s.players[a].identity = ['W', 'B'];
  [s, torre] = poe(s, a, 'Command Tower');
  const o = s.objects[torre];
  assert.deepEqual(J(E.productions(s, o)), [['W'], ['B']]);
  s.players[a].identity = ['U', 'R'];
  assert.deepEqual(J(E.productions(s, o)), [['U'], ['R']], 'dois comandantes: qualquer cor das identidades somadas');
  s.players[a].identity = [];
  assert.deepEqual(J(E.productions(s, o)), [], 'comandante incolor: a torre não gera mana');
  assert.ok(!E.legalActions(s, a).some(x => x.t === 'tap_mana' && x.oid === torre), 'e não aparece como fonte');
  delete s.players[a].identity;
  assert.deepEqual(J(E.productions(s, o)), [], 'sem comandante: nada');
});

test('M13 · Command Tower paga custo só com cor da identidade', () => {
  let s = jogo(); const a = s.turn.active; let torre, urso;
  [s, torre] = poe(s, a, 'Command Tower');
  s = J(s); s.players[a].identity = ['W', 'B'];
  s = act(s, { t: 'tap_mana', p: a, oid: torre, option: 1 });
  assert.equal(s.players[a].pool.B, 1, 'segunda opção: preto');
  assert.equal(s.players[a].pool.U, 0);
  [s, urso] = poe(s, a, 'Urso', 'hand');
  assert.ok(E.legalActions(s, a).some(x => x.t === 'cast' && x.oid === urso), 'o preto paga o {1} do urso');
});

test('M13 · Arcane Signet: script completo, cor fora da identidade é recusada, sem cor não gera nada', () => {
  const sc = loadModules().scripts.SCRIPTS['Arcane Signet'];
  assert.ok(sc && sc.covers !== 'partial', 'deixou de ser parcial');
  let s = jogo(); const a = s.turn.active; let sig;
  [s, sig] = poe(s, a, 'Arcane Signet');
  const cores = E.legalActions(s, a).filter(x => x.t === 'activate' && x.oid === sig).map(x => x.color);
  assert.deepEqual(J(cores), ['W', 'B'], 'só oferece branco e preto');
  assert.throws(() => act(s, { t: 'activate', p: a, oid: sig, index: 0, color: 'U' }), /fora da identidade/);
  const s2 = act(s, { t: 'activate', p: a, oid: sig, index: 0, color: 'B' });
  const pool = s2.players[a].pool, fonte = s2.objects[sig];
  const resolvido = s2.stack.length ? act(act(s2, { t: 'pass', p: a }), { t: 'pass', p: 1 - a }) : s2;
  assert.equal(resolvido.players[a].pool.B + pool.B > 0, true, 'gerou preto');
  assert.equal(fonte.tapped, true);
  // comandante incolor: nenhuma cor oferecida, e ativar sem cor não põe {C}
  let g = jogo({ cmds: ['Golem Incolor'] }); const a2 = g.turn.active; let sig2;
  g = J(g); g.players[a2].identity = [];
  [g, sig2] = poe(g, a2, 'Arcane Signet');
  assert.ok(!E.legalActions(g, a2).some(x => x.t === 'activate' && x.oid === sig2), 'nada a oferecer');
  // Q10 · antes o motor aceitava ativar sem cor: a Signet virava e não produzia nada. Agora recusa, e a fonte fica desvirada.
  assert.throws(() => act(g, { t: 'activate', p: a2, oid: sig2, index: 0 }), /sem identidade de cor/);
  assert.equal(g.objects[sig2].tapped, false);
  assert.throws(() => act(s, { t: 'activate', p: a, oid: sig, index: 0 }), /escolha uma cor da identidade/, 'com identidade, sem cor: recusa também');
});

test('M13 · Pauper com Command Tower: sem comandante, a torre não gera mana', () => {
  let s = E.createGame({ format: 'pauper', seed: 5, mode: 'full', cards: CARDS, players: [{ deck: deck([]) }, { deck: deck([]) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  let torre; [s, torre] = poe(s, s.turn.active, 'Command Tower');
  assert.deepEqual(J(E.productions(s, s.objects[torre])), []);
});

/* ---------------- volta para a zona de comando (903.9) ---------------- */
/** Põe o comandante de p no campo, como se tivesse sido conjurado. */
function comandanteEmCampo(s, p) {
  s = J(s); const c = comandanteDe(s, p);
  s.zones[p].command = s.zones[p].command.filter(x => x !== c.oid);
  s.zones[p].battlefield.push(c.oid); c.zone = 'battlefield';
  return [s, c.oid];
}

test('M13 · 903.9a: comandante morto — o dono decide; sim leva para a zona de comando', () => {
  let s = jogo(); const a = s.turn.active, d = 1 - a; let cmd;
  [s, cmd] = comandanteEmCampo(s, d);
  s = J(s); s.objects[cmd].damage = 5; // dano letal: morre na próxima checagem
  s = act(s, { t: 'pass', p: a });
  assert.equal(s.objects[cmd].zone, 'graveyard', 'morreu primeiro');
  assert.deepEqual(J(s.pending), { kind: 'commander_zone', p: d, oid: cmd, from: 'graveyard' }, 'o dono é quem decide, mesmo fora do turno');
  assert.deepEqual(J(E.legalActions(s, d)).map(x => x.yes), [true, false]);
  assert.deepEqual(J(E.legalActions(s, a)), [], 'o outro espera');
  assert.throws(() => act(s, { t: 'pass', p: s.turn.priority }), /zona de comando primeiro/);
  const sim = act(s, { t: 'commander_zone', p: d, yes: true });
  assert.equal(sim.objects[cmd].zone, 'command'); assert.ok(sim.zones[d].command.includes(cmd));
  assert.equal(sim.objects[cmd].commander, true, 'continua comandante');
  assert.equal(sim.pending, null); assert.equal(sim.voltaComando, undefined, 'fila limpa');
  const nao = act(s, { t: 'commander_zone', p: d, yes: false });
  assert.equal(nao.objects[cmd].zone, 'graveyard', 'não: fica no cemitério');
  assert.equal(nao.pending, null);
  assert.equal(act(nao, { t: 'pass', p: nao.turn.priority }).pending, null, 'e não pergunta de novo');
});

test('M13 · 903.9b: devolvido para a mão ou exilado também pergunta; ficha e outras cartas não', () => {
  let s = jogo({ mode: 'assisted' }); const a = s.turn.active; let cmd, urso;
  [s, cmd] = comandanteEmCampo(s, a);
  [s, urso] = poe(s, a, 'Urso');
  const mao = act(s, { t: 'move', p: a, oid: cmd, to: 'hand' });
  assert.equal(mao.pending && mao.pending.from, 'hand');
  const exilio = act(s, { t: 'move', p: a, oid: cmd, to: 'exile' });
  assert.equal(exilio.pending && exilio.pending.from, 'exile');
  const outra = act(s, { t: 'move', p: a, oid: urso, to: 'graveyard' });
  assert.equal(outra.pending, null, 'carta comum não pergunta nada');
  const deVolta = act(s, { t: 'move', p: a, oid: cmd, to: 'command' });
  assert.equal(deVolta.pending, null, 'levar à zona de comando direto não pergunta');
});

test('M13 · imposto: voltou para a zona de comando, a segunda conjuração custa {2} a mais', () => {
  let s = jogo({ mode: 'assisted' }); const a = s.turn.active; const cmd = comandanteDe(s, a).oid;
  assert.equal(E.commanderTax(s, a, cmd), 0);
  s = J(s); s.players[a].commanderCasts[cmd] = 1;
  let c2; [s, c2] = comandanteEmCampo(s, a);
  s = act(s, { t: 'move', p: a, oid: c2, to: 'graveyard' });
  s = act(s, { t: 'commander_zone', p: a, yes: true });
  assert.equal(E.commanderTax(s, a, cmd), 2);
});

test('M13 · dois comandantes caindo juntos: uma decisão de cada vez, na ordem', () => {
  let s = jogo({ cmds: ['Parceiro Azul', 'Parceiro Vermelho'] }); const a = 0; // quem tem os dois parceiros
  s = J(s);
  const [c1, c2] = Object.values(s.objects).filter(o => o.commander && o.owner === a).map(o => o.oid);
  for (const oid of [c1, c2]) { s.zones[a].command = s.zones[a].command.filter(x => x !== oid); s.zones[a].battlefield.push(oid); s.objects[oid].zone = 'battlefield'; s.objects[oid].damage = 9; }
  s = act(s, { t: 'pass', p: s.turn.priority });
  assert.equal(s.pending.oid, c1);
  s = act(s, { t: 'commander_zone', p: a, yes: true });
  assert.equal(s.pending.oid, c2, 'o segundo pergunta logo depois');
  s = act(s, { t: 'commander_zone', p: a, yes: false });
  assert.equal(s.objects[c1].zone, 'command'); assert.equal(s.objects[c2].zone, 'graveyard');
  assert.equal(s.pending, null);
});

test('M13 · Pauper não tem comandante: nada muda; decisão fora de hora é recusada', () => {
  let s = E.createGame({ format: 'pauper', seed: 5, mode: 'full', cards: CARDS, players: [{ deck: deck([]) }, { deck: deck([]) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  assert.throws(() => act(s, { t: 'commander_zone', p: 0, yes: true }), /nenhum comandante/);
});

test('M13 · bots e goldfish sempre levam o comandante para a zona de comando; a linha do tempo conta', () => {
  let s = jogo({ mode: 'assisted' }); const a = s.turn.active, d = 1 - a; let cmd;
  [s, cmd] = comandanteEmCampo(s, d);
  s = act(s, { t: 'move', p: a, oid: cmd, to: 'graveyard' });
  for (const [nome, fn] of [['amador', B.jogadaAmador], ['profissional', B.jogadaProfissional]]) {
    const j = fn(s, d);
    assert.deepEqual(J(j.acao), { t: 'commander_zone', p: d, yes: true }, nome);
    assert.match(j.motivo, /zona de comando/);
  }
  const sim = { t: 'commander_zone', p: d, yes: true }, nao = { t: 'commander_zone', p: d, yes: false };
  assert.match(String(T.describe(s, sim, [], act(s, sim))), /levou Killian Teste para a zona de comando/);
  assert.match(String(T.describe(s, nao, [], act(s, nao))), /deixou Killian Teste no cemitério/);
});

/* ---------------- Q10 · achados da segunda homologação ---------------- */
test('Q10 · comandante devolvido no meio da resolução: o resto da mágica continua (Vapor Snag tira 1 de vida)', () => {
  const SC = loadModules().scripts;
  let s = jogo({ mode: 'assisted' }); const a = s.turn.active, d = 1 - a; let cmd, snag;
  [s, cmd] = comandanteEmCampo(s, d);
  s = J(s);
  s.facts['Vapor Snag'] = E.cardFacts({ name: 'Vapor Snag', type_line: 'Instant', mana_cost: '{U}', cmc: 1, keywords: [], oracle_text: 'x' });
  s.facts['Vapor Snag'].script = SC.SCRIPTS['Vapor Snag'];
  [s, snag] = poe(s, a, 'Vapor Snag', 'hand');
  s = act(s, { t: 'cast', p: a, oid: snag, targets: [{ oid: cmd }] });
  s = act(s, { t: 'pass', p: a }); s = act(s, { t: 'pass', p: d });
  assert.equal(s.pending && s.pending.kind, 'commander_zone', 'o comandante foi devolvido: o dono decide');
  assert.equal(s.players[d].life, 40, 'a perda de vida ainda não aconteceu (vem depois da decisão)');
  const sim = act(s, { t: 'commander_zone', p: d, yes: true });
  assert.equal(sim.objects[cmd].zone, 'command');
  assert.equal(sim.players[d].life, 39, 'o resto da mágica continuou');
  assert.equal(sim.resume, null, 'nada pendurado para disparar fora de hora');
  const nao = act(s, { t: 'commander_zone', p: d, yes: false });
  assert.equal(nao.objects[cmd].zone, 'hand'); assert.equal(nao.players[d].life, 39); assert.equal(nao.resume, null);
});

/* ---------------- M13b · "any color that a land an opponent controls could produce" ---------------- */
// Rulings da Scryfall de 01/02/2009 (Exotic Orchard), conferidos em 30/09/2026:
// não gera {C} mesmo que o terreno do oponente gere; ignora custos e se o terreno está virado;
// dois Orchards sozinhos não geram nada; uma Forest de qualquer lado habilita os dois.
function mesaVazia() {
  let s = J(jogo()); const a = s.turn.active, d = 1 - a;
  for (const p of [a, d]) for (const oid of s.zones[p].battlefield.slice()) { s.zones[p].battlefield = s.zones[p].battlefield.filter(x => x !== oid); delete s.objects[oid]; }
  return [s, a, d];
}
test('M13b · Exotic Orchard lida do texto: só as cores dos terrenos dos oponentes, nunca {C}', () => {
  let [s, a, d] = mesaVazia(); let orq, ilha, flo;
  [s, orq] = poe(s, a, 'Exotic Orchard');
  assert.deepEqual(J(E.productions(s, s.objects[orq])), [], 'oponente sem terreno: nada');
  assert.ok(!E.legalActions(s, a).some(x => x.t === 'tap_mana' && x.oid === orq), 'e não aparece como fonte');
  [s, flo] = poe(s, a, 'Forest');
  assert.deepEqual(J(E.productions(s, s.objects[orq])), [], 'terreno meu não conta');
  let w; [s, w] = poe(s, d, 'Wastes');
  assert.deepEqual(J(E.productions(s, s.objects[orq])), [], 'terreno do oponente que só gera {C}: nada (ruling 1)');
  [s, ilha] = poe(s, d, 'Island');
  s = J(s); s.objects[ilha].tapped = true;
  assert.deepEqual(J(E.productions(s, s.objects[orq])), [['U']], 'ilha virada ainda conta (ruling 2)');
  let flo2; [s, flo2] = poe(s, d, 'Forest');
  assert.deepEqual(J(E.productions(s, s.objects[orq])), [['U'], ['G']]);
  s = act(s, { t: 'tap_mana', p: a, oid: orq, option: 1 });
  assert.equal(s.players[a].pool.G, 1, 'segunda opção: verde'); assert.equal(s.players[a].pool.C, 0);
});

test('M13b · dois Exotic Orchards sozinhos não geram nada; uma Forest de qualquer lado habilita os dois', () => {
  let [s, a, d] = mesaVazia(); let o1, o2, f;
  [s, o1] = poe(s, a, 'Exotic Orchard'); [s, o2] = poe(s, d, 'Exotic Orchard');
  assert.deepEqual(J(E.productions(s, s.objects[o1])), []);
  assert.deepEqual(J(E.productions(s, s.objects[o2])), []);
  const comForest = lado => { let t = s, x; [t, x] = poe(t, lado, 'Forest'); return t; };
  for (const lado of [a, d]) {
    const t = comForest(lado);
    assert.deepEqual(J(E.productions(t, t.objects[o1])), [['G']], `Forest do jogador ${lado}: Orchard de A gera verde`);
    assert.deepEqual(J(E.productions(t, t.objects[o2])), [['G']], `Forest do jogador ${lado}: Orchard de B gera verde`);
  }
});

test('M13b · Fellwar Stone: script completo, só cores dos terrenos dos oponentes', () => {
  const sc = loadModules().scripts.SCRIPTS['Fellwar Stone'];
  assert.ok(sc && sc.covers !== 'partial', 'deixou de ser parcial');
  let [s, a, d] = mesaVazia(); let pedra, ilha;
  [s, pedra] = poe(s, a, 'Fellwar Stone');
  assert.ok(!E.legalActions(s, a).some(x => x.t === 'activate' && x.oid === pedra), 'oponente sem terreno: nada a oferecer');
  assert.throws(() => act(s, { t: 'activate', p: a, oid: pedra, index: 0 }), /nenhum terreno dos oponentes/);
  assert.equal(s.objects[pedra].tapped, false, 'recusada, a pedra fica desvirada');
  [s, ilha] = poe(s, d, 'Island');
  let minha; [s, minha] = poe(s, a, 'Forest');
  const cores = E.legalActions(s, a).filter(x => x.t === 'activate' && x.oid === pedra).map(x => x.color);
  assert.deepEqual(J(cores), ['U'], 'só azul: a Forest é minha');
  assert.throws(() => act(s, { t: 'activate', p: a, oid: pedra, index: 0, color: 'G' }), /nenhum terreno dos oponentes poderia produzir/);
  assert.throws(() => act(s, { t: 'activate', p: a, oid: pedra, index: 0 }), /escolha uma cor/);
  const s2 = act(s, { t: 'activate', p: a, oid: pedra, index: 0, color: 'U' });
  const r = s2.stack.length ? act(act(s2, { t: 'pass', p: a }), { t: 'pass', p: d }) : s2;
  assert.equal(r.players[a].pool.U, 1, 'gerou azul');
  assert.equal(r.objects[pedra].tapped, true);
});
