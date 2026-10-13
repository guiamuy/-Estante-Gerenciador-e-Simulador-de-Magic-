// M-357 · 106.1a / 106.4 · "Add two mana in any combination of colors" na resolução (Manamorphose). Texto do Oracle do Forge em
// .listas/oficiais-listas.json (consulta de 12/10/2026, trilha listas): "Add two mana in any combination of colors.\nDraw a card." {1}{R/G}, Instant.
// O leitor lê a frase; o script de verdade da Manamorphose (M a Z) é da trilha listas. Todos os testes falham no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, comMana, CARTAS } from './cmd.mjs';
import { loadModules } from './_load.mjs';
import { T } from './listas.mjs';
const { leitor: L, scripts: S } = loadModules();

const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-listas.json', import.meta.url), 'utf8'));
const acha = (o, n) => { if (Array.isArray(o)) { for (const v of o) { const r = acha(v, n); if (r) return r; } } else if (o && typeof o === 'object') { if (o.name === n) return o; for (const v of Object.values(o)) { const r = acha(v, n); if (r) return r; } } return null; };
const mm = acha(OF, 'Manamorphose');
const carta = { name: mm.name, type_line: mm.type_line, mana_cost: mm.mana_cost, cmc: 2, keywords: [], oracle_text: mm.oracle_text, colors: ['R', 'G'] };
const EX = { example: { action: 'cast', target: 'none', expect: { selfLife: 20 } } };
const lido = L.ler(carta);
const scripts = { Manamorphose: { ...lido.script, ...EX } };
function mesaM(seed = 53) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: { ...CARTAS, Manamorphose: carta }, scripts, first: 0, players: [{ name: 'A', deck: baralho(['Manamorphose', 'Forest', 'Mountain']) }, { name: 'B', deck: baralho(['Plains', 'Island']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  let m; [s, m] = poe(s, 0, 'Manamorphose', 'hand'); return [s, m];
}
const resolveSo = s => act(act(s, { t: 'pass', p: s.turn.priority }), { t: 'pass', p: 1 - s.turn.priority });
const conjura = (s, oid, mana) => { const m = comMana(s, mana); return act(m, legais(m, 0, a => a.t === 'cast' && a.oid === oid)[0]); };

test('M-357 · leitor: "Add two mana in any combination of colors. Draw a card." vira mana_combinada 2 + compra 1, sem frase manual', () => {
  assert.equal(lido.completa, true, JSON.stringify(lido.frases)); assert.deepEqual([...lido.erros], []);
  assert.deepEqual(JSON.parse(JSON.stringify(lido.script.effects)), [{ do: 'mana_combinada', amount: 2 }, { do: 'draw', amount: 1 }]);
  assert.deepEqual([...S.validateScript(scripts.Manamorphose)], []);
});

test('M-357 · 106.1a: na resolução, quem conjurou escolhe a cor de cada mana (pode misturar) e só depois compra', () => {
  let [s, m] = mesaM();
  const mao = s.zones[0].hand.length;
  let t = resolveSo(conjura(s, m, 'RR'));
  assert.equal(t.pending && t.pending.kind, 'choose_color'); assert.equal(t.pending.p, 0);
  assert.equal(t.zones[0].hand.length, mao - 1, 'ainda não comprou');
  const pool0 = { ...t.players[0].pool };
  t = act(t, { t: 'choose_color', p: 0, color: 'U' });
  assert.equal(t.pending && t.pending.kind, 'choose_color', 'a segunda mana pede cor de novo');
  t = act(t, { t: 'choose_color', p: 0, color: 'B' });
  assert.equal(t.pending, null);
  assert.equal(t.players[0].pool.U, (pool0.U || 0) + 1); assert.equal(t.players[0].pool.B, (pool0.B || 0) + 1);
  assert.equal(t.zones[0].hand.length, mao, 'comprou uma depois da mana');
});

test('M-357 · as duas manas podem ser da mesma cor; incolor não é cor', () => {
  let [s, m] = mesaM();
  let t = resolveSo(conjura(s, m, 'RR'));
  assert.throws(() => E.apply(t, { t: 'choose_color', p: 0, color: 'C' }), /cor/);
  const g0 = t.players[0].pool.G || 0;
  t = act(act(t, { t: 'choose_color', p: 0, color: 'G' }), { t: 'choose_color', p: 0, color: 'G' });
  assert.equal(t.players[0].pool.G, g0 + 2);
});

test('M-357 · a mesa: legalActions oferece as cinco cores, o registro diz a mana adicionada e a pilha explicada descreve a escolha', () => {
  let [s, m] = mesaM();
  const c = conjura(s, m, 'RR');
  const txt = JSON.stringify(T.explicaPilha(c, { oracleDe: () => '' }));
  assert.match(txt, /2 manas das cores que você escolher/);
  const t = resolveSo(c);
  assert.deepEqual([...legais(t, 0).filter(a => a.t === 'choose_color').map(a => a.color)].sort(), ['B', 'G', 'R', 'U', 'W']);
  const a = { t: 'choose_color', p: 0, color: 'R' }, r = E.apply(t, a);
  assert.deepEqual([...T.describe(t, a, r.events, r.state)], ['A adicionou {R}']);
});
