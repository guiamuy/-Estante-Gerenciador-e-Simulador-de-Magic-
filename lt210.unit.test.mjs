// M-528 · LT190 · revisão por lote CLXVI: delírio em mágica (textos da Scryfall de 19/10/2026) — conferido na resolução, com a própria
// mágica ainda na pilha (não conta). Unholy Heat ("deals 6 damage instead") e Violent Urge ("that creature gains double strike"). Falham no
// motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Unholy Heat', 'Violent Urge'];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))] }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Mountain: terra('Mountain', 'Mountain', 'R'), Forest: terra('Forest', 'Forest', 'G'),
  'Lightning Bolt': { name: 'Lightning Bolt', type_line: 'Instant', mana_cost: '{R}', cmc: 1, keywords: [], oracle_text: 'Lightning Bolt deals 3 damage to any target.', colors: ['R'] },
  Feitico: { name: 'Feitico', type_line: 'Sorcery', mana_cost: '{3}', cmc: 3, keywords: [], oracle_text: '', colors: [] },
  Amuleto: { name: 'Amuleto', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] },
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', power: '2', toughness: '2', colors: ['G'] },
  Muralha: { name: 'Muralha', type_line: 'Creature — Wall', mana_cost: '{3}', cmc: 3, keywords: [], oracle_text: '', power: '0', toughness: '5', colors: [] } });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: /Land/.test(C[name].type_line) ? 10 : 4, zone: 'main' }));
  const extras = ['Lightning Bolt', 'Feitico', 'Amuleto', 'Urso', 'Muralha'];
  let s = E.createGame({ format: 'livre', seed: 210, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, ...extras, 'Mountain', 'Forest']) }, { name: 'B', deck: b([...extras, 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const limpa = s => passaAte(s, x => !x.stack.length && !x.pending && !(x.queued || []).length);
const cemiterio = (s, p, ns) => { for (const n of ns) [s] = poe(s, p, n, 'graveyard'); return s; };
const QUATRO = ['Forest', 'Lightning Bolt', 'Feitico', 'Urso'];
const mira = (s, oid, alvo) => act(s, legais(s, 0, a => a.t === 'cast' && a.oid === oid && a.targets && a.targets[0] && a.targets[0].oid === alvo)[0]);

test('M-528 · Unholy Heat: 2 de dano sem delírio, 6 com delírio; não mira jogador', () => {
  let s = mesa(), uh, m; [s, uh] = poe(s, 0, 'Unholy Heat', 'hand'); [s] = poe(s, 0, 'Mountain'); [s, m] = poe(s, 1, 'Muralha');
  assert.equal(legais(s, 0, a => a.t === 'cast' && a.oid === uh && a.targets && a.targets[0] && a.targets[0].player != null).length, 0, 'só criatura ou planeswalker');
  s = limpa(mira(s, uh, m)); assert.equal(s.objects[m].damage, 2); assert.equal(s.objects[m].zone, 'battlefield');
  let t = mesa(), u2, m2; [t, u2] = poe(t, 0, 'Unholy Heat', 'hand'); [t] = poe(t, 0, 'Mountain'); [t, m2] = poe(t, 1, 'Muralha'); t = cemiterio(t, 0, QUATRO);
  t = limpa(mira(t, u2, m2)); assert.equal(t.objects[m2].zone, 'graveyard', '6 de dano numa 0/5');
});

test('M-528 · Unholy Heat: a própria mágica na pilha não conta para o delírio; o cemitério do oponente também não', () => {
  let s = mesa(), uh, m; [s, uh] = poe(s, 0, 'Unholy Heat', 'hand'); [s] = poe(s, 0, 'Mountain'); [s, m] = poe(s, 1, 'Muralha');
  s = cemiterio(s, 0, ['Forest', 'Feitico', 'Urso']); s = cemiterio(s, 1, ['Lightning Bolt', 'Amuleto']); // três tipos seus (a instantânea seria a quarta só depois)
  s = limpa(mira(s, uh, m)); assert.equal(s.objects[m].damage, 2);
});

test('M-528 · Violent Urge: +1/+0 e iniciativa; com delírio, golpe duplo', () => {
  const ataca = delirio => { let s = mesa(), vu, u; [s, vu] = poe(s, 0, 'Violent Urge', 'hand'); [s] = poe(s, 0, 'Mountain'); [s, u] = poe(s, 0, 'Urso'); if (delirio) s = cemiterio(s, 0, QUATRO);
    s = limpa(mira(s, vu, u)); assert.equal(E.stats(s, s.objects[u]).power, 3); assert.ok(E.hasKeyword(s, s.objects[u], 'first strike'));
    const dg = E.hasKeyword(s, s.objects[u], 'double strike');
    s = passaAte(s, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 0); const v = s.players[1].life;
    s = act(s, { t: 'attack', p: 0, attackers: [u] }); s = passaAte(s, x => x.turn.step === 'main2');
    return [dg, v - s.players[1].life]; };
  assert.deepEqual(ataca(false), [false, 3]); assert.deepEqual(ataca(true), [true, 6]);
});
