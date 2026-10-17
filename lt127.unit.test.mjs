// M-445 · LT111 · Sprout Swarm ("Convoke / Buyback {3} / Create a 1/1 green Saproling creature token."). Texto da Scryfall de 17/10/2026 UTC
// (.listas/oficiais-revisadas.json), caminho de produção (APROVADAS). O leitor passou a ler a linha de palavras-chave com custo (M-430); convocar e recompra
// já existiam (K-13, K-33). Falha no motor anterior (a carta não era aprovada).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const c0 = OF.find(x => x.name === 'Sprout Swarm');
const C = { 'Sprout Swarm': { name: c0.name, type_line: c0.type_line, mana_cost: c0.mana_cost, cmc: 2, keywords: ['Convoke', 'Buyback'], oracle_text: c0.oracle_text, colors: ['G'] },
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Forest: { name: 'Forest', type_line: 'Basic Land — Forest', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {G}.)', colors: [] } };
function mesa(seed = 54) {
  const b = ns => ns.map(name => ({ name, qty: 10, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b(['Sprout Swarm', 'Urso', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending, 40);
const saprolings = s => s.zones[0].battlefield.filter(o => s.objects[o].name === 'Saproling').length;

test('LT111 · Sprout Swarm joga pelo leitor aprovado', () => {
  assert.equal(S.coverage(C['Sprout Swarm']).level, 'completo'); assert.equal(S.APROVADAS['Sprout Swarm'].leva, 'M-445');
});

test('LT111 · cria um Saproling 1/1 verde; sem recompra vai ao cemitério; com recompra ({3} a mais) volta à mão', () => {
  let s = mesa(), sw; [s, sw] = poe(s, 0, 'Sprout Swarm', 'hand'); for (let i = 0; i < 5; i++) [s] = poe(s, 0, 'Forest');
  let t = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === sw && !a.recompraK && !a.tapaK)[0])); assert.equal(saprolings(t), 1); assert.equal(t.objects[sw].zone, 'graveyard');
  const rb = legais(s, 0, a => a.t === 'cast' && a.oid === sw && a.recompraK && !a.tapaK); assert.ok(rb.length, 'recompra oferecida com cinco terras');
  t = resolve(act(s, rb[0])); assert.equal(saprolings(t), 1); assert.equal(t.objects[sw].zone, 'hand');
  assert.equal(t.zones[0].battlefield.filter(o => t.objects[o].name === 'Forest' && t.objects[o].tapped).length, 5);
});

test('LT111 · convocar: com uma Forest e duas criaturas desviradas, conjura virando as criaturas', () => {
  let s = mesa(), sw, u1, u2; [s, sw] = poe(s, 0, 'Sprout Swarm', 'hand'); [s] = poe(s, 0, 'Forest'); [s, u1] = poe(s, 0, 'Urso'); [s, u2] = poe(s, 0, 'Urso');
  const cv = legais(s, 0, a => a.t === 'cast' && a.oid === sw && a.tapaK && !a.recompraK); assert.ok(cv.length, 'convocar oferecido');
  const t = resolve(act(s, cv[0])); assert.equal(saprolings(t), 1); assert.ok(cv[0].tapaK.every(o => t.objects[o].tapped));
});
