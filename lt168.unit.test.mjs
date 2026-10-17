// M-486 · LT152 · revisão por lote CXXVIII: nove cartas que o leitor já lia por inteiro e que travam as listas iniciantes passam a jogar (APROVADAS).
// Textos da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json). Cobertura completa e o comportamento das frases que pedem. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Phyrexian Gargantua', "Evincar's Justice", "Jedit's Dragoons", 'Ingot Chewer', 'Pyre Charger', 'River Boa', 'Uthden Troll', 'Phyrexian Ghoul', 'Weakness'];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [/^Flying/m.test(c.oracle_text) && 'Flying', /^Buyback/m.test(c.oracle_text) && 'Buyback', /^Evoke/m.test(c.oracle_text) && 'Evoke', /^Haste$/m.test(c.oracle_text) && 'Haste', /^Vigilance$/m.test(c.oracle_text) && 'Vigilance', /^Islandwalk/m.test(c.oracle_text) && 'Islandwalk', /^Flashback/m.test(c.oracle_text) && 'Flashback'].filter(Boolean), oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Reliquia: { name: 'Reliquia', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] }, Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Mountain: terra('Mountain', 'Mountain', 'R'), Plains: terra('Plains', 'Plains', 'W'), Island: terra('Island', 'Island', 'U'), Swamp: terra('Swamp', 'Swamp', 'B'), Forest: terra('Forest', 'Forest', 'G') });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: C[name].type_line.startsWith('Basic Land') ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 156, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Mountain', 'Plains', 'Island', 'Swamp', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Forest', 'Island', 'Reliquia']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const tudo = s => { for (let i = 0; i < 80 && (s.stack.length || s.pending); i++) { const pk = s.pending; const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pass') || l[0]); } return s; };
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };


const resolveCom = (s, quer) => { for (let i = 0; i < 60 && (s.stack.length || s.pending); i++) { const pk = s.pending; if (pk && pk.kind === 'pick_target') { s = act(s, { t: 'pick_target', p: pk.p, index: Math.max(0, pk.options.findIndex(o => o.oid === quer)) }); continue; } const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pass') || l[0]); } return s; };

test('LT152 · as nove jogam pelo leitor aprovado', () => {
  for (const n of NOMES) { assert.equal(S.coverage(C[n]).level, 'completo', n); assert.equal(S.APROVADAS[n].leva, 'M-486', n); }
});

test("LT152 · Evincar's Justice: 2 em cada criatura e cada jogador; com recompra {3} volta para a mão", () => {
  let s = mesa(), ej, u, pg; [s, u] = poe(s, 1, 'Urso'); [s, pg] = poe(s, 0, 'Phyrexian Ghoul'); [s, ej] = poe(s, 0, "Evincar's Justice", 'hand'); s = terras(s, 'Swamp', 7);
  const cs = legais(s, 0, a => a.t === 'cast' && a.oid === ej); const com = cs.find(a => JSON.stringify(a).match(/buyback|recompra/i)); assert.ok(com);
  const a = tudo(act(s, com)); assert.equal(a.objects[u].zone, 'graveyard'); assert.equal(a.objects[pg].zone, 'graveyard'); assert.equal(a.players[0].life, 18); assert.equal(a.players[1].life, 18); assert.equal(a.objects[ej].zone, 'hand');
  const b = tudo(act(s, cs.find(x => !JSON.stringify(x).match(/buyback|recompra/i)))); assert.equal(b.objects[ej].zone, 'graveyard');
});

test("LT152 · Phyrexian Gargantua compra duas e perde 2; Jedit's Dragoons ganha 4; Ingot Chewer evocada destrói artefato", () => {
  let s = mesa(), pg; [s, pg] = poe(s, 0, 'Phyrexian Gargantua', 'hand'); s = terras(s, 'Swamp', 6); const m0 = s.zones[0].hand.length;
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === pg)[0])); assert.equal(s.zones[0].hand.length, m0 - 1 + 2); assert.equal(s.players[0].life, 18);
  let t = mesa(), jd; [t, jd] = poe(t, 0, "Jedit's Dragoons", 'hand'); t = terras(t, 'Plains', 6);
  t = tudo(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === jd)[0])); assert.equal(t.players[0].life, 24); assert.ok(E.hasKeyword(t, t.objects[jd], 'vigilance'));
  let q = mesa(), ic, rl; [q, rl] = poe(q, 1, 'Reliquia'); [q, ic] = poe(q, 0, 'Ingot Chewer', 'hand'); q = terras(q, 'Mountain', 1);
  const ev = legais(q, 0, a => a.t === 'cast' && a.oid === ic); assert.ok(ev.length > 0, 'evocar por {R}');
  q = resolveCom(act(q, ev[0]), rl); assert.equal(q.objects[rl].zone, 'graveyard'); assert.equal(q.objects[ic].zone, 'graveyard');
});

