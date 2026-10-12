// M-337 · LT20 · "target creature or planeswalker" (seletor), reforço lido pelo leitor ("Kicker {4}"; "If this spell was kicked, it deals 4
// damage instead"; "When ~ enters, if it was kicked, …", 702.33d) e éditos ("Target player sacrifices a creature", "Each player / each
// opponent sacrifices a creature", 701.21a). Scripts lidos pelo leitor; texto oficial em .listas/oficiais-revisadas.json (Oracle do Forge,
// 12/10/2026). Cada teste falha no leitor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, comMana, tudo, CARTAS } from './cmd.mjs';
import { loadModules } from './_load.mjs';

const { leitor: L, scripts: S } = loadModules();
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const mv = m => [...m.matchAll(/\{([^}]+)\}/g)].reduce((n, x) => n + (/^\d+$/.test(x[1]) ? +x[1] : 1), 0);
const carta = n => { const c = OF.find(x => x.name === n); assert.ok(c, n); return { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: mv(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: [...new Set(c.mana_cost.match(/[WUBRG]/g) || [])], ...(c.power ? { power: c.power, toughness: c.toughness } : {}) }; };
const NOMES = ['Erode', 'Sear', 'Burst Lightning', 'Gatekeeper of Malakir', 'Diabolic Edict', 'Fleshbag Marauder', 'Bituminous Blast'];
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: mv(mana_cost), keywords: [], oracle_text: '', colors: [...new Set(mana_cost.match(/[WUBRG]/g) || [])], ...extra });
const cards = { ...Object.fromEntries(NOMES.map(n => [n, carta(n)])), Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2' }),
  Gigante: c0('Gigante', 'Creature — Giant', '{4}{G}', { power: '5', toughness: '5' }), Andarilho: c0('Andarilho', 'Legendary Planeswalker — Teste', '{3}', { loyalty: '6' }) };
