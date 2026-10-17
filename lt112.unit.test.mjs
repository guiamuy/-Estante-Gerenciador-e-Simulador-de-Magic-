// M-430 · LT96 · "This creature attacks each combat if able." (508.1d: exigência de atacar) — Monstrous Carabid e Ulamog's Crusher (com Annihilator 2, que o
// leitor passa a aceitar na linha de palavras-chave com número, como a cobertura sem leitor já aceitava). Texto da Scryfall de 17/10/2026 UTC
// (.listas/oficiais-revisadas.json), caminho de produção (APROVADAS). Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, valorDeMana, S } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Monstrous Carabid', "Ulamog's Crusher"];
const C = {}; for (const n of NOMES) { const c = OF.find(x => x.name === n); C[n] = { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: n === "Ulamog's Crusher" ? ['Annihilator'] : ['Cycling'], oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], power: c.power, toughness: c.toughness }; }
C.Urso = { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' };
C.Forest = { name: 'Forest', type_line: 'Basic Land — Forest', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {G}.)', colors: [] };
function mesa(seed = 39) {
  const b = ns => ns.map(name => ({ name, qty: name === 'Forest' ? 20 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Urso', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const ataque = s => passaAte(s, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 0);

test('LT96 · as duas jogam pelo leitor aprovado', () => {
  for (const n of NOMES) { assert.equal(S.coverage(C[n]).level, 'completo', n); assert.equal(S.APROVADAS[n].leva, 'M-430'); }
});

test('LT96 · Monstrous Carabid precisa atacar se puder: entra em toda declaração oferecida; declarar sem ela é recusado; a Urso ao lado é livre', () => {
  let s = mesa(), c, u; [s, c] = poe(s, 0, 'Monstrous Carabid'); [s, u] = poe(s, 0, 'Urso'); s = ataque(s);
  assert.deepEqual([...E.mustAttack(s, 0)], [c]);
  const ofertas = legais(s, 0, a => a.t === 'attack'); assert.ok(ofertas.length && ofertas.every(a => a.attackers.includes(c)), JSON.stringify(ofertas.map(a => a.attackers)));
  assert.ok(ofertas.some(a => !a.attackers.includes(u)), 'a Urso não é obrigada');
  assert.throws(() => E.apply(s, { t: 'attack', p: 0, attackers: [u] })); assert.throws(() => E.apply(s, { t: 'attack', p: 0, attackers: [] }));
  assert.doesNotThrow(() => E.apply(s, { t: 'attack', p: 0, attackers: [c] }));
});

test('LT96 · sem poder atacar, não é obrigada (508.1d): enjoada ou virada', () => {
  // sem atacante possível, a mesa nem abre a declaração: a exigência é conferida direto, na mesma fase
  let s = mesa(), c, u; [s, c] = poe(s, 0, 'Monstrous Carabid', 'battlefield', { sick: true }); [s, u] = poe(s, 0, 'Urso');
  assert.deepEqual([...E.mustAttack(s, 0)], [], 'enjoada'); s = ataque(s); assert.ok(legais(s, 0, a => a.t === 'attack' && !a.attackers.length).length, 'pode não atacar');
  let t = mesa(), d; [t, d] = poe(t, 0, 'Monstrous Carabid'); t = J(t); t.objects[d].tapped = true;
  assert.deepEqual([...E.mustAttack(t, 0)], [], 'virada'); assert.deepEqual([...E.mustAttack(mesa(), 0)], []);
});

test("LT96 · Ulamog's Crusher ataca obrigada e, com Annihilator 2, o defensor sacrifica duas permanentes", () => {
  let s = mesa(), uc; [s, uc] = poe(s, 0, "Ulamog's Crusher"); for (let i = 0; i < 3; i++) [s] = poe(s, 1, 'Forest'); s = ataque(s);
  assert.deepEqual([...E.mustAttack(s, 0)], [uc]);
  const antes = s.zones[1].battlefield.length; s = act(s, { t: 'attack', p: 0, attackers: [uc] });
  for (let i = 0; i < 40 && (s.pending && s.pending.kind !== 'blockers' || s.stack.length || (s.queued || []).length); i++) s = s.pending && s.pending.kind !== 'priority' ? act(s, legais(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority });
  assert.equal(s.zones[1].battlefield.length, antes - 2);
});
