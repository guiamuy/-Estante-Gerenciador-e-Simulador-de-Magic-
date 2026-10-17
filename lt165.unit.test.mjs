// M-483 · LT149 · revisão por lote CXXVII: nove cartas que o leitor já lia por inteiro e que travam as listas iniciantes passam a jogar (APROVADAS).
// Textos da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json). Cobertura completa e o comportamento das frases que pedem. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Mist Raven', 'Charging Paladin', 'Befuddle', 'Anticipate', 'Auger Spree', 'Knightly Valor', 'Sunhome Guildmage', 'Ember Hauler', 'Fiery Hellhound'];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [/^Flying/m.test(c.oracle_text) && 'Flying', /^Flying$/m.test(c.oracle_text) && 'Flying', /^Flashback/m.test(c.oracle_text) && 'Flashback'].filter(Boolean), oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Reliquia: { name: 'Reliquia', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] }, Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Mountain: terra('Mountain', 'Mountain', 'R'), Plains: terra('Plains', 'Plains', 'W'), Island: terra('Island', 'Island', 'U'), Swamp: terra('Swamp', 'Swamp', 'B'), Forest: terra('Forest', 'Forest', 'G') });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: C[name].type_line.startsWith('Basic Land') ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 153, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Mountain', 'Plains', 'Island', 'Swamp', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const tudo = s => { for (let i = 0; i < 80 && (s.stack.length || s.pending); i++) { const pk = s.pending; const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pass') || l[0]); } return s; };
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };


const resolveCom = (s, quer) => { for (let i = 0; i < 60 && (s.stack.length || s.pending); i++) { const pk = s.pending; if (pk && pk.kind === 'pick_target') { s = act(s, { t: 'pick_target', p: pk.p, index: Math.max(0, pk.options.findIndex(o => o.oid === quer)) }); continue; } const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pass') || l[0]); } return s; };
const fichas = s => s.zones[0].battlefield.filter(x => s.objects[x].token);

test('LT149 · as nove jogam pelo leitor aprovado', () => {
  for (const n of NOMES) { assert.equal(S.coverage(C[n]).level, 'completo', n); assert.equal(S.APROVADAS[n].leva, 'M-483', n); }
});

test('LT149 · Mist Raven devolve a criatura alvo; Befuddle dá -4/-0 e compra; Auger Spree dá +4/-4', () => {
  let s = mesa(), mr, u; [s, u] = poe(s, 1, 'Urso'); [s, mr] = poe(s, 0, 'Mist Raven', 'hand'); s = terras(s, 'Island', 4);
  s = resolveCom(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === mr)[0]), u); assert.equal(s.objects[u].zone, 'hand');
  let t = mesa(), bf, u2; [t, u2] = poe(t, 1, 'Urso'); [t, bf] = poe(t, 0, 'Befuddle', 'hand'); t = terras(t, 'Island', 3); const m0 = t.zones[0].hand.length;
  t = tudo(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === bf && a.targets[0].oid === u2)[0])); assert.equal(E.stats(t, t.objects[u2]).power, -2); assert.equal(t.zones[0].hand.length, m0 - 1 + 1);
  let q = mesa(), as, u3; [q, u3] = poe(q, 1, 'Urso'); [q, as] = poe(q, 0, 'Auger Spree', 'hand'); q = terras(q, 'Swamp', 2); q = terras(q, 'Mountain', 1);
  q = tudo(act(q, legais(q, 0, a => a.t === 'cast' && a.oid === as && a.targets[0].oid === u3)[0])); assert.equal(q.objects[u3].zone, 'graveyard');
});

test('LT149 · Anticipate: olha três, uma vai para a mão e as outras para o fundo', () => {
  let s = mesa(), an; [s, an] = poe(s, 0, 'Anticipate', 'hand'); s = terras(s, 'Island', 2); const m0 = s.zones[0].hand.length, l0 = s.zones[0].library.length; const topo3 = s.zones[0].library.slice(0, 3);
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === an)[0]));
  assert.equal(s.zones[0].hand.length, m0 - 1 + 1); assert.equal(s.zones[0].library.length, l0 - 1);
  const naMao = topo3.filter(o => s.objects[o].zone === 'hand'); assert.equal(naMao.length, 1, 'a escolhida é uma das três de cima');
});

test('LT149 · Knightly Valor: ficha 2/2 com vigilância ao entrar e +2/+2 com vigilância na encantada', () => {
  let s = mesa(), kv, eh; [s, eh] = poe(s, 0, 'Ember Hauler'); [s, kv] = poe(s, 0, 'Knightly Valor', 'hand'); s = terras(s, 'Plains', 5);
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === kv && a.targets[0].oid === eh)[0]));
  assert.equal(E.stats(s, s.objects[eh]).power, 4); assert.ok(E.hasKeyword(s, s.objects[eh], 'vigilance'));
  const f = fichas(s); assert.equal(f.length, 1); assert.ok(E.hasKeyword(s, s.objects[f[0]], 'vigilance')); assert.equal(E.stats(s, s.objects[f[0]]).power, 2);
});

test('LT149 · Sunhome Guildmage: +1/+0 às suas e ficha 1/1 com ímpeto; Ember Hauler sacrifica e causa 2; Fiery Hellhound +1/+0', () => {
  let s = mesa(), sg, u; [s, sg] = poe(s, 0, 'Sunhome Guildmage'); [s, u] = poe(s, 1, 'Urso'); s = terras(s, 'Mountain', 4); s = terras(s, 'Plains', 4);
  s = tudo(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === sg && a.index === 1)[0])); const f = fichas(s); assert.equal(f.length, 1); assert.ok(E.eligibleAttackers(s, 0).includes(f[0]), 'ímpeto');
  s = tudo(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === sg && a.index === 0)[0])); assert.equal(E.stats(s, s.objects[sg]).power, 3); assert.equal(E.stats(s, s.objects[f[0]]).power, 2); assert.equal(E.stats(s, s.objects[u]).power, 2);
  let t = mesa(), eh; [t, eh] = poe(t, 0, 'Ember Hauler'); t = terras(t, 'Mountain', 1);
  t = tudo(act(t, legais(t, 0, a => a.t === 'activate' && a.oid === eh && a.targets && a.targets[0].player === 1)[0])); assert.equal(t.players[1].life, 18); assert.equal(t.objects[eh].zone, 'graveyard');
  let q = mesa(), fh; [q, fh] = poe(q, 0, 'Fiery Hellhound'); q = terras(q, 'Mountain', 2);
  q = tudo(act(q, legais(q, 0, a => a.t === 'activate' && a.oid === fh)[0])); q = tudo(act(q, legais(q, 0, a => a.t === 'activate' && a.oid === fh)[0])); assert.equal(E.stats(q, q.objects[fh]).power, 4);
});

test('LT149 · Charging Paladin: ao atacar, +0/+3 até o fim do turno', () => {
  let s = mesa(), cp; [s, cp] = poe(s, 0, 'Charging Paladin'); s = J(s); s.objects[cp].sick = false;
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers', 20);
  s = act(s, legais(s, 0, a => a.t === 'attack' && (a.attackers || []).length === 1)[0] || { t: 'attack', p: 0, attackers: [cp] });
  s = passaAte(s, x => !x.stack.length && !x.pending && x.turn.step !== 'declare_attackers', 10);
  assert.equal(E.stats(s, s.objects[cp]).toughness, 5);
});
