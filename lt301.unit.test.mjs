// M-624 · rotina Motor contínuo · campanha Modern, ordem gulosa (coleta de 12/11/2026 13h50 UTC: 133 de 743 listas a 100%):
// Practiced Offense (a única pendência de uma lista) e Ob Nixilis, the Adversary (10 listas; com a primeira, 138 de 743).
// Regras novas: 702.153a com X ("Casualty X. The copy isn't legendary and has starting loyalty X."): X escolhido ao conjurar, criatura
// sacrificada com poder X ou mais, o gatilho copia a mágica de permanente, a cópia vira ficha (707.10c), não é lendária (205.4d: fica fora
// da regra das lendas, 704.5j) e entra com lealdade X (306.5b); "each opponent loses N life unless they discard a card"; "If you control a
// Demon or Devil" na resolução (608.2c); e "target creature gains your choice of double strike or lifelink until end of turn" (608.2d:
// quem controla escolhe na resolução). Textos da API da Scryfall da coleta de 12/11 (.listas/oficiais-revisadas.json); rulings do Ob
// Nixilis de 29/04/2022 (scryfall.com, consulta de 12/11/2026). Tudo falha no motor anterior: as duas cartas não tinham script.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadModules } from './_load.mjs';

const M = loadModules(), E = M.engine, S = M.scripts, SF = M.scryfall;
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const OB = 'Ob Nixilis, the Adversary', PO = 'Practiced Offense';
const CMC = { [OB]: 3, [PO]: 3 }, COR = { [OB]: ['B', 'R'], [PO]: ['W'] };
const oficial = n => { const o = OF.find(x => x.name === n); assert.ok(o, `${n} em .listas/oficiais-revisadas.json`);
  return SF.normalizeCard({ object: 'card', layout: 'normal', ...o, cmc: CMC[n], colors: COR[n] }); };
const J = x => JSON.parse(JSON.stringify(x));

test('M-624 · os dois textos da Scryfall de 12/11 guardados; scripts à mão válidos e cobertura completa', () => {
  for (const n of [OB, PO]) {
    const o = OF.find(x => x.name === n); assert.match(o.fonte, /api\.scryfall\.com/); assert.equal(o.consulta, '2026-11-12');
    assert.ok(S.SCRIPTS[n], `${n} tem script`); assert.equal(S.validateScript(S.SCRIPTS[n]).length, 0);
    assert.equal(S.coverage(oficial(n), S.SCRIPTS, n).level, 'completo');
  }
  assert.equal(OF.find(x => x.name === OB).oracle_text, 'Casualty X. The copy isn\'t legendary and has starting loyalty X. (As you cast this spell, you may sacrifice a creature with power X. When you do, copy this spell. The copy becomes a token.)\n+1: Each opponent loses 2 life unless they discard a card. If you control a Demon or Devil, you gain 2 life.\n−2: Create a 1/1 red Devil creature token with "When this token dies, it deals 1 damage to any target."\n−7: Target player draws seven cards and loses 7 life.');
  assert.equal(OF.find(x => x.name === PO).oracle_text, 'Put a +1/+1 counter on each creature target player controls. Target creature gains your choice of double strike or lifelink until end of turn.\nFlashback {1}{W} (You may cast this card from your graveyard for its flashback cost. Then exile it.)');
  assert.equal(OF.find(x => x.name === OB).loyalty, '3');
});

test('M-624 · validador: "escolha" de palavra e baixaXM só no formato certo', () => {
  const base = { name: 'Teste', example: { target: 'none', expect: { selfLife: 0 } } };
  assert.ok(S.validateScript({ ...base, effects: [{ do: 'keyword', target: 'creature', escolha: ['flying'] }] }).length, 'uma palavra só não é escolha');
  assert.ok(S.validateScript({ ...base, effects: [{ do: 'keyword', target: 'creature', escolha: ['flying', 'voo'] }] }).length, 'palavra que o motor não conhece');
  assert.ok(S.validateScript({ ...base, effects: [{ do: 'keyword', target: 'creature', keyword: 'flying', escolha: ['flying', 'reach'] }] }).length, 'keyword e escolha juntas');
  assert.ok(S.validateScript({ ...base, self: { baixaXM: true }, effects: [{ do: 'draw', amount: 1 }] }).length, 'baixaXM fora de planeswalker');
});

