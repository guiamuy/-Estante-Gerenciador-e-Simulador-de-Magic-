// M-384 · LT51 · Torch the Tower e Suplex (Oracle do Forge, consulta de 12/10/2026; .listas/oficiais-revisadas.json), caminho de produção (APROVADAS).
// "If a permanent dealt damage by ~ would die this turn, exile it instead" / "If that creature would die this turn, exile it instead" (614.1a) e
// "If this spell was bargained, instead it deals 3 damage to that permanent and you scry 1" (702.166b). Os testes falham no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, act, poe, legais, passaAte, CARTAS } from './cmd.mjs';
import { valorDeMana, palavrasDoTexto, S as SC } from './listas.mjs';
import { loadModules } from './_load.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const oficial = (n, colors) => { const r = OF.find(x => x.name === n); return { name: r.name, type_line: r.type_line, mana_cost: r.mana_cost, cmc: valorDeMana(r.mana_cost), keywords: palavrasDoTexto(r.oracle_text), oracle_text: r.oracle_text, colors }; };
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: valorDeMana(mana_cost), keywords: [], oracle_text: '', colors: [], ...extra });
const CARDS = { ...CARTAS, 'Torch the Tower': oficial('Torch the Tower', ['R']), Suplex: oficial('Suplex', ['R']),
  Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2', colors: ['G'] }), Grande: c0('Grande', 'Creature — Beast', '{2}{G}', { power: '3', toughness: '3', colors: ['G'] }),
  Pedra: c0('Pedra', 'Artifact', '{1}') };
