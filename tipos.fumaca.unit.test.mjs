// T-126 · CR5 · Gatilho que funciona do cemitério em "When a Ninja you control enters" e a volta "attached to that creature"
// (113.6m, 603.6, 303.4f, 303.4g, 400.7): Smoke Shroud. Texto oficial em .listas/oficiais-tipos.json (Scryfall, consulta de 17/10/2026).
// E a correção da T-125 em putTriggerOnStack: o gatilho com foto dos marcadores perdia a criatura encantada do disparo (608.2h).
// "Ninja", "Urso", "Metamorfo", "Muralha", "Choque", "Desanima", "Exila" e "Elo" são cartas de teste.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const SS = 'Smoke Shroud';
const C = {};
for (const c of L('oficiais-tipos.json').filter(x => x.name === SS))
  C[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: ['Enchant'], oracle_text: c.oracle_text, colors: ['U'] };
C.Island = { name: 'Island', type_line: 'Basic Land — Island', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {U}.)', colors: [] };
const carta = (name, type_line, extra = {}) => { C[name] = { name, type_line, mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra }; };
carta('Ninja', 'Creature — Human Ninja', { power: '2', toughness: '2' }); carta('Urso', 'Creature — Bear', { power: '2', toughness: '2' });
carta('Metamorfo', 'Creature — Shapeshifter', { power: '1', toughness: '1', keywords: ['Changeling'] });
carta('Muralha', 'Creature — Ninja Wall', { power: '0', toughness: '4', oracle_text: 'Protection from enchantments' });
carta('Choque', 'Instant'); carta('Desanima', 'Instant'); carta('Exila', 'Instant'); carta('Elo', 'Enchantment — Aura', { keywords: ['Enchant'] });
const SCRIPTS = {
  'Choque': { name: 'Choque', effects: [{ do: 'damage', amount: 2, target: 'creature' }], example: { target: 'opponent', expect: { selfLife: 0 } } },
  'Desanima': { name: 'Desanima', effects: [{ do: 'destroy', target: 'enchantment' }], example: { target: 'none', expect: { selfLife: 0 } } },
  'Exila': { name: 'Exila', effects: [{ do: 'mover', target: { zona: 'graveyard' }, para: 'exile' }], example: { target: 'none', expect: { selfLife: 0 } } },
  'Elo': { name: 'Elo', aura: { enchant: 'creature' }, grants: { power: 1, toughness: 0 }, abilities: [{ kind: 'triggered', when: 'leaves-battlefield', effects: [{ do: 'gain', amount: 1 }] }], example: { action: 'etb', target: 'none', expect: { attached: false } } } };
function mesa(seed = 1) {
  const deck = [...Object.keys(C).filter(n => n !== 'Island').map(name => ({ name, qty: 3, zone: 'main' })), { name: 'Island', qty: 16, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p = 0, n = 9) => { s = J(s); for (const c of 'WUBRGC') s.players[p].pool[c] += n; return s; };
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const conjura = (s, nome, p = 0, f = () => true) => { let o; [s, o] = poe(s, p, nome, 'hand'); s = mana(s, p); const a = legais(s, p, x => x.t === 'cast' && x.oid === o && f(x))[0]; assert.ok(a, `conjurar ${nome}`); return [act(s, a), o]; };
/** Conjura a criatura (de quem é o turno) e deixa o gatilho do cemitério no ponto de decidir o "you may". */
const entra = (s, nome, p = 0) => { let o; [s, o] = conjura(s, nome, p); s = passaAte(s, x => !!x.pending || (s.objects[o] && x.objects[o].zone === 'battlefield' && !x.stack.length)); return [s, o]; };
const decide = (s, sim) => passaAte(act(s, { t: sim ? 'pay' : 'decline', p: s.pending.p }), x => !x.stack.length || !!x.pending);
const daPilha = s => passaAte(s, x => !x.stack.some(i => s.objects[i] && s.objects[i].ability) || !!x.pending);

test('CR 603.6 / 303.4f · Smoke Shroud (texto oficial): um Ninja seu entra — você pode devolvê-la do cemitério anexada a ele (+1/+1 e voar)', () => {
  let s = mesa(); let sh; [s, sh] = poe(s, 0, SS, 'graveyard');
  let n; [s, n] = entra(s, 'Ninja');
  assert.equal(s.pending && s.pending.kind, 'may_pay', 'o "you may" pergunta');
  s = decide(s, true);
  eq([s.objects[sh].zone, s.objects[sh].attachedTo], ['battlefield', n]);
  const st = E.stats(s, s.objects[n]); eq([st.power, st.toughness], [3, 3]);
  assert.ok(E.hasKeyword(s, s.objects[n], 'flying'));
});

test('CR 603.5 · Smoke Shroud: recusar deixa a carta no cemitério', () => {
  let s = mesa(); let sh; [s, sh] = poe(s, 0, SS, 'graveyard');
  [s] = entra(s, 'Ninja');
  s = decide(s, false);
  eq(s.objects[sh].zone, 'graveyard');
});

test('CR 603.2 · Smoke Shroud: criatura que não é Ninja não dispara; o metamorfo é Ninja (702.73a)', () => {
  let s = mesa(); let sh; [s, sh] = poe(s, 0, SS, 'graveyard');
  [s] = entra(s, 'Urso');
  eq([!!s.pending, s.objects[sh].zone], [false, 'graveyard'], 'Urso');
  let m; [s, m] = entra(s, 'Metamorfo');
  assert.equal(s.pending && s.pending.kind, 'may_pay', 'Metamorfo');
  s = decide(s, true); eq(s.objects[sh].attachedTo, m);
});

test('CR 603.2 · Smoke Shroud: "a Ninja you control" — o seu Ninja dispara só a do seu cemitério, não a do cemitério do oponente', () => {
  let s = mesa(); let sh; [s, sh] = poe(s, 0, SS, 'graveyard'); let sh2; [s, sh2] = poe(s, 1, SS, 'graveyard');
  let n; [s, n] = entra(s, 'Ninja');
  assert.equal(s.pending && s.pending.kind, 'may_pay'); assert.equal(s.pending.p, 0);
  s = decide(s, true);
  eq([s.objects[sh].zone, s.objects[sh2].zone, s.pending], ['battlefield', 'graveyard', null]);
});

test('CR 400.7 · Smoke Shroud: o Ninja sai do campo antes da resolução — a carta fica no cemitério', () => {
  let s = mesa(); let sh; [s, sh] = poe(s, 0, SS, 'graveyard');
  let n; [s, n] = conjura(s, 'Ninja');
  s = passaAte(s, x => x.stack.some(i => x.objects[i].ability && x.objects[i].source === sh) || !!x.pending);
  assert.ok(s.stack.some(i => s.objects[i].ability && s.objects[i].source === sh), 'o gatilho na pilha');
  let c; [s, c] = poe(s, 0, 'Choque', 'hand'); s = mana(s);
  s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === c && (x.targets || []).some(t => t.oid === n))[0]);
  s = passaAte(s, x => !!x.pending || !x.stack.length);
  if (s.pending && s.pending.kind === 'may_pay') s = decide(s, true);
  eq([s.objects[n].zone, s.objects[sh].zone], ['graveyard', 'graveyard']);
});

