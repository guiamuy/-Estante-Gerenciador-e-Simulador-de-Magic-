// Camada 3b · partida guiada: uma sequência de jogadas escolhida por mim, turno a
// turno, com o resultado conferido em cada passo. Os goldens aleatórios provam que
// o motor é determinístico; esta prova que as cartas das listas conversam entre si —
// gatilho que alimenta contagem, contagem que alimenta mana, mana que paga a próxima.
//
// Declarado: os custos de mana destas cartas são de TESTE ({1} para tudo), porque os
// custos oficiais não estão disponíveis neste ambiente. O que a partida prova é a
// corrente de interações e o encanamento do mana, não a curva real do deck Elves.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
import { PERM_TYPES } from './fixtures.mjs';
const { engine: E } = loadModules();
const J = x => JSON.parse(JSON.stringify(x));
const act = (s, a) => E.apply(s, a).state;

const ELFOS = ['Elvish Vanguard', 'Priest of Titania', 'Timberwatch Elf', 'Lys Alana Huntmaster', 'Quirion Ranger', 'Scattershot Archer'];
const CARDS = {
  Forest: { name: 'Forest', type_line: 'Basic Land — Forest', mana_cost: '', cmc: 0, colors: [], keywords: [], oracle_text: '{T}: Add {G}.' },
  Morcego: { name: 'Morcego', type_line: 'Creature — Bat', mana_cost: '{1}', cmc: 1, colors: ['B'], power: '1', toughness: '1', keywords: ['Flying'], oracle_text: 'Flying' },
  ...Object.fromEntries(ELFOS.map(n => [n, { name: n, type_line: PERM_TYPES[n], mana_cost: '{1}', cmc: 1, colors: ['G'], power: '1', toughness: '1', keywords: [], oracle_text: '' }]))
};
const DECK = [{ name: 'Forest', qty: 24, zone: 'main' }, { name: 'Morcego', qty: 4, zone: 'main' },
  ...ELFOS.map(name => ({ name, qty: 4, zone: 'main' }))];

