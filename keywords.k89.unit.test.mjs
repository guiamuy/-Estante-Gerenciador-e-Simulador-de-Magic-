// K-89 · CR 205.3i / 604.3 · "This land is every nonbasic land type." (Planar Nexus, 42 listas competitivas; texto da Scryfall pelo ramo
// catalogo de 01/11/2026 em .listas/oficiais-keywords.json). Característica que vale em toda zona: a linha de tipo tem todos os tipos de
// terreno não básicos (Cave, Desert, Gate, Lair, Locus, Mine, Power-Plant, Sphere, Tower, Urza's e os mais novos). Sob Blood Moon (K-87),
// os subtipos de terreno saem e fica Mountain; com Urborg (K-88), soma Swamp.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, J, act, poe, passaAte } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-keywords.json', import.meta.url), 'utf8')).cartas;
const of = n => { const c = OF.find(x => x.name === n); assert.ok(c, 'sem texto oficial: ' + n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost || '', cmc: c.mana_cost ? 3 : 0, keywords: c.keywords || [], oracle_text: c.oracle_text, colors: [] }; };
const EX = { action: 'etb', target: 'none', expect: { attached: false } };
const PN = 'Planar Nexus', UR = 'Urborg, Tomb of Yawgmoth';
const TODOS = ['Cave', 'Desert', 'Gate', 'Lair', 'Locus', 'Mine', 'Power-Plant', 'Sphere', 'Tower', "Urza's"];

test('K-89 · Planar Nexus lida por inteiro; o validador só aceita true', () => {
  const l = S.leitura(of(PN)); assert.ok(l, 'leitura completa'); assert.equal(S.coverage(of(PN)).level, 'lida');
  assert.equal(l.script.self.todosNaoBasicosK, true);
  assert.deepEqual(J(S.validateScript({ ...l.script, example: EX })), []);
  assert.ok(S.validateScript({ name: 'X', self: { todosNaoBasicosK: 'sim' }, example: EX }).length);
});

test('K-89 · na partida: todos os tipos não básicos na mão e no campo; Blood Moon deixa só Mountain; Urborg soma Swamp', () => {
  const C = { [PN]: of(PN), 'Blood Moon': of('Blood Moon'), [UR]: of(UR), Wastes: { name: 'Wastes', type_line: 'Basic Land', mana_cost: '', cmc: 0, keywords: [], oracle_text: '{T}: Add {C}.', colors: [] } };
  const scripts = Object.fromEntries([PN, 'Blood Moon', UR].map(n => [n, { ...S.leitura(C[n]).script, lido: true, example: EX }]));
  const b = ns => ns.map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 89, mode: 'full', cards: C, scripts, first: 0, players: [{ name: 'A', deck: b([['Wastes', 20], [PN, 2], [UR, 1]]) }, { name: 'B', deck: b([['Wastes', 20], ['Blood Moon', 2]]) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  let mao, pn, ur; [s, mao] = poe(s, 0, PN, 'hand'); [s, pn] = poe(s, 0, PN);
  const subs = oid => (E.linhaDeTipo(s, s.objects[oid]).split('—')[1] || '').trim().split(/\s+/);
  for (const t of TODOS) { assert.ok(subs(mao).includes(t), 'na mão: ' + t); assert.ok(subs(pn).includes(t), 'no campo: ' + t); }
  assert.ok(!subs(pn).some(t => ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest'].includes(t)), 'nenhum básico');
  assert.deepEqual(J(E.productions(s, s.objects[pn])), [['C']]);
  [s, ur] = poe(s, 0, UR); assert.ok(subs(pn).includes('Swamp') && subs(pn).includes("Urza's"), 'Urborg soma Swamp');
  [s] = poe(s, 1, 'Blood Moon'); assert.equal(E.linhaDeTipo(s, s.objects[pn]), 'Land — Mountain', 'sob Blood Moon, só Mountain');
  assert.deepEqual(J(E.productions(s, s.objects[pn])), [['R']]);
});
