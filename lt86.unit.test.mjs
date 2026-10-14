// M-404 · LT70 · 605.1a: "An activated ability is a mana ability if … it isn't a loyalty ability" — a habilidade de lealdade que só gera mana
// (Jaya Ballard "+1: Add {R}{R}{R}…", Chandra, Torch of Defiance "+1: Add {R}{R}") usa a pilha, pode ser respondida e não fura a fração de segundo
// (702.61a). Aviso da trilha tipos (T-82). Falha no motor anterior: resolvia na hora, como habilidade de mana.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, act, poe, legais, passaAte, CARTAS } from './cmd.mjs';
import { valorDeMana } from './listas.mjs';
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: valorDeMana(mana_cost), keywords: [], oracle_text: '', colors: [], ...extra });
const CARDS = { ...CARTAS, Ardente: c0('Ardente', 'Legendary Planeswalker — Chandra', '{2}{R}', { loyalty: '3', colors: ['R'], oracle_text: '+1: Add {R}{R}.' }),
  Fracao: c0('Fracao', 'Instant', '{0}', { keywords: ['Split second'], oracle_text: 'Split second' }) };
const SCRIPTS = { Ardente: { name: 'Ardente', loyalty: [{ cost: 1, label: '+1: Adiciona {R}{R}', effects: [{ do: 'add_mana', symbols: ['R', 'R'] }] }], example: { action: 'cast', target: 'none', expect: { loyalty: 3 } } },
  Fracao: { name: 'Fracao', effects: [{ do: 'draw', amount: 1 }], example: { target: 'none', expect: { handDelta: 1 } } } };
function mesa() {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 107, mode: 'full', cards: CARDS, scripts: SCRIPTS, first: 0,
    players: [{ name: 'A', deck: baralho(['Ardente', 'Fracao', 'Mountain']) }, { name: 'B', deck: baralho(['Fracao', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const comLealdade = (s, pw) => { s = JSON.parse(JSON.stringify(s)); s.objects[pw].counters.loyalty = 3; return s; }; // `poe` não põe os marcadores de entrada
const ativa = (s, pw) => legais(s, 0, a => a.t === 'activate' && a.oid === pw);

test('LT70 · 605.1a · a habilidade de lealdade que só gera mana vai para a pilha (não resolve na hora) e dá a mana ao resolver', () => {
  let s = mesa(), pw; [s, pw] = poe(s, 0, 'Ardente'); s = comLealdade(s, pw);
  const os = ativa(s, pw); assert.equal(os.length, 1, JSON.stringify(os)); const lealdade = s.objects[pw].counters.loyalty || 0;
  const antes = JSON.stringify(s.players[0].manaPool || s.players[0].pool || {});
  s = act(s, os[0]);
  assert.equal(s.stack.length, 1, 'na pilha'); assert.equal(s.objects[pw].counters.loyalty, lealdade + 1, 'o custo de lealdade é pago ao ativar');
  assert.equal(JSON.stringify(s.players[0].manaPool || s.players[0].pool || {}), antes, 'ainda sem mana');
  const r = E.apply(s, { t: 'pass', p: 0 }); s = r.state; s = passaAte(s, x => !x.stack.length || !!x.pending);
  assert.equal(s.stack.length, 0);
  const pool = s.players[0].manaPool || s.players[0].pool || {}; assert.ok(JSON.stringify(pool).includes('R'), 'a mana entrou: ' + JSON.stringify(pool));
});

test('LT70 · 702.61a · com uma mágica de fração de segundo na pilha, a lealdade que gera mana não é oferecida nem aceita', () => {
  let s = mesa(), pw, f; [s, pw] = poe(s, 0, 'Ardente'); [s, f] = poe(s, 1, 'Fracao', 'hand'); s = comLealdade(s, pw);
  const a0 = ativa(s, pw)[0]; assert.ok(a0, 'sem a fração, a lealdade é oferecida');
  s = JSON.parse(JSON.stringify(s)); // B conjura a fração de segundo no turno de A (instantânea, {0})
  s = act(s, { t: 'pass', p: 0 });
  const c = legais(s, 1, a => a.t === 'cast' && a.oid === f)[0]; assert.ok(c, 'B pode conjurar'); s = act(s, c);
  s = act(s, { t: 'pass', p: 1 }); assert.equal(s.turn.priority, 0); assert.equal(s.stack.length, 1);
  assert.equal(s.objects[pw].zone, 'battlefield'); assert.equal(ativa(s, pw).length, 0, 'não oferecida');
  assert.throws(() => E.apply(s, a0), e => /fração de segundo|feitiço|pilha/.test(e.message), 'recusada');
});
