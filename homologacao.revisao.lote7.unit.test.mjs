// H-24 · revisão em lote 7 (plano do dono de 24/10): as 6 últimas cartas `lida` dos competitivos e as 11 `lida` de Commander de maior
// presença na medida de 31/10, conferidas por dois revisores independentes (uma partida por carta) e aprovadas com o texto da Scryfall de
// 31/10/2026 (cobertura/*.json do ramo catalogo; em .listas/oficiais-revisadas.json). Tarnished Citadel ficou de fora (605.1a: a mana de
// qualquer cor com 3 de dano vai à pilha em vez de ser habilidade de mana). Falham antes da H-24.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadModules } from './_load.mjs';

const M = loadModules(), E = M.engine, S = M.scripts, SF = M.scryfall;
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
export const LOTE7 = ["Steelshaper's Gift", "Rakshasa's Bargain", "Raffine's Tower", 'Crippling Fatigue', "Jack-o'-Lantern", 'Oboro, Palace in the Clouds',
  'Dizzy Spell', 'Putrefy', 'Mortify', 'Fabricate', 'Ophidian Eye', 'Muddle the Mixture', 'Sacrifice', 'Krark-Clan Ironworks', "Seer's Sundial",
  'Staff of Domination', 'Gavony Township'];
const valor = c => [...String(c || '').matchAll(/\{([^}]+)\}/g)].reduce((n, [, x]) => n + (/^\d+$/.test(x) ? +x : x === 'X' ? 0 : 1), 0);
const cores = c => [...new Set(String(c || '').match(/[WUBRG]/g) || [])];
/** A carta como a Scryfall a entrega (as de várias faces com `card_faces`), montada pelo app com normalizeCard. */
const carta = n => { const o = OF.find(x => x.name === n); assert.ok(o, `${n} em .listas/oficiais-revisadas.json`);
  const mc = o.faces ? o.faces[0].mana_cost : o.mana_cost;
  const crua = o.faces ? { object: 'card', name: o.name, layout: o.layout, keywords: o.keywords || [], type_line: o.type_line, card_faces: o.faces }
    : { object: 'card', layout: 'normal', keywords: [], ...o };
  return SF.normalizeCard({ ...crua, cmc: valor(mc), colors: cores(mc) }); };


test('H-24 · as 17 cartas do lote 7 jogam no app: texto da Scryfall de 31/10 guardado, assinatura de APROVADAS igual e leitura completa', () => {
  for (const n of LOTE7) {
    const c = carta(n), o = OF.find(x => x.name === n);
    assert.match(o.fonte, /api\.scryfall\.com/, `${n}: texto da Scryfall`); assert.equal(o.consulta, '2026-10-31', `${n}: data da consulta`);
    assert.ok(S.APROVADAS[n], `${n} em APROVADAS`); assert.equal(S.APROVADAS[n].leva, 'H-24');
    assert.equal(S.APROVADAS[n].texto, S.assinaturaRevisao(c), `${n}: a assinatura é a do texto revisado`);
    assert.equal(S.coverage(c, S.SCRIPTS, n).level, 'completo', `${n} joga`);
  }
  assert.ok(!S.APROVADAS['Tarnished Citadel'], 'Tarnished Citadel recusada na revisão');
});

