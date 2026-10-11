// M-269 · suspender (702.62a): carta exilada com marcadores de tempo; na manutenção do dono, um gatilho tira um marcador; tirado o último,
// o dono pode conjurá-la sem pagar o custo de mana (se não, continua exilada); criatura conjurada assim tem ímpeto. Carta: Delay ("Counter
// target spell. If the spell is countered this way, exile it with three time counters on it instead of putting it into its owner's graveyard.
// If it doesn't have suspend, it gains suspend." — texto oficial em .listas/oficiais-commander.json, 05/10/2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, mesa, comMana, tudo, passaAte } from './cmd.mjs';
import { S, T } from './listas.mjs';

const principalDe = (s, p) => passaAte(s, x => x.turn.active === p && x.turn.step === 'main1' && !x.stack.length && !x.pending);
const proximoPrincipalDe = (s, p) => principalDe(passaAte(s, x => x.turn.active !== p), p);

/** O jogador 1 conjura a Faerie Seer no turno dele; o jogador 0 responde com Delay. */
function suspende() {
  let s = mesa(['Delay'], ['Faerie Seer']), dl, seer;
  [s, dl] = poe(s, 0, 'Delay', 'hand'); [s, seer] = poe(s, 1, 'Faerie Seer', 'hand');
  s = principalDe(s, 1); s = comMana(s, 'U', 1);
  s = act(s, legais(s, 1, a => a.t === 'cast' && a.oid === seer)[0]); s = act(s, { t: 'pass', p: 1 });
  s = comMana(s, 'UC', 0);
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === dl && a.targets[0].oid === seer)[0]));
  return { s, seer };
}

test('M-269 · Delay: a mágica anulada vai para o exílio com três marcadores de tempo e ganha suspender (não vai para o cemitério)', () => {
  const { s, seer } = suspende();
  assert.equal(s.objects[seer].zone, 'exile'); assert.equal(s.objects[seer].counters.time, 3); assert.equal(s.objects[seer].suspensa, true);
  assert.equal(S.SCRIPTS.Delay.covers, undefined, 'deixa de ser parcial');
  assert.equal(T.descreveEfeitos(S.SCRIPTS.Delay.effects), 'anula uma mágica e a exila com 3 marcadores de tempo, com suspender');
  assert.ok(J(S.validateScript({ name: 'T', effects: [{ do: 'draw', amount: 1, suspende: 3 }], example: { target: 'none', expect: { handDelta: 1 } } })).some(e => /suspende/.test(e)));
});

test('M-269 · suspender: um marcador por manutenção do dono (gatilho na pilha); no último, o dono conjura sem pagar e a criatura tem ímpeto', () => {
  let { s, seer } = suspende();
  s = proximoPrincipalDe(s, 1); assert.equal(s.objects[seer].counters.time, 2, 'primeira manutenção do dono');
  s = proximoPrincipalDe(s, 1); assert.equal(s.objects[seer].counters.time, 1);
  s = passaAte(passaAte(s, x => x.turn.active !== 1), x => x.turn.active === 1 && x.turn.step === 'main1');
  assert.equal(s.pending && s.pending.kind, 'free_cast', 'saiu o último: o dono decide'); assert.equal(s.pending.p, 1); assert.deepEqual(J(s.pending.options), [seer]);
  const pool = J(s.players[1].pool);
  s = tudo(act(s, legais(s, 1, a => a.t === 'cast_free' && a.oid === seer)[0]));
  assert.equal(s.objects[seer].zone, 'battlefield'); assert.equal(s.objects[seer].controller, 1);
  assert.deepEqual(J(s.players[1].pool), pool, 'sem pagar');
  assert.equal(E.hasKeyword(s, s.objects[seer], 'haste'), true, '"If it\'s a creature, it has haste"');
  assert.equal(s.objects[seer].suspensa, undefined);
});

test('M-269 · suspender: recusar deixa a carta no exílio, sem permissão e sem novos gatilhos; o motor não a conjura pelo jogador', () => {
  let { s, seer } = suspende();
  s = J(s); s.objects[seer].counters.time = 1;
  s = passaAte(passaAte(s, x => x.turn.active !== 1), x => x.turn.active === 1 && x.turn.step === 'main1');
  assert.equal(s.pending.kind, 'free_cast');
  s = act(s, { t: 'decline_free', p: 1 });
  assert.equal(s.objects[seer].zone, 'exile'); assert.equal(s.objects[seer].playableFromExile, undefined);
  assert.equal(legais(s, 1, a => a.oid === seer).length, 0, 'não pode ser conjurada depois');
  const x = proximoPrincipalDe(s, 1); assert.equal(x.objects[seer].zone, 'exile', 'nada dispara sem marcadores');
});
