// L-8 · trilha listas · Pauper de M a Z, lote 8: os pedidos do motor com primitiva na M-356…M-362, numa partida em modo único (mana cobrada),
// com o texto oficial de .listas/oficiais-listas.json (Oracle do Forge, consulta de 12/10/2026). Cada teste cita a frase.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, passaAte, mesa, comMana, tudo, fichas, criatura, CARTAS } from './trilha-listas.mjs';

criatura('Urso de Teste', 2, 2);
criatura('Sombra de Teste', 1, 1, { colors: ['B'] });
CARTAS['Wall of Roots'].keywords = ['Defender']; CARTAS['Seize the Storm'].keywords = ['Flashback'];

const conjura = (s, oid, mana, f = () => true, p = 0) => { const m = comMana(s, mana, p); const a = legais(m, p, x => x.t === 'cast' && x.oid === oid && f(x)); if (!a.length) throw new Error('não ofereceu'); return tudo(act(m, a[0])); };
const pt = (s, oid) => [E.stats(s, s.objects[oid]).power, E.stats(s, s.objects[oid]).toughness];
const total = pool => Object.values(pool).reduce((n, v) => n + (v || 0), 0);

test('L-8 · Tithing Blade: "When Tithing Blade enters, each opponent sacrifices a creature."', () => {
  let s = mesa(['Tithing Blade'], ['Urso de Teste']), tb, deles; [s, tb] = poe(s, 0, 'Tithing Blade', 'hand'); [s, deles] = poe(s, 1, 'Urso de Teste');
  const r = conjura(s, tb, 'BB');
  assert.equal(r.objects[tb].zone, 'battlefield'); assert.notEqual(r.objects[deles].zone, 'battlefield', 'o oponente sacrificou');
});

test('L-8 · Tithing Blade: "Craft with creature {4}{B}" — exila a lâmina e uma criatura sua e volta como Consuming Sepulcher, que drena 1 na sua manutenção', () => {
  let s = mesa(['Tithing Blade', 'Urso de Teste']), tb, urso; [s, tb] = poe(s, 0, 'Tithing Blade'); [s, urso] = poe(s, 0, 'Urso de Teste');
  assert.equal(legais(comMana(s, 'BBBB'), 0, a => a.t === 'activate' && a.oid === tb).length, 0, 'com 4 manas não fabrica');
  const m = comMana(s, 'BBBBB'), cr = legais(m, 0, a => a.t === 'activate' && a.oid === tb);
  assert.ok(cr.length, 'fabricar com {4}{B} e uma criatura');
  const r = tudo(act(m, cr[0]));
  const sep = Object.values(r.objects).find(o => o.zone === 'battlefield' && o.name === 'Consuming Sepulcher');
  assert.ok(sep, 'voltou transformada'); assert.notEqual(r.objects[urso].zone, 'battlefield', 'a criatura foi exilada como material');
  const v = [r.players[0].life, r.players[1].life];
  const up = passaAte(r, x => x.turn.active === 0 && x.turn.step === 'main1' && x.turn.number > r.turn.number && !x.stack.length && !x.pending, 400);
  assert.deepEqual([up.players[0].life, up.players[1].life], [v[0] + 1, v[1] - 1], '"each opponent loses 1 life and you gain 1 life"');
});

test('L-8 · Manamorphose: "Add two mana in any combination of colors. Draw a card."', () => {
  let s = mesa(['Manamorphose']), mm; [s, mm] = poe(s, 0, 'Manamorphose', 'hand');
  const mao = s.zones[0].hand.length;
  const r = conjura(s, mm, 'RR');
  assert.equal(total(r.players[0].pool), 2, 'duas manas no fim'); assert.equal(r.zones[0].hand.length, mao - 1 + 1, 'comprou uma');
});

test('L-8 · Seize the Storm: a ficha Elemental com atropelar tem P/R = instantâneas e feitiços no seu cemitério + cartas com flashback suas no exílio; "Flashback {6}{R}"', () => {
  let s = mesa(['Seize the Storm', 'Manamorphose', 'Tangle']), st; [s] = poe(s, 0, 'Manamorphose', 'graveyard'); [s] = poe(s, 0, 'Tangle', 'graveyard'); [s, st] = poe(s, 0, 'Seize the Storm', 'hand');
  let r = conjura(s, st, 'RRRRR');
  const [f] = fichas(r, 0, 'Elemental'); assert.ok(f, 'criou a ficha');
  assert.ok(E.hasKeyword(r, f, 'trample'));
  assert.deepEqual(pt(r, f.oid), [3, 3], 'duas no cemitério + o próprio Seize the Storm, que foi para o cemitério');
  const fb = legais(comMana(r, 'RRRRRRR'), 0, a => a.t === 'cast' && a.oid === st);
  assert.ok(fb.length, 'flashback do cemitério'); r = tudo(act(comMana(r, 'RRRRRRR'), fb[0]));
  assert.equal(r.objects[st].zone, 'exile');
  const els = fichas(r, 0, 'Elemental'); assert.equal(els.length, 2);
  for (const e of els) assert.deepEqual(pt(r, e.oid), [3, 3], 'duas no cemitério + uma com flashback no exílio');
});

