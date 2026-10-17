// M-491 · LT157 · revisão por lote CXXXIII: nove cartas que o leitor já lia por inteiro e que travam as listas iniciantes passam a jogar (APROVADAS).
// Textos da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json). Cobertura completa e o comportamento das frases que pedem. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Thornwind Faeries', 'Miscalculation', 'Grasp of Darkness', 'Greatsword', 'Emberwilde Augur', 'Benalish Veteran', 'Shatter', 'Electrify', 'Trusty Machete'];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [/^Cycling/m.test(c.oracle_text) && 'Cycling'].filter(Boolean), oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Reliquia: { name: 'Reliquia', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] }, Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Mountain: terra('Mountain', 'Mountain', 'R'), Plains: terra('Plains', 'Plains', 'W'), Island: terra('Island', 'Island', 'U'), Swamp: terra('Swamp', 'Swamp', 'B'), Forest: terra('Forest', 'Forest', 'G') });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: C[name].type_line.startsWith('Basic Land') ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 161, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Mountain', 'Plains', 'Island', 'Swamp', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const tudo = s => { for (let i = 0; i < 80 && (s.stack.length || s.pending); i++) { const pk = s.pending; const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pass') || l[0]); } return s; };
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };


test('LT157 · as nove jogam pelo leitor aprovado', () => {
  for (const n of NOMES) { assert.equal(S.coverage(C[n]).level, 'completo', n); assert.equal(S.APROVADAS[n].leva, 'M-491', n); }
});

test('LT157 · Miscalculation anula a menos que pague {2} e recicla; Shatter destrói artefato; Electrify causa 4; Grasp of Darkness -4/-4', () => {
  let s = mesa(), mc, sh, rl; [s, mc] = poe(s, 0, 'Miscalculation', 'hand'); [s, sh] = poe(s, 0, 'Shatter', 'hand'); [s, rl] = poe(s, 0, 'Greatsword'); s = terras(s, 'Island', 2); s = terras(s, 'Mountain', 2); s = terras(s, 'Plains', 2);
  assert.ok(legais(s, 0, a => a.t === 'cycle' && a.oid === mc).length > 0, 'recicla');
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === sh && a.targets[0].oid === rl)[0]);
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === mc && a.targets[0].oid === sh)[0]);
  s = act(act(s, { t: 'pass', p: 0 }), { t: 'pass', p: 1 });
  assert.equal(s.pending && s.pending.kind, 'may_pay'); assert.equal(s.pending.p, 0, 'o controlador da mágica alvo decide');
  const paga = tudo(act(s, { t: 'pay', p: 0 })); assert.equal(paga.objects[rl].zone, 'graveyard', 'pagou: Shatter resolve');
  const nao = tudo(act(s, { t: 'decline', p: 0 })); assert.equal(nao.objects[sh].zone, 'graveyard'); assert.equal(nao.objects[rl].zone, 'battlefield', 'anulada: o artefato fica');
  let t = mesa(), el, u; [t, u] = poe(t, 1, 'Urso'); [t, el] = poe(t, 0, 'Electrify', 'hand'); t = terras(t, 'Mountain', 4);
  t = tudo(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === el && a.targets[0].oid === u)[0])); assert.equal(t.objects[u].zone, 'graveyard');
  let q = mesa(), gd, u2; [q, u2] = poe(q, 1, 'Urso'); [q, gd] = poe(q, 0, 'Grasp of Darkness', 'hand'); q = terras(q, 'Swamp', 2);
  q = tudo(act(q, legais(q, 0, a => a.t === 'cast' && a.oid === gd && a.targets[0].oid === u2)[0])); assert.equal(q.objects[u2].zone, 'graveyard');
});

test('LT157 · Greatsword (+3/+0, equipar {3}) e Trusty Machete (+2/+1, equipar {2}); Thornwind Faeries {T}: 1 de dano', () => {
  let s = mesa(), gs, tm, bv; [s, gs] = poe(s, 0, 'Greatsword'); [s, tm] = poe(s, 0, 'Trusty Machete'); [s, bv] = poe(s, 0, 'Benalish Veteran'); s = terras(s, 'Plains', 5);
  s = tudo(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === gs && a.targets[0].oid === bv)[0]));
  s = tudo(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === tm && a.targets[0].oid === bv)[0]));
  assert.equal(E.stats(s, s.objects[bv]).power, 7); assert.equal(E.stats(s, s.objects[bv]).toughness, 3);
  let t = mesa(), tf; [t, tf] = poe(t, 0, 'Thornwind Faeries'); t = J(t); t.objects[tf].sick = false;
  t = tudo(act(t, legais(t, 0, a => a.t === 'activate' && a.oid === tf && a.targets[0].player === 1)[0])); assert.equal(t.players[1].life, 19);
});

test('LT157 · Emberwilde Augur: sacrifica e causa 3 ao jogador, só na sua manutenção', () => {
  let s = mesa(), ea; [s, ea] = poe(s, 0, 'Emberwilde Augur');
  assert.equal(legais(s, 0, a => a.t === 'activate' && a.oid === ea).length, 0, 'fora da manutenção');
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'upkeep' && x.turn.priority === 0 && !x.pending, 400);
  const a = legais(s, 0, x => x.t === 'activate' && x.oid === ea && x.targets[0].player === 1); assert.ok(a.length > 0);
  s = tudo(act(s, a[0])); assert.equal(s.players[1].life, 17); assert.equal(s.objects[ea].zone, 'graveyard');
});

test('LT157 · Benalish Veteran: ao atacar, +1/+1', () => {
  let s = mesa(), bv; [s, bv] = poe(s, 0, 'Benalish Veteran'); s = J(s); s.objects[bv].sick = false;
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers', 20); s = act(s, { t: 'attack', p: 0, attackers: [bv] });
  s = passaAte(s, x => !x.stack.length && !x.pending && x.turn.step !== 'declare_attackers', 10); assert.equal(E.stats(s, s.objects[bv]).power, 3);
});
