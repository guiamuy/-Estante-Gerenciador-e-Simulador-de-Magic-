// M-499 · LT165 · revisão por lote CXLI: nove cartas que o leitor já lia por inteiro e que travam as listas iniciantes passam a jogar (APROVADAS).
// Textos da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json). Cobertura completa e o comportamento das frases que pedem. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Impale', "Artisan's Sorrow", 'Counsel of the Soratami', 'Tidings', 'Undercity Troll', 'Unknown Shores', 'Plague Dogs', 'Meteorite', 'Soul Feast'];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [...['Renown'].filter(k => c.oracle_text.split(String.fromCharCode(10)).some(l => l === k || l.startsWith(k + ' ')))].filter(Boolean), oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Reliquia: { name: 'Reliquia', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] }, Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Mountain: terra('Mountain', 'Mountain', 'R'), Plains: terra('Plains', 'Plains', 'W'), Island: terra('Island', 'Island', 'U'), Swamp: terra('Swamp', 'Swamp', 'B'), Forest: terra('Forest', 'Forest', 'G') });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: C[name].type_line.startsWith('Basic Land') ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 169, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Mountain', 'Plains', 'Island', 'Swamp', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Forest', 'Reliquia']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const tudo = s => { for (let i = 0; i < 80 && (s.stack.length || s.pending); i++) { const pk = s.pending; const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pass') || l[0]); } return s; };
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };

const semKw = n => ({ ...C[n], keywords: [] });
const resolve = (s, pref, alvo) => { for (let i = 0; i < 60 && (s.stack.length || s.pending); i++) { const pk = s.pending; if (pk && pk.kind === 'pick_target' && alvo != null) { s = act(s, { t: 'pick_target', p: pk.p, index: pk.options.findIndex(o => (typeof alvo === 'number' ? o.player === alvo : o.oid === alvo)) }); continue; } const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, (pref && l.find(pref)) || l.find(x => x.t === 'pass') || l[0]); } return s; };

test('LT165 · as nove jogam pelo leitor aprovado', () => {
  for (const n of NOMES) { assert.equal(S.coverage(C[n]).level, 'completo', n); assert.equal(S.APROVADAS[n].leva, 'M-499', n); }
});

test('LT165 · Impale destrói a criatura alvo; Soul Feast: alvo perde 4 e você ganha 4; Counsel compra duas e Tidings quatro', () => {
  let s = mesa(), im, u; [s, u] = poe(s, 1, 'Urso'); [s, im] = poe(s, 0, 'Impale', 'hand'); s = terras(s, 'Swamp', 4);
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === im && a.targets[0].oid === u)[0])); assert.equal(s.objects[u].zone, 'graveyard');
  let t = mesa(), sf; [t, sf] = poe(t, 0, 'Soul Feast', 'hand'); t = terras(t, 'Swamp', 5);
  t = tudo(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === sf && a.targets[0].player === 1)[0])); assert.equal(t.players[1].life, 16); assert.equal(t.players[0].life, 24);
  let q = mesa(), co, ti; [q, co] = poe(q, 0, 'Counsel of the Soratami', 'hand'); [q, ti] = poe(q, 0, 'Tidings', 'hand'); q = terras(q, 'Island', 8); const h0 = q.zones[0].hand.length;
  q = tudo(act(q, legais(q, 0, a => a.t === 'cast' && a.oid === co)[0])); assert.equal(q.zones[0].hand.length, h0 - 1 + 2);
  q = tudo(act(q, legais(q, 0, a => a.t === 'cast' && a.oid === ti)[0])); assert.equal(q.zones[0].hand.length, h0 - 2 + 6);
});

test("LT165 · Artisan's Sorrow destrói artefato ou encantamento e faz vidência 2", () => {
  let s = mesa(), ar, r; [s, r] = poe(s, 1, 'Reliquia'); [s, ar] = poe(s, 0, "Artisan's Sorrow", 'hand'); s = terras(s, 'Forest', 4); const l0 = s.zones[0].library.length;
  const topo = s.zones[0].library.slice(0, 2).sort(); s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === ar && a.targets[0].oid === r)[0]);
  let viu = false; for (let i = 0; i < 40 && (s.stack.length || s.pending); i++) { const pk = s.pending; if (pk && pk.kind === 'pick' && !viu) { viu = true; assert.deepEqual([...legais(s, 0).filter(x => x.t === 'pick').map(x => x.oid)].sort(), [...topo], 'as duas do topo'); } const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pass') || l[0]); }
  assert.ok(viu, 'vidência pede decisão'); assert.equal(s.objects[r].zone, 'graveyard'); assert.equal(s.zones[0].library.length, l0);
});

test('LT165 · Undercity Troll regenera com {2}{G}; Unknown Shores dá {C} e, com {1} e {T}, mana de qualquer cor fora da pilha', () => {
  let s = mesa(), ut; [s, ut] = poe(s, 0, 'Undercity Troll'); s = terras(s, 'Forest', 3);
  s = tudo(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === ut)[0])); let m = J(s); m.objects[ut].damage = 9; m = tudo(act(m, { t: 'pass', p: 0 }));
  assert.equal(m.objects[ut].zone, 'battlefield'); assert.ok(m.objects[ut].tapped);
  let t = mesa(), us, co; [t, us] = poe(t, 0, 'Unknown Shores'); [t, co] = poe(t, 0, 'Counsel of the Soratami', 'hand'); t = terras(t, 'Forest', 3);
  assert.ok(legais(t, 0, a => a.t === 'tap_mana' && a.oid === us).length > 0, '{T}: {C}');
  t = act(t, legais(t, 0, a => a.t === 'activate' && a.oid === us && a.color === 'U')[0]); assert.equal(t.stack.length, 0, 'habilidade de mana'); assert.equal(t.players[0].pool.U, 1);
  t = tudo(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === co)[0])); assert.equal(t.objects[co].zone, 'graveyard');
});

test('LT165 · Plague Dogs: {2} e sacrifício compra; ao morrer, todas as criaturas ganham -1/-1 até o fim do turno', () => {
  let s = mesa(), pd, u; [s, u] = poe(s, 1, 'Urso'); [s, pd] = poe(s, 0, 'Plague Dogs'); s = terras(s, 'Swamp', 2); const h0 = s.zones[0].hand.length;
  s = tudo(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === pd)[0]));
  assert.equal(s.objects[pd].zone, 'graveyard'); assert.equal(s.zones[0].hand.length, h0 + 1); assert.equal(E.stats(s, s.objects[u]).power, 1); assert.equal(E.stats(s, s.objects[u]).toughness, 1);
});

test('LT165 · Meteorite: ao entrar, 2 de dano em qualquer alvo (jogador ou criatura); vira para mana de qualquer cor', () => {
  let s = mesa(), me; [s, me] = poe(s, 0, 'Meteorite', 'hand'); s = terras(s, 'Forest', 5);
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === me)[0]); s = resolve(s, null, 1); assert.equal(s.players[1].life, 18);
  const tm = legais(s, 0, a => a.t === 'tap_mana' && a.oid === me); assert.ok(tm.length >= 1);
  let t = mesa(), m2, u; [t, u] = poe(t, 1, 'Urso'); [t, m2] = poe(t, 0, 'Meteorite', 'hand'); t = terras(t, 'Forest', 5);
  t = act(t, legais(t, 0, a => a.t === 'cast' && a.oid === m2)[0]); t = resolve(t, null, u); assert.equal(t.objects[u].zone, 'graveyard');
});
