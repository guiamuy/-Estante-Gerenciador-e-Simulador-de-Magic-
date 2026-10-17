// T-114 · CR5 · Auras com gatilho que olha a encantada: "Whenever a creature dies, put a +1/+1 counter on enchanted creature" (603.10a,
// 303.4) e "When ~ enters, if enchanted creature is a Wolf or Werewolf, untap that creature" (603.4, 205.3m, 702.73 metamorfo).
// Texto da regra: .regras/cr-2026-09-25.txt. Cartas com o texto oficial de .listas/oficiais-tipos.json (consulta de 17/10/2026):
// Sadistic Glee e Howl of the Hunt. "Urso", "Lobo", "Metamorfo" e "Choque" são cartas de teste.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S as SC, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const SG = 'Sadistic Glee', HH = 'Howl of the Hunt';
const C = {};
for (const c of L('oficiais-tipos.json').filter(x => [SG, HH].includes(x.name)))
  C[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: c.name === HH ? ['Flash', 'Enchant'] : ['Enchant'], oracle_text: c.oracle_text, colors: [] };
C.Swamp = { name: 'Swamp', type_line: 'Basic Land — Swamp', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {B}.)', colors: [] };
const carta = (name, type_line, extra = {}) => { C[name] = { name, type_line, mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra }; };
carta('Urso', 'Creature — Bear', { power: '2', toughness: '2' }); carta('Lobo', 'Creature — Wolf', { power: '2', toughness: '2' });
carta('Metamorfo', 'Creature — Shapeshifter', { power: '1', toughness: '1', keywords: ['Changeling'] }); carta('Choque', 'Instant');
const SCRIPTS = { 'Choque': { name: 'Choque', effects: [{ do: 'damage', amount: 2, target: 'creature' }], example: { target: 'opponent', expect: { selfLife: 0 } } } };
function mesa(seed = 1) {
  const deck = [...Object.keys(C).filter(n => n !== 'Swamp').map(name => ({ name, qty: 3, zone: 'main' })), { name: 'Swamp', qty: 16, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p = 0, n = 9) => { s = J(s); for (const c of 'WUBRGC') s.players[p].pool[c] += n; return s; };
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending);
const conjuraEm = (s, nome, oid, p = 0) => { let o; [s, o] = poe(s, p, nome, 'hand'); s = mana(s, p); const a = legais(s, p, x => x.t === 'cast' && x.oid === o && (x.targets || []).some(t => t.oid === oid))[0]; assert.ok(a, 'conjurar ' + nome); return [resolve(act(s, a)), o]; };
const choque = (s, alvo, p = 0) => { let c; [s, c] = poe(s, p, 'Choque', 'hand'); s = mana(s, p); return resolve(act(s, legais(s, p, x => x.t === 'cast' && x.oid === c && (x.targets || []).some(t => t.oid === alvo))[0])); };
const m = (s, oid) => (s.objects[oid].counters || {}).p1p1 || 0;

test('CR 603.10a · Sadistic Glee (texto oficial): morre criatura de qualquer jogador — um marcador +1/+1 na encantada', () => {
  let s = mesa(); let u, x, y; [s, u] = poe(s, 0, 'Urso'); [s, x] = poe(s, 1, 'Lobo'); [s, y] = poe(s, 0, 'Lobo');
  [s] = conjuraEm(s, SG, u);
  s = choque(s, x); eq(m(s, u), 1, 'a do oponente');
  s = choque(s, y); eq(m(s, u), 2, 'a sua');
});

test('CR 603.10a / 303.4 · Sadistic Glee: a própria encantada morrendo dispara, mas não há mais encantada — nenhum marcador vai a lugar nenhum', () => {
  let s = mesa(); let u, v; [s, u] = poe(s, 0, 'Urso'); [s, v] = poe(s, 0, 'Lobo');
  let g; [s, g] = conjuraEm(s, SG, u);
  s = choque(s, u);
  eq([s.objects[u].zone, s.objects[g].zone, m(s, v)], ['graveyard', 'graveyard', 0]);
});

test('CR 603.4 · Howl of the Hunt (texto oficial): +2/+2 e vigilância; ao entrar, se a encantada é Lobo ou Lobisomem, desvira; Urso virado fica virado', () => {
  let s = mesa(); let l, u; [s, l] = poe(s, 0, 'Lobo', 'battlefield', { tapped: true }); [s, u] = poe(s, 0, 'Urso', 'battlefield', { tapped: true });
  [s] = conjuraEm(s, HH, l);
  const st = E.stats(s, s.objects[l]); eq([st.power, st.toughness, s.objects[l].tapped], [4, 4, false]);
  assert.ok(E.hasKeyword(s, s.objects[l], 'vigilance'));
  [s] = conjuraEm(s, HH, u);
  eq(s.objects[u].tapped, true, 'Urso não é Lobo');
});

test('CR 702.73a · Howl of the Hunt: o metamorfo é Lobo (desvira); com flash, no turno do oponente', () => {
  let s = mesa(); let mm; [s, mm] = poe(s, 0, 'Metamorfo', 'battlefield', { tapped: true });
  s = passaAte(s, x => x.turn.active === 1 && x.turn.priority === 0 && !x.stack.length && !x.pending);
  [s] = conjuraEm(s, HH, mm);
  eq(s.objects[mm].tapped, false);
});

test('CR 603.4 · Howl of the Hunt: condição conferida de novo ao resolver — a validação aceita "encantadaSubtipo" e recusa lista vazia', () => {
  const v = sc => SC.validateScript(sc);
  eq(v({ name: 'X', aura: { enchant: 'creature' }, abilities: [{ kind: 'triggered', when: 'etb', condition: { encantadaSubtipo: ['Wolf'] }, effects: [{ do: 'untap', target: 'enchanted' }] }], example: { action: 'aura', target: 'own-creature', expect: { stats: [2, 2] } } }).filter(e => /condi/.test(e)), []);
  assert.ok(v({ name: 'X', aura: { enchant: 'creature' }, abilities: [{ kind: 'triggered', when: 'etb', condition: { encantadaSubtipo: [] }, effects: [{ do: 'untap', target: 'enchanted' }] }] }).some(e => /encantadaSubtipo/.test(e)));
});
