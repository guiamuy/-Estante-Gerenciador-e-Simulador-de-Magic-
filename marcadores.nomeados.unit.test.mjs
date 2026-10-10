// M-249 · marcadores nomeados em permanente (122.1: óleo, esgotamento, carga…) com custo de remover (602.1) e "ative somente se"
// pelo tamanho do cemitério (702.25, limiar). Cartas: Norn's Wellspring e Cephalid Coliseum (texto oficial em
// .listas/oficiais-commander.json, 05/10/2026; segunda fonte, Oracle do Forge, 10/10/2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, mesa, comMana, tudo } from './cmd.mjs';
import { S, T } from './listas.mjs';
const ateDecisao = s => { for (let i = 0; i < 10 && !s.pending && (s.stack.length || s.queued.length); i++) s = act(s, { t: 'pass', p: s.turn.priority }); return s; };

test('M-249 · Norn\'s Wellspring: "Whenever a creature you control dies, scry 1 and put an oil counter on this artifact." · "{1}, {T}, Remove two oil counters from this artifact: Draw a card."', () => {
  let s = mesa(["Norn's Wellspring", 'Thraben Inspector', 'Faerie Seer', 'Lightning Bolt'], ['Lightning Bolt']), w, ins, seer, b;
  [s, w] = poe(s, 0, "Norn's Wellspring"); [s, ins] = poe(s, 0, 'Thraben Inspector'); [s, seer] = poe(s, 0, 'Faerie Seer'); [s, b] = poe(s, 0, 'Lightning Bolt', 'hand');
  const ativa = x => legais(x, 0, a => a.t === 'activate' && a.oid === w);
  s = comMana(s, 'C'); assert.equal(ativa(s).length, 0, 'sem marcadores de óleo não ativa');
  s = J(s); E.moveObject(s, ins, 'graveyard'); s = tudo(ateDecisao(s));
  assert.equal(s.objects[w].counters.oil, 1, 'uma criatura sua morreu: um marcador de óleo');
  assert.equal(s.objects[w].counters.p1p1, undefined, 'não é marcador +1/+1');
  assert.equal(ativa(s).length, 0, 'um só não basta');
  s = J(s); E.moveObject(s, seer, 'graveyard'); s = tudo(ateDecisao(s));
  assert.equal(s.objects[w].counters.oil, 2);
  const mao = s.zones[0].hand.length;
  s = tudo(act(s, ativa(s)[0]));
  assert.equal(s.objects[w].counters.oil, undefined, 'os dois foram removidos como custo');
  assert.equal(s.zones[0].hand.length, mao + 1, 'comprou uma'); assert.equal(s.objects[w].tapped, true);
  assert.throws(() => act(s, { t: 'activate', p: 0, oid: w, index: 0 }), /já está virada|marcador/);
  const sc = S.SCRIPTS["Norn's Wellspring"];
  assert.equal(T.descreveEfeitos(sc.abilities[0].effects), 'vidência 1: olha 1 carta de cima e decide o que fica no topo; põe 1 marcador de óleo em esta permanente');
  assert.ok(J(S.validateScript({ name: 'T', abilities: [{ kind: 'activated', cost: { removeCounters: { tipo: 'Óleo', n: 2 } }, effects: [{ do: 'draw', amount: 1 }] }], example: sc.example })).some(e => /remover marcadores/.test(e)));
});

test('M-249 · Cephalid Coliseum: "{T}: Add {U}. This land deals 1 damage to you." e limiar: "Target player draws three cards, then discards three cards. Activate only if there are seven or more cards in your graveyard."', () => {
  let s = mesa(['Cephalid Coliseum', 'Faerie Seer'], []), c; [s, c] = poe(s, 0, 'Cephalid Coliseum');
  s = J(s); s.players[0].life = 20;
  const prods = E.productions ? E.productions(s, s.objects[c]) : null; if (prods) assert.deepEqual(J(prods), [['U']]);
  const ativa = x => legais(x, 0, a => a.t === 'activate' && a.oid === c);
  s = comMana(s, 'U');
  for (let i = 0; i < 6; i++) { const oid = s.zones[0].library.pop(); s.zones[0].graveyard.push(oid); s.objects[oid].zone = 'graveyard'; }
  assert.equal(ativa(s).length, 0, 'seis cartas no cemitério: ainda não');
  assert.throws(() => act(s, { t: 'activate', p: 0, oid: c, index: 0, targets: [{ player: 0 }] }), /7 ou mais cartas/);
  { const oid = s.zones[0].library.pop(); s.zones[0].graveyard.push(oid); s.objects[oid].zone = 'graveyard'; }
  const ofertas = ativa(s); assert.ok(ofertas.length >= 2, 'sete: ativa, mirando qualquer jogador');
  const mao1 = s.zones[1].hand.length;
  let x = ateDecisao(act(s, ofertas.find(a => a.targets[0].player === 1)));
  assert.equal(s.objects[c].zone, 'battlefield'); assert.equal(x.objects[c].zone, 'graveyard', 'sacrificada como custo');
  x = tudo(x, y => legais(y, y.pending.p, a => a.t === 'discard')[0] || legais(y, y.pending.p)[0]);
  assert.equal(x.zones[1].hand.length, mao1, 'o jogador alvo comprou 3 e descartou 3');
});
