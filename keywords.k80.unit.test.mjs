// K-80 · CR 702.34a · lampejo do passado concedido: "target instant or sorcery card in your graveyard gains flashback until end of turn.
// The flashback cost is equal to its mana cost." Textos da Scryfall (api.scryfall.com/cards/collection, pelo ramo catalogo de 25/10/2026)
// em .listas/oficiais-keywords.json: Snapcaster Mage, Stingcaster Mage e Flashback. Antes, o motor não tinha como conceder o lampejo e o
// leitor não lia a frase. A aprovação (APROVADAS) é da homologação: aqui jogam pelo script lido passado à mão.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, J, act, poe, legais, passaAte } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-keywords.json', import.meta.url), 'utf8')).cartas;
const of = n => { const c = OF.find(x => x.name === n); assert.ok(c, 'sem texto oficial: ' + n);
  return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: (c.mana_cost.match(/\{[^}]+\}/g) || []).length, keywords: c.keywords, oracle_text: c.oracle_text, colors: [...new Set(c.mana_cost.match(/[WUBRG]/g) || [])], ...(c.power ? { power: c.power, toughness: c.toughness } : {}) }; };
const ALVO = { zona: 'graveyard', de: 'you', tipos: ['instant', 'sorcery'] };

test('K-80 · 702.34a · o leitor lê a frase de conceder lampejo nas três', () => {
  for (const n of ['Snapcaster Mage', 'Stingcaster Mage', 'Flashback']) {
    const l = S.leitura(of(n)); assert.ok(l, `${n}: leitura completa`); assert.equal(l.aprovada, false); assert.equal(S.coverage(of(n)).level, 'lida', n);
    const efs = J(l.script.effects || l.script.abilities.find(a => a.kind === 'triggered' && a.when === 'etb').effects);
    assert.deepEqual(efs, [{ do: 'concede_flashback_k', target: ALVO }], n);
  }
  assert.equal(S.leitura({ ...of('Flashback'), oracle_text: 'Target creature card in your graveyard gains flashback until end of turn. The flashback cost is equal to its mana cost.' }), null, 'só mágica instantânea ou feitiço');
});

const terra = { name: 'Mountain', type_line: 'Basic Land — Mountain', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {R}.)', colors: [] };
const BOLT = { name: 'Lightning Bolt', type_line: 'Instant', mana_cost: '{R}', cmc: 1, keywords: [], oracle_text: 'Lightning Bolt deals 3 damage to any target.', colors: ['R'] };
function mesa() {
  const C = { Flashback: of('Flashback'), 'Lightning Bolt': BOLT, Mountain: terra };
  const scripts = { Flashback: { ...S.leitura(C.Flashback).script, lido: true, example: { action: 'etb', target: 'none', expect: { attached: false } } } };
  const b = ns => ns.map(name => ({ name, qty: 10, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 80, mode: 'full', cards: C, scripts, first: 0, players: [{ name: 'A', deck: b(['Flashback', 'Lightning Bolt', 'Mountain']) }, { name: 'B', deck: b(['Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const limpa = s => passaAte(s, x => !x.stack.length && !x.pending);
const lampejos = (s, oid) => legais(s, 0, x => x.t === 'cast' && x.oid === oid && x.flashback);

test('K-80 · Flashback dá lampejo ao Lightning Bolt do cemitério: conjurado por {R}, causa 3 e vai para o exílio', () => {
  let s = mesa(), fb, lb; [s, lb] = poe(s, 0, 'Lightning Bolt', 'graveyard'); [s, fb] = poe(s, 0, 'Flashback', 'hand'); for (let i = 0; i < 2; i++) [s] = poe(s, 0, 'Mountain');
  assert.equal(lampejos(s, lb).length, 0, 'antes, sem lampejo');
  const c = legais(s, 0, x => x.t === 'cast' && x.oid === fb && x.targets && x.targets[0].oid === lb); assert.ok(c.length, 'mira o Bolt no cemitério');
  s = limpa(act(s, c[0]));
  const v = lampejos(s, lb).find(x => x.targets && x.targets[0].player === 1); assert.ok(v, 'o Bolt ganhou lampejo pelo custo de mana dele');
  const vida = s.players[1].life; s = limpa(act(s, v));
  assert.equal(s.players[1].life, vida - 3); assert.equal(s.objects[lb].zone, 'exile', '702.34a: depois, exilado');
});

test('K-80 · o lampejo concedido dura até o fim do turno e some se a carta sair do cemitério (400.7)', () => {
  let s = mesa(), fb, lb; [s, lb] = poe(s, 0, 'Lightning Bolt', 'graveyard'); [s, fb] = poe(s, 0, 'Flashback', 'hand'); for (let i = 0; i < 2; i++) [s] = poe(s, 0, 'Mountain');
  s = limpa(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === fb && x.targets[0].oid === lb)[0]));
  assert.ok(lampejos(s, lb).length, 'neste turno, sim');
  const t = s.turn.number; const prox = passaAte(s, x => x.turn.number > t + 1 && x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending, 800);
  assert.equal(prox.objects[lb].zone, 'graveyard'); assert.equal(lampejos(prox, lb).length, 0, 'no turno seguinte, não');
  const z = J(s); E.moveObject(z, lb, 'hand'); E.moveObject(z, lb, 'graveyard'); // sai e volta no mesmo turno: é outro objeto
  assert.equal(z.objects[lb].zone, 'graveyard'); assert.equal(lampejos(z, lb).length, 0, 'de volta ao cemitério, sem o lampejo');
});
