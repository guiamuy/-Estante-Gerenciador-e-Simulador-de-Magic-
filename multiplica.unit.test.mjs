// CR2e.2 · 614.16: substituição na criação de fichas e na colocação de marcadores (Doubling Season, Parallel Lives, Anointed Procession,
// Hardened Scales). Texto oficial em .listas/oficiais-motor.json (mtg.wtf, 11/10/2026). Cada teste falha no motor v109.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, comMana, tudo, CARTAS } from './cmd.mjs';
import { S } from './listas.mjs';

const OF = Object.fromEntries(JSON.parse(readFileSync(new URL('./.listas/oficiais-motor.json', import.meta.url), 'utf8')).cartas.map(c => [c.name, { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: 1, keywords: [], oracle_text: c.oracle_text, colors: [] }]));
const c = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: 0, keywords: [], oracle_text: '', colors: [...new Set((mana_cost.match(/[WUBRG]/g) || []))], ...extra });
const EX = { action: 'etb', target: 'none', expect: { attached: false } };
const cards = { ...OF, Ursa: c('Ursa', 'Creature — Bear', '{G}', { power: '2', toughness: '2' }), Fabrica: c('Fabrica', 'Sorcery', '{W}'), Adubo: c('Adubo', 'Sorcery', '{G}'), Carga: c('Carga', 'Sorcery', '{U}'),
  Broto: c('Broto', 'Creature — Plant', '{G}', { power: '0', toughness: '0' }), Andarilha: c('Andarilha', 'Legendary Planeswalker — Teste', '{2}{W}', { loyalty: '3' }) };
