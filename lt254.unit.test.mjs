// M-572 · LT231 · revisão por lote CCVII (textos da Scryfall de 23/10/2026): Clowning Around ("Create two 1/1 white Clown Robot artifact creature tokens,
// then roll a six-sided die. If the result is equal to or less than the number of Robots you control, create a 1/1 white Clown Robot artifact creature token.")
// e Shinen of Life's Roar ("All creatures able to block this creature do so. / Channel — {2}{G}{G}, Discard this card: All creatures able to block target
// creature this turn do so."): exigência de bloqueio com atacante obrigatório (509.1c), sobre a da M-567. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadModules } from './_load.mjs';
import { E, S, act, poe, legais, passaAte, limpaMao } from './listas.mjs';
const BOT = loadModules().bot;
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Clowning Around', "Shinen of Life's Roar"];
const cor = c => [...new Set((c.match(/[WUBRG]/g) || []))];
const C = Object.fromEntries(NOMES.map(n => { const o = OF.find(x => x.name === n); return [n, { name: n, type_line: o.type_line, mana_cost: o.mana_cost, cmc: [...o.mana_cost.matchAll(/\{([^}]+)\}/g)].reduce((t, [, x]) => t + (/^\d+$/.test(x) ? +x : 1), 0), keywords: o.keywords || [], oracle_text: o.oracle_text, ...(o.power ? { power: o.power, toughness: o.toughness } : {}), colors: cor(o.mana_cost) }]; }));
Object.assign(C, Object.fromEntries([['Plains', 'W'], ['Forest', 'G'], ['Island', 'U']].map(([n, k]) => [n, { name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${k}}.)`, colors: [] }])),
  { Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', power: '2', toughness: '2', colors: ['G'] },
    Robo: { name: 'Robo', type_line: 'Artifact Creature — Robot', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', power: '1', toughness: '1', colors: [] },
    Muralha: { name: 'Muralha', type_line: 'Creature — Wall', mana_cost: '{1}{U}', cmc: 2, keywords: ['Defender'], oracle_text: 'Defender', power: '0', toughness: '4', colors: ['U'] } });
function mesa(deckA, deckB, seed = 254) {
  const b = ns => ns.map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b(deckA) }, { name: 'B', deck: b(deckB) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  return limpaMao(s, 0);
}
const resolve = (s, escolha = (pd, st) => legais(st, pd.p)[0]) => { for (let i = 0; i < 60 && (s.stack.length || s.pending); i++) { const pd = s.pending; s = pd ? act(s, escolha(pd, s)) : act(s, { t: 'pass', p: s.turn.priority }); } return s; };
const naHoraDeBloquear = s => passaAte(s, x => !!x.pending && x.pending.kind === 'blockers');

test('M-572 · as duas jogam (lidas e aprovadas)', () => { for (const n of NOMES) assert.equal(S.coverage(C[n]).level, 'completo', n); });

test('M-572 · Clowning Around: duas fichas Clown Robot e o dado; a terceira só se o resultado for até o número de Robôs que você controla', () => {
  const resultados = new Map();
  for (let seed = 1; seed <= 40 && resultados.size < 6; seed++) {
    let s = mesa([['Clowning Around', 2], ['Robo', 4], ['Plains', 34]], [['Island', 40]], seed), c; [s, c] = poe(s, 0, 'Clowning Around', 'hand'); for (let i = 0; i < 2; i++) [s] = poe(s, 0, 'Plains');
    [s] = poe(s, 0, 'Robo'); // 1 Robô antes: depois das duas fichas, 3 Robôs
    let t = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === c)[0]); const evs = [];
    for (let i = 0; i < 40 && (t.stack.length || t.pending); i++) { const a = t.pending ? legais(t, t.pending.p)[0] : { t: 'pass', p: t.turn.priority }; const r = E.apply(t, a); evs.push(...r.events); t = r.state; }
    const dado = evs.find(e => e.do === 'dado'); if (!dado) continue;
    const fichas = t.zones[0].battlefield.filter(x => t.objects[x].token && t.objects[x].name === 'Clown Robot').length;
    resultados.set(dado.resultado, fichas);
  }
  assert.ok(resultados.size >= 3, 'vários resultados do dado');
  for (const [d, n] of resultados) assert.equal(n, d <= 3 ? 3 : 2, `dado ${d}: ${n} fichas`);
});

test("M-572 · Shinen of Life's Roar: quem pode bloqueá-lo precisa bloqueá-lo (e não outro atacante); quem não pode, livre", () => {
  let s = mesa([["Shinen of Life's Roar", 2], ['Urso', 2], ['Forest', 36]], [['Urso', 2], ['Muralha', 2], ['Island', 36]]), sh, u, b1, m;
  [s, sh] = poe(s, 0, "Shinen of Life's Roar"); [s, u] = poe(s, 0, 'Urso'); [s, b1] = poe(s, 1, 'Urso'); [s, m] = poe(s, 1, 'Muralha');
  s = passaAte(s, x => !!x.pending && x.pending.kind === 'attackers'); s = naHoraDeBloquear(act(s, { t: 'attack', p: 0, attackers: [sh, u] }));
  assert.throws(() => E.apply(s, { t: 'block', p: 1, blocks: [] }), /precisa bloquear/);
  assert.throws(() => E.apply(s, { t: 'block', p: 1, blocks: [[b1, sh], [m, u]] }), /Muralha precisa bloquear Shinen/, 'bloquear o outro atacante não cumpre');
  E.apply(s, { t: 'block', p: 1, blocks: [[b1, sh], [m, sh]] });
  const of = legais(s, 1, a => a.t === 'block'); assert.ok(of.length);
  for (const a of of) { assert.ok([b1, m].every(x => a.blocks.some(([y, z]) => y === x && z === sh)), JSON.stringify(a.blocks)); E.apply(s, a); }
  for (const f of [BOT.decideBloqueio, (x, p) => BOT.decideBloqueioProfissional(x, p, { duplo: true })]) E.apply(s, f(s, 1).acao);
  const t = JSON.parse(JSON.stringify(s)); t.objects[m].tapped = true; E.apply(t, { t: 'block', p: 1, blocks: [[b1, sh]] }); // a virada não precisa
});

test("M-572 · canalizar: da mão, {2}{G}{G} e descartá-la; todas as que podem bloquear a criatura alvo bloqueiam neste turno", () => {
  let s = mesa([["Shinen of Life's Roar", 2], ['Urso', 2], ['Forest', 36]], [['Urso', 2], ['Island', 38]]), sh, u, b1;
  [s, sh] = poe(s, 0, "Shinen of Life's Roar", 'hand'); [s, u] = poe(s, 0, 'Urso'); [s, b1] = poe(s, 1, 'Urso'); for (let i = 0; i < 4; i++) [s] = poe(s, 0, 'Forest');
  const at = legais(s, 0, a => a.t === 'activate' && a.oid === sh && (a.targets || []).some(t => t.oid === u)); assert.ok(at.length, 'ativa da mão');
  s = resolve(act(s, at[0])); assert.equal(s.objects[sh].zone, 'graveyard');
  s = passaAte(s, x => !!x.pending && x.pending.kind === 'attackers'); s = naHoraDeBloquear(act(s, { t: 'attack', p: 0, attackers: [u] }));
  assert.throws(() => E.apply(s, { t: 'block', p: 1, blocks: [] }), /precisa bloquear Urso/);
  E.apply(s, { t: 'block', p: 1, blocks: [[b1, u]] });
});

test('M-572 · achado da revisão: a descrição em português diz a condição do dado e a busca por nome para o campo virada', () => {
  const T = loadModules().table;
  assert.match(T.descreveEfeitos([{ do: 'dado', lados: 6 }, { do: 'token', amount: 1, token: { name: 'Clown Robot', types: ['artifact', 'creature'], subtypes: ['Clown', 'Robot'], colors: ['W'], power: 1, toughness: 1 }, dadoAteSubtipoM: 'Robot' }]), /se o dado der até o número de Robôs que você controla/);
  assert.match(T.descreveEfeitos([{ do: 'search', amount: 1, filter: { name: 'Magitek Infantry' }, to: 'battlefield-tapped' }]), /carta chamada Magitek Infantry no grimório e põe no campo de batalha virada/);
});
