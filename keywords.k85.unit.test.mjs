// K-85 · CR 613.1f / 611.2a · "This Saga gains '<habilidade>'": a própria permanente ganha a habilidade enquanto estiver no campo
// (sem duração escrita). Primeiro pedaço da Urza's Saga (448 listas competitivas; texto da Scryfall pelo ramo catalogo de 31/10/2026
// em .listas/oficiais-keywords.json): o capítulo I passa a ser lido; o II espera a ficha Construct e o III a busca por custo exato (K-86).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, J, act, poe, legais, passaAte } from './listas.mjs';
import { loadModules } from './_load.mjs';
const { leitor: L } = loadModules();
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-keywords.json', import.meta.url), 'utf8')).cartas;
const of = n => { const c = OF.find(x => x.name === n); assert.ok(c, 'sem texto oficial: ' + n); return { name: n, type_line: c.type_line, mana_cost: c.mana_cost || '', cmc: 0, keywords: c.keywords || [], oracle_text: c.oracle_text, colors: [] }; };

test("K-85 · Urza's Saga: o capítulo I vira a mana ganha; II e III ainda sem leitura (K-86)", () => {
  const r = L.ler(of("Urza's Saga"));
  const cap1 = J((r.script.abilities || []).find(a => a.when === 'chapter' && a.chapters[0] === 1));
  assert.deepEqual(cap1 && cap1.effects, [{ do: 'ganha_hab_k', target: 'self-source', produz: [['C']] }]);
  assert.equal(r.frases.filter(f => !f.lida && /^(II|III) — /.test(f.texto)).length, 2);
});

const SAGA = { name: 'Saga de Teste', type_line: 'Enchantment — Saga', mana_cost: '{1}', cmc: 1, keywords: [], colors: [],
  oracle_text: '(As this Saga enters and after your draw step, add a lore counter. Sacrifice after III.)\nI — This Saga gains "{T}: Add {C}."\nII — This Saga gains "{1}, {T}: You gain 2 life."\nIII — Draw a card.' };
const TERRA = { name: 'Wastes', type_line: 'Basic Land', mana_cost: '', cmc: 0, keywords: [], oracle_text: '{T}: Add {C}.', colors: [] };

test('K-85 · a leitura monta a habilidade ativada ganha e passa no validador', () => {
  const r = L.ler(SAGA); assert.ok(r.completa, 'lida por inteiro');
  const cap2 = J(r.script.abilities.find(a => a.when === 'chapter' && a.chapters[0] === 2));
  assert.deepEqual(cap2.effects, [{ do: 'ganha_hab_k', target: 'self-source', habilidade: { kind: 'activated', cost: { mana: '{1}', tap: true }, effects: [{ do: 'gain', amount: 2 }] } }]);
  assert.deepEqual(J(S.validateScript({ ...r.script, example: { action: 'etb', target: 'none', expect: { attached: false } } })), []);
  assert.ok(S.validateScript({ name: 'X', abilities: [{ kind: 'triggered', when: 'etb', effects: [{ do: 'ganha_hab_k', target: 'self-source', produz: [['Q']] }] }], example: { action: 'etb', target: 'none', expect: { attached: false } } }).length, 'mana desconhecida');
});

test('K-85 · na partida: depois do I a Saga gera {C}; depois do II ganha a ativada; fora do campo, nada sobra (400.7)', () => {
  const C = { 'Saga de Teste': SAGA, Wastes: TERRA };
  const scripts = { 'Saga de Teste': { ...L.ler(SAGA).script, example: { action: 'etb', target: 'none', expect: { attached: false } } } };
  const b = ns => ns.map(name => ({ name, qty: 10, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 85, mode: 'full', cards: C, scripts, first: 0, players: [{ name: 'A', deck: b(['Saga de Teste', 'Wastes']) }, { name: 'B', deck: b(['Wastes']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  let sg; [s, sg] = poe(s, 0, 'Saga de Teste', 'hand'); [s] = poe(s, 0, 'Wastes');
  assert.equal(E.productions(s, s.objects[sg] || {}).length || 0, 0);
  s = passaAte(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === sg)[0]), x => !x.stack.length && !x.pending && !(x.queued || []).length);
  assert.deepEqual(J(E.productions(s, s.objects[sg])), [['C']], 'capítulo I: {T}: Add {C}');
  assert.ok(legais(s, 0, x => x.t === 'tap_mana' && x.oid === sg).length, 'a mesa oferece a mana');
  const t = s.turn.number; s = passaAte(s, x => x.turn.number > t + 1 && x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending && !(x.queued || []).length, 900);
  assert.equal(s.objects[sg].counters.lore, 2); [s] = poe(s, 0, 'Wastes');
  const vida = s.players[0].life; const a = legais(s, 0, x => x.t === 'activate' && x.oid === sg); assert.ok(a.length, 'capítulo II: a ativada ganha');
  s = passaAte(act(s, a[0]), x => !x.stack.length && !x.pending); assert.equal(s.players[0].life, vida + 2);
  const z = J(s); E.moveObject(z, sg, 'hand'); E.moveObject(z, sg, 'battlefield');
  assert.equal(E.productions(z, z.objects[sg]).length, 0, 'o objeto novo não tem a mana ganha'); assert.equal(legais(z, 0, x => x.t === 'activate' && x.oid === sg).length, 0);
});
