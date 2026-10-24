// B-178 · Cronometra cada decisão do Shark em partidas Shark × Shark com as cinco listas do Shark (os 20 confrontos).
// Fora do portão (não é teste). Uso: node bot.tempo.mjs [orcamentoMs=400] [nivel=shark | shark-v12 | z:peça,…] [semente=1] [saida.json]
// Imprime p50/p90/p95/p99/pior, quantas decisões passaram do orçamento e as dez piores com o contexto.
const [ORC, NIVEL, SEM, SAIDA] = [+(process.argv[2] || 400), process.argv[3] || 'shark', +(process.argv[4] || 1), process.argv[5]];
const { loadModules } = await import('./_load.mjs');
const { listasDoShark } = await import('./torneio.listas.mjs');
const { engine: E, bot: B } = loadModules();
const L = listasDoShark(); const tempos = [], lentas = [];
let ilegais = 0;
for (let i = 0; i < L.length; i++) for (let j = 0; j < L.length; j++) {
  if (i === j) continue;
  const a = L[i], b = L[j], cards = {}; for (const x of [a, b]) for (const e of x.entries) cards[e.name] = x.cartas[e.name];
  let s = E.createGame({ format: 'pauper', seed: SEM * 100 + i * 7 + j, mode: 'full', manaCheck: true, cards, players: [{ name: 'A', deck: a.entries }, { name: 'B', deck: b.entries }] });
  const cria = () => NIVEL.startsWith('z:') ? B.criaBot({ nivel: 'shark', orcamentoMs: ORC, extra: Object.fromEntries(NIVEL.slice(2).split(',').map(k => [k, true])) }) : B.criaBot({ nivel: NIVEL, orcamentoMs: ORC });
  const bots = [cria(), cria()];
  for (let k = 0; k < 1500 && s.status !== 'over'; k++) {
    const q = s.status === 'mulligan' ? s.players.findIndex(p => !p.kept) : s.pending ? s.pending.p : s.turn.priority;
    const t0 = performance.now();
    const j2 = s.status === 'mulligan' ? bots[q].mulligan(s, q) : bots[q].jogada(s, q);
    const ms = performance.now() - t0;
    if (s.status !== 'mulligan') {
      tempos.push(ms);
      if (ms > ORC) lentas.push({ ms: Math.round(ms), lista: [a.id, b.id][q], passo: s.turn.step, pend: s.pending ? s.pending.kind : null, legais: E.legalActions(s, q).length, acao: j2.acao.t, campo: s.zones[0].battlefield.length + s.zones[1].battlefield.length, mao: s.zones[q].hand.length, motivo: (j2.motivo || '').slice(0, 60) });
    }
    try { s = E.apply(s, j2.acao).state; } catch (e) { ilegais++; break; }
  }
}
tempos.sort((x, y) => x - y);
const q = p => Math.round(tempos[Math.min(tempos.length - 1, Math.floor(p * tempos.length))]);
const res = { orc: ORC, nivel: NIVEL, decisoes: tempos.length, p50: q(0.5), p90: q(0.9), p95: q(0.95), p99: q(0.99), max: Math.round(tempos[tempos.length - 1]), acimaOrc: lentas.length, ilegais };
console.log(JSON.stringify(res));
const porPend = {}; for (const l of lentas) { const k = (l.pend || l.passo) + '/' + l.acao; porPend[k] = (porPend[k] || 0) + 1; }
console.log('lentas por momento/ação:', JSON.stringify(Object.entries(porPend).sort((x, y) => y[1] - x[1]).slice(0, 12)));
console.log('10 piores:'); for (const l of lentas.sort((x, y) => y.ms - x.ms).slice(0, 10)) console.log(' ', JSON.stringify(l));
if (SAIDA) (await import('fs')).writeFileSync(SAIDA, JSON.stringify({ res, lentas }, null, 1));
