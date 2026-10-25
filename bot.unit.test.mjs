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
  // G-247 · mede o tempo de processador deste teste, não o relógio de parede: o portão roda arquivos em paralelo e o relógio
  // subia com a carga dos outros (215 e 239 ms em 10/10/2026 com ~70 ms de processador); o limite continua o mesmo
  const c0 = process.cpuUsage();
  for (let i = 0; i < 1000; i++) B.avalia(s, a);
  const u = process.cpuUsage(c0), gasto = Math.round((u.user + u.system) / 1000);
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
  // B-175 · com quatro terrenos: a compra que troca uma carta por outra não muda a nota, e entra só pela mana que ia sobrar.
  // Com menos de quatro (caso abaixo), a compra pode achar o terreno que falta (avaliaV5) e o Shark a conjura na primeira chance.
  for (let i = 0; i < 4; i++) tira('Floresta', 'battlefield'); const x = tira('Troca', 'hand');
  s.turn.step = 'main2'; s.turn.priority = a; s.players[a].landPlayed = true;
  const v3 = B.criaBot({ nivel: 'shark' }).jogada(s, a), v2 = B.criaBot({ nivel: 'shark-v2' }).jogada(s, a);
  assert.equal(v2.acao.t, 'pass', 'v2: comprar uma carta gastando uma carta não melhora a nota, então passava');
  assert.deepEqual([v3.acao.t, v3.acao.oid], ['cast', x]);
  assert.match(v3.motivo, /a mana ia sobrar/);
  // na primeira fase principal ele ainda espera (pode precisar da mana no combate)
  const cedo = J(s); cedo.turn.step = 'main1';
  assert.equal(B.criaBot({ nivel: 'shark' }).jogada(cedo, a).acao.t, 'pass');
  // B-175 · preso em dois terrenos, a compra vale pelo terreno que pode achar: conjura já na primeira fase principal
  const curto = J(cedo); for (const oid of curto.zones[a].battlefield.slice(2)) { curto.zones[a].battlefield.splice(curto.zones[a].battlefield.indexOf(oid), 1); curto.zones[a].library.push(oid); curto.objects[oid].zone = 'library'; }
  const jc = B.criaBot({ nivel: 'shark' }).jogada(curto, a);
  assert.deepEqual([jc.acao.t, jc.acao.oid], ['cast', x], 'com dois terrenos, compra já');
  assert.equal(B.criaBot({ nivel: 'shark-v10' }).jogada(curto, a).acao.t, 'pass', 'o v10 esperava a segunda fase');
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
  // Leva 136 (trilha motor) · expectativa mudou com a regra: Winding Way diz "put ALL cards of the chosen type into your hand",
  // então não há escolha na resolução e o motor v67 entrega as cartas sem perguntar. Sem a pergunta no caminho, o v2 também
  // enxerga o que a carta rende (antes: assert.notEqual(v2.acao.oid, ww, 'v2 deixava na mão')).
  assert.equal(v2.acao.oid, ww, 'sem escolha na resolução, o v2 também vê o ganho');
  // e a carta entrega as quatro criaturas sem pergunta (antes: a mesa abria uma escolha e o bot precisava pegar as cartas)
  let t = act(s, v3.acao);
  for (let i = 0; i < 12 && (t.stack.length || t.pending); i++) { const j = t.pending ? B.criaBot({ nivel: 'shark' }).jogada(t, t.pending.p) : { acao: { t: 'pass', p: t.turn.priority } }; t = act(t, j.acao); }
  assert.equal(t.pending, null); assert.ok(criaturas.every(o => t.objects[o].zone === 'hand'), 'as quatro criaturas do topo estão na mão');
  // a carta com escolha de verdade passa a ser Lead the Stampede ("you may reveal any number of creature cards"): o que o teste
  // conferia sobre a escolha (pegar em vez de encerrar vazia) continua conferido, com ela
  tira('Forest', 'battlefield'); const ls = tira('Lead the Stampede', 'hand');
  t = act(s, { t: 'cast', p: a, oid: ls });
  // e, na hora de escolher, pega as cartas em vez de encerrar sem pegar nada
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

// Leva 143 · usar todas as mecânicas, inclusive as dos terrenos. O primeiro caso é o que o usuário viu na mesa
// (03/10/2026): o Shark preso à mana incolor do terreno que podia ser sacrificado para buscar um básico.
const FLORESTAS = n => Array(n).fill('Forest');
test('Leva 143 · terreno que busca básico: com mágica presa na mão por falta de cor, o Shark estoura o terreno e busca a cor certa', async () => {
  let { s, ids } = await monta(5, 3, { ativo: 0, vez: 0, passo: 'main1', p0: { campo: ['Twisted Landscape', 'Swamp', 'Swamp'], mao: ['Evolution Witness'] } });
  assert.notEqual(shark('shark-v6').jogada(s, 0).acao.oid, ids[0]['Twisted Landscape'], 'v6: ficava com a mana incolor e a criatura verde na mão');
  const j = shark('shark').jogada(s, 0);
  assert.deepEqual([j.acao.t, j.acao.oid], ['activate', ids[0]['Twisted Landscape']]);
  s = act(s, j.acao);
  const bot = shark('shark');
  for (let i = 0; i < 8 && (s.pending || s.stack.length); i++) s = act(s, s.pending ? bot.jogada(s, s.pending.p).acao : { t: 'pass', p: s.turn.priority });
  assert.ok(s.zones[0].battlefield.some(o => s.objects[o].name === 'Forest'), 'buscou a Floresta, que é a cor que faltava');
  // sem carta presa, ele não troca o terreno à toa
  const livre = await monta(5, 3, { ativo: 0, vez: 0, passo: 'main1', p0: { campo: ['Twisted Landscape', 'Swamp', 'Swamp'], mao: ['Cast Down'] } });
  assert.notEqual(shark('shark').jogada(livre.s, 0).acao.t, 'activate');
});

test('Leva 143 · a avaliação enxerga a mágica presa por falta de cor e o terreno sobrando na mão', async () => {
  const { s } = await monta(5, 3, { ativo: 0, vez: 0, passo: 'main1', p0: { campo: ['Swamp', 'Swamp', 'Swamp', 'Drossforge Bridge', 'Vault of Whispers'], mao: ['Evolution Witness', 'Cast Down', 'Forest', 'Mountain'] } });
  const a = B.avaliaV4(s, 0), b = B.avaliaV3(s, 0);
  assert.equal(a.parcelas.presas, -3, 'uma carta verde sem fonte de verde');
  assert.equal(a.parcelas.sobra, -4, 'cinco terrenos em campo: os dois da mão sobram');
  assert.equal(a.nota, b.nota - 7);
  const fim = J(s); fim.players[1].lost = true; fim.status = 'over'; fim.winner = 0;
  assert.equal(B.avaliaV4(fim, 0).nota, B.avaliaV3(fim, 0).nota);
});

test('Leva 143 · mana que pede um gesto: o Shark vira a Saruli Caretaker (e outra criatura) para pagar a mágica que a Floresta sozinha não paga', async () => {
  let { s, ids } = await monta(4, 3, { ativo: 0, vez: 0, passo: 'main1', p0: { campo: ['Forest', 'Saruli Caretaker', 'Drift of Phantasms'], mao: ['Overgrown Battlement'] } });
  assert.ok(!E.legalActions(s, 0).some(a => a.t === 'cast'), 'o pagamento automático não alcança: só uma Floresta');
  assert.equal(shark('shark-v6').jogada(s, 0).acao.t, 'pass', 'v6: passava com a mágica na mão');
  const bot = shark('shark');
  const j1 = bot.jogada(s, 0);
  assert.deepEqual([j1.acao.t, j1.acao.oid], ['activate', ids[0]['Saruli Caretaker']]);
  assert.match(j1.motivo, /abri mana para conjurar Overgrown Battlement/);
  s = act(s, j1.acao);
  const j2 = bot.jogada(s, 0);
  assert.deepEqual([j2.acao.t, j2.acao.oid], ['cast', ids[0]['Overgrown Battlement']], 'a segunda ação do plano sai da memória do bot');
  s = act(s, j2.acao);
  assert.ok(s.stack.length === 1 || s.zones[0].battlefield.includes(ids[0]['Overgrown Battlement']));
});

