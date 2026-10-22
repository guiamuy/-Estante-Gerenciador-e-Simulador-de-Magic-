// M-553 · Tamiyo, Inquisitive Student // Tamiyo, Seasoned Scholar (texto e rulings da Scryfall de 21/10/2026), script escrito a partir do texto oficial:
// voa; ao atacar, investiga; na terceira compra do turno, é exilada e volta transformada (712); a planeswalker (lealdade 2): +2 atacantes contra você
// ficam com −1/−0 até o seu próximo turno; −3 instantânea ou feitiço do cemitério para a mão e, se for verde, uma mana de qualquer cor; −7 compra metade
// do grimório (arredondada para cima) e emblema sem tamanho máximo de mão. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, act, poe, legais, passaAte } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const tc = OF.find(x => x.name === 'Tamiyo, Inquisitive Student // Tamiyo, Seasoned Scholar'), TM = 'Tamiyo, Inquisitive Student'; // 69 das 75 listas a chamam pela frente
const C = { [TM]: { name: TM, type_line: tc.type_line, mana_cost: tc.mana_cost, cmc: 1, keywords: ['Flying'], oracle_text: tc.oracle_text, colors: ['U'], power: '0', toughness: '3', layout: 'transform', faces: tc.faces },
  Island: { name: 'Island', type_line: 'Basic Land — Island', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {U}.)', colors: [] },
  Estudo: { name: 'Estudo', type_line: 'Sorcery', mana_cost: '{U}', cmc: 1, keywords: [], oracle_text: '', colors: ['U'] },
  Broto: { name: 'Broto', type_line: 'Instant', mana_cost: '{G}', cmc: 1, keywords: [], oracle_text: '', colors: ['G'] },
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', power: '2', toughness: '2', colors: ['G'] } };
const EX = { example: { target: 'none', expect: { selfLife: 0 } } };
const SCRIPTS = { Estudo: { name: 'Estudo', effects: [{ do: 'draw', amount: 2 }], ...EX }, Broto: { name: 'Broto', effects: [{ do: 'gain', amount: 1 }], ...EX } };
function mesa() {
  const b = ns => ns.map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 235, mode: 'full', cards: C, scripts: SCRIPTS, first: 0, players: [{ name: 'A', deck: b([[TM, 4], ['Estudo', 4], ['Broto', 4], ['Island', 28]]) }, { name: 'B', deck: b([['Urso', 10], ['Island', 30]]) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const limpa = s => passaAte(s, x => !!x.pending || (!x.stack.length && !(x.queued || []).length));
// põe a Tamiyo já transformada (planeswalker com lealdade `l`)
const vira = s => { let t, es; [s, t] = poe(s, 0, TM); s = passaAte(s, x => x.turn.active === 0 && x.turn.number >= 3 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  [s, es] = poe(s, 0, 'Estudo', 'hand'); [s] = poe(s, 0, 'Island'); s = limpa(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === es)[0])); return [s, t]; };
const comPlaneswalker = (s, l = 2) => { let t; [s, t] = vira(s); s = JSON.parse(JSON.stringify(s)); s.objects[t].counters.loyalty = l; return [s, t]; };
const lealdade = (s, oid, custo) => legais(s, 0, a => a.t === 'activate' && a.oid === oid).find(a => { const r = E.apply(s, a).state; return (r.objects[oid].counters.loyalty || 0) - (s.objects[oid].counters.loyalty || 0) === custo; });

test('M-553 · Tamiyo joga (script escrito a partir do texto oficial)', () => {
  assert.equal(S.coverage(C[TM]).level, 'completo'); assert.equal(S.coverage({ ...C[TM], name: tc.name }).level, 'completo');
});

test('M-553 · ao atacar, investiga (Pista); na terceira compra do turno, volta transformada com lealdade 2', () => {
  let s = mesa(), t; [s, t] = poe(s, 0, TM);
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 0); s = limpa(act(s, { t: 'attack', p: 0, attackers: [t] }));
  assert.ok(s.zones[0].battlefield.some(o => s.objects[o].name === 'Clue'), 'Pista');
  let [u, t2] = vira(mesa()); const tam = u.objects[t2];
  assert.equal(tam.name, 'Tamiyo, Seasoned Scholar'); assert.equal(tam.counters.loyalty, 2);
});

test('M-553 · +2: até o seu próximo turno, a criatura que ataca você fica com −1/−0; depois acaba', () => {
  let s = mesa(), tm; [s, tm] = comPlaneswalker(s); s = limpa(act(s, lealdade(s, tm, 2))); assert.equal(s.objects[tm].counters.loyalty, 4);
  let u; [s, u] = poe(s, 1, 'Urso'); s = passaAte(s, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 1); const v = s.players[0].life;
  s = act(s, { t: 'attack', p: 1, attackers: [u] }); s = passaAte(s, x => x.turn.step === 'main2' && !x.stack.length && !x.pending);
  assert.equal(v - s.players[0].life, 1, 'o Urso 2/2 causou 1');
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending); assert.equal(s.ataquesEnfraquecemM, undefined, 'acabou no seu turno');
});

test('M-553 · −3: instantânea do cemitério para a mão; verde dá uma mana da cor escolhida; −7 compra metade do grimório e tira o limite de mão', () => {
  let s = mesa(), tm, br; [s, tm] = comPlaneswalker(s, 5); [s, br] = poe(s, 0, 'Broto', 'graveyard');
  s = act(s, legais(s, 0, a => a.t === 'activate' && a.oid === tm && a.targets && a.targets[0] && a.targets[0].oid === br)[0]); s = limpa(s);
  assert.equal(s.objects[br].zone, 'hand'); assert.equal(s.pending && s.pending.kind, 'choose_color', 'carta verde: escolhe a cor');
  s = act(s, { t: 'choose_color', p: 0, color: 'B' }); assert.equal(s.players[0].pool.B, 1);
  let t = mesa(), tm2; [t, tm2] = comPlaneswalker(t, 7); const lib = t.zones[0].library.length, mao = t.zones[0].hand.length;
  t = limpa(act(t, lealdade(t, tm2, -7))); assert.equal(t.zones[0].hand.length - mao, Math.ceil(lib / 2));
  assert.ok((t.players[0].efeitos || []).some(e => e.semLimiteDeMao && e.ate === 'sempre'), 'emblema');
});

test('M-553 · achados da revisão: o verso é lendário (duas Tamiyo, Seasoned Scholar → regra da lenda); listada pelo nome inteiro, o script vale', () => {
  let s = mesa(), t; [s, t] = vira(s); assert.equal(s.facts['Tamiyo, Seasoned Scholar'].legendary, true);
  let t2, es; [s, t2] = poe(s, 0, TM); s = passaAte(s, x => x.turn.active === 0 && x.turn.number > 3 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  [s, es] = poe(s, 0, 'Estudo', 'hand'); [s] = poe(s, 0, 'Island'); s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === es)[0]); s = passaAte(s, x => !!x.pending || (!x.stack.length && !(x.queued || []).length));
  assert.equal(s.pending && s.pending.kind, 'legend', 'duas Tamiyo, Seasoned Scholar: escolhe uma');
  const NOME = tc.name, C2 = { ...C, [NOME]: { ...C[TM], name: NOME } }; delete C2[TM];
  let u = E.createGame({ format: 'livre', seed: 2351, mode: 'full', cards: C2, scripts: SCRIPTS, first: 0, players: [{ name: 'A', deck: [{ name: NOME, qty: 4, zone: 'main' }, { name: 'Island', qty: 30, zone: 'main' }] }, { name: 'B', deck: [{ name: 'Island', qty: 30, zone: 'main' }] }] });
  for (let p = 0; p < 2; p++) u = act(u, { t: 'keep', p, bottom: [] });
  assert.ok(u.facts[NOME].script && u.facts[NOME].script.abilities.length === 2, 'o script da frente vale com o nome inteiro');
});
