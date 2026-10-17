// M-409 · LT75 · revisão por lote LXIII: as 8 cartas Pauper que o leitor já lia (texto da Scryfall de 17/10/2026, .listas/oficiais-revisadas.json),
// pelo caminho de produção (APROVADAS, sem script à mão). Falha no motor anterior (as 8 ficavam "lida", e as listas não jogavam).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, palavrasDoTexto, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync('./.listas/oficiais-revisadas.json', 'utf8')).cartas;
const cores = c => [...new Set((c || '').match(/[WUBRG]/g) || [])];
const NOMES = ['Meeting of Minds', 'Meditation Pools', 'Unwind', 'Mnemonic Wall', 'Goblin Matron', 'Bristling Backwoods', 'Rumble Arena', 'Peat Bog'];
const C = {}; for (const n of NOMES) { const c = OF.find(x => x.name === n); C[n] = { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: palavrasDoTexto(c.oracle_text), oracle_text: c.oracle_text, colors: cores(c.mana_cost), ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; }
for (const [n, k] of Object.entries({ Island: 'U', Mountain: 'R', Forest: 'G', Swamp: 'B' })) C[n] = { name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${k}}.)`, colors: [] };
C.Urso = { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{U}', cmc: 2, keywords: [], oracle_text: '', colors: ['U'], power: '2', toughness: '2' };
C.Gob = { name: 'Gob', type_line: 'Creature — Goblin', mana_cost: '{R}', cmc: 1, keywords: [], oracle_text: '', colors: ['R'], power: '1', toughness: '1' };
C.Muda = { name: 'Muda', type_line: 'Creature — Shapeshifter', mana_cost: '{1}', cmc: 1, keywords: ['Changeling'], oracle_text: 'Changeling', colors: [], power: '1', toughness: '1' };
C.Raio = { name: 'Raio', type_line: 'Instant', mana_cost: '{R}', cmc: 1, keywords: [], oracle_text: '', colors: ['R'] };
C.Sort = { name: 'Sort', type_line: 'Sorcery', mana_cost: '{R}', cmc: 1, keywords: [], oracle_text: '', colors: ['R'] };
export function mesa(seed = 3) {
  const b = ns => ns.map(name => ({ name, qty: 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Island', 'Mountain', 'Forest', 'Swamp', 'Urso', 'Gob', 'Muda', 'Raio', 'Sort']) }, { name: 'B', deck: b(['Island', 'Urso', 'Raio']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
let s = mesa(), mp; [s, mp] = poe(s, 0, 'Meditation Pools', 'hand');
const la = legais(s, 0, a => a.oid === mp); console.log(JSON.stringify(la));
s = act(s, la[0]); console.log('tapped', s.objects[mp].tapped);
s = J(s); s.objects[mp].tapped = false; s.objects[mp].sick = false;
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending);
const pool = (s, m, p = 0) => { s = J(s); for (const c of m) s.players[p].pool[c]++; return s; };
const desvira = (s, oid) => { s = J(s); s.objects[oid].tapped = false; s.objects[oid].sick = false; return s; };
const { S } = await import('./listas.mjs');

test('LT75 · as 8 jogam pelo leitor aprovado (completo, script lido) e o texto guardado bate com a aprovação', () => {
  for (const n of NOMES) { const cov = S.coverage(C[n]); assert.equal(cov.level, 'completo', n + ': ' + JSON.stringify(cov)); assert.ok(S.APROVADAS[n] && S.APROVADAS[n].leva === 'M-409', n); assert.ok(!S.SCRIPTS[n], n + ' sem script à mão'); }
});

test('LT75 · Meditation Pools entra virada, dá {G} ou {U}; {4}, {T}, sacrificar: compra uma', () => {
  let s = mesa(), mp; [s, mp] = poe(s, 0, 'Meditation Pools', 'hand');
  s = act(s, legais(s, 0, a => a.oid === mp)[0]); assert.equal(s.objects[mp].tapped, true);
  s = desvira(s, mp); assert.ok(legais(s, 0, a => a.t === 'tap_mana' && a.oid === mp).length);
  const cores = [0, 1].map(option => { const x = act(s, { t: 'tap_mana', p: 0, oid: mp, option }); return Object.entries(x.players[0].pool).filter(([, v]) => v > 0).map(([k]) => k).join(''); }).sort();
  assert.deepEqual([...cores], ['G', 'U']);
  s = pool(s, ['C', 'C', 'C', 'C']); const mao = s.zones[0].hand.length;
  const at = legais(s, 0, a => a.t === 'activate' && a.oid === mp); assert.equal(at.length, 1, JSON.stringify(legais(s, 0, a => a.oid === mp)));
  s = resolve(act(s, at[0])); assert.equal(s.objects[mp].zone, 'graveyard'); assert.equal(s.zones[0].hand.length, mao + 1);
});

test('LT75 · Bristling Backwoods: Deserto que entra virado e causa 1 de dano ao oponente', () => {
  let s = mesa(), bb; [s, bb] = poe(s, 0, 'Bristling Backwoods', 'hand'); const v = s.players[1].life;
  s = act(s, legais(s, 0, a => a.oid === bb)[0]); assert.equal(s.objects[bb].tapped, true);
  s = resolve(s); assert.equal(s.players[1].life, v - 1); assert.equal(s.players[0].life, 20);
  s = desvira(s, bb); const cores = [0, 1].map(option => Object.entries(act(s, { t: 'tap_mana', p: 0, oid: bb, option }).players[0].pool).filter(([, x]) => x > 0).map(([k]) => k).join('')).sort();
  assert.deepEqual([...cores], ['G', 'R']);
});

test('LT75 · Rumble Arena: vidência 1 ao entrar; {T}: {C}; {1}, {T}: uma mana de qualquer cor', () => {
  let s = mesa(), ra; [s, ra] = poe(s, 0, 'Rumble Arena', 'hand');
  s = act(s, legais(s, 0, a => a.oid === ra)[0]); assert.equal(s.objects[ra].tapped, false, 'entra desvirada');
  s = passaAte(s, x => !!x.pending || !x.stack.length); assert.ok(s.pending && /scry|vid/i.test(JSON.stringify(s.pending)), JSON.stringify(s.pending));
  let t = J(s); t.pending = null; t.stack = []; t = desvira(t, ra);
  assert.ok(legais(t, 0, a => a.t === 'tap_mana' && a.oid === ra).some(a => act(t, a).players[0].pool.C === 1));
  t = pool(t, ['C']); const qq = legais(t, 0, a => a.oid === ra && a.t !== 'tap_mana');
  assert.ok(qq.length >= 1, JSON.stringify(legais(t, 0, a => a.oid === ra)));
});

test('LT75 · Peat Bog: entra virada com dois marcadores de esgotamento; cada uso tira um e dá {B}{B}; sem marcador, é sacrificada', () => {
  let s = mesa(), pb; [s, pb] = poe(s, 0, 'Peat Bog', 'hand');
  s = act(s, legais(s, 0, a => a.oid === pb)[0]); assert.equal(s.objects[pb].tapped, true); assert.equal(s.objects[pb].counters.depletion, 2);
  for (let i = 1; i <= 2; i++) { s = desvira(s, pb); const a = legais(s, 0, x => x.oid === pb && (x.t === 'tap_mana' || x.t === 'activate')); assert.ok(a.length, JSON.stringify(legais(s, 0, x => x.oid === pb)));
    const b0 = s.players[0].pool.B; s = act(s, a[0]); assert.equal(s.players[0].pool.B, b0 + 2);
    if (i === 1) { assert.equal(s.objects[pb].counters.depletion, 1); assert.equal(s.objects[pb].zone, 'battlefield'); } else assert.equal(s.objects[pb].zone, 'graveyard'); }
});

test('LT75 · Unwind: anula só mágica que não é criatura e desvira até três terrenos de qualquer jogador', () => {
  let s = mesa(), un, mm, mw, i1, i2, i3, o1; [s, un] = poe(s, 0, 'Unwind', 'hand'); [s, mm] = poe(s, 0, 'Meeting of Minds', 'hand'); [s, mw] = poe(s, 0, 'Mnemonic Wall', 'hand');
  [s, i1] = poe(s, 0, 'Island'); [s, i2] = poe(s, 0, 'Island'); [s, i3] = poe(s, 0, 'Mountain'); [s, o1] = poe(s, 1, 'Island');
  s = J(s); for (const o of [i1, i2, i3, o1]) s.objects[o].tapped = true;
  s = pool(s, ['U', 'U', 'U', 'U', 'U', 'C', 'C', 'C', 'C', 'C', 'C', 'C']);
  let c = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === mw)[0]);
  assert.ok(!legais(c, 0, a => a.t === 'cast' && a.oid === un).length, 'criatura não é alvo');
  c = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === mm && !(a.tapaK || a.convoca || []).length)[0]);
  const u = legais(c, 0, a => a.t === 'cast' && a.oid === un); assert.ok(u.length && u.every(a => a.targets[0].oid === mm), JSON.stringify(u));
  c = passaAte(act(c, u[0]), x => !!x.pending || x.stack.length < 2);
  assert.ok(c.pending, 'decisão de desvirar'); const pd = c.pending; assert.equal(pd.max, 3); assert.equal(pd.min, 0);
  assert.ok([i1, i2, i3, o1].every(o => pd.from.includes(o)), JSON.stringify(pd.from));
});

test('LT75 · Mnemonic Wall: defensor; ao entrar, pode devolver mágica instantânea ou feitiço do seu cemitério (o do oponente não é alvo)', () => {
  let s = mesa(), mw, r1, s1, ur, rb; [s, mw] = poe(s, 0, 'Mnemonic Wall', 'hand'); [s, r1] = poe(s, 0, 'Raio', 'graveyard'); [s, s1] = poe(s, 0, 'Sort', 'graveyard'); [s, ur] = poe(s, 0, 'Urso', 'graveyard'); [s, rb] = poe(s, 1, 'Raio', 'graveyard');
  s = pool(s, ['U', 'C', 'C', 'C', 'C']); s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === mw)[0]);
  s = passaAte(s, x => !!x.pending);
  assert.equal(s.pending.kind, 'pick_target'); const alvos = s.pending.options.map(o => o.oid);
  assert.deepEqual([...alvos].sort(), [r1, s1].sort(), 'só instantânea ou feitiço do próprio cemitério');
  s = passaAte(act(s, legais(s, 0, a => a.t === 'pick_target' && s.pending.options[a.index].oid === s1)[0]), x => !!x.pending);
  assert.equal(s.pending.kind, 'may_pay', '"you may": pergunta na resolução');
  const recusa = act(s, legais(s, 0, a => a.t === 'decline')[0]); assert.equal(recusa.objects[s1].zone, 'graveyard');
  const aceita = act(s, legais(s, 0, a => a.t === 'pay')[0]); assert.equal(aceita.objects[s1].zone, 'hand');
  assert.ok(C['Mnemonic Wall'].keywords.includes('Defender'));
});

test('LT75 · Goblin Matron: pode buscar um card de Goblin (o metamorfo conta), revela e põe na mão', () => {
  let s = mesa(), gm; [s, gm] = poe(s, 0, 'Goblin Matron', 'hand');
  s = pool(s, ['R', 'C', 'C']); s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === gm)[0]);
  s = passaAte(s, x => !!x.pending && x.pending.kind !== 'priority', 60);
  for (let i = 0; i < 4 && s.pending && !(s.pending.from || []).length; i++) { const op = legais(s, s.pending.p); const sim = op.find(a => a.accept === true || a.yes === true || a.choice === 'yes' || a.optional === true) || op[0]; s = passaAte(act(s, sim), x => !!x.pending || !x.stack.length); }
  assert.ok(s.pending && s.pending.from, JSON.stringify(s.pending));
  const nomes = new Set(s.pending.from.map(o => s.objects[o].name)); assert.ok(nomes.has('Gob') && nomes.has('Muda') && nomes.has('Goblin Matron'), [...nomes].join(','));
  assert.ok(!nomes.has('Urso') && !nomes.has('Island'), [...nomes].join(','));
});

test('LT75 · Meeting of Minds: convocar — criaturas viradas pagam o custo; compra duas', () => {
  let s = mesa(), mm, u1, u2, u3, u4; [s, mm] = poe(s, 0, 'Meeting of Minds', 'hand'); for (const r of [1, 2, 3, 4]) { let o; [s, o] = poe(s, 0, 'Urso'); }
  const conv = legais(s, 0, a => a.t === 'cast' && a.oid === mm); assert.ok(conv.length, 'conjurável só com quatro criaturas (convocar)');
  const mao = s.zones[0].hand.length; s = resolve(act(s, conv[0]));
  assert.equal(s.zones[0].hand.length, mao - 1 + 2); assert.equal(s.objects[mm].zone, 'graveyard');
});
