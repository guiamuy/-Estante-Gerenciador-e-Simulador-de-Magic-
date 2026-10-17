// M-419 · LT85 · anulação por tipo e por valor de mana: "Counter target sorcery spell." (Envelop, Extinguish) e "Counter target spell if its mana value is 2
// or less. If this spell was kicked, counter that spell if its mana value is 4 or less instead." (Prohibit; 702.33d). Texto da Scryfall de 17/10/2026 UTC
// (.listas/oficiais-revisadas.json), caminho de produção (APROVADAS). Prohibit mira qualquer mágica e confere o valor de mana na resolução. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, palavrasDoTexto, valorDeMana, S, resolveUm } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Envelop', 'Extinguish', 'Prohibit'];
const C = {}; for (const n of NOMES) { const c = OF.find(x => x.name === n); C[n] = { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: palavrasDoTexto(c.oracle_text), oracle_text: c.oracle_text, colors: ['U'] }; }
const sp = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: valorDeMana(mana_cost), keywords: [], oracle_text: '', colors: ['R'], ...extra });
C.Feitico = sp('Feitico', 'Sorcery', '{R}'); C.Instant = sp('Instant', 'Instant', '{R}'); C.Urso3 = sp('Urso3', 'Creature — Bear', '{2}{R}', { power: '3', toughness: '3' });
C.Gigante = sp('Gigante', 'Creature — Giant', '{4}{R}', { power: '5', toughness: '5' }); C.Bola = sp('Bola', 'Sorcery', '{X}{R}');
C.Island = { name: 'Island', type_line: 'Basic Land — Island', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {U}.)', colors: [] };
C.Mountain = { name: 'Mountain', type_line: 'Basic Land — Mountain', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {R}.)', colors: [] };
function mesa(seed = 25) {
  const b = ns => ns.map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, first: 1, players: [{ name: 'A', deck: b([...NOMES, 'Island']) }, { name: 'B', deck: b(['Feitico', 'Instant', 'Urso3', 'Gigante', 'Bola', 'Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending);
function pilha(magica, filtro = () => true) { let s = mesa(), m; [s, m] = poe(s, 1, magica, 'hand'); s = J(s); s.manaCheck = false; s = act(s, legais(s, 1, a => a.t === 'cast' && a.oid === m && filtro(a))[0]); s = act(s, { t: 'pass', p: 1 }); s.manaCheck = true; for (let i = 0; i < 4; i++) [s] = poe(s, 0, 'Island'); return { s, m }; }

test('LT85 · as três jogam pelo leitor aprovado', () => {
  for (const n of NOMES) { assert.equal(S.coverage(C[n]).level, 'completo', n); assert.equal(S.APROVADAS[n].leva, 'M-419'); }
});

test('LT85 · Envelop: só mira mágica de feitiço (não instantânea nem criatura) e a anula', () => {
  for (const [mag, ok] of [['Feitico', true], ['Instant', false], ['Urso3', false]]) {
    let { s, m } = pilha(mag), ev; [s, ev] = poe(s, 0, 'Envelop', 'hand');
    const a = legais(s, 0, x => x.t === 'cast' && x.oid === ev);
    assert.equal(a.length > 0, ok, mag); if (ok) { const r = resolve(act(s, a[0])); assert.equal(r.objects[m].zone, 'graveyard'); }
  }
});

test('LT85 · Prohibit: mira qualquer mágica; sem reforço anula valor 2 ou menos; com reforço, 4 ou menos; acima, a mágica fica', () => {
  const caso = (mag, kick, filtro) => { let { s, m } = pilha(mag, filtro), pr; [s, pr] = poe(s, 0, 'Prohibit', 'hand');
    const a = legais(s, 0, x => x.t === 'cast' && x.oid === pr && (x.kick || 0) === kick && x.targets && x.targets[0].oid === m); assert.ok(a.length, `${mag} kick ${kick}`);
    const r = resolveUm(act(s, a[0])); return r.objects[m].zone === 'stack' ? 'battlefield' : r.objects[m].zone; }; // só o Prohibit resolve: a mágica alvo que fica continua na pilha
  assert.equal(caso('Urso3', 0), 'battlefield', 'valor 3 sem reforço: não anula');
  assert.equal(caso('Urso3', 1), 'graveyard', 'valor 3 com reforço: anula');
  assert.equal(caso('Gigante', 1), 'battlefield', 'valor 5 com reforço: não anula');
  assert.equal(caso('Feitico', 0), 'graveyard', 'valor 1: anula');
  assert.equal(caso('Bola', 0, a => a.x === 3), 'battlefield', 'X = 3 conta na pilha (valor 4): sem reforço não anula');
  assert.equal(caso('Bola', 0, a => a.x === 1), 'graveyard', 'X = 1 (valor 2): anula');
});
