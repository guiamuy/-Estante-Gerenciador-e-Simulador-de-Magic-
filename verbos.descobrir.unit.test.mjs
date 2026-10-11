// V-10 · CR 701.57 · descobrir. Texto oficial em .listas/oficiais-verbos.json (Oracle do Forge, 11/10/2026):
// Trumpeting Carnosaur — "When Trumpeting Carnosaur enters, discover 5."
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
import { E, J, act, poe, legais, mesa, comMana, tudo, criatura, CARTAS } from './verbos.mjs';
const { scripts: S, table: T } = loadModules();
const CARO = criatura('Colosso de Teste 9/9', 9, 9, { mana_cost: '{7}' }); CARTAS[CARO].cmc = 7;
const BARATO = criatura('Rato de Teste 1/1', 1, 1); // valor 1
const SCRIPT = { name: 'Trumpeting Carnosaur', abilities: [{ kind: 'triggered', when: 'etb', effects: [{ do: 'discover', amount: 5 }] },
  { kind: 'activated', cost: { mana: '{2}{R}', discardSelf: true, fromHand: true }, effects: [{ do: 'damage', amount: 3, target: { tipos: ['creature', 'planeswalker'] } }] }] };
const fonte = () => ({ oid: 'hab', name: 'Teste', controller: 0, ability: true, source: null, effects: [], targets: [] });
/** Arruma o topo do grimório de A, de cima para baixo, com as cartas pedidas (tiradas do próprio grimório). */
function topo(s, nomes) { s = J(s); const lib = s.zones[0].library, usados = [];
  for (const n of nomes) { const oid = lib.find(o => s.objects[o].name === n && !usados.includes(o)); if (!oid) throw new Error('falta ' + n); usados.push(oid); }
  s.zones[0].library = [...usados, ...lib.filter(o => !usados.includes(o))]; return [s, usados]; }
const base = () => mesa([CARO, BARATO, 'Lightning Bolt'], []);

test('CR 701.57 · descobrir N: exila do topo até a primeira carta que não é terreno de valor N ou menor; conjurada sem pagar, vai à pilha, e as outras exiladas vão para o fundo do grimório', () => {
  let [s, [t1, c1, r1]] = topo(base(), ['Plains', CARO, BARATO]); const tam = s.zones[0].library.length, ev = [];
  E.applyEffect(s, fonte(), { do: 'discover', amount: 5 }, null, ev);
  assert.deepEqual([t1, c1, r1].map(o => s.objects[o].zone), ['exile', 'exile', 'exile'], 'terreno e carta cara (valor 7 > 5) são exilados no caminho');
  assert.equal(s.pending.kind, 'free_cast'); assert.deepEqual([...s.pending.options], [r1]); assert.equal(ev.find(e => e.do === 'discover').achada, BARATO);
  const conj = legais(s, 0, a => a.t === 'cast_free' && a.oid === r1); assert.ok(conj.length > 0, 'pode conjurar sem pagar, sem mana nenhuma');
  let r = act(s, conj[0]);
  assert.equal(r.objects[r1].zone, 'stack'); assert.equal(r.objects[t1].zone, 'library'); assert.equal(r.objects[c1].zone, 'library');
  assert.deepEqual([...r.zones[0].library.slice(-2)].sort(), [t1, c1].sort(), 'no fundo'); assert.equal(r.zones[0].library.length, tam - 1);
  r = tudo(r); assert.equal(r.objects[r1].zone, 'battlefield'); assert.equal(r.verbo, undefined); assert.equal(r.objects[r1].playableFromExile, undefined);
});

test('CR 701.57 · descobrir: quem não conjura leva a carta para a mão; o resto vai para o fundo do mesmo jeito', () => {
  let [s, [t1, r1]] = topo(base(), ['Plains', BARATO]); const mao = s.zones[0].hand.length;
  E.applyEffect(s, fonte(), { do: 'discover', amount: 5 }, null, []);
  const r = act(s, { t: 'decline_free', p: 0 });
  assert.equal(r.objects[r1].zone, 'hand'); assert.equal(r.zones[0].hand.length, mao + 1); assert.equal(r.objects[t1].zone, 'library'); assert.equal(r.zones[0].library[r.zones[0].library.length - 1], t1);
  assert.equal(r.objects[r1].playableFromExile, undefined, 'a permissão de jogar do exílio não sobra'); assert.equal(r.pending, null);
});

test('CR 701.57 · descobrir: mágica com alvo pode ser conjurada com o alvo escolhido na hora; valor exatamente N serve; sem nenhuma carta que sirva, o grimório inteiro volta para o fundo', () => {
  let [s, [bolt]] = topo(base(), ['Lightning Bolt']);
  E.applyEffect(s, fonte(), { do: 'discover', amount: 1 }, null, []);
  const noRosto = legais(s, 0, a => a.t === 'cast_free' && a.oid === bolt && a.targets && a.targets[0].player === 1); assert.ok(noRosto.length > 0, 'valor 1 ≤ 1, com alvo');
  const r = tudo(act(s, noRosto[0])); assert.equal(r.players[1].life, 17);
  // descobrir 0: nenhuma carta de valor 0 no grimório → tudo exilado e devolvido ao fundo, sem decisão
  let v = J(base()); const tam = v.zones[0].library.length, ev = [];
  E.applyEffect(v, fonte(), { do: 'discover', amount: 0 }, null, ev);
  assert.equal(v.pending, null); assert.equal(v.zones[0].library.length, tam); assert.equal(v.zones[0].exile.length, 0); assert.equal(ev.find(e => e.do === 'discover').achada, null);
});

test('CR 701.57 · descobrir num gatilho de entrada (Trumpeting Carnosaur): o script vale, o gatilho abre a decisão e a frase sai em português', () => {
  assert.deepEqual([...S.validateScript({ ...SCRIPT, example: { action: 'etb', target: 'none', expect: { attached: false } } })], []);
  let s = mesa(['Trumpeting Carnosaur', BARATO], []), car; [s, car] = poe(s, 0, 'Trumpeting Carnosaur', 'hand');
  let r1; [s, [r1]] = topo(s, [BARATO]); s.facts['Trumpeting Carnosaur'] = { ...s.facts['Trumpeting Carnosaur'], script: { ...SCRIPT, effects: [] } };
  s = comMana(s, 'RRRRRR'); s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === car)[0]);
  for (let i = 0; i < 12 && !s.pending; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  assert.equal(s.objects[car].zone, 'battlefield'); assert.equal(s.pending.kind, 'free_cast'); assert.match(s.pending.name, /descobrir 5: Rato de Teste/);
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast_free')[0])); assert.equal(s.objects[r1].zone, 'battlefield');
  assert.equal(T.descreveEfeitos(SCRIPT.abilities[0].effects), 'descobre 5 (exila do topo até uma carta que não é terreno de valor 5 ou menor; pode conjurá-la sem pagar ou levá-la para a mão; o resto vai para o fundo)');
  assert.match(S.validateScript({ name: 'X', effects: [{ do: 'discover', amount: 3 }, { do: 'damage', amount: 1, target: 'any' }], example: { target: 'none', expect: { handDelta: 0 } } }).join(), /efeito com alvo depois de uma escolha/);
});
