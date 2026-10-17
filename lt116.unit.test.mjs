// M-434 · LT100 · Tolarian Winds ("Discard all the cards in your hand, then draw that many cards."). Texto da Scryfall de 17/10/2026 UTC
// (.listas/oficiais-revisadas.json), caminho de produção (APROVADAS). Contagem nova `descartadas-assim` (as descartadas por esta resolução). Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const c0 = OF.find(x => x.name === 'Tolarian Winds');
const C = { 'Tolarian Winds': { name: c0.name, type_line: c0.type_line, mana_cost: c0.mana_cost, cmc: 2, keywords: [], oracle_text: c0.oracle_text, colors: ['U'] },
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Island: { name: 'Island', type_line: 'Basic Land — Island', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {U}.)', colors: [] } };
function mesa(seed = 43) {
  const b = ns => ns.map(name => ({ name, qty: 15, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b(['Tolarian Winds', 'Urso', 'Island']) }, { name: 'B', deck: b(['Island']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending, 40);
function cena(naMao) {
  let s = mesa(), tw; [s, tw] = poe(s, 0, 'Tolarian Winds', 'hand'); for (let i = 0; i < 4; i++) [s] = poe(s, 0, 'Island');
  s = J(s); const z = s.zones[0]; const resto = z.hand.filter(o => o !== tw); for (const o of resto.slice(naMao)) { z.hand.splice(z.hand.indexOf(o), 1); z.library.push(o); s.objects[o].zone = 'library'; }
  return { s, tw, velhas: z.hand.filter(o => o !== tw) };
}

test('LT100 · Tolarian Winds joga pelo leitor aprovado', () => {
  assert.equal(S.coverage(C['Tolarian Winds']).level, 'completo'); assert.equal(S.APROVADAS['Tolarian Winds'].leva, 'M-434');
});

test('LT100 · descarta a mão inteira (sem contar ela mesma, na pilha) e compra o mesmo tanto', () => {
  for (const n of [4, 1, 0]) {
    const { s, tw, velhas } = cena(n); assert.equal(velhas.length, n);
    const t = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === tw)[0]));
    assert.equal(t.zones[0].hand.length, n, `com ${n} na mão`); for (const o of velhas) assert.equal(t.objects[o].zone, 'graveyard');
  }
});

test('LT100 · conjurada de novo, conta só o desta resolução', () => {
  let { s, tw } = cena(3); s = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === tw)[0]));
  s = J(s); const z = s.zones[0]; z.graveyard.splice(z.graveyard.indexOf(tw), 1); z.hand.push(tw); s.objects[tw].zone = 'hand'; for (const o of z.battlefield) s.objects[o].tapped = false;
  const fora = z.hand.filter(o => o !== tw).slice(1); for (const o of fora) { z.hand.splice(z.hand.indexOf(o), 1); z.library.push(o); s.objects[o].zone = 'library'; }
  const t = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === tw)[0])); assert.equal(t.zones[0].hand.length, 1);
});