// ── provas de comportamento, as mesmas que os revisores fizeram ───────────────────────────────────────────────────────────────────
const C = Object.fromEntries(LOTE7.map(n => [n.split(' // ')[0], carta(n)]));
for (const [n, k] of Object.entries({ Island: 'U', Mountain: 'R', Forest: 'G', Plains: 'W', Swamp: 'B' })) C[n] = { name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${k}}.)`, colors: [] };
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: valor(mana_cost), keywords: [], oracle_text: '', colors: cores(mana_cost), ...extra });
Object.assign(C, { Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2' }), Gigante: c0('Gigante', 'Creature — Giant', '{4}{R}', { power: '5', toughness: '5' }),
  Divination: c0('Divination', 'Sorcery', '{2}{U}', { oracle_text: 'Draw two cards.' }),
  Shock: c0('Shock', 'Instant', '{R}', { oracle_text: 'Shock deals 2 damage to any target.' }),
  Ornithopter: c0('Ornithopter', 'Artifact Creature — Thopter', '{0}', { power: '0', toughness: '2', keywords: ['Flying'], oracle_text: 'Flying' }) });
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
function mesa(a, b = ['Urso', 'Gigante', 'Ornithopter'], seed = 18) {
  const d = ns => [...new Set(ns)].map(name => ({ name, qty: 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: d([...a, 'Urso', 'Gigante', 'Divination', 'Island', 'Mountain', 'Swamp']) }, { name: 'B', deck: d([...b, 'Island', 'Swamp']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  s = J(s); for (const oid of s.zones[0].hand.slice()) { s.zones[0].hand.splice(s.zones[0].hand.indexOf(oid), 1); s.zones[0].library.unshift(oid); s.objects[oid].zone = 'library'; }
  return s;
}


test('H-24 · Sacrifice: o sacrifício é custo e dá {B} igual ao valor de mana da criatura sacrificada', () => {
  let s = mesa(['Sacrifice']), sc, g; [s, sc] = poe(s, 0, 'Sacrifice', 'hand');
  s = comMana(s, 'B'); assert.equal(legais(s, 0, x => x.t === 'cast' && x.oid === sc).length, 0, 'sem criatura, não conjura');
  [s, g] = poe(s, 0, 'Gigante'); const op = legais(s, 0, x => x.t === 'cast' && x.oid === sc && x.pay && x.pay.sacrifice === g);
  assert.equal(op.length, 1); s = roda(act(s, op[0]));
  assert.equal(s.objects[g].zone, 'graveyard'); assert.equal(s.players[0].pool.B, 5, 'Gigante tem valor de mana 5');
});

test('H-24 · Gavony Township: {2}{G}{W},{T} põe um marcador +1/+1 em cada criatura sua, nenhuma do oponente', () => {
  let s = mesa(['Gavony Township', 'Urso']), t, u, o; [s, t] = poe(s, 0, 'Gavony Township'); [s, u] = poe(s, 0, 'Urso'); [s, o] = poe(s, 1, 'Urso');
  s = comMana(s, 'GWC'); assert.equal(legais(s, 0, x => x.t === 'activate' && x.oid === t && !x.mana).length, 0, 'GWC não paga {2}{G}{W} sem o próprio Township');
  s = comMana(s, 'C'); s = roda(act(s, legais(s, 0, x => x.t === 'activate' && x.oid === t && !x.mana)[0]));
  assert.equal(JSON.stringify(E.stats(s, s.objects[u])).match(/"power":3,"toughness":3/) != null, true, 'o seu Urso fica 3/3');
  assert.equal(JSON.stringify(E.stats(s, s.objects[o])).match(/"power":2,"toughness":2/) != null, true, 'o do oponente segue 2/2');
});

test('H-24 · Crippling Fatigue: −2/−2 até o fim do turno; o recapitular custa {1}{B} e 3 de vida, e a carta vai ao exílio', () => {
  let s = mesa(['Crippling Fatigue'], ['Gigante', 'Urso']), cf, g, u; [s, cf] = poe(s, 0, 'Crippling Fatigue', 'graveyard'); [s, g] = poe(s, 1, 'Gigante'); [s, u] = poe(s, 1, 'Urso');
  s = comMana(s, 'BB'); const op = legais(s, 0, x => x.t === 'cast' && x.oid === cf && (x.targets || []).some(t => t.oid === u));
  assert.ok(op.length, 'conjura do cemitério pelo recapitular'); s = roda(act(s, op[0]));
  assert.equal(s.players[0].life, 17, 'pagou 3 de vida'); assert.equal(s.objects[u].zone, 'graveyard', 'o Urso morre'); assert.equal(s.objects[cf].zone, 'exile');
  assert.equal(s.objects[g].zone, 'battlefield');
});
