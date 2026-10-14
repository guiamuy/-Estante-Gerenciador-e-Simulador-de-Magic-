// M-403 · LT69 · 700.9 · "modificada" nos efeitos contínuos: Skyward Spider ("This creature has flying as long as it's modified.") e Obstinate
// Gargoyle ("Obstinate Gargoyle has flying as long as it's modified. … Persist") — Oracle do Forge, consulta de 12/10/2026; .listas/oficiais-revisadas.json;
// caminho de produção (APROVADAS). Modificada: com marcador, equipada, ou encantada por Aura que o controlador dela controla. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, act, poe, legais, passaAte, CARTAS } from './cmd.mjs';
import { valorDeMana, palavrasDoTexto } from './listas.mjs';
import { loadModules } from './_load.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const of = (n, colors) => { const r = OF.find(x => x.name === n); return { name: r.name, type_line: r.type_line, mana_cost: r.mana_cost, cmc: valorDeMana(r.mana_cost), keywords: palavrasDoTexto(r.oracle_text), oracle_text: r.oracle_text, colors, power: r.power, toughness: r.toughness }; };
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: valorDeMana(mana_cost), keywords: [], oracle_text: '', colors: [], ...extra });
const CARDS = { ...CARTAS, 'Skyward Spider': of('Skyward Spider', ['W', 'U']), 'Obstinate Gargoyle': { ...of('Obstinate Gargoyle', []), keywords: ['Persist'] } /* como a Scryfall entrega (o helper de texto não tira palavra-chave com lembrete) */,
  Espada: c0('Espada', 'Artifact — Equipment', '{1}'), Laco: c0('Laco', 'Enchantment — Aura', '{W}') };
