// H-18 · revisão em lote 1 dos competitivos (plano do dono de 24/10, competitivos primeiro): 18 cartas que o leitor lê por inteiro,
// conferidas por revisor independente (uma partida por carta) e aprovadas com o texto da Scryfall de 25/10/2026 (cobertura/*.json do
// ramo catalogo, gerado pelo fluxo Catálogo às 06:34 UTC; guardado em .listas/oficiais-revisadas.json). Falham antes da H-18:
// as cartas ficavam "lida · em revisão" e não jogavam no app.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadModules } from './_load.mjs';

const M = loadModules(), E = M.engine, S = M.scripts, SF = M.scryfall;
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
export const LOTE1 = ['Callous Inspector', 'Hard-Hitting Question', 'Arcbound Ravager', 'Boltwave', 'Iridescent Vinelasher', 'Hardened Academic',
  'Sentinel of the Nameless City', "Jetmir's Garden", "Spara's Headquarters", 'Striped Riverwinder', 'Bone Shards', 'Deathcap Glade',
  "It'll Quench Ya!", 'Make Disappear', 'Omen of the Sea', 'Batterskull', 'Lotus Bloom', 'Thud'];
const valor = c => [...String(c || '').matchAll(/\{([^}]+)\}/g)].reduce((n, [, x]) => n + (/^\d+$/.test(x) ? +x : x === 'X' ? 0 : 1), 0);
const cores = c => [...new Set(String(c || '').match(/[WUBRG]/g) || [])];
/** A carta como o app a monta a partir da Scryfall (normalizeCard), com o texto guardado na revisão. */
const carta = n => { const o = OF.find(x => x.name === n); assert.ok(o, `${n} em .listas/oficiais-revisadas.json`);
  return SF.normalizeCard({ object: 'card', layout: 'normal', keywords: [], ...o, cmc: valor(o.mana_cost), colors: cores(o.mana_cost) }); };

test('H-18 · as 18 cartas do lote 1 jogam no app: texto da Scryfall guardado, assinatura de APROVADAS igual e leitura completa', () => {
  for (const n of LOTE1) {
    const c = carta(n), o = OF.find(x => x.name === n);
    assert.match(o.fonte, /api\.scryfall\.com/, `${n}: texto da Scryfall`); assert.equal(o.consulta, '2026-10-25', `${n}: data da consulta`);
    assert.ok(S.APROVADAS[n], `${n} em APROVADAS`); assert.equal(S.APROVADAS[n].leva, 'H-18');
    assert.equal(S.APROVADAS[n].texto, S.assinaturaRevisao(c), `${n}: a assinatura é a do texto revisado`);
    assert.equal(S.coverage(c, S.SCRIPTS, n).level, 'completo', `${n} joga`);
  }
});