test('Leva 143 · o relógio corta o fim da fila, não a melhor jogada: com muitas candidatas, o dano que fecha a partida é achado mesmo com pouco tempo', async () => {
  const { s, ids } = await monta(4, 3, { ativo: 0, vez: 0, passo: 'main1',
    p0: { campo: [...FLORESTAS(8), 'Valakut Invoker', 'Saruli Caretaker', 'Saruli Caretaker', 'Drift of Phantasms', 'Overgrown Battlement', 'Sagu Wildling', 'Tinder Wall'] },
    p1: { campo: ['Plains', 'Thraben Inspector', 'Squadron Hawk'] } });
  s.players[1].life = 3;
  const relogio = () => { let n = 0; return () => n++; };
  const curto = nivel => B.criaBot({ nivel, orcamentoMs: 30, agora: relogio() }).jogada(s, 0); // relógio de mentira: cada consulta vale 1 ms
  const novo = curto('shark');
  assert.deepEqual([novo.acao.t, novo.acao.oid, (novo.acao.targets[0] || {}).player], ['activate', ids[0]['Valakut Invoker'], 1], '3 de dano no oponente com 3 de vida');
  const velho = curto('shark-v6');
  assert.ok(!(velho.acao.t === 'activate' && (velho.acao.targets || [])[0] && velho.acao.targets[0].player === 1), 'v6: as candidatas eram lidas em ordem alfabética e o alvo "jogador" ficava depois do corte');
});

// B9 · o plano de cada baralho, começando pelo Walls Combo (o que o Shark pilotava pior: 23–39 na leva 143).
// Partida narrada Walls Combo × Boros Bully (03/10/2026): devolvia as Florestas para a mão com a Quirion Ranger até
// ficar sem terreno em campo, nunca conjurava a Freed from the Real e não sabia fechar o combo.
const MURO = { campo: [...FLORESTAS(3), 'Axebane Guardian', 'Saruli Caretaker', 'Overgrown Battlement', 'Valakut Invoker'] };
test('B9 · perfil: o Shark reconhece o Walls Combo pela própria lista; as outras listas não têm perfil de combo', async () => {
  const walls = await monta(4, 3, {});
  assert.equal(B.perfilDe(walls.s, 0).id, 'walls-combo');
  assert.equal(B.perfilDe(walls.s, 1), null, 'Boros Bully');
  // B-175/B-176 · um perfil tem plano de combo (motor, desvira, finalizadores), de cemitério (tipos, enquanto) ou de
  // ameaças a responder (nomes, peso); nunca nenhum dos três
  for (const pf of B.PERFIS) assert.ok(pf.exige.length && ((pf.combo && pf.combo.motor && pf.combo.desvira && pf.combo.finalizadores.length) || (pf.cemiterio && pf.cemiterio.tipos.length && pf.cemiterio.enquanto.length) || (pf.ameacas && pf.ameacas.nomes.length && pf.ameacas.peso > 0)), pf.id);
});

test('B9 · terreno na mão vale menos que terreno em campo: a Quirion Ranger não devolve a Floresta à toa', async () => {
  const { s, ids } = await monta(4, 3, { ativo: 1, vez: 0, passo: 'main1', p0: { campo: ['Forest', 'Quirion Ranger', 'Overgrown Battlement'] } });
  s.objects[ids[0]['Overgrown Battlement']].tapped = true;
  const velho = shark('shark-v7').jogada(s, 0);
  assert.deepEqual([velho.acao.t, velho.acao.oid], ['activate', ids[0]['Quirion Ranger']], 'v7: Floresta na mão valia mais que em campo, e ele ia ficando sem terreno');
  assert.equal(shark('shark').jogada(s, 0).acao.t, 'pass');
});

test('B9 · montar o combo: com o motor e o finalizador em campo, a Freed from the Real vai no Axebane Guardian', async () => {
  const { s, ids } = await monta(4, 3, { ativo: 0, vez: 0, passo: 'main1', p0: { ...MURO, mao: ['Freed from the Real'] } });
  const j = shark('shark').jogada(s, 0);
  assert.deepEqual([j.acao.t, j.acao.oid, j.acao.targets[0].oid], ['cast', ids[0]['Freed from the Real'], ids[0]['Axebane Guardian']]);
  const v = shark('shark-v7').jogada(s, 0);
  assert.ok(!(v.acao.t === 'cast' && v.acao.oid === ids[0]['Freed from the Real'] && v.acao.targets[0].oid === ids[0]['Axebane Guardian']), 'v7 não sabia que essa aura é a peça do combo');
});

test('B9 · fechar o combo: mana infinita (Axebane Guardian + Freed from the Real) e Valakut Invoker no oponente até a partida acabar, no mesmo turno', async () => {
  let { s, ids } = await monta(4, 3, { ativo: 0, vez: 0, passo: 'main1', p0: { ...MURO, mao: ['Freed from the Real'] } });
  const bot = shark('shark');
  let minhas = 0, ilegais = 0;
  for (let i = 0; i < 400 && s.status === 'playing' && s.turn.active === 0; i++) {
    const q = s.pending ? s.pending.p : s.turn.priority;
    const j = q === 0 ? bot.jogada(s, 0) : { acao: { t: 'pass', p: 1 } }; // o oponente não responde
    if (q === 0) { minhas++; if (j.acao.t === 'pass' && !s.stack.length) break; }
    try { s = act(s, j.acao); } catch (e) { ilegais++; break; }
  }
  assert.equal(ilegais, 0, 'toda ação do combo é aceita pelo motor');
  assert.equal(s.status, 'over'); assert.equal(s.winner, 0);
  assert.ok(s.players[1].life <= 0, 'vida do oponente: ' + s.players[1].life);
  assert.ok(minhas < 300, 'fechou em ' + minhas + ' ações');
});

test('B9 · o combo não começa sem finalizador em campo nem com menos de dois defensores, e não roda no turno do oponente', async () => {
  const semFim = await monta(4, 3, { ativo: 0, vez: 0, passo: 'main1', p0: { campo: [...FLORESTAS(3), 'Axebane Guardian', 'Saruli Caretaker', 'Freed from the Real'] } });
  const liga = m => { const a = m.s.objects[m.ids[0]['Freed from the Real']]; a.attachedTo = m.ids[0]['Axebane Guardian']; return m; };
  const pf = B.perfilDe(semFim.s, 0);
  assert.equal(B.passoDoCombo(liga(semFim).s, 0, pf), null, 'sem Invoker em campo não há onde gastar');
  const um = liga(await monta(4, 3, { ativo: 0, vez: 0, passo: 'main1', p0: { campo: [...FLORESTAS(3), 'Axebane Guardian', 'Valakut Invoker', 'Freed from the Real'] } }));
  assert.equal(B.passoDoCombo(um.s, 0, pf), null, 'um defensor só: o laço não rende');
  const pronto = liga(await monta(4, 3, { ativo: 0, vez: 0, passo: 'main1', p0: { campo: [...MURO.campo, 'Freed from the Real'] } }));
  assert.equal(B.passoDoCombo(pronto.s, 0, pf).acao.t, 'tap_mana');
  const dele = J(pronto.s); dele.turn.active = 1;
  assert.equal(B.passoDoCombo(dele, 0, pf), null);
  assert.equal(B.passoDoCombo(pronto.s, 0, null), null, 'baralho sem perfil');
});

