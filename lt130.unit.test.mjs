// M-448 · LT114 · Mystical Teachings ("Search your library for an instant card or a card with flash, reveal it, put it into your hand, then shuffle. /
// Flashback {5}{B}"). Texto da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json), caminho de produção (APROVADAS). Filtro "ou" (M-377)
// com tipo instantânea ou palavra-chave lampejo. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, act, poe, legais, passaAte, S } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const c0 = OF.find(x => x.name === 'Mystical Teachings');
const k = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra });
const C = { 'Mystical Teachings': { name: c0.name, type_line: c0.type_line, mana_cost: c0.mana_cost, cmc: 4, keywords: ['Flashback'], oracle_text: c0.oracle_text, colors: ['U'] },
  Raio: k('Raio', 'Instant', '{R}', { oracle_text: 'Raio deals 1 damage to any target.' }),
  Fada: k('Fada', 'Creature — Faerie', '{U}', { keywords: ['Flash'], oracle_text: 'Flash', power: '1', toughness: '1' }),
  Feitico: k('Feitico', 'Sorcery', '{U}', { oracle_text: 'Draw a card.' }),
  Urso: k('Urso', 'Creature — Bear', '{G}', { power: '2', toughness: '2' }),
  Island: k('Island', 'Basic Land — Island', '', { cmc: 0, oracle_text: '({T}: Add {U}.)' }),
  Swamp: k('Swamp', 'Basic Land — Swamp', '', { cmc: 0, oracle_text: '({T}: Add {B}.)' }) };
function mesa(seed = 31) {
  const b = ns => ns.map(name => ({ name, qty: 5, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b(['Mystical Teachings', 'Raio', 'Fada', 'Feitico', 'Urso', 'Island', 'Swamp']) }, { name: 'B', deck: b(['Urso', 'Island']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending, 40);

test('LT114 · Mystical Teachings joga pelo leitor aprovado', () => {
  assert.equal(S.coverage(C['Mystical Teachings']).level, 'completo'); assert.equal(S.APROVADAS['Mystical Teachings'].leva, 'M-448');
});

test('LT114 · oferece só instantânea ou carta com lampejo; a escolhida vai para a mão', () => {
  let s = mesa(), mt; [s, mt] = poe(s, 0, 'Mystical Teachings', 'hand'); for (let i = 0; i < 4; i++) [s] = poe(s, 0, 'Island');
  s = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === mt)[0]));
  assert.equal(s.pending && s.pending.kind, 'pick');
  const nomes = new Set(legais(s, 0, a => a.t === 'pick').map(a => s.objects[a.oid].name));
  assert.deepEqual([...nomes].sort(), ['Fada', 'Mystical Teachings', 'Raio']); // outra cópia dela é instantânea
  const fada = legais(s, 0, a => a.t === 'pick' && s.objects[a.oid].name === 'Fada')[0].oid;
  s = act(s, { t: 'pick', p: 0, oid: fada });
  while (s.pending && s.pending.kind === 'pick') s = act(s, legais(s, 0, a => a.t !== 'pick')[0]);
  assert.ok(s.zones[0].hand.includes(fada));
});

test('LT114 · lampejo do passado por {5}{B}: do cemitério, e depois vai para o exílio', () => {
  let s = mesa(), mt; [s, mt] = poe(s, 0, 'Mystical Teachings', 'graveyard'); [s] = poe(s, 0, 'Swamp'); for (let i = 0; i < 5; i++) [s] = poe(s, 0, 'Island');
  const c = legais(s, 0, a => a.t === 'cast' && a.oid === mt);
  assert.ok(c.length > 0);
  s = resolve(act(s, c[0]));
  while (s.pending && s.pending.kind === 'pick') s = act(s, legais(s, 0, a => a.t !== 'pick')[0] || legais(s, 0)[0]);
  s = resolve(s);
  assert.ok(s.zones[0].exile.includes(mt) || s.zones[0].exile.some(o => s.objects[o] && s.objects[o].name === 'Mystical Teachings'));
});