/** Começa a partida com as duas mãos guardadas e a vez do jogador 0. */
function partida(seed = 101) {
  let s = E.createGame({ format: 'livre', seed, mode: 'assisted', manaCheck: true, cards: CARDS,
    players: [{ name: 'Eu', deck: DECK }, { name: 'Oponente', deck: DECK }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return s;
}
function paraMao(s, p, nome) { // traz uma carta do grimório para a mão, para a jogada ser escolhida
  s = J(s);
  const oid = s.zones[p].library.find(o => s.objects[o].name === nome);
  if (!oid) throw new Error('acabou ' + nome);
  s.zones[p].library.splice(s.zones[p].library.indexOf(oid), 1);
  s.zones[p].hand.push(oid); s.objects[oid].zone = 'hand';
  return [s, oid];
}
const passaAte = (s, passo, max = 60) => { for (let i = 0; i < max && s.turn.step !== passo; i++) s = act(s, { t: 'pass', p: s.turn.priority }); return s; };
/** Vai até a minha próxima fase principal, resolvendo o que aparecer. */
function meuTurno(s, eu) {
  const inicio = s.turn.number;
  for (let i = 0; i < 300; i++) {
    const pd = s.pending;
    if (pd && pd.kind === 'attackers') { s = act(s, { t: 'attack', p: pd.p, attackers: E.mustAttack(s, pd.p) }); continue; }
    if (pd && pd.kind === 'blockers') { s = act(s, { t: 'block', p: pd.p, blocks: [] }); continue; }
    if (pd && pd.kind === 'discard') { s = act(s, { t: 'discard', p: pd.p, oid: s.zones[pd.p].hand[0] }); continue; }
    if (pd && pd.kind === 'may_pay') { s = act(s, { t: 'decline', p: pd.p }); continue; }
    if (pd) throw new Error('parei em ' + pd.kind);
    if (s.turn.number !== inicio && s.turn.step === 'main1' && s.turn.active === eu) return s;
    s = act(s, { t: 'pass', p: s.turn.priority });
  }
  throw new Error('não cheguei na minha fase principal');
}
const resolvePilha = s => { for (let i = 0; i < 10 && s.stack.length && !s.pending; i++) s = act(s, { t: 'pass', p: s.turn.priority }); return s; };
const elfos = (s, p) => s.zones[p].battlefield.filter(o => /Elf/.test(s.facts[s.objects[o].name].typeText || '')).length;

test('P1 · partida guiada dos Elfos: gatilho alimenta contagem, contagem alimenta mana e ataque', () => {
  let s = partida(101);
  const eu = s.turn.active, ele = 1 - eu;

  /* ---- turno 1: floresta e o Vanguarda ---- */
  s = passaAte(s, 'main1');
  let mata1, vanguarda;
  [s, mata1] = paraMao(s, eu, 'Forest');
  [s, vanguarda] = paraMao(s, eu, 'Elvish Vanguard');
  s = act(s, { t: 'play_land', p: eu, oid: mata1 });
  s = resolvePilha(act(s, { t: 'cast', p: eu, oid: vanguarda }));
  assert.equal(s.objects[vanguarda].zone, 'battlefield', 'o Vanguarda entrou');
  assert.equal(s.objects[mata1].tapped, true, 'a floresta pagou o custo');
  assert.equal(elfos(s, eu), 1);

  /* ---- turno 2: a sacerdotisa entra e o Vanguarda cresce ---- */
  s = meuTurno(s, eu);
  let mata2, sacerdotisa;
  [s, mata2] = paraMao(s, eu, 'Forest');
  [s, sacerdotisa] = paraMao(s, eu, 'Priest of Titania');
  s = act(s, { t: 'play_land', p: eu, oid: mata2 });
  s = resolvePilha(act(s, { t: 'cast', p: eu, oid: sacerdotisa }));
  assert.equal(s.objects[vanguarda].counters.p1p1, 1, 'entrou outro Elfo: o Vanguarda ganhou marcador');
  assert.deepEqual(J(E.stats(s, s.objects[vanguarda])), { power: 2, toughness: 2 }, 'agora ele é 2/2');
  assert.equal(elfos(s, eu), 2);

  /* ---- turno 3: a caçadora, e a ficha de Elfo que ela cria conta como Elfo ---- */
  s = meuTurno(s, eu);
  let mata3, cacadora, vigia;
  [s, mata3] = paraMao(s, eu, 'Forest');
  [s, cacadora] = paraMao(s, eu, 'Lys Alana Huntmaster');
  [s, vigia] = paraMao(s, eu, 'Timberwatch Elf');
  s = act(s, { t: 'play_land', p: eu, oid: mata3 });
  s = resolvePilha(act(s, { t: 'cast', p: eu, oid: cacadora }));
  assert.equal(s.objects[vanguarda].counters.p1p1, 2, 'mais um Elfo, mais um marcador');
  // a sacerdotisa gera G por Elfo no campo: com três Elfos, três manas
  const antesPool = J(s.players[eu].pool);
  s = act(s, { t: 'tap_mana', p: eu, oid: sacerdotisa, option: 0 });
  assert.equal(s.players[eu].pool.G - antesPool.G, 3, 'a sacerdotisa deu um mana por Elfo');
  // conjurar um Elfo dispara a caçadora: o gatilho resolve antes da criatura e
  // pergunta, porque a carta diz "você pode"
  s = act(s, { t: 'cast', p: eu, oid: vigia });
  for (let i = 0; i < 6 && !s.pending && s.stack.length; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  assert.ok(s.pending && s.pending.kind === 'may_pay' && s.pending.p === eu, 'a mesa pergunta se quero a ficha');
  s = resolvePilha(act(s, { t: 'pay', p: eu }));
  const ficha = s.zones[eu].battlefield.map(o => s.objects[o]).find(o => o.name === 'Elf Warrior');
  assert.ok(ficha, 'a ficha de Elfo Guerreiro apareceu');
  assert.match(s.facts['Elf Warrior'].typeText || '', /Elf/, 'e ela é um Elfo de verdade');
  assert.equal(s.objects[vanguarda].counters.p1p1, 4, 'o Vigia e a ficha somaram mais dois marcadores');
  assert.equal(elfos(s, eu), 5, 'cinco Elfos: Vanguarda, sacerdotisa, caçadora, Vigia e a ficha');

  /* ---- turno 4: o Vigia já pode usar o {T} e o Vanguarda ataca grande ---- */
  s = meuTurno(s, eu);
  assert.equal(elfos(s, eu), 5, 'o campo continua com cinco Elfos');
  s = passaAte(s, 'combat_attackers');
  s = act(s, { t: 'attack', p: eu, attackers: [vanguarda] });
  s = act(s, { t: 'activate', p: eu, oid: vigia, index: 0, targets: [{ oid: vanguarda }] });
  s = resolvePilha(s);
  assert.deepEqual(J(E.stats(s, s.objects[vanguarda])), { power: 10, toughness: 10 }, '5/5 de marcadores mais +5/+5 por cinco Elfos');
  for (let i = 0; i < 40 && s.turn.step !== 'main2'; i++) {
    if (s.pending && s.pending.kind === 'blockers') { s = act(s, { t: 'block', p: ele, blocks: [] }); continue; }
    if (s.pending) break;
    s = act(s, { t: 'pass', p: s.turn.priority });
  }
  assert.equal(s.players[ele].life, 10, 'dez de dano no oponente');
  assert.equal(s.objects[vigia].tapped, true, 'o Vigia virou para usar a habilidade');
});

test('P2 · o Arqueiro derruba o voador do oponente, e o Patrulheiro desvira a sacerdotisa', () => {
  let s = partida(102);
  const eu = s.turn.active, ele = 1 - eu;
  s = passaAte(s, 'main1');
  // monto o campo: duas florestas, sacerdotisa, arqueiro e patrulheiro
  let m1, m2, sac, arq, pat, morcego;
  [s, m1] = paraMao(s, eu, 'Forest'); [s, m2] = paraMao(s, eu, 'Forest');
  [s, sac] = paraMao(s, eu, 'Priest of Titania');
  [s, arq] = paraMao(s, eu, 'Scattershot Archer');
  [s, pat] = paraMao(s, eu, 'Quirion Ranger');
  [s, morcego] = paraMao(s, ele, 'Morcego');
  s = J(s);
  for (const [oid, dono] of [[m1, eu], [m2, eu], [sac, eu], [arq, eu], [pat, eu], [morcego, ele]]) {
    s.zones[dono].hand.splice(s.zones[dono].hand.indexOf(oid), 1);
    s.zones[dono].battlefield.push(oid);
    Object.assign(s.objects[oid], { zone: 'battlefield', sick: false, tapped: false });
  }
  assert.equal(elfos(s, eu), 3, 'três Elfos no campo');
  // o arqueiro vira e causa 1 a cada criatura com voar: o morcego 1/1 morre
  s = resolvePilha(act(s, { t: 'activate', p: eu, oid: arq, index: 0 }));
  assert.equal(s.objects[morcego].zone, 'graveyard', 'o voador do oponente morreu');
  assert.equal(s.objects[arq].tapped, true, 'o arqueiro virou');
  // a sacerdotisa gera mana e o patrulheiro devolve uma floresta para desvirá-la
  s = act(s, { t: 'tap_mana', p: eu, oid: sac, option: 0 });
  assert.equal(s.players[eu].pool.G, 3, 'três Elfos, três manas');
  assert.equal(s.objects[sac].tapped, true);
  s = resolvePilha(act(s, { t: 'activate', p: eu, oid: pat, index: 0, pay: { returnLand: m1 }, targets: [{ oid: sac }] }));
  assert.equal(s.objects[m1].zone, 'hand', 'a floresta voltou para a mão como custo');
  assert.equal(s.objects[sac].tapped, false, 'e a sacerdotisa desvirou');
  s = act(s, { t: 'tap_mana', p: eu, oid: sac, option: 0 });
  assert.equal(s.players[eu].pool.G, 6, 'ela gerou mana de novo no mesmo turno');
});
