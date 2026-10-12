// M-336 · LT19 · Equipamentos e Auras que concedem ou proíbem ("Equipped creature has hexproof and haste", "Enchanted creature can't attack or
// block"), terras rápidas ("enters tapped unless you control two or fewer other lands") e "Target creature can't be blocked this turn".
// Scripts lidos pelo leitor; texto oficial em .listas/oficiais-revisadas.json (Oracle do Forge, 12/10/2026). Cada teste falha antes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, comMana, tudo, CARTAS } from './cmd.mjs';
import { loadModules } from './_load.mjs';

const { leitor: L, scripts: S } = loadModules();
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const mv = m => [...m.matchAll(/\{([^}]+)\}/g)].reduce((n, x) => n + (/^\d+$/.test(x[1]) ? +x[1] : 1), 0);
const carta = n => { const c = OF.find(x => x.name === n); assert.ok(c, n); return { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: mv(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: [...new Set(c.mana_cost.match(/[WUBRG]/g) || [])], ...(c.power ? { power: c.power, toughness: c.toughness } : {}) }; };
const NOMES = ['Swiftfoot Boots', 'Lightning Greaves', 'Pacifism', 'Spirebluff Canal', "Rogue's Passage"];
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: mv(mana_cost), keywords: [], oracle_text: '', colors: [...new Set(mana_cost.match(/[WUBRG]/g) || [])], ...extra });
const cards = { ...Object.fromEntries(NOMES.map(n => [n, carta(n)])), Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2' }), Raio: c0('Raio', 'Instant', '{R}') };
const ex = { action: 'etb', target: 'none', expect: { attached: false } };
const scripts = { ...Object.fromEntries(NOMES.map(n => [n, { ...L.ler(carta(n)).script, example: ex }])), Raio: { name: 'Raio', effects: [{ do: 'damage', amount: 1, target: 'any' }], example: { target: 'opponent', expect: { opponentLife: -1 } } } };
scripts.Pacifism.example = { action: 'aura', target: 'enemy-creature', expect: { attached: true } };
function mesaX(a = [], b = []) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 11, mode: 'full', cards: { ...CARTAS, ...cards }, scripts, first: 0, players: [{ name: 'A', deck: baralho([...a, 'Plains', 'Island', 'Mountain']) }, { name: 'B', deck: baralho([...b, 'Forest', 'Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => tudo(act(act(s, { t: 'pass', p: s.turn.priority }), { t: 'pass', p: 1 - s.turn.priority }));
const equipa = (s, eq, alvo) => { const a = legais(s, 0, x => x.oid === eq && x.targets && x.targets[0] && x.targets[0].oid === alvo)[0]; assert.ok(a, 'equipar'); return resolve(act(s, a)); };

test('LT19 · Swiftfoot Boots: a criatura equipada tem resistência a magia (o oponente não mira) e ímpeto (ataca no turno em que entra)', () => {
  let s = mesaX(['Swiftfoot Boots', 'Urso'], ['Raio']), b, u, r;
  [s, b] = poe(s, 0, 'Swiftfoot Boots'); [s, u] = poe(s, 0, 'Urso', 'battlefield', { sick: true }); [s, r] = poe(s, 1, 'Raio', 'hand');
  s = equipa(comMana(s, 'W'), b, u);
  assert.equal(s.objects[b].attachedTo, u);
  let t = comMana(J(s), 'R', 1); t.turn.priority = 1;
  assert.ok(!legais(t, 1, x => x.t === 'cast' && x.oid === r).some(x => x.targets && x.targets[0].oid === u), 'resistência a magia: o Raio do oponente não mira a Urso');
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 0);
  assert.equal(s.pending.kind, 'attackers', 'chega à declaração');
  s = act(s, { t: 'attack', p: 0, attackers: [u] });
  assert.equal(s.objects[u].attacking != null, true, 'ímpeto: a Urso que acabou de entrar ataca');
});

test('LT19 · Lightning Greaves: equipar por {0}; a criatura tem ímpeto e é inalvejável até para você', () => {
  let s = mesaX(['Lightning Greaves', 'Urso', 'Raio']), g, u, r;
  [s, g] = poe(s, 0, 'Lightning Greaves'); [s, u] = poe(s, 0, 'Urso'); [s, r] = poe(s, 0, 'Raio', 'hand');
  s = equipa(s, g, u);
  assert.equal(s.objects[g].attachedTo, u, 'equipou sem mana');
  assert.ok(!legais(comMana(s, 'R'), 0, x => x.t === 'cast' && x.oid === r).some(x => x.targets && x.targets[0].oid === u), 'shroud: nem você mira');
});

test('LT19 · Pacifism: a criatura encantada não ataca nem bloqueia; as outras sim', () => {
  let s = mesaX(['Pacifism'], ['Urso']), p, u1, u2;
  [s, p] = poe(s, 0, 'Pacifism', 'hand'); [s, u1] = poe(s, 1, 'Urso'); [s, u2] = poe(s, 1, 'Urso');
  s = resolve(act(comMana(s, 'WW'), legais(comMana(s, 'WW'), 0, x => x.t === 'cast' && x.oid === p && x.targets && x.targets[0].oid === u1)[0]));
  assert.equal(s.objects[p].attachedTo, u1);
  let t = passaAte(s, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 1);
  assert.throws(() => E.apply(t, { t: 'attack', p: 1, attackers: [u1] }), 'a encantada não ataca');
  assert.doesNotThrow(() => E.apply(t, { t: 'attack', p: 1, attackers: [u2] }), 'a outra ataca');
  const el = E.eligibleBlockers(s, 1);
  assert.ok(!el.includes(u1) && el.includes(u2), 'a encantada não bloqueia');
});

test('LT19 · Spirebluff Canal: desvirada com até dois outros terrenos; virada com três', () => {
  let s = mesaX(['Spirebluff Canal']), c;
  [s] = poe(s, 0, 'Island'); [s] = poe(s, 0, 'Mountain'); [s, c] = poe(s, 0, 'Spirebluff Canal', 'hand');
  let t = act(s, legais(s, 0, x => x.t === 'play_land' && x.oid === c)[0]);
  assert.equal(t.objects[c].tapped, false, 'dois outros: desvirada');
  [s] = poe(s, 0, 'Plains');
  t = act(s, legais(s, 0, x => x.t === 'play_land' && x.oid === c)[0]);
  assert.equal(t.objects[c].tapped, true, 'três outros: virada');
});

test("LT19 · Rogue's Passage: a criatura alvo não pode ser bloqueada neste turno; no turno seguinte, pode", () => {
  let s = mesaX(["Rogue's Passage", 'Urso'], ['Urso']), rp, a, b;
  [s, rp] = poe(s, 0, "Rogue's Passage"); [s, a] = poe(s, 0, 'Urso'); [s, b] = poe(s, 1, 'Urso');
  s = resolve(act(comMana(s, 'WWWW'), legais(comMana(s, 'WWWW'), 0, x => x.t === 'activate' && x.oid === rp && x.targets && x.targets[0].oid === a)[0]));
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 0); s = act(s, { t: 'attack', p: 0, attackers: [a] });
  s = passaAte(s, x => x.pending && x.pending.kind === 'blockers');
  assert.throws(() => E.apply(s, { t: 'block', p: 1, blocks: [[b, a]] }), /bloquead/, 'não pode ser bloqueada neste turno');
  let t = passaAte(act(s, { t: 'block', p: 1, blocks: [] }), x => x.turn.number === 3 && x.pending && x.pending.kind === 'attackers' && x.pending.p === 0);
  t = act(t, { t: 'attack', p: 0, attackers: [a] }); t = passaAte(t, x => x.pending && x.pending.kind === 'blockers');
  assert.doesNotThrow(() => E.apply(t, { t: 'block', p: 1, blocks: [[b, a]] }), 'no turno seguinte, pode');
});

test('M-336 · as 15 do lote X revisadas jogam (decisão A)', () => {
  for (const n of ['Swiftfoot Boots', 'Lightning Greaves', 'Pacifism', "Rogue's Passage", 'Idyllic Beachfront', 'Blooming Marsh', 'Botanical Sanctum', 'Blackcleave Cliffs', 'Inspiring Vantage', 'Copperline Gorge', 'Concealed Courtyard', 'Seachrome Coast', 'Spirebluff Canal', 'Razorverge Thicket', 'Darkslick Shores'])
    assert.equal(S.coverage(carta(n)).level, 'completo', n + ' joga');
});
