// M-443 · LT109 · Might of Old Krosa ("Target creature gets +2/+2 until end of turn. If you cast this spell during your main phase, that creature gets +4/+4
// until end of turn instead."). Texto da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json), caminho de produção (APROVADAS). Condição nova
// `na-principal-propria` (marcada na mágica ao conjurar, na fase principal de quem conjura). Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const c0 = OF.find(x => x.name === 'Might of Old Krosa');
const C = { 'Might of Old Krosa': { name: c0.name, type_line: c0.type_line, mana_cost: c0.mana_cost, cmc: 1, keywords: [], oracle_text: c0.oracle_text, colors: ['G'] },
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Forest: { name: 'Forest', type_line: 'Basic Land — Forest', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {G}.)', colors: [] } };
function mesa(seed = 52) {
  const b = ns => ns.map(name => ({ name, qty: 10, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b(['Might of Old Krosa', 'Urso', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending, 40);
const pt = (s, o) => { const x = E.stats(s, s.objects[o]); return `${x.power}/${x.toughness}`; };

test('LT109 · Might of Old Krosa joga pelo leitor aprovado', () => {
  assert.equal(S.coverage(C['Might of Old Krosa']).level, 'completo'); assert.equal(S.APROVADAS['Might of Old Krosa'].leva, 'M-443');
});

test('LT109 · na sua fase principal: +4/+4', () => {
  let s = mesa(), mk, u; [s, mk] = poe(s, 0, 'Might of Old Krosa', 'hand'); [s, u] = poe(s, 0, 'Urso'); [s] = poe(s, 0, 'Forest');
  const t = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === mk && a.targets[0].oid === u)[0])); assert.equal(pt(t, u), '6/6');
});

test('LT109 · fora da sua fase principal (no turno do oponente): +2/+2', () => {
  let s = mesa(), mk, u; [s, mk] = poe(s, 0, 'Might of Old Krosa', 'hand'); [s, u] = poe(s, 0, 'Urso'); [s] = poe(s, 0, 'Forest');
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending, 200); s = J(s); s.turn.priority = 0; for (const o of s.zones[0].battlefield) s.objects[o].tapped = false;
  const a = legais(s, 0, x => x.t === 'cast' && x.oid === mk && x.targets[0].oid === u); assert.ok(a.length, 'instantânea no turno do oponente');
  const t = resolve(act(s, a[0])); assert.equal(pt(t, u), '4/4');
});

test('LT109 · no seu combate (não é fase principal): +2/+2', () => {
  let s = mesa(), mk, u; [s, mk] = poe(s, 0, 'Might of Old Krosa', 'hand'); [s, u] = poe(s, 0, 'Urso'); [s] = poe(s, 0, 'Forest');
  s = J(s); s.turn.step = 'combat_begin'; const t = resolve(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === mk && x.targets[0].oid === u)[0]));
  assert.equal(pt(t, u), '4/4');
});
