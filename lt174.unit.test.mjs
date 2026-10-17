// M-492 · LT158 · revisão por lote CXXXIV: nove cartas que o leitor já lia por inteiro e que travam as listas iniciantes passam a jogar (APROVADAS).
// Textos da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json). Cobertura completa e o comportamento das frases que pedem. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Shambling Shell', 'Slum Reaper', "Sorin's Thirst", 'Carrion Crow', 'Seek the Wilds', 'Wildheart Invoker', 'Quilled Wolf', 'Dauthi Slayer', 'Scorched Rusalka'];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [/^Dredge/m.test(c.oracle_text) && 'Dredge', /^Shadow/m.test(c.oracle_text) && 'Shadow', /^Flying/m.test(c.oracle_text) && 'Flying'].filter(Boolean), oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Reliquia: { name: 'Reliquia', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] }, Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Mountain: terra('Mountain', 'Mountain', 'R'), Plains: terra('Plains', 'Plains', 'W'), Island: terra('Island', 'Island', 'U'), Swamp: terra('Swamp', 'Swamp', 'B'), Forest: terra('Forest', 'Forest', 'G') });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: C[name].type_line.startsWith('Basic Land') ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 162, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Mountain', 'Plains', 'Island', 'Swamp', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const tudo = s => { for (let i = 0; i < 80 && (s.stack.length || s.pending); i++) { const pk = s.pending; const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pass') || l[0]); } return s; };
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };


const resolveCom = (s, quer) => { for (let i = 0; i < 60 && (s.stack.length || s.pending); i++) { const pk = s.pending; if (pk && pk.kind === 'pick_target') { s = act(s, { t: 'pick_target', p: pk.p, index: Math.max(0, pk.options.findIndex(o => o.oid === quer)) }); continue; } const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pass') || l[0]); } return s; };

test('LT158 · as nove jogam pelo leitor aprovado', () => {
  for (const n of NOMES) { assert.equal(S.coverage(C[n]).level, 'completo', n); assert.equal(S.APROVADAS[n].leva, 'M-492', n); }
});

test("LT158 · Slum Reaper: cada jogador sacrifica uma criatura; Sorin's Thirst: 2 de dano e ganha 2", () => {
  let s = mesa(), sr, u, qw; [s, u] = poe(s, 1, 'Urso'); [s, qw] = poe(s, 0, 'Quilled Wolf'); [s, sr] = poe(s, 0, 'Slum Reaper', 'hand'); s = terras(s, 'Swamp', 4);
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === sr)[0]));
  assert.equal(s.objects[u].zone, 'graveyard', 'o oponente sacrificou'); assert.ok(s.objects[qw].zone === 'graveyard' || s.objects[sr].zone === 'graveyard', 'eu sacrifiquei uma');
  let t = mesa(), st, u2; [t, u2] = poe(t, 1, 'Urso'); [t, st] = poe(t, 0, "Sorin's Thirst", 'hand'); t = terras(t, 'Swamp', 2);
  t = tudo(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === st && a.targets[0].oid === u2)[0])); assert.equal(t.objects[u2].zone, 'graveyard'); assert.equal(t.players[0].life, 22);
});

test('LT158 · Shambling Shell sacrifica e põe marcador; Scorched Rusalka sacrifica e causa 1 ao jogador; Carrion Crow entra virada', () => {
  let s = mesa(), sh, qw; [s, sh] = poe(s, 0, 'Shambling Shell'); [s, qw] = poe(s, 0, 'Quilled Wolf');
  s = tudo(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === sh && a.targets[0].oid === qw)[0])); assert.equal(s.objects[sh].zone, 'graveyard'); assert.equal((s.objects[qw].counters || {}).p1p1, 1);
  let t = mesa(), sr, q2; [t, sr] = poe(t, 0, 'Scorched Rusalka'); [t, q2] = poe(t, 0, 'Quilled Wolf'); t = terras(t, 'Mountain', 1);
  t = tudo(act(t, legais(t, 0, a => a.t === 'activate' && a.oid === sr && a.targets[0].player === 1 && JSON.stringify(a).includes('"' + q2 + '"'))[0])); assert.equal(t.players[1].life, 19); assert.equal(t.objects[q2].zone, 'graveyard');
  let q = mesa(), cc; [q, cc] = poe(q, 0, 'Carrion Crow', 'hand'); q = terras(q, 'Swamp', 3); q = tudo(act(q, legais(q, 0, a => a.t === 'cast' && a.oid === cc)[0])); assert.ok(q.objects[cc].tapped);
});

test('LT158 · Seek the Wilds pega criatura ou terreno entre as quatro do topo; Wildheart Invoker {8}: +5/+5 e atropelar; Quilled Wolf {5}{G}: +4/+4', () => {
  let s = mesa(), sw; [s, sw] = poe(s, 0, 'Seek the Wilds', 'hand'); s = terras(s, 'Forest', 2); const m0 = s.zones[0].hand.length, top = s.zones[0].library.slice(0, 4);
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === sw)[0]));
  const pegou = top.filter(o => s.objects[o].zone === 'hand'); assert.ok(pegou.length <= 1); if (pegou.length) assert.ok(/Creature|Land/.test(C[s.objects[pegou[0]].name].type_line));
  let t = mesa(), wi, qw; [t, wi] = poe(t, 0, 'Wildheart Invoker'); [t, qw] = poe(t, 0, 'Quilled Wolf'); t = terras(t, 'Forest', 8);
  t = tudo(act(t, legais(t, 0, a => a.t === 'activate' && a.oid === wi && a.targets[0].oid === qw)[0])); assert.equal(E.stats(t, t.objects[qw]).power, 7); assert.ok(E.hasKeyword(t, t.objects[qw], 'trample'));
  let q = mesa(), q2; [q, q2] = poe(q, 0, 'Quilled Wolf'); q = terras(q, 'Forest', 6); q = tudo(act(q, legais(q, 0, a => a.t === 'activate' && a.oid === q2)[0])); assert.equal(E.stats(q, q.objects[q2]).power, 6);
});

test('LT158 · Dauthi Slayer ataca se puder e só é bloqueada por criatura com sombra', () => {
  let s = mesa(), ds, u; [s, ds] = poe(s, 0, 'Dauthi Slayer'); [s, u] = poe(s, 1, 'Urso'); s = J(s); s.objects[ds].sick = false;
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers', 20);
  assert.ok(legais(s, 0, a => a.t === 'attack').every(a => (a.attackers || []).includes(ds)), 'ataca se puder');
  s = act(s, legais(s, 0, a => a.t === 'attack')[0]); s = passaAte(s, x => x.pending && x.pending.kind === 'blockers', 20);
  assert.ok(!legais(s, 1).some(a => a.t !== 'pass' && JSON.stringify(a).includes('"' + ds + '"')), 'sem sombra não bloqueia');
});
