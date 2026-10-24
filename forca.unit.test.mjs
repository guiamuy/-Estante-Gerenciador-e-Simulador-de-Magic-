// R-31 · F · força do Shark por lista (forca.mjs): a conta dos confrontos reproduz o `MODO=confrontos` do torneio (sementes,
// dois assentos, placar contra o campo) com uma partida falsa, e o registro que sai cabe no tipo `forca` da telemetria.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { confrontos, registroDeForca, PASSO_DA_SEMENTE, SEMENTE_PADRAO, RODADAS_PADRAO } from './forca.mjs';
import { valida } from './telemetria.mjs';

const L = [{ arquetipo: 'Grixis Madness' }, { arquetipo: 'Dimir Control' }, { name: 'Pauper Mono Green Elves' }];

test('R-31 · confrontos: cada par joga `rodadas` sementes nos dois assentos, com as sementes do torneio (base + k·17); quem vence conta para a lista certa seja qual for o assento', () => {
  const chamadas = [];
  // a lista A (índice 0 em L) vence sempre que está em jogo; entre B e C, vence quem senta em P1 (assento invertido)
  const joga = (seed, n0, n1, d0, d1) => {
    chamadas.push([seed, n0, n1, d0, d1]);
    if (d0 === L[0]) return { v: 0, pior: 10 }; if (d1 === L[0]) return { v: 1, pior: 20 };
    return { v: 1, pior: 5 };
  };
  const r = confrontos({ listas: L, nivel: 'shark', rodadas: 2, base: 100, joga });
  assert.equal(chamadas.length, 3 * 2 * 2, 'três pares × 2 rodadas × 2 assentos');
  assert.deepEqual(chamadas.map(c => c[0]), chamadas.map((c, k) => 100 + k * PASSO_DA_SEMENTE), 'sementes do torneio');
  assert.ok(chamadas.every(c => c[1] === 'shark' && c[2] === 'shark'), 'um nível só nos dois lados');
  assert.deepEqual(chamadas.slice(0, 2).map(c => [c[3], c[4]]), [[L[0], L[1]], [L[1], L[0]]], 'a mesma semente nos dois assentos');
  assert.deepEqual(r.listas, [
    { lista: 'Grixis Madness', vitorias: 8, derrotas: 0, pct: 100 },
    { lista: 'Dimir Control', vitorias: 2, derrotas: 6, pct: 25 },
    { lista: 'Pauper Mono Green Elves', vitorias: 2, derrotas: 6, pct: 25 }]);
  assert.equal(r.partidas, 12); assert.equal(r.decididas, 12); assert.equal(r.pior, 20); assert.deepEqual(r.ilegais, []);
});

test('R-31 · partida sem vencedor não conta; ilegal entra na lista; o registro cabe no tipo `forca` (ilegais vira contagem) e recusa pessoa', () => {
  const joga = seed => (seed % 2 ? { v: null, pior: 3, ilegal: `0: boom (pend x)` } : { v: 0, pior: 1 });
  const r = confrontos({ listas: L, rodadas: 1, base: SEMENTE_PADRAO, joga });
  assert.equal(r.partidas, 6); assert.equal(r.decididas, 3); assert.equal(r.ilegais.length, 3);
  assert.equal(r.listas.reduce((n, l) => n + l.vitorias + l.derrotas, 0), 6, 'cada decidida dá uma vitória e uma derrota');
  const reg = registroDeForca(r, { motor: 112, segundos: 7, nota: 'teste' });
  assert.deepEqual(valida('forca', reg), []);
  assert.equal(reg.ilegais, 3); assert.equal(reg.trilha, 'radar'); assert.equal(reg.rodadas, RODADAS_PADRAO); assert.equal(reg.semente, SEMENTE_PADRAO);
  assert.ok(!('conversa' in reg) && !('sha' in reg), 'sem conversa e sem sha quando não informados');
  assert.throws(() => confrontos({ listas: [L[0]], joga }), /duas listas/);
  assert.throws(() => confrontos({ listas: L }), /partida/);
  assert.ok(valida('forca', registroDeForca({ ...r, listas: [{ lista: 'ana@exemplo.com', vitorias: 1, derrotas: 0, pct: 100 }] }, { motor: 112 })).length, 'nome com e-mail não grava');
});
