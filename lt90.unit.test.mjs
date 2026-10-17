// M-408 · LT74 · Fireball ({X}{R}): "This spell costs {1} more to cast for each target beyond the first. Fireball deals X damage divided evenly, rounded
// down, among any number of targets." (Oracle do Forge, consulta de 12/10/2026; .listas/oficiais-revisadas.json; caminho de produção, APROVADAS).
// Divisão igual (601.2d) com o custo a mais por alvo (601.2f), pago com os alvos escolhidos. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, act, poe, legais, passaAte, CARTAS } from './cmd.mjs';
import { valorDeMana, palavrasDoTexto } from './listas.mjs';
import { loadModules } from './_load.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const r = OF.find(x => x.name === 'Fireball');
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: valorDeMana(mana_cost), keywords: [], oracle_text: '', colors: [], ...extra });
const CARDS = { ...CARTAS, Fireball: { name: r.name, type_line: r.type_line, mana_cost: r.mana_cost, cmc: valorDeMana(r.mana_cost), keywords: palavrasDoTexto(r.oracle_text), oracle_text: r.oracle_text, colors: ['R'] },
  Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2', colors: ['G'] }), Gigante: c0('Gigante', 'Creature — Giant', '{3}{G}', { power: '4', toughness: '4', colors: ['G'] }) };
function mesa(terras) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 131, mode: 'full', cards: CARDS, first: 0, players: [{ name: 'A', deck: baralho(['Fireball', 'Mountain']) }, { name: 'B', deck: baralho(['Urso', 'Gigante', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  let fb; [s, fb] = poe(s, 0, 'Fireball', 'hand'); for (let i = 0; i < terras; i++) [s] = poe(s, 0, 'Mountain');
  return [s, fb];
}
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending);
const conj = (s, fb, x) => act(s, legais(s, 0, a => a.t === 'cast' && a.oid === fb && a.x === x)[0]);
const marca = (s, alvo) => act(s, { t: 'dividir_ponto', p: 0, index: s.pending.options.findIndex(o => alvo.player != null ? o.player === alvo.player : o.oid === alvo.oid) });
const desvirados = s => s.zones[0].battlefield.filter(o => !s.objects[o].tapped && s.objects[o].name === 'Mountain').length;

test('LT74 · Fireball: X dividido igualmente entre os alvos escolhidos, com {1} a mais por alvo além do primeiro', () => {
  let [s, fb] = mesa(6), u; [s, u] = poe(s, 1, 'Urso');
  s = conj(s, fb, 4); assert.equal(s.pending && s.pending.kind, 'dividir_magia'); assert.equal(s.pending.igual, true);
  assert.equal(desvirados(s), 1, '{4}{R} pagos ao conjurar');
  assert.ok(!legais(s, 0, a => a.t === 'dividir_ponto' && a.fim).length, 'sem alvo, não fecha');
  s = marca(s, { player: 1 }); s = marca(s, { oid: u });
  s = act(s, { t: 'dividir_ponto', p: 0, fim: true }); assert.equal(desvirados(s), 0, 'o {1} do segundo alvo');
  const vida = s.players[1].life; s = resolve(s);
  assert.equal(s.players[1].life, vida - 2); assert.equal(s.objects[u].zone, 'graveyard', '2 em cada');
});

test('LT74 · arredonda para baixo; um alvo só não paga a mais; X = 0 é conjurável; sem mana para o custo a mais, o alvo extra não é oferecido nem aceito', () => {
  let [s, fb] = mesa(7), u, g; [s, u] = poe(s, 1, 'Urso'); [s, g] = poe(s, 1, 'Gigante');
  s = conj(s, fb, 4); s = marca(s, { player: 1 }); s = marca(s, { oid: u }); s = marca(s, { oid: g }); s = act(s, { t: 'dividir_ponto', p: 0, fim: true });
  const v = s.players[1].life; s = resolve(s);
  assert.equal(s.players[1].life, v - 1); assert.equal(s.objects[u].damage, 1); assert.equal(s.objects[g].damage, 1, '4 / 3 = 1 em cada');
  let [t, fb2] = mesa(4); t = conj(t, fb2, 3); t = marca(t, { player: 1 }); t = act(t, { t: 'dividir_ponto', p: 0, fim: true });
  const v2 = t.players[1].life; t = resolve(t); assert.equal(t.players[1].life, v2 - 3);
  let [z, fb3] = mesa(1); assert.ok(legais(z, 0, a => a.t === 'cast' && a.oid === fb3 && a.x === 0).length, 'X = 0');
  let [w, fb4] = mesa(3), u4; [w, u4] = poe(w, 1, 'Urso'); w = conj(w, fb4, 2); w = marca(w, { player: 1 });
  assert.equal(legais(w, 0, a => a.t === 'dividir_ponto' && !a.fim).length, 0, 'sem mana para o {1}: nenhum alvo a mais é oferecido'); assert.equal(legais(w, 0, a => a.t === 'dividir_ponto' && a.fim).length, 1);
  assert.throws(() => marca(w, { player: 1 }), /já foi escolhido/);
  assert.throws(() => marca(w, { oid: u4 }), /mana insuficiente/);
});

test('LT74 · leitor, registro e goldfish', () => {
  const M = loadModules();
  const l = M.leitor.ler(CARDS.Fireball); assert.ok(l.completa, JSON.stringify(l.frases));
  assert.deepEqual(JSON.parse(JSON.stringify(l.script.effects)), [{ do: 'damage', amount: { per: 'x' }, target: 'any', dividido: { igual: true, custoAlvoExtra: 1 } }]);
  let [s, fb] = mesa(6), u; [s, u] = poe(s, 1, 'Urso'); s = conj(s, fb, 4); s = marca(s, { player: 1 }); s = marca(s, { oid: u });
  const a = { t: 'dividir_ponto', p: 0, fim: true }, x = E.apply(s, a), linhas = [].concat(M.table.describe(s, a, x.events || [], x.state) || []);
  assert.ok(linhas.some(l => /Fireball: pagou \{1\} a mais pelos alvos além do primeiro/.test(l)) && linhas.some(l => /dano dividido — 2 em B, 2 em Urso|2 em Urso/.test(l)), linhas.join(' | '));
  const e = M.scripts.validateScript({ name: 'W', example: { action: 'etb', target: 'none', expect: { attached: false } }, effects: [{ do: 'damage', amount: 3, target: 'any', dividido: { max: 2, custoAlvoExtra: 1 } }] });
  assert.ok(e.some(m => /custoAlvoExtra/.test(m)), JSON.stringify(e));
});

test('LT74 · achados da revisão: mesa sem cobrança de mana não cobra nem exige o custo a mais; 0 de dano não aparece como causado (120.8)', () => {
  const M = loadModules();
  let [s, fb] = mesa(1), u; [s, u] = poe(s, 1, 'Urso'); s = JSON.parse(JSON.stringify(s)); s.manaCheck = false;
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === fb && a.x === 1)[0]); s = marca(s, { player: 1 }); s = marca(s, { oid: u });
  const antes = desvirados(s), a = { t: 'dividir_ponto', p: 0, fim: true }, x = E.apply(s, a); s = x.state;
  assert.equal(desvirados(s), antes, 'sem cobrança de mana, nenhuma terra vira');
  s = resolve(s); const r2 = s;
  let [t, fb2] = mesa(4), u2; [t, u2] = poe(t, 1, 'Urso'); t = conj(t, fb2, 1); t = marca(t, { player: 1 }); t = marca(t, { oid: u2 }); t = act(t, { t: 'dividir_ponto', p: 0, fim: true });
  const linhas = []; for (let k = 0; k < 4 && t.stack.length; k++) { const b = { t: 'pass', p: t.turn.priority }, y = E.apply(t, b); linhas.push(...[].concat(M.table.describe(t, b, y.events || [], y.state) || [])); t = y.state; }
  assert.ok(!linhas.some(l => /causou 0 de dano/.test(l)) && linhas.some(l => /Fireball não causou dano a Urso \(0 de dano\)/.test(l)), linhas.join(' | '));
});
