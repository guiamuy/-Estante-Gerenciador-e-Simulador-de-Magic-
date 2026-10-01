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

/* ---------------- Leva 104 · escolhas do jogador em custos e em X ----------------
 * Relato do usuário (30/09/2026): a Jaspera Sentinel virava sozinha uma criatura que ele
 * não escolheu, e a Nyxborn Hydra não deixava escolher o X. Textos conferidos em 30/09/2026:
 * Jaspera Sentinel "{T}, Tap an untapped creature you control: Add one mana of any color."
 * (playgroup.gg, EchoMTG); Nyxborn Hydra {X}{G}, "Bestow {X}{G}{G}", "enters with X +1/+1
 * counters", "Enchanted creature gets +1/+1 for each +1/+1 counter on Nyxborn Hydra and has
 * reach and trample." (Scryfall MH3 164). Regra 601.2b/f/h: quem paga escolhe o valor de X e
 * as permanentes e cartas usadas nos custos. */
const pagos = (s, a, oid, filtro = () => true) => E.legalActions(s, a).filter(x => x.oid === oid && filtro(x));
const chave = x => JSON.stringify(x.pay || {});

test('Leva 104 · Jaspera Sentinel: o jogador escolhe qual criatura vira (a enjoada também serve)', () => {
  let s = jogo(); const a = s.turn.active, d = 1 - a; let jas, urso, elfo, dele;
  [s, jas] = poe(s, a, 'Jaspera Sentinel'); [s, urso] = poe(s, a, 'Urso'); [s, elfo] = poe(s, a, 'Llanowar Elves', 'battlefield', { sick: true });
  [s, dele] = poe(s, d, 'Urso');
  const verdes = pagos(s, a, jas, x => x.t === 'activate' && x.color === 'G');
  assert.deepEqual(J(verdes.map(x => x.pay.tapOther).sort()), [[elfo], [urso]].sort(), 'uma opção por criatura minha, e só as minhas');
  const r = act(s, { t: 'activate', p: a, oid: jas, index: 0, color: 'G', pay: { tapOther: [elfo] } });
  assert.equal(r.objects[elfo].tapped, true, 'virou a que eu escolhi');
  assert.equal(r.objects[urso].tapped, false, 'e não a outra (antes: sempre a primeira)');
  assert.throws(() => act(s, { t: 'activate', p: a, oid: jas, index: 0, color: 'G', pay: { tapOther: [dele] } }), /vire 1 criatura/);
});

// Ruling de 04/10/2004 (Scryfall, conferido em 30/09/2026): "It can tap itself but is not required to do so."
test('Leva 104 · Birchlore Rangers: o jogador escolhe os dois Elfos, e ela pode ser um deles', () => {
  let s = jogo(); const a = s.turn.active; let bir, e1, e2, e3;
  [s, bir] = poe(s, a, 'Birchlore Rangers'); [s, e1] = poe(s, a, 'Llanowar Elves'); [s, e2] = poe(s, a, 'Elvish Vanguard'); [s, e3] = poe(s, a, 'Timberwatch Elf');
  [s] = poe(s, a, 'Urso');
  const pares = pagos(s, a, bir, x => x.t === 'activate' && x.color === 'G').map(x => J(x.pay.tapOther).sort().join('+'));
  const esperado = [[bir, e1], [bir, e2], [bir, e3], [e1, e2], [e1, e3], [e2, e3]].map(p => p.sort().join('+'));
  assert.deepEqual(J(pares).sort(), esperado.sort(), 'todo par de Elfos (inclusive a própria Birchlore), nenhum Urso');
  const r = act(s, { t: 'activate', p: a, oid: bir, index: 0, color: 'G', pay: { tapOther: [e2, e3] } });
  assert.deepEqual([e1, e2, e3].map(x => r.objects[x].tapped), [false, true, true]);
});

test('Leva 104 · custo adicional: o jogador escolhe a carta descartada e a permanente sacrificada', () => {
  let s = jogo(); const a = s.turn.active; let grab, fan, pedra, urso;
  [s, grab] = poe(s, a, 'Grab the Prize', 'hand');
  const mao = s.zones[a].hand.filter(x => x !== grab);
  const descartes = pagos(s, a, grab, x => x.t === 'cast').map(x => J(x.pay.discard)[0]);
  assert.deepEqual(J(descartes).sort(), J(mao).sort(), 'cada carta da mão é uma opção');
  const escolhida = mao[mao.length - 1];
  const r = act(s, { t: 'cast', p: a, oid: grab, pay: { discard: [escolhida] } });
  assert.equal(r.objects[escolhida].zone, 'graveyard', 'foi a escolhida (antes: sempre a primeira da mão)');
  [s, fan] = poe(s, a, 'Fanatical Offering', 'hand'); [s, pedra] = poe(s, a, 'Pedra'); [s, urso] = poe(s, a, 'Urso');
  const sacr = pagos(s, a, fan, x => x.t === 'cast').map(x => x.pay.sacrifice);
  assert.ok(sacr.includes(pedra) && sacr.includes(urso), 'artefato ou criatura, à escolha');
  const r2 = act(s, { t: 'cast', p: a, oid: fan, pay: { sacrifice: urso } });
  assert.equal(r2.objects[urso].zone, 'graveyard'); assert.equal(r2.objects[pedra].zone, 'battlefield');
});

test('Leva 104 · habilidade com sacrifício e com devolver terreno: o jogador escolhe qual', () => {
  let s = jogo(); const a = s.turn.active, d = 1 - a; let mun, pedra, urso, alvo;
  [s, mun] = poe(s, a, 'Makeshift Munitions'); [s, pedra] = poe(s, a, 'Pedra'); [s, urso] = poe(s, a, 'Urso'); [s, alvo] = poe(s, d, 'Urso');
  const sacr = new Set(pagos(s, a, mun, x => x.t === 'activate').map(x => x.pay.sacrifice));
  assert.deepEqual([...sacr].sort(), [pedra, urso].sort());
  const r = act(s, { t: 'activate', p: a, oid: mun, index: 0, targets: [{ oid: alvo }], pay: { sacrifice: pedra } });
  assert.equal(r.objects[pedra].zone, 'graveyard'); assert.equal(r.objects[urso].zone, 'battlefield');
  let qr, f1, f2;
  [s, qr] = poe(s, a, 'Quirion Ranger'); [s, f1] = poe(s, a, 'Forest'); [s, f2] = poe(s, a, 'Forest');
  const terras = new Set(pagos(s, a, qr, x => x.t === 'activate').map(x => x.pay && x.pay.land));
  assert.deepEqual([...terras].sort(), [f1, f2].sort(), 'uma opção por Floresta');
  const r2 = act(s, { t: 'activate', p: a, oid: qr, index: 0, targets: [{ oid: urso }], pay: { land: f2 } });
  assert.equal(r2.objects[f2].zone, 'hand'); assert.equal(r2.objects[f1].zone, 'battlefield');
});

function jogoComMana(florestas) {
  let s = jogo(); s = J(s); s.manaCheck = true;
  s.facts['Nyxborn Hydra'] = E.cardFacts({ name: 'Nyxborn Hydra', type_line: 'Enchantment Creature — Hydra', mana_cost: '{X}{G}', cmc: 1, power: '0', toughness: '0', keywords: ['Reach', 'Trample'], oracle_text: '' });
  s.facts['Nyxborn Hydra'].script = S.SCRIPTS['Nyxborn Hydra'];
  const a = s.turn.active; const ids = [];
  for (let i = 0; i < florestas; i++) { let f; [s, f] = poe(s, a, 'Forest'); ids.push(f); }
  return [s, a];
}
test('Leva 104 · Nyxborn Hydra: X de 0 até o máximo pagável, e entra com X marcadores', () => {
  let [s, a] = jogoComMana(6); let hid;
  [s, hid] = poe(s, a, 'Nyxborn Hydra', 'hand');
  const xs = pagos(s, a, hid, x => x.t === 'cast' && !x.bestow).map(x => x.x || 0).sort((p, q) => p - q);
  assert.deepEqual(J(xs), [0, 1, 2, 3, 4, 5], 'seis Florestas: {X}{G} com X até 5 (antes: parava em 4)');
  s = resolve(act(s, { t: 'cast', p: a, oid: hid, x: 5 }));
  assert.equal(s.objects[hid].zone, 'battlefield');
  assert.equal(s.objects[hid].counters.p1p1, 5);
  assert.throws(() => act(jogoComMana(2)[0], { t: 'cast', p: a, oid: hid, x: 3 }));
});

test('Leva 104 · Nyxborn Hydra com conceder: o jogador escolhe X, paga {X}{G}{G} e a criatura ganha +X/+X', () => {
  let [s, a] = jogoComMana(5); let hid, urso;
  [s, hid] = poe(s, a, 'Nyxborn Hydra', 'hand'); [s, urso] = poe(s, a, 'Urso');
  const xs = [...new Set(pagos(s, a, hid, x => x.t === 'cast' && x.bestow).map(x => x.x || 0))].sort((p, q) => p - q);
  assert.deepEqual(xs, [0, 1, 2, 3], 'cinco Florestas: {X}{G}{G} com X até 3 (antes: X nem era perguntado)');
  s = act(s, { t: 'cast', p: a, oid: hid, bestow: true, x: 3, targets: [{ oid: urso }] });
  assert.equal(s.zones[a].battlefield.filter(x => s.objects[x].name === 'Forest' && !s.objects[x].tapped).length, 0, 'pagou as cinco');
  s = resolve(s);
  assert.equal(s.objects[hid].attachedTo, urso, 'entrou anexada');
  assert.equal(s.objects[hid].counters.p1p1, 3, 'com 3 marcadores');
  assert.deepEqual(stats(s, urso), [5, 5], 'Urso 2/2 + 3/3');
});

