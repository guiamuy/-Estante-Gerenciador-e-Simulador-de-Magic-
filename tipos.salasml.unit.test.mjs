// T-116 · CR5 · Sala Meat Locker // Drowned Diner (709.5, 709.5h, 122.1d atordoar). Texto da regra: .regras/cr-2026-09-25.txt.
// Carta com o texto oficial de .listas/oficiais-tipos.json (consulta de 17/10/2026, rulings de 20/09/2024). "Urso" é carta de teste.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const ML = 'Meat Locker // Drowned Diner', OF = L('oficiais-tipos.json').find(x => x.name === ML);
const C = {};
C[ML] = { name: ML, type_line: `${OF.type_line} // ${OF.verso.type_line}`, mana_cost: `${OF.mana_cost} // ${OF.verso.mana_cost}`, cmc: valorDeMana(OF.mana_cost) + valorDeMana(OF.verso.mana_cost), keywords: [], oracle_text: `${OF.oracle_text}\n//\n${OF.verso.oracle_text}`, colors: ['U'], layout: 'split' };
C.Island = { name: 'Island', type_line: 'Basic Land — Island', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {U}.)', colors: [] };
C.Urso = { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], power: '2', toughness: '2' };
function mesa(seed = 1) {
  const deck = [{ name: ML, qty: 4, zone: 'main' }, { name: 'Urso', qty: 6, zone: 'main' }, { name: 'Island', qty: 20, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p = 0, n = 9) => { s = J(s); for (const c of 'WUBRGC') s.players[p].pool[c] += n; return s; };
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending);
function conjuraPorta(s, lado) { let oid; [s, oid] = poe(s, 0, ML, 'hand'); s = mana(s); const a = legais(s, 0, x => x.t === 'cast' && x.oid === oid && x.face === lado)[0]; assert.ok(a, lado); return [resolve(act(s, a)), oid]; }

test('CR 709.5h · Meat Locker (texto oficial): ao destrancar, vira até uma criatura alvo e põe dois marcadores de atordoamento; ela não desvira nas duas próximas vezes', () => {
  let s = mesa(); let u; [s, u] = poe(s, 1, 'Urso');
  let g; [s, g] = conjuraPorta(s, 'esquerda');
  if (s.pending) { const a = legais(s, s.pending.p).find(x => x.t === 'pick_target' && !x.nenhum); assert.ok(a, 'alvo: o Urso (a única criatura)'); s = resolve(act(s, a)); }
  eq([s.objects[u].tapped, s.objects[u].counters.stun], [true, 2]);
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1');
  eq([s.objects[u].tapped, s.objects[u].counters.stun], [true, 1], 'primeiro desvirar: tira um marcador');
});

test('CR 709.5h · "up to one target": Meat Locker destrancada sem criatura no campo não trava a partida', () => {
  let s = mesa(); let g; [s, g] = conjuraPorta(s, 'esquerda');
  eq([s.objects[g].zone, s.pending], ['battlefield', null]);
});

test('CR 709.5h · Drowned Diner (texto oficial): ao destrancar, compra três e depois descarta uma', () => {
  let s = mesa(); const mao = s.zones[0].hand.length;
  let g; [s, g] = conjuraPorta(s, 'direita');
  for (let i = 0; i < 4 && s.pending; i++) s = resolve(act(s, legais(s, s.pending.p)[0]));
  eq(s.zones[0].hand.length, mao + 3 - 1, 'compra 3, descarta 1 (a Sala saiu da mão)');
});
