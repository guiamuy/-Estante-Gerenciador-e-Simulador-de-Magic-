// T-119 · CR5 · O símbolo de desvirar {Q} como custo (107.6, 602.5a, 302.6, 605.1a). Texto: .regras/cr-2026-09-25.txt. Carta com o texto
// oficial de .listas/oficiais-tipos.json (Scryfall, consulta de 17/10/2026, rulings de 01/05/2008): Pili-Pala.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S as SC, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const PP = 'Pili-Pala';
const C = {};
for (const c of L('oficiais-tipos.json').filter(x => x.name === PP))
  C[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: ['Flying'], oracle_text: c.oracle_text, colors: [], power: c.power, toughness: c.toughness };
C.Wastes = { name: 'Wastes', type_line: 'Basic Land', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {C}.)', colors: [] };
function mesa(seed = 1) {
  const deck = [{ name: PP, qty: 8, zone: 'main' }, { name: 'Wastes', qty: 22, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const com = (s, pool) => { s = J(s); Object.assign(s.players[0].pool, pool); return s; };
const ofertas = (s, oid) => legais(s, 0, a => a.t === 'activate' && a.oid === oid);

test('CR 107.6 / 605.1a · Pili-Pala (texto oficial): virada, {2} e desvirar dão uma mana da cor escolhida, sem pilha; ela fica desvirada', () => {
  let s = mesa(); let pp; [s, pp] = poe(s, 0, PP, 'battlefield', { tapped: true }); s = com(s, { C: 2 });
  const os = ofertas(s, pp); eq(os.map(a => a.color).sort(), ['B', 'G', 'R', 'U', 'W'], 'uma oferta por cor');
  const d = act(s, os.find(a => a.color === 'G'));
  eq([d.objects[pp].tapped, d.players[0].pool.G, d.players[0].pool.C, d.stack.length], [false, 1, 0, 0]);
});

test('CR 107.6 · ruling de 01/05/2008: desvirada não paga {Q} — sem oferta e o pedido direto é recusado; sem {2}, também não', () => {
  let s = mesa(); let pp; [s, pp] = poe(s, 0, PP, 'battlefield', { tapped: true }); s = com(s, { C: 2 });
  const a = ofertas(s, pp)[0];
  let u = J(s); u.objects[pp].tapped = false;
  eq(ofertas(u, pp).length, 0); assert.throws(() => E.apply(u, a), /desvirad|custo|virada/i);
  let z = com(s, { C: -2 }); eq(ofertas(z, pp).length, 0, 'sem {2}');
});

test('CR 302.6 · ruling de 01/05/2008: a criatura que não está sob seu controle desde o começo do turno não paga {Q}', () => {
  let s = mesa(); let pp; [s, pp] = poe(s, 0, PP, 'battlefield', { tapped: true, sick: true }); s = com(s, { C: 2 });
  eq(ofertas(s, pp).length, 0);
});

test('CR 107.6 · validador: "untapT" é o custo {Q} (só como verdadeiro) e não convive com {T}', () => {
  const v = cost => SC.validateScript({ name: 'X', abilities: [{ kind: 'activated', cost, effects: [{ do: 'add_mana', anyColor: true }] }], example: { action: 'etb', target: 'none', expect: { attached: false } } }).filter(e => /\{Q\}|untapT/.test(e));
  eq(v({ mana: '{2}', untapT: true }), []);
  assert.ok(v({ mana: '{2}', untapT: 1 }).length); assert.ok(v({ untapT: true, tap: true }).length);
});

test('CR 122.1d / 118.11 · auditoria D4 (T-125): {Q} numa Pili-Pala atordoada — o desvirar vira tirar um marcador, o custo conta como pago e a mana sai; ela segue virada', () => {
  let s = mesa(); let pp; [s, pp] = poe(s, 0, PP, 'battlefield', { tapped: true, counters: { stun: 1 } }); s = com(s, { C: 2 });
  const d = act(s, ofertas(s, pp).find(a => a.color === 'R'));
  eq([d.objects[pp].tapped, d.objects[pp].counters.stun || 0, d.players[0].pool.R], [true, 0, 1]);
});
