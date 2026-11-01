// M-599 · leitor e núcleo, competitivos na ordem gulosa da sentinela (texto da Scryfall de 01/11/2026 em cobertura/<formato>.json):
// "Destroy target non-outlaw creature" (Shoot the Sheriff; 700.13: Assassin, Mercenary, Pirate, Rogue e Warlock são fora da lei),
// "It deals 4 damage to target attacking or blocking creature" (Eiganjo, Seat of the Empire; 506.4), "Untap another target artifact"
// (Manifold Key) e o custo "Sacrifice a token" (Fountainport; 111.1, qualquer ficha). Cartas de teste com nomes inventados; a aprovação
// das cartas do catálogo é da homologacao. Falha no motor anterior (as quatro frases ficavam sem leitura).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, act, poe, legais, passaAte, limpaMao } from './listas.mjs';
import { loadModules } from './_load.mjs';
const L = loadModules().leitor;
const C = {
  Xerife: { name: 'Xerife', mana_cost: '{B}', cmc: 1, type_line: 'Instant', oracle_text: 'Destroy target non-outlaw creature. (Assassins, Mercenaries, Pirates, Rogues, and Warlocks are outlaws. Everyone else is fair game.)', keywords: [], colors: ['B'] },
  Castelo: { name: 'Castelo', mana_cost: '', cmc: 0, type_line: 'Legendary Land', oracle_text: '{T}: Add {W}.\nChannel — {2}{W}, Discard this card: It deals 4 damage to target attacking or blocking creature. This ability costs {1} less to activate for each legendary creature you control.', keywords: [], colors: [] },
  Chave: { name: 'Chave', mana_cost: '{1}', cmc: 1, type_line: 'Artifact', oracle_text: '{1}, {T}: Untap another target artifact.\n{3}, {T}: Target creature can\'t be blocked this turn.', keywords: [], colors: [] },
  Porto: { name: 'Porto', mana_cost: '', cmc: 0, type_line: 'Land — Town', oracle_text: '{T}: Add {C}.\n{2}, {T}, Sacrifice a token: Draw a card.\n{3}, {T}, Pay 1 life: Create a 1/1 blue Fish creature token.\n{4}, {T}: Create a Treasure token.', keywords: [], colors: [] },
  Urso: { name: 'Urso', mana_cost: '{1}{G}', cmc: 2, type_line: 'Creature — Bear', oracle_text: '', power: '2', toughness: '2', keywords: [], colors: ['G'] },
  Ladino: { name: 'Ladino', mana_cost: '{1}{B}', cmc: 2, type_line: 'Creature — Human Rogue', oracle_text: '', power: '2', toughness: '2', keywords: [], colors: ['B'] },
  Pedra: { name: 'Pedra', mana_cost: '{1}', cmc: 1, type_line: 'Artifact', oracle_text: '', keywords: [], colors: [] },
  Swamp: { name: 'Swamp', type_line: 'Basic Land — Swamp', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {B}.)', colors: [] },
  Plains: { name: 'Plains', type_line: 'Basic Land — Plains', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {W}.)', colors: [] },
};
const ex = { example: { target: 'none', expect: { selfLife: 0 } } };
const lido = n => { const r = L.ler(C[n]); assert.ok(r && r.completa, `${n} lida por inteiro`); return { ...r.script, ...ex }; };
const SC = { Xerife: lido('Xerife'), Castelo: lido('Castelo'), Chave: lido('Chave'), Porto: lido('Porto'), Urso: { name: 'Urso', ...ex }, Ladino: { name: 'Ladino', ...ex }, Pedra: { name: 'Pedra', ...ex } };
function mesa(seed = 280) {
  const d = xs => xs.map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SC, first: 0, players: [{ name: 'A', deck: d([['Xerife', 2], ['Castelo', 2], ['Chave', 2], ['Porto', 2], ['Pedra', 2], ['Swamp', 15], ['Plains', 15]]) }, { name: 'B', deck: d([['Urso', 10], ['Ladino', 10], ['Swamp', 20]]) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  return limpaMao(s, 0);
}
const resolve = s => { for (let i = 0; i < 40 && (s.stack.length || s.pending); i++) s = s.pending ? act(s, legais(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority }); return s; };
const tem = (of, oid) => of.some(x => JSON.stringify(x).includes(`"${oid}"`));

test('M-599 · leitura das quatro frases', () => {
  assert.equal(JSON.stringify(SC.Xerife.effects), JSON.stringify([{ do: 'destroy', target: { tipos: ['creature'], foraDaLei: false } }]));
  assert.equal(JSON.stringify(SC.Castelo.abilities[0].effects[0].target), JSON.stringify({ tipos: ['creature'], emCombate: true }));
  assert.equal(JSON.stringify(SC.Chave.abilities[0].effects), JSON.stringify([{ do: 'untap', target: { tipos: ['artifact'], outra: true } }]));
  assert.equal(SC.Porto.abilities[0].cost.sacrificeOther.ficha, true);
});

test('M-599 · 700.13: o Xerife destrói o Urso; o Ladino (fora da lei) não é alvo', () => {
  let s = mesa(), x, u, l; [s, x] = poe(s, 0, 'Xerife', 'hand'); [s] = poe(s, 0, 'Swamp'); [s, u] = poe(s, 1, 'Urso'); [s, l] = poe(s, 1, 'Ladino');
  const of = legais(s, 0, a => a.t === 'cast' && a.oid === x); assert.ok(tem(of, u)); assert.ok(!tem(of, l), 'o Ladino não é alvo');
  s = resolve(act(s, of.find(a => JSON.stringify(a).includes(`"${u}"`)))); assert.equal(s.objects[u].zone, 'graveyard');
});

test('M-599 · 506.4: o Castelo só mira criatura atacando ou bloqueando', () => {
  let s = mesa(), c, u; [s, c] = poe(s, 0, 'Castelo', 'hand'); for (let i = 0; i < 3; i++) [s] = poe(s, 0, 'Plains'); [s, u] = poe(s, 1, 'Urso');
  assert.ok(!tem(legais(s, 0, a => a.oid === c && a.t === 'activate'), u), 'parado, não é alvo');
  s.objects[u].attacking = 'p0';
  const of = legais(s, 0, a => a.oid === c && a.t === 'activate'); assert.ok(tem(of, u), 'atacando, é alvo');
  delete s.objects[u].attacking; s.objects[u].blocking = 'o1'; assert.ok(tem(legais(s, 0, a => a.oid === c && a.t === 'activate'), u), 'bloqueando, é alvo');
  delete s.objects[u].blocking; s.objects[u].attacking = 'p0';
  s = resolve(act(s, legais(s, 0, a => a.oid === c && a.t === 'activate' && JSON.stringify(a).includes(`"${u}"`))[0])); assert.equal(s.objects[u].zone, 'graveyard', '4 de dano');
});

test('M-599 · a Chave desvira outro artefato, não a si mesma', () => {
  let s = mesa(), k, p; [s, k] = poe(s, 0, 'Chave'); [s, p] = poe(s, 0, 'Pedra'); [s] = poe(s, 0, 'Plains'); s.objects[p].tapped = true;
  const of = legais(s, 0, a => a.oid === k && a.t === 'activate' && (a.index || 0) === 0); assert.ok(tem(of, p)); assert.ok(!of.some(a => (a.targets || []).some(t => t.oid === k)), 'não a si mesma');
  s = resolve(act(s, of.find(a => JSON.stringify(a).includes(`"${p}"`)))); assert.equal(!!s.objects[p].tapped, false);
});

test('M-599 · 111.1: o Porto sacrifica uma ficha para comprar; sem ficha, não ativa', () => {
  let s = mesa(), po; [s, po] = poe(s, 0, 'Porto'); for (let i = 0; i < 4; i++) [s] = poe(s, 0, 'Plains'); let pe; [s, pe] = poe(s, 0, 'Pedra');
  const compra = s => legais(s, 0, a => a.oid === po && a.t === 'activate' && (a.index || 0) === 0);
  assert.equal(compra(s).length, 0, 'sem ficha (a Pedra não é ficha) não ativa');
  s = resolve(act(s, legais(s, 0, a => a.oid === po && a.t === 'activate' && a.index === 2)[0]));
  const ficha = s.zones[0].battlefield.find(o => s.objects[o].token); assert.ok(ficha, 'criou o Tesouro');
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && x.turn.number > 2 && !x.stack.length && !x.pending);
  const mao = s.zones[0].hand.length; const of = compra(s); assert.ok(of.length, 'com a ficha, ativa');
  s = resolve(act(s, of[0])); assert.ok(!s.objects[ficha] || s.objects[ficha].zone !== 'battlefield', 'a ficha foi sacrificada'); assert.equal(s.zones[0].hand.length, mao + 1);
});
