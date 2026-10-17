// M-478 · LT144 · revisão por lote CXXIII: nove cartas que o leitor já lia por inteiro e que travam as listas iniciantes passam a jogar (APROVADAS).
// Textos da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json). Cobertura completa e o comportamento das frases que pedem. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Vigilant Drake', 'Concentrate', 'Herald of Faith', 'Briarhorn', 'Jade Mage', 'Moment of Heroism', 'Dawning Angel', 'Sphinx of Magosi', 'Angler Drake'];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [/^Flying/m.test(c.oracle_text) && 'Flying', /^Evoke/m.test(c.oracle_text) && 'Evoke', /^Flash$/m.test(c.oracle_text) && 'Flash', /^Flashback/m.test(c.oracle_text) && 'Flashback'].filter(Boolean), oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Mountain: terra('Mountain', 'Mountain', 'R'), Plains: terra('Plains', 'Plains', 'W'), Island: terra('Island', 'Island', 'U'), Swamp: terra('Swamp', 'Swamp', 'B'), Forest: terra('Forest', 'Forest', 'G') });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: C[name].type_line.startsWith('Basic Land') ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 148, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Mountain', 'Plains', 'Island', 'Swamp', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const tudo = s => { for (let i = 0; i < 80 && (s.stack.length || s.pending); i++) { const pk = s.pending; const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pass') || l[0]); } return s; };
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };


const resolveCom = (s, quer, sim = true) => { for (let i = 0; i < 60 && (s.stack.length || s.pending); i++) { const pk = s.pending; if (pk && pk.kind === 'pick_target') { s = act(s, { t: 'pick_target', p: pk.p, index: Math.max(0, pk.options.findIndex(o => o.oid === quer)) }); continue; } const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, (pk && pk.kind === 'may_pay' && l.find(x => x.t === (sim ? 'pay' : 'decline'))) || l.find(x => x.t === 'pass') || l[0]); } return s; };

test('LT144 · as nove jogam pelo leitor aprovado', () => {
  for (const n of NOMES) { assert.equal(S.coverage(C[n]).level, 'completo', n); assert.equal(S.APROVADAS[n].leva, 'M-478', n); }
});

test('LT144 · Briarhorn evocada por {1}{G}: +3/+3 no alvo e é sacrificada', () => {
  let s = mesa(), br, jm; [s, jm] = poe(s, 0, 'Jade Mage'); [s, br] = poe(s, 0, 'Briarhorn', 'hand'); s = terras(s, 'Forest', 2);
  const ev = legais(s, 0, a => a.t === 'cast' && a.oid === br); assert.ok(ev.length > 0, 'evocar com duas Florestas');
  s = resolveCom(act(s, ev[0]), jm); assert.equal(s.objects[br].zone, 'graveyard'); assert.equal(E.stats(s, s.objects[jm]).power, 5); assert.equal(E.stats(s, s.objects[jm]).toughness, 4);
});

test('LT144 · Vigilant Drake desvira por {2}{U}; Sphinx of Magosi compra e ganha um marcador', () => {
  let s = mesa(), vd; [s, vd] = poe(s, 0, 'Vigilant Drake'); s = terras(s, 'Island', 3); s = J(s); s.objects[vd].tapped = true;
  s = tudo(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === vd)[0])); assert.ok(!s.objects[vd].tapped);
  let t = mesa(), sm; [t, sm] = poe(t, 0, 'Sphinx of Magosi'); t = terras(t, 'Island', 3); const m0 = t.zones[0].hand.length;
  t = tudo(act(t, legais(t, 0, a => a.t === 'activate' && a.oid === sm)[0])); assert.equal(t.zones[0].hand.length, m0 + 1); assert.equal((t.objects[sm].counters || {}).p1p1, 1);
});

test('LT144 · Jade Mage cria um Saproling 1/1; Concentrate compra três; Dawning Angel dá 4 de vida', () => {
  let s = mesa(), jm; [s, jm] = poe(s, 0, 'Jade Mage'); s = terras(s, 'Forest', 3);
  s = tudo(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === jm)[0])); const f = s.zones[0].battlefield.filter(x => s.objects[x].token); assert.equal(f.length, 1); assert.equal(E.stats(s, s.objects[f[0]]).power, 1);
  let t = mesa(), co; [t, co] = poe(t, 0, 'Concentrate', 'hand'); t = terras(t, 'Island', 4); const m0 = t.zones[0].hand.length;
  t = tudo(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === co)[0])); assert.equal(t.zones[0].hand.length, m0 - 1 + 3);
  let q = mesa(), da; [q, da] = poe(q, 0, 'Dawning Angel', 'hand'); q = terras(q, 'Plains', 5);
  q = tudo(act(q, legais(q, 0, a => a.t === 'cast' && a.oid === da)[0])); assert.equal(q.players[0].life, 24);
});

test('LT144 · Moment of Heroism: +2/+2 e vínculo com a vida; Angler Drake pode devolver (opcional)', () => {
  let s = mesa(), mh, jm; [s, jm] = poe(s, 0, 'Jade Mage'); [s, mh] = poe(s, 0, 'Moment of Heroism', 'hand'); s = terras(s, 'Plains', 2);
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === mh && a.targets[0].oid === jm)[0])); assert.equal(E.stats(s, s.objects[jm]).power, 4); assert.ok(E.hasKeyword(s, s.objects[jm], 'lifelink'));
  let t = mesa(), ad, u; [t, u] = poe(t, 1, 'Urso'); [t, ad] = poe(t, 0, 'Angler Drake', 'hand'); t = terras(t, 'Island', 6);
  t = act(t, legais(t, 0, a => a.t === 'cast' && a.oid === ad)[0]);
  assert.equal(resolveCom(t, u, true).objects[u].zone, 'hand', 'aceita: devolve'); assert.equal(resolveCom(t, u, false).objects[u].zone, 'battlefield', 'recusa: fica');
});

test('LT144 · Herald of Faith: ao atacar, ganha 2 de vida', () => {
  let s = mesa(), hf; [s, hf] = poe(s, 0, 'Herald of Faith'); s = J(s); s.objects[hf].sick = false;
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers', 20);
  s = act(s, legais(s, 0, a => a.t === 'attack' && (a.attackers || []).length === 1)[0] || { t: 'attack', p: 0, attackers: [hf] });
  s = passaAte(s, x => x.turn.step === 'combat_damage' || x.turn.step === 'combat_end' || x.turn.step === 'main2', 30);
  assert.ok(s.players[0].life >= 22, 'ganhou 2 (vida ' + s.players[0].life + ')'); assert.equal(s.players[0].life, 22);
});
