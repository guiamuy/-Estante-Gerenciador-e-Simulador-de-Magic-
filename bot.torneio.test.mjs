// Camada 2 · B6 · torneio de bots: a única prova de que o Shark (o antigo "profissional",
// U10) é mesmo mais forte que a política aleatória e que a versão de referência mais
// simples ("amador", que saiu da tela e ficou só como sparring), e de que nenhum trava a partida. Semente
// fixa por partida e assentos trocados a cada rodada, para o resultado não vir
// da vantagem de começar jogando.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
const { engine: E, bot: B } = loadModules();

const cre = (name, p, t, kw = []) => ({ name, type_line: 'Creature — Soldier', mana_cost: '{1}{G}', cmc: 2, colors: ['G'],
  power: String(p), toughness: String(t), keywords: kw, oracle_text: kw.join(', ') });
const CARDS = {
  Floresta: { name: 'Floresta', type_line: 'Basic Land — Forest', mana_cost: '', cmc: 0, colors: [], keywords: [], oracle_text: '{T}: Add {G}.' },
  Recruta: { ...cre('Recruta', 2, 1), mana_cost: '{G}', cmc: 1 },
  Urso: cre('Urso', 2, 2),
  Alce: { ...cre('Alce', 3, 3), mana_cost: '{2}{G}', cmc: 3 },
  Gigante: { ...cre('Gigante', 5, 5, ['Trample']), mana_cost: '{4}{G}', cmc: 5 },
  Sentinela: cre('Sentinela', 1, 4, ['Vigilance']),
  // U11 · voador para o segundo deck do torneio (evasão entra na avaliação do v2)
  Falcao: { ...cre('Falcao', 2, 1, ['Flying']), mana_cost: '{1}{G}', cmc: 2 },
  Flecha: { name: 'Flecha', type_line: 'Instant', mana_cost: '{1}{G}', cmc: 2, colors: ['G'], keywords: [], oracle_text: 'Flecha deals 3 damage to target creature.' },
  Crescimento: { name: 'Crescimento', type_line: 'Instant', mana_cost: '{G}', cmc: 1, colors: ['G'], keywords: [], oracle_text: 'Target creature gets +3/+3 until end of turn.' }
};
const SCRIPTS = {
  Flecha: { name: 'Flecha', effects: [{ do: 'damage', amount: 3, target: 'creature' }],
    example: { target: 'enemy-creature', expect: { damaged: 3 } } },
  Crescimento: { name: 'Crescimento', effects: [{ do: 'pump', power: 3, toughness: 3, target: 'creature' }],
    example: { target: 'own-creature', expect: { pump: [3, 3] } } }
};
const DECK = [{ name: 'Floresta', qty: 22, zone: 'main' }, { name: 'Recruta', qty: 6, zone: 'main' },
  { name: 'Urso', qty: 6, zone: 'main' }, { name: 'Alce', qty: 6, zone: 'main' },
  { name: 'Gigante', qty: 4, zone: 'main' }, { name: 'Sentinela', qty: 4, zone: 'main' },
  { name: 'Flecha', qty: 6, zone: 'main' }, { name: 'Crescimento', qty: 6, zone: 'main' }];

// U11 · segundo deck: voadores e mais remoção, para o torneio não medir um espelho só
const DECK_VOO = [['Floresta', 22], ['Falcao', 8], ['Urso', 6], ['Alce', 6], ['Gigante', 2], ['Flecha', 8], ['Crescimento', 8]].map(([name, qty]) => ({ name, qty, zone: 'main' }));

/** Política aleatória legal do motor (B1), embrulhada como bot. */
const botAleatorio = semente => {
  const politica = E.randomPolicy(semente);
  return { nivel: 'aleatorio', jogada(s, p) { const a = politica(s, p); return a ? { acao: a, motivo: 'aleatório' } : null; } };
};
const criaJogador = (nivel, semente) => nivel === 'aleatorio' ? botAleatorio(semente) : B.criaBot({ nivel });

