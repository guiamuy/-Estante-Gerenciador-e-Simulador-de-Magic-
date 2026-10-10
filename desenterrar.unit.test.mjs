// M-257 · desenterrar (702.84): Priest of Fell Rites ("Unearth {3}{W}{B} ({3}{W}{B}: Return this card from your graveyard to the
// battlefield. It gains haste. Exile it at the beginning of the next end step or if it would leave the battlefield. Unearth only as a
// sorcery.)", texto oficial em .listas/oficiais-commander.json, 05/10/2026; segunda fonte, Oracle do Forge, 10/10/2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, mesa, comMana, tudo, passaAte } from './cmd.mjs';

function desenterrada() {
  let s = mesa(['Priest of Fell Rites', 'Thraben Inspector'], ['Lightning Bolt']), pr; [s, pr] = poe(s, 0, 'Priest of Fell Rites', 'graveyard'); [s] = poe(s, 0, 'Thraben Inspector', 'graveyard');
  s = comMana(s, 'WBCCC');
  return { s, pr };
}

test('M-257 · desenterrar: do cemitério, no tempo de feitiço, pagando o custo; vai à pilha; volta ao campo com ímpeto', () => {
  let { s, pr } = desenterrada();
  const of = legais(s, 0, a => a.t === 'unearth' && a.oid === pr); assert.equal(of.length, 1);
  s = act(s, of[0]);
  assert.equal(s.stack.length, 1, 'é uma habilidade na pilha (pode ser respondida)'); assert.equal(s.objects[pr].zone, 'graveyard');
  s = tudo(s);
  assert.equal(s.objects[pr].zone, 'battlefield'); assert.equal(s.objects[pr].controller, 0);
  assert.equal(E.hasKeyword(s, s.objects[pr], 'haste'), true, 'ganha ímpeto');
  const semMana = J(desenterrada().s); semMana.players[0].pool = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };
  assert.equal(legais(semMana, 0, a => a.t === 'unearth').length, 0, 'sem mana, não');
  const naPilha = J(desenterrada().s); naPilha.stack.push('x'); naPilha.objects.x = { oid: 'x', ability: true, name: 'X', controller: 1, zone: 'stack', effects: [] };
  assert.equal(legais(naPilha, 0, a => a.t === 'unearth').length, 0, 'só no tempo de feitiço');
});

test('M-257 · desenterrar: exilada no início do próximo passo final; se fosse sair do campo antes (morrer, voltar à mão), vai para o exílio', () => {
  let { s, pr } = desenterrada(); s = tudo(act(s, legais(s, 0, a => a.t === 'unearth')[0]));
  const fim = passaAte(s, x => x.turn.step === 'cleanup' || x.turn.active === 1);
  assert.equal(fim.objects[pr].zone, 'exile', 'exilada no passo final');
  const morre = J(s); E.moveObject(morre, pr, 'graveyard'); assert.equal(morre.objects[pr].zone, 'exile', 'morrer vira exílio');
  const mao = J(s); E.moveObject(mao, pr, 'hand'); assert.equal(mao.objects[pr].zone, 'exile', 'voltar à mão vira exílio');
  // a própria habilidade do sacerdote (sacrifique-se) também a exila
  let x = J(s); const ofs = legais(x, 0, a => a.t === 'activate' && a.oid === pr);
  assert.ok(ofs.length > 0, 'com ímpeto, pode usar {T} no mesmo turno'); x = act(x, ofs[0]); assert.equal(x.objects[pr].zone, 'exile', 'sacrificada como custo: exílio');
});

test('M-257 · desenterrar: carta que sai do cemitério antes de a habilidade resolver não volta; a que volta ao campo de outro jeito não é exilada', () => {
  let { s, pr } = desenterrada(); s = act(s, legais(s, 0, a => a.t === 'unearth')[0]);
  const x = J(s); E.moveObject(x, pr, 'exile'); const y = tudo(x);
  assert.equal(y.objects[pr].zone, 'exile', 'não estava mais no cemitério: nada acontece');
  const z = J(desenterrada().s); E.moveObject(z, pr, 'battlefield'); E.moveObject(z, pr, 'graveyard');
  assert.equal(z.objects[pr].zone, 'graveyard', 'sem desenterrar, morre normalmente');
});
