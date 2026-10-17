// M-498 · LT164 · revisão por lote CXL: nove cartas que o leitor já lia por inteiro e que travam as listas iniciantes passam a jogar (APROVADAS).
// Textos da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json). Cobertura completa e o comportamento das frases que pedem. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Drag Under', 'Inspiration', 'Arborback Stomper', 'Graceful Cat', 'Cathedral Sanctifier', 'Timberland Guide', 'Emancipation Angel', 'Voice of the Provinces', 'Soulsworn Jury'];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [...['Flying', 'Trample', 'Defender'].filter(k => c.oracle_text.split(String.fromCharCode(10)).some(l => l === k || l.startsWith(k + ' ')))].filter(Boolean), oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Reliquia: { name: 'Reliquia', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] }, Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Mountain: terra('Mountain', 'Mountain', 'R'), Plains: terra('Plains', 'Plains', 'W'), Island: terra('Island', 'Island', 'U'), Swamp: terra('Swamp', 'Swamp', 'B'), Forest: terra('Forest', 'Forest', 'G') });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: C[name].type_line.startsWith('Basic Land') ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 168, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Mountain', 'Plains', 'Island', 'Swamp', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Forest', 'Reliquia']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const tudo = s => { for (let i = 0; i < 80 && (s.stack.length || s.pending); i++) { const pk = s.pending; const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pass') || l[0]); } return s; };
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };

const semKw = n => ({ ...C[n], keywords: [] });
const resolve = (s, pref, alvo) => { for (let i = 0; i < 60 && (s.stack.length || s.pending); i++) { const pk = s.pending; if (pk && pk.kind === 'pick_target' && alvo != null) { s = act(s, { t: 'pick_target', p: pk.p, index: pk.options.findIndex(o => (typeof alvo === 'number' ? o.player === alvo : o.oid === alvo)) }); continue; } const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, (pref && l.find(pref)) || l.find(x => x.t === 'pass') || l[0]); } return s; };

test('LT164 · as nove jogam pelo leitor aprovado', () => {
  for (const n of NOMES) { assert.equal(S.coverage(C[n]).level, 'completo', n); assert.equal(S.APROVADAS[n].leva, 'M-498', n); }
});

test('LT164 · Drag Under devolve a criatura alvo à mão do dono e compra; Inspiration: o jogador alvo compra duas', () => {
  let s = mesa(), du, u; [s, u] = poe(s, 1, 'Urso'); [s, du] = poe(s, 0, 'Drag Under', 'hand'); s = terras(s, 'Island', 3); const h0 = s.zones[0].hand.length, k1 = s.zones[1].hand.length;
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === du && a.targets[0].oid === u)[0]));
  assert.equal(s.zones[1].hand.length, k1 + 1); assert.ok(s.zones[1].hand.some(x => s.objects[x].name === 'Urso')); assert.equal(s.zones[0].hand.length, h0 - 1 + 1);
  let t = mesa(), ins; [t, ins] = poe(t, 0, 'Inspiration', 'hand'); t = terras(t, 'Island', 4); const m1 = t.zones[1].hand.length, m0 = t.zones[0].hand.length;
  t = tudo(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === ins && a.targets[0].player === 1)[0])); assert.equal(t.zones[1].hand.length, m1 + 2); assert.equal(t.zones[0].hand.length, m0 - 1);
});

test('LT164 · Arborback Stomper ganha 5 e tem atropelar; Cathedral Sanctifier ganha 3; Voice of the Provinces voa e cria um Humano 1/1 branco', () => {
  let s = mesa(), ab; [s, ab] = poe(s, 0, 'Arborback Stomper', 'hand'); s = terras(s, 'Forest', 5);
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === ab)[0])); assert.equal(s.players[0].life, 25); assert.ok(E.hasKeyword(s, s.objects[ab], 'trample'));
  let t = mesa(), cs; [t, cs] = poe(t, 0, 'Cathedral Sanctifier', 'hand'); t = terras(t, 'Plains', 1);
  t = tudo(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === cs)[0])); assert.equal(t.players[0].life, 23);
  let q = mesa(), vp; [q, vp] = poe(q, 0, 'Voice of the Provinces', 'hand'); q = terras(q, 'Plains', 6);
  q = tudo(act(q, legais(q, 0, a => a.t === 'cast' && a.oid === vp)[0])); const f = q.zones[0].battlefield.filter(x => q.objects[x].token);
  assert.equal(f.length, 1); assert.equal(E.stats(q, q.objects[f[0]]).power, 1); assert.ok(E.hasKeyword(q, q.objects[vp], 'flying'));
});

