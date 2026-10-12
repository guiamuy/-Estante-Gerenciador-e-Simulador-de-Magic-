// M-344 · D3 (opção C, decisão do dono de 12/10/2026) · 602.5b · "Activate only if…" impresso na linha de mana de carta sem script. A cobertura
// por texto já deixava jogar Riverpyre Verge, Temple of the False God e Hidden Lair, mas a cor saía sem a condição (opção A provisória): carta
// silenciosamente errada. Agora a condição é conferida na oferta e na ativação, e as cartas continuam jogando (nenhuma lista sai de jogo).
// Texto oficial: Oracle do Forge (12/10/2026); Hidden Lair conferida em mtg.wtf (12/10/2026: "if you control a basic land"). Cada teste falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, passaAte, CARTAS } from './cmd.mjs';
import { loadModules } from './_load.mjs';

const { scripts: S } = loadModules();
const terra = (name, oracle_text) => ({ name, type_line: 'Land', mana_cost: '', cmc: 0, keywords: [], colors: [], oracle_text });
const VERGE = terra('Riverpyre Verge', '{T}: Add {R}.\n{T}: Add {U}. Activate only if you control an Island or a Mountain.');
const TEMPLO = terra('Temple of the False God', '{T}: Add {C}{C}. Activate only if you control five or more lands.');
const LAIR = terra('Hidden Lair', '{T}: Add {C}.\n{T}: Add {U} or {B}. Activate only if this land entered this turn or if you control a basic land.');
const RARA = terra('Terra Rara', '{T}: Add {C}.');
function mesaX(cards) {
  const baralho = ns => ns.map(name => ({ name, qty: 12, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 1, mode: 'full', cards: { ...CARTAS, ...Object.fromEntries(cards.map(c => [c.name, c])) }, first: 0,
    players: [{ name: 'A', deck: baralho([...cards.map(c => c.name), 'Island']) }, { name: 'B', deck: baralho(['Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const vira = (s, oid, option) => act(s, { t: 'tap_mana', p: 0, oid, option });
const opcoes = (s, oid) => E.productions(s, s.objects[oid]).map(x => x.join(''));
const limpo = s => { s = J(s); for (const o of s.zones[0].battlefield.slice()) { s.zones[0].battlefield = s.zones[0].battlefield.filter(x => x !== o); s.zones[0].library.push(o); s.objects[o].zone = 'library'; } return s; };

test('M-344 · as três continuam jogando (cobertura por texto, sem script à mão)', () => {
  for (const c of [VERGE, TEMPLO, LAIR]) { assert.equal(!!S.SCRIPTS[c.name], false, c.name); assert.equal(S.coverage(c).level, 'completo', c.name); }
});

test('M-344 · Riverpyre Verge: {R} sempre; {U} só com uma Ilha ou uma Montanha sua', () => {
  let s = limpo(mesaX([VERGE, RARA])), v;
  [s, v] = poe(s, 0, 'Riverpyre Verge'); [s] = poe(s, 0, 'Terra Rara');
  assert.deepEqual(opcoes(s, v), ['R'], 'sem Ilha nem Montanha: só vermelho');
  assert.throws(() => vira(s, v, 1));
  let t; [t] = poe(s, 0, 'Island');
  assert.deepEqual(opcoes(t, v), ['R', 'U']); assert.equal(vira(t, v, 1).players[0].pool.U, 1);
});

test('M-344 · Temple of the False God: {C}{C} só com cinco terrenos ou mais (ela conta)', () => {
  let s = limpo(mesaX([TEMPLO, RARA])), tp;
  [s, tp] = poe(s, 0, 'Temple of the False God'); for (let i = 0; i < 3; i++) [s] = poe(s, 0, 'Terra Rara');
  assert.deepEqual(opcoes(s, tp), [], 'quatro terrenos: não gera mana');
  [s] = poe(s, 0, 'Terra Rara');
  assert.deepEqual(opcoes(s, tp), ['CC']); assert.equal(vira(s, tp, 0).players[0].pool.C, 2);
});

test('M-344 · Hidden Lair: {C} sempre; {U}/{B} no turno em que entrou ou com um terreno básico', () => {
  let s = limpo(mesaX([LAIR, RARA])), hl;
  [s, hl] = poe(s, 0, 'Hidden Lair', 'hand'); s = act(s, { t: 'play_land', p: 0, oid: hl }); // entra de verdade (poe não marca o turno da entrada)
  assert.deepEqual(opcoes(s, hl), ['C', 'U', 'B'], 'entrou neste turno: cores');
  const t = J(s); t.objects[hl].entrouNoTurno = s.turn.number - 2;
  assert.deepEqual(opcoes(t, hl), ['C'], 'turno seguinte, sem básico: só incolor');
  let u; [u] = poe(t, 0, 'Island');
  assert.deepEqual(opcoes(u, hl), ['C', 'U', 'B'], 'com um terreno básico: cores');
});
