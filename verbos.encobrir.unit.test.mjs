// V-18 · CR 701.58 · encobrir e CR 701.62 · manifestar pavor. Texto oficial em .listas/oficiais-verbos.json (Oracle do Forge, 11/10/2026):
// Hide in Plain Sight — "Look at the top five cards of your library, cloak two of them, and put the rest on the bottom of your library in
// a random order." · Unsettling Twins — "When Unsettling Twins enters, manifest dread." (script provado aqui)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
import { E, J, act, poe, legais, mesa, comMana, tudo, criatura, conjura, CARTAS } from './verbos.mjs';
const { scripts: S, table: T } = loadModules();
const URSO = criatura('Urso de Teste 3/3', 3, 3, { mana_cost: '{1}{G}', colors: ['G'] }), LOBO = criatura('Lobo de Teste 2/2', 2, 2), GATO = criatura('Gato de Teste 1/1', 1, 1), RATO = criatura('Rato de Teste 1/1', 1, 1), CORVO = criatura('Corvo de Teste 1/2', 1, 2);
CARTAS['Raio de Mirar'] = { name: 'Raio de Mirar', type_line: 'Instant', mana_cost: '{R}', cmc: 1, keywords: [], oracle_text: '', colors: ['R'] };
const resolve = s => tudo(s, x => legais(x, x.pending.p)[0]);
const fonte = (p = 0) => ({ oid: 'h', name: 'T', controller: p, ability: true, source: null });
const topo = (s, p, nomes) => { s = J(s); const oids = []; for (const n of [...nomes].reverse()) { let o; [s, o] = poe(s, p, n, 'library'); s = J(s); const lib = s.zones[p].library; lib.splice(lib.indexOf(o), 1); lib.unshift(o); oids.unshift(o); } return [s, oids]; };
const faz = (s, eff, p = 0) => { s = J(s); const ev = []; E.applyEffect(s, fonte(p), eff, null, ev); return [s, ev]; };
const pega = (s, oid) => act(s, legais(s, s.pending.p, a => a.t === 'pick' && a.oid === oid)[0]);
const fecha = s => act(s, legais(s, s.pending.p, a => a.t === 'pick_done')[0]);

test('CR 701.58 · encobrir (a): a carta do topo entra virada para baixo como criatura 2/2 com salvaguarda {2}; a manifestada não tem salvaguarda', () => {
  let s = mesa([URSO, LOBO], []), u, l; [s, [u, l]] = topo(s, 0, [URSO, LOBO]);
  [s] = faz(s, { do: 'cloak' }); [s] = faz(s, { do: 'manifest' });
  assert.equal(E.ehEncoberta(s, s.objects[u]), true); assert.equal(E.ehManifestada(s, s.objects[u]), true); assert.deepEqual({ ...E.stats(s, s.objects[u]) }, { power: 2, toughness: 2 });
  assert.equal([...E.wardsDeK(s, s.objects[u])].join(), '{2}'); assert.equal(E.ehEncoberta(s, s.objects[l]), false); assert.equal(E.wardsDeK(s, s.objects[l]).length, 0);
});

test('CR 701.58 · encobrir (a) e 702.21: a mágica do oponente que mira a encoberta dispara a salvaguarda — sem pagar {2}, é anulada', () => {
  let s = mesa([URSO], ['Raio de Mirar', 'Raio de Mirar']), u, raio; [s, [u]] = topo(s, 0, [URSO]); [s] = faz(s, { do: 'cloak' }); [s, raio] = poe(s, 1, 'Raio de Mirar', 'hand'); s = J(s);
  s.facts['Raio de Mirar'] = { ...s.facts['Raio de Mirar'], script: { name: 'Raio de Mirar', effects: [{ do: 'damage', amount: 3, target: 'creature' }] } };
  s.turn.active = 1; s.turn.priority = 1; s.turn.step = 'main1';
  s = conjura(comMana(s, 'R', 1), 1, raio, [u]);
  s = tudo(s, x => legais(x, x.pending.p).find(a => a.t === 'decline' || a.t === 'take_loss') || legais(x, x.pending.p)[0]);
  assert.equal(s.objects[u].zone, 'battlefield', 'a encoberta sobrevive'); assert.equal(s.objects[u].damage || 0, 0); assert.equal(s.objects[raio].zone, 'graveyard');
});

test('CR 701.58 · encobrir (b): vira para cima pelo custo de mana da carta de criatura e deixa de ter salvaguarda', () => {
  let s = mesa([URSO], []), u; [s, [u]] = topo(s, 0, [URSO]); [s] = faz(s, { do: 'cloak' });
  const x = comMana(s, 'GG'), a = legais(x, 0, y => y.t === 'unmorph' && y.oid === u);
  assert.equal(a.length, 1); const y = act(x, a[0]);
  assert.equal(y.objects[u].faceDown, undefined); assert.equal(E.wardsDeK(y, y.objects[u]).length, 0); assert.deepEqual({ ...E.stats(y, y.objects[u]) }, { power: 3, toughness: 3 });
});

