// M-585 · Sentinela do Pauper (cobertura/pauper.json de 29/10/2026 13:33 UTC: 585 de 586 listas a 100% no app, 2 cartas pendentes).
// Visionary's Dance, texto da API da Scryfall de 29/10/2026 (campo `texto` do relatório): "Create two 3/3 blue and red Elemental creature
// tokens with flying. / {2}, Discard this card: Look at the top two cards of your library. Put one of them into your hand and the other into
// your graveyard." O leitor ganha a habilidade de mágica com "Discard this card" no custo (113.6: funciona da mão) e "Look at the top N…
// Put K of them into your hand and the other/rest into your graveyard" (701.20: olhar é privado). Carta aprovada por revisão independente;
// falham no motor anterior (a habilidade ficava sem leitura e a carta, manual).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, act, poe, legais, passaAte, limpaMao, temPalavra } from './listas.mjs';

const revisadas = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const DANCA = (() => { const c = revisadas.find(x => x.name === "Visionary's Dance"); assert.ok(c, 'texto da Scryfall em oficiais-revisadas.json'); return { keywords: [], colors: ['U', 'R'], cmc: 7, ...c }; })();
const C = {
  "Visionary's Dance": DANCA,
  Pedra: { name: 'Pedra', mana_cost: '{1}', cmc: 1, type_line: 'Artifact', oracle_text: '', keywords: [], colors: [] },
  Island: { name: 'Island', type_line: 'Basic Land — Island', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {U}.)', colors: [] },
  Mountain: { name: 'Mountain', type_line: 'Basic Land — Mountain', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {R}.)', colors: [] },
};
function mesa(terras = 7) {
  const dk = xs => xs.map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'pauper', seed: 585, mode: 'full', cards: C, first: 0, players: [
    { name: 'A', deck: dk([["Visionary's Dance", 4], ['Pedra', 26], ['Island', 15], ['Mountain', 15]]) },
    { name: 'B', deck: dk([['Pedra', 4], ['Island', 56]]) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  s = limpaMao(s, 0);
  for (let i = 0; i < terras; i++) [s] = poe(s, 0, i % 2 ? 'Mountain' : 'Island');
  let d; [s, d] = poe(s, 0, "Visionary's Dance", 'hand');
  return [s, d];
}
const resolveTudo = (s, escolhe) => {
  for (let i = 0; i < 80 && (s.stack.length || s.pending); i++) {
    const pd = s.pending;
    if (!pd) { s = act(s, { t: 'pass', p: s.turn.priority }); continue; }
    s = escolhe ? escolhe(s, pd) : act(s, legais(s, pd.p)[0]);
  }
  return s;
};

test('M-585 · Visionary\'s Dance é lida por inteiro e aprovada (joga no app)', () => {
  assert.equal(S.coverage(DANCA).level, 'completo');
});

test('M-585 · conjurada: duas fichas 3/3 azul e vermelha Elemental com voar', () => {
  let [s, d] = mesa();
  const c = legais(s, 0, x => x.t === 'cast' && x.oid === d)[0]; assert.ok(c, 'conjura com sete terrenos');
  s = resolveTudo(act(s, c));
  const fichas = s.zones[0].battlefield.map(o => s.objects[o]).filter(o => o.token);
  assert.equal(fichas.length, 2);
  for (const f of fichas) {
    assert.equal(f.name, 'Elemental');
    const st = E.stats(s, f);
    assert.equal(st.power, 3); assert.equal(st.toughness, 3);
    assert.deepEqual([...s.facts[f.name].colors].sort(), ['R', 'U']);
    assert.ok(temPalavra(s, f.oid, 'flying'), 'voar');
  }
  assert.equal(s.objects[d].zone, 'graveyard');
});

test('M-585 · {2}, descartar da mão: olha as duas do topo, uma vai para a mão e a outra para o cemitério', () => {
  let [s, d] = mesa(2);
  const topo = s.zones[0].library.slice(0, 2), terceira = s.zones[0].library[2];
  const a = legais(s, 0, x => x.t === 'activate' && x.oid === d && x.fromHand)[0]; assert.ok(a, 'ativa da mão com {2}');
  assert.equal(legais(s, 0, x => x.t === 'cast' && x.oid === d).length, 0, 'com dois terrenos não conjura');
  s = act(s, a);
  assert.equal(s.objects[d].zone, 'graveyard', 'descartada como custo');
  assert.equal(s.zones[0].battlefield.filter(o => s.objects[o].tapped).length, 2, 'pagou {2}');
  let viu = null;
  s = resolveTudo(s, (x, pd) => {
    if (pd.kind === 'pick' && !viu) { viu = pd.from.slice(); assert.deepEqual(new Set(pd.from), new Set(topo)); assert.equal(pd.min, 1); assert.equal(pd.max, 1);
      const ls = legais(x, pd.p); const pega = ls.find(y => y.oid === topo[1]) || ls[0]; return act(x, pega); }
    return act(x, legais(x, pd.p)[0]);
  });
  assert.ok(viu, 'escolhe entre as duas do topo');
  const naMao = topo.filter(o => s.objects[o].zone === 'hand'), noCem = topo.filter(o => s.objects[o].zone === 'graveyard');
  assert.equal(naMao.length, 1); assert.equal(noCem.length, 1);
  assert.equal(s.zones[0].library[0], terceira, 'o grimório continua da terceira');
  assert.equal(s.zones[0].battlefield.filter(o => s.objects[o].token).length, 0, 'a habilidade não cria fichas');
});

test('M-585 · a habilidade só funciona da mão', () => {
  let [s, d] = mesa(2);
  s = JSON.parse(JSON.stringify(s)); s.zones[0].hand.splice(s.zones[0].hand.indexOf(d), 1); s.zones[0].graveyard.push(d); s.objects[d].zone = 'graveyard';
  assert.equal(legais(s, 0, x => x.t === 'activate' && x.oid === d).length, 0);
});
