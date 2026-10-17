// M-420 · LT86 · "Look at the top N cards of your library. You may reveal a creature card with power 2 or less from among them and put it into your hand. Put the
// rest on the bottom of your library in a random order." (Militia Bugler, Living Phone, Squad Rallier; texto da Scryfall de 17/10/2026 UTC), caminho de produção
// (APROVADAS). Filtro novo `powerMax` (poder impresso fora do campo). Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, palavrasDoTexto, valorDeMana, S } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Living Phone', 'Militia Bugler', 'Squad Rallier'];
const C = {}; for (const n of NOMES) { const c = OF.find(x => x.name === n); C[n] = { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: palavrasDoTexto(c.oracle_text), oracle_text: c.oracle_text, colors: ['W'], power: c.power, toughness: c.toughness }; }
const cr = (name, p) => ({ name, type_line: 'Creature — Test', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], power: String(p), toughness: '1' });
C.P1 = cr('P1', 1); C.P2 = cr('P2', 2); C.P3 = cr('P3', 3); C.Estrela = { ...cr('Estrela', '*'), power: '*', toughness: '*' };
C.Plains = { name: 'Plains', type_line: 'Basic Land — Plains', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {W}.)', colors: [] };
function mesa(seed = 27) {
  const b = ns => ns.map(name => ({ name, qty: 6, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'P1', 'P2', 'P3', 'Estrela', 'Plains']) }, { name: 'B', deck: [{ name: 'Plains', qty: 30, zone: 'main' }] }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const topo = (s, nomes) => { s = J(s); const L = s.zones[0].library; for (const n of [...nomes].reverse()) { const i = L.findIndex(o => s.objects[o].name === n); const [o] = L.splice(i, 1); L.unshift(o); } return s; };

test('LT86 · as três jogam pelo leitor aprovado', () => {
  for (const n of NOMES) { assert.equal(S.coverage(C[n]).level, 'completo', n); assert.equal(S.APROVADAS[n].leva, 'M-420'); }
});

test('LT86 · Militia Bugler: olha as 4 de cima; só criatura de poder 2 ou menos pode ir para a mão (poder "*" fora do campo não serve); o resto vai para o fundo', () => {
  let s = mesa(), mb; [s, mb] = poe(s, 0, 'Militia Bugler', 'hand'); for (let i = 0; i < 3; i++) [s] = poe(s, 0, 'Plains');
  s = topo(s, ['P3', 'P2', 'Estrela', 'Plains']); const quatro = s.zones[0].library.slice(0, 4);
  s = passaAte(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === mb)[0]), x => !!x.pending && x.pending.kind === 'pick');
  const pd = s.pending; assert.deepEqual([...pd.from].sort(), [...quatro].sort()); assert.equal(pd.min, 0); assert.equal(pd.max, 1);
  const pode = legais(s, 0, a => a.t === 'pick').map(a => s.objects[a.oid].name); assert.deepEqual([...new Set(pode)], ['P2'], JSON.stringify(pode));
  const p2 = quatro.find(o => s.objects[o].name === 'P2'); let t = passaAte(act(s, legais(s, 0, a => a.t === 'pick' && a.oid === p2)[0]), x => !x.pending || x.pending.kind !== 'pick');
  if (t.pending && t.pending.kind === 'pick') t = act(t, legais(t, 0, a => a.t !== 'pick')[0]);
  t = passaAte(t, x => !x.stack.length && !x.pending, 20);
  assert.equal(t.objects[p2].zone, 'hand'); const L = t.zones[0].library; assert.ok(quatro.filter(o => o !== p2).every(o => L.slice(-3).includes(o)), 'os outros três no fundo');
});
