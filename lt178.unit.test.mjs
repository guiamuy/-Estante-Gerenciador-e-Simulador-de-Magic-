// M-496 · LT162 · revisão por lote CXXXVIII: nove cartas que o leitor já lia por inteiro e que travam as listas iniciantes passam a jogar (APROVADAS).
// Textos da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json). Cobertura completa e o comportamento das frases que pedem. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Scatter the Seeds', 'Overwhelm', 'Elusive Krasis', 'Viridian Shaman', 'Mad Prophet', 'Carnivorous Moss-Beast', 'Kill Shot', 'Aven Wind Mage', 'Wayward Soul'];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [...['Convoke', 'Evolve', 'Haste', 'Flying'].filter(k => c.oracle_text.split(String.fromCharCode(10)).some(l => l === k || l.startsWith(k + ' ')))].filter(Boolean), oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Reliquia: { name: 'Reliquia', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] }, Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Mountain: terra('Mountain', 'Mountain', 'R'), Plains: terra('Plains', 'Plains', 'W'), Island: terra('Island', 'Island', 'U'), Swamp: terra('Swamp', 'Swamp', 'B'), Forest: terra('Forest', 'Forest', 'G') });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: C[name].type_line.startsWith('Basic Land') ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 166, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Mountain', 'Plains', 'Island', 'Swamp', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Forest', 'Reliquia']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const tudo = s => { for (let i = 0; i < 80 && (s.stack.length || s.pending); i++) { const pk = s.pending; const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pass') || l[0]); } return s; };
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };

const semKw = n => ({ ...C[n], keywords: [] });

test('LT162 · as nove jogam pelo leitor aprovado', () => {
  for (const n of NOMES) { assert.equal(S.coverage(C[n]).level, 'completo', n); assert.equal(S.APROVADAS[n].leva, 'M-496', n); }
});

test('LT162 · Scatter the Seeds com convocar: duas Florestas e três criaturas (mesmo recém-chegadas) pagam; cria três Saprolings 1/1 verdes', () => {
  let s = mesa(), st, a, b, c; [s, st] = poe(s, 0, 'Scatter the Seeds', 'hand'); [s, a] = poe(s, 0, 'Viridian Shaman'); [s, b] = poe(s, 0, 'Elusive Krasis'); [s, c] = poe(s, 0, 'Carnivorous Moss-Beast'); s = terras(s, 'Forest', 2);
  const cv = legais(s, 0, a2 => a2.t === 'cast' && a2.oid === st); assert.ok(cv.length > 0, 'convocar com criaturas que acabaram de entrar');
  s = tudo(act(s, cv[0])); const f = s.zones[0].battlefield.filter(x => s.objects[x].token);
  assert.equal(f.length, 3); for (const x of f) { const o = s.objects[x]; assert.equal(E.stats(s, o).power, 1); assert.equal(E.stats(s, o).toughness, 1); assert.ok(E.isCreature(s, o)); }
  assert.ok([a, b, c].every(x => s.objects[x].tapped), 'as três pagaram');
});

test('LT162 · Overwhelm dá +3/+3 só às suas criaturas; Aven Wind Mage ganha +1/+1 ao conjurar feitiço, não ao conjurar criatura', () => {
  let s = mesa(), ow, aw, u, vs; [s, u] = poe(s, 1, 'Urso'); [s, aw] = poe(s, 0, 'Aven Wind Mage'); [s, ow] = poe(s, 0, 'Overwhelm', 'hand'); [s, vs] = poe(s, 0, 'Viridian Shaman', 'hand'); s = terras(s, 'Forest', 10);
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === vs)[0])); assert.equal(E.stats(s, s.objects[aw]).power, 2, 'criatura não dispara');
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === ow)[0]));
  assert.equal(E.stats(s, s.objects[aw]).power, 6); assert.equal(E.stats(s, s.objects[aw]).toughness, 6); assert.equal(E.stats(s, s.objects[vs]).power, 5); assert.equal(E.stats(s, s.objects[u]).power, 2);
  assert.ok(E.hasKeyword(s, s.objects[aw], 'flying'));
});

