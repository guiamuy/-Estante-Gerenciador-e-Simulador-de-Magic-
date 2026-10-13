// M-385 · LT52 · Thermokarst: "Destroy target land. If that land was a snow land, you gain 1 life." (Oracle do Forge, consulta de 12/10/2026;
// .listas/oficiais-revisadas.json), caminho de produção (APROVADAS). 608.2h: o terreno é visto como era antes de ser destruído. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, act, poe, legais, passaAte, CARTAS } from './cmd.mjs';
import { valorDeMana, palavrasDoTexto } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const r = OF.find(x => x.name === 'Thermokarst');
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: valorDeMana(mana_cost), keywords: [], oracle_text: '', colors: [], ...extra });
const CARDS = { ...CARTAS, Thermokarst: { name: r.name, type_line: r.type_line, mana_cost: r.mana_cost, cmc: valorDeMana(r.mana_cost), keywords: palavrasDoTexto(r.oracle_text), oracle_text: r.oracle_text, colors: ['G'] },
  'Terra Nevada': c0('Terra Nevada', 'Snow Land', '', { oracle_text: '{T}: Add {C}.' }) };
function mesa() {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 19, mode: 'full', cards: CARDS, first: 0,
    players: [{ name: 'A', deck: baralho(['Thermokarst', 'Forest']) }, { name: 'B', deck: baralho(['Terra Nevada', 'Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending);

test('LT52 · Thermokarst: destruir o terreno nevado dá 1 de vida; o terreno comum, não', () => {
  let s = mesa(), k, n, m; [s, k] = poe(s, 0, 'Thermokarst', 'hand'); for (let i = 0; i < 3; i++) [s] = poe(s, 0, 'Forest'); [s, n] = poe(s, 1, 'Terra Nevada'); [s, m] = poe(s, 1, 'Mountain');
  const os = legais(s, 0, a => a.t === 'cast' && a.oid === k);
  const v1 = resolve(act(s, os.find(a => a.targets[0].oid === n)));
  assert.equal(v1.objects[n].zone, 'graveyard'); assert.equal(v1.players[0].life, 21, 'nevado: +1');
  const v2 = resolve(act(s, os.find(a => a.targets[0].oid === m)));
  assert.equal(v2.objects[m].zone, 'graveyard'); assert.equal(v2.players[0].life, 20, 'comum: nada');
});
