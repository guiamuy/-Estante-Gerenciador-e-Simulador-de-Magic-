// CR2f.3 · a cópia de uma mágica é uma mágica na pilha (707.10): pode ser alvo de "anule a mágica alvo", leva as escolhas da original
// (modo, X, reforço, encaixe), não é conjurada, e fora da pilha deixa de existir (707.10a, 704.5e). Vale para tempestade, replicar e
// "pode copiar esta mágica".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, mesa, comMana, tudo } from './cmd.mjs';

test('CR 707.10 · replicar: a cópia é mágica na pilha, com o nome da original; resolvida, deixa de existir (não vai para o cemitério)', () => {
  let s = mesa(['Stream of Thought'], []), st; [s, st] = poe(s, 0, 'Stream of Thought', 'hand');
  s = comMana(s, 'UUUUU');
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === st && a.kick === 1 && a.targets[0].player === 1)[0]);
  if (s.pending && s.pending.kind === 'pick_target') s = act(s, { t: 'pick_target', p: 0, index: s.pending.options.findIndex(o => o.player === 1) });
  const copia = s.stack.map(o => s.objects[o]).find(o => o.copiaDeMagia);
  assert.ok(copia, 'a cópia está na pilha como mágica'); assert.equal(copia.name, 'Stream of Thought'); assert.ok(!copia.ability, 'não é habilidade');
  assert.ok(!s.zones[0].graveyard.includes(copia.oid));
  const antes = s.spellsThisTurn;
  s = tudo(s, y => (y.pending.kind === 'pick' ? { t: 'pick_done', p: y.pending.p } : legais(y, y.pending.p)[0]));
  assert.equal(s.objects[copia.oid], undefined, 'resolvida, deixou de existir'); assert.equal(s.objects[st].zone, 'graveyard', 'a original vai para o cemitério');
  assert.equal(s.spellsThisTurn, antes, 'a cópia não foi conjurada (não conta como mágica conjurada)');
});

test('CR 707.10 · a cópia pode ser anulada como qualquer mágica, e anulada deixa de existir; leva o X pago da original', () => {
  let s = mesa(['Lightning Bolt'], []); s = J(s);
  s.queued.push({ source: 'nenhum', name: 'Lightning Bolt', controller: 0, effects: [{ do: 'damage', amount: 3, target: 'any' }], when: 'storm', copia: true, copiaDeMagia: true, marcasMagia: { xPaid: 3 } });
  let r = E.apply(s, { t: 'pass', p: s.turn.priority }); s = r.state;
  if (s.pending && s.pending.kind === 'pick_target') s = act(s, { t: 'pick_target', p: 0, index: s.pending.options.findIndex(o => o.player === 1) });
  const c = s.stack.map(o => s.objects[o]).find(o => o && o.copiaDeMagia);
  assert.ok(c, 'a cópia entrou na pilha'); assert.equal(c.xPaid, 3, 'o X pago vem junto');
  const x = J(s); E.applyEffect(x, { oid: 'h', name: 'Teste', controller: 1, ability: true }, { do: 'counter', target: 'spell' }, { oid: c.oid }, []);
  assert.equal(x.objects[c.oid], undefined, 'anulada: deixou de existir'); assert.ok(!x.stack.includes(c.oid));
});
