// M-520 · LT182 · revisão por lote CLVIII: nove cartas que o leitor já lia por inteiro e que mais travam listas do catálogo (textos da
// Scryfall de 18/10/2026): Day of Judgment, Ambition's Cost, Gilded Goose, Vanquish the Horde, Time Wipe, Vivid Meadow, Golgari Thug,
// Vivid Creek e Corrupt. Sem código novo: falham no motor anterior porque as cartas não estavam aprovadas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const KW = { 'Gilded Goose': ['Flying'], 'Golgari Thug': ['Dredge'] }; // campo keywords da Scryfall
const NOMES = ['Day of Judgment', "Ambition's Cost", 'Gilded Goose', 'Vanquish the Horde', 'Time Wipe', 'Vivid Meadow', 'Golgari Thug', 'Vivid Creek', 'Corrupt'];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: KW[n] || [], oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Plains: terra('Plains', 'Plains', 'W'), Island: terra('Island', 'Island', 'U'), Swamp: terra('Swamp', 'Swamp', 'B'), Forest: terra('Forest', 'Forest', 'G'),
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', power: '2', toughness: '2', colors: ['G'] } });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: /Land/.test(C[name].type_line) ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 202, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Plains', 'Island', 'Swamp', 'Forest', 'Urso']) }, { name: 'B', deck: b(['Urso', 'Forest', 'Swamp']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const terras = (s, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, 0, n); return s; };
const limpa = s => passaAte(s, x => !x.stack.length && !x.pending && !(x.queued || []).length);
const conj = (s, oid, f = () => true) => { const a = legais(s, 0, x => x.t === 'cast' && x.oid === oid && f(x))[0]; assert.ok(a, 'conjurar ' + s.objects[oid].name); return act(s, a); };
const noCampo = (s, p, n) => s.zones[p].battlefield.filter(o => s.objects[o].name === n);

test("M-520 · Day of Judgment destrói todas as criaturas, dos dois lados; Ambition's Cost compra três e perde 3", () => {
  let s = mesa(), dj, a, b; [s, dj] = poe(s, 0, 'Day of Judgment', 'hand'); s = terras(s, 'Plains', 4); [s, a] = poe(s, 0, 'Urso'); [s, b] = poe(s, 1, 'Urso');
  s = limpa(conj(s, dj)); assert.equal(s.objects[a].zone, 'graveyard'); assert.equal(s.objects[b].zone, 'graveyard');
  let t = mesa(), ac; [t, ac] = poe(t, 0, "Ambition's Cost", 'hand'); t = terras(t, 'Swamp', 4); const mao = t.zones[0].hand.length, v = t.players[0].life;
  t = limpa(conj(t, ac)); assert.equal(t.zones[0].hand.length, mao - 1 + 3); assert.equal(t.players[0].life, v - 3);
});

test('M-520 · Gilded Goose: Food ao entrar; vira e sacrifica uma Food para mana de qualquer cor; a Food dá 3 de vida', () => {
  let s = mesa(), g; [s, g] = poe(s, 0, 'Gilded Goose', 'hand'); [s] = poe(s, 0, 'Forest');
  s = limpa(conj(s, g)); const food = noCampo(s, 0, 'Food'); assert.equal(food.length, 1, 'uma Food');
  s = J(s); s.objects[g].sick = false;
  const m = legais(s, 0, a => a.t === 'activate' && a.oid === g && a.color === 'U')[0]; assert.ok(m, 'mana azul pela Food');
  s = act(s, m); assert.equal(s.objects[food[0]] ? s.objects[food[0]].zone : 'fora', 'fora', 'a Food foi sacrificada (ficha deixa de existir)');
  assert.equal(s.players[0].pool.U, 1); assert.equal(s.objects[g].tapped, true);
  let t = mesa(), g2; [t, g2] = poe(t, 0, 'Gilded Goose', 'hand'); t = terras(t, 'Forest', 3);
  t = limpa(conj(t, g2)); const f2 = noCampo(t, 0, 'Food')[0]; const v = t.players[0].life;
  t = limpa(act(t, legais(t, 0, a => a.t === 'activate' && a.oid === f2)[0])); assert.equal(t.players[0].life, v + 3);
  assert.equal(noCampo(t, 0, 'Food').length, 0);
});

test('M-520 · Gilded Goose: {1}{G}, {T}: cria outra Food', () => {
  let s = mesa(), g; [s, g] = poe(s, 0, 'Gilded Goose'); s = terras(s, 'Forest', 2);
  const a = legais(s, 0, x => x.t === 'activate' && x.oid === g && x.color == null)[0]; assert.ok(a, 'ativada de criar Food');
  s = limpa(act(s, a)); assert.equal(noCampo(s, 0, 'Food').length, 1);
});

test('M-520 · Vanquish the Horde custa {1} a menos por criatura no campo (as dos dois lados contam)', () => {
  let s = mesa(), vh; [s, vh] = poe(s, 0, 'Vanquish the Horde', 'hand'); s = terras(s, 'Plains', 4);
  for (let i = 0; i < 3; i++) [s] = poe(s, 1, 'Urso');
  assert.equal(legais(s, 0, a => a.t === 'cast' && a.oid === vh).length, 0, 'três criaturas: custa 5, não dá');
  [s] = poe(s, 0, 'Urso'); s = limpa(conj(s, vh));
  assert.equal(noCampo(s, 0, 'Urso').length + noCampo(s, 1, 'Urso').length, 0, 'destruiu todas');
});

test('M-520 · Time Wipe devolve uma criatura sua à mão do dono e depois destrói todas; sem criatura sua, só destrói', () => {
  let s = mesa(), tw, a, b, c; [s, tw] = poe(s, 0, 'Time Wipe', 'hand'); s = terras(s, 'Plains', 3); s = terras(s, 'Island', 2);
  [s, a] = poe(s, 0, 'Urso'); [s, b] = poe(s, 0, 'Urso'); [s, c] = poe(s, 1, 'Urso');
  s = passaAte(conj(s, tw), x => !!x.pending && x.pending.kind === 'pick' || !x.stack.length);
  assert.equal(s.pending && s.pending.kind, 'pick', 'quem conjurou escolhe qual volta'); assert.ok(![...s.pending.from].includes(c), 'só criatura sua');
  s = act(s, legais(s, 0, x => x.t === 'pick' && x.oid === b)[0]); if (s.pending && s.pending.kind === 'pick') s = act(s, legais(s, 0, x => x.t === 'pick_done')[0]);
  s = limpa(s); assert.equal(s.objects[b].zone, 'hand'); assert.equal(s.objects[a].zone, 'graveyard'); assert.equal(s.objects[c].zone, 'graveyard');
  let t = mesa(), tw2, d; [t, tw2] = poe(t, 0, 'Time Wipe', 'hand'); t = terras(t, 'Plains', 3); t = terras(t, 'Island', 2); [t, d] = poe(t, 1, 'Urso');
  t = limpa(conj(t, tw2)); assert.equal(t.objects[d].zone, 'graveyard');
});

test('M-520 · Vivid Meadow e Vivid Creek entram virados com dois marcadores; qualquer cor gasta um marcador', () => {
  for (const [n, cor] of [['Vivid Meadow', 'W'], ['Vivid Creek', 'U']]) {
    let s = mesa(), v; [s, v] = poe(s, 0, n, 'hand'); s = limpa(act(s, legais(s, 0, a => a.t === 'play_land' && a.oid === v)[0]));
    assert.equal(s.objects[v].tapped, true, n + ' virada'); assert.equal(s.objects[v].counters.charge, 2);
    s = J(s); s.objects[v].tapped = false;
    assert.ok(legais(s, 0, a => a.oid === v && a.color === cor).length > 0, 'a cor própria sem marcador');
    const q = legais(s, 0, a => a.t === 'activate' && a.oid === v && a.color === 'B')[0]; assert.ok(q, 'preto pelo marcador');
    s = act(s, q); assert.equal(s.objects[v].counters.charge, 1); assert.equal(s.players[0].pool.B, 1);
  }
});

test('M-520 · Golgari Thug: ao morrer, uma criatura do seu cemitério vai para o topo do grimório; dragar 4 no lugar da compra', () => {
  let s = mesa(), th, u, dj; [s, th] = poe(s, 0, 'Golgari Thug'); [s, u] = poe(s, 0, 'Urso', 'graveyard'); [s, dj] = poe(s, 0, 'Day of Judgment', 'hand'); s = terras(s, 'Plains', 4);
  s = passaAte(conj(s, dj), x => !x.stack.length && !x.pending && !(x.queued || []).length || !!x.pending && x.pending.kind !== 'priority');
  for (let i = 0; i < 6 && (s.pending || s.stack.length || (s.queued || []).length); i++) { if (s.pending) { const a = legais(s, 0, x => x.targets && x.targets[0] && x.targets[0].oid === u)[0] || legais(s, s.pending.p, x => x.oid === u)[0] || legais(s, s.pending.p)[0]; s = act(s, a); } else s = limpa(s); }
  assert.equal(s.zones[0].library[0], u, 'a Urso no topo');
  let t = mesa(), th2; [t, th2] = poe(t, 0, 'Golgari Thug', 'graveyard'); const n = t.zones[0].library.length;
  t = passaAte(t, x => !!x.pending && x.pending.kind === 'choose_mode' && x.pending.p === 0);
  t = act(t, legais(t, 0, a => a.t === 'choose_mode' && a.index === 1)[0]);
  assert.equal(t.objects[th2].zone, 'hand', 'voltou à mão'); assert.equal(t.zones[0].library.length, n - 4, 'moeu quatro');
});

test('M-520 · Corrupt causa dano igual aos seus Pântanos e você ganha a vida do dano causado', () => {
  let s = mesa(), co; [s, co] = poe(s, 0, 'Corrupt', 'hand'); s = terras(s, 'Swamp', 6); [s] = poe(s, 1, 'Swamp');
  const v0 = s.players[0].life, v1 = s.players[1].life;
  s = limpa(conj(s, co, x => x.targets && x.targets[0] && x.targets[0].player === 1));
  assert.equal(s.players[1].life, v1 - 6, 'seis Pântanos seus (o do oponente não conta)'); assert.equal(s.players[0].life, v0 + 6);
});
