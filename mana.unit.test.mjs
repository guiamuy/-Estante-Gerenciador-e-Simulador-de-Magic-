// Leva 124 · R2 (Rakdos Madness) · pagamento automático com duas cores, sobre a lista real e o texto oficial
// (.listas/decks.json e .listas/oficiais.json). Achado jogando a lista pela tela: Faithless Looting ({R}) virou dois
// Swamp e uma Mountain e deixou {B}{B} flutuando. `planTaps` devolvia a primeira solução da busca, que vira toda fonte
// anterior à que resolve. Só aparece com duas cores: as listas mono e os baralhos de teste não acusavam.
// Regra: 601.2g/h — o jogador paga o custo total; nada o obriga a ativar habilidade de mana além do necessário.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, jogo as jogoDaLista } from './listas.mjs';
const jogo = (seed = 1) => jogoDaLista({ lista: 'Pauper Rakdos Madness', seed });
const nomes = (s, plano) => J(plano).map(([oid]) => s.objects[oid].name).sort();

test('Leva 124 · pagamento automático não vira fonte além do necessário (três Mountain e um Swamp)', () => {
  let s = jogo(); const a = s.turn.active; let sw, m1, m2, m3;
  [s, sw] = poe(s, a, 'Swamp'); [s, m1] = poe(s, a, 'Mountain'); [s, m2] = poe(s, a, 'Mountain'); [s, m3] = poe(s, a, 'Mountain');
  assert.deepEqual(nomes(s, E.planTaps(s, a, E.parseCost('{B}'), 0)), ['Swamp'], '{B}: só o Swamp (antes: as três Mountain e o Swamp)');
  assert.deepEqual(nomes(s, E.planTaps(s, a, E.parseCost('{R}'), 0)), ['Mountain']);
  assert.deepEqual(nomes(s, E.planTaps(s, a, E.parseCost('{1}{B}'), 0)), ['Mountain', 'Swamp'], '{1}{B}: duas fontes, não quatro');
  assert.deepEqual(nomes(s, E.planTaps(s, a, E.parseCost('{B}{R}'), 0)), ['Mountain', 'Swamp']);
  assert.equal(E.planTaps(s, a, E.parseCost('{2}{R}'), 0).length, 3);
  assert.equal(E.planTaps(s, a, E.parseCost('{3}{R}'), 0).length, 4, 'quando precisa de todas, vira todas');
  assert.equal(E.planTaps(s, a, E.parseCost('{B}{B}'), 0), null, 'sem dois pretos, não paga');
  assert.deepEqual(J(E.planTaps(s, a, E.parseCost('{0}'), 0)), [], 'custo zero: nada vira');
  // conjurando de verdade: Vampire's Kiss custa {1}{B} — viram duas fontes e nada fica flutuando
  let vk; [s, vk] = poe(s, a, "Vampire's Kiss", 'hand');
  const t = act(s, E.legalActions(s, a).find(x => x.t === 'cast' && x.oid === vk));
  assert.equal(t.objects[sw].tapped, true, 'o Swamp paga o preto');
  assert.equal([m1, m2, m3].filter(o => t.objects[o].tapped).length, 1, 'uma Mountain paga o genérico; as outras duas ficam de pé');
  assert.equal(Object.values(J(t.players[a].pool)).reduce((x, y) => x + y, 0), 0, 'nenhuma mana flutuando');
});

test('Leva 124 · o plano guarda a fonte flexível: com Mountain e Jagged Barrens ({B} ou {R}), {R} vira a Mountain', () => {
  let s = jogo(3); const a = s.turn.active; let jb, mt, sw;
  [s, jb] = poe(s, a, 'Jagged Barrens'); [s, mt] = poe(s, a, 'Mountain');
  assert.deepEqual(J(E.planTaps(s, a, E.parseCost('{R}'), 0)).map(x => x[0]), [mt], '{R}: a Mountain, não o terreno de duas cores');
  assert.deepEqual(J(E.planTaps(s, a, E.parseCost('{B}'), 0)).map(x => x[0]), [jb], '{B}: só o Jagged Barrens serve');
  assert.equal(E.planTaps(s, a, E.parseCost('{B}{R}'), 0).length, 2);
  // com um Swamp a mais, {B} sai do Swamp e o terreno de duas cores continua de pé
  [s, sw] = poe(s, a, 'Swamp');
  assert.deepEqual(J(E.planTaps(s, a, E.parseCost('{B}'), 0)).map(x => x[0]), [sw]);
  assert.deepEqual(J(E.planTaps(s, a, E.parseCost('{1}{B}'), 0)).map(x => x[0]).sort(), [mt, sw].sort(), '{1}{B}: Swamp e Mountain; o flexível fica');
});

test('Leva 124 · mana que já está na reserva é usada antes de virar qualquer coisa', () => {
  let s = jogo(5); const a = s.turn.active; let m1, m2;
  [s, m1] = poe(s, a, 'Mountain'); [s, m2] = poe(s, a, 'Mountain');
  s = act(s, { t: 'tap_mana', p: a, oid: m1, option: 0 });
  assert.deepEqual(J(E.planTaps(s, a, E.parseCost('{R}'), 0)), [], 'a reserva paga: nenhum toque');
  assert.equal(E.planTaps(s, a, E.parseCost('{1}{R}'), 0).length, 1, 'falta um: um toque');
});
