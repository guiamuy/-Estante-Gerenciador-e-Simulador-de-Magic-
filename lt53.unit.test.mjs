// M-370 · LT41 · "~ can't be blocked this turn except by creatures with haste" (509.1b) — revisão por lote XXXII: Gingerbrute (texto: corpus do
// Oracle do Forge, consulta de 12/10/2026, guardado em .listas/oficiais-revisadas.json). Os testes falham no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, comMana, CARTAS } from './cmd.mjs';
import { T } from './listas.mjs';
import { loadModules } from './_load.mjs';
const { leitor: L, scripts: S } = loadModules();
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const gb = OF.find(x => x.name === 'Gingerbrute');
const carta = { name: gb.name, type_line: gb.type_line, mana_cost: gb.mana_cost, cmc: 1, keywords: ['Haste'], oracle_text: gb.oracle_text, colors: [], power: gb.power, toughness: gb.toughness };
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: 2, keywords: [], oracle_text: '', colors: [...new Set((mana_cost.match(/[WUBRG]/g) || []))], ...extra });
const lido = L.ler(carta);
const cards = { Gingerbrute: carta, Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2' }), Corcel: c0('Corcel', 'Creature — Horse', '{1}{R}', { power: '2', toughness: '2', keywords: ['Haste'] }) };
const scripts = { Gingerbrute: { ...lido.script, example: { action: 'etb', target: 'none', expect: { attached: false } } } };
function mesaG(seed = 41) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: { ...CARTAS, ...cards }, scripts, first: 0, players: [{ name: 'A', deck: baralho(['Gingerbrute', 'Mountain']) }, { name: 'B', deck: baralho(['Urso', 'Corcel', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}

test('LT41 · leitor: Gingerbrute lida por inteiro e válida', () => {
  assert.equal(lido.completa, true, JSON.stringify(lido.frases));
  assert.deepEqual(JSON.parse(JSON.stringify(lido.script.abilities[0].effects)), [{ do: 'imbloqueavel', target: 'self-source', exceto: 'haste' }]);
  assert.deepEqual([...S.validateScript(scripts.Gingerbrute)], []);
});

test('LT41 · 509.1b: depois de pagar {1}, só a criatura com ímpeto bloqueia o Gingerbrute neste turno; no turno seguinte, qualquer uma', () => {
  let s = mesaG(), g, u, c; [s, g] = poe(s, 0, 'Gingerbrute'); [s, u] = poe(s, 1, 'Urso'); [s, c] = poe(s, 1, 'Corcel');
  const m = comMana(s, 'R'); const p1 = act(act(m, legais(m, 0, a => a.t === 'activate' && a.oid === g && (a.index || 0) === 0)[0]), { t: 'pass', p: 0 });
  const r = E.apply(p1, { t: 'pass', p: 1 }); s = r.state;
  assert.ok(T.describe(p1, { t: 'pass', p: 1 }, r.events, s).some(l => /exceto por criaturas com ímpeto/.test(l)), 'o registro diz a restrição (achado da revisão)');
  assert.deepEqual([...s.objects[g].tempImbloqueavelExceto], ['haste']);
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 0);
  s = act(s, { t: 'attack', p: 0, attackers: [g] });
  s = passaAte(s, x => x.pending && x.pending.kind === 'blockers', 40);
  assert.throws(() => E.apply(s, { t: 'block', p: 1, blocks: [[u, g]] }), /ímpeto|bloque/);
  assert.doesNotThrow(() => E.apply(s, { t: 'block', p: 1, blocks: [[c, g]] }), 'o Corcel (ímpeto) bloqueia');
  let t = act(s, { t: 'block', p: 1, blocks: [] }); t = passaAte(t, x => x.turn.active === 1 && x.turn.step === 'main1', 300);
  assert.equal(t.objects[g].tempImbloqueavelExceto, undefined, 'a restrição acaba com o turno (514.2)');
});
