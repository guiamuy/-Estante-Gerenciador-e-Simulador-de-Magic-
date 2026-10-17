// M-467 · LT133 · revisão por lote CXIII: vinte cartas que o leitor já lia por inteiro e que mais travam as listas iniciantes do catálogo passam a
// jogar (APROVADAS). Textos da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json). Cada uma: cobertura completa pelo caminho de produção
// e, nas que pedem, o comportamento da frase. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Aven Flock', 'Stone Rain', 'Spineless Thug', 'Ogre Taskmaster', 'Sacred Nectar', 'Monstrous Growth', 'Gorilla Chieftain', 'Phantom Warrior', 'Master Decoy', 'Disperse',
  'Heat Ray', 'Foul Imp', 'Hand of Death', 'Wall of Bone', 'Lightning Blast', 'Essence Drain', 'Riftwing Cloudskate', 'Raise Dead', 'Rootwalla', 'Looming Shade'];
const palavras = t => [...new Set(String(t).split('\n').map(l => l.replace(/\s*\(.*\)\s*$/, '').trim()).filter(l => /^(Flying|Defender)$/.test(l)))];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: palavras(c.oracle_text), oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Mountain: terra('Mountain', 'Mountain', 'R'), Swamp: terra('Swamp', 'Swamp', 'B'), Island: terra('Island', 'Island', 'U'), Plains: terra('Plains', 'Plains', 'W'), Forest: terra('Forest', 'Forest', 'G') });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: C[name].type_line.startsWith('Basic Land') ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 131, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Mountain', 'Swamp', 'Island', 'Plains', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Spineless Thug', 'Forest', 'Mountain', 'Swamp']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const tudo = s => { for (let i = 0; i < 60 && (s.stack.length || s.pending); i++) { const l = legais(s, s.pending ? s.pending.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pass') || l[0]); } return s; };
const terras = (s, n, k = 4) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };

test('LT133 · as vinte jogam pelo leitor aprovado', () => {
  for (const n of NOMES) { assert.equal(S.coverage(C[n]).level, 'completo', n); assert.equal(S.APROVADAS[n].leva, 'M-467', n); }
});

test('LT133 · Stone Rain destrói o terreno alvo; Hand of Death não mira criatura preta', () => {
  let s = mesa(), sr, f; [s, sr] = poe(s, 0, 'Stone Rain', 'hand'); [s, f] = poe(s, 1, 'Forest'); s = terras(s, 'Mountain', 3);
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === sr && a.targets[0].oid === f)[0])); assert.equal(s.objects[f].zone, 'graveyard');
  let t = mesa(), hd, u, fi; [t, hd] = poe(t, 0, 'Hand of Death', 'hand'); [t, u] = poe(t, 1, 'Urso'); [t, fi] = poe(t, 0, 'Foul Imp'); t = terras(t, 'Swamp', 3);
  const al = legais(t, 0, a => a.t === 'cast' && a.oid === hd).map(a => a.targets[0].oid); assert.ok(al.includes(u) && !al.includes(fi));
});

test('LT133 · Phantom Warrior não é bloqueado; Spineless Thug não bloqueia', () => {
  let s = mesa(), pw, th; [s, pw] = poe(s, 0, 'Phantom Warrior'); [s, th] = poe(s, 1, 'Urso');
  assert.equal(E.canBlock(s, th, pw), false);
  let t = mesa(), sp, u, ub; [t, sp] = poe(t, 1, 'Spineless Thug'); [t, ub] = poe(t, 1, 'Urso'); [t, u] = poe(t, 0, 'Rootwalla'); const eb = [...E.eligibleBlockers(t, 1)]; assert.ok(eb.includes(ub) && !eb.includes(sp), JSON.stringify(eb));
});

test('LT133 · Disperse devolve à mão do dono; Heat Ray causa X; Essence Drain causa 3 e ganha 3; Foul Imp tira 2 ao entrar', () => {
  let s = mesa(), d, u; [s, d] = poe(s, 0, 'Disperse', 'hand'); [s, u] = poe(s, 1, 'Urso'); s = terras(s, 'Island', 2);
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === d && a.targets[0].oid === u)[0])); assert.ok(s.zones[1].hand.includes(u));
  let t = mesa(), hr, g; [t, hr] = poe(t, 0, 'Heat Ray', 'hand'); [t, g] = poe(t, 1, 'Urso'); t = terras(t, 'Mountain', 3);
  t = tudo(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === hr && a.x === 2 && a.targets[0].oid === g)[0])); assert.equal(t.objects[g].zone, 'graveyard');
  let v = mesa(), ed; [v, ed] = poe(v, 0, 'Essence Drain', 'hand'); v = terras(v, 'Swamp', 5);
  v = tudo(act(v, legais(v, 0, a => a.t === 'cast' && a.oid === ed && a.targets[0].player === 1)[0])); assert.deepEqual([v.players[0].life, v.players[1].life], [23, 17]);
  let w = mesa(), fi; [w, fi] = poe(w, 0, 'Foul Imp', 'hand'); w = terras(w, 'Swamp', 2);
  w = tudo(act(w, legais(w, 0, a => a.t === 'cast' && a.oid === fi)[0])); assert.equal(w.players[0].life, 18);
});

test('LT133 · Rootwalla só uma vez por turno; Looming Shade quantas vezes pagar', () => {
  let s = mesa(), r; [s, r] = poe(s, 0, 'Rootwalla'); s = terras(s, 'Forest', 4);
  s = tudo(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === r)[0])); assert.equal(E.stats(s, s.objects[r]).power, 4);
  assert.equal(legais(s, 0, a => a.t === 'activate' && a.oid === r).length, 0);
  let t = mesa(), ls; [t, ls] = poe(t, 0, 'Looming Shade'); t = terras(t, 'Swamp', 2);
  for (let i = 0; i < 2; i++) t = tudo(act(t, legais(t, 0, a => a.t === 'activate' && a.oid === ls)[0])); assert.equal(E.stats(t, t.objects[ls]).power, 3);
});