test('B9 · buscar a peça que falta: com o motor e o finalizador em campo, o Shark transmuta a Drift of Phantasms e pega a Freed from the Real', async () => {
  let { s, ids } = await monta(4, 3, { ativo: 0, vez: 0, passo: 'main1', p0: { ...MURO, mao: ['Drift of Phantasms'] } });
  const bot = shark('shark');
  const j = bot.jogada(s, 0);
  assert.deepEqual([j.acao.t, j.acao.oid], ['transmute', ids[0]['Drift of Phantasms']], j.motivo);
  s = act(s, j.acao);
  for (let i = 0; i < 10 && (s.pending || s.stack.length); i++) s = act(s, s.pending ? bot.jogada(s, s.pending.p).acao : { t: 'pass', p: s.turn.priority });
  assert.ok(s.zones[0].hand.some(o => s.objects[o].name === 'Freed from the Real'), 'mão: ' + s.zones[0].hand.map(o => s.objects[o].name));
});

// B16 · truque próprio no ataque. Partida narrada Elves × Rakdos Madness (03/10/2026): o Shark de Elves atacava sem
// contar com o Timberwatch Elf e perdia a corrida.
test('B16 · ataque contando o próprio truque: com o Timberwatch Elf em campo, o Shark ataca e fecha a partida no atacante que passou', async () => {
  let { s, ids } = await monta(6, 3, { ativo: 0, vez: 0, passo: 'main1',
    p0: { campo: ['Forest', 'Timberwatch Elf', 'Llanowar Elves', 'Elvish Mystic', 'Priest of Titania', 'Elvish Vanguard'] },
    p1: { campo: ['Plains', 'Thraben Inspector', 'Squadron Hawk', 'Squadron Hawk'] } });
  s.players[1].life = 6; s.players[0].life = 20;
  const joga = nivel => {
    let t = s; const bot = shark(nivel), outro = shark('shark-v8');
    for (let i = 0; i < 80 && t.status === 'playing' && t.turn.active === 0; i++) {
      const q = t.pending ? t.pending.p : t.turn.priority;
      const j = (q === 0 ? bot : outro).jogada(t, q);
      t = act(t, j.acao);
    }
    return t;
  };
  const novo = joga('shark');
  assert.equal(novo.status, 'over', 'cinco Elfos: o 1/1 que passou vira 6/6 e fecha os 6 de vida'); assert.equal(novo.winner, 0);
  const velho = joga('shark-v8');
  assert.notEqual(velho.status, 'over', 'v8: não contava com o truque ao decidir o ataque');
});

// B10b · Mono Blue Faeries (partida narrada contra Jund Wildfire, 04/10/2026): o Shark recusava a compra do
// Moon-Circuit Hacker todas as vezes e gastava a mana da anulação antes do turno do oponente (e depois a descartava).
test('B10b · efeito opcional de graça: o Shark aceita a compra do Moon-Circuit Hacker; o v9 recusava', async () => {
  let { s } = await monta(0, 3, { ativo: 0, vez: 0, passo: 'main1', p0: { campo: [...ILHAS(2), 'Moon-Circuit Hacker'], mao: ['Island'] }, p1: { campo: ['Plains'] } });
  const piloto = shark('shark-v9'), outro = shark('shark-v9');
  for (let i = 0; i < 60 && !(s.pending && s.pending.kind === 'may_pay' && s.pending.p === 0) && s.turn.active === 0 && s.status === 'playing'; i++) {
    const q = s.pending ? s.pending.p : s.turn.priority;
    s = act(s, (q === 0 ? piloto : outro).jogada(s, q).acao);
  }
  assert.ok(s.pending && s.pending.kind === 'may_pay' && !s.pending.cost, 'o Hacker causou dano e a compra opcional está na mesa');
  assert.equal(shark('shark-v9').jogada(s, 0).acao.t, 'decline');
  assert.equal(shark('shark').jogada(s, 0).acao.t, 'pay');
});

// A opção `segura` foi medida (36% contra 41% do v9 pilotando Faeries, 96 pares) e NÃO entrou no Shark: fica só para o
// torneio. O teste guarda o que ela faz, ligada à mão.
test('B10b · opção de torneio "segura" (desligada no Shark): com Counterspell na mão e só as duas Ilhas que a pagam, não gasta uma delas numa criatura; com três Ilhas, joga a criatura', async () => {
  const segura = () => B.criaBot({ nivel: 'shark-v9', agora: relogioParado, extra: { segura: true } });
  const duas = await monta(0, 3, { ativo: 0, vez: 0, passo: 'main1', p0: { campo: ILHAS(2), mao: ['Counterspell', 'Faerie Miscreant'] }, p1: { campo: ['Plains', 'Plains'], mao: ['Squadron Hawk', 'Battle Screech'] } });
  assert.equal(JSON.stringify(B.custoDaResposta(duas.s, 0)), JSON.stringify({ custo: 2, oids: [duas.ids[0].Counterspell] }));
  const v = shark('shark-v9').jogada(duas.s, 0);
  assert.deepEqual([v.acao.t, v.acao.oid], ['cast', duas.ids[0]['Faerie Miscreant']], 'v9: gastava a Ilha e ficava sem a anulação no turno do oponente');
  assert.equal(segura().jogada(duas.s, 0).acao.t, 'pass');
  assert.equal(shark('shark').jogada(duas.s, 0).acao.t, 'cast', 'o Shark publicado não segura');
  const tres = await monta(0, 3, { ativo: 0, vez: 0, passo: 'main1', p0: { campo: ILHAS(3), mao: ['Counterspell', 'Faerie Miscreant'] }, p1: { campo: ['Plains', 'Plains'], mao: ['Squadron Hawk', 'Battle Screech'] } });
  const j = segura().jogada(tres.s, 0);
  assert.deepEqual([j.acao.t, j.acao.oid], ['cast', tres.ids[0]['Faerie Miscreant']], 'sobra mana para as duas coisas');
  const sem = await monta(0, 3, { ativo: 0, vez: 0, passo: 'main1', p0: { campo: ILHAS(2), mao: ['Faerie Miscreant'] } });
  assert.equal(B.custoDaResposta(sem.s, 0), null);
});

// Combo do Shark na mesa: o laço de mana infinita são dezenas de ações iguais. No registro ele vira uma linha, e o
// jogador que passou uma vez pela habilidade repetida não é parado de novo por ela no mesmo turno.
test('B9 · combo na mesa: as ações do laço são reconhecidas como repetição (o finalizador não), e a habilidade repetida tem a mesma chave no turno', async () => {
  const { table: T } = loadModules();
  let { s, ids } = await monta(4, 3, { ativo: 0, vez: 0, passo: 'main1', p0: { campo: [...MURO.campo, 'Freed from the Real'] } });
  s.objects[ids[0]['Freed from the Real']].attachedTo = ids[0]['Axebane Guardian'];
  const pf = B.perfilDe(s, 0), bot = shark('shark');
  const vistos = { repeticao: 0, finalizador: 0, chaves: new Set() };
  for (let i = 0; i < 60 && s.status === 'playing'; i++) {
    const q = s.pending ? s.pending.p : s.turn.priority;
    const acao = q === 0 ? bot.jogada(s, 0).acao : { t: 'pass', p: 1 };
    const rep = T.repeticaoDoCombo(s, acao, 0, pf);
    const nome = acao.oid ? s.objects[acao.oid].name : '';
    const topo = s.stack.length ? s.objects[s.stack[s.stack.length - 1]] : null;
    if (topo && topo.name === 'Valakut Invoker') { assert.equal(rep, false, 'a resolução do dano não é repetição'); }
    else if (nome === 'Valakut Invoker') { vistos.finalizador++; assert.equal(rep, false, 'o dano aparece no registro'); }
    else { assert.equal(rep, true, `${acao.t} ${nome} de P${q} é repetição`); vistos.repeticao++; }
    if (q === 1 && rep) vistos.chaves.add(T.chaveDaRepeticao(s));
    s = act(s, acao);
  }
  assert.ok(vistos.finalizador >= 2 && vistos.repeticao >= 30, JSON.stringify([vistos.finalizador, vistos.repeticao]));
  assert.equal(vistos.chaves.size, 1, 'a habilidade que desvira é sempre "a mesma" no turno: quem cedeu uma vez não é parado de novo');
  // fora do combo nada é repetição
  const fora = await monta(4, 3, { ativo: 0, vez: 0, passo: 'main1', p0: { campo: MURO.campo } });
  assert.equal(T.repeticaoDoCombo(fora.s, { t: 'pass', p: 0 }, 0, pf), false);
  assert.equal(T.repeticaoDoCombo(fora.s, { t: 'pass', p: 1 }, 0, pf), false);
  assert.equal(T.repeticaoDoCombo(fora.s, { t: 'pass', p: 0 }, 0, null), false);
  assert.equal(T.chaveDaRepeticao(fora.s), null);
});

