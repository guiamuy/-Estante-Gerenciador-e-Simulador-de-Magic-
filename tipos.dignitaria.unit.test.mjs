// T-122 · CR5 · "Target opponent skips their next combat phase" (614.10, 500.11, 506.1). Texto: .regras/cr-2026-09-25.txt. Carta com o
// texto oficial de .listas/oficiais-tipos.json (Scryfall, consulta de 17/10/2026, rulings de 19/03/2021): Stonehorn Dignitary.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const SD = 'Stonehorn Dignitary';
const C = {};
for (const c of L('oficiais-tipos.json').filter(x => x.name === SD)) C[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: ['W'], power: c.power, toughness: c.toughness };
C.Plains = { name: 'Plains', type_line: 'Basic Land — Plains', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {W}.)', colors: [] };
C.Urso = { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], power: '2', toughness: '2' };
function mesa(seed = 1) {
  const deck = [{ name: SD, qty: 6, zone: 'main' }, { name: 'Urso', qty: 6, zone: 'main' }, { name: 'Plains', qty: 18, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending);
function entra(s) { let d; [s, d] = poe(s, 0, SD, 'hand'); s = J(s); s.players[0].pool.W += 1; s.players[0].pool.C += 3; s = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === d)[0])); if (s.pending) s = resolve(act(s, legais(s, s.pending.p)[0])); return s; }
// em qual passo cai o turno de B depois da principal 1 (combate pulado: direto para a principal 2)
const passosDeB = s => { const vistos = []; let t = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1'); for (let i = 0; i < 60 && t.turn.active === 1; i++) { if (!vistos.includes(t.turn.step)) vistos.push(t.turn.step); const p = t.pending ? t.pending.p : t.turn.priority; const a = legais(t, p).find(x => x.t === 'pass' || x.t === 'declare_attackers' || x.t === 'no_attack') || legais(t, p)[0]; t = act(t, a); } return vistos; };

test('CR 614.10 · Stonehorn Dignitary (texto oficial): ao entrar, o oponente alvo pula a próxima fase de combate dele', () => {
  let s = mesa(); [s] = poe(s, 1, 'Urso');
  s = entra(s);
  const vistos = passosDeB(s);
  eq(vistos.some(x => /combat|attack|block|damage/.test(x)), false, 'B não tem combate: ' + vistos.join(','));
});

test('CR 614.10 · ruling de 19/03/2021: duas Dignitárias, dois combates pulados (em turnos seguidos de B)', () => {
  let s = mesa(); [s] = poe(s, 1, 'Urso');
  s = entra(s); s = entra(s);
  eq((s.pulosT || []).filter(r => r.p === 1 && r.o === 'combate').length, 2);
});
