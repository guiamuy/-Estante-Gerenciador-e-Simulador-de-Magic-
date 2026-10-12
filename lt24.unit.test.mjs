// M-341 · LT24 · "exile target nonland permanent an opponent controls until ~ leaves the battlefield" (Banishing Light, 610.3), "Target
// creature with power N or less can't be blocked this turn", "If you controlled that permanent, draw a card" (608.2h), "Cycling—Pay N life"
// (Street Wraith, 119.4) e "Destroy target creature, enchantment, or planeswalker" (Get Lost). Scripts lidos pelo leitor; texto oficial em
// .listas/oficiais-revisadas.json (Oracle do Forge, 12/10/2026). Cada teste falha no motor/leitor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, comMana, tudo, CARTAS } from './cmd.mjs';
import { loadModules } from './_load.mjs';

const { leitor: L, scripts: S } = loadModules();
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const mv = m => [...m.matchAll(/\{([^}]+)\}/g)].reduce((n, x) => n + (/^\d+$/.test(x[1]) ? +x[1] : 1), 0);
const carta = n => { const c = OF.find(x => x.name === n); assert.ok(c, n); return { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: mv(c.mana_cost), keywords: /^Swampwalk/m.test(c.oracle_text) ? ['Swampwalk'] : [], oracle_text: c.oracle_text, colors: [...new Set(c.mana_cost.match(/[WUBRG]/g) || [])], ...(c.power ? { power: c.power, toughness: c.toughness } : {}) }; };
const NOMES = ['Banishing Light', 'Goblin Tunneler', 'Boomerang Basics', 'Street Wraith', 'Get Lost'];
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: mv(mana_cost), keywords: [], oracle_text: '', colors: [...new Set(mana_cost.match(/[WUBRG]/g) || [])], ...extra });
const cards = { ...Object.fromEntries(NOMES.map(n => [n, carta(n)])), Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2' }), Gigante: c0('Gigante', 'Creature — Giant', '{4}{G}', { power: '5', toughness: '5' }),
  Desfaz: c0('Desfaz', 'Instant', '{W}') };
