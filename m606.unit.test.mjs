// Leva M-606 · relato #57: com 19 criaturas no cemitério, o Dread Return ("Return target creature card from your graveyard to the
// battlefield.", texto oficial em .listas/oficiais-cartas.json) oferecia só 16 alvos e a última a cair lá (o Lotleth Giant) ficava de fora.
// Causa: o teto de 16 combinações de alvos (COMBO_LIMIT, contra a explosão de VÁRIOS alvos) cortava também a lista de UM alvo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { legais, mesa, poe, teste } from './cartas.mjs';

// seis criaturas de teste: o baralho da mesa de teste tem quatro cópias de cada nome, e o cenário pede 21 criaturas
const URSOS = [1, 2, 3, 4, 5, 6].map(i => teste(`Urso de Teste ${i}`, 'Creature — Bear', { pt: [2, 2] }));

test('M-606 · Dread Return com 19 criaturas no cemitério: as 19 são alvo, inclusive a última a cair lá (Lotleth Giant)', () => {
  let s = mesa(['Dread Return', ...URSOS, 'Lotleth Giant']), d, g;
  [s, d] = poe(s, 0, 'Dread Return', 'graveyard');
  const cemit = []; for (let i = 0; i < 18; i++) { let x; [s, x] = poe(s, 0, URSOS[i % 6], 'graveyard'); cemit.push(x); }
  [s, g] = poe(s, 0, 'Lotleth Giant', 'graveyard'); cemit.push(g);
  for (let i = 0; i < 3; i++) [s] = poe(s, 0, URSOS[i]); // o lampejo do passado: sacrificar três criaturas
  const alvos = new Set(legais(s, 0, x => x.t === 'cast' && x.oid === d && x.flashback).map(x => x.targets[0].oid));
  assert.equal(alvos.size, 19, 'uma escolha por criatura do cemitério');
  assert.ok(alvos.has(g), 'o Lotleth Giant é alvo');
});
