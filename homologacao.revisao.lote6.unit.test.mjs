// H-23 · revisão em lote 6 dos competitivos (plano do dono de 24/10, competitivos primeiro): 19 cartas `lida` que as trilhas motor e
// keywords destravaram entre 25 e 31/10, conferidas por dois revisores independentes (uma partida por carta) e aprovadas com o texto da
// Scryfall de 31/10/2026 (cobertura/*.json do ramo catalogo; em .listas/oficiais-revisadas.json). Vibrant Outburst ficou de fora (115.3:
// o motor não deixa a mesma criatura levar o dano e ser virada). Falham antes da H-23: as cartas ficavam "lida · em revisão".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadModules } from './_load.mjs';

const M = loadModules(), E = M.engine, S = M.scripts, SF = M.scryfall;
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
export const LOTE6 = ['Otawara, Soaring City', 'Witch Enchanter // Witch-Blessed Meadow', 'Snapcaster Mage', 'Flashback', 'Life from the Loam',
  'White Orchid Phantom', "Phlage, Titan of Fire's Fury", 'Mystic Sanctuary', 'Stingcaster Mage', "Uro, Titan of Nature's Wrath", 'Castle Embereth',
  'Ox of Agonas', 'Wilt', 'Castle Ardenvale', 'Confounding Riddle', 'The Echoverse Fulcrum', 'Dusk Rose Reliquary', "Thrór's Map", 'Divining Duelist'];
const valor = c => [...String(c || '').matchAll(/\{([^}]+)\}/g)].reduce((n, [, x]) => n + (/^\d+$/.test(x) ? +x : x === 'X' ? 0 : 1), 0);
const cores = c => [...new Set(String(c || '').match(/[WUBRG]/g) || [])];
/** A carta como a Scryfall a entrega (as de várias faces com `card_faces`), montada pelo app com normalizeCard. */
const carta = n => { const o = OF.find(x => x.name === n); assert.ok(o, `${n} em .listas/oficiais-revisadas.json`);
  const mc = o.faces ? o.faces[0].mana_cost : o.mana_cost;
  const crua = o.faces ? { object: 'card', name: o.name, layout: o.layout, keywords: o.keywords || [], type_line: o.type_line, card_faces: o.faces }
    : { object: 'card', layout: 'normal', keywords: [], ...o };
  return SF.normalizeCard({ ...crua, cmc: valor(mc), colors: cores(mc) }); };


test('H-23 · as 19 cartas do lote 6 jogam no app: texto da Scryfall de 31/10 guardado, assinatura de APROVADAS igual e leitura completa', () => {
  for (const n of LOTE6) {
    const c = carta(n), o = OF.find(x => x.name === n);
    assert.match(o.fonte, /api\.scryfall\.com/, `${n}: texto da Scryfall`); assert.equal(o.consulta, '2026-10-31', `${n}: data da consulta`);
    assert.ok(S.APROVADAS[n], `${n} em APROVADAS`); assert.equal(S.APROVADAS[n].leva, 'H-23');
    assert.equal(S.APROVADAS[n].texto, S.assinaturaRevisao(c), `${n}: a assinatura é a do texto revisado`);
    assert.equal(S.coverage(c, S.SCRIPTS, n).level, 'completo', `${n} joga`);
  }
  assert.ok(!S.APROVADAS['Vibrant Outburst'] || S.APROVADAS['Vibrant Outburst'].leva !== 'H-23', 'Vibrant Outburst recusada na revisão');
});

// ── provas de comportamento, as mesmas que os revisores fizeram ───────────────────────────────────────────────────────────────────
const C = Object.fromEntries(LOTE6.map(n => [n.split(' // ')[0], carta(n)]));
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


