// CR2g.1 · correções achadas pela auditoria independente das fases e passos (CR2g/CR2b, 11/10/2026): o ninja ataca o mesmo planeswalker
// (ruling do Ninja of the Deep Hours, 508.4); as criaturas saem do combate quando o passo de fim do combate termina (511.3); gatilho
// disparado na limpeza dá prioridade e depois vem outra limpeza (514.3a); efeito com duração acaba fora de fase (702.26d); o que saiu de
// fase indiretamente só volta com aquilo a que está anexado (702.26g). Cada teste falha no motor v99.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, mesa, comMana, tudo, passaAte, CARTAS } from './cmd.mjs';

const semMao = (s, p) => { s = J(s); for (const x of s.zones[p].hand) { s.objects[x].zone = 'library'; s.zones[p].library.push(x); } s.zones[p].hand = []; return s; };
const veterano = (s, oid) => { s = J(s); s.objects[oid].entrouNoTurno = s.turn.number - 1; s.objects[oid].sick = false; return s; };
const ateAtacar = s => passaAte(s, x => x.pending && x.pending.kind === 'attackers');

test('CR2g.1 · ninjutsu: o ninja ataca o mesmo planeswalker que o atacante devolvido (antes atacava o jogador)', () => {
  let s = semMao(mesa(['Faerie Seer', 'Ninja of the Deep Hours'], ['Lukka, Coppercoat Outcast']), 0), fs, nj, lk;
  [s, fs] = poe(s, 0, 'Faerie Seer'); s = veterano(s, fs); [s, nj] = poe(s, 0, 'Ninja of the Deep Hours', 'hand');
  [s, lk] = poe(s, 1, 'Lukka, Coppercoat Outcast'); s = J(s); s.objects[lk].counters.loyalty = Number(CARTAS['Lukka, Coppercoat Outcast'].loyalty);
  s = act(ateAtacar(s), { t: 'attack', p: 0, attackers: [fs], alvos: { [fs]: lk } });
  s = passaAte(s, x => (x.pending && x.pending.kind === 'blockers') || (x.turn.step === 'combat_blockers' && !x.pending)); if (s.pending) s = act(s, { t: 'block', p: s.pending.p, blocks: [] });
  s = comMana(s, 'UU');
  const op = legais(s, 0, a => a.t === 'ninjutsu'); assert.equal(op.length, 1);
  s = tudo(act(s, op[0]));
  assert.equal(s.objects[nj].atacandoPw, lk, 'o ninja ataca a Lukka');
  const l0 = s.objects[lk].counters.loyalty, v0 = s.players[1].life;
  s = passaAte(s, x => x.turn.step === 'main2');
  assert.equal(s.objects[lk].counters.loyalty, l0 - 2, 'os 2 de dano do ninja saem da lealdade');
  assert.equal(s.players[1].life, v0, 'o jogador não recebe o dano');
});

test('CR2g.1 · 511.3: no passo de fim do combate as criaturas ainda estão atacando, e o ninjutsu é oferecido ali; saem do combate quando o passo termina', () => {
  let s = semMao(mesa(['Faerie Seer', 'Ninja of the Deep Hours'], []), 0), fs, nj;
  [s, fs] = poe(s, 0, 'Faerie Seer'); s = veterano(s, fs); [s, nj] = poe(s, 0, 'Ninja of the Deep Hours', 'hand');
  s = act(ateAtacar(s), { t: 'attack', p: 0, attackers: [fs] });
  s = passaAte(s, x => x.turn.step === 'combat_end' && !x.pending && !x.stack.length);
  s = comMana(s, 'UU');
  assert.ok(s.objects[fs].attacking != null, 'a Seer continua atacando no fim do combate');
  assert.equal(legais(s, 0, a => a.t === 'ninjutsu').length, 1, 'ninjutsu oferecido no fim do combate (702.49: atacante não bloqueado)');
  s = passaAte(s, x => x.turn.step === 'main2');
  assert.equal(s.objects[fs].attacking, undefined, 'na segunda principal já saiu do combate');
  assert.equal(s.combat, null);
});

