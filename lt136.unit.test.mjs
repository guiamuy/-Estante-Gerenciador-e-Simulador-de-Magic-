// M-453 · LT119 · leitor: "Target creature gets +N/+N and gains <palavras> until end of turn" (um efeito contínuo só, 611.2a). Mighty Leap ("Target
// creature gets +2/+2 and gains flying until end of turn.", 16 listas do catálogo) e Slayers' Stronghold ("{R}{W}, {T}: Target creature gets +2/+0 and
// gains vigilance and haste until end of turn.", 7 listas). Textos da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json). Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))] }; };
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
const C = { 'Mighty Leap': of('Mighty Leap'), "Slayers' Stronghold": of("Slayers' Stronghold"),
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Plains: terra('Plains', 'Plains', 'W'), Mountain: terra('Mountain', 'Mountain', 'R') };
function mesa(seed = 67) {
  const b = ns => ns.map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b(['Mighty Leap', "Slayers' Stronghold", 'Urso', 'Plains', 'Mountain']) }, { name: 'B', deck: b(['Urso', 'Plains']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending, 40);
const st = (s, o) => { const x = E.stats(s, s.objects[o]); return [x.power, x.toughness]; };

test('LT119 · as duas jogam pelo leitor aprovado', () => {
  for (const n of ['Mighty Leap', "Slayers' Stronghold"]) { assert.equal(S.coverage(C[n]).level, 'completo', n); assert.equal(S.APROVADAS[n].leva, 'M-453', n); }
});

test('LT119 · Mighty Leap: +2/+2 e voar até o fim do turno; no turno seguinte, nada', () => {
  let s = mesa(), ml, u; [s, ml] = poe(s, 0, 'Mighty Leap', 'hand'); [s, u] = poe(s, 0, 'Urso'); for (let i = 0; i < 2; i++) [s] = poe(s, 0, 'Plains');
  s = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === ml && a.targets[0].oid === u)[0]));
  assert.deepEqual(st(s, u), [4, 4]); assert.ok(E.hasKeyword(s, s.objects[u], 'flying'));
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  assert.deepEqual(st(s, u), [2, 2]); assert.ok(!E.hasKeyword(s, s.objects[u], 'flying'));
});

test('LT119 · Slayers\' Stronghold: {R}{W} e virar dão +2/+0, vigilância e ímpeto — a criatura que acabou de entrar ataca e não vira', () => {
  let s = mesa(), ss, u; [s, ss] = poe(s, 0, "Slayers' Stronghold"); [s, u] = poe(s, 0, 'Urso'); [s] = poe(s, 0, 'Plains'); [s] = poe(s, 0, 'Mountain');
  s = J(s); s.objects[u].sick = true;
  const a = legais(s, 0, x => x.t === 'activate' && x.oid === ss && x.targets && x.targets[0].oid === u); assert.ok(a.length > 0, 'oferece a habilidade');
  s = resolve(act(s, a[0])); assert.deepEqual(st(s, u), [4, 2]); assert.ok(E.hasKeyword(s, s.objects[u], 'haste') && E.hasKeyword(s, s.objects[u], 'vigilance'));
  assert.equal(s.objects[ss].tapped, true);
  s = passaAte(s, x => x.turn.step === 'combat_attackers' || (x.pending && x.pending.kind === 'attackers'), 20);
  const atk = legais(s, 0, x => x.t === 'attack' || x.t === 'declare_attackers');
  assert.ok(atk.some(x => JSON.stringify(x).includes(u)), 'a criatura enjoada pode atacar');
});
