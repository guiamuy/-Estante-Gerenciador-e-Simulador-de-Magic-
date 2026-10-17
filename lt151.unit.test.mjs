// M-469 · LT135 · revisão por lote CXV: nove cartas que o leitor já lia por inteiro e que travam as listas iniciantes passam a jogar (APROVADAS).
// Textos da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json). Cobertura completa e o comportamento das frases que pedem. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Foresee', 'Chartooth Cougar', 'Flamekin Brawler', 'Flamewave Invoker', 'Flame Javelin', 'Debilitating Injury', 'Mogg Fanatic', 'Pyrotechnics', 'Scroll Thief'];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: n === 'Flame Javelin' ? 6 : valorDeMana(c.mana_cost), keywords: /Mountaincycling/.test(c.oracle_text) ? ['Mountaincycling'] : [], oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Mountain: terra('Mountain', 'Mountain', 'R'), Island: terra('Island', 'Island', 'U'), Swamp: terra('Swamp', 'Swamp', 'B'), Forest: terra('Forest', 'Forest', 'G') });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: C[name].type_line.startsWith('Basic Land') ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 139, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Mountain', 'Island', 'Swamp', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const tudo = s => { for (let i = 0; i < 80 && (s.stack.length || s.pending); i++) { const pk = s.pending; const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pass') || l[0]); } return s; };
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };

test('LT135 · as nove jogam pelo leitor aprovado', () => {
  for (const n of NOMES) { assert.equal(S.coverage(C[n]).level, 'completo', n); assert.equal(S.APROVADAS[n].leva, 'M-469', n); }
});

test('LT135 · Flame Javelin: paga com seis manas não vermelhas ou com {R}{R}{R}; causa 4', () => {
  let s = mesa(), fj; [s, fj] = poe(s, 0, 'Flame Javelin', 'hand'); s = terras(s, 'Island', 6);
  assert.ok(legais(s, 0, a => a.t === 'cast' && a.oid === fj).length > 0, 'seis Ilhas');
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === fj && a.targets[0].player === 1)[0])); assert.equal(s.players[1].life, 16);
  let t = mesa(), f2; [t, f2] = poe(t, 0, 'Flame Javelin', 'hand'); t = terras(t, 'Mountain', 3);
  assert.ok(legais(t, 0, a => a.t === 'cast' && a.oid === f2).length > 0, 'três Montanhas');
});

test('LT135 · Mogg Fanatic: sacrifica e causa 1; Flamewave Invoker causa 5 no jogador', () => {
  let s = mesa(), mf, u; [s, mf] = poe(s, 0, 'Mogg Fanatic'); [s, u] = poe(s, 1, 'Urso');
  s = tudo(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === mf && a.targets[0].player === 1)[0])); assert.equal(s.objects[mf].zone, 'graveyard'); assert.equal(s.players[1].life, 19);
  let t = mesa(), fi; [t, fi] = poe(t, 0, 'Flamewave Invoker'); t = terras(t, 'Mountain', 8);
  t = tudo(act(t, legais(t, 0, a => a.t === 'activate' && a.oid === fi && a.targets[0].player === 1)[0])); assert.equal(t.players[1].life, 15);
});

test('LT135 · Foresee: vidência 4 e compra duas; Chartooth Cougar recicla buscando Montanha', () => {
  let s = mesa(), fo; [s, fo] = poe(s, 0, 'Foresee', 'hand'); s = terras(s, 'Island', 4); const m0 = s.zones[0].hand.length;
  s = tudo(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === fo)[0])); assert.equal(s.zones[0].hand.length, m0 - 1 + 2);
  let t = mesa(), cc; [t, cc] = poe(t, 0, 'Chartooth Cougar', 'hand'); t = terras(t, 'Swamp', 2);
  assert.ok(legais(t, 0, a => a.t === 'cycle' && a.oid === cc).length > 0, 'oferece a reciclagem');
});

test('LT135 · Pyrotechnics divide 4 entre alvos: sem criaturas, os 4 vão para os jogadores escolhidos', () => {
  let s = mesa(), py; [s, py] = poe(s, 0, 'Pyrotechnics', 'hand'); s = terras(s, 'Mountain', 5);
  const a = legais(s, 0, x => x.t === 'cast' && x.oid === py); assert.ok(a.length > 0);
  s = tudo(act(s, a[0]));
  assert.equal(s.objects[py].zone, 'graveyard'); assert.equal((20 - s.players[1].life) + (20 - s.players[0].life), 4);
});