/* ---- B-22 · as cinco listas do Shark (leva B-173) ---- */
// O Shark só joga com `LISTAS_DO_SHARK` (dado do módulo: cinco listas de torneio do catálogo, escolhidas em 23/10/2026). A tela de
// preparação monta o deck a partir daí e exige cobertura 100%; aqui se prova que o dado é são e que cada lista joga no motor.
test('B-22 · as cinco listas do Shark: dado do módulo, ids únicos, 60 no principal e 15 na reserva, Pauper, com origem e data', () => {
  const L = B.LISTAS_DO_SHARK;
  assert.equal(L.length, 5);
  assert.equal(new Set(L.map(l => l.id)).size, 5, 'ids únicos');
  assert.deepEqual(J(L.map(l => l.arquetipo)), ['Grixis Madness', 'Dimir Control', 'Dimir Faeries', 'Mono Blue Terror', 'Mono Green Elves']);
  const { decks: D } = loadModules();
  for (const l of L) {
    assert.equal(l.format, 'pauper', l.id);
    assert.match(l.data, /^2026-\d\d-\d\d$/, l.id + ' tem data');
    for (const k of ['nome', 'origem', 'jogador', 'catalogo']) assert.ok(l[k], `${l.id} tem ${k}`);
    const { entries } = D.parseDeckText(l.text);
    assert.equal(entries.filter(e => e.zone === 'main').reduce((n, e) => n + e.qty, 0), 60, l.id + ' principal');
    assert.equal(entries.filter(e => e.zone === 'side').reduce((n, e) => n + e.qty, 0), 15, l.id + ' reserva');
  }
});
process.env.ORC = process.env.ORC || '40'; // orçamento por decisão do torneio, só para o portão (lido na importação); a força se mede no torneio
test('B-22 · cada lista do Shark tem dado oficial para toda carta e cobertura 100% no motor', async () => {
  const { listasDoShark } = await import('./torneio.listas.mjs');
  const { scripts: S } = loadModules();
  for (const l of listasDoShark()) {
    const semDado = l.entries.filter(e => !l.cartas[e.name]).map(e => e.name);
    assert.deepEqual(J(semDado), [], l.id + ' sem dado oficial'); // J: a lista vem de outro reino (vm) e o deepEqual estrito compara protótipos
    const cv = S.deckCoverage(l.entries, l.cartas);
    assert.equal(cv.pct, 100, `${l.id}: ${cv.pending.map(p => p.name + ' (' + p.level + ')').join(', ')}`);
  }
});
test('B-22 · cada lista do Shark joga uma partida Shark × Shark sem jogada ilegal e sem travar (orçamento curto)', async () => {
  const { listasDoShark, partida } = await import('./torneio.listas.mjs');
  const L = listasDoShark();
  for (let i = 0; i < L.length; i++) {
    const g = partida(2210 + i, 'shark', 'shark', L[i], L[(i + 1) % L.length], 400);
    assert.equal(g.ilegal, null, `${L[i].id} × ${L[(i + 1) % L.length].id}: ${g.ilegal}`);
    assert.ok(g.acoes > 20, `${L[i].id}: a partida andou (${g.acoes} ações)`);
  }
});

/* ---- B-175 · perfil do Mono Blue Terror e o terreno que falta (B22 fatia 3) ---- */
/** Posição com duas listas do Shark (índices em `listasDoShark()`), no molde de `monta`; `cemiterio` também é aceito. */
async function montaShark(a, b, { ativo = 0, vez = 0, passo = 'main1', p0 = {}, p1 = {}, seed = 9 }) {
  const { listasDoShark } = await import('./torneio.listas.mjs');
  const L = listasDoShark(), d0 = L[a], d1 = L[b];
  const cards = {}; for (const e of [...d0.entries, ...d1.entries]) if (d0.cartas[e.name]) cards[e.name] = d0.cartas[e.name];
  let s = E.createGame({ format: 'pauper', seed, mode: 'full', manaCheck: true, cards, players: [{ name: 'P0', deck: d0.entries }, { name: 'P1', deck: d1.entries }] });
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
    for (const n of cfg.cemiterio || []) ids[p][n] = tira(n, 'graveyard');
    for (const n of [...(cfg.topo || [])].reverse()) { const oid = z.library.find(o => s.objects[o].name === n); assert.ok(oid, 'a lista tem ' + n); z.library.splice(z.library.indexOf(oid), 1); z.library.unshift(oid); } // B-182 · `topo`: as próximas compras, na ordem
    s.players[p].landPlayed = p === ativo;
  });
  Object.assign(s.turn, { active: ativo, priority: vez, step: passo });
  s.stack = []; s.pending = null;
  return { s, ids };
}
const TERROR = 3, MADNESS = 0; // índices em LISTAS_DO_SHARK

test('B-175 · avaliaV5: cada terreno que falta para quatro, contando campo e mão, custa 3; devolver um terreno do campo à mão não muda a parcela', async () => {
  const semTerreno = await montaShark(TERROR, MADNESS, { p0: { campo: ['Island', 'Island'], mao: ['Lórien Revealed', 'Counterspell'] } });
  assert.equal(B.avaliaV5(semTerreno.s, 0).parcelas.falta, -6);
  assert.equal(B.avaliaV5(semTerreno.s, 0).nota, B.avaliaV4(semTerreno.s, 0).nota - 6);
  const comTerreno = await montaShark(TERROR, MADNESS, { p0: { campo: ['Island', 'Island'], mao: ['Lórien Revealed', 'Island'] } });
  assert.equal(B.avaliaV5(comTerreno.s, 0).parcelas.falta, -3, 'a Ilha na mão conta: falta uma');
  const devolvida = await montaShark(TERROR, MADNESS, { p0: { campo: ['Island'], mao: ['Lórien Revealed', 'Island'] } });
  assert.equal(B.avaliaV5(devolvida.s, 0).parcelas.falta, B.avaliaV5(semTerreno.s, 0).parcelas.falta, 'uma Ilha a menos no campo e uma a mais na mão: a mesma falta (o Quirion Ranger não "acha" terreno)');
  const quatro = await montaShark(TERROR, MADNESS, { p0: { campo: ILHAS(4), mao: ['Counterspell'] } });
  assert.equal(B.avaliaV5(quatro.s, 0).parcelas.falta, 0);
  const cinco = await montaShark(TERROR, MADNESS, { p0: { campo: ILHAS(5), mao: ['Counterspell'] } });
  assert.equal(B.avaliaV5(cinco.s, 0).parcelas.falta, 0, 'acima de quatro não há prêmio');
  const fim = J(semTerreno.s); fim.players[1].lost = true; fim.status = 'over'; fim.winner = 0;
  assert.equal(B.avaliaV5(fim, 0).nota, B.avaliaV4(fim, 0).nota, 'partida acabada: a parcela não entra');
});

