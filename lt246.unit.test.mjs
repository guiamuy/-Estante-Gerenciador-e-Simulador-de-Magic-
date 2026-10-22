// M-564 · LT223 · revisão por lote CXCIX (texto e ruling da Scryfall de 22/10/2026): Mox Diamond — "If this artifact would enter, you may discard a land
// card instead. If you do, put this artifact onto the battlefield. If you don't, put it into its owner's graveyard." Sem descartar, ela nunca entra: nada
// que olhe entrada dispara (ruling de 01/05/2008). Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, T, act, poe, legais, passaAte, limpaMao } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const MD = 'Mox Diamond', md = OF.find(x => x.name === MD);
const C = { [MD]: { name: MD, type_line: md.type_line, mana_cost: md.mana_cost, cmc: 0, keywords: [], oracle_text: md.oracle_text, colors: [] },
  Island: { name: 'Island', type_line: 'Basic Land — Island', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {U}.)', colors: [] },
  Vigia: { name: 'Vigia', type_line: 'Enchantment', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] } };
const SCRIPTS = { Vigia: { name: 'Vigia', abilities: [{ kind: 'triggered', when: 'other-etb', filter: { types: ['artifact'] }, effects: [{ do: 'gain', amount: 1 }] }], example: { target: 'none', expect: { selfLife: 0 } } } };
function mesa(terrasNaMao) {
  const b = ns => ns.map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 246, mode: 'full', cards: C, scripts: SCRIPTS, first: 0, players: [
    { name: 'A', deck: b([[MD, 2], ['Vigia', 1], ['Island', 37]]) }, { name: 'B', deck: b([['Island', 40]]) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  s = limpaMao(s, 0); let m; [s] = poe(s, 0, 'Vigia'); [s, m] = poe(s, 0, MD, 'hand');
  if (terrasNaMao) [s] = poe(s, 0, 'Island', 'hand');
  return [s, m];
}
const conjura = (s, m) => passaAte(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === m)[0]), x => !!x.pending || !x.stack.length);

test('M-564 · Mox Diamond joga (lido e aprovado)', () => { assert.equal(S.coverage(C[MD]).level, 'completo'); });

test('M-564 · descartando um terreno, entra (e dispara o que olha entrada); gera mana de qualquer cor', () => {
  let [s, m] = mesa(true); const vida = s.players[0].life; s = conjura(s, m);
  assert.equal(s.pending && s.pending.kind, 'pick', 'pergunta qual terreno descartar'); assert.equal(s.objects[m].zone, 'stack', 'ainda não entrou');
  const ilha = legais(s, 0, a => a.t === 'pick')[0].oid; s = act(s, { t: 'pick', p: 0, oid: ilha }); s = passaAte(s, x => !x.pending && !x.stack.length);
  assert.equal(s.objects[ilha].zone, 'graveyard', 'terreno descartado'); assert.equal(s.objects[m].zone, 'battlefield');
  assert.equal(s.players[0].life, vida + 1, 'o Vigia viu o artefato entrar');
  assert.equal(legais(s, 0, a => a.t === 'tap_mana' && a.oid === m).length >= 1, true);
});

test('M-564 · sem descartar, vai ao cemitério sem nunca entrar (nada dispara); sem terreno na mão, nem pergunta', () => {
  let [s, m] = mesa(true); const vida = s.players[0].life; s = conjura(s, m); const mao = s.zones[0].hand.length;
  s = act(s, legais(s, 0, a => a.t === 'pick_done')[0]); s = passaAte(s, x => !x.pending && !x.stack.length);
  assert.equal(s.objects[m].zone, 'graveyard'); assert.equal(s.players[0].life, vida, 'nada viu entrada'); assert.equal(s.zones[0].hand.length, mao, 'nenhum terreno descartado');
  let [t, m2] = mesa(false);
  t = conjura(t, m2); assert.ok(!(t.pending && t.pending.kind === 'pick'), 'sem terreno, sem pergunta'); assert.equal(t.objects[m2].zone, 'graveyard');
});

test('M-564 · achado da revisão: o registro diz quem descartou, numa linha só para a escolha', () => {
  let [s, m] = mesa(true); const log = [];
  const passo = a => { const r = E.apply(s, a); log.push(...(T.describe(s, a, r.events, r.state) || [])); s = r.state; };
  passo(legais(s, 0, a => a.t === 'cast' && a.oid === m)[0]);
  for (let i = 0; i < 10 && !s.pending; i++) passo({ t: 'pass', p: s.turn.priority });
  passo(legais(s, 0, a => a.t === 'pick')[0]);
  assert.ok(!log.some(l => /undefined/.test(l)), log.join(' | '));
  assert.ok(log.some(l => /^A descarta 1 carta \(Mox Diamond\)/.test(l)), log.join(' | '));
  assert.equal(log.filter(l => /descartar um terreno/.test(l)).length, 1, 'a escolha aparece uma vez');
});