test('LT152 · River Boa e Uthden Troll regeneram; Weakness dá -2/-1', () => {
  for (const [n, terra] of [['River Boa', 'Forest'], ['Uthden Troll', 'Mountain']]) {
    let s = mesa(), c; [s, c] = poe(s, 0, n); s = terras(s, terra, 1);
    s = tudo(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === c)[0]));
    let m = J(s); m.objects[c].damage = 9; m = tudo(act(m, { t: 'pass', p: 0 })); assert.equal(m.objects[c].zone, 'battlefield', n + ' regenerou'); assert.ok(m.objects[c].tapped, n + ' virada');
  }
  let t = mesa(), wk, u; [t, u] = poe(t, 1, 'Urso'); [t, wk] = poe(t, 0, 'Weakness', 'hand'); t = terras(t, 'Swamp', 1);
  t = tudo(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === wk && a.targets[0].oid === u)[0])); assert.equal(E.stats(t, t.objects[u]).power, 0); assert.equal(E.stats(t, t.objects[u]).toughness, 1);
});

test('LT152 · Pyre Charger (ímpeto) ganha +1/+0 por {R}; Phyrexian Ghoul sacrifica e ganha +2/+2', () => {
  let s = mesa(), pc; [s, pc] = poe(s, 0, 'Pyre Charger', 'hand'); s = terras(s, 'Mountain', 3);
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === pc)[0])); assert.ok(E.eligibleAttackers(s, 0).includes(pc));
  s = tudo(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === pc)[0])); assert.equal(E.stats(s, s.objects[pc]).power, 2);
  let t = mesa(), pg, rb; [t, pg] = poe(t, 0, 'Phyrexian Ghoul'); [t, rb] = poe(t, 0, 'River Boa');
  t = tudo(act(t, legais(t, 0, a => a.t === 'activate' && a.oid === pg && JSON.stringify(a).includes('"' + rb + '"'))[0])); assert.equal(t.objects[rb].zone, 'graveyard'); assert.equal(E.stats(t, t.objects[pg]).power, 4);
});

test('LT152 · River Boa: não pode ser bloqueada se o defensor controla uma Ilha (islandwalk)', () => {
  let s = mesa(), rb, u, il; [s, rb] = poe(s, 0, 'River Boa'); [s, u] = poe(s, 1, 'Urso'); s = J(s); s.objects[rb].sick = false;
  const bloqueia = st => { st = passaAte(st, x => x.pending && x.pending.kind === 'attackers', 20); st = act(st, { t: 'attack', p: 0, attackers: [rb] }); st = passaAte(st, x => x.pending && x.pending.kind === 'blockers', 20); return legais(st, 1).some(a => JSON.stringify(a).includes('"' + rb + '"') && a.t !== 'pass'); };
  assert.ok(bloqueia(s), 'sem Ilha, pode bloquear');
  let t = J(s); [t, il] = poe(t, 1, 'Island'); assert.ok(!bloqueia(t), 'com Ilha, não pode');
});
