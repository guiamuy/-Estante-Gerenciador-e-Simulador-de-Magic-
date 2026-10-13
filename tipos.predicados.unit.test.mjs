// T-59 · CR5 · Predicados de tipo: histórico (700.6), grupo (700.8), permanente modificada (700.9) e fora da lei (700.12).
// Texto da regra: .regras/cr-2026-09-25.txt. Cartas "de teste": scripts sintéticos que isolam a regra (seletor `historico`,
// `foraDaLei`, `modificada` e a contagem `party`).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, S as SC, T, J, act, poe, legais, passaAte } from './listas.mjs';

const C = {};
const carta = (name, type_line, extra = {}) => { C[name] = { name, type_line, mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra }; };
C.Plains = { name: 'Plains', type_line: 'Basic Land — Plains', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {W}.)', colors: [] };
const EX = { example: { target: 'none', expect: { selfLife: 0 } } };
const SCRIPTS = {
  'Mira Historica': { name: 'Mira Historica', effects: [{ do: 'destroy', target: { permanente: true, historico: true } }], ...EX }, // "Destroy target historic permanent."
  'Mira Fora da Lei': { name: 'Mira Fora da Lei', effects: [{ do: 'destroy', target: { tipos: ['creature'], foraDaLei: true } }], ...EX }, // "Destroy target outlaw creature."
  'Mira Modificada': { name: 'Mira Modificada', effects: [{ do: 'destroy', target: { tipos: ['creature'], modificada: true } }], ...EX }, // "Destroy target modified creature."
  'Festa': { name: 'Festa', effects: [{ do: 'gain', amount: { per: 'party' } }], ...EX }, // "You gain life equal to the number of creatures in your party."
  'Marca': { name: 'Marca', effects: [{ do: 'counters', amount: 1, target: 'creature' }], ...EX },
  'Bencao': { name: 'Bencao', aura: { enchant: 'creature' }, grants: { power: 1, toughness: 1 }, ...EX },
  'Lamina': { name: 'Lamina', equip: { mana: '{1}' }, grants: { power: 1, toughness: 0 }, ...EX },
};
for (const n of ['Mira Historica', 'Mira Fora da Lei', 'Mira Modificada', 'Festa', 'Marca']) carta(n, 'Instant');
carta('Bencao', 'Enchantment — Aura'); carta('Lamina', 'Artifact — Equipment');
carta('Urso', 'Creature — Bear', { power: '2', toughness: '2' });
carta('Rei', 'Legendary Creature — Human Noble', { power: '2', toughness: '2' });
carta('Engenho', 'Artifact');
carta('Cronica', 'Enchantment — Saga');
carta('Ladino', 'Creature — Human Rogue', { power: '1', toughness: '1' });
carta('Pirata', 'Creature — Orc Pirate', { power: '2', toughness: '1' });
carta('Mutante', 'Creature — Shapeshifter', { power: '1', toughness: '1', keywords: ['Changeling'] });
carta('Clerigo', 'Creature — Human Cleric', { power: '1', toughness: '1' });
carta('Ladino Mago', 'Creature — Human Rogue Wizard', { power: '1', toughness: '1' });
carta('Guerreiro', 'Creature — Human Warrior', { power: '2', toughness: '2' });

