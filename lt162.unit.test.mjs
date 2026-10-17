// M-480 · LT146 · nome curto da lendária também em "X the Y" (201.5c): "Return Arcanis to its owner's hand" em Arcanis the Omnipotent.
// Texto da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json). Só em lendária; nunca em "X's …". Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadModules } from './_load.mjs';
import { E, J, act, poe, legais, passaAte, S, valorDeMana } from './listas.mjs';
const { leitor: L } = loadModules();
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const c0 = OF.find(x => x.name === 'Arcanis the Omnipotent');
const AR = { name: c0.name, type_line: c0.type_line, mana_cost: c0.mana_cost, cmc: valorDeMana(c0.mana_cost), keywords: [], oracle_text: c0.oracle_text, colors: ['U'], power: c0.power, toughness: c0.toughness };
const terra = { name: 'Island', type_line: 'Basic Land — Island', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {U}.)', colors: [] };
const C = { [AR.name]: AR, Island: terra };
function mesa() {
  let s = E.createGame({ format: 'livre', seed: 150, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: [{ name: AR.name, qty: 4, zone: 'main' }, { name: 'Island', qty: 20, zone: 'main' }] }, { name: 'B', deck: [{ name: 'Island', qty: 24, zone: 'main' }] }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const tudo = s => { for (let i = 0; i < 40 && (s.stack.length || s.pending); i++) { const pk = s.pending; const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pass') || l[0]); } return s; };

test('LT146 · Arcanis the Omnipotent joga pelo leitor aprovado', () => {
  assert.equal(S.coverage(AR).level, 'completo'); assert.equal(S.APROVADAS[AR.name].leva, 'M-480');
});

test('LT146 · Arcanis: {T} compra três; {2}{U}{U} volta para a mão do dono', () => {
  let s = mesa(), a; [s, a] = poe(s, 0, AR.name); for (let i = 0; i < 4; i++) [s] = poe(s, 0, 'Island'); s = J(s); s.objects[a].sick = false; const m0 = s.zones[0].hand.length;
  const t = tudo(act(s, legais(s, 0, x => x.t === 'activate' && x.oid === a && x.index === 0)[0])); assert.equal(t.zones[0].hand.length, m0 + 3);
  const b = tudo(act(s, legais(s, 0, x => x.t === 'activate' && x.oid === a && x.index === 1)[0])); assert.equal(b.objects[a].zone, 'hand');
});

test('LT146 · o nome curto "X the Y" só vale em lendária e nunca em "X\'s …"', () => {
  const base = { mana_cost: '{3}', cmc: 3, keywords: [], colors: [], power: '1', toughness: '1' };
  const naoLend = L.ler({ ...base, name: 'Arcanis the Omnipotent', type_line: 'Creature — Wizard', oracle_text: "{2}{U}{U}: Return Arcanis to its owner's hand." });
  assert.ok(!naoLend.completa, 'não lendária: "Arcanis" não é ela');
  const posse = L.ler({ ...base, name: 'Arcanis the Omnipotent', type_line: 'Legendary Creature — Wizard', oracle_text: "{2}{U}{U}: Return Arcanis's Pet to its owner's hand." });
  assert.ok(!posse.completa, '"Arcanis\'s Pet" é outro objeto');
});
