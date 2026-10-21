// M-549 · LT211 · revisão por lote CLXXXVII (texto da Scryfall de 21/10/2026): Witherbloom Charm ("Choose one — / • You may sacrifice a permanent.
// If you do, draw two cards. / • You gain 5 life. / • Destroy target nonland permanent with mana value 2 or less."). Sacrifício opcional na resolução
// (701.21; só compra se sacrificou); restrição de alvo pelo valor de mana (601.2c). Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, T, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const WC = 'Witherbloom Charm';
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: ['B', 'G'] }; };
const C = { [WC]: of(WC) };
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Swamp: terra('Swamp', 'Swamp', 'B'), Forest: terra('Forest', 'Forest', 'G'),
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', power: '2', toughness: '2', colors: ['G'] },
  Gigante: { name: 'Gigante', type_line: 'Creature — Giant', mana_cost: '{4}{G}', cmc: 5, keywords: [], oracle_text: '', power: '4', toughness: '4', colors: ['G'] },
  Pedra: { name: 'Pedra', type_line: 'Artifact', mana_cost: '{2}', cmc: 2, keywords: [], oracle_text: '', colors: [] } });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: /Land/.test(C[name].type_line) ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 231, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([WC, 'Urso', 'Pedra', 'Swamp', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Gigante', 'Pedra', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const comMana = s => { [s] = poe(s, 0, 'Swamp'); [s] = poe(s, 0, 'Forest'); return s; };
const modo = (a, k) => a.mode === k || (a.modes && a.modes[0] === k);
const ate = s => passaAte(s, x => !!x.pending || (!x.stack.length && !(x.queued || []).length));

test('M-549 · Witherbloom Charm joga (lido e aprovado)', () => { assert.equal(S.coverage(of(WC)).level, 'completo'); });

test('M-549 · pode sacrificar uma permanente sua (inclusive terreno) e, se sacrificou, compra duas; sem sacrificar, não compra', () => {
  let s = mesa(), wc, u, ub; [s, wc] = poe(s, 0, WC, 'hand'); [s, u] = poe(s, 0, 'Urso'); [s, ub] = poe(s, 1, 'Urso'); s = comMana(s);
  const mao = s.zones[0].hand.length;
  s = ate(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === wc && modo(a, 0))[0]));
  assert.equal(s.pending && s.pending.kind, 'pick'); const de = Array.from(s.pending.from);
  assert.ok(de.includes(u) && !de.includes(ub), 'só permanentes suas'); assert.ok(de.some(o => /Swamp|Forest/.test(s.objects[o].name)), 'terreno também');
  s = ate(act(s, legais(s, 0, a => a.t === 'pick' && a.oid === u)[0])); if (s.pending && s.pending.kind === 'pick') s = ate(act(s, legais(s, 0, a => a.t === 'pick_done')[0]));
  assert.deepEqual([s.objects[u].zone, s.zones[0].hand.length - mao], ['graveyard', 1], 'sacrificou o Urso; −1 (o Charm) +2');
  let t = mesa(), wc2; [t, wc2] = poe(t, 0, WC, 'hand'); [t] = poe(t, 0, 'Urso'); t = comMana(t); const m2 = t.zones[0].hand.length;
  t = ate(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === wc2 && modo(a, 0))[0])); t = ate(act(t, legais(t, 0, a => a.t === 'pick_done')[0]));
  assert.equal(t.zones[0].hand.length - m2, -1, 'não sacrificou: não compra');
});

test('M-549 · destruir: só permanente não terreno de valor de mana 2 ou menos; ganhar 5', () => {
  let s = mesa(), wc, ub, g, pd; [s, wc] = poe(s, 0, WC, 'hand'); [s, ub] = poe(s, 1, 'Urso'); [s, g] = poe(s, 1, 'Gigante'); [s, pd] = poe(s, 1, 'Pedra'); s = comMana(s);
  const alvos = new Set(legais(s, 0, a => a.t === 'cast' && a.oid === wc && modo(a, 2)).map(a => a.targets[0].oid));
  assert.ok(alvos.has(ub) && alvos.has(pd), 'Urso e Pedra (valor 2)'); assert.ok(!alvos.has(g), 'Gigante (5) não');
  assert.ok(![...alvos].some(o => /Swamp|Forest/.test(s.objects[o].name)), 'terreno não');
  s = ate(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === wc && modo(a, 2) && a.targets[0].oid === ub)[0])); assert.equal(s.objects[ub].zone, 'graveyard');
  let t = mesa(), wc2; [t, wc2] = poe(t, 0, WC, 'hand'); t = comMana(t); const v = t.players[0].life;
  t = ate(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === wc2 && modo(a, 1))[0])); assert.equal(t.players[0].life, v + 5);
});

test('M-549 · achados da revisão: o registro conta o sacrifício e a compra; a escolha não é a folha de descartar ou sacrificar; a descrição diz o limite de valor de mana', () => {
  let s = mesa(), wc, pd; [s, wc] = poe(s, 0, WC, 'hand'); [s, pd] = poe(s, 0, 'Pedra'); s = comMana(s);
  s = ate(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === wc && modo(a, 0))[0]));
  assert.notEqual(s.pending.to, 'descarta-ou-sacrifica', 'folha comum de escolha');
  const a = legais(s, 0, x => x.t === 'pick' && x.oid === pd)[0]; let r = E.apply(s, a); let L = String(T.describe(s, a, r.events, r.state)); s = r.state;
  if (s.pending && s.pending.kind === 'pick') { const d = legais(s, 0, x => x.t === 'pick_done')[0]; r = E.apply(s, d); L += '\n' + String(T.describe(s, d, r.events, r.state)); s = r.state; }
  assert.match(L, /Pedra foi sacrificada/); assert.match(L, /comprou 2 cartas/);
  const lido = S.scriptLido ? S.scriptLido(of(WC)) : null; const efs = lido ? lido.modes[2].effects : [{ do: 'destroy', target: { semTipos: ['land'], mvMax: 2 } }];
  assert.match(String(T.descreveEfeitos(efs)), /de valor de mana 2 ou menos/);
});
