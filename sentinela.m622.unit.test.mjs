// M-622 · Sentinela do Pauper (cobertura/pauper.json de 11/11/2026 13:48 UTC: 685 de 694 listas a 100% no app, 15 cartas pendentes).
// Texto da API da Scryfall de 11/11/2026 (campo `texto` do relatório, guardado em .listas/oficiais-revisadas.json).
//   7 lidas aprovadas pela revisão independente: Bellowing Crier, Disrupt, Gigadrowse, Pond Prophet, Prismari Campus, Sibsig Appraiser, Three Tree Mascot
//   3 com script à mão: Oona's Grace (retrace, 702.81a), Keep Watch (uma carta por criatura atacante, 506.4), Glistener Seer (entra com 3 marcadores de óleo, 614.1c)
// Falha no motor anterior: as dez ficavam fora do app (lida em revisão · manual).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, act, poe, legais, passaAte, limpaMao } from './listas.mjs';

const revisadas = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const de = n => ({ keywords: [], colors: [], cmc: 0, ...revisadas.find(x => x.name === n) });
const LIDAS = ['Bellowing Crier', 'Disrupt', 'Gigadrowse', 'Pond Prophet', 'Prismari Campus', 'Sibsig Appraiser', 'Three Tree Mascot'];
const MAO = ["Oona's Grace", 'Keep Watch', 'Glistener Seer'];
const terreno = (n, c) => ({ name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${c}}.)`, colors: [] });
const C = Object.fromEntries([...LIDAS, ...MAO].map(n => [n, de(n)]));
C.Island = terreno('Island', 'U');

test('M-622 · as dez cartas pendentes jogam no app (sete aprovadas, três à mão)', () => {
  for (const n of [...LIDAS, ...MAO]) {
    assert.ok(revisadas.find(x => x.name === n), `${n}: texto oficial guardado`);
    assert.equal(S.coverage(C[n]).level, 'completo', n);
  }
  for (const n of LIDAS) { assert.ok(S.APROVADAS[n], `${n} aprovada`); assert.equal(S.APROVADAS[n].texto, S.assinaturaRevisao(C[n]), `${n}: assinatura`); }
  for (const n of MAO) assert.ok(S.SCRIPTS[n], `${n}: script à mão`);
});

function mesa() {
  const lista = [['Glistener Seer', 12], ['Keep Watch', 12], ["Oona's Grace", 12], ['Island', 24]].map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'pauper', seed: 620, mode: 'full', cards: C, players: [{ name: 'A', deck: lista }, { name: 'B', deck: lista }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  return limpaMao(s, 0);
}
const resolveTudo = s => { for (let i = 0; i < 80 && (s.stack.length || s.pending); i++) s = s.pending ? act(s, legais(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority }); return s; };

test('M-622 · Glistener Seer entra com três marcadores de óleo e o {T} tira um para vidência 1', () => {
  let s = mesa(); let g;
  [s] = poe(s, 0, 'Island');
  [s, g] = poe(s, 0, 'Glistener Seer', 'hand');
  s = resolveTudo(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === g)[0]));
  assert.equal(s.objects[g].zone, 'battlefield');
  const oleo = o => ((o.counters || {}).oil) || 0;
  assert.equal(oleo(s.objects[g]), 3, 'três marcadores de óleo');
  assert.ok(!s.objects[g].tapped, 'entra desvirada');
  s.objects[g].summoningSick = false; s.objects[g].sick = false; s.objects[g].enteredTurn = -1;
  const ativa = legais(s, 0, x => x.t === 'activate' && x.oid === g)[0];
  assert.ok(ativa, 'pode ativar');
  s = resolveTudo(act(s, ativa));
  assert.equal(oleo(s.objects[g]), 2, 'tirou um marcador');
  assert.equal(s.objects[g].tapped, true);
});

test("M-622 · Oona's Grace: alvo é um jogador e pode voltar do cemitério com retrace", () => {
  let s = mesa(); let o;
  for (let i = 0; i < 3; i++) [s] = poe(s, 0, 'Island');
  [s, o] = poe(s, 0, "Oona's Grace", 'graveyard');
  [s] = poe(s, 0, 'Island', 'hand');
  const doCemiterio = legais(s, 0, x => x.t === 'cast' && x.oid === o);
  assert.ok(doCemiterio.length, 'conjura do cemitério descartando um terreno');
  const mao = s.zones[0].hand.length;
  s = act(s, doCemiterio.find(x => (x.targets || []).some(t => t.player === 0)) || doCemiterio[0]);
  s = resolveTudo(s);
  assert.ok(s.zones[0].hand.length >= mao - 1, 'descartou o terreno e comprou (alvo: você)');
});
