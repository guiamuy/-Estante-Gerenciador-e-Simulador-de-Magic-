// M-259 · redução de custo que depende do alvo (601.2f): Killian, Ink Duelist ("Spells you cast that target a creature cost {2} less to
// cast.", texto oficial em .listas/oficiais-commander.json, 05/10/2026; segunda fonte, Oracle do Forge, 10/10/2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, mesa, comMana, tudo } from './cmd.mjs';

test('M-259 · Killian: mágica que mira criatura custa {2} a menos (só o genérico); mirando jogador ou sem alvo, custo cheio; o oponente não ganha a redução', () => {
  let s = mesa(['Killian, Ink Duelist', 'Journey to Nowhere', 'Lightning Bolt', 'Rancor', 'Thraben Inspector'], ['Faerie Seer', 'Lightning Bolt']), k, jn, bolt, ins, seer;
  [s, k] = poe(s, 0, 'Killian, Ink Duelist'); [s, jn] = poe(s, 0, 'Journey to Nowhere', 'hand'); [s, ins] = poe(s, 0, 'Thraben Inspector'); [s, seer] = poe(s, 1, 'Faerie Seer');
  // Journey to Nowhere ({1}{W}) entra e mira uma criatura no gatilho, não na conjuração: sem redução (não é mágica que mira)
  let x = comMana(s, 'W');
  assert.equal(legais(x, 0, a => a.t === 'cast' && a.oid === jn).length, 0, 'Journey não mira ao ser conjurada: custo cheio, falta {1}');
  // Rancor ({G}, Aura: "Enchant creature" mira) — o genérico é zero: nada a reduzir, custa {G}
  let r; [s, r] = poe(s, 0, 'Rancor', 'hand');
  x = comMana(s, 'G'); assert.ok(legais(x, 0, a => a.t === 'cast' && a.oid === r).length > 0);
  // mágica com genérico que mira criatura: usar uma carta sintética {2}{B} "destroy target creature"
  x = J(s); x.facts['Teste Morte'] = E.cardFacts({ name: 'Teste Morte', type_line: 'Instant', mana_cost: '{2}{B}', oracle_text: '', keywords: [], cmc: 3 });
  x.facts['Teste Morte'].script = { name: 'Teste Morte', effects: [{ do: 'destroy', target: 'creature' }], abilities: [] };
  x.objects.tm = { oid: 'tm', name: 'Teste Morte', owner: 0, controller: 0, zone: 'hand', tapped: false, sick: false, damage: 0, counters: {} }; x.zones[0].hand.push('tm');
  const comB = comMana(x, 'B');
  const ofs = legais(comB, 0, a => a.t === 'cast' && a.oid === 'tm');
  assert.ok(ofs.length > 0, 'com Killian, {2}{B} vira {B}');
  const y = tudo(act(comB, ofs.find(a => a.targets[0].oid === seer)));
  assert.equal(y.objects[seer].zone, 'graveyard'); assert.equal(y.players[0].pool.B, 0, 'pagou só {B}');
  const semK = J(x); E.moveObject(semK, k, 'graveyard');
  assert.equal(legais(comMana(semK, 'B'), 0, a => a.t === 'cast' && a.oid === 'tm').length, 0, 'sem Killian, falta {2}');
  // mágica que mira jogador não recebe
  const z = J(s); z.facts['Teste Raio'] = E.cardFacts({ name: 'Teste Raio', type_line: 'Instant', mana_cost: '{2}{R}', oracle_text: '', keywords: [], cmc: 3 });
  z.facts['Teste Raio'].script = { name: 'Teste Raio', effects: [{ do: 'damage', amount: 3, target: 'any' }], abilities: [] };
  z.objects.tr = { oid: 'tr', name: 'Teste Raio', owner: 0, controller: 0, zone: 'hand', tapped: false, sick: false, damage: 0, counters: {} }; z.zones[0].hand.push('tr');
  const ofR = legais(comMana(z, 'R'), 0, a => a.t === 'cast' && a.oid === 'tr');
  assert.ok(ofR.length > 0 && ofR.every(a => a.targets[0].oid != null && E.stats(z, z.objects[a.targets[0].oid])), 'com {R} só dá para mirar criatura (com a redução)');
  assert.ok(!ofR.some(a => a.targets[0].player != null), 'mirando jogador, custo cheio: com {R} não dá');
  assert.throws(() => act(comMana(z, 'R'), { t: 'cast', p: 0, oid: 'tr', targets: [{ player: 1 }] }));
});

test('M-259 · Killian e lampejo do passado: Rite of Oblivion pelo lampejo ({2}{W}{B}) mirando uma criatura custa {W}{B}; mirando outra permanente, custo cheio', () => {
  let s = mesa(['Killian, Ink Duelist', 'Rite of Oblivion', 'Thraben Inspector', 'Sol Ring'], ['Faerie Seer', 'Sol Ring']), k, r, ins, seer, ring;
  [s, k] = poe(s, 0, 'Killian, Ink Duelist'); [s, r] = poe(s, 0, 'Rite of Oblivion', 'graveyard'); [s, ins] = poe(s, 0, 'Thraben Inspector'); [s, seer] = poe(s, 1, 'Faerie Seer'); [s, ring] = poe(s, 1, 'Sol Ring');
  s = comMana(s, 'WB');
  const ofs = legais(s, 0, a => a.t === 'cast' && a.oid === r && a.flashback);
  assert.ok(ofs.length > 0 && ofs.every(a => /Creature/.test(s.facts[s.objects[a.targets[0].oid].name].typeText || '')), 'com {W}{B}, só mirando criatura');
  assert.ok(!ofs.some(a => a.targets[0].oid === ring), 'o Sol Ring não (custo cheio)');
  const x = tudo(act(s, ofs.find(a => a.targets[0].oid === seer)));
  assert.equal(x.objects[seer].zone, 'exile'); assert.equal(x.objects[r].zone, 'exile', 'lampejo: exilada depois');
  assert.equal(x.players[0].pool.W + x.players[0].pool.B, 0, 'pagou {W}{B}');
  const y = comMana(s, 'CC'); assert.ok(legais(y, 0, a => a.t === 'cast' && a.oid === r && a.flashback && a.targets[0].oid === ring).length > 0, 'com {2}{W}{B}, também o Sol Ring');
});
