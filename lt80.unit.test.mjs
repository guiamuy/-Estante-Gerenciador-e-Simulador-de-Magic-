// M-397 · LT64 · Registro da partida: quatro linhas que contavam errado (achados da revisão da M-396). "Pestilence foi sacrificada" (não "A foi
// sacrificada"); permanente que não é criatura "foi para o cemitério" (700.4: só criatura e planeswalker morrem); gatilho que falha pela condição
// (603.4) não é "sem alvo legal"; dano prevenido não aparece como causado. Falham no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, act, poe, legais, passaAte, CARTAS } from './cmd.mjs';
import { valorDeMana, palavrasDoTexto } from './listas.mjs';
import { loadModules } from './_load.mjs';
const T = loadModules().table;
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const of = (n, colors) => { const r = OF.find(x => x.name === n); return { name: r.name, type_line: r.type_line, mana_cost: r.mana_cost, cmc: valorDeMana(r.mana_cost), keywords: palavrasDoTexto(r.oracle_text), oracle_text: r.oracle_text, colors }; };
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: valorDeMana(mana_cost), keywords: [], oracle_text: '', colors: [], ...extra });
const CARDS = { ...CARTAS, Pestilence: of('Pestilence', ['B']), Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2', colors: ['G'] }),
  'Guarda Branco': c0('Guarda Branco', 'Creature — Human', '{W}', { power: '1', toughness: '1', colors: ['W'], keywords: ['Protection from black'], oracle_text: 'Protection from black' }) };
function mesa() {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 73, mode: 'full', cards: CARDS, first: 0,
    players: [{ name: 'A', deck: baralho(['Pestilence', 'Swamp']) }, { name: 'B', deck: baralho(['Urso', 'Guarda Branco', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
function joga(s, n, acao) { const linhas = []; for (let i = 0; i < n; i++) { const a = acao(s); if (!a) break; const r = E.apply(s, a); linhas.push(...[].concat(T.describe(s, a, r.events || [], r.state) || [])); s = r.state; } return [s, linhas]; }

test('LT64 · Pestilence sacrificada pelo próprio gatilho: "Pestilence foi sacrificada" e "foi para o cemitério" (não "morreu")', () => {
  let s = mesa(), pe; [s, pe] = poe(s, 0, 'Pestilence');
  s = passaAte(s, x => x.turn.step === 'end' && x.stack.length > 0);
  let linhas; [s, linhas] = joga(s, 6, x => x.stack.length ? { t: 'pass', p: x.turn.priority } : null);
  assert.equal(s.objects[pe].zone, 'graveyard');
  assert.ok(linhas.some(l => /^Pestilence foi sacrificada/.test(l)), linhas.join(' | '));
  assert.ok(!linhas.some(l => /A foi sacrificada|Pestilence morreu/.test(l)), linhas.join(' | '));
});

test('LT64 · gatilho que falha pela condição (603.4) e dano prevenido pela proteção', () => {
  let s = mesa(), pe, g; [s, pe] = poe(s, 0, 'Pestilence'); [s] = poe(s, 0, 'Swamp'); [s, g] = poe(s, 1, 'Guarda Branco');
  let linhas; [s, linhas] = joga(s, 4, x => { const a = legais(x, 0, y => y.t === 'activate' && y.oid === pe)[0]; return x.stack.length ? { t: 'pass', p: x.turn.priority } : (linhas ? null : a); });
  assert.ok(linhas.some(l => /o dano a Guarda Branco foi prevenido/.test(l)) && !linhas.some(l => /causou 1 de dano a Guarda Branco/.test(l)), linhas.join(' | '));
  let t = mesa(), pe2, u; [t, pe2] = poe(t, 0, 'Pestilence');
  t = passaAte(t, x => x.turn.step === 'end' && x.stack.length > 0);
  t = JSON.parse(JSON.stringify(t)); [t, u] = poe(t, 1, 'Urso'); // uma criatura entrou antes da resolução
  let l2; [t, l2] = joga(t, 4, x => x.stack.length ? { t: 'pass', p: x.turn.priority } : null);
  assert.equal(t.objects[pe2].zone, 'battlefield');
  assert.ok(l2.some(l => /a condição deixou de valer/.test(l)) && !l2.some(l => /sem alvo legal/.test(l)), l2.join(' | '));
});