/* ---------------- Leva 105 · auditoria texto × script das listas Pauper ----------------
 * Textos oficiais em .listas/oficiais.json (coletados em 30/09/2026); cada teste falha no motor anterior. */
const passaAte = (s, fim) => { for (let i = 0; i < 400 && !fim(s); i++) { if (s.pending && s.pending.kind === 'discard') s = act(s, { t: 'discard', p: s.pending.p, oid: s.zones[s.pending.p].hand[0] }); else if (s.pending && s.pending.kind === 'attackers') s = act(s, { t: 'attack', p: s.pending.p, attackers: [] }); else if (s.pending && s.pending.kind === 'blockers') s = act(s, { t: 'block', p: s.pending.p, blocks: [] }); else s = act(s, { t: 'pass', p: s.turn.priority }); } return s; };

test('Leva 105 · 400.7: carta que muda de zona vira objeto novo — X pago, conceder, provas, face para baixo e lampejo não sobrevivem', () => {
  let [s, a] = jogoComMana(4); let hid;
  [s, hid] = poe(s, a, 'Nyxborn Hydra', 'hand');
  s = resolve(act(s, { t: 'cast', p: a, oid: hid, x: 3 }));
  assert.equal(s.objects[hid].counters.p1p1, 3);
  s = act(s, { t: 'move', p: a, oid: hid, to: 'hand' });
  const o = s.objects[hid];
  for (const k of ['xPaid', 'bestowed', 'evidenced', 'faceDown', 'flashback', 'paidAdditional']) assert.equal(o[k], undefined, `${k} foi limpo`);
  // de volta à mão e conjurada com X = 0: entra sem marcadores (antes: com os 3 da vez anterior)
  s = J(s); for (const f of s.zones[a].battlefield.filter(x => s.objects[x].name === 'Forest')) s.objects[f].tapped = false;
  s = resolve(act(s, { t: 'cast', p: a, oid: hid, x: 0 }));
  assert.notEqual(s.objects[hid].counters.p1p1, 3, 'o X antigo não volta');
  assert.equal(s.objects[hid].zone, 'graveyard', '0/0 sem marcadores morre');
});

test('Leva 105 · Nyxborn Hydra concedida some da criatura antes de resolver: entra como criatura com X marcadores (702.103e)', () => {
  let [s, a] = jogoComMana(5); let hid, urso;
  [s, hid] = poe(s, a, 'Nyxborn Hydra', 'hand'); [s, urso] = poe(s, a, 'Urso');
  s = act(s, { t: 'cast', p: a, oid: hid, bestow: true, x: 2, targets: [{ oid: urso }] });
  s = act(s, { t: 'move', p: a, oid: urso, to: 'graveyard' });
  s = resolve(s);
  assert.equal(s.objects[hid].zone, 'battlefield', 'entrou (antes: ia para o cemitério)');
  assert.equal(s.objects[hid].attachedTo, undefined);
  assert.equal(s.objects[hid].bestowed, undefined, 'como criatura');
  assert.equal(s.objects[hid].counters.p1p1, 2);
});

test('Leva 105 · Ancient Grudge com lampejo anulada vai para o exílio (702.34a)', () => {
  let s = jogo(); const a = s.turn.active, d = 1 - a; let grudge, pedra, cs;
  [s, grudge] = poe(s, a, 'Ancient Grudge', 'graveyard'); [s, pedra] = poe(s, d, 'Pedra'); [s, cs] = poe(s, d, 'Counterspell', 'hand');
  s = act(s, { t: 'cast', p: a, oid: grudge, flashback: true, targets: [{ oid: pedra }] });
  s = act(s, { t: 'pass', p: a });
  s = act(s, { t: 'cast', p: d, oid: cs, targets: [{ oid: grudge }] });
  s = resolve(s);
  assert.equal(s.objects[grudge].zone, 'exile', 'anulada depois do lampejo: exílio (antes: cemitério, e podia voltar)');
  assert.equal(s.objects[pedra].zone, 'battlefield');
});

test('Leva 105 · insanidade vale para descarte como custo e para descarte escolhido (Grab the Prize, Blood, Duress)', () => {
  let s = jogo(); const a = s.turn.active, d = 1 - a; let grab, temper;
  [s, grab] = poe(s, a, 'Grab the Prize', 'hand'); [s, temper] = poe(s, a, 'Fiery Temper', 'hand');
  s = act(s, { t: 'cast', p: a, oid: grab, pay: { discard: [temper] } });
  assert.equal(s.objects[temper].zone, 'exile', 'descartada com insanidade: exílio');
  assert.equal(s.pending && s.pending.kind, 'madness', 'e o dono decide se conjura (antes: cemitério direto)');
  s = act(s, { t: 'cast_madness', p: a, targets: [{ player: d }] });
  s = passaAte(s, x => !x.stack.length);
  assert.equal(s.players[d].life, 20 - 3 - 2, 'Fiery Temper (3) e Grab the Prize (2: o descarte não era terreno)');
  // ficha de Blood: descartar é custo da habilidade
  let epi, t2;
  [s, epi] = poe(s, a, 'Voldaren Epicure', 'hand'); s = passaAte(act(s, { t: 'cast', p: a, oid: epi }), x => !x.stack.length);
  const blood = s.zones[a].battlefield.find(x => s.objects[x].name === 'Blood');
  [s, t2] = poe(s, a, 'Fiery Temper', 'hand');
  s = act(s, { t: 'activate', p: a, oid: blood, index: 0, pay: { discard: [t2] } });
  assert.equal(s.objects[t2].zone, 'exile'); assert.equal(s.pending && s.pending.kind, 'madness');
  s = act(s, { t: 'decline_madness', p: a });
  assert.equal(s.objects[t2].zone, 'graveyard', 'recusou: cemitério');
  // Duress: o oponente descarta a carta que eu escolho; a insanidade é dele
  let dur, t3;
  s = passaAte(s, x => !x.stack.length);
  [s, dur] = poe(s, a, 'Duress', 'hand'); [s, t3] = poe(s, d, 'Fiery Temper', 'hand');
  s = passaAte(act(s, { t: 'cast', p: a, oid: dur, targets: [{ player: d }] }), x => !!x.pending);
  if (s.pending.kind === 'pick') s = act(s, { t: 'pick', p: a, oid: t3 });
  if (s.pending.kind === 'pick') s = act(s, { t: 'pick_done', p: a }); // ao chegar no máximo a escolha fecha sozinha
  assert.equal(s.objects[t3].zone, 'exile');
  assert.deepEqual([s.pending && s.pending.kind, s.pending && s.pending.p], ['madness', d]);
});

// Leva 107 · expectativa reescrita: o texto oficial faz o descarte/sacrifício na RESOLUÇÃO; o teste da leva 105
// (opções de custo adicional no plot) passou a ser este — do plot, na resolução, a escolha continua existindo
test('Leva 105/107 · Highway Robbery (também do plot) pergunta na resolução: descartar, sacrificar um terreno ou nada', () => {
  let s = jogo(); const a = s.turn.active, d = 1 - a; let hr, f1;
  [s, hr] = poe(s, a, 'Highway Robbery', 'hand');
  s = act(s, { t: 'plot', p: a, oid: hr });
  const turno = s.turn.number;
  s = passaAte(s, x => x.turn.number > turno + 1 && x.turn.active === a && x.turn.step === 'main1' && !x.stack.length);
  [s, f1] = poe(s, a, 'Forest');
  const ops = E.legalActions(s, a).filter(x => x.t === 'cast' && x.oid === hr && x.plotted);
  assert.equal(ops.length, 1, 'conjurar do plot: uma ação, sem custo adicional');
  const mao = s.zones[a].hand.length;
  s = passaAte(act(s, ops[0]), x => !!x.pending);
  assert.equal(s.pending.kind, 'pick'); assert.equal(s.pending.min, 0, 'pode não fazer nada');
  assert.ok(J(s.pending.from).includes(f1) && s.zones[a].hand.every(x => J(s.pending.from).includes(x)), 'mão e terrenos');
  s = act(s, { t: 'pick', p: a, oid: f1 }); if (s.pending && s.pending.kind === 'pick') s = act(s, { t: 'pick_done', p: a });
  assert.equal(s.objects[f1].zone, 'graveyard', 'sacrificou a Floresta');
  assert.equal(s.zones[a].hand.length, mao + 2, 'e comprou duas');
  // anulada: nada foi pago
  let hr2, cs; [s, hr2] = poe(s, a, 'Highway Robbery', 'hand'); [s, cs] = poe(s, d, 'Counterspell', 'hand');
  s = passaAte(s, x => !x.stack.length && !x.pending);
  const antes = s.zones[a].hand.length;
  s = act(s, { t: 'cast', p: a, oid: hr2 }); s = act(s, { t: 'pass', p: a });
  s = passaAte(act(s, { t: 'cast', p: d, oid: cs, targets: [{ oid: hr2 }] }), x => !x.stack.length);
  assert.equal(s.zones[a].hand.length, antes - 1, 'só a mágica saiu da mão (antes: o descarte já tinha sido pago)');
});

