// M-633 · rotina Motor contínuo · campanha Modern, ordem gulosa (coleta de 13/11/2026 16h40 UTC): com a fila do trem (M-625 a M-632),
// Theorist's Sanctum é a única pendência de 8 listas Modern (26 no total; também Standard e Pioneer).
// Regra nova: 701.4a contemplar (behold) na entrada do terreno — "As this land enters, you may behold a Jace. If you don't, this land
// enters tapped." Contemplar um Jace é revelar uma carta Jace da mão ou escolher uma permanente Jace sua (a ficha do empoderar Jace
// conta). Jogada da mão, a escolha vem no botão (uma oferta por nome); posta por efeito (busca), contempla sozinha um Jace seu no campo
// (escolher não revela nada) e, com um Jace só na mão, entra virada (mesma simplificação do Snarl, M-252). Texto da API da Scryfall
// pela coleta de 13/11 (.listas/oficiais-revisadas.json). Tudo falha no motor anterior: a carta não tinha script nem o motor contemplar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadModules } from './_load.mjs';

const M = loadModules(), E = M.engine, S = M.scripts, SF = M.scryfall;
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const TS = "Theorist's Sanctum";
const oficial = n => { const o = OF.find(x => x.name === n); assert.ok(o, `${n} em .listas/oficiais-revisadas.json`);
  return SF.normalizeCard({ object: 'card', layout: 'normal', ...o, cmc: 0, colors: [] }); };
const J = x => JSON.parse(JSON.stringify(x));

test('M-633 · o texto da Scryfall de 13/11 guardado; script à mão válido e cobertura completa', () => {
  const o = OF.find(x => x.name === TS);
  assert.match(o.fonte, /api\.scryfall\.com/); assert.equal(o.consulta, '2026-11-13');
  assert.equal(o.type_line, 'Land — Island');
  assert.equal(o.oracle_text, "({T}: Add {U}.)\nAs this land enters, you may behold a Jace. If you don't, this land enters tapped. (To behold a Jace, choose a Jace you control or reveal a Jace card from your hand.)\n{2}{U}, {T}: Empower Jace 2.");
  assert.ok(S.SCRIPTS[TS], 'tem script'); assert.equal(S.validateScript(S.SCRIPTS[TS]).length, 0);
  assert.equal(S.coverage(oficial(TS), S.SCRIPTS, TS).level, 'completo');
});

test('M-633 · validador: contemplaM é uma lista de subtipos', () => {
  const base = { name: 'Teste', produces: [['U']], example: { action: 'etb', target: 'none', expect: { attached: false } } };
  const com = v => ({ ...base, entra: [{ afetados: 'self', virada: { aMenosQue: { contemplaM: v } } }] });
  assert.ok(S.validateScript(com([])).length, 'lista vazia');
  assert.ok(S.validateScript(com('Jace')).length, 'texto solto');
  assert.ok(S.validateScript(com([3])).length, 'não é subtipo');
  assert.equal(S.validateScript(com(['Jace'])).length, 0);
  assert.equal(S.validateScript(com(['Elf', 'Dragon'])).length, 0);
});

// ── partidas ──
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: [...mana_cost.matchAll(/\{([^}]+)\}/g)].reduce((n, [, x]) => n + (/^\d+$/.test(x) ? +x : 1), 0), keywords: [], oracle_text: '', colors: [], ...extra });
const C = {
  [TS]: oficial(TS),
  Island: c0('Island', 'Basic Land — Island', '', { oracle_text: '({T}: Add {U}.)' }),
  'Jace Teste': c0('Jace Teste', 'Legendary Planeswalker — Jace', '{2}{U}{U}', { loyalty: '3', colors: ['U'] }),
  'Liliana Teste': c0('Liliana Teste', 'Legendary Planeswalker — Liliana', '{1}{B}{B}', { loyalty: '3', colors: ['B'] }),
  'Busca Ilha': c0('Busca Ilha', 'Sorcery', '{1}', {}),
  'Shineshadow Snarl': c0('Shineshadow Snarl', 'Land', '', { oracle_text: "As this land enters, you may reveal a Plains or Swamp card from your hand. If you don't, this land enters tapped.\n{T}: Add {W} or {B}." }),
  Plains: c0('Plains', 'Basic Land — Plains', '', { oracle_text: '({T}: Add {W}.)' }),
};
const ex = { example: { target: 'none', expect: { selfLife: 0 } } };
const lea = [{ cost: 1, label: '+1', effects: [{ do: 'draw', amount: 1 }] }];
const SCR = { 'Jace Teste': { name: 'Jace Teste', loyalty: lea, ...ex }, 'Liliana Teste': { name: 'Liliana Teste', loyalty: lea, ...ex },
  'Busca Ilha': { name: 'Busca Ilha', effects: [{ do: 'search', amount: 1, filter: { subtypes: ['Island'] }, to: 'battlefield' }], ...ex } };
