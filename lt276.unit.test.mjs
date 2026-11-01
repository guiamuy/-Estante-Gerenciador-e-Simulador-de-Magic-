// M-595 · leitor e núcleo, competitivos na ordem gulosa da sentinela (texto da Scryfall de 25/10/2026 em cobertura/resumo.json):
// "This creature gets +2/+0 for every seven cards in your graveyard." (Dark Matter Manipulator; o "mill three cards" ao entrar já era
// lido). 613.4c: o bônus é conferido continuamente; conta só grupos completos de sete cartas do seu cemitério (6 dá zero, 14 dá dois).
// Cartas de teste com nomes inventados; a aprovação das cartas do catálogo é da homologacao. Falha no motor anterior (frase sem leitura).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, act, poe, passaAte, limpaMao } from './listas.mjs';
import { loadModules } from './_load.mjs';
const L = loadModules().leitor;
const C = {
  Bruxo: { name: 'Bruxo', mana_cost: '{B}', cmc: 1, type_line: 'Creature — Human Warlock', oracle_text: 'When this creature enters, mill three cards.\nThis creature gets +2/+0 for every seven cards in your graveyard.', power: '1', toughness: '2', keywords: ['Mill'], colors: ['B'] },
  Swamp: { name: 'Swamp', type_line: 'Basic Land — Swamp', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {B}.)', colors: [] },
};
const ex = { example: { target: 'none', expect: { selfLife: 0 } } };
const r0 = L.ler(C.Bruxo);
const SC = { Bruxo: { ...r0.script, ...ex } };
function mesa(seed = 276) {
  const d = xs => xs.map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SC, first: 0, players: [{ name: 'A', deck: d([['Bruxo', 2], ['Swamp', 38]]) }, { name: 'B', deck: d([['Swamp', 40]]) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  s = limpaMao(s, 0); let b; [s, b] = poe(s, 0, 'Bruxo'); return { s, b };
}

test('M-595 · leitura: +2/+0 por grupo de sete cartas no seu cemitério', () => {
  assert.ok(r0 && r0.completa, 'lida por inteiro');
  assert.equal(JSON.stringify(r0.script.self), JSON.stringify({ perPower: 2, perToughness: 0, per: 'setes-no-seu-cemiterio' }));
  assert.equal(loadModules().scripts.validateScript(SC.Bruxo).length, 0);
});

test('M-595 · 613.4c: 0 a 6 cartas → 1/2; 7 → 3/2; 13 → 3/2; 14 → 5/2; o cemitério do oponente não conta', () => {
  let { s, b } = mesa(); const P = () => { const t = E.stats(s, s.objects[b]); return [t.power, t.toughness]; };
  const enche = (q, n) => { for (let i = 0; i < n; i++) [s] = poe(s, q, 'Swamp', 'graveyard'); };
  const base = s.zones[0].graveyard.length; assert.equal(base, 0);
  enche(1, 20); assert.deepEqual(P(), [1, 2], 'o cemitério de B não conta');
  enche(0, 6); assert.deepEqual(P(), [1, 2], 'seis: nenhum grupo completo');
  enche(0, 1); assert.deepEqual(P(), [3, 2], 'sete: +2/+0');
  enche(0, 6); assert.deepEqual(P(), [3, 2], 'treze: um grupo');
  enche(0, 1); assert.deepEqual(P(), [5, 2], 'catorze: dois grupos');
});
