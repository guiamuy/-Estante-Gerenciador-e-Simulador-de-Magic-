// M-339 · LT22 · "Look at the top N cards of your library, then put them back in any order" (o jogador escolhe a ordem), "You may shuffle"
// (701.24: a mesa pergunta) e "Add three mana of any one color" (Black Lotus). Scripts lidos pelo leitor; texto oficial em
// .listas/oficiais-revisadas.json (Oracle do Forge, 12/10/2026). Cada teste falha no leitor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, comMana, tudo, CARTAS } from './cmd.mjs';
import { loadModules } from './_load.mjs';

const { leitor: L, scripts: S } = loadModules();
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const mv = m => [...m.matchAll(/\{([^}]+)\}/g)].reduce((n, x) => n + (/^\d+$/.test(x[1]) ? +x[1] : 1), 0);
const carta = n => { const c = OF.find(x => x.name === n); assert.ok(c, n); return { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: mv(c.mana_cost), keywords: /^Flying/m.test(c.oracle_text) ? ['Flying'] : [], oracle_text: c.oracle_text, colors: [...new Set(c.mana_cost.match(/[WUBRG]/g) || [])], ...(c.power ? { power: c.power, toughness: c.toughness } : {}) }; };
const NOMES = ['Ponder', 'Black Lotus', 'Sage Owl', 'Crystal Seer'];
const cards = Object.fromEntries(NOMES.map(n => [n, carta(n)]));
const scripts = Object.fromEntries(NOMES.map(n => [n, { ...L.ler(carta(n)).script, example: { action: 'etb', target: 'none', expect: { attached: false } } }]));
scripts.Ponder.example = { target: 'none', expect: { picked: true } };
function mesaX(a = []) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 19, mode: 'full', cards: { ...CARTAS, ...cards }, scripts, first: 0, players: [{ name: 'A', deck: baralho([...a, 'Island', 'Plains', 'Swamp']) }, { name: 'B', deck: baralho(['Forest', 'Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolveSo = s => act(act(s, { t: 'pass', p: s.turn.priority }), { t: 'pass', p: 1 - s.turn.priority });

test('LT22 · Ponder: olha as três de cima e as devolve na ordem escolhida (a primeira escolhida fica em cima); pode não embaralhar; compra uma', () => {
  let s = mesaX(['Ponder']), pd;
  [s, pd] = poe(s, 0, 'Ponder', 'hand');
  const topo = s.zones[0].library.slice(0, 3), h = s.zones[0].hand.length;
  s = resolveSo(act(comMana(s, 'U'), legais(comMana(s, 'U'), 0, x => x.t === 'cast' && x.oid === pd)[0]));
  assert.equal(s.pending.kind, 'pick'); assert.equal(s.pending.label, 'ordenar o topo'); assert.equal(s.pending.min, 3);
  for (const o of [topo[2], topo[0], topo[1]]) s = act(s, { t: 'pick', p: 0, oid: o });
  if (s.pending && s.pending.kind === 'pick') s = act(s, { t: 'pick_done', p: 0 });
  assert.equal(s.pending && s.pending.kind, 'may_pay', '"You may shuffle": a mesa pergunta');
  s = tudo(act(s, { t: 'decline', p: 0 }));
  assert.equal(s.zones[0].hand.length, h - 1 + 1, 'comprou uma');
  assert.ok(s.zones[0].hand.includes(topo[2]), 'comprou a que pôs em cima');
  assert.equal(JSON.stringify(s.zones[0].library.slice(0, 2)), JSON.stringify([topo[0], topo[1]]), 'as outras na ordem escolhida');
});

test('LT22 · Ponder aceitando embaralhar: o grimório é embaralhado antes da compra', () => {
  let s = mesaX(['Ponder']), pd;
  [s, pd] = poe(s, 0, 'Ponder', 'hand');
  const antes = s.zones[0].library.slice(), h = s.zones[0].hand.length;
  s = resolveSo(act(comMana(s, 'U'), legais(comMana(s, 'U'), 0, x => x.t === 'cast' && x.oid === pd)[0]));
  for (const o of s.pending.from.slice()) s = act(s, { t: 'pick', p: 0, oid: o });
  if (s.pending && s.pending.kind === 'pick') s = act(s, { t: 'pick_done', p: 0 });
  s = tudo(act(s, { t: 'pay', p: 0 }));
  assert.notEqual(JSON.stringify(s.zones[0].library), JSON.stringify(antes.slice(1)), 'embaralhou');
  assert.equal(s.zones[0].hand.length, h - 1 + 1, 'e comprou uma (observação da revisão)'); assert.equal(s.zones[0].library.length, antes.length - 1);
});

test('LT22 · Sage Owl: ao entrar, reordena as quatro de cima (sem embaralhar nem comprar)', () => {
  let s = mesaX(['Sage Owl']), so;
  [s, so] = poe(s, 0, 'Sage Owl', 'hand');
  const topo = s.zones[0].library.slice(0, 4);
  s = act(comMana(s, 'UU'), legais(comMana(s, 'UU'), 0, x => x.t === 'cast' && x.oid === so)[0]);
  s = passaAte(resolveSo(s), x => !!x.pending || !x.stack.length);
  assert.equal(s.pending.kind, 'pick'); assert.equal(s.pending.from.length, 4);
  for (const o of [...topo].reverse()) s = act(s, { t: 'pick', p: 0, oid: o });
  if (s.pending && s.pending.kind === 'pick') s = act(s, { t: 'pick_done', p: 0 });
  s = tudo(s);
  assert.equal(JSON.stringify(s.zones[0].library.slice(0, 4)), JSON.stringify([...topo].reverse()), 'ordem invertida como escolhida');
});

test('LT22 · Black Lotus: virar e sacrificar dá três manas de uma cor escolhida', () => {
  let s = mesaX(['Black Lotus']), bl;
  [s, bl] = poe(s, 0, 'Black Lotus');
  const a = legais(s, 0, x => x.t === 'activate' && x.oid === bl && x.color === 'B')[0]; assert.ok(a, 'escolhe a cor');
  s = act(s, a);
  assert.equal(s.players[0].pool.B, 3); assert.equal(s.objects[bl].zone, 'graveyard');
});

test("achado da revisão do lote XIII · Crystal Seer: '{4}{U}: Return ~ to its owner's hand' devolve a permanente do campo (antes falhava em silêncio)", () => {
  let s = mesaX(['Crystal Seer']), cs;
  [s, cs] = poe(s, 0, 'Crystal Seer');
  s = act(comMana(s, 'UUUUU'), legais(comMana(s, 'UUUUU'), 0, x => x.t === 'activate' && x.oid === cs)[0]);
  s = tudo(resolveSo(s));
  assert.equal(s.objects[cs].zone, 'hand');
});

test('achado da revisão do lote XIII · 105.1: ativar "mana de qualquer cor" sem dizer a cor é recusado (antes dava incolor)', () => {
  let s = mesaX(['Black Lotus']), bl; [s, bl] = poe(s, 0, 'Black Lotus');
  assert.throws(() => E.apply(s, { t: 'activate', p: 0, oid: bl, index: 0 }), /cor/);
});

test('M-339 · as 18 do lote XIII revisadas jogam (decisão A)', () => {
  for (const n of ['Ponder', 'Black Lotus', 'Gilded Lotus', 'Index', 'Implements of Sacrifice', 'Inkfathom Divers', "Mirri's Guile", 'Transdimensional Bovine', 'Omen', 'Halimar Depths', 'Pondering Mage', 'Crystal Seer', 'Gilt-Leaf Seer', 'Sage Owl', 'Sage Aven', 'Sage of Epityr', 'Spire Owl', 'Aven Fateshaper'])
    assert.equal(S.coverage(carta(n)).level, 'completo', n + ' joga');
});
