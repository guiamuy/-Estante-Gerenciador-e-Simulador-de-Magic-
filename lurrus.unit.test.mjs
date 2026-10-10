// M-256 · permissão de conjurar do cemitério: Lurrus of the Dream-Den ("During each of your turns, you may cast one permanent spell
// with mana value 2 or less from your graveyard.", texto oficial em .listas/oficiais-commander.json, 05/10/2026; segunda fonte 10/10/2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, mesa, comMana, tudo, passaAte } from './cmd.mjs';

const doCemiterio = (s, oid, p = 0) => legais(s, p, a => a.t === 'cast' && a.oid === oid && a.permissao != null);

test('M-256 · Lurrus: no seu turno, uma mágica de permanente de valor 2 ou menos do cemitério; mágica que não é de permanente, valor 3 e terreno, não', () => {
  let s = mesa(['Lurrus of the Dream-Den', 'Thraben Inspector', 'Kor Skyfisher', 'Lightning Bolt', 'Axebane Guardian'], []), lu, ins, kor, bolt, axe, pl;
  [s, lu] = poe(s, 0, 'Lurrus of the Dream-Den'); [s, ins] = poe(s, 0, 'Thraben Inspector', 'graveyard'); [s, kor] = poe(s, 0, 'Kor Skyfisher', 'graveyard');
  [s, bolt] = poe(s, 0, 'Lightning Bolt', 'graveyard'); [s, axe] = poe(s, 0, 'Axebane Guardian', 'graveyard'); [s, pl] = poe(s, 0, 'Plains', 'graveyard');
  s = comMana(s, 'WWWGG');
  assert.ok(doCemiterio(s, ins).length > 0, 'Thraben Inspector (valor 1)');
  assert.ok(doCemiterio(s, kor).length > 0, 'Kor Skyfisher (valor 2)');
  assert.equal(doCemiterio(s, axe).length, 0, 'valor 3: não');
  assert.equal(doCemiterio(s, bolt).length, 0, 'mágica que não é de permanente: não');
  assert.equal(legais(s, 0, a => a.oid === pl).length, 0, 'terreno: não (é jogado, não conjurado)');
  // conjura: vai para a pilha e depois para o campo, pagando o custo
  s = tudo(act(s, doCemiterio(s, ins)[0]));
  assert.equal(s.objects[ins].zone, 'battlefield'); assert.equal(s.players[0].pool.W, 2, 'pagou {W}');
  assert.equal(doCemiterio(s, kor).length, 0, 'uma por turno');
  assert.throws(() => act(s, { t: 'cast', p: 0, oid: kor, permissao: lu }), /permissão|nenhuma permanente/);
  // no turno do oponente, não; no seu próximo turno, de novo
  let x = passaAte(s, y => y.turn.active === 1);
  assert.equal(doCemiterio(x, kor, 1).length, 0, 'no turno do oponente, não');
  x = passaAte(x, y => y.turn.active === 0 && y.turn.step === 'main1' && !y.stack.length && !y.pending); x = comMana(x, 'WW');
  assert.ok(doCemiterio(x, kor).length > 0, 'no seu próximo turno, de novo');
});

test('M-256 · Lurrus: sem a permanente no campo, ou virada para baixo, não há permissão; a Lurrus que sai e volta é outra (pode usar de novo)', () => {
  let s = mesa(['Lurrus of the Dream-Den', 'Thraben Inspector', 'Faerie Seer'], []), lu, ins, seer;
  [s, lu] = poe(s, 0, 'Lurrus of the Dream-Den'); [s, ins] = poe(s, 0, 'Thraben Inspector', 'graveyard'); [s, seer] = poe(s, 0, 'Faerie Seer', 'graveyard');
  s = comMana(s, 'WU');
  const fora = J(s); E.moveObject(fora, lu, 'graveyard'); assert.equal(doCemiterio(fora, ins).length, 0, 'Lurrus fora do campo');
  const virada = J(s); virada.objects[lu].faceDown = true; assert.equal(doCemiterio(virada, ins).length, 0, 'virada para baixo não tem habilidade');
  let x = tudo(act(s, doCemiterio(s, ins)[0])); assert.equal(doCemiterio(x, seer).length, 0);
  x = J(x); E.moveObject(x, lu, 'hand'); E.moveObject(x, lu, 'battlefield');
  assert.ok(doCemiterio(x, seer).length > 0, 'objeto novo (400.7): a permissão volta');
});
