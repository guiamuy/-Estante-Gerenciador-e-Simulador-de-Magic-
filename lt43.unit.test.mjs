// M-360 · 122.1 / 602.1 / 605.1a · custo "Put a -0/-1 counter on ~" e o marcador −0/−1 na resistência (613.4c) — Wall of Roots (texto do Oracle do
// Forge em .listas/oficiais-listas.json, consulta de 12/10/2026, trilha listas): "Defender\nPut a -0/-1 counter on Wall of Roots: Add {G}. Activate only
// once each turn." 0/5. O leitor lê a linha; o script de verdade (M a Z) é da trilha listas. Todos os testes falham no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, CARTAS } from './cmd.mjs';
import { loadModules } from './_load.mjs';
const { leitor: L, scripts: S } = loadModules();

const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-listas.json', import.meta.url), 'utf8'));
const acha = (o, n) => { if (Array.isArray(o)) { for (const v of o) { const r = acha(v, n); if (r) return r; } } else if (o && typeof o === 'object') { if (o.name === n) return o; for (const v of Object.values(o)) { const r = acha(v, n); if (r) return r; } } return null; };
const wr = acha(OF, 'Wall of Roots');
const carta = { name: wr.name, type_line: wr.type_line, mana_cost: wr.mana_cost, cmc: 2, keywords: ['Defender'], oracle_text: wr.oracle_text, colors: ['G'], power: String(wr.power ?? 0), toughness: String(wr.toughness ?? 5) };
const lido = L.ler(carta);
const scripts = { 'Wall of Roots': { ...lido.script, example: { action: 'etb', target: 'none', expect: { attached: false } } } };
function mesaW(seed = 47) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: { ...CARTAS, 'Wall of Roots': carta }, scripts, first: 0, players: [{ name: 'A', deck: baralho(['Wall of Roots', 'Forest']) }, { name: 'B', deck: baralho(['Plains', 'Island']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  let w; [s, w] = poe(s, 0, 'Wall of Roots', 'battlefield', { sick: true }); return [s, w];
}
const ativa = (s, w, p = 0) => legais(s, p, a => a.t === 'activate' && a.oid === w);
const res = (s, w) => E.stats(s, s.objects[w]).toughness;

test('M-360 · leitor: "Put a -0/-1 counter on ~: Add {G}. Activate only once each turn." vira ativada de mana com o custo de marcador', () => {
  assert.equal(lido.completa, true, JSON.stringify(lido.frases));
  assert.deepEqual(JSON.parse(JSON.stringify(lido.script.abilities)), [{ kind: 'activated', cost: { poeMarcador: { tipo: 'm0m1', n: 1 } }, oncePerTurn: true, effects: [{ do: 'add_mana', symbols: ['G'] }] }]);
  assert.deepEqual([...S.validateScript(scripts['Wall of Roots'])], []);
  assert.ok(S.validateScript({ name: 'X', abilities: [{ kind: 'activated', cost: { poeMarcador: { tipo: 'lore' } }, effects: [{ do: 'draw', amount: 1 }] }], example: { action: 'etb', target: 'none', expect: { attached: false } } }).some(e => /marcador/.test(e)));
});

test('M-360 · 605.1a / 302.6: com enjoo, sem pilha — põe o marcador, dá {G} na hora e a resistência cai para 4; uma vez por turno', () => {
  let [s, w] = mesaW();
  const ofs = ativa(s, w); assert.equal(ofs.length, 1, 'sem {T} no custo, o enjoo não impede');
  const g0 = s.players[0].pool.G || 0;
  let t = act(s, ofs[0]);
  assert.equal(t.stack.length, 0, 'habilidade de mana não usa a pilha');
  assert.equal(t.players[0].pool.G, g0 + 1);
  assert.equal(t.objects[w].counters.m0m1, 1); assert.equal(res(t, w), 4); assert.equal(E.stats(t, t.objects[w]).power, 0);
  assert.equal(ativa(t, w).length, 0, 'uma vez por turno');
  assert.throws(() => E.apply(t, ofs[0]), /uma vez por turno/);
});

test('M-360 · no turno do oponente também (habilidade de mana); com cinco marcadores a resistência chega a 0 e ela morre (704.5f)', () => {
  let [s, w] = mesaW();
  s = J(s); s.objects[w].counters.m0m1 = 4;
  assert.equal(res(s, w), 1);
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  assert.equal(ativa(s, w, 0).length, 0, 'sem prioridade, não ativa');
  s = act(s, { t: 'pass', p: 1 });
  const ofs = ativa(s, w, 0); assert.equal(ofs.length, 1, 'no turno do oponente, com prioridade');
  let t = act(s, ofs[0]);
  assert.equal(t.objects[w].zone, 'graveyard', 'resistência 0: ação de estado');
});
