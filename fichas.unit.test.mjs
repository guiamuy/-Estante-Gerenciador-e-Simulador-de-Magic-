// E50 P3 · fichas: quais os scripts criam, como o repositório as busca (t:token) e guarda, e o que acontece sem rede.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
const { scripts: S, cards: C, platform: P } = loadModules();
const J = x => JSON.parse(JSON.stringify(x));

test('E50 P3 · fichasDasCartas acha toda ficha do script (efeitos, gatilhos, habilidades, alternativas), sem repetir', () => {
  const defs = S.fichasDasCartas(['Thraben Inspector', 'Novice Inspector', 'Battle Screech', 'Lys Alana Huntmaster', 'Island', 'Carta Inexistente']);
  const chaves = J(defs.map(S.chaveDaFicha)).sort();
  assert.deepEqual(chaves, ['bird 1/1', 'clue', 'elf warrior 1/1']);
  assert.ok(defs.every(t => t.name && Array.isArray(t.types)));
  assert.equal(S.fichasDasCartas([]).length, 0);
  // percorre estruturas aninhadas
  const sc = { name: 'X', effects: [{ do: 'modal', modes: [{ effects: [{ do: 'token', amount: 1, token: { name: 'Goblin', types: ['creature'], power: 1, toughness: 1 } }] }] }],
    abilities: [{ effects: [{ do: 'token', token: { name: 'Goblin', types: ['creature'], power: 2, toughness: 2 } }] }] };
  assert.deepEqual(J(S.fichasDoScript(sc).map(S.chaveDaFicha)), ['goblin 1/1', 'goblin 2/2']);
});

test('E50 P3 · o repositório busca a ficha como "!nome t:token pow tou", fixa para sempre e, sem rede, responde do cache', async () => {
  const pedidos = [];
  const clue = { name: 'Clue', type_line: 'Token Artifact — Clue', images: { small: 's', normal: 'n' } };
  const scryfall = { async search(q) { pedidos.push(q); return /clue/i.test(q) ? [clue] : []; }, async collection() { return { found: [], missing: [] }; } };
  const store = P.memoryStore();
  const repo = C.createCardRepo({ store, scryfall, now: () => 1000 });
  const defs = [{ name: 'Clue', types: ['artifact'] }, { name: 'Elf Warrior', types: ['creature'], colors: ['G'], power: 1, toughness: 1 }];
  const r = await repo.fichas(defs);
  assert.equal(r.get('ficha:clue'), clue);
  assert.equal(r.get('ficha:elf warrior 1/1'), null, 'ficha que a rede não achou fica nula');
  assert.deepEqual(J(pedidos), ['!"Clue" t:token', '!"Elf Warrior" t:token pow=1 tou=1 c=g', '!"Elf Warrior" t:token pow=1 tou=1'], 'sem cor na segunda tentativa');
  // segunda chamada: a ficha achada não volta à rede; a não achada volta (vence rápido)
  pedidos.length = 0;
  const repo2 = C.createCardRepo({ store, scryfall, now: () => 1000 + 2 * 24 * 3600 * 1000 });
  const r2 = await repo2.fichas(defs);
  assert.equal(r2.get('ficha:clue').name, 'Clue');
  assert.deepEqual(J(pedidos), ['!"Elf Warrior" t:token pow=1 tou=1 c=g', '!"Elf Warrior" t:token pow=1 tou=1']);
  // sem rede: só o que está guardado, sem chamar a rede
  pedidos.length = 0;
  const r3 = await repo2.fichas(defs, { onlineOnly: true });
  assert.equal(r3.get('ficha:clue').name, 'Clue'); assert.equal(r3.get('ficha:elf warrior 1/1'), null);
  assert.deepEqual(J(pedidos), []);
  // rede quebrada: não derruba, devolve o cache
  const repo3 = C.createCardRepo({ store, scryfall: { async search() { throw new Error('offline'); } }, now: () => 1000 });
  const r4 = await repo3.fichas(defs);
  assert.equal(r4.get('ficha:clue').name, 'Clue'); assert.equal(r4.get('ficha:elf warrior 1/1'), null);
});
