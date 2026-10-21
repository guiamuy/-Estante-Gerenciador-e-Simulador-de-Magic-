// M-550 · LT212 · revisão por lote CLXXXVIII (texto e rulings da Scryfall de 21/10/2026): Screaming Nemesis ("Haste / Whenever this creature is dealt
// damage, it deals that much damage to any other target. If a player is dealt damage this way, they can't gain life for the rest of the game.").
// "That much" é a quantia do gatilho; dano de combate simultâneo dispara uma vez com o total (ruling); dano letal ainda dispara; sem ganhar vida
// pelo resto do jogo, mesmo sem a Nemesis (119.7). Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, T, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const SN = 'Screaming Nemesis';
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: c.keywords || [], oracle_text: c.oracle_text, colors: ['R'], power: c.power, toughness: c.toughness }; };
const C = { [SN]: of(SN) };
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
const ins = (name, m) => ({ name, type_line: 'Instant', mana_cost: `{${m}}`, cmc: 1, keywords: [], oracle_text: '', colors: [m] });
Object.assign(C, { Mountain: terra('Mountain', 'Mountain', 'R'), Plains: terra('Plains', 'Plains', 'W'), Choque: ins('Choque', 'R'), Cura: ins('Cura', 'W'),
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', power: '2', toughness: '2', colors: ['G'] },
  Gigante: { name: 'Gigante', type_line: 'Creature — Giant', mana_cost: '{4}{G}', cmc: 5, keywords: [], oracle_text: '', power: '4', toughness: '4', colors: ['G'] } });
const EX = { example: { target: 'none', expect: { selfLife: 0 } } };
const SCRIPTS = { Choque: { name: 'Choque', effects: [{ do: 'damage', amount: 2, target: 'any' }], ...EX }, Cura: { name: 'Cura', effects: [{ do: 'gain', amount: 3 }], ...EX } };
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: /Land/.test(C[name].type_line) ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 232, mode: 'full', cards: C, scripts: SCRIPTS, first: 0, players: [{ name: 'A', deck: b([SN, 'Choque', 'Urso', 'Mountain']) }, { name: 'B', deck: b(['Urso', 'Gigante', 'Cura', 'Plains']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
// resolve tudo; na escolha de alvo, `escolhe(opção)` decide; conta quantas vezes a escolha apareceu
const resolve = (s, escolhe, cont = { n: 0, opcoes: [] }) => { for (let i = 0; i < 30; i++) { s = passaAte(s, x => !!x.pending || (!x.stack.length && !(x.queued || []).length)); if (!s.pending || s.pending.kind !== 'pick_target') return s;
  cont.n++; cont.opcoes = Array.from(s.pending.options); s = act(s, { t: 'pick_target', p: s.pending.p, index: s.pending.options.findIndex(escolhe) }); } return s; };
const choque = (s, alvo) => { let c; [s, c] = poe(s, 0, 'Choque', 'hand'); [s] = poe(s, 0, 'Mountain'); return act(s, legais(s, 0, a => a.t === 'cast' && a.oid === c && a.targets && a.targets[0] && a.targets[0].oid === alvo)[0]); };

test('M-550 · Screaming Nemesis joga (lida e aprovada)', () => { assert.equal(S.coverage(of(SN)).level, 'completo'); });

test('M-550 · recebe 2 de dano: causa 2 a outro alvo (ela mesma não é opção); na criatura do oponente, dano', () => {
  let s = mesa(), sn, g; [s, sn] = poe(s, 0, SN); [s, g] = poe(s, 1, 'Gigante'); const cont = { n: 0 };
  s = resolve(choque(s, sn), o => o && o.oid === g, cont);
  assert.equal(cont.n, 1, 'um gatilho'); assert.ok(!cont.opcoes.some(o => o && o.oid === sn), 'any OTHER target'); assert.equal(s.objects[g].damage, 2);
});

test('M-550 · no jogador: perde a vida e não ganha vida pelo resto do jogo (ruling: a Cura resolve, mas não dá vida)', () => {
  let s = mesa(), sn, cu; [s, sn] = poe(s, 0, SN); [s, cu] = poe(s, 1, 'Cura', 'hand'); [s] = poe(s, 1, 'Plains'); const v = s.players[1].life;
  s = resolve(choque(s, sn), o => o && o.player === 1); assert.equal(s.players[1].life, v - 2);
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  s = resolve(act(s, legais(s, 1, a => a.t === 'cast' && a.oid === cu)[0]), () => true); assert.equal(s.objects[cu].zone, 'graveyard'); assert.equal(s.players[1].life, v - 2, 'não ganhou');
});

test('M-550 · dois bloqueadores: um gatilho só, com o total (4), mesmo com dano letal na Nemesis', () => {
  let s = mesa(), sn, u1, u2; [s, sn] = poe(s, 0, SN); [s, u1] = poe(s, 1, 'Urso'); [s, u2] = poe(s, 1, 'Urso'); const v = s.players[1].life, cont = { n: 0 };
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 0); s = act(s, { t: 'attack', p: 0, attackers: [sn] });
  s = passaAte(s, x => x.pending && x.pending.kind === 'blockers'); s = act(s, { t: 'block', p: 1, blocks: [[u1, sn], [u2, sn]] });
  s = passaAte(s, x => !!x.pending || x.turn.step === 'main2');
  for (let i = 0; i < 6 && s.pending && s.pending.kind !== 'pick_target'; i++) { const pd = s.pending; s = act(s, legais(s, pd.p)[0]); s = passaAte(s, x => !!x.pending || x.turn.step === 'main2'); }
  s = resolve(s, o => o && o.player === 1, cont);
  assert.equal(cont.n, 1, 'um gatilho'); assert.equal(s.players[1].life, v - 4, '4 de dano no jogador'); assert.equal(s.objects[sn].zone, 'graveyard', 'a Nemesis morreu');
});

test('M-550 · achados da revisão: "any other target" inclui batalha (115.4); a linha "não pode ganhar vida" vem depois da do dano', () => {
  const efs = (S.scriptLido(of(SN)).abilities[0].effects); assert.ok(Array.from(efs[0].target.tipos).includes('battle'), 'batalha no seletor');
  let t = mesa(), sn2; [t, sn2] = poe(t, 0, SN); const L = [];
  let c; [t, c] = poe(t, 0, 'Choque', 'hand'); [t] = poe(t, 0, 'Mountain'); t = act(t, legais(t, 0, a => a.t === 'cast' && a.oid === c && a.targets && a.targets[0] && a.targets[0].oid === sn2)[0]);
  for (let i = 0; i < 30 && (t.stack.length || t.pending || (t.queued || []).length); i++) { const a = t.pending && t.pending.kind === 'pick_target' ? { t: 'pick_target', p: t.pending.p, index: t.pending.options.findIndex(o => o && o.player === 1) } : t.pending ? null : { t: 'pass', p: t.turn.priority }; if (!a) break;
    const r = E.apply(t, a); L.push(String(T.describe(t, a, r.events, r.state))); t = r.state; }
  const txt = L.join('\n'), i1 = txt.indexOf('causou 2 de dano a B'), i2 = txt.indexOf('B não pode ganhar vida pelo resto do jogo');
  assert.ok(i1 >= 0 && i2 > i1, 'dano antes, depois a marca');
});
