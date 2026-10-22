// M-559 · LT218 · revisão por lote CXCIV (texto e rulings da Scryfall de 22/10/2026): City of Brass — "Whenever this land becomes tapped, it deals 1
// damage to you." Dispara de qualquer jeito que ela vire (ruling de 04/10/2004): por mana, pagando um custo, por efeito de outra carta; virada no meio
// da conjuração, o gatilho espera e entra na pilha por cima da mágica (ruling de 04/10/2004). Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, act, poe, legais, passaAte } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const CB = 'City of Brass', cb = OF.find(x => x.name === CB);
const C = { [CB]: { name: CB, type_line: cb.type_line, mana_cost: cb.mana_cost, cmc: 0, keywords: [], oracle_text: cb.oracle_text, colors: [] },
  Island: { name: 'Island', type_line: 'Basic Land — Island', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {U}.)', colors: [] },
  Rito: { name: 'Rito', type_line: 'Sorcery', mana_cost: '{R}', cmc: 1, keywords: [], oracle_text: '', colors: ['R'] },
  Virar: { name: 'Virar', type_line: 'Instant', mana_cost: '{U}', cmc: 1, keywords: [], oracle_text: '', colors: ['U'] } };
const EX = { example: { target: 'none', expect: { selfLife: 0 } } };
const SCRIPTS = { Rito: { name: 'Rito', effects: [{ do: 'gain', amount: 1 }], ...EX },
  Virar: { name: 'Virar', effects: [{ do: 'tap', target: 'permanent' }], example: { target: 'enemy-creature', expect: { tapped: true } } } };
function mesa() {
  const b = ns => ns.map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 241, mode: 'full', cards: C, scripts: SCRIPTS, first: 0, players: [
    { name: 'A', deck: b([[CB, 4], ['Rito', 4], ['Island', 32]]) }, { name: 'B', deck: b([['Virar', 4], ['Island', 36]]) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const limpa = s => passaAte(s, x => !!x.pending || (!x.stack.length && !(x.queued || []).length));

test('M-559 · City of Brass joga (lida e aprovada)', () => { assert.equal(S.coverage(C[CB]).level, 'completo'); });

test('M-559 · virar para gerar mana: 1 de dano em quem controla', () => {
  let s = mesa(), c; [s, c] = poe(s, 0, CB); const v = s.players[0].life;
  s = act(s, legais(s, 0, a => a.t === 'tap_mana' && a.oid === c)[0]); assert.equal(s.objects[c].tapped, true);
  s = limpa(s); assert.equal(s.players[0].life, v - 1, 'o gatilho resolveu: 1 de dano'); assert.equal(s.players[1].life, 20, 'o oponente não leva');
});

test('M-559 · virada pagando uma mágica: o gatilho entra por cima da mágica e resolve primeiro', () => {
  let s = mesa(), c, r; [s, c] = poe(s, 0, CB); [s, r] = poe(s, 0, 'Rito', 'hand'); const v = s.players[0].life;
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === r)[0]); assert.equal(s.objects[c].tapped, true, 'pagou com a City');
  const topo = s.stack[s.stack.length - 1], obj = s.objects[topo && topo.oid != null ? topo.oid : topo];
  assert.equal(obj && obj.name, CB, 'o gatilho está no topo da pilha, por cima do Rito');
  s = limpa(s); assert.equal(s.players[0].life, v - 1 + 1, '−1 do gatilho, +1 do Rito');
});

test('M-559 · virada por efeito de outra carta (do oponente) também dispara', () => {
  let s = mesa(), c, vi; [s, c] = poe(s, 0, CB); for (let i = 0; i < 2; i++) [s] = poe(s, 1, 'Island'); [s, vi] = poe(s, 1, 'Virar', 'hand');
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending); const v = s.players[0].life;
  s = act(s, legais(s, 1, a => a.t === 'cast' && a.oid === vi && (a.targets || []).some(t => t.oid === c))[0]); s = limpa(s);
  assert.equal(s.objects[c].tapped, true); assert.equal(s.players[0].life, v - 1, 'virada pelo oponente: 1 de dano em quem a controla');
});
