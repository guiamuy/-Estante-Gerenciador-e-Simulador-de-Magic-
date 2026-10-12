// M-342 · LT25 · aceleração de mana lida pelo leitor: terras de horizonte ("{T}, Pay 1 life: Add {G} or {W}", 106.12 / 119.4), Starting Town
// ("enters tapped unless it's your first, second, or third turn of the game"), Mox Opal (metalurgia: "Activate only if…", 602.5b), Spirit Guides
// ("Exile ~ from your hand: Add {R}", 113.6), Lion's Eye Diamond ("Discard your hand, Sacrifice ~") e City of Traitors ("When you play another land",
// 305.1). Texto oficial em .listas/oficiais-revisadas.json (Oracle do Forge, 12/10/2026). Cada teste falha no motor/leitor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, comMana, tudo, CARTAS } from './cmd.mjs';
import { loadModules } from './_load.mjs';

const { leitor: L, scripts: S } = loadModules();
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const mv = m => [...m.matchAll(/\{([^}]+)\}/g)].reduce((n, x) => n + (/^\d+$/.test(x[1]) ? +x[1] : 1), 0);
const carta = n => { const c = OF.find(x => x.name === n); assert.ok(c, n); return { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: mv(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: [...new Set(c.mana_cost.match(/[WUBRG]/g) || [])], ...(c.power ? { power: c.power, toughness: c.toughness } : {}) }; };
const NOMES = ['Horizon Canopy', 'Starting Town', 'Mox Opal', 'Simian Spirit Guide', "Lion's Eye Diamond", 'City of Traitors'];
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: mv(mana_cost), keywords: [], oracle_text: '', colors: [...new Set(mana_cost.match(/[WUBRG]/g) || [])], ...extra });
const cards = { ...Object.fromEntries(NOMES.map(n => [n, carta(n)])), Bugiganga: c0('Bugiganga', 'Artifact', '{1}'), Choque: c0('Choque', 'Instant', '{R}'), Tesouro: c0('Tesouro', 'Artifact', '{0}') };
const ex = { action: 'etb', target: 'none', expect: { attached: false } };
const scripts = { ...Object.fromEntries(NOMES.map(n => [n, { ...L.ler(carta(n)).script, example: ex }])), Choque: { name: 'Choque', effects: [{ do: 'damage', amount: 2, target: 'any' }], example: { target: 'enemy-creature', expect: { damage: 2 } } } };
function mesaX(a = [], b = [], seed = 31) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: { ...CARTAS, ...cards }, scripts, first: 0, players: [{ name: 'A', deck: baralho([...a, 'Plains', 'Swamp', 'Mountain']) }, { name: 'B', deck: baralho([...b, 'Forest', 'Island']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const joga = (s, oid, p = 0) => act(s, legais(s, p, x => x.t === 'play_land' && x.oid === oid)[0]);
const vazia = (s, p = 0) => { s = J(s); for (const o of s.zones[p].hand.slice()) { s.zones[p].hand = s.zones[p].hand.filter(x => x !== o); s.zones[p].library.push(o); s.objects[o].zone = 'library'; } return s; };

test('LT25 · Horizon Canopy: {T} e 1 de vida dão {G} ou {W}; sem vida para pagar, não gera mana', () => {
  let s = mesaX(['Horizon Canopy']), hc;
  [s, hc] = poe(s, 0, 'Horizon Canopy');
  assert.equal(JSON.stringify(s.facts['Horizon Canopy'].script.produces), JSON.stringify([['G'], ['W']]));
  const v = s.players[0].life;
  const t = act(s, { t: 'tap_mana', p: 0, oid: hc, option: 1 });
  assert.equal(t.players[0].pool.W, 1); assert.equal(t.players[0].life, v - 1, '119.4: paga 1 de vida');
  const u = J(s); u.players[0].life = 0; // só a oferta interessa (a ação de estado não roda em legalActions)
  assert.ok(!legais(u, 0, x => x.t === 'tap_mana' && x.oid === hc).length, 'sem 1 de vida, a terra não gera mana');
});

test('LT25 · Starting Town: desvirada nos três primeiros turnos de quem a joga; virada no quarto; {C} sem vida, cor com 1 de vida', () => {
  let s = mesaX(['Starting Town']), st;
  assert.equal(JSON.stringify(s.contaTurnos), JSON.stringify([1, 0]), 'a partida com a carta conta os turnos de cada jogador');
  [s, st] = poe(s, 0, 'Starting Town', 'hand');
  const t = joga(s, st);
  assert.equal(t.objects[st].tapped, false, 'primeiro turno: desvirada');
  const v = t.players[0].life;
  assert.equal(act(t, { t: 'tap_mana', p: 0, oid: st, option: 0 }).players[0].life, v, '{C}: sem vida');
  const r = act(t, { t: 'tap_mana', p: 0, oid: st, option: 3 });
  assert.equal(r.players[0].pool.B, 1); assert.equal(r.players[0].life, v - 1, 'cor: 1 de vida');
  let q = s; for (let i = 0; i < 3; i++) q = passaAte(act(q, { t: 'pass', p: q.turn.priority }), x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending && x.turn.number > q.turn.number);
  assert.equal(q.contaTurnos[0], 4, 'quarto turno de A');
  const st2 = q.zones[0].hand.find(o => q.objects[o].name === 'Starting Town') || st;
  assert.equal(joga(q, st2).objects[st2].tapped, true, 'quarto turno: virada');
});

test('LT25 · Mox Opal: só ativa com três artefatos ou mais (ela conta); dá uma mana da cor escolhida', () => {
  let s = mesaX(['Mox Opal', 'Bugiganga']), mo;
  [s, mo] = poe(s, 0, 'Mox Opal'); [s] = poe(s, 0, 'Bugiganga');
  assert.equal(legais(s, 0, x => x.t === 'activate' && x.oid === mo).length, 0, 'dois artefatos: não ativa');
  assert.throws(() => E.apply(s, { t: 'activate', p: 0, oid: mo, index: 0, color: 'R' }), /três ou mais artefatos/);
  [s] = poe(s, 0, 'Bugiganga');
  const a = legais(s, 0, x => x.t === 'activate' && x.oid === mo && x.color === 'U')[0]; assert.ok(a, 'três artefatos: ativa');
  const t = act(s, a); assert.equal(t.players[0].pool.U, 1); assert.equal(t.objects[mo].tapped, true);
});

test('LT25 · Simian Spirit Guide: exilada da mão, dá {R} na hora (habilidade de mana, sem pilha) e paga um Choque', () => {
  let s = vazia(mesaX(['Simian Spirit Guide', 'Choque'])), sg, ch;
  [s, sg] = poe(s, 0, 'Simian Spirit Guide', 'hand'); [s, ch] = poe(s, 0, 'Choque', 'hand');
  const a = legais(s, 0, x => x.t === 'activate' && x.oid === sg && x.fromHand)[0]; assert.ok(a, 'ativa da mão');
  s = act(s, a);
  assert.equal(s.objects[sg].zone, 'exile'); assert.equal(s.players[0].pool.R, 1); assert.equal(s.stack.length, 0, '605.3a: não usa a pilha');
  assert.ok(legais(s, 0, x => x.t === 'cast' && x.oid === ch).length, 'o {R} paga o Choque');
});

test("LT25 · Lion's Eye Diamond: descarta a mão inteira e se sacrifica por três manas de uma cor; com a mão vazia também ativa", () => {
  let s = vazia(mesaX(["Lion's Eye Diamond", 'Choque', 'Bugiganga'])), led, c1, c2;
  [s, led] = poe(s, 0, "Lion's Eye Diamond"); [s, c1] = poe(s, 0, 'Choque', 'hand'); [s, c2] = poe(s, 0, 'Bugiganga', 'hand');
  const a = legais(s, 0, x => x.t === 'activate' && x.oid === led && x.color === 'B')[0]; assert.ok(a);
  const t = act(s, a);
  assert.equal(t.players[0].pool.B, 3); assert.equal(t.objects[led].zone, 'graveyard');
  assert.equal(t.zones[0].hand.length, 0); assert.equal(t.objects[c1].zone, 'graveyard'); assert.equal(t.objects[c2].zone, 'graveyard');
  const u = vazia(s); assert.ok(legais(u, 0, x => x.t === 'activate' && x.oid === led).length, 'mão vazia: ativa');
});

test('LT25 · City of Traitors: jogar outro terreno a sacrifica; ela mesma, jogada, não; terreno posto no campo por efeito não dispara', () => {
  let s = mesaX(['City of Traitors']), ct, pl;
  [s, ct] = poe(s, 0, 'City of Traitors', 'hand');
  s = tudo(joga(s, ct));
  assert.equal(s.objects[ct].zone, 'battlefield', 'jogar a própria City não a sacrifica');
  assert.equal(JSON.stringify(s.facts['City of Traitors'].script.produces), JSON.stringify([['C', 'C']]));
  let t; [t] = poe(s, 0, 'Plains');
  assert.equal(tudo(t).objects[ct].zone, 'battlefield', 'posto no campo (não jogado): nada');
  t = J(s); t.players[0].landsPlayed = 0; [t, pl] = poe(t, 0, 'Plains', 'hand');
  t = joga(t, pl);
  assert.equal(t.stack.length, 1, 'o gatilho vai para a pilha');
  t = tudo(act(act(t, { t: 'pass', p: 0 }), { t: 'pass', p: 1 }));
  assert.equal(t.objects[ct].zone, 'graveyard', 'jogou outro terreno: sacrifica');
});

test('achado da revisão do lote XVI · 105.1: "uma mana de qualquer cor" só aceita W, U, B, R ou G (antes a ação montada com {C} ou outra letra passava)', () => {
  let s = mesaX(["Lion's Eye Diamond", 'Mox Opal', 'Bugiganga']), led, mo;
  [s, led] = poe(s, 0, "Lion's Eye Diamond"); [s, mo] = poe(s, 0, 'Mox Opal'); [s] = poe(s, 0, 'Bugiganga');
  for (const color of ['C', 'X']) {
    assert.throws(() => E.apply(s, { t: 'activate', p: 0, oid: led, index: 0, color }), /cor/, 'LED com ' + color);
    assert.throws(() => E.apply(s, { t: 'activate', p: 0, oid: mo, index: 0, color }), /cor/, 'Mox com ' + color);
  }
});

test('M-342 · as 12 do lote XVI revisadas jogam (decisão A)', () => {
  for (const n of ['Mox Opal', 'Starting Town', 'City of Traitors', "Lion's Eye Diamond", 'Simian Spirit Guide', 'Fiery Islet', 'Sunbaked Canyon', 'Elvish Spirit Guide', 'Nurturing Peatland', 'Horizon Canopy', 'Waterlogged Grove', 'Infernal Plunge'])
    assert.equal(S.coverage(carta(n)).level, 'completo', n + ' joga');
});
