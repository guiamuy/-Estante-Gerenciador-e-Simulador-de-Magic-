// T-46 · CR5 · Masmorra: completar como ação de estado (Comprehensive Rules 309.5b, 309.6 e 309.7, com 704.5t).
// Texto da regra: .regras/cr-2026-09-25.txt. As cartas são as de teste do S57 (rules.unit), com uma instantânea que se aventura.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, passaAte } from './listas.mjs';

const C = {
  Island: { name: 'Island', type_line: 'Basic Land — Island', mana_cost: '', cmc: 0, keywords: [], oracle_text: '{T}: Add {U}.' },
  Porta: { name: 'Porta', type_line: 'Artifact Creature — Wall', mana_cost: '{U}', cmc: 1, colors: ['U'], power: '0', toughness: '4', keywords: ['Defender'], oracle_text: '' },
  Bear: { name: 'Bear', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, colors: ['G'], power: '2', toughness: '2', keywords: [], oracle_text: '' },
  Atalho: { name: 'Atalho', type_line: 'Instant', mana_cost: '{U}', cmc: 1, colors: ['U'], keywords: [], oracle_text: '' },
  Nega: { name: 'Nega', type_line: 'Instant', mana_cost: '{U}', cmc: 1, colors: ['U'], keywords: [], oracle_text: '' },
};
const EX = { example: { target: 'none', expect: { selfLife: 0 } } };
const SCRIPTS = {
  Porta: { name: 'Porta', abilities: [{ kind: 'activated', cost: { mana: '{4}{U}' }, sorceryOnly: true, effects: [{ do: 'venture' }] }], ...EX },
  Atalho: { name: 'Atalho', effects: [{ do: 'venture' }], ...EX }, // "Venture into the dungeon." (instantânea de teste)
  Nega: { name: 'Nega', effects: [{ do: 'counter', target: 'spell-or-ability' }], ...EX },
};
const DECK = [{ name: 'Island', qty: 20, zone: 'main' }, { name: 'Porta', qty: 8, zone: 'main' }, { name: 'Bear', qty: 8, zone: 'main' }, { name: 'Atalho', qty: 4, zone: 'main' }, { name: 'Nega', qty: 4, zone: 'main' }];
function mesa(seed = 13) {
  let s = E.createGame({ format: 'livre', seed, mode: 'assisted', manaCheck: false, cards: C, scripts: SCRIPTS, players: [{ name: 'A', deck: DECK }, { name: 'B', deck: DECK }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
/** Resolve a pilha e as escolhas simples do caminho (primeira masmorra, primeira sala, primeiro alvo, fecha o vasculhar). */
function resolve(s) {
  for (let i = 0; i < 60; i++) {
    const pd = s.pending;
    if (pd && pd.kind === 'choose_dungeon') s = act(s, { t: 'choose_dungeon', p: pd.p, index: 0 });
    else if (pd && pd.kind === 'choose_room') s = act(s, { t: 'choose_room', p: pd.p, index: 0 });
    else if (pd && pd.kind === 'pick_target') s = act(s, { t: 'pick_target', p: pd.p, index: 0 });
    else if (pd && pd.kind === 'pick') s = act(s, { t: 'pick_done', p: pd.p });
    else if (pd) s = act(s, legais(s, pd.p)[0]);
    else if (s.stack.length) s = act(s, { t: 'pass', p: s.turn.priority });
    else return s;
  }
  return s;
}
const aventura = (s, porta) => act(s, { t: 'activate', p: 0, oid: porta, index: 0 });
/** Três aventuras resolvidas e a quarta ativada: a habilidade da última sala (Templo) espera na pilha. */
function ultimaSalaNaPilha() {
  let s = mesa(); let porta; [s, porta] = poe(s, 0, 'Porta', 'battlefield', { sick: false }); [s] = poe(s, 0, 'Bear', 'battlefield');
  for (let i = 0; i < 3; i++) s = resolve(aventura(s, porta));
  s = aventura(s, porta);
  for (let i = 0; i < 10 && s.stack.length && !(s.players[0].dungeon && s.players[0].dungeon.room === 'templo'); i++) s = s.pending ? resolve(s) : act(s, { t: 'pass', p: s.turn.priority });
  return [s, porta];
}

test('CR 309.6 / 309.7 · com a habilidade da última sala na pilha a masmorra ainda não está completa; completa quando a habilidade sai da pilha', () => {
  let [s] = ultimaSalaNaPilha();
  eq([s.players[0].dungeon.room, s.stack.length > 0 || (s.queued || []).length > 0], ['templo', true], 'o marcador na última sala, a habilidade dela esperando');
  eq([!!s.players[0].dungeon.done, s.players[0].dungeonsDone || 0], [false, 0], 'ainda não completou (309.6)');
  s = resolve(s);
  eq([!!s.players[0].dungeon.done, s.players[0].dungeonsDone], [true, 1], 'completou quando a habilidade saiu da pilha (309.7)');
});

test('CR 309.5b · aventurar-se com o marcador na última sala completa a masmorra e começa outra; a habilidade da última sala resolve depois sem contar de novo', () => {
  let [s] = ultimaSalaNaPilha();
  let at; [s, at] = poe(s, 0, 'Atalho', 'hand');
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === at)[0]);
  // a instantânea resolve primeiro (está em cima)
  for (let i = 0; i < 10 && s.zones[0].hand.length >= 0 && s.objects[at].zone === 'stack'; i++) s = s.pending ? resolve(s) : act(s, { t: 'pass', p: s.turn.priority });
  if (s.pending && s.pending.kind === 'choose_dungeon') s = act(s, { t: 'choose_dungeon', p: 0, index: 0 });
  eq([s.players[0].dungeonsDone, s.players[0].dungeon.room], [1, 'entrada'], 'completou e entrou na primeira sala da nova');
  s = resolve(s);
  eq(s.players[0].dungeonsDone, 1, 'a habilidade do Templo resolveu sem contar outra masmorra');
});

test('CR 309.6 · a habilidade da última sala anulada também deixa a masmorra completa (saiu da pilha)', () => {
  let [s] = ultimaSalaNaPilha();
  let n; [s, n] = poe(s, 0, 'Nega', 'hand');
  const alvo = s.stack[s.stack.length - 1];
  const of = legais(s, 0, a => a.t === 'cast' && a.oid === n && (a.targets || []).some(t => t.oid === alvo));
  assert.ok(of.length, 'Nega mira a habilidade da sala');
  s = resolve(act(s, of[0]));
  eq([!!s.players[0].dungeon.done, s.players[0].dungeonsDone], [true, 1]);
});
