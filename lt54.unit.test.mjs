// M-371 · 400.7 · efeito em "esta permanente" de uma habilidade não vale sobre o objeto novo quando a fonte é piscada com a habilidade na pilha —
// achado da revisão independente da M-370. Os testes falham no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, passaAte, comMana, CARTAS } from './cmd.mjs';
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: 2, keywords: [], oracle_text: '', colors: [...new Set((mana_cost.match(/[WUBRG]/g) || []))], ...extra });
const cards = { Bomba: c0('Bomba', 'Creature — Golem', '{1}', { power: '1', toughness: '1' }), Pisca: c0('Pisca', 'Instant', '{W}') };
const EX = { example: { action: 'etb', target: 'none', expect: { attached: false } } };
const scripts = { Bomba: { name: 'Bomba', abilities: [{ kind: 'activated', cost: { mana: '{1}' }, effects: [{ do: 'continuo', target: 'self-source', poder: 1, resistencia: 0 }] }, { kind: 'activated', cost: { mana: '{2}' }, effects: [{ do: 'imbloqueavel', target: 'self-source', exceto: 'haste' }] }], ...EX },
  Pisca: { name: 'Pisca', effects: [{ do: 'pisca', target: 'creature-you-control' }], example: { target: 'own-creature', expect: { selfLife: 0 } } } };
function mesa(seed = 17) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: { ...CARTAS, ...cards }, scripts, first: 0, players: [{ name: 'A', deck: baralho(['Bomba', 'Pisca', 'Plains']) }, { name: 'B', deck: baralho(['Island', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const tudo = s => { for (let i = 0; i < 12 && (s.stack.length || s.pending); i++) s = s.pending ? act(s, legais(s, s.pending.p)[0]) : act(act(s, { t: 'pass', p: s.turn.priority }), { t: 'pass', p: 1 - s.turn.priority }); return s; };

for (const [i, nome, confere] of [[0, '"{1}: ~ gets +1/+0"', (t, b) => assert.equal(E.stats(t, t.objects[b]).power, 1, 'o objeto novo não ganha o +1/+0')],
  [1, '"{2}: ~ can\'t be blocked … except by creatures with haste"', (t, b) => assert.equal(t.objects[b].tempImbloqueavelExceto, undefined, 'o objeto novo não ganha a restrição')]]) {
  test(`M-371 · 400.7: ${nome} com a fonte piscada em resposta não vale sobre a permanente que voltou`, () => {
    let s = mesa(), b, pc; [s, b] = poe(s, 0, 'Bomba'); [s, pc] = poe(s, 0, 'Pisca', 'hand');
    const m = comMana(s, 'WWW'); s = act(m, legais(m, 0, a => a.t === 'activate' && a.oid === b && (a.index || 0) === i)[0]);
    s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === pc && (a.targets || []).some(x => x.oid === b))[0]);
    const t = tudo(s);
    assert.equal(t.objects[b].zone, 'battlefield', 'voltou ao campo'); confere(t, b);
  });
}
test('M-371 · sem piscar, o efeito continua valendo', () => {
  let s = mesa(), b; [s, b] = poe(s, 0, 'Bomba');
  const m = comMana(s, 'W'); const t = tudo(act(m, legais(m, 0, a => a.t === 'activate' && a.oid === b && (a.index || 0) === 0)[0]));
  assert.equal(E.stats(t, t.objects[b]).power, 2);
});
