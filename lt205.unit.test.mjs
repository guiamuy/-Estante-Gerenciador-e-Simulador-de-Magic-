// M-523 · LT185 · revisão por lote CLXI: nove cartas que o leitor já lia por inteiro e que travam listas do catálogo (textos da Scryfall de
// 18/10/2026): Village Rites, Mycosynth Wellspring, Sacred Peaks, Griptide, Sejiri Refuge, Dwarven Mine, Thrashing Brontodon, Rockfall
// Vale e Wild Cantor. Sem código novo: falham no motor anterior porque as cartas não estavam aprovadas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Village Rites', 'Mycosynth Wellspring', 'Sacred Peaks', 'Griptide', 'Sejiri Refuge', 'Dwarven Mine', 'Thrashing Brontodon', 'Rockfall Vale', 'Wild Cantor'];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Plains: terra('Plains', 'Plains', 'W'), Island: terra('Island', 'Island', 'U'), Swamp: terra('Swamp', 'Swamp', 'B'), Mountain: terra('Mountain', 'Mountain', 'R'), Forest: terra('Forest', 'Forest', 'G'),
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', power: '2', toughness: '2', colors: ['G'] },
  Amuleto: { name: 'Amuleto', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] } });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: /Land/.test(C[name].type_line) ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 205, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Urso']) }, { name: 'B', deck: b(['Urso', 'Amuleto', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };
const limpa = s => passaAte(s, x => !x.stack.length && !x.pending && !(x.queued || []).length);
const conj = (s, oid, f = () => true) => { const a = legais(s, 0, x => x.t === 'cast' && x.oid === oid && f(x))[0]; assert.ok(a, 'conjurar ' + s.objects[oid].name); return act(s, a); };
const alvoOid = oid => x => x.targets && x.targets[0] && x.targets[0].oid === oid;
const joga = (s, oid) => act(s, legais(s, 0, a => a.t === 'play_land' && a.oid === oid)[0]);
const pegaUm = (s, o) => { s = act(s, legais(s, 0, a => a.t === 'pick' && a.oid === o)[0]); if (s.pending && s.pending.kind === 'pick') s = act(s, legais(s, 0, a => a.t === 'pick_done')[0]); return s; };

test('M-523 · Village Rites: sacrificar uma criatura é custo adicional; compra duas; sem criatura, não conjura', () => {
  let s = mesa(), vr, u; [s, vr] = poe(s, 0, 'Village Rites', 'hand'); [s] = poe(s, 0, 'Swamp');
  assert.equal(legais(s, 0, a => a.t === 'cast' && a.oid === vr).length, 0, 'sem criatura para sacrificar');
  [s, u] = poe(s, 0, 'Urso'); const mao = s.zones[0].hand.length;
  s = limpa(conj(s, vr)); assert.equal(s.objects[u].zone, 'graveyard'); assert.equal(s.zones[0].hand.length, mao - 1 + 2);
});

test('M-523 · Mycosynth Wellspring: ao entrar e ao ir do campo ao cemitério, pode buscar um terreno básico para a mão', () => {
  let s = mesa(), mw; [s, mw] = poe(s, 0, 'Mycosynth Wellspring', 'hand'); s = terras(s, 'Forest', 2);
  const busca = s => { s = passaAte(s, x => !!x.pending && (x.pending.kind === 'may_pay' || x.pending.kind === 'pick'));
    if (s.pending.kind === 'may_pay') s = passaAte(act(s, legais(s, 0, a => a.t === 'pay')[0]), x => !!x.pending && x.pending.kind === 'pick');
    const o = s.pending.from[0]; assert.ok(/Basic Land/.test(C[s.objects[o].name].type_line)); return [limpa(pegaUm(s, o)), o]; };
  let o1; [s, o1] = busca(conj(s, mw)); assert.equal(s.objects[o1].zone, 'hand');
  // destruída pela Thrashing Brontodon: vai do campo ao cemitério
  let b2; [s, b2] = poe(s, 0, 'Thrashing Brontodon'); [s] = poe(s, 0, 'Forest');
  let o2; [s, o2] = busca(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === b2 && alvoOid(mw)(a))[0]));
  assert.equal(s.objects[mw].zone, 'graveyard'); assert.equal(s.objects[o2].zone, 'hand');
});

