// H-19 · revisão em lote 2 dos competitivos (plano do dono de 24/10, competitivos primeiro): 18 cartas que o leitor passou a ler por
// inteiro com as levas K-75…K-78 e M-579 (terrenos que viram criatura, dupla face com terreno no verso, modais, anulação), conferidas
// por revisor independente (uma partida por carta) e aprovadas com o texto da Scryfall de 25/10/2026 (cobertura/*.json do ramo
// catalogo, fluxo Catálogo das 06:34 UTC; guardado em .listas/oficiais-revisadas.json, cartas de várias faces com `faces`, como na
// M-531). Falham antes da H-19: as cartas ficavam "lida · em revisão" e não jogavam no app.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadModules } from './_load.mjs';

const M = loadModules(), E = M.engine, S = M.scripts, SF = M.scryfall;
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
export const LOTE2 = ['Restless Reef', 'Mutavault', 'Soulstone Sanctuary', 'Supreme Verdict', 'Boggart Trawler // Boggart Bog', 'Abrupt Decay',
  'Restless Anchorage', 'Silence', 'Fell the Profane // Fell Mire', 'Jwari Disruption // Jwari Ruins', "Dovin's Veto", 'Monastery Mentor', 'Celestial Colonnade',
  'Waterlogged Teachings // Inundated Archive', 'Fantastic Elasticity', 'Memory Guardian', 'Haunted Ridge', 'Spider Manifestation'];
const valor = c => [...String(c || '').matchAll(/\{([^}]+)\}/g)].reduce((n, [, x]) => n + (/^\d+$/.test(x) ? +x : x === 'X' ? 0 : 1), 0);
const cores = c => [...new Set(String(c || '').match(/[WUBRG]/g) || [])];
/** A carta como a Scryfall a entrega (as de várias faces com `card_faces`), montada pelo app com normalizeCard. */
const carta = n => { const o = OF.find(x => x.name === n); assert.ok(o, `${n} em .listas/oficiais-revisadas.json`);
  const mc = o.faces ? o.faces[0].mana_cost : o.mana_cost;
  const crua = o.faces ? { object: 'card', name: o.name, layout: o.layout, keywords: o.keywords || [], type_line: o.type_line, card_faces: o.faces }
    : { object: 'card', layout: 'normal', keywords: [], ...o };
  return SF.normalizeCard({ ...crua, cmc: valor(mc), colors: cores(mc) }); };

test('H-19 · as 18 cartas do lote 2 jogam no app: texto da Scryfall guardado, assinatura de APROVADAS igual e leitura completa', () => {
  for (const n of LOTE2) {
    const c = carta(n), o = OF.find(x => x.name === n);
    assert.match(o.fonte, /api\.scryfall\.com/, `${n}: texto da Scryfall`); assert.equal(o.consulta, '2026-10-25', `${n}: data da consulta`);
    assert.ok(S.APROVADAS[n], `${n} em APROVADAS`); assert.equal(S.APROVADAS[n].leva, 'H-19');
    assert.equal(S.APROVADAS[n].texto, S.assinaturaRevisao(c), `${n}: a assinatura é a do texto revisado`);
    assert.equal(S.coverage(c, S.SCRIPTS, n).level, 'completo', `${n} joga`);
  }
  for (const n of ['Boggart Trawler // Boggart Bog', 'Fell the Profane // Fell Mire', 'Jwari Disruption // Jwari Ruins', 'Waterlogged Teachings // Inundated Archive'])
    assert.equal(OF.find(x => x.name === n).faces.length, 2, `${n}: as duas faces guardadas`);
});

// ── provas de comportamento, as mesmas que o revisor fez ─────────────────────────────────────────────────────────────────────────
const C = Object.fromEntries(LOTE2.map(n => [n, carta(n)]));
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

test('H-19 · Haunted Ridge: entra virada com 0 ou 1 outro terreno seu e desvirada com 2 ou mais; gera {B} ou {R}', () => {
  const entra = meus => { let s = mesa(['Haunted Ridge']), l; [s, l] = poe(s, 0, 'Haunted Ridge', 'hand');
    for (let i = 0; i < meus; i++) [s] = poe(s, 0, ['Island', 'Swamp', 'Mountain'][i]);
    s = roda(act(s, legais(s, 0, x => x.t === 'play_land' && x.oid === l)[0])); return s.objects[l].tapped; };
  assert.equal([entra(0), entra(1), entra(2), entra(3)].join(), 'true,true,false,false');
  let s = mesa(['Haunted Ridge']), r; [s, r] = poe(s, 0, 'Haunted Ridge');
  assert.equal(['B', 'R'].map((c, option) => act(s, { t: 'tap_mana', p: 0, oid: r, option }).players[0].pool[c]).join(), '1,1');
});

test('H-19 · Mutavault: {1} a torna criatura 2/2 com todos os tipos até o fim do turno, ainda terreno; no turno seguinte é só terreno', () => {
  let s = mesa(['Mutavault']), m; [s, m] = poe(s, 0, 'Mutavault'); s = comMana(s, 'R');
  s = roda(act(s, legais(s, 0, x => x.oid === m && x.t === 'activate')[0]));
  const st = E.stats(s, s.objects[m]); assert.equal(`${st.power}/${st.toughness}`, '2/2');
  const linha = String(E.linhaDeTipo(s, s.objects[m])); assert.match(linha, /Land/); assert.match(linha, /Creature/);
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  assert.doesNotMatch(String(E.linhaDeTipo(s, s.objects[m])), /Creature/);
});
