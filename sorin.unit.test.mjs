// M-272 · extorsão (702.101a), "exile e volte transformado" do Sorin (objeto novo, 712) e o −6 da face de trás: ganhar o controle sem prazo,
// virar Vampiro além dos outros tipos e um marcador de vínculo com a vida se você controlar outra permanente branca. Carta: Sorin of House
// Markov // Sorin, Ravenous Neonate (texto oficial em .listas/oficiais-commander.json, 05/10/2026; segunda fonte, Oracle do Forge, 10/10/2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, mesa, comMana, tudo, passaAte } from './cmd.mjs';
import { S, T } from './listas.mjs';

function comExtorsao(paga) {
  let s = mesa(['Sorin of House Markov', 'Lightning Bolt'], ['Faerie Seer']), so, bolt;
  [s, so] = poe(s, 0, 'Sorin of House Markov'); [s, bolt] = poe(s, 0, 'Lightning Bolt', 'hand');
  s = comMana(s, 'RB');
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === bolt && a.targets[0].player === 1)[0]);
  const v0 = s.players[0].life, v1 = s.players[1].life;
  for (let i = 0; i < 20 && (s.stack.length || s.pending || s.queued.length); i++) {
    const pd = s.pending;
    if (pd && pd.kind === 'may_pay') { s = act(s, paga ? legais(s, pd.p, a => a.t !== 'decline' && a.t !== 'concede')[0] : { t: 'decline', p: pd.p }); continue; }
    s = pd ? act(s, legais(s, pd.p)[0]) : act(s, { t: 'pass', p: s.turn.priority });
  }
  return { s, v0, v1 };
}

test('M-272 · extorsão: ao conjurar uma mágica, pode pagar {W/B}; se pagar, cada oponente perde 1 e você ganha 1; recusar não faz nada', () => {
  const a = comExtorsao(true);
  assert.equal(a.s.players[1].life, a.v1 - 3 - 1, 'o raio (3) e a extorsão (1)'); assert.equal(a.s.players[0].life, a.v0 + 1);
  assert.equal(a.s.players[0].pool.B || 0, 0, 'pagou {B} pelo híbrido');
  const b = comExtorsao(false);
  assert.equal(b.s.players[1].life, b.v1 - 3); assert.equal(b.s.players[0].life, b.v0);
});

test('M-272 · Sorin: na fase principal pós-combate, com 3 ou mais de vida ganha no turno, é exilado e volta transformado como objeto novo, sob o controle do dono', () => {
  let s = mesa(['Sorin of House Markov'], []), so;
  [s, so] = poe(s, 0, 'Sorin of House Markov'); s = J(s); s.objects[so].damage = 2; s.players[0].lifeGained = 3;
  const zc = s.objects[so].zc || 0;
  s = passaAte(s, x => x.turn.step === 'main2' && !x.stack.length && !x.queued.length && !x.pending);
  assert.equal(s.objects[so].name, 'Sorin, Ravenous Neonate'); assert.equal(s.objects[so].zone, 'battlefield');
  assert.equal(s.objects[so].counters.loyalty, 3); assert.ok((s.objects[so].zc || 0) > zc, 'objeto novo (exilado e voltou)'); assert.equal(s.objects[so].damage, 0);
  assert.ok(/Sorin/.test(E.linhaDeTipo(s, s.objects[so])), 'a face de trás é planeswalker Sorin');
});

test('M-272 · Sorin −6: ganha o controle de uma criatura do oponente (com enjoo), ela vira Vampiro além do que já é e, com outra permanente branca sua, ganha um marcador de vínculo com a vida', () => {
  for (const comBranca of [true, false]) {
    let s = mesa(['Sorin of House Markov', 'Thraben Inspector'], ['Faerie Seer']), so, op;
    [s, so] = poe(s, 0, 'Sorin of House Markov', 'battlefield', { name: 'Sorin, Ravenous Neonate', frontName: 'Sorin of House Markov', counters: { loyalty: 6 } });
    [s, op] = poe(s, 1, 'Faerie Seer');
    if (comBranca) [s] = poe(s, 0, 'Thraben Inspector');
    const idx = legais(s, 0, a => a.t === 'activate' && a.oid === so).map(a => a.index).sort((x, y) => y - x)[0];
    s = tudo(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === so && a.index === idx && (a.targets || []).some(t => t.oid === op))[0]));
    assert.equal(s.objects[op].controller, 0, 'agora é sua'); assert.equal(s.objects[op].sick, true, 'com enjoo de invocação (302.6)');
    assert.ok(/\bVampire\b/.test(E.linhaDeTipo(s, s.objects[op])) && /\bFaerie\b/.test(E.linhaDeTipo(s, s.objects[op])), 'Vampiro além de Fada: ' + E.linhaDeTipo(s, s.objects[op]));
    assert.equal(E.hasKeyword(s, s.objects[op], 'lifelink'), comBranca, comBranca ? 'outra permanente branca: marcador de vínculo com a vida' : 'sem outra branca: sem marcador');
    const x = passaAte(s, y => y.turn.active === 1); assert.ok(/\bVampire\b/.test(E.linhaDeTipo(x, x.objects[op])) && x.objects[op].controller === 0, 'sem prazo: continua sua e Vampiro no turno seguinte');
  }
});