test('M-523 · Sacred Peaks (Mountain Plains) entra virada e produz R ou W; Sejiri Refuge entra virada e dá 1 de vida', () => {
  let s = mesa(), sp; [s, sp] = poe(s, 0, 'Sacred Peaks', 'hand'); s = limpa(joga(s, sp)); assert.equal(s.objects[sp].tapped, true);
  assert.deepEqual(JSON.parse(JSON.stringify(E.productions(s, s.objects[sp]))).flat().sort(), ['R', 'W']);
  let t = mesa(), sr; [t, sr] = poe(t, 0, 'Sejiri Refuge', 'hand'); const v = t.players[0].life; t = limpa(joga(t, sr));
  assert.equal(t.objects[sr].tapped, true); assert.equal(t.players[0].life, v + 1);
  assert.deepEqual(JSON.parse(JSON.stringify(E.productions(t, t.objects[sr]))).flat().sort(), ['U', 'W']);
});

test('M-523 · Griptide põe a criatura no topo do grimório do dono', () => {
  let s = mesa(), gt, u; [s, gt] = poe(s, 0, 'Griptide', 'hand'); s = terras(s, 'Island', 4); [s, u] = poe(s, 1, 'Urso');
  s = limpa(conj(s, gt, alvoOid(u))); assert.equal(s.zones[1].library[0], u);
});

test('M-523 · Dwarven Mine: com três outras Montanhas entra desvirada e cria um Anão 1/1; com menos entra virada e não cria', () => {
  let s = mesa(), dm; s = terras(s, 'Mountain', 3); [s, dm] = poe(s, 0, 'Dwarven Mine', 'hand'); s = limpa(joga(s, dm));
  assert.equal(s.objects[dm].tapped, false); assert.equal(s.zones[0].battlefield.filter(o => s.objects[o].name === 'Dwarf').length, 1);
  let t = mesa(), d2; t = terras(t, 'Mountain', 2); [t, d2] = poe(t, 0, 'Dwarven Mine', 'hand'); t = limpa(joga(t, d2));
  assert.equal(t.objects[d2].tapped, true); assert.equal(t.zones[0].battlefield.filter(o => t.objects[o].name === 'Dwarf').length, 0);
});

test('M-523 · Thrashing Brontodon: {1}, sacrifica: destrói artefato ou encantamento', () => {
  let s = mesa(), tb, am; [s, tb] = poe(s, 0, 'Thrashing Brontodon'); [s] = poe(s, 0, 'Forest'); [s, am] = poe(s, 1, 'Amuleto');
  s = limpa(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === tb && alvoOid(am)(a))[0]));
  assert.equal(s.objects[tb].zone, 'graveyard'); assert.equal(s.objects[am].zone, 'graveyard');
});

test('M-523 · Rockfall Vale entra desvirada com duas outras terras, virada com menos', () => {
  let s = mesa(), rv; s = terras(s, 'Forest', 2); [s, rv] = poe(s, 0, 'Rockfall Vale', 'hand'); s = limpa(joga(s, rv)); assert.equal(s.objects[rv].tapped, false);
  let t = mesa(), r2; t = terras(t, 'Forest', 1); [t, r2] = poe(t, 0, 'Rockfall Vale', 'hand'); t = limpa(joga(t, r2)); assert.equal(t.objects[r2].tapped, true);
});

test('M-523 · Wild Cantor: sacrifica para uma mana de qualquer cor (sem enjoo: não vira)', () => {
  let s = mesa(), wc; [s, wc] = poe(s, 0, 'Wild Cantor', 'battlefield', { sick: true });
  const a = legais(s, 0, x => x.t === 'activate' && x.oid === wc && x.color === 'U')[0]; assert.ok(a, 'mesmo recém-chegada');
  s = act(s, a); assert.equal(s.objects[wc].zone, 'graveyard'); assert.equal(s.players[0].pool.U, 1);
});
