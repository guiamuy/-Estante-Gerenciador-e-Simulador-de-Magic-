// M-554 · LT214 · revisão por lote CXC (texto da Scryfall de 21/10/2026): Multiversal Passage ("As this land enters, choose a basic land type. Then you may
// pay 2 life. If you don't, it enters tapped. / This land is the chosen type."). A escolha é ao entrar (614.12), antes do pagamento; o terreno passa a ter o
// tipo e a mana dele (305.7), sem prazo. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, act, poe, legais, passaAte } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const MP = 'Multiversal Passage';
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: '', cmc: 0, keywords: [], oracle_text: c.oracle_text, colors: [] }; };
const C = { [MP]: of(MP), Recuo: { name: 'Recuo', type_line: 'Sorcery', mana_cost: '{5}', cmc: 5, keywords: [], oracle_text: '', colors: [] }, Mountain: { name: 'Mountain', type_line: 'Basic Land — Mountain', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {R}.)', colors: [] } };
function mesa() {
  const b = ns => ns.map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 236, mode: 'full', cards: C, scripts: { Recuo: { name: 'Recuo', effects: [{ do: 'gain', amount: 1 }], alt: [{ label: 'Devolver uma Ilha', cost: { returnLand: 'Island' } }], example: { target: 'none', expect: { selfLife: 0 } } } }, first: 0, players: [{ name: 'A', deck: b([[MP, 10], ['Recuo', 4], ['Mountain', 26]]) }, { name: 'B', deck: b([['Mountain', 40]]) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const joga = s => { let m; [s, m] = poe(s, 0, MP, 'hand'); s = act(s, legais(s, 0, a => a.oid === m && /play/.test(a.t))[0]); return [s, m]; };

test('M-554 · Multiversal Passage joga (lida e aprovada)', () => { assert.equal(S.coverage(of(MP)).level, 'completo'); });

test('M-554 · ao entrar, escolhe o tipo básico e depois paga 2 de vida ou entra virado; vira Ilha com a mana dela, e continua Ilha nos turnos seguintes', () => {
  let s = mesa(), m; [s, m] = joga(s);
  assert.equal(s.pending && s.pending.kind, 'choose_type'); assert.deepEqual(Array.from(s.pending.options), ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest']);
  s = act(s, { t: 'choose_type', p: 0, subtype: 'Island' });
  assert.equal(s.pending && s.pending.kind, 'may_pay'); assert.equal(s.pending.pagaVidaEntrada, 2);
  const v = s.players[0].life, pago = act(s, { t: 'pay', p: 0 }), nao = act(s, { t: 'decline', p: 0 });
  assert.deepEqual([pago.players[0].life, !!pago.objects[m].tapped], [v - 2, false], 'pagou: desvirado'); assert.deepEqual([nao.players[0].life, !!nao.objects[m].tapped], [v, true], 'não pagou: virado');
  let t = pago; const pool0 = t.players[0].pool.U || 0;
  const tap = legais(t, 0, a => a.oid === m && /tap|mana/.test(a.t)); assert.ok(tap.length, 'dá mana'); t = act(t, tap[0]); assert.equal((t.players[0].pool.U || 0) - pool0, 1, 'mana azul');
  let u = passaAte(pago, x => x.turn.active === 0 && x.turn.number > pago.turn.number && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  const tap2 = legais(u, 0, a => a.oid === m && /tap|mana/.test(a.t)); const p1 = u.players[0].pool.U || 0; u = act(u, tap2[0]); assert.equal((u.players[0].pool.U || 0) - p1, 1, 'no turno seguinte, ainda Ilha');
});

test('M-554 · achados da revisão: o tipo escolhido vale no custo "devolva uma Ilha"; ação errada com a escolha pendente é recusada com a mensagem certa', () => {
  let s = mesa(), m, r; [s, m] = joga(s);
  assert.throws(() => act(s, { t: 'pass', p: 0 }), e => /escolha o tipo básico de terreno primeiro/.test(e.message));
  s = act(s, { t: 'choose_type', p: 0, subtype: 'Island' }); s = act(s, { t: 'pay', p: 0 });
  [s, r] = poe(s, 0, 'Recuo', 'hand'); const alt = legais(s, 0, a => a.t === 'cast' && a.oid === r && a.alt != null);
  assert.ok(alt.length, 'Recuo pelo custo de devolver uma Ilha: a Passage como Ilha serve');
});
