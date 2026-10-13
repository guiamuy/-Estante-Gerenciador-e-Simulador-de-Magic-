// M-391 · LT58 · Azure Fleet Admiral: "When Azure Fleet Admiral enters, you become the monarch. Azure Fleet Admiral can't be blocked by creatures
// the monarch controls." (Oracle do Forge, consulta de 12/10/2026; .listas/oficiais-revisadas.json), caminho de produção (APROVADAS). 725: quem é o
// monarca é conferido na hora do bloqueio. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, act, poe, legais, passaAte, CARTAS } from './cmd.mjs';
import { valorDeMana, palavrasDoTexto } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const r = OF.find(x => x.name === 'Azure Fleet Admiral');
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: valorDeMana(mana_cost), keywords: [], oracle_text: '', colors: [], ...extra });
const CARDS = { ...CARTAS, 'Azure Fleet Admiral': { name: r.name, type_line: r.type_line, mana_cost: r.mana_cost, cmc: valorDeMana(r.mana_cost), keywords: palavrasDoTexto(r.oracle_text), oracle_text: r.oracle_text, colors: ['U'], power: r.power, toughness: r.toughness },
  Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2', colors: ['G'] }) };
function mesa() {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 47, mode: 'full', cards: CARDS, first: 0,
    players: [{ name: 'A', deck: baralho(['Azure Fleet Admiral', 'Island']) }, { name: 'B', deck: baralho(['Urso', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending);

test('LT58 · Azure Fleet Admiral: ao entrar, você vira o monarca; a criatura de quem é o monarca não o bloqueia, a de quem não é, sim', () => {
  let s = mesa(), ad, u; [s, ad] = poe(s, 0, 'Azure Fleet Admiral', 'hand'); for (let i = 0; i < 4; i++) [s] = poe(s, 0, 'Island'); [s, u] = poe(s, 1, 'Urso');
  s = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === ad)[0])); s = resolve(s);
  assert.equal(s.monarca, 0, 'A é o monarca');
  assert.ok(E.canBlock(s, u, ad), 'o Urso de B (que não é o monarca) bloqueia');
  s = JSON.parse(JSON.stringify(s)); s.monarca = 1; // B tomou a coroa
  assert.ok(!E.canBlock(s, u, ad), 'o Urso do monarca não bloqueia');
});
