// K-88 · CR 305.7 / 613.1d / 613.8 · "Each land is a Swamp in addition to its other land types." (Urborg, Tomb of Yawgmoth, 53 listas
// competitivas; Yavimaya, Cradle of Growth; texto da Scryfall pelo ramo catalogo de 01/11/2026 em .listas/oficiais-keywords.json). Todo
// terreno no campo (os dois lados, o próprio Urborg, os básicos) ganha o subtipo e a mana intrínseca dele, sem perder nada (305.7: "in
// addition"). 613.8: sob "Nonbasic lands are Mountains" (K-87), Urborg é um terreno não básico e perde a habilidade, seja qual for a ordem.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, J, act, poe, passaAte } from './listas.mjs';
import { loadModules } from './_load.mjs';
const { leitor: L } = loadModules();
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-keywords.json', import.meta.url), 'utf8')).cartas;
const of = n => { const c = OF.find(x => x.name === n); assert.ok(c, 'sem texto oficial: ' + n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost || '', cmc: c.mana_cost ? 3 : 0, keywords: c.keywords || [], oracle_text: c.oracle_text, colors: [] }; };
const EX = { action: 'etb', target: 'none', expect: { attached: false } };
const UR = 'Urborg, Tomb of Yawgmoth', YA = 'Yavimaya, Cradle of Growth';

test('K-88 · leitura: Urborg soma Swamp e Yavimaya soma Forest a todo terreno', () => {
  for (const [n, sub] of [[UR, 'Swamp'], [YA, 'Forest']]) {
    const l = S.leitura(of(n)); assert.ok(l, n + ': leitura completa'); assert.equal(S.coverage(of(n)).level, 'lida');
    assert.deepEqual(J(l.script.self.terrenosK), { quais: 'todos', subtipo: sub, soma: true });
    assert.deepEqual(J(S.validateScript({ ...l.script, example: EX })), []);
  }
});

const ilha = { name: 'Island', type_line: 'Basic Land — Island', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {U}.)', colors: [] };
const C = { [UR]: of(UR), 'Blood Moon': of('Blood Moon'), Island: ilha,
  'Terra de Teste': { name: 'Terra de Teste', type_line: 'Land — Desert', mana_cost: '', cmc: 0, keywords: [], oracle_text: '{T}: Add {C}.', colors: [] } };
const scripts = { [UR]: { ...S.leitura(C[UR]).script, lido: true, example: EX }, 'Blood Moon': { ...S.leitura(C['Blood Moon']).script, lido: true, example: EX },
  'Terra de Teste': { name: 'Terra de Teste', produces: [['C']], example: EX } };
function mesa() {
  const b = ns => ns.map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 88, mode: 'full', cards: C, scripts, first: 0, players: [{ name: 'A', deck: b([['Island', 20], [UR, 1], ['Terra de Teste', 4]]) }, { name: 'B', deck: b([['Island', 26], ['Blood Moon', 2]]) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const prod = (s, oid) => J(E.productions(s, s.objects[oid])).map(x => x.join('')).sort();

test('K-88 · na partida: todo terreno ganha Swamp e {B} sem perder nada; o do oponente também; sem Urborg, volta', () => {
  let s = mesa(), ilhaA, terra, ur, ilhaB;
  [s, ilhaA] = poe(s, 0, 'Island'); [s, terra] = poe(s, 0, 'Terra de Teste'); [s, ilhaB] = poe(s, 1, 'Island');
  assert.deepEqual(prod(s, ilhaA), ['U']);
  [s, ur] = poe(s, 0, UR);
  assert.deepEqual(prod(s, ilhaA), ['B', 'U'], 'a Ilha básica: {U} ou {B}');
  assert.equal(E.linhaDeTipo(s, s.objects[ilhaA]), 'Basic Land — Island Swamp');
  assert.deepEqual(prod(s, terra), ['B', 'C'], 'o não básico fica com a própria mana e ganha {B}');
  assert.deepEqual(prod(s, ur), ['B'], 'o próprio Urborg é terreno: {B}');
  assert.deepEqual(prod(s, ilhaB), ['B', 'U'], '"each land": o do oponente também');
  const z = J(s); E.moveObject(z, ur, 'graveyard'); assert.deepEqual(prod(z, ilhaA), ['U']);
});

test('K-88 · 613.8: com Blood Moon, Urborg perde a habilidade nas duas ordens; tudo vira Montanha ou fica básico', () => {
  for (const ordem of ['urborg-primeiro', 'lua-primeiro']) {
    let s = mesa(), ilhaA, terra, ur;
    [s, ilhaA] = poe(s, 0, 'Island'); [s, terra] = poe(s, 0, 'Terra de Teste');
    if (ordem === 'urborg-primeiro') { [s, ur] = poe(s, 0, UR); [s] = poe(s, 1, 'Blood Moon'); } else { [s] = poe(s, 1, 'Blood Moon'); [s, ur] = poe(s, 0, UR); }
    assert.deepEqual(prod(s, ilhaA), ['U'], ordem + ': a Ilha não ganha Swamp');
    assert.deepEqual(prod(s, terra), ['R'], ordem); assert.deepEqual(prod(s, ur), ['R'], ordem + ': Urborg é uma Montanha');
    assert.equal(E.linhaDeTipo(s, s.objects[ur]), 'Legendary Land — Mountain', ordem);
  }
});
