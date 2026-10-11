// M-273 · mana com efeito ao ser gasta (106.12): Path of Ancestry — "{T}: Add one mana of any color in your commander's color identity.
// When that mana is spent to cast a creature spell that shares a creature type with your commander, scry 1." (texto oficial em
// .listas/oficiais-commander.json, 05/10/2026; segunda fonte, Oracle do Forge, 10/10/2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, mesa, comMana, tudo, passaAte } from './cmd.mjs';
import { S } from './listas.mjs';

/** Comandante Human Soldier (Thraben Inspector na zona de comando), identidade W/U, Path desvirada, Inspector e Seer na mão. */
function prepara() {
  let s = mesa(['Path of Ancestry', 'Thraben Inspector', 'Faerie Seer'], []), path, cmd, ins, seer;
  [s, path] = poe(s, 0, 'Path of Ancestry'); [s, cmd] = poe(s, 0, 'Thraben Inspector', 'command'); [s, ins] = poe(s, 0, 'Thraben Inspector', 'hand'); [s, seer] = poe(s, 0, 'Faerie Seer', 'hand');
  s = J(s); s.objects[cmd].commander = true; s.players[0].identity = ['W', 'U']; s.manaCheck = true;
  for (const oid of s.zones[0].battlefield) if (oid !== path && /Land/.test(s.facts[s.objects[oid].name].typeText || '')) s.objects[oid].tapped = true;
  return { s, path, ins, seer };
}
const gatilhos = s => [...s.queued, ...s.stack.map(o => s.objects[o] || {})].filter(x => x.when === 'mana-gasta' || x.name === 'Path of Ancestry').length;

test('M-273 · Path of Ancestry: a mana dela gasta numa criatura que compartilha tipo com o comandante dispara a vidência 1', () => {
  let { s, path, ins } = prepara();
  assert.ok(J(E.productions(s, s.objects[path])).some(o => o.includes('W')) && J(E.productions(s, s.objects[path])).some(o => o.includes('U')), 'qualquer cor da identidade');
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === ins)[0]);
  assert.equal(s.objects[path].tapped, true, 'o pagamento automático usou a Path');
  assert.equal(gatilhos(s), 1, 'Inspector é Human Soldier, como o comandante: dispara');
  for (let i = 0; i < 6 && !(s.pending && s.pending.kind === 'pick'); i++) s = act(s, { t: 'pass', p: s.turn.priority });
  assert.equal(s.pending.label, 'scry', 'vidência 1 antes de a criatura resolver'); assert.ok(s.stack.includes(ins), 'a criatura ainda está na pilha');
});

test('M-273 · Path of Ancestry: criatura sem tipo em comum não dispara; mana dela gasta em outra coisa só some', () => {
  let { s, path, seer } = prepara();
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === seer)[0]);
  assert.equal(s.objects[path].tapped, true); assert.equal(gatilhos(s), 0, 'Faerie Wizard não compartilha tipo com Human Soldier');
  assert.equal((s.players[0].manaMarcada || []).length, 0, 'a mana foi gasta');
});

test('M-273 · Path of Ancestry: com mana igual de outra fonte na reserva, a marcada é gasta por último no que não dispara; a marca some quando a reserva esvazia', () => {
  let { s, path, ins, seer } = prepara();
  s = comMana(s, 'U'); // uma {U} sem marca
  s = act(s, { t: 'tap_mana', p: 0, oid: path, option: J(E.productions(s, s.objects[path])).findIndex(o => o.includes('U')) });
  assert.equal((s.players[0].manaMarcada || []).length, 1, 'a Path gerou uma mana marcada');
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === seer)[0]);
  assert.equal(gatilhos(s), 0); assert.equal((s.players[0].manaMarcada || []).length, 1, 'a Seer usou a {U} sem marca');
  const passo = s.turn.step; const y = passaAte(tudo(s), z => z.turn.step !== passo); // a Seer entra e faz a vidência dela antes assert.equal(y.players[0].manaMarcada, undefined, 'reserva vazia no passo seguinte (500.4): a marca também some');
  assert.ok(S.validateScript({ name: 'T', entersTapped: true, aoGastarMana: { effects: [] }, example: { action: 'etb', target: 'none', expect: { tappedOnEntry: true } } }).some(e => /ao gastar a mana/.test(e)));
});
