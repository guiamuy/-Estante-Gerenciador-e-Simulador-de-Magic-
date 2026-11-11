// M-617 · rotina Motor contínuo, campanha Modern (ordem gulosa c): cinco cartas que, cada uma, eram a única que faltava numa lista
// Modern do catálogo (cobertura/modern.json do ramo catalogo, 10/11/2026). Texto da API da Scryfall (cards/collection) de 10/11/2026.
// - Hall of Storm Giants lida por inteiro: "If you control two or more other lands, this land enters tapped" (305.7, 614.1c) e
//   "becomes a 7/7 blue Giant creature with ward {3}" — a salvaguarda ganha com duração (702.21a, 611.2a), nova no motor.
// - Barbarian Ring, Pest Control, Strix Serenade e Secret Identity por script à mão.
// Os testes de Hall falham no motor anterior (não lia a entrada nem a salvaguarda temporária); os outros, sem os scripts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadModules } from './_load.mjs';

const M = loadModules(), E = M.engine, S = M.scripts, SF = M.scryfall;
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const J = x => JSON.parse(JSON.stringify(x));
const act = (s, a) => { const r = E.apply(s, a); if (r.error) throw new Error(JSON.stringify(r.error)); return r.state; };
const legais = (s, p, f = () => true) => E.legalActions(s, p).filter(f);
const mv = c => [...String(c).matchAll(/\{([^}]+)\}/g)].reduce((n, [, x]) => n + (/^\d+$/.test(x) ? +x : 1), 0);
const carta = (name, type_line, mana_cost, oracle_text = '', extra = {}) => SF.normalizeCard({ object: 'card', layout: 'normal', name, type_line, mana_cost, cmc: mv(mana_cost), oracle_text, keywords: [], colors: [], ...extra });

// Texto da Scryfall de 10/11/2026 (cobertura/modern.json, geradoEm 2026-11-10T21:48 UTC)
const TXT = {
  'Barbarian Ring': ['Land', '', '{T}: Add {R}. This land deals 1 damage to you.\nThreshold — {R}, {T}, Sacrifice this land: It deals 2 damage to any target. Activate only if there are seven or more cards in your graveyard.'],
  'Pest Control': ['Sorcery', '{W}{B}', 'Destroy all nonland permanents with mana value 1 or less.\nCycling {2} ({2}, Discard this card: Draw a card.)'],
  'Strix Serenade': ['Instant', '{U}', 'Counter target artifact, creature, or planeswalker spell. Its controller creates a 2/2 blue Bird creature token with flying.'],
  'Secret Identity': ['Instant', '{U}', 'Choose one —\n• Conceal — Until end of turn, target creature you control becomes a Citizen with base power and toughness 1/1 and gains hexproof.\n• Reveal — Until end of turn, target creature you control becomes a Hero with base power and toughness 3/4 and gains flying and vigilance.'],
};
const HALL = 'Hall of Storm Giants';
const hall = () => { const o = OF.find(x => x.name === HALL); assert.ok(o, `${HALL} em .listas/oficiais-revisadas.json`); return SF.normalizeCard({ object: 'card', layout: 'normal', ...o, cmc: 0, colors: [] }); };
const C = {
  [HALL]: hall(),
  ...Object.fromEntries(Object.entries(TXT).map(([n, [t, m, o]]) => [n, carta(n, t, m, o)])),
  Forest: carta('Forest', 'Basic Land — Forest', '', '({T}: Add {G}.)'),
  Island: carta('Island', 'Basic Land — Island', '', '({T}: Add {U}.)'),
  Urso: carta('Urso', 'Creature — Bear', '{1}{G}', '', { power: '2', toughness: '2', colors: ['G'] }),
  Elfo: carta('Elfo', 'Creature — Elf', '{G}', '', { power: '1', toughness: '1', colors: ['G'] }),
  Anel: carta('Anel', 'Artifact', '{1}', ''),
  Raio: carta('Raio', 'Instant', '{R}', 'Raio deals 3 damage to any target.', { colors: ['R'] }),
  Choque: carta('Choque', 'Instant', '{R}', 'Choque deals 2 damage to any target.', { colors: ['R'] }),
};
const ex = { example: { target: 'none', expect: { selfLife: 0 } } };
const SC = { Urso: { name: 'Urso', ...ex }, Elfo: { name: 'Elfo', ...ex }, Anel: { name: 'Anel', ...ex },
  Raio: { name: 'Raio', effects: [{ do: 'damage', amount: 3, target: 'any' }], example: { target: 'opponent', expect: { opponentLife: -3 } } },
  Choque: { name: 'Choque', effects: [{ do: 'damage', amount: 2, target: 'any' }], example: { target: 'opponent', expect: { opponentLife: -2 } } } };