test('B-175 · preso em duas Ilhas com a Lórien Revealed na mão, no fim do turno do oponente o Shark a recicla por uma Ilha; o v10 passava', async () => {
  const { s, ids } = await montaShark(TERROR, MADNESS, { ativo: 1, vez: 0, passo: 'end', p0: { campo: ['Island', 'Island'], mao: ['Lórien Revealed', 'Counterspell', 'Tolarian Terror'] }, p1: { campo: ['Mountain', 'Mountain'] } });
  const dez = shark('shark-v10').jogada(s, 0), novo = shark('shark').jogada(s, 0);
  assert.equal(dez.acao.t, 'pass', 'v10: ' + dez.motivo);
  assert.equal(novo.acao.t, 'cycle', 'novo: ' + novo.motivo); assert.equal(novo.acao.oid, ids[0]['Lórien Revealed']);
});

test('B-175 · perfil do Terror: cada instantânea ou feitiço no cemitério vale enquanto o Terror está na mão (até seis); sem o Terror na mão, nada; o Walls Combo continua com o seu passo', async () => {
  const { s } = await montaShark(TERROR, MADNESS, { p0: { campo: ILHAS(3), mao: ['Tolarian Terror'], cemiterio: ['Ponder', 'Brainstorm', 'Counterspell'] } });
  const perfil = B.perfilDe(s, 0); assert.equal(perfil && perfil.id, 'terror');
  const av = B.avaliadorDoPlano(B.avaliaV5, perfil, 0);
  assert.equal(av(s, 0).parcelas.plano, 3 * 1.2, 'três instantâneas/feitiços no cemitério, Terror na mão');
  const semTerror = J(s); const t = s.zones[0].hand.find(o => s.objects[o].name === 'Tolarian Terror'); semTerror.zones[0].hand = []; semTerror.zones[0].library.push(t); semTerror.objects[t].zone = 'library';
  assert.equal(av(semTerror, 0).parcelas.plano, 0, 'sem o Terror na mão, o cemitério não vale');
  assert.equal(B.passoDoCombo(s, 0, perfil), null, 'perfil sem combo não tem passo');
  assert.equal(B.perfilDe((await montaShark(MADNESS, TERROR, {})).s, 0), null, 'a lista Madness ainda não tem perfil');
});

// B-176 · fatia 4 da B22: o Dimir Control remove primeiro a ameaça do campo (a que cresce com a mesa), não o corpo maior.
const CONTROLE = 1, ELFOS = 4;
test('B-176 · ameaças do campo: AMEACAS_DO_CAMPO são cartas das cinco listas do Shark; o perfil do Dimir Control as usa', async () => {
  const { s } = await montaShark(CONTROLE, ELFOS, { p0: {} });
  const p = B.perfilDe(s, 0); assert.equal(p && p.id, 'controle');
  assert.deepEqual(J(p.ameacas.nomes), J(B.AMEACAS_DO_CAMPO));
  const todas = new Set(Object.values(s.objects).map(o => o.name));
  const { s: s2 } = await montaShark(MADNESS, TERROR, { p0: {} }); for (const o of Object.values(s2.objects)) todas.add(o.name);
  const { s: s3 } = await montaShark(2, ELFOS, { p0: {} }); for (const o of Object.values(s3.objects)) todas.add(o.name);
  for (const n of B.AMEACAS_DO_CAMPO) assert.ok(todas.has(n), n + ' está numa das listas do Shark');
  assert.notEqual((B.perfilDe(s3, 0) || {}).id, 'controle', 'o Faeries tem Thorn mas não Murmuring Mystic: não é o Control');
});

test('B-176 · com a opção ameacas, na manutenção dos Elfos, com um Cast Down e Masked Vandal e Timberwatch Elf do outro lado, o Dimir Control mata o Timberwatch Elf; o Shark publicado (opção desligada: medida sem ganho) mata o Masked Vandal', async () => {
  const { s, ids } = await montaShark(CONTROLE, ELFOS, { ativo: 1, vez: 0, passo: 'upkeep',
    p0: { campo: ['Island', 'Swamp'], mao: ['Cast Down'] }, p1: { campo: ['Forest', 'Forest', 'Masked Vandal', 'Timberwatch Elf'] } });
  const novo = B.criaBot({ nivel: 'shark', agora: relogioParado, extra: { ameacas: true } }).jogada(s, 0), velho = shark('shark').jogada(s, 0);
  assert.deepEqual([novo.acao.t, novo.acao.oid, (novo.acao.targets || [])[0] && novo.acao.targets[0].oid], ['cast', ids[0]['Cast Down'], ids[1]['Timberwatch Elf']], 'novo: ' + novo.motivo);
  assert.deepEqual([velho.acao.t, velho.acao.targets && velho.acao.targets[0].oid], ['cast', ids[1]['Masked Vandal']], 'sem a opção, o corpo maior: ' + velho.motivo);
  // a parcela só existe do lado do Control, e só com a ameaça em campo
  const av = B.avaliadorDoPlano(B.avaliaV5, B.perfilDe(s, 0), 0, { ameacas: true }), sem = B.avaliadorDoPlano(B.avaliaV5, B.perfilDe(s, 0), 0);
  assert.equal(av(s, 0).nota - sem(s, 0).nota, -6, 'uma ameaça em campo (Timberwatch Elf): −6');
  assert.equal(av(s, 1).nota, sem(s, 1).nota, 'do lado dos Elfos, nada muda');
});

