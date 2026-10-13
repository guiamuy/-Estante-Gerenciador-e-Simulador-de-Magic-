// L-3 · trilha listas · Pauper de M a Z, lote 3: teste de regra de cada mecânica tocada pelos scripts do lote, numa partida em modo
// único (mana cobrada), com o texto oficial de .listas/oficiais-listas.json (Oracle do Forge, consulta de 12/10/2026). Cada teste cita a frase.
// As palavras-chave que a Scryfall manda no campo `keywords` e que a leitura de linha não pega (Split second, Prowess) vão na carta, como no app.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, passaAte, mesa, comMana, tudo, fichas, criatura, CARTAS } from './trilha-listas.mjs';

CARTAS['Siege Smash'].keywords = ['Split second']; CARTAS['Seeker of the Way'].keywords = ['Prowess'];
CARTAS['Artefato de Teste'] = { name: 'Artefato de Teste', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] };
criatura('Urso de Teste', 2, 2);
const conjura = (s, oid, mana, f = () => true) => { const a = legais(comMana(s, mana), 0, x => x.t === 'cast' && x.oid === oid && f(x)); if (!a.length) throw new Error('não ofereceu'); return tudo(act(comMana(s, mana), a[0])); };
const pt = (s, oid) => [E.stats(s, s.objects[oid]).power, E.stats(s, s.objects[oid]).toughness];
const atacaSemBloqueio = (s, atacantes) => {
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers'); s = act(s, { t: 'attack', p: 0, attackers: atacantes });
  s = passaAte(s, x => x.turn.step === 'combat_blockers' || (x.pending && x.pending.kind === 'blockers'));
  if (s.pending && s.pending.kind === 'blockers') s = act(s, { t: 'block', p: 1, blocks: [] });
  return passaAte(s, x => x.turn.step === 'combat_blockers' && !x.pending && x.turn.priority === 0, 20);
};
const ateODano = s => passaAte(s, x => x.turn.step === 'combat_end' || x.turn.step === 'main2' || !!x.pending, 40);

test('L-3 · Raven\'s Crime: "Target player discards a card." — quem descarta escolhe; "Retrace": do cemitério, descartando um terreno além do custo', () => {
  let s = mesa(["Raven's Crime"]), rc; [s, rc] = poe(s, 0, "Raven's Crime", 'hand');
  let r = act(comMana(s, 'B'), legais(comMana(s, 'B'), 0, a => a.t === 'cast' && a.oid === rc && a.targets[0].player === 1)[0]);
  r = passaAte(r, x => !!x.pending); assert.equal(r.pending.kind, 'discard'); assert.equal(r.pending.p, 1, 'o jogador alvo escolhe o que descarta');
  let g = J(s); g.zones[0].hand.splice(g.zones[0].hand.indexOf(rc), 1); g.zones[0].graveyard.push(rc); g.objects[rc].zone = 'graveyard';
  const semTerra = J(g); for (const o of semTerra.zones[0].hand.slice()) if (/Land/.test(semTerra.facts[semTerra.objects[o].name].typeText || '')) { semTerra.zones[0].hand.splice(semTerra.zones[0].hand.indexOf(o), 1); semTerra.zones[0].library.push(o); semTerra.objects[o].zone = 'library'; }
  assert.equal(legais(comMana(semTerra, 'B'), 0, a => a.t === 'cast' && a.oid === rc).length, 0, 'sem terreno na mão, não há retrace');
  let terra; [g, terra] = poe(g, 0, 'Swamp', 'hand');
  const ret = legais(comMana(g, 'B'), 0, a => a.t === 'cast' && a.oid === rc && a.retrace);
  assert.ok(ret.length > 0, 'com um terreno na mão, conjura do cemitério');
});

test('L-3 · Might of the Masses: "+1/+1 until end of turn for each creature you control" — conta as suas, na resolução', () => {
  let s = mesa(['Might of the Masses', 'Urso de Teste'], ['Urso de Teste']), mm, u1; [s, mm] = poe(s, 0, 'Might of the Masses', 'hand');
  [s, u1] = poe(s, 0, 'Urso de Teste'); [s] = poe(s, 0, 'Urso de Teste'); [s] = poe(s, 0, 'Urso de Teste'); [s] = poe(s, 1, 'Urso de Teste');
  const r = conjura(s, mm, 'G', a => a.targets[0].oid === u1);
  assert.deepEqual(pt(r, u1), [5, 5], 'três criaturas suas (a do oponente não conta)');
});