const scripts = {
  Fabrica: { name: 'Fabrica', effects: [{ do: 'token', amount: 2, token: { name: 'Soldado', types: ['creature'], subtypes: ['Soldier'], colors: ['W'], power: 1, toughness: 1 } }], example: { target: 'none', expect: { tokens: 2 } } },
  Adubo: { name: 'Adubo', effects: [{ do: 'counters', amount: 1, target: 'creature' }], example: { target: 'own-creature', expect: { stats: [3, 3] } } },
  Carga: { name: 'Carga', effects: [{ do: 'counters', amount: 2, tipo: 'carga', target: 'creature' }], example: { target: 'own-creature', expect: { stats: [2, 2] } } },
  Broto: { name: 'Broto', entra: [{ afetados: 'self', marcadores: { p1p1: 2 } }], abilities: [{ kind: 'triggered', when: 'etb', effects: [{ do: 'gain', amount: 1 }] }], example: EX },
  Andarilha: { name: 'Andarilha', loyalty: [{ cost: 1, label: '+1: ganha 1 de vida', effects: [{ do: 'gain', amount: 1 }] }], example: EX }
};
function mesaX(a = [], b = []) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 12, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 1, mode: 'full', cards: { ...CARTAS, ...cards }, scripts, first: 0, players: [{ name: 'A', deck: baralho([...a, 'Plains', 'Forest']) }, { name: 'B', deck: baralho([...b, 'Island', 'Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const conjura = (s, oid, mana, alvo) => { s = comMana(s, mana); const a = legais(s, 0, x => x.t === 'cast' && x.oid === oid && (!alvo || (x.targets && x.targets[0] && x.targets[0].oid === alvo)))[0]; assert.ok(a, 'conjurar'); return tudo(act(act(act(s, a), { t: 'pass', p: 0 }), { t: 'pass', p: 1 })); };
const soldados = (s, p) => s.zones[p].battlefield.filter(o => s.objects[o].name === 'Soldado').length;

test('CR 614.16 · os scripts das quatro cartas validam e chegam aos fatos da partida', () => {
  for (const n of ['Doubling Season', 'Parallel Lives', 'Anointed Procession', 'Hardened Scales']) { assert.ok(S.SCRIPTS[n], n); assert.deepEqual(JSON.parse(JSON.stringify(S.validateScript(S.SCRIPTS[n]))), [], n); }
  assert.ok(S.validateScript({ name: 'X', self: { multiplica: [{ evento: 'fichas', modo: 'triplo' }] }, example: EX }).some(e => /modo/.test(e)));
  assert.ok(S.validateScript({ name: 'X', self: { multiplica: [{ evento: 'fichas', modo: 'dobro', tipo: 'p1p1' }] }, example: EX }).some(e => /fichas não aceita/.test(e)));
});

test('CR 614.16 · Parallel Lives dobra as fichas de quem a controla; duas quadruplicam; a do oponente não muda as suas', () => {
  for (const [meus, deles, esperado] of [[0, 0, 2], [1, 0, 4], [2, 0, 8], [0, 1, 2]]) {
    let s = mesaX(['Parallel Lives', 'Fabrica'], ['Parallel Lives']), f;
    for (let i = 0; i < meus; i++) [s] = poe(s, 0, 'Parallel Lives');
    for (let i = 0; i < deles; i++) [s] = poe(s, 1, 'Parallel Lives');
    [s, f] = poe(s, 0, 'Fabrica', 'hand'); s = conjura(s, f, 'W');
    assert.equal(soldados(s, 0), esperado, `${meus} minhas, ${deles} do oponente`);
  }
});

test('CR 614.16 · Anointed Procession e Doubling Season também dobram fichas (somadas: ×4)', () => {
  let s = mesaX(['Anointed Procession', 'Doubling Season', 'Fabrica']), f;
  [s] = poe(s, 0, 'Anointed Procession'); [s] = poe(s, 0, 'Doubling Season'); [s, f] = poe(s, 0, 'Fabrica', 'hand');
  s = conjura(s, f, 'W'); assert.equal(soldados(s, 0), 8);
});

test('CR 614.16 · Doubling Season dobra marcadores de qualquer tipo em permanente sua; Hardened Scales soma um só aos +1/+1 em criatura sua', () => {
  let s = mesaX(['Doubling Season', 'Adubo', 'Carga', 'Ursa']), u, a, k;
  [s] = poe(s, 0, 'Doubling Season'); [s, u] = poe(s, 0, 'Ursa'); [s, a] = poe(s, 0, 'Adubo', 'hand'); [s, k] = poe(s, 0, 'Carga', 'hand');
  s = conjura(s, a, 'G', u); assert.equal(s.objects[u].counters.p1p1, 2, '1 → 2');
  s = conjura(s, k, 'U', u); assert.equal(s.objects[u].counters.carga, 4, 'marcador nomeado também: 2 → 4');
  let t = mesaX(['Hardened Scales', 'Adubo', 'Carga', 'Ursa']), u2, a2, k2;
  [t] = poe(t, 0, 'Hardened Scales'); [t, u2] = poe(t, 0, 'Ursa'); [t, a2] = poe(t, 0, 'Adubo', 'hand'); [t, k2] = poe(t, 0, 'Carga', 'hand');
  t = conjura(t, a2, 'G', u2); assert.equal(t.objects[u2].counters.p1p1, 2, '1 → 1 + 1');
  t = conjura(t, k2, 'U', u2); assert.equal(t.objects[u2].counters.carga, 2, 'Hardened Scales não mexe em outro tipo');
});

test('CR 616.1 · Hardened Scales e Doubling Season juntas: o motor aplica "mais um" antes do dobro (1 → 4); duas Scales: 1 → 3', () => {
  let s = mesaX(['Hardened Scales', 'Doubling Season', 'Adubo', 'Ursa']), u, a;
  [s] = poe(s, 0, 'Hardened Scales'); [s] = poe(s, 0, 'Doubling Season'); [s, u] = poe(s, 0, 'Ursa'); [s, a] = poe(s, 0, 'Adubo', 'hand');
  s = conjura(s, a, 'G', u); assert.equal(s.objects[u].counters.p1p1, 4);
  let t = mesaX(['Hardened Scales', 'Adubo', 'Ursa']), u2, a2;
  [t] = poe(t, 0, 'Hardened Scales'); [t] = poe(t, 0, 'Hardened Scales'); [t, u2] = poe(t, 0, 'Ursa'); [t, a2] = poe(t, 0, 'Adubo', 'hand');
  t = conjura(t, a2, 'G', u2); assert.equal(t.objects[u2].counters.p1p1, 3);
});

test('CR 614.16 · entrar com marcadores também conta (Hardened Scales: 2 → 3) e o planeswalker entra com o dobro da lealdade; o + da lealdade (custo) não dobra', () => {
  let s = mesaX(['Hardened Scales', 'Broto']), b;
  [s] = poe(s, 0, 'Hardened Scales'); [s, b] = poe(s, 0, 'Broto', 'hand');
  s = conjura(s, b, 'G'); assert.equal(s.objects[b].counters.p1p1, 3);
  let t = mesaX(['Doubling Season', 'Andarilha']), w;
  [t] = poe(t, 0, 'Doubling Season'); [t, w] = poe(t, 0, 'Andarilha', 'hand');
  t = conjura(t, w, 'WWW'); assert.equal(t.objects[w].counters.loyalty, 6, '3 → 6');
  const at = legais(t, 0, x => x.t === 'loyalty' && x.oid === w)[0] || legais(t, 0, x => x.oid === w && /loyal|lealdade|activate/.test(x.t))[0];
  assert.ok(at, 'ativar a lealdade');
  t = act(t, at); assert.equal(t.objects[w].counters.loyalty, 7, 'o +1 é custo: não dobra (ruling da Doubling Season)');
});
