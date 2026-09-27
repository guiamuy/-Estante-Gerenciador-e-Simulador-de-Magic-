// Camada 1 · B2 · avaliador de posição e arcabouço de decisão do bot.
// O avaliador é a base dos dois níveis: se ele mentir, "profissional" vira
// aleatório com sorte. Aqui cada parcela é provada isolada, a nota é provada
// antissimétrica (o que é bom para mim é ruim para o outro na mesma medida) e
// a decisão é provada determinística, inclusive quando o tempo acaba.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
const { engine: E, bot: B } = loadModules();
const J = x => JSON.parse(JSON.stringify(x));
const act = (s, a) => E.apply(s, a).state;

const cre = (name, p, t, kw = []) => ({ name, type_line: 'Creature — Soldier', mana_cost: '{1}', cmc: 1, colors: ['W'],
  power: String(p), toughness: String(t), keywords: kw, oracle_text: kw.join(', ') });
const CARDS = {
  Floresta: { name: 'Floresta', type_line: 'Basic Land — Forest', mana_cost: '', cmc: 0, colors: [], keywords: [], oracle_text: '{T}: Add {G}.' },
  Urso: cre('Urso', 2, 2),
  Gigante: cre('Gigante', 5, 5),
  Totem: { name: 'Totem', type_line: 'Artifact', mana_cost: '{2}', cmc: 2, colors: [], keywords: [], oracle_text: '' },
  Lampejo: { name: 'Lampejo', type_line: 'Sorcery', mana_cost: '{1}', cmc: 1, colors: ['G'], keywords: [], oracle_text: 'Draw a card.' }
};
const SCRIPTS = { Lampejo: { name: 'Lampejo', effects: [{ do: 'draw', amount: 1 }], flashback: { mana: '{2}' },
  example: { target: 'none', expect: { handDelta: 1 } } } };
const DECK = [{ name: 'Floresta', qty: 20, zone: 'main' }, { name: 'Urso', qty: 10, zone: 'main' },
  { name: 'Gigante', qty: 5, zone: 'main' }, { name: 'Totem', qty: 5, zone: 'main' }, { name: 'Lampejo', qty: 5, zone: 'main' }];

