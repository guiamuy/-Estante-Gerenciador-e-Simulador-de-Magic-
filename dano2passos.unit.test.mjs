// CR2g.3 · 510.4: com iniciativa ou golpe duplo há dois passos de dano de combate; depois do primeiro, os gatilhos vão para a pilha e os
// jogadores recebem prioridade, e só então vem o dano normal. Antes as duas passadas aconteciam juntas, sem janela entre elas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, mesa, passaAte } from './cmd.mjs';

const semMao = (s, p) => { s = J(s); for (const x of s.zones[p].hand) { s.objects[x].zone = 'library'; s.zones[p].library.push(x); } s.zones[p].hand = []; return s; };
const veterano = (s, oid) => { s = J(s); s.objects[oid].entrouNoTurno = s.turn.number - 1; s.objects[oid].sick = false; return s; };

function golpeDuplo() {
  let s = semMao(semMao(mesa(['Salt Road Packbeast'], []), 0), 1), pb;
  [s, pb] = poe(s, 0, 'Salt Road Packbeast'); s = veterano(s, pb);
  s = J(s); E.applyEffect(s, { oid: 'x', name: 'Teste', controller: 0 }, { do: 'keyword', keyword: 'double strike' }, { oid: pb }, []);
  const sc = s.facts['Salt Road Packbeast'].script || { name: 'Salt Road Packbeast', effects: [], abilities: [] };
  s.facts['Salt Road Packbeast'].script = { ...sc, abilities: [...(sc.abilities || []), { kind: 'triggered', when: 'combat-damage', effects: [{ do: 'gain', amount: 1 }] }] };
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers');
  s = act(s, { t: 'attack', p: 0, attackers: [pb] });
  s = passaAte(s, x => x.turn.step === 'combat_damage');
  return { s, pb };
}

test('CR2g.3 · 510.4: golpe duplo — o primeiro dano sai, o gatilho dele vai para a pilha e há prioridade antes do segundo dano', () => {
  let { s } = golpeDuplo();
  assert.equal(s.players[1].life, 16, 'só o primeiro passo de dano: 4');
  assert.equal(s.stack.length, 1, 'o gatilho de dano de combate do primeiro golpe já está na pilha');
  assert.equal(s.turn.priority, 0, 'o jogador ativo recebe prioridade entre os dois passos');
  s = act(s, { t: 'pass', p: 0 }); s = act(s, { t: 'pass', p: 1 }); // o gatilho resolve
  assert.equal(s.players[0].life, 21, 'o gatilho do primeiro golpe resolveu antes do segundo dano');
  assert.equal(s.players[1].life, 16);
  assert.equal(s.turn.step, 'combat_damage');
  s = act(s, { t: 'pass', p: 0 }); s = act(s, { t: 'pass', p: 1 }); // todos passam com a pilha vazia: segundo passo de dano
  assert.equal(s.players[1].life, 12, 'o segundo passo de dano: mais 4');
  assert.equal(s.turn.step, 'combat_damage', 'o segundo passo de dano também dá prioridade');
});

test('CR2g.3 · sem iniciativa nem golpe duplo, há um passo de dano só (o combate de sempre)', () => {
  let s = semMao(semMao(mesa(['Salt Road Packbeast'], []), 0), 1), pb;
  [s, pb] = poe(s, 0, 'Salt Road Packbeast'); s = veterano(s, pb);
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers');
  s = act(s, { t: 'attack', p: 0, attackers: [pb] });
  s = passaAte(s, x => x.turn.step === 'combat_damage');
  assert.equal(s.players[1].life, 16);
  s = passaAte(s, x => x.turn.step !== 'combat_damage');
  assert.equal(s.players[1].life, 16, 'nada a mais');
  assert.equal(s.turn.step, 'combat_end');
});

test('CR2g.3 · a prévia do combate continua mostrando os dois passos de dano', () => {
  let s = semMao(semMao(mesa(['Salt Road Packbeast'], []), 0), 1), pb;
  [s, pb] = poe(s, 0, 'Salt Road Packbeast'); s = veterano(s, pb);
  s = J(s); E.applyEffect(s, { oid: 'x', name: 'Teste', controller: 0 }, { do: 'keyword', keyword: 'double strike' }, { oid: pb }, []);
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers');
  const pa = E.previewAttack(s, [pb]);
  assert.equal(pa.life[1], -8, 'a prévia soma os dois golpes');
});