test('Leva 105 · fichas com cor e tipo do texto oficial: pássaros brancos da Battle Screech pagam o lampejo; Clue, Blood e Map têm subtipo', () => {
  let s = jogo(); const a = s.turn.active; let bs;
  [s, bs] = poe(s, a, 'Battle Screech', 'hand');
  s = resolve(act(s, { t: 'cast', p: a, oid: bs }));
  const aves = s.zones[a].battlefield.filter(x => s.objects[x].token && s.objects[x].name === 'Bird');
  assert.equal(aves.length, 2);
  assert.deepEqual(J(s.facts.Bird.colors), ['W'], '"two 1/1 white Bird creature tokens with flying"');
  [s] = poe(s, a, 'Urso'); s = J(s); s.facts.Urso.colors = ['W'];
  assert.ok(E.legalActions(s, a).some(x => x.t === 'cast' && x.oid === bs && x.flashback), 'as duas aves e um branco pagam "vire três criaturas brancas"');
  // guarda-corpo: toda ficha das cartas Pauper declara cor e subtipo
  const acha = (x, out = []) => { if (x && typeof x === 'object') { if (x.do === 'token') out.push(x.token); Object.values(x).forEach(v => acha(v, out)); } return out; };
  const semDados = [];
  for (const sc of S.RAW_SCRIPTS) for (const t of acha(sc)) if (!Array.isArray(t.colors) || !Array.isArray(t.subtypes)) semDados.push(`${sc.name} → ${t.name}`);
  const pauper = new Set(['Voldaren Epicure', "Vampire's Kiss", 'Malevolent Rumble', 'Novice Inspector', 'Thraben Inspector', 'Battle Screech', 'Writhing Chrysalis', 'Fanatical Offering', 'Lys Alana Huntmaster']);
  assert.deepEqual(semDados.filter(x => pauper.has(x.split(' → ')[0])), [], 'fichas sem cor ou subtipo declarados');
});

test('Leva 105 · dano a "cada oponente" respeita a prevenção por cor (Prismatic Strands) e a Hallow', () => {
  let s = jogo(); const a = s.turn.active, d = 1 - a; let ps, fest;
  [s, ps] = poe(s, a, 'Prismatic Strands', 'hand'); [s, fest] = poe(s, d, 'End the Festivities', 'hand');
  s = act(s, { t: 'cast', p: a, oid: ps });
  s = passaAte(s, x => !!x.pending || !x.stack.length);
  if (s.pending && s.pending.kind === 'choose_color') s = act(s, { t: 'choose_color', p: a, color: 'R' });
  s = passaAte(s, x => !x.stack.length);
  s = J(s); s.facts['End the Festivities'].colors = ['R'];
  const vida = s.players[a].life;
  s = act(s, { t: 'pass', p: s.turn.priority });
  s = J(s); s.turn.priority = d;
  s = passaAte(act(s, { t: 'cast', p: d, oid: fest }), x => !x.stack.length);
  assert.equal(s.players[a].life, vida, 'fonte vermelha prevenida (antes: tirava 1)');
});

test('Leva 105 · Freed from the Real: quem ativa é o dono da aura, também na criatura do oponente', () => {
  let s = jogo(); const a = s.turn.active, d = 1 - a; let fr, urso;
  [s, urso] = poe(s, d, 'Urso'); [s, fr] = poe(s, a, 'Freed from the Real', 'hand');
  s = resolve(act(s, { t: 'cast', p: a, oid: fr, targets: [{ oid: urso }] }));
  assert.equal(s.objects[fr].attachedTo, urso);
  const meus = E.legalActions(s, a).filter(x => x.t === 'activate' && x.oid === fr);
  assert.ok(meus.length >= 1, 'eu ativo pela aura (antes: a habilidade era da criatura do oponente)');
  s = resolve(act(s, meus[0]));
  assert.equal(s.objects[urso].tapped, true, 'virou a criatura encantada');
  s = J(s); s.turn.priority = d;
  assert.ok(!E.legalActions(s, d).some(x => x.t === 'activate' && (x.oid === urso || x.oid === fr)), 'o oponente não ativa');
});

test('Leva 105 · Hallow na End the Festivities: o dano a mim é prevenido e eu ganho essa vida', () => {
  let s = jogo(); const a = s.turn.active, d = 1 - a; let hal, fest;
  [s, hal] = poe(s, a, 'Hallow', 'hand'); [s, fest] = poe(s, d, 'End the Festivities', 'hand');
  s = J(s); s.turn.priority = d;
  s = act(s, { t: 'cast', p: d, oid: fest });
  s = act(s, { t: 'pass', p: d });
  const vida = s.players[a].life;
  s = passaAte(act(s, { t: 'cast', p: a, oid: hal, targets: [{ oid: fest }] }), x => !x.stack.length);
  assert.equal(s.players[a].life, vida + 1, 'sem dano e +1 de vida (antes: −1)');
});

/* ---------------- Leva 106 · auditoria texto × script, parte 2 (achados de impacto médio e alto) ---------------- */
test('Leva 106 · tempestade: cópias vão para a pilha, cada uma com alvo próprio, e resolvem mesmo se a original for anulada', () => {
  let s = jogo(); const a = s.turn.active, d = 1 - a; let wts, cs, isca;
  [s, isca] = poe(s, a, 'Urso', 'hand');
  s = resolve(act(s, { t: 'cast', p: a, oid: isca })); // uma mágica antes: tempestade 1
  [s, wts] = poe(s, a, 'Weather the Storm', 'hand'); [s, cs] = poe(s, d, 'Counterspell', 'hand');
  s = act(s, { t: 'cast', p: a, oid: wts });
  assert.equal(s.stack.length, 2, 'original e uma cópia na pilha');
  const vida = s.players[a].life;
  s = act(s, { t: 'pass', p: a }); s = act(s, { t: 'pass', p: d }); // a cópia resolve
  s = act(s, { t: 'pass', p: a });
  s = act(s, { t: 'cast', p: d, oid: cs, targets: [{ oid: wts }] });
  s = passaAte(s, x => !x.stack.length);
  assert.equal(s.players[a].life, vida + 3, 'a cópia deu 3 de vida; a original foi anulada (antes: 0)');
  // Reaping the Graves: cada cópia escolhe uma criatura diferente
  let rg, c1, c2, i2;
  s = passaAte(s, x => x.turn.active !== a); s = passaAte(s, x => x.turn.active === a && x.turn.step === 'main1');
  [s, c1] = poe(s, a, 'Urso', 'graveyard'); [s, c2] = poe(s, a, 'Gaivota', 'graveyard');
  [s, i2] = poe(s, a, 'Llanowar Elves', 'hand'); s = resolve(act(s, { t: 'cast', p: a, oid: i2 }));
  [s, rg] = poe(s, a, 'Reaping the Graves', 'hand');
  s = act(s, { t: 'cast', p: a, oid: rg, targets: [{ oid: c1 }] });
  assert.equal(s.pending && s.pending.kind, 'pick_target', 'a cópia pede alvo novo');
  s = act(s, { t: 'pick_target', p: a, index: J(s.pending.options).findIndex(o => o.oid === c2) });
  s = passaAte(s, x => !x.stack.length);
  assert.deepEqual([s.objects[c1].zone, s.objects[c2].zone], ['hand', 'hand'], 'voltaram as duas (antes: só uma)');
});

test('Leva 106 · Cryoshatter destrói a criatura que vira ao atacar ou para pagar custo', () => {
  let s = jogo(); const a = s.turn.active, d = 1 - a; let urso, cryo;
  [s, urso] = poe(s, a, 'Urso'); [s, cryo] = poe(s, d, 'Cryoshatter', 'battlefield', { attachedTo: urso });
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers');
  s = act(s, { t: 'attack', p: a, attackers: [urso] });
  s = passaAte(s, x => !x.stack.length && x.objects[urso].zone !== 'battlefield' || x.turn.step === 'combat_damage' || x.turn.step === 'end');
  assert.equal(s.objects[urso].zone, 'graveyard', 'atacar virou a criatura: destruída (antes: continuava atacando com −5/−0)');
});

test('Leva 106 · Winding Way põe na mão TODAS as cartas do tipo escolhido', () => {
  let s = jogo(); const a = s.turn.active; let ww;
  [s, ww] = poe(s, a, 'Winding Way', 'hand');
  s = act(s, { t: 'cast', p: a, oid: ww, mode: 0 });
  s = passaAte(s, x => !!x.pending);
  const servem = J(s.pending.from).filter(o => E.stats ? s.facts[s.objects[o].name].types.includes('creature') : false).length;
  assert.equal(s.pending.min, servem, 'mínimo = quantas criaturas vieram (antes: 0, dava para não pegar nenhuma)');
});

