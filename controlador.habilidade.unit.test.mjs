// M-327 · 608.2h · "its controller" dentro de habilidade ativada ou disparada: é quem controlava o alvo antes do efeito, não quem ativou.
// Achado pela revisão independente do lote 1 (M-326) no Ghost Quarter. E "Sacrifice a creature" no custo de uma criatura inclui ela mesma
// (Viscera Seer, recusada no mesmo lote). Cada teste falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, passaAte, CARTAS } from './cmd.mjs';
import { loadModules } from './_load.mjs';

const { leitor: L } = loadModules();
const c = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: 0, keywords: [], oracle_text: '', colors: [], ...extra });
const cards = { Quarto: c('Quarto', 'Land', '') };
const scripts = { Quarto: { name: 'Quarto', abilities: [{ kind: 'activated', cost: { tap: true, sacrifice: true }, effects: [{ do: 'destroy', target: 'land' },
  { do: 'search', amount: 1, target: 'target-controller', optional: true, filter: { basic: true, types: ['land'] }, to: 'battlefield-tapped' }] }], example: { action: 'etb', target: 'none', expect: { attached: false } } } };
function mesaX() {
  const baralho = ns => ns.map(name => ({ name, qty: 20, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 1, mode: 'full', cards: { ...CARTAS, ...cards }, scripts, first: 0, players: [{ name: 'A', deck: baralho(['Quarto', 'Plains']) }, { name: 'B', deck: baralho(['Island']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}

test('M-327 · 608.2h · habilidade "destrua o terreno alvo; o controlador dele pode buscar": quem decide e busca é o dono do terreno destruído', () => {
  let s = mesaX(), q, ilha;
  [s, q] = poe(s, 0, 'Quarto'); [s, ilha] = poe(s, 1, 'Island');
  s = act(s, legais(s, 0, x => x.t === 'activate' && x.oid === q && x.targets && x.targets[0].oid === ilha)[0]);
  s = act(act(s, { t: 'pass', p: 0 }), { t: 'pass', p: 1 });
  assert.equal(s.objects[ilha].zone, 'graveyard');
  assert.ok(s.pending, 'há uma decisão');
  assert.equal(s.pending.p, 1, 'quem decide a busca é o jogador B, que controlava a Ilha');
});

test('M-327 · "Sacrifice a creature" no custo de uma criatura inclui ela mesma; num terreno, não há o que incluir', () => {
  const vs = L.ler({ name: 'Viscera Seer', type_line: 'Creature — Vampire Wizard', oracle_text: 'Sacrifice a creature: Scry 1.' });
  assert.equal(vs.completa, true); assert.equal(vs.script.abilities[0].cost.sacrificeOther.includeSelf, true);
  const pt = L.ler({ name: 'Phyrexian Tower', type_line: 'Legendary Land', oracle_text: '{T}: Add {C}.\n{T}, Sacrifice a creature: Add {B}{B}.' });
  assert.equal(pt.script.abilities[0].cost.sacrificeOther.includeSelf, undefined);
});
