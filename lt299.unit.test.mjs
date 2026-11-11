// M-620 · rotina Motor contínuo · campanha Modern, ordem gulosa: Detective's Phoenix e Fear of Missing Out são as duas únicas
// cartas que faltam em 46 listas Modern do catálogo (coleta de 11/11/2026; mais 29 com Flare of Malice e 10 com Ob Nixilis, the
// Adversary). Textos da API da Scryfall (cobertura/modern.json do ramo catalogo, 11/11/2026), guardados em .listas/oficiais-revisadas.json.
// Regras novas: 702.103a + 701.59a (custo de conceder com "Collect evidence N"), 601.2a (conjurar do cemitério pelo conceder; a
// própria carta já está na pilha e não serve de prova), 500.8 ("After this phase, there is an additional combat phase": o combate
// adicional vem logo depois da fase de combate, sem fase principal no meio), o evento "attacks for the first time each turn" e a
// condição de delírio no gatilho (603.4, ao disparar e ao resolver). Cada teste de partida falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadModules } from './_load.mjs';

const M = loadModules(), E = M.engine, S = M.scripts, SF = M.scryfall;
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const DP = "Detective's Phoenix", FO = 'Fear of Missing Out';
const CMC = { [DP]: 3, [FO]: 2 }, COR = { [DP]: ['R'], [FO]: ['R'] };
const oficial = n => { const o = OF.find(x => x.name === n); assert.ok(o, `${n} em .listas/oficiais-revisadas.json`);
  return SF.normalizeCard({ object: 'card', layout: 'normal', ...o, cmc: CMC[n], colors: COR[n] }); };
const J = x => JSON.parse(JSON.stringify(x));

test('M-620 · os dois textos da Scryfall de 11/11 guardados; as duas por script à mão, válidos e completos', () => {
  for (const n of [DP, FO]) { const o = OF.find(x => x.name === n); assert.match(o.fonte, /api\.scryfall\.com/); assert.equal(o.consulta, '2026-11-11');
    assert.ok(S.SCRIPTS[n], `${n} tem script`); assert.equal(S.validateScript(S.SCRIPTS[n]).length, 0, JSON.stringify(S.validateScript(S.SCRIPTS[n]))); assert.equal(S.coverage(oficial(n), S.SCRIPTS, n).level, 'completo'); }
  assert.equal(OF.find(x => x.name === DP).oracle_text, 'Bestow—{R}, Collect evidence 6. (To pay this bestow cost, pay {R} and exile cards with total mana value 6 or greater from your graveyard.)\nFlying, haste\nEnchanted creature gets +2/+2 and has flying and haste.\nYou may cast this card from your graveyard using its bestow ability.');
  assert.equal(OF.find(x => x.name === FO).oracle_text, 'When this creature enters, discard a card, then draw a card.\nDelirium — Whenever this creature attacks for the first time each turn, if there are four or more card types among cards in your graveyard, untap target creature. After this phase, there is an additional combat phase.');
  // o validador barra as formas novas mal escritas
  assert.ok(S.validateScript({ ...S.SCRIPTS[DP], bestow: { mana: '{R}', evidence: 0 } }).length > 0, 'provas do conceder: inteiro positivo');
  assert.ok(S.validateScript({ ...S.SCRIPTS[DP], bestow: { mana: '{R}', doCemiterio: 'sim' } }).length > 0, 'doCemiterio é marca');
});

