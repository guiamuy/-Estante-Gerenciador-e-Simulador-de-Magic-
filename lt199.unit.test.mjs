// M-517 · LT179 · revisão por lote CLV: nove cartas que o leitor já lia por inteiro e que aparecem em mais listas do catálogo (textos da
// Scryfall de 18/10/2026): Emberheart Challenger, Starscape Cleric, Nova Hellkite, Primeval Titan, Indatha Triome, Samut, Eyetwitch,
// Vivid Grove e Urza's Cave. Sem código novo: falham no motor anterior porque as cartas não estavam aprovadas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const KW = { 'Emberheart Challenger': ['Haste', 'Prowess', 'Valiant'], 'Starscape Cleric': ['Offspring', 'Flying'], 'Nova Hellkite': ['Flying', 'Haste', 'Warp'], 'Primeval Titan': ['Trample'], 'Indatha Triome': ['Cycling'], Eyetwitch: ['Flying', 'Learn'] }; // campo keywords da Scryfall
const NOMES = ['Emberheart Challenger', 'Starscape Cleric', 'Nova Hellkite', 'Primeval Titan', 'Indatha Triome', "Samut, Hazoret's Champion", 'Eyetwitch', 'Vivid Grove', "Urza's Cave"];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: KW[n] || [], oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
const bicho = (name, p, t) => ({ name, type_line: 'Creature — Beast', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', power: String(p), toughness: String(t), colors: ['G'] });
Object.assign(C, { Mountain: terra('Mountain', 'Mountain', 'R'), Forest: terra('Forest', 'Forest', 'G'), Swamp: terra('Swamp', 'Swamp', 'B'),
  'Giant Growth': { name: 'Giant Growth', type_line: 'Instant', mana_cost: '{G}', cmc: 1, keywords: [], oracle_text: 'Target creature gets +3/+3 until end of turn.', colors: ['G'] },
  'Healing Salve': { name: 'Healing Salve', type_line: 'Instant', mana_cost: '{W}', cmc: 1, keywords: [], oracle_text: 'Choose one —\n• Target player gains 3 life.\n• Prevent the next 3 damage that would be dealt to any target this turn.', colors: ['W'] },
  Plains: terra('Plains', 'Plains', 'W'), Urso: bicho('Urso', 2, 2) });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: /Land/.test(C[name].type_line) ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 199, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Giant Growth', 'Healing Salve', 'Mountain', 'Forest', 'Swamp', 'Plains', 'Urso']) }, { name: 'B', deck: b(['Urso', 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };
const limpa = s => passaAte(s, x => !x.stack.length && !x.pending && !(x.queued || []).length);
const conj = (s, oid, f = () => true) => { const a = legais(s, 0, x => x.t === 'cast' && x.oid === oid && f(x))[0]; assert.ok(a, 'conjurar ' + s.objects[oid].name); return act(s, a); };
const alvoOid = oid => x => x.targets && x.targets[0] && x.targets[0].oid === oid;

test('M-517 · Emberheart Challenger: mirada pela sua mágica pela primeira vez no turno, exila o topo e você pode jogá-lo neste turno', () => {
  let s = mesa(), ec, gg; [s, ec] = poe(s, 0, 'Emberheart Challenger'); [s, gg] = poe(s, 0, 'Giant Growth', 'hand'); s = terras(s, 'Forest', 1);
  const topo = s.zones[0].library[0];
  s = conj(s, gg, alvoOid(ec)); for (let i = 0; i < 20 && (s.stack.length || s.pending || (s.queued || []).length); i++) { s = limpa(s); if (s.pending) s = act(s, legais(s, s.pending.p)[0]); } // prowess e valente disparam juntos: a ordem é decisão de quem controla
  assert.equal(s.objects[topo].zone, 'exile', 'o topo foi exilado');
  assert.ok(s.objects[topo].playableFromExile === 0 || legais(s, 0, a => a.oid === topo).length > 0, 'jogável do exílio');
});

test('M-517 · Starscape Cleric não bloqueia; quando você ganha vida, cada oponente perde 1', () => {
  let s = mesa(), sc, hs, u; [s, sc] = poe(s, 0, 'Starscape Cleric'); [s, hs] = poe(s, 0, 'Healing Salve', 'hand'); [s] = poe(s, 0, 'Plains'); [s, u] = poe(s, 1, 'Urso'); const vB = s.players[1].life;
  s = limpa(conj(s, hs, x => x.targets && x.targets[0] && x.targets[0].player === 0)); assert.equal(s.players[1].life, vB - 1, 'ganhou vida: o oponente perde 1');
  s = passaAte(s, x => x.turn.active === 1 && !!x.pending && x.pending.kind === 'attackers');
  s = act(s, { t: 'attack', p: 1, attackers: [u] }); s = passaAte(s, x => !!x.pending && x.pending.kind === 'blockers' || x.turn.step === 'main2');
  if (s.pending && s.pending.kind === 'blockers') assert.throws(() => E.apply(s, { t: 'block', p: 0, blocks: [[sc, u]] }), 'não bloqueia');
});

test('M-517 · Nova Hellkite causa 1 de dano a uma criatura do oponente ao entrar', () => {
  let s = mesa(), nh, u; [s, nh] = poe(s, 0, 'Nova Hellkite', 'hand'); s = terras(s, 'Mountain', 5); [s, u] = poe(s, 1, 'Urso');
  s = limpa(conj(s, nh, x => !x.dobraK && !x.warp)); assert.equal(s.objects[nh].zone, 'battlefield'); assert.equal(s.objects[u].damage, 1);
});

test('M-517 · Primeval Titan busca até dois terrenos virados ao entrar ("you may")', () => {
  let s = mesa(), pt; [s, pt] = poe(s, 0, 'Primeval Titan', 'hand'); s = terras(s, 'Forest', 6);
  s = passaAte(conj(s, pt), x => !!x.pending && (x.pending.kind === 'may_pay' || x.pending.kind === 'pick'));
  if (s.pending.kind === 'may_pay') s = passaAte(act(s, legais(s, 0, a => a.t === 'pay')[0]), x => !!x.pending && x.pending.kind === 'pick');
  const terr = legais(s, 0, a => a.t === 'pick').map(a => a.oid).filter((x, i, v) => v.indexOf(x) === i).slice(0, 2);
  for (const o of terr) if (s.pending && s.pending.kind === 'pick') s = act(s, legais(s, 0, a => a.t === 'pick' && a.oid === o)[0]);
  if (s.pending && s.pending.kind === 'pick') s = act(s, legais(s, 0, a => a.t === 'pick_done')[0]);
  s = limpa(s); for (const o of terr) { assert.equal(s.objects[o].zone, 'battlefield'); assert.equal(s.objects[o].tapped, true); }
});

test("M-517 · Samut dá ímpeto às suas criaturas; Indatha Triome e Vivid Grove entram virados (o Vivid com dois marcadores)", () => {
  let s = mesa(), u; [s] = poe(s, 0, "Samut, Hazoret's Champion"); [s, u] = poe(s, 0, 'Urso', 'battlefield', { sick: true });
  assert.ok(E.hasKeyword(s, s.objects[u], 'haste'), 'a Urso tem ímpeto');
  let t = mesa(), it, vg; [t, it] = poe(t, 0, 'Indatha Triome', 'hand'); t = limpa(act(t, legais(t, 0, a => a.t === 'play_land' && a.oid === it)[0])); assert.equal(t.objects[it].tapped, true);
  let v = mesa(); [v, vg] = poe(v, 0, 'Vivid Grove', 'hand'); v = limpa(act(v, legais(v, 0, a => a.t === 'play_land' && a.oid === vg)[0]));
  assert.equal(v.objects[vg].tapped, true); assert.equal(v.objects[vg].counters.charge, 2);
});

test("M-517 · Urza's Cave: {3}, vira e sacrifica para buscar um terreno virado", () => {
  let s = mesa(), uc; [s, uc] = poe(s, 0, "Urza's Cave"); s = terras(s, 'Forest', 3);
  s = passaAte(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === uc)[0]), x => !!x.pending && x.pending.kind === 'pick' || !x.stack.length);
  assert.equal(s.objects[uc].zone, 'graveyard', 'sacrificada como custo');
  const o = legais(s, 0, a => a.t === 'pick')[0].oid; s = act(s, legais(s, 0, a => a.t === 'pick' && a.oid === o)[0]); if (s.pending && s.pending.kind === 'pick') s = act(s, legais(s, 0, a => a.t === 'pick_done')[0]);
  s = limpa(s); assert.equal(s.objects[o].zone, 'battlefield'); assert.equal(s.objects[o].tapped, true);
});
