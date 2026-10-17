// M-447 · LT113 · Needle Drop ("Needle Drop deals 1 damage to any target that was dealt damage this turn. / Draw a card."). Texto da Scryfall de 17/10/2026
// UTC (.listas/oficiais-revisadas.json), caminho de produção (APROVADAS). Restrição nova de alvo `targetDanoNoTurno` (jogador: a marca do sede de sangue,
// K-61; permanente: `danoNoTurnoM`, que sai na mudança de zona — 400.7), só nas partidas que precisam. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const c0 = OF.find(x => x.name === 'Needle Drop');
const C = { 'Needle Drop': { name: c0.name, type_line: c0.type_line, mana_cost: c0.mana_cost, cmc: 1, keywords: [], oracle_text: c0.oracle_text, colors: ['R'] },
  'Lightning Bolt': { name: 'Lightning Bolt', type_line: 'Instant', mana_cost: '{R}', cmc: 1, keywords: [], oracle_text: 'Lightning Bolt deals 3 damage to any target.', colors: ['R'] }, // .listas/oficiais.json
  Muro: { name: 'Muro', type_line: 'Creature — Wall', mana_cost: '{2}', cmc: 2, keywords: [], oracle_text: '', colors: [], power: '0', toughness: '5' },
  Mountain: { name: 'Mountain', type_line: 'Basic Land — Mountain', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {R}.)', colors: [] } };
function mesa(seed = 56) {
  const b = ns => ns.map(name => ({ name, qty: 10, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b(['Needle Drop', 'Lightning Bolt', 'Mountain']) }, { name: 'B', deck: b(['Muro', 'Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending, 40);
function cena() { let s = mesa(), nd, lb, m1, m2; [s, nd] = poe(s, 0, 'Needle Drop', 'hand'); [s, lb] = poe(s, 0, 'Lightning Bolt', 'hand'); [s, m1] = poe(s, 1, 'Muro'); [s, m2] = poe(s, 1, 'Muro'); for (let i = 0; i < 3; i++) [s] = poe(s, 0, 'Mountain'); return { s, nd, lb, m1, m2 }; }
const alvosDo = (s, nd) => legais(s, 0, a => a.t === 'cast' && a.oid === nd).map(a => a.targets[0]);

test('LT113 · Needle Drop joga pelo leitor aprovado', () => {
  assert.equal(S.coverage(C['Needle Drop']).level, 'completo'); assert.equal(S.APROVADAS['Needle Drop'].leva, 'M-447');
});

test('LT113 · sem dano no turno, não há alvo (não conjura); depois do Bolt no oponente, só ele é alvo', () => {
  let { s, nd, lb } = cena(); assert.equal(alvosDo(s, nd).length, 0);
  s = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === lb && a.targets[0].player === 1)[0]));
  const al = alvosDo(s, nd); assert.deepEqual([...al.map(t => t.player)], [1]);
  const mao = s.zones[0].hand.length; const t = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === nd)[0])); assert.equal(t.players[1].life, 16); assert.equal(t.zones[0].hand.length, mao);
});

test('LT113 · a criatura que levou dano e sobreviveu é alvo; a outra não; no turno seguinte, nenhuma', () => {
  let { s, nd, lb, m1, m2 } = cena(); s = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === lb && a.targets[0].oid === m1)[0]));
  const al = alvosDo(s, nd); assert.deepEqual([...al.map(t => t.oid)], [m1]);
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending, 200); s = J(s); s.turn.priority = 0; for (const o of s.zones[0].battlefield) s.objects[o].tapped = false;
  assert.equal(alvosDo(s, nd).length, 0);
});
