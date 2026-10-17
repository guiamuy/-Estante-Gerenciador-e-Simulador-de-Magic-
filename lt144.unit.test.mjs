// M-462 · LT128 · Magmakin Artillerist ("Whenever you discard one or more cards, this creature deals that much damage to each opponent. / Cycling {1}{R} /
// When you cycle this card, it deals 1 damage to each opponent."). Texto da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json), caminho de
// produção (APROVADAS). Pedido da trilha `listas`. Evento em lote novo `descartam` (603.2c; valor = quantas). Tolarian Winds: texto revisado (M-434).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const of = (n, extra) => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: 2, keywords: [], oracle_text: c.oracle_text, colors: [], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}), ...extra }; };
const C = { 'Magmakin Artillerist': of('Magmakin Artillerist', { cmc: 3, colors: ['R'], keywords: ['Cycling'] }), 'Tolarian Winds': of('Tolarian Winds', { colors: ['U'] }),
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Island: { name: 'Island', type_line: 'Basic Land — Island', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {U}.)', colors: [] },
  Mountain: { name: 'Mountain', type_line: 'Basic Land — Mountain', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {R}.)', colors: [] } };
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 103, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b(['Magmakin Artillerist', 'Tolarian Winds', 'Urso', 'Island', 'Mountain']) }, { name: 'B', deck: b(['Urso', 'Island']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
let gatilhos = 0;
const ate = s => { for (let i = 0; i < 60 && (s.stack.length || s.pending); i++) { const la = legais(s, s.pending ? s.pending.p : s.turn.priority); const r = E.apply(s, la.find(x => x.t === 'pass') || la[0]); gatilhos += r.events.filter(e => e.kind === 'trigger' && e.name === 'Magmakin Artillerist' && e.when && e.when.evento === 'descartam').length; s = r.state; } return s; };
const maoSo = (s, keep) => { s = J(s); const z = s.zones[0]; for (const o of z.hand.filter(o => !keep.includes(o))) { z.hand.splice(z.hand.indexOf(o), 1); z.library.push(o); s.objects[o].zone = 'library'; } return s; };

test('LT128 · Magmakin Artillerist joga pelo leitor aprovado', () => {
  assert.equal(S.coverage(C['Magmakin Artillerist']).level, 'completo'); assert.equal(S.APROVADAS['Magmakin Artillerist'].leva, 'M-462');
});

test('LT128 · descartar três de uma vez (Tolarian Winds): um gatilho, 3 de dano', () => {
  let s = mesa(), ma, tw; [s, ma] = poe(s, 0, 'Magmakin Artillerist'); [s, tw] = poe(s, 0, 'Tolarian Winds', 'hand'); for (let k = 0; k < 3; k++) [s] = poe(s, 0, 'Urso', 'hand');
  [s] = poe(s, 0, 'Island'); [s] = poe(s, 0, 'Island'); s = maoSo(s, [tw, ...s.zones[0].hand.slice(-3)]);
  assert.equal(s.zones[0].hand.length, 4);
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === tw)[0]);
  gatilhos = 0; s = ate(s);
  assert.equal(gatilhos, 1, 'um gatilho só'); assert.equal(s.players[1].life, 17);
});

test('LT128 · ciclar a outra Artillerist da mão: a do campo vê um descarte (1) e a ciclada causa 1 — 2 no total', () => {
  let s = mesa(), ma, mc; [s, ma] = poe(s, 0, 'Magmakin Artillerist'); [s, mc] = poe(s, 0, 'Magmakin Artillerist', 'hand'); [s] = poe(s, 0, 'Mountain'); [s] = poe(s, 0, 'Mountain');
  s = ate(act(s, { t: 'cycle', p: 0, oid: mc }));
  assert.equal(s.objects[mc].zone, 'graveyard'); assert.equal(s.players[1].life, 18);
});