const ex = { action: 'etb', target: 'none', expect: { attached: false } };
const scripts = { ...Object.fromEntries(NOMES.map(n => [n, { ...L.ler(carta(n)).script, example: ex }])), Desfaz: { name: 'Desfaz', effects: [{ do: 'destroy', target: 'enchantment' }], example: { target: 'none', expect: { gone: true } } } };
scripts['Boomerang Basics'].example = { target: 'enemy-creature', expect: { bounced: true } };
scripts['Get Lost'].example = { target: 'enemy-creature', expect: { gone: true } };
function mesaX(a = [], b = []) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 29, mode: 'full', cards: { ...CARTAS, ...cards }, scripts, first: 0, players: [{ name: 'A', deck: baralho([...a, 'Plains', 'Swamp', 'Island']) }, { name: 'B', deck: baralho([...b, 'Forest', 'Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => tudo(act(act(s, { t: 'pass', p: s.turn.priority }), { t: 'pass', p: 1 - s.turn.priority }));

test('LT24 · Banishing Light: exila uma permanente não terreno do oponente até sair do campo; destruída, a permanente volta', () => {
  let s = mesaX(['Banishing Light', 'Desfaz'], ['Urso']), bl, u, d;
  [s, bl] = poe(s, 0, 'Banishing Light', 'hand'); [s, u] = poe(s, 1, 'Urso'); [s, d] = poe(s, 0, 'Desfaz', 'hand');
  s = act(comMana(s, 'WWW'), legais(comMana(s, 'WWW'), 0, x => x.t === 'cast' && x.oid === bl)[0]);
  s = act(act(s, { t: 'pass', p: 0 }), { t: 'pass', p: 1 }); s = passaAte(s, x => !!x.pending || !x.stack.length);
  if (s.pending && s.pending.kind === 'pick_target') { assert.ok(s.pending.options.every(o => o.oid == null || s.objects[o.oid].controller === 1), 'só do oponente'); s = act(s, legais(s, 0, x => x.t === 'pick_target' && s.pending.options[x.index].oid === u)[0]); }
  s = tudo(s);
  assert.equal(s.objects[u].zone, 'exile');
  s = resolve(act(comMana(s, 'W'), legais(comMana(s, 'W'), 0, x => x.t === 'cast' && x.oid === d && x.targets && x.targets[0].oid === bl)[0]));
  assert.equal(s.objects[bl].zone, 'graveyard'); assert.equal(s.objects[u].zone, 'battlefield', 'a Urso volta');
});

test('LT24 · Goblin Tunneler mira só criatura com poder 2 ou menos; Boomerang Basics compra só se você controlava a permanente', () => {
  let s = mesaX(['Goblin Tunneler', 'Urso', 'Boomerang Basics'], ['Gigante', 'Urso']), gt, u, g, bb, ub;
  [s, gt] = poe(s, 0, 'Goblin Tunneler'); [s, u] = poe(s, 0, 'Urso'); [s, g] = poe(s, 1, 'Gigante'); [s, bb] = poe(s, 0, 'Boomerang Basics', 'hand'); [s, ub] = poe(s, 1, 'Urso');
  const alvos = legais(s, 0, x => x.t === 'activate' && x.oid === gt && x.targets).map(x => s.objects[x.targets[0].oid].name);
  assert.ok(alvos.includes('Urso') && !alvos.includes('Gigante'), 'poder 2 ou menos');
  const h = s.zones[0].hand.length;
  let t = resolve(act(comMana(s, 'U'), legais(comMana(s, 'U'), 0, x => x.t === 'cast' && x.oid === bb && x.targets && x.targets[0].oid === ub)[0]));
  assert.equal(t.objects[ub].zone, 'hand'); assert.equal(t.zones[0].hand.length, h - 1, 'do oponente: não compra');
  t = resolve(act(comMana(s, 'U'), legais(comMana(s, 'U'), 0, x => x.t === 'cast' && x.oid === bb && x.targets && x.targets[0].oid === u)[0]));
  assert.equal(t.objects[u].zone, 'hand'); assert.equal(t.zones[0].hand.length, h - 1 + 1 + 1, 'sua: volta e compra uma');
});

test('LT24 · Street Wraith: ciclar pagando 2 de vida (sem mana); com 1 de vida, não', () => {
  let s = mesaX(['Street Wraith']), sw;
  [s, sw] = poe(s, 0, 'Street Wraith', 'hand');
  const a = legais(s, 0, x => x.t === 'cycle' && x.oid === sw)[0]; assert.ok(a, 'ciclar sem mana');
  const v = s.players[0].life, h = s.zones[0].hand.length;
  const t = tudo(act(s, a));
  assert.equal(t.players[0].life, v - 2); assert.equal(t.objects[sw].zone, 'graveyard'); assert.equal(t.zones[0].hand.length, h, 'descartou e comprou');
  const u = J(s); u.players[0].life = 1;
  assert.equal(legais(u, 0, x => x.t === 'cycle' && x.oid === sw).length, 0, '119.4: com 1 de vida não paga 2');
});

test('LT24 · Get Lost destrói criatura, encantamento ou planeswalker e o controlador cria dois Mapas', () => {
  let s = mesaX(['Get Lost'], ['Gigante']), gl, g;
  [s, gl] = poe(s, 0, 'Get Lost', 'hand'); [s, g] = poe(s, 1, 'Gigante');
  s = resolve(act(comMana(s, 'WW'), legais(comMana(s, 'WW'), 0, x => x.t === 'cast' && x.oid === gl && x.targets && x.targets[0].oid === g)[0]));
  assert.equal(s.objects[g].zone, 'graveyard');
  assert.equal(s.zones[1].battlefield.filter(o => s.objects[o].name === 'Map').length, 2, 'B cria dois Mapas');
});

test('M-341 · as 13 do lote XV revisadas jogam (decisão A)', () => {
  for (const n of ['Boomerang Basics', 'Street Wraith', 'Get Lost', 'Escape Tunnel', 'Meteor Golem', 'Banishing Light', 'Leyline Binding', 'Desolate Mire', 'Cast Out', 'Conclave Tribunal', 'Goblin Tunneler', 'Access Tunnel', 'Geistwave'])
    assert.equal(S.coverage(carta(n)).level, 'completo', n + ' joga');
});
