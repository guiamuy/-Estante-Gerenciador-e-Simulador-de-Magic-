// M-530 · LT192 · revisão por lote CLXVIII (textos da Scryfall de 19/10/2026): Murktide Regent ("enters with a +1/+1 counter on it for each
// instant and sorcery card exiled with it" — as cartas que o delve desta mágica exilou, 607.2a; "Whenever an instant or sorcery card leaves your
// graveyard" — um disparo por carta, 603.10a) e Flow State ("If there is an instant card and a sorcery card in your graveyard, instead put two
// of them into your hand", conferido na resolução). Falham no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const KW = { 'Murktide Regent': ['Delve', 'Flying'] };
const NOMES = ['Murktide Regent', 'Flow State'];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: KW[n] || [], oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Island: terra('Island', 'Island', 'U'), Forest: terra('Forest', 'Forest', 'G'),
  'Lightning Bolt': { name: 'Lightning Bolt', type_line: 'Instant', mana_cost: '{R}', cmc: 1, keywords: [], oracle_text: 'Lightning Bolt deals 3 damage to any target.', colors: ['R'] },
  Feitico: { name: 'Feitico', type_line: 'Sorcery', mana_cost: '{3}', cmc: 3, keywords: [], oracle_text: '', colors: [] },
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', power: '2', toughness: '2', colors: ['G'] } });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: /Land/.test(C[name].type_line) ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 212, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Lightning Bolt', 'Feitico', 'Urso', 'Island', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Lightning Bolt', 'Feitico', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };
const limpa = s => passaAte(s, x => !x.stack.length && !x.pending && !(x.queued || []).length);
const cemiterio = (s, p, ns) => { const oids = []; for (const n of ns) { let o; [s, o] = poe(s, p, n, 'graveyard'); oids.push(o); } return [s, oids]; };
// conjura a Murktide com delve exilando exatamente `exila` (oids do cemitério)
function murktide(s, mk, exila) {
  const a = legais(s, 0, x => x.t === 'cast' && x.oid === mk && (x.delve || 0) === exila.length)[0]; assert.ok(a, `conjurar com delve ${exila.length}`);
  s = act(s, a);
  for (const oid of exila) { assert.equal(s.pending && s.pending.kind, 'pick'); s = act(s, { t: 'pick', p: 0, oid }); }
  return s;
}

test('M-530 · Murktide Regent entra com um marcador por instantânea ou feitiço exilado pelo delve (terreno e criatura não contam)', () => {
  let s = mesa(), mk, gy; [s, mk] = poe(s, 0, 'Murktide Regent', 'hand'); s = terras(s, 'Island', 3);
  [s, gy] = cemiterio(s, 0, ['Lightning Bolt', 'Lightning Bolt', 'Feitico', 'Forest']);
  s = limpa(murktide(s, mk, gy)); assert.equal(s.objects[mk].zone, 'battlefield');
  assert.equal((s.objects[mk].counters || {}).p1p1, 3); assert.equal(E.stats(s, s.objects[mk]).power, 6);
  let t = mesa(), m2; [t, m2] = poe(t, 0, 'Murktide Regent', 'hand'); t = terras(t, 'Island', 7);
  t = limpa(murktide(t, m2, [])); assert.equal((t.objects[m2].counters || {}).p1p1 || 0, 0, 'sem delve: 3/3');
});

test('M-530 · Murktide Regent: um marcador para cada instantânea ou feitiço que sai do seu cemitério (por carta, não por evento)', () => {
  let s = mesa(), m1, m2, gy; [s, m1] = poe(s, 0, 'Murktide Regent'); [s, m2] = poe(s, 0, 'Murktide Regent', 'hand'); s = terras(s, 'Island', 3);
  [s, gy] = cemiterio(s, 0, ['Lightning Bolt', 'Feitico', 'Urso', 'Forest']);
  s = limpa(murktide(s, m2, gy));
  assert.equal((s.objects[m1].counters || {}).p1p1, 2, 'a instantânea e o feitiço dispararam; a criatura e o terreno não');
  assert.equal((s.objects[m2].counters || {}).p1p1, 2, 'a que entrou não viu as próprias (estava na pilha)');
});

test('M-530 · Murktide Regent: carta do cemitério do oponente não dispara', () => {
  let s = mesa(), m1, gy; [s, m1] = poe(s, 0, 'Murktide Regent'); [s, gy] = cemiterio(s, 1, ['Lightning Bolt']);
  s = J(s); E.moveObject(s, gy[0], 'exile'); s = limpa(act(s, legais(s, 0, a => a.t === 'pass')[0] || { t: 'pass', p: 0 }));
  assert.equal((s.objects[m1].counters || {}).p1p1 || 0, 0);
});

test('M-530 · Flow State: uma carta para a mão; duas com uma instantânea e um feitiço no seu cemitério', () => {
  const olha = gyNomes => { let s = mesa(), fs; [s, fs] = poe(s, 0, 'Flow State', 'hand'); s = terras(s, 'Island', 2); [s] = cemiterio(s, 0, gyNomes);
    s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === fs)[0]); s = passaAte(s, x => !!x.pending && x.pending.kind === 'pick');
    return [s, s.pending]; };
  let [s, pk] = olha(['Lightning Bolt']); assert.equal(pk.from.length, 3); assert.equal(pk.max, 1); assert.equal(pk.min, 1, 'só instantânea (o próprio Flow State está na pilha)');
  [s, pk] = olha(['Lightning Bolt', 'Feitico']); assert.equal(pk.max, 2); assert.equal(pk.min, 2);
  const mao = s.zones[0].hand.length, [a, b, c] = pk.from;
  s = act(s, { t: 'pick', p: 0, oid: a }); s = limpa(act(s, { t: 'pick', p: 0, oid: b }));
  assert.equal(s.zones[0].hand.length, mao + 2); assert.equal(s.objects[c].zone, 'library'); assert.equal(s.zones[0].library.indexOf(c), s.zones[0].library.length - 1, 'o resto vai para o fundo');
});

test('M-530 · Flow State com a condição e uma carta só no grimório: ela vai para a mão e a escolha fecha sozinha (achado da revisão)', () => {
  let s = mesa(), fs; [s, fs] = poe(s, 0, 'Flow State', 'hand'); s = terras(s, 'Island', 2); [s] = cemiterio(s, 0, ['Lightning Bolt', 'Feitico']);
  s = J(s); const lib = s.zones[0].library; for (const oid of lib.splice(1)) { s.objects[oid].zone = 'exile'; s.zones[0].exile.push(oid); }
  const ultima = s.zones[0].library[0];
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === fs)[0]); s = passaAte(s, x => !!x.pending && x.pending.kind === 'pick');
  assert.equal(s.pending.max, 1); s = limpa(act(s, { t: 'pick', p: 0, oid: ultima }));
  assert.equal(s.objects[ultima].zone, 'hand'); assert.ok(!s.pending && !s.stack.length);
});
