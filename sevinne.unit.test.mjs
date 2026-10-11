// M-271 · cópia de mágica na resolução (707.10, "you may copy this spell and may choose a new target for the copy") quando a mágica foi
// conjurada de um cemitério; lampejo do passado. Carta: Sevinne's Reclamation (texto oficial em .listas/oficiais-commander.json, 05/10/2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, mesa, comMana, tudo } from './cmd.mjs';
import { S, T } from './listas.mjs';

function prepara(zona) {
  let s = mesa(["Sevinne's Reclamation", 'Thraben Inspector', 'Faerie Seer'], []), sv, ins, seer;
  [s, sv] = poe(s, 0, "Sevinne's Reclamation", zona); [s, ins] = poe(s, 0, 'Thraben Inspector', 'graveyard'); [s, seer] = poe(s, 0, 'Faerie Seer', 'graveyard');
  s = comMana(s, 'WWWWW');
  return { s, sv, ins, seer };
}
/** Resolve tudo; a cópia mira `alvo` e a decisão "pode copiar" é respondida com `aceita`. */
function resolve(s, alvo, aceita) {
  for (let i = 0; i < 40 && (s.pending || s.stack.length || s.queued.length); i++) {
    const pd = s.pending;
    if (pd && pd.kind === 'pick_target') { const i2 = pd.options.findIndex(o => o.oid === alvo); s = act(s, { t: 'pick_target', p: pd.p, index: i2 >= 0 ? i2 : 0 }); continue; }
    if (pd && pd.kind === 'may_pay') { s = act(s, aceita ? legais(s, pd.p, a => a.t !== 'decline' && a.t !== 'concede')[0] : { t: 'decline', p: pd.p }); continue; }
    // CR2f.3 · "you may copy": a decisão vem antes de a cópia ir à pilha (Copiar / Não copiar); antes era perguntada ao resolver a cópia
    if (pd && pd.kind === 'choose_mode') { s = act(s, { t: 'choose_mode', p: pd.p, index: aceita ? 0 : 1 }); continue; }
    s = pd ? act(s, legais(s, pd.p)[0]) : act(s, { t: 'pass', p: s.turn.priority });
  }
  return s;
}

test('M-271 · Sevinne\'s Reclamation da mão: devolve o alvo e não copia (não foi conjurada de um cemitério)', () => {
  let { s, sv, ins, seer } = prepara('hand');
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === sv && a.targets[0].oid === ins)[0]);
  s = resolve(s, seer, true);
  assert.equal(s.objects[ins].zone, 'battlefield'); assert.equal(s.objects[seer].zone, 'graveyard', 'sem cópia');
  assert.equal(s.objects[sv].zone, 'graveyard');
});

test('M-271 · Sevinne\'s Reclamation pelo lampejo do passado: devolve o alvo e pode copiar, com alvo novo; recusar não copia', () => {
  let { s, sv, ins, seer } = prepara('graveyard');
  const fb = legais(s, 0, a => a.t === 'cast' && a.oid === sv && a.flashback && a.targets[0].oid === ins)[0];
  assert.ok(fb, 'lampejo do passado {4}{W}');
  const x = resolve(act(s, fb), seer, true);
  assert.equal(x.objects[ins].zone, 'battlefield'); assert.equal(x.objects[seer].zone, 'battlefield', 'a cópia devolveu a Faerie Seer');
  assert.equal(x.objects[sv].zone, 'exile', 'lampejo do passado: exilada');
  const y = resolve(act(s, fb), seer, false);
  assert.equal(y.objects[ins].zone, 'battlefield'); assert.equal(y.objects[seer].zone, 'graveyard', 'recusou a cópia');
  assert.equal(S.SCRIPTS["Sevinne's Reclamation"].covers, undefined);
  assert.equal(T.descreveEfeitos([S.SCRIPTS["Sevinne's Reclamation"].effects[1]]), 'se foi conjurada de um cemitério, pode copiar esta mágica (a cópia escolhe um alvo novo)');
});
