// V-2 · CR 701.34 · proliferar. Texto oficial em .listas/oficiais-verbos.json (mtg.wtf e Oracle do Forge, 11/10/2026):
// Steady Progress — "Proliferate. Draw a card." · Fuel for the Cause — "Counter target spell, then proliferate."
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
import { E, J, act, poe, legais, mesa, comMana, tudo, criatura, conjura } from './verbos.mjs';
const { scripts: S, table: T } = loadModules();
const URSO = criatura('Urso de Teste 3/3', 3, 3), LOBO = criatura('Lobo de Teste 2/4', 2, 4), MURO = criatura('Muro de Teste 0/5', 0, 5);
function arma(meus, deles) {
  let s = mesa(['Steady Progress', ...meus], deles), m, a = [], b = [];
  [s, m] = poe(s, 0, 'Steady Progress', 'hand');
  for (const n of meus) { let o; [s, o] = poe(s, 0, n); a.push(o); }
  for (const n of deles) { let o; [s, o] = poe(s, 1, n); b.push(o); }
  return [comMana(s, 'UUU'), m, a, b];
}
const poeMarcadores = (s, oid, c) => { s = J(s); Object.assign(s.objects[oid].counters, c); return s; };
const ateDecisao = s => { for (let i = 0; i < 10 && !s.pending && s.stack.length; i++) s = act(s, { t: 'pass', p: s.turn.priority }); return s; };

test('CR 701.34 · proliferar: quem controla escolhe qualquer número de permanentes com marcador (suas e dos outros), e cada escolhida recebe mais um de cada tipo que já tem', () => {
  let [s, m, [urso, muro], [lobo]] = arma([URSO, MURO], [LOBO]);
  s = poeMarcadores(s, urso, { p1p1: 2, charge: 1 }); s = poeMarcadores(s, lobo, { m1m1: 1 });
  const mao = s.zones[0].hand.length;
  s = ateDecisao(conjura(s, 0, m));
  assert.equal(s.pending.kind, 'pick'); assert.equal(s.pending.p, 0);
  assert.deepEqual([...s.pending.from].sort(), [urso, lobo].sort(), 'só quem tem marcador entra na escolha: o Muro, sem marcador, não');
  assert.equal(s.pending.min, 0, 'pode escolher nenhuma');
  s = act(s, { t: 'pick', p: 0, oid: urso }); s = act(s, { t: 'pick', p: 0, oid: lobo });
  s = tudo(s);
  assert.deepEqual(J(s.objects[urso].counters), { p1p1: 3, charge: 2 }, 'mais um de cada tipo'); assert.equal(s.objects[lobo].counters.m1m1, 2);
  assert.equal(E.stats(s, s.objects[urso]).power, 6); assert.equal(s.objects[muro].counters.p1p1 || 0, 0);
  assert.equal(s.zones[0].hand.length, mao, 'e o resto da mágica acontece depois: comprou uma carta (−1 da mágica, +1 da compra)');
  assert.equal(s.proliferar, undefined); assert.equal(s.verbo, undefined, 'nada sobra no estado');
});

test('CR 701.34 · proliferar: escolher nenhuma é permitido, e escolher só algumas deixa as outras como estavam', () => {
  let [s, m, [urso], [lobo]] = arma([URSO], [LOBO]);
  s = poeMarcadores(s, urso, { p1p1: 1 }); s = poeMarcadores(s, lobo, { p1p1: 1 });
  const naEscolha = ateDecisao(conjura(s, 0, m));
  let r = tudo(act(naEscolha, { t: 'pick_done', p: 0 }));
  assert.equal(r.objects[urso].counters.p1p1, 1); assert.equal(r.objects[lobo].counters.p1p1, 1);
  r = tudo(act(act(naEscolha, { t: 'pick', p: 0, oid: urso }), { t: 'pick_done', p: 0 }));
  assert.equal(r.objects[urso].counters.p1p1, 2, 'a sua ganha'); assert.equal(r.objects[lobo].counters.p1p1, 1, 'a do oponente, não escolhida, fica igual');
});