test('Leva 106 · Masked Vandal: exilar do cemitério é opcional, o jogador escolhe a carta e o alvo vem antes', () => {
  let s = jogo(); const a = s.turn.active, d = 1 - a; let mv, g1, g2, pedra;
  [s, g1] = poe(s, a, 'Urso', 'graveyard'); [s, g2] = poe(s, a, 'Gaivota', 'graveyard'); [s, pedra] = poe(s, d, 'Pedra');
  [s, mv] = poe(s, a, 'Masked Vandal', 'hand');
  s = passaAte(act(s, { t: 'cast', p: a, oid: mv }), x => !!x.pending);
  assert.equal(s.pending.kind, 'may_pay', 'pergunta se quer pagar (antes: exilava sozinho a primeira criatura)');
  assert.deepEqual([s.objects[g1].zone, s.objects[g2].zone], ['graveyard', 'graveyard'], 'nada exilado antes da decisão');
  const opcoes = E.legalActions(s, a).filter(x => x.t === 'pay').map(x => x.pay.exile);
  assert.deepEqual(J(opcoes).sort(), [g1, g2].sort());
  const r = passaAte(act(s, { t: 'pay', p: a, pay: { exile: g2 } }), x => !x.stack.length);
  assert.deepEqual([r.objects[g1].zone, r.objects[g2].zone, r.objects[pedra].zone], ['graveyard', 'exile', 'exile']);
  const n = passaAte(act(s, { t: 'decline', p: a }), x => !x.stack.length);
  assert.deepEqual([n.objects[g1].zone, n.objects[g2].zone, n.objects[pedra].zone], ['graveyard', 'graveyard', 'battlefield'], 'recusou: nada acontece');
});

test('Leva 106 · Spellstutter Sprite: o valor é conferido de novo na resolução, contando as MINHAS Fadas', () => {
  let s = jogo(); const a = s.turn.active, d = 1 - a; let ss, fada, magia;
  [s, fada] = poe(s, a, 'Faerie Seer'); [s, magia] = poe(s, d, 'Lightning Bolt', 'hand'); [s, ss] = poe(s, a, 'Spellstutter Sprite', 'hand');
  s = J(s); s.facts['Lightning Bolt'].cmc = 2; s.turn.priority = d;
  // a Sprite tem lampejo (texto oficial): a base de teste da auditoria usa linha de tipo genérica
  s.facts['Spellstutter Sprite'] = E.cardFacts({ name: 'Spellstutter Sprite', type_line: 'Creature — Faerie Wizard', mana_cost: '{1}{U}', cmc: 2, power: '1', toughness: '1', keywords: ['Flash', 'Flying'], oracle_text: '' });
  s.facts['Spellstutter Sprite'].script = S.SCRIPTS['Spellstutter Sprite'];
  s = act(s, { t: 'cast', p: d, oid: magia, targets: [{ player: a }] }); s = act(s, { t: 'pass', p: d });
  s = act(s, { t: 'cast', p: a, oid: ss });
  s = act(s, { t: 'pass', p: a }); s = act(s, { t: 'pass', p: d }); // a Sprite entra; o gatilho mira o raio (2 Fadas, valor 2)
  if (s.pending && s.pending.kind === 'pick_target') s = act(s, { t: 'pick_target', p: a, index: J(s.pending.options).findIndex(o => o.oid === magia) });
  assert.ok(s.stack.some(x => s.objects[x].ability), 'o gatilho está na pilha');
  s = act(s, { t: 'move', p: a, oid: fada, to: 'graveyard' }); // matam uma Fada em resposta: sobra 1, o raio tem valor 2
  s = passaAte(s, x => !x.stack.some(o => x.objects[o].ability));
  assert.equal(s.objects[magia].zone === 'stack' || s.objects[magia].zone === 'graveyard' && s.players[a].life < 20, true, 'o raio não foi anulado (ruling de 2007)');
});

test('Leva 106 · vínculo com a vida e Armadillo Cloak/Spirit Link valem também para dano fora do combate', () => {
  let s = jogo(); const a = s.turn.active, d = 1 - a; let vi, capa;
  [s, vi] = poe(s, a, 'Valakut Invoker'); [s, capa] = poe(s, a, 'Spirit Link', 'hand');
  s = resolve(act(s, { t: 'cast', p: a, oid: capa, targets: [{ oid: vi }] }));
  const vida = s.players[a].life;
  s = passaAte(act(s, { t: 'activate', p: a, oid: vi, index: 0, targets: [{ player: d }] }), x => !x.stack.length);
  assert.equal(s.players[a].life, vida + 3, 'Spirit Link: 3 de dano da habilidade viram 3 de vida (antes: 0)');
});

test('Leva 106 · Flaring Pain: proteção também deixa de prevenir o dano', () => {
  let s = jogo(); const a = s.turn.active, d = 1 - a; let fp, urso, mask, bolt;
  [s, urso] = poe(s, d, 'Urso'); [s, mask] = poe(s, d, 'Mask of Law and Grace', 'battlefield', { attachedTo: urso });
  [s, fp] = poe(s, a, 'Flaring Pain', 'hand'); [s, bolt] = poe(s, a, 'End the Festivities', 'hand');
  s = resolve(act(s, { t: 'cast', p: a, oid: fp }));
  s = J(s); s.facts['End the Festivities'].colors = ['R']; // varredura vermelha: não mira, então a proteção só previne o dano
  s = passaAte(act(s, { t: 'cast', p: a, oid: bolt }), x => !x.stack.length);
  assert.equal(s.objects[urso].damage || (s.objects[urso].zone === 'graveyard' ? 1 : 0), 1, 'proteção contra vermelho não preveniu depois da Flaring Pain');
});

test('Leva 106 · Standard Bearer: só mágica e habilidade ativada, depois da cor, e basta um alvo ser ele', () => {
  let s = jogo(); const a = s.turn.active, d = 1 - a; let sb, azul, reb, fr, urso;
  [s, sb] = poe(s, d, 'Standard Bearer'); [s, azul] = poe(s, d, 'Gaivota'); [s, reb] = poe(s, a, 'Red Elemental Blast', 'hand');
  s = J(s); s.facts.Gaivota.colors = ['U'];
  s.facts['Red Elemental Blast'].script = S.SCRIPTS['Red Elemental Blast'];
  const ops = E.legalActions(s, a).filter(x => x.t === 'cast' && x.oid === reb && (x.targets || []).some(t => t.oid === azul));
  assert.ok(ops.length, 'o Standard Bearer não é azul: o REB pode destruir a Gaivota (antes: nenhum alvo)');
  // gatilho não obedece ao porta-estandarte: Brinebarrow Intruder mira a Gaivota
  let bi; [s, bi] = poe(s, a, 'Brinebarrow Intruder', 'hand');
  s = act(s, { t: 'cast', p: a, oid: bi }); s = act(s, { t: 'pass', p: a }); s = act(s, { t: 'pass', p: d });
  if (s.pending && s.pending.kind === 'pick_target') assert.ok(J(s.pending.options).some(o => o.oid === azul), 'o gatilho escolhe livremente');
});

test('Leva 106 · Kor Skyfisher e carnários: a permanente/terreno volta por escolha na resolução, sem alvo', () => {
  let s = jogo(); const a = s.turn.active; let ks, pedra, f1;
  [s, pedra] = poe(s, a, 'Pedra'); [s, f1] = poe(s, a, 'Forest'); [s, ks] = poe(s, a, 'Kor Skyfisher', 'hand');
  s = act(s, { t: 'cast', p: a, oid: ks });
  s = passaAte(s, x => !!x.pending || (!x.stack.length && x.objects[ks].zone === 'battlefield'));
  s = passaAte(s, x => !!x.pending);
  assert.equal(s.pending.kind, 'pick', 'escolha na resolução (antes: alvo ao entrar)');
  assert.ok(J(s.pending.from).includes(ks), 'pode devolver a si mesma');
  s = act(s, { t: 'pick', p: a, oid: pedra }); if (s.pending && s.pending.kind === 'pick') s = act(s, { t: 'pick_done', p: a });
  assert.equal(s.objects[pedra].zone, 'hand');
  let rc; [s, rc] = poe(s, a, 'Rakdos Carnarium');
  s = act(s, { t: 'move', p: a, oid: rc, to: 'hand' }); s = act(s, { t: 'move', p: a, oid: rc, to: 'battlefield' });
  s = passaAte(s, x => !!x.pending || !x.stack.length);
  if (s.pending) { assert.equal(s.pending.kind, 'pick'); assert.ok(J(s.pending.from).every(o => s.facts[s.objects[o].name].types.includes('land')), 'só terrenos'); }
});

test('Leva 106 · adaptar usa a pilha: o oponente pode responder antes dos marcadores', () => {
  let s = jogo(); const a = s.turn.active; let ew;
  [s, ew] = poe(s, a, 'Evolution Witness');
  s = act(s, { t: 'activate', p: a, oid: ew, index: 0 });
  assert.equal(s.objects[ew].counters.p1p1 || 0, 0, 'ainda sem marcadores (antes: na hora do custo)');
  assert.equal(s.stack.length, 1);
  s = passaAte(s, x => !x.stack.length || !!x.pending);
  assert.equal(s.objects[ew].counters.p1p1, 2);
});

test('Leva 106 · proteção contra a cor derruba a aura dessa cor (702.16c)', () => {
  let s = jogo(); const a = s.turn.active, d = 1 - a; let urso, cryo, mask;
  [s, urso] = poe(s, a, 'Urso'); [s, cryo] = poe(s, d, 'Cryoshatter', 'battlefield', { attachedTo: urso });
  s = J(s); s.facts.Cryoshatter.colors = ['B']; // cor de teste: a Mask protege de preto e vermelho
  [s, mask] = poe(s, a, 'Mask of Law and Grace', 'hand');
  s = resolve(act(s, { t: 'cast', p: a, oid: mask, targets: [{ oid: urso }] }));
  assert.equal(s.objects[cryo].zone, 'graveyard', 'a aura preta caiu (antes: continuava)');
});

