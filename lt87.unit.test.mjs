// M-405 · LT71 · 107.14 / 608.2d · "You get {E}{E}{E}, then you may pay any amount of {E}. ~ deals that much damage to that permanent":
// Galvanic Discharge ({R}, "Choose target creature or planeswalker…") e Harnessed Lightning ({1}{R}, "Choose target creature…") — Oracle do Forge,
// consulta de 12/10/2026; .listas/oficiais-revisadas.json; caminho de produção (APROVADAS). Decisão nova `quantia` (de 0 até a energia). Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, act, poe, legais, passaAte, CARTAS } from './cmd.mjs';
import { valorDeMana, palavrasDoTexto } from './listas.mjs';
import { loadModules } from './_load.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const of = (n, colors) => { const r = OF.find(x => x.name === n); return { name: r.name, type_line: r.type_line, mana_cost: r.mana_cost, cmc: valorDeMana(r.mana_cost), keywords: palavrasDoTexto(r.oracle_text), oracle_text: r.oracle_text, colors }; };
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: valorDeMana(mana_cost), keywords: [], oracle_text: '', colors: [], ...extra });
const CARDS = { ...CARTAS, 'Galvanic Discharge': of('Galvanic Discharge', ['R']), 'Harnessed Lightning': of('Harnessed Lightning', ['R']),
  Gigante: c0('Gigante', 'Creature — Giant', '{3}{G}', { power: '4', toughness: '4', colors: ['G'] }), Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2', colors: ['G'] }) };
function mesa() {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 109, mode: 'full', cards: CARDS, first: 0,
    players: [{ name: 'A', deck: baralho(['Galvanic Discharge', 'Harnessed Lightning', 'Mountain']) }, { name: 'B', deck: baralho(['Gigante', 'Urso', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending);

test('LT71 · Galvanic Discharge: ganha 3 de energia, escolhe de 0 a toda a energia na resolução e causa esse tanto de dano', () => {
  let s = mesa(), gd, gi; [s, gd] = poe(s, 0, 'Galvanic Discharge', 'hand'); [s] = poe(s, 0, 'Mountain'); [s, gi] = poe(s, 1, 'Gigante');
  s = JSON.parse(JSON.stringify(s)); s.players[0].energia = 2; // já tinha 2: pode pagar até 5
  s = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === gd && a.targets[0].oid === gi)[0]));
  assert.equal(s.pending && s.pending.kind, 'quantia'); assert.equal(s.pending.max, 5); assert.equal(s.pending.p, 0);
  assert.equal(s.objects[gd].zone, 'stack', '608.2n: a mágica espera a escolha na pilha');
  assert.deepEqual([...legais(s, 0, a => a.t === 'quantia').map(a => a.n)], [0, 1, 2, 3, 4, 5]);
  assert.throws(() => E.apply(s, { t: 'quantia', p: 0, n: 6 }), /0 a 5/);
  const s4 = resolve(act(s, { t: 'quantia', p: 0, n: 4 }));
  assert.equal(s4.objects[gi].zone, 'graveyard', '4 de dano no 4/4'); assert.equal(s4.players[0].energia, 1); assert.equal(s4.objects[gd].zone, 'graveyard');
  const s3 = resolve(act(s, { t: 'quantia', p: 0, n: 3 }));
  assert.equal(s3.objects[gi].zone, 'battlefield'); assert.equal(s3.objects[gi].damage, 3); assert.equal(s3.players[0].energia, 2);
  const s0 = resolve(act(s, { t: 'quantia', p: 0, n: 0 }));
  assert.equal(s0.objects[gi].damage || 0, 0); assert.equal(s0.players[0].energia, 5, 'não pagar guarda a energia');
});

test('LT71 · Harnessed Lightning mira só criatura (nunca jogador); o alvo que sai antes não leva dano nem cobra energia', () => {
  let s = mesa(), hl, gd, u; [s, hl] = poe(s, 0, 'Harnessed Lightning', 'hand'); [s, gd] = poe(s, 0, 'Galvanic Discharge', 'hand'); for (let i = 0; i < 3; i++) [s] = poe(s, 0, 'Mountain'); [s, u] = poe(s, 1, 'Urso');
  const alvos = legais(s, 0, a => a.t === 'cast' && a.oid === hl).map(a => JSON.stringify(a.targets[0]));
  assert.ok(alvos.every(t => !t.includes('player')) && alvos.includes(JSON.stringify({ oid: u })), alvos.join(' '));
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === hl && a.targets[0].oid === u)[0]);
  s = JSON.parse(JSON.stringify(s)); s.zones[1].battlefield = s.zones[1].battlefield.filter(x => x !== u); s.zones[1].graveyard.push(u); s.objects[u].zone = 'graveyard'; s.objects[u].zc = (s.objects[u].zc || 0) + 1;
  s = resolve(s);
  assert.ok(!s.pending, 'alvo ilegal: a mágica não resolve'); assert.equal(s.players[0].energia || 0, 0, '608.2b: nada da mágica acontece');
});

test('LT71 · mesa e textos: pilha explicada, registro do pagamento e o goldfish paga tudo', () => {
  const M = loadModules();
  assert.equal(M.table.descreveEfeitos([{ do: 'energia', amount: 3 }, { do: 'energia_dano', target: { tipos: ['creature', 'planeswalker'] } }]).includes('paga quanta energia quiser e causa esse tanto de dano a'), true);
  let s = mesa(), gd, gi; [s, gd] = poe(s, 0, 'Galvanic Discharge', 'hand'); [s] = poe(s, 0, 'Mountain'); [s, gi] = poe(s, 1, 'Gigante');
  s = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === gd && a.targets[0].oid === gi)[0]));
  const a = { t: 'quantia', p: 0, n: 2 }, r = E.apply(s, a);
  const linhas = [].concat(M.table.describe(s, a, r.events || [], r.state) || []);
  assert.ok(linhas.some(l => /pagou 2 de energia/.test(l)) && linhas.some(l => /2 de dano a Gigante/.test(l)), linhas.join(' | '));
  assert.throws(() => E.apply(s, { t: 'pass', p: 0 }), /escolha a quantia primeiro/);
});

test('LT71 · achado da revisão: o Shark escolhe a quantia pelo resultado mesmo com muitas opções (as quantias não são "jogadas iguais")', () => {
  const B = loadModules().bot;
  let s = mesa(), gd, u; [s, gd] = poe(s, 0, 'Galvanic Discharge', 'hand'); [s] = poe(s, 0, 'Mountain'); [s, u] = poe(s, 1, 'Urso');
  s = JSON.parse(JSON.stringify(s)); s.players[0].energia = 4; // 7 opções (0 a 7)
  s = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === gd && a.targets[0].oid === u)[0]));
  assert.equal(s.pending && s.pending.max, 7);
  const j = B.criaBot({ nivel: 'shark', orcamentoMs: 300 }).jogada(s, 0);
  assert.equal(j.acao.t, 'quantia'); assert.ok(j.acao.n >= 2, 'mata o Urso 2/2: ' + JSON.stringify(j.acao));
});