test('H-23 · Snapcaster Mage: dá recapitular à instantânea do seu cemitério; conjurada de lá ela vai ao exílio', () => {
  let s = mesa(['Snapcaster Mage', 'Shock']), sm, sh; [s, sm] = poe(s, 0, 'Snapcaster Mage', 'hand'); [s, sh] = poe(s, 0, 'Shock', 'graveyard');
  s = comMana(s, 'UU'); s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === sm)[0]);
  s = roda(s, (st, op) => op.find(x => (x.targets || []).some(t => t.oid === sh)) || op.find(x => x.oid === sh || x.index != null && st.pending.options && (st.pending.options[x.index] || {}).oid === sh));
  assert.equal(s.objects[sm].zone, 'battlefield');
  assert.equal(legais(s, 0, x => x.t === 'cast' && x.oid === sh).length, 0, 'sem mana, não conjura');
  s = comMana(s, 'R'); const op = legais(s, 0, x => x.t === 'cast' && x.oid === sh && (x.targets || []).some(t => t.player === 1));
  assert.ok(op.length, 'conjura o Shock do cemitério pagando {R}'); s = roda(act(s, op[0]));
  assert.equal(s.players[1].life, 18); assert.equal(s.objects[sh].zone, 'exile', 'depois de conjurada pelo recapitular, vai ao exílio');
});

test('H-23 · Castle Ardenvale: entra virada sem Plains e desvirada com Plains; {2}{W}{W},{T} cria um Human 1/1 branco', () => {
  const entra = comPlains => { let s = mesa(['Castle Ardenvale', 'Plains']), k; [s, k] = poe(s, 0, 'Castle Ardenvale', 'hand');
    if (comPlains) [s] = poe(s, 0, 'Plains', 'battlefield', { tapped: true }); /* virada: conta para a Castle, mas não paga a ativação */ s = roda(act(s, legais(s, 0, x => x.t === 'play_land' && x.oid === k)[0])); return [s, k]; };
  assert.equal(entra(false)[0].objects[entra(false)[1]].tapped, true); let [s, k] = entra(true); assert.equal(s.objects[k].tapped, false);
  s = comMana(s, 'WWU'); assert.equal(legais(s, 0, x => x.t === 'activate' && x.oid === k).length, 0, 'WWU não paga {2}{W}{W}');
  s = comMana(s, 'U'); const antes = s.zones[0].battlefield.length; s = roda(act(s, legais(s, 0, x => x.t === 'activate' && x.oid === k)[0]));
  const novo = s.zones[0].battlefield.filter(o => !s.objects[o].card || s.objects[o].token).map(o => s.objects[o]).find(o => o.oid !== k && o.token);
  assert.equal(s.zones[0].battlefield.length, antes + 1); assert.ok(novo, 'ficha criada');
  assert.equal(JSON.stringify(E.stats(s, novo)).match(/"power":1,"toughness":1/) != null, true, 'ficha 1/1');
});

test('H-23 · Dusk Rose Reliquary e Wilt: exila a criatura do oponente até a Reliquary sair; o Wilt destrói a Reliquary e a criatura volta', () => {
  let s = mesa(['Dusk Rose Reliquary', 'Wilt', 'Urso'], ['Gigante', 'Island']), dr, w, u, g;
  [s, dr] = poe(s, 0, 'Dusk Rose Reliquary', 'hand'); [s, w] = poe(s, 0, 'Wilt', 'hand'); [s, u] = poe(s, 0, 'Urso'); [s, g] = poe(s, 1, 'Gigante');
  s = comMana(s, 'BW'); const op = legais(s, 0, x => x.t === 'cast' && x.oid === dr && x.pay && x.pay.sacrifice === u);
  assert.ok(op.length, 'sacrifica o Urso como custo adicional');
  s = roda(act(s, op[0]), (st, o) => o.find(x => x.index != null && (st.pending.options || [])[x.index] && st.pending.options[x.index].oid === g) || o.find(x => (x.targets || []).some(t => t.oid === g)));
  assert.equal(s.objects[u].zone, 'graveyard'); assert.equal(s.objects[g].zone, 'exile', 'Gigante exilado');
  s = comMana(s, 'GG'); s = roda(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === w && (x.targets || []).some(t => t.oid === dr))[0]));
  assert.equal(s.objects[dr].zone, 'graveyard'); assert.equal(s.objects[g].zone, 'battlefield', 'o Gigante volta ao campo do dono');
  assert.equal(s.objects[g].controller, 1);
});
