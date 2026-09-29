// Q11 · auditoria das listas Pauper contra o texto oficial (29/09/2026): cada correção com
// a mesa real em jogo. Achado inicial do usuário no aparelho: Timberwatch Elf contava só os
// Elfos dele; o texto diz "Elves on the battlefield" (de todos).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
import { PERM_TYPES } from './fixtures.mjs';
const { engine: E, scripts: S } = loadModules();
const J = x => JSON.parse(JSON.stringify(x));

const card = (name, type_line, extra = {}) => ({ name, type_line, mana_cost: extra.mana_cost || '', cmc: extra.cmc || 0, keywords: extra.keywords || [], oracle_text: extra.oracle_text || '',
  colors: extra.colors || [], ...(extra.pt ? { power: String(extra.pt[0]), toughness: String(extra.pt[1]) } : {}) });
const CARDS = {
  'Island': card('Island', 'Basic Land — Island'), 'Forest': card('Forest', 'Basic Land — Forest'), 'Plains': card('Plains', 'Basic Land — Plains'),
  'Urso': card('Urso', 'Creature — Bear', { pt: [2, 2] }),
  'Gaivota': card('Gaivota', 'Creature — Bird', { pt: [1, 1], keywords: ['Flying'], oracle_text: 'Flying' }),
  'Pedra': card('Pedra', 'Artifact', { oracle_text: '' })
};
const ELFOS = ['Timberwatch Elf', 'Elvish Vanguard', 'Llanowar Elves'];
for (const sc of S.RAW_SCRIPTS) CARDS[sc.name] = CARDS[sc.name] || card(sc.name, PERM_TYPES[sc.name] || 'Instant', PERM_TYPES[sc.name] && /Creature/.test(PERM_TYPES[sc.name]) ? { pt: [1, 1] } : {});
CARDS['Llanowar Elves'] = card('Llanowar Elves', 'Creature — Elf Druid', { pt: [1, 1], oracle_text: '{T}: Add {G}.' });
for (const n of ['Electrickery', 'End the Festivities', 'Alms of the Vein']) CARDS[n].type_line = 'Instant';
CARDS['Fanatical Offering'].type_line = 'Instant';
const NOMES = Object.keys(CARDS);
const DECK = NOMES.filter(n => !['Island', 'Forest', 'Plains'].includes(n)).map(name => ({ name, qty: 3, zone: 'main' })).concat([{ name: 'Island', qty: 20, zone: 'main' }, { name: 'Forest', qty: 6, zone: 'main' }, { name: 'Plains', qty: 6, zone: 'main' }]);

function jogo(seed = 1) {
  let s = E.createGame({ format: 'livre', seed, mode: 'assisted', manaCheck: false, cards: CARDS, players: [{ name: 'A', deck: DECK }, { name: 'B', deck: DECK }] });
  for (let p = 0; p < 2; p++) s = E.apply(s, { t: 'keep', p, bottom: [] }).state;
  for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = E.apply(s, { t: 'pass', p: s.turn.priority }).state;
  return s;
}
function poe(s, p, name, zone = 'battlefield', extra = {}) {
  s = J(s);
  const from = ['library', 'hand'].map(z => s.zones[p][z]).find(z => z.some(o => s.objects[o].name === name));
  const oid = from.find(o => s.objects[o].name === name);
  from.splice(from.indexOf(oid), 1); s.zones[p][zone].push(oid);
  Object.assign(s.objects[oid], { zone, sick: false, ...extra });
  return [s, oid];
}
const act = (s, a) => E.apply(s, a).state;
const resolve = s => { s = act(s, { t: 'pass', p: s.turn.priority }); return act(s, { t: 'pass', p: s.turn.priority }); };
const stats = (s, oid) => { const st = E.stats(s, s.objects[oid]); return [st.power, st.toughness]; };

