// M-362 · 118.9 / 404.2 · custo alternativo "exile the top three black cards of your graveyard" — Spinning Darkness (texto do Oracle do Forge em
// .listas/oficiais-listas.json, consulta de 12/10/2026, trilha listas). O script de verdade (M a Z) é da trilha listas. Os dois primeiros falham no motor anterior; o terceiro guarda a recusa.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, CARTAS } from './cmd.mjs';
import { loadModules } from './_load.mjs';
const { leitor: L, scripts: S } = loadModules();

const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-listas.json', import.meta.url), 'utf8'));
const acha = (o, n) => { if (Array.isArray(o)) { for (const v of o) { const r = acha(v, n); if (r) return r; } } else if (o && typeof o === 'object') { if (o.name === n) return o; for (const v of Object.values(o)) { const r = acha(v, n); if (r) return r; } } return null; };
const sd = acha(OF, 'Spinning Darkness');
const carta = { name: sd.name, type_line: sd.type_line, mana_cost: sd.mana_cost, cmc: 6, keywords: [], oracle_text: sd.oracle_text, colors: ['B'] };
const lido = L.ler(carta);
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: 1, keywords: [], oracle_text: '', colors: [...new Set((mana_cost.match(/[WUBRG]/g) || []))], ...extra });
const cards = { 'Spinning Darkness': carta, Sombra: c0('Sombra', 'Creature — Shade', '{B}', { power: '1', toughness: '1' }), Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2' }) };
const scripts = { 'Spinning Darkness': { ...lido.script, example: { action: 'etb', target: 'none', expect: { attached: false } } } };
function mesaD(seed = 29) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: { ...CARTAS, ...cards }, scripts, first: 0, players: [{ name: 'A', deck: baralho(['Spinning Darkness', 'Sombra', 'Urso', 'Swamp']) }, { name: 'B', deck: baralho(['Urso', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  s = J(s); for (const o of s.zones[0].battlefield.slice()) { s.zones[0].battlefield = s.zones[0].battlefield.filter(x => x !== o); s.zones[0].library.push(o); s.objects[o].zone = 'library'; }
  return s;
}
const altDe = (s, oid) => legais(s, 0, a => a.t === 'cast' && a.oid === oid && a.alt != null);

test('M-362 · leitor: o custo alternativo vira exileGraveyardTopo { n: 3, cor: B }, com rótulo, e o script é válido', () => {
  assert.equal(lido.completa, true, JSON.stringify(lido.frases));
  assert.deepEqual(JSON.parse(JSON.stringify(lido.script.alt[0].cost)), { exileGraveyardTopo: { n: 3, cor: 'B' } });
  assert.deepEqual([...S.validateScript(scripts['Spinning Darkness'])], []);
  assert.ok(S.validateScript({ ...scripts['Spinning Darkness'], alt: [{ label: 'x', cost: { exileGraveyardTopo: { n: 0 } } }] }).some(e => /topo do cemitério/.test(e)));
});

test('M-362 · 404.2: sem mana, exila as três cartas pretas MAIS DE CIMA do cemitério (as outras ficam) e resolve: 3 de dano na não preta, 3 de vida', () => {
  let s = mesaD(), sd, ub, g = [];
  for (let i = 0; i < 4; i++) { let x; [s, x] = poe(s, 0, 'Sombra', 'graveyard'); g.push(x); }
  let u; [s, u] = poe(s, 0, 'Urso', 'graveyard');
  [s, sd] = poe(s, 0, 'Spinning Darkness', 'hand'); [s, ub] = poe(s, 1, 'Urso');
  const ofs = altDe(s, sd).filter(a => (a.targets || []).some(t => t.oid === ub)); assert.ok(ofs.length, 'oferecido sem mana nenhuma');
  const vida = s.players[0].life;
  let t = act(s, ofs[0]);
  assert.deepEqual(g.map(x => t.objects[x].zone), ['graveyard', 'exile', 'exile', 'exile'], 'a de baixo (a primeira posta) fica');
  assert.equal(t.objects[u].zone, 'graveyard', 'a carta não preta não conta e não sai');
  t = act(act(t, { t: 'pass', p: 0 }), { t: 'pass', p: 1 });
  assert.equal(t.objects[ub].zone, 'graveyard'); assert.equal(t.players[0].life, vida + 3);
});

test('M-362 · com só duas cartas pretas no cemitério, o custo alternativo não é oferecido nem aceito', () => {
  let s = mesaD(), sd, ub;
  for (let i = 0; i < 2; i++) [s] = poe(s, 0, 'Sombra', 'graveyard');
  [s] = poe(s, 0, 'Urso', 'graveyard'); [s, sd] = poe(s, 0, 'Spinning Darkness', 'hand'); [s, ub] = poe(s, 1, 'Urso');
  assert.equal(altDe(s, sd).length, 0);
  assert.throws(() => E.apply(s, { t: 'cast', p: 0, oid: sd, alt: 0, targets: [{ oid: ub }] }));
});