const act = (s, a) => { const r = E.apply(s, a); if (r.error) throw new Error(JSON.stringify(r.error)); return r.state; };
const recusa = (s, a, re) => { const r = (() => { try { return E.apply(s, a); } catch (e) { return { error: { message: e.message } }; } })(); assert.ok(r.error, `devia recusar ${JSON.stringify(a)}`); if (re) assert.match(JSON.stringify(r.error), re); };
const comEventos = (s, a) => { const r = E.apply(s, a); if (r.error) throw new Error(JSON.stringify(r.error)); return r; };
function passaAte(s, fim, max = 400) {
  for (let i = 0; i < max && !fim(s); i++) { const pd = s.pending;
    if (pd && pd.kind === 'discard' && pd.reason !== 'effect') s = act(s, { t: 'discard', p: pd.p, oid: s.zones[pd.p].hand[0] });
    else if (pd && pd.kind === 'attackers') s = act(s, { t: 'attack', p: pd.p, attackers: [] });
    else if (pd && pd.kind === 'blockers') s = act(s, { t: 'block', p: pd.p, blocks: [] });
    else if (pd) return s; else s = act(s, { t: 'pass', p: s.turn.priority }); }
  return s;
}
function poe(s, p, name, zone = 'battlefield') {
  s = J(s);
  const from = ['library', 'hand', 'graveyard'].map(z => s.zones[p][z]).find(z => z.some(o => s.objects[o].name === name));
  if (!from) throw new Error(name + ' ausente');
  const oid = from.find(o => s.objects[o].name === name); from.splice(from.indexOf(oid), 1); s.zones[p][zone].push(oid);
  Object.assign(s.objects[oid], { zone, sick: false, tapped: false, controller: p });
  if (zone === 'battlefield' && s.facts[name].types.includes('planeswalker')) s.objects[oid].counters = { ...(s.objects[oid].counters || {}), loyalty: 3 };
  return [s, oid];
}
const limpaMao = (s, p) => { s = J(s); for (const oid of s.zones[p].hand.slice()) { s.zones[p].hand.splice(s.zones[p].hand.indexOf(oid), 1); s.zones[p].library.unshift(oid); s.objects[oid].zone = 'library'; } return s; };
const resolve = s => { for (let i = 0; i < 60 && (s.stack.length || s.pending); i++) { if (s.pending) return s; s = act(s, { t: 'pass', p: s.turn.priority }); } return s; };
const terras = (s, p, n) => { let o; for (let i = 0; i < n; i++) [s, o] = poe(s, p, 'Island'); return s; };
function mesa() {
  const d = ns => ns.map(name => ({ name, qty: 6, zone: 'main' }));
  const todos = [TS, 'Island', 'Jace Teste', 'Liliana Teste', 'Busca Ilha', 'Shineshadow Snarl', 'Plains'];
  let s = E.createGame({ format: 'livre', seed: 633, mode: 'full', cards: C, scripts: SCR, first: 0, players: [{ name: 'A', deck: d(todos) }, { name: 'B', deck: d(todos) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  s = limpaMao(s, 0); s = limpaMao(s, 1);
  return s;
}
const jogadas = (s, p, oid) => J(E.legalActions(s, p).filter(a => a.t === 'play_land' && a.oid === oid));

test('M-633 · 701.4a: sem Jace na mão nem no campo, a terra só se joga virada', () => {
  let s = mesa(), ts;
  [s, ts] = poe(s, 0, TS, 'hand'); [s] = poe(s, 0, 'Liliana Teste'); // outro planeswalker não é Jace
  const of = jogadas(s, 0, ts);
  assert.deepEqual(of.map(a => a.revela ?? null), [null]);
  s = act(s, { t: 'play_land', p: 0, oid: ts });
  assert.equal(s.objects[ts].zone, 'battlefield'); assert.equal(s.objects[ts].tapped, true);
  assert.equal(s.objects[ts].jogadaAoEntrarM, undefined, 'a marca da jogada não fica no objeto');
});

test('M-633 · 701.4a: com um Jace na mão, a mesa oferece jogar virada ou desvirada revelando; recusar contemplar entra virada', () => {
  let s = mesa(), ts, j1, j2;
  [s, ts] = poe(s, 0, TS, 'hand'); [s, j1] = poe(s, 0, 'Jace Teste', 'hand'); [s, j2] = poe(s, 0, 'Jace Teste', 'hand');
  const of = jogadas(s, 0, ts);
  assert.equal(of.length, 2, 'uma oferta por nome (duas cópias do mesmo Jace)');
  assert.ok(of.some(a => a.revela == null)); const rv = of.find(a => a.revela != null); assert.ok([j1, j2].includes(rv.revela));
  const virada = act(s, { t: 'play_land', p: 0, oid: ts });
  assert.equal(virada.objects[ts].tapped, true, '"you may": sem contemplar, entra virada');
  const r = comEventos(s, { t: 'play_land', p: 0, oid: ts, revela: j1 });
  assert.equal(r.state.objects[ts].tapped, false, 'contemplou: entra desvirada');
  assert.ok(r.events.some(e => e.do === 'reveal' && e.target === 'Jace Teste'), 'o registro mostra o Jace revelado');
  assert.equal(r.state.objects[j1].zone, 'hand', 'revelar não tira a carta da mão');
  let s2; [s2] = poe(s, 0, 'Liliana Teste', 'hand');
  const li = s2.zones[0].hand.find(o => s2.objects[o].name === 'Liliana Teste');
  recusa(s2, { t: 'play_land', p: 0, oid: ts, revela: li }, /revele/);
});

test('M-633 · 701.4a: um Jace seu no campo (inclusive a ficha do empoderar Jace) também se contempla; o do oponente não', () => {
  let s = mesa(), ts, jo;
  [s, ts] = poe(s, 0, TS, 'hand');
  let so; [so, jo] = poe(s, 1, 'Jace Teste');
  assert.deepEqual(jogadas(so, 0, ts).map(a => a.revela ?? null), [null], 'o Jace do oponente não serve');
  let sj, jc; [sj, jc] = poe(s, 0, 'Jace Teste');
  const of = jogadas(sj, 0, ts);
  assert.deepEqual(of.map(a => a.revela ?? null).sort(), [jc, null].sort());
  const t = act(sj, { t: 'play_land', p: 0, oid: ts, revela: jc });
  assert.equal(t.objects[ts].tapped, false); assert.equal(t.objects[jc].zone, 'battlefield');
  // a ficha "Jace" criada pela própria terra
  let s3 = terras(s, 0, 3), ts2; [s3, ts2] = poe(s3, 0, TS);
  s3 = act(s3, { t: 'activate', p: 0, oid: ts2, index: 0 }); s3 = resolve(s3);
  const ficha = Object.values(s3.objects).find(o => o.zone === 'battlefield' && o.token && o.name === 'Jace');
  assert.ok(ficha, 'empoderar Jace 2 cria a ficha'); assert.equal(ficha.counters.loyalty, 2);
  let ts3; [s3, ts3] = poe(s3, 0, TS, 'hand');
  assert.ok(jogadas(s3, 0, ts3).some(a => a.revela === ficha.oid), 'a ficha Jace é um Jace que você controla');
});

test('M-633 · {2}{U}, {T}: Empower Jace 2 — a segunda ativação põe na mesma ficha', () => {
  let s = mesa(), ts; s = terras(s, 0, 6); [s, ts] = poe(s, 0, TS);
  s = act(s, { t: 'activate', p: 0, oid: ts, index: 0 }); s = resolve(s);
  assert.equal(s.objects[ts].tapped, true);
  s = J(s); s.objects[ts].tapped = false;
  s = act(s, { t: 'activate', p: 0, oid: ts, index: 0 }); s = resolve(s);
  const fichas = Object.values(s.objects).filter(o => o.zone === 'battlefield' && o.token && o.name === 'Jace');
  assert.equal(fichas.length, 1); assert.equal(fichas[0].counters.loyalty, 4);
});

test('M-633 · posta por efeito (busca de Ilha): com um Jace seu no campo entra desvirada; sem ele, ou com o Jace só na mão, entra virada', () => {
  const busca = (s0) => { let s = terras(s0, 0, 1), b; [s, b] = poe(s, 0, 'Busca Ilha', 'hand');
    s = act(s, { t: 'cast', p: 0, oid: b }); s = resolve(s);
    assert.equal(s.pending && s.pending.kind, 'pick', 'quem busca escolhe');
    const alvo = s.pending.from.find(o => s.objects[o].name === TS); assert.ok(alvo, 'a Theorist\'s Sanctum é uma Ilha');
    s = act(s, { t: 'pick', p: 0, oid: alvo }); s = resolve(s);
    assert.equal(s.objects[alvo].zone, 'battlefield'); return s.objects[alvo]; };
  let s = mesa();
  assert.equal(busca(s).tapped, true, 'sem Jace');
  let sm; [sm] = poe(s, 0, 'Jace Teste', 'hand');
  assert.equal(busca(sm).tapped, true, 'Jace só na mão: a mesa ainda não pergunta no meio do efeito (declarado)');
  let sc; [sc] = poe(s, 0, 'Jace Teste');
  assert.equal(busca(sc).tapped, false, 'Jace seu no campo: escolher não revela nada, contempla sozinha');
});

test('M-633 · regressão M-252: o Snarl só aceita revelar da mão (uma Plains no campo não conta)', () => {
  let s = mesa(), sn, pl;
  [s, sn] = poe(s, 0, 'Shineshadow Snarl', 'hand'); [s] = poe(s, 0, 'Plains');
  assert.deepEqual(jogadas(s, 0, sn).map(a => a.revela ?? null), [null]);
  [s, pl] = poe(s, 0, 'Plains', 'hand');
  const of = jogadas(s, 0, sn); assert.ok(of.some(a => a.revela === pl));
  assert.equal(act(s, { t: 'play_land', p: 0, oid: sn, revela: pl }).objects[sn].tapped, false);
  assert.equal(act(s, { t: 'play_land', p: 0, oid: sn }).objects[sn].tapped, true);
});
