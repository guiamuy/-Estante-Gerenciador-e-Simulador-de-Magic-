// K-82 · CR 113.6 / 605.1a · "Exile this card from your hand: Add {R}." — a redação atual das Spirit Guides (Scryfall, pelo ramo catalogo
// de 25/10/2026, em .listas/oficiais-keywords.json). A aprovação da M-342 continua valendo (a assinatura da revisão já trata "this card"
// como "~"), mas o leitor só conhecia "Exile ~ from your hand" e as duas caíam para manual no catálogo ("texto-mudou").
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, J, act, poe, legais, passaAte } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-keywords.json', import.meta.url), 'utf8')).cartas;
const of = n => { const c = OF.find(x => x.name === n); assert.ok(c, 'sem texto oficial: ' + n);
  return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: 3, keywords: [], oracle_text: c.oracle_text, colors: [...new Set(c.mana_cost.match(/[WUBRG]/g) || [])], power: c.power, toughness: c.toughness }; };

test('K-82 · as Spirit Guides com a redação "this card" voltam a ser lidas e continuam aprovadas', () => {
  for (const [n, cor] of [['Simian Spirit Guide', 'R'], ['Elvish Spirit Guide', 'G']]) {
    assert.equal(S.coverage(of(n)).level, 'completo', `${n}: a revisão da M-342 vale para o texto atual`);
    const ab = J(S.scriptLido(of(n)).abilities)[0];
    assert.equal(ab.cost.exileSelf, true); assert.equal(ab.cost.fromHand, true); assert.deepEqual(ab.effects[0].symbols, [cor]);
  }
});

test('K-82 · Simian Spirit Guide exilada da mão dá {R} na hora, sem pilha', () => {
  const C = { 'Simian Spirit Guide': of('Simian Spirit Guide'), Mountain: { name: 'Mountain', type_line: 'Basic Land — Mountain', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {R}.)', colors: [] } };
  const b = ns => ns.map(name => ({ name, qty: 10, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 82, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b(['Simian Spirit Guide', 'Mountain']) }, { name: 'B', deck: b(['Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  let sg; [s, sg] = poe(s, 0, 'Simian Spirit Guide', 'hand');
  const a = legais(s, 0, x => x.t === 'activate' && x.oid === sg && x.fromHand)[0]; assert.ok(a, 'ativa da mão (o script lido e aprovado joga sozinho)');
  s = act(s, a);
  assert.equal(s.objects[sg].zone, 'exile'); assert.equal(s.players[0].pool.R, 1); assert.equal(s.stack.length, 0);
});
