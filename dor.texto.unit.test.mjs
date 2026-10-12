// M-321 · 106.12 · a regra impressa na linha de mana vale também para carta sem script. A cobertura por texto conta "{T}: Add {R} or {W}.
// Battlefield Forge deals 1 damage to you." como linha de mana e a carta joga sem script; até a v110 a cor saía sem o dano (e a do Tainted Isle,
// sem a condição de controlar um Pântano): carta silenciosamente errada. Texto oficial: Oracle do Forge, consultado em 12/10/2026.
// Cada teste falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, passaAte, CARTAS } from './cmd.mjs';
import { loadModules } from './_load.mjs';

const { scripts: S } = loadModules();
const terra = (name, oracle_text) => ({ name, type_line: 'Land', mana_cost: '', cmc: 0, keywords: [], colors: [], oracle_text });
const FORGE = terra('Battlefield Forge', '{T}: Add {C}.\n{T}: Add {R} or {W}. Battlefield Forge deals 1 damage to you.');
const ISLE = terra('Tainted Isle', '{T}: Add {C}.\n{T}: Add {U} or {B}. Activate only if you control a Swamp.');
const NOVA = terra('Dor Nova', '{T}: Add {C}.\n{T}: Add {G} or {W}. This land deals 1 damage to you.'); // a redação com "This land"
function mesaX(cards) {
  const baralho = ns => ns.map(name => ({ name, qty: 15, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 1, mode: 'full', cards: { ...CARTAS, ...Object.fromEntries(cards.map(c => [c.name, c])) }, first: 0,
    players: [{ name: 'A', deck: baralho([...cards.map(c => c.name), 'Swamp']) }, { name: 'B', deck: baralho(['Island']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const vira = (s, oid, option) => act(s, { t: 'tap_mana', p: 0, oid, option });

test('M-321 · terreno de dor sem script: a cor custa 1 de vida, o incolor não (as duas redações)', () => {
  for (const c of [FORGE, NOVA]) {
    assert.equal(!!S.SCRIPTS[c.name], false, `${c.name}: sem script à mão`);
    assert.equal(S.coverage(c).level, 'completo', 'a cobertura por texto já deixava jogar');
    let s = mesaX([c]), f; [s, f] = poe(s, 0, c.name);
    const v = s.players[0].life;
    assert.equal(vira(s, f, 0).players[0].life, v, 'incolor: sem dano');
    const cor = vira(s, f, 1);
    assert.equal(cor.players[0].life, v - 1, `${c.name}: a cor custa 1`);
    assert.equal(Object.values(cor.players[0].pool).reduce((a, b) => a + b, 0), 1);
  }
});

test('M-321 · "Activate only if you control a Swamp" sem script: sem Pântano só sai incolor; com Pântano, as cores', () => {
  let s = mesaX([ISLE]), t, p;
  [s, t] = poe(s, 0, 'Tainted Isle');
  assert.throws(() => vira(s, t, 1), /não produz/, 'sem Pântano: a cor não existe');
  assert.equal(vira(s, t, 0).players[0].pool.C, 1);
  [s, p] = poe(s, 0, 'Swamp');
  const u = vira(s, t, 1); assert.equal(u.players[0].pool.U, 1, 'com Pântano: azul');
  assert.equal(u.players[0].life, s.players[0].life, 'sem custo de vida');
});
