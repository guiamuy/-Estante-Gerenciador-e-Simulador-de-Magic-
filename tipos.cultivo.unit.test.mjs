// T-113 · CR5 · Aura que encanta artefato ou criatura, com bônus condicionado a "As long as enchanted permanent is a creature" (303.4, 611.3a)
// e canal (207.2c palavra de habilidade; custo de descartar a própria carta). Texto da regra: .regras/cr-2026-09-25.txt. Carta com o texto oficial de
// .listas/oficiais-tipos.json (Scryfall, consulta de 17/10/2026): Careful Cultivation. "Urso", "Cofre" (artefato que vira criatura até o fim do turno) e "Encanto" são cartas de teste.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S as SC, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const CC = 'Careful Cultivation';
const C = {};
for (const c of L('oficiais-tipos.json').filter(x => x.name === CC))
  C[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: ['Enchant', 'Channel'], oracle_text: c.oracle_text, colors: ['G'] };
C.Forest = { name: 'Forest', type_line: 'Basic Land — Forest', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {G}.)', colors: [] };
const carta = (name, type_line, extra = {}) => { C[name] = { name, type_line, mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra }; };
carta('Urso', 'Creature — Bear', { power: '2', toughness: '2' }); carta('Cofre', 'Artifact'); carta('Encanto', 'Enchantment'); carta('Aura Teste', 'Enchantment — Aura');
const EX = { example: { target: 'none', expect: { selfLife: 0 } } };
const SCRIPTS = {
  'Aura Teste': { name: 'Aura Teste', aura: { enchant: 'artifact-creature' }, grants: { seCriaturaT: true, activated: [{ cost: { mana: '{1}' }, effects: [{ do: 'gain', amount: 1 }] }] }, example: { action: 'aura', target: 'own-creature', expect: { stats: [2, 2] } } },
  'Cofre': { name: 'Cofre', abilities: [{ kind: 'activated', cost: { mana: '{1}' }, effects: [{ do: 'animate', target: 'self-source', becomes: { types: ['artifact', 'creature'], base: [2, 2], addTypes: true } }] }], example: { action: 'etb', target: 'none', expect: { attached: false } } },
};
function mesa(seed = 1) {
  const deck = [...Object.keys(C).filter(n => n !== 'Forest').map(name => ({ name, qty: 3, zone: 'main' })), { name: 'Forest', qty: 16, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p = 0, cores = { G: 1, C: 2 }) => { s = J(s); for (const [c, n] of Object.entries(cores)) s.players[p].pool[c] += n; return s; };
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending);
const conjuraEm = (s, oid) => { let o; [s, o] = poe(s, 0, CC, 'hand'); s = mana(s); const a = legais(s, 0, x => x.t === 'cast' && x.oid === o && (x.targets || []).some(t => t.oid === oid))[0]; assert.ok(a, 'conjurar em ' + s.objects[oid].name); return [resolve(act(s, a)), o]; };
const pt = (s, oid) => { const st = E.stats(s, s.objects[oid]); return [st.power, st.toughness]; };
const manaDe = (s, oid) => legais(s, s.objects[oid].controller, a => a.t === 'tap_mana' && a.oid === oid).map(a => a.color || (a.symbols || []).join(''));

test('CR 303.4 · Careful Cultivation (texto oficial): encanta artefato ou criatura — os alvos são as criaturas e os artefatos, não o resto', () => {
  let s = mesa(); let u, cf, en, o; [s, u] = poe(s, 0, 'Urso'); [s, cf] = poe(s, 1, 'Cofre'); [s, en] = poe(s, 0, 'Encanto'); [s, o] = poe(s, 0, CC, 'hand'); s = mana(s);
  const alvos = [...new Set(legais(s, 0, x => x.t === 'cast' && x.oid === o).flatMap(x => (x.targets || []).map(t => s.objects[t.oid].name)))].sort();
  eq(alvos, ['Cofre', 'Urso']);
});

test('CR 611.3a · na criatura: +1/+3, alcance e "{T}: Add {G}{G}" (com enjoo, a criatura não vira para mana)', () => {
  let s = mesa(); let u; [s, u] = poe(s, 0, 'Urso');
  [s] = conjuraEm(s, u);
  eq(pt(s, u), [3, 5]);
  assert.ok(E.hasKeyword(s, s.objects[u], 'reach'));
  assert.ok(E.productions(s, s.objects[u]).some(p => p.join('') === 'GG'), 'produz {G}{G}');
  let z = J(s); z.objects[u].sick = true;
  eq(legais(z, 0, a => a.t === 'tap_mana' && a.oid === u).length, 0, 'enjoo de invocação prende o {T}');
  const g = legais(s, 0, a => a.t === 'tap_mana' && a.oid === u)[0]; assert.ok(g, 'vira para mana');
  const d = act(s, g); eq(d.players[0].pool.G - s.players[0].pool.G, 2);
});

test('CR 611.3a · "As long as enchanted permanent is a creature": no artefato, nada; quando ele vira criatura, ganha tudo; quando deixa de ser, perde', () => {
  let s = mesa(); let cf; [s, cf] = poe(s, 0, 'Cofre');
  [s] = conjuraEm(s, cf);
  eq([E.hasKeyword(s, s.objects[cf], 'reach'), E.productions(s, s.objects[cf]).length], [false, 0], 'artefato não criatura: sem bônus');
  s = mana(s, 0, { C: 1 }); s = resolve(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === cf)[0]));
  eq(pt(s, cf), [3, 5]); assert.ok(E.hasKeyword(s, s.objects[cf], 'reach'));
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1');
  eq([E.hasKeyword(s, s.objects[cf], 'reach'), E.productions(s, s.objects[cf]).length], [false, 0], 'o efeito acabou: de novo só artefato');
});

