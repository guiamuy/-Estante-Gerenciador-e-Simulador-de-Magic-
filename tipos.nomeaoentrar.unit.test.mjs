// T-79 · CR5 · "As this enters, choose a card name" e a trava das habilidades ativadas (Comprehensive Rules 201.4, com 602.5, 605 e 708.2).
// Texto da regra: .regras/cr-2026-09-25.txt. Cartas com o texto oficial de .listas/oficiais-tipos.json (Oracle do Forge, clone de
// 13/10/2026): Pithing Needle e Phyrexian Revoker. "Atirador", "Elfo" e "Ciclador" são cartas de teste que isolam a regra.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S as SC, T, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const C = {};
for (const c of L('oficiais-tipos.json').filter(x => ['Pithing Needle', 'Phyrexian Revoker'].includes(x.name)))
  C[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: [], ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}) };
for (const [n, k] of Object.entries({ Forest: 'G', Mountain: 'R' })) C[n] = { name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${k}}.)`, colors: [] };
const carta = (name, type_line, extra = {}) => { C[name] = { name, type_line, mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra }; };
carta('Atirador', 'Creature — Human', { power: '1', toughness: '1' }); carta('Elfo', 'Creature — Elf', { power: '1', toughness: '1' });
carta('Ciclador', 'Sorcery');
const EX = { example: { target: 'none', expect: { selfLife: 0 } } };
const SCRIPTS = {
  'Atirador': { name: 'Atirador', abilities: [{ kind: 'activated', cost: { tap: true }, effects: [{ do: 'damage', amount: 1, target: 'any' }] }], ...EX }, // "{T}: This creature deals 1 damage to any target."
  'Elfo': { name: 'Elfo', produces: [['G']], ...EX }, // "{T}: Add {G}."
  'Ciclador': { name: 'Ciclador', effects: [{ do: 'gain', amount: 1 }], cycling: { mana: '{1}' }, ...EX }, // "You gain 1 life. · Cycling {1}"
};
const TODAS = Object.keys(C).filter(n => !['Forest', 'Mountain'].includes(n));
function mesa(seed = 1) {
  const deck = [...TODAS.map(name => ({ name, qty: 3, zone: 'main' })), { name: 'Forest', qty: 8, zone: 'main' }, { name: 'Mountain', qty: 8, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p = 0, n = 9) => { s = J(s); for (const c of 'WUBRGC') s.players[p].pool[c] += n; return s; };
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
/** Conjura a agulha da mão de A e escolhe o nome quando a mesa pergunta. */
function agulha(s, nomeCarta, nome) {
  let g; [s, g] = poe(s, 0, nomeCarta, 'hand'); s = mana(s);
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === g)[0]); s = passaAte(s, x => !!x.pending || !x.stack.length);
  assert.ok(s.pending && s.pending.kind === 'choose_name', 'a escolha do nome abre ao entrar');
  return [act(s, { t: 'choose_name', p: 0, nome }), g];
}
const ativa = (s, p, oid) => legais(s, p, a => a.t === 'activate' && a.oid === oid);
const sem = (s, p) => { s = J(s); for (const c of 'WUBRGC') s.players[p].pool[c] = 0; return s; };

test('CR 201.4 · Pithing Needle (texto oficial): ao entrar escolhe um nome de carta, terreno incluído; a escolha vem antes de alguém receber prioridade', () => {
  let s = mesa(); let g; [s, g] = poe(s, 0, 'Pithing Needle', 'hand'); s = mana(s);
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === g)[0]); s = passaAte(s, x => !!x.pending || !x.stack.length);
  eq([s.pending.kind, s.pending.p, s.objects[g].zone], ['choose_name', 0, 'battlefield']);
  assert.ok(s.pending.options.includes('Forest') && s.pending.options.includes('Atirador'), 'sem filtro: terrenos também');
  assert.throws(() => E.apply(s, { t: 'pass', p: 0 }), /escolha o nome/);
  s = act(s, { t: 'choose_name', p: 0, nome: 'Atirador' });
  assert.equal(s.pending, null);
});

test('CR 201.4 / 602.5 · Pithing Needle nomeando Atirador: a habilidade ativada das Atirador (as duas, de qualquer jogador) não é oferecida e é recusada; a de outra carta, sim', () => {
  let s = mesa(); let a0, a1, e; [s, a0] = poe(s, 0, 'Atirador', 'battlefield'); [s, a1] = poe(s, 1, 'Atirador', 'battlefield'); [s, e] = poe(s, 0, 'Elfo', 'battlefield');
  s = J(s); for (const o of [a0, a1, e]) s.objects[o].sick = false;
  assert.equal(ativa(s, 0, a0).length > 0, true, 'antes da agulha, ativa');
  [s] = agulha(s, 'Pithing Needle', 'Atirador');
  eq(ativa(s, 0, a0).length, 0, 'não é oferecida');
  const alvo = { player: 1 };
  assert.throws(() => E.apply(s, { t: 'activate', p: 0, oid: a0, index: 0, targets: [alvo] }), /travada|não podem ser ativadas/);
  s = J(s); s.turn.priority = 1; eq(ativa(s, 1, a1).length, 0, 'a do oponente também');
});

test('CR 201.4 / 605.1a · Pithing Needle não trava habilidade de mana; Phyrexian Revoker trava (o Elfo deixa de pagar a mágica)', () => {
  let s = mesa(); let e; [s, e] = poe(s, 0, 'Elfo', 'battlefield'); s = J(s); s.objects[e].sick = false;
  const soOElfo = x => { x = sem(J(x), 0); for (const oid of x.zones[0].battlefield.slice()) if (!['Elfo', 'Pithing Needle', 'Phyrexian Revoker'].includes(x.objects[oid].name)) { x.zones[0].battlefield.splice(x.zones[0].battlefield.indexOf(oid), 1); x.zones[0].graveyard.push(oid); x.objects[oid].zone = 'graveyard'; } let g; [x, g] = poe(x, 0, 'Ciclador', 'hand'); return legais(x, 0, a => a.t === 'cast' && a.oid === g).length; };
  assert.ok(soOElfo(s) > 0, 'sem trava, o Elfo paga {1}');
  assert.ok(soOElfo(agulha(s, 'Pithing Needle', 'Elfo')[0]) > 0, 'Needle: a de mana continua');
  eq(soOElfo(agulha(s, 'Phyrexian Revoker', 'Elfo')[0]), 0, 'Revoker: nem a de mana');
});

test('CR 201.4 · Phyrexian Revoker: "nonland" — terrenos não estão na lista', () => {
  let s = mesa(); let g; [s, g] = poe(s, 0, 'Phyrexian Revoker', 'hand'); s = mana(s);
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === g)[0]); s = passaAte(s, x => !!x.pending || !x.stack.length);
  assert.ok(!s.pending.options.includes('Forest') && s.pending.options.includes('Elfo'));
});

test('CR 201.4 · a trava vale para a fonte em outras zonas: ciclar da mão é habilidade ativada (conjurar não é)', () => {
  let s = mesa(); let c; [s, c] = poe(s, 0, 'Ciclador', 'hand'); s = mana(s);
  assert.ok(legais(s, 0, a => a.t === 'cycle' && a.oid === c).length > 0, 'antes, cicla');
  let t = agulha(s, 'Pithing Needle', 'Ciclador')[0]; t = mana(t);
  eq(legais(t, 0, a => a.t === 'cycle' && a.oid === c).length, 0, 'ciclar é habilidade ativada');
  assert.ok(legais(t, 0, a => a.t === 'cast' && a.oid === c).length > 0, 'conjurar não é');
  assert.throws(() => E.apply(t, { t: 'cycle', p: 0, oid: c }), /não podem ser ativadas/);
});

test('CR 400.7 · a agulha que sai do campo leva a trava; a que volta escolhe de novo', () => {
  let s = mesa(); let a0; [s, a0] = poe(s, 0, 'Atirador', 'battlefield'); s = J(s); s.objects[a0].sick = false;
  let g; [s, g] = agulha(s, 'Pithing Needle', 'Atirador');
  eq(ativa(s, 0, a0).length, 0);
  s = J(s); const z = s.zones[0]; z.battlefield.splice(z.battlefield.indexOf(g), 1); z.hand.push(g); s.objects[g].zone = 'hand'; s.objects[g].zc = (s.objects[g].zc || 0) + 1;
  assert.ok(ativa(s, 0, a0).length > 0, 'sem a agulha no campo, ativa');
  s = mana(s); s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === g)[0]); s = passaAte(s, x => !!x.pending || !x.stack.length);
  eq(s.pending && s.pending.kind, 'choose_name', 'escolhe de novo');
});

test('CR 201.4 · validador, mesa e registro: nomeAoEntrar e travaAtivadasDoNome conferidos; o registro diz o nome escolhido', () => {
  const v = sc => J(SC.validateScript({ name: 'X', ...sc, example: { action: 'etb', target: 'none', expect: { attached: false } } }));
  eq(v({ self: { nomeAoEntrar: true, travaAtivadasDoNome: 'semMana' } }), []);
  assert.ok(v({ self: { nomeAoEntrar: { cor: 'R' } } }).some(e => /nomeAoEntrar/.test(e)));
  assert.ok(v({ self: { nomeAoEntrar: { filtro: { semTipos: ['terreno'] } } } }).some(e => /filtro/.test(e)));
  assert.ok(v({ self: { travaAtivadasDoNome: 'todas' } }).some(e => /nomeAoEntrar/.test(e)), 'trava sem nome');
  assert.ok(v({ self: { nomeAoEntrar: true, travaAtivadasDoNome: 'algumas' } }).some(e => /semMana/.test(e)));
  let s = mesa(); let g; [s, g] = poe(s, 0, 'Pithing Needle', 'hand'); s = mana(s);
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === g)[0]); s = passaAte(s, x => !!x.pending || !x.stack.length);
  const r = E.apply(s, { t: 'choose_name', p: 0, nome: 'Atirador' });
  assert.match(T.describe(s, { t: 'choose_name', p: 0, nome: 'Atirador' }, r.events, r.state).join(' | '), /escolheu o nome Atirador/);
});
