// Integração do motor (trilha motor, M-310) · fuzz em modo completo com as nove listas reais do acervo (Pauper e Commander), não só com os
// baralhos mínimos de fixtures.mjs: cada lista enfrenta outra, nos dois assentos, com ações aleatórias de legalActions. A cada ação: nenhuma
// ação legal é recusada por apply, as invariantes do estado valem e o jogo não trava. É o guarda-corpo das trilhas paralelas (K, V, T):
// qualquer verbo, palavra-chave ou tipo novo que quebre uma lista real cai aqui.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, jogo } from './listas.mjs';

const SEMENTES = Number(process.env.FUZZ_LISTAS || 3), MAX = 300;
const PAUPER = ['Pauper Mono Blue Faeries', 'Pauper Rakdos Madness', 'Pauper GW Bogles', 'Pauper Boros Bully', 'Pauper Walls Combo', 'Pauper Jund Wildfire', 'Pauper Elves'];
const COMMANDER = ['Commander Orzhov Killian', 'Commander Malcolm Kediss'];
const pares = [...PAUPER.map((a, i) => [a, PAUPER[(i + 1) % PAUPER.length]]), [COMMANDER[0], COMMANDER[1]], [COMMANDER[1], COMMANDER[0]]];

function joga(a, b, seed) {
  let s = jogo({ lista: a, oponente: b, seed });
  const total = Object.keys(s.objects).length;
  let r = (Number(process.env.FUZZ_BASE || 0) + 7919 * seed) + a.length, n = 0;
  for (; n < MAX && s.status === 'playing'; n++) {
    const p = s.pending ? s.pending.p : s.turn.priority;
    const l = E.legalActions(s, p).filter(x => x.t !== 'concede');
    if (!l.length) throw new Error(`${a} × ${b}, semente ${seed}: travou sem ação legal (passo ${s.turn.step}, pendência ${s.pending && s.pending.kind})`);
    r = (r * 1103515245 + 12345) % 2147483648;
    const x = l[r % l.length];
    try { s = E.apply(s, x).state; } catch (e) { throw new Error(`${a} × ${b}, semente ${seed}, ação ${n} (${JSON.stringify(x).slice(0, 160)}): recusada — ${e.message}`); }
    const errs = E.invariants(s, total);
    if (errs.length) throw new Error(`${a} × ${b}, semente ${seed}, ação ${n} (${x.t}): ${errs.join('; ')}`);
  }
  return { s, n };
}

for (const [a, b] of pares) test(`integração · fuzz com listas reais: ${a} × ${b} (${SEMENTES} sementes, até ${MAX} ações)`, () => {
  let turnos = 0;
  for (let seed = 1; seed <= SEMENTES; seed++) turnos += joga(a, b, seed).s.turn.number;
  assert.ok(turnos >= SEMENTES * 2, 'as partidas avançam turnos');
});
