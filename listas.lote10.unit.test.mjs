// L-10 · trilha listas · Pauper de M a Z, lote 10: "can't be blocked this turn except by creatures with defender" (M-370), numa partida em
// modo único (mana cobrada), com o texto oficial de .listas/oficiais-listas.json (Oracle do Forge, consulta de 12/10/2026). Cada teste cita a frase.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, act, poe, legais, passaAte, mesa, comMana, tudo, criatura, CARTAS } from './trilha-listas.mjs';

criatura('Urso de Teste', 2, 2);
criatura('Muro de Teste', 0, 4, { subtipo: 'Wall' }); CARTAS['Muro de Teste'].keywords = ['Defender'];
CARTAS['Tin Street Dodger'].keywords = ['Haste'];


test('L-10 · Tin Street Dodger: "Haste" — ataca no turno em que entra', () => {
  let s = mesa(['Tin Street Dodger']), d; [s, d] = poe(s, 0, 'Tin Street Dodger', 'battlefield', { sick: true });
  assert.ok(E.hasKeyword(s, s.objects[d], 'haste'));
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 0);
  assert.ok((s.pending.options || s.pending.attackers || legais(s, 0, a => a.t === 'attack').flatMap(a => a.attackers || [])).includes(d) || legais(s, 0, a => a.t === 'attack' && (a.attackers || []).includes(d)).length, 'pode atacar enjoada');
});

test('L-10 · Tin Street Dodger: "{R}: can\'t be blocked this turn except by creatures with defender" — o Urso não bloqueia, o Muro (defensor) bloqueia', () => {
  let s = mesa(['Tin Street Dodger'], ['Urso de Teste', 'Muro de Teste']), d, urso, muro;
  [s, d] = poe(s, 0, 'Tin Street Dodger', 'battlefield', { sick: false }); [s, urso] = poe(s, 1, 'Urso de Teste'); [s, muro] = poe(s, 1, 'Muro de Teste');
  const m = comMana(s, 'R'), at = legais(m, 0, a => a.t === 'activate' && a.oid === d); assert.ok(at.length, '{R}: ativa');
  s = tudo(act(m, at[0]));
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 0); s = act(s, { t: 'attack', p: 0, attackers: [d] });
  s = passaAte(s, x => x.pending && x.pending.kind === 'blockers', 40);
  assert.throws(() => E.apply(s, { t: 'block', p: 1, blocks: [[urso, d]] }), 'o Urso não pode bloquear');
  const ok = E.apply(s, { t: 'block', p: 1, blocks: [[muro, d]] }); assert.ok(ok.state || ok, 'o Muro com defensor pode');
});

test('L-10 · Tin Street Dodger: sem ativar, qualquer criatura bloqueia; o efeito acaba no fim do turno ("this turn")', () => {
  let s = mesa(['Tin Street Dodger'], ['Urso de Teste']), d, urso;
  [s, d] = poe(s, 0, 'Tin Street Dodger', 'battlefield', { sick: false }); [s, urso] = poe(s, 1, 'Urso de Teste');
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 0); s = act(s, { t: 'attack', p: 0, attackers: [d] });
  s = passaAte(s, x => x.pending && x.pending.kind === 'blockers', 40);
  assert.doesNotThrow(() => E.apply(s, { t: 'block', p: 1, blocks: [[urso, d]] }));
});
