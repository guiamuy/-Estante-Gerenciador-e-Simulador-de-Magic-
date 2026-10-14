// M-396 · LT63 · Pestilence: "At the beginning of the end step, if no creatures are on the battlefield, sacrifice Pestilence. {B}: Pestilence deals
// 1 damage to each creature and each player." (Oracle do Forge, consulta de 12/10/2026; .listas/oficiais-revisadas.json), caminho de produção
// (APROVADAS). 603.4: o "se" vale no disparo e na resolução; o passo final é o de qualquer jogador. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, act, poe, legais, passaAte, CARTAS } from './cmd.mjs';
import { valorDeMana, palavrasDoTexto } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const r = OF.find(x => x.name === 'Pestilence');
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: valorDeMana(mana_cost), keywords: [], oracle_text: '', colors: [], ...extra });
const CARDS = { ...CARTAS, Pestilence: { name: r.name, type_line: r.type_line, mana_cost: r.mana_cost, cmc: valorDeMana(r.mana_cost), keywords: palavrasDoTexto(r.oracle_text), oracle_text: r.oracle_text, colors: ['B'] },
  Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2', colors: ['G'] }), Esquilo: c0('Esquilo', 'Creature — Squirrel', '{G}', { power: '1', toughness: '1', colors: ['G'] }) };
function mesa() {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 71, mode: 'full', cards: CARDS, first: 0,
    players: [{ name: 'A', deck: baralho(['Pestilence', 'Swamp']) }, { name: 'B', deck: baralho(['Urso', 'Esquilo', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending);

test('LT63 · Pestilence: {B} causa 1 a cada criatura e a cada jogador; sem criatura no campo, ela é sacrificada no passo final (de qualquer jogador)', () => {
  let s = mesa(), pe, u, e; [s, pe] = poe(s, 0, 'Pestilence'); for (let i = 0; i < 2; i++) [s] = poe(s, 0, 'Swamp'); [s, u] = poe(s, 1, 'Urso'); [s, e] = poe(s, 1, 'Esquilo');
  s = resolve(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === pe)[0]));
  assert.equal(s.players[0].life, 19); assert.equal(s.players[1].life, 19, 'cada jogador uma vez');
  assert.equal(s.objects[e].zone, 'graveyard'); assert.equal(s.objects[u].damage, 1);
  s = passaAte(s, x => x.turn.step === 'end' || x.turn.active === 1);
  s = resolve(s); assert.equal(s.objects[pe].zone, 'battlefield', 'o Urso ainda está no campo: não sacrifica');
  s = resolve(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === pe)[0] || { t: 'pass', p: s.turn.priority }));
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'end');
  s = resolve(s); assert.equal(s.objects[pe].zone, 'graveyard', 'no passo final do oponente, sem criaturas, sacrificada');
});
