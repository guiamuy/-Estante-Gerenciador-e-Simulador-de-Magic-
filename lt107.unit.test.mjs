// M-425 · LT91 · Echoing Truth ("Return target nonland permanent and all other permanents with the same name as that permanent to their owners' hands.").
// Texto da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json), caminho de produção (APROVADAS). Campo novo `mesmoNome` no devolver: as outras
// permanentes com nome em comum (201.2), de qualquer jogador, voltam junto, à mão de cada dono; virada para baixo não tem nome (708.2). Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, valorDeMana, S } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const C = {}; { const c = OF.find(x => x.name === 'Echoing Truth'); C[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: ['U'] }; }
C.Urso = { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' };
C.Lobo = { name: 'Lobo', type_line: 'Creature — Wolf', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' };
C['Lightning Bolt'] = { name: 'Lightning Bolt', type_line: 'Instant', mana_cost: '{R}', cmc: 1, keywords: [], oracle_text: 'Lightning Bolt deals 3 damage to any target.', colors: ['R'] }; // .listas/oficiais.json
for (const [n, k] of Object.entries({ Island: 'U', Forest: 'G', Mountain: 'R' })) C[n] = { name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${k}}.)`, colors: [] };
function mesa(seed = 35) {
  const b = ns => ns.map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b(['Echoing Truth', 'Urso', 'Lobo', 'Island']) }, { name: 'B', deck: b(['Urso', 'Lobo', 'Lightning Bolt', 'Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending, 20);
function campo() {
  let s = mesa(), et, meu, a1, a2, lobo; [s, et] = poe(s, 0, 'Echoing Truth', 'hand'); for (let i = 0; i < 2; i++) [s] = poe(s, 0, 'Island');
  [s, meu] = poe(s, 0, 'Urso'); [s, a1] = poe(s, 1, 'Urso'); [s, a2] = poe(s, 1, 'Urso'); [s, lobo] = poe(s, 1, 'Lobo');
  return { s, et, meu, a1, a2, lobo };
}

test('LT91 · Echoing Truth joga pelo leitor aprovado', () => {
  assert.equal(S.coverage(C['Echoing Truth']).level, 'completo'); assert.equal(S.APROVADAS['Echoing Truth'].leva, 'M-425');
});

test('LT91 · o alvo e todas as outras permanentes com o mesmo nome, dos dois jogadores, voltam à mão de cada dono; outro nome fica; terreno não é alvo', () => {
  const { s, et, meu, a1, a2, lobo } = campo();
  const alvos = legais(s, 0, a => a.t === 'cast' && a.oid === et); assert.ok(alvos.length);
  assert.ok(alvos.every(a => !/Island/.test(a.targets && s.objects[a.targets[0].oid] ? s.objects[a.targets[0].oid].name : '')), 'terreno não é alvo');
  const t = resolve(act(s, alvos.find(a => (a.targets && a.targets[0].oid === a1))));
  for (const o of [meu, a1, a2]) assert.equal(t.objects[o].zone, 'hand', 'Urso ' + o);
  assert.ok(t.zones[0].hand.includes(meu) && t.zones[1].hand.includes(a1) && t.zones[1].hand.includes(a2), 'mão de cada dono');
  assert.equal(t.objects[lobo].zone, 'battlefield');
});

test('LT91 · a permanente virada para baixo não tem nome (708.2): fica', () => {
  let { s, et, a1, a2 } = campo(); s = J(s); s.objects[a2].faceDown = true;
  const t = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === et && (a.targets && a.targets[0].oid === a1))[0]));
  assert.equal(t.objects[a1].zone, 'hand'); assert.equal(t.objects[a2].zone, 'battlefield');
});

test('LT91 · alvo ilegal na resolução (608.2b): a mágica não resolve e as outras com o mesmo nome ficam', () => {
  let { s, et, meu, a1, a2 } = campo(); s = J(s); let ch, m; [s, ch] = poe(s, 1, 'Lightning Bolt', 'hand'); [s, m] = poe(s, 1, 'Mountain');
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === et && (a.targets && a.targets[0].oid === a1))[0]);
  s = passaAte(s, x => x.turn.priority === 1 || !!x.pending, 5);
  const r = legais(s, 1, a => a.t === 'cast' && a.oid === ch && (a.targets && a.targets[0].oid === a1)); assert.ok(r.length, 'o oponente responde com o Lightning Bolt');
  const t = resolve(act(s, r[0]));
  assert.equal(t.objects[a1].zone, 'graveyard'); assert.equal(t.objects[meu].zone, 'battlefield'); assert.equal(t.objects[a2].zone, 'battlefield');
});
