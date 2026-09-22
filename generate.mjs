// Regrava as partidas-referência. Rode SÓ quando uma mudança de regra for
// intencional, e explique no commit por que o resultado mudou:
//   npm run golden:update
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadModules, HERE } from './_load.mjs';
import { setup } from './fixtures.mjs';
const { engine: E } = loadModules();

export const CASES = [
  { id: 'pauper-42', format: 'pauper', seed: 42, policySeed: 1, adjudication: false, actions: 300 },
  { id: 'commander-7', format: 'commander', seed: 7, policySeed: 2, adjudication: false, actions: 300 },
  { id: 'pauper-assistida-1234', format: 'pauper', seed: 1234, policySeed: 3, adjudication: true, actions: 300 }
];

export function record(c) {
  const m = E.createMatch(setup(c.format, c.seed));
  const pol = E.randomPolicy(c.policySeed, { adjudication: c.adjudication });
  const checkpoints = [];
  for (let i = 0; i < c.actions && m.state.status !== 'over'; i++) {
    m.act(pol(m.state));
    if ((i + 1) % 25 === 0) checkpoints.push([i + 1, E.hashState(m.state)]);
  }
  return { ...c, engine: E.ENGINE_VERSION, log: m.log, checkpoints, final: E.hashState(m.state), status: m.state.status, turn: m.state.turn.number };
}

if (process.argv[1] && process.argv[1].endsWith('generate.mjs')) {
  for (const c of CASES) {
    const g = record(c);
    writeFileSync(join(HERE, c.id + '.json'), JSON.stringify(g) + '\n');
    console.log(c.id, g.final, `turno ${g.turn}`, g.status);
  }
}
