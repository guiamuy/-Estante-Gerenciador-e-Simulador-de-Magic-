// T-31 · CR5 · Selar (Comprehensive Rules 702.171, com 602.5d e 400.7).
// Texto da regra: .regras/cr-2026-09-25.txt. Cartas exemplo com o texto oficial de .listas/oficiais-tipos.json (Oracle do Forge, consulta
// de 13/10/2026): Bridled Bighorn, Trained Arynx e Drover Grizzly. As cartas "de teste" são scripts sintéticos que isolam a regra.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S as SC, T, J, act, poe, legais, passaAte, palavrasDoTexto, valorDeMana } from './listas.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const C = {};
for (const c of L('oficiais-tipos.json').filter(x => ['Bridled Bighorn', 'Trained Arynx', 'Drover Grizzly'].includes(x.name)))
  C[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [...palavrasDoTexto(c.oracle_text), 'Saddle'], oracle_text: c.oracle_text, colors: [], power: c.power, toughness: c.toughness };
C.Plains = { name: 'Plains', type_line: 'Basic Land — Plains', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {W}.)', colors: [] };
const carta = (name, type_line, extra = {}) => { C[name] = { name, type_line, mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra }; };
const EX = { example: { target: 'none', expect: { selfLife: 0 } } };
const SCRIPTS = {
  'Sopro': { name: 'Sopro', effects: [{ do: 'gain', amount: 1 }], ...EX },
  'Rebote': { name: 'Rebote', effects: [{ do: 'bounce', target: 'creature' }], ...EX },
};
carta('Sopro', 'Instant'); carta('Rebote', 'Instant');
carta('Urso', 'Creature — Bear', { power: '2', toughness: '2' }); carta('Rato', 'Creature — Rat', { power: '1', toughness: '1' });
carta('Veículo', 'Artifact — Vehicle', { power: '4', toughness: '4' });

const BB = 'Bridled Bighorn', TA = 'Trained Arynx', DG = 'Drover Grizzly';
const TODAS = [BB, TA, DG, 'Sopro', 'Rebote', 'Urso', 'Rato'];
function mesa(seed = 1, extra = []) {
  const deck = [...TODAS.map(name => ({ name, qty: name === 'Urso' || name === 'Rato' ? 8 : 4, zone: 'main' })), { name: 'Plains', qty: 12, zone: 'main' }, ...extra.map(name => ({ name, qty: 2, zone: 'main' }))];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p = 0, n = 9) => { s = J(s); for (const c of 'WUBRGC') s.players[p].pool[c] += n; return s; };
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const esvazia = s => { for (let i = 0; i < 30; i++) { s = passaAte(s, x => !x.stack.length || !!x.pending); if (!s.pending || !['triggers', 'pick_target', 'scry'].includes(s.pending.kind)) return s; s = act(s, legais(s, s.pending.p)[0]); } return s; };
const selas = (s, p, oid) => legais(s, p, a => a.t === 'activate' && a.oid === oid && a.pay && Array.isArray(a.pay.crew));
const selada = (s, oid) => E.seladaAgoraT(s, s.objects[oid]);
const ataca = (s, oid) => { s = passaAte(s, x => x.pending && x.pending.kind === 'attackers' && x.pending.p === 0); return esvazia(act(s, { t: 'attack', p: 0, attackers: [oid] })); };

test('CR 702.171a · selar N: virar outras criaturas suas com poder total N ou mais (enjoo não impede); só como feitiço; a montaria fica selada', () => {
  let s = mesa(); let b; [s, b] = poe(s, 0, BB, 'battlefield', { sick: false }); let u; [s, u] = poe(s, 0, 'Urso'); // o Urso acabou de entrar (enjoo)
  const of = selas(s, 0, b);
  eq(of.map(a => a.pay.crew), [[u]], 'o Urso (poder 2) sela sozinho; a própria montaria não entra');
  let r; [s, r] = poe(s, 0, 'Sopro', 'hand'); s = mana(s);
  const t = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === r)[0]);
  assert.equal(selas(t, 0, b).length, 0, 'com a pilha ocupada, não (só como feitiço)');
  s = esvazia(act(s, of[0]));
  eq([selada(s, b), s.objects[u].tapped, s.objects[b].tapped], [true, true, false], 'selada; quem selou virou; a montaria não');
});

test('CR 702.171a · poder somado: dois 1/1 selam "Selar 2"; um 1/1 só, não', () => {
  let s = mesa(); let b; [s, b] = poe(s, 0, BB, 'battlefield', { sick: false }); let r1; [s, r1] = poe(s, 0, 'Rato');
  assert.equal(selas(s, 0, b).length, 0, 'poder 1 < 2');
  let r2; [s, r2] = poe(s, 0, 'Rato');
  eq(selas(s, 0, b).map(a => J(a.pay.crew).sort()), [[r1, r2].sort()]);
});

