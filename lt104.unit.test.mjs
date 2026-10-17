// M-422 · LT88 · Moment of Glory: "Put a +1/+1 counter on target creature you control. If this spell was cast from a graveyard, also put a +1/+1 counter on each
// other creature you control. Flashback {4}{W}" (texto da Scryfall de 17/10/2026 UTC, .listas/oficiais-revisadas.json), caminho de produção (APROVADAS).
// "other" é além do alvo; a condição é a da conjuração (do cemitério, pelo lampejo). Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, palavrasDoTexto, S } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const m0 = OF.find(x => x.name === 'Moment of Glory');
const C = { 'Moment of Glory': { name: m0.name, type_line: m0.type_line, mana_cost: m0.mana_cost, cmc: 1, keywords: palavrasDoTexto(m0.oracle_text), oracle_text: m0.oracle_text, colors: ['W'] },
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Plains: { name: 'Plains', type_line: 'Basic Land — Plains', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {W}.)', colors: [] } };
function mesa(seed = 31) {
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: [{ name: 'Moment of Glory', qty: 6, zone: 'main' }, { name: 'Urso', qty: 8, zone: 'main' }, { name: 'Plains', qty: 16, zone: 'main' }] }, { name: 'B', deck: [{ name: 'Urso', qty: 10, zone: 'main' }, { name: 'Plains', qty: 20, zone: 'main' }] }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending);
const p1 = (s, o) => (s.objects[o].counters || {}).p1p1 || 0;

test('LT88 · Moment of Glory joga pelo leitor aprovado', () => {
  assert.equal(S.coverage(C['Moment of Glory']).level, 'completo'); assert.equal(S.APROVADAS['Moment of Glory'].leva, 'M-422');
});

test('LT88 · da mão, só o alvo ganha o marcador; do cemitério (lampejo), o alvo e cada outra criatura sua — o alvo só um, e as do oponente nenhum', () => {
  let s = mesa(), mg, u1, u2, ub; [s, u1] = poe(s, 0, 'Urso'); [s, u2] = poe(s, 0, 'Urso'); [s, ub] = poe(s, 1, 'Urso'); for (let i = 0; i < 5; i++) [s] = poe(s, 0, 'Plains');
  let h = J(s); [h, mg] = poe(h, 0, 'Moment of Glory', 'hand');
  let a = resolve(act(h, legais(h, 0, x => x.t === 'cast' && x.oid === mg && x.targets[0].oid === u1 && !x.flashback)[0]));
  assert.deepEqual([p1(a, u1), p1(a, u2), p1(a, ub)], [1, 0, 0]);
  let g = J(s); [g, mg] = poe(g, 0, 'Moment of Glory', 'graveyard');
  const fb = legais(g, 0, x => x.t === 'cast' && x.oid === mg && x.targets[0].oid === u1 && x.flashback); assert.ok(fb.length, 'lampejo do passado');
  let b = resolve(act(g, fb[0])); assert.deepEqual([p1(b, u1), p1(b, u2), p1(b, ub)], [1, 1, 0], 'o alvo não ganha dois'); assert.equal(b.objects[mg].zone, 'exile');
});

test('LT88 · a pilha explicada diz "cada outra criatura" e a condição', async () => {
  const { loadModules } = await import('./_load.mjs'); const M = loadModules();
  assert.match(M.table.descreveEfeitos(S.leitura(C['Moment of Glory']).script.effects), /cada outra criatura que você controla \(se foi conjurada do cemitério\)/);
});
