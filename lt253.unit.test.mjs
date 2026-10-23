// M-571 · LT230 · revisão por lote CCVI (textos da Scryfall de 23/10/2026): Oliphaunt ("Trample / Whenever this creature attacks, another target creature
// you control gets +2/+0 and gains trample until end of turn. / Mountaincycling {1}") e Magitek Infantry ("This creature gets +1/+0 as long as you control
// another artifact. / {2}{W}: Search your library for a card named Magitek Infantry, put it onto the battlefield tapped, then shuffle."). Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, act, poe, legais, passaAte, limpaMao } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Oliphaunt', 'Magitek Infantry'];
const cor = c => [...new Set((c.match(/[WUBRG]/g) || []))];
const C = Object.fromEntries(NOMES.map(n => { const o = OF.find(x => x.name === n); return [n, { name: n, type_line: o.type_line, mana_cost: o.mana_cost, cmc: [...o.mana_cost.matchAll(/\{([^}]+)\}/g)].reduce((t, [, x]) => t + (/^\d+$/.test(x) ? +x : 1), 0), keywords: o.keywords || [], oracle_text: o.oracle_text, power: o.power, toughness: o.toughness, colors: cor(o.mana_cost) }]; }));
Object.assign(C, Object.fromEntries([['Mountain', 'R'], ['Plains', 'W'], ['Island', 'U']].map(([n, k]) => [n, { name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${k}}.)`, colors: [] }])),
  { Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{R}', cmc: 2, keywords: [], oracle_text: '', power: '2', toughness: '2', colors: ['R'] },
    Pedra: { name: 'Pedra', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] } });
function mesa(deckA) {
  const b = ns => ns.map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 253, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b(deckA) }, { name: 'B', deck: b([['Island', 40]]) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  return limpaMao(s, 0);
}
const resolve = (s, escolha = (pd, st) => legais(st, pd.p)[0]) => { for (let i = 0; i < 60 && (s.stack.length || s.pending); i++) { const pd = s.pending; s = pd ? act(s, escolha(pd, s)) : act(s, { t: 'pass', p: s.turn.priority }); } return s; };

test('M-571 · as duas jogam (lidas e aprovadas)', () => { for (const n of NOMES) assert.equal(S.coverage(C[n]).level, 'completo', n); });

test('M-571 · Oliphaunt: ao atacar, OUTRA criatura sua ganha +2/+0 e atropelar até o fim do turno; ciclagem de Montanha', () => {
  let s = mesa([['Oliphaunt', 2], ['Urso', 2], ['Mountain', 36]]), o, u; [s, o] = poe(s, 0, 'Oliphaunt'); [s, u] = poe(s, 0, 'Urso');
  s = passaAte(s, x => !!x.pending && x.pending.kind === 'attackers');
  s = act(s, { t: 'attack', p: 0, attackers: [o] }); let alvos = [];
  s = resolve(s, (pd, st) => { if (pd.kind === 'pick_target') { alvos = pd.options.map(t => t && t.oid); const i = pd.options.findIndex(t => t && t.oid === u); return { t: 'pick_target', p: pd.p, index: i }; } return legais(st, pd.p)[0]; });
  assert.ok(!alvos.includes(o), 'não pode mirar a si mesma (another)');
  assert.equal(E.stats(s, s.objects[u]).power, 4); assert.ok(E.hasKeyword(s, s.objects[u], 'trample'));
  let c = mesa([['Oliphaunt', 2], ['Mountain', 38]]), oc; [c, oc] = poe(c, 0, 'Oliphaunt', 'hand'); [c] = poe(c, 0, 'Mountain');
  const cic = legais(c, 0, a => a.oid === oc && /cycl/i.test(a.t)); assert.ok(cic.length, 'oferece a ciclagem de Montanha');
});

test('M-571 · Magitek Infantry: +1/+0 só com OUTRO artefato; {2}{W} busca outra Magitek para o campo virada', () => {
  let s = mesa([['Magitek Infantry', 3], ['Pedra', 2], ['Plains', 35]]), m; [s, m] = poe(s, 0, 'Magitek Infantry');
  assert.equal(E.stats(s, s.objects[m]).power, 1, 'ela mesma não conta');
  let p; [s, p] = poe(s, 0, 'Pedra'); assert.equal(E.stats(s, s.objects[m]).power, 2, 'com outro artefato, 2/1');
  for (let i = 0; i < 3; i++) [s] = poe(s, 0, 'Plains');
  const at = legais(s, 0, a => a.t === 'activate' && a.oid === m); assert.ok(at.length);
  const t = resolve(act(s, at[0]), (pd, st) => pd.kind === 'pick' ? (legais(st, pd.p, a => a.t === 'pick')[0] || legais(st, pd.p, a => a.t === 'pick_done')[0]) : legais(st, pd.p)[0]);
  const novas = t.zones[0].battlefield.filter(x => x !== m && t.objects[x].name === 'Magitek Infantry'); assert.equal(novas.length, 1);
  assert.equal(t.objects[novas[0]].tapped, true, 'entra virada');
});
