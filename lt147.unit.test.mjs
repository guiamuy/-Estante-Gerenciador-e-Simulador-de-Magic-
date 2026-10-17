// M-465 · LT131 · correções da revisão independente de M-447…M-454: (1) "up to N target" é um evento só para a Spirit Mascot (603.2c; ruling de
// 20/03/2026) e a Mascot que volta no mesmo evento não vê as outras (603.10a); (2) o dano do terreno de dor é dano (120.3): a Needle Drop vê você;
// (3) cascata numa Aura oferece o que encantar (303.4a). Textos: Spirit Mascot e Needle Drop em .listas/oficiais-revisadas.json; Patch Up em
// .listas/oficiais-commander.json; Sentinel's Eyes em .listas/oficiais.json; Sulfurous Springs da Scryfall (17/10/2026). Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';
const ler = f => JSON.parse(readFileSync(new URL('./.listas/' + f, import.meta.url), 'utf8')).cartas;
const OF = [...ler('oficiais-revisadas.json'), ...ler('oficiais-commander.json'), ...ler('oficiais.json')];
const cores = c => [...new Set(((c || '').match(/[WUBRG]/g) || []))];
const of = (n, extra = {}) => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost || '', cmc: valorDeMana(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: cores(c.mana_cost), ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}), ...extra }; };
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
const C = { 'Spirit Mascot': of('Spirit Mascot'), 'Patch Up': of('Patch Up'), 'Needle Drop': of('Needle Drop'), "Sentinel's Eyes": of("Sentinel's Eyes", { keywords: ['Escape'] }),
  'Sulfurous Springs': { name: 'Sulfurous Springs', type_line: 'Land', mana_cost: '', cmc: 0, keywords: [], oracle_text: '{T}: Add {C}.\n{T}: Add {B} or {R}. This land deals 1 damage to you.', colors: [] },
  Cascateira: { name: 'Cascateira', type_line: 'Creature — Test', mana_cost: '{3}{W}', cmc: 4, keywords: ['Cascade'], oracle_text: 'Cascade', colors: ['W'], power: '3', toughness: '3' },
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], power: '1', toughness: '1' },
  Plains: terra('Plains', 'Plains', 'W'), Mountain: terra('Mountain', 'Mountain', 'R') };
function mesa(a, seed = 113) {
  const b = ns => ns.map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b(a) }, { name: 'B', deck: b(['Urso', 'Plains']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const tudo = s => { for (let i = 0; i < 80 && (s.stack.length || s.pending); i++) { const l = legais(s, s.pending ? s.pending.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pass') || l[0]); } return s; };
const ctr = (s, o) => (s.objects[o].counters || {}).p1p1 || 0;

test('LT131 · Patch Up devolve três de uma vez: a Mascot ganha um marcador, não três', () => {
  let s = mesa(['Spirit Mascot', 'Patch Up', 'Urso', 'Plains']), m, pu; [s, m] = poe(s, 0, 'Spirit Mascot'); for (let i = 0; i < 3; i++) [s] = poe(s, 0, 'Urso', 'graveyard');
  [s, pu] = poe(s, 0, 'Patch Up', 'hand'); for (let i = 0; i < 3; i++) [s] = poe(s, 0, 'Plains');
  const a = legais(s, 0, x => x.t === 'cast' && x.oid === pu && (x.targets || []).filter(Boolean).length === 3)[0]; assert.ok(a, 'três alvos');
  s = tudo(act(s, a)); assert.equal(s.zones[0].graveyard.filter(o => s.objects[o].name === 'Urso').length, 0); assert.equal(ctr(s, m), 1);
});

test('LT131 · a Mascot que volta com outra carta no mesmo evento não vê a saída dela; a outra Mascot no campo vê uma vez', () => {
  let s = mesa(['Spirit Mascot', 'Patch Up', 'Urso', 'Plains']), ma, mb, u, pu; [s, ma] = poe(s, 0, 'Spirit Mascot'); [s, mb] = poe(s, 0, 'Spirit Mascot', 'graveyard'); [s, u] = poe(s, 0, 'Urso', 'graveyard');
  [s, pu] = poe(s, 0, 'Patch Up', 'hand'); for (let i = 0; i < 3; i++) [s] = poe(s, 0, 'Plains');
  const a = legais(s, 0, x => x.t === 'cast' && x.oid === pu && (x.targets || []).filter(Boolean).length === 2 && x.targets[0].oid === mb)[0]; assert.ok(a);
  s = tudo(act(s, a)); assert.equal(s.objects[mb].zone, 'battlefield'); assert.deepEqual([ctr(s, ma), ctr(s, mb)], [1, 0]);
});

test('LT131 · o terreno de dor causa dano: depois de virar Sulfurous Springs para {R}, a Needle Drop pode mirar você', () => {
  let s = mesa(['Needle Drop', 'Sulfurous Springs', 'Plains']), nd, sp; [s, nd] = poe(s, 0, 'Needle Drop', 'hand'); [s, sp] = poe(s, 0, 'Sulfurous Springs');
  s = act(s, { t: 'tap_mana', p: 0, oid: sp, option: 2 }); // {R} assert.equal(s.players[0].life, 19);
  assert.ok(legais(s, 0, a => a.t === 'cast' && a.oid === nd).some(a => a.targets[0].player === 0), 'você é alvo');
});

test("LT131 · cascata revela Sentinel's Eyes: a conjuração sem pagar oferece a criatura a encantar e é aceita", () => {
  let s = mesa(["Sentinel's Eyes", 'Cascateira', 'Urso', 'Plains']), cs, u; [s, cs] = poe(s, 0, 'Cascateira', 'hand'); [s, u] = poe(s, 0, 'Urso'); for (let i = 0; i < 4; i++) [s] = poe(s, 0, 'Plains');
  s = J(s); const z = s.zones[0]; for (const o of z.hand.filter(o => o !== cs)) { z.hand.splice(z.hand.indexOf(o), 1); z.library.push(o); s.objects[o].zone = 'library'; }
  const lib = z.library, se = lib.find(o => s.objects[o].name === "Sentinel's Eyes"); lib.splice(lib.indexOf(se), 1); lib.unshift(se);
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === cs)[0]); for (let i = 0; i < 6 && !(s.pending && s.pending.kind === 'free_cast'); i++) s = act(s, { t: 'pass', p: s.turn.priority });
  assert.equal(s.pending && s.pending.kind, 'free_cast');
  const fr = legais(s, 0, a => a.t === 'cast_free' && a.oid === se); assert.ok(fr.length > 0 && fr.every(a => a.targets && a.targets[0].oid != null));
  assert.doesNotThrow(() => E.apply(s, fr[0]));
});
