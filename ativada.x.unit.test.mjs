// CR2c.7 · X no custo de habilidade ativada (107.3a, 107.3k, 602.2b, 606.4): "{X}: …" e a lealdade "[−X]". Quem ativa escolhe X ao pôr a
// habilidade na pilha, paga X vezes e o X vale em todo o texto dela até resolver. "Spend only black mana on X" (Crypt Rats: texto oficial em
// .listas/oficiais-motor.json, Oracle do Forge, 12/10/2026) obriga X a ser pago com mana preta. Cada teste falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, comMana, tudo, CARTAS } from './cmd.mjs';

const OF = Object.fromEntries(JSON.parse(readFileSync(new URL('./.listas/oficiais-motor.json', import.meta.url), 'utf8')).cartas.map(c => [c.name, { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: 3, keywords: [], oracle_text: c.oracle_text, colors: ['B'], power: c.power, toughness: c.toughness }]));
const c = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: 1, keywords: [], oracle_text: '', colors: [...new Set((mana_cost.match(/[WUBRG]/g) || []))], ...extra });
const cards = { ...OF, Torre: c('Torre', 'Enchantment', '{G}'), Vidente: c('Vidente', 'Artifact', '{1}'), Ursa: c('Ursa', 'Creature — Bear', '{G}', { power: '2', toughness: '2' }), Muro: c('Muro', 'Creature — Wall', '{G}', { power: '0', toughness: '5' }),
  Chama: c('Chama', 'Legendary Planeswalker — Chama', '{R}', { loyalty: '4' }) };
