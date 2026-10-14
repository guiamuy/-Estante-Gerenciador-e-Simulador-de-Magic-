// M-407 · LT73 · "Target creature you control deals damage equal to its power to target creature you don't control" (morder): Rabid Bite ({1}{G},
// 10 listas) e Ram Through ({1}{G}, 8 listas; "If the creature you control has trample, excess damage is dealt to that creature's controller instead"),
// Bite Down e Tail Slash — Oracle do Forge, consulta de 12/10/2026; .listas/oficiais-revisadas.json; caminho de produção (APROVADAS). A criatura é a fonte
// do dano (vínculo com a vida, toque mortífero); 608.2b: com um dos alvos ilegal, não há dano. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, act, poe, legais, passaAte, CARTAS } from './cmd.mjs';
import { valorDeMana, palavrasDoTexto } from './listas.mjs';
import { loadModules } from './_load.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const of = (n, colors) => { const r = OF.find(x => x.name === n); return { name: r.name, type_line: r.type_line, mana_cost: r.mana_cost, cmc: valorDeMana(r.mana_cost), keywords: palavrasDoTexto(r.oracle_text), oracle_text: r.oracle_text, colors }; };
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: valorDeMana(mana_cost), keywords: [], oracle_text: '', colors: [], ...extra });
const cre = (name, p, t, kws = []) => c0(name, 'Creature — Beast', '{2}{G}', { power: String(p), toughness: String(t), colors: ['G'], keywords: kws, oracle_text: kws.join(', ') });
const OM = JSON.parse(readFileSync(new URL('./.listas/oficiais-motor.json', import.meta.url), 'utf8')).cartas.find(x => x.name === "Ajani's Pridemate");
const CARDS = { ...CARTAS, "Ajani's Pridemate": { name: OM.name, type_line: OM.type_line, mana_cost: OM.mana_cost, cmc: valorDeMana(OM.mana_cost), keywords: [], oracle_text: OM.oracle_text, colors: ['W'], power: OM.power, toughness: OM.toughness }, VampT: cre('VampT', 4, 4, ['Trample', 'Lifelink']), Indes: cre('Indes', 2, 2, ['Indestructible']), 'Rabid Bite': of('Rabid Bite', ['G']), 'Ram Through': of('Ram Through', ['G']), 'Bite Down': of('Bite Down', ['G']),
  Fera: cre('Fera', 5, 5, ['Trample']), Mortal: cre('Mortal', 3, 3, ['Trample', 'Deathtouch']), Vamp: cre('Vamp', 3, 3, ['Lifelink']), Urso: cre('Urso', 2, 2), Muro: cre('Muro', 0, 6) };
function mesa() {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 127, mode: 'full', cards: CARDS, first: 0,
    players: [{ name: 'A', deck: baralho(['Rabid Bite', 'Ram Through', 'Bite Down', 'Fera', 'Mortal', 'Vamp', 'VampT', "Ajani's Pridemate", 'Forest']) }, { name: 'B', deck: baralho(['Urso', 'Muro', 'Indes', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending);
const conj = (s, oid, a, b) => resolve(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === oid && x.targets[0].oid === a && x.targets[1].oid === b)[0]));

test('LT73 · Rabid Bite: a sua criatura causa dano igual ao poder dela à criatura que você não controla; alvos só nessa ordem; vínculo com a vida vale', () => {
  let s = mesa(), rb, v, u, f; [s, rb] = poe(s, 0, 'Rabid Bite', 'hand'); for (let i = 0; i < 2; i++) [s] = poe(s, 0, 'Forest'); [s, v] = poe(s, 0, 'Vamp'); [s, f] = poe(s, 0, 'Fera'); [s, u] = poe(s, 1, 'Urso');
  const pares = legais(s, 0, x => x.t === 'cast' && x.oid === rb).map(x => x.targets.map(t => t.oid).join('>'));
  assert.ok(pares.includes(`${v}>${u}`) && !pares.some(p => p.startsWith(u)) && !pares.some(p => p.endsWith('>' + v) || p.endsWith('>' + f)), pares.join(' '));
  const vida = s.players[0].life; s = conj(s, rb, v, u);
  assert.equal(s.objects[u].zone, 'graveyard'); assert.equal(s.players[0].life, vida + 3, 'a Vamp é a fonte: vínculo com a vida'); assert.equal(s.objects[v].damage || 0, 0, 'não é luta');
});

test('LT73 · 608.2b: a criatura que ia morder sai antes da resolução — sem dano', () => {
  let s = mesa(), rb, f, u; [s, rb] = poe(s, 0, 'Rabid Bite', 'hand'); for (let i = 0; i < 2; i++) [s] = poe(s, 0, 'Forest'); [s, f] = poe(s, 0, 'Fera'); [s, u] = poe(s, 1, 'Urso');
  s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === rb && x.targets[0].oid === f && x.targets[1].oid === u)[0]);
  s = JSON.parse(JSON.stringify(s)); s.zones[0].battlefield = s.zones[0].battlefield.filter(x => x !== f); s.zones[0].graveyard.push(f); s.objects[f].zone = 'graveyard'; s.objects[f].zc = (s.objects[f].zc || 0) + 1;
  s = resolve(s); assert.equal(s.objects[u].zone, 'battlefield'); assert.equal(s.objects[u].damage || 0, 0);
});

