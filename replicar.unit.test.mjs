// M-265 · replicar (702.56): custo adicional pago qualquer número de vezes; "quando você conjura esta mágica, copie-a uma vez para
// cada vez que pagou" — as cópias vão para a pilha por cima da original, cada uma com alvo próprio, e existem mesmo se a original for
// anulada (ruling). Cartas: Lose Focus e Stream of Thought (texto oficial em .listas/oficiais-commander.json, 05/10/2026; segunda
// fonte, Oracle do Forge, 10/10/2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, mesa, comMana, tudo } from './cmd.mjs';
import { S, T } from './listas.mjs';

test('M-265 · Lose Focus: "Counter target spell unless its controller pays {2}." — o custo para salvar é {2} (o script cobrava {1})', () => {
  let s = mesa(['Lose Focus'], ['Lightning Bolt']), lf, bolt;
  [s, lf] = poe(s, 0, 'Lose Focus', 'hand'); [s, bolt] = poe(s, 1, 'Lightning Bolt', 'hand');
  assert.deepEqual(J(S.SCRIPTS['Lose Focus'].effects[0].unless), { mana: '{2}' });
  assert.equal(S.SCRIPTS['Lose Focus'].covers, undefined, 'deixa de ser parcial');
  // o oponente conjura o raio com {R}{1} sobrando: pode pagar {1}, mas não {2}
  s = comMana(s, 'R', 1); s = J(s); s.players[1].pool.C = 1; s = act(s, { t: 'pass', p: 0 });
  s = act(s, legais(s, 1, a => a.t === 'cast' && a.oid === bolt && a.targets[0].player === 0)[0]); s = act(s, { t: 'pass', p: 1 });
  s = comMana(s, 'U', 0); s = J(s); s.players[0].pool.C = 1;
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === lf && !a.kick && (a.targets || []).some(x => x.oid === bolt))[0]);
  s = tudo(s);
  assert.equal(s.objects[bolt].zone, 'graveyard'); assert.equal(s.players[0].life, 20, 'só {1} sobrando: não paga {2}, o raio é anulado');
});

test('M-265 · replicar: a mesa oferece pagar o custo de replicar 0, 1, 2… vezes (o que a mana pagar); cada pagamento é uma cópia com alvo próprio, antes da original', () => {
  let s = mesa(['Stream of Thought'], []), st;
  [s, st] = poe(s, 0, 'Stream of Thought', 'hand');
  s = comMana(s, 'UUUUUUUUU'); // {U} + 2× {2}{U}{U} = 9
  const ofertas = legais(s, 0, a => a.t === 'cast' && a.oid === st);
  const vezes = [...new Set(ofertas.map(a => a.kick || 0))].sort();
  assert.deepEqual(vezes, [0, 1, 2], 'até duas vezes com nove manas');
  assert.ok(ofertas.some(a => (a.targets || []).some(x => x.player === 0)) && ofertas.some(a => (a.targets || []).some(x => x.player === 1)), '"Target player": você ou o oponente (o script só mirava o oponente)');
  const libOp = s.zones[1].library.length, libEu = s.zones[0].library.length;
  const r = E.apply(s, ofertas.find(a => a.kick === 2 && a.targets[0].player === 1)); s = r.state;
  const copias = [...s.queued, ...(s.pending && s.pending.trigger ? [s.pending.trigger] : [])];
  assert.equal(copias.length, 2, 'duas cópias (a primeira já pede o alvo dela)'); assert.ok(copias.every(q => q.copia && q.when === 'replicar'));
  assert.equal(s.pending.kind, 'pick_target', '"you may choose new targets for the copies"'); assert.deepEqual(J(s.pending.options), [{ player: 0 }, { player: 1 }]);
  assert.ok(r.events.some(e => e.kind === 'replicar' && e.amount === 2));
  assert.equal(s.objects[st].kicked, undefined, 'replicar não é reforço: a mágica não fica "kicked"');
  assert.equal(s.players[0].pool.U || 0, 0, 'pagou as nove');
  // resolve tudo: três vezes "o jogador alvo põe quatro no cemitério; você embaralha até quatro do seu cemitério"
  for (let i = 0; i < 40 && (s.pending || s.stack.length || s.queued.length); i++) {
    if (s.pending && s.pending.kind === 'pick_target') { s = act(s, legais(s, s.pending.p, a => a.t === 'pick_target')[0]); continue; }
    if (s.pending && s.pending.kind === 'pick') { s = act(s, { t: 'pick_done', p: s.pending.p }); continue; } // não embaralha nada
    s = s.pending ? act(s, legais(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority });
  }
  const moidas = libOp - s.zones[1].library.length + (libEu - s.zones[0].library.length);
  assert.equal(moidas, 12, 'três resoluções, quatro cartas cada (as cópias podem mirar outro jogador)');
  assert.equal(s.objects[st].zone, 'graveyard');
});

test('M-265 · Stream of Thought: "You shuffle up to four cards from your graveyard into your library." — escolha na resolução, aceita zero, a própria mágica não entra', () => {
  let s = mesa(['Stream of Thought', 'Faerie Seer', 'Lightning Bolt'], []), st;
  [s, st] = poe(s, 0, 'Stream of Thought', 'hand');
  const cem = []; for (const n of ['Faerie Seer', 'Lightning Bolt', 'Faerie Seer', 'Lightning Bolt', 'Faerie Seer']) { let o; [s, o] = poe(s, 0, n, 'graveyard'); cem.push(o); }
  s = comMana(s, 'U');
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === st && !a.kick && a.targets[0].player === 1)[0]);
  for (let i = 0; i < 10 && !(s.pending && s.pending.kind === 'pick'); i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const pk = s.pending; assert.equal(pk.label, 'embaralhar no grimório'); assert.equal(pk.min, 0); assert.equal(pk.max, 4);
  assert.deepEqual(J(pk.from).sort(), J(cem).sort(), 'só o seu cemitério (o do oponente acabou de receber quatro); a mágica ainda está na pilha');
  assert.equal(s.zones[1].graveyard.length, 4, 'o alvo pôs quatro no cemitério');
  const lib = s.zones[0].library.length;
  for (const oid of cem.slice(0, 3)) s = act(s, { t: 'pick', p: 0, oid });
  s = tudo(act(s, { t: 'pick_done', p: 0 }));
  assert.equal(s.zones[0].library.length, lib + 3, 'três voltaram ao grimório'); assert.ok(cem.slice(0, 3).every(o => s.objects[o].zone === 'library'));
  assert.equal(s.objects[cem[3]].zone, 'graveyard'); assert.equal(s.objects[st].zone, 'graveyard', 'a mágica vai para o cemitério depois');
  assert.equal(T.descreveEfeitos(S.SCRIPTS['Stream of Thought'].effects), 'põe 4 cartas do grimório no cemitério; embaralha até 4 cartas do seu cemitério no grimório');
  assert.ok(J(S.validateScript({ name: 'T', replicate: 'U', effects: [{ do: 'draw', amount: 1 }], example: { target: 'none', expect: { handDelta: 1 } } })).some(e => /replicar precisa/.test(e)));
  assert.ok(J(S.validateScript({ name: 'T', replicate: '{U}', kicker: { mana: '{1}' }, effects: [{ do: 'draw', amount: 1 }], example: { target: 'none', expect: { handDelta: 1 } } })).some(e => /replicar e reforço/.test(e)));
});
