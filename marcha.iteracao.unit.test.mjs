// M-267 · custo adicional "exile qualquer número de cartas azuis da mão; custa {2} a menos por carta" e "olhe três: uma para a mão,
// uma para o fundo, uma para o exílio (pode jogá-la neste turno)". Cartas: March of Swirling Mist e Expressive Iteration (texto oficial em
// .listas/oficiais-commander.json, 05/10/2026; segunda fonte, Oracle do Forge, 10/10/2026; rulings da Expressive Iteration em mtg.wtf,
// consulta de 10/10/2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, mesa, comMana, tudo, passaAte } from './cmd.mjs';
import { S, T } from './listas.mjs';

const soNaMao = (s, p, manter) => { s = J(s); for (const oid of s.zones[p].hand.filter(x => !manter.includes(x))) { s.zones[p].hand.splice(s.zones[p].hand.indexOf(oid), 1); s.zones[p].library.push(oid); s.objects[oid].zone = 'library'; } return s; };
const ateEscolha = s => { for (let i = 0; i < 10 && !(s.pending && s.pending.kind === 'pick'); i++) s = act(s, { t: 'pass', p: s.turn.priority }); return s; };

test('M-267 · March of Swirling Mist: a mesa oferece exilar 1, 2… cartas azuis da mão, {2} a menos cada, e o X decide quantos alvos', () => {
  let s = mesa(['March of Swirling Mist', 'Faerie Seer', 'Lightning Bolt', 'Thraben Inspector'], ['Thraben Inspector']), ma, a1, a2, bolt, c1, c2;
  [s, ma] = poe(s, 0, 'March of Swirling Mist', 'hand'); [s, a1] = poe(s, 0, 'Faerie Seer', 'hand'); [s, a2] = poe(s, 0, 'Faerie Seer', 'hand'); [s, bolt] = poe(s, 0, 'Lightning Bolt', 'hand');
  [s, c1] = poe(s, 0, 'Thraben Inspector'); [s, c2] = poe(s, 1, 'Thraben Inspector'); s = soNaMao(s, 0, [ma, a1, a2, bolt]);
  s = comMana(s, 'UU');
  const of = legais(s, 0, a => a.t === 'cast' && a.oid === ma);
  const pares = [...new Set(of.map(a => `${a.exilaMao || 0}:${a.x}`))].sort();
  // sem exilar: X até 1 ({1}{U}); exilando 1: X até 3; exilando 2: X de 3 a 5 (com X 2 ou menos, a segunda carta não reduz nada)
  assert.deepEqual(pares, ['0:0', '0:1', '1:1', '1:2', '1:3', '2:3', '2:4', '2:5'].sort());
  assert.ok(of.filter(a => a.x === 2 && a.exilaMao === 1).some(a => (a.targets || []).length === 2), '"up to X target creatures": com X 2, até duas, de qualquer jogador');
  // conjura com X 3 exilando duas: paga só {U}; depois escolhe as duas azuis (o raio não serve)
  const c = of.find(a => a.x === 3 && a.exilaMao === 2 && (a.targets || []).length === 2 && a.targets.some(t => t.oid === c1) && a.targets.some(t => t.oid === c2));
  assert.throws(() => act(s, { ...c, exilaMao: 3 }), /exile da mão/, 'só duas azuis na mão: não dá para exilar três');
  s = act(s, c);
  assert.equal(s.players[0].pool.U, 1, 'X 3 − 4 de desconto: o genérico vai a zero, sobra {U}');
  assert.equal(s.pending.kind, 'pick'); assert.equal(s.pending.label, 'exilar da mão'); assert.deepEqual(J(s.pending.from).sort(), [a1, a2].sort());
  s = act(s, { t: 'pick', p: 0, oid: a1 }); s = act(s, { t: 'pick', p: 0, oid: a2 });
  assert.equal(s.objects[a1].zone, 'exile'); assert.equal(s.objects[a2].zone, 'exile'); assert.equal(s.objects[bolt].zone, 'hand');
  s = tudo(s);
  assert.ok(s.objects[c1].phasedOut && s.objects[c2].phasedOut, 'as duas saem de fase');
});

