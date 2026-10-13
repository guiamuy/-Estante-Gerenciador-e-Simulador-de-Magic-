// M-374 · 608.2n · a mágica que para numa escolha no meio da resolução (descartar e comprar, procurar no grimório) só sai da pilha no último passo,
// depois da escolha: fica por cima das cartas descartadas no cemitério. Achado da revisão independente da M-373. Os testes falham no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, act, poe, legais, passaAte, resolveUm, CARTAS } from './cmd.mjs';
import { valorDeMana, palavrasDoTexto, limpaMao } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const cores = c => [...new Set((c || '').match(/[WUBRG]/g) || [])];
const NOVAS = {};
for (const n of ['Devoted Druid', "Martyr's Soul", 'Heritage Reclamation', 'Thrilling Discovery']) { const c = OF.find(x => x.name === n);
  NOVAS[n] = { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: palavrasDoTexto(c.oracle_text), oracle_text: c.oracle_text, colors: cores(c.mana_cost), ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; }
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: 1, keywords: [], oracle_text: '', colors: cores(mana_cost), ...extra });
const EXTRA = { Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2' }), Soldado: c0('Soldado', 'Creature — Soldier', '{W}', { power: '1', toughness: '1' }) };
const BUSCA = { name: 'Busca', effects: [{ do: 'search', amount: 1, filter: { types: ['land'] }, to: 'hand' }, { do: 'draw', amount: 1 }], example: { target: 'none', expect: { selfLife: 20 } } };
EXTRA.Busca = c0('Busca', 'Sorcery', '{G}'); EXTRA.Ameaca = c0('Ameaca', 'Sorcery', '{G}');
const AMEACA = { name: 'Ameaca', effects: [{ do: 'unless_pays', cost: '{1}', effects: [{ do: 'discard', amount: 1 }, { do: 'gain', amount: 2 }] }], example: { target: 'none', expect: { selfLife: 20 } } };
function mesa(a, seed = 5) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 6, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: { ...CARTAS, ...NOVAS, ...EXTRA }, scripts: { Busca: BUSCA, Ameaca: AMEACA }, first: 0,
    players: [{ name: 'A', deck: baralho([...a, 'Plains', 'Forest', 'Mountain']) }, { name: 'B', deck: baralho(['Island', 'Swamp']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending);
const recusa = (s, a) => { try { E.apply(s, a); return false; } catch (e) { return true; } };


test('M-374 · Thrilling Discovery: enquanto o jogador escolhe o descarte, a mágica continua na pilha; no fim, ela fica por cima das duas descartadas no cemitério', () => {
  let s = limpaMao(mesa(['Thrilling Discovery', 'Urso']), 0), td; [s, td] = poe(s, 0, 'Thrilling Discovery', 'hand');
  const mao = []; for (let i = 0; i < 2; i++) { let o; [s, o] = poe(s, 0, 'Urso', 'hand'); mao.push(o); }
  [s] = poe(s, 0, 'Plains'); [s] = poe(s, 0, 'Mountain');
  s = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === td)[0]));
  assert.equal(s.pending && s.pending.kind, 'pick');
  assert.equal(s.objects[td].zone, 'stack', 'ainda resolvendo: na pilha');
  s = act(act(s, { t: 'pick', p: 0, oid: mao[0] }), { t: 'pick', p: 0, oid: mao[1] });
  assert.equal(s.objects[td].zone, 'graveyard'); assert.deepEqual([...s.stack], []);
  assert.deepEqual([...s.zones[0].graveyard].slice(-3).sort(), [mao[0], mao[1], td].sort(), 'as duas descartadas e a mágica');
  assert.equal(s.zones[0].graveyard.at(-1), td, 'a mágica é a última a chegar (608.2n)');
  assert.equal(s.zones[0].hand.length, 3);
});

test('M-374 · procurar no grimório no meio da resolução: a mágica fica na pilha durante a busca e o efeito seguinte (comprar) acontece antes dela sair', () => {
  let s = limpaMao(mesa(['Busca', 'Urso']), 0), b; [s, b] = poe(s, 0, 'Busca', 'hand'); [s] = poe(s, 0, 'Forest');
  s = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === b)[0]));
  assert.equal(s.pending && s.pending.kind, 'pick'); assert.equal(s.objects[b].zone, 'stack');
  const terreno = legais(s, 0, a => a.t === 'pick')[0]; assert.ok(terreno);
  s = act(s, terreno); if (s.pending) s = act(s, { t: 'pick_done', p: 0 });
  assert.equal(s.objects[b].zone, 'graveyard'); assert.equal(s.zones[0].hand.length, 2, 'o terreno achado e a compra');
  assert.deepEqual([...s.stack], []);
});

test('M-374 · achado da revisão: "a menos que pague" com um "senão" de dois passos (o primeiro com escolha) não deixa a mágica presa nem a faz resolver de novo', () => {
  let s = limpaMao(mesa(['Ameaca', 'Urso']), 0), am, ur; [s, am] = poe(s, 0, 'Ameaca', 'hand'); [s, ur] = poe(s, 0, 'Urso', 'hand'); [s] = poe(s, 0, 'Forest'); [s] = poe(s, 0, 'Forest');
  s = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === am)[0]));
  assert.ok(s.pending && s.pending.kind !== 'discard', 'com mana sobrando, pergunta se paga'); s = act(s, legais(s, s.pending.p).find(a => a.t === 'decline'));
  assert.equal(s.pending && s.pending.kind, 'discard'); assert.equal(s.objects[am].zone, 'stack');
  if (s.pending && s.pending.kind === 'discard') s = act(s, { t: 'discard', p: 0, oid: ur });
  assert.equal(s.objects[am].zone, 'graveyard'); assert.deepEqual([...s.stack], []);
  s = act(act(s, { t: 'pass', p: 0 }), { t: 'pass', p: 1 });
  assert.ok(!s.pending || s.pending.kind !== 'may_pay', 'não pergunta de novo: a mágica resolveu uma vez só');
});
