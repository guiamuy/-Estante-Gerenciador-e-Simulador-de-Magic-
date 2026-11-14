// M-635 · Sentinela do Pauper (cobertura/pauper.json de 14/11/2026 13:47 UTC).
// Texto da API da Scryfall de 14/11/2026 (campo `texto` do relatório, guardado em .listas/oficiais-revisadas.json).
//   Blacksmith's Skill — "Target permanent gains hexproof and indestructible until end of turn. If it's an artifact creature, it gets +2/+2 until end of turn."
//   Talons of Wildwood — "Enchant creature / Enchanted creature gets +1/+1 and has trample. / {2}{G}: Return this card from your graveyard to your hand."
// Falha no motor anterior: as duas ficavam fora do app (manual).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, act, poe, legais, passaAte, limpaMao } from './listas.mjs';

const revisadas = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const de = n => ({ keywords: [], colors: [], cmc: 0, ...revisadas.find(x => x.name === n) });
const terreno = (n, c) => ({ name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${c}}.)`, colors: [] });
const C = { "Blacksmith's Skill": de("Blacksmith's Skill"), 'Talons of Wildwood': de('Talons of Wildwood'), Plains: terreno('Plains', 'W'), Forest: terreno('Forest', 'G'),
  'Grizzly Bears': { name: 'Grizzly Bears', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', power: '2', toughness: '2', colors: ['G'] },
  'Ornithopter': { name: 'Ornithopter', type_line: 'Artifact Creature — Thopter', mana_cost: '{0}', cmc: 0, keywords: ['Flying'], oracle_text: 'Flying', power: '0', toughness: '2', colors: [] },
  'Lightning Bolt': { name: 'Lightning Bolt', type_line: 'Instant', mana_cost: '{R}', cmc: 1, keywords: [], oracle_text: 'Lightning Bolt deals 3 damage to any target.', colors: ['R'] } };
const pt = (s, oid) => { const x = E.stats(s, s.objects[oid]); return [x.power, x.toughness]; };

for (const n of ["Blacksmith's Skill", 'Talons of Wildwood'])
  test(`M-635 · ${n} joga no app (texto oficial guardado, script à mão)`, () => {
    assert.ok(revisadas.find(x => x.name === n), 'texto oficial guardado');
    assert.ok(S.SCRIPTS[n], 'script à mão');
    assert.equal(S.coverage(C[n]).level, 'completo');
  });

function mesa(seed = 635) {
  const lista = [["Blacksmith's Skill", 4], ['Talons of Wildwood', 4], ['Grizzly Bears', 8], ['Ornithopter', 8], ['Lightning Bolt', 6], ['Plains', 15], ['Forest', 15]].map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'pauper', seed, mode: 'full', cards: C, players: [{ name: 'A', deck: lista }, { name: 'B', deck: lista }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  return limpaMao(limpaMao(s, 0), 1);
}
const fimDoTurno = s => passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);

function skill(alvoNome) {
  let s = mesa(), alvo, sk;
  [s] = poe(s, 0, 'Plains');
  [s, alvo] = poe(s, 0, alvoNome);
  [s, sk] = poe(s, 0, "Blacksmith's Skill", 'hand');
  const a = legais(s, 0, x => x.t === 'cast' && x.oid === sk && (x.targets || []).some(t => t.oid === alvo))[0];
  assert.ok(a, 'mira a permanente');
  s = passaAte(act(s, a), x => !x.stack.length || !!x.pending);
  return [s, alvo];
}

test("M-635 · Blacksmith's Skill: criatura artefato ganha hexproof, indestrutível e +2/+2; tudo acaba no fim do turno", () => {
  let [s, o] = skill('Ornithopter');
  assert.equal(E.hasKeyword(s, s.objects[o], 'hexproof'), true);
  assert.equal(E.hasKeyword(s, s.objects[o], 'indestructible'), true);
  assert.deepEqual(pt(s, o), [2, 4]);
  s = fimDoTurno(s);
  assert.deepEqual(pt(s, o), [0, 2]);
  assert.equal(E.hasKeyword(s, s.objects[o], 'hexproof'), false);
});

test("M-635 · Blacksmith's Skill: criatura que não é artefato ganha só as palavras, sem +2/+2", () => {
  const [s, u] = skill('Grizzly Bears');
  assert.equal(E.hasKeyword(s, s.objects[u], 'hexproof'), true);
  assert.equal(E.hasKeyword(s, s.objects[u], 'indestructible'), true);
  assert.deepEqual(pt(s, u), [2, 2]);
});

test("M-635 · Blacksmith's Skill mira qualquer permanente (também um terreno do oponente)", () => {
  let s = mesa(), t, sk;
  [s] = poe(s, 0, 'Plains');
  [s, t] = poe(s, 1, 'Forest');
  [s, sk] = poe(s, 0, "Blacksmith's Skill", 'hand');
  assert.ok(legais(s, 0, x => x.t === 'cast' && x.oid === sk && (x.targets || []).some(y => y.oid === t)).length, 'terreno é permanente');
});

test('M-635 · Talons of Wildwood: +1/+1 e atropelar; do cemitério, {2}{G} a devolve para a mão (só de lá)', () => {
  let s = mesa(), u, tal, raio;
  for (let i = 0; i < 5; i++) [s] = poe(s, 0, 'Forest');
  [s, u] = poe(s, 0, 'Grizzly Bears');
  [s, tal] = poe(s, 0, 'Talons of Wildwood', 'hand');
  const aura = legais(s, 0, x => x.t === 'cast' && x.oid === tal && (x.targets || []).some(t => t.oid === u))[0];
  assert.ok(aura);
  s = passaAte(act(s, aura), x => !x.stack.length || !!x.pending);
  assert.deepEqual(pt(s, u), [3, 3]);
  assert.equal(E.hasKeyword(s, s.objects[u], 'trample'), true);
  assert.equal(legais(s, 0, x => x.t === 'activate' && x.oid === tal).length, 0, 'no campo a habilidade não existe (113.6)');
  // outra cópia no cemitério: a habilidade funciona de lá
  let tal2; [s, tal2] = poe(s, 0, 'Talons of Wildwood', 'graveyard'); tal = tal2;
  [s, raio] = poe(s, 0, 'Lightning Bolt', 'graveyard');
  const volta = legais(s, 0, x => x.t === 'activate' && x.oid === tal && x.fromGraveyard)[0];
  assert.ok(volta, 'ativa do cemitério');
  s = passaAte(act(s, volta), x => !x.stack.length || !!x.pending);
  assert.equal(s.objects[tal].zone, 'hand');
  assert.equal(legais(s, 0, x => x.t === 'activate' && x.oid === raio).length, 0, 'mágica comum no cemitério não ganha nada');
});
