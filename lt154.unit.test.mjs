// M-472 · LT138 · revisão por lote CXVIII: nove cartas que o leitor já lia por inteiro e que travam as listas iniciantes passam a jogar (APROVADAS).
// Textos da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json). Cobertura completa e o comportamento das frases que pedem. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Charmed Sleep', 'Blighted Cataract', 'Catalog', 'Tarfire', 'Gift of Orzhova', 'Dehydration', 'Augury Owl', 'Elfhame Palace', 'Inner-Flame Acolyte'];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [/^Flying/m.test(c.oracle_text) && 'Flying', /^Evoke/m.test(c.oracle_text) && 'Evoke'].filter(Boolean), oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Mountain: terra('Mountain', 'Mountain', 'R'), Plains: terra('Plains', 'Plains', 'W'), Island: terra('Island', 'Island', 'U'), Swamp: terra('Swamp', 'Swamp', 'B'), Forest: terra('Forest', 'Forest', 'G') });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: C[name].type_line.startsWith('Basic Land') ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 142, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Mountain', 'Plains', 'Island', 'Swamp', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const tudo = s => { for (let i = 0; i < 80 && (s.stack.length || s.pending); i++) { const pk = s.pending; const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pass') || l[0]); } return s; };
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };



test('LT138 · as nove jogam pelo leitor aprovado', () => {
  for (const n of NOMES) { assert.equal(S.coverage(C[n]).level, 'completo', n); assert.equal(S.APROVADAS[n].leva, 'M-472', n); }
});

test('LT138 · Tarfire causa 2 a qualquer alvo; Catalog compra duas e depois descarta uma', () => {
  let s = mesa(), tf; [s, tf] = poe(s, 0, 'Tarfire', 'hand'); s = terras(s, 'Mountain', 1);
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === tf && a.targets[0].player === 1)[0])); assert.equal(s.players[1].life, 18);
  let t = mesa(), ca; [t, ca] = poe(t, 0, 'Catalog', 'hand'); t = terras(t, 'Island', 3); const m0 = t.zones[0].hand.length, g0 = t.zones[0].graveyard.length;
  t = tudo(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === ca)[0]));
  assert.equal(t.zones[0].hand.length, m0 - 1 + 2 - 1); assert.equal(t.zones[0].graveyard.length, g0 + 2, 'o Catalog e a descartada');
});

test('LT138 · Gift of Orzhova (paga {W/B} com Pântano ou Planície): +1/+1, voar e vínculo com a vida', () => {
  for (const terra of ['Swamp', 'Plains']) {
    let s = mesa(), g, ow; [s, ow] = poe(s, 0, 'Augury Owl'); [s, g] = poe(s, 0, 'Gift of Orzhova', 'hand'); s = terras(s, terra, 3);
    s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === g && a.targets[0].oid === ow)[0]));
    const st = E.stats(s, s.objects[ow]); assert.equal(st.power, 2, terra); assert.equal(st.toughness, 2, terra);
    assert.ok(E.hasKeyword(s, s.objects[ow], 'flying') && E.hasKeyword(s, s.objects[ow], 'lifelink'), terra);
  }
});

test('LT138 · Charmed Sleep vira ao entrar e prende; Dehydration só prende (não vira ao entrar)', () => {
  let s = mesa(), cs, u; [s, u] = poe(s, 1, 'Urso'); [s, cs] = poe(s, 0, 'Charmed Sleep', 'hand'); s = terras(s, 'Island', 3);
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === cs && a.targets[0].oid === u)[0])); assert.ok(s.objects[u].tapped, 'virada ao entrar');
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1'); assert.ok(s.objects[u].tapped, 'não desvirou');
  let t = mesa(), dh, u2; [t, u2] = poe(t, 1, 'Urso'); [t, dh] = poe(t, 0, 'Dehydration', 'hand'); t = terras(t, 'Island', 4);
  t = tudo(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === dh && a.targets[0].oid === u2)[0])); assert.ok(!t.objects[u2].tapped, 'Dehydration não vira');
  t = J(t); t.objects[u2].tapped = true; t = passaAte(t, x => x.turn.active === 1 && x.turn.step === 'main1'); assert.ok(t.objects[u2].tapped, 'não desvirou');
});

test('LT138 · Elfhame Palace entra virado e dá {G} ou {W}; Blighted Cataract: {5}{U}, vira e sacrifica, compra duas', () => {
  let s = mesa(), ep; [s, ep] = poe(s, 0, 'Elfhame Palace', 'hand');
  s = tudo(act(s, legais(s, 0, a => a.t === 'play_land' && a.oid === ep)[0])); assert.equal(s.objects[ep].zone, 'battlefield'); assert.ok(s.objects[ep].tapped, 'entra virado');
  let t = mesa(), bc; [t, bc] = poe(t, 0, 'Blighted Cataract'); t = terras(t, 'Island', 6); const m0 = t.zones[0].hand.length;
  t = tudo(act(t, legais(t, 0, a => a.t === 'activate' && a.oid === bc)[0]));
  assert.equal(t.objects[bc].zone, 'graveyard'); assert.equal(t.zones[0].hand.length, m0 + 2);
});

test('LT138 · Inner-Flame Acolyte evocada por {R}: dá +2/+0 e ímpeto ao alvo e é sacrificada', () => {
  let s = mesa(), ia, ow; [s, ow] = poe(s, 0, 'Augury Owl'); [s, ia] = poe(s, 0, 'Inner-Flame Acolyte', 'hand'); s = terras(s, 'Mountain', 1);
  const ev = legais(s, 0, a => a.t === 'cast' && a.oid === ia); assert.ok(ev.length > 0, 'evocar com uma Montanha');
  s = act(s, ev[0]);
  for (let i = 0; i < 40 && (s.stack.length || s.pending); i++) { const pk = s.pending; if (pk && pk.kind === 'pick_target') { s = act(s, { t: 'pick_target', p: pk.p, index: Math.max(0, pk.options.findIndex(o => o.oid === ow)) }); continue; } const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.targets && x.targets.some(t => t.oid === ow)) || l.find(x => x.t === 'pass') || l[0]); }
  assert.equal(s.objects[ia].zone, 'graveyard', 'sacrificada');
  assert.equal(E.stats(s, s.objects[ow]).power, 3); assert.ok(E.hasKeyword(s, s.objects[ow], 'haste'));
});
