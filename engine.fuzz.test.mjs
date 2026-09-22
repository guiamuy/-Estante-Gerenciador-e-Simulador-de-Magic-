// Camada 2 · propriedade e fuzz: milhares de partidas aleatórias, sem
// exceção fora de RuleError, sem travar e sem estado inválido.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
import { setup, combatSetup } from './fixtures.mjs';
const { engine: E } = loadModules();

const GAMES = Number(process.env.FUZZ_GAMES || 250); // portão local: 250; CI noturno: 3000
const MAX_ACTIONS = 400;

function playOut(format, seed, adjudication, st) {
  let s = E.createGame(st || setup(format, seed));
  const total = Object.keys(s.objects).length;
  const policy = E.randomPolicy(seed ^ 0x9e3779b9, { adjudication });
  let n = 0;
  for (; n < MAX_ACTIONS && s.status !== 'over'; n++) {
    const a = policy(s);
    if (!a) throw new Error(`travou sem ação legal (semente ${seed}, passo ${s.turn.step})`);
    s = E.apply(s, a).state; // ação vinda de legalActions nunca pode ser recusada
    const errs = E.invariants(s, total);
    if (errs.length) throw new Error(`semente ${seed}, ação ${n} (${a.t}): ${errs.join('; ')}`);
  }
  return { s, n };
}

for (const format of ['pauper', 'commander']) {
  test(`fuzz · ${GAMES} partidas ${format}, só ações de regra`, () => {
    let turns = 0;
    for (let seed = 1; seed <= GAMES; seed++) turns += playOut(format, seed, false).s.turn.number;
    assert.ok(turns > GAMES, 'as partidas precisam avançar turnos, não só girar no lugar');
  });
  test(`fuzz · ${Math.round(GAMES / 2)} partidas ${format}, com adjudicação da mesa assistida`, () => {
    let over = 0;
    for (let seed = 1; seed <= GAMES / 2; seed++) if (playOut(format, 50000 + seed, true).s.status === 'over') over++;
    assert.ok(over > 0, 'alguma partida precisa terminar por vida, grimório ou comandante');
  });
}

test('propriedade · toda ação de legalActions é aceita por apply', () => {
  for (let seed = 1; seed <= 200; seed++) {
    let s = E.createGame(setup('pauper', seed));
    const pol = E.randomPolicy(seed, { adjudication: true });
    for (let i = 0; i < 80 && s.status !== 'over'; i++) {
      for (let p = 0; p < s.players.length; p++) for (const a of E.legalActions(s, p, { adjudication: true })) {
        assert.doesNotThrow(() => E.apply(s, a), `semente ${seed}: ${JSON.stringify(a)}`);
      }
      s = E.apply(s, pol(s)).state;
    }
  }
});

test('propriedade · só o dono da prioridade tem ações fora do mulligan', () => {
  for (let seed = 1; seed <= 200; seed++) {
    let s = E.createGame(setup('pauper', seed));
    const pol = E.randomPolicy(seed);
    for (let i = 0; i < 120 && s.status !== 'over'; i++) {
      if (s.status === 'playing' && !s.pending) {
        const other = 1 - s.turn.priority;
        assert.equal(E.legalActions(s, other).length, 0);
      }
      s = E.apply(s, pol(s)).state;
    }
  }
});

// M6/M7/M14: combate com palavras-chave, mana cobrada e companheiro
for (const manaCheck of [true, false]) {
  test(`fuzz · ${Math.round(GAMES / 2)} partidas com combate, ${manaCheck ? 'mana cobrada' : 'mana livre'} e companheiro`, () => {
    let combats = 0, companions = 0;
    for (let seed = 1; seed <= GAMES / 2; seed++) {
      const { s } = playOut('pauper', 90000 + seed, false, combatSetup(90000 + seed, { manaCheck }));
      if (Object.values(s.objects).some(o => o.zone === 'graveyard' && s.facts[o.name].types.includes('creature'))) combats++;
      if (s.players.some(p => p.companionUsed)) companions++;
    }
    assert.ok(combats > 0, 'criaturas precisam morrer em combate em alguma partida');
    assert.ok(companions > 0, 'o companheiro precisa ir para a mão em alguma partida');
  });
}

test('propriedade · com mana cobrada e combate, toda ação de legalActions é aceita por apply', () => {
  for (let seed = 1; seed <= 80; seed++) {
    let s = E.createGame(combatSetup(70000 + seed, { manaCheck: true }));
    const pol = E.randomPolicy(seed, { adjudication: true });
    for (let i = 0; i < 150 && s.status !== 'over'; i++) {
      for (let p = 0; p < s.players.length; p++) for (const a of E.legalActions(s, p, { adjudication: true })) {
        assert.doesNotThrow(() => E.apply(s, a), `semente ${seed}: ${JSON.stringify(a)}`);
      }
      s = E.apply(s, pol(s)).state;
    }
  }
});