function mesa() {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 101, mode: 'full', cards: CARDS, first: 0,
    players: [{ name: 'A', deck: baralho(['Skyward Spider', 'Obstinate Gargoyle', 'Espada', 'Laco', 'Plains']) }, { name: 'B', deck: baralho(['Laco', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const voa = (s, oid) => E.hasKeyword(s, s.objects[oid], 'flying');

test('LT69 · Skyward Spider voa só modificada: marcador, Equipamento ou Aura sua; a Aura do oponente não conta (700.9)', () => {
  let s = mesa(), sp, eq, la, lb; [s, sp] = poe(s, 0, 'Skyward Spider'); [s, eq] = poe(s, 0, 'Espada'); [s, la] = poe(s, 0, 'Laco'); [s, lb] = poe(s, 1, 'Laco');
  assert.equal(voa(s, sp), false, 'sem modificação');
  const com = f => { const t = JSON.parse(JSON.stringify(s)); f(t); return t; };
  assert.equal(voa(com(t => { t.objects[sp].counters = { ...(t.objects[sp].counters || {}), p1p1: 1 }; }), sp), true, 'marcador');
  assert.equal(voa(com(t => { t.objects[eq].attachedTo = sp; }), sp), true, 'equipada');
  assert.equal(voa(com(t => { t.objects[la].attachedTo = sp; }), sp), true, 'Aura de quem a controla');
  assert.equal(voa(com(t => { t.objects[lb].attachedTo = sp; }), sp), false, 'Aura do oponente não modifica');
  assert.equal(voa(com(t => { t.objects[sp].counters = { p1p1: 0 }; }), sp), false, 'marcador zerado não conta');
});

test('LT69 · Obstinate Gargoyle: volta pela persistência com o marcador −1/−1 e passa a voar', () => {
  let s = mesa(), g; [s, g] = poe(s, 0, 'Obstinate Gargoyle');
  assert.equal(voa(s, g), false);
  s = JSON.parse(JSON.stringify(s)); s.objects[g].damage = 99; // morre nas ações de estado; persistir dispara
  s = act(s, { t: 'pass', p: s.turn.priority }); assert.equal(s.objects[g].zone, 'graveyard', 'morreu');
  s = passaAte(s, x => (x.objects[g].zone === 'battlefield' && !x.stack.length) || !!x.pending);
  assert.equal(s.objects[g].zone, 'battlefield'); assert.equal((s.objects[g].counters || {}).m1m1, 1, 'persistiu'); assert.equal(voa(s, g), true, 'modificada: voa');
});

test('LT69 · leitor e validador: "Modified creatures you control have trample" vira contínuo com o seletor modificada; texto da mesa', () => {
  const M = loadModules();
  const r = M.leitor.ler({ name: 'Z', type_line: 'Creature — Ooze', mana_cost: '{1}{G}', oracle_text: 'Modified creatures you control have trample. (Equipment, Auras you control, and counters are modifications.)', power: '2', toughness: '2' });
  assert.ok(r.completa, JSON.stringify(r.frases)); assert.deepEqual(JSON.parse(JSON.stringify(r.script.continuo)), [{ afetados: { tipos: ['creature'], de: 'you', modificada: true }, palavras: ['trample'] }]);
  const q = M.leitor.ler({ name: 'Y', type_line: 'Creature — Spider', mana_cost: '{1}', oracle_text: 'This creature has flying as long as it\'s untapped.', power: '1', toughness: '1' });
  assert.ok(!q.completa, 'outra condição não é lida como modificada');
  const e = M.scripts.validateScript({ name: 'W', example: { target: 'none', expect: {} }, continuo: [{ afetados: 'self', palavras: ['flying'], se: { modificada: 'sim' } }] });
  assert.ok(e.some(x => /"se"/.test(x)), JSON.stringify(e));
  assert.equal(M.table.descreveContinuo({ afetados: 'self', palavras: ['flying'], se: { modificada: true } }), 'enquanto estiver modificada, esta permanente tem voar');
  assert.equal(M.table.descreveContinuo({ afetados: 'self', poder: 1, resistencia: 0, se: { metalcraft: true } }), 'enquanto você controlar três artefatos ou mais, esta permanente recebe +1/+0');
});

test('LT69 · achado da revisão: com a lista de palavras da Scryfall trazendo "Flying" (palavra condicional), a Spider continua sem voar até estar modificada; voar impresso continua valendo', () => {
  const cards = { ...CARDS, 'Skyward Spider': { ...CARDS['Skyward Spider'], keywords: ['Flying', 'Ward'] }, 'Obstinate Gargoyle': { ...CARDS['Obstinate Gargoyle'], keywords: ['Flying', 'Persist'] },
    Ave: c0('Ave', 'Creature — Bird', '{W}', { power: '1', toughness: '1', keywords: ['Flying'], oracle_text: 'Flying\nAve has flying as long as it\'s modified.' }) };
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 103, mode: 'full', cards, first: 0, scripts: { Ave: { name: 'Ave', continuo: [{ afetados: 'self', palavras: ['flying'], se: { modificada: true } }], example: { target: 'none', expect: {} } } },
    players: [{ name: 'A', deck: baralho(['Skyward Spider', 'Obstinate Gargoyle', 'Ave', 'Plains']) }, { name: 'B', deck: baralho(['Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  let sp, g, a; [s, sp] = poe(s, 0, 'Skyward Spider'); [s, g] = poe(s, 0, 'Obstinate Gargoyle'); [s, a] = poe(s, 0, 'Ave');
  assert.equal(voa(s, sp), false); assert.equal(voa(s, g), false); assert.ok(E.hasKeyword(s, s.objects[sp], 'ward'), 'ward continua'); assert.ok(E.hasKeyword(s, s.objects[g], 'persist'), 'persistir continua');
  assert.equal(voa(s, a), true, 'voar impresso numa linha só de palavras-chave vale sempre');
  s = JSON.parse(JSON.stringify(s)); s.objects[sp].counters = { p1p1: 1 }; assert.equal(voa(s, sp), true);
});
