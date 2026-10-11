// M-274 · encaixar (702.47): ao conjurar uma mágica Arcane, revela da mão uma carta com "Splice onto Arcane" e paga o custo dela; o texto
// da carta encaixada entra na mágica, com alvos próprios, e ela continua na mão. Carta: Reweave ("Splice onto Arcane {2}{U}{U}"; texto oficial
// em .listas/oficiais-commander.json, 05/10/2026). As listas não têm outra mágica Arcane: o teste marca o Lightning Bolt como Arcane.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, mesa, comMana, tudo } from './cmd.mjs';
import { S, T } from './listas.mjs';

function prepara() {
  let s = mesa(['Reweave', 'Lightning Bolt', 'Thraben Inspector'], ['Faerie Seer']), rw, bolt, op;
  [s, rw] = poe(s, 0, 'Reweave', 'hand'); [s, bolt] = poe(s, 0, 'Lightning Bolt', 'hand'); [s, op] = poe(s, 1, 'Faerie Seer');
  s = J(s); s.facts['Lightning Bolt'].typeText = 'Instant — Arcane'; s.manaCheck = true;
  for (const oid of s.zones[0].battlefield) s.objects[oid].tapped = true;
  return { s, rw, bolt, op };
}

test('M-274 · encaixar: a mesa oferece conjurar a mágica Arcane encaixando o Reweave, pagando {2}{U}{U} a mais; sem mana, não', () => {
  let { s, rw, bolt, op } = prepara();
  assert.equal(legais(comMana(s, 'R'), 0, a => a.t === 'cast' && a.oid === bolt && a.emenda).length, 0, 'só {R}: não encaixa');
  s = comMana(s, 'RCCUU');
  const of = legais(s, 0, a => a.t === 'cast' && a.oid === bolt && a.emenda);
  assert.ok(of.length && of.every(a => a.emenda.length === 1 && a.emenda[0] === rw));
  assert.ok(of.some(a => a.targets.length === 2 && a.targets[0].player === 1 && a.targets[1].oid === op), 'dois alvos: o do raio e o do Reweave');
  assert.equal(legais(s, 0, a => a.t === 'cast' && a.oid === rw && a.emenda).length, 0, 'o Reweave não se encaixa em si mesmo');
  // fora de uma mágica Arcane, não
  const x = J(s); x.facts['Lightning Bolt'].typeText = 'Instant'; assert.equal(legais(x, 0, a => a.t === 'cast' && a.oid === bolt && a.emenda).length, 0);
});

test('M-274 · encaixar: a mágica resolve o próprio texto e depois o do Reweave, cada um com o seu alvo; o Reweave fica na mão', () => {
  let { s, rw, bolt, op } = prepara();
  s = comMana(s, 'RCCUU'); const vida = s.players[1].life;
  const c = legais(s, 0, a => a.t === 'cast' && a.oid === bolt && a.emenda && a.targets[0].player === 1 && a.targets[1].oid === op)[0];
  const r = E.apply(s, c); s = r.state;
  assert.ok(r.events.some(e => e.do === 'reveal' && e.target === 'Reweave'), 'revelou o Reweave');
  assert.equal(s.objects[rw].zone, 'hand'); assert.equal(Object.values(s.players[0].pool).reduce((a, b) => a + b, 0), 0, 'pagou {R} + {2}{U}{U}');
  s = tudo(s);
  assert.equal(s.players[1].life, vida - 3, 'o raio no jogador');
  assert.equal(s.objects[op].zone, 'graveyard', 'o dono da Faerie Seer a sacrificou (o "mesmo alvo" do Reweave é a Seer, não o jogador do raio)');
  assert.equal(s.objects[rw].zone, 'hand', 'a carta encaixada continua na mão'); assert.equal(s.objects[bolt].zone, 'graveyard');
  assert.equal(S.SCRIPTS.Reweave.covers, undefined);
  assert.ok(J(S.validateScript({ name: 'T', splice: { subtipo: 'Arcane', mana: '2U' }, effects: [{ do: 'draw', amount: 1 }], example: { target: 'none', expect: { handDelta: 1 } } })).some(e => /encaixar precisa/.test(e)));
});
