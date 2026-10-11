// CR2d.10 · efeitos contínuos sobre jogadores (613.10) e sobre as regras do jogo (613.11): não pode ganhar vida (119.7), terrenos a mais
// por turno (305.2), sem tamanho máximo de mão (402.2); de habilidade estática e de resolução, com duração. Efeitos sintéticos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, mesa, passaAte } from './cmd.mjs';
import { S, T } from './listas.mjs';

const efeitoJogador = (s, ctrl, eff) => { s = J(s); E.applyEffect(s, { oid: 'efeito', name: 'Teste', controller: ctrl }, { do: 'efeito_jogador', ...eff }, null, []); return s; };
const ganha = (s, p, n) => { s = J(s); E.applyEffect(s, { oid: 'efeito', name: 'Teste', controller: p }, { do: 'gain', amount: n, target: 'self' }, null, []); return s; };

test('CR 613.10 · "seus oponentes não podem ganhar vida" (estática de quem controla a permanente): o oponente não ganha; você ganha', () => {
  let s = mesa(['Thraben Inspector'], []), ins; [s, ins] = poe(s, 0, 'Thraben Inspector');
  s = J(s); s.facts['Thraben Inspector'].script = { ...(s.facts['Thraben Inspector'].script || {}), regraJogador: [{ quem: 'oponentes', naoGanhaVida: true }] };
  const v1 = s.players[1].life, v0 = s.players[0].life;
  assert.equal(ganha(s, 1, 3).players[1].life, v1, 'o oponente não ganha vida'); assert.equal(ganha(s, 1, 3).players[1].lifeGained || 0, 0, 'nem conta como vida ganha');
  assert.equal(ganha(s, 0, 3).players[0].life, v0 + 3, 'quem controla ganha normalmente');
  const x = J(s); E.moveObject(x, ins, 'graveyard'); assert.equal(ganha(x, 1, 3).players[1].life, v1 + 3, 'sem a permanente, volta a ganhar');
});

test('CR 613.11 · "você pode jogar um terreno a mais neste turno" e "sem tamanho máximo de mão" (de resolução, até o fim do turno)', () => {
  let s = mesa(['Thraben Inspector'], []), a, b;
  [s, a] = poe(s, 0, 'Plains', 'hand'); [s, b] = poe(s, 0, 'Swamp', 'hand');
  s = act(s, { t: 'play_land', p: 0, oid: a });
  assert.equal(legais(s, 0, x => x.t === 'play_land' && x.oid === b).length, 0, 'um por turno');
  s = efeitoJogador(s, 0, { terrenosExtras: 1 });
  assert.ok(legais(s, 0, x => x.t === 'play_land' && x.oid === b).length, 'com o efeito, um a mais');
  s = act(s, { t: 'play_land', p: 0, oid: b }); assert.equal(s.players[0].landsPlayed, 2);
  // mão grande na limpeza: sem máximo, não descarta
  let y = efeitoJogador(s, 0, { semLimiteDeMao: true }); y = J(y); for (let i = 0; i < 6; i++) { const oid = y.zones[0].library.shift(); y.zones[0].hand.push(oid); y.objects[oid].zone = 'hand'; }
  assert.ok(y.zones[0].hand.length > 7);
  const fim = passaAte(y, z => z.turn.active === 1 || (z.pending && z.pending.kind === 'discard'));
  assert.equal(fim.turn.active, 1, 'passou do turno sem pedir descarte');
  assert.equal(fim.players[0].efeitos, undefined, 'os efeitos "neste turno" acabaram na limpeza');
  assert.equal(T.descreveEfeitos([{ do: 'efeito_jogador', quem: 'oponentes', naoGanhaVida: true }]), 'cada oponente não pode ganhar vida até o fim do turno');
  assert.ok(J(S.validateScript({ name: 'T', effects: [{ do: 'efeito_jogador', quem: 'eu' }], example: { target: 'none', expect: { handDelta: 0 } } })).some(e => /quem precisa|não muda nada/.test(e)));
});