test('CR2g.1 · 514.3a: gatilho de descarte na limpeza vai para a pilha, os jogadores recebem prioridade e depois vem outra limpeza (antes o turno passava com o gatilho na pilha)', () => {
  let s = mesa(['Glint-Horn Buccaneer'], []), g; [s, g] = poe(s, 0, 'Glint-Horn Buccaneer');
  s = J(s); while (s.zones[0].hand.length < 9) { const o = s.zones[0].library.shift(); s.zones[0].hand.push(o); s.objects[o].zone = 'hand'; }
  const t0 = s.turn.number, v0 = s.players[1].life;
  s = passaAte(s, y => y.pending && y.pending.kind === 'discard');
  assert.equal(s.turn.step, 'cleanup');
  while (s.pending && s.pending.kind === 'discard') s = act(s, { t: 'discard', p: 0, oid: s.zones[0].hand[0] });
  assert.equal(s.turn.number, t0, 'o turno não passa com gatilho esperando');
  assert.equal(s.turn.step, 'cleanup');
  assert.equal(s.stack.length, 2, 'os dois gatilhos do Glint-Horn na pilha');
  assert.equal(s.turn.priority, 0, 'o jogador ativo recebe prioridade na limpeza');
  s = passaAte(s, x => x.turn.number === t0 + 1);
  assert.equal(s.players[1].life, v0 - 2, 'os gatilhos resolvem ainda neste turno');
  assert.equal(s.zones[0].hand.length, 7);
});

test('CR2g.1 · 702.26d: efeito "até o fim do turno" acaba mesmo com a permanente fora de fase', () => {
  let s = mesa(['Faerie Seer'], []), f; [s, f] = poe(s, 0, 'Faerie Seer');
  const src = { oid: 'efeito', name: 'Teste', controller: 0 };
  s = J(s); E.applyEffect(s, src, { do: 'continuo', target: 'creature', torna: { base: [0, 1] } }, { oid: f }, []);
  assert.deepEqual({ ...E.stats(s, s.objects[f]) }, { power: 0, toughness: 1 });
  E.applyEffect(s, src, { do: 'sai_de_fase', target: 'creature' }, { oid: f }, []);
  const t0 = s.turn.number; s = passaAte(s, x => x.turn.number === t0 + 2 && x.turn.step === 'main1');
  assert.equal(s.objects[f].phasedOut, undefined, 'voltou em fase');
  assert.deepEqual({ ...E.stats(s, s.objects[f]) }, { power: 1, toughness: 1 }, 'o efeito do turno em que saiu já acabou');
});

test('CR2g.1 · 702.26g: a Aura de outro jogador que saiu de fase junto só volta com a criatura (antes voltava sozinha no desvirar do dono da Aura)', () => {
  let s = mesa(['Thraben Inspector'], ['Rancor']), ins, ran;
  [s, ins] = poe(s, 0, 'Thraben Inspector'); [s, ran] = poe(s, 1, 'Rancor');
  s = J(s); s.objects[ran].attachedTo = ins;
  E.applyEffect(s, { oid: 'x', name: 'Teste', controller: 0 }, { do: 'sai_de_fase', target: 'creature' }, { oid: ins }, []);
  assert.ok(s.objects[ins].phasedOut && s.objects[ran].phasedOut);
  const t0 = s.turn.number;
  s = passaAte(s, x => x.turn.number === t0 + 1 && x.turn.step === 'main1');
  assert.ok(s.objects[ran].phasedOut, 'no turno do dono da Aura ela continua fora de fase');
  s = passaAte(s, x => x.turn.number === t0 + 2 && x.turn.step === 'main1');
  assert.ok(!s.objects[ins].phasedOut && !s.objects[ran].phasedOut, 'as duas voltam juntas');
  assert.equal(s.objects[ran].attachedTo, ins);
});
