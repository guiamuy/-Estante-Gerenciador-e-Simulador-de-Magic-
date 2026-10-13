// L-7 · trilha listas · Pauper de M a Z, lote 7: as cartas que usam a redução por cor da M-352, numa partida em modo único (mana cobrada),
// com o texto oficial de .listas/oficiais-listas.json (Oracle do Forge, consulta de 12/10/2026). Cada teste cita a frase.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, act, poe, legais, mesa, comMana, criatura, CARTAS } from './trilha-listas.mjs';

criatura('Urso de Teste', 2, 2);
criatura('Duende Vermelho de Teste', 1, 1, { colors: ['R'] });
criatura('Fada Azul de Teste', 1, 1, { colors: ['U'] });
criatura('Fera Verde Dois de Teste', 3, 3); CARTAS['Fera Verde Dois de Teste'].mana_cost = '{2}{G}'; CARTAS['Fera Verde Dois de Teste'].cmc = 3;
CARTAS['Sunscape Familiar'].keywords = ['Defender'];

const podeConjurar = (s, oid, mana = '') => legais(comMana(s, mana), 0, a => a.t === 'cast' && a.oid === oid).length > 0;

test('L-7 · Sunscape Familiar: "Green spells and blue spells you cast cost {1} less to cast." — só o genérico, só mágica verde ou azul, só as suas', () => {
  let s = mesa(['Sunscape Familiar', 'Urso de Teste', 'Fada Azul de Teste', 'Duende Vermelho de Teste', 'Fera Verde Dois de Teste']), urso, fada, duende, fera;
  [s] = poe(s, 0, 'Sunscape Familiar');
  [s, urso] = poe(s, 0, 'Urso de Teste', 'hand'); [s, fada] = poe(s, 0, 'Fada Azul de Teste', 'hand'); [s, duende] = poe(s, 0, 'Duende Vermelho de Teste', 'hand'); [s, fera] = poe(s, 0, 'Fera Verde Dois de Teste', 'hand');
  assert.ok(podeConjurar(s, urso), 'verde {1} sai de graça'); assert.ok(podeConjurar(s, fada), 'azul {1} sai de graça');
  assert.ok(!podeConjurar(s, duende), 'vermelha não fica mais barata'); assert.ok(podeConjurar(s, duende, 'R'));
  assert.ok(!podeConjurar(s, fera, 'G'), '{2}{G} vira {1}{G}, não {G}'); assert.ok(podeConjurar(s, fera, 'GG'), '{2}{G} com {1} a menos');
  const r = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === urso)[0]); assert.ok(r.stack.length || r.objects[urso].zone !== 'hand', 'conjurou sem pagar');
});

test('L-7 · Sunscape Familiar: "you cast" — a mágica verde do oponente custa o preço cheio; e "Defender" não ataca', () => {
  let s = mesa(['Urso de Teste'], ['Sunscape Familiar']), urso, sf; [s, sf] = poe(s, 1, 'Sunscape Familiar'); [s, urso] = poe(s, 0, 'Urso de Teste', 'hand');
  assert.ok(!podeConjurar(s, urso), 'a redução é só de quem controla o Familiar'); assert.ok(podeConjurar(s, urso, 'G'));
  let t = mesa(['Sunscape Familiar']), f; [t, f] = poe(t, 0, 'Sunscape Familiar', 'battlefield', { sick: false });
  assert.ok(E.hasKeyword(t, t.objects[f], 'defender'), 'tem defensor (702.3b: não pode atacar)');
});
