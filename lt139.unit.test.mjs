// M-457 · LT123 · Llanowar Augur ("Sacrifice this creature: Target creature gets +3/+3 and gains trample until end of turn. Activate only during your
// upkeep."). Texto da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json), caminho de produção (APROVADAS). Pedido da trilha `listas`.
// Restrição de ativação "only during your upkeep" (602.5b): passo de manutenção e turno seu. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const c0 = OF.find(x => x.name === 'Llanowar Augur');
const C = { 'Llanowar Augur': { name: c0.name, type_line: c0.type_line, mana_cost: c0.mana_cost, cmc: 1, keywords: [], oracle_text: c0.oracle_text, colors: ['G'], power: c0.power, toughness: c0.toughness },
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Forest: { name: 'Forest', type_line: 'Basic Land — Forest', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {G}.)', colors: [] } };
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 79, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b(['Llanowar Augur', 'Urso', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const ativa = (s, la) => legais(s, 0, a => a.t === 'activate' && a.oid === la);

test('LT123 · Llanowar Augur joga pelo leitor aprovado', () => {
  assert.equal(S.coverage(C['Llanowar Augur']).level, 'completo'); assert.equal(S.APROVADAS['Llanowar Augur'].leva, 'M-457');
});

test('LT123 · só na sua manutenção: não na principal, não na manutenção do oponente; na sua, +3/+3 e atropelar', () => {
  let s = mesa(), la, u; [s, la] = poe(s, 0, 'Llanowar Augur'); [s, u] = poe(s, 0, 'Urso');
  assert.equal(ativa(s, la).length, 0, 'principal');
  assert.throws(() => E.apply(s, { t: 'activate', p: 0, oid: la, index: 0, targets: [{ oid: u }] }));
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'upkeep' && x.turn.priority === 0, 400);
  assert.equal(ativa(s, la).length, 0, 'manutenção do oponente');
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'upkeep' && x.turn.priority === 0, 400);
  const a = ativa(s, la).filter(x => x.targets && x.targets[0].oid === u); assert.ok(a.length > 0, 'na sua manutenção');
  s = passaAte(act(s, a[0]), x => !x.stack.length && !x.pending, 40);
  assert.equal(s.objects[la].zone, 'graveyard'); assert.equal(E.stats(s, s.objects[u]).power, 5); assert.ok(E.hasKeyword(s, s.objects[u], 'trample'));
});
