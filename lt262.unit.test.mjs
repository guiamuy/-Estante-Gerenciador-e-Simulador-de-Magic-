// M-581 · leitor, competitivos (plano de 24/10): "~ enters tapped unless you control a(n) <tipo básico>" (305.7; castelos como Castle
// Vantress e Castle Locthwain, Arena of Glory) e "Tap up to one target creature" (115.3: "up to one" aceita zero alvos), inclusive como
// segundo alvo de mágica (601.2c; Vibrant Outburst). Cartas de teste com nomes inventados; a aprovação das cartas do catálogo, com o
// texto da Scryfall, é da conversa homologacao. Falha no motor anterior (as duas frases ficavam sem leitura).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, act, poe, legais, passaAte, limpaMao } from './listas.mjs';
import { loadModules } from './_load.mjs';
const L = loadModules().leitor;
const C = {
  Explosao: { name: 'Explosao', mana_cost: '{U}', cmc: 1, type_line: 'Instant', oracle_text: 'Explosao deals 3 damage to any target. Tap up to one target creature.', keywords: [], colors: ['U'] },
  Castelo: { name: 'Castelo', mana_cost: '', cmc: 0, type_line: 'Land', oracle_text: 'Castelo enters tapped unless you control an Island.\n{T}: Add {U}.\n{2}{U}{U}, {T}: Scry 2.', keywords: [], colors: [] },
  Urso: { name: 'Urso', mana_cost: '{G}', cmc: 1, type_line: 'Creature — Bear', oracle_text: '', keywords: [], power: '2', toughness: '2', colors: ['G'] },
  Island: { name: 'Island', type_line: 'Basic Land — Island', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {U}.)', colors: [] },
  Swamp: { name: 'Swamp', type_line: 'Basic Land — Swamp', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {B}.)', colors: [] },
};
const lido = n => { const r = L.ler(C[n]); assert.ok(r && r.completa, `${n} lida por inteiro`); return { ...r.script, example: { target: 'none', expect: { selfLife: 0 } } }; };
const SC = { Explosao: lido('Explosao'), Castelo: lido('Castelo') };
function mesa(a, b, seed = 262) {
  const d = xs => xs.map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SC, first: 0, players: [{ name: 'A', deck: d(a) }, { name: 'B', deck: d(b) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  return limpaMao(s, 0);
}
const resolve = (s, escolha) => { for (let i = 0; i < 60 && (s.stack.length || s.pending); i++) { const pd = s.pending; s = pd ? act(s, (escolha && escolha(pd, s)) || legais(s, pd.p)[0]) : act(s, { t: 'pass', p: s.turn.priority }); } return s; };

test('M-581 · leitura: o castelo vira entersTappedUnless com um tipo; "tap up to one target creature" vira virar com upTo', () => {
  assert.equal(JSON.stringify(SC.Castelo.entersTappedUnless), JSON.stringify({ controlsSubtype: ['Island'] }));
  assert.equal(JSON.stringify(SC.Explosao.effects), JSON.stringify([{ do: 'damage', amount: 3, target: 'any' }, { do: 'tap', target: 'creature', upTo: true }]));
});

test('M-581 · 305.7: o castelo entra desvirado com uma Ilha e virado sem ela', () => {
  let s = mesa([['Castelo', 4], ['Swamp', 30], ['Island', 6]], [['Swamp', 40]]), c;
  [s, c] = poe(s, 0, 'Castelo', 'hand'); [s] = poe(s, 0, 'Swamp');
  let t = act(JSON.parse(JSON.stringify(s)), legais(s, 0, x => x.oid === c && /play/.test(x.t))[0]);
  assert.equal(t.objects[c].tapped, true, 'sem Ilha, entra virado');
  [s] = poe(s, 0, 'Island');
  t = act(s, legais(s, 0, x => x.oid === c && /play/.test(x.t))[0]);
  assert.equal(t.objects[c].tapped, false, 'com uma Ilha, entra desvirado');
});

test('M-581 · 601.2c/115.3: 3 de dano no oponente e virar a criatura dele; com zero alvos para virar, só o dano', () => {
  let s = mesa([['Explosao', 4], ['Island', 36]], [['Urso', 4], ['Swamp', 36]]), e, u;
  [s, e] = poe(s, 0, 'Explosao', 'hand'); [s] = poe(s, 0, 'Island'); [s, u] = poe(s, 1, 'Urso');
  const ofertas = legais(s, 0, x => x.t === 'cast' && x.oid === e), alvos = o => JSON.stringify(o.targets);
  const dois = ofertas.find(o => alvos(o) === JSON.stringify([{ player: 1 }, { oid: u }])), um = ofertas.find(o => alvos(o) === JSON.stringify([{ player: 1 }]));
  assert.ok(dois && um, 'oferece com e sem o segundo alvo');
  const vida = s.players[1].life;
  let t = resolve(act(JSON.parse(JSON.stringify(s)), dois));
  assert.equal(t.players[1].life, vida - 3); assert.equal(t.objects[u].tapped, true, 'o Urso virou');
  t = resolve(act(JSON.parse(JSON.stringify(s)), um));
  assert.equal(t.players[1].life, vida - 3); assert.equal(t.objects[u].tapped, false, 'sem segundo alvo, o Urso continua desvirado');
});
