// V-24 · auditoria independente do lote 5 (exaurir 701.43, deter 701.35, afligir 701.68, recrutar 701.70, converter 701.28): revisor sem
// acesso à implementação, 11 sondas, 3 divergências reproduzidas, todas no código da trilha. Cada uma virou um teste aqui antes da correção.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, mesa, criatura } from './verbos.mjs';
const URSO = criatura('Urso de Teste 3/3', 3, 3), LOBO = criatura('Lobo de Teste 2/2', 2, 2);
const BRAWLER = { name: 'Hooded Brawler', effects: [], self: { exaurirAoAtacar: true }, abilities: [{ kind: 'triggered', when: 'exerted', effects: [{ do: 'continuo', target: 'self-source', poder: 2, resistencia: 2, ate: 'fim-do-turno' }] }] };
const fonte = (p = 0) => ({ oid: 'h', name: URSO, controller: p, ability: true, source: null });
const faz = (s, eff, oid, p = 0) => { s = J(s); const ev = []; E.applyEffect(s, fonte(p), eff, oid == null ? null : { oid }, ev); return [s, ev]; };
const ateOTurnoDe = (s, p) => { const n0 = s.turn.number; for (let i = 0; i < 400 && !(s.turn.active === p && s.turn.number > n0); i++) s = s.pending ? act(s, legais(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority }); assert.ok(s.turn.active === p && s.turn.number > n0); return s; };

test('V-24 · auditoria D1 (701.43d, 508.1g): a pergunta de exaurir ao atacar vale para os dois jogadores — também quando quem defende é o primeiro jogador', () => {
  for (const atacante of [0, 1]) {
    let s = mesa(['Hooded Brawler', URSO], ['Hooded Brawler', URSO]), b; [s, b] = poe(s, atacante, 'Hooded Brawler'); s = J(s);
    s.facts['Hooded Brawler'] = { ...s.facts['Hooded Brawler'], script: BRAWLER }; s.objects[b].sick = false;
    if (s.turn.active !== atacante) s = ateOTurnoDe(s, atacante);
    for (let i = 0; i < 30 && !(s.pending && s.pending.kind === 'attackers'); i++) s = s.pending ? act(s, legais(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority });
    assert.equal(s.pending && s.pending.kind, 'attackers', 'jogador ' + atacante + ' chega à declaração');
    s = act(s, legais(s, atacante, a => a.t === 'attack' && JSON.stringify(a).includes(b))[0]);
    assert.equal(s.pending && s.pending.kind, 'may_pay', 'jogador ' + atacante + ' é perguntado'); assert.equal(s.pending.p, atacante);
    s = act(s, legais(s, atacante, a => a.t === 'pay')[0]); assert.equal(E.estaExaurida(s, s.objects[b]), true);
  }
});

test('V-24 · auditoria D2 (701.35a): duas detenções na mesma permanente são independentes — a de um jogador acabar não solta a do outro', () => {
  let s = mesa([URSO], [LOBO]), lobo; [s, lobo] = poe(s, 1, LOBO); s = J(s); s.objects[lobo].sick = false; if (s.turn.active !== 0) s = ateOTurnoDe(s, 0);
  [s] = faz(s, { do: 'detain', target: 'creature' }, lobo, 0); // o jogador 0 detém no turno dele: vale até o próximo turno do jogador 0
  [s] = faz(s, { do: 'detain', target: 'creature' }, lobo, 1); // depois o jogador 1 detém a mesma: vale até o próximo turno do jogador 1
  s = ateOTurnoDe(s, 1); // começa o turno do jogador 1: a detenção dele acabou, a do jogador 0 não
  assert.equal(E.ehDetida(s, s.objects[lobo]), true, 'ainda detida pelo jogador 0'); assert.equal(E.eligibleAttackers(s, 1).includes(lobo), false, 'não ataca');
  s = ateOTurnoDe(s, 0); assert.equal(E.ehDetida(s, s.objects[lobo]), false); assert.equal(s.objects[lobo].detidaV, undefined);
  s = ateOTurnoDe(s, 1); assert.ok(E.eligibleAttackers(s, 1).includes(lobo), 'solta de vez');
});

test('V-24 · auditoria D3 (701.35a): tripular é habilidade ativada do Veículo — forçada num Veículo detido, é recusada', () => {
  assert.equal(E.acaoDeDetidaV({ objects: { v: { zone: 'battlefield', zc: 2, detidaV: [{ by: 0, z: 2 }] } } }, { t: 'tripular', p: 1, oid: 'v' }), true);
  assert.equal(E.acaoDeDetidaV({ objects: { v: { zone: 'battlefield', zc: 2 } } }, { t: 'tripular', p: 1, oid: 'v' }), false);
});
