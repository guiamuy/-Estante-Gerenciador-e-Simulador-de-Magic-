// M-432 · LT98 · "Each opponent gets a poison counter." (122.1f) — Prologue to Phyresis e Infectious Inquiry ("You draw two cards and you lose 2 life. …").
// Texto da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json), caminho de produção (APROVADAS). Efeito novo `veneno`. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, T, act, poe, legais, passaAte, valorDeMana, S } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Infectious Inquiry', 'Prologue to Phyresis'];
const C = {}; for (const n of NOMES) { const c = OF.find(x => x.name === n); C[n] = { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: [...new Set(c.mana_cost.match(/[WUBRG]/g))] }; }
for (const [n, k] of Object.entries({ Swamp: 'B', Island: 'U' })) C[n] = { name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${k}}.)`, colors: [] };
function mesa(seed = 41) {
  const b = ns => ns.map(name => ({ name, qty: 10, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Swamp', 'Island']) }, { name: 'B', deck: b(['Swamp']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending, 40);

test('LT98 · as duas jogam pelo leitor aprovado', () => {
  for (const n of NOMES) { assert.equal(S.coverage(C[n]).level, 'completo', n); assert.equal(S.APROVADAS[n].leva, 'M-432'); }
});

test('LT98 · Prologue to Phyresis: o oponente recebe 1 marcador de veneno (você não) e você compra 1; o registro diz', () => {
  let s = mesa(), pp; [s, pp] = poe(s, 0, 'Prologue to Phyresis', 'hand'); for (let i = 0; i < 2; i++) [s] = poe(s, 0, 'Island');
  const mao = s.zones[0].hand.length; const r = E.apply(s, legais(s, 0, a => a.t === 'cast' && a.oid === pp)[0]); let t = resolve(r.state);
  assert.equal(t.players[1].poison, 1); assert.ok(!t.players[0].poison); assert.equal(t.zones[0].hand.length, mao);
  assert.match(T.descreveEfeito(t.facts['Prologue to Phyresis'].script.effects[0]), /cada oponente recebe 1 marcador de veneno/);
});

test('LT98 · Infectious Inquiry: você compra 2 e perde 2; o oponente recebe 1 marcador de veneno; com 9, o décimo faz perder (704.5c)', () => {
  let s = mesa(), ii; [s, ii] = poe(s, 0, 'Infectious Inquiry', 'hand'); for (let i = 0; i < 3; i++) [s] = poe(s, 0, 'Swamp');
  const mao = s.zones[0].hand.length; let t = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === ii)[0]));
  assert.equal(t.zones[0].hand.length, mao + 1); assert.equal(t.players[0].life, 18); assert.equal(t.players[1].poison, 1);
  let g = J(s); g.players[1].poison = 9; g = resolve(act(g, legais(g, 0, a => a.t === 'cast' && a.oid === ii)[0]));
  assert.equal(g.players[1].poison, 10); assert.ok(g.players[1].lost, 'dez marcadores de veneno');
});
