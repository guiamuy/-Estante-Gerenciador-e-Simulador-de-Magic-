// M-476 · LT142 · revisão por lote CXXI: nove cartas que o leitor já lia por inteiro e que travam as listas iniciantes passam a jogar (APROVADAS).
// Textos da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json). Cobertura completa e o comportamento das frases que pedem. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Torch Fiend', 'Goblin Glider', 'Blighted Gorge', 'Rot Shambler', 'Searing Touch', 'Throttle', 'Pyrite Spellbomb', 'Sylvan Might', 'Wee Dragonauts'];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [/^Flying/m.test(c.oracle_text) && 'Flying', /^Buyback/m.test(c.oracle_text) && 'Buyback', /^Flashback/m.test(c.oracle_text) && 'Flashback'].filter(Boolean), oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Mountain: terra('Mountain', 'Mountain', 'R'), Plains: terra('Plains', 'Plains', 'W'), Island: terra('Island', 'Island', 'U'), Swamp: terra('Swamp', 'Swamp', 'B'), Forest: terra('Forest', 'Forest', 'G') });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: C[name].type_line.startsWith('Basic Land') ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 146, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Mountain', 'Plains', 'Island', 'Swamp', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Forest', 'Pyrite Spellbomb', 'Goblin Glider']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const tudo = s => { for (let i = 0; i < 80 && (s.stack.length || s.pending); i++) { const pk = s.pending; const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pass') || l[0]); } return s; };
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };


const resolveCom = (s, quer) => { for (let i = 0; i < 60 && (s.stack.length || s.pending); i++) { const pk = s.pending; if (pk && pk.kind === 'pick_target') { s = act(s, { t: 'pick_target', p: pk.p, index: Math.max(0, pk.options.findIndex(o => o.oid === quer)) }); continue; } const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pass') || l[0]); } return s; };

test('LT142 · as nove jogam pelo leitor aprovado', () => {
  for (const n of NOMES) { assert.equal(S.coverage(C[n]).level, 'completo', n); assert.equal(S.APROVADAS[n].leva, 'M-476', n); }
});

test('LT142 · Searing Touch: 1 de dano; com recompra {4} volta para a mão, sem ela vai para o cemitério', () => {
  let s = mesa(), st; [s, st] = poe(s, 0, 'Searing Touch', 'hand'); s = terras(s, 'Mountain', 5);
  const cs = legais(s, 0, a => a.t === 'cast' && a.oid === st && a.targets[0].player === 1);
  const com = cs.find(a => JSON.stringify(a).match(/buyback|recompra/i)); assert.ok(com, JSON.stringify(cs.slice(0, 3)));
  const a = tudo(act(s, com)); assert.equal(a.players[1].life, 19); assert.equal(a.objects[st].zone, 'hand');
  const b = tudo(act(s, cs.find(x => x !== com && !JSON.stringify(x).match(/buyback|recompra/i)))); assert.equal(b.players[1].life, 19); assert.equal(b.objects[st].zone, 'graveyard');
});

test('LT142 · Pyrite Spellbomb ({R}: 2 de dano; {1}: compra) e Blighted Gorge ({4}{R}, vira e sacrifica: 2 de dano)', () => {
  let s = mesa(), ps; [s, ps] = poe(s, 0, 'Pyrite Spellbomb'); s = terras(s, 'Mountain', 1);
  s = tudo(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === ps && a.index === 0 && a.targets[0].player === 1)[0])); assert.equal(s.players[1].life, 18); assert.equal(s.objects[ps].zone, 'graveyard');
  let t = mesa(), p2; [t, p2] = poe(t, 0, 'Pyrite Spellbomb'); t = terras(t, 'Island', 1); const m0 = t.zones[0].hand.length;
  t = tudo(act(t, legais(t, 0, a => a.t === 'activate' && a.oid === p2 && a.index === 1)[0])); assert.equal(t.zones[0].hand.length, m0 + 1);
  let q = mesa(), bg; [q, bg] = poe(q, 0, 'Blighted Gorge'); q = terras(q, 'Mountain', 5);
  q = tudo(act(q, legais(q, 0, a => a.t === 'activate' && a.oid === bg && a.targets && a.targets[0].player === 1)[0])); assert.equal(q.players[1].life, 18); assert.equal(q.objects[bg].zone, 'graveyard');
});

test('LT142 · Wee Dragonauts ganha +2/+0 ao conjurar instantânea; Throttle dá -4/-4', () => {
  let s = mesa(), wd, th, u; [s, wd] = poe(s, 0, 'Wee Dragonauts'); [s, u] = poe(s, 1, 'Urso'); [s, th] = poe(s, 0, 'Throttle', 'hand'); s = terras(s, 'Swamp', 5);
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === th && a.targets[0].oid === u)[0]);
  s = tudo(s); assert.equal(s.objects[u].zone, 'graveyard'); assert.equal(E.stats(s, s.objects[wd]).power, 3);
});

test('LT142 · Torch Fiend destrói o artefato alvo; Goblin Glider não bloqueia', () => {
  let s = mesa(), tf, ps; [s, tf] = poe(s, 0, 'Torch Fiend'); [s, ps] = poe(s, 1, 'Pyrite Spellbomb'); s = terras(s, 'Mountain', 1);
  s = tudo(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === tf && a.targets[0].oid === ps)[0])); assert.equal(s.objects[ps].zone, 'graveyard'); assert.equal(s.objects[tf].zone, 'graveyard');
  let t = mesa(), gg; [t, gg] = poe(t, 1, 'Goblin Glider'); assert.ok(!E.eligibleBlockers(t, 1).includes(gg));
});

test('LT142 · Rot Shambler: marcador quando outra criatura sua morre; Sylvan Might volta com lampejo do passado (+2/+2 e atropelar)', () => {
  let s = mesa(), rs, gg; [s, rs] = poe(s, 0, 'Rot Shambler'); [s, gg] = poe(s, 0, 'Goblin Glider');
  let m = J(s); m.objects[gg].damage = 9; m = tudo(act(m, { t: 'pass', p: 0 })); assert.equal(m.objects[gg].zone, 'graveyard'); assert.equal(E.stats(m, m.objects[rs]).power, 2);
  let t = mesa(), sm, r2; [t, r2] = poe(t, 0, 'Rot Shambler'); [t, sm] = poe(t, 0, 'Sylvan Might', 'graveyard'); t = terras(t, 'Forest', 4);
  const fb = legais(t, 0, a => a.oid === sm && a.targets && a.targets[0].oid === r2); assert.ok(fb.length > 0, 'lampejo do passado');
  t = tudo(act(t, fb[0])); assert.equal(t.objects[sm].zone, 'exile'); assert.equal(E.stats(t, t.objects[r2]).power, 3); assert.ok(E.hasKeyword(t, t.objects[r2], 'trample'));
});