/* ---- B-177 · mulligan 2: fontes de mana (terreno ou carta que vira terreno), cores e o fundo pela cor ---- */
/** Mão inicial com as cartas dadas (7, na ordem dada) para a lista `a` do Shark, depois de `m` mulligans. */
async function maoDoShark(a, nomes, m = 0) {
  const { listasDoShark } = await import('./torneio.listas.mjs');
  const L = listasDoShark(), d0 = L[a], d1 = L[(a + 1) % L.length];
  const cards = {}; for (const x of [d0, d1]) for (const e of x.entries) cards[e.name] = x.cartas[e.name];
  const s = J(E.createGame({ format: 'pauper', seed: 3, mode: 'full', manaCheck: true, cards, players: [{ name: 'P0', deck: d0.entries }, { name: 'P1', deck: d1.entries }] }));
  const z = s.zones[0];
  for (const oid of [...z.hand]) { z.hand.splice(z.hand.indexOf(oid), 1); z.library.push(oid); s.objects[oid].zone = 'library'; }
  const ids = [];
  for (const n of nomes) { const oid = z.library.find(o => s.objects[o].name === n); assert.ok(oid, 'a lista tem ' + n); z.library.splice(z.library.indexOf(oid), 1); z.hand.push(oid); s.objects[oid].zone = 'hand'; ids.push(oid); }
  s.players[0].mulligans = m;
  return { s, ids };
}
test('B-177 · viraTerreno: ciclagem de terreno e mágica barata que busca básico viram fonte, com a cor do básico; o resto não', async () => {
  const { s, ids } = await maoDoShark(4, ['Generous Ent', 'Land Grant', 'Forest', 'Llanowar Elves', 'Timberwatch Elf', 'Elvish Mystic', 'Priest of Titania']);
  const v = i => B.viraTerreno(s, s.objects[ids[i]]);
  assert.deepEqual(J(v(0)), ['G'], 'Generous Ent: forestcycling'); assert.deepEqual(J(v(1)), ['G'], 'Land Grant: busca Floresta');
  assert.equal(v(3), null, 'Llanowar Elves faz mana mas não é terreno');
  const t = await maoDoShark(3, ['Lórien Revealed', 'Island', 'Island', 'Counterspell', 'Tolarian Terror', 'Brainstorm', 'Ponder']);
  assert.deepEqual(J(B.viraTerreno(t.s, t.s.objects[t.ids[0]])), ['U'], 'Lórien Revealed: islandcycling');
  assert.equal(B.viraTerreno(t.s, t.s.objects[t.ids[3]]), null, 'Counterspell não vira terreno');
});
test('B-177 · Elfos com um Forest, dois Land Grant e dois Generous Ent: o mulligan novo mantém (cinco fontes); o antigo dava mulligan ("um terreno só")', async () => {
  const { s } = await maoDoShark(4, ['Forest', 'Priest of Titania', 'Land Grant', 'Land Grant', 'Generous Ent', 'Elvish Mystic', 'Generous Ent']);
  assert.equal(B.decideMulligan(s, 0).acao.t, 'mulligan');
  const j = B.decideMulligan2(s, 0); assert.equal(j.acao.t, 'keep', j.motivo); assert.match(j.motivo, /5 fonte/);
});
test('B-177 · cinco cartas com uma fonte só: o mulligan novo vai a quatro; o antigo mantinha', async () => {
  const { s } = await maoDoShark(1, ['Island', 'Counterspell', 'Preordain', 'Cast Down', 'Baleful Strix', 'Snuff Out', 'Murmuring Mystic'], 2);
  const velho = B.decideMulligan(s, 0), novo = B.decideMulligan2(s, 0);
  assert.equal(velho.acao.t, 'keep', velho.motivo); assert.equal(novo.acao.t, 'mulligan', novo.motivo); assert.match(novo.motivo, /um terreno só/);
});
test('B-177 · Dimir Control com três Ilhas e só mágicas pretas: o mulligan novo descarta (nenhuma mágica na cor); com um Swamp no lugar de uma Ilha, mantém', async () => {
  const semPreto = await maoDoShark(1, ['Island', 'Island', 'Island', 'Cast Down', 'Cast Down', 'Cut Down', 'Snuff Out']);
  assert.equal(B.decideMulligan(semPreto.s, 0).acao.t, 'keep');
  const j = B.decideMulligan2(semPreto.s, 0); assert.equal(j.acao.t, 'mulligan'); assert.match(j.motivo, /na cor dos terrenos/);
  const comPreto = await maoDoShark(1, ['Island', 'Island', 'Swamp', 'Cast Down', 'Cast Down', 'Cut Down', 'Snuff Out']);
  assert.equal(B.decideMulligan2(comPreto.s, 0).acao.t, 'keep');
});
test('B-177 · o fundo guarda a cor: com Ilha, Ilha, Ilha, Swamp e um mulligan, vai uma Ilha para o fundo (o antigo mandava o Swamp)', async () => {
  const { s, ids } = await maoDoShark(1, ['Island', 'Island', 'Island', 'Swamp', 'Cast Down', 'Counterspell', 'Preordain'], 1);
  const swamp = ids[3], velho = B.decideMulligan(s, 0), novo = B.decideMulligan2(s, 0);
  assert.deepEqual(J(velho.acao.bottom), [swamp], 'o antigo: o último terreno');
  assert.equal(novo.acao.t, 'keep'); assert.equal(novo.acao.bottom.length, 1);
  assert.equal(s.objects[novo.acao.bottom[0]].name, 'Island');
});
test('B-177 · o Shark publicado usa o mulligan 2 (mantém a mão dos Elfos com Land Grant e Generous Ent); o shark-v11 congelado usa o antigo', async () => {
  const { s } = await maoDoShark(4, ['Forest', 'Priest of Titania', 'Land Grant', 'Land Grant', 'Generous Ent', 'Elvish Mystic', 'Generous Ent']);
  assert.equal(shark('shark').mulligan(s, 0).acao.t, 'keep');
  assert.equal(shark('shark-v11').mulligan(s, 0).acao.t, 'mulligan');
});

/* ---- B-178 · prazo: a decisão inteira cabe no orçamento ---- */
test('B-178 · escolhe com prazo para no limite da decisão inteira (depois de ao menos uma candidata); sem prazo, só o orçamento dela conta', () => {
  let t = 0; const agora = () => t;
  const nota = a => { t += 30; return a.v; };
  const cands = [1, 2, 3, 4, 5].map(v => ({ t: 'pass', p: 0, v, oid: 'o' + v }));
  const com = B.escolhe(cands, nota, { orcamentoMs: 400, agora, prazo: true, limite: 50 });
  assert.equal(com.vistas, 2, 'passou do limite (50) depois da 2ª: para'); assert.ok(com.cortou);
  t = 0; const sem = B.escolhe(cands, nota, { orcamentoMs: 400, agora, limite: 50 });
  assert.equal(sem.vistas, 5, 'sem prazo, o limite não corta o laço (só o orçamento de 400)');
  t = 0; const zero = B.escolhe(cands, nota, { orcamentoMs: 400, agora: () => 1e9, prazo: true, limite: 1 });
  assert.equal(zero.vistas, 1, 'prazo já vencido: ainda avalia uma, nunca devolve nada');
});
test('B-178 · com o prazo vencido logo na primeira leitura, o Shark ainda devolve jogada legal (turno cheio dos Elfos, ataque, bloqueio, resposta)', async () => {
  // relógio que pula: tudo depois da primeira consulta já passou do prazo
  const pula = () => { let n = 0; return () => (n++ ? 1e9 : 0); };
  const posicoes = [
    await montaShark(ELFOS, CONTROLE, { ativo: 0, vez: 0, passo: 'main1', p0: { campo: ['Forest', 'Forest', 'Forest', 'Llanowar Elves', 'Elvish Mystic', 'Timberwatch Elf'], mao: ['Priest of Titania', 'Quirion Ranger', 'Land Grant'] } }),
    await montaShark(CONTROLE, ELFOS, { ativo: 1, vez: 0, passo: 'upkeep', p0: { campo: ['Island', 'Swamp'], mao: ['Cast Down', 'Counterspell'] }, p1: { campo: ['Forest', 'Masked Vandal', 'Timberwatch Elf'] } }),
  ];
  for (const { s } of posicoes) {
    const bot = B.criaBot({ nivel: 'shark', agora: pula() }); // o Shark publicado já tem o prazo (B-178)
    const j = bot.jogada(s, 0);
    assert.ok(j && j.acao, 'devolveu uma ação');
    assert.doesNotThrow(() => E.apply(s, j.acao), 'a ação é legal: ' + JSON.stringify(j.acao));
  }
});

