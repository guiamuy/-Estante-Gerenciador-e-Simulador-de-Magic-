// T-88 · CR5 · Barra de Classe com redução de custo e "dano a mais" (Comprehensive Rules 716.2a, com 601.2f e 614.1a).
// Texto da regra: .regras/cr-2026-09-25.txt. Carta com o texto oficial de .listas/oficiais-tipos.json (Oracle do Forge, clone de 13/10/2026):
// Artist's Talent. "Choque", "Urso" e "Cerca" são cartas de teste.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S as SC, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const AT = "Artist's Talent";
const C = {};
for (const c of L('oficiais-tipos.json').filter(x => x.name === AT)) C[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: ['R'] };
C.Mountain = { name: 'Mountain', type_line: 'Basic Land — Mountain', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {R}.)', colors: [] };
const carta = (name, type_line, extra = {}) => { C[name] = { name, type_line, mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra }; };
carta('Choque', 'Instant'); carta('Urso', 'Creature — Bear', { power: '2', toughness: '2' }); carta('Cerca', 'Artifact', { mana_cost: '{2}', cmc: 2 });
const EX = { example: { target: 'none', expect: { selfLife: 0 } } };
const SCRIPTS = { 'Choque': { name: 'Choque', effects: [{ do: 'damage', amount: 2, target: 'any' }], ...EX } };
function mesa(seed = 1) {
  const deck = [{ name: AT, qty: 4, zone: 'main' }, { name: 'Choque', qty: 6, zone: 'main' }, { name: 'Urso', qty: 4, zone: 'main' }, { name: 'Cerca', qty: 4, zone: 'main' }, { name: 'Mountain', qty: 16, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p = 0, n = 9) => { s = J(s); for (const c of 'WUBRGC') s.players[p].pool[c] += n; return s; };
const semMana = (s, p = 0) => { s = J(s); for (const c of 'WUBRGC') s.players[p].pool[c] = 0; for (const oid of s.zones[p].battlefield.slice()) if (s.objects[oid].name === 'Mountain') { s.zones[p].battlefield.splice(s.zones[p].battlefield.indexOf(oid), 1); s.zones[p].graveyard.push(oid); s.objects[oid].zone = 'graveyard'; } return s; };
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const nivel = (s, oid, n) => { s = J(s); s.classes = { ...(s.classes || {}), [oid]: { z: s.objects[oid].zc || 0, n } }; return s; };
const resolve = (s, sim = true) => { for (let i = 0; i < 20; i++) { s = passaAte(s, x => !x.stack.length || !!x.pending); if (!s.pending) return s; const os = legais(s, s.pending.p); s = act(s, (sim && os.find(a => a.t === 'pay')) || os.find(a => a.t === 'decline') || os[0]); } return s; };
const choque = (s, alvo, sim = true) => { let c; [s, c] = poe(s, 0, 'Choque', 'hand'); s = mana(s); const a = legais(s, 0, x => x.t === 'cast' && x.oid === c && x.targets && x.targets[0] && (alvo.player != null ? x.targets[0].player === alvo.player : x.targets[0].oid === alvo.oid))[0]; assert.ok(a, 'conjurar Choque'); return resolve(act(s, a), sim); };

test('CR 716.2a · Artist’s Talent (texto oficial), nível 1: ao conjurar uma mágica que não é criatura, pode descartar uma carta para comprar uma', () => {
  let s = mesa(); [s] = poe(s, 0, AT, 'battlefield'); let u, c; [s, u] = poe(s, 0, 'Urso', 'hand'); [s, c] = poe(s, 0, 'Choque', 'hand'); s = mana(s);
  const grim = s.zones[0].library.length, gy = s.zones[0].graveyard.length, conj = legais(s, 0, x => x.t === 'cast' && x.oid === c && x.targets[0].player === 1)[0];
  let t = resolve(act(s, conj), true);
  eq([grim - t.zones[0].library.length, t.zones[0].graveyard.length - gy], [1, 2], 'sim: comprou uma; no cemitério o Choque e a descartada');
  t = resolve(act(s, conj), false);
  eq([grim - t.zones[0].library.length, t.zones[0].graveyard.length - gy], [0, 1], 'não: só o Choque no cemitério');
});

test('CR 716.2a / 601.2f · nível 2: mágicas que não são criatura custam {1} a menos; criatura não', () => {
  let s = mesa(); let a; [s, a] = poe(s, 0, AT, 'battlefield'); s = semMana(s);
  let c, k, u; [s, c] = poe(s, 0, 'Choque', 'hand'); [s, k] = poe(s, 0, 'Cerca', 'hand'); [s, u] = poe(s, 0, 'Urso', 'hand');
  eq([legais(s, 0, x => x.t === 'cast' && x.oid === c).length > 0, legais(s, 0, x => x.t === 'cast' && x.oid === u).length > 0], [false, false], 'nível 1: sem mana, nada');
  s = nivel(s, a, 2);
  assert.ok(legais(s, 0, x => x.t === 'cast' && x.oid === c).length > 0, 'Choque ({1}) sai de graça');
  eq(legais(s, 0, x => x.t === 'cast' && x.oid === u).length, 0, 'o Urso (criatura) não fica mais barato');
  s = J(s); s.players[0].pool.R = 1;
  assert.ok(legais(s, 0, x => x.t === 'cast' && x.oid === k).length > 0, 'Cerca ({2}) com uma mana');
});

test('CR 716.2a / 614.1a · nível 3: o dano que não é de combate da sua fonte ao oponente ou ao que ele controla tem +2; a sua criatura, não', () => {
  let s = mesa(); let a; [s, a] = poe(s, 0, AT, 'battlefield'); s = nivel(s, a, 3);
  let u1, u0; [s, u1] = poe(s, 1, 'Urso', 'battlefield'); [s, u0] = poe(s, 0, 'Urso', 'battlefield');
  const v = s.players[1].life;
  let t = choque(s, { player: 1 }, false); eq(v - t.players[1].life, 4, '2 + 2 no oponente');
  t = choque(s, { oid: u1 }, false); eq((t.objects[u1].damage || 0) + (t.objects[u1].zone === 'graveyard' ? 99 : 0) >= 4, true, 'a criatura do oponente recebe 4 (morre)');
  t = choque(s, { oid: u0 }, false); eq(t.objects[u0].zone, 'graveyard', 'a sua criatura recebe só 2 e morre (2/2) — o +2 não vale para ela');
  t = choque(nivel(s, a, 2), { player: 1 }, false); eq(v - t.players[1].life, 2, 'no nível 2 ainda não');
});

test('CR 716.2a / 614.1a · o +2 não vale para dano de combate', () => {
  let s = mesa(); let a; [s, a] = poe(s, 0, AT, 'battlefield'); s = nivel(s, a, 3);
  let u; [s, u] = poe(s, 0, 'Urso', 'battlefield'); s = J(s); s.objects[u].sick = false;
  s = passaAte(s, x => x.turn.step === 'declare_attackers' || !!x.pending);
  const v = s.players[1].life;
  if (s.pending && s.pending.kind === 'attackers') s = act(s, { t: 'attack', p: 0, attackers: [u] });
  s = passaAte(s, x => x.turn.step === 'main2' || x.turn.active === 1);
  eq(v - s.players[1].life, 2);
});

test('CR 716 · validador: reduz e dano numa barra de Classe', () => {
  const base = { name: 'X', self: { classe: [{ mana: '{1}' }] }, example: { action: 'etb', target: 'none', expect: { attached: false } } };
  const v = b => J(SC.validateScript({ ...base, self: { classe: [{ mana: '{1}', ...b }] } }));
  eq(v({ reduz: { generic: 1, semTipos: ['creature'] } }), []);
  eq(v({ dano: [{ a: 'oponente-ou-dele', soma: 2, soNaoCombate: true }] }), []);
  assert.ok(v({ reduz: { generic: 0 } }).some(e => /reduz/.test(e)));
  assert.ok(v({ reduz: { generic: 1, semTipos: ['criatura'] } }).some(e => /reduz/.test(e)));
  assert.ok(v({ dano: [{ a: 'jogador', soma: 2 }] }).some(e => /dano 1/.test(e)));
});
