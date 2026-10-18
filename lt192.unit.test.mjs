// M-510 · LT174 · revisão por lote CL: nove cartas que o leitor já lia por inteiro e que travam as listas iniciantes passam a jogar (APROVADAS).
// Textos da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json). Cobertura completa e o comportamento das frases que pedem. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Cloudchaser Eagle', 'Bloodcrazed Neonate', "Traveler's Amulet", 'Cobbled Wings', 'Slagwurm Armor', 'Timber Gorge', 'Seeker of Skybreak', 'Salt Marsh', 'Terminal Moraine'];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [...['Flying'].filter(k => c.oracle_text.split(String.fromCharCode(10)).some(l => l === k || l.startsWith(k + ' ')))].filter(Boolean), oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Reliquia: { name: 'Reliquia', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] }, Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Mountain: terra('Mountain', 'Mountain', 'R'), Plains: terra('Plains', 'Plains', 'W'), Island: terra('Island', 'Island', 'U'), Swamp: terra('Swamp', 'Swamp', 'B'), Forest: terra('Forest', 'Forest', 'G') });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: C[name].type_line.startsWith('Basic Land') ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 178, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Mountain', 'Plains', 'Island', 'Swamp', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Forest', 'Reliquia']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const tudo = s => { for (let i = 0; i < 80 && (s.stack.length || s.pending); i++) { const pk = s.pending; const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pass') || l[0]); } return s; };
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };

const semKw = n => ({ ...C[n], keywords: [] });
const resolve = (s, pref, alvo) => { for (let i = 0; i < 60 && (s.stack.length || s.pending); i++) { const pk = s.pending; if (pk && pk.kind === 'pick_target' && alvo != null) { s = act(s, { t: 'pick_target', p: pk.p, index: pk.options.findIndex(o => (typeof alvo === 'number' ? o.player === alvo : o.oid === alvo)) }); continue; } const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, (pref && l.find(pref)) || l.find(x => x.t === 'pass') || l[0]); } return s; };
const ate = (s, f) => { for (let i = 0; i < 40 && !f(s); i++) { const pk = s.pending; const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pass') || l.find(x => x.t === 'block' && !(x.blocks || []).length) || l[0]); } return s; };

test('LT174 · as nove jogam pelo leitor aprovado', () => {
  for (const n of NOMES) { assert.equal(S.coverage(C[n]).level, 'completo', n); assert.equal(S.APROVADAS[n].leva, 'M-510', n); }
});

test('LT174 · Bloodcrazed Neonate ataca se puder e ganha marcador ao causar dano de combate a jogador', () => {
  let s = mesa(), bn; [s, bn] = poe(s, 0, 'Bloodcrazed Neonate'); s = J(s); s.objects[bn].sick = false;
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers', 20);
  assert.ok(legais(s, 0, a => a.t === 'attack').every(a => (a.attackers || []).includes(bn)), 'obrigado');
  s = act(s, { t: 'attack', p: 0, attackers: [bn] }); s = ate(s, x => x.turn.step === 'main2');
  assert.equal(s.players[1].life, 18); assert.equal(E.stats(s, s.objects[bn]).power, 3);
});

test("LT174 · Cloudchaser Eagle voa; Traveler's Amulet busca básico para a mão", () => {
  let s = mesa(), ce, ta; [s, ta] = poe(s, 0, "Traveler's Amulet"); [s, ce] = poe(s, 0, 'Cloudchaser Eagle', 'hand'); s = terras(s, 'Plains', 5);
  let t = J(s);
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === ce)[0])); assert.ok(E.hasKeyword(s, s.objects[ce], 'flying'));
  const h0 = t.zones[0].hand.length; t = act(t, legais(t, 0, a => a.t === 'activate' && a.oid === ta)[0]); t = resolve(t, x => x.t === 'pick');
  assert.equal(t.objects[ta].zone, 'graveyard'); assert.equal(t.zones[0].hand.length, h0 + 1);
});

test('LT174 · Cobbled Wings dá voar e Slagwurm Armor +0/+6 por equipar; Seeker of Skybreak desvira a criatura alvo', () => {
  let s = mesa(), cw, sa, sk; [s, sk] = poe(s, 0, 'Seeker of Skybreak'); [s, cw] = poe(s, 0, 'Cobbled Wings'); [s, sa] = poe(s, 0, 'Slagwurm Armor'); s = terras(s, 'Forest', 4);
  s = tudo(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === cw && a.targets && a.targets[0].oid === sk)[0])); assert.ok(E.hasKeyword(s, s.objects[sk], 'flying'));
  s = tudo(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === sa && a.targets && a.targets[0].oid === sk)[0])); assert.equal(E.stats(s, s.objects[sk]).toughness, 7);
  let t = mesa(), s1, s2; [t, s1] = poe(t, 0, 'Seeker of Skybreak'); [t, s2] = poe(t, 0, 'Bloodcrazed Neonate'); t = J(t); t.objects[s1].sick = false; t.objects[s2].tapped = true;
  t = tudo(act(t, legais(t, 0, a => a.t === 'activate' && a.oid === s1 && a.targets && a.targets[0].oid === s2)[0])); assert.ok(!t.objects[s2].tapped); assert.ok(t.objects[s1].tapped);
});

test('LT174 · Timber Gorge e Salt Marsh entram virados; Terminal Moraine busca um básico que entra virado', () => {
  for (const n of ['Timber Gorge', 'Salt Marsh']) { let s = mesa(), l; [s, l] = poe(s, 0, n, 'hand'); s = act(s, legais(s, 0, a => a.oid === l && a.t !== 'cast')[0]); assert.ok(s.objects[l].tapped, n); }
  let s = mesa(), tm; [s, tm] = poe(s, 0, 'Terminal Moraine'); s = terras(s, 'Forest', 2); const b0 = s.zones[0].battlefield.length;
  assert.ok(legais(s, 0, a => a.t === 'tap_mana' && a.oid === tm).length > 0);
  s = act(s, legais(s, 0, a => a.t === 'activate' && a.oid === tm)[0]); s = resolve(s, x => x.t === 'pick');
  assert.equal(s.objects[tm].zone, 'graveyard');
  assert.equal(s.zones[0].battlefield.length, b0); assert.ok(s.zones[0].battlefield.some(x => s.objects[x].tapped && !s.objects[x].name.includes('Moraine')), 'básico virado');
});