/** Partida em modo assistido sem conferência de mana, parada no main1 do jogador 0 (o primeiro), mãos vazias. */
function partida(seed = 617) {
  const nomes = Object.keys(C);
  const deck = nomes.map(name => ({ name, qty: 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'assisted', manaCheck: false, cards: C, scripts: SC, first: 0, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  for (let i = 0; i < 40 && !(s.turn.active === 0 && s.turn.step === 'main1' && !s.stack.length && !s.pending); i++) s = act(s, { t: 'pass', p: s.turn.priority });
  s = J(s); for (let p = 0; p < 2; p++) for (const oid of s.zones[p].hand.splice(0)) { s.zones[p].library.unshift(oid); s.objects[oid].zone = 'library'; }
  return s;
}
function poe(s, p, name, zone = 'battlefield') {
  s = J(s);
  const oid = ['library', 'hand', 'graveyard'].flatMap(z => s.zones[p][z]).find(o => s.objects[o].name === name);
  if (!oid) throw new Error(name + ' ausente');
  const de = s.zones[p][s.objects[oid].zone]; de.splice(de.indexOf(oid), 1); s.zones[p][zone].push(oid);
  Object.assign(s.objects[oid], { zone, sick: false, tapped: false, controller: p }); return [s, oid];
}
const resolve = (s, escolhe = null) => { for (let i = 0; i < 40 && (s.stack.length || s.pending); i++) { if (s.pending) { if (!escolhe) return s; s = act(s, escolhe(s)); continue; } s = act(s, { t: 'pass', p: s.turn.priority }); } return s; };
const naMesa = (s, oid) => !!s.objects[oid] && s.objects[oid].zone === 'battlefield';
/** Passa até o turno seguinte (o fim de turno limpa o que dura "até o fim do turno"). */
const proximoTurno = s => { const t = s.turn.number; for (let i = 0; i < 80 && s.turn.number === t; i++) { const pd = s.pending;
  if (pd && pd.kind === 'attackers') s = act(s, { t: 'attack', p: pd.p, attackers: [] });
  else if (pd && pd.kind === 'blockers') s = act(s, { t: 'block', p: pd.p, blocks: [] });
  else if (pd && pd.kind === 'discard') s = act(s, { t: 'discard', p: pd.p, oid: s.zones[pd.p].hand[0] });
  else if (pd) s = act(s, legais(s, pd.p)[0]); else s = act(s, { t: 'pass', p: s.turn.priority }); } return s; };

// ───────────── Hall of Storm Giants ─────────────
test(`M-617 · ${HALL} joga no app: texto da Scryfall de 10/11 guardado, assinatura de APROVADAS igual e lida por inteiro`, () => {
  const c = hall(), o = OF.find(x => x.name === HALL);
  assert.match(o.fonte, /api\.scryfall\.com/); assert.equal(o.consulta, '2026-11-10');
  assert.ok(S.APROVADAS[HALL], 'em APROVADAS'); assert.equal(S.APROVADAS[HALL].leva, 'M-617');
  assert.equal(S.APROVADAS[HALL].texto, S.assinaturaRevisao(c), 'a assinatura é a do texto revisado');
  assert.equal(S.coverage(c, S.SCRIPTS, HALL).level, 'completo');
  const sc = S.scriptLido(c); assert.ok(sc, 'joga pelo script lido');
  assert.deepEqual(J(sc.entersTappedUnless), { maxOutrasTerras: 1 }, 'desvirada só com no máximo uma outra terra');
  const ef = sc.abilities[0].effects[0];
  assert.equal(sc.abilities[0].cost.mana, '{5}{U}');
  assert.deepEqual(J(ef.torna), { tipos: ['creature'], somaTipos: true, subtipos: ['Giant'], base: [7, 7] });
  assert.deepEqual(J(ef.cores), ['U']); assert.equal(ef.ward, '{3}', 'a salvaguarda vem no mesmo efeito'); assert.equal(ef.ate, undefined, 'até o fim do turno');
});

test('M-617 · 614.1c: "If you control two or more other lands, this land enters tapped" — com uma outra terra entra desvirada, com duas entra virada', () => {
  for (const [outras, virada] of [[0, false], [1, false], [2, true], [3, true]]) {
    let s = partida(), h; for (let i = 0; i < outras; i++) [s] = poe(s, 0, 'Island');
    [s, h] = poe(s, 0, HALL, 'hand');
    const jogar = legais(s, 0, a => a.oid === h && a.t !== 'cycle'); assert.ok(jogar.length, 'a mesa oferece jogar o terreno');
    s = resolve(act(s, jogar[0]));
    assert.equal(naMesa(s, h), true); assert.equal(s.objects[h].tapped, virada, `${outras} outra(s) terra(s): ${virada ? 'virada' : 'desvirada'}`);
  }
});

test('M-617 · 702.21a com duração: animada, vira 7/7 Gigante azul com salvaguarda {3}; o Raio de B dispara a salvaguarda; no turno seguinte volta a ser só terreno, sem salvaguarda', () => {
  let s = partida(), h; [s, h] = poe(s, 0, HALL);
  assert.equal(E.isCreature(s, s.objects[h]), false); assert.deepEqual(J(E.wardsDeK(s, s.objects[h])), [], 'terreno parado: sem salvaguarda');
  const ativa = legais(s, 0, a => a.t === 'activate' && a.oid === h); assert.ok(ativa.length, 'a mesa oferece animar');
  s = resolve(act(s, ativa[0]));
  const o = s.objects[h];
  assert.equal(E.isCreature(s, o), true, 'é criatura'); assert.ok(E.tiposDe(s, o).includes('land'), 'continua terreno');
  { const pt = E.stats(s, o); assert.deepEqual(Array.isArray(pt) ? pt.slice(0, 2) : [pt.power, pt.toughness], [7, 7]); }
  assert.match(E.linhaDeTipo(s, o), /Giant/); assert.deepEqual(J(E.coresDe(s, o)), ['U']);
  assert.deepEqual(J(E.wardsDeK(s, o)), ['{3}'], 'salvaguarda {3} enquanto dura o efeito');
  // B (no turno de A, com prioridade) mira o Gigante com o Raio: a salvaguarda dispara, de quem controla o Hall
  let r; [s, r] = poe(s, 1, 'Raio', 'hand');
  s = act(s, { t: 'pass', p: 0 }); assert.equal(s.turn.priority, 1, 'B recebe a prioridade');
  s = act(s, { t: 'cast', p: 1, oid: r, targets: [{ oid: h }] });
  assert.equal(s.stack.length, 2, 'Raio e a salvaguarda na pilha'); const topo = s.objects[s.stack[1]];
  assert.ok(topo.ability && topo.name === HALL && topo.controller === 0, 'a salvaguarda do Hall está no topo, de A');
  for (let i = 0; i < 8 && !s.pending && s.stack.length; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  assert.equal(s.pending && s.pending.kind, 'may_pay'); assert.equal(s.pending.p, 1, 'B decide se paga'); assert.equal(s.pending.cost, '{3}');
  const recusou = resolve(act(s, { t: 'decline', p: 1 }));
  assert.equal(recusou.objects[r].zone, 'graveyard'); assert.equal(recusou.objects[h].damage || 0, 0, 'recusar anula o Raio');
  const depois = proximoTurno(recusou);
  assert.equal(E.isCreature(depois, depois.objects[h]), false, 'no turno seguinte é só terreno'); assert.deepEqual(J(E.wardsDeK(depois, depois.objects[h])), [], 'a salvaguarda acabou com o efeito');
});

test('M-617 · 702.21a: a salvaguarda é do efeito, não da carta — sem animar, o Hall não tem salvaguarda nem é alvo do Choque', () => {
  let s = partida(), h, c; [s, h] = poe(s, 0, HALL); [s, c] = poe(s, 1, 'Choque', 'hand');
  s = act(s, { t: 'pass', p: 0 });
  const of = legais(s, 1, a => a.t === 'cast' && a.oid === c && (a.targets || []).some(t => t.oid === h));
  assert.equal(of.length, 0, 'terreno parado não é alvo de "any target" (115.4: criatura, planeswalker, batalha ou jogador)');
  assert.deepEqual(J(E.wardsDeK(s, s.objects[h])), [], 'nem tem salvaguarda');
});

test('M-617 · o leitor: "with ward {N}" só no fim de "becomes a … creature … It\'s still a land"; com palavra que o motor não lê, não lê', () => {
  const le = t => M.leitor.ler(carta('Teste', 'Land', '', t));
  const a = le("{2}{U}: Until end of turn, this land becomes a 3/3 blue Giant creature with ward {2}. It's still a land.");
  assert.equal(a.completa, true); assert.equal(a.script.abilities[0].effects[0].ward, '{2}');
  const b = le("{2}{U}: Until end of turn, this land becomes a 3/3 blue Giant creature with flying. It's still a land.");
  assert.equal(b.completa, true); assert.equal(b.script.abilities[0].effects[0].ward, undefined, 'sem salvaguarda quando o texto não diz');
  assert.equal(le('If you control two or more other lands, this land enters tapped.\n{T}: Add {U}.').script.entersTappedUnless.maxOutrasTerras, 1);
  assert.deepEqual(S.validateScript({ name: 'T', effects: [{ do: 'continuo', target: 'self-source', ward: 'três' }], example: ex.example }).filter(e => /ward/.test(e)).length > 0, true, 'salvaguarda inválida é barrada');
});

// ───────────── scripts à mão ─────────────
test('M-617 · as quatro por script à mão: texto da Scryfall de 10/11 no comentário, cobertura completa', () => {
  for (const n of Object.keys(TXT)) {
    const sc = S.SCRIPTS[n] || Object.values(S.SCRIPTS).find(x => x && x.name === n); assert.ok(sc, `${n} tem script`);
    assert.deepEqual(S.SCRIPT_ERRORS[n] || [], [], `${n} sem erro de validação`);
    assert.equal(S.coverage(C[n], S.SCRIPTS, n).level, 'completo', `${n} completa`);
  }
});

test('M-617 · Barbarian Ring: "{T}: Add {R}. This land deals 1 damage to you." e limiar: 2 de dano em qualquer alvo, só com sete cartas no cemitério', () => {
  let s = partida(), b; [s, b] = poe(s, 0, 'Barbarian Ring'); s = J(s); s.players[0].life = 20; s.players[1].life = 20;
  const ativa = x => legais(x, 0, a => a.t === 'activate' && a.oid === b);
  for (let i = 0; i < 6; i++) { const oid = s.zones[0].library.pop(); s.zones[0].graveyard.push(oid); s.objects[oid].zone = 'graveyard'; }
  assert.equal(ativa(s).length, 0, 'seis cartas no cemitério: ainda não');
  { const oid = s.zones[0].library.pop(); s.zones[0].graveyard.push(oid); s.objects[oid].zone = 'graveyard'; }
  const of = ativa(s).find(a => (a.targets || []).some(t => t.player === 1)); assert.ok(of, 'sete: ativa, mirando o oponente');
  const x = resolve(act(s, of));
  assert.equal(x.objects[b].zone, 'graveyard', 'sacrificada como custo'); assert.equal(x.players[1].life, 18, '2 de dano em B');
  // a mana: {R} e 1 de dano em quem a usa
  let m = J(s); const tap = E.legalActions(m, 0).find(a => a.t === 'tap_mana' && a.oid === b);
  assert.ok(tap, 'a terra é fonte de mana'); m = act(m, tap); assert.equal(m.players[0].life, 19, 'a mana custa 1 de vida'); assert.equal(m.players[0].pool.R, 1, 'adicionou {R}');
});

test('M-617 · Pest Control: destrói toda permanente que não é terreno com valor de mana 1 ou menos (as dos dois lados, ficha também); o resto fica', () => {
  let s = partida(), p, o = {}; [s, p] = poe(s, 0, 'Pest Control', 'hand');
  [s, o.elfoA] = poe(s, 0, 'Elfo'); [s, o.ursoA] = poe(s, 0, 'Urso'); [s, o.anelB] = poe(s, 1, 'Anel'); [s, o.elfoB] = poe(s, 1, 'Elfo'); [s, o.ilhaB] = poe(s, 1, 'Island'); [s, o.ursoB] = poe(s, 1, 'Urso');
  { s = J(s); const base = s.objects[o.anelB], oid = 'fichaB'; s.objects[oid] = { ...J(base), oid, name: 'Anel', token: true, zone: 'battlefield', controller: 1, owner: 1 }; s.zones[1].battlefield.push(oid); o.fichaB = oid; } // uma ficha que é cópia do Anel (valor de mana 1, 707.2): também sai
  s = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === p)[0]));
  for (const k of ['elfoA', 'anelB', 'elfoB', 'fichaB']) assert.equal(naMesa(s, o[k]), false, `${k} (valor 1) destruída`);
  for (const k of ['ursoA', 'ursoB', 'ilhaB']) assert.equal(naMesa(s, o[k]), true, `${k} fica (valor 2 ou terreno)`);
  // ciclar {2}: descarta e compra
  let t = partida(), q; [t, q] = poe(t, 0, 'Pest Control', 'hand'); const mao = t.zones[0].hand.length;
  const cy = legais(t, 0, a => a.t === 'cycle' && a.oid === q); assert.ok(cy.length, 'ciclar é oferecido');
  t = resolve(act(t, cy[0])); assert.equal(t.objects[q].zone, 'graveyard'); assert.equal(t.zones[0].hand.length, mao, 'descartou uma, comprou uma');
});

test('M-617 · Strix Serenade: B anula a mágica de criatura de A e A (quem a controlava) cria um Pássaro 2/2 azul com voar; mágica instantânea não é alvo', () => {
  let s = partida(), st, u; [s, st] = poe(s, 1, 'Strix Serenade', 'hand'); [s, u] = poe(s, 0, 'Urso', 'hand');
  s = act(s, { t: 'cast', p: 0, oid: u }); s = act(s, { t: 'pass', p: 0 });
  assert.equal(s.turn.priority, 1, 'B responde');
  const of = legais(s, 1, a => a.t === 'cast' && a.oid === st && (a.targets || []).some(t => t.oid === u)); assert.ok(of.length, 'o Urso na pilha é alvo');
  s = resolve(act(s, of[0]));
  assert.equal(s.objects[u].zone, 'graveyard', 'o Urso foi anulado');
  const passaros = s.zones[0].battlefield.map(x => s.objects[x]).filter(x => x.token && /Bird/.test(E.linhaDeTipo(s, x)));
  assert.equal(passaros.length, 1, 'A (quem controlava a mágica) criou um Pássaro');
  const pt = E.stats(s, passaros[0]); assert.deepEqual(Array.isArray(pt) ? pt.slice(0, 2) : [pt.power, pt.toughness], [2, 2]);
  assert.equal(E.hasKeyword(s, passaros[0], 'flying'), true); assert.deepEqual(J(E.coresDe(s, passaros[0])), ['U']);
  assert.equal(s.zones[1].battlefield.some(x => s.objects[x].token), false, 'B não ganha ficha');
  // o Choque de A na pilha não é artefato, criatura nem planeswalker
  let t = partida(), st2, ch; [t, st2] = poe(t, 1, 'Strix Serenade', 'hand'); [t, ch] = poe(t, 0, 'Choque', 'hand');
  t = act(t, { t: 'cast', p: 0, oid: ch, targets: [{ player: 1 }] }); t = act(t, { t: 'pass', p: 0 });
  assert.equal(t.turn.priority, 1);
  assert.equal(legais(t, 1, a => a.t === 'cast' && a.oid === st2 && (a.targets || []).some(x => x.oid === ch)).length, 0, 'a mágica instantânea não é alvo');
});

test('M-617 · Secret Identity: Disfarce deixa o Urso 1/1 Cidadão com resistência a magia; Revelação, 3/4 Herói com voar e vigilância; no turno seguinte volta a ser 2/2 Urso', () => {
  const st = (s, o) => { const x = E.stats(s, o); return Array.isArray(x) ? x.slice(0, 2) : [x.power, x.toughness]; };
  const conjura = (modo) => {
    let s = partida(), si, u; [s, si] = poe(s, 0, 'Secret Identity', 'hand'); [s, u] = poe(s, 0, 'Urso');
    const of = legais(s, 0, a => a.t === 'cast' && a.oid === si && (a.mode === modo || (a.modes || []).includes(modo)) && (a.targets || []).some(t => t.oid === u));
    assert.ok(of.length, `o modo ${modo + 1} mira o Urso`); return [resolve(act(s, of[0])), u];
  };
  { const [s, u] = conjura(0), o = s.objects[u];
    assert.deepEqual(st(s, o), [1, 1]); assert.equal(E.hasKeyword(s, o, 'hexproof'), true);
    assert.match(E.linhaDeTipo(s, o), /Citizen/); assert.doesNotMatch(E.linhaDeTipo(s, o), /Bear/, '205.1a: o subtipo novo troca os tipos de criatura');
    const d = proximoTurno(s); assert.deepEqual(st(d, d.objects[u]), [2, 2]); assert.match(E.linhaDeTipo(d, d.objects[u]), /Bear/); assert.equal(E.hasKeyword(d, d.objects[u], 'hexproof'), false); }
  { const [s, u] = conjura(1), o = s.objects[u];
    assert.deepEqual(st(s, o), [3, 4]); assert.equal(E.hasKeyword(s, o, 'flying'), true); assert.equal(E.hasKeyword(s, o, 'vigilance'), true);
    assert.match(E.linhaDeTipo(s, o), /Hero/); }
  // só criatura sua
  let s = partida(), si, ub; [s, si] = poe(s, 0, 'Secret Identity', 'hand'); [s, ub] = poe(s, 1, 'Urso');
  assert.equal(legais(s, 0, a => a.t === 'cast' && a.oid === si && (a.targets || []).some(t => t.oid === ub)).length, 0, 'a criatura de B não é alvo');
});
