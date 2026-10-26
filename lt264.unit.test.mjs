// M-584 · Sentinela do Pauper (cobertura/pauper.json de 26/10/2026 13:27 UTC: 593 de 594 listas a 100% no app, 1 carta pendente).
// Nettle Sentinel, texto da API da Scryfall de 26/10/2026 (campo `texto` do relatório): "This creature doesn't untap during your untap
// step. / Whenever you cast a green spell, you may untap this creature." O leitor ganha "Whenever you cast a/an <cor> spell" com uma cor só
// (105.2: mágica verde é a que tem verde entre as cores, multicolorida inclusive); o "you may" é a pergunta do gatilho (603.5).
// Carta aprovada por revisão independente; falham no motor anterior (a segunda frase ficava sem leitura).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, act, poe, legais, passaAte, limpaMao } from './listas.mjs';

const revisadas = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NETTLE = (() => { const c = revisadas.find(x => x.name === 'Nettle Sentinel'); assert.ok(c, 'texto da Scryfall em oficiais-revisadas.json'); return { keywords: [], colors: ['G'], cmc: 1, ...c }; })();
const urso = (name, colors, mana_cost = '{G}') => ({ name, mana_cost, cmc: 1, type_line: 'Creature — Bear', power: '2', toughness: '2', oracle_text: '', keywords: [], colors });
const C = {
  'Nettle Sentinel': NETTLE,
  Verde: urso('Verde', ['G']), Multi: urso('Multi', ['G', 'U']), Azul: urso('Azul', ['U']),
  Pedra: { name: 'Pedra', mana_cost: '{1}', cmc: 1, type_line: 'Artifact', oracle_text: '', keywords: [], colors: [] },
  Forest: { name: 'Forest', type_line: 'Basic Land — Forest', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {G}.)', colors: [] },
};
function mesa(nettles = 1) {
  const d = xs => xs.map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'pauper', seed: 584, mode: 'full', cards: C, first: 0, players: [
    { name: 'A', deck: d([['Nettle Sentinel', 4], ['Verde', 4], ['Multi', 4], ['Azul', 4], ['Pedra', 4], ['Forest', 40]]) },
    { name: 'B', deck: d([['Verde', 4], ['Forest', 56]]) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  s = limpaMao(s, 0);
  const ns = [];
  for (let i = 0; i < nettles; i++) { let n; [s, n] = poe(s, 0, 'Nettle Sentinel'); s.objects[n].tapped = true; s.objects[n].sick = false; ns.push(n); }
  for (let i = 0; i < 3; i++) [s] = poe(s, 0, 'Forest');
  return [s, ns];
}
const conjura = (s, oid) => { const a = legais(s, 0, x => x.t === 'cast' && x.oid === oid)[0]; assert.ok(a, `conjura ${s.objects[oid].name}`); return act(s, a); };
const resolve = (s, aceita) => {
  let perguntas = 0;
  for (let i = 0; i < 80 && (s.stack.length || s.pending); i++) {
    const pd = s.pending;
    if (!pd) { s = act(s, { t: 'pass', p: s.turn.priority }); continue; }
    const ls = legais(s, pd.p);
    if (pd.kind === 'may_pay') { perguntas++; s = act(s, ls.find(x => x.t === (aceita ? 'pay' : 'decline'))); }
    else s = act(s, ls[0]);
  }
  return [s, perguntas];
};

test('M-584 · Nettle Sentinel é lida por inteiro e aprovada (joga no app)', () => {
  assert.equal(S.coverage(NETTLE).level, 'completo');
});

test('M-584 · 502.3: virada, não desvira no passo de desvirar do controlador', () => {
  let [s, [n]] = mesa(); let f; [s, f] = poe(s, 0, 'Forest'); s.objects[f].tapped = true;
  const t = s.turn.number;
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && x.turn.number > t && !x.stack.length && !x.pending);
  assert.equal(s.objects[n].tapped, true, 'Nettle continua virada');
  assert.equal(s.objects[f].tapped, false, 'o terreno desvira');
});

test('M-584 · mágica verde (mono e multicolorida) pergunta; aceitar desvira, recusar deixa virada', () => {
  for (const nome of ['Verde', 'Multi']) for (const aceita of [true, false]) {
    let [s, [n]] = mesa(), u; [s, u] = poe(s, 0, nome, 'hand');
    let q; [s, q] = resolve(conjura(s, u), aceita);
    assert.equal(q, 1, `${nome}: uma pergunta`);
    assert.equal(s.objects[n].tapped, !aceita, `${nome} ${aceita ? 'aceita' : 'recusa'}`);
  }
});

test('M-584 · mágica não verde (azul, incolor) não dispara; duas Nettles disparam cada uma', () => {
  for (const nome of ['Azul', 'Pedra']) {
    let [s, [n]] = mesa(), u; [s, u] = poe(s, 0, nome, 'hand');
    let q; [s, q] = resolve(conjura(s, u), true);
    assert.equal(q, 0, `${nome}: sem pergunta`); assert.equal(s.objects[n].tapped, true);
  }
  let [s, ns] = mesa(2), u; [s, u] = poe(s, 0, 'Verde', 'hand');
  let q; [s, q] = resolve(conjura(s, u), true);
  assert.equal(q, 2, 'duas perguntas'); assert.ok(ns.every(n => !s.objects[n].tapped), 'as duas desviram');
});
