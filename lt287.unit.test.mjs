// M-607 · Sentinela do Pauper (cobertura/pauper.json de 03/11/2026 14:36 UTC: 640 de 644 listas a 100% no app, 3 cartas pendentes).
// Texto da API da Scryfall de 03/11/2026 (campo `texto` do relatório, guardado em .listas/oficiais-revisadas.json):
//   Geothermal Bog — "({T}: Add {B} or {R}.) / This land enters tapped." (lida; aprovada aqui)
//   Dawnbringer Cleric — gatilho modal de entrada; o leitor passa a ler "Exile target card from a graveyard" (alvo obrigatório)
//   Thought Vessel — o leitor passa a ler "You have no maximum hand size." (402.2) como regra de jogador da permanente
// Falha no motor anterior: as três ficavam fora do app (lida em revisão · manual · parcial).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, act, poe, legais, passaAte, limpaMao } from './listas.mjs';

const revisadas = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const de = n => revisadas.find(x => x.name === n);
const terreno = (n, c) => ({ name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${c}}.)`, colors: [] });
const C = {
  'Geothermal Bog': { keywords: [], colors: [], cmc: 0, ...de('Geothermal Bog') },
  'Dawnbringer Cleric': { keywords: [], colors: ['W'], cmc: 2, ...de('Dawnbringer Cleric') },
  'Thought Vessel': { keywords: [], colors: [], cmc: 2, ...de('Thought Vessel') },
  Urso: { name: 'Urso', mana_cost: '{1}{G}', cmc: 2, type_line: 'Creature — Bear', power: '2', toughness: '2', oracle_text: '', keywords: [], colors: ['G'] },
  Plains: terreno('Plains', 'W'),
};
function mesa() {
  const lista = [['Urso', 24], ['Geothermal Bog', 4], ['Dawnbringer Cleric', 4], ['Thought Vessel', 4], ['Plains', 24]].map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'pauper', seed: 607, mode: 'full', cards: C, players: [{ name: 'A', deck: lista }, { name: 'B', deck: lista }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  return limpaMao(s, 0);
}

test('M-607 · as três cartas pendentes jogam no app (lidas por inteiro e aprovadas)', () => {
  for (const n of ['Geothermal Bog', 'Dawnbringer Cleric', 'Thought Vessel']) {
    assert.ok(S.APROVADAS[n], `${n} aprovada`);
    assert.equal(S.coverage(C[n]).level, 'completo', n);
  }
});

test('M-607 · leitor: "Exile target card from a graveyard" (obrigatório) e "You have no maximum hand size"', () => {
  const g = S.leitura(C['Dawnbringer Cleric']).script.abilities[0];
  assert.equal(g.when, 'etb'); assert.equal(g.modes.length, 3);
  const ex = g.modes[2].effects; assert.equal(ex.length, 1); assert.equal(ex[0].do, 'exile'); assert.equal(ex[0].target, 'card-in-any-graveyard'); assert.ok(!ex[0].upTo, 'sem upTo: o alvo é obrigatório');
  assert.equal(JSON.stringify(S.leitura(C['Thought Vessel']).script.regraJogador), JSON.stringify([{ quem: 'voce', semLimiteDeMao: true }]));
});

test('M-607 · Geothermal Bog: entra virado e gera {B} ou {R} pelos subtipos (305.6)', () => {
  let s = mesa(); let b;
  [s, b] = poe(s, 0, 'Geothermal Bog', 'hand');
  const jogar = legais(s, 0, x => x.oid === b)[0]; assert.ok(jogar, 'pode jogar o terreno');
  s = act(s, jogar);
  assert.equal(s.objects[b].zone, 'battlefield'); assert.equal(s.objects[b].tapped, true, 'entra virado');
  assert.equal(JSON.stringify(E.productions(s, s.objects[b])), JSON.stringify([['B'], ['R']]));
});

test('M-607 · Dawnbringer Cleric: sem encantamento nem carta em cemitério, só o modo de ganhar 2 de vida (700.2a)', () => {
  let s = mesa(); let d;
  for (let i = 0; i < 2; i++) [s] = poe(s, 0, 'Plains');
  [s, d] = poe(s, 0, 'Dawnbringer Cleric', 'hand');
  const vida = s.players[0].life;
  s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === d)[0]);
  for (let i = 0; i < 80 && (s.stack.length || s.pending); i++) {
    const pd = s.pending;
    if (!pd) { s = act(s, { t: 'pass', p: s.turn.priority }); continue; }
    const ops = legais(s, pd.p);
    const modos = ops.filter(a => a.mode !== undefined || a.modes !== undefined);
    if (modos.length) assert.equal(modos.length, 1, 'só um modo legal');
    s = act(s, ops[0]);
  }
  assert.equal(s.objects[d].zone, 'battlefield');
  assert.equal(s.players[0].life, vida + 2, 'ganhou 2 de vida');
});

test('M-607 · Thought Vessel: sem limite de mão só enquanto está no campo (402.2, 611.3a)', () => {
  let s = mesa(); let v;
  [s, v] = poe(s, 0, 'Thought Vessel');
  const sem = E.semLimiteDeMao ? E.semLimiteDeMao(s, 0) : null;
  if (sem !== null) assert.equal(sem, true);
  for (let i = 0; i < 10; i++) [s] = poe(s, 0, 'Urso', 'hand');
  const n = s.zones[0].hand.length; assert.ok(n > 7);
  let t = passaAte(s, x => x.turn.active === 1 || (x.pending && x.pending.p === 0 && /discard|descart/i.test(x.pending.kind + x.pending.label)));
  assert.equal(t.turn.active, 1, 'passou o turno sem pedir descarte');
  assert.equal(t.zones[0].hand.length, n, 'manteve a mão inteira');
});