test('LT162 · Elusive Krasis evolui com criatura maior que entra (uma vez por entrada, não com igual) e não pode ser bloqueada', () => {
  let s = mesa(), ek, vs, mp; [s, ek] = poe(s, 0, 'Elusive Krasis'); [s, vs] = poe(s, 0, 'Viridian Shaman', 'hand'); [s, mp] = poe(s, 0, 'Mad Prophet', 'hand'); s = terras(s, 'Forest', 3); s = terras(s, 'Mountain', 4);
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === vs)[0])); assert.equal(E.stats(s, s.objects[ek]).power, 1); assert.equal(E.stats(s, s.objects[ek]).toughness, 5);
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === mp)[0])); assert.equal(E.stats(s, s.objects[ek]).power, 2, 'Mad Prophet 2/2 > 1/5 no poder');
  let t = mesa(), e2, u; [t, u] = poe(t, 1, 'Urso'); [t, e2] = poe(t, 0, 'Elusive Krasis'); t = J(t); t.objects[e2].sick = false;
  t = passaAte(t, x => x.pending && x.pending.kind === 'attackers', 20); t = act(t, { t: 'attack', p: 0, attackers: [e2] }); t = passaAte(t, x => x.pending && x.pending.kind === 'blockers', 20);
  assert.ok(!legais(t, 1).some(a => JSON.stringify(a).includes('"' + e2 + '"')), 'ninguém bloqueia');
});

test('LT162 · Viridian Shaman destrói artefato ao entrar; Mad Prophet com ímpeto vira e descarta para comprar no turno em que entra', () => {
  let s = mesa(), vs, r; [s, r] = poe(s, 1, 'Reliquia'); [s, vs] = poe(s, 0, 'Viridian Shaman', 'hand'); s = terras(s, 'Forest', 3);
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === vs)[0]);
  for (let i = 0; i < 40 && (s.stack.length || s.pending); i++) { const pk = s.pending; const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.targets && x.targets[0] && x.targets[0].oid === r) || l.find(x => x.t === 'pass') || l[0]); }
  assert.equal(s.objects[r].zone, 'graveyard');
  let t = mesa(), mp; [t, mp] = poe(t, 0, 'Mad Prophet', 'hand'); t = terras(t, 'Mountain', 4);
  t = tudo(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === mp)[0])); const h0 = t.zones[0].hand.length, g0 = t.zones[0].graveyard.length;
  const at = legais(t, 0, a => a.t === 'activate' && a.oid === mp); assert.ok(at.length > 0 && at.every(a => a.pay && (a.pay.discard || []).length === 1), 'ímpeto e descarte no custo');
  t = tudo(act(t, at[0])); assert.ok(t.objects[mp].tapped); assert.equal(t.zones[0].hand.length, h0 - 1 + 1); assert.equal(t.zones[0].graveyard.length, g0 + 1);
});

test('LT162 · Kill Shot só mira criatura atacando; Carnivorous Moss-Beast põe marcador; Wayward Soul volta ao topo do grimório do dono', () => {
  let s = mesa(), ks, ek, u; [s, u] = poe(s, 1, 'Urso'); [s, ek] = poe(s, 0, 'Elusive Krasis'); [s, ks] = poe(s, 0, 'Kill Shot', 'hand'); s = terras(s, 'Plains', 3); s = J(s); s.objects[ek].sick = false;
  assert.equal(legais(s, 0, a => a.t === 'cast' && a.oid === ks).length, 0, 'sem atacante, sem alvo');
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers', 20); s = act(s, { t: 'attack', p: 0, attackers: [ek] });
  s = passaAte(s, x => x.turn.priority === 0 && !x.pending && legais(x, 0, a => a.t === 'cast' && a.oid === ks).length > 0, 10);
  const op = legais(s, 0, a => a.t === 'cast' && a.oid === ks); assert.ok(op.every(a => a.targets[0].oid === ek), 'o Urso não ataca');
  s = tudo(act(s, op[0])); assert.equal(s.objects[ek].zone, 'graveyard');
  let t = mesa(), mb; [t, mb] = poe(t, 0, 'Carnivorous Moss-Beast'); t = terras(t, 'Forest', 7);
  t = tudo(act(t, legais(t, 0, a => a.t === 'activate' && a.oid === mb)[0])); assert.equal(E.stats(t, t.objects[mb]).power, 5); assert.equal(E.stats(t, t.objects[mb]).toughness, 6);
  let q = mesa(), ws; [q, ws] = poe(q, 0, 'Wayward Soul'); q = terras(q, 'Island', 1); assert.ok(E.hasKeyword(q, q.objects[ws], 'flying'));
  q = tudo(act(q, legais(q, 0, a => a.t === 'activate' && a.oid === ws)[0])); const lib = q.zones[0].library; assert.equal(q.objects[lib[0]].name, 'Wayward Soul');
  assert.ok(!q.zones[0].battlefield.some(x => q.objects[x].name === 'Wayward Soul'));
});
