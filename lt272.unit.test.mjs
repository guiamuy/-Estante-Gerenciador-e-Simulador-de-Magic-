// M-591 · leitor e núcleo, competitivos na ordem gulosa da sentinela (texto da Scryfall de 25/10/2026 em cobertura/resumo.json):
// "Whenever you draw a card, you gain 2 life." e "Whenever an opponent draws a card, they lose 2 life." (Sheoldred, the Apocalypse).
// Gatilho de compra para toda carta comprada (121.2: comprar duas são duas compras, dois gatilhos), não só a N-ésima do turno; "they"
// é o jogador que comprou. Cartas de teste com nomes inventados; a aprovação das cartas do catálogo é da homologacao. Falha no motor
// anterior (as duas frases ficavam sem leitura e o gatilho só existia para uma compra específica do turno).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, act, poe, legais, passaAte, limpaMao } from './listas.mjs';
import { loadModules } from './_load.mjs';
const L = loadModules().leitor;
const C = {
  Rainha: { name: 'Rainha', mana_cost: '{2}{B}{B}', cmc: 4, type_line: 'Legendary Creature — Phyrexian Praetor', oracle_text: 'Deathtouch\nWhenever you draw a card, you gain 2 life.\nWhenever an opponent draws a card, they lose 2 life.', power: '4', toughness: '5', keywords: ['Deathtouch'], colors: ['B'] },
  Estudo: { name: 'Estudo', mana_cost: '{B}', cmc: 1, type_line: 'Instant', oracle_text: 'Target player draws two cards.', keywords: [], colors: ['B'] },
  Swamp: { name: 'Swamp', type_line: 'Basic Land — Swamp', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {B}.)', colors: [] },
};
const ex = { example: { target: 'none', expect: { selfLife: 0 } } };
const r0 = L.ler(C.Rainha);
const SC = { Rainha: { ...r0.script, ...ex }, Estudo: { name: 'Estudo', effects: [{ do: 'draw', amount: 2, target: 'player' }], ...ex } };
function mesa(seed = 272) {
  const d = xs => xs.map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SC, first: 0, players: [{ name: 'A', deck: d([['Rainha', 2], ['Estudo', 4], ['Swamp', 34]]) }, { name: 'B', deck: d([['Swamp', 40]]) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  s = limpaMao(s, 0); let r; [s, r] = poe(s, 0, 'Rainha'); return s;
}
const resolve = s => { for (let i = 0; i < 40 && s.stack.length && !s.pending; i++) s = act(s, { t: 'pass', p: s.turn.priority }); return s; };

test('M-591 · leitura: dois gatilhos de compra, toda carta, "they" é quem comprou', () => {
  assert.ok(r0 && r0.completa, 'lida por inteiro');
  assert.equal(JSON.stringify(r0.script.abilities), JSON.stringify([
    { kind: 'triggered', when: { evento: 'compra', n: 'toda', quem: 'voce' }, effects: [{ do: 'gain', amount: 2 }] },
    { kind: 'triggered', when: { evento: 'compra', n: 'toda', quem: 'oponente' }, effects: [{ do: 'lose', amount: 2, target: 'that-player' }] }]));
  assert.equal(loadModules().scripts.validateScript(SC.Rainha).length, 0);
});

test('M-591 · passo de compra: o oponente perde 2; você ganha 2', () => {
  let s = mesa(); const a0 = s.players[0].life, b0 = s.players[1].life;
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  assert.equal(s.players[1].life, b0 - 2, 'B perdeu 2 ao comprar'); assert.equal(s.players[0].life, a0, 'A não ganhou nada com a compra de B');
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  assert.equal(s.players[0].life, a0 + 2, 'A ganhou 2 ao comprar');
});

test('M-591 · 121.2: comprar duas cartas dispara duas vezes, de qualquer lado', () => {
  for (const [alvo, quem, delta] of [['p0', 0, +4], ['p1', 1, -4]]) {
    let s = mesa(); let e; [s, e] = poe(s, 0, 'Estudo', 'hand'); [s] = poe(s, 0, 'Swamp'); const v0 = s.players[quem].life;
    s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === e && JSON.stringify(x).includes(`"${alvo}"`) || (x.t === 'cast' && x.oid === e && (x.targets || []).some(t => t.player === quem)))[0]);
    s = resolve(s); s = resolve(s);
    assert.equal(s.players[quem].life, v0 + delta, `${alvo}: duas compras, dois gatilhos`);
  }
});
