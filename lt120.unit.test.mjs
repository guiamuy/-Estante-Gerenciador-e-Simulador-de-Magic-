// M-438 · LT104 · correções da revisão independente de M-429…M-431: (1) Supernatural Stamina — a carta que saiu do cemitério e voltou antes de o gatilho
// resolver é outro objeto e não volta ao campo (400.7); (2) a pilha explicada diz "volta … virada, sob o controle do dono"; (3) Gingerbread Cabin + Forest
// pelo Ghostly Flicker — a Forest que entra junto não conta como "other Forest" (614.12; ruling de 04/10/2019): a Cabin volta virada nas duas ordens;
// (4) Ghostly Flicker numa ficha e numa carta — as duas saem juntas e se veem (603.10a), nas duas ordens. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, T, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const C = {}; for (const n of ['Supernatural Stamina', 'Ghostly Flicker', 'Gingerbread Cabin']) { const c = OF.find(x => x.name === n); C[n] = { name: n, type_line: c.type_line, mana_cost: c.mana_cost || '', cmc: valorDeMana(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: [...new Set(((c.mana_cost || '').match(/[WUBRG]/g) || []))] }; }
C['Lightning Bolt'] = { name: 'Lightning Bolt', type_line: 'Instant', mana_cost: '{R}', cmc: 1, keywords: [], oracle_text: 'Lightning Bolt deals 3 damage to any target.', colors: ['R'] }; // .listas/oficiais.json
C.Urso = { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' };
C.Vigia = { name: 'Vigia', type_line: 'Creature — Spirit', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], power: '1', toughness: '1' };
for (const [n, k] of Object.entries({ Swamp: 'B', Mountain: 'R', Island: 'U', Forest: 'G' })) C[n] = { name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${k}}.)`, colors: [] };
const SCR = { Vigia: { name: 'Vigia', abilities: [{ kind: 'triggered', when: 'other-leaves-battlefield', filter: { types: ['creature'] }, effects: [{ do: 'gain', amount: 1 }] }], example: { action: 'etb', target: 'none', expect: { attached: false } } } };
function mesa(seed = 47) {
  const b = ns => ns.map(name => ({ name, qty: ['Swamp', 'Mountain', 'Island', 'Forest'].includes(name) ? 12 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SCR, first: 0, players: [{ name: 'A', deck: b(['Supernatural Stamina', 'Ghostly Flicker', 'Gingerbread Cabin', 'Lightning Bolt', 'Urso', 'Vigia', 'Swamp', 'Mountain', 'Island', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending); s = J(s); s.queued = []; return s;
}
const resolve = s => { for (let i = 0; i < 60; i++) { if (s.pending && s.pending.kind !== 'priority') { s = act(s, legais(s, s.pending.p)[0]); continue; } if (s.stack.length) { s = passaAte(s, x => !x.stack.length || (!!x.pending && x.pending.kind !== 'priority'), 40); continue; }
  if (s.queued && s.queued.length) { const f = s.zones[0].battlefield.find(o => /Swamp|Mountain|Island/.test(s.objects[o].name) && !s.objects[o].tapped); s = act(s, { t: 'tap_mana', p: 0, oid: f, option: 0 }); continue; } return s; } return s; };
const terras = (s, nome, n) => { for (let i = 0; i < n; i++) [s] = poe(s, 0, nome); return s; };

test('LT104 · Supernatural Stamina: a carta que saiu do cemitério e voltou antes do gatilho é outro objeto (400.7) e fica no cemitério', () => {
  let s = mesa(), st, lb, u; [s, u] = poe(s, 0, 'Urso'); [s, st] = poe(s, 0, 'Supernatural Stamina', 'hand'); [s, lb] = poe(s, 0, 'Lightning Bolt', 'hand'); s = terras(s, 'Swamp', 2); s = terras(s, 'Mountain', 2);
  s = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === st && a.targets[0].oid === u)[0]));
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === lb && a.targets && a.targets[0].oid === u)[0]);
  s = passaAte(s, x => !x.stack.length || x.stack.some(o => x.objects[o].ability) || (x.queued || []).length > 0, 10);
  s = J(s); assert.equal(s.objects[u].zone, 'graveyard'); s.objects[u].zc = (s.objects[u].zc || 0) + 2; // saiu e voltou ao cemitério (como por um efeito que a exila e devolve)
  const t = resolve(s); assert.equal(t.objects[u].zone, 'graveyard');
});

test('LT104 · a pilha explicada da habilidade ganha diz "volta … virada, sob o controle do dono"', () => {
  const s = mesa(); assert.match(T.descreveEfeito(s.facts['Supernatural Stamina'].script.effects[1]), /volta do cemitério ao campo virada, sob o controle do dono/);
});

test('LT104 · Ghostly Flicker em Gingerbread Cabin + Forest, com duas outras Forests: a Cabin volta virada e sem Comida nas duas ordens (614.12)', () => {
  let s = mesa(), gf, gc, fo; [s, gc] = poe(s, 0, 'Gingerbread Cabin'); [s, fo] = poe(s, 0, 'Forest'); s = terras(s, 'Forest', 2); [s, gf] = poe(s, 0, 'Ghostly Flicker', 'hand'); s = terras(s, 'Island', 4);
  const as = legais(s, 0, a => a.t === 'cast' && a.oid === gf && a.targets && a.targets.length === 2 && a.targets.some(t => t.oid === gc) && a.targets.some(t => t.oid === fo)); assert.ok(as.length);
  for (const a of as) { const t = resolve(act(s, a)); assert.equal(t.objects[gc].tapped, true, JSON.stringify(a.targets.map(x => s.objects[x.oid].name))); assert.ok(!Object.values(t.objects).some(o => o.zone === 'battlefield' && o.token && /Food/.test(o.name))); }
});

test('LT104 · Ghostly Flicker numa ficha e numa carta observadoras: as duas saem juntas e se veem (603.10a) — +2 nas duas ordens', () => {
  let s = mesa(), gf, v1, v2; [s, v1] = poe(s, 0, 'Vigia'); [s, v2] = poe(s, 0, 'Vigia'); s = J(s); s.objects[v1].token = true; [s, gf] = poe(s, 0, 'Ghostly Flicker', 'hand'); s = terras(s, 'Island', 4);
  const vida = s.players[0].life; const as = legais(s, 0, a => a.t === 'cast' && a.oid === gf && a.targets && a.targets.length === 2 && a.targets.some(t => t.oid === v1) && a.targets.some(t => t.oid === v2));
  assert.ok(as.length); for (const a of as) assert.ok(resolve(act(s, a)).players[0].life >= vida + 2, JSON.stringify(a.targets));
});
