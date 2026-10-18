// M-522 · LT184 · revisão por lote CLX: nove cartas que o leitor já lia por inteiro e que travam listas do catálogo (textos da Scryfall de
// 18/10/2026): Memorial to Folly, Karmic Guide, Chatterstorm, Tune the Narrative, Bounce Off, Expedite, Basilisk Collar, Evolution Sage e
// Karn's Bastion. Sem código novo: falham no motor anterior porque as cartas não estavam aprovadas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const KW = { 'Karmic Guide': ['Flying', 'Protection', 'Echo'], Chatterstorm: ['Storm'], 'Basilisk Collar': ['Equip'], 'Evolution Sage': ['Landfall', 'Proliferate'], "Karn's Bastion": ['Proliferate'] }; // campo keywords da Scryfall
const NOMES = ['Memorial to Folly', 'Karmic Guide', 'Chatterstorm', 'Tune the Narrative', 'Bounce Off', 'Expedite', 'Basilisk Collar', 'Evolution Sage', "Karn's Bastion"];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: KW[n] || [], oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Plains: terra('Plains', 'Plains', 'W'), Island: terra('Island', 'Island', 'U'), Swamp: terra('Swamp', 'Swamp', 'B'), Mountain: terra('Mountain', 'Mountain', 'R'), Forest: terra('Forest', 'Forest', 'G'),
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', power: '2', toughness: '2', colors: ['G'] },
  Brutamontes: { name: 'Brutamontes', type_line: 'Creature — Giant', mana_cost: '{4}{G}', cmc: 5, keywords: [], oracle_text: '', power: '5', toughness: '5', colors: ['G'] } });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: /Land/.test(C[name].type_line) ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 204, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Urso']) }, { name: 'B', deck: b(['Urso', 'Brutamontes', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };
const limpa = s => passaAte(s, x => !x.stack.length && !x.pending && !(x.queued || []).length);
const conj = (s, oid, f = () => true) => { const a = legais(s, 0, x => x.t === 'cast' && x.oid === oid && f(x))[0]; assert.ok(a, 'conjurar ' + s.objects[oid].name); return act(s, a); };
const alvoOid = oid => x => x.targets && x.targets[0] && x.targets[0].oid === oid;
const noCampo = (s, p, n) => s.zones[p].battlefield.filter(o => s.objects[o].name === n);

test('M-522 · Memorial to Folly entra virada; {2}{B}, {T}, sacrifica: uma criatura do seu cemitério volta à mão', () => {
  let s = mesa(), mf, u; [s, mf] = poe(s, 0, 'Memorial to Folly', 'hand'); s = limpa(act(s, legais(s, 0, a => a.t === 'play_land' && a.oid === mf)[0])); assert.equal(s.objects[mf].tapped, true);
  let t = mesa(), m2; [t, m2] = poe(t, 0, 'Memorial to Folly'); [t, u] = poe(t, 0, 'Urso', 'graveyard'); t = terras(t, 'Swamp', 3);
  t = limpa(act(t, legais(t, 0, a => a.t === 'activate' && a.oid === m2 && alvoOid(u)(a))[0]));
  assert.equal(t.objects[m2].zone, 'graveyard'); assert.equal(t.objects[u].zone, 'hand');
});

test('M-522 · Karmic Guide: ao entrar devolve uma criatura do seu cemitério ao campo; proteção contra preto', () => {
  let s = mesa(), kg, u; [s, kg] = poe(s, 0, 'Karmic Guide', 'hand'); [s, u] = poe(s, 0, 'Urso', 'graveyard'); s = terras(s, 'Plains', 5);
  s = limpa(conj(s, kg)); assert.equal(s.objects[u].zone, 'battlefield'); assert.equal(s.objects[u].controller, 0);
  assert.ok(E.hasKeyword(s, s.objects[kg], 'flying'));
});

test('M-522 · Chatterstorm cria um Esquilo 1/1 verde por cópia de tempestade', () => {
  let s = mesa(), cs, te; [s, te] = poe(s, 0, 'Tune the Narrative', 'hand'); [s, cs] = poe(s, 0, 'Chatterstorm', 'hand'); [s] = poe(s, 0, 'Island'); s = terras(s, 'Forest', 2);
  s = limpa(conj(s, te)); s = limpa(conj(s, cs));
  const sq = noCampo(s, 0, 'Squirrel'); assert.equal(sq.length, 2, 'a original e uma cópia'); assert.equal(E.stats(s, s.objects[sq[0]]).power, 1);
});

test('M-522 · Tune the Narrative compra uma e dá duas energias', () => {
  let s = mesa(), te; [s, te] = poe(s, 0, 'Tune the Narrative', 'hand'); [s] = poe(s, 0, 'Island'); const mao = s.zones[0].hand.length;
  s = limpa(conj(s, te)); assert.equal(s.zones[0].hand.length, mao); assert.equal(s.players[0].energia, 2);
});

