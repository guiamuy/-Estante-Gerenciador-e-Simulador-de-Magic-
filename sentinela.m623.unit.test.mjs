// M-623 · Sentinela do Pauper (cobertura/pauper.json de 12/11/2026 13:47 UTC: 678 de 686 listas a 100% no app, 10 cartas pendentes).
// Texto da API da Scryfall de 12/11/2026 (campo `texto` do relatório, guardado em .listas/oficiais-revisadas.json).
//   2 lidas aprovadas pela revisão independente: Exclude, Ferenginar
//   3 com script à mão sobre primitivas novas pequenas:
//     Grip of Amnesia — "counter … unless its controller exiles all cards from their graveyard" (unless.exilaCemiterio)
//     Memory Leak — você escolhe uma carta que não seja terreno da mão OU do cemitério do oponente (exila_mao_ou_cemiterio)
//     Final Frontier — Beam me up: lançar do cemitério devolvendo uma criatura sua à mão (custo adicional returnCreature, depois exila)
// Falha no motor anterior: as cinco ficavam fora do app (lida em revisão · manual).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, act, poe, legais, passaAte, limpaMao } from './listas.mjs';

const revisadas = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const de = n => ({ keywords: [], colors: [], cmc: 0, ...revisadas.find(x => x.name === n) });
const LIDAS = ['Exclude', 'Ferenginar'];
const MAO = ['Grip of Amnesia', 'Memory Leak', 'Final Frontier'];
const terreno = (n, c) => ({ name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${c}}.)`, colors: [] });
const C = Object.fromEntries([...LIDAS, ...MAO].map(n => [n, de(n)]));
C.Island = terreno('Island', 'U'); C.Forest = terreno('Forest', 'G'); C.Swamp = terreno('Swamp', 'B');
C['Grizzly Bears'] = { name: 'Grizzly Bears', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', power: '2', toughness: '2', colors: ['G'] };
C['Lightning Bolt'] = { name: 'Lightning Bolt', type_line: 'Instant', mana_cost: '{R}', cmc: 1, keywords: [], oracle_text: 'Lightning Bolt deals 3 damage to any target.', colors: ['R'] };

test('M-623 · as cinco cartas jogam no app (duas aprovadas, três à mão)', () => {
  for (const n of [...LIDAS, ...MAO]) {
    assert.ok(revisadas.find(x => x.name === n), `${n}: texto oficial guardado`);
    assert.equal(S.coverage(C[n]).level, 'completo', n);
  }
  for (const n of LIDAS) { assert.ok(S.APROVADAS[n], `${n} aprovada`); assert.equal(S.APROVADAS[n].texto, S.assinaturaRevisao(C[n]), `${n}: assinatura`); }
  for (const n of MAO) assert.ok(S.SCRIPTS[n], `${n}: script à mão`);
});

function mesa(seed = 623) {
  const lista = [['Grip of Amnesia', 6], ['Memory Leak', 6], ['Final Frontier', 6], ['Grizzly Bears', 6], ['Ferenginar', 4], ['Lightning Bolt', 4], ['Swamp', 6], ['Island', 12], ['Forest', 12]].map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'pauper', seed, mode: 'full', cards: C, players: [{ name: 'A', deck: lista }, { name: 'B', deck: lista }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  return limpaMao(limpaMao(s, 0), 1);
}

// A conjura os Ursos; B responde com Grip of Amnesia. Devolve o estado com a decisão de A aberta.
function gripNosUrsos(cemiterioDeA) {
  let s = mesa(); let u, g;
  for (let i = 0; i < 2; i++) [s] = poe(s, 0, 'Forest');
  for (let i = 0; i < 2; i++) [s] = poe(s, 1, 'Island');
  for (const n of cemiterioDeA) [s] = poe(s, 0, n, 'graveyard');
  [s, u] = poe(s, 0, 'Grizzly Bears', 'hand');
  [s, g] = poe(s, 1, 'Grip of Amnesia', 'hand');
  s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === u)[0]);
  s = act(s, { t: 'pass', p: 0 });
  const resposta = legais(s, 1, x => x.t === 'cast' && x.oid === g && (x.targets || []).some(t => t.oid === u))[0];
  assert.ok(resposta, 'B pode mirar os Ursos na pilha');
  s = act(s, resposta);
  s = passaAte(s, x => !!x.pending || !x.stack.some(o => o === g || (s.objects[o] || {}).name === 'Grip of Amnesia'));
  return { s, u };
}

test('M-623 · Grip of Amnesia: quem exila o cemitério salva a mágica; quem conjurou compra', () => {
  let { s, u } = gripNosUrsos(['Island', 'Lightning Bolt']);
  assert.equal(s.pending && s.pending.kind, 'may_pay', 'o controlador da mágica decide');
  assert.equal(s.pending.p, 0);
  const maoB = s.zones[1].hand.length;
  s = act(s, legais(s, 0, x => x.t === 'pay')[0]);
  assert.equal(s.zones[0].graveyard.length, 0, 'cemitério de A exilado');
  assert.ok(s.zones[0].exile.length >= 2, 'as cartas foram ao exílio');
  assert.equal(s.zones[1].hand.length, maoB + 1, 'B comprou uma carta');
  s = passaAte(s, x => !x.stack.length && !x.pending);
  assert.equal(s.objects[u].zone, 'battlefield', 'os Ursos resolveram');
});

test('M-623 · Grip of Amnesia: quem recusa tem a mágica anulada; cemitério vazio também pode ser "exilado"', () => {
  let { s, u } = gripNosUrsos(['Lightning Bolt']);
  const maoB = s.zones[1].hand.length;
  s = act(s, legais(s, 0, x => x.t === 'decline')[0]);
  assert.equal(s.zones[1].hand.length, maoB + 1, 'B comprou mesmo com a mágica anulada');
  s = passaAte(s, x => !x.stack.length && !x.pending);
  assert.equal(s.objects[u].zone, 'graveyard', 'anulada');
  assert.ok(s.zones[0].graveyard.some(x => s.objects[x].name === 'Lightning Bolt'), 'o cemitério ficou');
  ({ s, u } = gripNosUrsos([]));
  assert.ok(legais(s, 0, x => x.t === 'pay').length, 'com o cemitério vazio a opção de exilar existe (e salva a mágica)');
});

test('M-623 · Memory Leak: escolhe carta que não seja terreno da mão ou do cemitério do oponente', () => {
  let s = mesa(); let m, raio, ursos, ilha;
  for (let i = 0; i < 3; i++) [s] = poe(s, 0, 'Swamp');
  [s, m] = poe(s, 0, 'Memory Leak', 'hand');
  [s, raio] = poe(s, 1, 'Lightning Bolt', 'graveyard');
  [s, ilha] = poe(s, 1, 'Island', 'graveyard');
  [s, ursos] = poe(s, 1, 'Grizzly Bears', 'hand');
  s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === m && (x.targets || []).some(t => t.player === 1))[0]);
  s = passaAte(s, x => !!x.pending || !x.stack.length);
  assert.equal(s.pending && s.pending.kind, 'pick');
  assert.equal(s.pending.p, 0, 'quem conjurou escolhe');
  assert.ok(s.pending.from.includes(raio) && s.pending.from.includes(ursos), 'mão e cemitério');
  assert.ok(!s.pending.from.includes(ilha), 'terreno não serve');
  s = act(s, { t: 'pick', p: 0, oid: raio });
  assert.equal(s.objects[raio].zone, 'exile');
  assert.equal(s.objects[ursos].zone, 'hand');
  // ciclagem {1}
  let s2 = mesa(); let m2;
  [s2] = poe(s2, 0, 'Swamp');
  [s2, m2] = poe(s2, 0, 'Memory Leak', 'hand');
  assert.ok(legais(s2, 0, x => x.oid === m2 && /cycl/i.test(x.t)).length, 'ciclagem {1}');
});

test('M-623 · Final Frontier: busca terreno básico ou Planeta virado; Beam me up devolve uma criatura e exila a mágica', () => {
  let s = mesa(); let f, u;
  for (let i = 0; i < 3; i++) [s] = poe(s, 0, 'Forest');
  [s, u] = poe(s, 0, 'Grizzly Bears');
  [s, f] = poe(s, 0, 'Final Frontier', 'graveyard');
  const lanca = legais(s, 0, x => x.t === 'cast' && x.oid === f && x.flashback);
  assert.ok(lanca.length, 'do cemitério, com uma criatura para devolver');
  s = act(s, lanca[0]);
  assert.equal(s.objects[u].zone, 'hand', 'a criatura voltou para a mão (custo)');
  s = passaAte(s, x => !!x.pending || !x.stack.length);
  assert.equal(s.pending && s.pending.kind, 'pick');
  const planeta = s.pending.from.find(x => s.objects[x].name === 'Ferenginar');
  assert.ok(planeta, 'o Planeta pode ser escolhido');
  assert.ok(!s.pending.from.some(x => s.objects[x].name === 'Grizzly Bears'), 'criatura não');
  s = act(s, { t: 'pick', p: 0, oid: planeta });
  if (s.pending && s.pending.kind === 'pick') s = act(s, { t: 'pick_done', p: 0 });
  s = passaAte(s, x => !x.stack.length && !x.pending);
  assert.equal(s.objects[planeta].zone, 'battlefield');
  assert.equal(s.objects[planeta].tapped, true, 'entra virado');
  assert.equal(s.objects[f].zone, 'exile', 'Beam me up exila a mágica');
  // sem criatura, não lança do cemitério
  let s2 = mesa(); let f2;
  for (let i = 0; i < 3; i++) [s2] = poe(s2, 0, 'Forest');
  [s2, f2] = poe(s2, 0, 'Final Frontier', 'graveyard');
  assert.equal(legais(s2, 0, x => x.t === 'cast' && x.oid === f2).length, 0, 'sem criatura para devolver, não há Beam me up');
});
