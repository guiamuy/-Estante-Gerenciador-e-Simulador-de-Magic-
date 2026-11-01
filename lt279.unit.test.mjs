// M-598 · Sentinela do Pauper (cobertura/pauper.json de 01/11/2026 13:47 UTC: 627 de 628 listas a 100% no app, 1 carta pendente).
// Texto da API da Scryfall de 01/11/2026 (campo `texto` do relatório, guardado em .listas/oficiais-revisadas.json):
//   Dreams of Laguna — "Surveil 1, then draw a card. / Flashback {3}{U}" (lida pelo leitor; aprovada aqui)
// Falha no motor anterior: a carta ficava fora do app ("lida pelo motor, em revisão").
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, act, poe, legais, passaAte, limpaMao } from './listas.mjs';

const revisadas = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const dol = revisadas.find(x => x.name === 'Dreams of Laguna');
const terreno = (n, c) => ({ name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${c}}.)`, colors: [] });
const C = {
  'Dreams of Laguna': { keywords: [], colors: ['U'], cmc: 2, ...dol },
  Urso: { name: 'Urso', mana_cost: '{1}{G}', cmc: 2, type_line: 'Creature — Bear', power: '2', toughness: '2', oracle_text: '', keywords: [], colors: ['G'] },
  Island: terreno('Island', 'U'),
};
function mesa(ilhas) {
  const lista = [['Dreams of Laguna', 4], ['Urso', 26], ['Island', 30]].map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'pauper', seed: 598, mode: 'full', cards: C, players: [{ name: 'A', deck: lista }, { name: 'B', deck: lista }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  s = limpaMao(s, 0);
  for (let i = 0; i < ilhas; i++) [s] = poe(s, 0, 'Island');
  return s;
}
/** Resolve a pilha; na decisão do vigiar, `escolha(pd, s)` responde (ou a primeira ação legal). */
function resolveTudo(s, escolha = () => null) {
  for (let i = 0; i < 80 && (s.stack.length || s.pending); i++) {
    const pd = s.pending;
    if (!pd) { s = act(s, { t: 'pass', p: s.turn.priority }); continue; }
    s = act(s, escolha(pd, s) || legais(s, pd.p)[0]);
  }
  return s;
}
/** Vigiar: nada fica no topo (`pick_done` sem escolher) — o resto vai ao cemitério. */
const mandaAoCemiterio = (pd, s) => (pd.label === 'surveil' ? legais(s, pd.p).find(a => a.t === 'pick_done') : null) || null;

test('M-598 · Dreams of Laguna joga no app (lida por inteiro e aprovada)', () => {
  assert.ok(S.APROVADAS['Dreams of Laguna'], 'aprovada');
  assert.equal(S.coverage(C['Dreams of Laguna']).level, 'completo');
});

test('M-598 · Dreams of Laguna: vigiar 1 antes de comprar — a carta mandada ao cemitério não é a comprada', () => {
  let s = mesa(2); let d;
  [s, d] = poe(s, 0, 'Dreams of Laguna', 'hand');
  const topo = s.zones[0].library[0], segunda = s.zones[0].library[1];
  const c = legais(s, 0, x => x.t === 'cast' && x.oid === d)[0]; assert.ok(c, 'conjura com {1}{U}');
  s = resolveTudo(act(s, c), mandaAoCemiterio);
  assert.equal(s.objects[d].zone, 'graveyard');
  assert.equal(s.objects[topo].zone, 'graveyard', 'a carta do topo foi vigiada para o cemitério');
  assert.ok(s.zones[0].hand.includes(segunda), 'comprou a carta de baixo dela');
});

test('M-598 · Dreams of Laguna: flashback {3}{U} do cemitério, compra e vai para o exílio', () => {
  let s = mesa(4); let d;
  [s, d] = poe(s, 0, 'Dreams of Laguna', 'graveyard');
  const fb = legais(s, 0, x => x.t === 'cast' && x.oid === d && x.flashback)[0]; assert.ok(fb, 'flashback oferecido com quatro Ilhas');
  const mao = s.zones[0].hand.length;
  s = resolveTudo(act(s, fb));
  assert.equal(s.zones[0].hand.length, mao + 1, 'comprou uma carta');
  assert.equal(s.objects[d].zone, 'exile', 'exilada depois do flashback (702.34a)');
});

test('M-598 · Dreams of Laguna: sem {3}{U}, o flashback não é oferecido', () => {
  let s = mesa(3); let d;
  [s, d] = poe(s, 0, 'Dreams of Laguna', 'graveyard');
  assert.equal(legais(s, 0, x => x.t === 'cast' && x.oid === d).length, 0);
});
