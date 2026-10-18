// M-508 · LT172 · revisão por lote CXLVIII: nove cartas que o leitor já lia por inteiro e que travam as listas iniciantes passam a jogar (APROVADAS).
// Textos da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json). Cobertura completa e o comportamento das frases que pedem. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Seal of Strength', 'Berserkers of Blood Ridge', 'Call to Mind', 'Submerged Boneyard', 'Enfeeblement', "Drana's Emissary", 'Courier Griffin', 'Bloodbond Vampire', 'Defiant Bloodlord'];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [...['Flying'].filter(k => c.oracle_text.split(String.fromCharCode(10)).some(l => l === k || l.startsWith(k + ' ')))].filter(Boolean), oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Reliquia: { name: 'Reliquia', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] }, Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Mountain: terra('Mountain', 'Mountain', 'R'), Plains: terra('Plains', 'Plains', 'W'), Island: terra('Island', 'Island', 'U'), Swamp: terra('Swamp', 'Swamp', 'B'), Forest: terra('Forest', 'Forest', 'G') });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: C[name].type_line.startsWith('Basic Land') ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 176, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Mountain', 'Plains', 'Island', 'Swamp', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Forest', 'Reliquia']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const tudo = s => { for (let i = 0; i < 80 && (s.stack.length || s.pending); i++) { const pk = s.pending; const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pass') || l[0]); } return s; };
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };

const semKw = n => ({ ...C[n], keywords: [] });
const resolve = (s, pref, alvo) => { for (let i = 0; i < 60 && (s.stack.length || s.pending); i++) { const pk = s.pending; if (pk && pk.kind === 'pick_target' && alvo != null) { s = act(s, { t: 'pick_target', p: pk.p, index: pk.options.findIndex(o => (typeof alvo === 'number' ? o.player === alvo : o.oid === alvo)) }); continue; } const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, (pref && l.find(pref)) || l.find(x => x.t === 'pass') || l[0]); } return s; };

test('LT172 · as nove jogam pelo leitor aprovado', () => {
  for (const n of NOMES) { assert.equal(S.coverage(C[n]).level, 'completo', n); assert.equal(S.APROVADAS[n].leva, 'M-508', n); }
});

test('LT172 · Courier Griffin ganha 2: Bloodbond Vampire ganha um marcador e Defiant Bloodlord faz o oponente perder 2', () => {
  let s = mesa(), cg, bv, db; [s, bv] = poe(s, 0, 'Bloodbond Vampire'); [s, db] = poe(s, 0, 'Defiant Bloodlord'); [s, cg] = poe(s, 0, 'Courier Griffin', 'hand'); s = terras(s, 'Plains', 4);
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === cg)[0]); s = resolve(s, null, 1);
  assert.equal(s.players[0].life, 22); assert.equal(E.stats(s, s.objects[bv]).power, 4); assert.equal(s.players[1].life, 18);
  assert.ok(E.hasKeyword(s, s.objects[cg], 'flying') && E.hasKeyword(s, s.objects[db], 'flying'));
});

test("LT172 · Drana's Emissary na sua manutenção: cada oponente perde 1 e você ganha 1", () => {
  let s = mesa(), de; [s, de] = poe(s, 0, "Drana's Emissary");
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && x.turn.number > 1 && !x.stack.length && !x.pending, 80);
  assert.equal(s.players[1].life, 19); assert.equal(s.players[0].life, 21);
});

test('LT172 · Seal of Strength se sacrifica: +3/+3 na criatura alvo; Enfeeblement -2/-2 mata um 2/2', () => {
  let s = mesa(), ss, bv; [s, bv] = poe(s, 0, 'Bloodbond Vampire'); [s, ss] = poe(s, 0, 'Seal of Strength');
  s = act(s, legais(s, 0, a => a.t === 'activate' && a.oid === ss)[0]); s = resolve(s, null, bv); assert.equal(s.objects[ss].zone, 'graveyard'); assert.equal(E.stats(s, s.objects[bv]).power, 6);
  let t = mesa(), ef, u; [t, u] = poe(t, 1, 'Urso'); [t, ef] = poe(t, 0, 'Enfeeblement', 'hand'); t = terras(t, 'Swamp', 2);
  t = tudo(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === ef && a.targets[0].oid === u)[0])); assert.equal(t.objects[u].zone, 'graveyard');
});

test('LT172 · Call to Mind devolve instantânea ou feitiço do seu cemitério; Submerged Boneyard entra virado e dá {U} ou {B}', () => {
  let s = mesa(), cm, alvo, bv; [s, alvo] = poe(s, 0, 'Call to Mind', 'graveyard'); [s, bv] = poe(s, 0, 'Bloodbond Vampire', 'graveyard'); [s, cm] = poe(s, 0, 'Call to Mind', 'hand'); s = terras(s, 'Island', 3);
  const op = legais(s, 0, a => a.t === 'cast' && a.oid === cm); assert.ok(op.length > 0 && op.every(a => a.targets[0].oid !== bv), 'só instantânea ou feitiço');
  s = tudo(act(s, op.find(a => a.targets[0].oid === alvo))); assert.ok(s.zones[0].hand.includes(alvo));
  let t = mesa(), sb; [t, sb] = poe(t, 0, 'Submerged Boneyard', 'hand');
  t = act(t, legais(t, 0, a => a.oid === sb && a.t !== 'cast')[0]); assert.equal(t.objects[sb].zone, 'battlefield'); assert.ok(t.objects[sb].tapped, 'entra virado');
  t = J(t); t.objects[sb].tapped = false; assert.equal(legais(t, 0, a => a.t === 'tap_mana' && a.oid === sb).length >= 1, true);
});

test('LT172 · Berserkers of Blood Ridge ataca se puder', () => {
  let s = mesa(), bb; [s, bb] = poe(s, 0, 'Berserkers of Blood Ridge'); s = J(s); s.objects[bb].sick = false;
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers', 20);
  const at = legais(s, 0, a => a.t === 'attack'); assert.ok(at.length > 0 && at.every(a => (a.attackers || []).includes(bb)), 'obrigado a atacar');
});