// ── provas de comportamento, as mesmas que o revisor fez ─────────────────────────────────────────────────────────────────────────
const C = Object.fromEntries(LOTE1.map(n => [n, carta(n)]));
for (const [n, k] of Object.entries({ Island: 'U', Mountain: 'R', Forest: 'G', Plains: 'W', Swamp: 'B' })) C[n] = { name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${k}}.)`, colors: [] };
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: valor(mana_cost), keywords: [], oracle_text: '', colors: cores(mana_cost), ...extra });
Object.assign(C, { Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2' }), Gigante: c0('Gigante', 'Creature — Giant', '{4}{R}', { power: '5', toughness: '5' }),
  Divination: c0('Divination', 'Sorcery', '{2}{U}', { oracle_text: 'Draw two cards.' }) });
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
function roda(s, escolhe = null) {
  for (let i = 0; i < 80 && (s.stack.length || s.pending); i++) { const pd = s.pending;
    if (pd) { const op = legais(s, pd.p); s = act(s, (escolhe && escolhe(s, op)) || op[0]); } else s = act(s, { t: 'pass', p: s.turn.priority }); }
  return s;
}
function poe(s, p, name, zone = 'battlefield', extra = {}) {
  s = J(s);
  const from = ['library', 'hand', 'graveyard'].map(z => s.zones[p][z]).find(z => z.some(o => s.objects[o].name === name));
  assert.ok(from, `${name} no grimório`);
  const oid = from.find(o => s.objects[o].name === name); from.splice(from.indexOf(oid), 1); s.zones[p][zone].push(oid);
  Object.assign(s.objects[oid], { zone, sick: false, tapped: false, controller: p, ...extra }); return [s, oid];
}
const comMana = (s, m, p = 0) => { s = J(s); for (const c of m) s.players[p].pool[c]++; return s; };
function mesa(a, b = ['Urso', 'Gigante'], seed = 18) {
  const d = ns => [...new Set(ns)].map(name => ({ name, qty: 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: d([...a, 'Urso', 'Gigante', 'Divination', 'Island', 'Mountain', 'Swamp']) }, { name: 'B', deck: d([...b, 'Island', 'Swamp']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  s = J(s); for (const oid of s.zones[0].hand.slice()) { s.zones[0].hand.splice(s.zones[0].hand.indexOf(oid), 1); s.zones[0].library.unshift(oid); s.objects[oid].zone = 'library'; }
  return s;
}

test('H-18 · Boltwave: 3 de dano a cada oponente, sem alvo', () => {
  let s = mesa(['Boltwave']), b; [s, b] = poe(s, 0, 'Boltwave', 'hand'); s = comMana(s, 'R');
  const op = legais(s, 0, x => x.t === 'cast' && x.oid === b); assert.equal(op.length, 1); assert.ok(!(op[0].targets || []).length);
  s = roda(act(s, op[0])); assert.equal(s.players.map(p => p.life).join(), '20,17');
});

test('H-18 · Deathcap Glade: entra virado com 0 ou 1 outro terreno seu, desvirado com 2 ou mais; terreno do oponente não conta', () => {
  const entra = (meus, deles = 0) => { let s = mesa(['Deathcap Glade']), l; [s, l] = poe(s, 0, 'Deathcap Glade', 'hand');
    for (let i = 0; i < meus; i++) [s] = poe(s, 0, 'Swamp'); for (let i = 0; i < deles; i++) [s] = poe(s, 1, 'Island');
    s = roda(act(s, legais(s, 0, x => x.t === 'play_land' && x.oid === l)[0])); return s.objects[l].tapped; };
  assert.deepEqual([entra(0), entra(1), entra(2), entra(3), entra(1, 2)], [true, true, false, false, true]);
});

test("H-18 · It'll Quench Ya!: anula a menos que o controlador da mágica pague {2}; ele decide", () => {
  for (const paga of [true, false]) {
    let s = mesa(["It'll Quench Ya!"]), q, d; [s, q] = poe(s, 0, "It'll Quench Ya!", 'hand'); [s, d] = poe(s, 0, 'Divination', 'hand');
    s = comMana(s, 'UUU'); s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === d)[0]);
    s = comMana(s, 'UU'); s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === q)[0]);
    if (paga) s = comMana(s, 'RR');
    s = roda(s, (_, op) => op.find(x => x.t === (paga ? 'pay' : 'decline')));
    assert.equal(s.objects[d].zone, 'graveyard', 'Divination resolve ou é anulada: vai ao cemitério nos dois casos');
    assert.equal(s.zones[0].hand.length, paga ? 2 : 0, paga ? 'pagou: comprou duas' : 'recusou: anulada, sem compra');
  }
});

test('H-18 · Thud: sacrificar uma criatura é obrigatório; o dano é o poder dela', () => {
  let s = mesa(['Thud']), th, g, u; [s, th] = poe(s, 0, 'Thud', 'hand'); s = comMana(s, 'R');
  assert.equal(legais(s, 0, x => x.t === 'cast' && x.oid === th).length, 0, 'sem criatura para sacrificar, não conjura');
  [s, g] = poe(s, 0, 'Gigante'); [s, u] = poe(s, 1, 'Urso');
  const op = legais(s, 0, x => x.t === 'cast' && x.oid === th && x.pay && x.pay.sacrifice === g && (x.targets || []).some(t => t.player === 1));
  assert.equal(op.length, 1); s = roda(act(s, op[0]));
  assert.equal(s.players[1].life, 15); assert.equal(s.objects[g].zone, 'graveyard');
});
