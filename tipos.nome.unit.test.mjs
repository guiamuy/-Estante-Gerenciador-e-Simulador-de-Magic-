// T-77 · CR5 · Escolher um nome de carta (Comprehensive Rules 201.4, com 709.4a, 710.5, 712.19, 715.5, 720.5 e 722.5).
// Texto da regra: .regras/cr-2026-09-25.txt. Cartas com o texto oficial de .listas/oficiais-tipos.json (Oracle do Forge, clone de
// 13/10/2026): Cabal Therapy, Wax // Wane, Foulmire Knight, Orochi Eggwatcher, Elite Interceptor. Delver of Secrets e Sagu Wildling
// têm script na biblioteca (dupla face e Presságio); "Urso", "Choque" e "Fichário" são cartas de teste que isolam a regra.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S as SC, T, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const OF = L('oficiais-tipos.json');
const C = {};
for (const c of OF.filter(x => ['Cabal Therapy', 'Wax // Wane', 'Foulmire Knight', 'Elite Interceptor'].includes(x.name)))
  C[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: [], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) };
for (const c of OF.filter(x => x.name === 'Orochi Eggwatcher // Shidako, Broodmistress')) // como a Scryfall entrega (tipos.virar.unit)
  C[c.name] = { name: c.name, type_line: `${c.type_line} // ${c.verso.type_line}`, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: ['G'], power: c.power, toughness: c.toughness, layout: 'flip' };