test('LT164 · Graceful Cat ganha +1/+1 ao atacar; Timberland Guide põe um marcador +1/+1 na criatura alvo', () => {
  let s = mesa(), gc; [s, gc] = poe(s, 0, 'Graceful Cat'); s = J(s); s.objects[gc].sick = false;
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers', 20); s = act(s, { t: 'attack', p: 0, attackers: [gc] });
  for (let i = 0; i < 10 && s.stack.length && !s.pending; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  assert.equal(E.stats(s, s.objects[gc]).power, 3); assert.equal(E.stats(s, s.objects[gc]).toughness, 3);
  let t = mesa(), tg, u; [t, u] = poe(t, 1, 'Urso'); [t, tg] = poe(t, 0, 'Timberland Guide', 'hand'); t = terras(t, 'Forest', 2);
  t = act(t, legais(t, 0, a => a.t === 'cast' && a.oid === tg)[0]); t = resolve(t, null, u);
  assert.equal(E.stats(t, t.objects[u]).power, 3); assert.equal(E.stats(t, t.objects[tg]).power, 1);
});

test('LT164 · Emancipation Angel devolve uma permanente sua à mão (pode ser ela mesma ou um terreno, nunca a do oponente)', () => {
  let s = mesa(), ea, u; [s, u] = poe(s, 1, 'Urso'); [s, ea] = poe(s, 0, 'Emancipation Angel', 'hand'); s = terras(s, 'Plains', 3); const pl = s.zones[0].battlefield[0];
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === ea)[0]);
  for (let i = 0; i < 20 && !(s.pending && s.pending.p === 0 && legais(s, 0).some(a => a.oid === pl)); i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const op = legais(s, 0).map(a => a.oid); assert.ok(op.includes(ea), 'ela mesma'); assert.ok(op.includes(pl), 'um terreno'); assert.ok(!op.includes(u), 'não a do oponente');
  s = resolve(act(s, legais(s, 0).find(a => a.oid === pl)));
  assert.ok(s.zones[0].hand.includes(pl) || s.zones[0].hand.some(x => s.objects[x].name === 'Plains'), 'terreno na mão'); assert.equal(s.objects[ea].zone, 'battlefield'); assert.ok(E.hasKeyword(s, s.objects[ea], 'flying'));
});

test('LT164 · Soulsworn Jury é defensora e, com {1}{U} e sacrifício, anula mágica de criatura', () => {
  let s = mesa(), sj, gc; [s, sj] = poe(s, 0, 'Soulsworn Jury'); [s, gc] = poe(s, 0, 'Graceful Cat'); s = J(s); s.objects[sj].sick = false; s.objects[gc].sick = false;
  assert.ok(E.hasKeyword(s, s.objects[sj], 'defender'));
  let a = passaAte(s, x => x.pending && x.pending.kind === 'attackers', 20); assert.ok(!legais(a, 0).some(x => (x.attackers || []).includes(sj)), 'não ataca');
  let t = mesa(), j2, cat; [t, j2] = poe(t, 0, 'Soulsworn Jury'); [t, cat] = poe(t, 0, 'Graceful Cat', 'hand'); t = terras(t, 'Plains', 3);
  t = act(t, legais(t, 0, x => x.t === 'cast' && x.oid === cat)[0]); t = terras(t, 'Island', 2);
  const at = legais(t, 0, x => x.t === 'activate' && x.oid === j2); assert.ok(at.length > 0, 'mira a mágica de criatura');
  t = tudo(act(t, at[0])); assert.equal(t.objects[cat].zone, 'graveyard'); assert.equal(t.objects[j2].zone, 'graveyard');
});
