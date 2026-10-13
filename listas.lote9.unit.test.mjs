// L-9 · trilha listas · Pauper de M a Z, lote 9: habilidade ativada concedida por Equipamento, numa partida em modo único (mana cobrada),
// com o texto oficial de .listas/oficiais-listas.json (Oracle do Forge, consulta de 12/10/2026). Cada teste cita a frase.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { act, poe, legais, mesa, comMana, tudo, criatura, CARTAS } from './trilha-listas.mjs';

criatura('Urso de Teste', 2, 2);
criatura('Clérigo de Teste', 1, 1, { colors: ['W'] }); CARTAS['Clérigo de Teste'].keywords = ['Lifelink'];

const equipa = (s, eq, alvo) => { const m = comMana(s, 'CCC'); const a = legais(m, 0, x => x.t === 'activate' && x.oid === eq && (x.targets || []).some(t => t && t.oid === alvo)); assert.ok(a.length, 'Equip {3}'); return tudo(act(m, a[0])); };
const arco = (s, oid) => legais(s, 0, a => a.t === 'activate' && a.oid === oid && (a.targets || []).some(t => t && t.player === 1));

test('L-9 · Viridian Longbow: "Equipped creature has \'{T}: This creature deals 1 damage to any target.\'" — a criatura equipada vira e causa 1', () => {
  let s = mesa(['Viridian Longbow', 'Urso de Teste']), vl, urso; [s, vl] = poe(s, 0, 'Viridian Longbow'); [s, urso] = poe(s, 0, 'Urso de Teste', 'battlefield', { sick: false });
  assert.equal(arco(s, urso).length, 0, 'sem o arco, não tem a habilidade');
  s = equipa(s, vl, urso);
  const at = arco(s, urso); assert.ok(at.length, 'equipada ganha "{T}: 1 de dano"');
  const vida = s.players[1].life; const r = tudo(act(s, at[0]));
  assert.equal(r.players[1].life, vida - 1); assert.equal(r.objects[urso].tapped, true, 'o custo é virar a criatura');
});

test('L-9 · Viridian Longbow: quem causa o dano é a criatura ("This creature deals") — vínculo com a vida conta; enjoada não ativa (302.6)', () => {
  let s = mesa(['Viridian Longbow', 'Clérigo de Teste']), vl, cl; [s, vl] = poe(s, 0, 'Viridian Longbow'); [s, cl] = poe(s, 0, 'Clérigo de Teste', 'battlefield', { sick: false });
  s = equipa(s, vl, cl);
  const vida0 = s.players[0].life; const r = tudo(act(s, arco(s, cl)[0]));
  assert.equal(r.players[0].life, vida0 + 1, 'vínculo com a vida da criatura');
  let t = mesa(['Viridian Longbow', 'Urso de Teste']), v2, u2; [t, v2] = poe(t, 0, 'Viridian Longbow'); [t, u2] = poe(t, 0, 'Urso de Teste', 'battlefield', { sick: true });
  t = equipa(t, v2, u2); assert.equal(arco(t, u2).length, 0, 'criatura enjoada não usa {T}');
});