test('LT73 · Ram Through: com atropelar, o dano além do letal vai para o controlador (toque mortífero: 1 é letal); sem atropelar, tudo na criatura', () => {
  let s = mesa(), rt, f, m, u, mu; [s, rt] = poe(s, 0, 'Ram Through', 'hand'); for (let i = 0; i < 2; i++) [s] = poe(s, 0, 'Forest'); [s, f] = poe(s, 0, 'Fera'); [s, m] = poe(s, 0, 'Mortal'); [s, u] = poe(s, 1, 'Urso'); [s, mu] = poe(s, 1, 'Muro');
  const vb = s.players[1].life;
  const a = conj(s, rt, f, u); assert.equal(a.objects[u].zone, 'graveyard'); assert.equal(a.players[1].life, vb - 3, '5 de poder, 2 letais, 3 de excesso');
  const b = conj(s, rt, m, mu); assert.equal(b.objects[mu].zone, 'graveyard', 'toque mortífero'); assert.equal(b.players[1].life, vb - 2, '3 de poder, 1 letal com toque mortífero');
  const c = conj(s, rt, f, mu); assert.equal(c.objects[mu].damage, 5); assert.equal(c.players[1].life, vb, '5 no Muro 0/6: sem excesso');
  let t = mesa(), rb, f2, u2; [t, rb] = poe(t, 0, 'Rabid Bite', 'hand'); for (let i = 0; i < 2; i++) [t] = poe(t, 0, 'Forest'); [t, f2] = poe(t, 0, 'Fera'); [t, u2] = poe(t, 1, 'Urso');
  const vt = t.players[1].life; t = conj(t, rb, f2, u2); assert.equal(t.players[1].life, vt, 'Rabid Bite não tem excesso');
});

test('LT73 · leitor, validador e texto da pilha', () => {
  const M = loadModules();
  const e = M.scripts.validateScript({ name: 'W', example: { action: 'etb', target: 'none', expect: { attached: false } }, effects: [{ do: 'morde', target: { tipos: ['creature'], de: 'opponent' } }] });
  assert.ok(e.some(x => /mordedor/.test(x)), JSON.stringify(e));
  const d = M.table.descreveEfeitos([{ do: 'mordedor', target: 'creature-you-control' }, { do: 'morde', target: { tipos: ['creature'], de: 'opponent' }, excessoComAtropelar: true }]);
  assert.equal(d, 'a criatura sua alvo causa dano igual ao poder dela a uma criatura que você não controla; se ela tiver atropelar, o dano além do letal vai para o controlador da outra');
  const bd = M.leitor.ler(CARDS['Bite Down']); assert.ok(bd.completa); assert.deepEqual(JSON.parse(JSON.stringify(bd.script.effects[1].target)), { tipos: ['creature', 'planeswalker'], de: 'opponent' });
});

test('LT73 · achados da revisão: o excesso é o mesmo evento de dano (Pridemate ganha um marcador); o dano já marcado conta para o letal; o registro explica quando não há dano', () => {
  let s = mesa(), rt, vt, u, pm; [s, rt] = poe(s, 0, 'Ram Through', 'hand'); for (let i = 0; i < 2; i++) [s] = poe(s, 0, 'Forest'); [s, vt] = poe(s, 0, 'VampT'); [s, u] = poe(s, 1, 'Urso'); [s, pm] = poe(s, 0, "Ajani's Pridemate");
  const vida = s.players[0].life; s = conj(s, rt, vt, u); s = passaAte(s, x => !x.stack.length && !x.pending);
  assert.equal(s.players[0].life, vida + 4, 'vínculo com a vida: 2 no Urso + 2 no jogador'); assert.equal((s.objects[pm].counters || {}).p1p1, 1, '120.4a: um evento, um ganho de vida, um gatilho');
  let t = mesa(), rt2, f, i2; [t, rt2] = poe(t, 0, 'Ram Through', 'hand'); for (let k = 0; k < 2; k++) [t] = poe(t, 0, 'Forest'); [t, f] = poe(t, 0, 'Fera'); [t, i2] = poe(t, 1, 'Indes');
  t = JSON.parse(JSON.stringify(t)); t.objects[i2].damage = 2; const vb = t.players[1].life;
  t = conj(t, rt2, f, i2); assert.equal(vb - t.players[1].life, 5, 'o indestrutível já tinha o dano letal marcado: os 5 são excesso'); assert.equal(t.objects[i2].damage, 2);
  const T = loadModules().table;
  let r = mesa(), rb, f3, u3; [r, rb] = poe(r, 0, 'Rabid Bite', 'hand'); for (let k = 0; k < 2; k++) [r] = poe(r, 0, 'Forest'); [r, f3] = poe(r, 0, 'Fera'); [r, u3] = poe(r, 1, 'Urso');
  r = act(r, legais(r, 0, x => x.t === 'cast' && x.oid === rb && x.targets[0].oid === f3 && x.targets[1].oid === u3)[0]);
  r = JSON.parse(JSON.stringify(r)); r.zones[0].battlefield = r.zones[0].battlefield.filter(x => x !== f3); r.zones[0].graveyard.push(f3); r.objects[f3].zone = 'graveyard'; r.objects[f3].zc = (r.objects[f3].zc || 0) + 1;
  const linhas = []; for (let k = 0; k < 4 && r.stack.length; k++) { const a = { t: 'pass', p: r.turn.priority }, x = E.apply(r, a); linhas.push(...[].concat(T.describe(r, a, x.events || [], x.state) || [])); r = x.state; }
  assert.ok(linhas.some(l => /Rabid Bite não causou dano: a criatura que ia causar o dano deixou de ser um alvo válido/.test(l)), linhas.join(' | '));
});