function mesa() {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 17, mode: 'full', cards: CARDS, first: 0,
    players: [{ name: 'A', deck: baralho(['Torch the Tower', 'Suplex', 'Pedra', 'Mountain']) }, { name: 'B', deck: baralho(['Urso', 'Grande', 'Pedra', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending);
const zona = (s, oid) => s.objects[oid].zone;

test('LT51 · Torch the Tower sem barganha: 2 de dano; o Urso que morre vai ao exílio, não ao cemitério; o Grande fica com 2 de dano', () => {
  let s = mesa(), t, u, g; [s, t] = poe(s, 0, 'Torch the Tower', 'hand'); [s] = poe(s, 0, 'Mountain'); [s, u] = poe(s, 1, 'Urso'); [s, g] = poe(s, 1, 'Grande');
  const os = legais(s, 0, a => a.t === 'cast' && a.oid === t && !a.bargain);
  assert.ok(os.some(a => a.targets[0].oid === u) && os.some(a => a.targets[0].oid === g), 'mira as criaturas');
  let s1 = resolve(act(s, os.find(a => a.targets[0].oid === u)));
  assert.equal(zona(s1, u), 'exile', 'o Urso morreu e foi exilado');
  let s2 = resolve(act(s, os.find(a => a.targets[0].oid === g)));
  assert.equal(zona(s2, g), 'battlefield'); assert.equal(s2.objects[g].damage, 2);
});

test('LT51 · Torch the Tower barganhada (sacrificando um artefato): 3 de dano, vidência 1 e o Grande que morre vai ao exílio', () => {
  let s = mesa(), t, g, p; [s, t] = poe(s, 0, 'Torch the Tower', 'hand'); [s] = poe(s, 0, 'Mountain'); [s, p] = poe(s, 0, 'Pedra'); [s, g] = poe(s, 1, 'Grande');
  const a = legais(s, 0, x => x.t === 'cast' && x.oid === t && x.bargain && x.targets[0].oid === g)[0];
  assert.ok(a, 'oferece barganhar com a Pedra');
  s = act(s, a); assert.equal(zona(s, p), 'graveyard', 'a Pedra foi sacrificada ao conjurar');
  s = resolve(s);
  assert.ok(s.pending && s.pending.label === 'scry' && s.pending.from.length === 1, 'vidência 1 pendente: ' + JSON.stringify(s.pending));
  s = resolve(act(s, legais(s, 0)[0]));
  assert.equal(zona(s, g), 'exile', 'o Grande (3/3) morreu com 3 de dano e foi exilado');
});

test('LT51 · Suplex: no primeiro modo, 3 de dano e a criatura que morre vai ao exílio; no segundo, exila o artefato', () => {
  let s = mesa(), x, u, p; [s, x] = poe(s, 0, 'Suplex', 'hand'); for (let i = 0; i < 3; i++) [s] = poe(s, 0, 'Mountain'); [s, u] = poe(s, 1, 'Urso'); [s, p] = poe(s, 1, 'Pedra');
  const os = legais(s, 0, a => a.t === 'cast' && a.oid === x);
  const m1 = os.find(a => a.targets && a.targets[0] && a.targets[0].oid === u), m2 = os.find(a => a.targets && a.targets[0] && a.targets[0].oid === p);
  assert.ok(m1 && m2, 'os dois modos');
  assert.equal(zona(resolve(act(s, m1)), u), 'exile');
  assert.equal(zona(resolve(act(s, m2)), p), 'exile');
});

test('LT51 · a marca vale só neste turno e só para quem recebeu o dano: sem barganha não há vidência; a criatura que só morre no turno seguinte vai ao cemitério', () => {
  let s = mesa(), t, g; [s, t] = poe(s, 0, 'Torch the Tower', 'hand'); [s] = poe(s, 0, 'Mountain'); [s, g] = poe(s, 1, 'Grande');
  s = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === t && !a.bargain && a.targets[0].oid === g)[0]));
  assert.ok(!s.pending, 'sem barganha, sem vidência'); assert.equal(s.objects[g].exilaSeMorrerNoTurno, s.turn.number);
  s.objects[g].exilaSeMorrerNoTurno = s.turn.number - 1; s.objects[g].damage = 3; // como se a marca fosse do turno anterior
  s = passaAte(s, x => x.objects[g].zone !== 'battlefield' || x.turn.active === 1);
  assert.equal(zona(s, g), 'graveyard', 'marca de outro turno não exila');
});

test('LT51 · achados da revisão: o registro diz que a criatura foi exilada (não "morreu"); sacrifícios equivalentes viram uma oferta só; "se barganhada" exige a barganha', () => {
  const T = loadModules().table;
  let s = mesa(), t, u, p1, p2; [s, t] = poe(s, 0, 'Torch the Tower', 'hand'); [s] = poe(s, 0, 'Mountain'); [s, p1] = poe(s, 0, 'Pedra'); [s, p2] = poe(s, 0, 'Pedra'); [s, u] = poe(s, 1, 'Urso');
  const bs = legais(s, 0, a => a.t === 'cast' && a.oid === t && a.bargain && a.targets[0].oid === u);
  assert.equal(bs.length, 1, 'duas Pedras iguais: uma oferta barganhada por alvo');
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === t && !a.bargain && a.targets[0].oid === u)[0]);
  const linhas = []; for (let i = 0; i < 10 && s.stack.length; i++) { const a = { t: 'pass', p: s.turn.priority }, r = E.apply(s, a); linhas.push(...[].concat(T.describe(s, a, r.events || [], r.state) || [])); s = r.state; }
  assert.equal(zona(s, u), 'exile');
  assert.ok(linhas.some(l => /Urso iria morrer e foi exilada/.test(l)) && !linhas.some(l => /Urso morreu/.test(l)), 'registro: ' + linhas.join(' | '));
  const V = sc => SC.validateScript({ name: 'Z', example: { target: 'none', expect: {} }, ...sc });
  assert.ok(V({ effects: [{ do: 'damage', amount: { per: 'se', se: 'bargained', sim: 3, nao: 2 }, target: 'creature' }] }).some(e => /barganha/.test(e)), 'sem bargain: recusado');
  assert.ok(!V({ bargain: true, effects: [{ do: 'damage', amount: { per: 'se', se: 'bargained', sim: 3, nao: 2 }, target: 'creature' }] }).some(e => /barganha/.test(e)), 'com bargain: aceito');
});
