// Camada 2 · B6 · torneio de bots: a única prova de que "profissional" é mesmo
// mais forte que "amador", e de que nenhum dos dois trava a partida. Semente
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

/** Política aleatória legal do motor (B1), embrulhada como bot. */
const botAleatorio = semente => {
  const politica = E.randomPolicy(semente);
  return { nivel: 'aleatorio', jogada(s, p) { const a = politica(s, p); return a ? { acao: a, motivo: 'aleatório' } : null; } };
};
const criaJogador = (nivel, semente) => nivel === 'aleatorio' ? botAleatorio(semente) : B.criaBot({ nivel });

/** Uma partida inteira entre dois bots. Devolve quem venceu e como foi. */
function partida({ seed, nivel0, nivel1, maxAcoes = 1200 }) {
  let s = E.createGame({ format: 'livre', seed, mode: 'full', manaCheck: true, cards: CARDS, scripts: SCRIPTS,
    players: [{ name: 'P0', deck: DECK }, { name: 'P1', deck: DECK }] });
  const jogadores = [criaJogador(nivel0, seed), criaJogador(nivel1, seed + 7)];
  let acoes = 0, ilegal = null;
  const t0 = Date.now();
  for (let i = 0; i < maxAcoes && s.status !== 'over'; i++) {
    const quem = s.status === 'mulligan'
      ? s.players.findIndex(pl => !pl.kept)
      : s.pending ? s.pending.p : s.turn.priority;
    if (quem < 0) break;
    if (s.status === 'mulligan') { s = E.apply(s, { t: 'keep', p: quem, bottom: [] }).state; continue; }
    const j = jogadores[quem].jogada(s, quem);
    if (!j || !j.acao) break;
    try { s = E.apply(s, j.acao).state; } catch (e) { ilegal = `${quem}: ${j.acao.t} — ${e.message}`; break; }
    acoes++;
  }
  const ms = Date.now() - t0;
  return { vencedor: s.status === 'over' ? s.winner : null, turnos: s.turn.number, acoes, ms,
    msPorJogada: acoes ? ms / acoes : 0, ilegal, vidas: s.players.map(p => p.life) };
}

/** Série de partidas com os assentos trocados a cada rodada. */
function serie({ nivelForte, nivelFraco, partidas = 12, base = 1000 }) {
  const r = { forte: 0, fraco: 0, semDecisao: 0, ilegais: [], turnos: 0, ms: 0, acoes: 0 };
  for (let i = 0; i < partidas; i++) {
    const forteComeca = i % 2 === 0;   // troca de assento a cada partida
    const g = partida({ seed: base + i * 13, nivel0: forteComeca ? nivelForte : nivelFraco, nivel1: forteComeca ? nivelFraco : nivelForte });
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
  `  turnos médios: ${(r.turnos / partidas).toFixed(1)} · tempo médio por jogada: ${(r.ms / Math.max(1, r.acoes)).toFixed(1)} ms`
].join('\n');

test('B6 · o amador ganha da política aleatória em pelo menos 70% das partidas decididas', () => {
  const partidas = 16;
  const r = serie({ nivelForte: 'amador', nivelFraco: 'aleatorio', partidas, base: 2000 });
  console.log(relatorio('amador × aleatório', r, partidas));
  assert.deepEqual(r.ilegais, [], 'nenhuma partida terminou por ação ilegal');
  assert.equal(r.decididas >= partidas * 0.6, true, `só ${r.decididas} de ${partidas} partidas decidiram`);
  assert.equal(r.taxa >= 0.7, true, `o amador ganhou ${(r.taxa * 100).toFixed(0)}% das decididas`);
});

test('B6 · o profissional ganha do amador em pelo menos 60% das partidas decididas', () => {
  // 24 partidas: com 12 a medida balança ±15 pontos e o número não significa nada.
  const partidas = 24;
  const r = serie({ nivelForte: 'profissional', nivelFraco: 'amador', partidas, base: 3000 });
  console.log(relatorio('profissional × amador', r, partidas));
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
