// M-395 · LT62 · Blighted Agent ("can't be blocked"), Idyllic Grange (o singular de "Plains"; +1/+1 em criatura sua), God-Pharaoh's Faithful
// (gatilho por cor da mágica) e Memory Lapse (anulada vai ao topo do grimório do dono) — Oracle do Forge, consulta de 12/10/2026
// (.listas/oficiais-revisadas.json), caminho de produção (APROVADAS). Falham no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, act, poe, legais, passaAte, CARTAS } from './cmd.mjs';
import { valorDeMana, palavrasDoTexto } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const of = (n, colors = []) => { const r = OF.find(x => x.name === n); return { name: r.name, type_line: r.type_line, mana_cost: r.mana_cost || '', cmc: valorDeMana(r.mana_cost || ''), keywords: palavrasDoTexto(r.oracle_text), oracle_text: r.oracle_text, colors, ...(r.power != null ? { power: r.power, toughness: r.toughness } : {}) }; };
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: valorDeMana(mana_cost), keywords: [], oracle_text: '', colors: [], ...extra });
const CARDS = { ...CARTAS, 'Blighted Agent': of('Blighted Agent', ['U']), 'Idyllic Grange': of('Idyllic Grange'), "God-Pharaoh's Faithful": of("God-Pharaoh's Faithful", ['W']), 'Memory Lapse': of('Memory Lapse', ['U']),
  Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2', colors: ['G'] }) };
function mesa() {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 67, mode: 'full', cards: CARDS, first: 0,
    players: [{ name: 'A', deck: baralho(['Blighted Agent', 'Idyllic Grange', "God-Pharaoh's Faithful", 'Memory Lapse', 'Lightning Bolt', 'Plains', 'Island', 'Mountain']) }, { name: 'B', deck: baralho(['Urso', 'Lightning Bolt', 'Mountain', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending);

test('LT62 · Blighted Agent não pode ser bloqueado', () => {
  let s = mesa(), a, u; [s, a] = poe(s, 0, 'Blighted Agent'); [s, u] = poe(s, 1, 'Urso');
  assert.equal(E.canBlock(s, u, a), false);
});

test('LT62 · Idyllic Grange: com três outras Planícies entra desvirada e põe +1/+1 numa criatura sua; com duas, entra virada e nada', () => {
  let s = mesa(), g, a; [s, g] = poe(s, 0, 'Idyllic Grange', 'hand'); for (let i = 0; i < 3; i++) [s] = poe(s, 0, 'Plains'); [s, a] = poe(s, 0, 'Blighted Agent');
  s = act(s, legais(s, 0, x => x.t === 'play_land' && x.oid === g)[0]);
  assert.equal(s.objects[g].tapped, false, 'entrou desvirada');
  if (s.pending && s.pending.kind === 'pick_target') s = act(s, { t: 'pick_target', p: 0, index: s.pending.options.findIndex(o => o.oid === a) });
  s = resolve(s); assert.equal(s.objects[a].counters.p1p1, 1);
  let t = mesa(), g2; [t, g2] = poe(t, 0, 'Idyllic Grange', 'hand'); for (let i = 0; i < 2; i++) [t] = poe(t, 0, 'Plains');
  t = resolve(act(t, legais(t, 0, x => x.t === 'play_land' && x.oid === g2)[0])); assert.equal(t.objects[g2].tapped, true, 'com duas, virada');
});

test('LT62 · God-Pharaoh\'s Faithful: ganha 1 ao conjurar mágica vermelha; Memory Lapse põe a mágica anulada no topo do grimório do dono', () => {
  let s = mesa(), f, b, m; [s, f] = poe(s, 0, "God-Pharaoh's Faithful"); [s, b] = poe(s, 0, 'Lightning Bolt', 'hand'); [s] = poe(s, 0, 'Mountain');
  s = resolve(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === b && x.targets[0].player === 1)[0]));
  assert.equal(s.players[0].life, 21, 'ganhou 1 com a mágica vermelha');
  let t = mesa(), bb, ml; [t, ml] = poe(t, 0, 'Memory Lapse', 'hand'); for (let i = 0; i < 2; i++) [t] = poe(t, 0, 'Island'); [t, bb] = poe(t, 1, 'Lightning Bolt', 'hand'); [t] = poe(t, 1, 'Mountain');
  t = act(t, { t: 'pass', p: 0 }); // segue até o turno de B, que conjura o Bolt
  t = passaAte(t, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  t = act(t, legais(t, 1, x => x.t === 'cast' && x.oid === bb && x.targets[0].player === 0)[0]);
  t = passaAte(t, x => x.turn.priority === 0);
  t = resolve(act(t, legais(t, 0, x => x.t === 'cast' && x.oid === ml && x.targets[0].oid === bb)[0]));
  assert.equal(t.objects[bb].zone, 'library'); assert.equal(t.zones[1].library[0], bb, 'no topo do grimório de B');
});

test('LT62 · achados da revisão: o registro dá o marcador +1/+1 à criatura (não à fonte); recusar pagar o "a menos que" de uma anulação com "topo" põe a mágica no topo do grimório', async () => {
  const { loadModules } = await import('./_load.mjs'); const T = loadModules().table;
  let s = mesa(), g, a; [s, g] = poe(s, 0, 'Idyllic Grange', 'hand'); for (let i = 0; i < 3; i++) [s] = poe(s, 0, 'Plains'); [s, a] = poe(s, 0, 'Blighted Agent');
  s = act(s, legais(s, 0, x => x.t === 'play_land' && x.oid === g)[0]);
  if (s.pending && s.pending.kind === 'pick_target') s = act(s, { t: 'pick_target', p: 0, index: s.pending.options.findIndex(o => o.oid === a) });
  const linhas = []; for (let i = 0; i < 6 && s.stack.length && !s.pending; i++) { const x = { t: 'pass', p: s.turn.priority }, r = E.apply(s, x); linhas.push(...[].concat(T.describe(s, x, r.events || [], r.state) || [])); s = r.state; }
  assert.ok(linhas.some(l => /^Blighted Agent recebeu 1 marcador \+1\/\+1/.test(l)), linhas.join(' | '));
  let t = mesa(), bb; [t, bb] = poe(t, 1, 'Lightning Bolt', 'hand'); [t] = poe(t, 1, 'Mountain');
  t = passaAte(t, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  t = act(t, legais(t, 1, x => x.t === 'cast' && x.oid === bb && x.targets[0].player === 0)[0]);
  t = JSON.parse(JSON.stringify(t)); t.pending = { kind: 'may_pay', p: 1, cost: '{3}', target: bb, name: 'Lapso caro', topo: true };
  t = act(t, legais(t, 1, x => x.t === 'decline')[0]);
  assert.equal(t.objects[bb].zone, 'library'); assert.equal(t.zones[1].library[0], bb);
});
