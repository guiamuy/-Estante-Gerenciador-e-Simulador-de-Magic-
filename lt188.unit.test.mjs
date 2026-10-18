// M-506 · LT171 · revisão por lote CXLVII: nove cartas que o leitor já lia por inteiro e que travam as listas iniciantes passam a jogar (APROVADAS).
// Textos da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json). Cobertura completa e o comportamento das frases que pedem. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Runewing', 'Grim Roustabout', 'Explosive Impact', 'Seller of Songbirds', "Centaur's Herald", 'Frilled Oculus', 'Sunhome, Fortress of the Legion', 'Coat with Venom', 'Waterfront Bouncer'];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [...['Flying', 'Unleash'].filter(k => c.oracle_text.split(String.fromCharCode(10)).some(l => l === k || l.startsWith(k + ' ')))].filter(Boolean), oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Reliquia: { name: 'Reliquia', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] }, Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Mountain: terra('Mountain', 'Mountain', 'R'), Plains: terra('Plains', 'Plains', 'W'), Island: terra('Island', 'Island', 'U'), Swamp: terra('Swamp', 'Swamp', 'B'), Forest: terra('Forest', 'Forest', 'G') });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: C[name].type_line.startsWith('Basic Land') ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 175, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Mountain', 'Plains', 'Island', 'Swamp', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Forest', 'Reliquia']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const tudo = s => { for (let i = 0; i < 80 && (s.stack.length || s.pending); i++) { const pk = s.pending; const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pass') || l[0]); } return s; };
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };

const semKw = n => ({ ...C[n], keywords: [] });
const resolve = (s, pref, alvo) => { for (let i = 0; i < 60 && (s.stack.length || s.pending); i++) { const pk = s.pending; if (pk && pk.kind === 'pick_target' && alvo != null) { s = act(s, { t: 'pick_target', p: pk.p, index: pk.options.findIndex(o => (typeof alvo === 'number' ? o.player === alvo : o.oid === alvo)) }); continue; } const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, (pref && l.find(pref)) || l.find(x => x.t === 'pass') || l[0]); } return s; };

test('LT171 · as nove jogam pelo leitor aprovado', () => {
  for (const n of NOMES) { assert.equal(S.coverage(C[n]).level, 'completo', n); assert.equal(S.APROVADAS[n].leva, 'M-506', n); }
});

test('LT171 · Runewing voa e compra ao morrer; Explosive Impact: 5 de dano em qualquer alvo', () => {
  let s = mesa(), rw, ei; [s, rw] = poe(s, 0, 'Runewing'); [s, ei] = poe(s, 0, 'Explosive Impact', 'hand'); s = terras(s, 'Mountain', 6); assert.ok(E.hasKeyword(s, s.objects[rw], 'flying')); const h0 = s.zones[0].hand.length;
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === ei && a.targets[0].oid === rw)[0])); assert.equal(s.objects[rw].zone, 'graveyard'); assert.equal(s.zones[0].hand.length, h0 - 1 + 1);
  let t = mesa(), e2; [t, e2] = poe(t, 0, 'Explosive Impact', 'hand'); t = terras(t, 'Mountain', 6);
  t = tudo(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === e2 && a.targets[0].player === 1)[0])); assert.equal(t.players[1].life, 15);
});

test('LT171 · Grim Roustabout: desencadear (entra com o marcador +1/+1 se o jogador quiser) e regenera por {1}{B}', () => {
  let s = mesa(), gr; [s, gr] = poe(s, 0, 'Grim Roustabout', 'hand'); s = terras(s, 'Swamp', 4);
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === gr)[0]);
  let viu = null; for (let i = 0; i < 20 && (s.stack.length || s.pending); i++) { const pk = s.pending; if (pk && !viu) viu = pk.kind; const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pay' || x.t === 'yes' || x.sim === true || x.choice === true) || l.find(x => x.t === 'pass') || l[0]); }
  assert.ok(viu, 'perguntou se desencadeia'); assert.equal(E.stats(s, s.objects[gr]).power, 2, 'com o marcador');
  s = tudo(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === gr)[0])); let m = J(s); m.objects[gr].damage = 9; m = tudo(act(m, { t: 'pass', p: 0 })); assert.equal(m.objects[gr].zone, 'battlefield');
});

test("LT171 · Seller of Songbirds cria Pássaro 1/1 branco voador; Centaur's Herald se sacrifica por um Centauro 3/3", () => {
  let s = mesa(), ss; [s, ss] = poe(s, 0, 'Seller of Songbirds', 'hand'); s = terras(s, 'Plains', 3);
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === ss)[0])); const f = s.zones[0].battlefield.filter(x => s.objects[x].token);
  assert.equal(f.length, 1); assert.equal(E.stats(s, s.objects[f[0]]).power, 1); assert.ok(E.hasKeyword(s, s.objects[f[0]], 'flying'));
  let t = mesa(), ch; [t, ch] = poe(t, 0, "Centaur's Herald"); t = terras(t, 'Forest', 3);
  t = tudo(act(t, legais(t, 0, a => a.t === 'activate' && a.oid === ch)[0])); assert.equal(t.objects[ch].zone, 'graveyard'); const c = t.zones[0].battlefield.filter(x => t.objects[x].token);
  assert.equal(c.length, 1); assert.equal(E.stats(t, t.objects[c[0]]).power, 3);
});

test('LT171 · Frilled Oculus +2/+2 uma vez por turno; Coat with Venom +1/+2 e toque mortífero; Waterfront Bouncer devolve criatura', () => {
  let s = mesa(), fo; [s, fo] = poe(s, 0, 'Frilled Oculus'); s = terras(s, 'Forest', 4);
  s = tudo(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === fo)[0])); assert.equal(E.stats(s, s.objects[fo]).power, 3); assert.equal(legais(s, 0, a => a.t === 'activate' && a.oid === fo).length, 0);
  let t = mesa(), cv, rw; [t, rw] = poe(t, 0, 'Runewing'); [t, cv] = poe(t, 0, 'Coat with Venom', 'hand'); t = terras(t, 'Swamp', 1);
  t = tudo(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === cv && a.targets[0].oid === rw)[0])); assert.equal(E.stats(t, t.objects[rw]).toughness, 4); assert.ok(E.hasKeyword(t, t.objects[rw], 'deathtouch'));
  let q = mesa(), wb, u; [q, u] = poe(q, 1, 'Urso'); [q, wb] = poe(q, 0, 'Waterfront Bouncer'); q = terras(q, 'Island', 1); q = J(q); q.objects[wb].sick = false;
  const at = legais(q, 0, a => a.t === 'activate' && a.oid === wb && a.targets && a.targets[0].oid === u); assert.ok(at.length > 0 && at.every(a => (a.pay.discard || []).length === 1));
  q = tudo(act(q, at[0])); assert.ok(q.zones[1].hand.some(x => q.objects[x].name === 'Urso')); assert.ok(q.objects[wb].tapped);
});

test('LT171 · Sunhome dá {C} e, com {2}{R}{W} e {T}, golpe duplo à criatura alvo', () => {
  let s = mesa(), sh, rw; [s, rw] = poe(s, 0, 'Runewing'); [s, sh] = poe(s, 0, 'Sunhome, Fortress of the Legion'); s = terras(s, 'Mountain', 3); s = terras(s, 'Plains', 1);
  assert.ok(legais(s, 0, a => a.t === 'tap_mana' && a.oid === sh).length > 0);
  s = tudo(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === sh && a.targets && a.targets[0].oid === rw)[0])); assert.ok(E.hasKeyword(s, s.objects[rw], 'double strike')); assert.ok(s.objects[sh].tapped);
});