test('Timberwatch Elf · X é o número de Elfos no campo, de todos os jogadores', () => {
  let s = jogo(); const a = s.turn.active, d = 1 - a; let elf, urso;
  [s, elf] = poe(s, a, 'Timberwatch Elf'); [s, urso] = poe(s, a, 'Urso');
  [s] = poe(s, d, 'Llanowar Elves'); [s] = poe(s, d, 'Elvish Vanguard');
  s = resolve(act(s, { t: 'activate', p: a, oid: elf, index: 0, targets: [{ oid: urso }] }));
  assert.deepEqual(stats(s, urso), [5, 5], '1 Elfo seu + 2 do oponente = +3/+3 (antes: +1/+1)');
});

test('Krark-Clan Shaman · sem custo de mana, e criaturas voadoras não sofrem o dano', () => {
  let s = jogo(); const a = s.turn.active, d = 1 - a; let sham, pedra, urso, gaivota;
  [s, sham] = poe(s, a, 'Krark-Clan Shaman'); [s, pedra] = poe(s, a, 'Pedra');
  [s, urso] = poe(s, d, 'Urso'); [s, gaivota] = poe(s, d, 'Gaivota');
  const sc = S.SCRIPTS['Krark-Clan Shaman'];
  assert.equal(sc.abilities[0].cost.mana, undefined, 'custo é só sacrificar um artefato');
  s = resolve(act(s, { t: 'activate', p: a, oid: sham, index: 0, pay: { sacrifice: pedra } }));
  assert.equal(s.objects[urso].damage, 1); assert.equal(s.objects[gaivota].damage, 0, 'voadora poupada');
  assert.equal(s.objects[sham].zone, 'graveyard', 'o próprio xamã (1/1, sem voar) leva 1 e morre');
  assert.equal(s.objects[pedra].zone, 'graveyard');
});

test('Electrickery · 1 alvo por {R}; sobrecarga {1}{R} acerta cada criatura do oponente, nunca as suas', () => {
  let s = jogo(); const a = s.turn.active, d = 1 - a; let el, u1, u2, meu;
  [s, el] = poe(s, a, 'Electrickery', 'hand'); [s, u1] = poe(s, d, 'Urso'); [s, u2] = poe(s, d, 'Gaivota'); [s, meu] = poe(s, a, 'Urso');
  const acoes = E.legalActions(s, a).filter(x => x.t === 'cast' && x.oid === el);
  assert.ok(acoes.some(x => x.alt == null && x.targets && x.targets.length === 1), 'conjuração normal pede um alvo');
  assert.ok(acoes.some(x => x.alt === 0 && !(x.targets || []).length), 'sobrecarga sem alvo');
  assert.ok(!acoes.some(x => x.alt == null && x.targets && x.targets[0].oid === meu), 'não mira a sua');
  const normal = resolve(act(s, { t: 'cast', p: a, oid: el, targets: [{ oid: u1 }] }));
  assert.equal(normal.objects[u1].damage, 1, 'normal: o alvo'); assert.equal(normal.objects[u2].damage, 0, 'normal: só o alvo');
  const sobre = resolve(act(s, { t: 'cast', p: a, oid: el, alt: 0 }));
  assert.equal(sobre.objects[u1].damage, 1, 'sobrecarga: u1'); assert.equal(sobre.objects[u2].zone, 'graveyard', 'sobrecarga: a Gaivota 1/1 morre'); assert.equal(sobre.objects[meu].damage, 0, 'sobrecarga: a sua não');
});

test('End the Festivities · 1 de dano em cada oponente e nas criaturas deles; as suas ficam intactas', () => {
  let s = jogo(); const a = s.turn.active, d = 1 - a; let etf, deles, meu;
  [s, etf] = poe(s, a, 'End the Festivities', 'hand'); [s, deles] = poe(s, d, 'Urso'); [s, meu] = poe(s, a, 'Urso');
  s = resolve(act(s, { t: 'cast', p: a, oid: etf }));
  assert.equal(s.players[d].life, 19); assert.equal(s.players[a].life, 20);
  assert.equal(s.objects[deles].damage, 1); assert.equal(s.objects[meu].damage, 0, 'antes queimava as suas');
});

