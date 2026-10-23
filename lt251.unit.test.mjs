// M-569 · LT228 · revisão por lote CCIV (textos da Scryfall de 23/10/2026): frases de mágica do Pauper — Ultimate Alliance ("deals damage equal to the
// number of creatures you control to target creature"), Volcanic Spite (3 de dano em criatura, planeswalker ou batalha; "You may put a card from your hand on
// the bottom of your library. If you do, draw a card." — pôr no fundo não é descartar), Wither and Bloom (−3/−3; do cemitério, "{1}{B}, Exile this card from
// your graveyard: Put a +1/+1 counter on target creature you control. Activate only as a sorcery."), Accumulated Knowledge (a que está na pilha não conta). Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, act, poe, legais, passaAte, limpaMao } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Ultimate Alliance', 'Volcanic Spite', 'Wither and Bloom', 'Accumulated Knowledge'];
const cor = c => [...new Set((c.match(/[WUBRG]/g) || []))];
const C = Object.fromEntries(NOMES.map(n => { const o = OF.find(x => x.name === n); return [n, { name: n, type_line: o.type_line, mana_cost: o.mana_cost, cmc: [...o.mana_cost.matchAll(/\{([^}]+)\}/g)].reduce((t, [, x]) => t + (/^\d+$/.test(x) ? +x : 1), 0), keywords: o.keywords || [], oracle_text: o.oracle_text, colors: cor(o.mana_cost) }]; }));
Object.assign(C, Object.fromEntries([['Plains', 'W'], ['Island', 'U'], ['Swamp', 'B'], ['Mountain', 'R']].map(([n, k]) => [n, { name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${k}}.)`, colors: [] }])),
  { Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{W}', cmc: 2, keywords: [], oracle_text: '', power: '2', toughness: '2', colors: ['W'] },
    Gigante: { name: 'Gigante', type_line: 'Creature — Giant', mana_cost: '{4}', cmc: 4, keywords: [], oracle_text: '', power: '3', toughness: '5', colors: [] },
    Madness: { name: 'Madness', type_line: 'Creature — Horror', mana_cost: '{3}', cmc: 3, keywords: ['Madness'], oracle_text: 'Madness {0}', power: '1', toughness: '1', colors: [] } });
function mesa(deckA, deckB = [['Gigante', 4], ['Island', 36]]) {
  const b = ns => ns.map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 251, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b(deckA) }, { name: 'B', deck: b(deckB) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  return limpaMao(s, 0);
}
const resolve = (s, escolha = (pd, st) => legais(st, pd.p)[0]) => { for (let i = 0; i < 40 && (s.stack.length || s.pending); i++) { const pd = s.pending; s = pd ? act(s, escolha(pd, s)) : act(s, { t: 'pass', p: s.turn.priority }); } return s; };

test('M-569 · as quatro jogam (lidas e aprovadas)', () => { for (const n of NOMES) assert.equal(S.coverage(C[n]).level, 'completo', n); });

test('M-569 · Ultimate Alliance: dano igual às criaturas que você controla, contadas na resolução', () => {
  let s = mesa([['Ultimate Alliance', 2], ['Urso', 4], ['Plains', 34]]), u, g; [s, u] = poe(s, 0, 'Ultimate Alliance', 'hand'); [s] = poe(s, 0, 'Plains');
  for (let i = 0; i < 3; i++) [s] = poe(s, 0, 'Urso'); [s, g] = poe(s, 1, 'Gigante');
  s = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === u && (a.targets || []).some(t => t.oid === g))[0]));
  assert.equal(s.objects[g].damage, 3, 'três criaturas, três de dano');
});

test('M-569 · Volcanic Spite: 3 de dano; pôr uma carta no fundo (sem descartar: insanidade não dispara) e comprar uma — ou recusar', () => {
  let s = mesa([['Volcanic Spite', 2], ['Madness', 2], ['Mountain', 36]]), v, m, g; [s, v] = poe(s, 0, 'Volcanic Spite', 'hand'); [s, m] = poe(s, 0, 'Madness', 'hand'); for (let i = 0; i < 2; i++) [s] = poe(s, 0, 'Mountain');
  [s, g] = poe(s, 1, 'Gigante');
  const c = legais(s, 0, a => a.t === 'cast' && a.oid === v && (a.targets || []).some(t => t.oid === g)); assert.ok(c.length);
  const mao0 = s.zones[0].hand.length; const fundo0 = s.zones[0].library.length;
  let t = resolve(act(s, c[0]), (pd, st) => pd.kind === 'pick' ? (legais(st, pd.p, a => a.t === 'pick' && a.oid === m)[0] || legais(st, pd.p, a => a.t === 'pick_done')[0]) : legais(st, pd.p)[0]);
  assert.equal(t.objects[g].damage, 3);
  assert.equal(t.objects[m].zone, 'library'); assert.equal(t.zones[0].library[t.zones[0].library.length - 1], m, 'no fundo do grimório'); assert.ok(!t.stack.length && !t.pending, 'insanidade não pergunta: não é descarte');
  assert.equal(t.zones[0].hand.length, mao0 - 2 + 1, 'saiu a mágica e a carta, entrou uma comprada');
  let r = resolve(act(s, c[0]), (pd, st) => pd.kind === 'pick' ? legais(st, pd.p, a => a.t === 'pick_done')[0] : legais(st, pd.p)[0]);
  assert.equal(r.objects[m].zone, 'hand'); assert.equal(r.zones[0].hand.length, mao0 - 1, 'recusou: nada muda');
});

test('M-569 · Wither and Bloom: −3/−3; do cemitério, {1}{B} e exilá-la põe um marcador +1/+1 numa criatura sua (só como feitiço)', () => {
  let s = mesa([['Wither and Bloom', 2], ['Urso', 2], ['Swamp', 36]]), w, u, g; [s, w] = poe(s, 0, 'Wither and Bloom', 'hand'); for (let i = 0; i < 4; i++) [s] = poe(s, 0, 'Swamp');
  [s, u] = poe(s, 0, 'Urso'); [s, g] = poe(s, 1, 'Gigante');
  s = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === w && (a.targets || []).some(t => t.oid === g))[0]));
  assert.equal(E.stats(s, s.objects[g]).toughness, 2); assert.equal(s.objects[w].zone, 'graveyard');
  const at = legais(s, 0, a => a.t === 'activate' && a.oid === w); assert.ok(at.length, 'ativa do cemitério');
  assert.ok(at.every(a => (a.targets || []).every(t => s.objects[t.oid].controller === 0)), 'só criatura sua');
  const t = resolve(act(s, at.find(a => (a.targets || []).some(x => x.oid === u)))); assert.equal(t.objects[w].zone, 'exile'); assert.equal(t.objects[u].counters.p1p1, 1);
  const s2 = JSON.parse(JSON.stringify(s)); s2.turn.step = 'combat_begin'; assert.equal(legais(s2, 0, a => a.t === 'activate' && a.oid === w).length, 0, 'só como feitiço');
});

test('M-569 · Accumulated Knowledge: compra 1 e mais uma por cópia nos cemitérios (a da pilha não conta)', () => {
  let s = mesa([['Accumulated Knowledge', 4], ['Island', 36]], [['Accumulated Knowledge', 4], ['Island', 36]]), a1, a2, b1;
  [s, a1] = poe(s, 0, 'Accumulated Knowledge', 'hand'); [s, a2] = poe(s, 0, 'Accumulated Knowledge', 'graveyard'); [s, b1] = poe(s, 1, 'Accumulated Knowledge', 'graveyard'); for (let i = 0; i < 2; i++) [s] = poe(s, 0, 'Island');
  const mao0 = s.zones[0].hand.length; s = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === a1)[0]));
  assert.equal(s.zones[0].hand.length, mao0 - 1 + 3, '1 + 2 cópias nos cemitérios (dos dois jogadores)');
});
