// M-497 · LT163 · revisão por lote CXXXIX: nove cartas que o leitor já lia por inteiro e que travam as listas iniciantes passam a jogar (APROVADAS).
// Textos da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json). Cobertura completa e o comportamento das frases que pedem. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Skywing Aven', 'Barbarian Lunatic', 'Compulsion', "Knight's Pledge", 'Qasali Pridemage', 'Sylvan Ranger', 'Bloodhunter Bat', 'Essence Extraction', 'Untamed Hunger'];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [...['Flying', 'Exalted'].filter(k => c.oracle_text.split(String.fromCharCode(10)).some(l => l === k || l.startsWith(k + ' ')))].filter(Boolean), oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Reliquia: { name: 'Reliquia', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] }, Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Mountain: terra('Mountain', 'Mountain', 'R'), Plains: terra('Plains', 'Plains', 'W'), Island: terra('Island', 'Island', 'U'), Swamp: terra('Swamp', 'Swamp', 'B'), Forest: terra('Forest', 'Forest', 'G') });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: C[name].type_line.startsWith('Basic Land') ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 167, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Mountain', 'Plains', 'Island', 'Swamp', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Forest', 'Reliquia']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const tudo = s => { for (let i = 0; i < 80 && (s.stack.length || s.pending); i++) { const pk = s.pending; const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pass') || l[0]); } return s; };
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };

const semKw = n => ({ ...C[n], keywords: [] });
const resolve = (s, pref, alvoP) => { for (let i = 0; i < 60 && (s.stack.length || s.pending); i++) { const pk = s.pending; if (pk && pk.kind === 'pick_target' && alvoP != null) { s = act(s, { t: 'pick_target', p: pk.p, index: pk.options.findIndex(o => o.player === alvoP) }); continue; } const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, (pref && l.find(pref)) || l.find(x => x.t === 'pass') || l[0]); } return s; };

test('LT163 · as nove jogam pelo leitor aprovado', () => {
  for (const n of NOMES) { assert.equal(S.coverage(C[n]).level, 'completo', n); assert.equal(S.APROVADAS[n].leva, 'M-497', n); }
});

test('LT163 · Skywing Aven: descartar uma carta a devolve à mão do dono; Barbarian Lunatic: {2}{R} e sacrifício, 2 de dano na criatura alvo', () => {
  let s = mesa(), sa; [s, sa] = poe(s, 0, 'Skywing Aven'); assert.ok(E.hasKeyword(s, s.objects[sa], 'flying')); const h0 = s.zones[0].hand.length, g0 = s.zones[0].graveyard.length;
  const at = legais(s, 0, a => a.t === 'activate' && a.oid === sa); assert.ok(at.length > 0 && at.every(a => a.pay && (a.pay.discard || []).length === 1), 'descarte no custo, sem mana');
  s = tudo(act(s, at[0])); assert.ok(s.zones[0].hand.some(x => s.objects[x].name === 'Skywing Aven'), 'na mão'); assert.equal(s.zones[0].hand.length, h0 - 1 + 1); assert.equal(s.zones[0].graveyard.length, g0 + 1);
  let t = mesa(), bl, u; [t, u] = poe(t, 1, 'Urso'); [t, bl] = poe(t, 0, 'Barbarian Lunatic'); t = terras(t, 'Mountain', 3);
  t = tudo(act(t, legais(t, 0, a => a.t === 'activate' && a.oid === bl && a.targets && a.targets[0].oid === u)[0]));
  assert.equal(t.objects[u].zone, 'graveyard'); assert.equal(t.objects[bl].zone, 'graveyard');
});

test('LT163 · Compulsion: {1}{U} e descarte compra uma e fica; {1}{U} e sacrifício compra uma', () => {
  let s = mesa(), cp; [s, cp] = poe(s, 0, 'Compulsion'); s = terras(s, 'Island', 4); const h0 = s.zones[0].hand.length;
  const ds = legais(s, 0, a => a.t === 'activate' && a.oid === cp && a.pay && (a.pay.discard || []).length === 1); assert.ok(ds.length > 0);
  s = tudo(act(s, ds[0])); assert.equal(s.zones[0].hand.length, h0); assert.equal(s.objects[cp].zone, 'battlefield');
  const sc = legais(s, 0, a => a.t === 'activate' && a.oid === cp && !(a.pay && (a.pay.discard || []).length)); assert.ok(sc.length > 0);
  s = tudo(act(s, sc[0])); assert.equal(s.zones[0].hand.length, h0 + 1); assert.equal(s.objects[cp].zone, 'graveyard');
});