test('Alms of the Vein · o oponente perde 3 (não é dano) e você não pode mirar em si', () => {
  let s = jogo(); const a = s.turn.active, d = 1 - a; let alms;
  [s, alms] = poe(s, a, 'Alms of the Vein', 'hand');
  const alvos = E.legalActions(s, a).filter(x => x.t === 'cast' && x.oid === alms).map(x => x.targets[0].player);
  assert.deepEqual([...new Set(alvos)], [d], 'só o oponente');
  const r = E.apply(act(act(s, { t: 'cast', p: a, oid: alms, targets: [{ player: d }] }), { t: 'pass', p: a }), { t: 'pass', p: d });
  assert.equal(r.state.players[d].life, 17); assert.equal(r.state.players[a].life, 23);
  assert.ok(r.events.some(e => e.kind === 'effect' && e.do === 'lose'), 'evento de perda de vida, não de dano');
  assert.ok(!r.events.some(e => e.kind === 'effect' && e.do === 'damage'));
});

test('Elvish Vanguard · ganha o marcador quando um Elfo do OPONENTE entra', () => {
  let s = jogo(); const a = s.turn.active, d = 1 - a; let van, elfo;
  [s, van] = poe(s, a, 'Elvish Vanguard');
  [s, elfo] = poe(s, d, 'Llanowar Elves', 'hand');
  s = act(s, { t: 'move', p: a, oid: elfo, to: 'battlefield' });
  s = J(s); // o gatilho já entrou na fila; resolve
  for (let i = 0; i < 4 && s.stack.length; i++) s = resolve(s);
  assert.equal((s.objects[van].counters || {}).p1p1 || 0, 1, 'antes só contava os seus');
});

test('Utopia Sprawl · encanta só Floresta; Setessan Training · só criatura sua', () => {
  let s = jogo(); const a = s.turn.active, d = 1 - a; let us, ilha, floresta, st, meu, deles;
  [s, us] = poe(s, a, 'Utopia Sprawl', 'hand'); [s, ilha] = poe(s, a, 'Island'); [s, floresta] = poe(s, a, 'Forest');
  const alvosUs = E.legalActions(s, a).filter(x => x.t === 'cast' && x.oid === us).map(x => x.targets[0].oid);
  assert.ok(alvosUs.includes(floresta) && !alvosUs.includes(ilha), 'só a Floresta: ' + JSON.stringify(alvosUs));
  assert.throws(() => act(s, { t: 'cast', p: a, oid: us, targets: [{ oid: ilha }] }), /alvo ilegal/);
  [s, st] = poe(s, a, 'Setessan Training', 'hand'); [s, meu] = poe(s, a, 'Urso'); [s, deles] = poe(s, d, 'Urso');
  const alvosSt = E.legalActions(s, a).filter(x => x.t === 'cast' && x.oid === st).map(x => x.targets[0].oid);
  assert.ok(alvosSt.includes(meu) && !alvosSt.includes(deles));
});

