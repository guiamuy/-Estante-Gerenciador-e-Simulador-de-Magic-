// M-343 · LT26 · "~ deals X damage to any target" (o X pago, 107.3a), "target player or planeswalker" (Lava Axe), "target legendary creature"
// (Karakas, 205.4), "Then if you control four or more lands, untap that land" (Fabled Passage) e duas ações numa frase ("scry 1 and create a
// Treasure token", Greedy Freebooter). Scripts lidos pelo leitor; texto oficial em .listas/oficiais-revisadas.json (Oracle do Forge, 12/10/2026).
// Cada teste falha no leitor anterior (o de guarda, "X sem {X}", protege o que não deve ser lido).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, comMana, tudo, CARTAS } from './cmd.mjs';
import { loadModules } from './_load.mjs';

const { leitor: L, scripts: S } = loadModules();
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const mv = m => [...m.matchAll(/\{([^}]+)\}/g)].reduce((n, x) => n + (/^\d+$/.test(x[1]) ? +x[1] : x[1] === 'X' ? 0 : 1), 0);
const carta = n => { const c = OF.find(x => x.name === n); assert.ok(c, n); return { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: mv(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: [...new Set(c.mana_cost.match(/[WUBRG]/g) || [])], ...(c.power ? { power: c.power, toughness: c.toughness } : {}) }; };
const NOMES = ['Volcanic Geyser', 'Lava Axe', 'Karakas', 'Fabled Passage', 'Greedy Freebooter'];
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: mv(mana_cost), keywords: [], oracle_text: '', colors: [...new Set(mana_cost.match(/[WUBRG]/g) || [])], ...extra });
const cards = { ...Object.fromEntries(NOMES.map(n => [n, carta(n)])), Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2' }),
  Lenda: c0('Lenda', 'Legendary Creature — Human', '{1}{G}', { power: '2', toughness: '2' }), PW: c0('PW', 'Legendary Planeswalker — Teste', '{2}{G}', { loyalty: '6' }), Mata: c0('Mata', 'Instant', '{B}') };
