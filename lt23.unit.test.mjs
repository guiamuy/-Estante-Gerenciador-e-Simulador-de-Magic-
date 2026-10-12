// M-340 · LT23 · terras lentas ("unless you control two or more other lands"), de batalha ("two or more basic lands"), tri-terras
// ("{T}: Add {R}, {G}, or {W}"), "~ gets +N/+N until end of turn", "Regenerate ~", "~ can't block" e Landfall. Scripts lidos pelo leitor;
// texto oficial em .listas/oficiais-revisadas.json (Oracle do Forge, 12/10/2026). Cada teste falha no leitor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, comMana, tudo, CARTAS } from './cmd.mjs';
import { loadModules } from './_load.mjs';

const { leitor: L, scripts: S } = loadModules();
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const mv = m => [...m.matchAll(/\{([^}]+)\}/g)].reduce((n, x) => n + (/^\d+$/.test(x[1]) ? +x[1] : 1), 0);
const carta = n => { const c = OF.find(x => x.name === n); assert.ok(c, n); return { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: mv(c.mana_cost), keywords: /^Flying/m.test(c.oracle_text) ? ['Flying'] : [], oracle_text: c.oracle_text, colors: [...new Set(c.mana_cost.match(/[WUBRG]/g) || [])], ...(c.power ? { power: c.power, toughness: c.toughness } : {}) }; };
const NOMES = ['Deserted Beach', 'Canopy Vista', 'Jungle Shrine', 'Fallen Angel', 'Drudge Skeletons', 'Goblin Raider', "Sazh's Chocobo"];
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: mv(mana_cost), keywords: [], oracle_text: '', colors: [...new Set(mana_cost.match(/[WUBRG]/g) || [])], ...extra });
const cards = { ...Object.fromEntries(NOMES.map(n => [n, carta(n)])), Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2' }), 'Terra Rara': c0('Terra Rara', 'Land', ''),
  Mata: c0('Mata', 'Instant', '{B}'), Duplo: c0('Duplo', 'Creature — Knight', '{1}{R}', { power: '2', toughness: '2', keywords: ['Double strike'] }) };
