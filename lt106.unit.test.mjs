// M-424 · LT90 · "Reveal the top N cards of your library. Put up to K <tipo> cards from among them into your hand and the rest into your graveyard."
// (Pieces of the Puzzle; "Put a creature card", obrigatória se houver uma: Tracker's Instincts, com lampejo do passado). Texto da Scryfall de 17/10/2026 UTC
// (.listas/oficiais-revisadas.json), caminho de produção (APROVADAS). Falha no motor anterior (as duas não eram lidas).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, valorDeMana, S } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Pieces of the Puzzle', "Tracker's Instincts"];
const C = {}; for (const n of NOMES) { const c = OF.find(x => x.name === n); C[n] = { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: /Flashback/.test(c.oracle_text) ? ['Flashback'] : [], oracle_text: c.oracle_text, colors: [...new Set(c.mana_cost.match(/[WUBRG]/g))] }; }
C.Raio = { name: 'Raio', type_line: 'Instant', mana_cost: '{R}', cmc: 1, keywords: [], oracle_text: '', colors: ['R'] };
C.Feitico = { name: 'Feitico', type_line: 'Sorcery', mana_cost: '{R}', cmc: 1, keywords: [], oracle_text: '', colors: ['R'] };
C.Urso = { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' };
for (const [n, k] of Object.entries({ Island: 'U', Forest: 'G' })) C[n] = { name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${k}}.)`, colors: [] };
function mesa(seed = 34) {
  const b = ns => ns.map(name => ({ name, qty: 6, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Raio', 'Feitico', 'Urso', 'Island', 'Forest']) }, { name: 'B', deck: [{ name: 'Forest', qty: 30, zone: 'main' }] }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const topo = (s, nomes) => { s = J(s); const L = s.zones[0].library; const usados = new Set(); for (const n of [...nomes].reverse()) { const i = L.findIndex(o => s.objects[o].name === n && !usados.has(o)); const [o] = L.splice(i, 1); usados.add(o); L.unshift(o); } return s; };
const ateEscolha = (s, a) => passaAte(act(s, a), x => !!x.pending && x.pending.kind === 'pick');
const fecha = t => { while (t.pending && t.pending.kind === 'pick') t = act(t, legais(t, 0, a => a.t !== 'pick')[0]); return passaAte(t, x => !x.stack.length && !x.pending, 20); };

test('LT90 · as duas jogam pelo leitor aprovado', () => {
  for (const n of NOMES) { assert.equal(S.coverage(C[n]).level, 'completo', n); assert.equal(S.APROVADAS[n].leva, 'M-424'); }
});

test('LT90 · Pieces of the Puzzle: revela 5; até duas instantâneas ou feitiços para a mão; o resto (inclusive a terceira mágica) no cemitério', () => {
  let s = mesa(), pp; [s, pp] = poe(s, 0, 'Pieces of the Puzzle', 'hand'); for (let i = 0; i < 3; i++) [s] = poe(s, 0, 'Island');
  s = topo(s, ['Raio', 'Feitico', 'Urso', 'Raio', 'Forest']); const cinco = s.zones[0].library.slice(0, 5);
  s = ateEscolha(s, legais(s, 0, a => a.t === 'cast' && a.oid === pp)[0]);
  const pd = s.pending; assert.deepEqual([...pd.from].sort(), [...cinco].sort()); assert.equal(pd.min, 0); assert.equal(pd.max, 2);
  const pode = new Set(legais(s, 0, a => a.t === 'pick').map(a => s.objects[a.oid].name)); assert.deepEqual([...pode].sort(), ['Feitico', 'Raio']);
  let t = s; for (const o of [cinco[0], cinco[1]]) t = act(t, legais(t, 0, a => a.t === 'pick' && a.oid === o)[0]); t = fecha(t);
  assert.equal(t.objects[cinco[0]].zone, 'hand'); assert.equal(t.objects[cinco[1]].zone, 'hand');
  for (const o of cinco.slice(2)) assert.equal(t.objects[o].zone, 'graveyard', t.objects[o].name);
});

test('LT90 · Pieces of the Puzzle: "up to" aceita nenhuma; as cinco vão para o cemitério', () => {
  let s = mesa(), pp; [s, pp] = poe(s, 0, 'Pieces of the Puzzle', 'hand'); for (let i = 0; i < 3; i++) [s] = poe(s, 0, 'Island');
  s = topo(s, ['Raio', 'Urso', 'Forest', 'Island', 'Feitico']); const cinco = s.zones[0].library.slice(0, 5);
  const t = fecha(ateEscolha(s, legais(s, 0, a => a.t === 'cast' && a.oid === pp)[0]));
  for (const o of cinco) assert.equal(t.objects[o].zone, 'graveyard');
});

test("LT90 · Tracker's Instincts: a criatura revelada é obrigatória; sem criatura entre as 4, todas vão para o cemitério; lampejo do passado do cemitério", () => {
  let s = mesa(), ti; [s, ti] = poe(s, 0, "Tracker's Instincts", 'hand'); for (let i = 0; i < 2; i++) [s] = poe(s, 0, 'Forest'); for (let i = 0; i < 3; i++) [s] = poe(s, 0, 'Island');
  s = topo(s, ['Raio', 'Urso', 'Forest', 'Feitico']); const quatro = s.zones[0].library.slice(0, 4);
  s = ateEscolha(s, legais(s, 0, a => a.t === 'cast' && a.oid === ti && !a.flashback)[0]);
  assert.equal(s.pending.min, 1); assert.equal(s.pending.max, 1);
  assert.deepEqual([...new Set(legais(s, 0, a => a.t === 'pick').map(a => s.objects[a.oid].name))], ['Urso']);
  assert.ok(!legais(s, 0, a => a.t !== 'pick').length, 'não pode recusar a criatura');
  let t = fecha(act(s, legais(s, 0, a => a.t === 'pick' && a.oid === quatro[1])[0]));
  assert.equal(t.objects[quatro[1]].zone, 'hand'); for (const o of [quatro[0], quatro[2], quatro[3]]) assert.equal(t.objects[o].zone, 'graveyard');
  assert.equal(t.objects[ti].zone, 'graveyard');
  t = topo(t, ['Raio', 'Forest', 'Island', 'Feitico']); const outras = t.zones[0].library.slice(0, 4);
  const fb = legais(t, 0, a => a.t === 'cast' && a.oid === ti); assert.ok(fb.length, 'lampejo do passado {2}{U} do cemitério');
  let u = act(t, fb[0]); u = passaAte(u, x => !x.stack.length || !!x.pending); if (u.pending && u.pending.kind === 'pick') u = fecha(u);
  for (const o of outras) assert.equal(u.objects[o].zone, 'graveyard'); assert.equal(u.objects[ti].zone, 'exile');
});