test('CR 207.2c / 602.2 · canal — {1}{G}, descartar Careful Cultivation: cria um Humano Monge 1/1 verde com "{T}: Add {G}"; descartar é custo (ruling de 18/02/2022)', () => {
  let s = mesa(); let o; [s, o] = poe(s, 0, CC, 'hand'); s = mana(s, 0, { G: 1, C: 1 });
  const a = legais(s, 0, x => x.t === 'activate' && x.oid === o && x.fromHand)[0]; assert.ok(a, 'canal da mão');
  s = act(s, a); eq(s.objects[o].zone, 'graveyard', 'descartada ao ativar');
  s = resolve(s);
  const m = s.zones[0].battlefield.find(x => s.objects[x].token && /Monk/.test(E.linhaDeTipo(s, s.objects[x])));
  assert.ok(m, 'a ficha entrou');
  eq([pt(s, m), E.coresDe(s, s.objects[m]), /\bHuman\b/.test(E.linhaDeTipo(s, s.objects[m]))], [[1, 1], ['G'], true]);
  let z = J(s); z.objects[m].sick = false;
  assert.ok(legais(z, 0, x => x.oid === m && x.t === 'tap_mana').length, 'a ficha gera {G} por habilidade de mana');
  assert.ok(E.productions(z, z.objects[m]).some(p => p.join('') === 'G'), 'e entra no pagamento automático (605.1a; auditoria D1)');
  let w = mesa(); [w, o] = poe(w, 0, CC, 'hand'); w = mana(w, 0, { C: 2 });
  eq(legais(w, 0, x => x.t === 'activate' && x.oid === o).length, 0, 'sem {G}, sem canal');
});

test('CR 611.3a · auditoria D4 (T-118): a concessão condicionada vale também para as ativadas concedidas — no artefato que não é criatura, nenhuma', () => {
  let s = mesa(); let cf, a; [s, cf] = poe(s, 0, 'Cofre'); [s, a] = poe(s, 0, 'Aura Teste', 'hand'); s = mana(s);
  s = resolve(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === a && (x.targets || []).some(t => t.oid === cf))[0]));
  eq(E.legalActions(s, 0).filter(x => x.t === 'activate' && x.oid === cf).length, 1, 'só a do próprio Cofre');
});
