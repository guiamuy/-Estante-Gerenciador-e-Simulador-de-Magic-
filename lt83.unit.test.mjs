// M-400 · LT67 · Recommission: "Return target artifact or creature card with mana value 3 or less from your graveyard to the battlefield. If a
// creature enters this way, it enters with an additional +1/+1 counter on it." (Oracle do Forge, consulta de 12/10/2026;
// .listas/oficiais-revisadas.json), caminho de produção (APROVADAS). 614.1c: entra com o marcador. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, act, poe, legais, passaAte, CARTAS } from './cmd.mjs';
import { valorDeMana, palavrasDoTexto } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const r = OF.find(x => x.name === 'Recommission');
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: valorDeMana(mana_cost), keywords: [], oracle_text: '', colors: [], ...extra });
const CARDS = { ...CARTAS, Recommission: { name: r.name, type_line: r.type_line, mana_cost: r.mana_cost, cmc: valorDeMana(r.mana_cost), keywords: palavrasDoTexto(r.oracle_text), oracle_text: r.oracle_text, colors: ['W'] },
  Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2', colors: ['G'] }), Pedra: c0('Pedra', 'Artifact', '{1}'),
  Gigante: c0('Gigante', 'Creature — Giant', '{3}{G}', { power: '4', toughness: '4', colors: ['G'] }), Encanto: c0('Encanto', 'Enchantment', '{1}') };
function mesa() {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 89, mode: 'full', cards: CARDS, first: 0,
    players: [{ name: 'A', deck: baralho(['Recommission', 'Urso', 'Pedra', 'Gigante', 'Encanto', 'Plains']) }, { name: 'B', deck: baralho(['Urso', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending);

test('LT67 · Recommission: mira artefato ou criatura de valor 3 ou menos do seu cemitério; a criatura entra com +1/+1, o artefato sem', () => {
  let s = mesa(), rc, u, pe, gi, en, ub; [s, rc] = poe(s, 0, 'Recommission', 'hand'); for (let i = 0; i < 2; i++) [s] = poe(s, 0, 'Plains');
  [s, u] = poe(s, 0, 'Urso', 'graveyard'); [s, pe] = poe(s, 0, 'Pedra', 'graveyard'); [s, gi] = poe(s, 0, 'Gigante', 'graveyard'); [s, en] = poe(s, 0, 'Encanto', 'graveyard'); [s, ub] = poe(s, 1, 'Urso', 'graveyard');
  const alvos = legais(s, 0, a => a.t === 'cast' && a.oid === rc).map(a => a.targets[0].oid);
  assert.ok(alvos.includes(u) && alvos.includes(pe) && !alvos.includes(gi) && !alvos.includes(en) && !alvos.includes(ub), JSON.stringify(alvos));
  const s1 = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === rc && a.targets[0].oid === u)[0]));
  assert.equal(s1.objects[u].zone, 'battlefield'); assert.equal(s1.objects[u].counters.p1p1, 1);
  const s2 = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === rc && a.targets[0].oid === pe)[0]));
  assert.equal(s2.objects[pe].zone, 'battlefield'); assert.ok(!(s2.objects[pe].counters || {}).p1p1, 'artefato não criatura sem marcador');
  assert.ok(!('entraComK' in s2.objects[pe]), 'a marca não sobra');
});

test('LT67 · achados da revisão: a descrição fala de artefato ou criatura e do marcador extra; o validador recusa o marcador no "devolver a si mesma"', async () => {
  const { loadModules } = await import('./_load.mjs'); const M = loadModules();
  const d = M.table.descreveEfeitos([{ do: 'reanimate', target: 'card-in-your-graveyard', targetTypes: ['artifact', 'creature'], targetMvMax: 3, marcadorSeCriatura: 1 }]);
  assert.match(d, /artefato ou criatura/); assert.match(d, /marcador \+1\/\+1 a mais/);
  const { S: SC } = await import('./listas.mjs');
  const e = SC.validateScript({ name: 'Z', example: { target: 'none', expect: {} }, abilities: [{ kind: 'activated', cost: { mana: '{1}', fromGraveyard: true, devolveSelf: true }, effects: [{ do: 'reanimate', target: 'self-source', marcadorSeCriatura: 1 }] }] });
  assert.ok(e.some(x => /marcadorSeCriatura/.test(x)), JSON.stringify(e));
});
