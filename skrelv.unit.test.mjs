// M-255 · Skrelv, Defector Mite (texto oficial em .listas/oficiais-commander.json, 05/10/2026; custo {W} conferido em segunda fonte
// em 10/10/2026): tóxico 1, não bloqueia, e "{W/P}, {T}: Choose a color. Another target creature you control gains toxic 1 and hexproof
// from that color until end of turn. It can't be blocked by creatures of that color this turn." — com o phyrexiano escolhido na ativação.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, mesa, comMana, tudo, passaAte } from './cmd.mjs';
import { S, T } from './listas.mjs';

test('M-255 · Skrelv: tóxico 1 e "Skrelv can\'t block"; custo de conjurar {W}', () => {
  let s = mesa(['Skrelv, Defector Mite'], []), sk; [s, sk] = poe(s, 0, 'Skrelv, Defector Mite');
  assert.equal(s.facts['Skrelv, Defector Mite'].cmc, 1);
  assert.equal(J(E.eligibleBlockers(s, 0)).includes(sk), false, 'não bloqueia');
});

test('M-255 · Skrelv: a habilidade dá tóxico 1, resistência a magia da cor e "não bloqueada por criaturas da cor" a outra criatura sua; o phyrexiano se paga com {W} ou 2 de vida, à escolha', () => {
  let s = mesa(['Skrelv, Defector Mite', 'Thraben Inspector'], ['Lightning Bolt', 'Faerie Seer']), sk, ins, bolt, seer;
  [s, sk] = poe(s, 0, 'Skrelv, Defector Mite'); [s, ins] = poe(s, 0, 'Thraben Inspector'); [s, bolt] = poe(s, 1, 'Lightning Bolt', 'hand'); [s, seer] = poe(s, 1, 'Faerie Seer');
  s = comMana(s, 'W');
  const ofertas = J(legais(s, 0, a => a.t === 'activate' && a.oid === sk));
  assert.ok(ofertas.every(a => a.targets[0].oid === ins), 'outra criatura sua (não ela mesma)');
  assert.deepEqual([...new Set(ofertas.map(a => a.vida))].sort(), [0, 1], 'pagar com {W} ou com 2 de vida');
  assert.deepEqual([...new Set(ofertas.map(a => a.color))].sort(), ['B', 'G', 'R', 'U', 'W']);
  // com vida: a mana fica na reserva
  let x = tudo(act(s, ofertas.find(a => a.vida === 1 && a.color === 'R')));
  assert.equal(x.players[0].life, 18, '2 de vida'); assert.equal(x.players[0].pool.W, 1, 'o {W} ficou');
  // com mana
  let y = tudo(act(s, ofertas.find(a => a.vida === 0 && a.color === 'R')));
  assert.equal(y.players[0].life, 20); assert.equal(y.players[0].pool.W, 0);
  // resistência a magia contra vermelho: o Lightning Bolt do oponente não mira o Inspector
  y = comMana(y, 'R', 1); y = act(y, { t: 'pass', p: 0 });
  assert.equal(legais(y, 1, a => a.t === 'cast' && a.oid === bolt && (a.targets || []).some(t => t.oid === ins)).length, 0, 'hexproof from red');
  // a resistência é só contra a cor escolhida e contra oponentes; o próprio controlador mira
  const azul = tudo(act(s, ofertas.find(a => a.vida === 0 && a.color === 'U'))); const az = comMana(azul, 'R', 1);
  assert.ok(legais(act(az, { t: 'pass', p: 0 }), 1, a => a.t === 'cast' && a.oid === bolt && (a.targets || []).some(t => t.oid === ins)).length > 0, 'contra vermelho não protege');
  // tóxico 1 até o fim do turno e "não bloqueada por criaturas azuis"
  let z = J(azul); z.objects[ins].sick = false; z.objects[sk].tapped = true;
  z = passaAte(z, w => w.pending && w.pending.kind === 'attackers'); z = act(z, { t: 'attack', p: 0, attackers: [ins] });
  for (let i = 0; i < 10 && !(z.pending && z.pending.kind === 'blockers'); i++) z = act(z, { t: 'pass', p: z.turn.priority });
  assert.throws(() => act(z, { t: 'block', p: 1, blocks: [[seer, ins]] }), /cor/, 'a Faerie Seer é azul: não bloqueia');
  z = act(z, { t: 'block', p: 1, blocks: [] }); for (let i = 0; i < 20 && z.turn.step !== 'main2'; i++) z = z.pending ? act(z, legais(z, z.pending.p)[0]) : act(z, { t: 'pass', p: z.turn.priority });
  assert.equal(z.players[1].poison, 1, 'o dano de combate com tóxico 1 deu veneno');
  const fim = passaAte(z, w => w.turn.active === 1);
  assert.equal(fim.objects[ins].tempToxico, undefined, 'acaba no fim do turno'); assert.equal(fim.objects[ins].tempResguardoCor, undefined);
  assert.equal(T.descreveEfeitos(S.SCRIPTS['Skrelv, Defector Mite'].abilities[0].effects), 'outra criatura sua ganha tóxico 1 até o fim do turno; o mesmo alvo ganha resistência a magia da cor escolhida até o fim do turno; o mesmo alvo não pode ser bloqueado por criaturas da cor escolhida neste turno');
});
