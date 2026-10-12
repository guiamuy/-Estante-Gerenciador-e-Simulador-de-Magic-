// M-317 · Terminate: "Destroy target creature. It can't be regenerated." O script ignorava a segunda frase desde que a regeneração passou
// a existir no motor (CR2-G R5c): uma criatura com escudo de regeneração sobrevivia. Falha no motor anterior. Texto: .listas/oficiais.json.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, passaAte, comMana, tudo, CARTAS } from './cmd.mjs';
import { loadModules } from './_load.mjs';

const Ursa = { name: 'Ursa', type_line: 'Creature — Bear', mana_cost: '{G}', cmc: 1, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' };
function mesaX(a = [], b = []) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 12, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 1, mode: 'full', cards: { ...CARTAS, Ursa }, first: 0, players: [{ name: 'A', deck: baralho([...a, 'Mountain', 'Swamp']) }, { name: 'B', deck: baralho([...b, 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}

test('701.19c · Terminate destrói a criatura com escudo de regeneração ("It can\'t be regenerated")', () => {
  let s = mesaX(['Terminate', 'Lightning Bolt'], ['Ursa']), t, u;
  [s, u] = poe(s, 1, 'Ursa'); [s, t] = poe(s, 0, 'Terminate', 'hand');
  s = J(s); s.objects[u].regenerar = 1; s = comMana(s, 'BR');
  s = tudo(act(act(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === t && a.targets && a.targets[0].oid === u)[0]), { t: 'pass', p: 0 }), { t: 'pass', p: 1 }));
  assert.equal(s.objects[u].zone, 'graveyard');
});

test('M-317 · o leitor lê "It can\'t be regenerated." junto do "destroy" anterior', () => {
  const { leitor: L } = loadModules();
  const r = L.ler({ name: 'Terminate', type_line: 'Instant', oracle_text: "Destroy target creature. It can't be regenerated." });
  assert.equal(r.completa, true);
  assert.deepEqual(JSON.parse(JSON.stringify(r.script.effects)), [{ do: 'destroy', target: 'creature', semRegenerar: true }]);
});