const TODAS = Object.keys(C).filter(n => n !== 'Plains');
function mesa(seed = 1) {
  const deck = [...TODAS.map(name => ({ name, qty: name === 'Urso' ? 6 : 2, zone: 'main' })), { name: 'Plains', qty: 20, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p = 0, n = 9) => { s = J(s); for (const c of 'WUBRGC') s.players[p].pool[c] += n; return s; };
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const esvazia = s => { for (let i = 0; i < 30; i++) { s = passaAte(s, x => !x.stack.length || !!x.pending); if (!s.pending) return s; const os = legais(s, s.pending.p); if (!os.length) return s; s = act(s, os.find(a => a.t === 'pick') || os[0]); } return s; };
const alvosDe = (s, nome) => { let m; [s, m] = poe(s, 0, nome, 'hand'); s = mana(s); return legais(s, 0, a => a.t === 'cast' && a.oid === m).map(a => s.objects[a.targets[0].oid].name).sort(); };

test('CR 700.6 · histórico: lendário, artefato ou Saga — o Urso não é', () => {
  let s = mesa(); for (const n of ['Urso', 'Rei', 'Engenho', 'Cronica']) [s] = poe(s, 1, n, 'battlefield');
  eq(alvosDe(s, 'Mira Historica'), ['Cronica', 'Engenho', 'Rei']);
});

test('CR 700.12 · fora da lei: Assassino, Mercenário, Pirata, Ladino ou Bruxo (metamorfo conta); o Urso e o Clérigo não', () => {
  let s = mesa(); for (const n of ['Urso', 'Ladino', 'Pirata', 'Mutante', 'Clerigo']) [s] = poe(s, 1, n, 'battlefield');
  eq(alvosDe(s, 'Mira Fora da Lei'), ['Ladino', 'Mutante', 'Pirata']);
});

test('CR 700.9 · modificada: com marcador, equipada, ou encantada por uma Aura de quem a controla — a Aura do oponente não conta', () => {
  let s = mesa(); let u1, u2, u3, u4, u5; [s, u1] = poe(s, 1, 'Urso', 'battlefield'); [s, u2] = poe(s, 1, 'Urso', 'battlefield'); [s, u3] = poe(s, 1, 'Urso', 'battlefield'); [s, u4] = poe(s, 1, 'Urso', 'battlefield'); [s, u5] = poe(s, 1, 'Urso', 'battlefield');
  s = J(s); s.objects[u1].counters = { p1p1: 1 };
  let l; [s, l] = poe(s, 1, 'Lamina', 'battlefield'); s.objects[l].attachedTo = u2;
  let b1; [s, b1] = poe(s, 1, 'Bencao', 'battlefield'); s.objects[b1].attachedTo = u3; // Aura do controlador do Urso
  let b2; [s, b2] = poe(s, 0, 'Bencao', 'battlefield'); s.objects[b2].attachedTo = u4; // Aura do oponente
  let m; [s, m] = poe(s, 0, 'Mira Modificada', 'hand'); s = mana(s);
  const alvos = legais(s, 0, a => a.t === 'cast' && a.oid === m).map(a => a.targets[0].oid).sort();
  eq(alvos, [u1, u2, u3].sort());
});

test('CR 700.8 / 700.8b · o grupo conta até um Clérigo, um Ladino, um Guerreiro e um Mago, e quem tem dois tipos conta uma vez só, do jeito que dá mais', () => {
  let s = mesa(); for (const n of ['Ladino', 'Ladino Mago', 'Clerigo']) [s] = poe(s, 0, n, 'battlefield');
  const vida = s.players[0].life; let f; [s, f] = poe(s, 0, 'Festa', 'hand'); s = mana(s);
  s = esvazia(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === f)[0]));
  eq(s.players[0].life - vida, 3, 'Ladino (Ladino), Ladino Mago (Mago), Clérigo');
  [s] = poe(s, 0, 'Mutante', 'battlefield'); // metamorfo é Guerreiro
  const v2 = s.players[0].life; [s, f] = poe(s, 0, 'Festa', 'hand'); s = mana(s);
  s = esvazia(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === f)[0]));
  eq(s.players[0].life - v2, 4, 'grupo completo (700.8c)');
});

test('CR 700.8a · o grupo é só de quem controla: as criaturas do oponente não contam', () => {
  let s = mesa(); for (const n of ['Clerigo', 'Guerreiro']) [s] = poe(s, 1, n, 'battlefield');
  [s] = poe(s, 0, 'Ladino', 'battlefield');
  const vida = s.players[0].life; let f; [s, f] = poe(s, 0, 'Festa', 'hand'); s = mana(s);
  s = esvazia(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === f)[0]));
  eq(s.players[0].life - vida, 1);
});

test('Validador e frases · as chaves novas do seletor e a contagem do grupo', () => {
  for (const n of ['Mira Historica', 'Mira Fora da Lei', 'Mira Modificada', 'Festa']) eq(SC.validateScript(SCRIPTS[n]), [], n);
  assert.match(T.descreveEfeitos(SCRIPTS['Mira Historica'].effects), /histórica/);
  assert.match(T.descreveEfeitos(SCRIPTS['Mira Fora da Lei'].effects), /fora da lei/);
  assert.match(T.descreveEfeitos(SCRIPTS['Festa'].effects), /grupo/);
});

test('CR 700.6 · "whenever you cast a historic spell": o gatilho dispara com o artefato e o lendário, não com o Urso', () => {
  const sc = { ...SCRIPTS, 'Cronista': { name: 'Cronista', abilities: [{ kind: 'triggered', when: 'other-cast', filter: { historico: true }, effects: [{ do: 'gain', amount: 1 }] }], ...EX } };
  C.Cronista = { name: 'Cronista', type_line: 'Creature — Human Wizard', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], power: '1', toughness: '1' };
  const deck = [...['Urso', 'Rei', 'Engenho', 'Cronista'].map(name => ({ name, qty: 4, zone: 'main' })), { name: 'Plains', qty: 20, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed: 2, mode: 'full', cards: C, scripts: sc, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  [s] = poe(s, 0, 'Cronista', 'battlefield');
  const conjura = (s, n) => { let o; [s, o] = poe(s, 0, n, 'hand'); s = mana(s); return esvazia(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === o)[0])); };
  const v0 = s.players[0].life; s = conjura(s, 'Urso'); const v1 = s.players[0].life; s = conjura(s, 'Engenho'); const v2 = s.players[0].life; s = conjura(s, 'Rei');
  eq([v1 - v0, v2 - v1, s.players[0].life - v2], [0, 1, 1]);
});
