// T-100 · CR5 · Dobra de fogo (Comprehensive Rules 702.189a) e o que dura "até o fim do combate" (500.5, 500.5a, 511.3).
// Texto da regra: .regras/cr-2026-09-25.txt. Cartas com o texto oficial de .listas/oficiais-tipos.json (Oracle do Forge, clone de 13/10/2026,
// conferido no master em 14/10/2026): Fire Sages, Firebending Student, Loyal Fire Sage, Vindictive Warden, Zuko, Exiled Prince e Murk Dwellers.
// "Choque" e "Raio" são cartas de teste.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S as SC, T, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const NOMES = ['Fire Sages', 'Firebending Student', 'Loyal Fire Sage', 'Vindictive Warden', 'Zuko, Exiled Prince', 'Murk Dwellers'];
const KW = { 'Fire Sages': ['Firebending'], 'Firebending Student': ['Prowess', 'Firebending'], 'Loyal Fire Sage': ['Firebending'], 'Vindictive Warden': ['Menace', 'Firebending'], 'Zuko, Exiled Prince': ['Firebending'] };
const C = {};
for (const c of L('oficiais-tipos.json').filter(x => NOMES.includes(x.name)))
  C[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: KW[c.name] || [], oracle_text: c.oracle_text, colors: ['R'], power: c.power, toughness: c.toughness };
C.Mountain = { name: 'Mountain', type_line: 'Basic Land — Mountain', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {R}.)', colors: [] };
const carta = (name, type_line, extra = {}) => { C[name] = { name, type_line, mana_cost: '{R}', cmc: 1, keywords: [], oracle_text: '', colors: ['R'], ...extra }; };
carta('Choque', 'Instant'); carta('Raio', 'Instant', { mana_cost: '{R}{R}', cmc: 2 });
const EX = { example: { target: 'none', expect: { selfLife: 0 } } };
const SCRIPTS = { 'Choque': { name: 'Choque', effects: [{ do: 'damage', amount: 2, target: 'any' }], ...EX }, 'Raio': { name: 'Raio', effects: [{ do: 'damage', amount: 3, target: 'any' }], ...EX } };
function mesa(seed = 1) {
  const deck = [...Object.keys(C).filter(n => n !== 'Mountain').map(name => ({ name, qty: 2, zone: 'main' })), { name: 'Mountain', qty: 16, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const semMana = s => { s = J(s); for (const p of [0, 1]) { for (const c of 'WUBRGC') s.players[p].pool[c] = 0; for (const oid of s.zones[p].battlefield.slice()) if (s.objects[oid].name === 'Mountain') { s.zones[p].battlefield.splice(s.zones[p].battlefield.indexOf(oid), 1); s.zones[p].graveyard.push(oid); s.objects[oid].zone = 'graveyard'; } } return s; };
const atacaCom = (s, oids) => { s = passaAte(s, x => x.turn.step === 'combat_attackers' || !!x.pending); s = act(s, { t: 'attack', p: 0, attackers: oids }); for (let i = 0; i < 10; i++) { s = passaAte(s, x => !x.stack.length || !!x.pending); if (!s.pending || s.pending.kind === 'blockers') return s; s = act(s, legais(s, s.pending.p)[0]); } return s; }; // com dois gatilhos, a ordem é a primeira oferecida
const vaiAte = (s, passo) => passaAte(s, x => x.turn.step === passo || !!x.pending);

test('CR 702.189a · Fire Sages (texto oficial), dobra de fogo 1: ao atacar, {R}; a mana atravessa os passos do combate e some na fase principal 2', () => {
  let s = mesa(); let f; [s, f] = poe(s, 0, 'Fire Sages', 'battlefield'); s = semMana(s); s.objects[f].sick = false;
  s = atacaCom(s, [f]);
  eq(s.players[0].pool.R, 1, 'atacou: {R}');
  s = vaiAte(s, 'combat_blockers'); if (s.pending && s.pending.kind === 'blockers') s = act(s, { t: 'block', p: 1, blocks: [] });
  s = vaiAte(s, 'combat_damage'); eq(s.players[0].pool.R, 1, 'no passo de dano ainda está lá');
  s = vaiAte(s, 'combat_end'); eq(s.players[0].pool.R, 1, 'no fim do combate também');
  s = vaiAte(s, 'main2'); eq([s.players[0].pool.R, s.players[0].manaCombateT], [0, undefined], 'acabou o combate: sumiu');
});

test('CR 702.189a / 500.4 · a mana comum some entre os passos; só a da dobra fica, e o jogador gasta primeiro a outra', () => {
  let s = mesa(); let z; [s, z] = poe(s, 0, 'Zuko, Exiled Prince', 'battlefield'); s = semMana(s); s.objects[z].sick = false;
  s = atacaCom(s, [z]);
  eq(s.players[0].pool.R, 3, 'dobra de fogo 3');
  s = J(s); s.players[0].pool.R += 2; s = J(s); s.turn.priority = 0;
  let c; [s, c] = poe(s, 0, 'Raio', 'hand'); s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === c && a.targets[0].player === 1)[0]); s = passaAte(s, x => !x.stack.length || !!x.pending);
  eq(s.players[0].pool.R, 3, 'pagou {R}{R} com as duas comuns');
  s = vaiAte(s, 'combat_blockers'); if (s.pending && s.pending.kind === 'blockers') s = act(s, { t: 'block', p: 1, blocks: [] });
  eq(s.players[0].pool.R, 3, 'as três da dobra seguem');
});

test('CR 702.189a · Firebending Student (texto oficial): dobra de fogo X, X = o poder (com a destreza, conta o +1/+1)', () => {
  let s = mesa(); let f; [s, f] = poe(s, 0, 'Firebending Student', 'battlefield'); s = semMana(s); s.objects[f].sick = false; s.players[0].pool.R = 1;
  let c; [s, c] = poe(s, 0, 'Choque', 'hand'); s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === c && a.targets[0].player === 1)[0]); s = passaAte(s, x => !x.stack.length || !!x.pending);
  eq(E.stats(s, s.objects[f]).power, 2, 'destreza: 2/3');
  s = atacaCom(s, [f]);
  eq(s.players[0].pool.R, 2, 'X = 2');
});

