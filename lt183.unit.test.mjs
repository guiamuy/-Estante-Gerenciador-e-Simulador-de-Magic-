// M-501 · LT167 · revisão por lote CXLIII: nove cartas que o leitor já lia por inteiro e que travam as listas iniciantes passam a jogar (APROVADAS).
// Textos da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json). Cobertura completa e o comportamento das frases que pedem. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Iron-Barb Hellion', "Predator's Strike", 'Brindle Boar', 'Doomed Dissenter', 'Filigree Familiar', 'Languish', 'Blood Divination', 'Final Reward', "Lich's Caress"];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [...['Haste'].filter(k => c.oracle_text.split(String.fromCharCode(10)).some(l => l === k || l.startsWith(k + ' ')))].filter(Boolean), oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Reliquia: { name: 'Reliquia', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] }, Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Mountain: terra('Mountain', 'Mountain', 'R'), Plains: terra('Plains', 'Plains', 'W'), Island: terra('Island', 'Island', 'U'), Swamp: terra('Swamp', 'Swamp', 'B'), Forest: terra('Forest', 'Forest', 'G') });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: C[name].type_line.startsWith('Basic Land') ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 171, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Mountain', 'Plains', 'Island', 'Swamp', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Forest', 'Reliquia', 'Iron-Barb Hellion']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const tudo = s => { for (let i = 0; i < 80 && (s.stack.length || s.pending); i++) { const pk = s.pending; const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pass') || l[0]); } return s; };
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };

const semKw = n => ({ ...C[n], keywords: [] });
const resolve = (s, pref, alvo) => { for (let i = 0; i < 60 && (s.stack.length || s.pending); i++) { const pk = s.pending; if (pk && pk.kind === 'pick_target' && alvo != null) { s = act(s, { t: 'pick_target', p: pk.p, index: pk.options.findIndex(o => (typeof alvo === 'number' ? o.player === alvo : o.oid === alvo)) }); continue; } const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, (pref && l.find(pref)) || l.find(x => x.t === 'pass') || l[0]); } return s; };

test('LT167 · as nove jogam pelo leitor aprovado', () => {
  for (const n of NOMES) { assert.equal(S.coverage(C[n]).level, 'completo', n); assert.equal(S.APROVADAS[n].leva, 'M-501', n); }
});

test('LT167 · Languish dá -4/-4 a todas as criaturas (dos dois lados) até o fim do turno', () => {
  let s = mesa(), lg, u, ib; [s, u] = poe(s, 1, 'Urso'); [s, ib] = poe(s, 0, 'Iron-Barb Hellion'); [s, lg] = poe(s, 0, 'Languish', 'hand'); s = terras(s, 'Swamp', 4);
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === lg)[0]));
  assert.equal(s.objects[u].zone, 'graveyard'); assert.equal(s.objects[ib].zone, 'graveyard', 'Hellion 5/4 vira 1/0');
});

test('LT167 · Iron-Barb Hellion ataca no turno em que entra e não bloqueia; Predator\'s Strike dá +3/+3 e atropelar', () => {
  let s = mesa(), ih, u1; [s, ih] = poe(s, 1, 'Iron-Barb Hellion'); [s, u1] = poe(s, 1, 'Urso'); let u; [s, u] = poe(s, 0, 'Brindle Boar'); s = J(s); s.objects[u].sick = false; s.objects[ih].sick = false;
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers', 20); s = act(s, { t: 'attack', p: 0, attackers: [u] }); s = passaAte(s, x => x.pending && x.pending.kind === 'blockers', 20);
  assert.ok(s.pending && s.pending.kind === 'blockers', 'o Urso pode bloquear'); assert.ok(legais(s, 1).some(a => JSON.stringify(a).includes('"' + u1 + '"')), 'o Urso aparece'); assert.ok(!legais(s, 1).some(a => JSON.stringify(a).includes('"' + ih + '"')), 'não bloqueia');
  let t = mesa(), h2; [t, h2] = poe(t, 0, 'Iron-Barb Hellion', 'hand'); t = terras(t, 'Mountain', 6);
  t = tudo(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === h2)[0])); t = passaAte(t, x => x.pending && x.pending.kind === 'attackers', 20);
  assert.ok(legais(t, 0).some(a => a.t === 'attack' && (a.attackers || []).includes(h2)), 'ímpeto');
  let q = mesa(), ps, b; [q, b] = poe(q, 0, 'Brindle Boar'); [q, ps] = poe(q, 0, "Predator's Strike", 'hand'); q = terras(q, 'Forest', 2);
  q = tudo(act(q, legais(q, 0, a => a.t === 'cast' && a.oid === ps && a.targets[0].oid === b)[0])); assert.equal(E.stats(q, q.objects[b]).power, 5); assert.ok(E.hasKeyword(q, q.objects[b], 'trample'));
});

