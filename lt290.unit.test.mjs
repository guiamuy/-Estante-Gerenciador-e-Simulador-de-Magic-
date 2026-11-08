// M-610 · Sentinela do Pauper (cobertura/pauper.json de 08/11/2026 13:47 UTC: 678 de 685 listas a 100% no app, 6 cartas pendentes).
// Texto da API da Scryfall de 08/11/2026 (campo `texto` do relatório, guardado em .listas/oficiais-revisadas.json):
//   Spinewoods Paladin — já lida; aprovada aqui
//   Homestead Courage — "It gains vigilance until end of turn." depois do marcador na criatura alvo (608.2c)
//   Crypt Incursion — "Exile all creature cards from target player's graveyard. You gain 3 life for each card exiled this way." (608.2c)
//   Mardu Devotee — "{1}: Add {R}, {W}, or {B}. Activate only once each turn." (106.1a, 602.5b)
// Seguem manuais (ROADMAP LT267): Retraction Helix, Rites of Initiation.
// Falha no motor anterior: as quatro ficavam fora do app (lida em revisão · manual).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, act, poe, legais, passaAte, limpaMao } from './listas.mjs';

const revisadas = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const de = n => revisadas.find(x => x.name === n);
const terreno = (n, c) => ({ name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${c}}.)`, colors: [] });
const NOMES = ['Spinewoods Paladin', 'Homestead Courage', 'Crypt Incursion', 'Mardu Devotee'];
const C = {
  'Spinewoods Paladin': { keywords: ['Plot', 'Trample'], colors: ['G'], cmc: 5, ...de('Spinewoods Paladin') },
  'Homestead Courage': { keywords: ['Flashback'], colors: ['W'], cmc: 1, ...de('Homestead Courage') },
  'Crypt Incursion': { keywords: [], colors: ['B'], cmc: 3, ...de('Crypt Incursion') },
  'Mardu Devotee': { keywords: ['Scry'], colors: ['W'], cmc: 1, ...de('Mardu Devotee') },
  Choque: { name: 'Choque', mana_cost: '{R}', cmc: 1, type_line: 'Instant', oracle_text: 'Choque deals 2 damage to any target.', keywords: [], colors: ['R'] },
  Urso: { name: 'Urso', mana_cost: '{1}{G}', cmc: 2, type_line: 'Creature — Bear', power: '2', toughness: '2', oracle_text: '', keywords: [], colors: ['G'] },
  Plains: terreno('Plains', 'W'), Swamp: terreno('Swamp', 'B'), Forest: terreno('Forest', 'G'),
};
function mesa() {
  const lista = [['Urso', 16], ['Choque', 8], ...NOMES.map(n => [n, 4]), ['Plains', 8], ['Swamp', 8], ['Forest', 8]].map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'pauper', seed: 610, mode: 'full', cards: C, players: [{ name: 'A', deck: lista }, { name: 'B', deck: lista }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  return limpaMao(limpaMao(s, 0), 1);
}
const resolveTudo = (s, escolhe = ops => ops[0]) => {
  for (let i = 0; i < 80 && (s.stack.length || s.pending); i++) {
    if (!s.pending) { s = act(s, { t: 'pass', p: s.turn.priority }); continue; }
    s = act(s, escolhe(legais(s, s.pending.p), s.pending));
  }
  return s;
};

test('M-610 · as quatro cartas jogam no app (lidas por inteiro e aprovadas)', () => {
  for (const n of NOMES) {
    assert.ok(S.APROVADAS[n], `${n} aprovada`);
    assert.equal(S.coverage(C[n]).level, 'completo', n);
  }
});

test('M-610 · leitor: "It gains …" no alvo, exílio só de criaturas com vida por carta, mana de uma de três cores', () => {
  const hc = S.leitura(C['Homestead Courage']).script;
  assert.equal(JSON.stringify(hc.effects[1]), JSON.stringify({ do: 'keyword', keyword: 'vigilance', target: 'first-target' }));
  assert.equal(hc.flashback.mana, '{W}');
  const ci = S.leitura(C['Crypt Incursion']).script.effects;
  assert.equal(JSON.stringify(ci), JSON.stringify([{ do: 'exile_graveyard', target: 'player', tipos: ['creature'], contaMovidas: true }, { do: 'gain', amount: { per: 'movidas', times: 3 } }]));
  const md = S.leitura(C['Mardu Devotee']).script.abilities[1];
  assert.equal(md.oncePerTurn, true); assert.equal(md.cost.mana, '{1}');
  assert.equal(JSON.stringify(md.effects[0].cores), JSON.stringify(['R', 'W', 'B']));
  // "it" só pega carona num alvo de criatura da frase anterior
  assert.equal(S.coverage({ name: 'X', type_line: 'Sorcery', mana_cost: '{W}', cmc: 1, colors: ['W'], keywords: [], oracle_text: 'You gain 2 life. It gains vigilance until end of turn.' }).level, 'manual');
});

test('M-610 · Homestead Courage: marcador +1/+1 e vigilância até o fim do turno; flashback {W}', () => {
  let s = mesa(); let u, h;
  [s, u] = poe(s, 0, 'Urso');
  [s] = poe(s, 0, 'Plains');
  [s, h] = poe(s, 0, 'Homestead Courage', 'hand');
  s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === h && (x.targets || []).some(t => t.oid === u))[0]);
  s = resolveTudo(s);
  assert.equal((s.objects[u].counters || {}).p1p1, 1);
  assert.equal(E.stats(s, s.objects[u]).power, 3);
  assert.equal(E.hasKeyword(s, s.objects[u], 'vigilance'), true, 'vigilância neste turno');
  assert.equal(s.objects[h].zone, 'graveyard');
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  assert.equal(E.hasKeyword(s, s.objects[u], 'vigilance'), false, 'acabou no fim do turno');
  assert.equal((s.objects[u].counters || {}).p1p1, 1, 'o marcador fica');
});

test('M-610 · Crypt Incursion: exila só as cartas de criatura do cemitério alvo e ganha 3 por carta', () => {
  let s = mesa(); let ci; const ursos = [];
  for (let i = 0; i < 3; i++) [s] = poe(s, 0, 'Swamp');
  for (let i = 0; i < 2; i++) { let x; [s, x] = poe(s, 1, 'Urso', 'graveyard'); ursos.push(x); }
  let ch; [s, ch] = poe(s, 1, 'Choque', 'graveyard');
  let meu; [s, meu] = poe(s, 0, 'Urso', 'graveyard');
  [s, ci] = poe(s, 0, 'Crypt Incursion', 'hand');
  const vida = s.players[0].life;
  const op = legais(s, 0, x => x.t === 'cast' && x.oid === ci && (x.targets || []).some(t => t.player === 1))[0];
  assert.ok(op, 'pode mirar o oponente');
  s = resolveTudo(act(s, op));
  assert.deepEqual(ursos.map(x => s.objects[x].zone), ['exile', 'exile']);
  assert.equal(s.objects[ch].zone, 'graveyard', 'a mágica fica no cemitério');
  assert.equal(s.objects[meu].zone, 'graveyard', 'o seu cemitério não foi alvo');
  assert.equal(s.players[0].life, vida + 6);
});

test('M-610 · Crypt Incursion: cemitério sem criatura, nenhuma vida', () => {
  let s = mesa(); let ci;
  for (let i = 0; i < 3; i++) [s] = poe(s, 0, 'Swamp');
  [s] = poe(s, 1, 'Choque', 'graveyard');
  [s, ci] = poe(s, 0, 'Crypt Incursion', 'hand');
  const vida = s.players[0].life;
  s = resolveTudo(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === ci && (x.targets || []).some(t => t.player === 1))[0]));
  assert.equal(s.players[0].life, vida);
});

test('M-610 · Mardu Devotee: {1} vira {R}, {W} ou {B}, uma vez por turno', () => {
  let s = mesa(); let d;
  for (let i = 0; i < 2; i++) [s] = poe(s, 0, 'Forest');
  [s, d] = poe(s, 0, 'Mardu Devotee');
  const ops = legais(s, 0, x => x.t === 'activate' && x.oid === d);
  assert.deepEqual([...new Set(ops.map(x => x.color))].sort(), ['B', 'R', 'W'], 'só as três cores');
  assert.throws(() => act(s, { ...ops[0], color: 'U' }), /cor/);
  s = act(s, ops.find(x => x.color === 'W'));
  s = passaAte(s, x => !x.stack.length);
  assert.equal(s.players[0].pool.W, 1, 'um {W} na reserva');
  assert.equal(legais(s, 0, x => x.t === 'activate' && x.oid === d).length, 0, 'uma vez por turno');
});

test('M-610 · Spinewoods Paladin: atropelar e 3 de vida ao entrar', () => {
  const sc = S.leitura(C['Spinewoods Paladin']).script;
  assert.equal(JSON.stringify(sc.abilities), JSON.stringify([{ kind: 'triggered', when: 'etb', effects: [{ do: 'gain', amount: 3 }] }]));
  assert.equal(sc.plot.mana, '{3}{G}');
});