test('Leva 106 · Distant Melody oferece todos os tipos, o que mais rende primeiro', () => {
  let s = jogo(); const a = s.turn.active; let dm;
  for (const n of ['Llanowar Elves', 'Elvish Vanguard', 'Timberwatch Elf']) [s] = poe(s, a, n);
  [s, dm] = poe(s, a, 'Distant Melody', 'hand');
  s = J(s); [['Llanowar Elves', 'Druid'], ['Elvish Vanguard', 'Warrior'], ['Timberwatch Elf', 'Scout']].forEach(([n, t]) => { s.facts[n].typeText = 'Creature — Elf ' + t; });
  s = passaAte(act(s, { t: 'cast', p: a, oid: dm }), x => !!x.pending);
  assert.equal(s.pending.kind, 'choose_type'); assert.equal(s.pending.options[0], 'Elf');
});

test('Leva 106 · esgueirar-se é conjurar: Leonardo vai para a pilha e pode ser anulado', () => {
  let s = jogo(); const a = s.turn.active, d = 1 - a; let urso, leo, cs;
  [s, urso] = poe(s, a, 'Urso'); [s, leo] = poe(s, a, 'Leonardo, Big Brother', 'hand'); [s, cs] = poe(s, d, 'Counterspell', 'hand');
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers');
  s = act(s, { t: 'attack', p: a, attackers: [urso] });
  s = passaAte(s, x => x.turn.step === 'combat_blockers' && x.turn.priority === a && !x.pending);
  const sn = E.legalActions(s, a).find(x => x.t === 'ninjutsu' && x.oid === leo && x.sneak);
  assert.ok(sn, 'a mesa oferece esgueirar-se');
  s = act(s, sn);
  assert.equal(s.objects[leo].zone, 'stack', 'na pilha (antes: direto no campo)');
  s = act(s, { t: 'pass', p: a }); s = act(s, { t: 'cast', p: d, oid: cs, targets: [{ oid: leo }] });
  s = passaAte(s, x => !x.stack.length);
  assert.equal(s.objects[leo].zone, 'graveyard', 'anulado');
});

test('Leva 106 · Distant Melody não corta a lista de tipos em 12', () => {
  let s = jogo(); const a = s.turn.active; let dm;
  const nomes = ['Llanowar Elves', 'Elvish Vanguard', 'Timberwatch Elf', 'Urso', 'Gaivota'];
  for (const n of nomes) [s] = poe(s, a, n);
  [s, dm] = poe(s, a, 'Distant Melody', 'hand');
  s = J(s); nomes.forEach((n, i) => { s.facts[n].typeText = `Creature — T${i}a T${i}b T${i}c`; if (!s.facts[n].types.includes('creature')) s.facts[n].types.push('creature'); });
  s = passaAte(act(s, { t: 'cast', p: a, oid: dm }), x => !!x.pending);
  assert.equal(s.pending.options.length, 15, 'os 15 tipos (antes: 12)');
});

/* ---------------- Leva 107 · auditoria texto × script, parte 3 (achados de impacto baixo) ---------------- */
const fatos = (s, name, type_line, extra = {}) => { s.facts[name] = E.cardFacts({ name, type_line, mana_cost: '', cmc: 0, keywords: [], oracle_text: '', ...extra }); if (S.SCRIPTS[name]) s.facts[name].script = S.SCRIPTS[name]; };

test('Leva 107 · Rancor exilado com o gatilho na pilha não volta para a mão', () => {
  let s = jogo(); const a = s.turn.active; let urso, ran;
  [s, urso] = poe(s, a, 'Urso'); [s, ran] = poe(s, a, 'Rancor', 'battlefield', { attachedTo: urso });
  s = act(s, { t: 'move', p: a, oid: urso, to: 'graveyard' });
  assert.equal(s.objects[ran].zone, 'graveyard'); assert.ok(s.stack.length, 'gatilho na pilha');
  s = act(s, { t: 'move', p: a, oid: ran, to: 'exile' });
  s = passaAte(s, x => !x.stack.length);
  assert.equal(s.objects[ran].zone, 'exile', 'fica no exílio (antes: voltava para a mão)');
});

test("Leva 107 · Sentinel's Eyes com fuga: o jogador escolhe quais duas cartas exila", () => {
  let s = jogo(); const a = s.turn.active; let se, g1, g2, g3, urso;
  [s, urso] = poe(s, a, 'Urso'); [s, se] = poe(s, a, "Sentinel's Eyes", 'graveyard');
  [s, g1] = poe(s, a, 'Gaivota', 'graveyard'); [s, g2] = poe(s, a, 'Pedra', 'graveyard'); [s, g3] = poe(s, a, 'Island', 'graveyard');
  const ops = E.legalActions(s, a).filter(x => x.t === 'cast' && x.oid === se && x.escape && x.targets[0].oid === urso);
  assert.equal(new Set(ops.map(x => J(x.pay.exileGrave).sort().join())).size, 3, 'três pares possíveis (antes: sempre os dois primeiros)');
  const par = [g2, g3];
  s = act(s, ops.find(x => J(x.pay.exileGrave).sort().join() === par.slice().sort().join()));
  assert.deepEqual([s.objects[g1].zone, s.objects[g2].zone, s.objects[g3].zone], ['graveyard', 'exile', 'exile']);
});

test('Leva 107 · Abundant Growth e Utopia Sprawl encantam terreno de qualquer jogador', () => {
  let s = jogo(); const a = s.turn.active, d = 1 - a; let ag, us, fd;
  [s, fd] = poe(s, d, 'Forest'); [s, ag] = poe(s, a, 'Abundant Growth', 'hand'); [s, us] = poe(s, a, 'Utopia Sprawl', 'hand');
  s = J(s); s.facts.Forest.typeText = 'Basic Land — Forest';
  assert.ok(E.legalActions(s, a).some(x => x.t === 'cast' && x.oid === ag && x.targets[0].oid === fd), '"Enchant land"');
  assert.ok(E.legalActions(s, a).some(x => x.t === 'cast' && x.oid === us && x.targets[0].oid === fd), '"Enchant Forest"');
});

test('Leva 107 · Smash to Smithereens: o dano vai para quem controlava o artefato, não para o dono', () => {
  let s = jogo(); const a = s.turn.active, d = 1 - a; let sm, pedra;
  [s, pedra] = poe(s, d, 'Pedra'); s = J(s); s.objects[pedra].controller = a; s.zones[d].battlefield = s.zones[d].battlefield.filter(x => x !== pedra); s.zones[a].battlefield.push(pedra);
  [s, sm] = poe(s, d, 'Smash to Smithereens', 'hand'); s.facts['Smash to Smithereens'].types = ['instant'];
  s.turn.priority = d;
  const va = s.players[a].life, vd = s.players[d].life;
  s = passaAte(act(s, { t: 'cast', p: d, oid: sm, targets: [{ oid: pedra }] }), x => !x.stack.length);
  assert.deepEqual([s.players[a].life, s.players[d].life], [va - 3, vd], 'quem roubou leva os 3 (antes: o dono)');
});

test('Leva 107 · Aura Gnarlid conta toda Aura, com ou sem script, e a criatura concedida', () => {
  let s = jogo(); const a = s.turn.active; let gn, urso, au;
  [s, gn] = poe(s, a, 'Aura Gnarlid'); [s, urso] = poe(s, a, 'Urso'); [s, au] = poe(s, a, 'Pedra', 'battlefield', { attachedTo: urso });
  s = J(s); s.facts.Pedra.typeText = 'Enchantment — Aura'; s.facts.Pedra.types = ['enchantment'];
  assert.deepEqual(stats(s, gn), [2, 2], 'base de teste 1/1 + 1 Aura sem script (antes: 1/1, não contava)');
});

test('Leva 107 · Setessan Training cai quando outro jogador passa a controlar a criatura', () => {
  let s = jogo(); const a = s.turn.active, d = 1 - a; let urso, st;
  [s, urso] = poe(s, a, 'Urso'); [s, st] = poe(s, a, 'Setessan Training', 'battlefield', { attachedTo: urso });
  s = J(s); s.objects[urso].controller = d; s.zones[a].battlefield = s.zones[a].battlefield.filter(x => x !== urso); s.zones[d].battlefield.push(urso);
  s = act(s, { t: 'pass', p: s.turn.priority });
  assert.equal(s.objects[st].zone, 'graveyard', '"Enchant creature you control"');
});

test('Leva 107 · Journey to Nowhere que sai antes do exílio resolver: a criatura fica exilada para sempre', () => {
  let s = jogo(); const a = s.turn.active, d = 1 - a; let jn, alvo;
  [s, alvo] = poe(s, d, 'Urso'); [s, jn] = poe(s, a, 'Journey to Nowhere', 'hand');
  s = passaAte(act(s, { t: 'cast', p: a, oid: jn }), x => x.objects[jn].zone === 'battlefield');
  s = passaAte(s, x => x.stack.length && x.stack.some(o => x.objects[o].ability) || !!x.pending);
  if (s.pending && s.pending.kind === 'pick_target') s = act(s, { t: 'pick_target', p: a, index: J(s.pending.options).findIndex(o => o.oid === alvo) });
  s = act(s, { t: 'move', p: a, oid: jn, to: 'graveyard' }); // sai com o exílio ainda na pilha
  s = passaAte(s, x => !x.stack.length);
  assert.equal(s.objects[alvo].zone, 'exile');
  assert.equal(s.objects[jn].holding, undefined, 'nada guardado para devolver depois');
  s = act(s, { t: 'move', p: a, oid: jn, to: 'battlefield' }); s = act(s, { t: 'move', p: a, oid: jn, to: 'graveyard' });
  s = passaAte(s, x => !x.stack.length && !x.pending);
  assert.equal(s.objects[alvo].zone, 'exile', 'uma nova Journey saindo não devolve a criatura antiga');
});

