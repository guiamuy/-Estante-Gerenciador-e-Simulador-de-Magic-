// M-251 · habilidade disparada concedida pela Aura (613.1f: a criatura "tem" a habilidade; quem a controla controla o gatilho),
// efeito contínuo condicionado à encantada ("enquanto for criatura / lendária") com proteção (ward) concedida, e a criatura equipada
// pelo Equipamento encantado. Cartas: Combat Research, Rune of Mortality, Rune of Sustenance (texto oficial em
// .listas/oficiais-commander.json, 05/10/2026; segunda fonte, Oracle do Forge, 10/10/2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, mesa, comMana, tudo, passaAte } from './cmd.mjs';
import { S, T } from './listas.mjs';
const anexa = (s, aura, host) => { s = J(s); s.objects[aura].attachedTo = host; s.objects[aura].anexadaEm = 900; return s; };

test('M-251 · Combat Research: "Enchanted creature has \'Whenever this creature deals combat damage to a player, draw a card.\'" — é da criatura: quem a controla compra', () => {
  let s = mesa(['Combat Research', 'Thraben Inspector'], ['Faerie Seer']), cr, ins;
  [s, cr] = poe(s, 0, 'Combat Research'); [s, ins] = poe(s, 0, 'Thraben Inspector');
  s = anexa(s, cr, ins);
  assert.ok(J(E.abilitiesOf(s, s.objects[ins])).some(a => a.kind === 'triggered' && a.grantedBy === 'Combat Research'), 'a criatura encantada tem a habilidade');
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers');
  s = act(s, { t: 'attack', p: 0, attackers: [ins] });
  const mao = s.zones[0].hand.length, maoOp = s.zones[1].hand.length;
  for (let i = 0; i < 60 && s.turn.step !== 'main2'; i++) s = s.pending ? act(s, s.pending.kind === 'blockers' ? { t: 'block', p: s.pending.p, blocks: [] } : legais(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority });
  assert.equal(s.players[1].life, 19, 'causou 1 de dano de combate');
  assert.equal(s.zones[0].hand.length, mao + 1, 'quem controla a criatura comprou'); assert.equal(s.zones[1].hand.length, maoOp, 'o oponente não comprou');
  // dano que não é de combate não dispara
  const x = J(s), ev = []; E.applyEffect(x, x.objects[ins], { do: 'damage', amount: 1, target: 'player' }, { player: 1 }, ev);
  assert.equal(x.queued.length, 0, '"combat damage": dano de efeito não dispara');
  // sem a Aura, a criatura não tem a habilidade
  const y = J(s); y.objects[cr].attachedTo = null;
  assert.equal(J(E.abilitiesOf(y, y.objects[ins])).some(a => a.grantedBy === 'Combat Research'), false);
});

test('M-251 · Combat Research: "As long as enchanted creature is legendary, it gets +1/+1 and has ward {1}."', () => {
  let s = mesa(['Combat Research', 'Elas il-Kor, Sadistic Pilgrim', 'Thraben Inspector'], ['Lightning Bolt']), cr, elas, ins, bolt;
  [s, cr] = poe(s, 0, 'Combat Research'); [s, elas] = poe(s, 0, 'Elas il-Kor, Sadistic Pilgrim'); [s, ins] = poe(s, 0, 'Thraben Inspector'); [s, bolt] = poe(s, 1, 'Lightning Bolt', 'hand');
  const comum = anexa(s, cr, ins), lendaria = anexa(s, cr, elas);
  assert.deepEqual(J(E.stats(comum, comum.objects[ins])), J(E.stats(s, s.objects[ins])), 'criatura comum: sem bônus');
  const st = E.stats(lendaria, lendaria.objects[elas]); assert.equal(st.power, 3); assert.equal(st.toughness, 3, 'lendária: +1/+1');
  // ward {1}: o Lightning Bolt do oponente na Elas cobra {1}
  let x = comMana(lendaria, 'R', 1); x = act(x, { t: 'pass', p: 0 });
  x = act(x, legais(x, 1, a => a.t === 'cast' && a.oid === bolt && a.targets[0].oid === elas)[0]);
  for (let i = 0; i < 6 && !(x.pending && x.pending.kind === 'may_pay'); i++) x = act(x, { t: 'pass', p: x.turn.priority });
  assert.equal(x.pending && x.pending.kind, 'may_pay', 'ward pede o pagamento ao oponente'); assert.equal(x.pending.p, 1);
  x = tudo(act(x, { t: 'decline', p: 1 }));
  assert.equal(x.objects[elas].zone, 'battlefield', 'sem pagar, o raio é anulado');
  let y = comMana(comum, 'R', 1); y = act(y, { t: 'pass', p: 0 }); y = tudo(act(y, legais(y, 1, a => a.t === 'cast' && a.oid === bolt && a.targets[0].oid === ins)[0]));
  assert.equal(y.objects[ins].zone, 'graveyard', 'criatura comum não tem ward');
  assert.equal(T.descreveContinuo(S.SCRIPTS['Combat Research'].continuo[0]), 'enquanto for lendária, a permanente anexada recebe +1/+1 e tem proteção (ward) {1}');
});

