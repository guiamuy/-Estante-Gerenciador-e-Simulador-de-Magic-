// L-2 · trilha listas · Pauper de M a Z, lote 2: teste de regra de cada mecânica tocada pelos scripts do lote, numa partida em modo
// único (mana cobrada), com o texto oficial de .listas/oficiais-listas.json (Oracle do Forge, consulta de 12/10/2026). Cada teste cita a frase.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, passaAte, mesa, comMana, tudo, fichas, criatura, CARTAS } from './trilha-listas.mjs';

const artefato = (name, custo) => (CARTAS[name] = { name, type_line: 'Artifact', mana_cost: custo, cmc: [...custo.matchAll(/\{(\d+)\}/g)].reduce((n, m) => n + +m[1], 0), keywords: [], oracle_text: '', colors: [] }, name);
artefato('Artefato de Teste MV1', '{1}'); artefato('Artefato de Teste MV3', '{3}');
criatura('Elfo de Teste', 1, 1, { subtipo: 'Elf Warrior' });
const morre = (s, oid) => { s = J(s); s.objects[oid].damage = 99; return tudo(passaAte(act(s, { t: 'pass', p: s.turn.priority }), x => !x.stack.length || !!x.pending)); };
const conjura = (s, oid, mana, f = () => true) => tudo(act(comMana(s, mana), legais(comMana(s, mana), 0, a => a.t === 'cast' && a.oid === oid && f(a))[0]));

test('L-2 · Mysidian Elder: ao entrar, uma ficha Wizard 0/1 preta; "Whenever you cast a noncreature spell, this token deals 1 damage to each opponent" — só mágica não criatura, só sua', () => {
  let s = mesa(['Mysidian Elder', 'Trinket Mage', 'Artefato de Teste MV1', 'Urso de Teste']), me, art, urso; [s, me] = poe(s, 0, 'Mysidian Elder', 'hand');
  s = conjura(s, me, 'RRR');
  const [w] = fichas(s, 0, 'Wizard'); assert.ok(w); assert.deepEqual([...s.facts.Wizard.colors], ['B']); assert.deepEqual([E.stats(s, w).power, E.stats(s, w).toughness], [0, 1]);
  [s, art] = poe(s, 0, 'Artefato de Teste MV1', 'hand'); [s, urso] = poe(s, 0, 'Urso de Teste', 'hand');
  const vida = s.players[1].life;
  let r = conjura(s, urso, 'G'); assert.equal(r.players[1].life, vida, 'criatura não dispara');
  r = conjura(r, art, 'C'); assert.equal(r.players[1].life, vida - 1, 'o artefato (não criatura) dispara: 1 de dano em cada oponente');
});

test('L-2 · Trinket Mage: "you may search your library for an artifact card with mana value 1 or less … put it into your hand" — só valor ≤ 1, e pode não achar', () => {
  let s = mesa(['Trinket Mage', 'Artefato de Teste MV1', 'Artefato de Teste MV3']), tm; [s, tm] = poe(s, 0, 'Trinket Mage', 'hand');
  s = act(comMana(s, 'UUU'), legais(comMana(s, 'UUU'), 0, a => a.t === 'cast' && a.oid === tm)[0]);
  s = passaAte(s, x => !!x.pending);
  assert.equal(s.pending.kind, 'pick'); assert.equal(s.pending.min, 0, '"you may": pode não pegar nada');
  const nomes = [...new Set(s.pending.from.map(o => s.objects[o].name))]; assert.deepEqual(nomes, ['Artefato de Teste MV1'], 'só artefato de valor 1 ou menos');
  const mao = s.zones[0].hand.length;
  const r = tudo(act(s, legais(s, 0, a => a.t === 'pick')[0]), x => legais(x, x.pending.p, a => a.t === 'pick_done')[0] || legais(x, x.pending.p)[0]);
  assert.equal(r.zones[0].hand.length, mao + 1); assert.ok(r.zones[0].hand.some(o => r.objects[o].name === 'Artefato de Teste MV1'));
});

test('L-2 · Warped Tusker: "When you cast or cycle Warped Tusker, create a 0/1 colorless Eldrazi Spawn" — na conjuração (antes de resolver) e ao ciclar {2}{G}', () => {
  let s = mesa(['Warped Tusker']), wt; [s, wt] = poe(s, 0, 'Warped Tusker', 'hand');
  let r = act(comMana(s, 'CCCCCCC'), legais(comMana(s, 'CCCCCCC'), 0, a => a.t === 'cast' && a.oid === wt)[0]);
  r = passaAte(r, x => !x.stack.some(o => x.objects[o].ability) || !!x.pending);
  assert.equal(fichas(r, 0, 'Eldrazi Spawn').length, 1, 'o gatilho de conjurar resolve com a criatura ainda na pilha'); assert.equal(r.objects[wt].zone, 'stack');
  const c = legais(comMana(s, 'CCG'), 0, a => a.t === 'cycle' && a.oid === wt); assert.ok(c.length, 'ciclar {2}{G}');
  r = tudo(act(comMana(s, 'CCG'), c[0]));
  assert.equal(fichas(r, 0, 'Eldrazi Spawn').length, 1, 'ciclar também cria'); assert.equal(r.objects[wt].zone, 'graveyard');
});

