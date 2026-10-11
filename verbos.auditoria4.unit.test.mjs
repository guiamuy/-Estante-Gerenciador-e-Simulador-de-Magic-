// V-19 · auditoria independente do lote 4 (manifestar 701.40, encobrir 701.58, manifestar pavor 701.62): revisor sem acesso à
// implementação, 9 sondas, 7 divergências reproduzidas. Cada uma virou um teste aqui antes da correção. D1 a D4 eram leituras antigas do
// motor que perguntavam o tipo à carta sem olhar se ela está virada para baixo (708.2a) e que o manifestar passou a exercitar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, mesa, comMana, tudo, criatura, CARTAS } from './verbos.mjs';
const URSO = criatura('Urso de Teste 3/3', 3, 3, { mana_cost: '{1}{G}', colors: ['G'] }), LOBO = criatura('Lobo de Teste 2/2', 2, 2);
CARTAS['Floresta de Teste'] = { name: 'Floresta de Teste', type_line: 'Basic Land — Forest', mana_cost: '', cmc: 0, keywords: [], oracle_text: '{T}: Add {G}.', colors: [] };
CARTAS['Dríade de Teste'] = { name: 'Dríade de Teste', type_line: 'Land Creature — Forest Dryad', mana_cost: '', cmc: 0, keywords: [], oracle_text: '', colors: ['G'], power: '1', toughness: '1' };
const resolve = s => tudo(s, x => legais(x, x.pending.p)[0]);
const fonte = (p = 0) => ({ oid: 'h', name: URSO, controller: p, ability: true, source: null }); // o nome de uma carta conhecida: o dano consulta as palavras-chave da fonte
const topo = (s, p, nome) => { let o; [s, o] = poe(s, p, nome, 'library'); s = J(s); const lib = s.zones[p].library; lib.splice(lib.indexOf(o), 1); lib.unshift(o); return [s, o]; };
const faz = (s, eff, p = 0, tgt = null) => { s = J(s); const ev = []; E.applyEffect(s, fonte(p), eff, tgt, ev); return [s, ev]; };
const manifesta = (s, nome, p = 0, eff = { do: 'manifest' }) => { let o; [s, o] = topo(s, p, nome); [s] = faz(s, eff, p); return [s, o]; };
const umaRodada = s => { s = resolve(s); return resolve(act(s, { t: 'pass', p: s.turn.priority })); }; // passa a prioridade: as ações de estado rodam

test('V-19 · auditoria D1 (701.40a, 708.2a): planeswalker manifestado é só criatura 2/2 — não morre por lealdade zero e o dano fica marcado como em criatura', () => {
  let s = mesa(['Narset, Parter of Veils', URSO], []), n; [s, n] = manifesta(s, 'Narset, Parter of Veils');
  s = umaRodada(s); assert.equal(s.objects[n].zone, 'battlefield', 'continua no campo'); assert.equal(E.ehManifestada(s, s.objects[n]), true);
  [s] = faz(s, { do: 'damage', amount: 1, target: 'creature' }, 1, { oid: n });
  assert.equal(s.objects[n].damage, 1); assert.equal(s.objects[n].counters.loyalty, undefined);
  [s] = faz(s, { do: 'damage', amount: 1, target: 'creature' }, 1, { oid: n }); s = umaRodada(s); assert.equal(s.objects[n].zone, 'graveyard', 'com 2 de dano, a 2/2 morre');
});

test('V-19 · auditoria D2 (704.5m, 708.2a): Aura manifestada não é Aura — fica no campo como criatura 2/2 e nenhum evento publica o nome dela', () => {
  let s = mesa(['Rancor', URSO], []), r; [s, r] = topo(s, 0, 'Rancor'); s = J(s); const ev = [];
  E.applyEffect(s, fonte(0), { do: 'manifest' }, null, ev);
  const depois = E.apply(s, { t: 'pass', p: s.turn.priority });
  assert.equal(depois.state.objects[r].zone, 'battlefield'); assert.equal(E.ehManifestada(depois.state, depois.state.objects[r]), true);
  assert.equal(JSON.stringify([...ev, ...depois.events]).includes('Rancor'), false, 'o registro não diz que carta é');
});

test('V-19 · auditoria D3 (603.6, 708.2a): "sempre que uma criatura entrar" vê a manifestada; gatilho que pede subtipo não vê', () => {
  let s = mesa(['Lunarch Veteran', URSO, 'Floresta de Teste'], []), v; [s, v] = poe(s, 0, 'Lunarch Veteran'); const vida = s.players[0].life;
  let f; [s, f] = manifesta(s, 'Floresta de Teste'); s = umaRodada(s);
  assert.equal(s.players[0].life, vida + 1, 'Lunarch Veteran: entrou uma criatura sua');
  assert.equal(E.matchesTriggerFilter(s, s.objects[f], { types: ['creature'] }), true); assert.equal(E.matchesTriggerFilter(s, s.objects[f], { types: ['land'] }), false);
  assert.equal(E.matchesTriggerFilter(s, s.objects[f], { types: ['creature'], subtype: 'Forest' }), false, 'virada para baixo não tem subtipo');
});

test('V-19 · auditoria D4 (614.12, 708.2a): "criaturas dos oponentes entram viradas" vale para toda manifestada, seja qual for a carta', () => {
  let s = mesa([URSO, 'Floresta de Teste'], ['Authority of the Consuls']), a, f, u; [s, a] = poe(s, 1, 'Authority of the Consuls');
  [s, f] = manifesta(s, 'Floresta de Teste'); [s, u] = manifesta(s, URSO);
  assert.equal(s.objects[f].tapped, true, 'o terreno manifestado é criatura: entra virado'); assert.equal(s.objects[u].tapped, true);
});

test('V-19 · auditoria D5 (701.40b): carta de criatura sem custo de mana (criatura-terreno) não vira para cima', () => {
  let s = mesa(['Dríade de Teste', URSO], []), d; [s, d] = manifesta(s, 'Dríade de Teste');
  assert.equal(legais(s, 0, a => a.t === 'unmorph' && a.oid === d).length, 0);
  assert.throws(() => E.apply(s, { t: 'unmorph', p: 0, oid: d, manifest: true }), /custo de mana/);
});

test('V-19 · auditoria D6 (701.58a, 613.1f): a encoberta que perde todas as habilidades perde a salvaguarda {2}', () => {
  let s = mesa([URSO], []), u; [s, u] = manifesta(s, URSO, 0, { do: 'cloak' });
  assert.equal([...E.wardsDeK(s, s.objects[u])].join(), '{2}'); s = J(s);
  E.aplicaTemporario(s, s.objects[u], { vira: { loseAbilities: true } }, 1);
  assert.equal(E.wardsDeK(s, s.objects[u]).length, 0); assert.equal(E.ehEncoberta(s, s.objects[u]), true, 'continua encoberta');
});

test('V-19 · auditoria D7 (400.7): virada para cima por qualquer caminho, a permanente deixa de ser manifestada mesmo que volte a ficar virada para baixo', () => {
  let s = mesa([URSO], []), u; [s, u] = manifesta(s, URSO); s = J(s);
  delete s.objects[u].faceDown; s.objects[u].ts = 999999; // como faz a ação de virar pela metamorfose: tira a marca e dá carimbo novo
  s.objects[u].faceDown = true;
  assert.equal(E.ehManifestada(s, s.objects[u]), false);
});