test('CR 400.7 · Smoke Shroud: a carta sai do cemitério antes da resolução — nada volta (nem a encarnação nova)', () => {
  let s = mesa(); let sh; [s, sh] = poe(s, 0, SS, 'graveyard');
  let n; [s, n] = conjura(s, 'Ninja');
  s = passaAte(s, x => x.stack.some(i => x.objects[i].ability && x.objects[i].source === sh) || !!x.pending);
  let e; [s, e] = poe(s, 0, 'Exila', 'hand'); s = mana(s);
  s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === e && (x.targets || []).some(t => t.oid === sh))[0]);
  s = passaAte(s, x => !!x.pending || !x.stack.length);
  if (s.pending && s.pending.kind === 'may_pay') s = decide(s, true);
  eq([s.objects[sh].zone, s.objects[n].zone], ['exile', 'battlefield']);
});

test('CR 303.4g · Smoke Shroud: Ninja com proteção contra encantamentos — a Aura não pode encantá-lo e fica no cemitério', () => {
  let s = mesa(); let sh; [s, sh] = poe(s, 0, SS, 'graveyard');
  [s] = entra(s, 'Muralha');
  if (s.pending && s.pending.kind === 'may_pay') s = decide(s, true);
  eq(s.objects[sh].zone, 'graveyard');
});

test('CR 113.6m · Smoke Shroud no campo ou na mão não dispara pela entrada de um Ninja (só do cemitério)', () => {
  let s = mesa(); let sh; [s, sh] = poe(s, 0, SS, 'hand');
  [s] = entra(s, 'Ninja');
  eq([!!s.pending, s.objects[sh].zone], [false, 'hand']);
});

test('CR 113.6m · T-129 (auditoria T-126…T-128, A2): Smoke Shroud no campo, anexada, não dispara pela entrada de um Ninja (nem pergunta)', () => {
  let s = mesa(); let u; [s, u] = poe(s, 0, 'Urso');
  let sh; [s, sh] = conjura(s, SS, 0, x => (x.targets || []).some(t => t.oid === u));
  s = passaAte(s, x => !x.stack.length || !!x.pending); eq(s.objects[sh].attachedTo, u);
  [s] = entra(s, 'Ninja');
  eq([!!s.pending, s.stack.length, s.objects[sh].attachedTo], [false, 0, u]);
});

test('CR 608.2h · T-126 corrige a T-125: gatilho de uma Aura que saiu (com a foto dos marcadores) guarda a criatura encantada do disparo', () => {
  let s = mesa(); let u; [s, u] = poe(s, 0, 'Urso');
  let el; [s, el] = conjura(s, 'Elo', 0, x => (x.targets || []).some(t => t.oid === u));
  s = passaAte(s, x => !x.stack.length || !!x.pending); eq(s.objects[el].attachedTo, u);
  let d; [s, d] = conjura(s, 'Desanima', 0, x => (x.targets || []).some(t => t.oid === el));
  s = passaAte(s, x => x.stack.some(i => x.objects[i].ability && x.objects[i].source === el) || !!x.pending);
  const ab = s.stack.map(i => s.objects[i]).find(o => o.ability && o.source === el);
  assert.ok(ab && ab.fotoT, 'com a foto');
  eq(ab.hostOid, u, 'e com a encantada do disparo');
});

test('S8 · os textos da pilha e do registro existem para a volta anexada', () => {
  const T = E.EXPORTS_T || {};
  assert.equal(typeof (T.gatilhosDoCemiterioT || E.gatilhosDoCemiterioT), 'function');
});
