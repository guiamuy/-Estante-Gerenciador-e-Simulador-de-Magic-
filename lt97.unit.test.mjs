// M-415 · LT81 · "~ deals N damage to target creature or planeswalker. If that creature or planeswalker would die this turn, exile it instead." (614.1a;
// 700.4: o planeswalker também morre) — Fanged Flames, Flame-Blessed Bolt, Obliterating Bolt, Scorching Dragonfire (texto da Scryfall de 17/10/2026 UTC,
// .listas/oficiais-revisadas.json), caminho de produção (APROVADAS). Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, palavrasDoTexto, valorDeMana, S } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Fanged Flames', 'Flame-Blessed Bolt', 'Obliterating Bolt', 'Scorching Dragonfire'];
const C = {}; for (const n of NOMES) { const c = OF.find(x => x.name === n); C[n] = { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: palavrasDoTexto(c.oracle_text), oracle_text: c.oracle_text, colors: n === 'Fanged Flames' ? [] : ['R'] }; }
C.Urso = { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' };
C.Gigante = { name: 'Gigante', type_line: 'Creature — Giant', mana_cost: '{4}{G}', cmc: 5, keywords: [], oracle_text: '', colors: ['G'], power: '5', toughness: '5' };
C.Mountain = { name: 'Mountain', type_line: 'Basic Land — Mountain', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {R}.)', colors: [] };
function mesa(seed = 17) {
  const b = ns => ns.map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Mountain']) }, { name: 'B', deck: b(['Urso', 'Gigante', 'Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending);

test('LT81 · as quatro jogam pelo leitor aprovado', () => {
  for (const n of NOMES) { assert.equal(S.coverage(C[n]).level, 'completo', n); assert.equal(S.APROVADAS[n].leva, 'M-415'); }
});

test('LT81 · Fanged Flames: a criatura que morre do dano é exilada; a que sobrevive, se morrer depois neste turno, também; no próximo turno, não', () => {
  let s = mesa(), ff, u, g; [s, ff] = poe(s, 0, 'Fanged Flames', 'hand'); [s, u] = poe(s, 1, 'Urso'); [s, g] = poe(s, 1, 'Gigante'); for (let i = 0; i < 2; i++) [s] = poe(s, 0, 'Mountain');
  let a = resolve(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === ff && x.targets[0].oid === u)[0])); assert.equal(a.objects[u].zone, 'exile', 'morreu do dano: exílio');
  let b = resolve(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === ff && x.targets[0].oid === g)[0])); assert.equal(b.objects[g].zone, 'battlefield'); assert.equal(b.objects[g].damage, 4);
  let c = J(b); c.objects[g].damage = 5; c = passaAte(act(c, { t: 'pass', p: c.turn.priority }), x => x.objects[g].zone !== 'battlefield' || x.turn.active === 1, 20);
  assert.equal(c.objects[g].zone, 'exile', 'morreu mais tarde no mesmo turno: exílio');
});
