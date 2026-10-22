// M-556 · LT215 · revisão por lote CXCI (texto e ruling da Scryfall de 21/10/2026): Up the Beanstalk ("When this enchantment enters and whenever you
// cast a spell with mana value 5 or greater, draw a card."). Dois gatilhos; o valor de mana na pilha conta o X (ruling de 01/09/2023, 202.3). Falha no
// motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, act, poe, legais, passaAte } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const UB = 'Up the Beanstalk', ub = OF.find(x => x.name === UB);
const C = { [UB]: { name: UB, type_line: ub.type_line, mana_cost: ub.mana_cost, cmc: 2, keywords: [], oracle_text: ub.oracle_text, colors: ['G'] },
  Forest: { name: 'Forest', type_line: 'Basic Land — Forest', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {G}.)', colors: [] },
  Grande: { name: 'Grande', type_line: 'Sorcery', mana_cost: '{4}{G}', cmc: 5, keywords: [], oracle_text: '', colors: ['G'] },
  Media: { name: 'Media', type_line: 'Sorcery', mana_cost: '{3}{G}', cmc: 4, keywords: [], oracle_text: '', colors: ['G'] },
  Xis: { name: 'Xis', type_line: 'Sorcery', mana_cost: '{X}{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'] } };
const EX = { example: { target: 'none', expect: { selfLife: 0 } } };
const SCRIPTS = Object.fromEntries(['Grande', 'Media', 'Xis'].map(n => [n, { name: n, effects: [{ do: 'gain', amount: 1 }], ...EX }]));
function mesa() {
  const b = ns => ns.map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 238, mode: 'full', cards: C, scripts: SCRIPTS, first: 0, players: [{ name: 'A', deck: b([[UB, 4], ['Grande', 4], ['Media', 4], ['Xis', 4], ['Forest', 24]]) }, { name: 'B', deck: b([['Forest', 40]]) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const limpa = s => passaAte(s, x => !!x.pending || (!x.stack.length && !(x.queued || []).length));
const florestas = (s, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, 'Forest'); return s; };

test('M-556 · Up the Beanstalk joga (lido e aprovado)', () => { assert.equal(S.coverage(C[UB]).level, 'completo'); });

test('M-556 · ao entrar compra; mágica de valor 5 compra, de valor 4 não; com X, o X conta', () => {
  let s = mesa(), u; [s, u] = poe(s, 0, UB, 'hand'); s = florestas(s, 2); let m = s.zones[0].hand.length;
  s = limpa(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === u)[0])); assert.equal(s.zones[0].hand.length - m, 0, 'saiu 1 (ela) e entrou 1');
  const conjura = (s, nome, x) => { let c; [s, c] = poe(s, 0, nome, 'hand'); s = florestas(s, 5); const m0 = s.zones[0].hand.length; s = limpa(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === c && (x == null || a.x === x))[0])); return [s, s.zones[0].hand.length - m0]; };
  let d; [s, d] = conjura(s, 'Grande'); assert.equal(d, 0, 'valor 5: −1 +1');
  [s, d] = conjura(s, 'Media'); assert.equal(d, -1, 'valor 4: não compra');
  [s, d] = conjura(s, 'Xis', 3); assert.equal(d, 0, 'X = 3: valor 5 na pilha, compra');
  [s, d] = conjura(s, 'Xis', 2); assert.equal(d, -1, 'X = 2: valor 4, não');
});