test('CR 701.34 · proliferar: jogador com marcador de veneno também pode ser escolhido, um por um, e os marcadores vêm todos juntos no fim', () => {
  let [s, m, [urso]] = arma([URSO], [LOBO]);
  s = poeMarcadores(s, urso, { p1p1: 1 }); s = J(s); s.players[1].poison = 3; s.players[0].poison = 1;
  s = ateDecisao(conjura(s, 0, m));
  s = act(s, { t: 'pick', p: 0, oid: urso });
  assert.equal(s.objects[urso].counters.p1p1, 1, 'nada é posto antes de todas as escolhas');
  assert.equal(s.pending.kind, 'may_pay'); assert.equal(s.pending.cost, null); assert.match(s.pending.name, /veneno em A/);
  s = act(s, { t: 'decline', p: 0 }); // em você mesmo, não
  assert.match(s.pending.name, /veneno em B/);
  s = act(s, { t: 'pay', p: 0 }); s = tudo(s);
  assert.equal(s.players[1].poison, 4); assert.equal(s.players[0].poison, 1); assert.equal(s.objects[urso].counters.p1p1, 2);
  // sem permanente com marcador, só a pergunta do jogador
  let [t, m2] = arma([URSO], []); t = J(t); t.players[1].poison = 9;
  t = ateDecisao(conjura(t, 0, m2)); assert.equal(t.pending.kind, 'may_pay');
  t = tudo(act(t, { t: 'pay', p: 0 })); assert.equal(t.players[1].poison, 10); assert.equal(t.status, 'over', 'o décimo marcador de veneno encerra a partida (704.5c)');
});

test('CR 701.34 · proliferar: sem nenhum marcador na mesa não há escolha; lealdade e marcador +1/+1 que dispara gatilho passam pelo caminho de sempre', () => {
  const [s, m] = arma([URSO], [LOBO]); const mao = s.zones[0].hand.length;
  const r = tudo(conjura(s, 0, m)); assert.equal(r.pending, null); assert.equal(r.zones[0].hand.length, mao);
  // permanente escolhida que saiu do campo antes de os marcadores chegarem não recebe nada (e não quebra)
  let [x, m2, [urso]] = arma([URSO], []); x = poeMarcadores(x, urso, { p1p1: 1, loyalty: 2 });
  x = ateDecisao(conjura(x, 0, m2)); x = act(x, { t: 'pick', p: 0, oid: urso }); x = tudo(x);
  assert.deepEqual(J(x.objects[urso].counters), { p1p1: 2, loyalty: 3 });
});

test('CR 701.34 · proliferar depois de anular (Fuel for the Cause): a mágica alvo é anulada e a escolha vem em seguida; o validador recusa alvo depois de proliferar', () => {
  let s = mesa(['Fuel for the Cause', URSO], ['Lightning Bolt']), f, urso, bolt;
  [s, f] = poe(s, 0, 'Fuel for the Cause', 'hand'); [s, urso] = poe(s, 0, URSO); [s, bolt] = poe(s, 1, 'Lightning Bolt', 'hand');
  s = poeMarcadores(s, urso, { p1p1: 1 }); s = comMana(comMana(s, 'UUUU'), 'R', 1);
  s = J(s); s.zones[1].hand.splice(s.zones[1].hand.indexOf(bolt), 1); s.stack.push(bolt); Object.assign(s.objects[bolt], { zone: 'stack', controller: 1, targets: [{ player: 0 }] }); // o Raio do oponente já na pilha
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === f)[0]);
  s = ateDecisao(s);
  assert.equal(s.pending.kind, 'pick'); assert.equal(s.objects[bolt].zone, 'graveyard', 'anulou primeiro');
  s = tudo(act(s, { t: 'pick', p: 0, oid: urso })); assert.equal(s.objects[urso].counters.p1p1, 2); assert.equal(s.players[0].life, 20);
  const erros = effects => S.validateScript({ name: 'X', effects, example: { target: 'none', expect: { handDelta: 0 } } }).join(' | ');
  assert.match(erros([{ do: 'proliferate' }, { do: 'damage', amount: 1, target: 'any' }]), /efeito com alvo depois de uma escolha/);
  assert.equal(erros([{ do: 'proliferate' }, { do: 'draw', amount: 1 }]), '');
  assert.equal(T.descreveEfeitos(S.SCRIPTS['Steady Progress'].effects), 'prolifera (escolhe permanentes e jogadores com marcador; cada um recebe mais um de cada tipo que já tem); compra 1 carta');
});

test('CR 701.34 · proliferar numa habilidade (não só em mágica): a escolha abre, e o que vem depois na habilidade espera', () => {
  let [s, , [urso]] = arma([URSO], []); s = poeMarcadores(s, urso, { p1p1: 1 }); s = J(s);
  const mao = s.zones[0].hand.length;
  s.objects.habv = { oid: 'habv', ability: true, name: 'Teste', source: urso, effects: [{ do: 'proliferate' }, { do: 'draw', amount: 1 }], owner: 0, controller: 0, zone: 'stack', tapped: false, sick: false, damage: 0, counters: {}, targets: [] };
  s.stack.push('habv');
  s = ateDecisao(s); assert.equal(s.pending && s.pending.kind, 'pick'); assert.equal(s.zones[0].hand.length, mao, 'a compra espera a escolha');
  s = tudo(act(s, { t: 'pick', p: 0, oid: urso }));
  assert.equal(s.objects[urso].counters.p1p1, 2); assert.equal(s.zones[0].hand.length, mao + 1);
});