test('Spirit Link · quem controla a aura ganha a vida, mesmo na criatura do oponente', () => {
  let s = jogo(); const a = s.turn.active, d = 1 - a; let link, deles;
  [s, deles] = poe(s, d, 'Urso');
  [s, link] = poe(s, a, 'Spirit Link', 'hand');
  s = resolve(act(s, { t: 'cast', p: a, oid: link, targets: [{ oid: deles }] }));
  assert.equal(s.objects[link].attachedTo, deles);
  assert.equal(E.hasKeyword(s, s.objects[deles], 'lifelink'), false, 'não é vínculo com a vida');
  // o urso encantado dá 2 de dano em A: quem ganha é A (dono da aura), não B
  s = J(s); s.objects[deles].sick = false;
  for (let i = 0; i < 40 && !(s.pending && s.pending.kind === 'attackers' && s.pending.p === d); i++) {
    if (s.pending && s.pending.kind === 'attackers') s = act(s, { t: 'attack', p: s.pending.p, attackers: [] });
    else if (s.pending && s.pending.kind === 'blockers') s = act(s, { t: 'block', p: s.pending.p, blocks: [] });
    else if (s.pending && s.pending.kind === 'discard') s = act(s, { t: 'discard', p: s.pending.p, oid: s.zones[s.pending.p].hand[0] });
    else s = act(s, { t: 'pass', p: s.turn.priority });
  }
  s = act(s, { t: 'attack', p: d, attackers: [deles] });
  if (s.pending && s.pending.kind === 'blockers') s = act(s, { t: 'block', p: a, blocks: [] });
  for (let i = 0; i < 10 && s.turn.step !== 'main2'; i++) { if (s.stack.length) s = resolve(s); else s = act(s, { t: 'pass', p: s.turn.priority }); }
  assert.equal(s.players[a].life, 20, 'A levou 2 e ganhou 2 pela aura');
  assert.equal(s.players[d].life, 20, 'B não ganhou nada');
});

test('Fanatical Offering · cria a ficha Map (artefato) que explora: terreno vai para a mão; senão +1/+1 e a carta pode ir ao cemitério', () => {
  const sc = S.SCRIPTS['Fanatical Offering'];
  assert.notEqual(sc.covers, 'partial', 'agora completa: a ficha explora');
  let s = jogo(); const a = s.turn.active; let fo, pedra, urso;
  [s, fo] = poe(s, a, 'Fanatical Offering', 'hand'); [s, pedra] = poe(s, a, 'Pedra'); [s, urso] = poe(s, a, 'Urso');
  const mao = s.zones[a].hand.length;
  s = resolve(act(s, { t: 'cast', p: a, oid: fo, pay: { sacrifice: pedra } }));
  const map = Object.values(s.objects).find(o => o.token && o.name === 'Map' && o.controller === a);
  assert.ok(map && map.zone === 'battlefield', 'ficha Map no campo');
  assert.ok(s.facts.Map.types.includes('artifact'));
  assert.equal(s.zones[a].hand.length, mao - 1 + 2);
  // explorar com um terreno no topo: vai para a mão
  s = J(s); const topo = s.zones[a].library.find(o => s.objects[o].name === 'Island'); s.zones[a].library.splice(s.zones[a].library.indexOf(topo), 1); s.zones[a].library.unshift(topo);
  const acao = E.legalActions(s, a).find(x => x.t === 'activate' && x.oid === map.oid);
  assert.ok(acao, 'a ficha oferece explorar na fase principal');
  let t = resolve(act(s, { ...acao, targets: [{ oid: urso }] }));
  assert.equal(t.objects[topo].zone, 'hand', 'terreno revelado vai para a mão');
  assert.equal((t.objects[urso].counters || {}).p1p1 || 0, 0, 'sem marcador quando é terreno');
  assert.equal(t.objects[map.oid], undefined, 'a ficha foi sacrificada e sumiu');
  // explorar com uma não-terreno no topo: +1/+1 e a decisão de pôr no cemitério
  s = J(s); const naoTerra = s.zones[a].library.find(o => s.objects[o].name === 'Urso'); s.zones[a].library.splice(s.zones[a].library.indexOf(naoTerra), 1); s.zones[a].library.unshift(naoTerra);
  t = resolve(act(s, { ...acao, targets: [{ oid: urso }] }));
  assert.equal((t.objects[urso].counters || {}).p1p1, 1);
  assert.equal(t.pending && t.pending.kind, 'may_pay'); assert.match(t.pending.name, /explorou/);
  const cemiterio = act(t, { t: 'pay', p: a });
  assert.equal(cemiterio.objects[naoTerra].zone, 'graveyard', 'sim: a carta vai para o cemitério');
  const fica = act(t, { t: 'decline', p: a });
  assert.equal(fica.zones[a].library[0], naoTerra, 'não: fica no topo');
});

