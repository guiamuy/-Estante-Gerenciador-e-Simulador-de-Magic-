// M-615 · rotina Motor contínuo · CR 701.21a: "sacrificar" escolhe entre as permanentes pelo tipo que elas têm agora (camadas), não pelo
// impresso. Antes, `sacrificeOptions` lia `facts[nome].types`: o terreno que virou criatura (Mutavault e companhia) não podia ser
// sacrificado por um édito de criatura, e o jogador que só tinha ele escapava do édito. Agora vale o seletor único (selTemTipo): o terreno
// animado é criatura, a virada para baixo é só criatura, o mesmo caminho para o édito, o custo e o "cada jogador sacrifica".
// Sheoldred's Edict (recusada na M-614 por isso; 19 listas Modern na coleta de 08/11/2026) passa a jogar pelo script lido, com o texto da
// API da Scryfall de 08/11/2026 (cobertura/<formato>.json do ramo catalogo, guardado em .listas/oficiais-revisadas.json). Os testes das
// partidas falham no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadModules } from './_load.mjs';

const M = loadModules(), E = M.engine, S = M.scripts, SF = M.scryfall;
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const N = "Sheoldred's Edict";
const edito = () => { const o = OF.find(x => x.name === N); assert.ok(o, `${N} em .listas/oficiais-revisadas.json`);
  return SF.normalizeCard({ object: 'card', layout: 'normal', ...o, cmc: 2, colors: ['B'] }); };

test(`M-615 · ${N} joga no app: texto da Scryfall de 08/11 guardado, assinatura de APROVADAS igual e cobertura completa`, () => {
  const c = edito(), o = OF.find(x => x.name === N);
  assert.match(o.fonte, /api\.scryfall\.com/); assert.equal(o.consulta, '2026-11-08');
  assert.equal(o.oracle_text, "Choose one —\n• Each opponent sacrifices a nontoken creature of their choice.\n• Each opponent sacrifices a creature token of their choice.\n• Each opponent sacrifices a planeswalker of their choice.");
  assert.ok(S.APROVADAS[N], 'em APROVADAS'); assert.equal(S.APROVADAS[N].leva, 'M-615');
  assert.equal(S.APROVADAS[N].texto, S.assinaturaRevisao(c), 'a assinatura é a do texto revisado');
  assert.equal(S.coverage(c, S.SCRIPTS, N).level, 'completo'); assert.ok(S.scriptLido(c), 'joga pelo script lido');
});