const scripts = Object.fromEntries(NOMES.map(n => [n, { ...L.ler(carta(n)).script, example: { action: 'etb', target: 'none', expect: { attached: false } } }]));
scripts.Erode.example = scripts.Sear.example = { target: 'enemy-creature', expect: { gone: true } };
scripts['Burst Lightning'].example = { target: 'opponent', expect: { opponentLife: -2 } };
scripts['Diabolic Edict'].example = { target: 'opponent', expect: { opponentLife: 0 } };
scripts['Bituminous Blast'].example = { target: 'enemy-creature', expect: { gone: true } };
cards['Bituminous Blast'].keywords = ['Cascade'];
scripts.Andarilho = { name: 'Andarilho', loyalty: [{ cost: 1, effects: [{ do: 'gain', amount: 1 }] }], example: { action: 'loyalty:0', target: 'none', expect: { selfLife: 1 } } };
function mesaX(a = [], b = []) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 13, mode: 'full', cards: { ...CARTAS, ...cards }, scripts, first: 0, players: [{ name: 'A', deck: baralho([...a, 'Plains', 'Swamp', 'Mountain']) }, { name: 'B', deck: baralho([...b, 'Forest', 'Plains']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => act(act(s, { t: 'pass', p: s.turn.priority }), { t: 'pass', p: 1 - s.turn.priority });
const conjura = (s, oid, f = () => true) => { const a = legais(s, 0, x => x.t === 'cast' && x.oid === oid && f(x))[0]; assert.ok(a, 'conjurar ' + s.objects[oid].name); return act(s, a); };

test('LT20 · Erode e Sear miram criatura ou planeswalker (não jogador nem terreno); Erode deixa o controlador buscar um básico virado', () => {
  let s = mesaX(['Erode', 'Sear'], ['Urso', 'Andarilho']), er, se, u, pw;
  [s, er] = poe(s, 0, 'Erode', 'hand'); [s, se] = poe(s, 0, 'Sear', 'hand'); [s, u] = poe(s, 1, 'Urso'); [s, pw] = poe(s, 1, 'Andarilho');
  s = J(s); s.objects[pw].counters.loyalty = 6;
  const alvos = legais(comMana(s, 'W'), 0, x => x.t === 'cast' && x.oid === er).map(x => x.targets && x.targets[0] && (x.targets[0].oid != null ? s.objects[x.targets[0].oid].name : 'jogador'));
  assert.ok(alvos.includes('Urso') && alvos.includes('Andarilho'), 'criatura e planeswalker'); assert.ok(!alvos.includes('jogador') && !alvos.includes('Forest'), 'jogador e terreno não');
  let t = resolve(conjura(comMana(s, 'RR'), se, x => x.targets[0].oid === pw)); t = tudo(t);
  assert.equal(t.objects[pw].counters.loyalty, 2, 'Sear tira 4 de lealdade');
  const terrasB = s.zones[1].battlefield.filter(o => s.objects[o].name === 'Forest').length;
  t = resolve(conjura(comMana(s, 'W'), er, x => x.targets[0].oid === u));
  t = tudo(t, x => legais(x, x.pending.p, y => y.t === 'pick' || y.t === 'pay')[0] || legais(x, x.pending.p)[0]);
  assert.equal(t.objects[u].zone, 'graveyard');
  const novas = t.zones[1].battlefield.filter(o => /^(Forest|Plains)$/.test(t.objects[o].name));
  assert.ok(novas.length >= terrasB + 1, 'B buscou um básico'); assert.ok(novas.some(o => t.objects[o].tapped), 'entrou virado');
});

test('LT20 · Burst Lightning: 2 de dano; com reforço {4}, 4', () => {
  let s = mesaX(['Burst Lightning']), bl;
  [s, bl] = poe(s, 0, 'Burst Lightning', 'hand');
  const v = s.players[1].life;
  let t = tudo(resolve(conjura(comMana(s, 'R'), bl, x => !x.kick && x.targets && x.targets[0].player === 1)));
  assert.equal(v - t.players[1].life, 2);
  const ok = legais(comMana(s, 'RRRRR'), 0, x => x.t === 'cast' && x.oid === bl && x.kick === 1 && x.targets && x.targets[0].player === 1)[0];
  assert.ok(ok, 'o reforço é oferecido');
  t = tudo(resolve(act(comMana(s, 'RRRRR'), ok)));
  assert.equal(v - t.players[1].life, 4, 'reforçada: 4');
});

test('LT20 · Diabolic Edict: o jogador alvo escolhe qual criatura sacrifica; Gatekeeper of Malakir só pede o sacrifício se reforçado', () => {
  let s = mesaX(['Diabolic Edict', 'Gatekeeper of Malakir'], ['Urso', 'Gigante']), de, gk, u, g;
  [s, de] = poe(s, 0, 'Diabolic Edict', 'hand'); [s, gk] = poe(s, 0, 'Gatekeeper of Malakir', 'hand'); [s, u] = poe(s, 1, 'Urso'); [s, g] = poe(s, 1, 'Gigante');
  let t = resolve(conjura(comMana(s, 'BB'), de, x => x.targets && x.targets[0].player === 1));
  t = passaAte(t, x => !!x.pending);
  assert.equal(t.pending.p, 1, 'quem escolhe é o jogador alvo');
  t = tudo(act(t, legais(t, 1, x => x.oid === u)[0]));
  assert.equal(t.objects[u].zone, 'graveyard'); assert.equal(t.objects[g].zone, 'battlefield');
  let k = tudo(resolve(conjura(comMana(s, 'BB'), gk, x => !x.kick)));
  assert.equal(k.objects[u].zone, 'battlefield', 'sem reforço: nada'); assert.equal(k.objects[g].zone, 'battlefield');
  const ak = legais(comMana(s, 'BBB'), 0, x => x.t === 'cast' && x.oid === gk && x.kick === 1)[0]; assert.ok(ak, 'reforço {B}');
  k = resolve(act(comMana(s, 'BBB'), ak)); k = passaAte(k, x => !!x.pending && x.pending.kind === 'pick_target' || !!x.pending || !x.stack.length);
  for (let i = 0; i < 10 && (k.pending || k.stack.length); i++) { if (!k.pending) { k = resolve(k); continue; } const la = legais(k, k.pending.p); k = act(k, k.pending.kind === 'pick_target' ? la.find(y => k.pending.options[y.index].player === 1) : la.find(y => y.oid === g) || la[0]); }
  assert.ok([u, g].some(o => k.objects[o].zone === 'graveyard'), 'reforçado: B sacrifica uma criatura');
});

test('LT20 · Fleshbag Marauder: cada jogador sacrifica uma criatura — quem a conjurou pode sacrificar a própria Marauder', () => {
  let s = mesaX(['Fleshbag Marauder'], ['Urso']), fm, u;
  [s, fm] = poe(s, 0, 'Fleshbag Marauder', 'hand'); [s, u] = poe(s, 1, 'Urso');
  let t = resolve(conjura(comMana(s, 'BBB'), fm)); t = passaAte(t, x => !!x.pending || !x.stack.length);
  t = tudo(t, x => legais(x, x.pending.p, y => y.oid === fm || y.oid === u)[0] || legais(x, x.pending.p)[0]);
  assert.equal(t.objects[fm].zone, 'graveyard', 'A só tinha a Marauder: sacrificou-a'); assert.equal(t.objects[u].zone, 'graveyard', 'B sacrificou a Urso');
});

test('M-337 · leitor: "target creature or planeswalker" vira seletor; reforço e éditos lidos', () => {
  assert.equal(JSON.stringify(L.ler(carta('Sear')).script.effects[0].target), JSON.stringify({ tipos: ['creature', 'planeswalker'] }));
  assert.equal(JSON.stringify(L.ler(carta('Burst Lightning')).script.kicker), JSON.stringify({ mana: '{4}' }));
  assert.equal(JSON.stringify(L.ler(carta('Gatekeeper of Malakir')).script.abilities[0].condition), JSON.stringify({ kicked: true }));
});

test('achado da revisão do lote XI · 118.9d: conjurada sem pagar pela cascata, o reforço é oferecido e cobrado (antes saía de graça)', () => {
  let s = mesaX(['Bituminous Blast', 'Burst Lightning'], ['Gigante']), bb, g;
  [s, bb] = poe(s, 0, 'Bituminous Blast', 'hand'); [s, g] = poe(s, 1, 'Gigante'); s = J(s);
  const lib = s.zones[0].library, bl = lib.find(x => s.objects[x].name === 'Burst Lightning'); s.zones[0].library = [bl, ...lib.filter(x => x !== bl)];
  const m = comMana(s, 'BBRRRRRRR'); let t = act(m, legais(m, 0, x => x.t === 'cast' && x.oid === bb && x.targets && x.targets[0].oid === g)[0]);
  t = passaAte(t, x => !!x.pending);
  assert.equal(t.pending.kind, 'free_cast');
  const pool = t.players[0].pool.R;
  const ofertas = legais(t, 0, x => x.t === 'cast_free' && x.oid === bl && x.targets && x.targets[0].player === 1);
  assert.ok(ofertas.some(x => x.kick === 1), 'o reforço é oferecido com {4} disponível');
  let u = act(t, ofertas.find(x => x.kick === 1));
  const pago = pool - u.players[0].pool.R;
  assert.equal(pago, 4, 'pagou {4} do reforço');
  let z = J(t); z.players[0].pool = { W: 0, U: 0, B: 0, R: 1, G: 0, C: 0 };
  assert.ok(!legais(z, 0, x => x.t === 'cast_free' && x.oid === bl).some(x => x.kick), 'sem mana, nada de reforço');
  assert.throws(() => E.apply(z, { t: 'cast_free', p: 0, oid: bl, targets: [{ player: 1 }], kick: 1 }), 'ação forjada sem mana é recusada');
});

test('M-337 · as 20 do lote XI revisadas jogam (decisão A)', () => {
  for (const n of ['Erode', 'Burst Lightning', 'Fleshbag Marauder', 'Butcher of Malakir', 'Firebending Lesson', 'Sear', "Hero's Downfall", 'Unholy Strength', "Altar's Reap", 'Bituminous Blast', 'Blood Pet', 'Diabolic Edict', "Chainer's Edict", 'Gatekeeper of Malakir', 'Dreadbore', "Vraska's Contempt", 'Cruel Edict', 'Innocent Blood', 'Merciless Executioner', 'Josu Vess, Lich Knight'])
    assert.equal(S.coverage(carta(n)).level, 'completo', n + ' joga');
});
