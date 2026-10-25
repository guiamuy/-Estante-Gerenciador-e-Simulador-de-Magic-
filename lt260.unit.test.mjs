// M-579 · leitor, classe "anulação" (plano de 24/10: competitivos primeiro, ordem gulosa). Duas frases de texto Oracle:
// "This spell can't be countered." (701.6a: anular tira a mágica da pilha; a que não pode ser anulada continua lá — e continua alvo legal)
// e "Your opponents can't cast spells this turn." como efeito de mágica (o mesmo efeito do Mandate of Peace, T-92). Cartas do catálogo que
// passam a ser lidas por inteiro: Abrupt Decay, Supreme Verdict, Dovin's Veto, Carnage Tyrant, Dragonlord Dromoka, Void Rend, Volcanic Fallout,
// Silence (a aprovação, com o texto da Scryfall, é da conversa homologacao). Cartas de teste com nomes inventados. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, S, act, poe, legais, passaAte, limpaMao } from './listas.mjs';
import { loadModules } from './_load.mjs';
const L = loadModules().leitor;
const C = {
  Veto: { name: 'Veto', mana_cost: '{U}{U}', cmc: 2, type_line: 'Instant', oracle_text: "This spell can't be countered.\nCounter target noncreature spell.", keywords: [], colors: ['U'] },
  Silencio: { name: 'Silencio', mana_cost: '{W}', cmc: 1, type_line: 'Instant', oracle_text: "Your opponents can't cast spells this turn. (Spells cast before this resolves are unaffected.)", keywords: [], colors: ['W'] },
  Tirano: { name: 'Tirano', mana_cost: '{U}', cmc: 1, type_line: 'Creature — Dinosaur', oracle_text: "This spell can't be countered.\nTrample, hexproof", keywords: ['Trample', 'Hexproof'], power: '7', toughness: '6', colors: ['G'] },
  Ira: { name: 'Ira', mana_cost: '{U}', cmc: 1, type_line: 'Sorcery', oracle_text: "This spell can't be countered.\nDestroy all creatures.", keywords: [], colors: ['W'] },
  Urso: { name: 'Urso', mana_cost: '{U}', cmc: 1, type_line: 'Creature — Bear', oracle_text: '', keywords: [], power: '2', toughness: '2', colors: ['G'] },
  Anula: { name: 'Anula', mana_cost: '{U}', cmc: 1, type_line: 'Instant', oracle_text: 'Counter target spell.', keywords: [], colors: ['U'] },
  Raio: { name: 'Raio', mana_cost: '{U}', cmc: 1, type_line: 'Instant', oracle_text: 'Raio deals 3 damage to any target.', keywords: [], colors: ['U'] },
  Island: { name: 'Island', type_line: 'Basic Land — Island', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {U}.)', colors: [] },
  Plains: { name: 'Plains', type_line: 'Basic Land — Plains', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {W}.)', colors: [] },
};
const lido = n => { const r = L.ler(C[n]); assert.ok(r && r.completa, `${n} lida por inteiro`); return r.script; };
// a partida só usa script injetado que passa no validador, que pede um cenário; o cenário não muda o que a carta faz
const jogavel = sc => Object.fromEntries(Object.entries(sc).map(([k, v]) => [k, { ...v, example: { target: 'none', expect: { selfLife: 0 } } }]));
const SC = { Veto: lido('Veto'), Ira: lido('Ira'), Silencio: lido('Silencio'), Tirano: lido('Tirano'), Anula: { name: 'Anula', effects: [{ do: 'counter', target: 'spell' }] }, Raio: { name: 'Raio', effects: [{ do: 'damage', amount: 3, target: 'any' }] } };
assert.ok(Object.values(jogavel(SC)).every(sc => !S.validateScript(sc).length), 'os scripts lidos passam no validador da partida');
function mesa(a, b, seed = 260) {
  const d = xs => xs.map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: jogavel(SC), first: 0, players: [{ name: 'A', deck: d(a) }, { name: 'B', deck: d(b) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  return limpaMao(s, 0);
}
const resolve = s => { for (let i = 0; i < 60 && (s.stack.length || s.pending); i++) { const pd = s.pending; s = pd ? act(s, legais(s, pd.p)[0]) : act(s, { t: 'pass', p: s.turn.priority }); } return s; };
// A conjura `oid`; B responde com Anula mirando-a (o alvo de "counter target spell" é escolhido numa decisão); tudo resolve
function anulaEm(s, oid, anula) {
  s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === oid)[0]); s = act(s, { t: 'pass', p: 0 });
  assert.equal(s.turn.priority, 1);
  const c = legais(s, 1, x => x.t === 'cast' && x.oid === anula && (!x.targets || x.targets.some(y => y.oid === oid)));
  assert.ok(c.length, 'B pode conjurar a anulação'); s = act(s, c[0]);
  for (let i = 0; i < 5 && s.pending && s.pending.p === 1; i++) { const o = legais(s, 1, x => JSON.stringify(x).includes(`"${oid}"`)); assert.ok(o.length, 'a mágica que não pode ser anulada continua alvo legal'); s = act(s, o[0]); }
  assert.ok(s.stack.length >= 2, 'a anulação está na pilha sobre a mágica');
  return resolve(s);
}

