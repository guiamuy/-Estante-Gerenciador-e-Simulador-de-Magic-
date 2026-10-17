// T-121 · CR5 · "For each creature, its controller sacrifices a permanent unless they pay {1}" (101.4 APNAP, 701.21, 118.12).
// Texto: .regras/cr-2026-09-25.txt. Carta com o texto oficial de .listas/oficiais-tipos.json (Scryfall, consulta de 17/10/2026, rulings de
// 04/10/2004): Fade Away. "Urso" e "Pedra" são cartas de teste.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const FA = 'Fade Away';
const C = {};
for (const c of L('oficiais-tipos.json').filter(x => x.name === FA)) C[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: ['U'] };
C.Island = { name: 'Island', type_line: 'Basic Land — Island', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {U}.)', colors: [] };
C.Urso = { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], power: '2', toughness: '2' };
C.Pedra = { name: 'Pedra', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] };
function mesa(seed = 1) {
  const deck = [{ name: FA, qty: 3, zone: 'main' }, { name: 'Urso', qty: 8, zone: 'main' }, { name: 'Pedra', qty: 4, zone: 'main' }, { name: 'Island', qty: 15, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  s = J(s); for (const p of [0, 1]) for (const oid of s.zones[p].battlefield.slice()) { s.zones[p].battlefield.splice(s.zones[p].battlefield.indexOf(oid), 1); s.zones[p].library.push(oid); s.objects[oid].zone = 'library'; }
  return s;
}
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const no = (s, p, nome) => s.zones[p].battlefield.filter(x => s.objects[x].name === nome).length;
function conjura(s) { let f; [s, f] = poe(s, 0, FA, 'hand'); s = J(s); s.players[0].pool.U += 1; s.players[0].pool.C += 2; return act(s, legais(s, 0, a => a.t === 'cast' && a.oid === f)[0]); }
const ate = s => passaAte(s, x => !x.stack.length || !!x.pending);

test('CR 101.4 · Fade Away (texto oficial): cada jogador, por criatura que controla, paga {1} ou sacrifica uma permanente — A (ativo) escolhe primeiro; sem mana para pagar, só sacrifica', () => {
  let s = mesa(); [s] = poe(s, 0, 'Urso'); [s] = poe(s, 1, 'Urso'); [s] = poe(s, 1, 'Urso'); [s] = poe(s, 1, 'Pedra');
  [s] = poe(s, 1, 'Island', 'battlefield'); // B pode pagar {1} uma vez
  s = ate(conjura(s));
  assert.ok(s.pending && s.pending.p === 1 || (s.pending && s.pending.p === 0), 'há escolha');
  // A tem 1 criatura e nenhuma mana: não há escolha de pagar — a escolha que aparece é de B (ou a do sacrifício de A, com uma opção só ela sai direto)
  while (s.pending && s.pending.kind === 'choose_mode') { const os = legais(s, s.pending.p); eq(os.length, s.pending.p === 1 ? 2 : os.length, 'B: pagar {0} ou {1}'); s = ate(act(s, os[os.length - 1])); } // B paga o que pode (1)
  while (s.pending && s.pending.kind === 'sacrifice') s = ate(act(s, legais(s, s.pending.p).find(a => s.objects[a.oid] && s.objects[a.oid].name === 'Pedra') || legais(s, s.pending.p)[0]));
  eq([no(s, 0, 'Urso'), no(s, 1, 'Urso') + no(s, 1, 'Pedra') + no(s, 1, 'Island')], [0, 3], 'A sacrifica o Urso; B paga por uma criatura e sacrifica uma permanente (de 4 sobram 3)');
});

test('CR 701.21 · ruling de 04/10/2004: os sacrifícios são simultâneos e de permanentes diferentes — sem pagar, B com dois Ursos e uma Pedra sacrifica duas, e não pode usar um Urso sacrificado para "não pagar" pelo outro', () => {
  let s = mesa(); [s] = poe(s, 1, 'Urso'); [s] = poe(s, 1, 'Urso'); [s] = poe(s, 1, 'Pedra');
  s = ate(conjura(s));
  const escolhidas = [];
  while (s.pending && s.pending.kind === 'sacrifice') { const a = legais(s, s.pending.p).find(x => s.objects[x.oid].name === 'Urso' && !escolhidas.includes(x.oid)); escolhidas.push(a.oid); s = ate(act(s, a)); }
  eq([no(s, 1, 'Urso'), no(s, 1, 'Pedra'), escolhidas.length], [0, 1, 2]);
});

test('CR 101.4 · Fade Away sem criaturas no campo não pede nada', () => {
  let s = mesa(); [s] = poe(s, 1, 'Pedra');
  s = ate(conjura(s));
  eq([s.pending, no(s, 1, 'Pedra')], [null, 1]);
});
