// M-436 · LT102 · "Whenever you cycle another card, …" (gatilho novo other-cycled; 702.29): Drannith Healer ("you gain 1 life") e Drannith Stinger
// ("this creature deals 1 damage to each opponent"). Texto da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json), caminho de produção (APROVADAS).
// Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, valorDeMana, S, T } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Drannith Healer', 'Drannith Stinger'];
const C = {}; for (const n of NOMES) { const c = OF.find(x => x.name === n); C[n] = { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: ['Cycling'], oracle_text: c.oracle_text, colors: [...new Set(c.mana_cost.match(/[WUBRG]/g))], power: c.power, toughness: c.toughness }; }
C.Plains = { name: 'Plains', type_line: 'Basic Land — Plains', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {W}.)', colors: [] };
function mesa(seed = 45) {
  const b = ns => ns.map(name => ({ name, qty: name === 'Plains' ? 20 : 6, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Plains']) }, { name: 'B', deck: b([...NOMES, 'Plains']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => { for (let i = 0; i < 60; i++) { if (s.pending && s.pending.kind !== 'priority') { s = act(s, legais(s, s.pending.p)[0]); continue; } if (s.stack.length) { s = passaAte(s, x => !x.stack.length || (!!x.pending && x.pending.kind !== 'priority'), 40); continue; }
  if (s.queued && s.queued.length) { const p = s.turn.priority, f = s.zones[p].battlefield.find(o => s.objects[o].name === 'Plains' && !s.objects[o].tapped); s = act(s, { t: 'tap_mana', p, oid: f, option: 0 }); continue; } return s; } return s; };

test('LT102 · as duas jogam pelo leitor aprovado', () => {
  for (const n of NOMES) { assert.equal(S.coverage(C[n]).level, 'completo', n); assert.equal(S.APROVADAS[n].leva, 'M-436'); }
});

test('LT102 · você cicla outra carta: Healer dá 1 de vida e Stinger 1 de dano a cada oponente; a ciclada compra 1', () => {
  let s = mesa(), h, st, outra; [s, h] = poe(s, 0, 'Drannith Healer'); [s, st] = poe(s, 0, 'Drannith Stinger'); [s, outra] = poe(s, 0, 'Drannith Healer', 'hand'); for (let i = 0; i < 3; i++) [s] = poe(s, 0, 'Plains');
  const mao = s.zones[0].hand.length; const t = resolve(act(s, legais(s, 0, a => a.t === 'cycle' && a.oid === outra)[0]));
  assert.equal(t.objects[outra].zone, 'graveyard'); assert.equal(t.zones[0].hand.length, mao); assert.equal(t.players[0].life, 21); assert.equal(t.players[1].life, 19);
});

test('LT102 · o oponente ciclar não dispara as suas; a da mão do oponente não é "sua"', () => {
  let s = mesa(), h, oc; [s, h] = poe(s, 0, 'Drannith Healer'); [s, oc] = poe(s, 1, 'Drannith Stinger', 'hand'); for (let i = 0; i < 2; i++) [s] = poe(s, 1, 'Plains');
  s = J(s); s.turn.priority = 1; const a = legais(s, 1, x => x.t === 'cycle' && x.oid === oc); assert.ok(a.length, 'o oponente cicla');
  const t = resolve(act(s, a[0])); assert.equal(t.players[0].life, 20); assert.equal(t.players[1].life, 20);
});

test('LT102 · o registro diz "quando você cicla outra carta"', () => {
  const s = mesa(); const w = s.facts['Drannith Healer'].script.abilities[0].when;
  assert.match(T.describe(s, { t: 'pass', p: 0 }, [{ kind: 'trigger', name: 'Drannith Healer', when: w, oid: 1 }], s).join(' '), /quando você cicla outra carta/);
});