test('CR 702.171b · selada até o fim do turno; no turno seguinte, não', () => {
  let s = mesa(); let b; [s, b] = poe(s, 0, BB, 'battlefield', { sick: false }); [s] = poe(s, 0, 'Urso');
  s = esvazia(act(s, selas(s, 0, b)[0]));
  assert.ok(selada(s, b));
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1');
  assert.ok(!selada(s, b));
});

test('CR 702.171b / 400.7 · a montaria que sai do campo deixa de estar selada (objeto novo)', () => {
  let s = mesa(); let b; [s, b] = poe(s, 0, BB, 'battlefield', { sick: false }); [s] = poe(s, 0, 'Urso');
  s = esvazia(act(s, selas(s, 0, b)[0]));
  let r; [s, r] = poe(s, 0, 'Rebote', 'hand'); s = mana(s);
  s = esvazia(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === r && (a.targets || []).some(t => t.oid === b))[0]));
  s = mana(s); s = esvazia(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === b)[0]));
  eq([s.objects[b].zone, selada(s, b)], ['battlefield', false]);
});

test('CR 400.7 · a habilidade de selar que resolve depois de a montaria sair e voltar não sela o objeto novo', () => {
  let s = mesa(); let b; [s, b] = poe(s, 0, BB, 'battlefield', { sick: false }); [s] = poe(s, 0, 'Urso');
  let t = J(act(s, selas(s, 0, b)[0]));
  E.moveObject(t, b, 'hand'); E.moveObject(t, b, 'battlefield', { controller: 0 });
  t = esvazia(t);
  assert.ok(!selada(t, b));
});

test('Bridled Bighorn (texto oficial) · atacando selada, cria uma Ovelha 1/1 branca; sem selar, nada', () => {
  let s = mesa(); let b; [s, b] = poe(s, 0, BB, 'battlefield', { sick: false });
  let t = ataca(s, b);
  assert.equal(t.zones[0].battlefield.filter(x => t.objects[x].token).length, 0, 'sem selar: nada');
  [s] = poe(s, 0, 'Urso'); s = esvazia(act(s, selas(s, 0, b)[0]));
  t = ataca(s, b);
  const ov = t.zones[0].battlefield.filter(x => t.objects[x].token);
  eq([ov.length, E.coresDe(t, t.objects[ov[0]]), /Sheep/.test(E.linhaDeTipo(t, t.objects[ov[0]])), E.hasKeyword(t, t.objects[b], 'vigilance'), t.objects[b].tapped], [1, ['W'], true, true, false]);
});

test('Trained Arynx (texto oficial) · atacando selada, ganha iniciativa até o fim do turno (e vidência 1)', () => {
  let s = mesa(); let a; [s, a] = poe(s, 0, TA, 'battlefield', { sick: false }); [s] = poe(s, 0, 'Urso');
  s = esvazia(act(s, selas(s, 0, a)[0]));
  const t = ataca(s, a);
  assert.ok(E.hasKeyword(t, t.objects[a], 'first strike'));
});

test('Drover Grizzly (texto oficial) · "Selar 1"; atacando selada, suas criaturas ganham atropelar até o fim do turno', () => {
  let s = mesa(); let g; [s, g] = poe(s, 0, DG, 'battlefield', { sick: false }); let r; [s, r] = poe(s, 0, 'Rato');
  s = esvazia(act(s, selas(s, 0, g)[0]));
  const t = ataca(s, g);
  eq([E.hasKeyword(t, t.objects[g], 'trample'), E.hasKeyword(t, t.objects[r], 'trample')], [true, true]);
});

test('Validador · self.selar é um número inteiro positivo; a condição "selada" só no gatilho', () => {
  const ok = { name: 'X', self: { selar: 2 }, abilities: [{ kind: 'triggered', when: 'attacks', condition: { selada: true }, effects: [{ do: 'gain', amount: 1 }] }], ...EX };
  eq(SC.validateScript(ok), []);
  assert.ok(SC.validateScript({ ...ok, self: { selar: 0 } }).some(e => /selar/.test(e)));
  assert.ok(SC.validateScript({ ...ok, self: { selar: '2' } }).some(e => /selar/.test(e)));
});