test('CR 701.62 · manifestar pavor (a): olha as duas do topo, quem controla escolhe qual entra virada para baixo e a outra vai para o cemitério', () => {
  let s = mesa([URSO, LOBO, GATO], []), u, l, g; [s, [u, l, g]] = topo(s, 0, [URSO, LOBO, GATO]);
  let [x] = faz(s, { do: 'manifest_dread' });
  assert.equal(x.pending.kind, 'pick'); assert.equal(x.pending.p, 0); assert.deepEqual([...x.pending.from], [u, l], 'só as duas do topo'); assert.equal(x.pending.min, 1); assert.equal(x.pending.max, 1);
  assert.equal(legais(x, 0, a => a.t === 'pick_done').length, 0, 'escolher é obrigatório');
  x = pega(x, l); if (x.pending) x = fecha(x);
  assert.equal(E.ehManifestada(x, x.objects[l]), true); assert.equal(E.ehEncoberta(x, x.objects[l]), false); assert.equal(x.objects[u].zone, 'graveyard'); assert.equal(x.objects[g].zone, 'library');
  assert.equal(x.pending, null); assert.equal(x.verbo, undefined); assert.equal(x.escolhaV, undefined);
});

test('CR 701.62 · manifestar pavor: com uma carta só no grimório ela é manifestada sem pergunta; com o grimório vazio nada acontece', () => {
  let s = mesa([URSO], []), u; [s, [u]] = topo(s, 0, [URSO]); s = J(s);
  for (const o of s.zones[0].library.filter(x => x !== u)) { s.zones[0].library.splice(s.zones[0].library.indexOf(o), 1); s.objects[o].zone = 'exile'; s.zones[0].exile.push(o); }
  let [x, ev] = faz(s, { do: 'manifest_dread' });
  assert.equal(x.pending, null); assert.equal(E.ehManifestada(x, x.objects[u]), true); assert.equal(ev.find(e => e.do === 'manifest_dread').amount, 1);
  [x, ev] = faz(x, { do: 'manifest_dread' }); assert.equal(x.pending, null); assert.equal(ev.find(e => e.do === 'manifest_dread').amount, 0);
});

test('Hide in Plain Sight: olha cinco, encobre duas à escolha (uma de cada vez, na ordem escolhida) e o resto vai para o fundo; Unsettling Twins manifesta pavor ao entrar', () => {
  let s = mesa(['Hide in Plain Sight', URSO, LOBO, GATO, RATO, CORVO, URSO, LOBO], []), h, cinco; [s, cinco] = topo(s, 0, [URSO, LOBO, GATO, RATO, CORVO]); [s, h] = poe(s, 0, 'Hide in Plain Sight', 'hand');
  const tamanho = s.zones[0].library.length;
  s = conjura(comMana(s, 'GGGG'), 0, h); for (let i = 0; i < 6 && !s.pending; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  assert.equal(s.pending.kind, 'pick'); assert.deepEqual([...s.pending.from], cinco); assert.equal(s.pending.min, 2);
  s = pega(s, cinco[3]); s = pega(s, cinco[0]); if (s.pending) s = fecha(s); s = resolve(s);
  assert.ok(E.ehEncoberta(s, s.objects[cinco[3]]) && E.ehEncoberta(s, s.objects[cinco[0]])); assert.ok(s.objects[cinco[3]].ts < s.objects[cinco[0]].ts, 'na ordem escolhida');
  const fundo = s.zones[0].library.slice(-3); assert.deepEqual([...fundo].sort(), [cinco[1], cinco[2], cinco[4]].sort(), 'as três restantes no fundo'); assert.equal(s.zones[0].library.length, tamanho - 2);
  assert.equal(s.objects[h].zone, 'graveyard');
  const GEMEAS = { name: 'Unsettling Twins', abilities: [{ kind: 'triggered', when: 'etb', effects: [{ do: 'manifest_dread' }] }], example: { action: 'etb', target: 'none', expect: { attached: false } } };
  assert.equal(S.validateScript(GEMEAS).join(), '');
  let x = mesa(['Unsettling Twins', URSO, LOBO], []), tw, dois; [x, dois] = topo(x, 0, [URSO, LOBO]); [x, tw] = poe(x, 0, 'Unsettling Twins', 'hand'); x = J(x); x.facts['Unsettling Twins'] = { ...x.facts['Unsettling Twins'], script: { ...GEMEAS, effects: [] } };
  x = act(comMana(x, 'WWWW'), legais(comMana(x, 'WWWW'), 0, a => a.t === 'cast' && a.oid === tw)[0]); for (let i = 0; i < 8 && !x.pending; i++) x = act(x, { t: 'pass', p: x.turn.priority });
  assert.equal(x.pending.kind, 'pick'); x = pega(x, dois[0]); if (x.pending) x = fecha(x); x = resolve(x);
  assert.equal(E.ehManifestada(x, x.objects[dois[0]]), true); assert.equal(x.objects[dois[1]].zone, 'graveyard');
  assert.match(S.validateScript({ name: 'X', effects: [{ do: 'cloak', look: 2, amount: 3 }], example: { target: 'none', expect: { handDelta: 0 } } }).join(), /cloak/);
  assert.equal(T.descreveEfeitos([{ do: 'manifest_dread' }]), 'manifesta pavor (olha as duas cartas do topo do seu grimório: uma entra virada para baixo como criatura 2/2, a outra vai para o cemitério)');
});
