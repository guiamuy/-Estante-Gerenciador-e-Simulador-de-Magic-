// M-504 · LT169 · revisão por lote CXLV: nove cartas que o leitor já lia por inteiro e que travam as listas iniciantes passam a jogar (APROVADAS).
// Textos da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json). Cobertura completa e o comportamento das frases que pedem. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Minotaur Skullcleaver', 'Rebuke', 'Goblin Fireslinger', 'Manic Vandal', 'Annihilate', 'Zap', 'Soulblade Djinn', 'Skyscanner', 'Vedalken Mesmerist'];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [...['Haste', 'Flying'].filter(k => c.oracle_text.split(String.fromCharCode(10)).some(l => l === k || l.startsWith(k + ' ')))].filter(Boolean), oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Reliquia: { name: 'Reliquia', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] }, Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Mountain: terra('Mountain', 'Mountain', 'R'), Plains: terra('Plains', 'Plains', 'W'), Island: terra('Island', 'Island', 'U'), Swamp: terra('Swamp', 'Swamp', 'B'), Forest: terra('Forest', 'Forest', 'G') });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: C[name].type_line.startsWith('Basic Land') ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 173, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Mountain', 'Plains', 'Island', 'Swamp', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Forest', 'Reliquia']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const tudo = s => { for (let i = 0; i < 80 && (s.stack.length || s.pending); i++) { const pk = s.pending; const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pass') || l[0]); } return s; };
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };

const semKw = n => ({ ...C[n], keywords: [] });
const resolve = (s, pref, alvo) => { for (let i = 0; i < 60 && (s.stack.length || s.pending); i++) { const pk = s.pending; if (pk && pk.kind === 'pick_target' && alvo != null) { s = act(s, { t: 'pick_target', p: pk.p, index: pk.options.findIndex(o => (typeof alvo === 'number' ? o.player === alvo : o.oid === alvo)) }); continue; } const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, (pref && l.find(pref)) || l.find(x => x.t === 'pass') || l[0]); } return s; };

test('LT169 · as nove jogam pelo leitor aprovado', () => {
  for (const n of NOMES) { assert.equal(S.coverage(C[n]).level, 'completo', n); assert.equal(S.APROVADAS[n].leva, 'M-504', n); }
});

test('LT169 · Minotaur Skullcleaver entra 4/2 e ataca no mesmo turno; Goblin Fireslinger: 1 de dano só em jogador', () => {
  let s = mesa(), mk; [s, mk] = poe(s, 0, 'Minotaur Skullcleaver', 'hand'); s = terras(s, 'Mountain', 3);
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === mk)[0])); assert.equal(E.stats(s, s.objects[mk]).power, 4);
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers', 20); assert.ok(legais(s, 0).some(a => a.t === 'attack' && (a.attackers || []).includes(mk)), 'ímpeto');
  let t = mesa(), gf, u; [t, u] = poe(t, 1, 'Urso'); [t, gf] = poe(t, 0, 'Goblin Fireslinger'); t = J(t); t.objects[gf].sick = false;
  const at = legais(t, 0, a => a.t === 'activate' && a.oid === gf); assert.ok(at.length > 0 && at.every(a => a.targets[0].player != null), 'nunca criatura');
  t = tudo(act(t, at.find(a => a.targets[0].player === 1))); assert.equal(t.players[1].life, 19);
});

test('LT169 · Rebuke só mira atacante; Manic Vandal destrói artefato ao entrar; Skyscanner voa e compra ao entrar', () => {
  let s = mesa(), rb, mk; [s, mk] = poe(s, 0, 'Minotaur Skullcleaver'); [s, rb] = poe(s, 0, 'Rebuke', 'hand'); s = terras(s, 'Plains', 3); s = J(s); s.objects[mk].sick = false;
  assert.equal(legais(s, 0, a => a.t === 'cast' && a.oid === rb).length, 0);
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers', 20); s = act(s, { t: 'attack', p: 0, attackers: [mk] });
  s = passaAte(s, x => x.turn.priority === 0 && !x.pending && legais(x, 0, a => a.t === 'cast' && a.oid === rb).length > 0, 10);
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === rb && a.targets[0].oid === mk)[0])); assert.equal(s.objects[mk].zone, 'graveyard');
  let t = mesa(), mv, r; [t, r] = poe(t, 1, 'Reliquia'); [t, mv] = poe(t, 0, 'Manic Vandal', 'hand'); t = terras(t, 'Mountain', 3);
  t = act(t, legais(t, 0, a => a.t === 'cast' && a.oid === mv)[0]); t = resolve(t, null, r); assert.equal(t.objects[r].zone, 'graveyard');
  let q = mesa(), sk; [q, sk] = poe(q, 0, 'Skyscanner', 'hand'); q = terras(q, 'Mountain', 3); const h0 = q.zones[0].hand.length;
  q = tudo(act(q, legais(q, 0, a => a.t === 'cast' && a.oid === sk)[0])); assert.equal(q.zones[0].hand.length, h0 - 1 + 1); assert.ok(E.hasKeyword(q, q.objects[sk], 'flying'));
});

test('LT169 · Annihilate destrói criatura não preta e compra; Zap: 1 de dano em qualquer alvo e compra', () => {
  let s = mesa(), an, u, vm; [s, u] = poe(s, 1, 'Urso'); [s, vm] = poe(s, 0, 'Vedalken Mesmerist'); [s, an] = poe(s, 0, 'Annihilate', 'hand'); s = terras(s, 'Swamp', 5); const h0 = s.zones[0].hand.length;
  const al = legais(s, 0, a => a.t === 'cast' && a.oid === an).map(a => a.targets[0].oid); assert.ok(al.includes(u) && al.includes(vm));
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === an && a.targets[0].oid === u)[0])); assert.equal(s.objects[u].zone, 'graveyard'); assert.equal(s.zones[0].hand.length, h0 - 1 + 1);
  let t = mesa(), z; [t, z] = poe(t, 0, 'Zap', 'hand'); t = terras(t, 'Mountain', 3); const k0 = t.zones[0].hand.length;
  t = tudo(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === z && a.targets[0].player === 1)[0])); assert.equal(t.players[1].life, 19); assert.equal(t.zones[0].hand.length, k0 - 1 + 1);
});

test('LT169 · Soulblade Djinn: mágica que não é criatura dá +1/+1 às suas criaturas; Vedalken Mesmerist: ao atacar, criatura do oponente -2/-0', () => {
  let s = mesa(), sd, z, mk; [s, sd] = poe(s, 0, 'Soulblade Djinn'); [s, mk] = poe(s, 0, 'Minotaur Skullcleaver', 'hand'); [s, z] = poe(s, 0, 'Zap', 'hand'); s = terras(s, 'Mountain', 6);
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === mk)[0])); assert.equal(E.stats(s, s.objects[sd]).power, 4, 'criatura não dispara');
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === z && a.targets[0].player === 1)[0])); assert.equal(E.stats(s, s.objects[sd]).power, 5); assert.equal(E.stats(s, s.objects[mk]).power, 5);
  assert.ok(E.hasKeyword(s, s.objects[sd], 'flying'));
  let t = mesa(), vm, u; [t, u] = poe(t, 1, 'Urso'); [t, vm] = poe(t, 0, 'Vedalken Mesmerist'); t = J(t); t.objects[vm].sick = false;
  t = passaAte(t, x => x.pending && x.pending.kind === 'attackers', 20); t = act(t, { t: 'attack', p: 0, attackers: [vm] }); t = resolve(t, null, u);
  assert.equal(E.stats(t, t.objects[u]).power, 0);
});
