// M-626 · rotina Motor contínuo · Archon of Cruelty, Persist e Faithful Mending pelo leitor (campanha Modern, ordem gulosa: com os PRs
// abertos da M-624 e da M-625, as três são as únicas pendências de 8 listas Modern — o reanimador de Persist e Goryo's). Regras:
// 701.21a — "target opponent sacrifices a creature or planeswalker of their choice": uma permanente só, de um dos dois tipos, escolhida
// por ele; 608.2c — "…, discards a card, and loses 3 life": o mesmo jogador alvo faz cada ação, na ordem impressa; 121.1 — "You draw a
// card and gain 3 life"; 122.6 — "with a -1/-1 counter on it": a carta devolvida entra com o marcador; 115.1 — "nonlegendary" restringe o
// alvo; a série "You gain 2 life, draw two cards, then discard two cards" (Faithful Mending, com flashback 702.34). Texto da API da
// Scryfall pela coleta de 12/11/2026 13h50 UTC (cobertura/modern.json do ramo catalogo), guardado em .listas/oficiais-revisadas.json.
// Os testes de partida falham no motor anterior (as três não eram lidas). "Pantano", "Planicie", "Ilha", "Urso", "Fragil", "Lenda",
// "Andarilho" e "Exila" são cartas de teste.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadModules } from './_load.mjs';

const M = loadModules(), E = M.engine, S = M.scripts, SF = M.scryfall;
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const AR = 'Archon of Cruelty', PE = 'Persist', FM = 'Faithful Mending';
const META = { [AR]: [8, ['B']], [PE]: [2, ['B']], [FM]: [2, ['W', 'U']] };
const TEXTOS = {
  [AR]: 'Flying\nWhenever this creature enters or attacks, target opponent sacrifices a creature or planeswalker of their choice, discards a card, and loses 3 life. You draw a card and gain 3 life.',
  [PE]: 'Return target nonlegendary creature card from your graveyard to the battlefield with a -1/-1 counter on it.',
  [FM]: 'You gain 2 life, draw two cards, then discard two cards.\nFlashback {1}{W}{U} (You may cast this card from your graveyard for its flashback cost. Then exile it.)',
};
const oficial = n => { const o = OF.find(x => x.name === n); assert.ok(o, `${n} em .listas/oficiais-revisadas.json`);
  return SF.normalizeCard({ object: 'card', layout: 'normal', ...o, cmc: META[n][0], colors: META[n][1] }); };
const J = x => JSON.parse(JSON.stringify(x));
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);

test('M-626 · as três jogam no app: texto da Scryfall de 12/11 guardado, assinatura de APROVADAS igual e cobertura completa', () => {
  for (const n of [AR, PE, FM]) {
    const c = oficial(n), o = OF.find(x => x.name === n);
    assert.match(o.fonte, /api\.scryfall\.com/); assert.equal(o.consulta, '2026-11-12'); assert.equal(o.oracle_text, TEXTOS[n], n);
    assert.ok(S.APROVADAS[n], `${n} em APROVADAS`); assert.equal(S.APROVADAS[n].leva, 'M-626');
    assert.equal(S.APROVADAS[n].texto, S.assinaturaRevisao(c), `${n}: a assinatura é a do texto revisado`);
    assert.equal(S.coverage(c, S.SCRIPTS, n).level, 'completo', n); assert.ok(S.scriptLido(c), `${n} joga pelo script lido`);
  }
  const ef = [{ do: 'edict', types: ['creature', 'planeswalker'], target: 'opponent' }, { do: 'discard', amount: 1, target: 'first-target' },
    { do: 'lose', amount: 3, target: 'first-target' }, { do: 'draw', amount: 1 }, { do: 'gain', amount: 3 }];
  eq(S.leitura(oficial(AR)).script.abilities, [{ kind: 'triggered', when: 'etb', effects: ef }, { kind: 'triggered', when: 'attacks', effects: ef }], '"enters or attacks": dois gatilhos com o mesmo efeito');
  eq(S.leitura(oficial(PE)).script.effects, [{ do: 'reanimate', target: 'creature-in-your-graveyard', targetNotLegendary: true, comMarcador: 'm1m1' }]);
  const fm = S.leitura(oficial(FM)).script;
  eq([fm.effects, fm.flashback], [[{ do: 'gain', amount: 2 }, { do: 'draw', amount: 2 }, { do: 'discard', amount: 2 }], { mana: '{1}{W}{U}' }]);
});