test('L-2 · Wellwisher: "{T}: You gain 1 life for each Elf on the battlefield" — conta os Elfos dos dois lados, ele incluído', () => {
  let s = mesa(['Wellwisher', 'Elfo de Teste'], ['Elfo de Teste', 'Urso de Teste']), ww;
  [s, ww] = poe(s, 0, 'Wellwisher'); [s] = poe(s, 0, 'Elfo de Teste'); [s] = poe(s, 1, 'Elfo de Teste'); [s] = poe(s, 1, 'Urso de Teste');
  const vida = s.players[0].life;
  const r = tudo(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === ww)[0]));
  assert.equal(r.players[0].life - vida, 3, 'Wellwisher, o seu Elfo e o do oponente (o Urso não)');
});

test('L-2 · Rooftop Percher: "exile up to two target cards from graveyards. You gain 3 life." — de qualquer cemitério, até duas, inclusive nenhuma', () => {
  let s = mesa(['Rooftop Percher', 'Urso de Teste'], ['Urso de Teste']), rp, a1, b1;
  [s, rp] = poe(s, 0, 'Rooftop Percher', 'hand'); [s, a1] = poe(s, 0, 'Urso de Teste', 'graveyard'); [s, b1] = poe(s, 1, 'Urso de Teste', 'graveyard');
  s = passaAte(act(comMana(s, 'CCCCC'), legais(comMana(s, 'CCCCC'), 0, a => a.t === 'cast' && a.oid === rp)[0]), x => !!x.pending);
  const opcoes = s.pending.options || [];
  assert.ok(opcoes.some(o => o && o.oid === a1) && opcoes.some(o => o && o.oid === b1), 'cartas do seu cemitério e do oponente');
  const vida = s.players[0].life;
  const r = tudo(s, x => x.pending.kind === 'pick_target' ? { t: 'pick_target', p: x.pending.p, index: x.pending.options.findIndex(o => o && o.oid != null) } : legais(x, x.pending.p)[0]);
  assert.equal([a1, b1].filter(o => r.objects[o].zone === 'exile').length, 2, 'as duas exiladas'); assert.equal(r.players[0].life - vida, 3);
  assert.ok(E.hasKeyword(r, r.objects[rp], 'flying'));
  assert.equal(r.zones[0].graveyard.length + r.zones[1].graveyard.length, s.zones[0].graveyard.length + s.zones[1].graveyard.length - 2, 'duas cartas diferentes (o segundo alvo não repete o primeiro, 115.3)');
  const nada = tudo(s, x => x.pending.kind === 'pick_target' ? { t: 'pick_target', p: x.pending.p, nenhum: true } : legais(x, x.pending.p)[0]);
  assert.equal(nada.players[0].life - vida, 3, '"up to two": sem alvo, ainda ganha 3');
});

test('L-2 · Mortuary Mire: entra virada; "When Mortuary Mire enters, you may put target creature card from your graveyard on top of your library"', () => {
  let s = mesa(['Mortuary Mire', 'Urso de Teste']), mm, urso; [s, mm] = poe(s, 0, 'Mortuary Mire', 'hand'); [s, urso] = poe(s, 0, 'Urso de Teste', 'graveyard');
  const r = tudo(act(s, legais(s, 0, a => a.t === 'play_land' && a.oid === mm)[0]), x => x.pending.kind === 'may_pay' || x.pending.kind === 'optional' ? (legais(x, x.pending.p, a => a.t !== 'decline')[0] || legais(x, x.pending.p)[0]) : legais(x, x.pending.p)[0]);
  assert.equal(r.objects[mm].tapped, true, 'entra virada');
  assert.equal(r.zones[0].library[0], urso, 'a criatura vai para o topo do grimório');
  assert.deepEqual(E.productions(r, r.objects[mm]).map(x => x.join('')), ['B']);
});

