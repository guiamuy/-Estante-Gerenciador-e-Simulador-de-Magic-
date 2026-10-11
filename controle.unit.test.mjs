// CR2d.6 · camada 2 (613.1b): controle por efeito contínuo, com carimbo de tempo (613.7) e duração (611.2). O efeito mais novo que
// ainda vale manda; acabado, volta o controle de antes; a permanente que muda de controle fica com enjoo (302.6) e sai do combate
// (506.4); objeto novo não leva o efeito (400.7). Efeitos sintéticos: as listas só têm o −6 do Sorin (sem prazo).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, mesa, tudo, passaAte } from './cmd.mjs';
import { S, T } from './listas.mjs';

const ganha = (s, por, alvo, ate, fonte) => { s = J(s); const src = fonte ? s.objects[fonte] : { oid: 'efeito', name: 'Teste', controller: por }; E.applyEffect(s, src, { do: 'ganhar_controle', target: 'creature', ...(ate ? { ate } : {}) }, { oid: alvo }, []); return s; };

test('CR 613.1 · camada 2: "até o fim do turno" — o controle muda, a criatura fica com enjoo, e volta ao dono na limpeza', () => {
  let s = mesa(['Thraben Inspector'], ['Faerie Seer']), seer;
  [s, seer] = poe(s, 1, 'Faerie Seer'); s = J(s); s.objects[seer].sick = false;
  s = ganha(s, 0, seer, 'fim-do-turno');
  assert.equal(s.objects[seer].controller, 0); assert.equal(s.objects[seer].sick, true, '302.6');
  const x = passaAte(s, y => y.turn.active === 1);
  assert.equal(x.objects[seer].controller, 1, 'acabou na limpeza: volta a quem controlava antes');
  assert.equal(x.objects[seer].controles, undefined); assert.equal(x.objects[seer].controladorBase, undefined, 'sem efeito valendo, não sobra marca');
  assert.equal(T.descreveEfeitos([{ do: 'ganhar_controle', target: 'creature', ate: 'fim-do-turno' }]), 'ganha o controle de uma criatura até o fim do turno');
});

test('CR 613.7 · camada 2 por carimbo: o efeito mais novo manda; quando ele acaba, vale o anterior, não o dono', () => {
  let s = mesa(['Thraben Inspector'], ['Faerie Seer']), seer;
  [s, seer] = poe(s, 1, 'Faerie Seer');
  s = ganha(s, 0, seer); // sem prazo: o jogador 0
  s = ganha(s, 1, seer, 'fim-do-turno'); // o dono pega de volta até o fim do turno (mais novo)
  assert.equal(s.objects[seer].controller, 1);
  const x = passaAte(s, y => y.turn.active === 1);
  assert.equal(x.objects[seer].controller, 0, 'acabou o mais novo: vale o sem prazo, mais antigo');
  const y = passaAte(x, z => z.turn.active === 0); assert.equal(y.objects[seer].controller, 0, 'sem prazo continua');
});

test('CR 611.2 · "enquanto você controlar a fonte": a fonte sai e o controle volta (ação de estado); objeto novo não leva o efeito (400.7)', () => {
  let s = mesa(['Thraben Inspector'], ['Faerie Seer']), seer, ins;
  [s, seer] = poe(s, 1, 'Faerie Seer'); [s, ins] = poe(s, 0, 'Thraben Inspector');
  s = ganha(s, 0, seer, { enquanto: 'controlar-fonte' }, ins);
  assert.equal(s.objects[seer].controller, 0);
  let x = J(s); E.moveObject(x, ins, 'graveyard'); x = act(x, { t: 'pass', p: x.turn.priority });
  assert.equal(x.objects[seer].controller, 1, 'a fonte saiu do campo: volta ao dono');
  const z = ganha(s, 0, seer); const w = J(z); E.moveObject(w, seer, 'hand'); E.moveObject(w, seer, 'battlefield');
  assert.equal(w.objects[seer].controller, 1, 'voltou ao campo como objeto novo, sob o controle do dono'); assert.equal(w.objects[seer].controles, undefined);
  assert.ok(J(S.validateScript({ name: 'T', effects: [{ do: 'ganhar_controle', target: 'creature', ate: 'para-sempre' }], example: { target: 'none', expect: { handDelta: 0 } } })).some(e => /duração/.test(e)));
});

test('CR 506.4 · criatura atacante que muda de controle sai do combate', () => {
  let s = mesa(['Thraben Inspector'], ['Faerie Seer']), ins;
  [s, ins] = poe(s, 0, 'Thraben Inspector'); s = J(s); s.objects[ins].sick = false;
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers'); s = act(s, { t: 'attack', p: 0, attackers: [ins] });
  assert.ok(s.combat.attackers.includes(ins));
  s = ganha(s, 1, ins, 'fim-do-turno');
  assert.ok(!s.combat.attackers.includes(ins) && !s.objects[ins].attacking, 'fora do combate');
});