test('M-626 · o leitor não estende a série a outro texto', () => {
  const le = (t, tipo = 'Sorcery') => M.leitor.ler(SF.normalizeCard({ object: 'card', name: 'Teste', type_line: tipo, mana_cost: '{B}', cmc: 1, oracle_text: t, keywords: [] }));
  assert.equal(le('Target opponent sacrifices a creature of their choice, mills two cards, and loses 3 life.').completa, false, 'só descartar e perder vida seguem o alvo');
  assert.equal(le('Target opponent sacrifices a creature or artifact of their choice.').completa, false, '"creature or artifact" não é o mesmo pedido');
  assert.equal(le('Return target legendary creature card from your graveyard to the battlefield with a -1/-1 counter on it.').completa, false, '"legendary" não é "nonlegendary"');
  assert.equal(le('Return target nonlegendary creature card from your graveyard to the battlefield with a +1/-1 counter on it.').completa, false);
  assert.equal(le('You gain 2 life, draw a card for each creature they control.').completa, false, 'pronome de outro objeto fica fora');
  assert.equal(le('Until end of turn, draw two cards.').completa, false);
  eq(le('Target player discards a card and loses 2 life.').script.effects, [{ do: 'discard', amount: 1, target: 'player' }, { do: 'lose', amount: 2, target: 'first-target' }]);
  eq(le('You gain 3 life, scry 2.').script.effects, [{ do: 'gain', amount: 3 }, { do: 'scry', amount: 2 }]);
  const sc = S.validateScript({ name: 'Teste', effects: [{ do: 'reanimate', target: 'self-source', comMarcador: 'm1m1' }] });
  assert.ok(sc.length, 'comMarcador só na reanimação com alvo');
});

// ── partidas pelo caminho do app (as três sem script à mão: jogam pelo script lido) ──
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: [...mana_cost.matchAll(/\{([^}]+)\}/g)].length, keywords: [], oracle_text: '', colors: [], ...extra });
const C = {
  [AR]: oficial(AR), [PE]: oficial(PE), [FM]: oficial(FM),
  Pantano: c0('Pantano', 'Basic Land — Swamp', '', { oracle_text: '({T}: Add {B}.)' }),
  Planicie: c0('Planicie', 'Basic Land — Plains', '', { oracle_text: '({T}: Add {W}.)' }),
  Ilha: c0('Ilha', 'Basic Land — Island', '', { oracle_text: '({T}: Add {U}.)' }),
  Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2', colors: ['G'] }),
  Fragil: c0('Fragil', 'Creature — Wall', '{W}', { power: '0', toughness: '1', colors: ['W'] }),
  Lenda: c0('Lenda', 'Legendary Creature — Human', '{1}{B}', { power: '3', toughness: '3', colors: ['B'] }),
  Andarilho: c0('Andarilho', 'Legendary Planeswalker — Teste', '{2}{B}', { loyalty: '3', colors: ['B'] }),
  Exila: c0('Exila', 'Instant', '{B}'),
};
const SCRIPTS = { Exila: { name: 'Exila', effects: [{ do: 'mover', target: { zona: 'graveyard' }, para: 'exile' }], example: { target: 'none', expect: { selfLife: 0 } } } };
const act = (s, a) => { const r = E.apply(s, a); if (r.error) throw new Error(JSON.stringify(r.error)); return r.state; };
const legais = (s, p, f = () => true) => E.legalActions(s, p).filter(f);
function passaAte(s, fim, max = 400) {
  for (let i = 0; i < max && !fim(s); i++) { const pd = s.pending;
    if (pd && pd.kind === 'discard' && pd.reason !== 'effect') s = act(s, { t: 'discard', p: pd.p, oid: s.zones[pd.p].hand[0] });
    else if (pd && pd.kind === 'attackers') s = act(s, { t: 'attack', p: pd.p, attackers: [] });
    else if (pd && pd.kind === 'blockers') s = act(s, { t: 'block', p: pd.p, blocks: [] });
    else if (pd) return s; else s = act(s, { t: 'pass', p: s.turn.priority }); }
  return s;
}
function poe(s, p, name, zone = 'battlefield') {
  s = J(s); const oid = s.zones[p].library.find(o => s.objects[o].name === name); assert.ok(oid, `${name} no grimório de ${p}`);
  s.zones[p].library = s.zones[p].library.filter(o => o !== oid); s.zones[p][zone].push(oid);
  Object.assign(s.objects[oid], { zone, controller: p, tapped: false });
  if (zone === 'battlefield') s.objects[oid].sick = false;
  return [s, oid];
}
const DECK = [AR, PE, FM, 'Urso', 'Fragil', 'Lenda', 'Andarilho', 'Exila'].map(name => ({ name, qty: 3, zone: 'main' }))
  .concat([{ name: 'Pantano', qty: 10, zone: 'main' }, { name: 'Planicie', qty: 6, zone: 'main' }, { name: 'Ilha', qty: 4, zone: 'main' }]);