test('L-2 · Myr Retriever: "When Myr Retriever dies, return another target artifact card from your graveyard to your hand" — outro, artefato, seu', () => {
  let s = mesa(['Myr Retriever', 'Artefato de Teste MV3', 'Urso de Teste']), mr, art, urso;
  [s, mr] = poe(s, 0, 'Myr Retriever'); [s, art] = poe(s, 0, 'Artefato de Teste MV3', 'graveyard'); [s, urso] = poe(s, 0, 'Urso de Teste', 'graveyard');
  let r = J(s); r.objects[mr].damage = 5; r = passaAte(act(r, { t: 'pass', p: r.turn.priority }), x => !!x.pending || x.stack.length > 0);
  if (r.pending && r.pending.kind === 'pick_target') { const ops = r.pending.options.filter(Boolean).map(o => o.oid); assert.deepEqual(ops, [art], 'só o outro artefato (nem o próprio Myr, nem a criatura)'); }
  r = tudo(r, x => x.pending.kind === 'pick_target' ? { t: 'pick_target', p: x.pending.p, index: x.pending.options.findIndex(o => o && o.oid === art) } : legais(x, x.pending.p)[0]);
  assert.equal(r.objects[mr].zone, 'graveyard'); assert.equal(r.objects[art].zone, 'hand'); assert.equal(r.objects[urso].zone, 'graveyard');
});

test('L-2 · Nezumi Linkbreaker: ao morrer, uma ficha Mercenary 1/1 vermelha com "{T}: Target creature you control gets +1/+0 until end of turn. Activate only as a sorcery."', () => {
  let s = mesa(['Nezumi Linkbreaker', 'Urso de Teste']), nz, urso; [s, nz] = poe(s, 0, 'Nezumi Linkbreaker'); [s, urso] = poe(s, 0, 'Urso de Teste');
  let r = J(s); r.objects[nz].damage = 5; r = tudo(passaAte(act(r, { t: 'pass', p: r.turn.priority }), x => !!x.pending || (!x.stack.length && x.turn.step === 'main1')));
  const [m] = fichas(r, 0, 'Mercenary'); assert.ok(m, 'a ficha'); assert.deepEqual([...r.facts.Mercenary.colors], ['R']);
  r = J(r); r.objects[m.oid].sick = false;
  const hab = legais(r, 0, a => a.t === 'activate' && a.oid === m.oid); assert.ok(hab.some(a => a.targets[0].oid === urso));
  const t = tudo(act(r, hab.find(a => a.targets[0].oid === urso)));
  assert.deepEqual([E.stats(t, t.objects[urso]).power, E.stats(t, t.objects[urso]).toughness], [3, 2]);
  const comPilha = J(r); comPilha.turn.step = 'combat_begin';
  assert.equal(legais(comPilha, 0, a => a.t === 'activate' && a.oid === m.oid).length, 0, '"Activate only as a sorcery"');
});

test('L-2 · Shambling Ghast: ao morrer, escolha um — −1/−1 numa criatura de um oponente, ou um Tesouro', () => {
  const morreGhast = () => { let s = mesa(['Shambling Ghast'], ['Urso de Teste']), sg, deles; [s, sg] = poe(s, 0, 'Shambling Ghast'); [s, deles] = poe(s, 1, 'Urso de Teste');
    s = J(s); s.objects[sg].damage = 5; return [passaAte(act(s, { t: 'pass', p: s.turn.priority }), x => !!x.pending), deles]; };
  let [s, deles] = morreGhast();
  const escolhe = i => x => x.pending.kind === 'choose_mode' ? { t: 'choose_mode', p: x.pending.p, index: i } : legais(x, x.pending.p)[0];
  const r0 = tudo(s, escolhe(0)); assert.deepEqual([E.stats(r0, r0.objects[deles]).power, E.stats(r0, r0.objects[deles]).toughness], [1, 1], '−1/−1 na criatura do oponente');
  const r1 = tudo(s, escolhe(1)); assert.equal(fichas(r1, 0, 'Treasure').length, 1, 'um Tesouro');
});

test('L-2 · Remote Farm: entra virada com dois marcadores de esgotamento; {T}, tirar um: {W}{W}; sem marcador, é sacrificada', () => {
  let s = mesa(['Remote Farm']), rf; [s, rf] = poe(s, 0, 'Remote Farm', 'hand');
  s = tudo(act(s, legais(s, 0, a => a.t === 'play_land' && a.oid === rf)[0]));
  assert.equal(s.objects[rf].tapped, true); assert.equal(s.objects[rf].counters.depletion, 2);
  s = J(s); s.objects[rf].tapped = false;
  let r = act(s, legais(s, 0, a => a.t === 'activate' && a.oid === rf)[0]); assert.equal(r.players[0].pool.W, 2);
  r = J(r); r.objects[rf].tapped = false; r = tudo(act(r, legais(r, 0, a => a.t === 'activate' && a.oid === rf)[0]));
  assert.equal(r.objects[rf].zone, 'graveyard');
});
