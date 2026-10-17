// M-470 · LT136 · revisão por lote CXVI: nove cartas que o leitor já lia por inteiro e que travam as listas iniciantes passam a jogar (APROVADAS).
// Textos da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json). Cobertura completa e o comportamento das frases que pedem. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Phyrexian Rager', 'Goblin Motivator', 'Font of Fertility', 'Aether Adept', "Man-o'-War", 'Solemn Offering', 'Cloudkin Seer', 'Aven Fisher', 'Luminous Bonds'];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: /^Flying/m.test(c.oracle_text) ? ['Flying'] : [], oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Mountain: terra('Mountain', 'Mountain', 'R'), Plains: terra('Plains', 'Plains', 'W'), Island: terra('Island', 'Island', 'U'), Swamp: terra('Swamp', 'Swamp', 'B'), Forest: terra('Forest', 'Forest', 'G') });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: C[name].type_line.startsWith('Basic Land') ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 140, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Mountain', 'Plains', 'Island', 'Swamp', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Forest', 'Font of Fertility']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const tudo = s => { for (let i = 0; i < 80 && (s.stack.length || s.pending); i++) { const pk = s.pending; const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pass') || l[0]); } return s; };
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };

const sim = s => { for (let i = 0; i < 80 && (s.stack.length || s.pending); i++) { const pk = s.pending; const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'yes' || x.t === 'accept') || l.find(x => x.t === 'pass') || l[0]); } return s; };

test('LT136 · as nove jogam pelo leitor aprovado', () => {
  for (const n of NOMES) { assert.equal(S.coverage(C[n]).level, 'completo', n); assert.equal(S.APROVADAS[n].leva, 'M-470', n); }
});

test('LT136 · Phyrexian Rager compra e perde 1; Cloudkin Seer compra ao entrar', () => {
  let s = mesa(), pr; [s, pr] = poe(s, 0, 'Phyrexian Rager', 'hand'); s = terras(s, 'Swamp', 3); const m0 = s.zones[0].hand.length;
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === pr)[0]));
  assert.equal(s.objects[pr].zone, 'battlefield'); assert.equal(s.zones[0].hand.length, m0 - 1 + 1); assert.equal(s.players[0].life, 19);
  let t = mesa(), cs; [t, cs] = poe(t, 0, 'Cloudkin Seer', 'hand'); t = terras(t, 'Island', 3); const n0 = t.zones[0].hand.length;
  t = tudo(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === cs)[0])); assert.equal(t.zones[0].hand.length, n0 - 1 + 1); assert.equal(t.players[0].life, 20);
});

test("LT136 · Man-o'-War e Aether Adept devolvem a criatura alvo à mão do dono", () => {
  for (const [n, terra] of [["Man-o'-War", 3], ['Aether Adept', 3]]) {
    let s = mesa(), mw, u; [s, mw] = poe(s, 0, n, 'hand'); [s, u] = poe(s, 1, 'Urso'); s = terras(s, 'Island', terra);
    s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === mw)[0]);
    for (let i = 0; i < 40 && (s.stack.length || s.pending); i++) { const pk = s.pending; if (pk && pk.kind === 'pick_target') { s = act(s, { t: 'pick_target', p: pk.p, index: pk.options.findIndex(o => o.oid === u) }); continue; } s = act(s, legais(s, pk ? pk.p : s.turn.priority).find(x => x.t === 'pass') || legais(s, pk ? pk.p : s.turn.priority)[0]); }
    assert.equal(s.objects[u].zone, 'hand', n); assert.ok(s.zones[1].hand.includes(u), n + ': mão do dono');
  }
});

test('LT136 · Font of Fertility busca um terreno básico que entra virado; Solemn Offering destrói e ganha 4', () => {
  let s = mesa(), ff; [s, ff] = poe(s, 0, 'Font of Fertility'); s = terras(s, 'Forest', 2); const campo0 = s.zones[0].battlefield.length;
  s = sim(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === ff)[0]));
  assert.equal(s.objects[ff].zone, 'graveyard');
  const novas = s.zones[0].battlefield.filter(o => /Basic Land/.test(C[s.objects[o].name].type_line) && s.objects[o].tapped);
  assert.equal(s.zones[0].battlefield.length, campo0 - 1 + 1); assert.ok(novas.length >= 2, 'a buscada entra virada (as duas Florestas pagaram)');
  let t = mesa(), so, f2; [t, f2] = poe(t, 1, 'Font of Fertility'); [t, so] = poe(t, 0, 'Solemn Offering', 'hand'); t = terras(t, 'Plains', 3);
  t = tudo(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === so && a.targets[0].oid === f2)[0]));
  assert.equal(t.objects[f2].zone, 'graveyard'); assert.equal(t.players[0].life, 24);
});

test('LT136 · Luminous Bonds: a criatura encantada não ataca nem bloqueia; Goblin Motivator dá ímpeto', () => {
  let s = mesa(), lb, u; [s, u] = poe(s, 1, 'Urso'); [s, lb] = poe(s, 0, 'Luminous Bonds', 'hand'); s = terras(s, 'Plains', 3);
  assert.ok(E.eligibleBlockers(s, 1).includes(u), 'antes bloqueia');
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === lb && a.targets[0].oid === u)[0]));
  assert.equal(s.objects[lb].zone, 'battlefield'); assert.ok(!E.eligibleBlockers(s, 1).includes(u), 'não bloqueia');
  let m = J(s); m.turn.active = 1; assert.ok(!E.eligibleAttackers(m, 1).includes(u), 'não ataca');
  let t = mesa(), gm, r; [t, gm] = poe(t, 0, 'Goblin Motivator'); [t, r] = poe(t, 0, 'Phyrexian Rager', 'hand'); t = terras(t, 'Swamp', 3);
  t = tudo(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === r)[0])); assert.ok(!E.eligibleAttackers(t, 0).includes(r), 'enjoo');
  t = tudo(act(t, legais(t, 0, a => a.t === 'activate' && a.oid === gm && a.targets[0].oid === r)[0])); assert.ok(E.eligibleAttackers(t, 0).includes(r), 'com ímpeto');
});

test('LT136 · Aven Fisher: ao morrer, o dono pode comprar (opcional)', () => {
  let s = mesa(), af; [s, af] = poe(s, 0, 'Aven Fisher');
  let m = J(s); m.objects[af].damage = 9; const h0 = m.zones[0].hand.length; m = act(m, { t: 'pass', p: 0 });
  for (let i = 0; i < 6 && !(m.pending && m.pending.kind === 'may_pay'); i++) m = act(m, { t: 'pass', p: m.turn.priority });
  assert.equal(m.objects[af].zone, 'graveyard'); assert.equal(m.pending.kind, 'may_pay'); assert.equal(m.pending.p, 0);
  assert.equal(tudo(act(m, { t: 'pay', p: 0 })).zones[0].hand.length, h0 + 1, 'aceita: compra');
  assert.equal(tudo(act(m, { t: 'decline', p: 0 })).zones[0].hand.length, h0, 'recusa: não compra');
});
