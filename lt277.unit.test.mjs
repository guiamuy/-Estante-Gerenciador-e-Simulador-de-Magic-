// M-596 · leitor e núcleo, competitivos na ordem gulosa da sentinela (texto da Scryfall de 25/10/2026 em cobertura/resumo.json):
// Hexing Squelcher — "Ward—Pay 2 life." (o motor já lia da carta), "Spells you control can't be countered." (101.2: "can't" vence
// "can"; só mágica, não habilidade) e "Other creatures you control have "Ward—Pay 2 life."" (702.21, salvaguarda concedida). Cartas de
// teste com nomes inventados; a aprovação das cartas do catálogo é da homologacao. Falha no motor anterior (três frases sem leitura).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, act, poe, legais, passaAte, limpaMao } from './listas.mjs';
import { loadModules } from './_load.mjs';
const L = loadModules().leitor;
const C = {
  Goblin: { name: 'Goblin', mana_cost: '{1}{R}', cmc: 2, type_line: 'Creature — Goblin Sorcerer', oracle_text: 'This spell can\'t be countered.\nWard—Pay 2 life.\nSpells you control can\'t be countered.\nOther creatures you control have "Ward—Pay 2 life."', power: '2', toughness: '2', keywords: ['Ward'], colors: ['R'] },
  Urso: { name: 'Urso', mana_cost: '{1}{R}', cmc: 2, type_line: 'Creature — Bear', oracle_text: '', power: '2', toughness: '2', keywords: [], colors: ['R'] },
  Anula: { name: 'Anula', mana_cost: '{U}', cmc: 1, type_line: 'Instant', oracle_text: 'Counter target spell.', keywords: [], colors: ['U'] },
  Raio: { name: 'Raio', mana_cost: '{U}', cmc: 1, type_line: 'Instant', oracle_text: 'Raio deals 3 damage to any target.', keywords: [], colors: ['U'] },
  Mountain: { name: 'Mountain', type_line: 'Basic Land — Mountain', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {R}.)', colors: [] },
  Island: { name: 'Island', type_line: 'Basic Land — Island', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {U}.)', colors: [] },
};
const ex = { example: { target: 'none', expect: { selfLife: 0 } } };
const r0 = L.ler(C.Goblin);
const SC = { Goblin: { ...r0.script, ...ex }, Urso: { name: 'Urso', ...ex }, Anula: { name: 'Anula', effects: [{ do: 'counter', target: 'spell' }], ...ex }, Raio: { name: 'Raio', effects: [{ do: 'damage', amount: 3, target: 'any' }], ...ex } };
function mesa(seed = 277) {
  const d = xs => xs.map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SC, first: 0, players: [{ name: 'A', deck: d([['Goblin', 2], ['Urso', 4], ['Mountain', 34]]) }, { name: 'B', deck: d([['Anula', 4], ['Raio', 4], ['Island', 32]]) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  s = limpaMao(s, 0); let g, u, an, ra; [s, g] = poe(s, 0, 'Goblin'); [s, u] = poe(s, 0, 'Urso', 'hand'); for (let i = 0; i < 2; i++) [s] = poe(s, 0, 'Mountain');
  [s, an] = poe(s, 1, 'Anula', 'hand'); [s, ra] = poe(s, 1, 'Raio', 'hand'); for (let i = 0; i < 2; i++) [s] = poe(s, 1, 'Island');
  return { s, g, u, an, ra };
}
function conjura(s, p, oid, alvo) {
  const of = legais(s, p, x => x.t === 'cast' && x.oid === oid); const a = of.find(x => JSON.stringify(x).includes(`"${alvo}"`)) || of[0];
  assert.ok(a, 'há como conjurar'); s = act(s, a);
  for (let i = 0; i < 6 && s.pending && s.pending.p === p && s.pending.kind !== 'ward'; i++) { const o = legais(s, p).find(x => JSON.stringify(x).includes(`"${alvo}"`)); if (!o) break; s = act(s, o); }
  return s;
}

test('M-596 · leitura: as quatro frases', () => {
  assert.ok(r0 && r0.completa, 'lida por inteiro');
  assert.equal(JSON.stringify(r0.script.self), JSON.stringify({ naoAnulavel: true, magiasNaoAnulaveis: true }));
  assert.equal(JSON.stringify(r0.script.continuo), JSON.stringify([{ afetados: { tipos: ['creature'], de: 'you', outra: true }, ward: { pagarVida: 2 } }]));
  assert.equal(loadModules().scripts.validateScript(SC.Goblin).length, 0);
});

test('M-596 · 101.2: com o Goblin no campo, a mágica de A não pode ser anulada', () => {
  let { s, u, an } = mesa();
  s = conjura(s, 0, u, u); s = act(s, { t: 'pass', p: 0 });
  s = conjura(s, 1, an, u); s = act(s, { t: 'pass', p: 1 });
  for (let i = 0; i < 20 && (s.stack.length || s.pending); i++) s = s.pending ? act(s, legais(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority });
  assert.equal(s.objects[an].zone, 'graveyard', 'a Anula resolveu'); assert.equal(s.objects[u].zone, 'battlefield', 'o Urso entrou mesmo assim');
});

test('M-596 · 702.21: o Urso ganha "Ward—Pay 2 life"; o Goblin tem a sua; quem mira paga 2 de vida ou a mágica é anulada', () => {
  for (const [quem, paga] of [['u', true], ['u', false], ['g', true]]) {
    let st = mesa(); let s = st.s; if (quem === 'u') { [s] = [s]; let x; [s, x] = poe(s, 0, 'Urso'); st.u = x; }
    const alvo = st[quem]; s = act(s, { t: 'pass', p: 0 });
    s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
    const vidaB = s.players[1].life; s = conjura(s, 1, st.ra, alvo);
    for (let i = 0; i < 30 && (s.stack.length || s.pending); i++) {
      if (s.pending) { const op = legais(s, s.pending.p); const salv = s.pending.kind === 'may_pay' && /salvaguarda/.test(s.pending.name || ''); if (salv) assert.equal(s.pending.extra.pagarVida, 2, 'a salvaguarda cobra 2 de vida'); s = act(s, salv ? op.find(x => x.t === (paga ? 'pay' : 'decline')) : op[0]); }
      else s = act(s, { t: 'pass', p: s.turn.priority });
    }
    if (paga) { assert.equal(s.players[1].life, vidaB - 2, `${quem}: B pagou 2 de vida`); assert.notEqual(s.objects[alvo].zone, 'battlefield', `${quem}: o Raio resolveu`); }
    else { assert.equal(s.players[1].life, vidaB, `${quem}: B não pagou`); assert.equal(s.objects[alvo].zone, 'battlefield', `${quem}: o Raio foi anulado`); }
  }
});
