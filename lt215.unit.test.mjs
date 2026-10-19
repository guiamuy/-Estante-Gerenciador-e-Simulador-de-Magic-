// M-533 · LT195 · revisão por lote CLXXI (textos da Scryfall de 19/10/2026): Subtlety ("choose up to one target creature spell or
// planeswalker spell. Its owner puts it on their choice of the top or bottom of their library" — a mágica sai da pilha, não é anulada) e
// Consign to Memory (replicar, 702.56; "Counter target triggered ability or colorless spell", 105.2c). Falham no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const NOMES = ['Subtlety', 'Consign to Memory'];
const of = n => { const c = OF.find(x => x.name === n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: c.keywords || [], oracle_text: c.oracle_text, colors: [...new Set((c.mana_cost.match(/[WUBRG]/g) || []))], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) }; };
const C = Object.fromEntries(NOMES.map(n => [n, of(n)]));
const terra = (name, sub, m) => ({ name, type_line: `Basic Land — ${sub}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${m}}.)`, colors: [] });
Object.assign(C, { Island: terra('Island', 'Island', 'U'), Forest: terra('Forest', 'Forest', 'G'), Mountain: terra('Mountain', 'Mountain', 'R'),
  'Lightning Bolt': { name: 'Lightning Bolt', type_line: 'Instant', mana_cost: '{R}', cmc: 1, keywords: [], oracle_text: 'Lightning Bolt deals 3 damage to any target.', colors: ['R'] },
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', power: '2', toughness: '2', colors: ['G'] },
  Amuleto: { name: 'Amuleto', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] } });
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: /Land/.test(C[name].type_line) ? 10 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 215, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b([...NOMES, 'Lightning Bolt', 'Urso', 'Amuleto', 'Island', 'Mountain', 'Forest']) }, { name: 'B', deck: b(['Urso', 'Amuleto', 'Lightning Bolt', 'Forest', 'Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const terras = (s, p, n, k) => { for (let i = 0; i < k; i++) [s] = poe(s, p, n); return s; };
// B conjura `nome` no turno dele (principal 1) e para com a mágica na pilha e a prioridade com A
function bConjura(s, nome) {
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  let o; [s, o] = poe(s, 1, nome, 'hand'); s = terras(s, 1, nome === 'Lightning Bolt' ? 'Mountain' : 'Forest', 2);
  s = act(s, legais(s, 1, a => a.t === 'cast' && a.oid === o && (!a.targets || !a.targets.length || a.targets[0].player === 0))[0]);
  s = act(s, { t: 'pass', p: 1 }); return [s, o];
}
const resolveTopo = s => { const topo = s.stack[s.stack.length - 1]; return passaAte(s, x => !x.stack.includes(topo) || !!x.pending); };

test('M-533 · Subtlety: a mágica de criatura alvo vai ao topo ou ao fundo do grimório do dono, à escolha dele', () => {
  for (const topo of [true, false]) {
    let s = mesa(), sb, u; s = terras(s, 0, 'Island', 4); [s, sb] = poe(s, 0, 'Subtlety', 'hand'); [s, u] = bConjura(s, 'Urso');
    s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === sb && !a.alt)[0]); s = resolveTopo(s); // Subtlety resolve; o gatilho pede o alvo
    if (s.pending && s.pending.kind === 'pick_target') s = act(s, { t: 'pick_target', p: 0, index: s.pending.options.findIndex(o => o && o.oid === u) });
    s = passaAte(s, x => !!x.pending && x.pending.kind === 'topo_fundo'); assert.equal(s.pending.p, 1, 'quem escolhe é o dono da mágica');
    s = act(s, legais(s, 1, a => a.t === 'topo_fundo' && !!a.topo === topo)[0]);
    assert.equal(s.objects[u].zone, 'library'); const lib = s.zones[1].library; assert.equal(topo ? lib[0] : lib[lib.length - 1], u);
  }
});

test('M-533 · Subtlety não mira mágica que não é de criatura nem de planeswalker', () => {
  let s = mesa(), sb, lb; s = terras(s, 0, 'Island', 4); [s, sb] = poe(s, 0, 'Subtlety', 'hand'); [s, lb] = bConjura(s, 'Lightning Bolt');
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === sb && !a.alt)[0]); s = resolveTopo(s);
  const opts = s.pending && s.pending.kind === 'pick_target' ? s.pending.options : (s.stack.map(o => s.objects[o]).find(o => o.ability) || {}).targets || [];
  assert.ok(!opts.some(o => o && o.oid === lb), 'o Raio não é alvo');
});