test('Leva 107 · Luminous Phantom (face de trás do Lunarch Veteran) é branca e Spirit Cleric', () => {
  const s = jogo();
  assert.deepEqual(J(s.facts['Luminous Phantom'].colors), ['W']);
  assert.match(s.facts['Luminous Phantom'].typeText, /Spirit Cleric/);
});

test('Leva 107 · Hydroblast mira qualquer mágica; só anula se ela for vermelha na resolução', () => {
  let s = jogo(); const a = s.turn.active, d = 1 - a; let hb, ilha, verm;
  [s, ilha] = poe(s, d, 'Counterspell', 'hand'); [s, hb] = poe(s, a, 'Hydroblast', 'hand');
  s = J(s); s.facts.Counterspell.colors = ['U']; s.turn.priority = d;
  let raio; [s, raio] = poe(s, d, 'Lightning Bolt', 'hand'); s.facts['Lightning Bolt'].colors = ['R'];
  s = act(s, { t: 'cast', p: d, oid: raio, targets: [{ player: a }] }); s = act(s, { t: 'pass', p: d });
  const alvos = E.legalActions(s, a).filter(x => x.t === 'cast' && x.oid === hb && (x.mode || 0) === 0).map(x => x.targets[0].oid);
  assert.ok(alvos.includes(raio));
  s = passaAte(act(s, { t: 'cast', p: a, oid: hb, mode: 0, targets: [{ oid: raio }] }), x => !x.stack.length);
  assert.equal(s.objects[raio].zone, 'graveyard'); assert.equal(s.players[a].life, 20, 'vermelha: anulada');
  // mágica azul: pode ser alvo (antes: não) e resolve sem anular
  let hb2, dur; [s, hb2] = poe(s, a, 'Hydroblast', 'hand'); [s, dur] = poe(s, d, 'Duress', 'hand');
  s = J(s); s.facts.Duress.colors = ['B']; s.facts.Duress.types = ['instant']; s.turn.priority = d;
  s = act(s, { t: 'cast', p: d, oid: dur, targets: [{ player: a }] }); s = act(s, { t: 'pass', p: d });
  assert.ok(E.legalActions(s, a).some(x => x.t === 'cast' && x.oid === hb2 && (x.mode || 0) === 0 && x.targets[0].oid === dur), 'mágica preta pode ser alvo');
  s = act(s, { t: 'cast', p: a, oid: hb2, mode: 0, targets: [{ oid: dur }] }); s = act(s, { t: 'pass', p: a }); s = act(s, { t: 'pass', p: d });
  assert.equal(s.objects[dur].zone, 'stack', 'não é vermelha: o Hydroblast não fez nada');
});

test('Leva 107 · Faerie Miscreant: sem a outra Miscreant na resolução, não compra (603.4)', () => {
  let s = jogo(); const a = s.turn.active; let m1, m2;
  [s, m1] = poe(s, a, 'Faerie Miscreant'); [s, m2] = poe(s, a, 'Faerie Miscreant', 'hand');
  s = act(s, { t: 'cast', p: a, oid: m2 }); s = act(s, { t: 'pass', p: a }); s = act(s, { t: 'pass', p: s.turn.priority });
  assert.ok(s.stack.length, 'o gatilho disparou');
  const mao = s.zones[a].hand.length;
  s = act(s, { t: 'move', p: a, oid: m1, to: 'graveyard' });
  s = passaAte(s, x => !x.stack.length);
  assert.equal(s.zones[a].hand.length, mao, 'não comprou (antes: comprava)');
});

test('Leva 107 · Moon-Circuit Hacker que entrou neste turno não obriga a descartar, mesmo fora do campo', () => {
  let s = jogo(); const a = s.turn.active; let hk;
  [s, hk] = poe(s, a, 'Moon-Circuit Hacker', 'hand');
  s = act(s, { t: 'move', p: a, oid: hk, to: 'battlefield' }); s = act(s, { t: 'move', p: a, oid: hk, to: 'graveyard' });
  s = J(s); s.objects.abx = { oid: 'abx', ability: true, name: 'Moon-Circuit Hacker', source: hk, controller: a, owner: a, zone: 'stack', targets: [], counters: {},
    effects: S.SCRIPTS['Moon-Circuit Hacker'].abilities[0].effects, optionalTrigger: true }; s.stack.push('abx');
  s = passaAte(s, x => !!x.pending);
  s = act(s, { t: 'pay', p: a });
  assert.ok(!(s.pending && s.pending.kind === 'discard'), 'entrou neste turno: não descarta (antes: descartava)');
});

test('Leva 107 · Duress mostra a mão inteira do oponente; só as que servem podem ser escolhidas', () => {
  let s = jogo(); const a = s.turn.active, d = 1 - a; let du, ct;
  [s, ct] = poe(s, d, 'Counterspell', 'hand'); [s, du] = poe(s, a, 'Duress', 'hand');
  s = passaAte(act(s, { t: 'cast', p: a, oid: du, targets: [{ player: d }] }), x => !!x.pending);
  if (s.pending.kind === 'pick') assert.deepEqual(J(s.pending.mostrar).sort(), J(s.zones[d].hand).sort());
});

test('Leva 107 · Martyr of Sands: o jogador escolhe quantas cartas brancas revela', () => {
  let s = jogo(); const a = s.turn.active; let ms, w1, w2;
  [s, ms] = poe(s, a, 'Martyr of Sands'); [s, w1] = poe(s, a, 'Urso', 'hand'); [s, w2] = poe(s, a, 'Gaivota', 'hand');
  s = J(s); s.facts.Urso.colors = ['W']; s.facts.Gaivota.colors = ['W'];
  const opcoes = [...new Set(E.legalActions(s, a).filter(x => x.t === 'activate' && x.oid === ms).map(x => x.pay.revelar))].sort();
  assert.ok(opcoes.includes(0) && opcoes.includes(1) && opcoes.includes(2), 'de 0 a 2 (antes: sempre todas)');
  const vida = s.players[a].life;
  s = passaAte(act(s, { t: 'activate', p: a, oid: ms, index: 0, pay: { revelar: 1 } }), x => !x.stack.length);
  assert.equal(s.players[a].life, vida + 3);
});

test('Leva 107 · Priest of Titania e Timberwatch Elf: metamorfo conta como Elfo, virado para baixo não', () => {
  let s = jogo(); const a = s.turn.active; let pt, mv, bir;
  [s, pt] = poe(s, a, 'Priest of Titania'); [s, bir] = poe(s, a, 'Birchlore Rangers', 'battlefield', { faceDown: true });
  s = J(s); s.facts['Priest of Titania'].typeText = 'Creature — Elf Druid'; s.facts['Birchlore Rangers'].typeText = 'Creature — Elf Druid Ranger';
  assert.deepEqual(J(E.productions(s, s.objects[pt])), [['G']], 'a Birchlore virada para baixo não é Elfo (antes: contava)');
  [s, mv] = poe(s, a, 'Masked Vandal');
  assert.deepEqual(J(E.productions(s, s.objects[pt])), [['G', 'G']], 'o Masked Vandal (changeling) conta');
});

test('Leva 107 · Lys Alana Huntmaster não dispara com Elfo conjurado virado para baixo', () => {
  let s = jogo(); const a = s.turn.active; let la, bir;
  [s, la] = poe(s, a, 'Lys Alana Huntmaster'); [s, bir] = poe(s, a, 'Birchlore Rangers', 'hand');
  s = J(s); s.facts['Birchlore Rangers'].typeText = 'Creature — Elf Druid Ranger';
  s = act(s, { t: 'cast', p: a, oid: bir, faceDown: true });
  assert.equal(s.stack.length, 1, 'só a mágica, sem o gatilho (antes: disparava)');
});

test('Leva 107 · Negate e Spell Pierce miram mágica concedida (é Aura, não criatura)', () => {
  let [s, a] = jogoComMana(5); const d = 1 - a; let hid, urso, ng;
  [s, hid] = poe(s, a, 'Nyxborn Hydra', 'hand'); [s, urso] = poe(s, a, 'Urso'); [s, ng] = poe(s, d, 'Negate', 'hand');
  s = act(s, { t: 'cast', p: a, oid: hid, bestow: true, x: 1, targets: [{ oid: urso }] });
  s = act(s, { t: 'pass', p: a }); s = J(s); s.manaCheck = false;
  assert.ok(E.legalActions(s, d).some(x => x.t === 'cast' && x.oid === ng && x.targets[0].oid === hid), 'antes: não dava');
});

