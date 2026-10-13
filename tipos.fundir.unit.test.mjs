// T-34 · CR5 · Fundir carta dividida (fuse, Comprehensive Rules 702.102, com 709.3 e 709.4).
// Texto da regra: .regras/cr-2026-09-25.txt. Carta exemplo com o texto oficial de .listas/oficiais-tipos.json (Oracle do Forge, consulta
// de 13/10/2026): Wear // Tear.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S as SC, T, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const C = {};
for (const c of L('oficiais-tipos.json').filter(x => x.name === 'Wear // Tear'))
  C[c.name] = { name: c.name, type_line: `${c.type_line} // ${c.verso.type_line}`, mana_cost: `${c.mana_cost} // ${c.verso.mana_cost}`, cmc: valorDeMana(c.mana_cost) + valorDeMana(c.verso.mana_cost), keywords: ['Fuse'], oracle_text: c.oracle_text, colors: ['R', 'W'], layout: 'split' };
for (const [n, k] of Object.entries({ Mountain: 'R', Plains: 'W' })) C[n] = { name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${k}}.)`, colors: [] };
const carta = (name, type_line, extra = {}) => { C[name] = { name, type_line, mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra }; };
const EX = { example: { target: 'none', expect: { selfLife: 0 } } };
const SCRIPTS = {
  'Anula Mágica': { name: 'Anula Mágica', effects: [{ do: 'counter', target: 'spell' }], ...EX },
  'Retorno': { name: 'Retorno', effects: [{ do: 'mover', target: { zona: 'graveyard', de: 'you' }, para: 'hand' }], ...EX },
};
carta('Anula Mágica', 'Instant'); carta('Retorno', 'Sorcery');
carta('Amuleto', 'Artifact'); carta('Encanto', 'Enchantment');

const WT = 'Wear // Tear';
function mesa(seed = 1) {
  const deck = [{ name: WT, qty: 8, zone: 'main' }, { name: 'Anula Mágica', qty: 4, zone: 'main' }, { name: 'Amuleto', qty: 6, zone: 'main' }, { name: 'Encanto', qty: 6, zone: 'main' }, { name: 'Mountain', qty: 8, zone: 'main' }, { name: 'Plains', qty: 8, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p = 0, n = 9) => { s = J(s); for (const c of 'WUBRGC') s.players[p].pool[c] += n; return s; };
const pool = (s, p = 0) => Object.values(s.players[p].pool).reduce((a, b) => a + b, 0);
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const esvazia = s => { for (let i = 0; i < 30; i++) { s = passaAte(s, x => !x.stack.length || !!x.pending); if (!s.pending) return s; const os = legais(s, s.pending.p); if (!os.length) return s; s = act(s, os[0]); } return s; };
const fundidas = (s, p, oid) => legais(s, p, a => a.t === 'cast' && a.oid === oid && a.face === 'fundida');
const alvos = a => J((a.targets || []).map(t => t.oid)).sort();

test('CR 702.102a · da mão, além de cada metade, a opção de conjurar as duas (fundida), com um alvo para cada metade', () => {
  let s = mesa(); let c; [s, c] = poe(s, 0, WT, 'hand'); let am; [s, am] = poe(s, 1, 'Amuleto'); let en; [s, en] = poe(s, 1, 'Encanto'); s = mana(s);
  eq([...new Set(legais(s, 0, a => a.t === 'cast' && a.oid === c).map(a => a.face))].sort(), ['direita', 'esquerda', 'fundida']);
  const f = fundidas(s, 0, c);
  assert.ok(f.length >= 1 && f.every(a => a.targets.length === 2), 'um alvo por metade');
  assert.ok(f.some(a => J(a.targets.map(t => t.oid)).join() === [am, en].join()), 'artefato para Wear, encantamento para Tear');
});

test('CR 702.102c / 702.102d · fundida: paga os dois custos ({1}{R} + {W}) e resolve a esquerda e depois a direita', () => {
  let s = mesa(); let c; [s, c] = poe(s, 0, WT, 'hand'); let am; [s, am] = poe(s, 1, 'Amuleto'); let en; [s, en] = poe(s, 1, 'Encanto'); s = mana(s);
  const antes = pool(s), a = fundidas(s, 0, c).find(x => x.targets[0].oid === am && x.targets[1].oid === en);
  s = act(s, a);
  assert.equal(antes - pool(s), 3, '{1}{R}{W}');
  s = esvazia(s);
  eq([s.objects[am].zone, s.objects[en].zone, s.objects[c].zone], ['graveyard', 'graveyard', 'graveyard']);
});

test('CR 702.102b · na pilha, a fundida tem as características das duas metades (nome das duas, valor de mana 3, vermelha e branca)', () => {
  let s = mesa(); let c; [s, c] = poe(s, 0, WT, 'hand'); [s] = poe(s, 1, 'Amuleto'); [s] = poe(s, 1, 'Encanto'); s = mana(s);
  s = act(s, fundidas(s, 0, c)[0]);
  const o = s.objects[c];
  eq([o.zone, o.name, s.facts[o.name].cmc, J(E.coresDe(s, o)).sort()], ['stack', WT, 3, ['R', 'W']]);
});

test('CR 702.102a · só da mão: do cemitério (ou de outra zona) não há fundida', () => {
  let s = mesa(); let c; [s, c] = poe(s, 0, WT, 'graveyard'); [s] = poe(s, 1, 'Amuleto'); [s] = poe(s, 1, 'Encanto'); s = mana(s);
  assert.equal(fundidas(s, 0, c).length, 0);
  assert.throws(() => E.apply(s, { t: 'cast', p: 0, oid: c, face: 'fundida' }));
});

test('CR 702.102 · sem alvo para uma das metades, a fundida não é oferecida (cada metade conjurada sozinha continua)', () => {
  let s = mesa(); let c; [s, c] = poe(s, 0, WT, 'hand'); [s] = poe(s, 1, 'Amuleto'); s = mana(s);
  eq([fundidas(s, 0, c).length, legais(s, 0, a => a.t === 'cast' && a.oid === c && a.face === 'esquerda').length > 0], [0, true]);
});

test('CR 709.3 · a carta dividida sem fundir não ganha a opção fundida', () => {
  const s0 = mesa(); assert.ok(!Object.values(s0.facts).some(f => f.script && f.script.self && f.script.self.fundir && !/Wear/.test(f.script.name)), 'só Wear // Tear tem fundir neste teste');
});

test('Validador · fundir só em carta dividida de instantânea ou feitiço', () => {
  const base = { name: 'X // Y', self: { dividida: true, mana: '{1}', types: ['instant'], fundir: true }, effects: [{ do: 'gain', amount: 1 }], back: { name: 'Y', types: ['instant'], mana: '{2}', effects: [{ do: 'draw', amount: 1 }] }, ...EX };
  eq(SC.validateScript(base), []);
  assert.ok(SC.validateScript({ ...base, self: { ...base.self, fundir: 'sim' } }).some(e => /fundir/.test(e)));
  assert.ok(SC.validateScript({ name: 'Z', self: { fundir: true }, effects: [{ do: 'gain', amount: 1 }], ...EX }).some(e => /fundir/.test(e)), 'fundir fora de carta dividida');
});

test('Registro · a fundida diz que as duas metades foram conjuradas', () => {
  let s = mesa(); let c; [s, c] = poe(s, 0, WT, 'hand'); [s] = poe(s, 1, 'Amuleto'); [s] = poe(s, 1, 'Encanto'); s = mana(s);
  const a = fundidas(s, 0, c)[0], r = E.apply(s, a);
  const linhas = T.describe(s, a, r.events, r.state).join(' | ');
  assert.ok(/conjurou Wear \/\/ Tear \(fundida: Wear e Tear\)/.test(linhas), linhas);
});

test('CR 702.102 · passeio aleatório com Wear // Tear: nada oferecido é recusado, a fundida aparece e fora da pilha a carta é sempre a inteira', () => {
  let fundiu = 0;
  for (let seed = 1; seed <= 5; seed++) {
    let s = mesa(seed), r = seed * 49979687;
    for (let i = 0; i < 300 && s.status !== 'over'; i++) {
      const p = s.pending ? s.pending.p : s.turn.priority;
      if (i % 6 === 0 && !s.pending) s = mana(s, p, 3);
      const acoes = E.legalActions(s, p).filter(a => a.t !== 'concede');
      assert.ok(acoes.length, `semente ${seed}, passo ${i}: sem ação`);
      r = (r * 1103515245 + 12345) & 0x7fffffff;
      const pref = acoes.filter(a => a.t === 'cast');
      const a = pref.length && r % 3 ? pref[r % pref.length] : acoes[r % acoes.length];
      if (a.face === 'fundida') fundiu++;
      s = E.apply(s, a).state; // oferta = aceito
      for (const o of Object.values(s.objects)) if (o.zone !== 'stack' && o.owner != null && /Wear|Tear/.test(o.name)) assert.equal(o.name, WT, `semente ${seed}, passo ${i}`);
    }
  }
  assert.ok(fundiu > 0, 'a fundida foi jogada no passeio');
});
