// T-32 · CR5 · Consequência (aftermath, Comprehensive Rules 702.127, com 709.3 e 400.7).
// Texto da regra: .regras/cr-2026-09-25.txt. Carta exemplo com o texto oficial de .listas/oficiais-tipos.json (Oracle do Forge, consulta
// de 13/10/2026): Spring // Mind.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S as SC, T, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const C = {};
for (const c of L('oficiais-tipos.json').filter(x => x.name === 'Spring // Mind'))
  C[c.name] = { name: c.name, type_line: `${c.type_line} // ${c.verso.type_line}`, mana_cost: `${c.mana_cost} // ${c.verso.mana_cost}`, cmc: valorDeMana(c.mana_cost) + valorDeMana(c.verso.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: ['G', 'U'], layout: 'split' };
for (const [n, k] of Object.entries({ Forest: 'G', Island: 'U' })) C[n] = { name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${k}}.)`, colors: [] };
const carta = (name, type_line, extra = {}) => { C[name] = { name, type_line, mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra }; };
const EX = { example: { target: 'none', expect: { selfLife: 0 } } };
const SCRIPTS = {
  'Anula': { name: 'Anula', effects: [{ do: 'counter', target: 'spell' }], ...EX },
  'Sopro': { name: 'Sopro', effects: [{ do: 'gain', amount: 1 }], ...EX },
};
carta('Anula', 'Instant'); carta('Sopro', 'Instant');

const SM = 'Spring // Mind';
function mesa(seed = 1) {
  const deck = [{ name: SM, qty: 8, zone: 'main' }, { name: 'Anula', qty: 4, zone: 'main' }, { name: 'Sopro', qty: 4, zone: 'main' }, { name: 'Forest', qty: 12, zone: 'main' }, { name: 'Island', qty: 12, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p = 0, n = 9) => { s = J(s); for (const c of 'WUBRGC') s.players[p].pool[c] += n; return s; };
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const esvazia = s => { for (let i = 0; i < 30; i++) { s = passaAte(s, x => !x.stack.length || !!x.pending); if (!s.pending) return s; const os = legais(s, s.pending.p); if (!os.length) return s; s = act(s, os.find(a => a.t === 'pick') || os[0]); } return s; };
const conjuras = (s, p, oid) => legais(s, p, a => a.t === 'cast' && a.oid === oid);

test('CR 702.127a · da mão, só a metade sem consequência (Spring); Mind não é conjurada da mão (nem por pedido direto)', () => {
  let s = mesa(); let c; [s, c] = poe(s, 0, SM, 'hand'); s = mana(s);
  eq([...new Set(conjuras(s, 0, c).map(a => a.face))], ['esquerda']);
  assert.throws(() => E.apply(s, { t: 'cast', p: 0, oid: c, face: 'direita' }));
});

test('CR 702.127a · do cemitério, só a metade com consequência (Mind), pelo custo dela; Spring não', () => {
  let s = mesa(); let c; [s, c] = poe(s, 0, SM, 'graveyard'); s = mana(s);
  const of = conjuras(s, 0, c);
  eq([...new Set(of.map(a => a.face))], ['direita']);
  assert.throws(() => E.apply(s, { t: 'cast', p: 0, oid: c, face: 'esquerda' }));
});

test('CR 702.127a · Mind (instantânea) do cemitério: compra duas e vai para o exílio, não para o cemitério', () => {
  let s = mesa(); let c; [s, c] = poe(s, 0, SM, 'graveyard'); s = mana(s);
  const mao = s.zones[0].hand.length;
  s = esvazia(act(s, conjuras(s, 0, c)[0]));
  eq([s.zones[0].hand.length - mao, s.objects[c].zone, s.objects[c].name], [2, 'exile', SM]);
});

test('CR 702.127a · Mind é instantânea: pode ser conjurada do cemitério no turno do oponente', () => {
  let s = mesa(); let c; [s, c] = poe(s, 0, SM, 'graveyard');
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  let r; [s, r] = poe(s, 1, 'Sopro', 'hand'); s = mana(s, 1); s = mana(s, 0);
  s = act(s, legais(s, 1, a => a.t === 'cast' && a.oid === r)[0]); s = act(s, { t: 'pass', p: 1 });
  assert.ok(conjuras(s, 0, c).length > 0, 'em resposta, no turno do oponente');
});

test('CR 702.127a · Mind anulada também vai para o exílio', () => {
  let s = mesa(); let c; [s, c] = poe(s, 0, SM, 'graveyard'); s = mana(s); s = mana(s, 1);
  s = act(s, conjuras(s, 0, c)[0]);
  let a; [s, a] = poe(s, 1, 'Anula', 'hand');
  s = act(s, { t: 'pass', p: 0 });
  s = act(s, legais(s, 1, x => x.t === 'cast' && x.oid === a && (x.targets || []).some(t => t.oid === c))[0]);
  s = esvazia(s);
  eq(s.objects[c].zone, 'exile');
});

test('Spring // Mind (texto oficial) · Spring da mão busca um terreno básico para o campo virado e a carta vai ao cemitério; depois, Mind dali', () => {
  let s = mesa(); let c; [s, c] = poe(s, 0, SM, 'hand'); s = mana(s);
  const terras = s.zones[0].battlefield.length;
  s = esvazia(act(s, conjuras(s, 0, c)[0]));
  eq([s.zones[0].battlefield.length - terras, s.objects[c].zone], [1, 'graveyard']);
  assert.ok(s.objects[s.zones[0].battlefield[s.zones[0].battlefield.length - 1]].tapped, 'entra virado');
  s = mana(s); assert.ok(conjuras(s, 0, c).some(a => a.face === 'direita'));
});

test('Validador · consequência só na metade direita de carta dividida, instantânea ou feitiço', () => {
  const base = { name: 'X // Y', self: { dividida: true, mana: '{1}', types: ['sorcery'] }, effects: [{ do: 'gain', amount: 1 }], back: { name: 'Y', types: ['instant'], mana: '{2}', effects: [{ do: 'draw', amount: 1 }], aftermath: true }, ...EX };
  eq(SC.validateScript(base), []);
  assert.ok(SC.validateScript({ ...base, back: { ...base.back, aftermath: 'sim' } }).some(e => /consequência/.test(e)));
  assert.ok(SC.validateScript({ ...base, self: { ...base.self, aftermath: true } }).some(e => /consequência/.test(e)), 'na esquerda, não');
});

test('Registro · Mind conjurada do cemitério diz "do cemitério (consequência)", não "lampejo do passado"', () => {
  let s = mesa(); let c; [s, c] = poe(s, 0, SM, 'graveyard'); s = mana(s);
  const a = conjuras(s, 0, c)[0], r = E.apply(s, a);
  const linhas = T.describe(s, a, r.events, r.state).join(' | ');
  assert.ok(/conjurou Mind .*do cemitério \(consequência\)/.test(linhas) && !/lampejo/.test(linhas), linhas);
});

test('CR 709.4a / fatos por nome · uma carta com script próprio que tem o mesmo nome de uma metade (Mind) continua sendo ela, não vira a carta dividida', () => {
  const cards = { ...C, Mind: { name: 'Mind', type_line: 'Sorcery', mana_cost: '{2}{U}', cmc: 3, keywords: [], oracle_text: '', colors: ['U'] } };
  const scripts = { ...SCRIPTS, Mind: { name: 'Mind', effects: [{ do: 'draw', amount: 1 }], ...EX } };
  const s = E.createGame({ format: 'livre', seed: 1, mode: 'full', cards, scripts, players: [{ name: 'A', deck: [{ name: 'Mind', qty: 20, zone: 'main' }, { name: 'Island', qty: 20, zone: 'main' }] }, { name: 'B', deck: [{ name: 'Island', qty: 40, zone: 'main' }] }] });
  const nomes = [...new Set(Object.values(s.objects).filter(o => o.owner === 0).map(o => o.name))].sort();
  eq(nomes, ['Island', 'Mind']);
});