const ex = { action: 'etb', target: 'none', expect: { attached: false } };
const scripts = { ...Object.fromEntries(NOMES.map(n => [n, { ...L.ler(carta(n)).script, example: ex }])), Mata: { name: 'Mata', effects: [{ do: 'destroy', target: 'creature' }], example: { target: 'enemy-creature', expect: { gone: true } } } };
function mesaX(a = [], b = []) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 23, mode: 'full', cards: { ...CARTAS, ...cards }, scripts, first: 0, players: [{ name: 'A', deck: baralho([...a, 'Plains', 'Forest', 'Swamp']) }, { name: 'B', deck: baralho([...b, 'Mountain', 'Island']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const joga = (s, oid) => act(s, legais(s, 0, x => x.t === 'play_land' && x.oid === oid)[0]);
const resolve = s => tudo(act(act(s, { t: 'pass', p: s.turn.priority }), { t: 'pass', p: 1 - s.turn.priority }));

test('LT23 · Deserted Beach (lenta): virada com até um outro terreno, desvirada com dois; Canopy Vista (batalha): conta só básicos', () => {
  let s = mesaX(['Deserted Beach', 'Canopy Vista', 'Terra Rara']), db, cv;
  [s, db] = poe(s, 0, 'Deserted Beach', 'hand'); [s, cv] = poe(s, 0, 'Canopy Vista', 'hand');
  [s] = poe(s, 0, 'Plains');
  assert.equal(joga(s, db).objects[db].tapped, true, 'um outro terreno: virada');
  let t; [t] = poe(s, 0, 'Terra Rara');
  assert.equal(joga(t, db).objects[db].tapped, false, 'dois outros (um não básico): desvirada');
  assert.equal(joga(t, cv).objects[cv].tapped, true, 'batalha: um básico e um não básico — virada');
  [t] = poe(t, 0, 'Forest');
  assert.equal(joga(t, cv).objects[cv].tapped, false, 'dois básicos: desvirada');
});

test('LT23 · Jungle Shrine: entra virada e produz {R}, {G} ou {W}', () => {
  let s = mesaX(['Jungle Shrine']), js;
  [s, js] = poe(s, 0, 'Jungle Shrine', 'hand');
  s = joga(s, js);
  assert.equal(s.objects[js].tapped, true);
  assert.equal(JSON.stringify(s.facts['Jungle Shrine'].script.produces), JSON.stringify([['R'], ['G'], ['W']]));
});

test('LT23 · Fallen Angel: sacrificar uma criatura dá +2/+1 até o fim do turno; Drudge Skeletons regenera; Goblin Raider não bloqueia', () => {
  let s = mesaX(['Fallen Angel', 'Urso', 'Drudge Skeletons', 'Mata'], ['Goblin Raider', 'Urso']), fa, u, ds, m, gr, ub;
  [s, fa] = poe(s, 0, 'Fallen Angel'); [s, u] = poe(s, 0, 'Urso'); [s, ds] = poe(s, 0, 'Drudge Skeletons'); [s, m] = poe(s, 0, 'Mata', 'hand'); [s, gr] = poe(s, 1, 'Goblin Raider'); [s, ub] = poe(s, 1, 'Urso');
  const a = legais(s, 0, x => x.t === 'activate' && x.oid === fa && (x.pay || {}).sacrifice === u)[0] || legais(s, 0, x => x.t === 'activate' && x.oid === fa && JSON.stringify(x.pay || {}).includes(u))[0];
  assert.ok(a, 'sacrificar a Urso');
  let t = resolve(act(s, a));
  assert.equal(t.objects[u].zone, 'graveyard');
  assert.equal(JSON.stringify(E.stats(t, t.objects[fa])), JSON.stringify({ power: 5, toughness: 4 }), '3/3 + 2/1');
  t = passaAte(t, x => x.turn.active === 1 && x.turn.step === 'main1');
  assert.equal(JSON.stringify(E.stats(t, t.objects[fa])), JSON.stringify({ power: 3, toughness: 3 }), 'acabou na limpeza');
  let r = resolve(act(comMana(s, 'B'), legais(comMana(s, 'B'), 0, x => x.t === 'activate' && x.oid === ds)[0]));
  r = resolve(act(comMana(r, 'B'), legais(comMana(r, 'B'), 0, x => x.t === 'cast' && x.oid === m && x.targets && x.targets[0].oid === ds)[0]));
  assert.equal(r.objects[ds].zone, 'battlefield', 'regenerou'); assert.equal(r.objects[ds].tapped, true, 'e virou');
  assert.ok(!E.eligibleBlockers(s, 1).includes(gr), 'Goblin Raider não bloqueia'); assert.ok(E.eligibleBlockers(s, 1).includes(ub));
});

test("LT23 · Sazh's Chocobo: quando um terreno seu entra, ganha um marcador +1/+1; terreno do oponente não conta", () => {
  let s = mesaX(["Sazh's Chocobo"]), sc, f;
  [s, sc] = poe(s, 0, "Sazh's Chocobo"); [s, f] = poe(s, 0, 'Forest', 'hand');
  s = tudo(joga(s, f));
  assert.equal(s.objects[sc].counters.p1p1, 1);
  let t = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending); const ilha = t.zones[1].hand.find(o => t.objects[o].name === 'Island' || t.objects[o].name === 'Mountain');
  if (ilha) { t = tudo(act(t, legais(t, 1, x => x.t === 'play_land' && x.oid === ilha)[0])); assert.equal(t.objects[sc].counters.p1p1, 1, 'terreno do oponente: nada'); }
});

test('achado da revisão do lote XIV · 506.4 / 510.1d: o atacante regenerado no passo de golpe primeiro sai do combate e não leva dano no passo normal', () => {
  let s = mesaX(['Drudge Skeletons'], ['Duplo']), ds, du;
  [s, ds] = poe(s, 0, 'Drudge Skeletons'); [s, du] = poe(s, 1, 'Duplo');
  s = resolve(act(comMana(s, 'B'), legais(comMana(s, 'B'), 0, x => x.t === 'activate' && x.oid === ds)[0]));
  assert.equal(s.objects[ds].regenerar, 1, 'um escudo');
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 0); s = act(s, { t: 'attack', p: 0, attackers: [ds] });
  s = passaAte(s, x => x.pending && x.pending.kind === 'blockers'); s = act(s, { t: 'block', p: 1, blocks: [[du, ds]] });
  s = passaAte(s, x => x.turn.step === 'main2' || x.turn.step === 'end');
  assert.equal(s.objects[ds].zone, 'battlefield', 'regenerou no golpe primeiro e não levou o segundo golpe (saiu do combate)');
  assert.equal(s.objects[ds].tapped, true);
});

test('M-340 · as 35 do lote XIV revisadas jogam (decisão A)', () => {
  for (const n of ["Prairie Stream", "Stormcarved Coast", "Cinder Glade", "Canopy Vista", "Sunken Hollow", "Shattered Sanctum", "Smoldering Marsh", "Shipwreck Marsh", "Sazh's Chocobo", "Jungle Shrine", "Deserted Beach", "Seaside Citadel", "Mystic Monastery", "Arcane Sanctum", "Crumbling Necropolis", "Frontier Bivouac", "Opulent Palace", "Sandsteppe Citadel", "Shivan Dragon", "Savage Lands", "Nomad Outpost", "Rampaging Baloths", "Carrion Feeder", "Furnace Whelp", "Sundown Pass", "Scorched Geyser", "Drudge Skeletons", "Goblin Raider", "Basking Rootwalla", "Blazing Rootwalla", "Fallen Angel", "Radiant Summit", "Dreamroot Cascade", "Sanguine Guard", "Hollow Dogs"])
    assert.equal(S.coverage(carta(n)).level, 'completo', n + ' joga');
});
