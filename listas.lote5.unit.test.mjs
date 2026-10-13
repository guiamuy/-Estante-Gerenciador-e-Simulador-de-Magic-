// L-5 · trilha listas · Pauper de M a Z, lote 5: as cartas que usam o `descarta_e_compra` da M-348, numa partida em modo único (mana
// cobrada), com o texto oficial de .listas/oficiais-listas.json (Oracle do Forge, consulta de 12/10/2026). Cada teste cita a frase.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, passaAte, mesa, comMana, tudo } from './trilha-listas.mjs';

test('L-5 · Ragged Short Spear: "When this Equipment enters, you may discard a card. If you do, draw two cards." · equipada +2/+0 · "Equip {3}"', () => {
  let s = mesa(['Ragged Short Spear', 'Urso de Teste']), rs, urso; [s, rs] = poe(s, 0, 'Ragged Short Spear', 'hand'); [s, urso] = poe(s, 0, 'Urso de Teste');
  const mao = s.zones[0].hand.length;
  const cast = act(comMana(s, 'RR'), legais(comMana(s, 'RR'), 0, a => a.t === 'cast' && a.oid === rs)[0]);
  let r = passaAte(cast, x => !!x.pending); assert.equal(r.pending.kind, 'pick'); assert.equal(r.pending.min, 0, '"you may": pode não descartar');
  const sim = tudo(act(r, legais(r, 0, a => a.t === 'pick')[0]), x => legais(x, x.pending.p, a => a.t === 'pick_done')[0] || legais(x, x.pending.p)[0]);
  assert.equal(sim.zones[0].hand.length, mao - 1 - 1 + 2, 'descartou uma e comprou duas');
  const nao = tudo(act(r, legais(r, 0, a => a.t === 'pick_done')[0]));
  assert.equal(nao.zones[0].hand.length, mao - 1, 'não descartou: não compra');
  const eq = legais(comMana(nao, 'CCC'), 0, a => a.t === 'activate' && a.oid === rs && (a.targets || [])[0] && a.targets[0].oid === urso);
  assert.ok(eq.length, 'Equip {3}'); const e = tudo(act(comMana(nao, 'CCC'), eq[0]));
  assert.deepEqual([E.stats(e, e.objects[urso]).power, E.stats(e, e.objects[urso]).toughness], [4, 2]);
});

test('L-5 · Witch\'s Mark: "You may discard a card. If you do, draw two cards." e depois "Create a Wicked Role token attached to up to one target creature you control" — o alvo viaja pela escolha do descarte', () => {
  let s = mesa(["Witch's Mark", 'Urso de Teste'], ['Urso de Teste']), wm, meu, deles; [s, wm] = poe(s, 0, "Witch's Mark", 'hand'); [s, meu] = poe(s, 0, 'Urso de Teste'); [s, deles] = poe(s, 1, 'Urso de Teste');
  const of = legais(comMana(s, 'RR'), 0, a => a.t === 'cast' && a.oid === wm);
  assert.ok(of.every(a => !(a.targets || []).some(t => t && t.oid === deles)), 'só criatura sua'); assert.ok(of.some(a => !(a.targets || []).some(t => t && t.oid != null)), '"up to one": sem alvo também');
  const mao = s.zones[0].hand.length;
  let r = passaAte(act(comMana(s, 'RR'), of.find(a => (a.targets || []).some(t => t && t.oid === meu))), x => !!x.pending);
  r = tudo(act(r, legais(r, 0, a => a.t === 'pick')[0]), x => legais(x, x.pending.p, a => a.t === 'pick_done')[0] || legais(x, x.pending.p)[0]);
  assert.equal(r.zones[0].hand.length, mao - 1 - 1 + 2, 'descartou uma e comprou duas');
  const papel = Object.values(r.objects).find(o => o.token && o.zone === 'battlefield' && o.attachedTo === meu);
  assert.ok(papel, 'o Papel entrou anexado à criatura alvo'); assert.deepEqual([E.stats(r, r.objects[meu]).power, E.stats(r, r.objects[meu]).toughness], [3, 3], 'Wicked: +1/+1');
});