test('M-533 · Consign to Memory anula mágica incolor e habilidade disparada; não mira mágica colorida', () => {
  let s = mesa(), cm, am; s = terras(s, 0, 'Island', 2); [s, cm] = poe(s, 0, 'Consign to Memory', 'hand'); [s, am] = bConjura(s, 'Amuleto');
  const alvos = legais(s, 0, a => a.t === 'cast' && a.oid === cm && !a.kick).map(a => a.targets[0].oid);
  assert.ok(alvos.includes(am)); s = passaAte(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === cm && !a.kick && a.targets[0].oid === am)[0]), x => !x.stack.length || !!x.pending);
  assert.equal(s.objects[am].zone, 'graveyard', 'o artefato incolor foi anulado');
  let t = mesa(), c2, lb; t = terras(t, 0, 'Island', 2); [t, c2] = poe(t, 0, 'Consign to Memory', 'hand'); [t, lb] = bConjura(t, 'Lightning Bolt');
  assert.ok(!legais(t, 0, a => a.t === 'cast' && a.oid === c2 && a.targets && a.targets.some(x => x.oid === lb)).length, 'o Raio é vermelho');
  // habilidade disparada: o gatilho de entrada da Subtlety (sem alvo escolhido ainda: up to one)
  let w = mesa(), sb, c3, u; w = terras(w, 0, 'Island', 7); [w, sb] = poe(w, 0, 'Subtlety', 'hand'); [w, c3] = poe(w, 0, 'Consign to Memory', 'hand'); [w, u] = bConjura(w, 'Urso');
  w = act(w, legais(w, 0, a => a.t === 'cast' && a.oid === sb && !a.alt)[0]); w = resolveTopo(w);
  if (w.pending && w.pending.kind === 'pick_target') w = act(w, { t: 'pick_target', p: 0, index: w.pending.options.findIndex(o => o && o.oid === u) });
  const gat = w.stack.find(o => w.objects[o].ability); assert.ok(gat, 'o gatilho está na pilha');
  if (w.turn.priority === 1) w = act(w, { t: 'pass', p: 1 }); // o gatilho foi à pilha no turno de B: B recebe a prioridade primeiro
  const cg = legais(w, 0, a => a.t === 'cast' && a.oid === c3 && !a.kick && a.targets[0].oid === gat); assert.ok(cg.length, 'mira o gatilho');
  w = passaAte(act(w, cg[0]), x => !x.stack.includes(gat) || !!x.pending); assert.ok(!w.stack.includes(gat)); assert.equal(w.objects[u].zone, 'stack', 'o gatilho anulado não tirou o Urso da pilha');
});

test('M-533 · Consign to Memory com replicar: cada pagamento de {1} é uma cópia com alvo próprio', () => {
  let s = mesa(), cm; s = terras(s, 0, 'Island', 3); [s, cm] = poe(s, 0, 'Consign to Memory', 'hand'); [s] = bConjura(s, 'Amuleto');
  const of = legais(s, 0, a => a.t === 'cast' && a.oid === cm && a.kick === 1); assert.ok(of.length, 'replicar uma vez é oferecido');
  const r = E.apply(s, of[0]); assert.ok(r.events.some(e => e.kind === 'replicar' && e.amount === 1));
});
