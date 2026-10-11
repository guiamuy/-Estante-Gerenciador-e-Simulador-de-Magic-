// Trilha keywords (CR4 · 702) · regras de palavra-chave lidas pelo motor a partir da palavra-chave impressa.
// Texto das regras: .regras/cr-2026-09-25.txt. Cada teste leva o número da regra e falha na versão anterior à leva citada.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
const { engine: E, scripts: S } = loadModules();
const J = x => JSON.parse(JSON.stringify(x));
const act = (s, a) => E.apply(s, a).state;

const terra = n => ({ name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, colors: [], keywords: [], oracle_text: '' });
/** Partida livre em modo assistido, parada na 1ª fase principal, com as cartas e scripts dados (baralho: 4 de cada + 20 Florestas). */
function partida(cards, scripts = {}, seed = 3) {
  const all = { Forest: terra('Forest'), ...cards };
  const deck = Object.keys(all).filter(n => n !== 'Forest').map(name => ({ name, qty: 4, zone: 'main' })).concat([{ name: 'Forest', qty: 20, zone: 'main' }]);
  let s = E.createGame({ format: 'livre', seed, mode: 'assisted', manaCheck: false, cards: all, scripts, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  return s;
}
/** Tira a carta do grimório ou da mão e a põe na zona pedida, direto pelo estado. */
function poe(s, p, nome, zone = 'battlefield') {
  s = J(s);
  const oid = ['library', 'hand'].flatMap(z => s.zones[p][z]).find(o => s.objects[o].name === nome);
  if (!oid) throw new Error('não achei ' + nome);
  const de = s.zones[p][s.objects[oid].zone]; de.splice(de.indexOf(oid), 1);
  s.zones[p][zone].push(oid); Object.assign(s.objects[oid], { zone, sick: false, tapped: false });
  return [s, oid];
}
const resolve = s => { for (let i = 0; i < 12 && (s.stack.length || s.pending); i++) s = s.pending ? act(s, E.legalActions(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority }); return s; };

/* ---------------- K-1 · 702.73 metamorfo e 702.114 desprovido ---------------- */
const MUDA = { name: 'Muda', type_line: 'Creature — Shapeshifter', mana_cost: '{1}{G}', cmc: 2, colors: ['G'], power: '1', toughness: '1', keywords: ['Changeling'], oracle_text: 'Changeling' };
const CHEFE = { name: 'Chefe', type_line: 'Creature — Elf Warrior', mana_cost: '{3}{G}', cmc: 4, colors: ['G'], power: '2', toughness: '2', keywords: [], oracle_text: 'Whenever another Elf you control enters, you gain 1 life.' };
const SC_CHEFE = { name: 'Chefe', abilities: [{ kind: 'triggered', when: 'other-etb', filter: { types: ['creature'], subtype: 'Elf' }, effects: [{ do: 'gain', amount: 1 }] }], example: { action: 'etb', target: 'none', expect: { attached: false } } };

test('CR 702.73a · metamorfo lido da palavra-chave impressa (sem marca no script): o "outro Elfo entra" dispara', () => {
  let s = partida({ Muda: MUDA, Chefe: CHEFE }, { Chefe: SC_CHEFE }); const a = s.turn.active;
  let muda; [s] = poe(s, a, 'Chefe'); [s, muda] = poe(s, a, 'Muda', 'hand');
  const vida = s.players[a].life;
  s = resolve(act(s, { t: 'cast', p: a, oid: muda }));
  assert.equal(s.objects[muda].zone, 'battlefield');
  assert.equal(s.players[a].life, vida + 1, 'a Muda é todo tipo de criatura: é Elfo');
  assert.equal(E.metamorfoK(s, s.objects[muda], 'Elf'), true);
});

test('CR 702.73a · o metamorfo vale em toda zona: "busque uma carta de Elfo" acha a criatura com metamorfo no grimório', () => {
  const BUSCA = { name: 'Busca', type_line: 'Sorcery', mana_cost: '{G}', cmc: 1, colors: ['G'], keywords: [], oracle_text: 'Search your library for an Elf card, reveal it, put it into your hand, then shuffle.' };
  const SC = { Busca: { name: 'Busca', effects: [{ do: 'search', amount: 1, filter: { subtypes: ['Elf'] }, to: 'hand' }], example: { target: 'none', expect: { handDelta: 0 } } } };
  let s = partida({ Muda: MUDA, Busca: BUSCA }, SC); const a = s.turn.active;
  let b; [s, b] = poe(s, a, 'Busca', 'hand');
  s = act(s, { t: 'cast', p: a, oid: b });
  for (let i = 0; i < 6 && !s.pending; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  assert.ok(s.pending, 'a busca abre a escolha');
  const opcoes = s.pending.from.map(x => s.objects[x].name);
  assert.ok(opcoes.includes('Muda'), 'a Muda é uma carta de Elfo no grimório: ' + JSON.stringify(opcoes));
});

test('CR 205.3m · o metamorfo só tem tipos de criatura: não é Floresta, nem Aura, nem Equipamento', () => {
  let s = partida({ Muda: MUDA }); const a = s.turn.active;
  let muda; [s, muda] = poe(s, a, 'Muda');
  const o = s.objects[muda];
  assert.equal(E.metamorfoK(s, o), true);
  for (const x of ['Elf', 'Goblin', 'Time Lord', 'C’tan', "Shi'ar", 'Assembly-Worker']) assert.equal(E.metamorfoK(s, o, x), true, x);
  for (const x of ['Forest', 'Aura', 'Equipment', 'Vehicle', 'Arcane', 'Saga']) assert.equal(E.metamorfoK(s, o, x), false, x);
});

test('CR 702.73a · ruling da Masked Vandal: perder todas as habilidades não tira os tipos; definir um tipo de criatura depois, sim; virada para baixo não tem tipo', () => {
  let s = partida({ Muda: MUDA }); const a = s.turn.active;
  let muda; [s, muda] = poe(s, a, 'Muda');
  s = J(s); s.objects[muda].mutavel = true; s.objects[muda].vira = [{ ts: 1, loseAbilities: true }];
  assert.equal(E.metamorfoK(s, s.objects[muda], 'Elf'), true, 'perdeu as habilidades (camada 6) e continua todo tipo (camada 4 veio antes)');
  s.objects[muda].vira = [{ ts: 2, types: ['creature'], subtypes: ['Frog'], base: [1, 1], loseAbilities: true }];
  assert.equal(E.metamorfoK(s, s.objects[muda], 'Elf'), false, 'virou Sapo: o tipo definido depois sobrepõe');
  assert.match(E.linhaDeTipo(s, s.objects[muda]), /Frog/);
  s.objects[muda].vira = []; s.objects[muda].faceDown = true;
  assert.equal(E.metamorfoK(s, s.objects[muda], 'Elf'), false, '708.2: virada para baixo é 2/2 sem subtipo');
});

test('CR 702.73a · metamorfo concedido pela carta da ficha conta; a palavra-chave entra no vocabulário do motor', () => {
  assert.ok(S.KEYWORDS.includes('changeling') && S.KEYWORDS.includes('devoid'));
  assert.deepEqual(J(S.validateScript({ name: 'T', effects: [{ do: 'token', amount: 1, token: { name: 'Muda Ficha', types: ['creature'], subtypes: ['Shapeshifter'], colors: ['U'], power: 1, toughness: 1, keywords: ['changeling'] } }], example: { target: 'none', expect: { tokens: 1 } } })), [], 'ficha com metamorfo passa no validador');
  const FAZ = { name: 'Faz', type_line: 'Sorcery', mana_cost: '{U}', cmc: 1, colors: ['U'], keywords: [], oracle_text: 'Create a 1/1 blue Shapeshifter creature token with changeling.' };
  const SC = { Faz: { name: 'Faz', effects: [{ do: 'token', amount: 1, token: { name: 'Muda Ficha', types: ['creature'], subtypes: ['Shapeshifter'], colors: ['U'], power: 1, toughness: 1, keywords: ['changeling'] } }], example: { target: 'none', expect: { tokens: 1 } } }, Chefe: SC_CHEFE };
  let s = partida({ Faz: FAZ, Chefe: CHEFE }, SC); const a = s.turn.active;
  let f; [s] = poe(s, a, 'Chefe'); [s, f] = poe(s, a, 'Faz', 'hand');
  const vida = s.players[a].life;
  s = resolve(act(s, { t: 'cast', p: a, oid: f }));
  assert.equal(s.players[a].life, vida + 1, 'a ficha com metamorfo entrou como Elfo');
});

test('CR 702.114a · desprovido lido da palavra-chave impressa: incolor mesmo com mana colorida no custo, em qualquer zona', () => {
  const ELD = { name: 'Eld', type_line: 'Creature — Eldrazi', mana_cost: '{2}{R}{G}', cmc: 4, colors: ['R', 'G'], power: '3', toughness: '3', keywords: ['Devoid'], oracle_text: 'Devoid' };
  let s = partida({ Eld: ELD }); const a = s.turn.active;
  assert.deepEqual(J(s.facts.Eld.colors), [], 'o fato da carta é incolor');
  let e; [s, e] = poe(s, a, 'Eld', 'hand');
  assert.deepEqual(J(E.colorsOf(s, s.objects[e])), [], 'na mão');
  s = resolve(act(s, { t: 'cast', p: a, oid: e }));
  assert.deepEqual(J(E.colorsOf(s, s.objects[e])), [], 'no campo');
});