test('L-8 · Wall of Roots: "Put a -0/-1 counter on Wall of Roots: Add {G}. Activate only once each turn." e "Defender"', () => {
  let s = mesa(['Wall of Roots']), wr; [s, wr] = poe(s, 0, 'Wall of Roots');
  assert.ok(E.hasKeyword(s, s.objects[wr], 'defender'));
  const at = legais(s, 0, a => a.t === 'activate' && a.oid === wr); assert.ok(at.length, 'sem virar e sem mana');
  const r = act(s, at[0]);
  assert.equal(r.players[0].pool.G, 1); assert.deepEqual(pt(r, wr), [0, 4], 'marcador −0/−1');
  assert.equal(legais(r, 0, a => a.t === 'activate' && a.oid === wr).length, 0, 'uma vez por turno');
});

test('L-8 · Tangle: "Prevent all combat damage that would be dealt this turn. Each attacking creature doesn\'t untap during its controller\'s next untap step."', () => {
  let s = mesa(['Urso de Teste'], ['Tangle']), u, tg; [s, u] = poe(s, 0, 'Urso de Teste', 'battlefield', { sick: false }); [s, tg] = poe(s, 1, 'Tangle', 'hand');
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 0); s = act(s, { t: 'attack', p: 0, attackers: [u] });
  s = passaAte(s, x => x.turn.priority === 1 && !x.pending && !x.stack.length, 60);
  const vida = s.players[1].life;
  const m = comMana(s, 'GG', 1); s = act(m, legais(m, 1, a => a.t === 'cast' && a.oid === tg)[0]);
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending, 400);
  assert.equal(s.players[1].life, vida, 'dano de combate prevenido');
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending, 400);
  assert.equal(s.objects[u].tapped, true, 'a que atacou não desvirou no próximo desvirar');
});

const jogaCottage = (outros) => {
  let s = mesa(["Witch's Cottage", 'Urso de Teste']), wc, u;
  for (let i = 0; i < outros; i++) [s] = poe(s, 0, 'Swamp');
  [s, u] = poe(s, 0, 'Urso de Teste', 'graveyard'); [s, wc] = poe(s, 0, "Witch's Cottage", 'hand');
  const t = act(s, legais(s, 0, a => a.t === 'play_land' && a.oid === wc)[0]);
  return [t, wc, u];
};

test('L-8 · Witch\'s Cottage: com três outros Pântanos entra desvirada e "you may put target creature card from your graveyard on top of your library"', () => {
  let [t, wc, u] = jogaCottage(3);
  assert.equal(t.objects[wc].tapped, false);
  t = tudo(t, x => legais(x, x.pending.p).find(a => (a.targets || []).some(y => y && y.oid === u) || a.oid === u) || legais(x, x.pending.p)[0]);
  assert.equal(t.zones[0].library[0], u, 'a criatura foi para o topo');
});

test('L-8 · Witch\'s Cottage: com dois outros Pântanos entra virada e o gatilho não dispara', () => {
  const [t, wc, u] = jogaCottage(2);
  assert.equal(t.objects[wc].tapped, true);
  const r = tudo(t); assert.equal(r.objects[u].zone, 'graveyard');
});

test('L-8 · Spinning Darkness: "exile the top three black cards of your graveyard rather than pay" e "3 damage to target nonblack creature. You gain 3 life."', () => {
  let s = mesa(['Spinning Darkness', 'Sombra de Teste'], ['Urso de Teste', 'Sombra de Teste']), sd, ub, sb;
  for (let i = 0; i < 3; i++) [s] = poe(s, 0, 'Sombra de Teste', 'graveyard');
  [s, sd] = poe(s, 0, 'Spinning Darkness', 'hand'); [s, ub] = poe(s, 1, 'Urso de Teste'); [s, sb] = poe(s, 1, 'Sombra de Teste');
  const of = legais(s, 0, a => a.t === 'cast' && a.oid === sd && a.alt != null);
  assert.ok(of.length, 'sem mana, pelo custo alternativo'); assert.ok(of.every(a => !(a.targets || []).some(t => t && t.oid === sb)), 'criatura preta não é alvo');
  const vida = s.players[0].life;
  const r = tudo(act(s, of.find(a => (a.targets || []).some(t => t && t.oid === ub))));
  assert.notEqual(r.objects[ub].zone, 'battlefield', '3 de dano no Urso'); assert.equal(r.players[0].life, vida + 3);
  assert.equal(r.zones[0].graveyard.filter(o => r.objects[o].name === 'Sombra de Teste').length, 0, 'as três pretas foram exiladas');
  let t = mesa(['Spinning Darkness', 'Sombra de Teste'], ['Urso de Teste']), sd2;
  for (let i = 0; i < 2; i++) [t] = poe(t, 0, 'Sombra de Teste', 'graveyard');
  [t, sd2] = poe(t, 0, 'Spinning Darkness', 'hand'); [t] = poe(t, 1, 'Urso de Teste');
  assert.equal(legais(t, 0, a => a.t === 'cast' && a.oid === sd2 && a.alt != null).length, 0, 'com duas pretas não oferece');
});