/** Uma partida inteira entre dois bots. Devolve quem venceu e como foi. */
function partida({ seed, nivel0, nivel1, maxAcoes = 1200, deck0 = DECK, deck1 = DECK }) {
  let s = E.createGame({ format: 'livre', seed, mode: 'full', manaCheck: true, cards: CARDS, scripts: SCRIPTS,
    players: [{ name: 'P0', deck: deck0 }, { name: 'P1', deck: deck1 }] });
  const jogadores = [criaJogador(nivel0, seed), criaJogador(nivel1, seed + 7)];
  let acoes = 0, ilegal = null, pior = 0;
  const t0 = Date.now();
  for (let i = 0; i < maxAcoes && s.status !== 'over'; i++) {
    const quem = s.status === 'mulligan'
      ? s.players.findIndex(pl => !pl.kept)
      : s.pending ? s.pending.p : s.turn.priority;
    if (quem < 0) break;
    // leva 115: quem sabe decidir a mão inicial decide (o Shark v3); os outros mantêm, como antes
    if (s.status === 'mulligan') { const m = jogadores[quem].mulligan ? jogadores[quem].mulligan(s, quem) : { acao: { t: 'keep', p: quem, bottom: [] } }; s = E.apply(s, m.acao).state; continue; }
    const tj = Date.now();
    const j = jogadores[quem].jogada(s, quem);
    pior = Math.max(pior, Date.now() - tj);
    if (!j || !j.acao) break;
    try { s = E.apply(s, j.acao).state; } catch (e) { ilegal = `${quem}: ${j.acao.t} — ${e.message}`; break; }
    acoes++;
  }
  const ms = Date.now() - t0;
  return { vencedor: s.status === 'over' ? s.winner : null, turnos: s.turn.number, acoes, ms,
    msPorJogada: acoes ? ms / acoes : 0, pior, ilegal, vidas: s.players.map(p => p.life) };
}

/** Série de partidas com os assentos trocados a cada rodada. */
function serie({ nivelForte, nivelFraco, partidas = 12, base = 1000, misto = false }) {
  const r = { forte: 0, fraco: 0, semDecisao: 0, ilegais: [], turnos: 0, ms: 0, acoes: 0, pior: 0 };
  for (let i = 0; i < partidas; i++) {
    const forteComeca = i % 2 === 0;   // troca de assento a cada partida
    // misto: a cada par de partidas, um dos lados usa o deck de voadores, trocando quem fica com ele
    const decks = !misto || i % 4 < 2 ? [DECK, DECK] : (i >> 2) % 2 ? [DECK, DECK_VOO] : [DECK_VOO, DECK];
    const g = partida({ seed: base + i * 13, nivel0: forteComeca ? nivelForte : nivelFraco, nivel1: forteComeca ? nivelFraco : nivelForte, deck0: decks[0], deck1: decks[1] });
    r.pior = Math.max(r.pior, g.pior);
    if (g.ilegal) r.ilegais.push(`semente ${base + i * 13} · ${g.ilegal}`);
    r.turnos += g.turnos; r.ms += g.ms; r.acoes += g.acoes;
    if (g.vencedor == null) { r.semDecisao++; continue; }
    const venceuForte = (g.vencedor === 0) === forteComeca;
    if (venceuForte) r.forte++; else r.fraco++;
  }
  r.decididas = r.forte + r.fraco;
  r.taxa = r.decididas ? r.forte / r.decididas : 0;
  return r;
}
const relatorio = (titulo, r, partidas) => [
  `${titulo}: ${r.forte}–${r.fraco} em ${r.decididas} decididas de ${partidas}`,
  `  taxa do mais forte: ${(r.taxa * 100).toFixed(0)}% · sem decisão: ${r.semDecisao}`,
  `  turnos médios: ${(r.turnos / partidas).toFixed(1)} · tempo médio por jogada: ${(r.ms / Math.max(1, r.acoes)).toFixed(1)} ms · pior jogada: ${r.pior} ms`
].join('\n');

test('B6 · o sparring (amador) ganha da política aleatória em pelo menos 70% das partidas decididas', () => {
  const partidas = 16;
  const r = serie({ nivelForte: 'amador', nivelFraco: 'aleatorio', partidas, base: 2000 });
  console.log(relatorio('sparring × aleatório', r, partidas));
  assert.deepEqual(r.ilegais, [], 'nenhuma partida terminou por ação ilegal');
  assert.equal(r.decididas >= partidas * 0.6, true, `só ${r.decididas} de ${partidas} partidas decidiram`);
  assert.equal(r.taxa >= 0.7, true, `o sparring ganhou ${(r.taxa * 100).toFixed(0)}% das decididas`);
});