test('CR 702.189a · Loyal Fire Sage e Vindictive Warden (textos oficiais): a mana da dobra paga a habilidade no combate', () => {
  let s = mesa(); let l, w; [s, l] = poe(s, 0, 'Loyal Fire Sage', 'battlefield'); [s, w] = poe(s, 0, 'Vindictive Warden', 'battlefield'); s = semMana(s); s.objects[l].sick = false; s.objects[w].sick = false;
  s = atacaCom(s, [l, w]);
  eq(s.players[0].pool.R, 2, 'duas dobras');
  s = J(s); s.players[0].pool.C = 1; s.turn.priority = 0;
  const v = s.players[1].life; s = passaAte(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === w)[0]), x => !x.stack.length || !!x.pending);
  eq(s.players[1].life, v - 1, '{3} pago com {R}{R} da dobra e {C}');
});

test('CR 500.5a / 511.3 · Murk Dwellers (texto oficial): +2/+0 até o fim do combate — dá o dano e acaba ao sair do combate', () => {
  let s = mesa(); let m; [s, m] = poe(s, 0, 'Murk Dwellers', 'battlefield'); s = J(s); s.objects[m].sick = false;
  const v = s.players[1].life;
  s = atacaCom(s, [m]); s = vaiAte(s, 'combat_blockers'); if (s.pending && s.pending.kind === 'blockers') s = act(s, { t: 'block', p: 1, blocks: [] });
  s = passaAte(s, x => x.turn.step === 'combat_damage' && !x.stack.length || !!x.pending);
  s = vaiAte(s, 'combat_end');
  eq([v - s.players[1].life, E.stats(s, s.objects[m]).power], [4, 4], 'não bloqueada: 4 de dano; no fim do combate ainda 4/2');
  s = vaiAte(s, 'main2');
  eq(E.stats(s, s.objects[m]).power, 2, 'na principal 2, 2/2');
});

test('CR 702.189 · validador, palavra e pilha explicada', () => {
  const v = sc => J(SC.validateScript({ name: 'X', ...sc, example: { action: 'etb', target: 'none', expect: { attached: false } } }));
  eq(v({ self: { firebendingX: 'creatures-you-control' } }), []);
  assert.ok(v({ self: { firebendingX: 'poder' } }).some(e => /firebendingX/.test(e)));
  eq(v({ abilities: [{ kind: 'triggered', when: 'attacks', effects: [{ do: 'continuo', target: 'self-source', poder: 1, resistencia: 0, ate: 'fim-do-combate' }] }] }), []);
  assert.match(T.descreveEfeitos([{ do: 'dobra_de_fogo', n: 2 }]), /\{R\}\{R\}.*fim do combate/);
});
