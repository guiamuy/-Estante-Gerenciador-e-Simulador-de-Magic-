// M-412 · LT78 · limiar (207.2c) nas mágicas: "Threshold — If there are seven or more cards in your graveyard, instead destroy that land and ~ deals 1 damage
// to each creature and each player" (Rancid Earth) e "Threshold — ~ deals 5 damage instead if there are seven or more cards in your graveyard" (Thermal Blast);
// texto da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json), caminho de produção (APROVADAS). Contado na resolução. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, palavrasDoTexto, valorDeMana, S } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Rancid Earth', 'Thermal Blast'];
const C = {}; for (const n of NOMES) { const c = OF.find(x => x.name === n); C[n] = { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: palavrasDoTexto(c.oracle_text), oracle_text: c.oracle_text, colors: [...new Set(c.mana_cost.match(/[WUBRG]/g))] }; }
C.Urso = { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' };
C.Gigante = { name: 'Gigante', type_line: 'Creature — Giant', mana_cost: '{4}{R}', cmc: 5, keywords: [], oracle_text: '', colors: ['R'], power: '5', toughness: '5' };
C.Arbor = { name: 'Arbor', type_line: 'Land Creature — Forest Dryad', mana_cost: '', cmc: 0, keywords: [], oracle_text: '', colors: [], power: '1', toughness: '1' };
C.Swamp = { name: 'Swamp', type_line: 'Basic Land — Swamp', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {B}.)', colors: [] };
C.Mountain = { name: 'Mountain', type_line: 'Basic Land — Mountain', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {R}.)', colors: [] };
function mesa(seed = 11) {
  const b = ns => ns.map(name => ({ name, qty: 16, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Urso', 'Gigante', 'Swamp', 'Mountain']) }, { name: 'B', deck: b(['Urso', 'Gigante', 'Swamp', 'Arbor']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending);
const cemiterio = (s, p, n, nome = 'Mountain') => { for (let i = 0; i < n; i++) [s] = poe(s, p, nome, 'graveyard'); return s; };
const terrenos = (s, n, nome) => { for (let i = 0; i < n; i++) [s] = poe(s, 0, nome); return s; };

test('LT78 · as duas jogam pelo leitor aprovado; o "instead" vira condição de limiar contada na resolução', () => {
  for (const n of NOMES) { assert.equal(S.coverage(C[n]).level, 'completo', n); assert.equal(S.APROVADAS[n].leva, 'M-412'); }
  assert.deepEqual(JSON.parse(JSON.stringify(S.leitura(C['Thermal Blast']).script.effects[0].amount)), { per: 'se', se: 'threshold', sim: 5, nao: 3 });
});

test('LT78 · Rancid Earth: sem limiar só destrói o terreno; com sete cartas no seu cemitério destrói e causa 1 de dano a cada criatura e cada jogador', () => {
  let s = mesa(), re, u0, u1, tb; [s, re] = poe(s, 0, 'Rancid Earth', 'hand'); [s, u0] = poe(s, 0, 'Urso'); [s, u1] = poe(s, 1, 'Urso'); [s, tb] = poe(s, 1, 'Swamp'); s = terrenos(s, 3, 'Swamp');
  const cast = x => resolve(act(x, legais(x, 0, a => a.t === 'cast' && a.oid === re && a.targets[0].oid === tb)[0]));
  let a = cast(cemiterio(s, 0, 6)); assert.equal(a.objects[tb].zone, 'graveyard'); assert.deepEqual([a.players[0].life, a.players[1].life], [20, 20]); assert.ok(!a.objects[u0].damage && !a.objects[u1].damage, 'seis cartas: sem limiar');
  let b = cast(cemiterio(s, 0, 7)); assert.equal(b.objects[tb].zone, 'graveyard'); assert.deepEqual([b.players[0].life, b.players[1].life], [19, 19]);
  assert.equal(b.objects[u0].damage, 1); assert.equal(b.objects[u1].damage, 1);
  let c = cast(cemiterio(s, 1, 9, 'Swamp')); assert.deepEqual([c.players[0].life, c.players[1].life], [20, 20], 'o limiar é do SEU cemitério');
  // seis no seu cemitério e o terreno destruído é seu: o limiar é contado antes de o terreno ir ao cemitério
  let s2 = cemiterio(s, 0, 6), meu; [s2, meu] = poe(s2, 0, 'Swamp'); let d = resolve(act(s2, legais(s2, 0, a => a.t === 'cast' && a.oid === re && a.targets[0].oid === meu)[0]));
  assert.equal(d.objects[meu].zone, 'graveyard'); assert.deepEqual([d.players[0].life, d.players[1].life], [20, 20]);
});

test('LT78 · achado da revisão: na ordem do texto, destruir vem antes do dano — terreno-criatura 1/1 com escudo de regeneração regenera e depois morre do dano (608.2c, 701.19)', () => {
  let s = mesa(), re, ar; [s, re] = poe(s, 0, 'Rancid Earth', 'hand'); [s, ar] = poe(s, 1, 'Arbor'); s = terrenos(s, 3, 'Swamp'); s = cemiterio(s, 0, 7, 'Mountain');
  s = J(s); s.objects[ar].regenerar = 1;
  const r = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === re && a.targets[0].oid === ar)[0]));
  assert.equal(r.objects[ar].zone, 'graveyard', 'regenerou da destruição e morreu do 1 de dano');
});

test('LT78 · Thermal Blast: 3 de dano, ou 5 com limiar', () => {
  let s = mesa(), tb, g; [s, tb] = poe(s, 0, 'Thermal Blast', 'hand'); [s, g] = poe(s, 1, 'Gigante'); s = terrenos(s, 5, 'Mountain');
  const cast = x => resolve(act(x, legais(x, 0, a => a.t === 'cast' && a.oid === tb && a.targets[0].oid === g)[0]));
  let a = cast(cemiterio(s, 0, 6)); assert.equal(a.objects[g].damage, 3); assert.equal(a.objects[g].zone, 'battlefield');
  let b = cast(cemiterio(s, 0, 7)); assert.equal(b.objects[g].zone, 'graveyard', '5 de dano no 5/5');
});

test('LT78 · a pilha explicada diz a condição', async () => {
  const { loadModules } = await import('./_load.mjs'); const M = loadModules();
  assert.match(M.table.descreveEfeitos([{ do: 'damage', amount: 1, target: 'each-player', onlyIf: 'threshold' }]), /limiar/);
  assert.match(M.table.descreveEfeitos([{ do: 'damage', amount: { per: 'se', se: 'threshold', sim: 5, nao: 3 }, target: 'creature' }]), /3 \(5 com limiar\)/);
});
