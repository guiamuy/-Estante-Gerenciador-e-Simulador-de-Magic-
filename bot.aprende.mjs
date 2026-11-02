// B-194 · B25 fase 2 · AVALIAÇÃO APRENDIDA (ferramenta de medida, fora do portão). Primeira medida no ROADMAP (B25, B-194).
// coleta: joga Shark × Shark rápido com as cinco listas e grava, de posições sorteadas, as parcelas da avaliação do Shark
//         (avaliaV6) de quem decide e, no fim, se essa pessoa venceu. Uma linha JSON por posição.
// ajusta: regressão logística (com L2, treino e prova separados por partida) da vitória sobre as parcelas, por lista do
//         jogador; devolve o multiplicador de cada parcela (o `avaliadorCom` já aceita multiplicador por parcela).
// Uso: ORC=100 node bot.aprende.mjs coleta <partidas> <semente> <saida.jsonl>
//      node bot.aprende.mjs ajusta <entrada.jsonl> [mais.jsonl …]
import { appendFileSync, readFileSync } from 'node:fs';
import { loadModules } from './_load.mjs';
import { listasDoShark } from './torneio.listas.mjs';
const { engine: E, bot: B } = loadModules();
const L = listasDoShark();

function coleta(N, base, saida, { orc = +(process.env.ORC || 100), cada = 6 } = {}) {
  let k = 0;
  for (let g = 0; g < N; g++) {
    const a = g % L.length, b = Math.floor(g / L.length) % L.length; if (a === b) continue;
    const seed = base + g * 17, cards = {}; for (const d of [L[a], L[b]]) for (const e of d.entries) cards[e.name] = d.cartas[e.name];
    let s = E.createGame({ format: 'pauper', seed, mode: 'full', manaCheck: true, cards, players: [{ name: 'P0', deck: L[a].entries }, { name: 'P1', deck: L[b].entries }] });
    const bots = [B.criaBot({ nivel: 'shark', orcamentoMs: orc, mundos: 1 }), B.criaBot({ nivel: 'shark', orcamentoMs: orc, mundos: 1 })];
    const pos = []; let rng = seed >>> 0; const sorteia = () => { rng = (Math.imul(rng, 1103515245) + 12345) >>> 0; return rng / 4294967296; };
    for (let i = 0; i < 1500 && s.status !== 'over'; i++) {
      const quem = s.status === 'mulligan' ? s.players.findIndex(pl => !pl.kept) : s.pending ? s.pending.p : s.turn.priority;
      if (quem < 0) break;
      if (s.status === 'mulligan') { s = E.apply(s, bots[quem].mulligan(s, quem).acao).state; continue; }
      if (!s.pending && !s.stack.length && sorteia() < 1 / cada) {
        const av = B.avaliaV6(s, quem); if (!av.parcelas.vitoria) pos.push({ p: quem, lista: quem === 0 ? L[a].id : L[b].id, contra: quem === 0 ? L[b].id : L[a].id, turno: s.turn.number, x: av.parcelas });
      }
      const j = bots[quem].jogada(s, quem); if (!j || !j.acao) break;
      try { s = E.apply(s, j.acao).state; } catch { break; }
    }
    if (s.status !== 'over') continue;
    for (const q of pos) appendFileSync(saida, JSON.stringify({ g: seed, ...q, v: s.winner === q.p ? 1 : 0 }) + '\n');
    k++;
  }
  return k;
}

function ajusta(arqs, { l2 = 0.01, passos = 3000, taxa = 0.05 } = {}) {
  const linhas = arqs.flatMap(f => readFileSync(f, 'utf8').split('\n').filter(Boolean).map(x => JSON.parse(x)));
  const chaves = [...new Set(linhas.flatMap(l => Object.keys(l.x)))].filter(k => k !== 'vitoria').sort();
  const escala = Object.fromEntries(chaves.map(k => [k, Math.max(1e-9, Math.sqrt(linhas.reduce((s, l) => s + (l.x[k] || 0) ** 2, 0) / linhas.length))]));
  const grupos = { todas: linhas, ...Object.fromEntries(L.map(d => [d.id, linhas.filter(l => l.lista === d.id)])) };
  const out = {};
  for (const [nome, dados] of Object.entries(grupos)) {
    if (dados.length < 200) { out[nome] = { n: dados.length, pouco: true }; continue; }
    const prova = dados.filter(l => (l.g % 5) === 0), treino = dados.filter(l => (l.g % 5) !== 0);
    const X = d => chaves.map(k => (d.x[k] || 0) / escala[k]);
    let w = chaves.map(() => 0), b0 = 0;
    for (let it = 0; it < passos; it++) {
      const gw = w.map(() => 0); let gb = 0;
      for (const d of treino) { const x = X(d); const z = b0 + x.reduce((s, v, i) => s + v * w[i], 0); const e = 1 / (1 + Math.exp(-z)) - d.v; x.forEach((v, i) => { gw[i] += e * v; }); gb += e; }
      w = w.map((wi, i) => wi - taxa * (gw[i] / treino.length + l2 * wi)); b0 -= taxa * gb / treino.length;
    }
    const perda = conj => conj.reduce((s, d) => { const z = b0 + X(d).reduce((t, v, i) => t + v * w[i], 0); const pr = 1 / (1 + Math.exp(-z)); return s - (d.v ? Math.log(pr + 1e-9) : Math.log(1 - pr + 1e-9)); }, 0) / conj.length;
    const acerto = conj => conj.filter(d => ((b0 + X(d).reduce((t, v, i) => t + v * w[i], 0)) > 0) === !!d.v).length / conj.length;
    // multiplicador relativo: peso aprendido por unidade de parcela, normalizado pela média dos positivos
    const bruto = Object.fromEntries(chaves.map((k, i) => [k, w[i] / escala[k]]));
    const pos = Object.values(bruto).filter(v => v > 0); const media = pos.length ? pos.reduce((a, c) => a + c, 0) / pos.length : 1;
    out[nome] = { n: dados.length, treino: treino.length, prova: prova.length, perdaProva: +perda(prova).toFixed(4), acertoProva: +acerto(prova).toFixed(3),
      mult: Object.fromEntries(Object.entries(bruto).map(([k, v]) => [k, +(v / media).toFixed(2)])) };
  }
  return out;
}

if (process.argv[1] && process.argv[1].endsWith('bot.aprende.mjs')) {
  const [cmd, ...r] = process.argv.slice(2);
  if (cmd === 'coleta') console.log('partidas decididas', coleta(+r[0], +r[1], r[2]));
  else if (cmd === 'ajusta') console.log(JSON.stringify(ajusta(r), null, 1));
  else console.log('uso: coleta <partidas> <semente> <saida.jsonl> | ajusta <arquivos…>');
}
