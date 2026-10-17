// M-429 · LT95 · Supernatural Stamina ("Until end of turn, target creature gets +2/+0 and gains "When this creature dies, return it to the battlefield tapped
// under its owner's control.""). Texto da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json), caminho de produção (APROVADAS). Efeito novo
// `ganha_habilidade` (a habilidade disparada ganha até o fim do turno, 613.1f). Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const c0 = OF.find(x => x.name === 'Supernatural Stamina');
const C = { 'Supernatural Stamina': { name: c0.name, type_line: c0.type_line, mana_cost: c0.mana_cost, cmc: 1, keywords: [], oracle_text: c0.oracle_text, colors: ['B'] },
  'Lightning Bolt': { name: 'Lightning Bolt', type_line: 'Instant', mana_cost: '{R}', cmc: 1, keywords: [], oracle_text: 'Lightning Bolt deals 3 damage to any target.', colors: ['R'] }, // .listas/oficiais.json
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' } };
for (const [n, k] of Object.entries({ Swamp: 'B', Mountain: 'R', Forest: 'G' })) C[n] = { name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${k}}.)`, colors: [] };
function mesa(seed = 38) {
  const b = ns => ns.map(name => ({ name, qty: ['Swamp', 'Mountain'].includes(name) ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b(['Supernatural Stamina', 'Lightning Bolt', 'Urso', 'Swamp', 'Mountain']) }, { name: 'B', deck: b(['Urso', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => { for (let i = 0; i < 60; i++) { if (s.pending && s.pending.kind !== 'priority') { s = act(s, legais(s, s.pending.p)[0]); continue; } if (s.stack.length) { s = passaAte(s, x => !x.stack.length || (!!x.pending && x.pending.kind !== 'priority'), 40); continue; }
  if (s.queued && s.queued.length) { const f = s.zones[0].battlefield.find(o => /Swamp|Mountain/.test(s.objects[o].name) && !s.objects[o].tapped); s = act(s, { t: 'tap_mana', p: 0, oid: f, option: 0 }); continue; } return s; } return s; };
const poder = (s, o) => E.stats(s, s.objects[o]).power;
function cena(dono) {
  let s = mesa(), st, lb, u; [s, st] = poe(s, 0, 'Supernatural Stamina', 'hand'); [s, lb] = poe(s, 0, 'Lightning Bolt', 'hand'); [s, u] = poe(s, dono, 'Urso');
  for (let i = 0; i < 2; i++) { [s] = poe(s, 0, 'Swamp'); [s] = poe(s, 0, 'Mountain'); }
  return { s, st, lb, u };
}
const conjura = (s, oid, alvo) => resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === oid && a.targets && a.targets[0].oid === alvo)[0]));

test('LT95 · Supernatural Stamina joga pelo leitor aprovado', () => {
  assert.equal(S.coverage(C['Supernatural Stamina']).level, 'completo'); assert.equal(S.APROVADAS['Supernatural Stamina'].leva, 'M-429');
});

test('LT95 · +2/+0; morta neste turno, volta ao campo virada (objeto novo, sem o +2)', () => {
  let { s, st, lb, u } = cena(0); s = conjura(s, st, u); assert.equal(poder(s, u), 4);
  s = conjura(s, lb, u); assert.equal(s.objects[u].zone, 'battlefield'); assert.equal(s.objects[u].tapped, true); assert.equal(s.objects[u].controller, 0);
  assert.equal(poder(s, u), 2, 'objeto novo (400.7): sem o +2 nem a habilidade');
  let lb2; [s, lb2] = poe(s, 0, 'Lightning Bolt', 'hand'); [s] = poe(s, 0, 'Mountain'); s = conjura(s, lb2, u);
  assert.equal(s.objects[u].zone, 'graveyard', 'a segunda morte não volta: a habilidade era do objeto antigo');
});

test("LT95 · volta sob o controle do DONO (a criatura do oponente que você controla volta para ele)", () => {
  let { s, st, lb, u } = cena(1); s = J(s); const i = s.zones[1].battlefield.indexOf(u); s.objects[u].controller = 0; // controle trocado, como por um efeito de roubar
  s = conjura(s, st, u); s = conjura(s, lb, u); assert.equal(s.objects[u].zone, 'battlefield'); assert.equal(s.objects[u].controller, 1); assert.equal(s.objects[u].tapped, true);
  assert.ok(i >= 0);
});

test('LT95 · até o fim do turno: no turno seguinte, morrer não a devolve', () => {
  let { s, st, u } = cena(0); s = conjura(s, st, u);
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending, 400);
  assert.equal(poder(s, u), 2); assert.ok(!(s.objects[u].tempHabilidades || []).length, 'a habilidade ganha sumiu na limpeza');
});