function mesa(seed = 5) {
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SCRIPTS, players: [{ name: 'A', deck: DECK }, { name: 'B', deck: DECK }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p, cor, n) => { s = J(s); s.players[p].pool[cor] += n; return s; };
const resolve = s => passaAte(s, x => !!x.pending || !x.stack.length);

/** Põe o Archon na mão e conjura (oito de mana preta); para na primeira decisão ou com a pilha vazia. */
function conjuraArchon(s) {
  let a; [s, a] = poe(s, 0, AR, 'hand'); s = mana(s, 0, 'B', 8);
  s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === a)[0]);
  return [resolve(s), a];
}

test('CR 701.21a + 608.2c · Archon of Cruelty entra: o oponente escolhe entre criatura e planeswalker, descarta uma, perde 3; você compra uma e ganha 3', () => {
  let s = mesa(); let u, w; [s, u] = poe(s, 1, 'Urso'); [s, w] = poe(s, 1, 'Andarilho'); [s] = poe(s, 1, 'Exila', 'hand'); s.objects[w].counters = { loyalty: 3 };
  const mao1 = s.zones[1].hand.length, mao0 = s.zones[0].hand.length, vida = [s.players[0].life, s.players[1].life];
  let a; [s, a] = conjuraArchon(s);
  assert.equal(s.pending && s.pending.kind, 'sacrifice', 'o oponente escolhe o que sacrificar'); assert.equal(s.pending.p, 1);
  eq([...s.pending.options].sort(), [u, w].sort(), 'criatura ou planeswalker, do campo dele');
  s = resolve(act(s, legais(s, 1, x => x.oid === w)[0]));
  assert.equal(s.pending && s.pending.kind, 'discard', 'depois descarta'); eq([s.pending.p, s.pending.n], [1, 1]);
  const d = s.zones[1].hand[0]; s = resolve(act(s, { t: 'discard', p: 1, oid: d }));
  eq([s.objects[w].zone, s.objects[u].zone, s.objects[d].zone, s.objects[a].zone], ['graveyard', 'battlefield', 'graveyard', 'battlefield']);
  eq([s.zones[1].hand.length, s.zones[0].hand.length], [mao1 - 1, mao0 + 1], 'ele descartou uma; você comprou uma (o Archon saiu da mão antes)');
  eq([s.players[0].life, s.players[1].life], [vida[0] + 3, vida[1] - 3]);
});

test('CR 701.21a · Archon: oponente sem criatura nem planeswalker — o resto acontece; com uma só, ela vai sem pergunta', () => {
  let s = mesa(); [s] = poe(s, 1, 'Exila', 'hand'); const vida1 = s.players[1].life;
  [s] = conjuraArchon(s);
  assert.equal(s.pending && s.pending.kind, 'discard', 'sem o que sacrificar, segue para o descarte');
  s = resolve(act(s, { t: 'discard', p: 1, oid: s.zones[1].hand[0] }));
  eq([s.players[1].life, !!s.pending, s.stack.length], [vida1 - 3, false, 0]);
  let s2 = mesa(); let u; [s2, u] = poe(s2, 1, 'Urso'); s2 = J(s2); s2.zones[1].hand = []; // mão vazia: não há o que descartar
  [s2] = conjuraArchon(s2);
  eq([s2.objects[u].zone, !!s2.pending, s2.players[1].life], ['graveyard', false, vida1 - 3], 'uma opção só: o motor não pergunta');
});

test('CR 508.1 + 603.2 · Archon ataca: o gatilho de ataque faz tudo de novo', () => {
  let s = mesa(); let a; [s, a] = poe(s, 0, AR); let u; [s, u] = poe(s, 1, 'Urso'); s = J(s); s.zones[1].hand = [];
  const vida = [s.players[0].life, s.players[1].life], mao0 = s.zones[0].hand.length;
  s = passaAte(s, x => !!x.pending && x.pending.kind === 'attackers', 60);
  s = act(s, { t: 'attack', p: 0, attackers: [a] }); s = resolve(s);
  eq([s.objects[u].zone, s.players[0].life, s.players[1].life, s.zones[0].hand.length], ['graveyard', vida[0] + 3, vida[1] - 3, mao0 + 1]);
});

