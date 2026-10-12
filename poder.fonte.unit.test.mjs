// CR2b.10 · "it deals damage equal to its power" (608.2h): o poder da fonte agora, ou como era no campo se ela saiu (última informação
// conhecida — marcadores, aumentos até o fim do turno). Heartfire Hero (texto oficial em .listas/oficiais-motor.json, Oracle do Forge,
// 12/10/2026): valente + "When Heartfire Hero dies, it deals damage equal to its power to each opponent". Cada teste falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, comMana, tudo, CARTAS } from './cmd.mjs';

const HH = JSON.parse(readFileSync(new URL('./.listas/oficiais-motor.json', import.meta.url), 'utf8')).cartas.find(c => c.name === 'Heartfire Hero');
const c = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: 1, keywords: [], oracle_text: '', colors: [...new Set((mana_cost.match(/[WUBRG]/g) || []))], ...extra });
const cards = { 'Heartfire Hero': { name: HH.name, type_line: HH.type_line, mana_cost: HH.mana_cost, cmc: 1, keywords: [], oracle_text: HH.oracle_text, colors: ['R'], power: HH.power, toughness: HH.toughness },
  Forca: c('Forca', 'Instant', '{R}'), Fraco: c('Fraco', 'Instant', '{B}'), Mata: c('Mata', 'Instant', '{B}') };
const scripts = {
  Forca: { name: 'Forca', effects: [{ do: 'pump', power: 2, toughness: 0, target: 'creature' }], example: { target: 'own-creature', expect: { pump: [2, 0] } } },
  Fraco: { name: 'Fraco', effects: [{ do: 'pump', power: -3, toughness: 0, target: 'creature' }], example: { target: 'own-creature', expect: { pump: [-3, 0] } } },
  Mata: { name: 'Mata', effects: [{ do: 'destroy', target: 'creature' }], example: { target: 'enemy-creature', expect: { gone: true } } }
};
function mesaX(a = [], b = []) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 12, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 1, mode: 'full', cards: { ...CARTAS, ...cards }, scripts, first: 0, players: [{ name: 'A', deck: baralho([...a, 'Mountain', 'Swamp']) }, { name: 'B', deck: baralho([...b, 'Swamp']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const conjura = (s, p, oid, alvo, cores = 'RB') => { s = comMana(s, cores, p); s = J(s); s.turn.priority = p; const a = legais(s, p, x => x.t === 'cast' && x.oid === oid && x.targets && x.targets[0] && x.targets[0].oid === alvo)[0]; assert.ok(a, 'conjurar mirando'); return act(s, a); };
const resolve = (s, p = 0) => tudo(act(act(s, { t: 'pass', p }), { t: 'pass', p: p === 0 ? 1 : 0 }));

test('CR 608.2h · Heartfire Hero morre: dano igual ao poder que tinha no campo (marcadores e aumento até o fim do turno), em cada oponente', () => {
  let s = mesaX(['Heartfire Hero', 'Forca', 'Mata']), h, f, m;
  [s, h] = poe(s, 0, 'Heartfire Hero'); [s, f] = poe(s, 0, 'Forca', 'hand'); [s, m] = poe(s, 0, 'Mata', 'hand');
  s = conjura(s, 0, f, h);
  s = resolve(s);
  assert.equal(s.objects[h].counters.p1p1, 1, 'valente: a Força mirou → +1/+1');
  const v = s.players[1].life;
  s = resolve(conjura(s, 0, m, h));
  assert.equal(s.objects[h].zone, 'graveyard');
  assert.equal(v - s.players[1].life, 4, '1 impresso + 1 marcador + 2 da Força = 4');
});

test('CR 608.2h · poder negativo no campo não causa dano (nem "cura")', () => {
  let s = mesaX(['Heartfire Hero', 'Fraco', 'Mata']), h, fr, m;
  [s, h] = poe(s, 0, 'Heartfire Hero'); [s, fr] = poe(s, 0, 'Fraco', 'hand'); [s, m] = poe(s, 0, 'Mata', 'hand');
  s = resolve(conjura(s, 0, fr, h, 'BB'));
  const v = s.players[1].life;
  s = resolve(conjura(s, 0, m, h, 'BB'));
  assert.equal(s.objects[h].zone, 'graveyard');
  assert.equal(s.players[1].life, v, 'poder −1 (1 − 3 + 1 do valente): nada');
});
