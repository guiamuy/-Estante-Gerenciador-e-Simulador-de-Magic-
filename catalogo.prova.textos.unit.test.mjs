// H-14 · a prova de partida do catálogo usa o texto da Scryfall (o do app) onde a revisão por lote já o consultou: o Forge guarda a redação anterior à
// errata do Elven Farsight ("If it's a creature card, draw a card"; Scryfall de 23/10/2026: "If a creature card is revealed this way, draw a card"), e a
// carta, que joga no app, aparecia na prova como "cobertura incompleta". Falha antes da H-14 (as funções não existiam).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { textosDaScryfall, aplicaTextosDaScryfall, cartaDoForge } from './catalogo.prova.mjs';
import { loadModules } from './_load.mjs';
const { scryfall: SF, scripts: S, cards: K } = loadModules();

const FORGE = 'Name:Elven Farsight\nManaCost:G\nTypes:Sorcery\nA:SP$ Scry | ScryNum$ 3\nOracle:Scry 3, then you may reveal the top card of your library. If it\'s a creature card, draw a card.\n';

test('H-14 · o texto revisado da Scryfall vence o do Forge; a carta passa a jogar como no app', () => {
  const c = SF.normalizeCard(cartaDoForge(FORGE)); const cartas = new Map([[K.norm(c.name), c]]);
  assert.notEqual(S.coverage(c).level, 'completo', 'com o texto do Forge, em revisão');
  const trocadas = aplicaTextosDaScryfall(cartas, textosDaScryfall());
  assert.deepEqual(trocadas, ['Elven Farsight']);
  const d = cartas.get(K.norm('Elven Farsight'));
  assert.match(d.oracle_text, /If a creature card is revealed this way, draw a card\./);
  assert.equal(d.type_line, c.type_line); assert.equal(d.mana_cost, c.mana_cost);
  assert.equal(S.coverage(d).level, 'completo');
});

test('H-14 · só texto de fonte Scryfall e de carta de uma face; texto igual não conta como troca', async () => {
  const pasta = await mkdtemp(join(tmpdir(), 'h14-'));
  try {
    const arq = join(pasta, 'o.json');
    await writeFile(arq, JSON.stringify({ cartas: [
      { name: 'A', oracle_text: 'novo', fonte: 'https://api.scryfall.com/cards/named?exact=A' },
      { name: 'B', oracle_text: 'novo', fonte: 'https://github.com/Card-Forge/forge/b.txt' },
      { name: 'F', oracle_text: 'novo', fonte: 'https://x.com/a.scryfall.com/f' },
      { name: 'C // D', oracle_text: 'novo', fonte: 'https://api.scryfall.com/cards/named?exact=C' },
      { name: 'E', oracle_text: 'igual', fonte: 'https://api.scryfall.com/cards/named?exact=E' }] }));
    const t = textosDaScryfall(arq); assert.deepEqual([...t.keys()].sort(), ['a', 'e']);
    const cartas = new Map([['a', { name: 'A', oracle_text: 'velho' }], ['b', { name: 'B', oracle_text: 'velho' }], ['e', { name: 'E', oracle_text: 'igual' }]]);
    assert.deepEqual(aplicaTextosDaScryfall(cartas, t), ['A']);
    assert.equal(cartas.get('b').oracle_text, 'velho');
    assert.deepEqual(textosDaScryfall(join(pasta, 'nao-existe.json')).size, 0);
  } finally { await rm(pasta, { recursive: true, force: true }); }
});
