// Trilha keywords (CR4) · regras de palavra-chave com cartas reais (texto oficial em .listas/oficiais*.json, via cmd.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, mesa } from './cmd.mjs';

/* ---------------- K-1 · 702.73a metamorfo com Path of Ancestry (106.12) ---------------- */
// Path of Ancestry: "When that mana is spent to cast a creature spell that shares a creature type with your commander, scry 1."
function comPath(nomes, comandante, identidade) {
  let s = mesa(['Path of Ancestry', comandante, ...nomes], []), path, cmd; const mao = {};
  [s, path] = poe(s, 0, 'Path of Ancestry'); [s, cmd] = poe(s, 0, comandante, 'command'); [s] = poe(s, 0, 'Plains');
  for (const n of nomes) { let o; [s, o] = poe(s, 0, n, 'hand'); mao[n] = o; }
  s = J(s); s.objects[cmd].commander = true; s.players[0].identity = identidade; s.manaCheck = true;
  const terras = s.zones[0].battlefield.filter(oid => oid !== path && /Land/.test(s.facts[s.objects[oid].name].typeText || ''));
  terras.forEach((oid, i) => { s.objects[oid].tapped = i > 0; }); // uma Planície desvirada para o genérico; a cor só sai da Path
  return { s, path, mao };
}
const gatilhos = s => [...s.queued, ...s.stack.map(o => s.objects[o] || {})].filter(x => x.when === 'mana-gasta' || x.name === 'Path of Ancestry').length;

test('CR 702.73a · metamorfo na pilha compartilha tipo com o comandante (Masked Vandal com a mana da Path of Ancestry dispara a vidência)', () => {
  let { s, path, mao } = comPath(['Masked Vandal'], 'Thraben Inspector', ['W', 'U', 'G']);
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === mao['Masked Vandal'])[0]);
  assert.equal(s.objects[path].tapped, true, 'a Path pagou o {G}');
  assert.equal(gatilhos(s), 1, 'o metamorfo é Human e Soldier, como o comandante');
});

test('CR 702.73a · comandante com metamorfo compartilha tipo com qualquer criatura (Faerie Seer com a mana da Path dispara)', () => {
  let { s, path, mao } = comPath(['Faerie Seer'], 'Masked Vandal', ['W', 'U', 'G']);
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === mao['Faerie Seer'])[0]);
  assert.equal(s.objects[path].tapped, true, 'a Path pagou o {U}');
  assert.equal(gatilhos(s), 1, 'o comandante é todo tipo de criatura, inclusive Faerie');
});