test('CR 603.3d · Archon: o gatilho de entrada mira o oponente (você não é alvo)', () => {
  let s = mesa(); let a; [s, a] = poe(s, 0, AR, 'hand'); s = mana(s, 0, 'B', 8);
  s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === a)[0]);
  s = passaAte(s, x => x.stack.some(i => x.objects[i] && x.objects[i].ability) || !!x.pending, 20);
  const g = s.stack.map(i => s.objects[i]).find(o => o.ability);
  assert.ok(g, 'o gatilho de entrada na pilha'); eq((g.targets || []).map(t => t.player), [1], 'mira o oponente');
});

test('CR 122.6 + 115.1 · Persist devolve a criatura não lendária com um marcador −1/−1; a lendária não é alvo', () => {
  let s = mesa(); let u, l, p; [s, u] = poe(s, 0, 'Urso', 'graveyard'); [s, l] = poe(s, 0, 'Lenda', 'graveyard'); [s, p] = poe(s, 0, PE, 'hand');
  s = mana(s, 0, 'B', 2);
  const casts = legais(s, 0, x => x.t === 'cast' && x.oid === p);
  const alvos = [...new Set(casts.flatMap(x => (x.targets || []).map(t => t.oid)))];
  assert.ok(alvos.includes(u), 'o Urso é alvo'); assert.ok(!alvos.includes(l), 'a Lenda não é alvo (nonlegendary)');
  s = resolve(act(s, casts.find(x => x.targets[0].oid === u)));
  eq([s.objects[u].zone, s.objects[u].controller, (s.objects[u].counters || {}).m1m1, s.objects[p].zone], ['battlefield', 0, 1, 'graveyard']);
});

test('CR 704.5f · Persist numa criatura de resistência 1: ela entra com o marcador e morre', () => {
  let s = mesa(); let f, p; [s, f] = poe(s, 0, 'Fragil', 'graveyard'); [s, p] = poe(s, 0, PE, 'hand'); s = mana(s, 0, 'B', 2);
  s = resolve(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === p && x.targets[0].oid === f)[0]));
  eq(s.objects[f].zone, 'graveyard');
});

test('CR 608.2b · Persist: o alvo exilado em resposta — nada volta, e nenhuma marca sobra na carta', () => {
  let s = mesa(); let u, p, e; [s, u] = poe(s, 0, 'Urso', 'graveyard'); [s, p] = poe(s, 0, PE, 'hand'); [s, e] = poe(s, 0, 'Exila', 'hand');
  s = mana(s, 0, 'B', 3);
  s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === p && x.targets[0].oid === u)[0]);
  s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === e && (x.targets || []).some(y => y.oid === u))[0]);
  s = resolve(s);
  eq([s.objects[u].zone, !!s.objects[u].entraComK], ['exile', false]);
});

test('CR 608.2c + 702.34 · Faithful Mending: ganha 2, compra 2 e descarta 2 (você escolhe); do cemitério pelo flashback, depois exilada', () => {
  let s = mesa(); let f; [s, f] = poe(s, 0, FM, 'hand'); s = mana(s, 0, 'W', 1); s = mana(s, 0, 'U', 1);
  const vida = s.players[0].life, mao = s.zones[0].hand.length;
  s = resolve(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === f)[0]));
  assert.equal(s.pending && s.pending.kind, 'discard'); eq([s.pending.p, s.pending.n], [0, 2]);
  assert.equal(s.zones[0].hand.length, mao - 1 + 2, 'comprou duas antes de descartar');
  for (let k = 0; k < 2; k++) s = act(s, { t: 'discard', p: 0, oid: s.zones[0].hand[0] });
  s = resolve(s);
  eq([s.players[0].life, s.zones[0].hand.length, s.objects[f].zone], [vida + 2, mao - 1, 'graveyard']);
  s = mana(s, 0, 'W', 1); s = mana(s, 0, 'U', 1); s = mana(s, 0, 'B', 1);
  const fb = legais(s, 0, x => x.t === 'cast' && x.oid === f);
  assert.ok(fb.length, 'o flashback é oferecido do cemitério');
  s = resolve(act(s, fb[0])); for (let k = 0; s.pending && s.pending.kind === 'discard' && k < 2; k++) s = act(s, { t: 'discard', p: 0, oid: s.zones[0].hand[0] });
  s = resolve(s);
  eq([s.players[0].life, s.objects[f].zone], [vida + 4, 'exile']);
});
