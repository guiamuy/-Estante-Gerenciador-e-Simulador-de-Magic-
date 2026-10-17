// M-502 · LT168 · revisão por lote CXLIV: nove cartas que o leitor já lia por inteiro e que travam as listas iniciantes passam a jogar (APROVADAS).
// Textos da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json). Cobertura completa e o comportamento das frases que pedem. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ["Sovereign's Bite", 'Strangling Spores', 'Dark Remedy', 'Symbiote Spawn', 'Hagra Sharpshooter', 'Tar Snare', 'Moment of Craving', "Warlord's Axe", 'Satyr Hedonist'];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [].filter(Boolean), oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Reliquia: { name: 'Reliquia', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] }, Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Mountain: terra('Mountain', 'Mountain', 'R'), Plains: terra('Plains', 'Plains', 'W'), Island: terra('Island', 'Island', 'U'), Swamp: terra('Swamp', 'Swamp', 'B'), Forest: terra('Forest', 'Forest', 'G') });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: C[name].type_line.startsWith('Basic Land') ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 172, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Mountain', 'Plains', 'Island', 'Swamp', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Forest', 'Reliquia']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const tudo = s => { for (let i = 0; i < 80 && (s.stack.length || s.pending); i++) { const pk = s.pending; const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pass') || l[0]); } return s; };
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };

const semKw = n => ({ ...C[n], keywords: [] });
const resolve = (s, pref, alvo) => { for (let i = 0; i < 60 && (s.stack.length || s.pending); i++) { const pk = s.pending; if (pk && pk.kind === 'pick_target' && alvo != null) { s = act(s, { t: 'pick_target', p: pk.p, index: pk.options.findIndex(o => (typeof alvo === 'number' ? o.player === alvo : o.oid === alvo)) }); continue; } const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, (pref && l.find(pref)) || l.find(x => x.t === 'pass') || l[0]); } return s; };

test('LT168 · as nove jogam pelo leitor aprovado', () => {
  for (const n of NOMES) { assert.equal(S.coverage(C[n]).level, 'completo', n); assert.equal(S.APROVADAS[n].leva, 'M-502', n); }
});

test("LT168 · Sovereign's Bite: alvo perde 3 e você ganha 3; Symbiote Spawn ao morrer: cada oponente perde 2 e você ganha 2", () => {
  let s = mesa(), sb; [s, sb] = poe(s, 0, "Sovereign's Bite", 'hand'); s = terras(s, 'Swamp', 2);
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === sb && a.targets[0].player === 1)[0])); assert.equal(s.players[1].life, 17); assert.equal(s.players[0].life, 23);
  let t = mesa(), sp, ss; [t, sp] = poe(t, 0, 'Symbiote Spawn'); [t, ss] = poe(t, 0, 'Strangling Spores', 'hand'); t = terras(t, 'Swamp', 4);
  t = tudo(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === ss && a.targets[0].oid === sp)[0]));
  assert.equal(t.objects[sp].zone, 'graveyard'); assert.equal(t.players[1].life, 18); assert.equal(t.players[0].life, 22);
});

test('LT168 · Strangling Spores -3/-3, Tar Snare -3/-2, Moment of Craving -2/-2 e ganha 2, Dark Remedy +1/+3 (até o fim do turno)', () => {
  let s = mesa(), ts, dr, mc, ss, u; [s, u] = poe(s, 1, 'Urso'); [s, dr] = poe(s, 0, 'Dark Remedy', 'hand'); [s, ts] = poe(s, 0, 'Tar Snare', 'hand'); s = terras(s, 'Swamp', 5);
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === dr && a.targets[0].oid === u)[0])); assert.equal(E.stats(s, s.objects[u]).power, 3); assert.equal(E.stats(s, s.objects[u]).toughness, 5);
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === ts && a.targets[0].oid === u)[0])); assert.equal(E.stats(s, s.objects[u]).power, 0); assert.equal(E.stats(s, s.objects[u]).toughness, 3); assert.equal(s.objects[u].zone, 'battlefield');
  let t = mesa(), u2; [t, u2] = poe(t, 1, 'Urso'); [t, mc] = poe(t, 0, 'Moment of Craving', 'hand'); t = terras(t, 'Swamp', 2);
  t = tudo(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === mc && a.targets[0].oid === u2)[0])); assert.equal(t.objects[u2].zone, 'graveyard'); assert.equal(t.players[0].life, 22);
  let q = mesa(), u3; [q, u3] = poe(q, 1, 'Urso'); [q, ss] = poe(q, 0, 'Strangling Spores', 'hand'); q = terras(q, 'Swamp', 4);
  q = tudo(act(q, legais(q, 0, a => a.t === 'cast' && a.oid === ss && a.targets[0].oid === u3)[0])); assert.equal(q.objects[u3].zone, 'graveyard');
});

test('LT168 · Hagra Sharpshooter: {4}{B} dá -1/-1 à criatura alvo, quantas vezes pagar', () => {
  let s = mesa(), hs, u; [s, u] = poe(s, 1, 'Urso'); [s, hs] = poe(s, 0, 'Hagra Sharpshooter'); s = terras(s, 'Swamp', 10);
  s = tudo(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === hs && a.targets && a.targets[0].oid === u)[0])); assert.equal(E.stats(s, s.objects[u]).power, 1);
  s = tudo(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === hs && a.targets && a.targets[0].oid === u)[0])); assert.equal(s.objects[u].zone, 'graveyard');
});

test("LT168 · Warlord's Axe equipa por {4}: +3/+1; Satyr Hedonist: {R} e sacrifício dão {R}{R}{R} sem usar a pilha", () => {
  let s = mesa(), wa, sp; [s, sp] = poe(s, 0, 'Symbiote Spawn'); [s, wa] = poe(s, 0, "Warlord's Axe"); s = terras(s, 'Swamp', 3);
  assert.equal(legais(s, 0, a => a.t === 'activate' && a.oid === wa).length, 0, 'equipar custa {4}');
  s = terras(s, 'Swamp', 1); s = tudo(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === wa && a.targets && a.targets[0].oid === sp)[0]));
  assert.equal(E.stats(s, s.objects[sp]).power, 6); assert.equal(E.stats(s, s.objects[sp]).toughness, 3);
  let t = mesa(), sh; [t, sh] = poe(t, 0, 'Satyr Hedonist'); t = terras(t, 'Mountain', 1);
  const at = legais(t, 0, a => a.t === 'activate' && a.oid === sh); assert.ok(at.length > 0);
  t = act(t, at[0]); assert.equal(t.stack.length, 0, 'habilidade de mana'); assert.equal(t.players[0].pool.R, 3); assert.equal(t.objects[sh].zone, 'graveyard');
});