test('U10 · o Shark ganha da política aleatória em pelo menos 80% das partidas decididas', () => {
  const partidas = 16;
  const r = serie({ nivelForte: 'shark', nivelFraco: 'aleatorio', partidas, base: 5000 });
  console.log(relatorio('Shark × aleatório', r, partidas));
  assert.deepEqual(r.ilegais, [], 'nenhuma partida terminou por ação ilegal');
  assert.equal(r.decididas >= partidas * 0.6, true, `só ${r.decididas} de ${partidas} partidas decidiram`);
  assert.equal(r.taxa >= 0.8, true, `o Shark ganhou ${(r.taxa * 100).toFixed(0)}% das decididas`);
});

test('B6 · o Shark (profissional) ganha do sparring em pelo menos 60% das partidas decididas', () => {
  // 24 partidas: com 12 a medida balança ±15 pontos e o número não significa nada.
  const partidas = 24;
  const r = serie({ nivelForte: 'profissional', nivelFraco: 'amador', partidas, base: 3000 });
  console.log(relatorio('Shark × sparring', r, partidas));
  assert.deepEqual(r.ilegais, [], 'nenhuma partida terminou por ação ilegal');
  assert.equal(r.decididas >= partidas * 0.6, true, `só ${r.decididas} de ${partidas} partidas decidiram`);
  assert.equal(r.taxa >= 0.6, true, `o profissional ganhou ${(r.taxa * 100).toFixed(0)}% das decididas`);
});

test('B6 · a mesma semente dá sempre a mesma partida', () => {
  const a = partida({ seed: 4242, nivel0: 'profissional', nivel1: 'amador' });
  const b = partida({ seed: 4242, nivel0: 'profissional', nivel1: 'amador' });
  assert.deepEqual({ v: a.vencedor, t: a.turnos, n: a.acoes, vidas: a.vidas.join(',') },
    { v: b.vencedor, t: b.turnos, n: b.acoes, vidas: b.vidas.join(',') }, 'torneio reproduzível');
});

// U11 · o Shark atual (v2) contra a versão anterior congelada ('shark-v1'). 40 partidas com semente fixa, assentos
// trocados e metade com o deck de voadores. Medido na leva 101: 72% em 60 partidas no roteiro de exploração;
// aqui o piso é 60%, com margem para o sorteio. E o tempo: nenhuma jogada acima de 1 s no Node (no celular,
// ~3× mais lento, a média de poucos ms por jogada continua longe do limite).
test('U11 · o Shark v2 ganha do Shark v1 em pelo menos 60% das partidas decididas, sem ação ilegal e rápido', () => {
  const partidas = 40;
  // leva 115: 'shark' passou a ser o v3; a referência desta medida é o v2 congelado
  const r = serie({ nivelForte: 'shark-v2', nivelFraco: 'shark-v1', partidas, base: 7000, misto: true });
  console.log(relatorio('Shark v2 × Shark v1', r, partidas));
  assert.deepEqual(r.ilegais, [], 'nenhuma partida terminou por ação ilegal');
  assert.equal(r.decididas >= partidas * 0.8, true, `só ${r.decididas} de ${partidas} partidas decidiram`);
  assert.equal(r.taxa >= 0.6, true, `o v2 ganhou ${(r.taxa * 100).toFixed(0)}% das decididas`);
  assert.equal(r.pior < 1000, true, `pior jogada ${r.pior} ms`);
  assert.equal(r.ms / Math.max(1, r.acoes) < 50, true, 'média por jogada abaixo de 50 ms');
});

test('U11 · v1 e v2 só diferem por critério: a avaliação v2 é determinística e respeita vitória e derrota', () => {
  const s = E.createGame({ format: 'livre', seed: 11, mode: 'full', manaCheck: true, cards: CARDS, scripts: SCRIPTS, players: [{ name: 'P0', deck: DECK }, { name: 'P1', deck: DECK_VOO }] });
  assert.deepEqual(B.avaliaV2(s, 0), B.avaliaV2(s, 0));
  const t = JSON.parse(JSON.stringify(s)); t.players[1].lost = true; t.status = 'over'; t.winner = 0;
  assert.equal(B.avaliaV2(t, 0).parcelas.vitoria, B.PESOS.vitoria);
  assert.equal(B.criaBot({ nivel: 'shark' }).nivel, 'shark'); assert.equal(B.criaBot({ nivel: 'shark-v1' }).nivel, 'shark-v1'); assert.equal(B.criaBot({ nivel: 'shark-v2' }).nivel, 'shark-v2'); assert.equal(B.criaBot({ nivel: 'shark-v3' }).nivel, 'shark-v3'); assert.equal(B.criaBot({ nivel: 'shark-v4' }).nivel, 'shark-v4'); assert.equal(B.criaBot({ nivel: 'shark-v5' }).nivel, 'shark-v5');
});

