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

test('B2 · desempenho: a avaliação cabe no orçamento de meio segundo', () => {
  let s = mesa(8); const a = s.turn.active, d = 1 - a;
  for (let i = 0; i < 4; i++) { [s] = poe(s, a, 'Urso'); [s] = poe(s, d, 'Urso'); }
  [s] = poe(s, a, 'Floresta'); [s] = poe(s, a, 'Floresta'); [s] = poe(s, a, 'Totem');
  for (let i = 0; i < 200; i++) B.avalia(s, a); // aquecimento
  const t0 = Date.now();
  for (let i = 0; i < 1000; i++) B.avalia(s, a);
  const gasto = Date.now() - t0;
  // O alvo da história é 1 000 avaliações abaixo de 50 ms, e é isso que acontece
  // com a máquina livre (~10 ms aqui). O portão roda os arquivos de teste em
  // paralelo, então o relógio de parede sobe sem o código ter piorado: o limite
  // cobrado aqui é 200 ms, que ainda garante mais de 2 500 avaliações dentro do
  // orçamento de 500 ms de uma jogada. Justificativa registrada na B2 do ROADMAP.
  assert.equal(gasto < 200, true, `mil avaliações levaram ${gasto} ms`);
});

/* ---------------- B3 · bot amador experiente ---------------- */
const CARDS3 = {
  ...CARDS,
  Matar: { name: 'Matar', type_line: 'Instant', mana_cost: '{1}', cmc: 1, colors: ['B'], keywords: [], oracle_text: 'Destroy target creature.' },
  Muro: cre('Muro', 0, 4, ['Defender'])
};
const SCRIPTS3 = { ...SCRIPTS, Matar: { name: 'Matar', effects: [{ do: 'destroy', target: 'creature' }],
  example: { target: 'enemy-creature', expect: { gone: true } } } };
const DECK3 = [{ name: 'Floresta', qty: 20, zone: 'main' }, { name: 'Urso', qty: 8, zone: 'main' },
  { name: 'Gigante', qty: 6, zone: 'main' }, { name: 'Totem', qty: 4, zone: 'main' },
  { name: 'Lampejo', qty: 4, zone: 'main' }, { name: 'Matar', qty: 4, zone: 'main' }, { name: 'Muro', qty: 4, zone: 'main' }];
