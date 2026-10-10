// M-250 · "desvire até N terrenos" com escolha na resolução (Frantic Search) e habilidade de mana com custo de remover marcador e
// "se não houver mais, sacrifique" (Saprazzan Skerry). Texto oficial em .listas/oficiais-commander.json (05/10/2026; segunda fonte,
// Oracle do Forge, 10/10/2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, mesa, comMana, tudo } from './cmd.mjs';
import { S, T } from './listas.mjs';

test('M-250 · Frantic Search: "Draw two cards, then discard two cards. Untap up to three lands." — quem conjura escolhe até três terrenos virados de qualquer jogador; aceita zero', () => {
  let s = mesa(['Frantic Search'], []), f; [s, f] = poe(s, 0, 'Frantic Search', 'hand');
  const meus = [], deles = [];
  for (let i = 0; i < 4; i++) { let o; [s, o] = poe(s, 0, i % 2 ? 'Swamp' : 'Plains', 'battlefield', { tapped: true }); meus.push(o); }
  { let o; [s, o] = poe(s, 1, 'Island', 'battlefield', { tapped: true }); deles.push(o); }
  { let o; [s, o] = poe(s, 0, 'Plains'); meus.push(o); } // desvirado: não é oferecido
  s = comMana(s, 'UCC');
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === f)[0]);
  for (let i = 0; i < 10 && !(s.pending && s.pending.kind === 'pick' && s.pending.label === 'desvirar'); i++)
    s = s.pending ? act(s, legais(s, s.pending.p, a => a.t === 'discard')[0] || legais(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority });
  const pk = s.pending; assert.equal(pk.label, 'desvirar'); assert.equal(pk.min, 0); assert.equal(pk.max, 3);
  const virados = [0, 1].flatMap(p => s.zones[p].battlefield).filter(o => s.objects[o].tapped && /Land/.test(s.facts[s.objects[o].name].typeText || ''));
  assert.deepEqual(J(pk.from).sort(), J(virados).sort(), 'todos os terrenos virados, dos dois lados');
  assert.ok(deles.every(o => pk.from.includes(o)), 'inclusive o do oponente');
  assert.ok(pk.from.every(o => s.objects[o].tapped), 'desvirado não é oferecido');
  // escolhe dois seus e o do oponente (pode desvirar terreno de outro jogador)
  for (const oid of [meus[0], meus[1], deles[0]]) s = act(s, { t: 'pick', p: 0, oid });
  assert.equal(legais(s, 0, a => a.t === 'pick').length, 0, 'no máximo três');
  s = tudo(s.pending && s.pending.kind === 'pick' ? act(s, { t: 'pick_done', p: 0 }) : s); // no terceiro a escolha fecha sozinha
  assert.equal(s.objects[meus[0]].tapped, false); assert.equal(s.objects[meus[1]].tapped, false); assert.equal(s.objects[deles[0]].tapped, false);
  assert.equal(s.objects[meus[2]].tapped, true, 'o quarto continua virado');
  assert.equal(T.descreveEfeitos(S.SCRIPTS['Frantic Search'].effects), 'compra 2 cartas; descarta 2 cartas; desvira até 3 terrenos');
});

test('M-250 · Saprazzan Skerry: entra virada com dois marcadores de esgotamento; "{T}, Remove a depletion counter: Add {U}{U}. If there are no depletion counters on this land, sacrifice it."', () => {
  let s = mesa(['Saprazzan Skerry'], []), sk; [s, sk] = poe(s, 0, 'Saprazzan Skerry', 'hand');
  s = act(s, legais(s, 0, a => a.t === 'play_land' && a.oid === sk)[0]);
  assert.equal(s.objects[sk].tapped, true, 'entra virada'); assert.equal(s.objects[sk].counters.depletion, 2, 'com dois marcadores de esgotamento');
  assert.deepEqual(J(E.productions(s, s.objects[sk])), [], 'não é fonte de mana de graça: o pagamento automático não a vira sem tirar o marcador');
  s = J(s); s.objects[sk].tapped = false;
  const ativa = x => legais(x, 0, a => a.t === 'activate' && a.oid === sk);
  s = act(s, ativa(s)[0]);
  assert.equal(s.players[0].pool.U, 2, '{U}{U} na hora, sem pilha'); assert.equal(s.stack.length, 0);
  assert.equal(s.objects[sk].counters.depletion, 1); assert.equal(s.objects[sk].zone, 'battlefield', 'ainda tem marcador: fica');
  s = J(s); s.objects[sk].tapped = false; s.players[0].pool.U = 0;
  s = act(s, ativa(s)[0]);
  assert.equal(s.players[0].pool.U, 2); assert.equal(s.objects[sk].zone, 'graveyard', 'sem marcadores: sacrificada');
  assert.ok(J(S.validateScript({ name: 'T', abilities: [{ kind: 'activated', cost: { tap: true }, semMarcadorSacrifica: 'depletion', effects: [{ do: 'add_mana', symbols: ['U'] }] }], example: { action: 'etb', target: 'none', expect: { attached: false } } })).some(e => /sem marcador/.test(e)));
});