test('Tinder Wall · {R}, sacrificar: 2 de dano só na criatura que ela está bloqueando', () => {
  let s = jogo(); const a = s.turn.active, d = 1 - a; let muro, atacante, outra;
  [s, muro] = poe(s, d, 'Tinder Wall'); [s, atacante] = poe(s, a, 'Urso'); [s, outra] = poe(s, a, 'Gaivota');
  assert.equal(E.legalTargets(s, d, 'creature-blocked-by-source', muro).length, 0, 'fora do combate não há alvo');
  for (let i = 0; i < 12 && !(s.pending && s.pending.kind === 'attackers'); i++) s = act(s, { t: 'pass', p: s.turn.priority });
  s = act(s, { t: 'attack', p: a, attackers: [atacante, outra] });
  for (let i = 0; i < 6 && !(s.pending && s.pending.kind === 'blockers'); i++) s = act(s, { t: 'pass', p: s.turn.priority });
  assert.equal(s.pending && s.pending.kind, 'blockers');
  s = act(s, { t: 'block', p: d, blocks: [[muro, atacante]] });
  const alvos = E.legalTargets(s, d, 'creature-blocked-by-source', muro).map(x => x.oid);
  assert.deepEqual(J(alvos), [atacante], 'só a criatura bloqueada');
  if (s.turn.priority !== d) s = act(s, { t: 'pass', p: s.turn.priority }); // o atacante passa; o defensor responde no passo de bloqueio
  const acao = E.legalActions(s, d).find(x => x.t === 'activate' && x.oid === muro && x.index === 1);
  assert.ok(acao, 'a segunda habilidade é oferecida no combate');
  assert.deepEqual(J(acao.targets), [{ oid: atacante }], 'a ação já vem com o alvo');
  s = act(s, acao);
  assert.equal(s.objects[muro].zone, 'graveyard', 'o muro foi sacrificado como custo');
  for (let i = 0; i < 4 && s.stack.length; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  assert.equal(s.objects[outra].damage, 0, 'a Gaivota, que não estava bloqueada por ele, não sofre nada');
  assert.equal(s.objects[atacante].zone, 'graveyard', 'o Urso 2/2 leva 2 e morre');
  assert.equal(s.objects[muro].zone, 'graveyard', 'o muro foi sacrificado');
});

test('Correções menores: Bloodrite 3/3, Moon-Circuit ninjutsu {U}, Bojuka qualquer jogador, buscas opcionais, Tinder Wall parcial, Faerie Macabre até dois', () => {
  const sc = S.SCRIPTS;
  assert.deepEqual(J(sc['Bloodrite Invoker'].abilities[0].effects.map(e => e.amount)), [3, 3]);
  assert.equal(sc['Moon-Circuit Hacker'].ninjutsu.mana, '{U}');
  assert.equal(sc['Bojuka Bog'].abilities[0].effects[0].target, 'player');
  assert.equal(sc['Squadron Hawk'].abilities[0].effects[0].optional, true);
  assert.equal(sc['Shield-Wall Sentinel'].abilities[0].effects[0].optional, true);
  assert.equal(sc['Ninja of the Deep Hours'].abilities[0].optional, true);
  assert.ok(sc['Faerie Macabre'].abilities[0].effects.every(e => e.upTo));
  assert.equal(sc['Timberwatch Elf'].abilities[0].effects[0].power.per, 'elves-on-battlefield');
  // Bojuka Bog: o próprio cemitério é alvo legal
  let s = jogo(); const a = s.turn.active; let bog;
  [s, bog] = poe(s, a, 'Bojuka Bog', 'hand');
  s = act(s, { t: 'play_land', p: a, oid: bog });
  if (s.pending && s.pending.kind === 'pick_target') assert.ok(s.pending.options.some(o => o.player === a), 'pode mirar o próprio cemitério');
});
