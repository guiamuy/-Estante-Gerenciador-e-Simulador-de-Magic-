// M-511 · LT175 · revisão por lote CLI: nove cartas que o leitor já lia por inteiro e que travam as listas iniciantes passam a jogar (APROVADAS).
// Textos da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json). Cobertura completa e o comportamento das frases que pedem. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Infectious Host', 'Nightscape Familiar', 'Allied Reinforcements', "Chandra's Magmutt", 'Dawntreader Elk', 'Shuko', 'Ticking Gnomes', 'Sparkmage Apprentice', 'Lone Missionary'];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [...['Echo'].filter(k => c.oracle_text.split(String.fromCharCode(10)).some(l => l === k || l.startsWith(k + ' ')))].filter(Boolean), oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Reliquia: { name: 'Reliquia', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] }, Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Mountain: terra('Mountain', 'Mountain', 'R'), Plains: terra('Plains', 'Plains', 'W'), Island: terra('Island', 'Island', 'U'), Swamp: terra('Swamp', 'Swamp', 'B'), Forest: terra('Forest', 'Forest', 'G') });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: C[name].type_line.startsWith('Basic Land') ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 179, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Mountain', 'Plains', 'Island', 'Swamp', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Forest', 'Reliquia']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const tudo = s => { for (let i = 0; i < 80 && (s.stack.length || s.pending); i++) { const pk = s.pending; const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pass') || l[0]); } return s; };
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };

const semKw = n => ({ ...C[n], keywords: [] });
const resolve = (s, pref, alvo) => { for (let i = 0; i < 60 && (s.stack.length || s.pending); i++) { const pk = s.pending; if (pk && pk.kind === 'pick_target' && alvo != null) { s = act(s, { t: 'pick_target', p: pk.p, index: pk.options.findIndex(o => (typeof alvo === 'number' ? o.player === alvo : o.oid === alvo)) }); continue; } const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, (pref && l.find(pref)) || l.find(x => x.t === 'pass') || l[0]); } return s; };

test('LT175 · as nove jogam pelo leitor aprovado', () => {
  for (const n of NOMES) { assert.equal(S.coverage(C[n]).level, 'completo', n); assert.equal(S.APROVADAS[n].leva, 'M-511', n); }
});

test("LT175 · Nightscape Familiar: mágica vermelha custa {1} a menos (Chandra's Magmutt com uma Montanha); verde não", () => {
  let s = mesa(), nf, cm, de; [s, nf] = poe(s, 0, 'Nightscape Familiar'); [s, cm] = poe(s, 0, "Chandra's Magmutt", 'hand'); [s, de] = poe(s, 0, 'Dawntreader Elk', 'hand'); s = terras(s, 'Mountain', 1); s = terras(s, 'Forest', 1);
  assert.ok(legais(s, 0, a => a.t === 'cast' && a.oid === cm).length > 0, 'vermelha por {R}');
  let t = J(s); t.zones[0].battlefield.filter(x => t.objects[x].name === 'Mountain').forEach(x => { t.objects[x].tapped = true; });
  assert.equal(legais(t, 0, a => a.t === 'cast' && a.oid === de).length, 0, 'verde não fica mais barata');
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === cm)[0])); assert.equal(s.objects[cm].zone, 'battlefield');
});

test("LT175 · Infectious Host ao morrer: jogador alvo perde 2; Sparkmage Apprentice: 1 de dano em qualquer alvo ao entrar", () => {
  let s = mesa(), ih, sa; [s, ih] = poe(s, 0, 'Infectious Host'); [s, sa] = poe(s, 0, 'Sparkmage Apprentice', 'hand'); s = terras(s, 'Mountain', 2);
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === sa)[0]);
  for (let i = 0; i < 60 && (s.stack.length || s.pending); i++) { const pk = s.pending; if (pk && pk.kind === 'pick_target') { s = act(s, { t: 'pick_target', p: pk.p, index: pk.options.findIndex(o => o.oid === ih || o.player === 1) }); continue; } const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pass') || l[0]); }
  assert.equal(s.objects[ih].zone, 'graveyard'); assert.equal(s.players[1].life, 18);
});

test("LT175 · Chandra's Magmutt: 1 de dano em jogador; Ticking Gnomes: sacrificar para 1 de dano; Shuko equipa por {0}", () => {
  let s = mesa(), cm, tg, sh; [s, cm] = poe(s, 0, "Chandra's Magmutt"); [s, tg] = poe(s, 0, 'Ticking Gnomes'); [s, sh] = poe(s, 0, 'Shuko'); s = J(s); s.objects[cm].sick = false;
  assert.ok(legais(s, 0, a => a.t === 'activate' && a.oid === cm).every(a => a.targets[0].player != null));
  s = tudo(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === cm && a.targets[0].player === 1)[0])); assert.equal(s.players[1].life, 19);
  const tgs = legais(s, 0, a => a.t === 'activate' && a.oid === tg); s = act(s, tgs.find(a => a.targets && a.targets[0] && a.targets[0].player === 1) || tgs[0]); s = resolve(s, null, 1); assert.equal(s.objects[tg].zone, 'graveyard'); assert.equal(s.players[1].life, 18);
  s = tudo(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === sh && a.targets && a.targets[0].oid === cm)[0])); assert.equal(E.stats(s, s.objects[cm]).power, 3);
});

test('LT175 · Allied Reinforcements cria dois 2/2 brancos; Lone Missionary ganha 4; Dawntreader Elk busca um básico que entra virado', () => {
  let s = mesa(), ar; [s, ar] = poe(s, 0, 'Allied Reinforcements', 'hand'); s = terras(s, 'Plains', 4);
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === ar)[0])); const f = s.zones[0].battlefield.filter(x => s.objects[x].token); assert.equal(f.length, 2); assert.equal(E.stats(s, s.objects[f[0]]).power, 2);
  let t = mesa(), lm; [t, lm] = poe(t, 0, 'Lone Missionary', 'hand'); t = terras(t, 'Plains', 2); t = tudo(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === lm)[0])); assert.equal(t.players[0].life, 24);
  let q = mesa(), de; [q, de] = poe(q, 0, 'Dawntreader Elk'); q = terras(q, 'Forest', 1); const b0 = q.zones[0].battlefield.length;
  q = act(q, legais(q, 0, a => a.t === 'activate' && a.oid === de)[0]); q = resolve(q, x => x.t === 'pick');
  assert.equal(q.objects[de].zone, 'graveyard'); assert.equal(q.zones[0].battlefield.length, b0); assert.ok(q.zones[0].battlefield.filter(x => q.objects[x].tapped).length === 2, 'Floresta paga e básico virado');
});
