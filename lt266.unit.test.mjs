// M-586 · Sentinela do Pauper (cobertura/pauper.json de 29/10/2026 13:33 UTC: 585 de 586 listas a 100% no app, 2 cartas pendentes).
// Custodi Squire, texto da API da Scryfall de 29/10/2026 (campo `texto` do relatório): "Flying / Will of the council — When this creature
// enters, starting with you, each player votes for an artifact, creature, or enchantment card in your graveyard. Return each card with the
// most votes or tied for most votes to your hand." Votar (CR 701.38) entra no motor: começando por quem controla, cada jogador, na ordem de
// turno, vota numa carta que sirva (uma escolha de quem vota, pública); a mais votada e as empatadas com ela voltam para a mão. Carta
// aprovada por revisão independente; falham no motor anterior (a frase do voto ficava sem leitura e a carta, parcial).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, act, poe, legais, passaAte, limpaMao } from './listas.mjs';

const revisadas = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const SQUIRE = (() => { const c = revisadas.find(x => x.name === 'Custodi Squire'); assert.ok(c, 'texto da Scryfall em oficiais-revisadas.json'); return { keywords: ['Flying', 'Will of the council'], colors: ['W'], cmc: 5, ...c }; })();
const C = {
  'Custodi Squire': SQUIRE,
  Urso: { name: 'Urso', mana_cost: '{1}{G}', cmc: 2, type_line: 'Creature — Bear', power: '2', toughness: '2', oracle_text: '', keywords: [], colors: ['G'] },
  Pedra: { name: 'Pedra', mana_cost: '{1}', cmc: 1, type_line: 'Artifact', oracle_text: '', keywords: [], colors: [] },
  Aura: { name: 'Aura', mana_cost: '{W}', cmc: 1, type_line: 'Enchantment', oracle_text: '', keywords: [], colors: ['W'] },
  Raio: { name: 'Raio', mana_cost: '{R}', cmc: 1, type_line: 'Instant', oracle_text: '', keywords: [], colors: ['R'] },
  Plains: { name: 'Plains', type_line: 'Basic Land — Plains', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {W}.)', colors: [] },
};
function mesa(quem = 0, cemiterio = ['Urso', 'Pedra', 'Raio'], doOutro = []) {
  const dk = xs => xs.map(([name, qty]) => ({ name, qty, zone: 'main' }));
  const lista = dk([['Custodi Squire', 4], ['Urso', 8], ['Pedra', 8], ['Aura', 4], ['Raio', 4], ['Plains', 32]]);
  let s = E.createGame({ format: 'pauper', seed: 586, mode: 'full', cards: C, first: quem, players: [{ name: 'A', deck: lista }, { name: 'B', deck: lista }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === quem && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  s = limpaMao(s, quem);
  for (let i = 0; i < 5; i++) [s] = poe(s, quem, 'Plains');
  const cem = {};
  for (const n of cemiterio) { let o; [s, o] = poe(s, quem, n, 'graveyard'); cem[n] = o; }
  for (const n of doOutro) [s] = poe(s, 1 - quem, n, 'graveyard');
  let q; [s, q] = poe(s, quem, 'Custodi Squire', 'hand');
  const c = legais(s, quem, x => x.t === 'cast' && x.oid === q)[0]; assert.ok(c, 'conjura o Custodi Squire');
  return [act(s, c), cem, q];
}
/** Resolve tudo; `votos` diz em que carta cada jogador vota, na ordem em que a votação pede. Devolve [estado, quem votou, candidatas vistas]. */
function vota(s, votos) {
  const ordem = [], vistas = [];
  for (let i = 0; i < 80 && (s.stack.length || s.pending); i++) {
    const pd = s.pending;
    if (!pd) { s = act(s, { t: 'pass', p: s.turn.priority }); continue; }
    if (pd.kind === 'pick' && pd.label === 'votar') {
      ordem.push(pd.p); vistas.push(Array.from(pd.from, o => s.objects[o].name).sort());
      assert.equal(pd.min, 1); assert.equal(pd.max, 1);
      const alvo = votos[ordem.length - 1], a = legais(s, pd.p, x => x.t === 'pick' && s.objects[x.oid].name === alvo)[0];
      assert.ok(a, `voto em ${alvo}`); s = act(s, a); continue;
    }
    s = act(s, legais(s, pd.p)[0]);
  }
  return [s, ordem, vistas];
}
const zona = (s, oid) => s.objects[oid].zone;

test('M-586 · Custodi Squire é lida por inteiro e aprovada (joga no app)', () => {
  assert.equal(S.coverage(SQUIRE).level, 'completo');
});

test('M-586 · 701.38: votos diferentes empatam com um cada: as duas voltam para a mão; quem controla vota primeiro', () => {
  let [s, cem] = mesa(0);
  let ordem, vistas; [s, ordem, vistas] = vota(s, ['Urso', 'Pedra']);
  assert.deepEqual(ordem, [0, 1], 'A (quem controla) e depois B');
  assert.deepEqual(vistas[0], ['Pedra', 'Urso'], 'só artefato, criatura ou encantamento: a instantânea não é candidata');
  assert.equal(zona(s, cem.Urso), 'hand'); assert.equal(zona(s, cem.Pedra), 'hand'); assert.equal(zona(s, cem.Raio), 'graveyard');
});

test('M-586 · os dois votam na mesma carta: só ela volta', () => {
  let [s, cem] = mesa(0);
  [s] = vota(s, ['Pedra', 'Pedra']);
  assert.equal(zona(s, cem.Pedra), 'hand'); assert.equal(zona(s, cem.Urso), 'graveyard');
});

test('M-586 · "starting with you": no turno de B, com B controlando, B vota primeiro; o voto é sobre o cemitério de quem controla', () => {
  let [s, cem] = mesa(1, ['Aura', 'Urso'], ['Pedra']);
  let ordem, vistas; [s, ordem, vistas] = vota(s, ['Aura', 'Aura']);
  assert.deepEqual(ordem, [1, 0]);
  assert.deepEqual(vistas[1], ['Aura', 'Urso'], 'a Pedra no cemitério de A não é candidata');
  assert.equal(zona(s, cem.Aura), 'hand'); assert.equal(s.objects[cem.Aura].owner, 1); assert.equal(zona(s, cem.Urso), 'graveyard');
});

test('M-586 · sem carta que sirva no cemitério, ninguém vota e nada volta', () => {
  let [s, cem] = mesa(0, ['Raio']);
  let ordem; [s, ordem] = vota(s, []);
  assert.deepEqual(ordem, []); assert.equal(zona(s, cem.Raio), 'graveyard');
  assert.equal(s.zones[0].battlefield.some(o => s.objects[o].name === 'Custodi Squire'), true);
});