const ex = { action: 'etb', target: 'none', expect: { attached: false } };
const scripts = { ...Object.fromEntries(NOMES.map(n => [n, { ...L.ler(carta(n)).script, example: ex }])), Mata: { name: 'Mata', effects: [{ do: 'destroy', target: 'creature' }], example: { target: 'enemy-creature', expect: { gone: true } } } };
function mesaX(a = [], b = [], seed = 37) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: { ...CARTAS, ...cards }, scripts, first: 0, players: [{ name: 'A', deck: baralho([...a, 'Plains', 'Swamp', 'Mountain']) }, { name: 'B', deck: baralho([...b, 'Forest', 'Island']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => tudo(act(act(s, { t: 'pass', p: s.turn.priority }), { t: 'pass', p: 1 - s.turn.priority }));

test('LT26 · Volcanic Geyser: causa X de dano (o X pago) a qualquer alvo', () => {
  let s = mesaX(['Volcanic Geyser'], ['Urso']), vg, u;
  [s, vg] = poe(s, 0, 'Volcanic Geyser', 'hand'); [s, u] = poe(s, 1, 'Urso');
  const m = comMana(s, 'RRRRR'), a = legais(m, 0, x => x.t === 'cast' && x.oid === vg && x.x === 3 && x.targets && x.targets[0].player === 1)[0];
  assert.ok(a, 'X = 3 no oponente');
  const v = s.players[1].life; assert.equal(resolve(act(m, a)).players[1].life, v - 3);
  const b = legais(m, 0, x => x.t === 'cast' && x.oid === vg && x.x === 1 && x.targets && x.targets[0].oid === u)[0];
  assert.equal(resolve(act(m, b)).objects[u].damage, 1, 'X = 1 na Urso');
});

test('LT26 · Lava Axe mira jogador ou planeswalker, nunca criatura', () => {
  let s = mesaX(['Lava Axe'], ['Urso', 'PW']), la, pw;
  [s, la] = poe(s, 0, 'Lava Axe', 'hand'); [s] = poe(s, 1, 'Urso'); [s, pw] = poe(s, 1, 'PW'); s = J(s); s.objects[pw].counters.loyalty = 6; // poe não passa pela entrada (306.5b)
  const m = comMana(s, 'RRRRR'), alvos = legais(m, 0, x => x.t === 'cast' && x.oid === la).map(x => x.targets[0]);
  assert.ok(alvos.some(t => t.player === 1) && alvos.some(t => t.player === 0) && alvos.some(t => t.oid === pw));
  assert.ok(!alvos.some(t => t.oid != null && m.objects[t.oid].name === 'Urso'), 'criatura não é alvo');
  const t = resolve(act(m, legais(m, 0, x => x.t === 'cast' && x.oid === la && x.targets[0].oid === pw)[0]));
  assert.equal(t.objects[pw].counters.loyalty, 1, '5 de dano tiram 5 de lealdade (120.3c)');
});

test('LT26 · Karakas devolve só criatura lendária à mão do dono', () => {
  let s = mesaX(['Karakas'], ['Urso', 'Lenda']), k, u, l;
  [s, k] = poe(s, 0, 'Karakas'); [s, u] = poe(s, 1, 'Urso'); [s, l] = poe(s, 1, 'Lenda');
  const alvos = legais(s, 0, x => x.t === 'activate' && x.oid === k && x.targets).map(x => x.targets[0].oid);
  assert.ok(alvos.includes(l) && !alvos.includes(u), 'só a lendária');
  const t = resolve(act(s, legais(s, 0, x => x.t === 'activate' && x.oid === k && x.targets && x.targets[0].oid === l)[0]));
  assert.equal(t.objects[l].zone, 'hand'); assert.ok(t.zones[1].hand.includes(l), 'mão do dono');
});

test('LT26 · Fabled Passage: a terra achada entra virada; com quatro terrenos ou mais, desvira', () => {
  let s = mesaX(['Fabled Passage']), fp;
  [s, fp] = poe(s, 0, 'Fabled Passage');
  const busca = t => { t = resolve(act(t, legais(t, 0, x => x.t === 'activate' && x.oid === fp)[0])); return t; };
  const achou = (t0, t1) => t1.zones[0].battlefield.find(o => !t0.zones[0].battlefield.includes(o));
  let t = busca(s); const a1 = achou(s, t);
  assert.ok(a1, 'achou uma básica'); assert.equal(t.objects[a1].tapped, true, 'dois terrenos depois: virada');
  let r = s; for (let i = 0; i < 3; i++) [r] = poe(r, 0, 'Plains');
  t = busca(r); const a2 = achou(r, t);
  assert.equal(t.objects[a2].tapped, false, 'quatro terrenos ou mais (a Passage já saiu): desvirada');
});

test('LT26 · Greedy Freebooter: ao morrer, vidência 1 e um Tesouro', () => {
  let s = mesaX(['Greedy Freebooter', 'Mata']), gf, m;
  [s, gf] = poe(s, 0, 'Greedy Freebooter'); [s, m] = poe(s, 0, 'Mata', 'hand');
  s = act(comMana(s, 'B'), legais(comMana(s, 'B'), 0, x => x.t === 'cast' && x.oid === m && x.targets && x.targets[0].oid === gf)[0]);
  s = resolve(s);
  assert.equal(s.objects[gf].zone, 'graveyard');
  assert.equal(s.zones[0].battlefield.filter(o => s.objects[o].name === 'Treasure').length, 1, 'um Tesouro');
});

test('LT26 · X sem {X} no custo não é lido (107.3); duas ações com pronome na segunda não se dividem', () => {
  const r = L.ler({ name: 'Teste X', type_line: 'Creature — Elemental', mana_cost: '{3}{R}', oracle_text: 'When Teste X enters, it deals X damage to any target.' });
  assert.equal(r.completa, false);
  const q = L.ler({ name: 'Teste E', type_line: 'Instant', mana_cost: '{1}{U}', oracle_text: 'Tap target creature and put a stun counter on it.' });
  assert.equal(q.completa, false, 'o "it" da segunda metade depende da primeira');
});

test('M-343 · as 12 do lote XVII revisadas jogam (decisão A)', () => {
  for (const n of ['Karakas', 'Fabled Passage', 'Greedy Freebooter', 'Traumatic Critique', 'Lava Axe', 'Candy Trail', 'Blaze', 'Starstorm', 'Volcanic Geyser', 'Wall of Omens', 'Radiant Grove', 'Tranquil Expanse'])
    assert.equal(S.coverage(carta(n)).level, 'completo', n + ' joga');
});
