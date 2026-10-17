// M-471 · LT137 · revisão por lote CXVII: nove cartas que o leitor já lia por inteiro e que travam as listas iniciantes passam a jogar (APROVADAS).
// Textos da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json). Cobertura completa e o comportamento das frases que pedem. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Stealer of Secrets', 'Sleep Paralysis', 'Unruly Mob', 'Sure Strike', 'Samite Healer', 'Show of Valor', 'Thornscape Apprentice', 'Skymarch Bloodletter', 'Angelic Blessing'];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: /^Flying/m.test(c.oracle_text) ? ['Flying'] : [], oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Mountain: terra('Mountain', 'Mountain', 'R'), Plains: terra('Plains', 'Plains', 'W'), Island: terra('Island', 'Island', 'U'), Swamp: terra('Swamp', 'Swamp', 'B'), Forest: terra('Forest', 'Forest', 'G') });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: C[name].type_line.startsWith('Basic Land') ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 141, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Mountain', 'Plains', 'Island', 'Swamp', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const tudo = s => { for (let i = 0; i < 80 && (s.stack.length || s.pending); i++) { const pk = s.pending; const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pass') || l[0]); } return s; };
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };


test('LT137 · as nove jogam pelo leitor aprovado', () => {
  for (const n of NOMES) { assert.equal(S.coverage(C[n]).level, 'completo', n); assert.equal(S.APROVADAS[n].leva, 'M-471', n); }
});

test('LT137 · Skymarch Bloodletter: o oponente perde 1 e você ganha 1', () => {
  let s = mesa(), sb; [s, sb] = poe(s, 0, 'Skymarch Bloodletter', 'hand'); s = terras(s, 'Swamp', 3);
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === sb)[0]));
  assert.equal(s.objects[sb].zone, 'battlefield'); assert.equal(s.players[1].life, 19); assert.equal(s.players[0].life, 21);
});

test('LT137 · Sure Strike (+3/+0 e iniciativa), Angelic Blessing (+3/+3 e voar), Show of Valor (+2/+4) até o fim do turno', () => {
  for (const [n, terra, p, r, kw] of [['Sure Strike', 'Mountain', 3, 0, 'first strike'], ['Angelic Blessing', 'Plains', 3, 3, 'flying'], ['Show of Valor', 'Plains', 2, 4, null]]) {
    let s = mesa(), m, u; [s, u] = poe(s, 1, 'Urso'); [s, m] = poe(s, 0, n, 'hand'); s = terras(s, terra, 3);
    s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === m && a.targets[0].oid === u)[0]));
    const st = E.stats(s, s.objects[u]); assert.equal(st.power, 2 + p, n); assert.equal(st.toughness, 2 + r, n);
    if (kw) assert.ok(E.hasKeyword(s, s.objects[u], kw), n + ': ' + kw);
  }
});

test('LT137 · Sleep Paralysis vira a criatura ao entrar e ela não desvira no passo de desvirar do controlador', () => {
  let s = mesa(), sp, u; [s, u] = poe(s, 1, 'Urso'); [s, sp] = poe(s, 0, 'Sleep Paralysis', 'hand'); s = terras(s, 'Island', 4);
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === sp && a.targets[0].oid === u)[0]));
  assert.equal(s.objects[sp].zone, 'battlefield'); assert.ok(s.objects[u].tapped, 'virada ao entrar');
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1');
  assert.ok(s.objects[u].tapped, 'não desvirou');
});

test('LT137 · Unruly Mob ganha marcador só quando outra criatura sua morre', () => {
  let s = mesa(), um, st, u; [s, um] = poe(s, 0, 'Unruly Mob'); [s, st] = poe(s, 0, 'Stealer of Secrets'); [s, u] = poe(s, 1, 'Urso');
  const morre = (x, o) => { let m = J(x); m.objects[o].damage = 9; m = act(m, { t: 'pass', p: 0 }); return tudo(m); };
  const a = morre(s, u); assert.equal(a.objects[u].zone, 'graveyard'); assert.equal(E.stats(a, a.objects[um]).power, 1, 'criatura do oponente não conta');
  const b = morre(s, st); assert.equal(b.objects[st].zone, 'graveyard'); assert.equal(E.stats(b, b.objects[um]).power, 2, 'outra criatura sua conta');
});

test('LT137 · Thornscape Apprentice: {W},{T} vira a criatura alvo; {R},{T} dá iniciativa', () => {
  let s = mesa(), ta, u; [s, ta] = poe(s, 0, 'Thornscape Apprentice'); [s, u] = poe(s, 1, 'Urso'); s = terras(s, 'Plains', 1);
  const ats = legais(s, 0, a => a.t === 'activate' && a.oid === ta && a.targets && a.targets[0].oid === u);
  assert.ok(ats.length >= 1); s = tudo(act(s, ats.find(a => a.ability === 1) || ats[0])); assert.ok(s.objects[u].tapped, 'virada');
  let t = mesa(), t2, u2; [t, t2] = poe(t, 0, 'Thornscape Apprentice'); [t, u2] = poe(t, 1, 'Urso'); t = terras(t, 'Mountain', 1);
  t = tudo(act(t, legais(t, 0, a => a.t === 'activate' && a.oid === t2 && a.targets && a.targets[0].oid === u2)[0])); assert.ok(E.hasKeyword(t, t.objects[u2], 'first strike')); assert.ok(!t.objects[u2].tapped);
});