test('Leva 107 · End the Festivities também atinge planeswalker do oponente', () => {
  let s = jogo(); const a = s.turn.active, d = 1 - a; let ef, pw;
  [s, pw] = poe(s, d, 'Pedra'); s = J(s); s.facts.Pedra.types = ['planeswalker']; s.objects[pw].counters.loyalty = 3;
  [s, ef] = poe(s, a, 'End the Festivities', 'hand');
  s = passaAte(act(s, { t: 'cast', p: a, oid: ef }), x => !x.stack.length);
  assert.equal(s.objects[pw].counters.loyalty, 2, 'perdeu 1 de lealdade (antes: nada)');
});

test('Leva 107 · Refurbished Familiar: cada oponente descarta, sem alvo', () => {
  const sc = S.SCRIPTS['Refurbished Familiar'];
  assert.equal(sc.abilities[0].effects[1].target, 'each-opponent');
  let s = jogo(); const a = s.turn.active, d = 1 - a; let rf;
  [s, rf] = poe(s, a, 'Refurbished Familiar', 'hand');
  s = passaAte(act(s, { t: 'cast', p: a, oid: rf }), x => !!x.pending);
  assert.deepEqual([s.pending.kind, s.pending.p], ['discard', d]);
});

/* ---------------- Leva 108 · homologação por leitura independente (motor v61) ---------------- */
test('Leva 108 · Benevolent Blessing não derruba as auras e equipamentos que você já tinha anexados', () => {
  let s = jogo(); const a = s.turn.active; let urso, ran, bb;
  [s, urso] = poe(s, a, 'Urso'); [s, ran] = poe(s, a, 'Rancor', 'battlefield', { attachedTo: urso });
  s = J(s); s.facts.Rancor.colors = ['G'];
  [s, bb] = poe(s, a, 'Benevolent Blessing', 'battlefield', { attachedTo: urso, chosenColor: 'G' });
  s = act(s, { t: 'pass', p: s.turn.priority });
  assert.equal(s.objects[ran].zone, 'battlefield', 'o Rancor verde continua (antes da correção: caía)');
  assert.equal(s.objects[bb].zone, 'battlefield');
});

test('Leva 108 · Secret Door: aventurar-se não oferece a Cidade Baixa (só a iniciativa leva a ela)', () => {
  let s = jogo(); const a = s.turn.active; let sd;
  [s, sd] = poe(s, a, 'Secret Door');
  s = passaAte(act(s, { t: 'activate', p: a, oid: sd, index: 0 }), x => !!x.pending || !x.stack.length);
  if (s.pending && s.pending.kind === 'choose_dungeon') assert.ok(!J(s.pending.options).includes('Undercity'));
  else assert.notEqual(s.players[a].dungeon && s.players[a].dungeon.name, 'Undercity');
});

test('Leva 108 · buscar sem achar nada ainda embaralha (Sheltering Landscape, Squadron Hawk)', () => {
  let s = jogo(); const a = s.turn.active; let sl;
  [s, sl] = poe(s, a, 'Sheltering Landscape');
  s = J(s); s.zones[a].library = s.zones[a].library.filter(x => !/^(Forest|Plains|Mountain)$/.test(s.objects[x].name));
  const antes = J(s.zones[a].library);
  s = passaAte(act(s, { t: 'activate', p: a, oid: sl, index: 0 }), x => !x.stack.length || !!x.pending);
  assert.notDeepEqual(J(s.zones[a].library), antes, 'a ordem mudou: embaralhou (antes: ficava igual)');
});

test('Leva 108 · Cryoshatter não mira (não cobra ward) e destrói mesmo se a aura sair antes', () => {
  let s = jogo(); const a = s.turn.active, d = 1 - a; let crab, cryo;
  [s, crab] = poe(s, a, 'Mirrorshell Crab'); [s, cryo] = poe(s, d, 'Cryoshatter', 'battlefield', { attachedTo: crab });
  s = act(s, { t: 'tap', p: a, oid: crab });
  assert.ok(!(s.pending && s.pending.kind === 'may_pay'), 'sem cobrança de ward');
  s = act(s, { t: 'move', p: s.turn.priority, oid: cryo, to: 'graveyard' });
  s = passaAte(s, x => !x.stack.length);
  assert.equal(s.objects[crab].zone, 'graveyard', 'destruída mesmo com a aura fora');
});

test('Leva 108 · conjurar pela insanidade conta para tempestade e dispara "quando você conjura"', () => {
  let s = jogo(); const a = s.turn.active, d = 1 - a; let grab, ft;
  [s, grab] = poe(s, a, 'Grab the Prize', 'hand'); [s, ft] = poe(s, a, 'Fiery Temper', 'hand');
  s = act(s, { t: 'cast', p: a, oid: grab, pay: { discard: [ft] } });
  const antes = s.spellsThisTurn;
  s = act(s, { t: 'cast_madness', p: a, targets: [{ player: d }] });
  assert.equal(s.spellsThisTurn, antes + 1, 'conta como mágica conjurada (antes: não)');
});

test('Leva 108 · Duress sem carta que sirva ainda revela a mão', () => {
  let s = jogo(); const a = s.turn.active, d = 1 - a; let du;
  s = J(s); for (const x of s.zones[d].hand.slice()) if (!['land', 'creature'].some(t => s.facts[s.objects[x].name].types.includes(t))) { s.zones[d].hand = s.zones[d].hand.filter(y => y !== x); s.zones[d].library.push(x); s.objects[x].zone = 'library'; }
  [s] = poe(s, d, 'Urso', 'hand');
  [s, du] = poe(s, a, 'Duress', 'hand');
  s = passaAte(act(s, { t: 'cast', p: a, oid: du, targets: [{ player: d }] }), x => !!x.pending || !x.stack.length);
  assert.ok(s.pending && s.pending.kind === 'pick' && s.pending.mostrar.length === s.zones[d].hand.length, 'mão revelada para confirmar');
  s = act(s, { t: 'pick_done', p: a });
  assert.equal(s.pending, null);
});

test('Leva 108 · Brinebarrow Intruder não mira mágica concedida em campo (Aura, não criatura)', () => {
  let s = jogo(); const a = s.turn.active, d = 1 - a; let urso, hid, bi;
  [s, urso] = poe(s, d, 'Urso'); [s, hid] = poe(s, d, 'Nyxborn Hydra', 'battlefield', { attachedTo: urso, bestowed: true });
  s = J(s); s.facts['Nyxborn Hydra'] = E.cardFacts({ name: 'Nyxborn Hydra', type_line: 'Enchantment Creature — Hydra', mana_cost: '{X}{G}', cmc: 1, power: '0', toughness: '0', keywords: [], oracle_text: '' });
  s.facts['Nyxborn Hydra'].script = S.SCRIPTS['Nyxborn Hydra'];
  [s, bi] = poe(s, a, 'Brinebarrow Intruder', 'hand');
  s = act(s, { t: 'cast', p: a, oid: bi }); s = act(s, { t: 'pass', p: a }); s = act(s, { t: 'pass', p: d });
  const opcoes = s.pending && s.pending.kind === 'pick_target' ? J(s.pending.options).map(o => o.oid) : J(s.stack.map(x => s.objects[x]).filter(o => o.ability).flatMap(o => o.targets.map(t => t.oid)));
  assert.ok(!opcoes.includes(hid), 'a Hydra concedida não é criatura');
});

test('Leva 108 · Malevolent Rumble revela as quatro cartas na linha do tempo', () => {
  let s = jogo(); const a = s.turn.active; let mr;
  [s, mr] = poe(s, a, 'Malevolent Rumble', 'hand');
  s = act(s, { t: 'cast', p: a, oid: mr }); s = act(s, { t: 'pass', p: a });
  const r = E.apply(s, { t: 'pass', p: s.turn.priority });
  assert.ok(r.events.some(e => e.do === 'reveal' && e.target.split(', ').length === 4));
});

test('Leva 108 · Birchlore virada para baixo não conta como Elfo no custo', () => {
  let s = jogo(); const a = s.turn.active; let b1, b2;
  [s, b1] = poe(s, a, 'Birchlore Rangers'); [s, b2] = poe(s, a, 'Birchlore Rangers', 'battlefield', { faceDown: true });
  s = J(s); s.facts['Birchlore Rangers'].typeText = 'Creature — Elf Druid Ranger';
  const ops = E.legalActions(s, a).filter(x => x.t === 'activate' && x.oid === b1);
  assert.ok(!ops.some(x => (x.pay.tapOther || []).includes(b2)), 'a virada para baixo não serve');
});

test('Leva 110 · "qualquer alvo" com a mesa cheia: os dois jogadores e todas as criaturas continuam alvo (Fiery Temper pela insanidade, Lightning Bolt)', () => {
  // achado do usuário no aparelho (30/09/2026): o Fiery Temper pela insanidade não oferecia mirar o oponente nem a si mesmo.
  // Texto oficial (.listas/oficiais.json, 30/09/2026): "Fiery Temper deals 3 damage to any target."
  let s = jogo(); const a = s.turn.active, d = 1 - a; let grab, temper;
  const criaturas = [];
  for (const q of [a, d]) for (const n of ['Urso', 'Urso', 'Urso', 'Gaivota', 'Gaivota', 'Gaivota']) { let o; [s, o] = poe(s, q, n); criaturas.push(o); }
  [s, grab] = poe(s, a, 'Grab the Prize', 'hand'); [s, temper] = poe(s, a, 'Fiery Temper', 'hand');
  s = act(s, { t: 'cast', p: a, oid: grab, pay: { discard: [temper] } });
  assert.equal(s.pending && s.pending.kind, 'madness');
  const alvos = J(E.legalActions(s, a)).filter(x => x.t === 'cast_madness').map(x => x.targets[0]);
  assert.ok(alvos.some(x => x.player === d), 'o oponente é alvo (antes: cortado depois de 10 permanentes)');
  assert.ok(alvos.some(x => x.player === a), 'você mesmo é alvo');
  assert.equal(alvos.filter(x => x.oid != null).length, criaturas.length, 'todas as 12 criaturas são alvo');
  s = passaAte(act(s, { t: 'cast_madness', p: a, targets: [{ player: a }] }), x => !x.stack.length);
  assert.equal(s.players[a].life, 20 - 3, 'mirou em si mesmo');
});