// ── partidas pelo caminho do app (o édito sem script à mão) ──
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: [...mana_cost.matchAll(/\{([^}]+)\}/g)].reduce((n, [, x]) => n + (/^\d+$/.test(x) ? +x : 1), 0), keywords: [], oracle_text: '', colors: [], ...extra });
const C = {
  [N]: edito(),
  Swamp: c0('Swamp', 'Basic Land — Swamp', '', { oracle_text: '({T}: Add {B}.)' }),
  Forest: c0('Forest', 'Basic Land — Forest', '', { oracle_text: '({T}: Add {G}.)' }),
  Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2', colors: ['G'] }),
  Vila: c0('Vila', 'Land', '', { oracle_text: "{T}: Add {C}.\n{1}: Vila becomes a 2/2 creature with all creature types until end of turn. It's still a land." }),
  Heroi: c0('Heroi', 'Legendary Planeswalker — Test', '{3}', { loyalty: '3' }),
};
const ex = { example: { target: 'none', expect: { selfLife: 0 } } };
const J = x => JSON.parse(JSON.stringify(x));
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
  s = J(s);
  const from = ['library', 'hand', 'graveyard'].map(z => s.zones[p][z]).find(z => z.some(o => s.objects[o].name === name));
  if (!from) throw new Error(name + ' ausente');
  const oid = from.find(o => s.objects[o].name === name); from.splice(from.indexOf(oid), 1); s.zones[p][zone].push(oid);
  Object.assign(s.objects[oid], { zone, sick: false, tapped: false, controller: p }); return [s, oid];
}
const limpaMao = (s, p) => { s = J(s); for (const oid of s.zones[p].hand.slice()) { s.zones[p].hand.splice(s.zones[p].hand.indexOf(oid), 1); s.zones[p].library.unshift(oid); s.objects[oid].zone = 'library'; } return s; };
/** A no próprio main1 com o édito na mão e dois Pântanos; B com o que `deB` pede no campo. */
function mesa(deB) {
  const scripts = { Urso: { name: 'Urso', ...ex }, Heroi: { name: 'Heroi', ...ex }, Vila: { ...S.leitura(C.Vila).script, lido: true, ...ex } };
  const d = ns => ns.map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 615, mode: 'full', cards: C, scripts, first: 0,
    players: [{ name: 'A', deck: d([N, 'Swamp', 'Forest']) }, { name: 'B', deck: d(['Urso', 'Vila', 'Heroi', 'Swamp', 'Forest']) }] });
  assert.ok(!S.SCRIPTS[N] && s.facts[N] && s.facts[N].script, `${N} joga pelo script lido`);
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  s = limpaMao(s, 0); s = limpaMao(s, 1);
  let e; [s, e] = poe(s, 0, N, 'hand'); for (let i = 0; i < 2; i++) [s] = poe(s, 0, 'Swamp');
  const b = {}; for (const n of deB) [s, b[n]] = poe(s, 1, n);
  return { s, e, b };
}
const resolve = s => { for (let i = 0; i < 40 && (s.stack.length || s.pending); i++) { if (s.pending) return s; s = act(s, { t: 'pass', p: s.turn.priority }); } return s; };
/** B anima a Vila no main1 de A (A passa a prioridade com a pilha vazia, B ativa, os dois passam). */
function animaVila(s, vila) {
  s = act(s, { t: 'pass', p: 0 }); assert.equal(s.turn.priority, 1, 'B recebe a prioridade');
  const a = legais(s, 1, x => x.t === 'activate' && x.oid === vila); assert.ok(a.length, 'a mesa oferece animar a Vila');
  s = act(s, a[0]); for (let i = 0; i < 6 && s.stack.length; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  assert.equal(E.isCreature(s, s.objects[vila]), true, 'a Vila é criatura agora');
  assert.equal(s.turn.active, 0); assert.equal(s.turn.step, 'main1', 'de volta ao main1 de A');
  return s;
}
const conjuraModo = (s, e, modo) => { const of = legais(s, 0, x => x.t === 'cast' && x.oid === e && (x.mode === modo || (x.modes || []).includes(modo) || x.modo === modo));
  assert.ok(of.length, `o modo ${modo + 1} é oferecido`); return resolve(act(s, of[0])); };
const naMesa = (s, oid) => !!s.objects[oid] && s.objects[oid].zone === 'battlefield';

test('M-615 · 701.21a: o édito de criatura que não é ficha leva o terreno animado quando ele é a única criatura de B', () => {
  let { s, e, b } = mesa(['Vila', 'Swamp']);
  s = animaVila(s, b.Vila);
  s = conjuraModo(s, e, 0);
  for (let i = 0; i < 4 && s.pending; i++) { assert.equal(s.pending.p, 1, 'quem sacrifica escolhe (B)'); s = resolve(act(s, legais(s, 1)[0])); }
  assert.equal(naMesa(s, b.Vila), false, 'a Vila animada foi sacrificada');
  assert.ok(s.zones[1].graveyard.includes(b.Vila), 'no cemitério de B');
  assert.equal(naMesa(s, b.Swamp), true, 'o Pântano (não criatura) fica');
});

test('M-615 · 701.21a: com Urso e a Vila animada, B escolhe entre os dois; escolhe a Vila e o Urso fica', () => {
  let { s, e, b } = mesa(['Vila', 'Urso', 'Swamp']);
  s = animaVila(s, b.Vila);
  s = conjuraModo(s, e, 0);
  assert.ok(s.pending && s.pending.p === 1, 'B escolhe o que sacrificar');
  const ops = legais(s, 1);
  assert.deepEqual(J(s.pending.options).sort(), [b.Vila, b.Urso].sort(), 'as opções são a Vila animada e o Urso (o Pântano não)');
  const daVila = ops.find(x => x.t === 'sacrifice' && x.oid === b.Vila), doUrso = ops.find(x => x.t === 'sacrifice' && x.oid === b.Urso);
  assert.ok(daVila, 'a Vila animada é uma das opções'); assert.ok(doUrso, 'o Urso também');
  s = resolve(act(s, daVila));
  assert.equal(naMesa(s, b.Vila), false, 'a Vila saiu'); assert.equal(naMesa(s, b.Urso), true, 'o Urso ficou');
});

test('M-615 · 701.21a: a Vila que não está animada não é criatura — com só ela e o Urso, o édito leva o Urso sem perguntar', () => {
  let { s, e, b } = mesa(['Vila', 'Urso']);
  assert.equal(E.isCreature(s, s.objects[b.Vila]), false);
  s = conjuraModo(s, e, 0);
  for (let i = 0; i < 4 && s.pending; i++) { const ops = legais(s, s.pending.p); assert.ok(!ops.some(x => x.oid === b.Vila), 'a Vila não é opção'); s = resolve(act(s, ops[0])); }
  assert.equal(naMesa(s, b.Urso), false, 'o Urso foi sacrificado'); assert.equal(naMesa(s, b.Vila), true, 'a Vila (só terreno) fica');
});

test('M-615 · o modo de planeswalker não pega a Vila animada; leva o planeswalker', () => {
  let { s, e, b } = mesa(['Vila', 'Heroi', 'Swamp']);
  s = animaVila(s, b.Vila);
  s = conjuraModo(s, e, 2);
  for (let i = 0; i < 4 && s.pending; i++) s = resolve(act(s, legais(s, s.pending.p)[0]));
  assert.equal(naMesa(s, b.Heroi), false, 'o planeswalker saiu'); assert.equal(naMesa(s, b.Vila), true, 'a Vila animada fica');
});

test('M-615 · o modo de ficha não pega a Vila animada (não é ficha): B sem ficha não sacrifica nada', () => {
  let { s, e, b } = mesa(['Vila', 'Swamp']);
  s = animaVila(s, b.Vila);
  s = conjuraModo(s, e, 1);
  assert.ok(!s.pending, 'nada a escolher');
  assert.equal(naMesa(s, b.Vila), true, 'a Vila fica');
});
