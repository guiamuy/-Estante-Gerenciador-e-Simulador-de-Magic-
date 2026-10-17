// M-454 · LT120 · correções da revisão independente de M-443…M-446: (1) o nome curto (201.5c) só na lendária e nunca dentro do nome de outro objeto
// ("Koma's Coil"); (2) Raphael não dispara com a criatura do oponente entrando de verdade (o teste do lt126 usava `poe`); (3) recompra junto com
// convocar no Sprout Swarm (702.51a, 601.2f); (4) conjurada sem pagar, a redução alcança o {5} da Lightning Axe (601.2f, 118.9d). Textos da Scryfall
// (.listas/oficiais-revisadas.json). Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';
import { loadModules } from './_load.mjs';
const { leitor: L } = loadModules();
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const of = (n, extra = {}) => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}), ...extra }; };
const k = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: valorDeMana(mana_cost), keywords: [], oracle_text: '', colors: [...new Set((mana_cost.match(/[WUBRG]/g) || []))], ...extra });
const C = { 'Raphael, Tough Turtle': of('Raphael, Tough Turtle', { keywords: ['Alliance'] }), 'Sprout Swarm': of('Sprout Swarm', { keywords: ['Convoke', 'Buyback'] }),
  'Lightning Axe': of('Lightning Axe'), 'Goblin Anarchomancer': of('Goblin Anarchomancer'),
  Cascateira: k('Cascateira', 'Creature — Test', '{3}{R}', { keywords: ['Cascade'], oracle_text: 'Cascade', power: '3', toughness: '3' }),
  Urso: k('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2' }), Soldado: k('Soldado', 'Creature — Soldier', '{W}', { power: '1', toughness: '1' }),
  Golem: k('Golem', 'Artifact Creature — Golem', '{3}', { power: '3', toughness: '3' }),
  Forest: k('Forest', 'Basic Land — Forest', '', { oracle_text: '({T}: Add {G}.)' }), Mountain: k('Mountain', 'Basic Land — Mountain', '', { oracle_text: '({T}: Add {R}.)' }) };
function mesa(a, b2, seed = 61) {
  const b = ns => ns.map(name => ({ name, qty: /Forest|Mountain/.test(name) ? 20 : 6, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b(a) }, { name: 'B', deck: b(b2) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending, 40);
const maoSo = (s, keep) => { s = J(s); const z = s.zones[0]; for (const o of z.hand.filter(o => !keep.includes(o))) { z.hand.splice(z.hand.indexOf(o), 1); z.library.push(o); s.objects[o].zone = 'library'; } return s; };
const frases = (name, type_line, oracle_text) => L.ler({ name, type_line, mana_cost: '{1}', oracle_text, keywords: [], colors: [], power: '1', toughness: '1' }).frases.map(f => f.texto).join(' | ');

test('LT120 · nome curto: só na lendária; "Tafa\'s Coil" é o nome de outro objeto e fica', () => {
  assert.match(frases('Tafa, Teste Vivo', 'Creature — Test', 'Whenever another creature you control enters, Tafa deals 1 damage to target opponent.'), /Tafa deals/);
  const t = frases('Tafa, Teste Vivo', 'Legendary Creature — Test', 'Whenever Tafa attacks, create a 1/1 blue Serpent creature token named Tafa\'s Coil.');
  assert.match(t, /named Tafa's Coil/); assert.match(t, /Whenever ~ attacks/);
});

test('LT120 · Raphael: a criatura do oponente conjurada e resolvida no turno dele não dispara', () => {
  let s = mesa(['Raphael, Tough Turtle', 'Forest'], ['Urso', 'Forest']), r, u; [s, r] = poe(s, 0, 'Raphael, Tough Turtle');
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  [s, u] = poe(s, 1, 'Urso', 'hand'); for (let i = 0; i < 2; i++) [s] = poe(s, 1, 'Forest');
  s = resolve(act(s, legais(s, 1, a => a.t === 'cast' && a.oid === u)[0])); s = passaAte(s, x => !x.stack.length && !x.pending, 40);
  assert.equal(s.objects[u].zone, 'battlefield'); assert.equal(s.players[1].life, 20); assert.equal(s.players[0].life, 20);
});

test('LT120 · Sprout Swarm: recompra com convocar é oferecida e paga (duas Florestas + Urso, Soldado e Golem viram)', () => {
  let s = mesa(['Sprout Swarm', 'Urso', 'Soldado', 'Golem', 'Forest'], ['Urso', 'Forest']), sw; [s, sw] = poe(s, 0, 'Sprout Swarm', 'hand');
  for (const n of ['Urso', 'Soldado', 'Golem']) [s] = poe(s, 0, n); for (let i = 0; i < 2; i++) [s] = poe(s, 0, 'Forest');
  s = J(s); for (const o of s.zones[0].battlefield) s.objects[o].sick = false;
  const a = legais(s, 0, x => x.t === 'cast' && x.oid === sw && x.recompraK && x.tapaK);
  assert.ok(a.length > 0, 'oferece recompra com convocar');
  const t = resolve(act(s, a[a.length - 1]));
  assert.equal(t.objects[sw].zone, 'hand'); assert.equal(t.zones[0].battlefield.filter(o => t.objects[o].name === 'Saproling').length, 1);
});

test('LT120 · cascata revela a Axe: com Anarchomancer, "pay {5}" sem pagar custa {4} — oferecido com quatro Montanhas e cobra quatro', () => {
  let s = mesa(['Lightning Axe', 'Goblin Anarchomancer', 'Cascateira', 'Mountain'], ['Urso', 'Mountain'], 55), cs, u; [s, cs] = poe(s, 0, 'Cascateira', 'hand'); [s] = poe(s, 0, 'Goblin Anarchomancer'); [s, u] = poe(s, 1, 'Urso');
  for (let i = 0; i < 7; i++) [s] = poe(s, 0, 'Mountain'); s = maoSo(s, [cs]);
  s = J(s); const lib = s.zones[0].library; const ax = lib.find(o => s.objects[o].name === 'Lightning Axe'); lib.splice(lib.indexOf(ax), 1); lib.unshift(ax);
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === cs)[0]); for (let i = 0; i < 6 && !(s.pending && s.pending.kind === 'free_cast'); i++) s = act(s, { t: 'pass', p: s.turn.priority });
  assert.equal(s.pending && s.pending.kind, 'free_cast');
  const livres = s.zones[0].battlefield.filter(o => s.objects[o].name === 'Mountain' && !s.objects[o].tapped).length; assert.equal(livres, 4, 'a Cascateira ({3}{R} com redução 1) virou três de sete');
  const fr = legais(s, 0, a => a.t === 'cast_free' && a.oid === ax && a.add === 1); assert.ok(fr.length > 0, 'oferece "pay {5}" com quatro Montanhas');
  const t = resolve(act(s, fr.find(a => a.targets && a.targets[0].oid === u) || fr[0]));
  assert.equal(t.zones[0].battlefield.filter(o => t.objects[o].name === 'Mountain' && !t.objects[o].tapped).length, 0); assert.equal(t.objects[u].zone, 'graveyard');
});
