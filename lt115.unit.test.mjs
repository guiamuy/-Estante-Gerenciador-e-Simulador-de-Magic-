// M-433 · LT99 · "Proliferate." pelo leitor (701.34; o efeito existe desde a V-2): Vivisurgeon's Insight, Thirsting Roots (modo) e Tezzeret's Gambit ({U/P}).
// Texto da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json), caminho de produção (APROVADAS). Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, valorDeMana, S } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ["Tezzeret's Gambit", 'Thirsting Roots', "Vivisurgeon's Insight"];
const C = {}; for (const n of NOMES) { const c = OF.find(x => x.name === n); C[n] = { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: [...new Set(c.mana_cost.match(/[WUBRG]/g))] }; }
C.Urso = { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' };
for (const [n, k] of Object.entries({ Island: 'U', Forest: 'G', Swamp: 'B' })) C[n] = { name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${k}}.)`, colors: [] };
function mesa(seed = 42) {
  const b = ns => ns.map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Urso', 'Island', 'Forest', 'Swamp']) }, { name: 'B', deck: b(['Urso', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  let u; [s, u] = poe(s, 0, 'Urso'); s = J(s); s.objects[u].counters.p1p1 = 1; s.players[1].poison = 1; return { s, u };
}
// proliferar pergunta um a um (sim/não): responde sim a tudo
const resolve = s => { for (let i = 0; i < 60; i++) { if (s.pending && s.pending.kind !== 'priority') { const l = legais(s, s.pending.p); s = act(s, l.find(a => a.t === 'pay') || l[0]); continue; } if (s.stack.length) { s = passaAte(s, x => !x.stack.length || (!!x.pending && x.pending.kind !== 'priority'), 40); continue; } return s; } return s; };

test('LT99 · as três jogam pelo leitor aprovado', () => {
  for (const n of NOMES) { assert.equal(S.coverage(C[n]).level, 'completo', n); assert.equal(S.APROVADAS[n].leva, 'M-433'); }
});

test("LT99 · Vivisurgeon's Insight: compra 3 e prolifera (+1/+1 na sua criatura, veneno no oponente)", () => {
  let { s, u } = mesa(), vi; [s, vi] = poe(s, 0, "Vivisurgeon's Insight", 'hand'); for (let i = 0; i < 5; i++) [s] = poe(s, 0, 'Island');
  const mao = s.zones[0].hand.length; const t = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === vi)[0]));
  assert.equal(t.zones[0].hand.length, mao + 2); assert.equal(t.objects[u].counters.p1p1, 2); assert.equal(t.players[1].poison, 2);
});

test('LT99 · Thirsting Roots: o modo "Proliferate"', () => {
  let { s, u } = mesa(), tr; [s, tr] = poe(s, 0, 'Thirsting Roots', 'hand'); [s] = poe(s, 0, 'Forest');
  const a = legais(s, 0, x => x.t === 'cast' && x.oid === tr && x.mode === 1); assert.ok(a.length, 'o segundo modo');
  const t = resolve(act(s, a[0])); assert.equal(t.objects[u].counters.p1p1, 2);
});

test("LT99 · Tezzeret's Gambit: {U/P} pago com 2 de vida; compra 2 e prolifera", () => {
  let { s, u } = mesa(), tg; [s, tg] = poe(s, 0, "Tezzeret's Gambit", 'hand'); for (let i = 0; i < 3; i++) [s] = poe(s, 0, 'Swamp');
  const a = legais(s, 0, x => x.t === 'cast' && x.oid === tg); assert.ok(a.length, 'sem azul, paga com vida');
  const mao = s.zones[0].hand.length; const t = resolve(act(s, a[0]));
  assert.equal(t.players[0].life, 18); assert.equal(t.zones[0].hand.length, mao + 1); assert.equal(t.objects[u].counters.p1p1, 2);
});
