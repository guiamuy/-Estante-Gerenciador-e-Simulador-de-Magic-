// M-253 · veneno (122.1f; 704.5c: dez marcadores, perde), tóxico (702.164: dano de combate a jogador também dá N marcadores),
// "não pode bloquear" (509.1a) e Corrompido (efeito contínuo enquanto um oponente tem 3+ venenos). Carta: Skrelv's Hive (texto
// oficial em .listas/oficiais-commander.json, 05/10/2026; segunda fonte, Oracle do Forge, 10/10/2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, mesa, tudo, passaAte } from './cmd.mjs';
import { S, T } from './listas.mjs';
const ateDecisao = s => { for (let i = 0; i < 10 && !s.pending && (s.stack.length || s.queued.length); i++) s = act(s, { t: 'pass', p: s.turn.priority }); return s; };

/** Põe o Skrelv's Hive do jogador 0 e passa até a manutenção dele resolver: uma Mite nova. */
function comMite() {
  let s = mesa(["Skrelv's Hive"], ['Faerie Seer']), h, seer; [s, h] = poe(s, 0, "Skrelv's Hive"); [s, seer] = poe(s, 1, 'Faerie Seer');
  s = passaAte(s, x => x.turn.active === 1); s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'upkeep');
  s = tudo(ateDecisao(s));
  return { s, h, seer };
}

test('M-253 · Skrelv\'s Hive: "At the beginning of your upkeep, you lose 1 life and create a 1/1 colorless Phyrexian Mite artifact creature token with toxic 1 and \'This token can\'t block.\'"', () => {
  const { s } = comMite();
  const mite = Object.values(s.objects).find(o => o.token && o.name === 'Phyrexian Mite');
  assert.ok(mite && mite.controller === 0, 'a ficha nasceu');
  assert.equal(s.players[0].life, 19, 'perdeu 1');
  assert.deepEqual(J(s.facts['Phyrexian Mite'].types).sort(), ['artifact', 'creature']); assert.deepEqual(J(s.facts['Phyrexian Mite'].colors), []);
  assert.equal(E.stats(s, mite).power, 1);
  // não pode bloquear
  const x = J(s); x.objects[mite.oid].controller = 1; x.zones[0].battlefield.splice(x.zones[0].battlefield.indexOf(mite.oid), 1); x.zones[1].battlefield.push(mite.oid);
  assert.equal(J(E.eligibleBlockers ? E.eligibleBlockers(x, 1) : []).includes(mite.oid), false, '"This token can\'t block"');
});

test('M-253 · tóxico: dano de combate a um jogador também dá N marcadores de veneno; dano que não é de combate não; com dez, o jogador perde', () => {
  let { s } = comMite(); const mite = Object.values(s.objects).find(o => o.token && o.name === 'Phyrexian Mite').oid;
  s = J(s); s.objects[mite].sick = false;
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers'); s = act(s, { t: 'attack', p: 0, attackers: [mite] });
  for (let i = 0; i < 40 && s.turn.step !== 'main2'; i++) s = s.pending ? act(s, s.pending.kind === 'blockers' ? { t: 'block', p: s.pending.p, blocks: [] } : legais(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority });
  assert.equal(s.players[1].life, 19, 'o dano tira vida normalmente'); assert.equal(s.players[1].poison, 1, 'e dá 1 de veneno');
  const x = J(s); E.applyEffect(x, x.objects[mite], { do: 'damage', amount: 1, target: 'player' }, { player: 1 }, []);
  assert.equal(x.players[1].poison, 1, 'dano de efeito não dá veneno');
  const y = J(s); y.players[1].poison = 10; const r = E.apply(y, { t: 'pass', p: y.turn.priority });
  assert.equal(r.state.players[1].lost, true); assert.equal(r.state.players[1].lossReason, 'veneno');
  assert.equal(s.players[0].poison, undefined, 'quem não recebeu veneno não tem o campo (estado igual ao de antes)');
});

test('M-253 · Corrompido: "As long as an opponent has three or more poison counters, creatures you control with toxic have lifelink."', () => {
  const { s } = comMite(); const mite = Object.values(s.objects).find(o => o.token && o.name === 'Phyrexian Mite');
  let ins; let x = J(s);
  assert.equal(E.hasKeyword(x, x.objects[mite.oid], 'lifelink'), false, 'oponente sem veneno');
  x.players[1].poison = 2; assert.equal(E.hasKeyword(x, x.objects[mite.oid], 'lifelink'), false, 'dois');
  x.players[1].poison = 3; assert.equal(E.hasKeyword(x, x.objects[mite.oid], 'lifelink'), true, 'três: tem vínculo com a vida');
  const seer = x.zones[1].battlefield.map(o => x.objects[o]).find(o => o.name === 'Faerie Seer');
  assert.equal(E.hasKeyword(x, seer, 'lifelink'), false, 'só as suas, e só as com tóxico');
  x.players[0].poison = 5; x.players[1].poison = 0; assert.equal(E.hasKeyword(x, x.objects[mite.oid], 'lifelink'), false, 'veneno seu não conta');
  assert.equal(T.descreveContinuo(S.SCRIPTS["Skrelv's Hive"].continuo[0]), 'enquanto um oponente tiver 3 ou mais marcadores de veneno, cada criatura que você controla com tóxico tem vínculo com a vida');
  assert.ok(J(S.validateScript({ name: 'T', abilities: [{ kind: 'triggered', when: 'etb', effects: [{ do: 'token', amount: 1, token: { name: 'X', types: ['creature'], power: 1, toughness: 1, self: { toxic: 0 } } }] }], example: { action: 'etb', target: 'none', expect: { attached: false } } })).some(e => /tóxico precisa/.test(e)));
});