test('M-267 · March of Swirling Mist: o desconto nunca deixa o custo abaixo de {U} nem devolve mana (ruling)', () => {
  let s = mesa(['March of Swirling Mist', 'Faerie Seer', 'Thraben Inspector'], []), ma, a1, c1;
  [s, ma] = poe(s, 0, 'March of Swirling Mist', 'hand'); [s, a1] = poe(s, 0, 'Faerie Seer', 'hand'); [s, c1] = poe(s, 0, 'Thraben Inspector'); s = soNaMao(s, 0, [ma, a1]);
  s = comMana(s, 'UC');
  const c = legais(s, 0, a => a.t === 'cast' && a.oid === ma && a.exilaMao === 1 && a.x === 1 && (a.targets || []).length === 1)[0];
  s = act(s, c);
  assert.equal(s.players[0].pool.U, 0, 'pagou o {U}'); assert.equal(s.players[0].pool.C, 1, 'X 1 com desconto 2: o genérico vai a zero, o {C} sobra (não volta mana a mais)');
  const tot = Object.values(s.players[0].pool).reduce((a, b) => a + b, 0); assert.equal(tot, 1);
  assert.ok(J(S.validateScript({ name: 'T', exilaDaMao: { cor: 'X', reduz: 2 }, effects: [{ do: 'draw', amount: 1 }], example: { target: 'none', expect: { handDelta: 1 } } })).some(e => /exilar da mão precisa/.test(e)));
});

test('M-267 · Expressive Iteration: uma para a mão, uma para o fundo, a última para o exílio — e só pode ser jogada neste turno', () => {
  let s = mesa(['Expressive Iteration', 'Lightning Bolt', 'Faerie Seer', 'Thraben Inspector'], []), ei;
  [s, ei] = poe(s, 0, 'Expressive Iteration', 'hand');
  s = J(s); const topo3 = s.zones[0].library.slice(0, 3);
  // o topo: um raio, uma Faerie Seer e uma Plains (terreno também pode ser jogado do exílio, se houver jogada de terreno)
  const nomes = ['Lightning Bolt', 'Faerie Seer', 'Plains'];
  topo3.forEach((oid, i) => { s.objects[oid].name = nomes[i]; });
  s = comMana(s, 'URR');
  s = ateEscolha(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === ei)[0]));
  assert.equal(s.pending.label, 'repartir hand'); assert.deepEqual(J(s.pending.from), topo3); assert.equal(s.pending.max, 1); assert.equal(s.pending.min, 1);
  s = act(s, { t: 'pick', p: 0, oid: topo3[1] }); // Faerie Seer para a mão
  assert.equal(s.pending.label, 'repartir library-bottom'); assert.deepEqual(J(s.pending.from).sort(), [topo3[0], topo3[2]].sort());
  s = act(s, { t: 'pick', p: 0, oid: topo3[2] }); // Plains para o fundo
  s = tudo(s);
  assert.equal(s.objects[topo3[1]].zone, 'hand'); assert.equal(s.zones[0].library.at(-1), topo3[2], 'no fundo');
  assert.equal(s.objects[topo3[0]].zone, 'exile', 'o raio vai sozinho para o exílio');
  assert.ok(legais(s, 0, a => a.t === 'cast' && a.oid === topo3[0]).length > 0, 'pode conjurar o raio exilado neste turno (pagando)');
  const depois = passaAte(s, x => x.turn.active === 1);
  assert.equal(depois.objects[topo3[0]].playableFromExile, undefined, 'no turno seguinte, não'); assert.equal(depois.objects[topo3[0]].zone, 'exile', 'e continua exilada');
  assert.equal(T.descreveEfeitos(S.SCRIPTS['Expressive Iteration'].effects), 'olha as 3 cartas de cima e põe uma em cada destino, em ordem: mão, fundo do grimório, exílio (pode jogá-la neste turno)');
});

test('M-267 · Expressive Iteration com duas cartas no grimório: uma para a mão, a outra para o fundo, nenhuma exilada (ruling)', () => {
  let s = mesa(['Expressive Iteration'], []), ei;
  [s, ei] = poe(s, 0, 'Expressive Iteration', 'hand');
  s = J(s); const lib = s.zones[0].library; for (const oid of lib.splice(2)) { s.objects[oid].zone = 'exile'; s.zones[0].exile.push(oid); }
  const [x1, x2] = lib.slice(); const exilio = s.zones[0].exile.length;
  s = comMana(s, 'UR');
  s = ateEscolha(act(s, legais(s, 0, a => a.t === 'cast' && a.oid === ei)[0]));
  s = tudo(act(s, { t: 'pick', p: 0, oid: x2 }));
  assert.equal(s.objects[x2].zone, 'hand'); assert.equal(s.objects[x1].zone, 'library'); assert.equal(s.zones[0].exile.length, exilio, 'nada exilado');
  assert.equal(s.pending, null);
});
