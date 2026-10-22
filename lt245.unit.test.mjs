// M-563 · LT222 · revisão por lote CXCVIII (texto e rulings da Scryfall de 22/10/2026): Chrome Mox — "Imprint — When this artifact enters, you may exile
// a nonartifact, nonland card from your hand. / {T}: Add one mana of any of the exiled card's colors." Sem carta exilada (ou com carta incolor), não gera
// mana; nunca {C}; multicolorida, escolhe a cor a cada vez (rulings de 07/02/2025). Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, act, poe, legais, passaAte } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const CM = 'Chrome Mox', cm = OF.find(x => x.name === CM);
const C = { [CM]: { name: CM, type_line: cm.type_line, mana_cost: cm.mana_cost, cmc: 0, keywords: [], oracle_text: cm.oracle_text, colors: [] },
  Island: { name: 'Island', type_line: 'Basic Land — Island', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {U}.)', colors: [] },
  Raio: { name: 'Raio', type_line: 'Instant', mana_cost: '{R}', cmc: 1, keywords: [], oracle_text: '', colors: ['R'] },
  Dourado: { name: 'Dourado', type_line: 'Creature — Bear', mana_cost: '{G}{W}', cmc: 2, keywords: [], oracle_text: '', power: '2', toughness: '2', colors: ['G', 'W'] },
  Pisca: { name: 'Pisca', type_line: 'Instant', mana_cost: '{U}', cmc: 1, keywords: [], oracle_text: '', colors: ['U'] },
  Pedra: { name: 'Pedra', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] } };
const EX = { example: { target: 'none', expect: { selfLife: 0 } } };
const SCRIPTS = { Pisca: { name: 'Pisca', effects: [{ do: 'pisca', target: 'permanent-you-control' }], ...EX }, Raio: { name: 'Raio', effects: [{ do: 'gain', amount: 1 }], ...EX }, Pedra: { name: 'Pedra', ...EX } };
function mesa() {
  const b = ns => ns.map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 245, mode: 'full', cards: C, scripts: SCRIPTS, first: 0, players: [
    { name: 'A', deck: b([[CM, 2], ['Raio', 4], ['Dourado', 4], ['Pedra', 4], ['Pisca', 2], ['Island', 24]]) }, { name: 'B', deck: b([['Island', 40]]) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  let m, r, d, pe;
  [s, m] = poe(s, 0, CM, 'hand'); [s, r] = poe(s, 0, 'Raio', 'hand'); [s, d] = poe(s, 0, 'Dourado', 'hand'); [s, pe] = poe(s, 0, 'Pedra', 'hand');
  return [s, m, r, d, pe];
}
const conjuraMox = (s, m) => passaAte(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === m)[0]), x => !!x.pending || !x.stack.length);

test('M-563 · Chrome Mox joga (lido e aprovado)', () => { assert.equal(S.coverage(C[CM]).level, 'completo'); });

test('M-563 · exila só não artefato e não terreno; gera a cor da carta exilada', () => {
  let [s, m, r, d, pe] = mesa(); s = conjuraMox(s, m);
  assert.equal(s.pending && s.pending.kind, 'may_pay', 'o "you may" do gatilho'); s = act(s, legais(s, 0, a => a.t === 'pay')[0]);
  assert.equal(s.pending && s.pending.kind, 'pick');
  const ofertas = legais(s, 0, a => a.t === 'pick').map(a => s.objects[a.oid].name).sort(); assert.deepEqual([...new Set(ofertas)], ['Dourado', 'Raio'], 'nem Island nem a Pedra (artefato)');
  s = act(s, { t: 'pick', p: 0, oid: r }); s = passaAte(s, x => !x.pending && !x.stack.length);
  assert.equal(s.objects[r].zone, 'exile');
  const t = legais(s, 0, a => a.t === 'tap_mana' && a.oid === m); assert.equal(t.length, 1);
  s = act(s, t[0]); assert.equal(s.players[0].pool.R, 1, 'vermelho da carta exilada'); assert.equal(s.players[0].pool.C || 0, 0, 'nunca incolor');
});

test('M-563 · recusando, o Mox não gera mana; com carta multicolorida, as duas cores servem', () => {
  let [s, m] = mesa(); s = conjuraMox(s, m); s = act(s, legais(s, 0, a => a.t === 'decline')[0]); s = passaAte(s, x => !x.pending && !x.stack.length);
  assert.equal(legais(s, 0, a => a.t === 'tap_mana' && a.oid === m).length, 0, 'sem carta: sem mana');
  let [t, m2, , d] = mesa(); t = conjuraMox(t, m2); t = act(t, legais(t, 0, a => a.t === 'pay')[0]); t = act(t, { t: 'pick', p: 0, oid: d }); t = passaAte(t, x => !x.pending && !x.stack.length);
  const tap = legais(t, 0, a => a.t === 'tap_mana' && a.oid === m2)[0]; assert.ok(tap, 'gera mana');
  const verde = act(t, { ...tap, option: 0 }), branco = act(t, { ...tap, option: 1 });
  assert.deepEqual([verde.players[0].pool.G, branco.players[0].pool.W], [1, 1], 'escolhe verde ou branco');
});

test('M-563 · achado da revisão: Mox piscado com o gatilho na pilha — o gatilho antigo exila, mas não liga a carta ao Mox novo (400.7, 607.2a)', () => {
  let [s, m, r] = mesa(); let pi; [s, pi] = poe(s, 0, 'Pisca', 'hand'); [s] = poe(s, 0, 'Island');
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === m)[0]);
  s = passaAte(s, x => x.stack.length === 1 && x.objects[m].zone === 'battlefield' && x.turn.priority === 0, 20);
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === pi && (a.targets || []).some(t => t.oid === m))[0]);
  let perguntas = 0;
  for (let i = 0; i < 40 && (s.stack.length || s.pending); i++) {
    const pd = s.pending;
    if (pd && pd.kind === 'may_pay') { const quer = perguntas++ === 0 ? 'decline' : 'pay'; s = act(s, legais(s, 0, a => a.t === quer)[0]); } // o gatilho do Mox novo (por cima, resolve antes) é recusado; o antigo, aceito
    else if (pd && pd.kind === 'pick') s = act(s, { t: 'pick', p: 0, oid: r });
    else if (pd) break; else s = act(s, { t: 'pass', p: s.turn.priority });
  }
  assert.equal(s.objects[r].zone, 'exile', 'o gatilho antigo ainda exila');
  assert.equal(legais(s, 0, a => a.t === 'tap_mana' && a.oid === m).length, 0, 'o Mox novo não tem carta ligada');
});
