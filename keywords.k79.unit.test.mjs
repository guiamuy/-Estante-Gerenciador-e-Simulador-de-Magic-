// K-79 · CR 702.37a / 702.37b · "Morph {custo}" e "Megamorph {custo}" lidos pelo leitor: viram `morph: { mana }` (com `mega: true` no
// megamorph), a forma que o motor já resolve (conjurar virada para baixo por {3}, virar pelo custo; o megamorph põe um marcador +1/+1).
// Textos: Oracle do Forge (consulta de 25/10/2026; a Scryfall não respondeu nesta sessão), em .listas/oficiais-keywords.json: Spined Basher
// e Sandstorm Charger. Antes, a linha "Morph {…}" não tinha padrão. Custo de metamorfose que não é de mana fica sem leitura.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, J, act, poe, legais, passaAte } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-keywords.json', import.meta.url), 'utf8')).cartas;
const of = n => { const c = OF.find(x => x.name === n); assert.ok(c, 'sem texto oficial: ' + n);
  return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: (c.mana_cost.match(/\{[^}]+\}/g) || []).reduce((k, x) => k + (/^\{\d+\}$/.test(x) ? +x.slice(1, -1) : 1), 0), keywords: c.keywords, oracle_text: c.oracle_text, colors: [...new Set(c.mana_cost.match(/[WUBRG]/g) || [])], power: c.power, toughness: c.toughness }; };

test('K-79 · 702.37 · o leitor lê "Morph {2}{B}" e "Megamorph {4}{W}"', () => {
  for (const [n, m] of [['Spined Basher', { mana: '{2}{B}' }], ['Sandstorm Charger', { mana: '{4}{W}', mega: true }]]) {
    const l = S.leitura(of(n)); assert.ok(l, `${n}: leitura completa`); assert.equal(l.aprovada, false); assert.equal(S.coverage(of(n)).level, 'lida', n);
    assert.deepEqual(J(l.script.morph), m, n);
  }
  assert.equal(S.leitura({ ...of('Spined Basher'), oracle_text: 'Morph—Reveal a black card in your hand.' }), null, 'custo que não é de mana: sem leitura');
  assert.equal(S.leitura({ ...of('Spined Basher'), type_line: 'Artifact', oracle_text: 'Morph {2}{B}' }), null, 'só criatura');
});

const terra = { name: 'Plains', type_line: 'Basic Land — Plains', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {W}.)', colors: [] };
test('K-79 · Sandstorm Charger: virada para baixo por {3} é 2/2; virar pelo megamorph {4}{W} dá 3/4 com um marcador +1/+1', () => {
  const C = { 'Sandstorm Charger': of('Sandstorm Charger'), Plains: terra };
  const scripts = { 'Sandstorm Charger': { ...S.leitura(C['Sandstorm Charger']).script, lido: true, example: { action: 'etb', target: 'none', expect: { attached: false } } } };
  const b = ns => ns.map(name => ({ name, qty: 10, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 79, mode: 'full', cards: C, scripts, first: 0, players: [{ name: 'A', deck: b(['Sandstorm Charger', 'Plains']) }, { name: 'B', deck: b(['Plains']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  let sc; [s, sc] = poe(s, 0, 'Sandstorm Charger', 'hand'); for (let i = 0; i < 8; i++) [s] = poe(s, 0, 'Plains');
  const fd = legais(s, 0, x => x.t === 'cast' && x.oid === sc && x.faceDown); assert.ok(fd.length, 'a mesa oferece conjurar virada para baixo');
  s = passaAte(act(s, fd[0]), x => !x.stack.length && !x.pending);
  assert.equal(s.objects[sc].zone, 'battlefield'); assert.equal(s.objects[sc].faceDown, true); assert.deepEqual(J(E.stats(s, s.objects[sc])), { power: 2, toughness: 2 });
  const up = legais(s, 0, x => x.t === 'unmorph' && x.oid === sc); assert.ok(up.length, 'a mesa oferece virar para cima');
  s = passaAte(act(s, up[0]), x => !x.stack.length && !x.pending);
  assert.ok(!s.objects[sc].faceDown, 'virada para cima'); assert.deepEqual(J(E.stats(s, s.objects[sc])), { power: 4, toughness: 5 }, '3/4 com um marcador +1/+1');
});
