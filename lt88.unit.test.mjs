// M-406 · LT72 · "Discard a card. If you do, draw two cards." — descarte obrigatório no `descarta_e_compra` (pedido da trilha listas: Stormshriek Feral,
// presságio Flush Out; Oracle do Forge, consulta de 12/10/2026). Sem "you may", o jogador não pode recusar o descarte quando tem carta na mão; com a mão
// vazia, nada acontece ("if you do"). O leitor lia a frase obrigatória como opcional. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, act, poe, legais, passaAte, CARTAS } from './cmd.mjs';
import { valorDeMana } from './listas.mjs';
import { loadModules } from './_load.mjs';
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: valorDeMana(mana_cost), keywords: [], oracle_text: '', colors: [], ...extra });
const CARDS = { ...CARTAS, Fluxo: c0('Fluxo', 'Sorcery', '{R}', { colors: ['R'], oracle_text: 'Discard a card. If you do, draw two cards.' }), Talvez: c0('Talvez', 'Sorcery', '{R}', { colors: ['R'], oracle_text: 'You may discard a card. If you do, draw two cards.' }) };
const SCRIPTS = { Fluxo: { name: 'Fluxo', effects: [{ do: 'descarta_e_compra', amount: 2, obrigatorio: true }], example: { action: 'etb', target: 'none', expect: { attached: false } } } };
function mesa() {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 113, mode: 'full', cards: CARDS, scripts: SCRIPTS, first: 0, players: [{ name: 'A', deck: baralho(['Fluxo', 'Mountain']) }, { name: 'B', deck: baralho(['Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending);

test('LT72 · descarte obrigatório: a escolha pede uma carta (não aceita nenhuma) e compra duas; com a mão vazia, nada acontece', () => {
  let s = mesa(), f; [s, f] = poe(s, 0, 'Fluxo', 'hand'); [s] = poe(s, 0, 'Mountain');
  const mao0 = s.zones[0].hand.length;
  s = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === f)[0]));
  assert.equal(s.pending && s.pending.kind, 'pick'); assert.equal(s.pending.min, 1, 'não dá para não descartar');
  assert.throws(() => E.apply(s, { t: 'pick_done', p: 0 }), /./, 'não dá para encerrar sem descartar');
  assert.ok(!legais(s, 0, a => a.t === 'pick_done').length, 'nem é oferecido');
  const carta = s.pending.from[0]; s = act(s, { t: 'pick', p: 0, oid: carta }); if (s.pending && s.pending.kind === 'pick') s = act(s, { t: 'pick_done', p: 0 }); s = resolve(s);
  assert.equal(s.objects[carta].zone, 'graveyard'); assert.equal(s.zones[0].hand.length, mao0 - 1 - 1 + 2, 'conjurou, descartou uma, comprou duas');
  let t = mesa(), f2; [t, f2] = poe(t, 0, 'Fluxo', 'hand'); [t] = poe(t, 0, 'Mountain');
  t = JSON.parse(JSON.stringify(t)); for (const o of t.zones[0].hand.filter(o => o !== f2)) { t.zones[0].hand = t.zones[0].hand.filter(x => x !== o); t.zones[0].library.push(o); t.objects[o].zone = 'library'; }
  const bib = t.zones[0].library.length;
  t = resolve(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === f2)[0]));
  assert.ok(!t.pending); assert.equal(t.zones[0].hand.length, 0, 'mão vazia: sem descarte, sem compra'); assert.equal(t.zones[0].library.length, bib);
});

test('LT72 · leitor e textos: sem "you may" o descarte sai obrigatório; com "you may", continua opcional; o validador recusa obrigatório com mais de uma carta', () => {
  const M = loadModules();
  const r = M.leitor.ler(CARDS.Fluxo), q = M.leitor.ler(CARDS.Talvez);
  assert.ok(r.completa && q.completa, JSON.stringify([r.frases, q.frases]));
  assert.deepEqual(JSON.parse(JSON.stringify(r.script.effects)), [{ do: 'descarta_e_compra', amount: 2, obrigatorio: true }]);
  assert.deepEqual(JSON.parse(JSON.stringify(q.script.effects)), [{ do: 'descarta_e_compra', amount: 2 }]);
  assert.equal(M.table.descreveEfeitos(r.script.effects), 'descarta uma carta; se fizer, compra 2 cartas');
  const e = M.scripts.validateScript({ name: 'W', example: { target: 'none', expect: {} }, effects: [{ do: 'descarta_e_compra', amount: 3, descarta: 2, obrigatorio: true }] });
  assert.ok(e.some(x => /obrigatorio/.test(x)), JSON.stringify(e));
});
