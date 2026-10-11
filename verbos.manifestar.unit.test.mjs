// V-17 · CR 701.40 · manifestar. Texto oficial em .listas/oficiais-verbos.json (Oracle do Forge, 11/10/2026):
// Soul Summons — "Manifest the top card of your library." · Formless Nurturing — "Manifest the top card of your library, then put a
// +1/+1 counter on it." · Sultai Emissary — "When Sultai Emissary dies, manifest the top card of your library." (script provado aqui)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
import { E, J, act, poe, legais, mesa, comMana, tudo, criatura, conjura, CARTAS } from './verbos.mjs';
const { scripts: S, table: T } = loadModules();
const URSO = criatura('Urso de Teste 3/3', 3, 3, { mana_cost: '{1}{G}', colors: ['G'], keywords: ['Trample'] }), VIDENTE = criatura('Vidente de Teste 1/1', 1, 1, { mana_cost: '{1}' });
CARTAS['Floresta de Teste'] = { name: 'Floresta de Teste', type_line: 'Basic Land — Forest', mana_cost: '', cmc: 0, keywords: [], oracle_text: '{T}: Add {G}.', colors: [] };
CARTAS['Raio de Teste'] = { name: 'Raio de Teste', type_line: 'Instant', mana_cost: '{R}', cmc: 1, keywords: [], oracle_text: '', colors: ['R'] };
const resolve = s => tudo(s, x => legais(x, x.pending.p)[0]);
const fonte = (p = 0) => ({ oid: 'h', name: 'T', controller: p, ability: true, source: null });
/** Põe a carta pedida no topo do grimório de p e manifesta; devolve [estado, oid, eventos]. */
const manifesta = (s, nome, p = 0, eff = { do: 'manifest' }) => { let oid; [s, oid] = poe(s, p, nome, 'library'); s = J(s); const lib = s.zones[p].library; lib.splice(lib.indexOf(oid), 1); lib.unshift(oid);
  const ev = []; E.applyEffect(s, fonte(p), eff, null, ev); return [s, oid, ev]; };
const viraAcoes = (s, p, oid) => legais(s, p, a => a.t === 'unmorph' && a.oid === oid);

test('CR 701.40 · manifestar (a): a carta do topo entra virada para baixo como criatura 2/2 sem nome, tipos, cor, palavras-chave nem habilidades — e nada dela dispara ao entrar', () => {
  let s = mesa([URSO, VIDENTE], []), oid; s = J(s);
  s.facts[VIDENTE] = { ...s.facts[VIDENTE], script: { name: VIDENTE, effects: [], abilities: [{ kind: 'triggered', when: 'etb', effects: [{ do: 'draw', amount: 1 }] }] } };
  const mao = s.zones[0].hand.length; [s, oid] = manifesta(s, VIDENTE);
  const o = s.objects[oid];
  assert.equal(o.zone, 'battlefield'); assert.equal(o.faceDown, true); assert.equal(o.controller, 0); assert.equal(E.ehManifestada(s, o), true);
  assert.deepEqual({ ...E.stats(s, o) }, { power: 2, toughness: 2 }); assert.equal(E.isCreature(s, o), true); assert.equal([...E.colorsOf(s, o)].length, 0);
  assert.equal(E.abilitiesOf(s, o).length, 0); assert.equal(o.sick, true);
  s = resolve(s); assert.equal((s.queued || []).length, 0); assert.equal(s.stack.length, 0); assert.equal(s.zones[0].hand.length, mao, 'o gatilho de entrada da carta de cima não dispara (708.3)');
  let u; [s, u] = manifesta(s, URSO); assert.equal(E.hasKeyword(s, s.objects[u], 'trample'), false); assert.deepEqual({ ...E.stats(s, s.objects[u]) }, { power: 2, toughness: 2 });
});

test('CR 701.40 · manifestar (a): terreno, instantânea e planeswalker manifestados são só criaturas 2/2 — o terreno não dá mana nem conta como terreno jogado', () => {
  let s = mesa([URSO, 'Floresta de Teste', 'Raio de Teste'], []), f, r; [s, f] = manifesta(s, 'Floresta de Teste'); [s, r] = manifesta(s, 'Raio de Teste');
  for (const oid of [f, r]) { assert.equal(s.objects[oid].zone, 'battlefield'); assert.equal(E.isCreature(s, s.objects[oid]), true); assert.deepEqual({ ...E.stats(s, s.objects[oid]) }, { power: 2, toughness: 2 }); }
  assert.equal(E.productions(s, s.objects[f]).length, 0, 'virada para baixo não é terreno'); assert.equal(s.players[0].landsPlayed, 0);
  assert.equal(E.tiposDe(s, s.objects[f]).includes('land'), false);
});

test('CR 701.40 · virar para cima (b): com prioridade, pagando o custo de mana da carta de criatura — ação especial, sem pilha; volta a ser ela mesma, sem enjoo novo nem gatilho de entrada', () => {
  let s = mesa([URSO], []), u; [s, u] = manifesta(s, URSO); s = J(s); s.objects[u].sick = false;
  assert.equal(viraAcoes(s, 0, u).length, 0, 'sem mana, não é oferecida');
  let x = comMana(s, 'GG'); const acoes = viraAcoes(x, 0, u);
  assert.equal(acoes.length, 1); assert.equal(acoes[0].manifest, true);
  x = act(x, acoes[0]);
  const o = x.objects[u];
  assert.equal(o.faceDown, undefined); assert.equal(E.ehManifestada(x, o), false); assert.equal(x.stack.length, 0, 'não usa a pilha'); assert.equal(x.pending, null);
  assert.deepEqual({ ...E.stats(x, o) }, { power: 3, toughness: 3 }); assert.equal(E.hasKeyword(x, o, 'trample'), true); assert.equal(o.sick, false, 'é a mesma permanente');
  assert.equal(x.players[0].pool.G, 0, 'pagou {1}{G}'); assert.equal(x.turn.priority, 0);
  // o oponente não pode virar a sua; e ninguém vira sem prioridade
  assert.equal(viraAcoes(comMana(s, 'GG', 1), 1, u).length, 0);
  assert.throws(() => E.apply(comMana(s, 'GG', 1), { t: 'unmorph', p: 1, oid: u, manifest: true }));
});