// Leva 111 · relato do usuário (30/09/2026, foto do aparelho): a ficha de Sangue abria sem habilidade. A mesa traz a
// carta da ficha (imagem e texto da Scryfall) e o motor já tinha os fatos dela sem script, então a ficha nascia sem
// habilidade. Textos das fichas predefinidas (Oracle do Forge, tokenscripts, consulta de 30/09/2026):
//   Treasure "{T}, Sacrifice this token: Add one mana of any color."   Clue "{2}, Sacrifice this token: Draw a card."
//   Food "{2}, {T}, Sacrifice this token: You gain 3 life."   Blood "{1}, {T}, Discard a card, Sacrifice this token: Draw a card."
//   Map "{1}, {T}, Sacrifice this token: Target creature you control explores. Activate only as a sorcery."
const FICHAS_DA_MESA = {
  Treasure: card('Treasure', 'Token Artifact — Treasure', { oracle_text: '{T}, Sacrifice this token: Add one mana of any color.' }),
  Clue: card('Clue', 'Token Artifact — Clue', { oracle_text: '{2}, Sacrifice this token: Draw a card.' }),
  Food: card('Food', 'Token Artifact — Food', { oracle_text: '{2}, {T}, Sacrifice this token: You gain 3 life.' }),
  Blood: card('Blood', 'Token Artifact — Blood', { oracle_text: '{1}, {T}, Discard a card, Sacrifice this token: Draw a card.' }),
  Map: card('Map', 'Token Artifact — Map', { oracle_text: '{1}, {T}, Sacrifice this token: Target creature you control explores. Activate only as a sorcery.' }),
  'Eldrazi Spawn': card('Eldrazi Spawn', 'Token Creature — Eldrazi Spawn', { pt: [0, 1], oracle_text: 'Sacrifice this token: Add {C}.' })
};
function jogoComFichas(seed = 1) {
  let s = E.createGame({ format: 'livre', seed, mode: 'assisted', manaCheck: false, cards: { ...CARDS, ...FICHAS_DA_MESA }, players: [{ name: 'A', deck: DECK }, { name: 'B', deck: DECK }] });
  for (let p = 0; p < 2; p++) s = E.apply(s, { t: 'keep', p, bottom: [] }).state;
  for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = E.apply(s, { t: 'pass', p: s.turn.priority }).state;
  return s;
}
const fichas = (s, p, nome) => s.zones[p].battlefield.filter(o => s.objects[o].token && s.objects[o].name === nome);
const ativa = (s, p, oid) => J(E.legalActions(s, p)).filter(x => x.t === 'activate' && x.oid === oid);

test('Leva 111 · Blood com a carta da ficha na mesa: {1}, {T}, descartar e sacrificar compram uma carta', () => {
  for (const s0 of [jogo(), jogoComFichas()]) {
    let s = s0; const a = s.turn.active; let epi, lixo;
    [s, epi] = poe(s, a, 'Voldaren Epicure', 'hand'); [s, lixo] = poe(s, a, 'Urso', 'hand');
    s = passaAte(act(s, { t: 'cast', p: a, oid: epi }), x => !x.stack.length);
    const [blood] = fichas(s, a, 'Blood');
    const op = ativa(s, a, blood);
    assert.ok(op.length, 'a ficha de Sangue oferece a habilidade (antes: nenhuma com a carta da ficha na mesa)');
    const comUrso = op.find(x => J(x.pay || {}).discard && x.pay.discard.includes(lixo));
    assert.ok(comUrso, 'o descarte é escolha do jogador');
    const mao = s.zones[a].hand.length;
    s = passaAte(act(s, comUrso), x => !x.stack.length);
    assert.equal(s.objects[lixo].zone, 'graveyard'); assert.equal(fichas(s, a, 'Blood').length, 0, 'sacrificada');
    assert.equal(s.zones[a].hand.length, mao - 1 + 1, 'descartou uma, comprou uma');
  }
});

test('Leva 111 · Clue, Food, Map, Treasure e Eldrazi Spawn funcionam com a carta da ficha na mesa', () => {
  let s = jogoComFichas(); const a = s.turn.active, d = 1 - a; let x;
  // Clue (Thraben Inspector): {2}, sacrificar: compra
  [s, x] = poe(s, a, 'Thraben Inspector', 'hand'); s = passaAte(act(s, { t: 'cast', p: a, oid: x }), y => !y.stack.length);
  const [clue] = fichas(s, a, 'Clue'); const mao = s.zones[a].hand.length;
  assert.equal(ativa(s, a, clue).length, 1, 'Clue ativa');
  s = passaAte(act(s, ativa(s, a, clue)[0]), y => !y.stack.length);
  assert.equal(s.zones[a].hand.length, mao + 1); assert.equal(fichas(s, a, 'Clue').length, 0);
  // Eldrazi Spawn (Writhing Chrysalis, ao conjurar): sacrificar gera {C}
  [s, x] = poe(s, a, 'Writhing Chrysalis', 'hand'); s = passaAte(act(s, { t: 'cast', p: a, oid: x }), y => !y.stack.length);
  const spawns = fichas(s, a, 'Eldrazi Spawn'); assert.equal(spawns.length, 2);
  const gera = J(E.legalActions(s, a)).filter(y => y.oid === spawns[0] && (y.t === 'activate' || y.t === 'tap_mana'));
  assert.ok(gera.length, 'Spawn gera mana');
  s = act(s, gera[0]); assert.equal(s.players[a].pool.C, 1); assert.equal(fichas(s, a, 'Eldrazi Spawn').length, 1, 'sacrificada para gerar');
  // Treasure (An Offer You Can't Refuse): o controlador da mágica anulada cria dois; virar e sacrificar gera qualquer cor
  s = passaAte(s, y => !y.stack.length);
  let pedra, offer;
  [s, pedra] = poe(s, a, 'Pedra', 'hand'); [s, offer] = poe(s, d, "An Offer You Can't Refuse", 'hand');
  s = act(s, { t: 'cast', p: a, oid: pedra }); s = act(s, { t: 'pass', p: a });
  s = passaAte(act(s, { t: 'cast', p: d, oid: offer, targets: [{ oid: pedra }] }), y => !y.stack.length);
  const tesouros = fichas(s, a, 'Treasure'); assert.equal(tesouros.length, 2, 'dois Tesouros para quem teve a mágica anulada');
  const usos = J(E.legalActions(s, a)).filter(y => y.oid === tesouros[0] && (y.t === 'activate' || y.t === 'tap_mana'));
  assert.ok(usos.length >= 5, 'uma opção por cor');
  assert.ok(usos.every(y => y.t === 'activate'), 'só gera sacrificando (nada de virar sem sacrificar pelo texto da carta)');
  s = act(s, usos.find(y => y.color === 'R')); assert.equal(s.players[a].pool.R, 1); assert.equal(fichas(s, a, 'Treasure').length, 1);
});

test('Leva 111 · Food (Sorin) e Map (Fanatical Offering) com a carta da ficha na mesa', () => {
  let s = jogoComFichas(); const a = s.turn.active; let sorin, fo, pedra, urso;
  // Sorin já transformado (face de trás, planeswalker com 3 de lealdade): o +2 cria Comida
  [s, sorin] = poe(s, a, 'Sorin of House Markov', 'battlefield', { name: 'Sorin, Ravenous Neonate', frontName: 'Sorin of House Markov', counters: { loyalty: 3 } });
  const mais2 = J(E.legalActions(s, a)).find(y => y.t === 'activate' && y.oid === sorin && !y.targets);
  assert.ok(mais2, 'Sorin +2 cria Comida');
  s = passaAte(act(s, mais2), y => !y.stack.length);
  const [food] = fichas(s, a, 'Food'); assert.ok(food, 'Comida criada');
  const vida = s.players[a].life;
  assert.equal(ativa(s, a, food).length, 1, 'Comida ativa');
  s = passaAte(act(s, ativa(s, a, food)[0]), y => !y.stack.length);
  assert.equal(s.players[a].life, vida + 3); assert.equal(fichas(s, a, 'Food').length, 0);
  // Map: explorar com criatura sua, só na velocidade de feitiço
  [s, fo] = poe(s, a, 'Fanatical Offering', 'hand'); [s, pedra] = poe(s, a, 'Pedra'); [s, urso] = poe(s, a, 'Urso');
  s = passaAte(act(s, { t: 'cast', p: a, oid: fo, pay: { sacrificeOther: pedra } }), y => !y.stack.length);
  const [mapa] = fichas(s, a, 'Map'); assert.ok(mapa, 'Mapa criado');
  const ops = ativa(s, a, mapa); assert.ok(ops.some(y => (y.targets || [])[0] && y.targets[0].oid === urso), 'Mapa mira criatura sua');
});
