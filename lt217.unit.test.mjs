// M-535 · LT197 · revisão por lote CLXXIII (textos da Scryfall de 19/10/2026): Realm-Cloaked Giant // Cast Off ("Destroy all non-Giant
// creatures") e Hypnotic Sprite // Mesmeric Glare ("Counter target spell with mana value 3 or less" — restrição de alvo, 115.1). Falham no
// motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const RG = 'Realm-Cloaked Giant // Cast Off', HS = 'Hypnotic Sprite // Mesmeric Glare';
const of = n => { const c = OF.find(x => x.name === n); return { name: n, layout: c.layout, faces: c.faces, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: c.keywords || [], oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], power: c.power, toughness: c.toughness }; };
const C = { 'Realm-Cloaked Giant': of(RG), 'Hypnotic Sprite': of(HS) };
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Plains: terra('Plains', 'Plains', 'W'), Island: terra('Island', 'Island', 'U'), Forest: terra('Forest', 'Forest', 'G'),
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', power: '2', toughness: '2', colors: ['G'] },
  Gigante: { name: 'Gigante', type_line: 'Creature — Giant', mana_cost: '{4}{G}', cmc: 5, keywords: [], oracle_text: '', power: '5', toughness: '5', colors: ['G'] },
  Mutante: { name: 'Mutante', type_line: 'Creature — Shapeshifter', mana_cost: '{3}', cmc: 3, keywords: ['Changeling'], oracle_text: 'Changeling', power: '1', toughness: '1', colors: [] } });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: /Land/.test(C[name].type_line) ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 217, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b(['Realm-Cloaked Giant', 'Hypnotic Sprite', 'Urso', 'Plains', 'Island']) }, { name: 'B', deck: b(['Urso', 'Gigante', 'Mutante', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const terras = (s, p, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, p, n); return s; };
const limpa = s => passaAte(s, x => !x.stack.length && !x.pending && !(x.queued || []).length);

test('M-535 · as duas jogam (lidas e aprovadas)', () => { for (const n of [RG, HS]) assert.equal(S.coverage(of(n)).level, 'completo', n); });

test('M-535 · Cast Off destrói as criaturas que não são Gigantes (o metamorfo é Gigante e fica); a carta vai ao exílio', () => {
  let s = mesa(), rg, u, ua, g, m; [s, rg] = poe(s, 0, 'Realm-Cloaked Giant', 'hand'); s = terras(s, 0, 'Plains', 5);
  [s, ua] = poe(s, 0, 'Urso'); [s, u] = poe(s, 1, 'Urso'); [s, g] = poe(s, 1, 'Gigante'); [s, m] = poe(s, 1, 'Mutante');
  s = limpa(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === rg && a.omen)[0]));
  assert.deepEqual([s.objects[ua].zone, s.objects[u].zone, s.objects[g].zone, s.objects[m].zone], ['graveyard', 'graveyard', 'battlefield', 'battlefield']);
  assert.equal(s.objects[rg].zone, 'exile');
});

test('M-535 · Mesmeric Glare só mira mágica de valor de mana 3 ou menos', () => {
  const alvosContra = nome => { let s = mesa(), hs, o; [s, hs] = poe(s, 0, 'Hypnotic Sprite', 'hand'); s = terras(s, 0, 'Island', 3);
    s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
    [s, o] = poe(s, 1, nome, 'hand'); s = terras(s, 1, 'Forest', 5); s = act(s, legais(s, 1, a => a.t === 'cast' && a.oid === o)[0]); s = act(s, { t: 'pass', p: 1 });
    const of = legais(s, 0, a => a.t === 'cast' && a.oid === hs && a.omen && a.targets && a.targets[0].oid === o);
    if (!of.length) return [false];
    s = passaAte(act(s, of[0]), x => !x.stack.includes(o) || !!x.pending); return [true, s.objects[o].zone]; };
  assert.deepEqual(alvosContra('Urso'), [true, 'graveyard'], 'valor de mana 2: anulada');
  assert.deepEqual(alvosContra('Gigante'), [false], 'valor de mana 5: não é alvo');
});
