// M-490 · LT156 · revisão por lote CXXXII: nove cartas que o leitor já lia por inteiro e que travam as listas iniciantes passam a jogar (APROVADAS).
// Textos da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json). Cobertura completa e o comportamento das frases que pedem. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Seasoned Marshal', 'Temple Acolyte', 'Sunlance', 'Elvish Harbinger', 'Stonewood Invoker', 'Wirewood Herald', 'Wildsize', 'Moonglove Extract', 'Golgari Guildmage'];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [].filter(Boolean), oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Reliquia: { name: 'Reliquia', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] }, Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Mountain: terra('Mountain', 'Mountain', 'R'), Plains: terra('Plains', 'Plains', 'W'), Island: terra('Island', 'Island', 'U'), Swamp: terra('Swamp', 'Swamp', 'B'), Forest: terra('Forest', 'Forest', 'G') });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: C[name].type_line.startsWith('Basic Land') ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 160, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Mountain', 'Plains', 'Island', 'Swamp', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Forest', 'Temple Acolyte']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const tudo = s => { for (let i = 0; i < 80 && (s.stack.length || s.pending); i++) { const pk = s.pending; const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pass') || l[0]); } return s; };
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };


const resolveCom = (s, quer, sim = true) => { for (let i = 0; i < 60 && (s.stack.length || s.pending); i++) { const pk = s.pending; if (pk && pk.kind === 'pick_target') { s = act(s, { t: 'pick_target', p: pk.p, index: Math.max(0, pk.options.findIndex(o => o.oid === quer)) }); continue; } const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, (pk && pk.kind === 'may_pay' && l.find(x => x.t === (sim ? 'pay' : 'decline'))) || l.find(x => x.t === 'pass') || l[0]); } return s; };

test('LT156 · as nove jogam pelo leitor aprovado', () => {
  for (const n of NOMES) { assert.equal(S.coverage(C[n]).level, 'completo', n); assert.equal(S.APROVADAS[n].leva, 'M-490', n); }
});

test('LT156 · Sunlance causa 3 a criatura não branca; Moonglove Extract sacrifica e causa 2; Temple Acolyte ganha 3', () => {
  let s = mesa(), sl, u, ta; [s, u] = poe(s, 1, 'Urso'); [s, ta] = poe(s, 1, 'Temple Acolyte'); [s, sl] = poe(s, 0, 'Sunlance', 'hand'); s = terras(s, 'Plains', 1);
  const cs = legais(s, 0, a => a.t === 'cast' && a.oid === sl); assert.ok(cs.some(a => a.targets[0].oid === u) && !cs.some(a => a.targets[0].oid === ta), 'não mira a branca');
  s = tudo(act(s, cs.find(a => a.targets[0].oid === u))); assert.equal(s.objects[u].zone, 'graveyard');
  let t = mesa(), me; [t, me] = poe(t, 0, 'Moonglove Extract'); t = tudo(act(t, legais(t, 0, a => a.t === 'activate' && a.oid === me && a.targets[0].player === 1)[0])); assert.equal(t.players[1].life, 18); assert.equal(t.objects[me].zone, 'graveyard');
  let q = mesa(), t2; [q, t2] = poe(q, 0, 'Temple Acolyte', 'hand'); q = terras(q, 'Plains', 2); q = tudo(act(q, legais(q, 0, a => a.t === 'cast' && a.oid === t2)[0])); assert.equal(q.players[0].life, 23);
});

test('LT156 · Wirewood Herald morre e pode buscar um Elfo para a mão; Elvish Harbinger busca um Elfo para o topo e dá mana de qualquer cor', () => {
  let s = mesa(), wh; [s, wh] = poe(s, 0, 'Wirewood Herald'); const m0 = s.zones[0].hand.length;
  let m = J(s); m.objects[wh].damage = 9; m = resolveCom(act(m, { t: 'pass', p: 0 }));
  assert.equal(m.objects[wh].zone, 'graveyard'); assert.equal(m.zones[0].hand.length, m0 + 1); assert.ok(/Elf/.test(C[m.objects[m.zones[0].hand.at(-1)].name].type_line), 'um Elfo');
  let t = mesa(), eh; [t, eh] = poe(t, 0, 'Elvish Harbinger', 'hand'); t = terras(t, 'Forest', 3);
  t = resolveCom(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === eh)[0])); assert.ok(/Elf/.test(C[t.objects[t.zones[0].library[0]].name].type_line), 'Elfo no topo');
  t = J(t); t.objects[eh].sick = false; assert.ok(legais(t, 0, a => a.t === 'tap_mana' && a.oid === eh).length > 0, 'dá mana');
});

test('LT156 · Golgari Guildmage: sacrifica e devolve criatura do cemitério; {4}{G} põe marcador; Stonewood Invoker {7}{G}: +5/+5; Wildsize +2/+2, atropelar e compra', () => {
  let s = mesa(), gg, wh, ta; [s, gg] = poe(s, 0, 'Golgari Guildmage'); [s, wh] = poe(s, 0, 'Wirewood Herald'); [s, ta] = poe(s, 0, 'Temple Acolyte', 'graveyard'); s = terras(s, 'Swamp', 5); s = terras(s, 'Forest', 5);
  const a = legais(s, 0, x => x.t === 'activate' && x.oid === gg && x.index === 0 && x.targets[0].oid === ta && JSON.stringify(x).includes('"' + wh + '"'));
  assert.ok(a.length > 0); s = resolveCom(act(s, a[0]), null, false); assert.equal(s.objects[ta].zone, 'hand'); assert.equal(s.objects[wh].zone, 'graveyard');
  s = tudo(act(s, legais(s, 0, x => x.t === 'activate' && x.oid === gg && x.index === 1 && x.targets[0].oid === gg)[0])); assert.equal((s.objects[gg].counters || {}).p1p1, 1);
  let t = mesa(), si; [t, si] = poe(t, 0, 'Stonewood Invoker'); t = terras(t, 'Forest', 8); t = tudo(act(t, legais(t, 0, x => x.t === 'activate' && x.oid === si)[0])); assert.equal(E.stats(t, t.objects[si]).power, 7);
  let q = mesa(), wz, u; [q, u] = poe(q, 1, 'Urso'); [q, wz] = poe(q, 0, 'Wildsize', 'hand'); q = terras(q, 'Forest', 3); const m0 = q.zones[0].hand.length;
  q = tudo(act(q, legais(q, 0, x => x.t === 'cast' && x.oid === wz && x.targets[0].oid === u)[0])); assert.equal(E.stats(q, q.objects[u]).power, 4); assert.ok(E.hasKeyword(q, q.objects[u], 'trample')); assert.equal(q.zones[0].hand.length, m0);
});

test('LT156 · Seasoned Marshal: ao atacar, pode virar a criatura alvo', () => {
  let s = mesa(), sm, u; [s, sm] = poe(s, 0, 'Seasoned Marshal'); [s, u] = poe(s, 1, 'Urso'); s = J(s); s.objects[sm].sick = false;
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers', 20); s = act(s, { t: 'attack', p: 0, attackers: [sm] });
  const sim = resolveCom(s, u, true), nao = resolveCom(s, u, false);
  assert.ok(sim.objects[u].tapped, 'aceita: vira'); assert.ok(!nao.objects[u].tapped, 'recusa: não vira');
});