// ── partidas ──
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: [...mana_cost.matchAll(/\{([^}]+)\}/g)].reduce((n, [, x]) => n + (/^\d+$/.test(x) ? +x : 1), 0), keywords: [], oracle_text: '', colors: [], ...extra });
const C = {
  [DP]: oficial(DP), [FO]: oficial(FO),
  Mountain: c0('Mountain', 'Basic Land — Mountain', '', { oracle_text: '({T}: Add {R}.)' }),
  Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2', colors: ['G'] }),
  Gigante: c0('Gigante', 'Creature — Giant', '{4}{G}{G}', { power: '6', toughness: '6', colors: ['G'] }),
  Estudo: c0('Estudo', 'Instant', '{U}', { colors: ['U'] }),
  Leitura: c0('Leitura', 'Sorcery', '{3}{U}', { colors: ['U'] }),
  Raio: c0('Raio', 'Instant', '{B}', { colors: ['B'] }),
  Fase: c0('Fase', 'Instant', '{R}', { colors: ['R'] }),
};
const SCR = {
  Urso: { name: 'Urso', example: { target: 'none', expect: { selfLife: 0 } } },
  Gigante: { name: 'Gigante', example: { target: 'none', expect: { selfLife: 0 } } },
  Estudo: { name: 'Estudo', effects: [{ do: 'draw', amount: 1 }], example: { target: 'none', expect: { handDelta: 0 } } },
  Leitura: { name: 'Leitura', effects: [{ do: 'draw', amount: 1 }], example: { target: 'none', expect: { handDelta: 0 } } },
  Raio: { name: 'Raio', effects: [{ do: 'destroy', target: 'creature' }], example: { target: 'enemy-creature', expect: { gone: true } } },
  Fase: { name: 'Fase', effects: [{ do: 'combate_extra_fase' }], example: { target: 'none', expect: { handDelta: 0 } } },
};
const act = (s, a) => { const r = E.apply(s, a); if (r.error) throw new Error(JSON.stringify(r.error)); return r.state; };
const recusa = (s, a, re) => { let r; try { r = E.apply(s, a); } catch (e) { r = { error: { message: e.message } }; } assert.ok(r.error, `devia recusar ${JSON.stringify(a)}`); if (re) assert.match(JSON.stringify(r.error), re); };
function passaAte(s, fim, max = 400) {
  for (let i = 0; i < max && !fim(s); i++) { const pd = s.pending;
    if (pd && pd.kind === 'discard' && pd.reason !== 'effect') s = act(s, { t: 'discard', p: pd.p, oid: s.zones[pd.p].hand[0] });
    else if (pd && pd.kind === 'attackers') s = act(s, { t: 'attack', p: pd.p, attackers: [] });
    else if (pd && pd.kind === 'blockers') s = act(s, { t: 'block', p: pd.p, blocks: [] });
    else if (pd) return s; else s = act(s, { t: 'pass', p: s.turn.priority }); }
  return s;
}
/** move a primeira carta com o nome, de qualquer zona fora do campo, para a zona pedida */
function poe(s, p, name, zone = 'battlefield') {
  s = J(s);
  const from = ['library', 'hand', 'graveyard'].map(z => s.zones[p][z]).find(z => z.some(o => s.objects[o].name === name));
  if (!from) throw new Error(name + ' ausente');
  const oid = from.find(o => s.objects[o].name === name); from.splice(from.indexOf(oid), 1); s.zones[p][zone].push(oid);
  Object.assign(s.objects[oid], { zone, sick: false, tapped: false, controller: p });
  return [s, oid];
}
const limpaMao = (s, p) => { s = J(s); for (const oid of s.zones[p].hand.slice()) { s.zones[p].hand.splice(s.zones[p].hand.indexOf(oid), 1); s.zones[p].library.unshift(oid); s.objects[oid].zone = 'library'; } return s; };
const limpaCemiterio = (s, p) => { s = J(s); for (const oid of s.zones[p].graveyard.slice()) { s.zones[p].graveyard.splice(s.zones[p].graveyard.indexOf(oid), 1); s.zones[p].library.unshift(oid); s.objects[oid].zone = 'library'; } return s; };
const resolve = s => { for (let i = 0; i < 40 && (s.stack.length || s.pending); i++) { if (s.pending) return s; s = act(s, { t: 'pass', p: s.turn.priority }); } return s; };
function mesa() {
  const d = ns => ns.map(name => ({ name, qty: 6, zone: 'main' }));
  const todos = [DP, FO, 'Mountain', 'Urso', 'Gigante', 'Estudo', 'Leitura', 'Raio', 'Fase'];
  let s = E.createGame({ format: 'livre', seed: 620, mode: 'full', cards: C, scripts: SCR, first: 0, players: [{ name: 'A', deck: d(todos) }, { name: 'B', deck: d(todos) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  for (let p = 0; p < 2; p++) { s = limpaMao(s, p); s = limpaCemiterio(s, p); }
  return s;
}
const bestowsDe = (s, p, oid) => E.legalActions(s, p).filter(a => a.t === 'cast' && a.oid === oid && a.bestow);
const castsDe = (s, p, oid) => E.legalActions(s, p).filter(a => a.t === 'cast' && a.oid === oid);
const somaMv = (s, oids) => oids.reduce((n, o) => n + (s.facts[s.objects[o].name].cmc || 0), 0);
/** responde a escolha do colher provas com as cartas pedidas */
function provas(s, oids) {
  assert.ok(s.pending && s.pending.kind === 'pick' && s.pending.label === 'colher provas', 'escolhe as provas');
  for (const o of oids) s = act(s, { t: 'pick', p: 0, oid: o });
  if (s.pending && s.pending.kind === 'pick') s = act(s, { t: 'pick_done', p: 0 });
  return s;
}

test('CR 702.103 · Detective’s Phoenix: conceder da mão por {R} + colher provas 6 (701.59); a encantada ganha +2/+2, voar e ímpeto', () => {
  let s = mesa(), ph, urso, m, g, lei;
  [s, ph] = poe(s, 0, DP, 'hand'); [s, urso] = poe(s, 0, 'Urso'); [s, m] = poe(s, 0, 'Mountain');
  // cemitério com 5 de valor: não basta
  [s, lei] = poe(s, 0, 'Leitura', 'graveyard'); { let e; [s, e] = poe(s, 0, 'Estudo', 'graveyard'); }
  assert.equal(somaMv(s, s.zones[0].graveyard), 5);
  assert.equal(bestowsDe(s, 0, ph).length, 0, 'sem 6 de valor no cemitério, não concede');
  assert.ok(castsDe(s, 0, ph).every(a => !a.bestow), 'o conjurar comum continua');
  [s, g] = poe(s, 0, 'Gigante', 'graveyard');
  const bw = bestowsDe(s, 0, ph);
  assert.ok(bw.length >= 1 && bw.every(a => a.targets.length === 1), 'conceder oferecido, com alvo');
  const noUrso = bw.find(a => a.targets[0].oid === urso || a.targets[0] === urso);
  assert.ok(noUrso, 'pode encantar o Urso');
  s = act(s, noUrso);
  assert.ok(s.objects[m].tapped, 'pagou {R}');
  s = provas(s, [g]);
  assert.equal(s.objects[g].zone, 'exile', 'o Gigante (6) foi exilado como prova');
  assert.equal(s.objects[lei].zone, 'graveyard', 'o resto fica');
  s = resolve(s);
  assert.equal(s.objects[ph].zone, 'battlefield');
  assert.equal(s.objects[ph].attachedTo, urso, 'entra como aura no Urso');
  const u = s.objects[urso];
  assert.deepEqual(J(E.stats(s, u)), { power: 4, toughness: 4 });
  assert.ok(E.hasKeyword(s, u, 'flying') && E.hasKeyword(s, u, 'haste'), 'voar e ímpeto concedidos');
  assert.ok(!E.isCreature(s, s.objects[ph]), 'concedida não é criatura');
});

test('CR 701.59 · Detective’s Phoenix do cemitério: só pelo conceder, e ela mesma não serve de prova (601.2a); sem provas, nada', () => {
  let s = mesa(), ph, urso, m, g, lei;
  [s, ph] = poe(s, 0, DP, 'graveyard'); [s, urso] = poe(s, 0, 'Urso'); [s, m] = poe(s, 0, 'Mountain');
  [s, lei] = poe(s, 0, 'Leitura', 'graveyard'); { let e; [s, e] = poe(s, 0, 'Estudo', 'graveyard'); }
  // Phoenix (3) + Leitura (4) + Estudo (1) = 8, mas sem ela são 5: não concede
  assert.equal(somaMv(s, s.zones[0].graveyard), 8);
  assert.equal(castsDe(s, 0, ph).length, 0, 'sem 6 fora ela mesma, nada do cemitério');
  recusa(s, { t: 'cast', p: 0, oid: ph, bestow: true, targets: [{ oid: urso }] });
  [s, g] = poe(s, 0, 'Raio', 'graveyard'); // +1 = 6 fora ela
  const cs = castsDe(s, 0, ph);
  assert.ok(cs.length >= 1, 'do cemitério, pelo conceder');
  assert.ok(cs.every(a => a.bestow), 'do cemitério só pelo conceder (nunca como criatura)');
  recusa(s, { t: 'cast', p: 0, oid: ph }); // o conjurar comum não vale do cemitério
  s = act(s, cs.find(a => (a.targets[0].oid || a.targets[0]) === urso));
  assert.equal(s.objects[ph].zone, 'stack');
  assert.ok(!s.pending.from.includes(ph), 'a própria Phoenix não é prova');
  s = provas(s, s.pending.from.slice());
  for (const o of s.zones[0].graveyard) assert.notEqual(s.objects[o].name, 'Leitura');
  s = resolve(s);
  assert.equal(s.objects[ph].attachedTo, urso, 'do cemitério para o Urso');
  assert.equal(E.stats(s, s.objects[urso]).power, 4);
  // a encantada morre: a Phoenix vira criatura (702.103f), com voar e ímpeto dela
  s = J(s); s.objects[urso].damage = 9; // dano letal: a ação de estado leva o Urso no próximo passe
  s = act(s, { t: 'pass', p: s.turn.priority });
  assert.equal(s.objects[urso].zone, 'graveyard');
  assert.equal(s.objects[ph].zone, 'battlefield'); assert.ok(E.isCreature(s, s.objects[ph]), 'volta a ser criatura');
  assert.ok(E.hasKeyword(s, s.objects[ph], 'flying') && E.hasKeyword(s, s.objects[ph], 'haste'));
});

/** A no main1 com FOMO no campo; cemitério de A com terreno, instantânea, feitiço e criatura (delírio) ou sem a criatura. */
function comFomo(delirio = true) {
  let s = mesa(), fo, urso, x;
  [s, fo] = poe(s, 0, FO); [s, urso] = poe(s, 0, 'Urso');
  for (const n of ['Mountain', 'Estudo', 'Leitura', ...(delirio ? ['Gigante'] : [])]) [s, x] = poe(s, 0, n, 'graveyard');
  s = J(s); s.objects[urso].tapped = true; // o Urso virado: o alvo natural do desvirar
  return { s, fo, urso };
}
const ateAtacantes = s => passaAte(s, x => !!x.pending && x.pending.kind === 'attackers');

test('M-620 · Fear of Missing Out: entra, descarta uma e compra uma (sem carta na mão, ainda compra)', () => {
  let s = mesa(), fo, m1, m2, est;
  [s, fo] = poe(s, 0, FO, 'hand'); [s, m1] = poe(s, 0, 'Mountain'); [s, m2] = poe(s, 0, 'Mountain'); [s, est] = poe(s, 0, 'Estudo', 'hand');
  s = act(s, castsDe(s, 0, fo)[0]); s = resolve(s);
  assert.equal(s.objects[fo].zone, 'battlefield');
  s = resolve(s);
  if (s.pending && s.pending.kind === 'discard') s = act(s, { t: 'discard', p: 0, oid: est });
  s = resolve(s);
  assert.equal(s.objects[est].zone, 'graveyard', 'descartou');
  assert.equal(s.zones[0].hand.length, 1, 'comprou uma');
  // mão vazia: só compra
  let s2 = mesa(), f2, a1, a2; [s2, f2] = poe(s2, 0, FO, 'hand'); [s2, a1] = poe(s2, 0, 'Mountain'); [s2, a2] = poe(s2, 0, 'Mountain');
  s2 = resolve(act(s2, castsDe(s2, 0, f2)[0])); s2 = resolve(s2);
  assert.ok(!s2.pending, 'nada a descartar, nada a perguntar'); assert.equal(s2.zones[0].hand.length, 1, 'comprou mesmo assim');
});

test('M-620 · Fear of Missing Out com delírio: o primeiro ataque desvira a criatura alvo e traz outro combate logo depois deste (500.8), sem principal no meio; no combate adicional ela não dispara de novo', () => {
  let { s, fo, urso } = comFomo(true);
  s = ateAtacantes(s);
  s = act(s, { t: 'attack', p: 0, attackers: [fo] });
  assert.ok(s.pending && s.pending.kind === 'pick_target' && s.pending.trigger.name === FO, 'o gatilho do primeiro ataque pede o alvo');
  assert.ok(s.pending.options.some(t => t.oid === urso), 'qualquer criatura serve de alvo');
  s = act(s, { t: 'pick_target', p: 0, index: s.pending.options.findIndex(t => t.oid === urso) });
  assert.equal(s.stack.length, 1, 'o gatilho na pilha');
  s = resolve(s);
  assert.equal(s.objects[urso].tapped, false, 'o Urso desvirou');
  assert.equal(s.combatesAposFaseM, 1, 'um combate adicional marcado');
  // segue até a próxima declaração de atacantes: tem de ser outro combate, sem passar pela principal 2
  const passos = [];
  for (let i = 0; i < 200 && !(s.pending && s.pending.kind === 'attackers'); i++) {
    passos.push(s.turn.step);
    if (s.pending && s.pending.kind === 'blockers') s = act(s, { t: 'block', p: s.pending.p, blocks: [] });
    else if (s.pending) break; else s = act(s, { t: 'pass', p: s.turn.priority });
  }
  assert.ok(s.pending && s.pending.kind === 'attackers' && s.turn.active === 0, 'outra declaração de atacantes no mesmo turno');
  assert.ok(!passos.includes('main2'), `sem principal no meio (${[...new Set(passos)].join(' → ')})`);
  assert.ok(passos.includes('combat_end'), 'o primeiro combate terminou');
  s = J(s); s.objects[fo].tapped = false; // (ela atacou virada: desvira à mão para atacar de novo)
  s = act(s, { t: 'attack', p: 0, attackers: [fo, urso] });
  assert.ok(!s.pending && s.stack.length === 0, 'no combate adicional, nada dispara: não é o primeiro ataque do turno');
  // depois do combate adicional vem a principal 2
  s = passaAte(s, x => x.turn.step === 'main2' || x.turn.active !== 0);
  assert.equal(s.turn.step, 'main2'); assert.equal(s.turn.active, 0);
  assert.ok(!s.combatesAposFaseM);
});

test('M-620 · Fear of Missing Out sem delírio não dispara; delírio perdido antes de resolver: o gatilho não faz nada (603.4)', () => {
  let { s, fo, urso } = comFomo(false);
  s = ateAtacantes(s);
  s = act(s, { t: 'attack', p: 0, attackers: [fo] });
  assert.ok(!s.pending && s.stack.length === 0, 'três tipos no cemitério: não dispara');
  // com delírio no disparo, mas o cemitério muda antes de resolver
  ({ s, fo, urso } = comFomo(true));
  s = ateAtacantes(s);
  s = act(s, { t: 'attack', p: 0, attackers: [fo] });
  assert.ok(s.pending && s.pending.kind === 'pick_target', 'com delírio, dispara');
  s = act(s, { t: 'pick_target', p: 0, index: s.pending.options.findIndex(t => t.oid === urso) });
  assert.equal(s.stack.length, 1);
  s = J(s); const gig = s.zones[0].graveyard.find(o => s.objects[o].name === 'Gigante');
  s.zones[0].graveyard.splice(s.zones[0].graveyard.indexOf(gig), 1); s.zones[0].exile.push(gig); s.objects[gig].zone = 'exile';
  s = resolve(s);
  assert.equal(s.objects[urso].tapped, true, 'não desvirou');
  assert.ok(!s.combatesAposFaseM, 'sem combate adicional');
});

test('M-620 · "after this phase" (500.8): numa fase principal não cria combate; no início do combate, outro combate logo depois deste; o combate extra de antes (Relentless Assault) segue igual', () => {
  assert.deepEqual(J(S.SCRIPTS['Relentless Assault'].effects), [{ do: 'desvira_atacantes' }, { do: 'combate_extra' }], 'o caminho da principal adicional não muda');
  assert.ok(Object.keys(S.EFFECTS).includes('combate_extra_fase'));
  let s = mesa(), fa, m1, m2;
  [s, fa] = poe(s, 0, 'Fase', 'hand'); [s, m1] = poe(s, 0, 'Mountain'); [s, m2] = poe(s, 0, 'Mountain');
  s = resolve(act(s, castsDe(s, 0, fa)[0]));
  assert.equal(s.objects[fa].zone, 'graveyard');
  assert.ok(!s.combatesAposFaseM, 'na principal: nada');
  // no início do combate: outro combate depois deste, e a principal 2 só no fim
  let s2 = mesa(), f2, a1;
  [s2, f2] = poe(s2, 0, 'Fase', 'hand'); [s2, a1] = poe(s2, 0, 'Mountain');
  s2 = act(s2, { t: 'pass', p: 0 }); s2 = act(s2, { t: 'pass', p: 1 }); // sai da principal 1
  assert.equal(s2.turn.step, 'combat_begin');
  if (s2.turn.priority !== 0) s2 = act(s2, { t: 'pass', p: s2.turn.priority });
  s2 = resolve(act(s2, castsDe(s2, 0, f2)[0]));
  assert.equal(s2.combatesAposFaseM, 1);
  const passos = [];
  for (let i = 0; i < 200 && s2.turn.active === 0 && s2.turn.step !== 'main2'; i++) { passos.push(s2.turn.step);
    const pd = s2.pending; if (pd && pd.kind === 'attackers') s2 = act(s2, { t: 'attack', p: pd.p, attackers: [] }); else if (pd) break; else s2 = act(s2, { t: 'pass', p: s2.turn.priority }); }
  assert.equal(s2.turn.step, 'main2');
  assert.equal(passos.filter((x, i) => x === 'combat_begin' && passos[i - 1] !== x).length, 2, `dois combates (${passos.join(' → ')})`);
});
