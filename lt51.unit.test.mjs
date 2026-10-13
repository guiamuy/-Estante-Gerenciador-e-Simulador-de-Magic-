// M-368 · 608.2h · a foto de última informação guarda o valor de mana que a permanente tinha no campo — pedido da trilha tipos (T-38): o protótipo
// sacrificado contava o valor impresso (Boulderbranch Golem: 7) em vez do custo do protótipo ({3}{G}: 4). Os testes falham no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, comMana, CARTAS } from './cmd.mjs';

const OT = JSON.parse(readFileSync(new URL('./.listas/oficiais-tipos.json', import.meta.url), 'utf8'));
const acha = (o, n) => { if (Array.isArray(o)) { for (const v of o) { const r = acha(v, n); if (r) return r; } } else if (o && typeof o === 'object') { if (o.name === n) return o; for (const v of Object.values(o)) { const r = acha(v, n); if (r) return r; } } return null; };
const bg = acha(OT, 'Boulderbranch Golem');
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: 1, keywords: [], oracle_text: '', colors: [...new Set((mana_cost.match(/[WUBRG]/g) || []))], ...extra });
const cards = { 'Boulderbranch Golem': { name: bg.name, type_line: bg.type_line, mana_cost: bg.mana_cost, cmc: 7, keywords: [], oracle_text: bg.oracle_text, colors: [], power: bg.power, toughness: bg.toughness },
  Barganha: c0('Barganha', 'Instant', '{B}'), Troca: c0('Troca', 'Sorcery', '{B}'), Grande: c0('Grande', 'Creature — Giant', '{4}{G}', { cmc: 5, power: '5', toughness: '5' }) };
const scripts = { Troca: { name: 'Troca', effects: [{ do: 'exile', target: 'creature-you-control' }, { do: 'reveal_until', target: 'first-target', who: 'self', match: 'creature-greater-mv', rest: 'bottom-random' }], example: { target: 'own-creature', expect: { selfLife: 20 } } }, Barganha: { name: 'Barganha', additional: { sacrificeOther: { types: ['artifact', 'creature'] } }, effects: [{ do: 'gain', amount: { per: 'sacrificed-mv' } }], example: { target: 'none', expect: { selfLife: 20 } } } };
function mesa(seed = 13) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: { ...CARTAS, ...cards }, scripts, first: 0, players: [{ name: 'A', deck: baralho(['Boulderbranch Golem', 'Barganha', 'Troca', 'Grande', 'Swamp']) }, { name: 'B', deck: baralho(['Plains', 'Island']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const sacrificaEGanha = (s, g) => { let b; [s, b] = poe(s, 0, 'Barganha', 'hand'); const vida = s.players[0].life; const m = comMana(s, 'B');
  const a = legais(m, 0, x => x.t === 'cast' && x.oid === b && x.pay && [].concat(x.pay.sacrifice || []).includes(g))[0]; assert.ok(a, 'oferece sacrificar o Golem');
  const t = act(act(act(m, a), { t: 'pass', p: 0 }), { t: 'pass', p: 1 }); return [t, t.players[0].life - vida]; };

test('M-368 · 608.2h: o Golem como protótipo (valor 4) sacrificado dá 4 de vida; o Golem normal (valor 7), 7', () => {
  let s = mesa(), g; [s, g] = poe(s, 0, 'Boulderbranch Golem', 'battlefield', { prototipoT: true });
  let [t, ganho] = sacrificaEGanha(s, g);
  assert.equal(t.objects[g].ultima.mv, 4, 'a foto guarda o valor do protótipo');
  assert.equal(ganho, 4);
  let s2 = mesa(), g2; [s2, g2] = poe(s2, 0, 'Boulderbranch Golem');
  const [, ganho2] = sacrificaEGanha(s2, g2); assert.equal(ganho2, 7);
});

test('M-368 · reveal_until "creature-greater-mv": o protótipo exilado (valor 4) é a referência — uma criatura de valor 5 serve', () => {
  let s = mesa(), g, tr; [s, g] = poe(s, 0, 'Boulderbranch Golem', 'battlefield', { prototipoT: true }); [s, tr] = poe(s, 0, 'Troca', 'hand');
  s = J(s); const lib = s.zones[0].library, gr = lib.find(o => s.objects[o].name === 'Grande'); s.zones[0].library = [gr, ...lib.filter(o => o !== gr && s.objects[o].name !== 'Boulderbranch Golem')];
  const m = comMana(s, 'B'); const t = act(act(act(m, legais(m, 0, a => a.t === 'cast' && a.oid === tr)[0]), { t: 'pass', p: 0 }), { t: 'pass', p: 1 });
  assert.equal(t.objects[gr].zone, 'battlefield', 'a Grande (5) é maior que o protótipo (4): entra');
});
