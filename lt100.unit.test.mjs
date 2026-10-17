// M-418 · LT84 · gatilhos de evento de qualquer jogador pelo leitor: "Whenever a player sacrifices a creature" (Mortician Beetle), "Whenever another creature
// enters" (Essence Warden, Soul Warden, Wretched Anurid, Midnight Guard) e "Whenever another creature dies" (Hissing Iguanar, Poison-Tip Archer, Scavenger Drake,
// Algae Gharial, Rockslide Elemental, Rage Thrower, Havengul Vampire), mais "you may have ~ deal N damage" (Kyren Sniper, Cosi's Ravager). Texto da Scryfall de
// 17/10/2026 UTC (.listas/oficiais-revisadas.json), caminho de produção (APROVADAS). Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, palavrasDoTexto, valorDeMana, S } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Algae Gharial', "Cosi's Ravager", 'Essence Warden', 'Havengul Vampire', 'Hissing Iguanar', 'Kyren Sniper', 'Midnight Guard', 'Mortician Beetle', 'Poison-Tip Archer', 'Rage Thrower', 'Rockslide Elemental', 'Scavenger Drake', 'Soul Warden', 'Wretched Anurid'];
const cores = c => [...new Set((c || '').match(/[WUBRG]/g) || [])];
const C = {}; for (const n of NOMES) { const c = OF.find(x => x.name === n); C[n] = { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: palavrasDoTexto(c.oracle_text), oracle_text: c.oracle_text, colors: cores(c.mana_cost), power: c.power, toughness: c.toughness }; }
C.Urso = { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' };
C.Pedra = { name: 'Pedra', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] };
C.Forest = { name: 'Forest', type_line: 'Basic Land — Forest', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {G}.)', colors: [] };
function mesa(seed = 23) {
  const b = ns => ns.map(name => ({ name, qty: 6, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Urso', 'Pedra', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Pedra', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length && !x.pending || (!!x.pending && x.pending.kind !== 'priority'));
const flush = s => { let f; [s, f] = poe(s, 0, 'Forest'); return act(s, { t: 'tap_mana', p: 0, oid: f, option: 0 }); }; // uma ação de verdade põe na pilha os gatilhos enfileirados pelo sacrifício montado à mão
const aceita = s => { s = s.queued && s.queued.length ? flush(s) : s; for (let i = 0; i < 30 && (s.pending || s.stack.length); i++) { if (s.pending) { const l = legais(s, s.pending.p); const pd = s.pending; s = act(s, (pd.kind === 'pick_target' ? l.find(a => (pd.options[a.index] || {}).player === 1) : null) || l.find(a => a.t === 'pay' || a.t === 'accept') || l[0]); } else s = act(s, { t: 'pass', p: s.turn.priority }); } return s; };

test('LT84 · as 14 jogam pelo leitor aprovado', () => {
  for (const n of NOMES) { assert.equal(S.coverage(C[n]).level, 'completo', n); assert.equal(S.APROVADAS[n].leva, 'M-418', n); }
});

test('LT84 · Essence Warden: ganha 1 quando outra criatura entra, de qualquer jogador; ela mesma e um artefato não contam', () => {
  let s = mesa(), ew, u0, u1, pe; [s, ew] = poe(s, 0, 'Essence Warden'); [s, u0] = poe(s, 0, 'Urso', 'hand'); [s, u1] = poe(s, 1, 'Urso', 'hand'); [s, pe] = poe(s, 0, 'Pedra', 'hand');
  const entra = (x, p, oid) => { x = J(x); x.manaCheck = false; return aceita(act(x, legais(x, p, a => a.t === 'cast' && a.oid === oid)[0])); };
  let a = entra(s, 0, u0); assert.equal(a.players[0].life, 21, 'Urso seu');
  let b = J(s); b.turn.active = 1; b.turn.priority = 1; b = entra(b, 1, u1); assert.equal(b.players[0].life, 21, 'Urso do oponente');
  let c = entra(s, 0, pe); assert.equal(c.players[0].life, 20, 'artefato não é criatura');
});

test('LT84 · Mortician Beetle: qualquer jogador que sacrifica uma criatura dá a chance do marcador; artefato sacrificado, não', () => {
  let s = mesa(), mb, u0, u1, pe; [s, mb] = poe(s, 0, 'Mortician Beetle'); [s, u0] = poe(s, 0, 'Urso'); [s, u1] = poe(s, 1, 'Urso'); [s, pe] = poe(s, 1, 'Pedra');
  let a = J(s); E.sacrifice(a, u1, []); a = aceita(a); assert.equal((a.objects[mb].counters || {}).p1p1, 1, 'o oponente sacrificou');
  let b = J(s); E.sacrifice(b, u0, []); b = aceita(b); assert.equal((b.objects[mb].counters || {}).p1p1, 1, 'você sacrificou');
  let c = J(s); E.sacrifice(c, pe, []); c = aceita(c); assert.ok(!(c.objects[mb].counters || {}).p1p1, 'artefato não');
});

test('LT84 · Hissing Iguanar: outra criatura morre (de qualquer jogador) → pode causar 1 de dano a um jogador; Poison-Tip Archer: cada oponente perde 1', () => {
  let s = mesa(), hi, pa, u1; [s, hi] = poe(s, 0, 'Hissing Iguanar'); [s, pa] = poe(s, 0, 'Poison-Tip Archer'); [s, u1] = poe(s, 1, 'Urso');
  let a = J(s); E.sacrifice(a, u1, []); a = aceita(a);
  assert.equal(a.players[1].life, 18, 'Iguanar (1, mirando o oponente) + Archer (1)'); assert.equal(a.players[0].life, 20);
});