test('Mesa · a decisão de escolher quem sela fala em selar, e o registro diz que a montaria foi selada', () => {
  let s = mesa(); let b; [s, b] = poe(s, 0, BB, 'battlefield', { sick: false }); [s] = poe(s, 0, 'Urso'); [s] = poe(s, 0, 'Urso');
  const of = legais(s, 0, a => a.t === 'tripular' && a.oid === b);
  if (of.length) { const t = act(s, of[0]); eq(E.tripulacaoPendente(t).selar, true); }
  const a = selas(s, 0, b)[0], r1 = E.apply(s, a), r2 = E.apply(r1.state, { t: 'pass', p: 0 }), r3 = E.apply(r2.state, { t: 'pass', p: 1 });
  const linhas = T.describe(r2.state, { t: 'pass', p: 1 }, r3.events, r3.state);
  assert.ok(linhas.some(l => /Bridled Bighorn foi selada/.test(l)), JSON.stringify(linhas));
});

/* ---------------- T-33 · correções da auditoria independente ---------------- */
test('CR 702.171a · selar não é tripular: o bônus "tripula Veículos como se tivesse poder maior" não soma para selar (e soma para tripular)', () => {
  const cards = { ...C, 'Mecânico': { name: 'Mecânico', type_line: 'Creature — Human Artificer', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], power: '2', toughness: '2' },
    'Montaria4': { name: 'Montaria4', type_line: 'Creature — Horse Mount', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], power: '5', toughness: '5' },
    'Carroça': { name: 'Carroça', type_line: 'Artifact — Vehicle', mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], power: '5', toughness: '5' } };
  const scripts = { ...SCRIPTS, 'Mecânico': { name: 'Mecânico', self: { tripulaMais: 2 }, ...EX }, 'Montaria4': { name: 'Montaria4', self: { selar: 4 }, ...EX },
    'Carroça': { name: 'Carroça', abilities: [{ kind: 'activated', label: 'Tripular 4', cost: { crew: 4 }, effects: [{ do: 'tripulada' }] }], ...EX } };
  const deck = ['Mecânico', 'Montaria4', 'Carroça'].map(name => ({ name, qty: 6, zone: 'main' })).concat([{ name: 'Plains', qty: 22, zone: 'main' }]);
  let s = E.createGame({ format: 'livre', seed: 1, mode: 'full', cards, scripts, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  let m; [s, m] = poe(s, 0, 'Montaria4', 'battlefield', { sick: false }); let v; [s, v] = poe(s, 0, 'Carroça'); [s] = poe(s, 0, 'Mecânico');
  eq([selas(s, 0, m).length, legais(s, 0, a => a.t === 'activate' && a.oid === v && a.pay && Array.isArray(a.pay.crew)).length > 0], [0, true], 'o Mecânico (2 + 2 para Veículo) tripula a Carroça 4, mas não sela a Montaria 4');
});

test('Registro · a escolha livre de quem sela diz "selou", não "tripulou"', () => {
  let s = mesa(); let b; [s, b] = poe(s, 0, BB, 'battlefield', { sick: false }); let r1; [s, r1] = poe(s, 0, 'Rato'); let r2; [s, r2] = poe(s, 0, 'Rato'); let r3; [s, r3] = poe(s, 0, 'Rato');
  const of = legais(s, 0, a => a.t === 'tripular' && a.oid === b); assert.ok(of.length, 'a escolha livre existe (três 1/1 para Selar 2)');
  s = act(s, of[0]); s = act(s, { t: 'tripulante', p: 0, oid: r1 }); s = act(s, { t: 'tripulante', p: 0, oid: r2 }); s = act(s, { t: 'tripulante', p: 0, oid: r3 });
  const a = { t: 'tripular_pronto', p: 0 }, r = E.apply(s, a);
  const linhas = T.describe(s, a, r.events, r.state).join(' | ');
  assert.ok(/selou Bridled Bighorn com Rato \+ Rato \+ Rato/.test(linhas), linhas);
});

/* ---------------- T-35 · correção da auditoria independente ---------------- */
test('CR 702.171a · selar soma o poder: quem tripula pela resistência (Giant Ox, 0/6) não sela "Selar 1"', () => {
  C['Giant Ox'] = { name: 'Giant Ox', type_line: 'Creature — Ox', mana_cost: '{1}{W}', cmc: 2, keywords: [], oracle_text: '', colors: ['W'], power: '0', toughness: '6' };
  let s = mesa(1, ['Giant Ox']); let g; [s, g] = poe(s, 0, DG, 'battlefield', { sick: false }); let ox; [s, ox] = poe(s, 0, 'Giant Ox');
  eq(selas(s, 0, g).map(a => a.pay.crew), [], 'poder 0 não sela');
  assert.throws(() => E.apply(s, { t: 'activate', p: 0, oid: g, index: 0, pay: { crew: [ox] } }));
});