/* ---- B-179 · quando anular: a resposta é lida primeiro e a anulação guardada tem valor ---- */
const FAERIES = 2;
async function comMagicaDoOponente(a, b, nome, { p0 = {}, p1 = {} } = {}) {
  const m = await montaShark(a, b, { ativo: 1, vez: 1, passo: 'main1', p0, p1: { ...p1, mao: [...(p1.mao || []), nome] } });
  const oid = m.ids[1][nome];
  const conj = E.legalActions(m.s, 1).find(x => x.t === 'cast' && x.oid === oid);
  assert.ok(conj, 'o oponente consegue conjurar ' + nome);
  let s = act(m.s, conj);
  if (s.turn.priority === 1) s = act(s, { t: 'pass', p: 1 });
  assert.equal(s.turn.priority, 0); assert.equal(s.objects[s.stack[s.stack.length - 1]].name, nome);
  return { s, ids: m.ids, alvo: s.stack[s.stack.length - 1] };
}
const anulaEm = (s, j, alvo) => j.acao.t === 'cast' && s.objects[j.acao.oid].name === 'Counterspell' && (j.acao.targets || []).some(t => t.oid === alvo);
test('B-179 · com tempo para uma leitura só, `respondePrimeiro` lê primeiro a anulação na mágica do oponente e anula o Tolarian Terror; sem a opção, a primeira da fila é outra jogada', async () => {
  const { s, alvo } = await comMagicaDoOponente(FAERIES, TERROR, 'Tolarian Terror', { p0: { campo: ['Island', 'Island', 'Swamp'], mao: ['Counterspell', 'Cast Down', 'Brainstorm'] }, p1: { campo: [...ILHAS(7), 'Delver of Secrets'] } });
  const legais = E.legalActions(s, 0).filter(a => a.t !== 'pass' && a.t !== 'tap_mana' && a.t !== 'concede').sort((x, y) => B.chaveAcao(x) < B.chaveAcao(y) ? -1 : 1);
  assert.ok(!anulaEm(s, { acao: legais[0] }, alvo), 'pré-condição: na ordem estável, a anulação não é a primeira');
  const pula = () => { let n = 0; return () => (n++ > 1 ? 1e9 : 0); }; // a nota de passar e uma candidata
  const com = B.criaBot({ nivel: 'shark', agora: pula(), extra: { respondePrimeiro: true } }).jogada(s, 0);
  const sem = B.criaBot({ nivel: 'shark', agora: pula(), extra: { respondePrimeiro: false } }).jogada(s, 0);
  assert.ok(anulaEm(s, com, alvo), 'com a opção: ' + com.motivo);
  assert.ok(!anulaEm(s, sem, alvo), 'sem a opção a anulação nem é lida: ' + sem.motivo);
});
test('B-179 · `reserva`: com uma Counterspell só, o Shark do Faeries deixa passar o Llanowar Elves (mais barato que o resto da lista dos Elfos) e anula o Timberwatch Elf; sem a reserva, anula os dois', async () => {
  const campo0 = { campo: ['Island', 'Island', 'Swamp'], mao: ['Counterspell', 'Brainstorm'] }, campo1 = { campo: ['Forest', 'Forest', 'Forest'] };
  const bot = reserva => B.criaBot({ nivel: 'shark', agora: relogioParado, extra: { reserva } });
  const elfo = await comMagicaDoOponente(FAERIES, ELFOS, 'Llanowar Elves', { p0: campo0, p1: campo1 });
  const cro = await comMagicaDoOponente(FAERIES, ELFOS, 'Timberwatch Elf', { p0: campo0, p1: campo1 });
  const semElfo = bot(false).jogada(elfo.s, 0), comElfo = bot(true).jogada(elfo.s, 0);
  assert.ok(anulaEm(elfo.s, semElfo, elfo.alvo), 'sem a reserva anula o elfo de 1: ' + semElfo.motivo);
  assert.equal(comElfo.acao.t, 'pass', 'com a reserva guarda a anulação: ' + comElfo.motivo);
  const comCro = bot(true).jogada(cro.s, 0);
  assert.ok(anulaEm(cro.s, comCro, cro.alvo), 'o Timberwatch (3) vale a anulação: ' + comCro.motivo);
});
test('B-179 · o Shark publicado guarda a Counterspell diante do Llanowar Elves; o shark-v13 congelado anula', async () => {
  const { s, alvo } = await comMagicaDoOponente(FAERIES, ELFOS, 'Llanowar Elves', { p0: { campo: ['Island', 'Island', 'Swamp'], mao: ['Counterspell', 'Brainstorm'] }, p1: { campo: ['Forest', 'Forest', 'Forest'] } });
  const novo = shark('shark').jogada(s, 0), v13 = shark('shark-v13').jogada(s, 0);
  assert.equal(novo.acao.t, 'pass', 'publicado: ' + novo.motivo);
  assert.ok(anulaEm(s, v13, alvo), 'v13: ' + v13.motivo);
});

/* ---- B-181 · alvo no próprio lado (auditoria da B-180) ---- */
const miraMeu = (s, j, p = 0) => (j.acao.targets || []).some(t => t.player != null ? t.player === p : s.objects[t.oid] && s.objects[t.oid].controller === p);
test('B-181 · na segunda fase principal, com mana sobrando e o oponente sem criaturas, o Shark não vira o próprio Delver com Sleep of the Dead; sem `alvoProprio`, vira ("a mana ia sobrar")', async () => {
  const { s } = await montaShark(TERROR, ELFOS, { ativo: 0, vez: 0, passo: 'main2', p0: { campo: [...ILHAS(3), 'Delver of Secrets'], mao: ['Sleep of the Dead'] }, p1: { campo: ['Forest', 'Forest'] } });
  assert.ok(E.legalActions(s, 0).some(a => a.t === 'cast' && s.objects[a.oid].name === 'Sleep of the Dead'), 'pré-condição: dá para conjurar');
  const sem = B.criaBot({ nivel: 'shark', agora: relogioParado, extra: { alvoProprio: false } }).jogada(s, 0);
  const com = B.criaBot({ nivel: 'shark', agora: relogioParado, extra: { alvoProprio: true } }).jogada(s, 0);
  assert.ok(sem.acao.t === 'cast' && miraMeu(s, sem), 'sem a opção, vira o próprio Delver: ' + sem.motivo);
  assert.ok(!(com.acao.t === 'cast' && miraMeu(s, com)), 'com a opção, não: ' + com.motivo);
});
test('B-181 · Agony Warp com uma criatura só do oponente: os dois efeitos vão nela; sem `alvoProprio` e a V6 juntas, o −3/−0 sobra numa criatura do Shark', async () => {
  const { s } = await montaShark(FAERIES, CONTROLE, { ativo: 1, vez: 0, passo: 'main1', p0: { campo: ['Island', 'Swamp', 'Faerie Seer'], mao: ['Agony Warp'] }, p1: { campo: ['Island', 'Swamp', 'Baleful Strix'] } });
  const warp = j => j.acao.t === 'cast' && s.objects[j.acao.oid].name === 'Agony Warp';
  const sem = B.criaBot({ nivel: 'shark', agora: relogioParado, extra: { alvoProprio: false, av6: false } }).jogada(s, 0);
  const com = B.criaBot({ nivel: 'shark', agora: relogioParado, extra: { alvoProprio: true, av6: true } }).jogada(s, 0);
  const soAlvo = B.criaBot({ nivel: 'shark', agora: relogioParado, extra: { alvoProprio: true, av6: false } }).jogada(s, 0);
  assert.ok(warp(sem) && miraMeu(s, sem), 'sem as opções: ' + sem.motivo);
  assert.ok(warp(soAlvo) && miraMeu(s, soAlvo), 'só o custo do alvo (3) não basta: a V5 dava +4 ao −3/−0 na própria Faerie Seer: ' + soAlvo.motivo);
  assert.ok(!miraMeu(s, com), 'com a opção, nada no próprio lado: ' + com.motivo);
});
test('B-181 · avaliaV6: o −3/−0 numa criatura própria de poder 1 não dá nota (a V5 dava +4); o +2/+2 temporário não conta nem na evasão', async () => {
  const { s } = await montaShark(FAERIES, CONTROLE, { p0: { campo: ['Island', 'Faerie Seer'] }, p1: { campo: ['Island'] } });
  const seer = s.zones[0].battlefield.find(o => s.objects[o].name === 'Faerie Seer');
  const com = (pump) => { const x = J(s); x.objects[seer].pump = pump; return x; };
  assert.equal(B.avaliaV6(com({ p: -3, t: 0 }), 0).nota, B.avaliaV6(s, 0).nota, 'V6: encolher a própria criatura não rende');
  assert.equal(B.avaliaV5(com({ p: -3, t: 0 }), 0).nota - B.avaliaV5(s, 0).nota, 4, 'V5 (congelada): o +4 que a B-181 corrige');
  assert.equal(B.avaliaV6(com({ p: 2, t: 2 }), 0).nota, B.avaliaV6(s, 0).nota, 'o temporário positivo também não conta');
});
test('B-181 · o Shark publicado não vira o próprio Delver com Sleep of the Dead na segunda fase principal; o shark-v14 congelado vira', async () => {
  const { s } = await montaShark(TERROR, ELFOS, { ativo: 0, vez: 0, passo: 'main2', p0: { campo: [...ILHAS(3), 'Delver of Secrets'], mao: ['Sleep of the Dead'] }, p1: { campo: ['Forest', 'Forest'] } });
  const novo = shark('shark').jogada(s, 0), v14 = shark('shark-v14').jogada(s, 0);
  assert.ok(!(novo.acao.t === 'cast' && miraMeu(s, novo)), 'publicado: ' + novo.motivo);
  assert.ok(v14.acao.t === 'cast' && miraMeu(s, v14), 'v14: ' + v14.motivo);
});

