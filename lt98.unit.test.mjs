// M-416 · LT82 · mórbido (207.2c): "Morbid — That creature gets -13/-13 until end of turn instead if a creature died this turn." (Tragic Slip; texto da Scryfall
// de 17/10/2026 UTC, .listas/oficiais-revisadas.json), caminho de produção (APROVADAS). "Morrer" é ir do campo ao cemitério (700.4), de qualquer jogador,
// inclusive ficha; contado na resolução e só no turno atual. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, palavrasDoTexto, valorDeMana, S } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const t0 = OF.find(x => x.name === 'Tragic Slip');
const C = { 'Tragic Slip': { name: t0.name, type_line: t0.type_line, mana_cost: t0.mana_cost, cmc: 1, keywords: [], oracle_text: t0.oracle_text, colors: ['B'] },
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Gigante: { name: 'Gigante', type_line: 'Creature — Giant', mana_cost: '{4}{G}', cmc: 5, keywords: [], oracle_text: '', colors: ['G'], power: '5', toughness: '5' },
  Pedra: { name: 'Pedra', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] },
  Swamp: { name: 'Swamp', type_line: 'Basic Land — Swamp', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {B}.)', colors: [] } };
function mesa(seed = 19, comSlip = true) {
  const b = ns => ns.map(name => ({ name, qty: 10, zone: 'main' }));
  const cards = comSlip ? C : Object.fromEntries(Object.entries(C).filter(([k]) => k !== 'Tragic Slip'));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards, first: 0, players: [{ name: 'A', deck: b([...(comSlip ? ['Tragic Slip'] : []), 'Urso', 'Pedra', 'Swamp']) }, { name: 'B', deck: b(['Urso', 'Gigante', 'Swamp']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending);
const mata = (s, oid) => { s = J(s); s.objects[oid].damage = 99; return passaAte(act(s, { t: 'tap_mana', p: 0, oid: s.zones[0].battlefield.find(o => s.objects[o].name === 'Swamp' && !s.objects[o].tapped), option: 0 }), x => true, 1); };

test('LT82 · Tragic Slip joga pelo leitor aprovado; só a partida com carta de mórbido guarda "uma criatura morreu neste turno"', () => {
  assert.equal(S.coverage(C['Tragic Slip']).level, 'completo'); assert.equal(S.APROVADAS['Tragic Slip'].leva, 'M-416');
  assert.equal(mesa().morteNoTurno, 0); assert.ok(!('morteNoTurno' in mesa(19, false)), 'partida sem mórbido: o estado não muda');
});

test('LT82 · -1/-1 sem morte no turno; -13/-13 depois que uma criatura de qualquer jogador morreu neste turno; a morte de outro turno não conta', () => {
  let s = mesa(), ts, g, u, ub; [s, ts] = poe(s, 0, 'Tragic Slip', 'hand'); [s, g] = poe(s, 1, 'Gigante'); [s, u] = poe(s, 0, 'Urso'); [s, ub] = poe(s, 1, 'Urso'); for (let i = 0; i < 2; i++) [s] = poe(s, 0, 'Swamp');
  const slip = x => resolve(act(x, legais(x, 0, a => a.t === 'cast' && a.oid === ts && a.targets[0].oid === g)[0]));
  let a = slip(s); assert.equal(a.objects[g].zone, 'battlefield', 'sem morte: -1/-1 no 5/5');
  let m = J(s); m.objects[ub].damage = 9; m = passaAte(act(m, { t: 'pass', p: 0 }), x => x.objects[ub].zone !== 'battlefield', 4);
  if (m.turn.priority !== 0) m = J(m), m.turn.priority = 0; assert.equal(m.objects[ub].zone, 'graveyard'); assert.equal(m.morteNoTurno, m.turn.number);
  let b = slip(m); assert.equal(b.objects[g].zone, 'graveyard', 'com morte no turno: -13/-13');
  let c = J(m); c.morteNoTurno = c.turn.number - 1; let d = slip(c); assert.equal(d.objects[g].zone, 'battlefield', 'morte no turno anterior não conta');
});

test('LT82 · artefato não criatura que vai do campo ao cemitério não liga o mórbido; criatura sacrificada liga (700.4)', () => {
  let s = mesa(), pe, u; [s, pe] = poe(s, 0, 'Pedra'); [s, u] = poe(s, 0, 'Urso');
  const a = J(s); E.sacrifice(a, pe, []); assert.equal(a.objects[pe].zone, 'graveyard'); assert.equal(a.morteNoTurno, 0, 'artefato não é criatura');
  const b = J(s); E.sacrifice(b, u, []); assert.equal(b.objects[u].zone, 'graveyard'); assert.equal(b.morteNoTurno, b.turn.number, 'criatura sacrificada morreu');
});

test('LT82 · a pilha explicada diz a condição', async () => {
  const { loadModules } = await import('./_load.mjs'); const M = loadModules();
  assert.match(M.table.descreveEfeitos([{ do: 'pump', power: { per: 'se', se: 'morbid', sim: -13, nao: -1 }, toughness: { per: 'se', se: 'morbid', sim: -13, nao: -1 }, target: 'creature' }]), /−1\/−1 \(−13\/−13 se uma criatura morreu neste turno\)/);
});
