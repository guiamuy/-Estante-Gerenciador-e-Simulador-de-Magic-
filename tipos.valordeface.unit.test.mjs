// T-69 · CR5 · Valor de mana das faces de trás (Comprehensive Rules 712.8c e 712.8e, com 202.3b). Texto da regra: .regras/cr-2026-09-25.txt.
// Cartas com script do motor (Delver of Secrets // Insectile Aberration, dupla face da trilha; Lunarch Veteran // Luminous Phantom, com
// "disturb"); o Clone e o anulador são scripts sintéticos que isolam a regra.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, S as SC, J, act, poe, legais, passaAte } from './listas.mjs';

const C = {
  'Delver of Secrets': { name: 'Delver of Secrets', type_line: 'Creature — Human Wizard', mana_cost: '{U}', cmc: 1, keywords: [], oracle_text: '', colors: ['U'], power: '1', toughness: '1' },
  'Lunarch Veteran': { name: 'Lunarch Veteran', type_line: 'Creature — Human Cleric', mana_cost: '{W}', cmc: 1, keywords: ['Disturb'], oracle_text: '', colors: ['W'], power: '1', toughness: '1' },
  'Clone Teste': { name: 'Clone Teste', type_line: 'Creature — Shapeshifter', mana_cost: '{3}', cmc: 3, keywords: [], oracle_text: '', colors: [], power: '0', toughness: '0' },
  'Anula Zero': { name: 'Anula Zero', type_line: 'Instant', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] },
  'Mata Zero': { name: 'Mata Zero', type_line: 'Instant', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] },
  Island: { name: 'Island', type_line: 'Basic Land — Island', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {U}.)', colors: [] },
  Plains: { name: 'Plains', type_line: 'Basic Land — Plains', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {W}.)', colors: [] },
};
const EX = { example: { target: 'none', expect: { selfLife: 0 } } };
const SCRIPTS = {
  'Clone Teste': { name: 'Clone Teste', entraComoCopia: { de: { tipos: ['creature'] } }, example: { action: 'etb', target: 'none', expect: { attached: false } } },
  'Anula Zero': { name: 'Anula Zero', effects: [{ do: 'counter', target: { zona: 'stack', tipos: ['creature'], mvMax: 0 } }], ...EX }, // "Counter target creature spell with mana value 0."
  'Mata Zero': { name: 'Mata Zero', effects: [{ do: 'destroy', target: { tipos: ['creature'], mvMax: 0 } }], ...EX }, // "Destroy target creature with mana value 0."
};
function mesa(seed = 2) {
  const deck = [...Object.keys(C).filter(n => !['Island', 'Plains'].includes(n)).map(name => ({ name, qty: 3, zone: 'main' })), { name: 'Island', qty: 10, zone: 'main' }, { name: 'Plains', qty: 10, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p = 0) => { s = J(s); for (const c of 'WUBRGC') s.players[p].pool[c] += 9; return s; };
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const mv = (s, oid) => E.manaValueT(s, s.objects[oid]);
const transformado = s => { let d; [s, d] = poe(s, 0, 'Delver of Secrets', 'battlefield'); s = J(s); E.applyEffect(s, s.objects[d], { do: 'transformar' }, null, []); return [s, d]; };
const clonaA = (s, alvo) => { let c; [s, c] = poe(s, 0, 'Clone Teste', 'hand'); s = mana(s);
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === c)[0]); s = passaAte(s, x => !!x.pending || !x.stack.length);
  if (s.pending && s.pending.kind === 'pick') s = act(s, { t: 'pick', p: 0, oid: alvo }); return [passaAte(s, x => !x.stack.length && !x.pending), c]; };

test('CR 712.8e · a dupla face transformada (verso para cima) vale o custo da frente: Insectile Aberration tem valor de mana 1', () => {
  const [s, d] = transformado(mesa());
  eq([s.objects[d].name, mv(s, d)], ['Insectile Aberration', 1]);
});

test('CR 712.8e / 202.3b · a permanente que copia o verso de uma dupla face tem valor de mana 0: o Clone de Insectile Aberration é alvo de "valor de mana 0"', () => {
  let [s, d] = transformado(mesa()); let c; [s, c] = clonaA(s, d);
  eq([s.objects[c].name, mv(s, c), mv(s, d)], ['Insectile Aberration', 0, 1]);
  let m; [s, m] = poe(s, 1, 'Mata Zero', 'hand'); s = mana(s, 1); s = J(s); s.turn.priority = 1;
  const alvos = legais(s, 1, a => a.t === 'cast' && a.oid === m).map(a => a.targets[0].oid);
  eq(alvos, [c], 'só o Clone (o Delver transformado vale 1)');
});

test('CR 712.8c · conjurada transformada pelo "disturb": na pilha e no campo, Luminous Phantom vale o custo da frente (1), não 0', () => {
  let s = mesa(); let d; [s, d] = poe(s, 0, 'Lunarch Veteran', 'graveyard'); s = mana(s);
  s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === d && x.disturb)[0]);
  eq([s.objects[d].zone, s.objects[d].name, mv(s, d)], ['stack', 'Luminous Phantom', 1]);
  let a; [s, a] = poe(s, 1, 'Anula Zero', 'hand'); s = mana(s, 1); s = J(s); s.turn.priority = 1;
  eq(legais(s, 1, x => x.t === 'cast' && x.oid === a).length, 0, '"valor de mana 0" não alcança a mágica (vale 1)');
  s = J(s); s.turn.priority = 0; s = passaAte(s, x => !x.stack.length);
  eq([s.objects[d].zone, mv(s, d)], ['battlefield', 1]);
});