test('L-3 · Oroku Saki: "Sneak {1}{B}" troca um atacante sem bloqueio no passo de bloqueadores e entra virado e atacando; dano de combate: compra uma e perde 1', () => {
  let s = mesa(['Oroku Saki, Shredder Rising', 'Urso de Teste']), urso, os; [s, urso] = poe(s, 0, 'Urso de Teste'); [s, os] = poe(s, 0, 'Oroku Saki, Shredder Rising', 'hand');
  s = atacaSemBloqueio(s, [urso]);
  const of = legais(comMana(s, 'BB'), 0, a => a.oid === os && (a.t === 'sneak' || a.sneak));
  assert.ok(of.length > 0, 'esgueirar-se oferecido');
  let r = tudo(act(comMana(s, 'BB'), of[0]));
  assert.equal(r.objects[urso].zone, 'hand'); assert.equal(r.objects[os].tapped, true); assert.ok(r.objects[os].attacking != null);
  const mao = r.zones[0].hand.length, vida = r.players[0].life, dele = r.players[1].life;
  r = tudo(ateODano(r));
  assert.equal(r.players[1].life, dele - 3); assert.equal(r.zones[0].hand.length, mao + 1, 'compra uma'); assert.equal(r.players[0].life, vida - 1, 'e perde 1');
});

test('L-3 · Siege Smash: "Split second" — na pilha, ninguém conjura nem ativa (só mana); modo 1 destrói artefato, modo 2 dá +3/+2 e atropelar', () => {
  let s = mesa(['Siege Smash', 'Urso de Teste'], ['Toxin Analysis', 'Artefato de Teste', 'Urso de Teste']), ss, urso, art, ch;
  [s, ss] = poe(s, 0, 'Siege Smash', 'hand'); [s, urso] = poe(s, 0, 'Urso de Teste'); [s, art] = poe(s, 1, 'Artefato de Teste'); [s, ch] = poe(s, 1, 'Toxin Analysis', 'hand'); [s] = poe(s, 1, 'Urso de Teste');
  const modos = S => legais(comMana(S, 'RR'), 0, a => a.t === 'cast' && a.oid === ss);
  let r = act(comMana(s, 'RR'), modos(s).find(a => a.mode === 0 && a.targets[0].oid === art));
  r = J(r); r.players[1].pool.B = 1; r = act(r, { t: 'pass', p: 0 });
  assert.equal(r.turn.priority, 1); assert.equal(legais(r, 1, a => a.t === 'cast').length, 0, 'o oponente não pode responder com a instantânea');
  const semSs = J(s); semSs.players[1].pool.B = 1; semSs.turn.priority = 1; assert.ok(legais(semSs, 1, a => a.t === 'cast' && a.oid === ch).length > 0, 'sem a fração de segundo, poderia');
  r = tudo(r); assert.equal(r.objects[art].zone, 'graveyard', 'destruiu o artefato');
  r = conjura(s, ss, 'RR', a => a.mode === 1 && a.targets[0].oid === urso);
  assert.deepEqual(pt(r, urso), [5, 4]); assert.ok(E.hasKeyword(r, r.objects[urso], 'trample'));
});

test('L-3 · Seeker of the Way: mágica não criatura → +1/+1 (prowess) e vínculo com a vida até o fim do turno; criatura não dispara', () => {
  let s = mesa(['Seeker of the Way', "Raven's Crime", 'Urso de Teste']), sk, ch, urso; [s, sk] = poe(s, 0, 'Seeker of the Way'); [s, ch] = poe(s, 0, "Raven's Crime", 'hand'); [s, urso] = poe(s, 0, 'Urso de Teste', 'hand');
  let r = conjura(s, urso, 'G'); assert.ok(!E.hasKeyword(r, r.objects[sk], 'lifelink'), 'criatura não'); assert.deepEqual(pt(r, sk), [2, 2]);
  r = conjura(r, ch, 'B', a => a.targets[0].player === 1);
  assert.ok(E.hasKeyword(r, r.objects[sk], 'lifelink'), 'ganha vínculo com a vida'); assert.deepEqual(pt(r, sk), [3, 3], 'e a proeza');
  const depois = passaAte(r, x => x.turn.active === 1 && x.turn.step === 'main1', 80);
  assert.ok(!E.hasKeyword(depois, depois.objects[sk], 'lifelink'), 'até o fim do turno');
});

