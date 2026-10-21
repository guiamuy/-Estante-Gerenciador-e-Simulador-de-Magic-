// M-545 · LT207 · revisão por lote CLXXXIII (texto da Scryfall de 20/10/2026): Sunderflock ("This spell costs {X} less to cast, where X is the
// greatest mana value among Elementals you control. / Flying / When this creature enters, if you cast it, return all non-Elemental creatures to
// their owners' hands."). Redução só do genérico (601.2f), pelo MAIOR valor de mana (não a soma); "if you cast it" (603.4). Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, act, poe, legais, passaAte, valorDeMana, palavrasDoTexto } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const SF = 'Sunderflock';
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: palavrasDoTexto(c.oracle_text), oracle_text: c.oracle_text, colors: ['U'], power: c.power, toughness: c.toughness }; };
const C = { [SF]: of(SF) };
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
const cr = (name, sub, cost) => ({ name, type_line: `Creature — ${sub}`, mana_cost: cost, cmc: valorDeMana(cost), keywords: [], oracle_text: '', power: '2', toughness: '2', colors: [] });
Object.assign(C, { Island: terra('Island', 'Island', 'U'),
  Fagulha: cr('Fagulha', 'Elemental', '{3}'), Brasa: cr('Brasa', 'Elemental', '{5}'), Urso: cr('Urso', 'Bear', '{1}{G}'),
  Mutante: { ...cr('Mutante', 'Shapeshifter', '{2}'), keywords: ['Changeling'], oracle_text: 'Changeling' },
  Reanima: { name: 'Reanima', type_line: 'Sorcery', mana_cost: '{B}', cmc: 1, keywords: [], oracle_text: '', colors: ['B'] } });
const SCRIPTS = { Reanima: { name: 'Reanima', effects: [{ do: 'reanimate', target: 'creature-in-your-graveyard' }], example: { target: 'none', expect: { selfLife: 0 } } } };
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: /Land/.test(C[name].type_line) ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 227, mode: 'full', cards: C, scripts: SCRIPTS, first: 0, players: [{ name: 'A', deck: b([SF, 'Fagulha', 'Brasa', 'Mutante', 'Reanima', 'Island']) }, { name: 'B', deck: b(['Urso', 'Mutante', 'Brasa', 'Island']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const terras = (s, p, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, p, n); return s; };
const limpa = s => passaAte(s, x => !x.stack.length && !x.pending && !(x.queued || []).length);

test('M-545 · Sunderflock joga (lido e aprovado)', () => { assert.equal(S.coverage(of(SF)).level, 'completo'); });

test('M-545 · custa {X} a menos, X o maior valor de mana entre seus Elementais (não a soma; só o genérico)', () => {
  const pode = (elems, ilhas) => { let s = mesa(), sf; [s, sf] = poe(s, 0, SF, 'hand'); for (const e of elems) [s] = poe(s, 0, e); [s] = poe(s, 1, 'Brasa'); s = terras(s, 0, 'Island', ilhas);
    return legais(s, 0, a => a.t === 'cast' && a.oid === sf).length > 0; };
  assert.equal(pode([], 8), false, 'sem Elemental: {7}{U}{U}');
  assert.equal(pode(['Brasa'], 4), true, 'Brasa (5): {2}{U}{U}'); assert.equal(pode(['Brasa'], 3), false);
  assert.equal(pode(['Brasa', 'Fagulha'], 3), false, 'Brasa e Fagulha: o maior (5), não a soma (8)');
  assert.equal(pode(['Brasa', 'Brasa'], 3), false, 'duas Brasas: ainda 5 (o maior); a Brasa do oponente não conta');
  assert.equal(pode(['Mutante'], 7), true, 'metamorfo é Elemental: 2 a menos');
});

test('M-545 · conjurada, devolve à mão todas as criaturas que não são Elementais (o metamorfo é Elemental e fica); posta no campo sem conjurar, não', () => {
  let s = mesa(), sf, u, m, fa; [s, sf] = poe(s, 0, SF, 'hand'); [s, fa] = poe(s, 0, 'Fagulha'); [s, u] = poe(s, 1, 'Urso'); [s, m] = poe(s, 1, 'Mutante'); s = terras(s, 0, 'Island', 6);
  s = limpa(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === sf)[0]));
  assert.deepEqual([s.objects[u].zone, s.objects[m].zone, s.objects[fa].zone, s.objects[sf].zone], ['hand', 'battlefield', 'battlefield', 'battlefield']);
  let t = mesa(), sf2, u2, r; [t, sf2] = poe(t, 0, SF, 'graveyard'); [t, r] = poe(t, 0, 'Reanima', 'hand'); [t, u2] = poe(t, 1, 'Urso'); t = terras(t, 0, 'Island', 1);
  const pool = { B: 1 }; t = JSON.parse(JSON.stringify(t)); Object.assign(t.players[0].pool, pool);
  t = limpa(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === r)[0]));
  assert.equal(t.objects[sf2].zone, 'battlefield'); assert.equal(t.objects[u2].zone, 'battlefield', 'reanimada (não conjurada): o gatilho não dispara');
});
