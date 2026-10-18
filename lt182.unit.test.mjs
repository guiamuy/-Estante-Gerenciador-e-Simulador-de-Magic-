// M-500 · LT166 · revisão por lote CXLII: nove cartas que o leitor já lia por inteiro e que travam as listas iniciantes passam a jogar (APROVADAS).
// Textos da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json). Cobertura completa e o comportamento das frases que pedem. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Barrenton Medic', 'Dramatic Rescue', 'Battleflight Eagle', 'Iridescent Blademaster', 'Knight of the Skyward Eye', 'Thunderscape Apprentice', 'Peace Strider', 'Viridian Claw', 'Raven Familiar'];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [...['Flying', 'Echo'].filter(k => c.oracle_text.split(String.fromCharCode(10)).some(l => l === k || l.startsWith(k + ' ')))].filter(Boolean), oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Reliquia: { name: 'Reliquia', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] }, Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Mountain: terra('Mountain', 'Mountain', 'R'), Plains: terra('Plains', 'Plains', 'W'), Island: terra('Island', 'Island', 'U'), Swamp: terra('Swamp', 'Swamp', 'B'), Forest: terra('Forest', 'Forest', 'G') });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: C[name].type_line.startsWith('Basic Land') ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 170, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Mountain', 'Plains', 'Island', 'Swamp', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Forest', 'Reliquia']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const tudo = s => { for (let i = 0; i < 80 && (s.stack.length || s.pending); i++) { const pk = s.pending; const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pass') || l[0]); } return s; };
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };

const semKw = n => ({ ...C[n], keywords: [] });
const resolve = (s, pref, alvo) => { for (let i = 0; i < 60 && (s.stack.length || s.pending); i++) { const pk = s.pending; if (pk && pk.kind === 'pick_target' && alvo != null) { s = act(s, { t: 'pick_target', p: pk.p, index: pk.options.findIndex(o => (typeof alvo === 'number' ? o.player === alvo : o.oid === alvo)) }); continue; } const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, (pref && l.find(pref)) || l.find(x => x.t === 'pass') || l[0]); } return s; };

test('LT166 · as nove jogam pelo leitor aprovado', () => {
  for (const n of NOMES) { assert.equal(S.coverage(C[n]).level, 'completo', n); assert.equal(S.APROVADAS[n].leva, 'M-500', n); }
});

test('LT166 · Dramatic Rescue devolve a criatura alvo à mão do dono e ganha 2; Peace Strider ganha 3', () => {
  let s = mesa(), dr, u; [s, u] = poe(s, 1, 'Urso'); [s, dr] = poe(s, 0, 'Dramatic Rescue', 'hand'); s = terras(s, 'Plains', 1); s = terras(s, 'Island', 1);
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === dr && a.targets[0].oid === u)[0])); assert.ok(s.zones[1].hand.some(x => s.objects[x].name === 'Urso')); assert.equal(s.players[0].life, 22);
  let t = mesa(), ps; [t, ps] = poe(t, 0, 'Peace Strider', 'hand'); t = terras(t, 'Forest', 4);
  t = tudo(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === ps)[0])); assert.equal(t.players[0].life, 23); assert.ok(E.isCreature(t, t.objects[ps]));
});

test('LT166 · Battleflight Eagle dá +2/+2 e voar à criatura alvo; Iridescent Blademaster empilha +2/+2; Knight of the Skyward Eye só uma vez por turno', () => {
  let s = mesa(), be, ib; [s, ib] = poe(s, 0, 'Iridescent Blademaster'); [s, be] = poe(s, 0, 'Battleflight Eagle', 'hand'); s = terras(s, 'Plains', 5);
  assert.ok(!E.hasKeyword(s, s.objects[ib], 'flying'));
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === be)[0]); s = resolve(s, null, ib);
  assert.equal(E.stats(s, s.objects[ib]).power, 4); assert.ok(E.hasKeyword(s, s.objects[ib], 'flying')); assert.ok(E.hasKeyword(s, s.objects[be], 'flying'));
  let t = mesa(), i2; [t, i2] = poe(t, 0, 'Iridescent Blademaster'); t = terras(t, 'Forest', 8);
  t = tudo(act(t, legais(t, 0, a => a.t === 'activate' && a.oid === i2)[0])); t = tudo(act(t, legais(t, 0, a => a.t === 'activate' && a.oid === i2)[0])); assert.equal(E.stats(t, t.objects[i2]).power, 6);
  let q = mesa(), kn; [q, kn] = poe(q, 0, 'Knight of the Skyward Eye'); q = terras(q, 'Forest', 8);
  q = tudo(act(q, legais(q, 0, a => a.t === 'activate' && a.oid === kn)[0])); assert.equal(E.stats(q, q.objects[kn]).power, 5);
  assert.equal(legais(q, 0, a => a.t === 'activate' && a.oid === kn).length, 0, 'só uma vez por turno');
});