test('L-3 · Pactdoll Terror: "Whenever this creature or another artifact you control enters, each opponent loses 1 life and you gain 1 life."', () => {
  let s = mesa(['Pactdoll Terror', 'Artefato de Teste', 'Urso de Teste'], ['Artefato de Teste']), pd, art, urso;
  [s, pd] = poe(s, 0, 'Pactdoll Terror', 'hand'); [s, art] = poe(s, 0, 'Artefato de Teste', 'hand'); [s, urso] = poe(s, 0, 'Urso de Teste', 'hand');
  const v = x => [x.players[0].life, x.players[1].life];
  let r = conjura(s, pd, 'BBBB'); assert.deepEqual(v(r), [21, 19], 'ela mesma entrando');
  r = conjura(r, art, 'C'); assert.deepEqual(v(r), [22, 18], 'outro artefato seu');
  r = conjura(r, urso, 'G'); assert.deepEqual(v(r), [22, 18], 'criatura que não é artefato: nada');
  let o; [r, o] = poe(r, 1, 'Artefato de Teste', 'hand'); r = J(r); r.turn.active = 1; r.turn.priority = 1; r.players[1].pool.C = 1;
  const c = legais(r, 1, a => a.t === 'cast' && a.oid === o); if (c.length) { r = tudo(act(r, c[0])); assert.deepEqual(v(r), [22, 18], 'artefato do oponente: nada'); }
});

test('L-3 · Sea Gate Oracle: olha as duas de cima; uma para a mão, a outra para o fundo', () => {
  let s = mesa(['Sea Gate Oracle']), so; [s, so] = poe(s, 0, 'Sea Gate Oracle', 'hand');
  const topo = s.zones[0].library.slice(0, 2);
  let r = passaAte(act(comMana(s, 'UUU'), legais(comMana(s, 'UUU'), 0, a => a.t === 'cast' && a.oid === so)[0]), x => !!x.pending);
  assert.equal(r.pending.kind, 'pick'); assert.deepEqual([...r.pending.from].sort(), [...topo].sort()); assert.equal(r.pending.min, 1, '"Put one of them into your hand": obrigatório');
  r = tudo(act(r, { t: 'pick', p: 0, oid: topo[1] }));
  assert.equal(r.objects[topo[1]].zone, 'hand'); assert.equal(r.zones[0].library[r.zones[0].library.length - 1], topo[0], 'a outra no fundo');
});

test('L-3 · The Modern Age: Saga — I e II compram e descartam; III exila e volta transformada em Vector Glider (encantamento criatura 2/3 voadora azul)', () => {
  let s = mesa(['The Modern Age']), ma; [s, ma] = poe(s, 0, 'The Modern Age', 'hand');
  const mao = s.zones[0].hand.length;
  let r = conjura(s, ma, 'UU');
  assert.equal(r.objects[ma].counters.lore, 1); assert.equal(r.zones[0].hand.length, mao - 1, 'capítulo I: comprou uma e descartou uma');
  const t1 = r.turn.number;
  for (let k = 0; k < 12 && r.objects[ma].name !== 'Vector Glider'; k++) { r = passaAte(r, x => !!x.pending || x.objects[ma].name === 'Vector Glider', 400); if (r.pending) r = tudo(r); }
  assert.equal(r.turn.number, t1 + 4, 'II e III depois do passo de compra dos seus dois turnos seguintes');
  assert.equal(r.objects[ma].name, 'Vector Glider', 'capítulo III: transformada'); assert.equal(r.objects[ma].zone, 'battlefield');
  assert.deepEqual(pt(r, ma), [2, 3]); assert.ok(E.hasKeyword(r, r.objects[ma], 'flying'));
});

test('L-3 · Snakeskin Veil: "Put a +1/+1 counter on target creature you control. It gains hexproof until end of turn." — só criatura sua', () => {
  let s = mesa(['Snakeskin Veil', 'Urso de Teste'], ['Urso de Teste']), sv, meu, deles; [s, sv] = poe(s, 0, 'Snakeskin Veil', 'hand'); [s, meu] = poe(s, 0, 'Urso de Teste'); [s, deles] = poe(s, 1, 'Urso de Teste');
  assert.ok(legais(comMana(s, 'G'), 0, a => a.t === 'cast' && a.oid === sv).every(a => a.targets[0].oid === meu), 'não mira a do oponente');
  const r = conjura(s, sv, 'G'); assert.equal(r.objects[meu].counters.p1p1, 1); assert.ok(E.hasKeyword(r, r.objects[meu], 'hexproof'));
});

test('L-3 · Tamiyo\'s Safekeeping: "Target permanent you control gains hexproof and indestructible until end of turn. You gain 2 life." — qualquer permanente sua', () => {
  let s = mesa(["Tamiyo's Safekeeping", 'Artefato de Teste'], ['Urso de Teste']), ts, art, deles; [s, ts] = poe(s, 0, "Tamiyo's Safekeeping", 'hand'); [s, art] = poe(s, 0, 'Artefato de Teste'); [s, deles] = poe(s, 1, 'Urso de Teste');
  const alvos = legais(comMana(s, 'G'), 0, a => a.t === 'cast' && a.oid === ts).map(a => a.targets[0].oid);
  assert.ok(alvos.includes(art), 'artefato seu serve'); assert.ok(!alvos.includes(deles), 'do oponente não');
  const r = conjura(s, ts, 'G', a => a.targets[0].oid === art);
  assert.ok(E.hasKeyword(r, r.objects[art], 'hexproof') && E.hasKeyword(r, r.objects[art], 'indestructible')); assert.equal(r.players[0].life, 22);
});

