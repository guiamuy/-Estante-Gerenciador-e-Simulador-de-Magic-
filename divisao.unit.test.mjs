// CR2g.2 · 510.1c: com dois ou mais bloqueadores, quem ataca divide o dano entre eles como quiser; 702.19b: com atropelar, só o que passa
// do letal de todos vai ao jogador. Antes o motor dava o letal na ordem do bloqueio, sem perguntar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, mesa, passaAte } from './cmd.mjs';

const semMao = (s, p) => { s = J(s); for (const x of s.zones[p].hand) { s.objects[x].zone = 'library'; s.zones[p].library.push(x); } s.zones[p].hand = []; return s; };
const veterano = (s, oid) => { s = J(s); s.objects[oid].entrouNoTurno = s.turn.number - 1; s.objects[oid].sick = false; return s; };

// Salt Road Packbeast (4/3) ataca; Valakut Invoker (2/3) e Masked Vandal (1/3) bloqueiam juntos
function combate({ atropelar = false } = {}) {
  let s = semMao(semMao(mesa(['Salt Road Packbeast'], ['Valakut Invoker', 'Masked Vandal']), 0), 1), pb, vi, mv;
  [s, pb] = poe(s, 0, 'Salt Road Packbeast'); s = veterano(s, pb); [s, vi] = poe(s, 1, 'Valakut Invoker'); [s, mv] = poe(s, 1, 'Masked Vandal');
  if (atropelar) { s = J(s); E.applyEffect(s, { oid: 'x', name: 'Teste', controller: 0 }, { do: 'keyword', keyword: 'trample' }, { oid: pb }, []); }
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers');
  s = act(s, { t: 'attack', p: 0, attackers: [pb] });
  s = passaAte(s, x => x.pending && x.pending.kind === 'blockers');
  s = act(s, { t: 'block', p: 1, blocks: [[vi, pb], [mv, pb]] });
  s = passaAte(s, x => x.pending && x.pending.kind === 'dividir_dano');
  return { s, pb, vi, mv };
}

test('CR2g.2 · 510.1c: com dois bloqueadores, quem ataca escolhe a divisão — matar o Masked Vandal em vez do Valakut Invoker', () => {
  let { s, vi, mv } = combate();
  assert.equal(s.pending.p, 0, 'quem decide é o controlador do atacante');
  const ops = legais(s, 0, a => a.t === 'dividir_dano');
  assert.deepEqual(Array.from(ops, a => a.label), ['3 em Valakut Invoker · 1 em Masked Vandal', '3 em Masked Vandal · 1 em Valakut Invoker', '4 em Valakut Invoker', '4 em Masked Vandal']);
  s = act(s, ops[1]);
  s = passaAte(s, x => x.turn.step === 'main2');
  assert.equal(s.objects[mv].zone, 'graveyard', 'o Masked Vandal recebeu 3 e morreu');
  assert.equal(s.objects[vi].zone, 'battlefield', 'o Valakut Invoker recebeu 1 e ficou');
  assert.equal(s.objects[vi].damage, 1);
});

test('CR2g.2 · a primeira opção é a de antes (letal na ordem do bloqueio), e tudo num só também vale', () => {
  let { s, vi, mv } = combate();
  s = passaAte(act(s, legais(s, 0, a => a.t === 'dividir_dano')[0]), x => x.turn.step === 'main2');
  assert.equal(s.objects[vi].zone, 'graveyard'); assert.equal(s.objects[mv].zone, 'battlefield');
  ({ s } = combate());
  s = passaAte(act(s, legais(s, 0, a => a.t === 'dividir_dano')[3]), x => x.turn.step === 'main2');
  const v = combate();
  assert.equal(s.objects[v.mv].zone, 'graveyard'); assert.equal(s.objects[v.vi].damage, 0);
});

test('CR2g.2 · 702.19b: com atropelar, o jogador só recebe o que passa do letal de todos os bloqueadores', () => {
  let { s } = combate({ atropelar: true });
  const ops = legais(s, 0, a => a.t === 'dividir_dano').map(a => a.label);
  assert.ok(ops.every(l => !/no jogador/.test(l)), '4 de dano não passa do letal dos dois (3 + 3): nada ao jogador — ' + ops.join(' / '));
  assert.throws(() => act(s, { t: 'dividir_dano', p: 0, index: 9 }), /divis/);
  assert.throws(() => act(s, { t: 'dividir_dano', p: 1, index: 0 }));
});

test('CR2g.2 · um bloqueador só: não há o que escolher, o dano sai sem perguntar', () => {
  let s = semMao(semMao(mesa(['Salt Road Packbeast'], ['Valakut Invoker']), 0), 1), pb, vi;
  [s, pb] = poe(s, 0, 'Salt Road Packbeast'); s = veterano(s, pb); [s, vi] = poe(s, 1, 'Valakut Invoker');
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers');
  s = act(s, { t: 'attack', p: 0, attackers: [pb] });
  s = passaAte(s, x => x.pending && x.pending.kind === 'blockers');
  s = act(s, { t: 'block', p: 1, blocks: [[vi, pb]] });
  s = passaAte(s, x => x.turn.step === 'main2' || (x.pending && x.pending.kind === 'dividir_dano'));
  assert.equal(s.turn.step, 'main2'); assert.equal(s.objects[vi].zone, 'graveyard');
});
