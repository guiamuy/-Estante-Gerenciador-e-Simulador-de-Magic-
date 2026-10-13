// M-363 · LT36 · Frases do Pauper: metalurgia em estática (611.2), "desvira no passo de desvirar de cada outro jogador" (502.3) e 115.3 (cada
// palavra "target" é uma escolha própria) — revisão por lote XXVII: Agony Warp, Ardent Recruit, Bender's Waterskin (texto: corpus do Oracle do Forge,
// consulta de 12/10/2026, guardado em .listas/oficiais-revisadas.json). Todos os testes falham no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, comMana, CARTAS } from './cmd.mjs';
import { loadModules } from './_load.mjs';
const { leitor: L } = loadModules();

const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const mv = m => [...(m || '').matchAll(/\{([^}]+)\}/g)].reduce((n, x) => n + (/^\d+$/.test(x[1]) ? +x[1] : 1), 0);
const cores = m => [...new Set(((m || '').match(/[WUBRG]/g) || []))];
const carta = n => { const c = OF.find(x => x.name === n); assert.ok(c, n); return { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: mv(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: cores(c.mana_cost), ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const NOMES = ['Agony Warp', 'Ardent Recruit', "Bender's Waterskin"];
const EX = { example: { action: 'etb', target: 'none', expect: { attached: false } } };
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: mv(mana_cost), keywords: [], oracle_text: '', colors: cores(mana_cost), ...extra });
const cards = { ...Object.fromEntries(NOMES.map(n => [n, carta(n)])), Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2' }), Engenho: c0('Engenho', 'Artifact', '{1}') };
const scripts = Object.fromEntries(NOMES.map(n => [n, { ...L.ler(carta(n)).script, ...EX }]));
function mesaX(a = [], b = [], seed = 71) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: { ...CARTAS, ...cards }, scripts, first: 0, players: [{ name: 'A', deck: baralho([...a, 'Island', 'Swamp']) }, { name: 'B', deck: baralho([...b, 'Plains', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolveSo = s => act(act(s, { t: 'pass', p: s.turn.priority }), { t: 'pass', p: 1 - s.turn.priority });
const pt = (s, o) => { const st = E.stats(s, s.objects[o]); return [st.power, st.toughness]; };

test('LT36 · 115.3 · Agony Warp: os dois alvos podem ser a mesma criatura (cada "target" é uma escolha) — a Urso 2/2 fica −1/−1 e morre; ou duas criaturas diferentes', () => {
  let s = mesaX(['Agony Warp'], ['Urso']), aw, u1, u2;
  [s, aw] = poe(s, 0, 'Agony Warp', 'hand'); [s, u1] = poe(s, 1, 'Urso'); [s, u2] = poe(s, 1, 'Urso');
  const m = comMana(s, 'UB'); const ofs = legais(m, 0, a => a.t === 'cast' && a.oid === aw);
  const mesma = ofs.find(a => a.targets.length === 2 && a.targets[0].oid === u1 && a.targets[1].oid === u1); assert.ok(mesma, 'oferece a mesma criatura nos dois alvos');
  assert.ok(ofs.some(a => a.targets[0].oid === u1 && a.targets[1].oid === u2), 'e duas diferentes');
  let t = resolveSo(act(m, mesma));
  assert.equal(t.objects[u1].zone, 'graveyard', '−3/−0 e −0/−3 na mesma: 2/2 vira −1/−1');
  let t2 = resolveSo(act(m, ofs.find(a => a.targets[0].oid === u1 && a.targets[1].oid === u2)));
  assert.deepEqual(pt(t2, u1), [-1, 2]); assert.equal(t2.objects[u2].zone, 'graveyard', 'a segunda, com −0/−3, morre');
});

test('LT36 · 611.2 · Ardent Recruit: 1/1; 3/3 enquanto você controla três artefatos ou mais (conferido a cada momento)', () => {
  let s = mesaX(['Ardent Recruit', 'Engenho']), ar, e = [];
  [s, ar] = poe(s, 0, 'Ardent Recruit');
  assert.deepEqual(pt(s, ar), [1, 1]);
  for (let i = 0; i < 3; i++) { let x; [s, x] = poe(s, 0, 'Engenho'); e.push(x); }
  assert.deepEqual(pt(s, ar), [3, 3]);
  s = J(s); s.zones[0].battlefield = s.zones[0].battlefield.filter(x => x !== e[0]); s.zones[0].graveyard.push(e[0]); s.objects[e[0]].zone = 'graveyard';
  assert.deepEqual(pt(s, ar), [1, 1], 'com dois artefatos, volta a 1/1');
});

test("LT36 · 502.3 · Bender's Waterskin: virada no seu turno, desvira no passo de desvirar do oponente (e no seu, normalmente)", () => {
  let s = mesaX(["Bender's Waterskin"]), bw;
  [s, bw] = poe(s, 0, "Bender's Waterskin");
  s = J(s); s.objects[bw].tapped = true;
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'upkeep', 200);
  assert.equal(s.objects[bw].tapped, false, 'desvirou no desvirar do oponente');
  s = J(s); s.objects[bw].tapped = true;
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'upkeep', 300);
  assert.equal(s.objects[bw].tapped, false, 'e no seu');
});

test('LT36 · 707.10c / 115.3 · a cópia de Agony Warp (replicar, tempestade) também aceita a mesma criatura nos dois alvos (achado da revisão)', () => {
  let s = mesaX(['Agony Warp'], ['Urso']), aw, u1, u2;
  [s, aw] = poe(s, 0, 'Agony Warp', 'hand'); [s, u1] = poe(s, 1, 'Urso'); [s, u2] = poe(s, 1, 'Urso');
  let q = J(s); q.queued.push({ source: aw, name: 'Agony Warp', controller: 0, effects: scripts['Agony Warp'].effects, when: 'replicar', copia: true, copiaDeMagia: true });
  q = act(q, { t: 'pass', p: q.turn.priority });
  q = act(q, { t: 'pick_target', p: 0, index: q.pending.options.findIndex(o => o.oid === u1) });
  assert.ok(q.pending && q.pending.options.some(o => o.oid === u1), 'o segundo alvo da cópia pode ser a mesma Urso');
});
