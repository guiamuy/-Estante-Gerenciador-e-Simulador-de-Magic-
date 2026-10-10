// M-254 · infectar (702.90) concedido pela Aura: Phyresis ("Enchant creature · Enchanted creature has infect.", texto oficial em
// .listas/oficiais-commander.json, 05/10/2026; segunda fonte, Oracle do Forge, 10/10/2026). Dano de combate está no combat.audit (K12c);
// aqui, o dano de efeito causado pela criatura encantada e o caminho sem a Aura.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, poe, mesa } from './cmd.mjs';


test('M-254 · Phyresis: a criatura encantada tem infectar; o dano que ela causa vira −1/−1 numa criatura e veneno num jogador; sem a Aura, dano comum', () => {
  let s = mesa(['Phyresis', 'Thraben Inspector'], ['Faerie Seer']), ph, ins, seer;
  [s, ph] = poe(s, 0, 'Phyresis'); [s, ins] = poe(s, 0, 'Thraben Inspector'); [s, seer] = poe(s, 1, 'Faerie Seer');
  s = J(s); s.objects[ph].attachedTo = ins; s.objects[ph].anexadaEm = 900;
  assert.equal(E.hasKeyword(s, s.objects[ins], 'infect'), true);
  const x = J(s); E.applyEffect(x, x.objects[ins], { do: 'damage', amount: 1, target: 'creature' }, { oid: seer }, []);
  assert.equal(x.objects[seer].counters.m1m1, 1); assert.equal(x.objects[seer].damage, 0);
  const y = J(s); E.applyEffect(y, y.objects[ins], { do: 'damage', amount: 2, target: 'player' }, { player: 1 }, []);
  assert.equal(y.players[1].life, 20); assert.equal(y.players[1].poison, 2);
  const z = J(s); z.objects[ph].attachedTo = null; E.applyEffect(z, z.objects[ins], { do: 'damage', amount: 2, target: 'player' }, { player: 1 }, []);
  assert.equal(z.players[1].life, 18, 'sem a Aura, perde vida'); assert.equal(z.players[1].poison, undefined);
});
