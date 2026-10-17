// M-450 · LT116 · Embiggen ("Until end of turn, target non-Brushwagg creature gets +1/+1 for each supertype, card type, and subtype it has.").
// Texto e rulings da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json): contado na resolução; todos os subtipos contam; ficha não é tipo.
// Contagem nova `tipos-do-alvo`; alvo com `semSubtipos` (metamorfo é Brushwagg, 702.73a). Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, act, poe, legais, passaAte, S } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const c0 = OF.find(x => x.name === 'Embiggen');
const cr = (name, type_line, extra = {}) => ({ name, type_line, mana_cost: '{2}', cmc: 2, keywords: [], oracle_text: '', colors: [], power: '1', toughness: '1', ...extra });
const C = { Embiggen: { name: c0.name, type_line: c0.type_line, mana_cost: c0.mana_cost, cmc: 1, keywords: [], oracle_text: c0.oracle_text, colors: ['G'] },
  Cao: cr('Cao', 'Legendary Artifact Creature — Treasure Dog'), Urso: cr('Urso', 'Creature — Bear'), Doutor: cr('Doutor', 'Creature — Time Lord Doctor'),
  Wagg: cr('Wagg', 'Creature — Brushwagg'), Muda: cr('Muda', 'Creature — Shapeshifter', { keywords: ['Changeling'], oracle_text: 'Changeling (This card is every creature type.)' }),
  Forest: { name: 'Forest', type_line: 'Basic Land — Forest', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {G}.)', colors: [] } };
function mesa(seed = 23) {
  const b = ns => ns.map(name => ({ name, qty: 5, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b(['Embiggen', 'Cao', 'Urso', 'Doutor', 'Forest']) }, { name: 'B', deck: b(['Wagg', 'Muda', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length && !x.pending, 40);
function cena() { let s = mesa(), eb, o = {}; [s, eb] = poe(s, 0, 'Embiggen', 'hand'); [s] = poe(s, 0, 'Forest'); for (const n of ['Cao', 'Urso', 'Doutor']) [s, o[n]] = poe(s, 0, n); for (const n of ['Wagg', 'Muda']) [s, o[n]] = poe(s, 1, n); return { s, eb, o }; }
const st = (s, oid) => { const x = E.stats(s, s.objects[oid]); return [x.power, x.toughness]; };
const mira = (s, eb, oid) => resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === eb && a.targets[0].oid === oid)[0]));

test('LT116 · Embiggen joga pelo leitor aprovado', () => {
  assert.equal(S.coverage(C.Embiggen).level, 'completo'); assert.equal(S.APROVADAS.Embiggen.leva, 'M-450');
});

test('LT116 · conta supertipo, tipos e subtipos: Legendary Artifact Creature — Treasure Dog ganha +5/+5; Creature — Bear, +2/+2', () => {
  let { s, eb, o } = cena(); s = mira(s, eb, o.Cao); assert.deepEqual(st(s, o.Cao), [6, 6]);
  ({ s, eb, o } = cena()); s = mira(s, eb, o.Urso); assert.deepEqual(st(s, o.Urso), [3, 3]);
});

test('LT116 · "Time Lord" é um subtipo só: Creature — Time Lord Doctor ganha +3/+3', () => {
  let { s, eb, o } = cena(); s = mira(s, eb, o.Doutor); assert.deepEqual(st(s, o.Doutor), [4, 4]);
});

test('LT116 · Brushwagg não é alvo, nem o metamorfo (tem todos os tipos de criatura)', () => {
  const { s, eb, o } = cena();
  const alvos = legais(s, 0, a => a.t === 'cast' && a.oid === eb).map(a => a.targets[0].oid);
  assert.ok(alvos.includes(o.Urso) && alvos.includes(o.Cao));
  assert.ok(!alvos.includes(o.Wagg)); assert.ok(!alvos.includes(o.Muda));
});
