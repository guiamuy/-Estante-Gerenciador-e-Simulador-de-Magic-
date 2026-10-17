// M-495 · LT161 · revisão por lote CXXXVII: nove cartas que o leitor já lia por inteiro e que travam as listas iniciantes passam a jogar (APROVADAS).
// Textos da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json). Cobertura completa e o comportamento das frases que pedem. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Untamed Wilds', 'Touch of Brilliance', 'Sanctum Custodian', 'Tormenting Voice', 'Lavastep Raider', 'Moment of Triumph', 'Cudgel Troll', 'Call of the Conclave', 'Gather Courage'];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [/^Convoke/m.test(c.oracle_text) && 'Convoke'].filter(Boolean), oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Reliquia: { name: 'Reliquia', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] }, Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Mountain: terra('Mountain', 'Mountain', 'R'), Plains: terra('Plains', 'Plains', 'W'), Island: terra('Island', 'Island', 'U'), Swamp: terra('Swamp', 'Swamp', 'B'), Forest: terra('Forest', 'Forest', 'G') });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: C[name].type_line.startsWith('Basic Land') ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 165, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Mountain', 'Plains', 'Island', 'Swamp', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const tudo = s => { for (let i = 0; i < 80 && (s.stack.length || s.pending); i++) { const pk = s.pending; const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pass') || l[0]); } return s; };
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };


test('LT161 · as nove jogam pelo leitor aprovado', () => {
  for (const n of NOMES) { assert.equal(S.coverage(C[n]).level, 'completo', n); assert.equal(S.APROVADAS[n].leva, 'M-495', n); }
});

test('LT161 · Untamed Wilds busca um básico que entra desvirado; Touch of Brilliance compra duas; Tormenting Voice descarta como custo e compra duas', () => {
  let s = mesa(), uw; [s, uw] = poe(s, 0, 'Untamed Wilds', 'hand'); s = terras(s, 'Forest', 3); const c0 = s.zones[0].battlefield.slice();
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === uw)[0])); const n1 = s.zones[0].battlefield.filter(o => !c0.includes(o)); assert.equal(n1.length, 1); assert.ok(!s.objects[n1[0]].tapped, 'desvirado');
  let t = mesa(), tb; [t, tb] = poe(t, 0, 'Touch of Brilliance', 'hand'); t = terras(t, 'Island', 4); const m0 = t.zones[0].hand.length;
  t = tudo(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === tb)[0])); assert.equal(t.zones[0].hand.length, m0 - 1 + 2);
  let q = mesa(), tv; [q, tv] = poe(q, 0, 'Tormenting Voice', 'hand'); q = terras(q, 'Mountain', 2); const h0 = q.zones[0].hand.length;
  const cs = legais(q, 0, a => a.t === 'cast' && a.oid === tv); assert.ok(cs.length > 0 && cs.every(a => a.pay && (a.pay.discard || []).length === 1), 'descarte no custo');
  q = tudo(act(q, cs[0])); assert.equal(q.zones[0].hand.length, h0 - 2 + 2);
});

test('LT161 · Moment of Triumph +2/+2 e ganha 2; Call of the Conclave cria um Centauro 3/3; Lavastep Raider {2}{R}: +2/+0', () => {
  let s = mesa(), mt, u; [s, u] = poe(s, 1, 'Urso'); [s, mt] = poe(s, 0, 'Moment of Triumph', 'hand'); s = terras(s, 'Plains', 1);
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === mt && a.targets[0].oid === u)[0])); assert.equal(E.stats(s, s.objects[u]).power, 4); assert.equal(s.players[0].life, 22);
  let t = mesa(), cc; [t, cc] = poe(t, 0, 'Call of the Conclave', 'hand'); t = terras(t, 'Forest', 1); t = terras(t, 'Plains', 1);
  t = tudo(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === cc)[0])); const f = t.zones[0].battlefield.filter(x => t.objects[x].token); assert.equal(f.length, 1); assert.equal(E.stats(t, t.objects[f[0]]).power, 3);
  let q = mesa(), lr; [q, lr] = poe(q, 0, 'Lavastep Raider'); q = terras(q, 'Mountain', 3); q = tudo(act(q, legais(q, 0, a => a.t === 'activate' && a.oid === lr)[0])); assert.equal(E.stats(q, q.objects[lr]).power, 3);
});

test('LT161 · Gather Courage com convocar: uma criatura verde virada paga o {G}; Cudgel Troll regenera; Sanctum Custodian previne 2', () => {
  let s = mesa(), gc, ct; [s, ct] = poe(s, 0, 'Cudgel Troll'); [s, gc] = poe(s, 0, 'Gather Courage', 'hand'); s = J(s); s.objects[ct].sick = false;
  const cv = legais(s, 0, a => a.t === 'cast' && a.oid === gc && a.targets[0].oid === ct); assert.ok(cv.length > 0, 'convocar sem terreno');
  s = tudo(act(s, cv[0])); assert.equal(E.stats(s, s.objects[ct]).power, 6); assert.ok(s.objects[ct].tapped, 'a criatura pagou');
  let t = mesa(), c2; [t, c2] = poe(t, 0, 'Cudgel Troll'); t = terras(t, 'Forest', 1);
  t = tudo(act(t, legais(t, 0, a => a.t === 'activate' && a.oid === c2)[0])); let m = J(t); m.objects[c2].damage = 9; m = tudo(act(m, { t: 'pass', p: 0 })); assert.equal(m.objects[c2].zone, 'battlefield');
  let q = mesa(), sc; [q, sc] = poe(q, 0, 'Sanctum Custodian'); q = J(q); q.objects[sc].sick = false;
  q = tudo(act(q, legais(q, 0, a => a.t === 'activate' && a.oid === sc && a.targets && a.targets[0].player === 0)[0])); assert.ok(q.objects[sc].tapped, 'virou para prevenir');
});