/* ---- B-182 · loucura e descarte: o Madness descarta a carta certa e conjura pela loucura ---- */
async function jogaAteOFimDaFase(s, p, bot, max = 30) {
  const feitas = [];
  for (let i = 0; i < max && s.status === 'playing'; i++) {
    const q = s.pending ? s.pending.p : s.turn.priority;
    if (q !== p) { s = act(s, { t: 'pass', p: q }); continue; }
    if (s.turn.step !== 'main1' && !s.pending && !s.stack.length) break;
    const j = bot.jogada(s, p); if (!j) break;
    feitas.push(j.acao.t + (s.objects[j.acao.oid] ? ' ' + s.objects[j.acao.oid].name : ''));
    s = act(s, j.acao);
    if (j.acao.t === 'pass' && !s.stack.length && !s.pending && s.turn.step === 'main1') break;
  }
  return { s, feitas };
}
test('B-182 · Faithless Looting com Fiery Temper, Sneaky Snacker e Lightning Bolt na mão: descarta o Snacker e o Temper, conjura o Temper pela loucura no Timberwatch Elf e guarda o Bolt', async () => {
  const { s } = await montaShark(MADNESS, ELFOS, { ativo: 0, vez: 0, passo: 'main1', p0: { campo: ['Mountain', 'Mountain', 'Mountain'], mao: ['Faithless Looting', 'Fiery Temper', 'Sneaky Snacker', 'Lightning Bolt'], topo: ['Mountain', 'Guttersnipe'] }, p1: { campo: ['Forest', 'Forest', 'Timberwatch Elf'] } });
  const { s: fim, feitas } = await jogaAteOFimDaFase(s, 0, shark('shark'));
  const nomes = z => fim.zones[0][z].map(o => fim.objects[o].name);
  assert.ok(feitas.includes('discard Sneaky Snacker') && feitas.includes('discard Fiery Temper'), 'descartes: ' + feitas.join(' · '));
  assert.ok(feitas.includes('cast_madness'), 'conjurou pela loucura: ' + feitas.join(' · '));
  assert.ok(!fim.zones[1].battlefield.some(o => fim.objects[o].name === 'Timberwatch Elf'), 'o Timberwatch morreu');
  assert.ok(nomes('hand').includes('Lightning Bolt'), 'o Bolt ficou na mão');
});
test('B-182 · Faithless Looting com Sneaky Snacker e Mountain sobrando: descarta o Snacker (que volta sozinho) e guarda o Bolt', async () => {
  const { s } = await montaShark(MADNESS, ELFOS, { ativo: 0, vez: 0, passo: 'main1', p0: { campo: ['Mountain', 'Mountain', 'Mountain'], mao: ['Faithless Looting', 'Sneaky Snacker', 'Mountain', 'Lightning Bolt'], topo: ['Kessig Flamebreather', 'Mountain'] }, p1: { campo: ['Forest', 'Forest', 'Timberwatch Elf'] } });
  const { s: fim, feitas } = await jogaAteOFimDaFase(s, 0, shark('shark'));
  assert.ok(feitas.includes('discard Sneaky Snacker'), 'descartou o Snacker: ' + feitas.join(' · '));
  assert.ok(!feitas.includes('discard Lightning Bolt'), 'guardou o Bolt: ' + feitas.join(' · '));
});

/* ---- B-183 · a decisão do outro na resolução (Deem Inferior, Lose Focus) ---- */
test('B-183 · Deem Inferior na Baleful Strix do oponente: com `decideOOutro`, a simulação deixa o dono escolher topo ou fundo e o Shark conjura; sem, a simulação parava na escolha e ele passava', async () => {
  const { s } = await montaShark(TERROR, FAERIES, { ativo: 0, vez: 0, passo: 'main1', p0: { campo: ILHAS(4), mao: ['Deem Inferior'] }, p1: { campo: ['Island', 'Island', 'Baleful Strix'] } });
  const deem = j => j.acao.t === 'cast' && s.objects[j.acao.oid].name === 'Deem Inferior';
  const sem = B.criaBot({ nivel: 'shark', agora: relogioParado, extra: { decideOOutro: false } }).jogada(s, 0);
  const com = B.criaBot({ nivel: 'shark', agora: relogioParado, extra: { decideOOutro: true } }).jogada(s, 0);
  assert.ok(!deem(sem), 'sem a opção: ' + sem.motivo);
  assert.ok(deem(com), 'com a opção: ' + com.motivo);
});
test('B-183 · Lose Focus contra a mágica do oponente: sem mana para pagar {2}, o Shark anula; com o oponente podendo pagar, não gasta', async () => {
  const semMana = await comMagicaDoOponente(CONTROLE, FAERIES, 'Spellstutter Sprite', { p0: { campo: ['Island', 'Island', 'Swamp'], mao: ['Lose Focus'] }, p1: { campo: ['Island', 'Island'] } });
  const comMana = await comMagicaDoOponente(CONTROLE, FAERIES, 'Spellstutter Sprite', { p0: { campo: ['Island', 'Island', 'Swamp'], mao: ['Lose Focus'] }, p1: { campo: ['Island', 'Island', 'Island', 'Island'] } });
  const foco = (s, j, alvo) => j.acao.t === 'cast' && s.objects[j.acao.oid].name === 'Lose Focus' && (j.acao.targets || []).some(t => t.oid === alvo);
  const bot = extra => B.criaBot({ nivel: 'shark', agora: relogioParado, extra });
  const a = bot({ decideOOutro: true }).jogada(semMana.s, 0), b = bot({ decideOOutro: true }).jogada(comMana.s, 0);
  assert.ok(foco(semMana.s, a, semMana.alvo), 'oponente sem mana: anula · ' + a.motivo);
  assert.ok(!foco(comMana.s, b, comMana.alvo), 'oponente paga: não gasta · ' + b.motivo);
});
test('B-183 · o Shark publicado conjura o Deem Inferior na Baleful Strix do oponente; o shark-v15 congelado passa', async () => {
  const { s } = await montaShark(TERROR, FAERIES, { ativo: 0, vez: 0, passo: 'main1', p0: { campo: ILHAS(4), mao: ['Deem Inferior'] }, p1: { campo: ['Island', 'Island', 'Baleful Strix'] } });
  const deem = j => j.acao.t === 'cast' && s.objects[j.acao.oid].name === 'Deem Inferior';
  const novo = shark('shark').jogada(s, 0), v15 = shark('shark-v15').jogada(s, 0);
  assert.ok(deem(novo), 'publicado: ' + novo.motivo); assert.ok(!deem(v15), 'v15: ' + v15.motivo);
});