// Leva 115 · o Shark atual (v3) contra o v2 congelado. Medido em 01/10/2026: 57% em 160 partidas com estes decks de
// teste e 65% em 221 partidas com as sete listas Pauper de verdade (node torneio.listas.mjs shark shark-v2 4 20000).
// Aqui o piso é 52% em 60 partidas de semente fixa (o portão precisa caber no tempo): a medida larga é a de cima.
// Leva 117 · 'shark' passou a ser o v4: o v3 com informação justa (decide sobre mundos possíveis, sem ver a mão do
// oponente nem a ordem dos grimórios). Medido em 02/10/2026 nas sete listas Pauper, 224 partidas cada:
// v4 × v2 = 64% em 222 decididas (o v3, que espiava, fazia 65%); v4 × v3 congelado = 46% em 220 (dentro da margem
// de ±7: parar de espiar não custou força mensurável). O piso de 52% contra o v2 continua valendo.
// Leva 118 · sequência do turno (não gasta mana na manutenção, escolhe o terreno pela jogada seguinte e pela cor que a
// mão pede, e a nota de passar com a pilha cheia é a de depois de a pilha resolver). O v4 fica congelado ('shark-v4').
// Medido em 02/10/2026, sete listas Pauper, 224 partidas: atual × v4 = 57% em 221 decididas (125–96), na borda da
// margem de ±7. Peças isoladas ficaram no ruído: manutenção+terreno 49%; pilha 52%; o plano de duas jogadas (50%,
// e mais lento) foi retirado.
// Leva 119 · usar os recursos (permanente entra com a mana que ia sobrar, descarte pela carta que menos faz falta),
// correção do toque de terreno à toa (regressão da 118) e relógio na leitura das respostas. O v5 fica congelado
// ('shark-v5'). Medido em 02/10/2026, sete listas Pauper, 448 partidas em duas fatias: atual × v5 = 54% em 443
// decididas (238–205; fatias 59% e 49%), dentro da margem de ±5: ganho de força NÃO demonstrado.
test('Leva 115/117 · o Shark atual ganha do Shark v2 em mais da metade das partidas decididas, sem ação ilegal e rápido', () => {
  const partidas = 60;
  const r = serie({ nivelForte: 'shark', nivelFraco: 'shark-v2', partidas, base: 9000, misto: true });
  console.log(relatorio('Shark atual × Shark v2', r, partidas));
  assert.deepEqual(r.ilegais, [], 'nenhuma partida terminou por ação ilegal');
  assert.equal(r.decididas >= partidas * 0.9, true, `só ${r.decididas} de ${partidas} partidas decidiram`);
  assert.equal(r.taxa >= 0.52, true, `o v3 ganhou ${(r.taxa * 100).toFixed(0)}% das decididas`);
  assert.equal(r.pior < 1500, true, `pior jogada ${r.pior} ms`);
});

// Leva 115 · com cartas de verdade: o Shark joga as listas Pauper do app (escolhas, gatilhos, fichas, insanidade)
// sem nunca propor ação ilegal e sem travar a partida.
test('Leva 115 · o Shark joga as listas Pauper de verdade sem ação ilegal e as partidas terminam', { timeout: 300000 }, async () => {
  const { listas, partida: real } = await import('./torneio.listas.mjs');
  assert.equal(listas.length, 7);
  const jogos = [[0, 1], [2, 3], [4, 5], [6, 0]].map(([a, b], i) => real(31000 + i * 17, 'shark', 'shark-v2', listas[a], listas[b], 1500));
  assert.deepEqual(jogos.map(g => g.ilegal).filter(Boolean), [], 'nenhuma ação ilegal');
  assert.ok(jogos.filter(g => g.v != null).length >= 3, 'as partidas terminam: ' + JSON.stringify(jogos.map(g => [g.v, g.turnos])));
});
