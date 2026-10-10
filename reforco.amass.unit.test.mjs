// M-260 · reforço (702.165): Scorn-Blade Berserker; amass (701.47) e resistência a magia do jogador (702.11): Lazotep Plating
// (texto oficial em .listas/oficiais-commander.json, 05/10/2026; segunda fonte, Oracle do Forge, 10/10/2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, mesa, comMana, tudo, passaAte } from './cmd.mjs';
const ateDecisao = s => { for (let i = 0; i < 10 && !s.pending && (s.stack.length || s.queued.length); i++) s = act(s, { t: 'pass', p: s.turn.priority }); return s; };

test('M-260 · Scorn-Blade Berserker: reforço 1 — marcador na criatura alvo; se for outra, ela ganha "{1}, sacrifique esta criatura: compre uma carta" até o fim do turno', () => {
  let s = mesa(['Scorn-Blade Berserker', 'Thraben Inspector'], []), sb, ins;
  [s, sb] = poe(s, 0, 'Scorn-Blade Berserker', 'hand'); [s, ins] = poe(s, 0, 'Thraben Inspector');
  s = comMana(s, 'BC');
  s = ateDecisao(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === sb)[0]));
  if (s.pending && s.pending.kind === 'pick_target') s = act(s, { t: 'pick_target', p: 0, index: s.pending.options.findIndex(o => o.oid === ins) });
  s = tudo(s);
  assert.equal(s.objects[ins].counters.p1p1, 1, 'marcador no Inspector');
  const habs = legais(s, 0, a => a.t === 'activate' && a.oid === ins);
  assert.ok(habs.length > 0, 'o Inspector ganhou a habilidade');
  const mao = s.zones[0].hand.length; const x = tudo(act(s, habs[0]));
  assert.equal(x.objects[ins].zone, 'graveyard', 'sacrificou a si mesmo (o Inspector)'); assert.equal(x.zones[0].hand.length, mao + 1);
  const fim = passaAte(s, y => y.turn.active === 1);
  assert.equal(fim.objects[ins].tempHabilidades, undefined, 'acaba no fim do turno');
  // mirando ela mesma: só o marcador
  let t2 = mesa(['Scorn-Blade Berserker'], []), sb2; [t2, sb2] = poe(t2, 0, 'Scorn-Blade Berserker', 'hand'); t2 = comMana(t2, 'B');
  t2 = tudo(ateDecisao(act(t2, legais(t2, 0, a => a.t === 'cast' && a.oid === sb2)[0])));
  assert.equal(t2.objects[sb2].counters.p1p1, 1); assert.equal(t2.objects[sb2].tempHabilidades, undefined, 'a própria não ganha de novo');
});

test('M-260 · Lazotep Plating: "Amass Zombies 1" (sem Exército, cria um Zombie Army 0/0 preto e põe o marcador) e "You and permanents you control gain hexproof until end of turn"', () => {
  let s = mesa(['Lazotep Plating', 'Thraben Inspector'], ['Lightning Bolt']), lp, ins, bolt;
  [s, lp] = poe(s, 0, 'Lazotep Plating', 'hand'); [s, ins] = poe(s, 0, 'Thraben Inspector'); [s, bolt] = poe(s, 1, 'Lightning Bolt', 'hand');
  s = comMana(s, 'UC'); s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === lp)[0]));
  const army = Object.values(s.objects).find(o => o.token && o.name === 'Zombie Army');
  assert.ok(army, 'criou o Exército'); assert.equal(army.counters.p1p1, 1); assert.equal(E.stats(s, army).power, 1, '1/1');
  assert.ok(/Zombie/.test(s.facts['Zombie Army'].typeText) && /Army/.test(s.facts['Zombie Army'].typeText)); assert.deepEqual(J(s.facts['Zombie Army'].colors), ['B']);
  assert.equal(E.hasKeyword(s, s.objects[ins], 'hexproof'), true, 'suas permanentes');
  let x = comMana(s, 'R', 1); x = act(x, { t: 'pass', p: 0 });
  const raios = legais(x, 1, a => a.t === 'cast' && a.oid === bolt);
  assert.ok(!raios.some(a => a.targets[0].player === 0), 'você não é alvo do oponente');
  assert.ok(!raios.some(a => a.targets[0].oid === ins), 'nem suas permanentes');
  // um segundo amass usa o Exército que já existe
  const y = J(s); E.applyEffect(y, { oid: 'h', name: 'Teste', controller: 0, ability: true, source: null }, { do: 'amass', amount: 2, subtipo: 'Zombie' }, null, []);
  assert.equal(Object.values(y.objects).filter(o => o.token && o.name === 'Zombie Army').length, 1); assert.equal(y.objects[army.oid].counters.p1p1, 3);
  const fim = passaAte(s, z => z.turn.active === 1); assert.equal(fim.players[0].tempHexproof, undefined, 'acaba na limpeza');
});
