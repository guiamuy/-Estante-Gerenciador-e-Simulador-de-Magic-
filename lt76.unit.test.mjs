// M-393 · LT60 · Jolted Awake: "Choose up to one target artifact or creature card in your graveyard. You get {E}{E}. Then you may pay an amount
// of {E} equal to that card's mana value. If you do, return it from your graveyard to the battlefield. Cycling {2}" (Oracle do Forge, consulta de
// 12/10/2026; .listas/oficiais-revisadas.json), caminho de produção (APROVADAS). Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, act, poe, legais, passaAte, CARTAS } from './cmd.mjs';
import { valorDeMana, palavrasDoTexto } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const r = OF.find(x => x.name === 'Jolted Awake');
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: valorDeMana(mana_cost), keywords: [], oracle_text: '', colors: [], ...extra });
const CARDS = { ...CARTAS, 'Jolted Awake': { name: r.name, type_line: r.type_line, mana_cost: r.mana_cost, cmc: valorDeMana(r.mana_cost), keywords: palavrasDoTexto(r.oracle_text), oracle_text: r.oracle_text, colors: ['W'] },
  Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2', colors: ['G'] }), Gigante: c0('Gigante', 'Creature — Giant', '{4}{G}', { power: '5', toughness: '5', colors: ['G'] }) };
function mesa() {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 59, mode: 'full', cards: CARDS, first: 0,
    players: [{ name: 'A', deck: baralho(['Jolted Awake', 'Urso', 'Gigante', 'Plains']) }, { name: 'B', deck: baralho(['Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending);

test('LT60 · Jolted Awake: ganha 2 de energia e, pagando 2, devolve o Urso (valor 2) do cemitério ao campo', () => {
  let s = mesa(), j, u; [s, j] = poe(s, 0, 'Jolted Awake', 'hand'); [s] = poe(s, 0, 'Plains'); [s, u] = poe(s, 0, 'Urso', 'graveyard');
  s = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === j && a.targets && a.targets[0] && a.targets[0].oid === u)[0]));
  assert.equal(s.pending && s.pending.kind, 'may_pay');
  s = resolve(act(s, legais(s, 0, a => a.t === 'pay')[0]));
  assert.equal(s.objects[u].zone, 'battlefield'); assert.equal(s.players[0].energia || 0, 0);
});

test('LT60 · sem energia bastante (Gigante, valor 5), só ganha 2 de energia; recusar também não devolve; sem alvo, só a energia', () => {
  let s = mesa(), j, g; [s, j] = poe(s, 0, 'Jolted Awake', 'hand'); [s] = poe(s, 0, 'Plains'); [s, g] = poe(s, 0, 'Gigante', 'graveyard');
  const s1 = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === j && a.targets && a.targets[0] && a.targets[0].oid === g)[0]));
  assert.ok(!s1.pending); assert.equal(s1.objects[g].zone, 'graveyard'); assert.equal(s1.players[0].energia, 2);
  const s2 = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === j && !(a.targets || []).filter(Boolean).length)[0]));
  assert.equal(s2.players[0].energia, 2);
  let t = mesa(), j2, u; [t, j2] = poe(t, 0, 'Jolted Awake', 'hand'); [t] = poe(t, 0, 'Plains'); [t, u] = poe(t, 0, 'Urso', 'graveyard');
  t = resolve(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === j2 && a.targets && a.targets[0] && a.targets[0].oid === u)[0]));
  t = resolve(act(t, legais(t, 0, a => a.t === 'decline')[0])); assert.equal(t.objects[u].zone, 'graveyard'); assert.equal(t.players[0].energia, 2);
});

test('LT60 · achado da revisão: o registro da pergunta não diz "sem energia bastante"', async () => {
  const { loadModules } = await import('./_load.mjs'); const T = loadModules().table;
  let s = mesa(), j, u; [s, j] = poe(s, 0, 'Jolted Awake', 'hand'); [s] = poe(s, 0, 'Plains'); [s, u] = poe(s, 0, 'Urso', 'graveyard');
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === j && a.targets && a.targets[0] && a.targets[0].oid === u)[0]);
  const linhas = []; for (let i = 0; i < 6 && s.stack.length && !s.pending; i++) { const a = { t: 'pass', p: s.turn.priority }, r = E.apply(s, a); linhas.push(...[].concat(T.describe(s, a, r.events || [], r.state) || [])); s = r.state; }
  assert.ok(s.pending && linhas.some(l => /pode pagar energia/.test(l)) && !linhas.some(l => /sem energia/.test(l)), linhas.join(' | '));
});
