// M-464 · LT130 · Soldevi Adnate ("{T}, Sacrifice a black or artifact creature: Add an amount of {B} equal to the sacrificed creature's mana value.").
// Texto da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json), caminho de produção (APROVADAS). Pedido da trilha `listas`. Custo com
// qualidade "cor ou tipo" e mana pelo valor de mana do sacrificado (608.2h), numa habilidade de mana (605.1a). Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const c0 = OF.find(x => x.name === 'Soldevi Adnate');
const cr = (name, type_line, mana_cost, cmc, colors) => ({ name, type_line, mana_cost, cmc, keywords: [], oracle_text: '', colors, power: '2', toughness: '2' });
const C = { 'Soldevi Adnate': { name: c0.name, type_line: c0.type_line, mana_cost: c0.mana_cost, cmc: 2, keywords: [], oracle_text: c0.oracle_text, colors: ['B'], power: c0.power, toughness: c0.toughness },
  Sombra: cr('Sombra', 'Creature — Shade', '{3}{B}{B}', 5, ['B']), Golem: cr('Golem', 'Artifact Creature — Golem', '{3}', 3, []), Urso: cr('Urso', 'Creature — Bear', '{1}{G}', 2, ['G']),
  Swamp: { name: 'Swamp', type_line: 'Basic Land — Swamp', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {B}.)', colors: [] } };
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 109, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b(['Soldevi Adnate', 'Sombra', 'Golem', 'Urso', 'Swamp']) }, { name: 'B', deck: b(['Urso', 'Swamp']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
function cena() { let s = mesa(), ad, so, go, ur; [s, ad] = poe(s, 0, 'Soldevi Adnate'); [s, so] = poe(s, 0, 'Sombra'); [s, go] = poe(s, 0, 'Golem'); [s, ur] = poe(s, 0, 'Urso'); s = J(s); s.objects[ad].sick = false; return { s, ad, so, go, ur }; }
const sacrificaveis = (s, ad) => legais(s, 0, a => a.t === 'activate' && a.oid === ad).map(a => JSON.stringify(a.pay || {}));

test('LT130 · Soldevi Adnate joga pelo leitor aprovado', () => {
  assert.equal(S.coverage(C['Soldevi Adnate']).level, 'completo'); assert.equal(S.APROVADAS['Soldevi Adnate'].leva, 'M-464');
});

test('LT130 · sacrifica criatura preta (ela mesma também) ou artefato; a verde não', () => {
  const { s, ad, so, go, ur } = cena(); const op = sacrificaveis(s, ad).join(' ');
  assert.ok(op.includes(so) && op.includes(go) && op.includes(ad), op); assert.ok(!op.includes(ur), op);
});

test('LT130 · sacrificar a Sombra (valor 5) dá {B}{B}{B}{B}{B} na hora, sem pilha; o Golem dá 3', () => {
  let { s, ad, so, go } = cena();
  let a = legais(s, 0, x => x.t === 'activate' && x.oid === ad && JSON.stringify(x.pay || {}).includes(so))[0];
  let t = act(s, a); assert.equal(t.stack.length, 0); assert.equal(t.players[0].pool.B, 5); assert.equal(t.objects[so].zone, 'graveyard'); assert.equal(t.objects[ad].tapped, true);
  a = legais(s, 0, x => x.t === 'activate' && x.oid === ad && JSON.stringify(x.pay || {}).includes(go))[0];
  t = act(s, a); assert.equal(t.players[0].pool.B, 3);
});
