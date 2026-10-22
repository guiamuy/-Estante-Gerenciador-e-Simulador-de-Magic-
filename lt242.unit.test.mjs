// M-560 · LT219 · revisão por lote CXCV (texto e rulings da Scryfall de 22/10/2026): Voice of Victory — "Mobilize 2" e "Your opponents can't cast spells
// during your turn." (101.2: o "can't" vence). No turno de quem a controla, o oponente não conjura mágica nenhuma (nem instantânea); no turno dele,
// conjura. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, act, poe, legais, passaAte } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const VV = 'Voice of Victory', vv = OF.find(x => x.name === VV);
const C = { [VV]: { name: VV, type_line: vv.type_line, mana_cost: vv.mana_cost, cmc: 2, keywords: ['Mobilize'], oracle_text: vv.oracle_text, power: '1', toughness: '3', colors: ['W'] },
  Plains: { name: 'Plains', type_line: 'Basic Land — Plains', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {W}.)', colors: [] },
  Island: { name: 'Island', type_line: 'Basic Land — Island', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {U}.)', colors: [] },
  Adiada: { name: 'Adiada', type_line: 'Instant', mana_cost: '{2}{U}', cmc: 3, keywords: [], oracle_text: 'Draw two cards.\nSuspend 2—{U}', colors: ['U'] },
  Resposta: { name: 'Resposta', type_line: 'Instant', mana_cost: '{U}', cmc: 1, keywords: [], oracle_text: '', colors: ['U'] } };
const SCRIPTS = { Resposta: { name: 'Resposta', effects: [{ do: 'gain', amount: 1 }], example: { target: 'none', expect: { selfLife: 0 } } } };
function mesa(comVoz) {
  const b = ns => ns.map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 242, mode: 'full', cards: C, scripts: SCRIPTS, first: 0, players: [
    { name: 'A', deck: b([[VV, 4], ['Plains', 36]]) }, { name: 'B', deck: b([['Resposta', 4], ['Adiada', 2], ['Island', 34]]) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  let v = null; if (comVoz) [s, v] = poe(s, 0, VV); [s] = poe(s, 1, 'Island'); let r; [s, r] = poe(s, 1, 'Resposta', 'hand');
  return [s, v, r];
}
const conjuraB = (s, r) => legais(s, 1, a => a.t === 'cast' && a.oid === r);
const prioridadeDeB = s => passaAte(s, x => x.turn.active === 0 && legais(x, 1).length > 0, 50);

test('M-560 · Voice of Victory joga (lida e aprovada)', () => { assert.equal(S.coverage(C[VV]).level, 'completo'); });

test('M-560 · no turno de quem a controla, o oponente não conjura nem instantânea; sem ela, conjura', () => {
  let [s, , r] = mesa(false); s = act(s, { t: 'pass', p: 0 }); s = prioridadeDeB(s);
  assert.ok(conjuraB(s, r).length, 'controle: sem a Voice, B responde no turno de A');
  let [t, , r2] = mesa(true); t = act(t, { t: 'pass', p: 0 }); t = prioridadeDeB(t);
  assert.equal(t.turn.active, 0); assert.equal(conjuraB(t, r2).length, 0, 'com a Voice no campo de A, a instantânea não é oferecida');
  assert.throws(() => E.apply(t, { t: 'cast', p: 1, oid: r2 }), /Voice of Victory/);
});

test('M-560 · no turno do oponente, ele conjura normalmente', () => {
  let [s, , r] = mesa(true); s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  assert.ok(conjuraB(s, r).length, 'no turno de B, a Voice de A não impede');
});

test('M-560 · achado da revisão: sob a Voice, o oponente também não suspende (702.62a: só quando poderia conjurar)', () => {
  const tenta = comVoz => { let [s] = mesa(comVoz), d; [s, d] = poe(s, 1, 'Adiada', 'hand'); s = act(s, { t: 'pass', p: 0 }); s = prioridadeDeB(s);
    return [s, d, legais(s, 1, a => a.t === 'suspender_k' && a.oid === d)]; };
  let [, , sem] = tenta(false); assert.equal(sem.length, 1, 'controle: sem a Voice, B suspende no turno de A');
  let [s, d, com] = tenta(true); assert.equal(com.length, 0, 'com a Voice, suspender não é oferecido');
  assert.throws(() => E.apply(s, { t: 'suspender_k', p: 1, oid: d }), /poderia conjur/);
});
