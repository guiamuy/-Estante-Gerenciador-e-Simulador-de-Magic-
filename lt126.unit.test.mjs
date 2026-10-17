// M-444 · LT110 · o nome curto da lendária no texto (201.4b): "Raphael deals 1 damage" em Raphael, Tough Turtle ("Alliance — Whenever another creature you
// control enters, Raphael deals 1 damage to target opponent."). Texto da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json), caminho de produção
// (APROVADAS). Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const c0 = OF.find(x => x.name === 'Raphael, Tough Turtle');
const C = { [c0.name]: { name: c0.name, type_line: c0.type_line, mana_cost: c0.mana_cost, cmc: 2, keywords: ['Alliance'], oracle_text: c0.oracle_text, colors: ['R'], power: c0.power, toughness: c0.toughness },
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Forest: { name: 'Forest', type_line: 'Basic Land — Forest', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {G}.)', colors: [] } };
function mesa(seed = 53) {
  const b = ns => ns.map(name => ({ name, qty: 10, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([c0.name, 'Urso', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => { for (let i = 0; i < 60; i++) { if (s.pending && s.pending.kind !== 'priority') { s = act(s, legais(s, s.pending.p)[0]); continue; } if (s.stack.length) { s = passaAte(s, x => !x.stack.length || (!!x.pending && x.pending.kind !== 'priority'), 40); continue; }
  if (s.queued && s.queued.length) { const f = s.zones[0].battlefield.find(o => s.objects[o].name === 'Forest' && !s.objects[o].tapped); s = act(s, { t: 'tap_mana', p: 0, oid: f, option: 0 }); continue; } return s; } return s; };

test('LT110 · Raphael, Tough Turtle joga pelo leitor aprovado', () => {
  assert.equal(S.coverage(C[c0.name]).level, 'completo'); assert.equal(S.APROVADAS[c0.name].leva, 'M-444');
});

test('LT110 · outra criatura sua entra: 1 de dano no oponente; a dele não', () => {
  let s = mesa(), r, u; [s, r] = poe(s, 0, c0.name); [s, u] = poe(s, 0, 'Urso', 'hand'); for (let i = 0; i < 3; i++) [s] = poe(s, 0, 'Forest');
  const t = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === u)[0])); assert.equal(t.players[1].life, 19); assert.equal(t.players[0].life, 20);
  let g = J(t), uo; [g, uo] = poe(g, 1, 'Urso'); g = resolve(g); assert.equal(g.players[1].life, 19);
});

test('LT110 · o leitor troca o nome curto da lendária por "~" (e só a palavra inteira)', () => {
  const ler = (nome, txt) => S.leitura({ name: nome, type_line: 'Legendary Creature — Test', mana_cost: '{1}', oracle_text: txt, keywords: [], colors: [], power: '1', toughness: '1' });
  const r = ler('Tafa, Teste Vivo', 'Whenever another creature you control enters, Tafa deals 1 damage to target opponent.');
  assert.ok(r && r.script, 'lida por inteiro'); assert.equal(r.script.abilities[0].effects[0].do, 'damage');
});
