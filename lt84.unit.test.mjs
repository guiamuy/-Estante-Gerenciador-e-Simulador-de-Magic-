// M-401 · LT68 · Greatsword of Tyr: "Whenever equipped creature attacks, put a +1/+1 counter on it and tap up to one target creature defending
// player controls. Equip {W}" (Oracle do Forge, consulta de 12/10/2026; .listas/oficiais-revisadas.json), caminho de produção (APROVADAS).
// O Equipamento observa o ataque da criatura equipada. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, act, poe, legais, passaAte, CARTAS } from './cmd.mjs';
import { valorDeMana, palavrasDoTexto } from './listas.mjs';
import { loadModules } from './_load.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const r = OF.find(x => x.name === 'Greatsword of Tyr');
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: valorDeMana(mana_cost), keywords: [], oracle_text: '', colors: [], ...extra });
const CARDS = { ...CARTAS, 'Greatsword of Tyr': { name: r.name, type_line: r.type_line, mana_cost: r.mana_cost, cmc: valorDeMana(r.mana_cost), keywords: palavrasDoTexto(r.oracle_text), oracle_text: r.oracle_text, colors: ['W'] },
  Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2', colors: ['G'] }), Muro: c0('Muro', 'Creature — Wall', '{1}{W}', { power: '0', toughness: '4', colors: ['W'] }) };
function mesa() {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 97, mode: 'full', cards: CARDS, first: 0,
    players: [{ name: 'A', deck: baralho(['Greatsword of Tyr', 'Urso', 'Plains']) }, { name: 'B', deck: baralho(['Muro', 'Forest', 'Greatsword of Tyr']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending);

test('LT68 · Greatsword of Tyr: a criatura equipada ataca, ganha +1/+1 e vira a criatura do oponente', () => {
  let s = mesa(), g, u, m; [s, g] = poe(s, 0, 'Greatsword of Tyr'); [s] = poe(s, 0, 'Plains'); [s, u] = poe(s, 0, 'Urso'); [s, m] = poe(s, 1, 'Muro');
  s = resolve(act(s, legais(s, 0, a => a.t === 'equip' && a.oid === g && (a.target === u || (a.targets && a.targets[0] && a.targets[0].oid === u)))[0] || legais(s, 0, a => a.oid === g && JSON.stringify(a).includes(u))[0]));
  assert.equal(s.objects[g].attachedTo, u, 'equipado');
  s = passaAte(s, x => !!x.pending && x.pending.kind === 'attackers');
  s = act(s, { t: 'attack', p: 0, attackers: [u] });
  if (s.pending && s.pending.kind === 'pick_target') s = act(s, { t: 'pick_target', p: 0, index: s.pending.options.findIndex(o => o.oid === m) });
  s = passaAte(s, x => !x.stack.length || !!x.pending);
  assert.equal(s.objects[u].counters.p1p1, 1, '+1/+1 no Urso'); assert.equal(s.objects[m].tapped, true, 'o Muro virou');
});

test('LT68 · achado da revisão (508.5): "defending player" é o jogador que a criatura equipada ataca, mesmo com o Equipamento de outro controlador', () => {
  let s = mesa(), g, u, u2, m; [s, g] = poe(s, 1, 'Greatsword of Tyr'); [s, u] = poe(s, 0, 'Urso'); [s, u2] = poe(s, 0, 'Urso'); [s, m] = poe(s, 1, 'Muro');
  s = JSON.parse(JSON.stringify(s)); s.objects[g].attachedTo = u; // o Equipamento de B ficou na criatura de A (301.5c)
  s = passaAte(s, x => !!x.pending && x.pending.kind === 'attackers');
  s = act(s, { t: 'attack', p: 0, attackers: [u] });
  assert.equal(s.pending && s.pending.kind, 'pick_target', 'B escolhe o alvo (é dele o gatilho)');
  assert.equal(s.pending.p, 1);
  const alvos = s.pending.options.map(o => o.oid);
  assert.deepEqual([...alvos], [m], 'o defensor é B: só as criaturas de B, nunca o atacante');
  s = act(s, { t: 'pick_target', p: 1, index: 0 }); s = passaAte(s, x => !x.stack.length || !!x.pending);
  assert.equal(s.objects[u].counters.p1p1, 1); assert.equal(s.objects[m].tapped, true); assert.ok(!s.objects[u2].tapped);
});

test('LT68 · achado da revisão (400.7): a criatura que saiu e voltou ao campo antes da resolução não recebe o marcador', () => {
  let s = mesa(), g, u, m; [s, g] = poe(s, 0, 'Greatsword of Tyr'); [s, u] = poe(s, 0, 'Urso'); [s, m] = poe(s, 1, 'Muro');
  s = JSON.parse(JSON.stringify(s)); s.objects[g].attachedTo = u;
  s = passaAte(s, x => !!x.pending && x.pending.kind === 'attackers');
  s = act(s, { t: 'attack', p: 0, attackers: [u] });
  if (s.pending && s.pending.kind === 'pick_target') s = act(s, { t: 'pick_target', p: 0, index: s.pending.options.findIndex(o => o.oid === m) });
  assert.equal(s.stack.length, 1);
  s = JSON.parse(JSON.stringify(s)); s.objects[u].zc = (s.objects[u].zc || 0) + 1; delete s.objects[u].attacking; // piscou: objeto novo (400.7)
  s = passaAte(s, x => !x.stack.length || !!x.pending);
  assert.ok(!(s.objects[u].counters || {}).p1p1, 'sem marcador na encarnação nova'); assert.equal(s.objects[m].tapped, true, 'o alvo ainda vira');
});

test('LT68 · achados da revisão (textos): "na criatura equipada", "quando a criatura equipada ataca", "até uma criatura que o jogador defensor controla"', async () => {
  const M = loadModules(); const T = M.table;
  let s = mesa(), g, u, m; [s, g] = poe(s, 0, 'Greatsword of Tyr'); [s, u] = poe(s, 0, 'Urso'); [s, m] = poe(s, 1, 'Muro');
  const ab = s.facts['Greatsword of Tyr'].script.abilities.find(a => a.kind === 'triggered');
  const d = T.descreveEfeitos(ab.effects);
  assert.match(d, /põe 1 marcador \+1\/\+1 na criatura equipada/, d); assert.match(d, /vira até uma criatura que o jogador defensor controla/, d);
  s = JSON.parse(JSON.stringify(s)); s.objects[g].attachedTo = u;
  s = passaAte(s, x => !!x.pending && x.pending.kind === 'attackers');
  s = act(s, { t: 'attack', p: 0, attackers: [u] }); assert.equal(s.pending && s.pending.kind, 'pick_target');
  const a = { t: 'pick_target', p: 0, index: s.pending.options.findIndex(o => o.oid === m) }, r = E.apply(s, a);
  const linhas = [].concat(T.describe(s, a, r.events || [], r.state) || []);
  assert.ok(linhas.some(l => /Gatilho de Greatsword of Tyr \(quando a criatura equipada ataca\)/.test(l)), linhas.join(' | '));
});

test('LT68 · achado da revisão (leitor): "it" sob "Whenever enchanted creature attacks" é a criatura encantada, não a Aura — Extra Arms não sai como lida', () => {
  const L = loadModules().leitor;
  const r = L.ler({ name: 'Extra Arms', type_line: 'Enchantment — Aura', mana_cost: '{4}{R}', oracle_text: 'Enchant creature\nWhenever enchanted creature attacks, it deals 2 damage to any target.' });
  assert.ok(!r.completa, JSON.stringify(r.script || r.frases));
  const g = L.ler(CARDS['Greatsword of Tyr']); assert.ok(g.completa, JSON.stringify(g.frases));
});