test('L-3 · Unexpected Fangs: "Put a +1/+1 counter and a lifelink counter on target creature." — qualquer criatura; o marcador dá vínculo com a vida sem prazo', () => {
  let s = mesa(['Unexpected Fangs'], ['Urso de Teste']), uf, deles; [s, uf] = poe(s, 0, 'Unexpected Fangs', 'hand'); [s, deles] = poe(s, 1, 'Urso de Teste');
  const r = conjura(s, uf, 'BB', a => a.targets[0].oid === deles);
  assert.equal(r.objects[deles].counters.p1p1, 1); assert.equal(r.objects[deles].counters.lifelink, 1); assert.deepEqual(pt(r, deles), [3, 3]);
  const depois = passaAte(r, x => x.turn.active === 1 && x.turn.step === 'main1', 80); assert.ok(E.hasKeyword(depois, depois.objects[deles], 'lifelink'), 'marcador, não efeito até o fim do turno');
});

test('L-3 · Mesmerizing Dose: ao entrar vira a encantada e prolifera; "doesn\'t untap during its controller\'s untap step"', () => {
  let s = mesa(['Mesmerizing Dose'], ['Urso de Teste']), md, deles; [s, md] = poe(s, 0, 'Mesmerizing Dose', 'hand'); [s, deles] = poe(s, 1, 'Urso de Teste', 'battlefield', { counters: { p1p1: 1 } });
  let r = act(comMana(s, 'UUU'), legais(comMana(s, 'UUU'), 0, a => a.t === 'cast' && a.oid === md && a.targets[0].oid === deles)[0]);
  r = tudo(r, x => x.pending.kind === 'pick' || x.pending.kind === 'proliferar' ? (legais(x, x.pending.p, a => a.oid === deles)[0] || legais(x, x.pending.p, a => /done|fim|conclui/.test(a.t))[0] || legais(x, x.pending.p)[0]) : legais(x, x.pending.p)[0]);
  assert.equal(r.objects[md].attachedTo, deles); assert.equal(r.objects[deles].tapped, true, 'virou a encantada');
  assert.equal(r.objects[deles].counters.p1p1, 2, 'proliferou o marcador que já estava lá');
  const depois = passaAte(r, x => x.turn.active === 1 && x.turn.step === 'main1', 80); assert.equal(depois.objects[deles].tapped, true, 'não desvirou no passo de desvirar do controlador');
});

test('L-3 · Thrummingbird: "Whenever Thrummingbird deals combat damage to a player, proliferate."', () => {
  let s = mesa(['Thrummingbird', 'Urso de Teste']), tb, urso; [s, tb] = poe(s, 0, 'Thrummingbird'); [s, urso] = poe(s, 0, 'Urso de Teste', 'battlefield', { counters: { p1p1: 1 } });
  s = atacaSemBloqueio(s, [tb]);
  const r = tudo(ateODano(s), x => (legais(x, x.pending.p, a => a.oid === urso)[0] || legais(x, x.pending.p, a => /done|fim|conclui/.test(a.t))[0] || legais(x, x.pending.p)[0]));
  assert.equal(r.players[1].life, 19); assert.equal(r.objects[urso].counters.p1p1, 2, 'proliferou');
});

// Achado da auditoria independente do L-4: "return it to the battlefield transformed under your control" — sob o controle de quem controla a
// habilidade do capítulo, não do dono. O efeito `exile_return_transformed` (core.js) devolve sob o dono; simplificação declarada, pedido à trilha motor.
test('L-3 · The Modern Age sob controle do oponente: o capítulo III devolve Vector Glider sob o controle de quem controlava a Saga', { todo: 'core.js: exile_return_transformed devolve sob o dono — pedido à trilha motor' }, () => {
  let s = mesa(['The Modern Age']), ma; [s, ma] = poe(s, 0, 'The Modern Age', 'hand');
  let r = tudo(act(comMana(s, 'UU'), legais(comMana(s, 'UU'), 0, a => a.t === 'cast' && a.oid === ma)[0]));
  r = J(r); r.objects[ma].counters.lore = 2; r.objects[ma].controller = 1; r.zones[0].battlefield.splice(r.zones[0].battlefield.indexOf(ma), 1); r.zones[1].battlefield.push(ma);
  for (let k = 0; k < 12 && r.objects[ma].name !== 'Vector Glider'; k++) { r = passaAte(r, x => !!x.pending || x.objects[ma].name === 'Vector Glider', 400); if (r.pending) r = tudo(r); }
  assert.equal(r.objects[ma].controller, 1);
});
