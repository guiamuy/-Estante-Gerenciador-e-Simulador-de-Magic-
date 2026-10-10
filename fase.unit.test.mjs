// M-261 · fase (702.26): Slip Out the Back ("Put a +1/+1 counter on target creature. It phases out.", texto oficial em
// .listas/oficiais-commander.json, 05/10/2026; segunda fonte, Oracle do Forge, 10/10/2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, mesa, comMana, tudo, passaAte } from './cmd.mjs';

test('M-261 · Slip Out the Back: a criatura recebe o marcador e sai de fase — não é alvo, não morre pelo efeito que vem depois, fica fora do combate, e volta no próximo desvirar de quem a controla', () => {
  let s = mesa(['Slip Out the Back', 'Thraben Inspector', 'Rancor'], ['Lightning Bolt']), sl, ins, ran, bolt;
  [s, sl] = poe(s, 0, 'Slip Out the Back', 'hand'); [s, ins] = poe(s, 0, 'Thraben Inspector'); [s, ran] = poe(s, 0, 'Rancor'); [s, bolt] = poe(s, 1, 'Lightning Bolt', 'hand');
  s = J(s); s.objects[ran].attachedTo = ins; s.objects[ran].anexadaEm = 900;
  // no turno do oponente, ele conjura o raio no Inspector; em resposta, Slip Out the Back
  s = passaAte(s, z => z.turn.active === 1 && z.turn.step === 'main1' && !z.stack.length && !z.pending);
  s = comMana(s, 'R', 1); s = comMana(s, 'U', 0);
  s = act(s, legais(s, 1, a => a.t === 'cast' && a.oid === bolt && a.targets[0].oid === ins)[0]);
  s = act(s, { t: 'pass', p: 1 });
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === sl && a.targets[0].oid === ins)[0]);
  s = tudo(s);
  assert.equal(s.objects[ins].counters.p1p1, 1, 'recebeu o marcador');
  assert.equal(s.objects[ins].zone, 'battlefield', 'continua no campo (não mudou de zona)'); assert.equal(s.objects[ins].phasedOut, true);
  assert.equal(s.objects[ran].phasedOut, true, 'a Aura anexada sai de fase junto');
  assert.equal(s.objects[ins].damage, 0, 'o raio perdeu o alvo');
  // não é alvo enquanto fora de fase
  const x = comMana(s, 'R', 1); assert.equal(legais(x, 1, a => a.t === 'cast' && (a.targets || []).some(t => t.oid === ins)).length, 0);
  // segue fora até o desvirar de quem a controla
  let y = passaAte(s, z => z.turn.active === 0 && z.turn.step === 'upkeep');
  assert.equal(y.objects[ins].phasedOut, undefined, 'entrou em fase'); assert.equal(y.objects[ran].phasedOut, undefined, 'a Aura também');
  assert.equal(y.objects[ran].attachedTo, ins, 'continua anexada'); assert.equal(y.objects[ins].counters.p1p1, 1, 'marcadores ficam');
});
