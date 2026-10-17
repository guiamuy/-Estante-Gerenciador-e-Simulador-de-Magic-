// M-473 · LT139 · revisão por lote CXIX: nove cartas que o leitor já lia por inteiro e que travam as listas iniciantes passam a jogar (APROVADAS).
// Textos da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json). Cobertura completa e o comportamento das frases que pedem. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Slith Firewalker', 'Infuriate', 'Plagued Rusalka', 'Cliffside Lookout', 'Kavu Climber', 'Leonin Scimitar', 'Armored Skaab', 'Nantuko Husk', 'Voldaren Duelist'];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [/^Flying/m.test(c.oracle_text) && 'Flying', /^Haste/m.test(c.oracle_text) && 'Haste'].filter(Boolean), oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Mountain: terra('Mountain', 'Mountain', 'R'), Plains: terra('Plains', 'Plains', 'W'), Island: terra('Island', 'Island', 'U'), Swamp: terra('Swamp', 'Swamp', 'B'), Forest: terra('Forest', 'Forest', 'G') });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: C[name].type_line.startsWith('Basic Land') ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 143, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Mountain', 'Plains', 'Island', 'Swamp', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const tudo = s => { for (let i = 0; i < 80 && (s.stack.length || s.pending); i++) { const pk = s.pending; const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pass') || l[0]); } return s; };
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };



test('LT139 · as nove jogam pelo leitor aprovado', () => {
  for (const n of NOMES) { assert.equal(S.coverage(C[n]).level, 'completo', n); assert.equal(S.APROVADAS[n].leva, 'M-473', n); }
});

test('LT139 · Nantuko Husk sacrifica outra criatura sua e ganha +2/+2; também pode sacrificar a si mesma', () => {
  let s = mesa(), nh, sk; [s, nh] = poe(s, 0, 'Nantuko Husk'); [s, sk] = poe(s, 0, 'Armored Skaab');
  const ats = legais(s, 0, a => a.t === 'activate' && a.oid === nh); assert.ok(ats.length >= 2, JSON.stringify(ats));
  const sacs = ats.map(a => JSON.stringify(a)); assert.ok(sacs.some(x => x.includes(sk)) && sacs.some(x => (x.match(new RegExp(nh + '\\b', 'g')) || []).length > 1), 'oferece a outra e ela mesma');
  s = tudo(act(s, ats.find(a => JSON.stringify(a).includes(sk))));
  assert.equal(s.objects[sk].zone, 'graveyard'); const st = E.stats(s, s.objects[nh]); assert.equal(st.power, 4); assert.equal(st.toughness, 4);
});

test('LT139 · Plagued Rusalka: {B} e sacrificar uma criatura dão -1/-1 ao alvo', () => {
  let s = mesa(), pr, sk, u; [s, pr] = poe(s, 0, 'Plagued Rusalka'); [s, sk] = poe(s, 0, 'Armored Skaab'); [s, u] = poe(s, 1, 'Urso'); s = terras(s, 'Swamp', 1);
  const a = legais(s, 0, x => x.t === 'activate' && x.oid === pr && x.targets && x.targets[0].oid === u && JSON.stringify(x).includes(sk));
  assert.ok(a.length > 0); s = tudo(act(s, a[0]));
  assert.equal(s.objects[sk].zone, 'graveyard'); const st = E.stats(s, s.objects[u]); assert.equal(st.power, 1); assert.equal(st.toughness, 1);
});

test('LT139 · Cliffside Lookout dá +1/+1 só às suas criaturas; Leonin Scimitar equipada dá +1/+1; Infuriate dá +3/+2', () => {
  let s = mesa(), cl, sk, u; [s, cl] = poe(s, 0, 'Cliffside Lookout'); [s, sk] = poe(s, 0, 'Armored Skaab'); [s, u] = poe(s, 1, 'Urso'); s = terras(s, 'Plains', 5);
  s = tudo(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === cl)[0]));
  assert.equal(E.stats(s, s.objects[cl]).power, 2); assert.equal(E.stats(s, s.objects[sk]).toughness, 5); assert.equal(E.stats(s, s.objects[u]).power, 2, 'a do oponente não');
  let t = mesa(), ls, s2; [t, ls] = poe(t, 0, 'Leonin Scimitar'); [t, s2] = poe(t, 0, 'Armored Skaab'); t = terras(t, 'Island', 1);
  t = tudo(act(t, legais(t, 0, a => a.t === 'activate' && a.oid === ls && a.targets[0].oid === s2)[0]));
  assert.equal(E.stats(t, t.objects[s2]).power, 2); assert.equal(E.stats(t, t.objects[s2]).toughness, 5);
  let q = mesa(), inf, u3; [q, u3] = poe(q, 1, 'Urso'); [q, inf] = poe(q, 0, 'Infuriate', 'hand'); q = terras(q, 'Mountain', 1);
  q = tudo(act(q, legais(q, 0, a => a.t === 'cast' && a.oid === inf && a.targets[0].oid === u3)[0])); assert.equal(E.stats(q, q.objects[u3]).power, 5); assert.equal(E.stats(q, q.objects[u3]).toughness, 4);
});

test('LT139 · Armored Skaab mói quatro; Kavu Climber compra; Voldaren Duelist impede o bloqueio do alvo', () => {
  let s = mesa(), sk; [s, sk] = poe(s, 0, 'Armored Skaab', 'hand'); s = terras(s, 'Island', 3); const g0 = s.zones[0].graveyard.length;
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === sk)[0])); assert.equal(s.zones[0].graveyard.length, g0 + 4);
  let t = mesa(), kc; [t, kc] = poe(t, 0, 'Kavu Climber', 'hand'); t = terras(t, 'Forest', 5); const m0 = t.zones[0].hand.length;
  t = tudo(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === kc)[0])); assert.equal(t.zones[0].hand.length, m0);
  let q = mesa(), vd, u; [q, u] = poe(q, 1, 'Urso'); [q, vd] = poe(q, 0, 'Voldaren Duelist', 'hand'); q = terras(q, 'Mountain', 4);
  q = act(q, legais(q, 0, a => a.t === 'cast' && a.oid === vd)[0]);
  for (let i = 0; i < 40 && (q.stack.length || q.pending); i++) { const pk = q.pending; if (pk && pk.kind === 'pick_target') { q = act(q, { t: 'pick_target', p: pk.p, index: pk.options.findIndex(o => o.oid === u) }); continue; } q = act(q, legais(q, pk ? pk.p : q.turn.priority).find(x => x.t === 'pass') || legais(q, pk ? pk.p : q.turn.priority)[0]); }
  assert.ok(!E.eligibleBlockers(q, 1).includes(u), 'não bloqueia neste turno'); assert.ok(E.eligibleAttackers(q, 0).includes(vd), 'ímpeto');
});
