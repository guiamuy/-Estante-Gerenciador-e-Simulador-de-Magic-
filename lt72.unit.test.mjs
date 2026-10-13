// M-389 · LT56 · First Day of Class: "Whenever a creature you control enters this turn, put a +1/+1 counter on it and it gains haste until end of
// turn. Learn." (Oracle do Forge, consulta de 12/10/2026; .listas/oficiais-revisadas.json), caminho de produção (APROVADAS). 603.7c: o gatilho
// atrasado dispara a cada criatura sua que entrar até o fim do turno. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, act, poe, legais, passaAte, CARTAS } from './cmd.mjs';
import { valorDeMana, palavrasDoTexto } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const r = OF.find(x => x.name === 'First Day of Class');
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: valorDeMana(mana_cost), keywords: [], oracle_text: '', colors: [], ...extra });
const CARDS = { ...CARTAS, 'First Day of Class': { name: r.name, type_line: r.type_line, mana_cost: r.mana_cost, cmc: valorDeMana(r.mana_cost), keywords: palavrasDoTexto(r.oracle_text), oracle_text: r.oracle_text, colors: ['R'] },
  Cabra: c0('Cabra', 'Creature — Goat', '{R}', { power: '1', toughness: '1', colors: ['R'] }) };
function mesa() {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 37, mode: 'full', cards: CARDS, first: 0,
    players: [{ name: 'A', deck: baralho(['First Day of Class', 'Cabra', 'Mountain']) }, { name: 'B', deck: baralho(['Cabra', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending);
const has = (s, oid, k) => E.hasKeyword(s, s.objects[oid], k);

test('LT56 · First Day of Class: cada criatura sua que entra neste turno ganha +1/+1 e ímpeto; no turno seguinte, nada', () => {
  let s = mesa(), f, c1, c2, c3; [s, f] = poe(s, 0, 'First Day of Class', 'hand'); for (let i = 0; i < 4; i++) [s] = poe(s, 0, 'Mountain');
  [s, c1] = poe(s, 0, 'Cabra', 'hand'); [s, c2] = poe(s, 0, 'Cabra', 'hand'); [s, c3] = poe(s, 0, 'Cabra', 'hand');
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === f)[0]); s = resolve(s);
  if (s.pending) s = act(s, legais(s, 0, a => a.t === 'decline' || a.t === 'pass')[0] || legais(s, 0)[0]); // aprender: recusa
  s = resolve(s);
  for (const c of [c1, c2]) { s = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === c)[0])); s = resolve(s); }
  for (const c of [c1, c2]) { assert.equal(s.objects[c].counters.p1p1, 1, 'marcador'); assert.ok(has(s, c, 'haste'), 'ímpeto'); }
  s = passaAte(s, x => x.turn.active === 0 && x.turn.number > 2 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  assert.ok(!has(s, c1, 'haste'), 'o ímpeto acabou'); assert.ok(!(s.gatilhosDoTurno || []).length, 'acabou na limpeza');
  s = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === c3)[0])); s = resolve(s);
  assert.equal(s.objects[c3].zone, 'battlefield'); assert.ok(!(s.objects[c3].counters || {}).p1p1 && !has(s, c3, 'haste'), 'no turno seguinte, nada');
});
