// M-386 · LT53 · Glimpse the Impossible: "Exile the top three cards of your library. You may play those cards this turn. At the beginning of the next
// end step, if any of those cards remain exiled, put them into your graveyard, then create a 0/1 colorless Eldrazi Spawn creature token for each card
// put into your graveyard this way. Those tokens have 'Sacrifice this creature: Add {C}.'" (Oracle do Forge, consulta de 12/10/2026), caminho de
// produção (APROVADAS). 603.7c: o gatilho atrasado fala das cartas exiladas por esta mágica. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, act, poe, legais, passaAte, CARTAS } from './cmd.mjs';
import { valorDeMana, palavrasDoTexto } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const r = OF.find(x => x.name === 'Glimpse the Impossible');
const CARDS = { ...CARTAS, 'Glimpse the Impossible': { name: r.name, type_line: r.type_line, mana_cost: r.mana_cost, cmc: valorDeMana(r.mana_cost), keywords: palavrasDoTexto(r.oracle_text), oracle_text: r.oracle_text, colors: ['R'] } };
function mesa() {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 10, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 23, mode: 'full', cards: CARDS, first: 0,
    players: [{ name: 'A', deck: baralho(['Glimpse the Impossible', 'Mountain']) }, { name: 'B', deck: baralho(['Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending);
const spawns = s => s.zones[0].battlefield.filter(x => s.objects[x].name === 'Eldrazi Spawn');

test('LT53 · Glimpse the Impossible: exila 3, joga uma delas neste turno; no passo final, as outras 2 vão ao cemitério e viram 2 Eldrazi Spawn', () => {
  let s = mesa(), g; [s, g] = poe(s, 0, 'Glimpse the Impossible', 'hand'); for (let i = 0; i < 3; i++) [s] = poe(s, 0, 'Mountain');
  s = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === g)[0]));
  const ex = s.zones[0].exile.filter(x => s.objects[x].playableFromExile === 0); assert.equal(ex.length, 3, 'três exiladas jogáveis');
  const cemAntes = s.zones[0].graveyard.length;
  const jogaUma = legais(s, 0, a => ex.includes(a.oid) && (a.t === 'play_land' || a.t === 'cast'))[0];
  assert.ok(jogaUma, 'joga uma das exiladas neste turno'); s = act(s, jogaUma);
  s = passaAte(s, x => x.turn.step === 'end' && x.stack.length > 0);
  s = resolve(s);
  assert.equal(s.zones[0].graveyard.length - cemAntes, 2, 'as duas que sobraram no exílio foram ao cemitério');
  assert.equal(spawns(s).length, 2, 'uma ficha por carta posta no cemitério');
  const sp = s.objects[spawns(s)[0]]; assert.equal(s.facts[sp.name].power ?? sp.power ?? 0, 0);
});

test('LT53 · a carta exilada que saiu do exílio e voltou é outra (400.7): não conta; sem cartas no exílio, nenhuma ficha', () => {
  let s = mesa(), g; [s, g] = poe(s, 0, 'Glimpse the Impossible', 'hand'); for (let i = 0; i < 3; i++) [s] = poe(s, 0, 'Mountain');
  s = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === g)[0]));
  const ex = s.zones[0].exile.filter(x => s.objects[x].playableFromExile === 0);
  for (const oid of ex) { s.objects[oid].zc = (s.objects[oid].zc || 0) + 1; } // como se cada uma tivesse saído e voltado ao exílio
  s = resolve(passaAte(s, x => x.turn.step === 'end' || x.turn.active === 1));
  assert.equal(spawns(s).length, 0); assert.equal(ex.filter(x => s.objects[x].zone === 'exile').length, 3, 'continuam no exílio');
});

test('LT53 · achados da revisão: o "lembra" do mover segue valendo (Leonin Relic-Warder com script); sem nenhuma exilada restante, o gatilho atrasado não dispara (603.4)', async () => {
  const { S: SC } = await import('./listas.mjs');
  assert.ok(!(SC.SCRIPT_ERRORS || {})['Leonin Relic-Warder'], JSON.stringify((SC.SCRIPT_ERRORS || {})['Leonin Relic-Warder']));
  let s = mesa(), g; [s, g] = poe(s, 0, 'Glimpse the Impossible', 'hand'); for (let i = 0; i < 3; i++) [s] = poe(s, 0, 'Mountain');
  s = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === g)[0]));
  for (const oid of s.zones[0].exile.slice()) s.objects[oid].zc = (s.objects[oid].zc || 0) + 1;
  s = passaAte(s, x => x.turn.step === 'end' || x.turn.active === 1);
  assert.equal(s.turn.step, 'end'); assert.equal(s.stack.length, 0, 'nada na pilha no passo final'); assert.equal((s.atrasados || []).length, 0);
});
