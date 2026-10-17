// M-414 · LT80 · Glorious Gale: "Counter target creature spell. If it was a legendary spell, the Ring tempts you." (texto da Scryfall de 17/10/2026 UTC,
// .listas/oficiais-revisadas.json), caminho de produção (APROVADAS). 608.2h: "it" é a mágica alvo como era antes de ser anulada (condição `alvo-era-lendario`);
// o Anel tenta (701.54) mesmo que a mágica não possa ser anulada. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, palavrasDoTexto, valorDeMana, S } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const g0 = OF.find(x => x.name === 'Glorious Gale');
const C = { 'Glorious Gale': { name: g0.name, type_line: g0.type_line, mana_cost: g0.mana_cost, cmc: 2, keywords: [], oracle_text: g0.oracle_text, colors: ['U'] },
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Rei: { name: 'Rei', type_line: 'Legendary Creature — Human Noble', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Island: { name: 'Island', type_line: 'Basic Land — Island', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {U}.)', colors: [] },
  Forest: { name: 'Forest', type_line: 'Basic Land — Forest', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {G}.)', colors: [] } };
function mesa(seed = 15) {
  const b = ns => ns.map(name => ({ name, qty: 10, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, first: 1, players: [{ name: 'A', deck: b(['Glorious Gale', 'Urso', 'Island']) }, { name: 'B', deck: b(['Urso', 'Rei', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending);
function cenario(criatura) {
  let s = mesa(), gg, c, u; [s, gg] = poe(s, 0, 'Glorious Gale', 'hand'); [s, u] = poe(s, 0, 'Urso'); for (let i = 0; i < 2; i++) [s] = poe(s, 0, 'Island'); for (let i = 0; i < 2; i++) [s] = poe(s, 1, 'Forest'); [s, c] = poe(s, 1, criatura, 'hand');
  s = act(s, legais(s, 1, a => a.t === 'cast' && a.oid === c)[0]); s = act(s, { t: 'pass', p: 1 });
  const r = legais(s, 0, a => a.t === 'cast' && a.oid === gg && a.targets[0].oid === c); assert.ok(r.length, 'mira a mágica de criatura');
  return { s: act(s, r[0]), c, u };
}
const tentado = s => s.zones[0].command.some(o => s.objects[o] && s.objects[o].emblemaV);

test('LT80 · Glorious Gale joga pelo leitor aprovado', () => {
  assert.equal(S.coverage(C['Glorious Gale']).level, 'completo'); assert.equal(S.APROVADAS['Glorious Gale'].leva, 'M-414');
  assert.deepEqual(JSON.parse(JSON.stringify(S.leitura(C['Glorious Gale']).script.effects)), [{ do: 'counter', target: 'creature-spell' }, { do: 'ring_tempts', onlyIf: 'alvo-era-lendario' }]);
});

test('LT80 · anula a mágica de criatura; o Anel tenta só se ela era lendária', () => {
  let { s, c, u } = cenario('Urso'); s = resolve(s); assert.equal(s.objects[c].zone, 'graveyard'); assert.ok(!tentado(s), 'não lendária: o Anel não tenta');
  ({ s, c, u } = cenario('Rei')); s = resolve(s); assert.equal(s.objects[c].zone, 'graveyard'); assert.ok(tentado(s), 'lendária: o Anel tenta');
});

test('LT80 · a mágica alvo sai da pilha antes: Glorious Gale não resolve e o Anel não tenta (608.2b)', () => {
  let { s, c } = cenario('Rei'); s = J(s); const st = s.stack; const i = st.findIndex(x => x === c || (s.objects[x] && s.objects[x].oid === c)); assert.ok(i >= 0, 'a mágica alvo está na pilha'); st.splice(i, 1); s.zones[1].graveyard.push(c); s.objects[c].zone = 'graveyard'; s.objects[c].zc = (s.objects[c].zc || 0) + 1;
  s = resolve(s); assert.ok(!tentado(s));
});

test('LT80 · a pilha explicada diz a condição', async () => {
  const { loadModules } = await import('./_load.mjs'); const M = loadModules();
  assert.match(M.table.descreveEfeitos([{ do: 'ring_tempts', onlyIf: 'alvo-era-lendario' }]), /se a mágica era lendária/);
});
