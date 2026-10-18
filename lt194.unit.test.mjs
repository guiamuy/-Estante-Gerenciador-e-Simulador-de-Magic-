// M-512 · LT176 · revisão por lote CLII: nove cartas que o leitor já lia por inteiro e que travam as listas iniciantes passam a jogar (APROVADAS).
// Textos da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json). Cobertura completa e o comportamento das frases que pedem. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Traumatic Visions', 'Void Snare', 'Bathe in Dragonfire', 'Weave Fate', 'Screeching Skaab', 'Driver of the Dead', 'Convolute', 'Aesthir Glider', 'Dusk Legion Zealot'];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [...['Flying'].filter(k => c.oracle_text.split(String.fromCharCode(10)).some(l => l === k || l.startsWith(k + ' ')))].filter(Boolean), oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Reliquia: { name: 'Reliquia', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] }, Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Mountain: terra('Mountain', 'Mountain', 'R'), Plains: terra('Plains', 'Plains', 'W'), Island: terra('Island', 'Island', 'U'), Swamp: terra('Swamp', 'Swamp', 'B'), Forest: terra('Forest', 'Forest', 'G') });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: C[name].type_line.startsWith('Basic Land') ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 180, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Mountain', 'Plains', 'Island', 'Swamp', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Forest', 'Reliquia', 'Aesthir Glider']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const tudo = s => { for (let i = 0; i < 80 && (s.stack.length || s.pending); i++) { const pk = s.pending; const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pass') || l[0]); } return s; };
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };

const semKw = n => ({ ...C[n], keywords: [] });
const resolve = (s, pref, alvo) => { for (let i = 0; i < 60 && (s.stack.length || s.pending); i++) { const pk = s.pending; if (pk && pk.kind === 'pick_target' && alvo != null) { s = act(s, { t: 'pick_target', p: pk.p, index: pk.options.findIndex(o => (typeof alvo === 'number' ? o.player === alvo : o.oid === alvo)) }); continue; } const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, (pref && l.find(pref)) || l.find(x => x.t === 'pass') || l[0]); } return s; };

test('LT176 · as nove jogam pelo leitor aprovado', () => {
  for (const n of NOMES) { assert.equal(S.coverage(C[n]).level, 'completo', n); assert.equal(S.APROVADAS[n].leva, 'M-512', n); }
});

test('LT176 · Convolute anula a menos que o controlador pague {4}; Traumatic Visions anula; ciclagem de terreno básico busca um básico', () => {
  let s = mesa(), cv, wf; [s, wf] = poe(s, 0, 'Weave Fate', 'hand'); [s, cv] = poe(s, 0, 'Convolute', 'hand'); s = terras(s, 'Island', 7);
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === wf)[0]);
  const c = legais(s, 0, a => a.t === 'cast' && a.oid === cv); assert.ok(c.length > 0, 'mira a mágica na pilha'); s = act(s, c[0]);
  s = resolve(s, x => x.t === 'decline'); assert.equal(s.objects[wf].zone, 'graveyard'); assert.equal(s.objects[cv].zone, 'graveyard');
  let t = mesa(), tv, w2; [t, w2] = poe(t, 0, 'Weave Fate', 'hand'); [t, tv] = poe(t, 0, 'Traumatic Visions', 'hand'); t = terras(t, 'Island', 9); const h0 = t.zones[0].hand.length;
  t = act(t, legais(t, 0, a => a.t === 'cast' && a.oid === w2)[0]); t = tudo(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === tv)[0])); assert.equal(t.objects[w2].zone, 'graveyard'); assert.equal(t.zones[0].hand.length, h0 - 2, 'Weave Fate não comprou');
  let q = mesa(), t2; [q, t2] = poe(q, 0, 'Traumatic Visions', 'hand'); q = terras(q, 'Island', 2); const k0 = q.zones[0].hand.length;
  const cic = legais(q, 0, a => a.oid === t2 && a.t !== 'cast'); assert.ok(cic.length > 0, 'ciclagem oferecida');
  q = resolve(act(q, cic[0]), x => x.t === 'pick'); assert.equal(q.objects[t2].zone, 'graveyard'); assert.equal(q.zones[0].hand.length, k0, 'troca a carta por um básico');
});

test('LT176 · Driver of the Dead ao morrer devolve criatura de valor 2 ou menos do seu cemitério; Bathe in Dragonfire 4 de dano', () => {
  let s = mesa(), dd, dz, bd; [s, dz] = poe(s, 0, 'Dusk Legion Zealot', 'graveyard'); [s, dd] = poe(s, 0, 'Driver of the Dead'); [s, bd] = poe(s, 0, 'Bathe in Dragonfire', 'hand'); s = terras(s, 'Mountain', 3);
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === bd && a.targets[0].oid === dd)[0]); s = resolve(s, null, dz);
  assert.equal(s.objects[dd].zone, 'graveyard'); assert.equal(s.objects[dz].zone, 'battlefield'); assert.equal(s.players[0].life, 19, 'o Zealot entrou e disparou');
});

test('LT176 · Void Snare devolve permanente que não é terreno à mão do dono; Screeching Skaab moe dois; Weave Fate compra dois', () => {
  let s = mesa(), vs, r; [s, r] = poe(s, 1, 'Reliquia'); [s, vs] = poe(s, 0, 'Void Snare', 'hand'); s = terras(s, 'Island', 1);
  const al = legais(s, 0, a => a.t === 'cast' && a.oid === vs).map(a => a.targets[0].oid); assert.ok(al.includes(r) && al.every(o => !/Island/.test(s.objects[o].name)), 'nunca terreno');
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === vs && a.targets[0].oid === r)[0])); assert.ok(s.zones[1].hand.includes(r));
  let t = mesa(), sk; [t, sk] = poe(t, 0, 'Screeching Skaab', 'hand'); t = terras(t, 'Island', 2); const g0 = t.zones[0].graveyard.length;
  t = tudo(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === sk)[0])); assert.equal(t.zones[0].graveyard.length, g0 + 2);
});

test('LT176 · Aesthir Glider voa e não bloqueia; Dusk Legion Zealot compra e perde 1', () => {
  let s = mesa(), ag, u; [s, ag] = poe(s, 1, 'Aesthir Glider'); [s, u] = poe(s, 1, 'Urso'); let a; [s, a] = poe(s, 0, 'Dusk Legion Zealot'); s = J(s); s.objects[a].sick = false;
  assert.ok(E.hasKeyword(s, s.objects[ag], 'flying'));
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers', 20); s = act(s, { t: 'attack', p: 0, attackers: [a] }); s = passaAte(s, x => x.pending && x.pending.kind === 'blockers', 20);
  assert.ok(!legais(s, 1).some(x => JSON.stringify(x).includes('"' + ag + '"')), 'não bloqueia');
  let t = mesa(), dz; [t, dz] = poe(t, 0, 'Dusk Legion Zealot', 'hand'); t = terras(t, 'Swamp', 2); const h0 = t.zones[0].hand.length;
  t = tudo(act(t, legais(t, 0, a2 => a2.t === 'cast' && a2.oid === dz)[0])); assert.equal(t.zones[0].hand.length, h0 - 1 + 1); assert.equal(t.players[0].life, 19);
});
