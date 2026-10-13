// T-45 · CR5 · Completado (Comprehensive Rules 702.150, com 107.4f, 306.5b e 614.1c).
// Texto da regra: .regras/cr-2026-09-25.txt. As cartas "de teste" são scripts sintéticos que isolam a regra; os planeswalkers
// completados reais seguem manuais até as habilidades de lealdade deles terem script (ver ROADMAP, CR5-T45).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, S as SC, J, act, poe, legais, passaAte } from './listas.mjs';

const C = {};
const carta = (name, type_line, extra = {}) => { C[name] = { name, type_line, mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra }; };
const EX = { example: { target: 'none', expect: { selfLife: 0 } } };
// planeswalker de teste: {2}{U}{U/P}, lealdade 5, completado; "+1: compre uma carta"
carta('Sábio Completado', 'Legendary Planeswalker — Teste', { mana_cost: '{2}{U}{U/P}', cmc: 4, keywords: ['Compleated'], oracle_text: 'Compleated', colors: ['U'], loyalty: '5' });
carta('Sábio Comum', 'Legendary Planeswalker — Outro', { mana_cost: '{2}{U}{U/P}', cmc: 4, keywords: [], oracle_text: '', colors: ['U'], loyalty: '5' });
carta('Volta', 'Instant');
carta('Island', 'Basic Land — Island', { mana_cost: '', cmc: 0, oracle_text: '({T}: Add {U}.)' });
const SCRIPTS = {
  'Volta': { name: 'Volta', effects: [{ do: 'bounce', target: 'permanent' }], ...EX },
  'Sábio Completado': { name: 'Sábio Completado', loyalty: [{ cost: 1, label: '+1: compre uma carta', effects: [{ do: 'draw', amount: 1 }] }], ...EX },
  'Sábio Comum': { name: 'Sábio Comum', loyalty: [{ cost: 1, label: '+1: compre uma carta', effects: [{ do: 'draw', amount: 1 }] }], ...EX },
};
function mesa(seed = 1) {
  const deck = [{ name: 'Sábio Completado', qty: 4, zone: 'main' }, { name: 'Sábio Comum', qty: 4, zone: 'main' }, { name: 'Volta', qty: 3, zone: 'main' }, { name: 'Island', qty: 29, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p = 0, n = 9) => { s = J(s); for (const c of 'WUBRGC') s.players[p].pool[c] += n; return s; };
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const esvazia = s => passaAte(s, x => !x.stack.length || !!x.pending);
const conjura = (s, nome, vida) => { let c; [s, c] = poe(s, 0, nome, 'hand'); s = mana(s); const a = legais(s, 0, x => x.t === 'cast' && x.oid === c && (x.vida || 0) === vida)[0]; assert.ok(a, `oferta com ${vida} símbolo(s) pago(s) com vida`); return [esvazia(act(s, a)), c]; };

test('CR 702.150a · completado: pagando o símbolo phyrexiano com vida, entra com dois marcadores de lealdade a menos (5 → 3)', () => {
  let [s, c] = conjura(mesa(), 'Sábio Completado', 1);
  eq([s.objects[c].zone, s.objects[c].counters.loyalty], ['battlefield', 3]);
});

test('CR 702.150a · pagando com mana, entra com a lealdade impressa (5)', () => {
  let [s, c] = conjura(mesa(), 'Sábio Completado', 0);
  eq(s.objects[c].counters.loyalty, 5);
});

test('CR 702.150a · sem completado, pagar com vida não muda a lealdade', () => {
  let [s, c] = conjura(mesa(), 'Sábio Comum', 1);
  eq(s.objects[c].counters.loyalty, 5);
});

test('CR 702.150a · 400.7 · a marca do pagamento é da conjuração: devolvido à mão e conjurado de novo pagando com mana, entra com 5', () => {
  let [s, c] = conjura(mesa(), 'Sábio Completado', 1);
  eq([s.objects[c].counters.loyalty, s.objects[c].vidaPhyrexianaT], [3, 1]);
  let v; [s, v] = poe(s, 0, 'Volta', 'hand'); s = mana(s);
  s = esvazia(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === v && a.targets[0].oid === c)[0]));
  eq([s.objects[c].zone, s.objects[c].vidaPhyrexianaT || 0], ['hand', 0]);
  s = mana(s); s = esvazia(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === c && !(a.vida || 0))[0]));
  eq(s.objects[c].counters.loyalty, 5);
});