test('M-251 · Rune of Mortality e Rune of Sustenance: "When this Aura enters, draw a card." · criatura encantada tem a palavra · Equipamento encantado dá a palavra à criatura equipada', () => {
  for (const [rune, kw] of [['Rune of Mortality', 'deathtouch'], ['Rune of Sustenance', 'lifelink']]) {
    let s = mesa([rune, 'Thraben Inspector', 'Faerie Seer'], []), r, ins, seer;
    [s, r] = poe(s, 0, rune, 'hand'); [s, ins] = poe(s, 0, 'Thraben Inspector'); [s, seer] = poe(s, 0, 'Faerie Seer');
    s = comMana(s, 'WBCC'); const mao = s.zones[0].hand.length;
    const cast = legais(s, 0, a => a.t === 'cast' && a.oid === r && (a.targets || []).some(t => t.oid === ins))[0];
    s = tudo(act(s, cast)); for (let i = 0; i < 6 && (s.stack.length || s.queued.length); i++) s = tudo(act(s, { t: 'pass', p: s.turn.priority }));
    assert.equal(s.objects[r].attachedTo, ins); assert.equal(s.zones[0].hand.length, mao - 1 + 1, `${rune}: entrou e comprou uma`);
    assert.equal(E.hasKeyword(s, s.objects[ins], kw), true, `${rune}: a criatura encantada tem ${kw}`);
    assert.equal(E.hasKeyword(s, s.objects[seer], kw), false);
    // encantando um Equipamento (simulado: Signet com subtipo Equipment), a criatura equipada ganha a palavra
    const x = J(s); x.objects[r].attachedTo = 'eq'; x.objects.eq = { oid: 'eq', name: 'Teste Equipamento', owner: 0, controller: 0, zone: 'battlefield', tapped: false, sick: false, damage: 0, counters: {}, attachedTo: seer };
    x.facts['Teste Equipamento'] = E.cardFacts({ name: 'Teste Equipamento', type_line: 'Artifact — Equipment', oracle_text: '', keywords: [] }); x.zones[0].battlefield.push('eq');
    assert.equal(E.hasKeyword(x, x.objects[seer], kw), true, `${rune}: a criatura equipada pelo Equipamento encantado tem ${kw}`);
    assert.equal(E.hasKeyword(x, x.objects[ins], kw), false, 'a que não está equipada não tem');
    x.facts['Teste Equipamento'] = E.cardFacts({ name: 'Teste Equipamento', type_line: 'Artifact', oracle_text: '', keywords: [] });
    assert.equal(E.hasKeyword(x, x.objects[seer], kw), false, 'artefato que não é Equipamento: nada');
  }
  assert.ok(J(S.validateScript({ name: 'T', aura: { enchant: 'creature' }, continuo: [{ afetados: 'anexada', seAfetado: { zona: 'stack' }, poder: 1 }], effects: [], example: { action: 'aura', target: 'own-creature', expect: { attached: true } } })).some(e => /seAfetado não aceita/.test(e)));
});
