// M-463 · LT129 · Apostle's Blessing ("Target artifact or creature you control gains protection from artifacts or from the color of your choice until
// end of turn."). Texto da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json), caminho de produção (APROVADAS). Pedido da trilha `listas`.
// A escolha de cor na resolução ganha a opção "Artefatos" (qualidade 'tipo:artifact', K-17); alvo "artifact or creature you control". Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const c0 = OF.find(x => x.name === "Apostle's Blessing");
const C = { "Apostle's Blessing": { name: c0.name, type_line: c0.type_line, mana_cost: c0.mana_cost, cmc: 2, keywords: [], oracle_text: c0.oracle_text, colors: ['W'] },
  'Lightning Bolt': { name: 'Lightning Bolt', type_line: 'Instant', mana_cost: '{R}', cmc: 1, keywords: [], oracle_text: 'Lightning Bolt deals 3 damage to any target.', colors: ['R'] },
  Golem: { name: 'Golem', type_line: 'Artifact Creature — Golem', mana_cost: '{3}', cmc: 3, keywords: [], oracle_text: '', colors: [], power: '3', toughness: '3' },
  Pedra: { name: 'Pedra', type_line: 'Artifact', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [] },
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Plains: { name: 'Plains', type_line: 'Basic Land — Plains', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {W}.)', colors: [] },
  Mountain: { name: 'Mountain', type_line: 'Basic Land — Mountain', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {R}.)', colors: [] } };
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: 6, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 107, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b(["Apostle's Blessing", 'Golem', 'Pedra', 'Plains']) }, { name: 'B', deck: b(['Lightning Bolt', 'Golem', 'Urso', 'Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolveAte = s => passaAte(s, x => !x.stack.length || !!x.pending, 40);
function cena() { let s = mesa(), ab, g, pe, u, go; [s, ab] = poe(s, 0, "Apostle's Blessing", 'hand'); [s, g] = poe(s, 0, 'Golem'); [s, pe] = poe(s, 0, 'Pedra'); [s, u] = poe(s, 1, 'Urso'); [s, go] = poe(s, 1, 'Golem'); for (let i = 0; i < 2; i++) [s] = poe(s, 0, 'Plains'); return { s, ab, g, pe, u, go }; }

test("LT129 · Apostle's Blessing joga pelo leitor aprovado", () => {
  assert.equal(S.coverage(C["Apostle's Blessing"]).level, 'completo'); assert.equal(S.APROVADAS["Apostle's Blessing"].leva, 'M-463');
});

test('LT129 · alvo: artefato ou criatura sua (o Golem, a Pedra); a criatura do oponente não', () => {
  const { s, ab, g, pe, u, go } = cena(); const al = legais(s, 0, a => a.t === 'cast' && a.oid === ab).map(a => a.targets[0].oid);
  assert.ok(al.includes(g) && al.includes(pe)); assert.ok(!al.includes(u) && !al.includes(go));
});

test('LT129 · "Artefatos" na escolha: o Golem fica com proteção contra artefatos — o Golem do oponente não o bloqueia', () => {
  let { s, ab, g, go } = cena();
  s = resolveAte(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === ab && a.targets[0].oid === g)[0]));
  assert.equal(s.pending && s.pending.kind, 'choose_color');
  const op = legais(s, 0, a => a.t === 'choose_color').map(a => a.color); assert.deepEqual([...op].sort(), ['B', 'G', 'R', 'U', 'W', 'artefatos'].sort());
  s = passaAte(act(s, { t: 'choose_color', p: 0, color: 'artefatos' }), x => !x.stack.length && !x.pending, 40);
  assert.ok((s.objects[g].tempProtection || []).includes('tipo:artifact'));
  assert.equal(E.canBlock ? E.canBlock(s, go, g) : !E.porQueNaoBloqueia(s, go, g), false);
});

test('LT129 · escolhendo vermelho: o Bolt do oponente não mira o Golem (mira o Urso e os jogadores)', () => {
  let { s, ab, g, u } = cena(), lb;
  s = resolveAte(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === ab && a.targets[0].oid === g)[0]));
  s = passaAte(act(s, { t: 'choose_color', p: 0, color: 'R' }), x => !x.stack.length && !x.pending, 40);
  [s, lb] = poe(s, 1, 'Lightning Bolt', 'hand'); [s] = poe(s, 1, 'Mountain'); s = act(s, { t: 'pass', p: 0 });
  const al = legais(s, 1, a => a.t === 'cast' && a.oid === lb).map(a => a.targets[0]);
  assert.ok(al.some(t => t.oid === u) && al.some(t => t.player === 0)); assert.ok(!al.some(t => t.oid === g));
});