C['Delver of Secrets'] = { name: 'Delver of Secrets', type_line: 'Creature — Human Wizard', mana_cost: '{U}', cmc: 1, keywords: [], oracle_text: '', colors: ['U'], power: '1', toughness: '1' };
C['Sagu Wildling'] = { name: 'Sagu Wildling', type_line: 'Creature — Dragon', mana_cost: '{4}{G}', cmc: 5, keywords: [], oracle_text: '', colors: ['G'], power: '3', toughness: '3' };
for (const [n, k] of Object.entries({ Swamp: 'B', Forest: 'G' })) C[n] = { name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${k}}.)`, colors: [] };
const carta = (name, type_line, extra = {}) => { C[name] = { name, type_line, mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra }; };
carta('Urso', 'Creature — Bear', { power: '2', toughness: '2' }); carta('Choque', 'Instant'); carta('Fichário', 'Sorcery');
const EX = { example: { target: 'none', expect: { selfLife: 0 } } };
const SCRIPTS = {
  'Choque': { name: 'Choque', effects: [{ do: 'damage', amount: 2, target: 'creature' }], ...EX },
  'Fichário': { name: 'Fichário', effects: [{ do: 'token', amount: 1, token: { name: 'Golem Pequeno', power: 1, toughness: 1, types: ['artifact', 'creature'], subtypes: ['Golem'] } }], ...EX }, // "Create a 1/1 Golem artifact creature token named Golem Pequeno."
};
const TODAS = Object.keys(C).filter(n => !['Swamp', 'Forest'].includes(n));
function mesa(seed = 1) {
  const deck = [...TODAS.map(name => ({ name, qty: 3, zone: 'main' })), { name: 'Swamp', qty: 10, zone: 'main' }, { name: 'Forest', qty: 6, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p = 0, n = 9) => { s = J(s); for (const c of 'WUBRGC') s.players[p].pool[c] += n; return s; };
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
/** Põe as cartas na mão do jogador (tira da mão o resto, para a conta ficar clara). */
const maoDe = (s, p, nomes) => { s = J(s); const z = s.zones[p]; for (const oid of z.hand.splice(0)) { z.library.push(oid); s.objects[oid].zone = 'library'; } const oids = []; for (const n of nomes) { let o; [s, o] = poe(s, p, n, 'hand'); oids.push(o); } return [s, oids]; };
/** Conjura Cabal Therapy mirando B e para na escolha do nome. */
function terapia(s) {
  let t; [s, t] = poe(s, 0, 'Cabal Therapy', 'hand'); s = mana(s);
  const a = legais(s, 0, x => x.t === 'cast' && x.oid === t && x.targets && x.targets[0] && x.targets[0].player === 1)[0]; assert.ok(a, 'Cabal Therapy mira o jogador B');
  s = act(s, a); s = passaAte(s, x => !!x.pending || !x.stack.length);
  return [s, t];
}
const nomesNaMao = (s, p) => s.zones[p].hand.map(o => s.objects[o].name).sort();

test('CR 201.4 / 201.4a · Cabal Therapy (texto oficial): escolhe um nome de carta não terreno; o alvo revela a mão e descarta todas as cartas com esse nome', () => {
  let s = mesa(); [s] = maoDe(s, 1, ['Urso', 'Urso', 'Choque']);
  [s] = terapia(s);
  eq([s.pending && s.pending.kind, s.pending && s.pending.p], ['choose_name', 0], 'quem conjurou escolhe o nome, na resolução');
  const ops = s.pending.options;
  assert.ok(ops.includes('Urso') && ops.includes('Choque') && ops.includes('Cabal Therapy'), 'nomes das cartas da partida');
  assert.ok(!ops.includes('Swamp') && !ops.includes('Forest'), '"nonland": terrenos não');
  eq(legais(s, 0).filter(a => a.t === 'choose_name').length, ops.length, 'uma oferta por nome');
  assert.throws(() => E.apply(s, { t: 'pass', p: 0 }), /escolha o nome/);
  assert.throws(() => E.apply(s, { t: 'choose_name', p: 0, nome: 'Swamp' }), /nome/);
  s = act(s, { t: 'choose_name', p: 0, nome: 'Urso' });
  s = passaAte(s, x => !x.stack.length || !!x.pending);
  eq(nomesNaMao(s, 1), ['Choque'], 'as duas Urso foram descartadas');
  eq(s.zones[1].graveyard.map(o => s.objects[o].name).filter(n => n === 'Urso').length, 2);
});

test('CR 201.4 · Cabal Therapy: nomeando uma carta que não está na mão, nada é descartado (a mão é revelada no registro)', () => {
  let s = mesa(); [s] = maoDe(s, 1, ['Urso', 'Choque']);
  [s] = terapia(s);
  const r = E.apply(s, { t: 'choose_name', p: 0, nome: 'Foulmire Knight' }); s = r.state;
  s = passaAte(s, x => !x.stack.length || !!x.pending);
  eq(nomesNaMao(s, 1), ['Choque', 'Urso']);
});

test('CR 201.4b / 709.4a · dividida: escolhe-se o nome de uma metade, nunca o da carta inteira; na mão, Wax // Wane tem os dois nomes e sai nomeando Wane', () => {
  let s = mesa(); [s] = maoDe(s, 1, ['Wax // Wane', 'Urso']);
  [s] = terapia(s);
  const ops = s.pending.options;
  assert.ok(ops.includes('Wax') && ops.includes('Wane') && !ops.includes('Wax // Wane'), JSON.stringify(ops));
  s = act(s, { t: 'choose_name', p: 0, nome: 'Wane' }); s = passaAte(s, x => !x.stack.length || !!x.pending);
  eq(nomesNaMao(s, 1), ['Urso']);
});

test('CR 201.4f / 715.5 · Aventura: o nome da Aventura (Profane Insight) é escolhível; na mão, Foulmire Knight só tem o nome dela e não sai (715.4)', () => {
  let s = mesa(); [s] = maoDe(s, 1, ['Foulmire Knight']);
  [s] = terapia(s);
  assert.ok(s.pending.options.includes('Profane Insight') && s.pending.options.includes('Foulmire Knight'));
  s = act(s, { t: 'choose_name', p: 0, nome: 'Profane Insight' }); s = passaAte(s, x => !x.stack.length || !!x.pending);
  eq(nomesNaMao(s, 1), ['Foulmire Knight']);
});

test('CR 201.4c / 201.4d / 712.19 / 710.5 / 720.5 / 722.5 · o nome da face de trás, da parte alternativa, do Presságio e da mágica de preparação são escolhíveis, com as características dessa face', () => {
  let s = mesa(); [s] = terapia(s);
  const ops = s.pending.options;
  for (const n of ['Insectile Aberration', 'Shidako, Broodmistress', 'Roost Seek', 'Rejoinder', 'Delver of Secrets', 'Orochi Eggwatcher', 'Sagu Wildling', 'Elite Interceptor']) assert.ok(ops.includes(n), n);
  assert.ok(!ops.some(n => n.includes(' // ')), 'nenhum nome de carta inteira de duas partes');
  eq(J(E.nomesEscolhiveisT(s, { tipos: ['sorcery'] })).filter(n => ['Roost Seek', 'Rejoinder', 'Sagu Wildling', 'Elite Interceptor'].includes(n)).sort(), ['Rejoinder', 'Roost Seek'], 'o filtro olha a face: Roost Seek e Rejoinder são feitiços; as criaturas não');
});

test('CR 201.4 · ficha não tem nome de carta: o nome de uma ficha criada na partida não é escolhível', () => {
  let s = mesa(); let f; [s, f] = poe(s, 0, 'Fichário', 'hand'); s = mana(s); s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === f)[0]); s = passaAte(s, x => !x.stack.length);
  assert.ok(Object.values(s.objects).some(o => o.token && o.name === 'Golem Pequeno'), 'a ficha existe');
  [s] = terapia(s);
  assert.ok(!s.pending.options.includes('Golem Pequeno'));
});

test('CR 201.4 · registro e validador: "escolheu o nome"; a mão revelada e o que saiu; descarta_nome sem escolhe_nome antes e filtro desconhecido são recusados', () => {
  let s = mesa(); [s] = maoDe(s, 1, ['Urso', 'Choque']);
  [s] = terapia(s);
  const r = E.apply(s, { t: 'choose_name', p: 0, nome: 'Urso' });
  const r2 = E.apply(r.state, { t: 'pass', p: 0 });
  const L1 = T.describe(s, { t: 'choose_name', p: 0, nome: 'Urso' }, r.events, r.state).join(' | ');
  assert.match(L1, /escolheu o nome Urso/);
  assert.match(L1, /revelou a mão \(.*Urso.*\)/);
  assert.match(L1, /descartou Urso/);
  const v = sc => J(SC.validateScript({ name: 'X', ...sc, ...EX }));
  assert.ok(v({ effects: [{ do: 'descarta_nome', target: 'player' }] }).some(e => /escolhe_nome/.test(e)));
  assert.ok(v({ effects: [{ do: 'escolhe_nome', filtro: { cor: 'R' } }, { do: 'descarta_nome', target: 'player' }] }).some(e => /filtro/.test(e)));
  eq(v({ effects: [{ do: 'escolhe_nome', filtro: { semTipos: ['land'] } }, { do: 'descarta_nome', target: 'player' }] }), []);
  void r2;
});

test('CR 710.4 / 201.4c · na mão, a carta de virar se chama pela parte de cima: nomeando Shidako, Broodmistress, ela fica; nomeando Orochi Eggwatcher, sai', () => {
  const OR = 'Orochi Eggwatcher // Shidako, Broodmistress';
  let s = mesa(); [s] = maoDe(s, 1, [OR]);
  [s] = terapia(s); s = act(s, { t: 'choose_name', p: 0, nome: 'Shidako, Broodmistress' }); s = passaAte(s, x => !x.stack.length || !!x.pending);
  eq(s.zones[1].hand.length, 1, 'o nome alternativo não está na carta na mão');
  [s] = terapia(s); s = act(s, { t: 'choose_name', p: 0, nome: 'Orochi Eggwatcher' }); s = passaAte(s, x => !x.stack.length || !!x.pending);
  eq(s.zones[1].hand.length, 0);
});
