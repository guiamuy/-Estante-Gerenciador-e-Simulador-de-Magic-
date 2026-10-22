// M-561 · LT220 · revisão por lote CXCVI (texto da Scryfall de 22/10/2026): Myriad Landscape — "{2}, {T}, Sacrifice this land: Search your library for
// up to two basic land cards that share a land type, put them onto the battlefield tapped, then shuffle." A segunda carta escolhida precisa ter um tipo
// de terreno em comum com a primeira (205.3i); pode escolher uma só ou nenhuma. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, T, act, poe, legais, passaAte } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const ML = 'Myriad Landscape', ml = OF.find(x => x.name === ML);
const basico = (n, c) => ({ name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${c}}.)`, colors: [] });
const C = { [ML]: { name: ML, type_line: ml.type_line, mana_cost: '', cmc: 0, keywords: [], oracle_text: ml.oracle_text, colors: [] },
  Forest: basico('Forest', 'G'), Island: basico('Island', 'U'), Mountain: basico('Mountain', 'R') };
function mesa() {
  const b = ns => ns.map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 243, mode: 'full', cards: C, first: 0, players: [
    { name: 'A', deck: b([[ML, 2], ['Forest', 12], ['Island', 12], ['Mountain', 14]]) }, { name: 'B', deck: b([['Island', 40]]) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  let m; [s, m] = poe(s, 0, ML); for (let i = 0; i < 2; i++) [s] = poe(s, 0, 'Mountain');
  return [s, m];
}
const ativa = (s, m) => passaAte(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === m)[0]), x => !!x.pending || !x.stack.length);
const nome = (s, oid) => s.objects[oid].name;

test('M-561 · Myriad Landscape joga (lida e aprovada)', () => { assert.equal(S.coverage(C[ML]).level, 'completo'); });

test('M-561 · depois da primeira Floresta, só Florestas são oferecidas; as duas entram viradas', () => {
  let [s, m] = mesa(); s = ativa(s, m); assert.equal(s.pending && s.pending.kind, 'pick');
  const f = legais(s, 0, a => a.t === 'pick' && nome(s, a.oid) === 'Forest')[0]; s = act(s, f);
  const ofertas = legais(s, 0, a => a.t === 'pick').map(a => nome(s, a.oid)); assert.ok(ofertas.length && ofertas.every(n => n === 'Forest'), 'só Florestas');
  const ilha = s.pending.from.find(o => nome(s, o) === 'Island'); assert.throws(() => E.apply(s, { t: 'pick', p: 0, oid: ilha }), /tipo de terreno em comum/);
  s = act(s, legais(s, 0, a => a.t === 'pick')[0]); s = passaAte(s, x => !x.pending && !x.stack.length);
  const novas = s.zones[0].battlefield.filter(o => nome(s, o) === 'Forest'); assert.equal(novas.length, 2); assert.ok(novas.every(o => s.objects[o].tapped), 'entram viradas');
  assert.equal(s.objects[m].zone, 'graveyard', 'sacrificada');
});

test('M-561 · pode parar em uma só; a pilha explicada diz o tipo em comum', () => {
  let [s, m] = mesa(); s = ativa(s, m); s = act(s, legais(s, 0, a => a.t === 'pick' && nome(s, a.oid) === 'Island')[0]);
  assert.ok(legais(s, 0, a => a.t === 'pick_done').length, 'pode terminar com uma'); s = act(s, legais(s, 0, a => a.t === 'pick_done')[0]);
  s = passaAte(s, x => !x.pending && !x.stack.length); assert.equal(s.zones[0].battlefield.filter(o => nome(s, o) === 'Island').length, 1);
  assert.match(String(T.descreveEfeitos([{ do: 'search', amount: 2, filter: { basic: true, types: ['land'] }, to: 'battlefield-tapped', compartilhaTipoM: true }])), /com um tipo de terreno em comum/);
});
