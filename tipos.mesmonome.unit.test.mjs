// T-80 · CR5 · "cartas com o mesmo nome" numa busca (Comprehensive Rules 201.2, 701.23, com 709.4a e 107.4f).
// Texto da regra: .regras/cr-2026-09-25.txt. Carta com o texto oficial de .listas/oficiais-tipos.json (Oracle do Forge, clone de
// 13/10/2026): Surgical Extraction (e Wax // Wane, dividida). "Urso", "Choque" e "Terra Rara" são cartas de teste que isolam a regra.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S as SC, T, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const C = {};
for (const c of L('oficiais-tipos.json').filter(x => ['Surgical Extraction', 'Wax // Wane'].includes(x.name)))
  C[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: [] };
for (const [n, k] of Object.entries({ Swamp: 'B', Forest: 'G' })) C[n] = { name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${k}}.)`, colors: [] };
const carta = (name, type_line, extra = {}) => { C[name] = { name, type_line, mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra }; };
carta('Urso', 'Creature — Bear', { power: '2', toughness: '2' }); carta('Choque', 'Instant'); carta('Terra Rara', 'Land', { mana_cost: '', cmc: 0 });
const SURG = 'Surgical Extraction';
function mesa(seed = 1) {
  const deck = [...[SURG, 'Wax // Wane', 'Urso', 'Choque', 'Terra Rara'].map(name => ({ name, qty: 3, zone: 'main' })), { name: 'Swamp', qty: 10, zone: 'main' }, { name: 'Forest', qty: 6, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p = 0, n = 9) => { s = J(s); for (const c of 'WUBRGC') s.players[p].pool[c] += n; return s; };
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
/** Põe a carta numa zona do jogador (grimório: no topo). */
const em = (s, p, nome, zona) => { let o; [s, o] = poe(s, p, nome, zona === 'library' ? 'hand' : zona); if (zona === 'library') { s = J(s); const z = s.zones[p]; z.hand.splice(z.hand.indexOf(o), 1); z.library.unshift(o); s.objects[o].zone = 'library'; } return [s, o]; };
const conta = (s, p, zona, nome) => s.zones[p][zona].filter(o => s.objects[o].name === nome).length;
function cirurgia(s, alvo) {
  let c; [s, c] = poe(s, 0, SURG, 'hand'); s = mana(s);
  const a = legais(s, 0, x => x.t === 'cast' && x.oid === c && x.targets && x.targets[0] && x.targets[0].oid === alvo)[0]; assert.ok(a, 'Surgical Extraction mira a carta do cemitério');
  return [passaAte(act(s, a), x => !x.stack.length || !!x.pending), c];
}

test('CR 701.23 / 201.2 · Surgical Extraction (texto oficial): exila do cemitério, da mão e do grimório do dono todas as cartas com o mesmo nome da carta alvo, e o dono embaralha', () => {
  let s = mesa(); let g; [s, g] = em(s, 1, 'Urso', 'graveyard'); [s] = em(s, 1, 'Urso', 'hand'); [s] = em(s, 1, 'Choque', 'hand'); [s] = em(s, 1, 'Urso', 'library'); [s] = em(s, 1, 'Urso', 'library');
  const antes = { mao: conta(s, 1, 'hand', 'Urso'), grim: conta(s, 1, 'library', 'Urso'), gy: conta(s, 1, 'graveyard', 'Urso') };
  assert.ok(antes.mao >= 1 && antes.grim >= 1 && antes.gy >= 1, JSON.stringify(antes));
  const tamGrim = s.zones[1].library.length;
  [s] = cirurgia(s, g);
  eq([conta(s, 1, 'hand', 'Urso'), conta(s, 1, 'library', 'Urso'), conta(s, 1, 'graveyard', 'Urso')], [0, 0, 0]);
  eq(conta(s, 1, 'exile', 'Urso'), antes.mao + antes.grim + antes.gy, 'todas no exílio');
  assert.ok(conta(s, 1, 'hand', 'Choque') >= 1, 'as de outro nome ficam');
  eq(s.zones[1].library.length, tamGrim - antes.grim);
  eq(s.objects[g].zone, 'exile', 'a própria alvo também');
});

test('CR 701.23 · o alvo é uma carta em um cemitério que não seja terreno básico: o Pântano não é alvo; Terra Rara (terreno não básico) é', () => {
  let s = mesa(); let b, r; [s, b] = em(s, 1, 'Swamp', 'graveyard'); [s, r] = em(s, 1, 'Terra Rara', 'graveyard');
  let c; [s, c] = poe(s, 0, SURG, 'hand'); s = mana(s);
  const alvos = legais(s, 0, x => x.t === 'cast' && x.oid === c).map(x => x.targets[0].oid);
  assert.ok(alvos.includes(r) && !alvos.includes(b), JSON.stringify(alvos));
});

test('CR 107.4f · {B/P}: Surgical Extraction é conjurada sem mana, pagando 2 de vida', () => {
  let s = mesa(); let g; [s, g] = em(s, 1, 'Urso', 'graveyard');
  let c; [s, c] = poe(s, 0, SURG, 'hand'); s = J(s); for (const k of 'WUBRGC') s.players[0].pool[k] = 0;
  for (const oid of s.zones[0].battlefield.slice()) { s.zones[0].battlefield.splice(s.zones[0].battlefield.indexOf(oid), 1); s.zones[0].graveyard.push(oid); s.objects[oid].zone = 'graveyard'; }
  const v = s.players[0].life;
  const a = legais(s, 0, x => x.t === 'cast' && x.oid === c && x.targets[0].oid === g)[0]; assert.ok(a, 'oferecida sem mana');
  s = passaAte(act(s, a), x => !x.stack.length || !!x.pending);
  eq([s.players[0].life, s.objects[g].zone], [v - 2, 'exile']);
});

test('CR 709.4a · dividida: Wax // Wane no cemitério leva as outras Wax // Wane da mão e do grimório', () => {
  let s = mesa(); let g; [s, g] = em(s, 1, 'Wax // Wane', 'graveyard'); [s] = em(s, 1, 'Wax // Wane', 'hand'); [s] = em(s, 1, 'Wax // Wane', 'library');
  [s] = cirurgia(s, g);
  eq([conta(s, 1, 'hand', 'Wax // Wane'), conta(s, 1, 'library', 'Wax // Wane'), conta(s, 1, 'graveyard', 'Wax // Wane')], [0, 0, 0]);
});

test('CR 608.2b · a carta alvo sai do cemitério antes: a mágica não resolve e nada é exilado', () => {
  let s = mesa(); let g; [s, g] = em(s, 1, 'Urso', 'graveyard'); [s] = em(s, 1, 'Urso', 'hand');
  let c; [s, c] = poe(s, 0, SURG, 'hand'); s = mana(s);
  s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === c && x.targets[0].oid === g)[0]);
  s = J(s); const z = s.zones[1]; z.graveyard.splice(z.graveyard.indexOf(g), 1); z.hand.push(g); s.objects[g].zone = 'hand'; s.objects[g].zc = (s.objects[g].zc || 0) + 1;
  s = passaAte(s, x => !x.stack.length || !!x.pending);
  eq(conta(s, 1, 'exile', 'Urso'), 0);
});

test('CR 701.23 · registro e validador: o que saiu de cada zona aparece; o seletor "terrenoBasico" só aceita verdadeiro ou falso', () => {
  let s = mesa(); let g; [s, g] = em(s, 1, 'Urso', 'graveyard'); [s] = em(s, 1, 'Urso', 'hand'); [s] = em(s, 1, 'Urso', 'library');
  let c; [s, c] = poe(s, 0, SURG, 'hand'); s = mana(s);
  s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === c && x.targets[0].oid === g)[0]);
  const r1 = E.apply(s, { t: 'pass', p: 0 }), r2 = E.apply(r1.state, { t: 'pass', p: 1 });
  const linhas = T.describe(r1.state, { t: 'pass', p: 1 }, r2.events, r2.state).join(' | ');
  assert.match(linhas, /exilou .*Urso.* do cemitério/);
  assert.match(linhas, /da mão/); assert.match(linhas, /do grimório/); assert.match(linhas, /embaralhou/);
  const v = sel => J(SC.validateScript({ name: 'X', effects: [{ do: 'exila_mesmo_nome', target: sel }], example: { target: 'none', expect: { selfLife: 0 } } }));
  assert.ok(v({ zona: 'graveyard', terrenoBasico: 'não' }).some(e => /terrenoBasico/.test(e)));
  eq(v({ zona: 'graveyard', terrenoBasico: false }), []);
  assert.ok(v('creature').some(e => /cemitério|graveyard/.test(e)), 'o alvo é uma carta em um cemitério');
});
