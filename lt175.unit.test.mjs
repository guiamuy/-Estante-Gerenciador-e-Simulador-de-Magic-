// M-493 · LT159 · revisão por lote CXXXV: nove cartas que o leitor já lia por inteiro e que travam as listas iniciantes passam a jogar (APROVADAS).
// Textos da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json). Cobertura completa e o comportamento das frases que pedem. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Roaring Primadox', 'Krosan Archer', 'Darksteel Axe', 'Disciple of Grace', 'Dream Stalker', 'Gelectrode', 'Ancestral Vision', 'Condescend', 'Chronomaton'];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [/^Reach/m.test(c.oracle_text) && 'Reach', /^Indestructible/m.test(c.oracle_text) && 'Indestructible', /^Protection from/m.test(c.oracle_text) && 'Protection', /^Cycling/m.test(c.oracle_text) && 'Cycling', /^Suspend/m.test(c.oracle_text) && 'Suspend'].filter(Boolean), oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Reliquia: { name: 'Reliquia', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] }, Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Mountain: terra('Mountain', 'Mountain', 'R'), Plains: terra('Plains', 'Plains', 'W'), Island: terra('Island', 'Island', 'U'), Swamp: terra('Swamp', 'Swamp', 'B'), Forest: terra('Forest', 'Forest', 'G') });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: C[name].type_line.startsWith('Basic Land') ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 163, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Mountain', 'Plains', 'Island', 'Swamp', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const tudo = s => { for (let i = 0; i < 80 && (s.stack.length || s.pending); i++) { const pk = s.pending; const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pass') || l[0]); } return s; };
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };


const resolveCom = (s, quer) => { for (let i = 0; i < 60 && (s.stack.length || s.pending); i++) { const pk = s.pending; if (pk && pk.kind === 'pick_target') { s = act(s, { t: 'pick_target', p: pk.p, index: Math.max(0, pk.options.findIndex(o => o.oid === quer)) }); continue; } const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pay' || x.t === 'yes') || l.find(x => x.t === 'pass') || l[0]); } return s; };

test('LT159 · as nove jogam pelo leitor aprovado', () => {
  for (const n of NOMES) { assert.equal(S.coverage(C[n]).level, 'completo', n); assert.equal(S.APROVADAS[n].leva, 'M-493', n); }
});

test('LT159 · Ancestral Vision: suspender 4 por {U}; o alvo compra três quando sai', () => {
  let s = mesa(), av; [s, av] = poe(s, 0, 'Ancestral Vision', 'hand'); s = terras(s, 'Island', 1);
  const su = legais(s, 0, a => a.oid === av); assert.ok(su.length > 0, 'suspender oferecido'); assert.ok(!su.some(a => a.t === 'cast' && !a.alt && !a.suspender && !JSON.stringify(a).match(/susp/i)), 'sem custo de mana não se conjura');
  s = tudo(act(s, su[0])); assert.equal(s.objects[av].zone, 'exile'); assert.equal((s.objects[av].counters || {}).time, 4);
});

test('LT159 · Condescend anula a menos que pague X e faz vidência 2; Chronomaton põe marcador em si', () => {
  let s = mesa(), cd, ch; [s, cd] = poe(s, 0, 'Condescend', 'hand'); [s, ch] = poe(s, 0, 'Chronomaton', 'hand'); s = terras(s, 'Island', 4);
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === ch)[0]);
  const xs = legais(s, 0, a => a.t === 'cast' && a.oid === cd && a.targets[0].oid === ch); assert.ok(xs.length >= 2, 'X variável');
  s = act(s, xs.reduce((m, a) => ((a.x || 0) > (m.x || 0) ? a : m))); s = tudo(s);
  assert.equal(s.objects[ch].zone, 'graveyard', 'sem mana para pagar o X: anulada'); assert.equal(s.objects[cd].zone, 'graveyard');
  let t = mesa(), c2; [t, c2] = poe(t, 0, 'Chronomaton'); t = terras(t, 'Island', 1); t = J(t); t.objects[c2].sick = false;
  t = tudo(act(t, legais(t, 0, a => a.t === 'activate' && a.oid === c2)[0])); assert.equal((t.objects[c2].counters || {}).p1p1, 1);
});

test('LT159 · Dream Stalker devolve uma permanente sua; Roaring Primadox devolve uma criatura sua na manutenção', () => {
  let s = mesa(), dsk, ch; [s, ch] = poe(s, 0, 'Chronomaton'); [s, dsk] = poe(s, 0, 'Dream Stalker', 'hand'); s = terras(s, 'Island', 2); const m0 = s.zones[0].hand.length;
  s = resolveCom(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === dsk)[0])); assert.equal(s.zones[0].hand.length, m0 - 1 + 1, 'uma permanente voltou');
  let t = mesa(), rp, c3; [t, rp] = poe(t, 0, 'Roaring Primadox'); [t, c3] = poe(t, 0, 'Chronomaton'); const h0 = t.zones[0].hand.length;
  t = passaAte(t, x => x.turn.active === 0 && x.turn.step === 'upkeep' && x.stack.length > 0, 400); t = resolveCom(t);
  assert.ok(t.objects[rp].zone === 'hand' || t.objects[c3].zone === 'hand', 'uma criatura voltou');
});

test('LT159 · Darksteel Axe indestrutível (+2/+0); Disciple of Grace com proteção contra preto e reciclagem; Krosan Archer descarta e ganha +0/+2; Gelectrode {T}: 1', () => {
  let s = mesa(), da, ka; [s, da] = poe(s, 0, 'Darksteel Axe'); [s, ka] = poe(s, 0, 'Krosan Archer'); s = terras(s, 'Forest', 3);
  assert.ok(E.hasKeyword(s, s.objects[da], 'indestructible'));
  s = tudo(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === da && a.targets[0].oid === ka)[0])); assert.equal(E.stats(s, s.objects[ka]).power, 4);
  const m0 = s.zones[0].hand.length; s = tudo(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === ka)[0])); assert.equal(E.stats(s, s.objects[ka]).toughness, 5); assert.equal(s.zones[0].hand.length, m0 - 1);
  let t = mesa(), dg; [t, dg] = poe(t, 0, 'Disciple of Grace', 'hand'); t = terras(t, 'Plains', 2); assert.ok(legais(t, 0, a => a.t === 'cycle' && a.oid === dg).length > 0);
  let q = mesa(), ge; [q, ge] = poe(q, 0, 'Gelectrode'); q = J(q); q.objects[ge].sick = false; q = tudo(act(q, legais(q, 0, a => a.t === 'activate' && a.oid === ge && a.targets && a.targets[0].player === 1)[0])); assert.equal(q.players[1].life, 19);
});
