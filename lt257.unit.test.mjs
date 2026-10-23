// M-576 · LT234 · revisão por lote CCX (textos da API da Scryfall de 23/10/2026), duas cartas que entraram no catálogo Pauper na coleta de 23/10:
// Abjure ({U}, Instant: "As an additional cost to cast this spell, sacrifice a blue permanent.\nCounter target spell.", 2 listas) e Barbed Batterfist
// ({1}{R}, Artifact — Equipment: "For Mirrodin! … Equipped creature gets +1/-1.\nEquip {1}", 1 lista). Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, S, act, poe, legais, passaAte, limpaMao } from './listas.mjs';
const C = {
  Abjure: { name: 'Abjure', mana_cost: '{U}', cmc: 1, type_line: 'Instant', oracle_text: 'As an additional cost to cast this spell, sacrifice a blue permanent.\nCounter target spell.', keywords: [], colors: ['U'] },
  'Barbed Batterfist': { name: 'Barbed Batterfist', mana_cost: '{1}{R}', cmc: 2, type_line: 'Artifact — Equipment', oracle_text: 'For Mirrodin! (When this Equipment enters, create a 2/2 red Rebel creature token, then attach this to it.)\nEquipped creature gets +1/-1.\nEquip {1} ({1}: Attach to target creature you control. Equip only as a sorcery.)', keywords: ['For Mirrodin!', 'Equip'], colors: ['R'] },
  Island: { name: 'Island', type_line: 'Basic Land — Island', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {U}.)', colors: [] },
  Mountain: { name: 'Mountain', type_line: 'Basic Land — Mountain', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {R}.)', colors: [] },
  Fada: { name: 'Fada', type_line: 'Creature — Faerie', mana_cost: '{1}{U}', cmc: 2, keywords: [], oracle_text: '', power: '1', toughness: '1', colors: ['U'] },
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{R}', cmc: 2, keywords: [], oracle_text: '', power: '2', toughness: '2', colors: ['R'] },
  'Lightning Bolt': { name: 'Lightning Bolt', type_line: 'Instant', mana_cost: '{R}', cmc: 1, keywords: [], oracle_text: 'Lightning Bolt deals 3 damage to any target.', colors: ['R'] },
};
function mesa(deckA, deckB, seed = 257) {
  const b = ns => ns.map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b(deckA) }, { name: 'B', deck: b(deckB) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  return limpaMao(s, 0);
}
const resolve = (s, escolha = (pd, st) => legais(st, pd.p)[0]) => { for (let i = 0; i < 60 && (s.stack.length || s.pending); i++) { const pd = s.pending; s = pd ? act(s, escolha(pd, s)) : act(s, { t: 'pass', p: s.turn.priority }); } return s; };

test('M-576 · as duas jogam (lidas e aprovadas)', () => { for (const n of ['Abjure', 'Barbed Batterfist']) assert.equal(S.coverage(C[n]).level, 'completo', n); });

test('M-576 · Abjure: sem permanente azul não se conjura; sacrificando uma permanente azul (não outra cor), anula a mágica alvo', () => {
  let s = mesa([['Abjure', 2], ['Fada', 2], ['Urso', 2], ['Island', 34]], [['Lightning Bolt', 4], ['Mountain', 36]]), a, f, u;
  [s, a] = poe(s, 0, 'Abjure', 'hand'); [s] = poe(s, 0, 'Island'); [s, u] = poe(s, 0, 'Urso'); [s] = poe(s, 1, 'Mountain');
  // o oponente conjura Lightning Bolt no Urso; com só o Urso (vermelho) no campo, Abjure não tem custo para pagar
  let c; [s, c] = poe(s, 1, 'Lightning Bolt', 'hand');
  const comFada = (st) => { let t, x; [t, x] = poe(st, 0, 'Fada'); return [t, x]; };
  let t = JSON.parse(JSON.stringify(s)); t.turn.priority = 1;
  t = act(t, legais(t, 1, x => x.t === 'cast' && x.oid === c && (x.targets || []).some(y => y.oid === u))[0]); t = act(t, { t: 'pass', p: 1 }); assert.equal(t.turn.priority, 0);
  assert.equal(legais(t, 0, x => x.t === 'cast' && x.oid === a).length, 0, 'sem permanente azul, sem Abjure');
  [s, f] = comFada(s); t = JSON.parse(JSON.stringify(s)); t.turn.priority = 1;
  t = act(t, legais(t, 1, x => x.t === 'cast' && x.oid === c && (x.targets || []).some(y => y.oid === u))[0]); t = act(t, { t: 'pass', p: 1 }); assert.equal(t.turn.priority, 0);
  const ab = legais(t, 0, x => x.t === 'cast' && x.oid === a); assert.ok(ab.length, 'com a Fada, oferece Abjure');
  t = act(t, ab[0]);
  for (let i = 0; i < 10 && t.pending && t.pending.p === 0; i++) { const op = legais(t, 0, x => x.t === 'pick' && x.oid === f)[0] || legais(t, 0, x => x.t !== 'pick' || x.oid !== u)[0]; t = act(t, op); }
  assert.equal(t.objects[f].zone, 'graveyard', 'sacrificou a Fada'); assert.equal(t.objects[u].zone, 'battlefield', 'o Urso (vermelho) não serve de custo');
  t = resolve(t);
  assert.equal(t.objects[c].zone, 'graveyard'); assert.equal(t.objects[u].damage || 0, 0, 'Lightning Bolt anulado');
});

test('M-576 · Barbed Batterfist: por Mirrodin! cria a ficha Rebelde 2/2 vermelha e se anexa (3/1); equipar {1} em outra criatura', () => {
  let s = mesa([['Barbed Batterfist', 2], ['Urso', 2], ['Mountain', 36]], [['Island', 40]]), b, u;
  [s, b] = poe(s, 0, 'Barbed Batterfist', 'hand'); for (let i = 0; i < 3; i++) [s] = poe(s, 0, 'Mountain'); [s, u] = poe(s, 0, 'Urso');
  s = resolve(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === b)[0]));
  const reb = s.zones[0].battlefield.find(x => s.objects[x].token && /Rebel/.test(s.objects[x].name)); assert.ok(reb, 'ficha Rebelde');
  assert.equal(s.objects[b].attachedTo, reb, 'anexado à ficha');
  const st = E.stats(s, s.objects[reb]); assert.equal(st.power, 3); assert.equal(st.toughness, 1);
  const eq = legais(s, 0, x => x.oid === b && (x.targets || []).some(y => y.oid === u)); assert.ok(eq.length, 'equipar no Urso');
  s = resolve(act(s, eq[0])); assert.equal(s.objects[b].attachedTo, u); assert.equal(E.stats(s, s.objects[u]).power, 3); assert.equal(E.stats(s, s.objects[u]).toughness, 1);
});
