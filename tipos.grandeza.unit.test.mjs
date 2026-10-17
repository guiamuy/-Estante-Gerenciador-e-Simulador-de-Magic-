// T-117 · CR5 · Grandeza ("Grandeur — Discard another card named ~": 207.2c palavra de habilidade, 602.1, 701.9) e "reveal until an
// instant or sorcery card; put it into your hand and the rest on the bottom in a random order" (701.20). Texto: .regras/cr-2026-09-25.txt.
// Carta com o texto oficial de .listas/oficiais-tipos.json (consulta de 17/10/2026): Page, Loose Leaf. "Raio" e "Urso" são de teste.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S as SC, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const PG = 'Page, Loose Leaf';
const C = {};
for (const c of L('oficiais-tipos.json').filter(x => x.name === PG))
  C[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: [], power: c.power, toughness: c.toughness };
C.Island = { name: 'Island', type_line: 'Basic Land — Island', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {U}.)', colors: [] };
C.Raio = { name: 'Raio', type_line: 'Instant', mana_cost: '{R}', cmc: 1, keywords: [], oracle_text: '', colors: ['R'] };
C.Urso = { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], power: '2', toughness: '2' };
const SCRIPTS = { Raio: { name: 'Raio', effects: [{ do: 'damage', amount: 3, target: 'any' }], example: { target: 'opponent', expect: { opponentLife: -3 } } } };
function mesa(seed = 1) {
  const deck = [{ name: PG, qty: 4, zone: 'main' }, { name: 'Raio', qty: 4, zone: 'main' }, { name: 'Urso', qty: 10, zone: 'main' }, { name: 'Island', qty: 12, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending);
const grandezas = (s, oid) => legais(s, 0, a => a.t === 'activate' && a.oid === oid && !a.fromHand && (a.pay || {}).discard);
// põe as cartas da mão de A de lado (no fundo) e monta o topo do grimório pedido
function arruma(s, mao, topo) {
  s = J(s); const lib = s.zones[0].library;
  for (const oid of s.zones[0].hand.splice(0)) { s.objects[oid].zone = 'library'; lib.push(oid); }
  for (const n of mao) { const i = lib.findIndex(x => s.objects[x].name === n); s.zones[0].hand.push(lib.splice(i, 1)[0]); s.objects[s.zones[0].hand.at(-1)].zone = 'hand'; }
  topo.forEach((n, k) => { const i = lib.findIndex((x, j) => j >= k && s.objects[x].name === n); lib.splice(k, 0, lib.splice(i, 1)[0]); });
  return s;
}

test('CR 602.1 · Page, Loose Leaf (texto oficial): grandeza descarta OUTRA Page da mão; sem outra Page, não há oferta', () => {
  let s = mesa(); let pg; [s, pg] = poe(s, 0, PG);
  s = arruma(s, ['Urso'], []);
  eq(grandezas(s, pg).length, 0, 'só Urso na mão');
  s = arruma(s, [PG, 'Urso'], []);
  const ofs = grandezas(s, pg); eq(ofs.length, 1, 'uma oferta, descartando a Page');
  eq(ofs.map(a => a.pay.discard.map(x => s.objects[x].name)), [[PG]]);
  const urso = s.zones[0].hand.find(x => s.objects[x].name === 'Urso');
  assert.throws(() => E.apply(s, { ...ofs[0], pay: { discard: [urso] } }), /descart|custo/i, 'descartar outra carta é recusado');
});

test('CR 701.20 · grandeza: revela até uma instantânea ou feitiço, põe na mão e o resto no fundo; não vira (a Page segue podendo gerar {C})', () => {
  let s = mesa(); let pg; [s, pg] = poe(s, 0, PG);
  s = arruma(s, [PG], ['Urso', 'Island', 'Raio', 'Urso']);
  const fundoAntes = s.zones[0].library.length;
  s = resolve(act(s, grandezas(s, pg)[0]));
  const mao = s.zones[0].hand.map(x => s.objects[x].name);
  eq([mao, s.objects[pg].tapped], [['Raio'], false]);
  eq(s.objects[s.zones[0].library[0]].name, 'Urso', 'o quarto (não revelado) vira o topo');
  eq(s.zones[0].library.slice(-2).map(x => s.objects[x].name).sort(), ['Island', 'Urso'], 'os dois revelados antes vão para o fundo');
  eq(s.zones[0].library.length, fundoAntes - 1);
  eq(s.zones[0].graveyard.map(x => s.objects[x].name), [PG], 'a outra Page foi descartada');
});

test('CR 701.20 · grandeza sem instantânea nem feitiço no grimório: revela tudo e põe tudo no fundo, sem carta na mão', () => {
  let s = mesa(); let pg; [s, pg] = poe(s, 0, PG);
  s = arruma(s, [PG], []);
  s = J(s); for (const oid of s.zones[0].library.slice()) if (s.objects[oid].name === 'Raio') { s.zones[0].library.splice(s.zones[0].library.indexOf(oid), 1); s.zones[0].exile.push(oid); s.objects[oid].zone = 'exile'; }
  const n = s.zones[0].library.length;
  s = resolve(act(s, grandezas(s, pg)[0]));
  eq([s.zones[0].hand.length, s.zones[0].library.length], [0, n]);
});