test('LT166 · Thunderscape Apprentice: {B},{T} o jogador alvo perde 1; {G},{T} a criatura alvo ganha +1/+1', () => {
  let s = mesa(), ta; [s, ta] = poe(s, 0, 'Thunderscape Apprentice'); s = terras(s, 'Swamp', 1); s = J(s); s.objects[ta].sick = false;
  s = tudo(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === ta && a.targets && a.targets[0].player === 1)[0])); assert.equal(s.players[1].life, 19); assert.ok(s.objects[ta].tapped);
  let t = mesa(), t2, u; [t, u] = poe(t, 1, 'Urso'); [t, t2] = poe(t, 0, 'Thunderscape Apprentice'); t = terras(t, 'Forest', 1); t = J(t); t.objects[t2].sick = false;
  t = tudo(act(t, legais(t, 0, a => a.t === 'activate' && a.oid === t2 && a.targets && a.targets[0].oid === u)[0])); assert.equal(E.stats(t, t.objects[u]).power, 3);
});

test('LT166 · Barrenton Medic previne 1 e, pondo um marcador -1/-1 em si, desvira', () => {
  let s = mesa(), bm; [s, bm] = poe(s, 0, 'Barrenton Medic'); s = J(s); s.objects[bm].sick = false;
  s = tudo(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === bm && a.targets && a.targets[0].player === 0)[0])); assert.ok(s.objects[bm].tapped);
  const un = legais(s, 0, a => a.t === 'activate' && a.oid === bm && !(a.targets && a.targets.length)); assert.ok(un.length > 0, 'desvirar com marcador');
  s = tudo(act(s, un[0])); assert.ok(!s.objects[bm].tapped); assert.equal(E.stats(s, s.objects[bm]).toughness, 3);
});

test('LT166 · Viridian Claw equipa por {1}: +1/+0 e golpe primeiro; Raven Familiar olha três, fica com uma e tem eco', () => {
  let s = mesa(), vc, ib; [s, ib] = poe(s, 0, 'Iridescent Blademaster'); [s, vc] = poe(s, 0, 'Viridian Claw'); s = terras(s, 'Forest', 1);
  s = tudo(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === vc && a.targets && a.targets[0].oid === ib)[0]));
  assert.equal(E.stats(s, s.objects[ib]).power, 3); assert.equal(E.stats(s, s.objects[ib]).toughness, 2); assert.ok(E.hasKeyword(s, s.objects[ib], 'first strike'));
  let t = mesa(), rf; [t, rf] = poe(t, 0, 'Raven Familiar', 'hand'); t = terras(t, 'Island', 3); const h0 = t.zones[0].hand.length, l0 = t.zones[0].library.length, topo3 = t.zones[0].library.slice(0, 3);
  t = tudo(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === rf)[0]));
  assert.equal(t.zones[0].hand.length, h0 - 1 + 1); assert.equal(t.zones[0].library.length, l0 - 1); assert.ok(topo3.some(x => t.zones[0].hand.includes(x)), 'uma das três');
  assert.ok(E.hasKeyword(t, t.objects[rf], 'flying'));
  t = passaAte(t, x => x.turn.active === 0 && x.turn.number > 1 && x.pending && x.pending.kind === 'may_pay', 80);
  t = resolve(act(t, { t: 'decline', p: 0 })); assert.equal(t.objects[rf].zone, 'graveyard', 'eco não pago');
});
