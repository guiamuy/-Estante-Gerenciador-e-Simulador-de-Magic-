// M-494 · LT160 · revisão por lote CXXXVI: nove cartas que o leitor já lia por inteiro e que travam as listas iniciantes passam a jogar (APROVADAS).
// Textos da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json). Cobertura completa e o comportamento das frases que pedem. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Sprouting Thrinax', 'Twisted Abomination', 'Ichor Slick', 'Water Servant', 'Goblin Replica', 'Trip Noose', 'Frontier Guide', 'Natural Connection', 'Viridian Corrupter'];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [/^Swampcycling/m.test(c.oracle_text) && 'Swampcycling', /^Cycling/m.test(c.oracle_text) && 'Cycling', /^Madness/m.test(c.oracle_text) && 'Madness', /^Infect/m.test(c.oracle_text) && 'Infect'].filter(Boolean), oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Reliquia: { name: 'Reliquia', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] }, Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Mountain: terra('Mountain', 'Mountain', 'R'), Plains: terra('Plains', 'Plains', 'W'), Island: terra('Island', 'Island', 'U'), Swamp: terra('Swamp', 'Swamp', 'B'), Forest: terra('Forest', 'Forest', 'G') });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: C[name].type_line.startsWith('Basic Land') ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 164, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Mountain', 'Plains', 'Island', 'Swamp', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const tudo = s => { for (let i = 0; i < 80 && (s.stack.length || s.pending); i++) { const pk = s.pending; const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pass') || l[0]); } return s; };
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };


const resolveCom = (s, quer) => { for (let i = 0; i < 60 && (s.stack.length || s.pending); i++) { const pk = s.pending; if (pk && pk.kind === 'pick_target') { s = act(s, { t: 'pick_target', p: pk.p, index: Math.max(0, pk.options.findIndex(o => o.oid === quer)) }); continue; } const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pass') || l[0]); } return s; };
const fichas = s => s.zones[0].battlefield.filter(x => s.objects[x].token);

test('LT160 · as nove jogam pelo leitor aprovado', () => {
  for (const n of NOMES) { assert.equal(S.coverage(C[n]).level, 'completo', n); assert.equal(S.APROVADAS[n].leva, 'M-494', n); }
});

test('LT160 · Sprouting Thrinax morre e cria três Saprolings; Twisted Abomination regenera e recicla buscando Pântano', () => {
  let s = mesa(), st; [s, st] = poe(s, 0, 'Sprouting Thrinax'); let m = J(s); m.objects[st].damage = 9; m = tudo(act(m, { t: 'pass', p: 0 }));
  assert.equal(m.objects[st].zone, 'graveyard'); assert.equal(fichas(m).length, 3);
  let t = mesa(), ta; [t, ta] = poe(t, 0, 'Twisted Abomination'); t = terras(t, 'Swamp', 1);
  t = tudo(act(t, legais(t, 0, a => a.t === 'activate' && a.oid === ta)[0])); let q = J(t); q.objects[ta].damage = 9; q = tudo(act(q, { t: 'pass', p: 0 })); assert.equal(q.objects[ta].zone, 'battlefield');
  let r = mesa(), t2; [r, t2] = poe(r, 0, 'Twisted Abomination', 'hand'); r = terras(r, 'Swamp', 2); const m0 = r.zones[0].hand.length;
  r = tudo(act(r, legais(r, 0, a => a.t === 'cycle' && a.oid === t2)[0])); assert.equal(r.objects[t2].zone, 'graveyard'); assert.equal(r.zones[0].hand.length, m0); assert.ok(r.objects[r.zones[0].hand.at(-1)].name === 'Swamp', 'Pântano na mão');
});

test('LT160 · Ichor Slick: -3/-3, recicla e tem insanidade; Water Servant troca +1/-1 e -1/+1', () => {
  let s = mesa(), is, u; [s, u] = poe(s, 1, 'Urso'); [s, is] = poe(s, 0, 'Ichor Slick', 'hand'); s = terras(s, 'Swamp', 3);
  assert.ok(legais(s, 0, a => a.t === 'cycle' && a.oid === is).length > 0, 'recicla');
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === is && a.targets[0].oid === u)[0])); assert.equal(s.objects[u].zone, 'graveyard');
  let t = mesa(), ws; [t, ws] = poe(t, 0, 'Water Servant'); t = terras(t, 'Island', 2);
  t = tudo(act(t, legais(t, 0, a => a.t === 'activate' && a.oid === ws && a.index === 0)[0])); assert.equal(E.stats(t, t.objects[ws]).power, 4); assert.equal(E.stats(t, t.objects[ws]).toughness, 3);
  t = tudo(act(t, legais(t, 0, a => a.t === 'activate' && a.oid === ws && a.index === 1)[0])); assert.equal(E.stats(t, t.objects[ws]).power, 3); assert.equal(E.stats(t, t.objects[ws]).toughness, 4);
});

test('LT160 · Goblin Replica sacrifica e destrói artefato; Trip Noose vira a criatura alvo; Viridian Corrupter destrói artefato ao entrar e tem infectar', () => {
  let s = mesa(), gr, tn; [s, gr] = poe(s, 0, 'Goblin Replica'); [s, tn] = poe(s, 0, 'Trip Noose'); s = terras(s, 'Mountain', 4);
  s = tudo(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === gr && a.targets[0].oid === tn)[0])); assert.equal(s.objects[tn].zone, 'graveyard'); assert.equal(s.objects[gr].zone, 'graveyard');
  let t = mesa(), t2, u; [t, t2] = poe(t, 0, 'Trip Noose'); [t, u] = poe(t, 1, 'Urso'); t = terras(t, 'Forest', 2);
  t = tudo(act(t, legais(t, 0, a => a.t === 'activate' && a.oid === t2 && a.targets[0].oid === u)[0])); assert.ok(t.objects[u].tapped);
  let q = mesa(), vc, t3; [q, t3] = poe(q, 0, 'Trip Noose'); [q, vc] = poe(q, 0, 'Viridian Corrupter', 'hand'); q = terras(q, 'Forest', 3);
  q = resolveCom(act(q, legais(q, 0, a => a.t === 'cast' && a.oid === vc)[0]), t3); assert.equal(q.objects[t3].zone, 'graveyard'); assert.ok(E.hasKeyword(q, q.objects[vc], 'infect'));
});

test('LT160 · Frontier Guide e Natural Connection buscam um terreno básico que entra virado', () => {
  let s = mesa(), fg; [s, fg] = poe(s, 0, 'Frontier Guide'); s = terras(s, 'Forest', 4); s = J(s); s.objects[fg].sick = false; const c0 = s.zones[0].battlefield.slice();
  s = tudo(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === fg)[0])); const n1 = s.zones[0].battlefield.filter(o => !c0.includes(o)); assert.equal(n1.length, 1); assert.ok(s.objects[n1[0]].tapped);
  let t = mesa(), nc; [t, nc] = poe(t, 0, 'Natural Connection', 'hand'); t = terras(t, 'Forest', 3); const c1 = t.zones[0].battlefield.slice();
  t = tudo(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === nc)[0])); const n2 = t.zones[0].battlefield.filter(o => !c1.includes(o)); assert.equal(n2.length, 1); assert.ok(t.objects[n2[0]].tapped);
});
