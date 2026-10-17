// M-427 · LT93 · "You gain life equal to the damage dealt this way" (o dano causado de fato nesta resolução): Rite of Consumption ("As an additional cost to
// cast this spell, sacrifice a creature. Rite of Consumption deals damage equal to the sacrificed creature's power to target player or planeswalker. …") e
// Creeping Bloodsucker (gatilho de manutenção, dano a cada oponente). Texto da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json), caminho de
// produção (APROVADAS). Contagem nova `dano-causado`. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, valorDeMana, S } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Creeping Bloodsucker', 'Rite of Consumption'];
const C = {}; for (const n of NOMES) { const c = OF.find(x => x.name === n); C[n] = { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: ['B'], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; }
C.Urso = { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' };
C.Gigante = { name: 'Gigante', type_line: 'Creature — Giant', mana_cost: '{4}', cmc: 4, keywords: [], oracle_text: '', colors: [], power: '5', toughness: '5' };
C.Muro = { name: 'Muro', type_line: 'Creature — Wall', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], power: '0', toughness: '4' };
C.Swamp = { name: 'Swamp', type_line: 'Basic Land — Swamp', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {B}.)', colors: [] };
function mesa(seed = 37) {
  const b = ns => ns.map(name => ({ name, qty: name === 'Swamp' ? 20 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Urso', 'Gigante', 'Muro', 'Swamp']) }, { name: 'B', deck: b(['Urso', 'Swamp']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => { for (let i = 0; i < 60; i++) { if (s.pending && s.pending.kind !== 'priority') { s = act(s, legais(s, s.pending.p)[0]); continue; } if (s.stack.length) { s = passaAte(s, x => !x.stack.length || (!!x.pending && x.pending.kind !== 'priority'), 40); continue; } return s; } return s; };
function rito(criatura, vidaB = 20) {
  let s = mesa(), rc, c; [s, rc] = poe(s, 0, 'Rite of Consumption', 'hand'); for (let i = 0; i < 2; i++) [s] = poe(s, 0, 'Swamp'); [s, c] = poe(s, 0, criatura);
  s = J(s); s.players[1].life = vidaB;
  const a = legais(s, 0, x => x.t === 'cast' && x.oid === rc && JSON.stringify(x).includes(c) && x.targets && x.targets[0].player === 1);
  assert.ok(a.length, 'sacrifica ' + criatura + ' e mira o oponente'); return { t: resolve(act(s, a[0])), c };
}

test('LT93 · as duas jogam pelo leitor aprovado', () => {
  for (const n of NOMES) { assert.equal(S.coverage(C[n]).level, 'completo', n); assert.equal(S.APROVADAS[n].leva, 'M-427'); }
});

test('LT93 · Rite of Consumption: dano igual ao poder da sacrificada; você ganha o mesmo tanto (poder 2 → 2 e 2; poder 5 com o oponente a 3 → 5 e 5)', () => {
  let { t, c } = rito('Urso'); assert.equal(t.players[1].life, 18); assert.equal(t.players[0].life, 22); assert.equal(t.objects[c].zone, 'graveyard');
  ({ t } = rito('Gigante', 3)); assert.equal(t.players[1].life, -2); assert.equal(t.players[0].life, 25, 'o dano causado conta inteiro, mesmo além da vida');
});

test('LT93 · Rite of Consumption: poder 0 não causa dano (120.8) e não dá vida', () => {
  const { t } = rito('Muro'); assert.equal(t.players[1].life, 20); assert.equal(t.players[0].life, 20);
});

test('LT93 · Creeping Bloodsucker: na sua manutenção, 1 de dano a cada oponente e você ganha 1', () => {
  let s = mesa(), cb; [s, cb] = poe(s, 0, 'Creeping Bloodsucker');
  s = passaAte(s, x => x.turn.active === 0 && x.turn.number > 1 && (x.stack.length > 0 || !!x.pending || x.turn.step === 'main1'), 400);
  s = resolve(s); assert.equal(s.players[1].life, 19); assert.equal(s.players[0].life, 21);
});
