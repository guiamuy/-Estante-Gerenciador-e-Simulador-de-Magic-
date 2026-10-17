// M-452 · LT118 · Zealous Display ("Creatures you control get +2/+0 until end of turn. If it's not your turn, untap those creatures."). Texto da
// Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json), caminho de produção (APROVADAS). Condição nova `nao-seu-turno` (na resolução) e
// desvirar todas as suas. Pedido da trilha `listas`. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const c0 = OF.find(x => x.name === 'Zealous Display');
const C = { 'Zealous Display': { name: c0.name, type_line: c0.type_line, mana_cost: c0.mana_cost, cmc: 3, keywords: [], oracle_text: c0.oracle_text, colors: ['W'] },
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Plains: { name: 'Plains', type_line: 'Basic Land — Plains', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {W}.)', colors: [] } };
function mesa(ativo) {
  const b = ns => ns.map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 29, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b(['Zealous Display', 'Urso', 'Plains']) }, { name: 'B', deck: b(['Urso', 'Plains']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === ativo && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending, 40);
function cena(ativo) {
  let s = mesa(ativo), zd, u1, u2, ui; [s, zd] = poe(s, 0, 'Zealous Display', 'hand'); [s, u1] = poe(s, 0, 'Urso'); [s, u2] = poe(s, 0, 'Urso'); [s, ui] = poe(s, 1, 'Urso');
  for (let i = 0; i < 3; i++) [s] = poe(s, 0, 'Plains');
  s = J(s); for (const o of [u1, ui]) s.objects[o].tapped = true;
  if (ativo === 1) s = act(s, { t: 'pass', p: 1 });
  return { s, zd, u1, u2, ui };
}
const pw = (s, o) => E.stats(s, s.objects[o]).power;

test('LT118 · Zealous Display joga pelo leitor aprovado', () => {
  assert.equal(S.coverage(C['Zealous Display']).level, 'completo'); assert.equal(S.APROVADAS['Zealous Display'].leva, 'M-452');
});

test('LT118 · no turno do oponente: as suas ganham +2/+0 e desviram; a do oponente fica como estava', () => {
  let { s, zd, u1, u2, ui } = cena(1);
  s = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === zd)[0]));
  assert.equal(s.objects[zd].zone, 'graveyard');
  assert.equal(pw(s, u1), 4); assert.equal(pw(s, u2), 4); assert.equal(pw(s, ui), 2);
  assert.equal(s.objects[u1].tapped, false); assert.equal(s.objects[ui].tapped, true);
});

test('LT118 · no seu turno: +2/+0, mas nada desvira', () => {
  let { s, zd, u1 } = cena(0);
  s = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === zd)[0]));
  assert.equal(pw(s, u1), 4); assert.equal(s.objects[u1].tapped, true);
});