function mesa(seed = 3) {
  let s = E.createGame({ format: 'livre', seed, mode: 'assisted', manaCheck: false, cards: CARDS, scripts: SCRIPTS,
    players: [{ name: 'A', deck: DECK }, { name: 'B', deck: DECK }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  return s;
}
/** Move uma carta do grimório para onde o cenário precisa. */
function poe(s, p, nome, zona = 'battlefield', extra = {}) {
  s = J(s);
  const oid = s.zones[p].library.find(o => s.objects[o].name === nome);
  s.zones[p].library.splice(s.zones[p].library.indexOf(oid), 1);
  s.zones[p][zona].push(oid);
  Object.assign(s.objects[oid], { zone: zona, sick: false, tapped: false }, extra);
  return [s, oid];
}
const nota = (s, p) => B.avalia(s, p).nota;

test('B2 · a nota é antissimétrica: o que me favorece desfavorece o outro na mesma medida', () => {
  let s = mesa(3); const a = s.turn.active, d = 1 - a;
  [s] = poe(s, a, 'Gigante'); [s] = poe(s, d, 'Urso'); [s] = poe(s, a, 'Totem');
  s = J(s); s.players[a].life = 17; s.players[d].life = 11;
  assert.equal(nota(s, a), -nota(s, d), 'a mesma posição vista dos dois lados soma zero');
  assert.equal(nota(s, a) > 0, true, 'quem está na frente tem nota positiva');
});

test('B2 · cada parcela mede o que promete', () => {
  let s = mesa(4); const a = s.turn.active, d = 1 - a;
  const base = B.avalia(s, a);

  // vida
  let vida = J(s); vida.players[a].life += 5;
  assert.equal(B.avalia(vida, a).parcelas.vida - base.parcelas.vida, 5 * B.PESOS.vida);
  let dano = J(s); dano.players[d].life -= 5;
  assert.equal(B.avalia(dano, a).parcelas.vidaDele - base.parcelas.vidaDele, 5 * B.PESOS.vidaDele);

  // criatura em campo: corpo, poder e resistência
  let comUrso; [comUrso] = poe(s, a, 'Urso');
  const cu = B.avalia(comUrso, a).parcelas;
  assert.equal(cu.criaturas - base.parcelas.criaturas, B.PESOS.criatura);
  assert.equal(cu.poder - base.parcelas.poder, 2 * B.PESOS.poder);
  assert.equal(cu.resistencia - base.parcelas.resistencia, 2 * B.PESOS.resistencia);

  // marcadores contam além do poder que eles já dão
  let comMarcador = J(comUrso);
  const urso = comMarcador.zones[a].battlefield.find(o => comMarcador.objects[o].name === 'Urso');
  comMarcador.objects[urso].counters = { p1p1: 2 };
  const cm = B.avalia(comMarcador, a).parcelas;
  assert.equal(cm.marcadores - cu.marcadores, 2 * B.PESOS.marcador);
  assert.equal(cm.poder - cu.poder, 2 * B.PESOS.poder, 'o marcador também aumenta o poder');

  // outra permanente
  let comTotem; [comTotem] = poe(s, a, 'Totem');
  assert.equal(B.avalia(comTotem, a).parcelas.outras - base.parcelas.outras, B.PESOS.outraPermanente);

  // carta na mão
  let comCarta; [comCarta] = poe(s, a, 'Urso', 'hand');
  assert.equal(B.avalia(comCarta, a).parcelas.mao - base.parcelas.mao, B.PESOS.mao);

  // fonte de mana desvirada, e virada não conta
  let comTerreno, terreno; [comTerreno, terreno] = poe(s, a, 'Floresta');
  assert.equal(B.avalia(comTerreno, a).parcelas.mana - base.parcelas.mana, B.PESOS.mana);
  let virado = J(comTerreno); virado.objects[terreno].tapped = true;
  assert.equal(B.avalia(virado, a).parcelas.mana, base.parcelas.mana, 'terreno virado não é mana disponível');

  // carta no cemitério que sabe voltar
  let cemiterio; [cemiterio] = poe(s, a, 'Lampejo', 'graveyard');
  assert.equal(B.avalia(cemiterio, a).parcelas.volta - base.parcelas.volta, B.PESOS.volta);
  let lixo; [lixo] = poe(s, a, 'Urso', 'graveyard');
  assert.equal(B.avalia(lixo, a).parcelas.volta, base.parcelas.volta, 'criatura sem retorno não conta');
});

test('B2 · partida decidida domina qualquer outra parcela', () => {
  let s = mesa(5); const a = s.turn.active, d = 1 - a;
  [s] = poe(s, d, 'Gigante'); [s] = poe(s, d, 'Gigante');
  const antes = nota(s, a);
  let ganhei = J(s); ganhei.players[d].lost = true;
  assert.equal(B.avalia(ganhei, a).parcelas.vitoria, B.PESOS.vitoria);
  assert.equal(nota(ganhei, a) > antes + 1000, true, 'vencer vale mais que qualquer tábua');
  let perdi = J(s); perdi.players[a].lost = true;
  assert.equal(nota(perdi, a) < antes - 1000, true, 'perder também');
});

test('B2 · a nota não depende da ordem dos objetos nem da chamada', () => {
  let s = mesa(6); const a = s.turn.active;
  [s] = poe(s, a, 'Urso'); [s] = poe(s, a, 'Gigante'); [s] = poe(s, a, 'Totem'); [s] = poe(s, a, 'Floresta');
  const n1 = nota(s, a), n2 = nota(s, a);
  assert.equal(n1, n2, 'duas chamadas, mesma nota');
  const embaralhado = J(s);
  embaralhado.zones[a].battlefield.reverse();
  assert.equal(nota(embaralhado, a), n1, 'o campo em outra ordem dá a mesma nota');
});

test('B2 · simular não muda o estado recebido, e ação ilegal devolve nulo', () => {
  let s = mesa(7); const a = s.turn.active;
  let terreno; [s, terreno] = poe(s, a, 'Floresta', 'hand');
  const antes = JSON.stringify(s);
  const r = B.simula(s, { t: 'play_land', p: a, oid: terreno });
  assert.ok(r && r.estado, 'a jogada legal simula');
  assert.equal(JSON.stringify(s), antes, 'o estado original ficou intacto');
  assert.equal(r.estado.objects[terreno].zone, 'battlefield', 'o terreno entrou no estado simulado');
  assert.equal(B.simula(s, { t: 'play_land', p: a, oid: 'nao-existe' }), null, 'jogada ilegal devolve nulo');
  assert.equal(JSON.stringify(s), antes, 'e nem assim o estado muda');
});

test('B2 · escolher: pega a melhor, desempata estável e respeita o orçamento', () => {
  const candidatas = [
    { t: 'cast', p: 0, oid: 'c' }, { t: 'cast', p: 0, oid: 'a' },
    { t: 'cast', p: 0, oid: 'b' }, { t: 'pass', p: 0 }
  ];
  const notas = { a: 1, b: 5, c: 3 };
  const r = B.escolhe(candidatas, x => notas[x.oid] || 0);
  assert.equal(r.acao.oid, 'b', 'escolheu a de maior nota');
  assert.equal(r.vistas, 4);
  assert.equal(r.cortou, false);

  // empate: fica com a primeira em ordem estável, e a ordem de entrada não muda nada
  const empate = B.escolhe(candidatas, () => 1).acao;
  const empateOutraOrdem = B.escolhe([...candidatas].reverse(), () => 1).acao;
  assert.equal(B.chaveAcao(empate), B.chaveAcao(empateOutraOrdem), 'mesmo empate, mesma escolha');

  // orçamento: o relógio entra por parâmetro, então o corte é reproduzível
  let t = 0;
  const cortado = B.escolhe(candidatas, x => { t += 100; return notas[x.oid] || 0; }, { orcamentoMs: 150, agora: () => t });
  assert.equal(cortado.cortou, true, 'o tempo acabou no meio');
  assert.equal(cortado.vistas < cortado.total, true, 'não avaliou todas');
  assert.ok(cortado.acao, 'mesmo assim devolveu a melhor até ali');
});

test('B2 · desempenho: mil avaliações em menos de 50 ms', () => {
  let s = mesa(8); const a = s.turn.active, d = 1 - a;
  for (let i = 0; i < 4; i++) { [s] = poe(s, a, 'Urso'); [s] = poe(s, d, 'Urso'); }
  [s] = poe(s, a, 'Floresta'); [s] = poe(s, a, 'Floresta'); [s] = poe(s, a, 'Totem');
  const t0 = Date.now();
  for (let i = 0; i < 1000; i++) B.avalia(s, a);
  const gasto = Date.now() - t0;
  assert.equal(gasto < 50, true, `mil avaliações levaram ${gasto} ms`);
});