// ── partidas ──
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: [...mana_cost.matchAll(/\{([^}]+)\}/g)].reduce((n, [, x]) => n + (/^\d+$/.test(x) ? +x : 1), 0), keywords: [], oracle_text: '', colors: [], ...extra });
const C = {
  [OB]: oficial(OB), [PO]: oficial(PO),
  Plains: c0('Plains', 'Basic Land — Plains', '', { oracle_text: '({T}: Add {W}.)' }),
  Swamp: c0('Swamp', 'Basic Land — Swamp', '', { oracle_text: '({T}: Add {B}.)' }),
  Mountain: c0('Mountain', 'Basic Land — Mountain', '', { oracle_text: '({T}: Add {R}.)' }),
  Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2', colors: ['G'] }),
  Gigante: c0('Gigante', 'Creature — Giant', '{2}{G}', { power: '3', toughness: '3', colors: ['G'] }),
  Muro: c0('Muro', 'Creature — Wall', '{1}', { power: '0', toughness: '4' }),
  Demonio: c0('Demonio', 'Creature — Demon', '{2}{B}', { power: '2', toughness: '2', colors: ['B'] }),
  Mutante: c0('Mutante', 'Creature — Shapeshifter', '{2}', { power: '1', toughness: '1', oracle_text: 'Changeling', keywords: ['Changeling'] }),
  'Lithoform Engine': (l => c0(l.name, l.type_line, l.mana_cost, { oracle_text: l.oracle_text }))(JSON.parse(readFileSync(new URL('./.listas/oficiais-tipos.json', import.meta.url), 'utf8')).cartas.find(x => x.name === 'Lithoform Engine')),
};
const ex = { example: { target: 'none', expect: { selfLife: 0 } } };
const SCR = { Urso: { name: 'Urso', ...ex }, Gigante: { name: 'Gigante', ...ex }, Muro: { name: 'Muro', ...ex }, Demonio: { name: 'Demonio', ...ex }, Mutante: { name: 'Mutante', self: { changeling: true }, ...ex } };
const act = (s, a) => { const r = E.apply(s, a); if (r.error) throw new Error(JSON.stringify(r.error)); return r.state; };
const recusa = (s, a, re) => { const r = (() => { try { return E.apply(s, a); } catch (e) { return { error: { message: e.message } }; } })(); assert.ok(r.error, `devia recusar ${JSON.stringify(a)}`); if (re) assert.match(JSON.stringify(r.error), re); };
function passaAte(s, fim, max = 400) {
  for (let i = 0; i < max && !fim(s); i++) { const pd = s.pending;
    if (pd && pd.kind === 'discard' && pd.reason !== 'effect') s = act(s, { t: 'discard', p: pd.p, oid: s.zones[pd.p].hand[0] });
    else if (pd && pd.kind === 'attackers') s = act(s, { t: 'attack', p: pd.p, attackers: [] });
    else if (pd && pd.kind === 'blockers') s = act(s, { t: 'block', p: pd.p, blocks: [] });
    else if (pd) return s; else s = act(s, { t: 'pass', p: s.turn.priority }); }
  return s;
}
function poe(s, p, name, zone = 'battlefield', lealdade = 3) {
  s = J(s);
  const from = ['library', 'hand', 'graveyard'].map(z => s.zones[p][z]).find(z => z.some(o => s.objects[o].name === name));
  if (!from) throw new Error(name + ' ausente');
  const oid = from.find(o => s.objects[o].name === name); from.splice(from.indexOf(oid), 1); s.zones[p][zone].push(oid);
  Object.assign(s.objects[oid], { zone, sick: false, tapped: false, controller: p });
  if (zone === 'battlefield' && name === OB) s.objects[oid].counters = { ...(s.objects[oid].counters || {}), loyalty: lealdade };
  return [s, oid];
}
const limpaMao = (s, p) => { s = J(s); for (const oid of s.zones[p].hand.slice()) { s.zones[p].hand.splice(s.zones[p].hand.indexOf(oid), 1); s.zones[p].library.unshift(oid); s.objects[oid].zone = 'library'; } return s; };
const resolve = s => { for (let i = 0; i < 60 && (s.stack.length || s.pending); i++) { if (s.pending) return s; s = act(s, { t: 'pass', p: s.turn.priority }); } return s; };
const terras = (s, p, nomes) => { let o; for (const n of nomes) [s, o] = poe(s, p, n); return s; };
/** A no próprio main1; os dois baralhos têm de tudo. */
function mesa() {
  const d = ns => ns.map(name => ({ name, qty: 6, zone: 'main' }));
  const todos = [OB, PO, 'Plains', 'Swamp', 'Mountain', 'Urso', 'Gigante', 'Muro', 'Demonio', 'Mutante', 'Lithoform Engine'];
  let s = E.createGame({ format: 'livre', seed: 624, mode: 'full', cards: C, scripts: SCR, first: 0, players: [{ name: 'A', deck: d(todos) }, { name: 'B', deck: d(todos) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  s = limpaMao(s, 0); s = limpaMao(s, 1);
  return s;
}
const castsDe = (s, p, oid) => E.legalActions(s, p).filter(a => a.t === 'cast' && a.oid === oid);
const obsNoCampo = (s, p) => s.zones[p].battlefield.map(o => s.objects[o]).filter(o => o.name === OB);

test('M-624 · Ob Nixilis (702.153a com X): uma variante por criatura e por X de 1 ao poder dela; sem criatura de poder 1+, só a normal', () => {
  let s = mesa(), ob, gig, muro;
  [s, ob] = poe(s, 0, OB, 'hand'); s = terras(s, 0, ['Swamp', 'Mountain', 'Swamp']);
  [s, muro] = poe(s, 0, 'Muro');
  assert.deepEqual(J(castsDe(s, 0, ob).map(a => a.baixaXM == null)), [true], 'o Muro (poder 0) não paga baixa');
  [s, gig] = poe(s, 0, 'Gigante');
  const v = castsDe(s, 0, ob).filter(a => a.casualtyK != null);
  assert.deepEqual(J(v.map(a => [a.casualtyK, a.baixaXM])), [[gig, 1], [gig, 2], [gig, 3]], 'X de 1 a 3 com o Gigante 3/3');
  assert.equal(castsDe(s, 0, ob).filter(a => a.casualtyK == null).length, 1, 'e a conjuração sem baixa');
  recusa(s, { t: 'cast', p: 0, oid: ob, casualtyK: gig, baixaXM: 4 }, /poder 4 ou mais/);
  recusa(s, { t: 'cast', p: 0, oid: ob, casualtyK: muro, baixaXM: 1 }, /poder 1 ou mais/);
  recusa(s, { t: 'cast', p: 0, oid: ob, casualtyK: gig, baixaXM: 0 }, /1 ou mais/);
});

test('M-624 · Ob Nixilis com baixa 3: o Gigante é sacrificado, a cópia resolve antes, vira ficha não lendária com lealdade 3, e as duas ficam', () => {
  let s = mesa(), ob, gig;
  [s, ob] = poe(s, 0, OB, 'hand'); s = terras(s, 0, ['Swamp', 'Mountain', 'Swamp']); [s, gig] = poe(s, 0, 'Gigante');
  s = act(s, castsDe(s, 0, ob).find(a => a.baixaXM === 3));
  assert.equal(s.objects[gig].zone, 'graveyard', 'sacrificado ao conjurar');
  s = act(s, { t: 'pass', p: s.turn.priority }); // o gatilho da baixa vai para a pilha
  s = resolve(s);
  const obs = obsNoCampo(s, 0);
  assert.equal(obs.length, 2, 'a original e a cópia');
  const copia = obs.find(o => o.oid !== ob), orig = s.objects[ob];
  assert.ok(copia.token, 'a cópia é ficha (707.10c)'); assert.ok(!orig.token);
  assert.equal(copia.counters.loyalty, 3); assert.equal(orig.counters.loyalty, 3);
  assert.ok(!s.pending || s.pending.kind !== 'legend', 'a cópia não é lendária: sem regra das lendas');
});

test('M-624 · baixa com X menor que o poder: a cópia entra com lealdade X; duas originais ainda caem na regra das lendas', () => {
  let s = mesa(), ob, gig;
  [s, ob] = poe(s, 0, OB, 'hand'); s = terras(s, 0, ['Swamp', 'Mountain', 'Swamp']); [s, gig] = poe(s, 0, 'Gigante');
  s = resolve(act(act(s, castsDe(s, 0, ob).find(a => a.baixaXM === 2)), { t: 'pass', p: 0 }));
  const copia = obsNoCampo(s, 0).find(o => o.oid !== ob);
  assert.equal(copia.counters.loyalty, 2, 'lealdade inicial X = 2');
  // regressão: uma segunda Ob Nixilis original (lendária) com a primeira → regra das lendas
  let s2 = J(s), ob2; [s2, ob2] = poe(s2, 0, OB);
  s2 = J(s2); s2 = act(s2, { t: 'pass', p: 0 }); // qualquer ação que confira as ações de estado
  const pend = s2.pending && s2.pending.kind === 'legend' ? s2.pending : null;
  assert.ok(pend, 'duas lendárias de mesmo nome: escolha'); assert.deepEqual(J(pend.options.slice().sort()), [ob, ob2].sort(), 'a cópia não lendária fica fora da escolha');
});

test('M-624 · Ob Nixilis +1: B escolhe descartar ou perder 2; sem carta na mão perde direto; com Demônio ou Diabo (até changeling) A ganha 2', () => {
  let s = mesa(), ob, urso;
  [s, ob] = poe(s, 0, OB); [s, urso] = poe(s, 1, 'Urso', 'hand');
  const sobe = E.legalActions(s, 0).find(a => a.t === 'activate' && a.oid === ob && a.index === 0);
  assert.ok(sobe, '+1 oferecido');
  let s1 = resolve(act(s, sobe));
  assert.equal(s1.pending && s1.pending.kind, 'unless'); assert.equal(s1.pending.p, 1, 'só o oponente decide');
  const vidaA = s1.players[0].life, vidaB = s1.players[1].life;
  let sp = act(s1, { t: 'take_loss', p: 1 }); sp = resolve(sp);
  assert.equal(sp.players[1].life, vidaB - 2); assert.equal(sp.players[0].life, vidaA, 'sem Demônio nem Diabo, A não ganha');
  assert.equal(sp.objects[ob].counters.loyalty, 4);
  let sd = act(s1, { t: 'pay_unless', p: 1 });
  if (sd.pending && sd.pending.kind === 'discard') sd = act(sd, { t: 'discard', p: 1, oid: urso });
  sd = resolve(sd);
  assert.equal(sd.players[1].life, vidaB, 'descartou: não perde'); assert.equal(sd.objects[urso].zone, 'graveyard');
  // B sem mão perde direto; A com um Demônio ganha 2
  let s2 = mesa(), ob2; [s2, ob2] = poe(s2, 0, OB); [s2] = poe(s2, 0, 'Demonio');
  const a2 = s2.players[0].life, b2 = s2.players[1].life;
  s2 = resolve(act(s2, E.legalActions(s2, 0).find(a => a.t === 'activate' && a.oid === ob2 && a.index === 0)));
  assert.equal(s2.pending, null); assert.equal(s2.players[1].life, b2 - 2); assert.equal(s2.players[0].life, a2 + 2, 'com Demônio, ganha 2');
  let s3 = mesa(), ob3; [s3, ob3] = poe(s3, 0, OB); [s3] = poe(s3, 0, 'Mutante');
  const a3 = s3.players[0].life;
  s3 = resolve(act(s3, E.legalActions(s3, 0).find(a => a.t === 'activate' && a.oid === ob3 && a.index === 0)));
  assert.equal(s3.players[0].life, a3 + 2, 'o changeling é Demônio e Diabo (702.73a)');
  let s4 = mesa(), ob4; [s4, ob4] = poe(s4, 0, OB); [s4] = poe(s4, 1, 'Demonio');
  const a4 = s4.players[0].life;
  s4 = resolve(act(s4, E.legalActions(s4, 0).find(a => a.t === 'activate' && a.oid === ob4 && a.index === 0)));
  assert.equal(s4.players[0].life, a4, 'o Demônio do oponente não conta');
});

test('M-624 · Ob Nixilis −2: Diabo 1/1 vermelho; ao morrer causa 1 de dano a qualquer alvo; e conta para o +1 seguinte', () => {
  let s = mesa(), ob;
  [s, ob] = poe(s, 0, OB);
  s = resolve(act(s, E.legalActions(s, 0).find(a => a.t === 'activate' && a.oid === ob && a.index === 1)));
  assert.equal(s.objects[ob].counters.loyalty, 1);
  const diabo = s.zones[0].battlefield.map(o => s.objects[o]).find(o => o.token && o.name === 'Devil');
  assert.ok(diabo, 'ficha Devil'); const st = E.stats(s, diabo); assert.deepEqual([st.power, st.toughness], [1, 1]);
  assert.deepEqual(J(s.facts.Devil.colors), ['R']); assert.match(JSON.stringify(s.facts.Devil), /Devil/);
  // morre: o gatilho dispara e mira qualquer alvo (o oponente aqui)
  const vB = s.players[1].life;
  let sm = J(s); sm.objects[diabo.oid].damage = 1; sm = act(sm, { t: 'pass', p: 0 });
  for (let i = 0; i < 40 && sm.players[1].life === vB; i++) {
    const pd = sm.pending, quem = pd ? pd.p : sm.turn.priority;
    if (pd && pd.kind === 'pick_target') { sm = act(sm, { t: 'pick_target', p: pd.p, index: pd.options.findIndex(o => o.player === 1) }); continue; }
    const al = E.legalActions(sm, quem);
    if (al.some(a => a.t === 'pass')) sm = act(sm, { t: 'pass', p: quem }); else break;
  }
  assert.ok(!sm.objects[diabo.oid] || sm.objects[diabo.oid].zone !== 'battlefield', 'o Diabo morreu');
  assert.equal(sm.players[1].life, vB - 1, 'o Diabo morto causa 1 de dano ao oponente');
  // o Diabo conta para o +1 (Demon or Devil)
  let s2 = limpaMao(passaAte(s, x => x.turn.active === 0 && x.turn.number > s.turn.number && x.turn.step === 'main1' && !x.stack.length && !x.pending), 1);
  const a2 = s2.players[0].life, sobe = E.legalActions(s2, 0).find(a => a.t === 'activate' && a.oid === ob && a.index === 0);
  assert.ok(sobe, '+1 no turno seguinte de A');
  s2 = resolve(act(s2, sobe));
  assert.equal(s2.players[0].life, a2 + 2, 'com o Diabo, ganha 2');
});

test('M-624 · Ob Nixilis −7: o jogador alvo compra sete e perde 7 de vida', () => {
  let s = mesa(), ob;
  [s, ob] = poe(s, 0, OB, 'battlefield', 7);
  const desce = E.legalActions(s, 0).filter(a => a.t === 'activate' && a.oid === ob && a.index === 2);
  const noB = desce.find(a => JSON.stringify(a.targets || []).includes('"player":1'));
  assert.ok(noB, 'o oponente é alvo'); assert.ok(desce.some(a => JSON.stringify(a.targets || []).includes('"player":0')), 'você também pode ser o alvo');
  const mao = s.zones[1].hand.length, vida = s.players[1].life;
  s = resolve(act(s, noB));
  assert.equal(s.zones[1].hand.length, mao + 7); assert.equal(s.players[1].life, vida - 7);
});

test('M-624 · Practiced Offense: um marcador em cada criatura do jogador alvo; a criatura alvo ganha, à escolha de quem conjura, golpe duplo ou vínculo', () => {
  let s = mesa(), po, u1, u2, ub;
  [s, po] = poe(s, 0, PO, 'hand'); s = terras(s, 0, ['Plains', 'Plains', 'Swamp']);
  [s, u1] = poe(s, 0, 'Urso'); [s, u2] = poe(s, 0, 'Gigante'); [s, ub] = poe(s, 1, 'Urso');
  const c = castsDe(s, 0, po).find(a => JSON.stringify(a.targets) === JSON.stringify([{ player: 0 }, { oid: ub }]));
  assert.ok(c, 'jogador alvo e criatura alvo independentes (a criatura pode ser do oponente)');
  s = act(s, c); s = act(s, { t: 'pass', p: 0 }); s = act(s, { t: 'pass', p: 1 });
  assert.equal(s.pending && s.pending.kind, 'choose_mode'); assert.equal(s.pending.p, 0, 'quem conjurou escolhe');
  assert.deepEqual(J(s.pending.options), ['Golpe duplo', 'Vínculo com a vida']);
  assert.equal(s.objects[u1].counters.p1p1, 1); assert.equal(s.objects[u2].counters.p1p1, 1);
  assert.ok(!(s.objects[ub].counters || {}).p1p1, 'a criatura de B não é do jogador alvo');
  recusa(s, { t: 'choose_mode', p: 0, decline: true }, /escolha/);
  const sv = resolve(act(s, { t: 'choose_mode', p: 0, index: 1 }));
  assert.ok(E.hasKeyword(sv, sv.objects[ub], 'lifelink')); assert.ok(!E.hasKeyword(sv, sv.objects[ub], 'double strike'));
  assert.equal(sv.objects[po].zone, 'graveyard');
  const sg = resolve(act(s, { t: 'choose_mode', p: 0, index: 0 }));
  assert.ok(E.hasKeyword(sg, sg.objects[ub], 'double strike'));
  // acaba no fim do turno
  const sf = passaAte(sv, x => x.turn.active === 1 && x.turn.step === 'upkeep');
  assert.ok(!E.hasKeyword(sf, sf.objects[ub], 'lifelink'), 'até o fim do turno');
});

test('M-624 · Practiced Offense no jogador B e lampejo do passado {1}{W}: marcadores nas criaturas de B; depois ela vai para o exílio', () => {
  let s = mesa(), po, ua, ub;
  [s, po] = poe(s, 0, PO, 'graveyard'); s = terras(s, 0, ['Plains', 'Swamp']);
  [s, ua] = poe(s, 0, 'Urso'); [s, ub] = poe(s, 1, 'Gigante');
  const fb = castsDe(s, 0, po).filter(a => a.flashback);
  const c = fb.find(a => JSON.stringify(a.targets) === JSON.stringify([{ player: 1 }, { oid: ua }]));
  assert.ok(c, 'lampejo do passado oferecido com 2 terrenos');
  s = act(s, c); s = act(s, { t: 'pass', p: 0 }); s = act(s, { t: 'pass', p: 1 });
  s = resolve(act(s, { t: 'choose_mode', p: 0, index: 0 }));
  assert.equal(s.objects[ub].counters.p1p1, 1); assert.ok(!(s.objects[ua].counters || {}).p1p1);
  assert.ok(E.hasKeyword(s, s.objects[ua], 'double strike'));
  assert.equal(s.objects[po].zone, 'exile', '702.34a: exilada');
});

test('M-624 · Practiced Offense: a criatura alvo que saiu antes da resolução não ganha nada e não há escolha (608.2b)', () => {
  let s = mesa(), po, ua;
  [s, po] = poe(s, 0, PO, 'hand'); s = terras(s, 0, ['Plains', 'Plains', 'Swamp']); [s, ua] = poe(s, 0, 'Urso');
  s = act(s, castsDe(s, 0, po).find(a => JSON.stringify(a.targets) === JSON.stringify([{ player: 0 }, { oid: ua }])));
  s = J(s); s.zones[0].battlefield.splice(s.zones[0].battlefield.indexOf(ua), 1); s.zones[0].graveyard.push(ua); s.objects[ua].zone = 'graveyard'; s.objects[ua].zc = (s.objects[ua].zc || 0) + 1;
  s = act(s, { t: 'pass', p: 0 }); s = act(s, { t: 'pass', p: 1 });
  assert.ok(!s.pending || s.pending.kind !== 'choose_mode', 'sem escolha');
});

test('M-624 · 707.9b (achado da revisão): a cópia da cópia da baixa X também não é lendária e tem lealdade X; a ficha que copia a original sem baixa entra com a lealdade impressa (não o dobro)', () => {
  const roda = copiaACopia => {
    let s = mesa(), ob, e; [s, ob] = poe(s, 0, OB, 'hand'); [s, e] = poe(s, 0, 'Lithoform Engine'); [s] = poe(s, 0, 'Gigante');
    s = J(s); for (const c of 'WUBRGC') s.players[0].pool[c] += 9;
    s = act(s, castsDe(s, 0, ob).find(a => a.baixaXM === 2)); s = act(s, { t: 'pass', p: 0 }); s = act(s, { t: 'pass', p: 1 });
    const alvo = copiaACopia ? s.stack[s.stack.length - 1] : ob;
    s = act(s, E.legalActions(s, 0).find(a => a.t === 'activate' && a.oid === e && a.index === 2 && a.targets[0].oid === alvo));
    for (let i = 0; i < 40 && (s.stack.length || s.pending); i++) { if (s.pending) break; s = act(s, { t: 'pass', p: s.turn.priority }); }
    return s;
  };
  const s1 = roda(true), fichas1 = obsNoCampo(s1, 0).filter(o => o.token);
  assert.equal(fichas1.length, 2); assert.ok(fichas1.every(o => o.naoLendariaM && o.counters.loyalty === 2), 'as duas cópias: não lendárias, lealdade 2');
  assert.ok(!s1.pending, 'sem regra das lendas');
  const s2 = roda(false), copiaDaOriginal = obsNoCampo(s2, 0).find(o => o.token && !o.naoLendariaM);
  assert.equal(copiaDaOriginal.counters.loyalty, 3, 'a ficha que copia a original lendária entra com 3, não 6');
  assert.equal(s2.pending && s2.pending.kind, 'legend', 'e é lendária: regra das lendas com a original');
});
