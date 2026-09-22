// Camada 3 · golden replay: partidas gravadas por semente precisam
// reproduzir o mesmo estado, ponto a ponto, em qualquer máquina.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadModules, HERE } from './_load.mjs';
import { setup } from './fixtures.mjs';
import { CASES, record } from './generate.mjs';
const { engine: E } = loadModules();

for (const c of CASES) {
  const g = JSON.parse(readFileSync(join(HERE, c.id + '.json'), 'utf8'));
  test(`golden · ${c.id}: replay do log bate em todos os pontos de controle`, () => {
    let s = E.createGame(setup(g.format, g.seed));
    const cps = new Map(g.checkpoints);
    g.log.forEach((a, i) => {
      s = E.apply(s, a).state;
      if (cps.has(i + 1)) assert.equal(E.hashState(s), cps.get(i + 1), `divergiu na ação ${i + 1} (${a.t})`);
    });
    assert.equal(E.hashState(s), g.final);
  });
  test(`golden · ${c.id}: a mesma semente gera a mesma partida`, () => {
    assert.equal(record(c).final, g.final);
  });
}