test('M-579 · leitura: "This spell can\'t be countered" vira self.naoAnulavel (mágica e permanente); "Your opponents can\'t cast spells this turn" vira efeito', () => {
  assert.equal(JSON.stringify(SC.Veto), JSON.stringify({ name: 'Veto', effects: [{ do: 'counter', target: 'noncreature-spell' }], self: { naoAnulavel: true } }));
  assert.equal(JSON.stringify(SC.Tirano.self), JSON.stringify({ naoAnulavel: true }));
  assert.equal(JSON.stringify(SC.Silencio.effects), JSON.stringify([{ do: 'oponentes_nao_conjuram' }]));
  assert.equal(S.coverage(C.Veto).level, 'lida', 'lida, a aprovação é da homologacao');
  assert.ok(S.validateScript({ name: 'X', effects: [{ do: 'draw', amount: 1 }], self: { naoAnulavel: 1 }, example: { target: 'none', expect: {} } }).some(e => /naoAnulavel/.test(e)), 'o validador recusa naoAnulavel que não seja true');
});

test('M-579 · 701.6a: a anulação mira a Ira e não a tira da pilha — ela resolve e destrói as criaturas; uma mágica comum é anulada', () => {
  let s = mesa([['Ira', 2], ['Raio', 2], ['Island', 36]], [['Anula', 4], ['Urso', 2], ['Island', 34]]), ira, r, a, u;
  [s, ira] = poe(s, 0, 'Ira', 'hand'); [s, r] = poe(s, 0, 'Raio', 'hand'); for (let i = 0; i < 2; i++) [s] = poe(s, 0, 'Island');
  [s, a] = poe(s, 1, 'Anula', 'hand'); [s] = poe(s, 1, 'Island'); [s, u] = poe(s, 1, 'Urso');
  let t = anulaEm(JSON.parse(JSON.stringify(s)), r, a);
  assert.equal(t.objects[r].zone, 'graveyard'); assert.equal(t.players[1].life, s.players[1].life, 'controle: o Raio (comum) foi anulado');
  t = anulaEm(JSON.parse(JSON.stringify(s)), ira, a);
  assert.equal(t.objects[a].zone, 'graveyard', 'a Anula resolveu'); assert.equal(t.objects[u].zone, 'graveyard', 'a Ira resolveu e destruiu o Urso');
});

test('M-579 · a criatura que não pode ser anulada entra no campo mesmo com a anulação respondendo', () => {
  let s = mesa([['Tirano', 2], ['Island', 38]], [['Anula', 4], ['Island', 36]]), ti, a;
  [s, ti] = poe(s, 0, 'Tirano', 'hand'); [s] = poe(s, 0, 'Island'); [s, a] = poe(s, 1, 'Anula', 'hand'); [s] = poe(s, 1, 'Island');
  s = anulaEm(s, ti, a);
  assert.equal(s.objects[ti].zone, 'battlefield', 'o Tirano entrou'); assert.equal(s.objects[a].zone, 'graveyard');
});

test('M-579 · Silencio: depois de resolver, o oponente não conjura mágica neste turno; no turno seguinte volta a conjurar', () => {
  let s = mesa([['Silencio', 2], ['Plains', 38]], [['Raio', 4], ['Island', 36]]), si, r;
  [s, si] = poe(s, 0, 'Silencio', 'hand'); [s] = poe(s, 0, 'Plains'); [s, r] = poe(s, 1, 'Raio', 'hand'); [s] = poe(s, 1, 'Island');
  s = resolve(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === si)[0]));
  assert.equal(s.objects[si].zone, 'graveyard');
  const t = JSON.parse(JSON.stringify(s)); t.turn.priority = 1;
  assert.equal(legais(t, 1, x => x.t === 'cast' && x.oid === r).length, 0, 'B não conjura o Raio neste turno');
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  assert.ok(legais(s, 1, x => x.t === 'cast' && x.oid === r).length, 'no turno de B, volta a conjurar');
});
