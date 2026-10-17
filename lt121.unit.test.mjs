// M-439 · LT105 · correções da revisão independente de M-432…M-438: (1) Searing Blaze com muitas criaturas de um lado — o par (oponente, criatura dele)
// continua oferecido (601.2c; o limite de alvos cortava antes do par); (2) a cópia (Twincast) com alvos novos confere o par contra o primeiro alvo DELA
// (707.10c); (3) "Sacrifice an artifact" numa fonte que é artefato (Throne of Geth, Krark-Clan Ironworks): ela mesma pode ser sacrificada. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const c0 = OF.find(x => x.name === 'Searing Blaze');
const C = { 'Searing Blaze': { name: c0.name, type_line: c0.type_line, mana_cost: c0.mana_cost, cmc: 2, keywords: [], oracle_text: c0.oracle_text, colors: ['R'] },
  Twincast: { name: 'Twincast', type_line: 'Instant', mana_cost: '{U}{U}', cmc: 2, keywords: [], oracle_text: 'Copy target instant or sorcery spell. You may choose new targets for the copy.', colors: ['U'] }, // script à mão (scripts.js)
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Mountain: { name: 'Mountain', type_line: 'Basic Land — Mountain', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {R}.)', colors: [] },
  Island: { name: 'Island', type_line: 'Basic Land — Island', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {U}.)', colors: [] } };
function mesa(seed = 48) {
  const b = ns => ns.map(name => ({ name, qty: name === 'Urso' ? 14 : 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b(['Searing Blaze', 'Twincast', 'Urso', 'Mountain', 'Island']) }, { name: 'B', deck: b(['Urso', 'Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}

test('LT105 · Searing Blaze com onze criaturas suas no campo (antes da do oponente): o par (oponente, criatura dele) é oferecido', () => {
  let s = mesa(), sb, ou; for (let i = 0; i < 11; i++) [s] = poe(s, 0, 'Urso'); [s, ou] = poe(s, 1, 'Urso'); [s, sb] = poe(s, 0, 'Searing Blaze', 'hand'); for (let i = 0; i < 2; i++) [s] = poe(s, 0, 'Mountain');
  const as = legais(s, 0, a => a.t === 'cast' && a.oid === sb);
  assert.ok(as.some(a => a.targets[0].player === 1 && a.targets[1].oid === ou), JSON.stringify(as.map(a => a.targets)));
});

test('LT105 · Twincast na Searing Blaze, escolhendo você como primeiro alvo da cópia: as suas criaturas são oferecidas (707.10c)', () => {
  let s = mesa(), sb, tw, meu, ou; [s, meu] = poe(s, 0, 'Urso'); [s, ou] = poe(s, 1, 'Urso'); [s, sb] = poe(s, 0, 'Searing Blaze', 'hand'); [s, tw] = poe(s, 0, 'Twincast', 'hand');
  for (let i = 0; i < 2; i++) { [s] = poe(s, 0, 'Mountain'); [s] = poe(s, 0, 'Island'); }
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === sb && a.targets[0].player === 1 && a.targets[1].oid === ou)[0]);
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === tw)[0]);
  for (let i = 0; i < 10 && !(s.pending && s.pending.kind === 'pick_target'); i++) s = s.pending && s.pending.kind !== 'priority' ? act(s, legais(s, s.pending.p).find(a => a.t === 'pay') || legais(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority });
  assert.equal(s.pending && s.pending.kind, 'pick_target', 'a cópia escolhe alvos novos');
  const l = legais(s, 0); const eu = l.find(a => (s.pending.options[a.index] || {}).player === 0); assert.ok(eu, 'você como primeiro alvo da cópia');
  s = act(s, eu); // a única criatura sua é escolhida sozinha (antes, nenhuma era oferecida e a cópia perdia a metade da criatura)
  const copia = s.stack.map(o => s.objects[o]).find(o => o.copiaDeMagia); assert.ok(copia, 'a cópia está na pilha');
  assert.equal(copia.targets[0].player, 0); assert.equal(copia.targets[1] && copia.targets[1].oid, meu, JSON.stringify(copia.targets));
});

test('LT105 · "Sacrifice an artifact" numa fonte artefato: ela mesma serve (Throne of Geth, Krark-Clan Ironworks)', () => {
  for (const [nome, tipo, txt] of [['Throne of Geth', 'Artifact', '{T}, Sacrifice an artifact: Proliferate.'], ['Krark-Clan Ironworks', 'Artifact', 'Sacrifice an artifact: Add {C}{C}.']]) {
    const r = S.leitura({ name: nome, type_line: tipo, mana_cost: '{2}', oracle_text: txt, keywords: [], colors: [] });
    assert.equal(r.script.abilities[0].cost.sacrificeOther.includeSelf, true, nome);
  }
  const r = S.leitura({ name: 'Teste', type_line: 'Enchantment', mana_cost: '{2}', oracle_text: 'Sacrifice an artifact: Draw a card.', keywords: [], colors: [] });
  assert.ok(!r.script.abilities[0].cost.sacrificeOther.includeSelf, 'encantamento não é artefato');
});