test('M-522 · Bounce Off devolve a criatura à mão do dono; Expedite dá ímpeto e compra', () => {
  let s = mesa(), bo, u; [s, bo] = poe(s, 0, 'Bounce Off', 'hand'); [s] = poe(s, 0, 'Island'); [s, u] = poe(s, 1, 'Urso');
  s = limpa(conj(s, bo, alvoOid(u))); assert.equal(s.objects[u].zone, 'hand'); assert.ok(s.zones[1].hand.includes(u));
  let t = mesa(), ex, v; [t, ex] = poe(t, 0, 'Expedite', 'hand'); [t] = poe(t, 0, 'Mountain'); [t, v] = poe(t, 0, 'Urso', 'battlefield', { sick: true }); const mao = t.zones[0].hand.length;
  t = limpa(conj(t, ex, alvoOid(v))); assert.ok(E.hasKeyword(t, t.objects[v], 'haste')); assert.equal(t.zones[0].hand.length, mao);
  t = passaAte(t, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 0); const vB = t.players[1].life;
  t = act(t, { t: 'attack', p: 0, attackers: [v] }); t = passaAte(t, x => x.turn.step === 'main2'); assert.equal(t.players[1].life, vB - 2, 'atacou no turno em que entrou');
});

test('M-522 · Basilisk Collar: a equipada tem toque mortífero e vínculo com a vida', () => {
  let s = mesa(), bc, u, br; [s, bc] = poe(s, 0, 'Basilisk Collar'); [s, u] = poe(s, 0, 'Urso'); s = terras(s, 'Plains', 2); [s, br] = poe(s, 1, 'Brutamontes');
  s = limpa(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === bc)[0]));
  assert.ok(E.hasKeyword(s, s.objects[u], 'deathtouch')); assert.ok(E.hasKeyword(s, s.objects[u], 'lifelink'));
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 0); s = act(s, { t: 'attack', p: 0, attackers: [u] });
  s = passaAte(s, x => !!x.pending && x.pending.kind === 'blockers'); const v0 = s.players[0].life;
  s = act(s, { t: 'block', p: 1, blocks: [[br, u]] }); s = passaAte(s, x => x.turn.step === 'main2');
  assert.equal(s.objects[br].zone, 'graveyard', 'toque mortífero'); assert.equal(s.players[0].life, v0 + 2, 'vínculo com a vida');
});

test('M-522 · Evolution Sage: terreno seu entrando prolifera (escolhe quem); terreno do oponente não', () => {
  let s = mesa(), es, u, f; [s, es] = poe(s, 0, 'Evolution Sage'); [s, u] = poe(s, 0, 'Urso', 'battlefield', { counters: { p1p1: 1 } }); [s, f] = poe(s, 0, 'Forest', 'hand');
  s = J(s); s.objects[u].counters = { p1p1: 1 };
  s = passaAte(act(s, legais(s, 0, a => a.t === 'play_land' && a.oid === f)[0]), x => !!x.pending && x.pending.kind === 'pick' || !x.stack.length && !(x.queued || []).length);
  assert.equal(s.pending && s.pending.kind, 'pick', 'escolhe o que proliferar');
  s = act(s, legais(s, 0, a => a.t === 'pick' && a.oid === u)[0]); if (s.pending && s.pending.kind === 'pick') s = act(s, legais(s, 0, a => a.t === 'pick_done')[0]);
  s = limpa(s); assert.equal(s.objects[u].counters.p1p1, 2);
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  const fo = legais(s, 1, a => a.t === 'play_land')[0]; assert.ok(fo, 'o oponente tem terreno para jogar');
  s = act(s, fo); assert.equal(s.stack.length + (s.queued || []).length, 0, 'terreno do oponente: nada dispara'); assert.ok(!(s.pending && s.pending.kind === 'pick'));
});

test("M-522 · Karn's Bastion: {4}, {T}: prolifera", () => {
  let s = mesa(), kb, u; [s, kb] = poe(s, 0, "Karn's Bastion"); s = terras(s, 'Forest', 4); [s, u] = poe(s, 0, 'Urso'); s = J(s); s.objects[u].counters = { p1p1: 2 };
  s = passaAte(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === kb)[0]), x => !!x.pending && x.pending.kind === 'pick');
  s = act(s, legais(s, 0, a => a.t === 'pick' && a.oid === u)[0]); if (s.pending && s.pending.kind === 'pick') s = act(s, legais(s, 0, a => a.t === 'pick_done')[0]);
  s = limpa(s); assert.equal(s.objects[u].counters.p1p1, 3); assert.equal(s.objects[kb].tapped, true);
});