const scripts = {
  Torre: { name: 'Torre', abilities: [{ kind: 'activated', cost: { mana: '{X}' }, effects: [{ do: 'counters', tipo: 'charge', amount: { per: 'x' }, target: 'self-source' }] }], example: { action: 'etb', target: 'none', expect: { attached: false } } },
  Vidente: { name: 'Vidente', abilities: [{ kind: 'activated', cost: { mana: '{X}' }, effects: [{ do: 'scry', amount: 1 }, { do: 'gain', amount: { per: 'x' } }] }], example: { action: 'etb', target: 'none', expect: { attached: false } } },
  Chama: { name: 'Chama', loyalty: [{ cost: 1, label: '+1: compra uma carta', effects: [{ do: 'draw', amount: 1 }] }, { cost: '-X', label: '−X: X de dano numa criatura', effects: [{ do: 'damage', amount: { per: 'x' }, target: 'creature' }] }], example: { action: 'etb', target: 'none', expect: { attached: false } } }
};
function mesaX(a = [], b = []) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 12, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 1, mode: 'full', cards: { ...CARTAS, ...cards }, scripts, first: 0, players: [{ name: 'A', deck: baralho([...a, 'Forest', 'Swamp']) }, { name: 'B', deck: baralho([...b, 'Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const xsDe = (s, oid, index = 0) => Array.from(legais(s, 0, a => a.t === 'activate' && a.oid === oid && (a.index || 0) === index), a => a.x).sort((p, q) => p - q);
const resolve = s => tudo(act(act(s, { t: 'pass', p: 0 }), { t: 'pass', p: 1 }));
const recusa = (s, a, re) => assert.throws(() => act(s, a), e => re.test(e.message) || assert.fail(JSON.stringify(a) + ' → ' + e.message));

test('CR 107.3k/602.2b · "{X}: …": a mesa oferece X de 0 ao máximo pagável; o X pago vale na resolução (o mesmo em todo o texto)', () => {
  let s = mesaX(['Torre']), t;
  [s, t] = poe(s, 0, 'Torre'); s = comMana(s, 'GGG');
  assert.deepEqual(xsDe(s, t), [0, 1, 2, 3], 'três manas: X de 0 a 3');
  s = act(s, { t: 'activate', p: 0, oid: t, index: 0, x: 2 });
  assert.equal(s.players[0].pool.G, 1, 'pagou X = 2');
  const ab = s.objects[s.stack[s.stack.length - 1]];
  assert.equal(ab.xPaid, 2, 'o X fica com a habilidade na pilha');
  s = resolve(s);
  assert.equal(s.objects[t].counters.charge, 2, 'dois marcadores: o X escolhido');
  recusa(s, { t: 'activate', p: 0, oid: t, index: 0, x: 2 }, /mana/);
  recusa(s, { t: 'activate', p: 0, oid: t, index: 0, x: 21 }, /X precisa ser/);
  recusa(s, { t: 'activate', p: 0, oid: t, index: 0, x: 1.5 }, /X precisa ser/);
});

test('CR 107.3 · "Spend only black mana on X" (Crypt Rats): X só com mana preta; X de dano em cada criatura e em cada jogador', () => {
  let s = mesaX(['Crypt Rats', 'Ursa'], ['Muro']), r, u, m;
  [s, r] = poe(s, 0, 'Crypt Rats'); [s, u] = poe(s, 0, 'Ursa'); [s, m] = poe(s, 1, 'Muro'); s = comMana(s, 'GGBB');
  assert.deepEqual(xsDe(s, r), [0, 1, 2], 'duas pretas: X até 2, mesmo com quatro manas');
  recusa(s, { t: 'activate', p: 0, oid: r, index: 0, x: 3 }, /mana/);
  const v0 = s.players[0].life, v1 = s.players[1].life;
  s = act(s, { t: 'activate', p: 0, oid: r, index: 0, x: 2 });
  assert.deepEqual([s.players[0].pool.B, s.players[0].pool.G], [0, 2], 'pagou com as pretas; o verde sobra');
  s = resolve(s);
  assert.deepEqual([v0 - s.players[0].life, v1 - s.players[1].life], [2, 2], 'cada jogador leva 2');
  assert.equal(s.objects[r].zone, 'graveyard', 'os próprios Ratos morrem');
  assert.equal(s.objects[u].zone, 'graveyard', 'a Ursa 2/2 morre');
  assert.deepEqual([s.objects[m].zone, s.objects[m].damage], ['battlefield', 2], 'o Muro 0/5 leva 2');
});

test('CR 107.3 · X = 0 ativa e não faz nada; habilidade sem X recusa um X', () => {
  let s = mesaX(['Crypt Rats']), r;
  [s, r] = poe(s, 0, 'Crypt Rats');
  assert.deepEqual(xsDe(s, r), [0], 'sem mana: só X = 0');
  const v = s.players[0].life; s = resolve(act(s, { t: 'activate', p: 0, oid: r, index: 0, x: 0 }));
  assert.equal(s.players[0].life, v); assert.equal(s.objects[r].zone, 'battlefield');
  let t = mesaX(['Chama']), ch; [t, ch] = poe(t, 0, 'Chama');
  recusa(t, { t: 'activate', p: 0, oid: ch, index: 0, x: 1 }, /não tem X/);
});

test('CR 606.4/107.3 · lealdade [−X]: X de 0 à lealdade atual; tira X marcadores e o X vale no efeito; uma vez por turno', () => {
  let s = mesaX(['Chama', 'Ursa'], ['Muro']), ch, u, m;
  [s, ch] = poe(s, 0, 'Chama'); [s, m] = poe(s, 1, 'Muro');
  s = J(s); s.objects[ch].counters.loyalty = 4;
  assert.deepEqual([...new Set(xsDe(s, ch, 1))], [0, 1, 2, 3, 4], 'lealdade 4: X de 0 a 4');
  recusa(s, { t: 'activate', p: 0, oid: ch, index: 1, x: 5, targets: [{ oid: m }] }, /lealdade/);
  s = act(s, { t: 'activate', p: 0, oid: ch, index: 1, x: 3, targets: [{ oid: m }] });
  assert.equal(s.objects[ch].counters.loyalty, 1, 'pagou 3 de lealdade');
  s = resolve(s);
  assert.equal(s.objects[m].damage, 3, 'três de dano no Muro');
  recusa(s, { t: 'activate', p: 0, oid: ch, index: 0 }, /já usou/);
});

test('CR 107.3a · o X continua valendo depois de uma decisão no meio da habilidade (vidência e depois "ganhe X de vida")', () => {
  let s = mesaX(['Vidente']), v;
  [s, v] = poe(s, 0, 'Vidente'); s = comMana(s, 'GGG');
  const vida = s.players[0].life;
  s = act(act(act(s, { t: 'activate', p: 0, oid: v, index: 0, x: 3 }), { t: 'pass', p: 0 }), { t: 'pass', p: 1 });
  assert.ok(s.pending, 'a vidência pergunta');
  s = tudo(s);
  assert.equal(s.players[0].life - vida, 3, 'ganhou X = 3 depois da decisão');
  assert.equal(s.objects[v].xPaid, undefined, 'a permanente não fica com o X da habilidade');
});
