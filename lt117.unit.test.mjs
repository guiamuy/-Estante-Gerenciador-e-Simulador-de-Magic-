// M-435 · LT101 · Impact Tremors ("Whenever a creature you control enters, this enchantment deals 1 damage to each opponent."). Texto da Scryfall de
// 17/10/2026 UTC (.listas/oficiais-revisadas.json), caminho de produção (APROVADAS). Abertura nova "Whenever a creature you control enters" (fonte que não é
// criatura; numa criatura, ou com "it" no efeito, fica sem leitura). Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S, T } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const c0 = OF.find(x => x.name === 'Impact Tremors');
const C = { 'Impact Tremors': { name: c0.name, type_line: c0.type_line, mana_cost: c0.mana_cost, cmc: 2, keywords: [], oracle_text: c0.oracle_text, colors: ['R'] },
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Pedra: { name: 'Pedra', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] },
  Forest: { name: 'Forest', type_line: 'Basic Land — Forest', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {G}.)', colors: [] } };
function mesa(seed = 44) {
  const b = ns => ns.map(name => ({ name, qty: 10, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b(['Impact Tremors', 'Urso', 'Pedra', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => { for (let i = 0; i < 60; i++) { if (s.pending && s.pending.kind !== 'priority') { s = act(s, legais(s, s.pending.p)[0]); continue; } if (s.stack.length) { s = passaAte(s, x => !x.stack.length || (!!x.pending && x.pending.kind !== 'priority'), 40); continue; }
  if (s.queued && s.queued.length) { const f = s.zones[0].battlefield.find(o => s.objects[o].name === 'Forest' && !s.objects[o].tapped); s = act(s, { t: 'tap_mana', p: 0, oid: f, option: 0 }); continue; } return s; } return s; };

test('LT101 · Impact Tremors joga pelo leitor aprovado', () => {
  assert.equal(S.coverage(C['Impact Tremors']).level, 'completo'); assert.equal(S.APROVADAS['Impact Tremors'].leva, 'M-435');
});

test('LT101 · criatura sua entra: 1 de dano em cada oponente; artefato não; criatura do oponente não', () => {
  let s = mesa(), it, u, pe; [s, it] = poe(s, 0, 'Impact Tremors'); [s, u] = poe(s, 0, 'Urso', 'hand'); [s, pe] = poe(s, 0, 'Pedra', 'hand'); for (let i = 0; i < 4; i++) [s] = poe(s, 0, 'Forest');
  let t = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === u)[0])); assert.equal(t.players[1].life, 19); assert.equal(t.players[0].life, 20);
  t = resolve(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === pe)[0])); assert.equal(t.players[1].life, 19, 'artefato não é criatura');
  let g = J(t), uo; [g, uo] = poe(g, 1, 'Urso'); g = resolve(g); assert.equal(g.players[1].life, 19, 'criatura do oponente não');
});

test('LT101 · o leitor não lê a abertura numa criatura (ela mesma também dispararia) nem com "it" no efeito (a que entrou)', () => {
  const ler = (tipo, txt) => S.leitura({ name: 'Teste', type_line: tipo, mana_cost: '{1}', oracle_text: txt, keywords: [], colors: [] });
  const cr = ler('Creature — Test', 'Whenever a creature you control enters, Teste deals 1 damage to each opponent.'); assert.ok(!cr || !cr.completa);
  const it = ler('Enchantment', 'Whenever a creature you control enters, it deals damage equal to its power to any target.'); assert.ok(!it || !it.completa);
});
