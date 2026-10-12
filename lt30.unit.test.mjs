// M-346 · LT28 · "Whenever a player casts a spell, if no (colored) mana was spent to cast it, counter that spell" (Vexing Bauble, Void Mirror;
// 601.2h, 603.4). O motor passa a anotar na mágica quanta mana (e quanta colorida) foi gasta para conjurá-la — só nas partidas com essas cartas.
// Texto oficial em .listas/oficiais-revisadas.json (Oracle do Forge, 12/10/2026). Cada teste de regra falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, comMana, tudo, CARTAS } from './cmd.mjs';
import { loadModules } from './_load.mjs';

const { leitor: L, scripts: S } = loadModules();
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const mv = m => [...m.matchAll(/\{([^}]+)\}/g)].reduce((n, x) => n + (/^\d+$/.test(x[1]) ? +x[1] : 1), 0);
const carta = n => { const c = OF.find(x => x.name === n); assert.ok(c, n); return { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: mv(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: [...new Set(c.mana_cost.match(/[WUBRG]/g) || [])] }; };
const NOMES = ['Vexing Bauble', 'Void Mirror', 'Bitter Triumph'];
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: mv(mana_cost), keywords: [], oracle_text: '', colors: [...new Set(mana_cost.match(/[WUBRG]/g) || [])], ...extra });
const cards = { ...Object.fromEntries(NOMES.map(n => [n, carta(n)])), Zero: c0('Zero', 'Artifact', '{0}'), Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2' }), Um: c0('Um', 'Artifact', '{1}'), Azul: c0('Azul', 'Artifact', '{U}') };
const ex = { action: 'etb', target: 'none', expect: { attached: false } };
const scripts = Object.fromEntries(NOMES.map(n => [n, { ...L.ler(carta(n)).script, example: ex }]));
function mesaX(a = [], b = [], seed = 43) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: { ...CARTAS, ...cards }, scripts, first: 0, players: [{ name: 'A', deck: baralho([...a, 'Island', 'Plains']) }, { name: 'B', deck: baralho([...b, 'Island', 'Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => tudo(act(act(s, { t: 'pass', p: s.turn.priority }), { t: 'pass', p: 1 - s.turn.priority }));
const lanca = (s, oid, mana) => { const m = comMana(s, mana); return act(m, legais(m, 0, x => x.t === 'cast' && x.oid === oid)[0]); };

test('LT28 · Vexing Bauble: mágica conjurada sem gastar mana é anulada (de qualquer jogador); com mana, não', () => {
  let s = mesaX(['Zero', 'Um'], ['Vexing Bauble']), z, u;
  [s] = poe(s, 1, 'Vexing Bauble'); [s, z] = poe(s, 0, 'Zero', 'hand'); [s, u] = poe(s, 0, 'Um', 'hand');
  let t = lanca(s, z, '');
  assert.equal(t.stack.length, 2, 'o gatilho foi para a pilha');
  t = resolve(t); t = resolve(t);
  assert.equal(t.objects[z].zone, 'graveyard', 'Zero anulada');
  let r = resolve(lanca(s, u, 'C'));
  assert.equal(r.objects[u].zone, 'battlefield', 'pagou {1}: não dispara');
});

test('LT28 · Void Mirror: sem mana colorida (só {C}) é anulada; com {U}, não', () => {
  let s = mesaX(['Um', 'Azul'], ['Void Mirror']), u, a;
  [s] = poe(s, 1, 'Void Mirror'); [s, u] = poe(s, 0, 'Um', 'hand'); [s, a] = poe(s, 0, 'Azul', 'hand');
  let t = lanca(s, u, 'C'); assert.equal(t.stack.length, 2); t = resolve(resolve(t));
  assert.equal(t.objects[u].zone, 'graveyard', '{C}: anulada');
  const r = resolve(lanca(s, a, 'U')); assert.equal(r.objects[a].zone, 'battlefield', '{U}: fica');
});

test('LT28 · Bitter Triumph: custo adicional à escolha — descartar uma carta ou pagar 3 de vida (601.2b, 119.4)', () => {
  let s = mesaX(['Bitter Triumph', 'Zero'], ['Urso']), bt, z, u;
  [s, bt] = poe(s, 0, 'Bitter Triumph', 'hand'); [s, z] = poe(s, 0, 'Zero', 'hand'); [s, u] = poe(s, 1, 'Urso');
  const m = comMana(s, 'BB'), os = legais(m, 0, x => x.t === 'cast' && x.oid === bt && x.targets && x.targets[0].oid === u);
  const vida = os.find(x => x.add === 1), desc = os.find(x => x.add === 0 && x.pay && [].concat(x.pay.discard)[0] === z);
  assert.ok(vida && desc, 'as duas formas');
  const v = s.players[0].life;
  let t = resolve(act(m, vida)); assert.equal(t.players[0].life, v - 3); assert.equal(t.objects[u].zone, 'graveyard'); assert.equal(t.objects[z].zone, 'hand');
  t = resolve(act(m, desc)); assert.equal(t.players[0].life, v); assert.equal(t.objects[z].zone, 'graveyard');
  const pouca = J(m); pouca.players[0].life = 2;
  assert.ok(!legais(pouca, 0, x => x.t === 'cast' && x.oid === bt && x.add === 1).length, 'com 2 de vida não paga 3');
});

test('achado da revisão do lote XIX · 601.2h: mágica conjurada pela insanidade, paga com {R}, conta a mana gasta (Vexing Bauble não a anula)', () => {
  let s = mesaX(['Bitter Triumph', 'Fiery Temper'], ['Urso', 'Vexing Bauble']), bt, ft, u;
  [s] = poe(s, 1, 'Vexing Bauble'); [s, bt] = poe(s, 0, 'Bitter Triumph', 'hand'); [s, ft] = poe(s, 0, 'Fiery Temper', 'hand'); [s, u] = poe(s, 1, 'Urso');
  const m = comMana(s, 'BBR');
  let t = act(m, legais(m, 0, x => x.t === 'cast' && x.oid === bt && x.add === 0 && x.pay && [].concat(x.pay.discard)[0] === ft)[0]);
  for (let i = 0; i < 3 && !(t.pending && t.pending.kind === 'madness'); i++) t = act(act(t, { t: 'pass', p: t.turn.priority }), { t: 'pass', p: 1 - t.turn.priority }); // K-74 · 702.35a: o gatilho da insanidade resolve antes da pergunta
  const cm = legais(t, 0, x => x.t === 'cast_madness'); assert.ok(cm.length, 'insanidade oferecida');
  t = act(t, cm.find(x => x.targets && x.targets[0].player === 1) || cm[0]);
  assert.ok(!t.stack.map(o => t.objects[o].name).includes('Vexing Bauble'), 'a Bauble não dispara');
});

test('achado da revisão do lote XIX · mesa assistida sem cobrança de mana: sem saber a mana gasta, a Bauble não anula nada (declarado)', () => {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 12, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 5, mode: 'assisted', manaCheck: false, cards: { ...CARTAS, ...cards }, scripts, first: 0, players: [{ name: 'A', deck: baralho(['Um', 'Island']) }, { name: 'B', deck: baralho(['Vexing Bauble', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  let u; [s] = poe(s, 1, 'Vexing Bauble'); [s, u] = poe(s, 0, 'Um', 'hand');
  assert.equal(s.manaCheck, false);
  const t = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === u)[0]);
  assert.equal(t.stack.length, 1, 'só a mágica na pilha');
});

test('M-346 · as do lote XIX revisadas jogam (decisão A)', () => {
  for (const n of [...NOMES, 'Cinder Barrens', 'Gruul Signet', "Chemister's Insight", "Serra's Embrace"]) assert.equal(S.coverage(carta(n)).level, 'completo', n + ' joga');
});