function mesa3(seed = 9, manaCheck = false) {
  let s = E.createGame({ format: 'livre', seed, mode: 'assisted', manaCheck, cards: CARDS3, scripts: SCRIPTS3,
    players: [{ name: 'A', deck: DECK3 }, { name: 'B', deck: DECK3 }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  return s;
}
const passaAte = (s, passo) => { for (let i = 0; i < 60 && s.turn.step !== passo; i++) s = act(s, { t: 'pass', p: s.turn.priority }); return s; };
/** Mão vazia: o cenário decide o que o bot tem para jogar. */
function esvaziaMao(s, p) {
  s = J(s);
  for (const oid of s.zones[p].hand.slice()) {
    s.zones[p].hand.splice(s.zones[p].hand.indexOf(oid), 1);
    s.zones[p].library.push(oid); s.objects[oid].zone = 'library';
  }
  return s;
}
const bot = B.criaBot({ nivel: 'amador' }); // U10 · o padrão virou o Shark; estes testes são do sparring (B3)

test('B3 · baixa terreno e põe criatura em campo, dizendo o que fez', () => {
  let s = mesa3(11, true); const a = s.turn.active;   // com cobrança de mana, a curva importa
  s = esvaziaMao(s, a);
  let terreno; [s, terreno] = poe(s, a, 'Floresta', 'hand');
  const j1 = bot.jogada(s, a);
  assert.equal(j1.acao.t, 'play_land', 'com terreno na mão, baixa o terreno');
  assert.match(j1.motivo, /baixei/);
  s = act(s, j1.acao);
  let urso; [s, urso] = poe(s, a, 'Urso', 'hand');
  const j2 = bot.jogada(s, a);
  assert.equal(j2.acao.t, 'cast', 'depois conjura a criatura');
  assert.equal(j2.acao.oid, urso);
  assert.match(j2.motivo, /conjurei Urso/);
});

test('B3 · prefere a criatura maior quando pode escolher', () => {
  let s = mesa3(12); const a = s.turn.active;
  s = esvaziaMao(s, a);
  let urso, gigante;
  [s, urso] = poe(s, a, 'Urso', 'hand');
  [s, gigante] = poe(s, a, 'Gigante', 'hand');
  const j = bot.jogada(s, a);
  assert.equal(j.acao.oid, gigante, 'o 5/5 vale mais que o 2/2');
});

test('B3 · remoção vai na maior ameaça, não na primeira criatura', () => {
  let s = mesa3(13); const a = s.turn.active, d = 1 - a;
  [s] = poe(s, d, 'Urso');
  let gigante; [s, gigante] = poe(s, d, 'Gigante');
  [s] = poe(s, d, 'Urso');
  s = esvaziaMao(s, a);
  let matar; [s, matar] = poe(s, a, 'Matar', 'hand');
  const j = bot.jogada(s, a);
  assert.equal(j.acao.t, 'cast');
  assert.equal(j.acao.oid, matar);
  assert.equal(j.acao.targets[0].oid, gigante, 'matou o 5/5, não o 2/2');
  assert.match(j.motivo, /conjurei Matar em Gigante/);
});

test('B3 · ataca quando não há bloqueador, e fica em casa quando a troca é ruim', () => {
  let s = mesa3(14); const a = s.turn.active, d = 1 - a;
  let urso; [s, urso] = poe(s, a, 'Urso');
  let semBloqueio = passaAte(s, 'combat_attackers');
  const j1 = bot.jogada(semBloqueio, a);
  assert.deepEqual(J(j1.acao.attackers), [urso], 'sem bloqueador, ataca');
  assert.match(j1.motivo, /ataquei/);

  // com um 5/5 do outro lado, o 2/2 fica em casa
  let comGigante; [comGigante] = poe(s, d, 'Gigante');
  comGigante = passaAte(comGigante, 'combat_attackers');
  const j2 = bot.jogada(comGigante, a);
  assert.deepEqual(J(j2.acao.attackers), [], 'com bloqueio que mata de graça, não ataca');
  assert.match(j2.motivo, /não ataquei/);

  // mas se o ataque fecha a partida, vai de qualquer jeito
  let letal = J(s); letal.players[d].life = 2;
  letal = passaAte(letal, 'combat_attackers');
  const j3 = bot.jogada(letal, a);
  assert.deepEqual(J(j3.acao.attackers), [urso], 'com letal na mesa, ataca');
  assert.match(j3.motivo, /fecha a partida/);
});

test('B3 · bloqueia a troca boa e segura o dano quando a vida está no fim', () => {
  let s = mesa3(15); const a = s.turn.active, d = 1 - a;
  let atacante; [s, atacante] = poe(s, a, 'Urso');       // 2/2 ataca
  let muro; [s, muro] = poe(s, d, 'Muro');               // 0/4 defensor: aguenta e não morre
  s = passaAte(s, 'combat_attackers');
  s = act(s, { t: 'attack', p: a, attackers: [atacante] });
  for (let i = 0; i < 10 && !(s.pending && s.pending.kind === 'blockers'); i++) s = act(s, { t: 'pass', p: s.turn.priority });
  const j = bot.jogada(s, d);
  assert.equal(j.acao.t, 'block');
  assert.equal(j.acao.blocks.length, 0, 'o muro não mata o urso: sem troca, deixa passar 2');

  // agora com a vida no fim: bloquear vira obrigação
  let quaseMorto = J(s); quaseMorto.players[d].life = 2;
  const j2 = bot.jogada(quaseMorto, d);
  assert.equal(j2.acao.blocks.length, 1, 'com 2 de vida, bloqueia para não morrer');
  assert.deepEqual(J(j2.acao.blocks[0]), [muro, atacante]);
  assert.match(j2.motivo, /não morrer/);
});

test('B3 · no turno do oponente, guarda a resposta em vez de gastar à toa', () => {
  let s = mesa3(16); const a = s.turn.active, d = 1 - a;
  s = esvaziaMao(s, d);
  let matar; [s, matar] = poe(s, d, 'Matar', 'hand');   // instantânea na mão de quem não é o turno
  [s] = poe(s, a, 'Urso');                              // alvo pequeno
  s = act(s, { t: 'pass', p: a });                      // agora a prioridade é dele
  const j = bot.jogada(s, d);
  assert.equal(j.acao.t, 'pass', 'não gasta a remoção num 2/2 no turno do outro');
  // com uma ameaça de verdade em campo, ele responde
  let comGigante; [comGigante] = poe(s, a, 'Gigante');
  const j2 = bot.jogada(comGigante, d);
  assert.equal(j2.acao.t, 'cast', 'contra o 5/5, vale gastar');
  assert.equal(j2.acao.oid, matar);
});

test('B3 · joga uma partida inteira sem nunca escolher ação ilegal', () => {
  let s = mesa3(17, true);
  const botA = B.criaBot({ nivel: 'amador' }), botB = B.criaBot({ nivel: 'amador' });
  let jogadas = 0;
  for (let i = 0; i < 600 && s.status === 'playing'; i++) {
    const quem = s.pending ? s.pending.p : s.turn.priority;
    const j = (quem === 0 ? botA : botB).jogada(s, quem);
    if (!j) break;
    s = act(s, j.acao); // lança se for ilegal
    jogadas++;
    assert.equal(typeof j.motivo, 'string');
    assert.equal(j.motivo.length > 0, true);
  }
  assert.equal(jogadas > 50, true, `o bot jogou ${jogadas} vezes sem ação ilegal`);
  assert.deepEqual(J(E.invariants(s)), [], 'o estado continua íntegro no fim');
});

/* ---------------- B4 · bot profissional ---------------- */
const pro = B.criaBot({ nivel: 'profissional' });

test('B4 · enxerga o ataque que fecha a partida por cima do bloqueio, onde o amador fica em casa', () => {
  // três 2/2 meus contra um 5/5 do oponente, que está com 3 de vida:
  // o amador vê "o 5/5 mata cada um de graça" e fica em casa;
  // o profissional conta o bloqueio provável — um morre, quatro de dano passam e fecha.
  let s = mesa3(31); const a = s.turn.active, d = 1 - a;
  let u1, u2, u3;
  [s, u1] = poe(s, a, 'Urso'); [s, u2] = poe(s, a, 'Urso'); [s, u3] = poe(s, a, 'Urso');
  [s] = poe(s, d, 'Gigante');
  s = J(s); s.players[d].life = 3;
  s = passaAte(s, 'combat_attackers');
  const amador = bot.jogada(s, a);
  assert.deepEqual(J(amador.acao.attackers), [], 'o amador fica em casa');
  const prof = pro.jogada(s, a);
  assert.equal(prof.acao.attackers.length, 3, 'o profissional ataca com todos');
  assert.match(prof.motivo, /bloqueio provável/);
  // e o ataque dele realmente ganha a partida
  let depois = act(s, prof.acao);
  for (let i = 0; i < 30 && depois.status === 'playing'; i++) {
    if (depois.pending && depois.pending.kind === 'blockers') {
      const b = B.decideBloqueio(depois, depois.pending.p);
      depois = act(depois, b.acao); continue;
    }
    if (depois.pending) break;
    if (depois.turn.step === 'main2') break;
    depois = act(depois, { t: 'pass', p: depois.turn.priority });
  }
  assert.equal(depois.players[d].life <= 0, true, 'o oponente foi a zero');
});

test('B4 · não ataca quando, depois do bloqueio provável, o ataque piora a posição', () => {
  let s = mesa3(32); const a = s.turn.active, d = 1 - a;
  let urso; [s, urso] = poe(s, a, 'Urso');      // 2/2 sozinho
  [s] = poe(s, d, 'Gigante');                   // 5/5 bloqueia e mata de graça
  s = passaAte(s, 'combat_attackers');
  const prof = pro.jogada(s, a);
  assert.deepEqual(J(prof.acao.attackers), [], 'ficou em casa');
  assert.match(prof.motivo, /me deixa pior/);
});

test('B4 · conta a resposta do oponente antes de decidir', () => {
  let s = mesa3(33, true); const a = s.turn.active, d = 1 - a;
  s = esvaziaMao(s, a); s = esvaziaMao(s, d);
  // eu tenho uma criatura para conjurar; o oponente tem a remoção e o mana para usar
  [s] = poe(s, a, 'Floresta'); [s] = poe(s, a, 'Floresta');
  [s] = poe(s, d, 'Floresta'); [s] = poe(s, d, 'Floresta');
  let gigante; [s, gigante] = poe(s, a, 'Gigante', 'hand');
  [s] = poe(s, d, 'Matar', 'hand');
  const nota = B.notaComResposta(s, a, {});
  const base = B.avalia(s, a).nota;
  assert.equal(nota <= base, true, 'a melhor resposta do oponente nunca melhora a minha posição');
  // a jogada segue sendo conjurar (é o que eu tenho), mas a nota já desconta a remoção
  const j = pro.jogada(s, a);
  assert.equal(j.acao.t, 'cast');
  assert.equal(j.acao.oid, gigante);
});

test('B4 · mesma posição, mesma jogada: a decisão é determinística', () => {
  let s = mesa3(34, true); const a = s.turn.active;
  const j1 = pro.jogada(s, a), j2 = pro.jogada(J(s), a);
  assert.equal(B.chaveAcao(j1.acao), B.chaveAcao(j2.acao), 'duas consultas, mesma jogada');
});

test('B4 · respeita o orçamento de tempo e ainda devolve jogada', () => {
  let s = mesa3(35, true); const a = s.turn.active;
  let t = 0;
  const apressado = B.criaBot({ nivel: 'profissional', orcamentoMs: 1, agora: () => (t += 5) });
  const j = apressado.jogada(s, a);
  assert.ok(j && j.acao, 'com o tempo estourado, devolve a melhor até ali');
});

test('B4 · joga uma partida inteira contra o amador sem ação ilegal', () => {
  let s = mesa3(36, true);
  const botA = B.criaBot({ nivel: 'profissional' }), botB = B.criaBot({ nivel: 'amador' });
  let jogadas = 0;
  for (let i = 0; i < 600 && s.status === 'playing'; i++) {
    const quem = s.pending ? s.pending.p : s.turn.priority;
    const j = (quem === 0 ? botA : botB).jogada(s, quem);
    if (!j) break;
    s = act(s, j.acao);
    jogadas++;
  }
  assert.equal(jogadas > 50, true, `foram ${jogadas} jogadas sem nenhuma ilegal`);
  assert.deepEqual(J(E.invariants(s)), [], 'estado íntegro no fim');
});

/* ---------------- B7 · didática ---------------- */
test('B7 · o resumo do turno do bot cabe em três linhas e fala dele, não comigo', () => {
  const r = B.resumoDoTurno(['baixei Floresta', 'conjurei Urso', 'conjurei Alce',
    'ataquei com 2: nenhum bloqueio me mata de graça', 'passei: nada melhorava a posição']);
  assert.equal(r.length <= 3, true, 'no máximo três linhas');
  assert.equal(r[0], 'Baixou um terreno.');
  assert.equal(r[1], 'Conjurou Urso, Alce.');
  assert.match(r[2], /^Atacou com 2/, 'a voz é de terceira pessoa');
  assert.equal(r.some(l => /passei/i.test(l)), false, 'passar não vira linha de resumo');

  assert.deepEqual(J(B.resumoDoTurno([])), ['Não fez nada neste turno.']);
  assert.deepEqual(J(B.resumoDoTurno(['não bloqueei: o dano não me mata e não há troca boa'])),
    ['Não bloqueou: o dano não me mata e não há troca boa.']);
  const muitas = B.resumoDoTurno(['baixei Floresta', 'conjurei Urso', 'usei a habilidade de Totem',
    'ataquei com 1: nenhum bloqueio me mata de graça', 'bloqueei 1: a troca me favorece']);
  assert.equal(muitas.length, 3, 'com cinco jogadas, corta em três linhas');
});

test('B7 · as dicas mostram as melhores jogadas que ainda estão na mesa', () => {
  let s = mesa3(41, true); const a = s.turn.active, d = 1 - a;
  s = esvaziaMao(s, a);
  [s] = poe(s, a, 'Floresta'); [s] = poe(s, a, 'Floresta'); [s] = poe(s, a, 'Floresta');
  [s] = poe(s, d, 'Gigante');
  let matar, urso;
  [s, matar] = poe(s, a, 'Matar', 'hand');
  [s, urso] = poe(s, a, 'Urso', 'hand');
  const dicas = B.dicas(s, a, { quantas: 2 });
  assert.equal(dicas.length, 2, 'duas dicas');
  assert.equal(dicas[0].ganho >= dicas[1].ganho, true, 'a melhor vem primeiro');
  assert.equal(dicas[0].acao.oid, matar, 'tirar o 5/5 é a melhor jogada da mesa');
  assert.match(dicas[0].motivo, /conjurei Matar em Gigante/);
  assert.equal(dicas.every(x => x.ganho > 0), true, 'só entra o que melhora de verdade');

  // sem nada para fazer, não inventa dica
  let vazio = mesa3(42, true); const b = vazio.turn.active;
  vazio = esvaziaMao(vazio, b);
  assert.deepEqual(J(B.dicas(vazio, b)), [], 'mão vazia e sem habilidade: nenhuma dica');
});

// Leva 115 · Shark v3: mulligan, truque de combate pelo resultado, corrida.
/** Estado na mão inicial, com a mão do jogador p trocada por `nomes` (as cartas vêm do grimório dele). */
function maoInicial(nomes, { p = 0, mulligans = 0 } = {}) {
  let s = J(E.createGame({ format: 'livre', seed: 5, mode: 'full', manaCheck: true, cards: { ...CARDS, Gigante: { ...CARDS.Gigante, mana_cost: '{4}{W}', cmc: 5 } }, scripts: SCRIPTS, players: [{ name: 'A', deck: DECK }, { name: 'B', deck: DECK }] }));
  const z = s.zones[p];
  for (const oid of z.hand) { s.objects[oid].zone = 'library'; z.library.push(oid); }
  z.hand = [];
  for (const n of nomes) { const oid = z.library.find(o => s.objects[o].name === n); z.library.splice(z.library.indexOf(oid), 1); z.hand.push(oid); s.objects[oid].zone = 'hand'; }
  s.players[p].mulligans = mulligans;
  return s;
}
const F = 'Floresta', U = 'Urso', G = 'Gigante';

test('Leva 115 · mulligan: sem terreno, um terreno, só terreno ou seis terrenos não fica; mão jogável fica', () => {
  const decide = nomes => J(B.decideMulligan(maoInicial(nomes), 0));
  assert.equal(decide([U, U, U, U, G, G, G]).acao.t, 'mulligan', 'sem terreno');
  assert.match(decide([U, U, U, U, G, G, G]).motivo, /sem terreno/);
  assert.equal(decide([F, U, U, U, U, G, G]).acao.t, 'mulligan', 'um terreno');
  assert.equal(decide([F, F, F, F, F, F, F]).acao.t, 'mulligan', 'só terreno');
  assert.equal(decide([F, F, F, F, F, F, U]).acao.t, 'mulligan', 'seis terrenos');
  assert.equal(decide([F, F, G, G, G, G, G]).acao.t, 'mulligan', 'dois terrenos e nada que eles paguem');
  assert.deepEqual([decide([F, F, U, U, U, G, G]).acao.t, decide([F, F, F, U, U, G, G]).acao.t, decide([F, F, F, F, U, U, G]).acao.t, decide([F, F, F, F, F, U, U]).acao.t], ['keep', 'keep', 'keep', 'keep']);
});

test('Leva 115 · mulligan: escolhe o que vai para o fundo (terreno sobrando, depois a mágica mais cara) e para no terceiro', () => {
  // um mulligan feito, sete cartas na mão: uma vai para o fundo
  let s = maoInicial([F, F, F, F, F, U, U], { mulligans: 1 });
  let d = B.decideMulligan(s, 0);
  assert.equal(d.acao.t, 'keep'); assert.equal(d.acao.bottom.length, 1);
  assert.equal(s.objects[d.acao.bottom[0]].name, F, 'cinco terrenos: um deles desce');
  s = maoInicial([F, F, U, U, U, G, G], { mulligans: 1 });
  d = B.decideMulligan(s, 0);
  assert.equal(s.objects[d.acao.bottom[0]].name, G, 'dois terrenos: desce a mágica mais cara, não o terreno');
  assert.doesNotThrow(() => E.apply(s, d.acao), 'a ação é legal para o motor');
  // três mulligans feitos: fica com o que vier, mesmo ruim, e manda três para o fundo
  s = maoInicial([U, U, U, U, G, G, G], { mulligans: 3 });
  d = B.decideMulligan(s, 0);
  assert.equal(d.acao.t, 'keep'); assert.equal(d.acao.bottom.length, 3);
  assert.equal(B.criaBot({ nivel: 'shark-v2' }).mulligan(maoInicial([U, U, U, U, G, G, G]), 0).acao.t, 'keep', 'a versão anterior continua mantendo sempre');
  assert.equal(B.criaBot({ nivel: 'shark' }).mulligan(maoInicial([U, U, U, U, G, G, G]), 0).acao.t, 'mulligan');
});

test('Leva 115 · corrida: o contra-ataque que mata pesa; com bloqueador desvirado para cada atacante, não', () => {
  let s = mesa(); const a = s.turn.active, d = 1 - a; let x;
  [s] = poe(s, d, 'Gigante'); [s] = poe(s, d, 'Gigante');
  s = J(s); s.players[a].life = 9;
  assert.equal(B.riscoDeVolta(s, a), 400, 'dois 5/5 do outro lado, 9 de vida e ninguém para bloquear');
  [s, x] = poe(s, a, 'Urso');
  assert.equal(B.riscoDeVolta(s, a), 0, 'um bloqueador segura um Gigante: passam 5, não morro');
  s = J(s); s.objects[x].tapped = true;
  assert.equal(B.riscoDeVolta(s, a), 400, 'o bloqueador virado (atacou) não segura ninguém');
});

test('Leva 115 · bônus até o fim do turno não conta na nota parada (v3); a v2 contava', () => {
  let s = mesa(); const a = s.turn.active; let u;
  [s, u] = poe(s, a, 'Urso');
  const antes2 = B.avaliaV2(s, a).nota, antes3 = B.avaliaV3(s, a).nota;
  s = J(s); s.objects[u].pump = { p: 3, t: 3 };
  assert.ok(B.avaliaV2(s, a).nota > antes2, 'v2: +3/+3 temporário parecia ganho permanente');
  assert.equal(B.avaliaV3(s, a).nota, antes3, 'v3: só vale pelo que causar no combate');
});

test('Leva 115 · mana que ia sobrar: na segunda fase principal o v3 conjura a compra que troca uma carta por outra; o v2 passava', () => {
  const cards = { ...CARDS, Troca: { name: 'Troca', type_line: 'Sorcery', mana_cost: '{1}', cmc: 1, colors: ['G'], keywords: [], oracle_text: 'Draw a card.' } };
  const scripts = { Troca: { name: 'Troca', effects: [{ do: 'draw', amount: 1 }], example: { target: 'none', expect: { handDelta: 1 } } } };
  const deck = [{ name: 'Floresta', qty: 30, zone: 'main' }, { name: 'Troca', qty: 30, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed: 3, mode: 'full', manaCheck: true, cards, scripts, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  s = J(s); const a = s.turn.active, z = s.zones[a];
  for (const oid of [...z.hand]) { z.hand.splice(z.hand.indexOf(oid), 1); z.library.push(oid); s.objects[oid].zone = 'library'; }
  const tira = (nome, para) => { const oid = z.library.find(o => s.objects[o].name === nome); z.library.splice(z.library.indexOf(oid), 1); z[para].push(oid); Object.assign(s.objects[oid], { zone: para, sick: false, tapped: false }); return oid; };
  tira('Floresta', 'battlefield'); tira('Floresta', 'battlefield'); const x = tira('Troca', 'hand');
  s.turn.step = 'main2'; s.turn.priority = a; s.players[a].landPlayed = true;
  const v3 = B.criaBot({ nivel: 'shark' }).jogada(s, a), v2 = B.criaBot({ nivel: 'shark-v2' }).jogada(s, a);
  assert.equal(v2.acao.t, 'pass', 'v2: comprar uma carta gastando uma carta não melhora a nota, então passava');
  assert.deepEqual([v3.acao.t, v3.acao.oid], ['cast', x]);
  assert.match(v3.motivo, /a mana ia sobrar/);
  // na primeira fase principal ele ainda espera (pode precisar da mana no combate)
  const cedo = J(s); cedo.turn.step = 'main1';
  assert.equal(B.criaBot({ nivel: 'shark' }).jogada(cedo, a).acao.t, 'pass');
});

test('Leva 115 · carta com escolha (Winding Way): o v3 enxerga o que ela rende e conjura; o v2 via só a carta saindo da mão', async () => {
  const { cartasReais, listas } = await import('./torneio.listas.mjs');
  const CR = cartasReais(), elfos = listas.find(l => /Elves/.test(l.name));
  const cards = {}; for (const e of elfos.entries) cards[e.name] = CR[e.name];
  let s = E.createGame({ format: 'pauper', seed: 31, mode: 'full', manaCheck: true, cards, players: [{ name: 'A', deck: elfos.entries }, { name: 'B', deck: elfos.entries }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  s = J(s); const a = s.turn.active, z = s.zones[a];
  const tira = (nome, para) => { const de = z.library.some(o => s.objects[o].name === nome) ? z.library : z.hand; const oid = de.find(o => s.objects[o].name === nome); de.splice(de.indexOf(oid), 1); z[para].push(oid); Object.assign(s.objects[oid], { zone: para, sick: false, tapped: false }); return oid; };
  for (const oid of [...z.hand]) { z.hand.splice(z.hand.indexOf(oid), 1); z.library.push(oid); s.objects[oid].zone = 'library'; }
  tira('Forest', 'battlefield'); tira('Forest', 'battlefield'); const ww = tira('Winding Way', 'hand');
  // o topo do grimório com quatro criaturas: a carta rende
  const criaturas = z.library.filter(o => s.facts[s.objects[o].name].types.includes('creature')).slice(0, 4);
  z.library = [...criaturas, ...z.library.filter(o => !criaturas.includes(o))];
  s.players[a].landPlayed = true;
  const v3 = B.criaBot({ nivel: 'shark' }).jogada(s, a), v2 = B.criaBot({ nivel: 'shark-v2' }).jogada(s, a);
  assert.deepEqual([v3.acao.t, v3.acao.oid], ['cast', ww], 'v3 conjura Winding Way');
  assert.notEqual(v2.acao.oid, ww, 'v2 deixava na mão');
  // e, na hora de escolher, pega as cartas em vez de encerrar sem pegar nada
  let t = act(s, v3.acao);
  for (let i = 0; i < 12 && !(t.pending && t.pending.kind === 'pick'); i++) { const j = t.pending ? B.criaBot({ nivel: 'shark' }).jogada(t, t.pending.p) : { acao: { t: 'pass', p: t.turn.priority } }; t = act(t, j.acao); }
  assert.equal(t.pending && t.pending.kind, 'pick');
  assert.equal(B.criaBot({ nivel: 'shark' }).jogada(t, a).acao.t, 'pick', 'pega carta (antes: encerrava a escolha vazia)');
});

// Leva 117 · informação justa: o Shark decide sobre mundos possíveis, nunca sobre a mão real do oponente.
/** A mesma posição em tudo que a mesa mostra, com outra mão para o oponente de p (cartas do grimório dele) e outra
    ordem nos dois grimórios. Cartas citadas pela decisão em curso ou pela pilha ficam onde estão. */
function outraMao(s, p, sal) {
  const c = J(s), d = 1 - p;
  let x = sal >>> 0; const rnd = () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 4294967296; };
  const mistura = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const cit = new Set((JSON.stringify([c.pending, c.stack.map(o => c.objects[o])]).match(/"o\d+"/g) || []).map(q => q.slice(1, -1)));
  const livres = lista => lista.map((o, i) => cit.has(o) ? -1 : i).filter(i => i >= 0);
  const zd = c.zones[d], lm = livres(zd.hand), lg = livres(zd.library);
  const monte = mistura([...lm.map(i => zd.hand[i]), ...lg.map(i => zd.library[i])]);
  lm.forEach((i, n) => { zd.hand[i] = monte[n]; c.objects[monte[n]].zone = 'hand'; });
  lg.forEach((i, n) => { zd.library[i] = monte[lm.length + n]; c.objects[monte[lm.length + n]].zone = 'library'; });
  const zp = c.zones[p], lp = livres(zp.library), meu = mistura(lp.map(i => zp.library[i])); lp.forEach((i, n) => { zp.library[i] = meu[n]; });
  c.rng = (c.rng ^ sal) >>> 0;
  return c;
}
const nomesDe = (s, lista) => lista.map(o => s.objects[o].name).sort();
const relogioParado = () => 0; // sem corte por tempo: a decisão não pode depender da máquina

async function partidaReal(a, b, seed) {
  const { cartasReais, listas } = await import('./torneio.listas.mjs');
  const CR = cartasReais(), d0 = listas[a], d1 = listas[b];
  const cards = {}; for (const e of [...d0.entries, ...d1.entries]) if (CR[e.name]) cards[e.name] = CR[e.name];
  return E.createGame({ format: 'pauper', seed, mode: 'full', manaCheck: true, cards, players: [{ name: 'P0', deck: d0.entries }, { name: 'P1', deck: d1.entries }] });
}
/** Joga a partida com o v3 congelado e chama `visita(s, quem, i)` antes de cada decisão. */
function percorre(s, passos, visita) {
  const bots = [B.criaBot({ nivel: 'shark-v3', agora: relogioParado }), B.criaBot({ nivel: 'shark-v3', agora: relogioParado })];
  for (let i = 0; i < passos && s.status !== 'over'; i++) {
    const q = s.status === 'mulligan' ? s.players.findIndex(pl => !pl.kept) : s.pending ? s.pending.p : s.turn.priority;
    if (s.status === 'mulligan') { s = act(s, bots[q].mulligan(s, q).acao); continue; }
    if (visita(s, q, i) === false) break;
    const j = bots[q].jogada(s, q); if (!j) break; s = act(s, j.acao);
  }
  return s;
}

test('Leva 117 · mundo possível: o que a mesa mostra fica igual; a mão do oponente e os grimórios são sorteados do que não foi visto', async () => {
  let s = await partidaReal(0, 3, 77);
  s = percorre(s, 40, () => true);
  const p = 0, d = 1, antes = JSON.stringify(s);
  const w = B.visaoDe(s, p, 0);
  assert.equal(JSON.stringify(s), antes, 'não muda o estado recebido');
  assert.deepEqual(w.zones[p].hand, s.zones[p].hand, 'minha mão é minha');
  for (const q of [0, 1]) for (const z of ['battlefield', 'graveyard', 'exile']) assert.deepEqual(w.zones[q][z], s.zones[q][z], `${z} é público`);
  assert.deepEqual(w.stack, s.stack);
  assert.equal(w.zones[d].hand.length, s.zones[d].hand.length, 'o tamanho da mão dele é público');
  assert.equal(w.zones[d].library.length, s.zones[d].library.length);
  assert.deepEqual(nomesDe(w, [...w.zones[d].hand, ...w.zones[d].library]), nomesDe(s, [...s.zones[d].hand, ...s.zones[d].library]), 'as cartas dele que eu não vi são as mesmas, só não sei onde estão');
  assert.deepEqual(nomesDe(w, w.zones[p].library), nomesDe(s, s.zones[p].library), 'sei o que resta no meu grimório');
  assert.notDeepEqual(w.zones[p].library, s.zones[p].library, 'mas não a ordem');
  assert.notEqual(w.rng, s.rng, 'nem a semente da partida');
  for (const oid of w.zones[d].hand) assert.equal(w.objects[oid].zone, 'hand');
  for (const oid of w.zones[d].library) assert.equal(w.objects[oid].zone, 'library');
  assert.deepEqual(E.invariants ? E.invariants(w) : [], E.invariants ? E.invariants(s) : [], 'o mundo sorteado é um estado válido');
  // a trava: duas posições iguais no que é público dão exatamente os mesmos mundos
  for (const k of [0, 1, 2]) for (const sal of [5, 99]) assert.equal(JSON.stringify(B.visaoDe(outraMao(s, p, sal), p, k)), JSON.stringify(B.visaoDe(s, p, k)));
  assert.notDeepEqual(B.visaoDe(s, p, 1).zones[d].hand, B.visaoDe(s, p, 0).zones[d].hand, 'cada mundo é um sorteio diferente');
  assert.equal(B.sementePublica(outraMao(s, p, 7)), B.sementePublica(s));
});

test('Leva 117 · o que a partida mostrou fica sabido: carta vista em campo que voltou para a mão não é sorteada; voltou ao grimório, esquece', async () => {
  let s = J(percorre(await partidaReal(0, 3, 77), 60, () => true));
  const p = 0, d = 1, z = s.zones[d];
  const vistas = new Set();
  assert.equal(B.atualizaMemoria(vistas, s, p).size, 0, 'nada na mão dele foi visto ainda');
  const emCampo = z.battlefield[0];
  assert.ok(emCampo, 'o oponente tem carta em campo');
  B.atualizaMemoria(vistas, s, p);
  // a carta volta para a mão dele
  z.battlefield.splice(0, 1); z.hand.push(emCampo); s.objects[emCampo].zone = 'hand';
  const sei = B.atualizaMemoria(vistas, s, p);
  assert.deepEqual([...sei], [emCampo]);
  for (const k of [0, 1, 2, 3]) assert.ok(B.visaoDe(s, p, k, sei).zones[d].hand.includes(emCampo), 'em todo mundo possível ela está na mão dele');
  assert.ok([0, 1, 2, 3, 4, 5].some(k => !B.visaoDe(s, p, k).zones[d].hand.includes(emCampo)), 'sem a memória, ela seria sorteada');
  // embaralhada de volta no grimório: deixa de ser sabida
  z.hand.pop(); z.library.push(emCampo); s.objects[emCampo].zone = 'library';
  assert.equal(B.atualizaMemoria(vistas, s, p).size, 0);
  // cartas que a decisão em curso mostra ficam no lugar
  const t = J(s); const topo = t.zones[p].library[0];
  t.pending = { kind: 'pick', p, from: [topo], picked: [], min: 0, max: 1 };
  for (const k of [0, 1, 2]) assert.equal(B.visaoDe(t, p, k).zones[p].library[0], topo);
});

// O teste que falhava antes da leva 117: trocar só a mão do oponente mudava a jogada do Shark. Medido em 02/10/2026
// com esta sonda em 7 partidas das listas Pauper: v3 mudou a jogada em 4 de 227 decisões; o Shark atual, em 0 de 227.
test('Leva 117 · não vazamento: com outra mão para o oponente (mesma mesa), o Shark faz a mesma jogada; o v3 congelado mudava', { timeout: 280000 }, async () => {
  let s0 = await partidaReal(3, 6, 503);
  let alvo = null;
  const diferentes = [], total = [];
  percorre(s0, 100, (s, q, i) => {
    if (i === 50) alvo = { s, q };
    if (!s.pending && s.zones[1 - q].hand.length && E.legalActions(s, q).length > 3 && i % 2 === 1) {
      const a = B.criaBot({ nivel: 'shark', agora: relogioParado }).jogada(s, q);
      for (const sal of [11, 12]) { const b = B.criaBot({ nivel: 'shark', agora: relogioParado }).jogada(outraMao(s, q, sal + i), q); total.push(i); if (JSON.stringify(a.acao) !== JSON.stringify(b.acao)) diferentes.push(i); }
    }
    return true;
  });
  assert.ok(total.length >= 6, 'a sonda passou por decisões de verdade: ' + total.length);
  assert.deepEqual(diferentes, [], 'o Shark não muda de jogada com a mão do oponente trocada');
  assert.ok(alvo, 'chegou à posição em que o v3 vazava');
  const joga = (nivel, st) => JSON.stringify(B.criaBot({ nivel, agora: relogioParado }).jogada(st, alvo.q).acao);
  const variantes = [127, 1, 2, 3, 4, 5, 6, 7].map(sal => outraMao(alvo.s, alvo.q, sal));
  assert.ok(variantes.some(v => joga('shark-v3', v) !== joga('shark-v3', alvo.s)), 'v3 congelado: a jogada dependia da mão do oponente');
  for (const v of variantes) assert.equal(joga('shark', v), joga('shark', alvo.s));
});

test('Leva 117 · o Shark atual é o de informação justa; o v3 fica congelado como régua', () => {
  for (const n of ['shark', 'profissional', 'shark-v3', 'shark-v2', 'shark-v1']) assert.equal(B.criaBot({ nivel: n }).nivel, n);
  assert.equal(B.MUNDOS >= 2, true, 'mais de um mundo: uma mão sorteada só seria palpite');
  // só joga o que é legal na posição real
  const s = mesa(11); const p = s.turn.priority;
  const j = B.criaBot({ nivel: 'shark' }).jogada(s, p);
  assert.ok(E.legalActions(s, p).some(a => B.chaveAcao(a) === B.chaveAcao(j.acao)));
});

// Leva 118 · sequência do turno. Posições tiradas da partida narrada Jund Wildfire × Rakdos Madness (02/10/2026):
// o v4 gastava a mana na manutenção e baixava o terreno virado tendo o desvirado e mágica para conjurar.
/** Mesa com a lista Jund Wildfire para o jogador 0, no passo pedido, com a mão e o campo montados à mão. */
async function mesaJund({ passo, campo = [], mao = [] }) {
  let s = await partidaReal(5, 1, 9);
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  s = J(s); const z = s.zones[0];
  for (const oid of [...z.hand]) { z.hand.splice(z.hand.indexOf(oid), 1); z.library.push(oid); s.objects[oid].zone = 'library'; }
  const tira = (nome, para) => { const oid = z.library.find(o => s.objects[o].name === nome); assert.ok(oid, 'a lista tem ' + nome);
    z.library.splice(z.library.indexOf(oid), 1); z[para].push(oid); Object.assign(s.objects[oid], { zone: para, sick: false, tapped: false }); return oid; };
  const ids = {};
  for (const n of campo) ids[n] = tira(n, 'battlefield');
  for (const n of mao) ids[n] = tira(n, 'hand');
  Object.assign(s.turn, { active: 0, priority: 0, step: passo });
  s.players[0].landPlayed = false; s.stack = []; s.pending = null;
  return { s, ids };
}
const shark = nivel => B.criaBot({ nivel, agora: relogioParado });

test('Leva 118 · na manutenção do próprio turno o Shark não gasta mana por conta própria; na fase principal, sim', async () => {
  const { s, ids } = await mesaJund({ passo: 'upkeep', campo: ['Forest', 'Swamp', 'Mountain', 'Evolution Witness'] });
  const antes = shark('shark-v4').jogada(s, 0);
  assert.deepEqual([antes.acao.t, antes.acao.oid], ['activate', ids['Evolution Witness']], 'v4: adaptava na manutenção, antes de comprar e baixar terreno');
  const agora = shark('shark').jogada(s, 0);
  assert.equal(agora.acao.t, 'pass');
  assert.match(agora.motivo, /espero a fase principal/);
  const principal = J(s); principal.turn.step = 'main1';
  assert.deepEqual([shark('shark').jogada(principal, 0).acao.t, shark('shark').jogada(principal, 0).acao.oid], ['activate', ids['Evolution Witness']], 'na fase principal ele usa a mana');
});

test('Leva 118 · terreno: baixa o desvirado quando ele paga uma jogada agora; senão baixa o que entra virado e guarda o outro', async () => {
  const comJogada = await mesaJund({ passo: 'main1', campo: ['Swamp'], mao: ['Mountain', 'Drossforge Bridge', 'Krark-Clan Shaman'] });
  const semJogada = await mesaJund({ passo: 'main1', campo: ['Swamp'], mao: ['Mountain', 'Drossforge Bridge', 'Writhing Chrysalis'] });
  const a = shark('shark').jogada(comJogada.s, 0), b = shark('shark').jogada(semJogada.s, 0);
  assert.deepEqual([a.acao.t, a.acao.oid], ['play_land', comJogada.ids.Mountain], 'a Montanha desvirada paga o Krark-Clan Shaman neste turno');
  assert.deepEqual([b.acao.t, b.acao.oid], ['play_land', semJogada.ids['Drossforge Bridge']], 'nada para conjurar: a ponte entra virada sem custo e a Montanha fica para depois');
  const va = shark('shark-v4').jogada(comJogada.s, 0), vb = shark('shark-v4').jogada(semJogada.s, 0);
  assert.equal(comJogada.s.objects[va.acao.oid].name, semJogada.s.objects[vb.acao.oid].name, 'v4: escolhia sempre o mesmo terreno, sem olhar a mão');
});

test('Leva 118 · terreno: entre dois que não mudam o turno, baixa o que dá a cor que a mão pede', async () => {
  const { s } = await mesaJund({ passo: 'main1', campo: ['Swamp', 'Drossforge Bridge'], mao: ['Drossforge Bridge', 'Slagwoods Bridge', 'Evolution Witness'] });
  const j = shark('shark').jogada(s, 0);
  assert.equal(j.acao.t, 'play_land');
  assert.equal(s.objects[j.acao.oid].name, 'Slagwoods Bridge', 'a mão tem carta verde e nenhuma fonte de verde em campo');
  assert.equal(s.objects[shark('shark-v4').jogada(s, 0).acao.oid].name, 'Drossforge Bridge', 'v4: baixava a ponte que não destrava nada');
});

test('Leva 118 · passar com a pilha cheia vale o que a pilha resolve: o Shark não sacrifica as fichas à toa com a própria mágica na pilha', async () => {
  let { s, ids } = await mesaJund({ passo: 'main1', campo: ['Swamp', 'Mountain', 'Forest', 'Forest'], mao: ['Writhing Chrysalis'] });
  s.players[0].landPlayed = true;
  s = act(s, E.legalActions(s, 0).find(a => a.t === 'cast' && a.oid === ids['Writhing Chrysalis']));
  for (let i = 0; i < 6 && (s.stack.length > 1 || s.turn.priority !== 0) && !s.pending; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  assert.equal(s.stack.length, 1, 'a Chrysalis está na pilha');
  const fichas = s.zones[0].battlefield.filter(o => s.objects[o].name === 'Eldrazi Spawn');
  assert.equal(fichas.length, 2, 'as duas fichas já entraram');
  assert.equal(shark('shark-v4').jogada(s, 0).acao.t, 'activate', 'v4: sacrificava a ficha — a nota de usar a habilidade incluía a Chrysalis resolvendo, a de passar não');
  assert.equal(shark('shark').jogada(s, 0).acao.t, 'pass');
});

// Leva 119 · usar os recursos. Posições da partida narrada Mono Blue Faeries × Boros Bully (02/10/2026): o Shark
// ficou a partida inteira com duas Sewer-veillance Cam na mão e seis Ilhas paradas, descartou Counterspell tendo
// terreno sobrando e (regressão da leva 118) virava Ilhas à toa quando o oponente conjurava.
/** Mesa entre duas listas reais, com mão e campo dos dois montados à mão. `ativo` é de quem é o turno; a prioridade é de `vez`. */
async function monta(a, b, { ativo = 0, vez = 0, passo = 'main1', p0 = {}, p1 = {} }) {
  let s = await partidaReal(a, b, 9);
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  for (let i = 0; i < 40 && s.turn.step !== 'main1'; i++) s = act(s, { t: 'pass', p: s.turn.priority });
  s = J(s); const ids = [{}, {}];
  [p0, p1].forEach((cfg, p) => {
    const z = s.zones[p];
    for (const oid of [...z.hand]) { z.hand.splice(z.hand.indexOf(oid), 1); z.library.push(oid); s.objects[oid].zone = 'library'; }
    const tira = (nome, para) => { const oid = z.library.find(o => s.objects[o].name === nome); assert.ok(oid, 'a lista tem ' + nome);
      z.library.splice(z.library.indexOf(oid), 1); z[para].push(oid); Object.assign(s.objects[oid], { zone: para, sick: false, tapped: false }); return oid; };
    for (const n of cfg.campo || []) ids[p][n] = tira(n, 'battlefield');
    for (const n of cfg.mao || []) ids[p][n] = tira(n, 'hand');
    s.players[p].landPlayed = p === ativo;
  });
  Object.assign(s.turn, { active: ativo, priority: vez, step: passo });
  s.stack = []; s.pending = null;
  return { s, ids };
}
const ILHAS = n => Array(n).fill('Island');

test('Leva 119 · o Shark não vira terreno à toa quando o oponente conjura (regressão da leva 118, presente no v5)', async () => {
  let { s, ids } = await monta(0, 3, { ativo: 1, vez: 1, p0: { campo: ILHAS(2), mao: ['Island'] }, p1: { campo: ['Plains'], mao: ['Thraben Inspector'] } });
  s.players[1].landPlayed = true;
  s = act(s, E.legalActions(s, 1).find(a => a.t === 'cast' && a.oid === ids[1]['Thraben Inspector']));
  if (s.turn.priority === 1) s = act(s, { t: 'pass', p: 1 });
  assert.equal(s.stack.length, 1); assert.equal(s.turn.priority, 0, 'a vez de responder é do Shark');
  assert.equal(shark('shark-v5').jogada(s, 0).acao.t, 'tap_mana', 'v5: virava a Ilha e perdia a mana');
  assert.equal(shark('shark').jogada(s, 0).acao.t, 'pass');
});

test('Leva 119 · mana sobrando: a permanente que só custa sair da mão entra na segunda fase principal, e a com lampejo no passo final do oponente', async () => {
  const meu = await monta(0, 3, { ativo: 0, vez: 0, passo: 'main2', p0: { campo: ILHAS(3), mao: ['Sewer-veillance Cam'] } });
  assert.equal(shark('shark-v5').jogada(meu.s, 0).acao.t, 'pass', 'v5: a carta ficava na mão a partida inteira');
  const j = shark('shark').jogada(meu.s, 0);
  assert.deepEqual([j.acao.t, j.acao.oid], ['cast', meu.ids[0]['Sewer-veillance Cam']]);
  assert.match(j.motivo, /a mana ia sobrar/);
  const dele = await monta(0, 3, { ativo: 1, vez: 0, passo: 'end', p0: { campo: ILHAS(3), mao: ['Sewer-veillance Cam'] } });
  const k = shark('shark').jogada(dele.s, 0);
  assert.deepEqual([k.acao.t, k.acao.oid], ['cast', dele.ids[0]['Sewer-veillance Cam']], 'lampejo: entra no fim do turno do oponente, com a mana que sobrou');
  // no meio do turno do oponente ele ainda guarda a mana
  const antes = J(dele.s); antes.turn.step = 'main1';
  assert.equal(shark('shark').jogada(antes, 0).acao.t, 'pass');
});

test('Leva 119 · descarte: com terreno sobrando, vai o terreno, não a anulação', async () => {
  const { s, ids } = await monta(0, 3, { ativo: 0, vez: 0, passo: 'main2', p0: { campo: ILHAS(6), mao: ['Counterspell', 'Island'] } });
  s.pending = { kind: 'discard', p: 0, n: 1, reason: 'effect' };
  const j = shark('shark').jogada(s, 0);
  assert.deepEqual([j.acao.t, j.acao.oid], ['discard', ids[0].Island]);
  assert.equal(B.criaBot({ nivel: 'shark-v5' }).nivel, 'shark-v5');
});

// Leva 126 · pesos ajustáveis: a avaliação aceita multiplicadores por parcela, para o torneio procurar os melhores.
test('Leva 126 · multiplicador de parcela: muda só a parcela pedida, não muda partida decidida, e sem multiplicador é a avaliaV3', () => {
  const s = mesa(11);
  const base = B.avaliaV3(s, 0);
  assert.equal(B.avaliadorCom({})(s, 0).nota, base.nota);
  assert.equal(B.avaliadorCom({ mao: 1 })(s, 0).nota, base.nota);
  const t = J(s); t.zones[1].library.push(...t.zones[1].hand.splice(0, 3).map(o => { t.objects[o].zone = 'library'; return o; }));
  const b2 = B.avaliaV3(t, 0);
  assert.ok(b2.parcelas.mao > 0, 'tenho mais cartas na mão que o oponente');
  assert.equal(B.avaliadorCom({ mao: 0.5 })(t, 0).nota, b2.nota - b2.parcelas.mao / 2);
  assert.equal(B.avaliadorCom({ poder: 3 })(t, 0).nota, b2.nota + 2 * b2.parcelas.poder);
  const fim = J(t); fim.players[1].lost = true; fim.status = 'over'; fim.winner = 0;
  assert.equal(B.avaliadorCom({ mao: 0.1 })(fim, 0).nota, B.avaliaV3(fim, 0).nota, 'vitória vale o mesmo com qualquer peso');
  assert.equal(B.criaBot({ nivel: 'shark-v6' }).nivel, 'shark-v6');
});

// Leva 132 · olhar o turno seguinte: política rápida e rolagem até o próprio turno seguinte.
test('Leva 132 · política rápida: baixa terreno, conjura a permanente sem alvo mais cara que dá para pagar, e passa quando não há o que fazer', async () => {
  const { s, ids } = await monta(0, 3, { ativo: 0, vez: 0, passo: 'main1', p0: { campo: ILHAS(4), mao: ['Island', 'Sewer-veillance Cam', 'Ninja of the Deep Hours', 'Counterspell'] } });
  s.players[0].landPlayed = false;
  const a = B.politicaRapida(s);
  assert.equal(a.t, 'play_land');
  let t = act(s, a);
  const b = B.politicaRapida(t);
  assert.deepEqual([b.t, b.oid], ['cast', ids[0]['Ninja of the Deep Hours']], 'a mais cara primeiro; a anulação (instantânea, com alvo) fica na mão');
  const vazio = await monta(0, 3, { ativo: 0, vez: 0, passo: 'main1', p0: { campo: ILHAS(2), mao: ['Counterspell'] } });
  assert.equal(B.politicaRapida(vazio.s).t, 'pass');
});

test('Leva 132 · rolagem: joga até o começo do meu próximo turno, não muda o estado recebido e dá sempre a mesma nota', async () => {
  const { s } = await monta(0, 3, { ativo: 0, vez: 0, passo: 'main1', p0: { campo: [...ILHAS(3), 'Spellstutter Sprite'], mao: ['Island'] }, p1: { campo: ['Plains', 'Plains', 'Thraben Inspector'], mao: ['Squadron Hawk'] } });
  const antes = JSON.stringify(s);
  const n1 = B.rola(s, 0, { av: B.avaliaV3 }), n2 = B.rola(s, 0, { av: B.avaliaV3 });
  assert.equal(JSON.stringify(s), antes);
  assert.equal(n1, n2);
  assert.notEqual(n1, B.avaliaV3(s, 0).nota, 'a nota é a de um turno à frente, não a de agora');
  // a rolagem para: o estado de chegada é o começo do meu turno seguinte (ou a partida acabou)
  let cur = s; const fim = s.turn.number + 2;
  for (let i = 0; i < 110 && cur.status === 'playing' && cur.turn.number < fim; i++) cur = act(cur, B.politicaRapida(cur) || { t: 'pass', p: cur.turn.priority });
  assert.ok(cur.status !== 'playing' || (cur.turn.number === fim && cur.turn.active === 0), 'chegou ao meu próximo turno');
});
