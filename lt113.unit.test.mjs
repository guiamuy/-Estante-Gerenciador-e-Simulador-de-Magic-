// M-431 · LT97 · correções da revisão independente de M-424…M-428: (1) Echoing Truth — as permanentes que voltam à mão no mesmo evento se veem sair (603.10a);
// (2) Ghostly Flicker — as duas exiladas pela mesma mágica saem juntas e se veem (603.10a); (3) Ghostly Flicker em Glacial Fortress + Island — a Island que
// entra junto não está no campo quando a Fortress confere "enters tapped unless you control a Plains or an Island" (614.12); (4) a cópia do Fling (Twincast)
// leva a criatura sacrificada pela original (707.10; ruling do Twincast/Reverberate de 15/08/2010). Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const C = {}; for (const n of ['Echoing Truth', 'Ghostly Flicker', 'Glacial Fortress', 'Fling']) { const c = OF.find(x => x.name === n); C[n] = { name: n, type_line: c.type_line, mana_cost: c.mana_cost || '', cmc: valorDeMana(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: [...new Set(((c.mana_cost || '').match(/[WUBRG]/g) || []))] }; }
C.Twincast = { name: 'Twincast', type_line: 'Instant', mana_cost: '{U}{U}', cmc: 2, keywords: [], oracle_text: 'Copy target instant or sorcery spell. You may choose new targets for the copy.', colors: ['U'] }; // script à mão (scripts.js)
C.Vigia = { name: 'Vigia', type_line: 'Creature — Spirit', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], power: '1', toughness: '1' };
C.Urso = { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' };
for (const [n, k] of Object.entries({ Island: 'U', Mountain: 'R', Forest: 'G' })) C[n] = { name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${k}}.)`, colors: [] };
// observador de saída (o gatilho da face de trás da Luminous Phantom, já no motor desde a Leva 107): "Whenever another creature you control leaves the battlefield, you gain 1 life."
const SCR = { Vigia: { name: 'Vigia', abilities: [{ kind: 'triggered', when: 'other-leaves-battlefield', filter: { types: ['creature'] }, effects: [{ do: 'gain', amount: 1 }] }], example: { action: 'etb', target: 'none', expect: { attached: false } } } };
function mesa(seed = 40) {
  const b = ns => ns.map(name => ({ name, qty: ['Island', 'Mountain'].includes(name) ? 15 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SCR, first: 0, players: [{ name: 'A', deck: b(['Echoing Truth', 'Ghostly Flicker', 'Glacial Fortress', 'Fling', 'Twincast', 'Vigia', 'Urso', 'Island', 'Mountain']) }, { name: 'B', deck: b(['Urso', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending); s = J(s); s.queued = []; return s;
}
const resolve = (s, alvoOponente = false) => { for (let i = 0; i < 60; i++) { if (s.pending && s.pending.kind !== 'priority') { const pd = s.pending, l = legais(s, pd.p); s = act(s, (alvoOponente && pd.kind === 'pick_target' && l.find(x => (pd.options[x.index] || {}).player === 1)) || l[0]); continue; } /* alvoOponente: o alvo da cópia é o oponente */ if (s.stack.length) { s = passaAte(s, x => !x.stack.length || (!!x.pending && x.pending.kind !== 'priority'), 40); continue; }
  if (s.queued && s.queued.length) { const f = s.zones[0].battlefield.find(o => /Island|Mountain/.test(s.objects[o].name) && !s.objects[o].tapped); s = act(s, { t: 'tap_mana', p: 0, oid: f, option: 0 }); continue; } return s; } return s; };
const ilhas = (s, n, nome = 'Island') => { for (let i = 0; i < n; i++) [s] = poe(s, 0, nome); return s; };

test('LT97 · Echoing Truth em duas Vigias: as duas saem juntas e cada uma vê a outra sair (603.10a) — +2', () => {
  let s = mesa(), et, v1, v2; [s, v1] = poe(s, 0, 'Vigia'); [s, v2] = poe(s, 0, 'Vigia'); [s, et] = poe(s, 0, 'Echoing Truth', 'hand'); s = ilhas(s, 3);
  const vida = s.players[0].life; const t = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === et && a.targets && a.targets[0].oid === v1)[0]));
  assert.equal(t.objects[v1].zone, 'hand'); assert.equal(t.objects[v2].zone, 'hand'); assert.equal(t.players[0].life, vida + 2);
});

test('LT97 · Ghostly Flicker em duas Vigias: as duas saem juntas (603.10a) e voltam juntas — +2 pela saída', () => {
  let s = mesa(), gf, v1, v2; [s, v1] = poe(s, 0, 'Vigia'); [s, v2] = poe(s, 0, 'Vigia'); [s, gf] = poe(s, 0, 'Ghostly Flicker', 'hand'); s = ilhas(s, 4);
  const vida = s.players[0].life; const as = legais(s, 0, a => a.t === 'cast' && a.oid === gf && a.targets && a.targets.length === 2 && a.targets.some(t => t.oid === v1) && a.targets.some(t => t.oid === v2));
  assert.ok(as.length); for (const a of as) assert.equal(resolve(act(s, a)).players[0].life, vida + 2, JSON.stringify(a.targets));
});

test('LT97 · Ghostly Flicker em Glacial Fortress + Island (sem outra Plains ou Island): a Fortress volta virada nas duas ordens (614.12)', () => {
  let s = mesa(), gf, gl, il; [s, gl] = poe(s, 0, 'Glacial Fortress'); [s, il] = poe(s, 0, 'Island'); [s, gf] = poe(s, 0, 'Ghostly Flicker', 'hand'); s = ilhas(s, 4, 'Mountain');
  s = J(s); for (const o of s.zones[0].battlefield) if (s.objects[o].name === 'Mountain') s.objects[o].manaLivreT = true; // (só para pagar: as Montanhas não são Plains nem Island)
  const as = legais(s, 0, a => a.t === 'cast' && a.oid === gf && a.targets && a.targets.length === 2 && a.targets.some(t => t.oid === gl) && a.targets.some(t => t.oid === il));
  assert.ok(as.length, 'mira as duas terras');
  for (const a of as) { const t = resolve(act(s, a)); assert.equal(t.objects[gl].zone, 'battlefield'); assert.equal(t.objects[gl].tapped, true, JSON.stringify(a.targets.map(x => s.objects[x.oid].name))); }
});

test('LT97 · Twincast no Fling: a cópia causa o poder da criatura sacrificada pela original (707.10)', () => {
  let s = mesa(), fl, tw, u; [s, fl] = poe(s, 0, 'Fling', 'hand'); [s, tw] = poe(s, 0, 'Twincast', 'hand'); [s, u] = poe(s, 0, 'Urso'); s = ilhas(s, 3); s = ilhas(s, 3, 'Mountain');
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === fl && a.targets && a.targets[0].player === 1)[0]);
  const t = resolve(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === tw)[0]), true);
  assert.equal(t.players[1].life, 16, 'a original e a cópia causam 2 cada');
});
