// M-449 · LT115 · Spirit Mascot ("Whenever one or more cards leave your graveyard, put a +1/+1 counter on this creature."). Texto da Scryfall de
// 17/10/2026 UTC (.listas/oficiais-revisadas.json); ruling de 20/03/2026: "If multiple cards leave your graveyard at the same time, Spirit Mascot's
// ability will trigger only once." Gatilho em lote novo (603.2c) que olha para trás (603.10a). Cartas de apoio com o texto de .listas/oficiais.json
// (Tormod's Crypt, Sentinel's Eyes) e .listas/oficiais-commander.json (Unearth). Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, act, poe, legais, passaAte, S } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const c0 = OF.find(x => x.name === 'Spirit Mascot');
const k = (name, type_line, mana_cost, cmc, oracle_text, extra = {}) => ({ name, type_line, mana_cost, cmc, keywords: [], oracle_text, colors: [], ...extra });
const C = { 'Spirit Mascot': { name: c0.name, type_line: c0.type_line, mana_cost: c0.mana_cost, cmc: 2, keywords: [], oracle_text: c0.oracle_text, colors: ['R', 'W'], power: c0.power, toughness: c0.toughness },
  "Tormod's Crypt": k("Tormod's Crypt", 'Artifact', '{0}', 0, "{T}, Sacrifice Tormod's Crypt: Exile all cards from target player's graveyard."),
  "Sentinel's Eyes": k("Sentinel's Eyes", 'Enchantment — Aura', '{W}', 1, "Enchant creature\nEnchanted creature gets +1/+1 and has vigilance.\nEscape—{W}, Exile two other cards from your graveyard. (You may cast this card from your graveyard for its escape cost.)", { colors: ['W'], keywords: ['Escape'] }),
  Unearth: k('Unearth', 'Sorcery', '{B}', 1, 'Return target creature card with mana value 3 or less from your graveyard to the battlefield.\nCycling {2} ({2}, Discard this card: Draw a card.)', { colors: ['B'], keywords: ['Cycling'] }),
  Pedra: k('Pedra', 'Artifact', '{1}', 1, ''),
  Plains: k('Plains', 'Basic Land — Plains', '', 0, '({T}: Add {W}.)'), Swamp: k('Swamp', 'Basic Land — Swamp', '', 0, '({T}: Add {B}.)') };
function mesa(seed = 41) {
  const b = ns => ns.map(name => ({ name, qty: 5, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b(['Spirit Mascot', "Tormod's Crypt", "Sentinel's Eyes", 'Unearth', 'Pedra', 'Plains', 'Swamp']) }, { name: 'B', deck: b(['Pedra', 'Plains']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length && !x.pending, 60);
const forca = (s, o) => E.stats(s, s.objects[o]).power;
const cemiterio = (s, p, n) => { for (let i = 0; i < n; i++) [s] = poe(s, p, 'Pedra', 'graveyard'); return s; };
const quebraCripta = (s, quem) => {
  const a = legais(s, 0, x => x.t === 'activate' && s.objects[x.oid].name === "Tormod's Crypt");
  const alvo = a.find(x => (x.targets || [])[0] && x.targets[0].player === quem) || a[0]; assert.ok(alvo, 'ativa a cripta');
  s = act(s, alvo);
  if (s.pending && s.pending.kind === 'pick_target') s = act(s, { t: 'pick_target', p: 0, index: s.pending.options.findIndex(o => o.player === quem) });
  return resolve(s);
};

test('LT115 · Spirit Mascot joga pelo leitor aprovado', () => {
  assert.equal(S.coverage(C['Spirit Mascot']).level, 'completo'); assert.equal(S.APROVADAS['Spirit Mascot'].leva, 'M-449');
});

test('LT115 · três cartas saem do seu cemitério ao mesmo tempo: dispara uma vez (+1/+1)', () => {
  let s = mesa(), m; [s, m] = poe(s, 0, 'Spirit Mascot'); [s] = poe(s, 0, "Tormod's Crypt"); s = cemiterio(s, 0, 3);
  assert.equal(forca(s, m), 2);
  s = quebraCripta(s, 0);
  assert.equal(s.zones[0].graveyard.filter(o => s.objects[o].name === 'Pedra').length, 0);
  assert.equal(forca(s, m), 3);
});

test('LT115 · o cemitério do oponente não conta ("your graveyard")', () => {
  let s = mesa(), m; [s, m] = poe(s, 0, 'Spirit Mascot'); [s] = poe(s, 0, "Tormod's Crypt"); s = cemiterio(s, 1, 2);
  s = quebraCripta(s, 1);
  assert.equal(s.zones[1].graveyard.length, 0); assert.equal(forca(s, m), 2);
});

test('LT115 · fuga: exilar duas cartas (custo) e a carta ir para a pilha são dois eventos — dispara duas vezes', () => {
  let s = mesa(), m, se; [s, m] = poe(s, 0, 'Spirit Mascot'); [s, se] = poe(s, 0, "Sentinel's Eyes", 'graveyard'); s = cemiterio(s, 0, 2); [s] = poe(s, 0, 'Plains');
  const c = legais(s, 0, a => a.t === 'cast' && a.oid === se && a.escape);
  assert.ok(c.length > 0, 'oferece a fuga');
  s = resolve(act(s, c.find(a => (a.targets || []).some(t => t.oid === m)) || c[0]));
  assert.equal(s.zones[0].graveyard.length, 0);
  assert.equal(forca(s, m) - (s.objects[se].zone === 'battlefield' && s.objects[se].attachedTo === m ? 1 : 0), 4);
});

test('LT115 · olha para trás: a Mascot reanimada não vê a própria saída; a outra no campo vê uma vez', () => {
  let s = mesa(), m1, m2, un; [s, m1] = poe(s, 0, 'Spirit Mascot'); [s, m2] = poe(s, 0, 'Spirit Mascot', 'graveyard'); [s, un] = poe(s, 0, 'Unearth', 'hand'); [s] = poe(s, 0, 'Swamp');
  const c = legais(s, 0, a => a.t === 'cast' && a.oid === un && (a.targets || []).some(t => t.oid === m2));
  assert.ok(c.length > 0);
  s = resolve(act(s, c[0]));
  assert.equal(s.objects[m2].zone, 'battlefield');
  assert.equal(forca(s, m2), 2); assert.equal(forca(s, m1), 3);
});
