// M-629 · Sentinela do Pauper (cobertura/pauper.json de 12/11/2026 13:47 UTC: pendências que a M-623 deixou manuais).
// Texto da API da Scryfall de 12/11/2026 (campo `texto` do relatório, guardado em .listas/oficiais-revisadas.json).
//   Exhume — "Each player puts a creature card from their graveyard onto the battlefield." (exuma_m: sem alvo; cada jogador
//   escolhe, a partir de quem está na vez; todas entram juntas, sob o controle do dono)
// Falha no motor anterior: Exhume ficava fora do app (mágica sem script · manual).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, act, poe, legais, passaAte, limpaMao } from './listas.mjs';

const revisadas = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const de = n => ({ keywords: [], colors: [], cmc: 0, ...revisadas.find(x => x.name === n) });
const terreno = (n, c) => ({ name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${c}}.)`, colors: [] });
const criatura = (n, p, t) => ({ name: n, type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', power: String(p), toughness: String(t), colors: ['G'] });
const C = { Exhume: de('Exhume'), Swamp: terreno('Swamp', 'B'), 'Grizzly Bears': criatura('Grizzly Bears', 2, 2), 'Hill Giant': { ...criatura('Hill Giant', 3, 3), type_line: 'Creature — Giant' },
  'Lightning Bolt': { name: 'Lightning Bolt', type_line: 'Instant', mana_cost: '{R}', cmc: 1, keywords: [], oracle_text: 'Lightning Bolt deals 3 damage to any target.', colors: ['R'] } };

test('M-629 · Exhume joga no app (texto oficial guardado, script à mão)', () => {
  assert.ok(revisadas.find(x => x.name === 'Exhume'), 'texto oficial guardado');
  assert.ok(S.SCRIPTS.Exhume, 'script à mão');
  assert.equal(S.coverage(C.Exhume).level, 'completo');
});

function mesa(seed = 629) {
  const lista = [['Exhume', 8], ['Grizzly Bears', 8], ['Hill Giant', 8], ['Lightning Bolt', 6], ['Swamp', 30]].map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'pauper', seed, mode: 'full', cards: C, players: [{ name: 'A', deck: lista }, { name: 'B', deck: lista }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  return limpaMao(limpaMao(s, 0), 1);
}
function conjura(s) {
  let ex;
  for (let i = 0; i < 2; i++) [s] = poe(s, 0, 'Swamp');
  [s, ex] = poe(s, 0, 'Exhume', 'hand');
  s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === ex)[0]);
  return passaAte(s, x => !!x.pending || !x.stack.length);
}
const noCampo = (s, p) => [...s.zones[p].battlefield].map(o => s.objects[o].name).filter(n => n !== 'Swamp').sort();

test('M-629 · Exhume: quem está na vez escolhe primeiro, depois o oponente; as duas entram juntas, cada uma sob o dono', () => {
  let s = mesa(), urso, gigante, raio;
  [s, urso] = poe(s, 0, 'Grizzly Bears', 'graveyard');
  [s, gigante] = poe(s, 0, 'Hill Giant', 'graveyard');
  [s] = poe(s, 1, 'Grizzly Bears', 'graveyard');
  [s, raio] = poe(s, 1, 'Lightning Bolt', 'graveyard');
  s = conjura(s);
  assert.equal(s.pending && s.pending.kind, 'pick', 'A escolhe entre as duas criaturas');
  assert.equal(s.pending.p, 0);
  assert.deepEqual([...s.pending.from].map(String).sort(), [urso, gigante].map(String).sort(), 'só criaturas do próprio cemitério');
  s = act(s, { t: 'pick', p: 0, oid: gigante });
  if (s.pending && s.pending.kind === 'pick' && s.pending.p === 0) s = act(s, { t: 'pick_done', p: 0 });
  // B tem uma criatura só: vai sem pergunta; ninguém entrou antes de todos escolherem
  assert.ok(!s.pending, 'nada mais a escolher');
  assert.deepEqual(noCampo(s, 0), ['Hill Giant']);
  assert.deepEqual(noCampo(s, 1), ['Grizzly Bears'], 'a criatura de B entra sob B');
  assert.equal(s.objects[gigante].controller, 0);
  assert.equal(s.objects[urso].zone, 'graveyard');
  assert.equal(s.objects[raio].zone, 'graveyard', 'mágica não é criatura');
});

test('M-629 · Exhume: o oponente também escolhe; sem criatura no cemitério, o jogador não põe nada', () => {
  let s = mesa(630), b1, b2;
  [s, b1] = poe(s, 1, 'Grizzly Bears', 'graveyard');
  [s, b2] = poe(s, 1, 'Hill Giant', 'graveyard');
  s = conjura(s);
  assert.equal(s.pending && s.pending.kind, 'pick');
  assert.equal(s.pending.p, 1, 'A não tem criatura: a escolha passa para B');
  s = act(s, { t: 'pick', p: 1, oid: b1 });
  if (s.pending && s.pending.kind === 'pick' && s.pending.p === 1) s = act(s, { t: 'pick_done', p: 1 });
  assert.ok(!s.pending);
  assert.deepEqual(noCampo(s, 0), []);
  assert.deepEqual(noCampo(s, 1), ['Grizzly Bears']);
  assert.equal(s.objects[b2].zone, 'graveyard');
  assert.equal(s.zones[0].graveyard.map(o => s.objects[o].name).includes('Exhume'), true, 'Exhume vai para o cemitério');
});