test('CR 701.40 · virar para cima (b, g): terreno e instantânea manifestados não viram para cima; marcadores e dano ficam na permanente que virou', () => {
  let s = mesa([URSO, 'Floresta de Teste', 'Raio de Teste'], []), f, r, u; [s, f] = manifesta(s, 'Floresta de Teste'); [s, r] = manifesta(s, 'Raio de Teste'); [s, u] = manifesta(s, URSO, 0, { do: 'manifest', marcadores: 1 });
  const x = comMana(s, 'RRGG');
  assert.equal(viraAcoes(x, 0, f).length, 0); assert.equal(viraAcoes(x, 0, r).length, 0);
  assert.throws(() => E.apply(x, { t: 'unmorph', p: 0, oid: r, manifest: true }), /criatura/);
  assert.equal(s.objects[u].counters.p1p1, 1); assert.deepEqual({ ...E.stats(s, s.objects[u]) }, { power: 3, toughness: 3 }, 'Formless Nurturing: 2/2 com um marcador');
  const y = act(x, viraAcoes(x, 0, u)[0]); assert.equal(y.objects[u].counters.p1p1, 1); assert.deepEqual({ ...E.stats(y, y.objects[u]) }, { power: 4, toughness: 4 });
});

test('CR 701.40 · manifestar (a, e): deixa de ser manifestada ao sair do campo (de volta, é a carta comum); várias cartas vão uma de cada vez; grimório vazio não manifesta nada', () => {
  let s = mesa([URSO, VIDENTE], []), u, ev; [s, u] = manifesta(s, URSO);
  s = J(s); E.applyEffect(s, fonte(1), { do: 'bounce', target: 'creature' }, { oid: u }, []);
  assert.equal(s.objects[u].zone, 'hand'); assert.equal(s.objects[u].faceDown, undefined); assert.equal(E.ehManifestada(s, s.objects[u]), false);
  s = resolve(act(comMana(s, 'GG'), legais(comMana(s, 'GG'), 0, a => a.t === 'cast' && a.oid === u && !a.faceDown)[0]));
  assert.equal(s.objects[u].zone, 'battlefield'); assert.equal(s.objects[u].faceDown, undefined); assert.equal(viraAcoes(comMana(s, 'GG'), 0, u).length, 0);
  const antes = s.zones[0].library.slice(0, 2); ev = []; s = J(s); E.applyEffect(s, fonte(0), { do: 'manifest', amount: 2 }, null, ev);
  assert.ok(antes.every(o => E.ehManifestada(s, s.objects[o]))); assert.ok(s.objects[antes[0]].ts < s.objects[antes[1]].ts, 'a de cima entra primeiro');
  assert.equal(ev.find(e => e.do === 'manifest').amount, 2);
  s.zones[0].library.splice(0).forEach(o => { s.objects[o].zone = 'exile'; s.zones[0].exile.push(o); }); ev = [];
  E.applyEffect(s, fonte(0), { do: 'manifest' }, null, ev); assert.equal(ev.find(e => e.do === 'manifest').amount, 0);
});

test('Soul Summons, Formless Nurturing e Sultai Emissary: os scripts, o validador e a frase em português', () => {
  let s = mesa(['Soul Summons', URSO, URSO, URSO], []), ss; [s, ss] = poe(s, 0, 'Soul Summons', 'hand'); const topo = s.zones[0].library[0];
  s = resolve(conjura(comMana(s, 'WW'), 0, ss)); assert.equal(E.ehManifestada(s, s.objects[topo]), true); assert.equal(s.objects[ss].zone, 'graveyard');
  const EMISSARIO = { name: 'Sultai Emissary', abilities: [{ kind: 'triggered', when: 'dies', effects: [{ do: 'manifest' }] }], example: { action: 'etb', target: 'none', expect: { attached: false } } };
  assert.equal(S.validateScript(EMISSARIO).join(), '');
  let x = mesa(['Sultai Emissary', URSO, URSO], []), em; [x, em] = poe(x, 0, 'Sultai Emissary'); x = J(x); x.facts['Sultai Emissary'] = { ...x.facts['Sultai Emissary'], script: { ...EMISSARIO, effects: [] } };
  const t2 = x.zones[0].library[0]; E.applyEffect(x, fonte(1), { do: 'destroy', target: 'creature' }, { oid: em }, []);
  x = resolve(act(x, { t: 'pass', p: x.turn.priority })); for (let i = 0; i < 4 && x.stack.length; i++) x = resolve(act(x, { t: 'pass', p: x.turn.priority }));
  assert.equal(x.objects[em].zone, 'graveyard'); assert.equal(E.ehManifestada(x, x.objects[t2]), true, 'ao morrer, manifesta o topo');
  assert.match(S.validateScript({ name: 'X', effects: [{ do: 'manifest', amount: 0 }], example: { target: 'none', expect: { handDelta: 0 } } }).join(), /manifest/);
  assert.equal(T.descreveEfeitos(S.SCRIPTS['Formless Nurturing'].effects), 'manifesta a carta do topo do seu grimório (entra virada para baixo como criatura 2/2) e põe 1 marcador +1/+1 nela');
});
