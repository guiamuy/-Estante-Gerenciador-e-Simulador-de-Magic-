// V-30 · CR 701.65 · aerobender (airbend). Texto oficial em .listas/oficiais-verbos.json (Oracle do Forge, clone de 12/10/2026):
// Airbending Lesson — "Airbend target nonland permanent. Draw a card." · Aang, Airbending Master — "When Aang enters, airbend another
// target creature." (só essa frase provada aqui)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
import { E, J, act, poe, legais, mesa, comMana, tudo, criatura, conjura } from './verbos.mjs';
const { scripts: S, table: T } = loadModules();
const URSO = criatura('Urso de Teste 3/3', 3, 3, { mana_cost: '{2}{G}{G}' });
const fonte = (p = 0) => ({ oid: 'h', name: 'Ar de Teste', controller: p, ability: true, source: null });
const aero = (s, oid, p = 0) => { s = J(s); const ev = []; E.applyEffect(s, fonte(p), { do: 'airbend', target: 'creature' }, { oid }, ev); return [s, ev]; };
const resolveTudo = s => tudo(s, x => legais(x, x.pending.p)[0]);
const ateTurno = (s, p) => { const n0 = s.turn.number; for (let i = 0; i < 300 && !(s.turn.active === p && s.turn.number > n0 && s.turn.step === 'main1' && !s.stack.length && !s.pending); i++) s = s.pending ? act(s, legais(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority }); return s; };
const AANG = { name: 'Aang, Airbending Master', abilities: [{ kind: 'triggered', when: 'etb', effects: [{ do: 'airbend', target: { tipos: ['creature'], outra: true } }] }], example: { action: 'etb', target: 'enemy-creature', expect: { gone: true } } };

test('CR 701.65a · aerobender exila a permanente; enquanto exilada, o DONO pode conjurá-la por {2} em vez do custo de mana — o outro jogador não', () => {
  let s = mesa([URSO], [URSO]), dele; [s, dele] = poe(s, 1, URSO);
  let [x, ev] = aero(s, dele); assert.equal(x.objects[dele].zone, 'exile'); assert.equal(ev.find(e => e.do === 'airbend').target, URSO);
  assert.equal(E.aerobendidaV(x, 1, x.objects[dele]), true); assert.equal(E.aerobendidaV(x, 0, x.objects[dele]), false);
  assert.equal(legais(comMana(x, 'GG'), 0, a => a.t === 'cast' && a.oid === dele).length, 0, 'quem aerobendeu não conjura a carta do oponente');
  x = ateTurno(x, 1);
  const oferta = legais(comMana(x, 'GG', 1), 1, a => a.t === 'cast' && a.oid === dele);
  assert.equal(oferta.length, 1); assert.equal(oferta[0].aerobend, true);
  assert.equal(legais(comMana(x, 'G', 1), 1, a => a.t === 'cast' && a.oid === dele).length, 0, 'com uma mana só não dá');
  let y = resolveTudo(act(comMana(x, 'GG', 1), oferta[0]));
  assert.equal(y.objects[dele].zone, 'battlefield'); assert.equal(y.objects[dele].controller, 1);
  assert.deepEqual({ ...y.players[1].pool }, { ...x.players[1].pool }, 'pagou exatamente {2} (o custo normal é {2}{G}{G})');
  assert.equal(E.invariants(y).length, 0);
});

test('CR 701.65a · o {2} é custo alternativo: o tempo de conjuração continua o da carta (criatura só no seu principal), X e outros custos não entram; a permissão acaba se a carta sair do exílio', () => {
  let s = mesa([URSO], [URSO]), u; [s, u] = poe(s, 0, URSO); [s] = aero(s, u);
  s = J(s); s.turn.priority = 0;
  assert.ok(legais(comMana(s, 'GG'), 0, a => a.t === 'cast' && a.oid === u && a.aerobend).length > 0, 'no seu principal');
  const acao = legais(comMana(s, 'GG'), 0, a => a.t === 'cast' && a.oid === u && a.aerobend)[0];
  assert.throws(() => E.apply(comMana(s, 'GG'), { ...acao, kick: 1 }), /aerobender/); assert.throws(() => E.apply(comMana(s, 'GG'), { ...acao, x: 2 }), /aerobender/);
  assert.throws(() => E.apply(comMana(s, 'GG'), { t: 'cast', p: 0, oid: u }), /conjura/, 'sem a marca de aerobender não conjura do exílio pelo custo normal');
  let fora = J(s); E.moveObject(fora, u, 'graveyard'); E.moveObject(fora, u, 'exile');
  assert.equal(E.aerobendidaV(fora, 0, fora.objects[u]), false, '400.7: saiu e voltou ao exílio, a permissão acabou');
  // no turno do oponente, criatura sem lampejo não é oferecida
  let t = ateTurno(s, 1); t = J(t); t.turn.priority = 0;
  assert.equal(legais(comMana(t, 'GG'), 0, a => a.t === 'cast' && a.oid === u).length, 0);
});

test('CR 701.65a · terreno aerobendido fica no exílio (não se conjura terreno); ficha aerobendida deixa de existir', () => {
  let s = mesa([URSO], []), pl; [s, pl] = poe(s, 0, 'Plains');
  let x = J(s); E.applyEffect(x, fonte(0), { do: 'airbend', target: 'permanent' }, { oid: pl }, []);
  assert.equal(x.objects[pl].zone, 'exile'); assert.equal(legais(comMana(x, 'WW'), 0, a => a.oid === pl).length, 0);
  let y = J(s); E.applyEffect(y, fonte(0), { do: 'token', amount: 1, token: { name: 'Soldier', types: ['creature'], subtypes: ['Soldier'], colors: ['W'], power: 1, toughness: 1 } }, null, []);
  const tk = y.zones[0].battlefield.find(o => y.objects[o].token); E.applyEffect(y, fonte(0), { do: 'airbend', target: 'creature' }, { oid: tk }, []);
  assert.equal(y.zones[0].battlefield.includes(tk), false); assert.equal(legais(comMana(y, 'WW'), 0, a => a.oid === tk).length, 0);
});

test('Airbending Lesson e Aang, Airbending Master: os scripts, o alvo (permanente que não é terreno; outra criatura) e a frase em português', () => {
  assert.equal(S.validateScript(AANG).join(), '');
  let s = mesa([URSO, 'Airbending Lesson'], [URSO]), dele, pl, al; [s, dele] = poe(s, 1, URSO); [s, pl] = poe(s, 1, 'Island'); [s, al] = poe(s, 0, 'Airbending Lesson', 'hand');
  const alvos = [...new Set(legais(comMana(s, 'WWW'), 0, a => a.t === 'cast' && a.oid === al).flatMap(a => (a.targets || []).map(t => t.oid)))];
  assert.ok(alvos.includes(dele)); assert.equal(alvos.includes(pl), false, 'terreno não é alvo');
  const mao = s.zones[0].hand.length;
  let x = resolveTudo(conjura(comMana(s, 'WWW'), 0, al, [dele])); assert.equal(x.objects[dele].zone, 'exile'); assert.equal(x.zones[0].hand.length, mao, 'gastou a mágica e comprou uma');
  assert.equal(E.aerobendidaV(x, 1, x.objects[dele]), true);
  assert.match(T.descreveEfeitos([{ do: 'airbend', target: { semTipos: ['land'] } }]), /^aerobende .* \(exila; enquanto estiver exilada, o dono pode conjurá-la pagando \{2\}/);
});