test("LT163 · Knight's Pledge dá +2/+2; Untamed Hunger dá +2/+1 e ameaça", () => {
  let s = mesa(), kp, sa; [s, sa] = poe(s, 0, 'Skywing Aven'); [s, kp] = poe(s, 0, "Knight's Pledge", 'hand'); s = terras(s, 'Plains', 2);
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === kp && a.targets[0].oid === sa)[0])); assert.equal(E.stats(s, s.objects[sa]).power, 4); assert.equal(E.stats(s, s.objects[sa]).toughness, 3);
  let t = mesa(), uh, s2; [t, s2] = poe(t, 0, 'Skywing Aven'); [t, uh] = poe(t, 0, 'Untamed Hunger', 'hand'); t = terras(t, 'Swamp', 3);
  assert.ok(!E.hasKeyword(t, t.objects[s2], 'menace'));
  t = tudo(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === uh && a.targets[0].oid === s2)[0])); assert.equal(E.stats(t, t.objects[s2]).power, 4); assert.equal(E.stats(t, t.objects[s2]).toughness, 2);
  assert.ok(E.hasKeyword(t, t.objects[s2], 'menace'));
});

test('LT163 · Qasali Pridemage: {1} e sacrifício destrói artefato ou encantamento; exaltado dá +1/+1 a quem ataca sozinha', () => {
  let s = mesa(), qp, r, cp; [s, r] = poe(s, 1, 'Reliquia'); [s, cp] = poe(s, 0, 'Compulsion'); [s, qp] = poe(s, 0, 'Qasali Pridemage'); s = terras(s, 'Forest', 1);
  const op = legais(s, 0, a => a.t === 'activate' && a.oid === qp); const alvos = op.map(a => a.targets[0].oid);
  assert.ok(alvos.includes(r) && alvos.includes(cp), 'artefato e encantamento');
  s = tudo(act(s, op.find(a => a.targets[0].oid === r))); assert.equal(s.objects[r].zone, 'graveyard'); assert.equal(s.objects[qp].zone, 'graveyard');
  let t = mesa(), q2, sa; [t, q2] = poe(t, 0, 'Qasali Pridemage'); [t, sa] = poe(t, 0, 'Skywing Aven'); t = J(t); t.objects[sa].sick = false;
  t = passaAte(t, x => x.pending && x.pending.kind === 'attackers', 20); t = act(t, { t: 'attack', p: 0, attackers: [sa] });
  for (let i = 0; i < 10 && t.stack.length && !t.pending; i++) t = act(t, { t: 'pass', p: t.turn.priority });
  assert.equal(E.stats(t, t.objects[sa]).power, 3);
});

test('LT163 · Sylvan Ranger busca um básico para a mão se você quiser; Bloodhunter Bat: alvo perde 2 e você ganha 2; Essence Extraction: 3 de dano e ganha 3', () => {
  let s = mesa(), sr; [s, sr] = poe(s, 0, 'Sylvan Ranger', 'hand'); s = terras(s, 'Forest', 2); const h0 = s.zones[0].hand.length;
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === sr)[0]); s = resolve(s, x => x.t === 'pay' || x.t === 'pick');
  assert.equal(s.zones[0].hand.length, h0); const nova = s.zones[0].hand.map(x => s.objects[x]).filter(o => /^Basic Land/.test(C[o.name].type_line)); assert.ok(nova.length >= 1, 'um básico na mão');
  let n = mesa(), s2; [n, s2] = poe(n, 0, 'Sylvan Ranger', 'hand'); n = terras(n, 'Forest', 2); const k0 = n.zones[0].hand.length, l0 = n.zones[0].library.length;
  n = act(n, legais(n, 0, a => a.t === 'cast' && a.oid === s2)[0]); n = resolve(n, x => x.t === 'decline'); assert.equal(n.zones[0].hand.length, k0 - 1); assert.equal(n.zones[0].library.length, l0);
  let t = mesa(), bb; [t, bb] = poe(t, 0, 'Bloodhunter Bat', 'hand'); t = terras(t, 'Swamp', 4);
  t = act(t, legais(t, 0, a => a.t === 'cast' && a.oid === bb)[0]); t = resolve(t, null, 1);
  assert.equal(t.players[1].life, 18); assert.equal(t.players[0].life, 22); assert.ok(E.hasKeyword(t, t.objects[bb], 'flying'));
  let q = mesa(), ee, u; [q, u] = poe(q, 1, 'Urso'); [q, ee] = poe(q, 0, 'Essence Extraction', 'hand'); q = terras(q, 'Swamp', 3);
  q = tudo(act(q, legais(q, 0, a => a.t === 'cast' && a.oid === ee && a.targets[0].oid === u)[0])); assert.equal(q.objects[u].zone, 'graveyard'); assert.equal(q.players[0].life, 23);
});