test('LT167 · Brindle Boar se sacrifica para ganhar 4; Doomed Dissenter deixa um Zumbi 2/2 preto ao morrer', () => {
  let s = mesa(), b; [s, b] = poe(s, 0, 'Brindle Boar');
  s = tudo(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === b)[0])); assert.equal(s.objects[b].zone, 'graveyard'); assert.equal(s.players[0].life, 24);
  let t = mesa(), dd, fr; [t, dd] = poe(t, 0, 'Doomed Dissenter'); [t, fr] = poe(t, 0, "Lich's Caress", 'hand'); t = terras(t, 'Swamp', 5);
  t = tudo(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === fr && a.targets[0].oid === dd)[0]));
  assert.equal(t.objects[dd].zone, 'graveyard'); assert.equal(t.players[0].life, 23); const z = t.zones[0].battlefield.filter(x => t.objects[x].token);
  assert.equal(z.length, 1); assert.equal(E.stats(t, t.objects[z[0]]).power, 2);
});

test('LT167 · Filigree Familiar ganha 2 ao entrar e compra ao morrer; Final Reward exila (não morre: não compra)', () => {
  let s = mesa(), ff, lc; [s, ff] = poe(s, 0, 'Filigree Familiar', 'hand'); [s, lc] = poe(s, 0, "Lich's Caress", 'hand'); s = terras(s, 'Swamp', 8);
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === ff)[0])); assert.equal(s.players[0].life, 22); const h0 = s.zones[0].hand.length;
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === lc && a.targets[0].oid === ff)[0])); assert.equal(s.zones[0].hand.length, h0 - 1 + 1, 'comprou ao morrer');
  let t = mesa(), f2, fw; [t, f2] = poe(t, 0, 'Filigree Familiar'); [t, fw] = poe(t, 0, 'Final Reward', 'hand'); t = terras(t, 'Swamp', 5); const k0 = t.zones[0].hand.length;
  t = tudo(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === fw && a.targets[0].oid === f2)[0])); assert.equal(t.objects[f2].zone, 'exile'); assert.equal(t.zones[0].hand.length, k0 - 1);
});

test('LT167 · Blood Divination exige sacrificar uma criatura como custo adicional e compra três', () => {
  let s = mesa(), bd; [s, bd] = poe(s, 0, 'Blood Divination', 'hand'); s = terras(s, 'Swamp', 4);
  assert.equal(legais(s, 0, a => a.t === 'cast' && a.oid === bd).length, 0, 'sem criatura, não conjura');
  let b; [s, b] = poe(s, 0, 'Brindle Boar'); const h0 = s.zones[0].hand.length;
  const cs = legais(s, 0, a => a.t === 'cast' && a.oid === bd); assert.ok(cs.length > 0);
  s = tudo(act(s, cs[0])); assert.equal(s.objects[b].zone, 'graveyard'); assert.equal(s.zones[0].hand.length, h0 - 1 + 3); assert.equal(s.players[0].life, 20, 'sacrifício não ativa o Boar');
});
