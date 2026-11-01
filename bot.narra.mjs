// B-188 · B25 fase 1 · PARTIDAS NARRADAS do Shark: joga Shark × Shark com uma lista pilotada contra o campo e escreve, das
// partidas que o piloto perdeu (ou de todas, com TODAS=1), a narração compacta: cabeçalho de cada turno (vida, mão, grimório,
// campo dos dois) e cada jogada que não é passar, com o motivo que o Shark deu. É a matéria-prima do diagnóstico: cada erro
// de jogo achado vira posição na bateria (bot.bateria.mjs) antes da correção. Fora do portão.
// Uso: PILOTO=<índice> node bot.narra.mjs [partidas=8] [semente=500] [saida.txt]   (ORC=400 por padrão; NIVEL=shark)
import { writeFileSync } from 'node:fs';
import { loadModules } from './_load.mjs';
import { listasDoShark } from './torneio.listas.mjs';
const { engine: E, bot: B } = loadModules();

const L = listasDoShark(), PIL = +(process.env.PILOTO || 1), ORC = +(process.env.ORC || 400), NIVEL = process.env.NIVEL || 'shark';
const [N, BASE, SAIDA] = [+(process.argv[2] || 8), +(process.argv[3] || 500), process.argv[4]];
const nome = (s, oid) => (s.objects[oid] || {}).name || oid;
const campo = (s, p) => s.zones[p].battlefield.map(o => { const x = s.objects[o]; const st = E.stats ? E.stats(s, x) : null;
  const pt = st && st.power != null && (s.facts[x.name] || { types: [] }).types.includes('creature') ? ` ${st.power}/${st.toughness}` : '';
  return x.name + pt + (x.tapped ? '*' : ''); }).join(', ');
const acaoTexto = (s, a) => {
  const alvos = (a.targets || []).map(t => t.oid ? nome(s, t.oid) : 'jogador ' + t.player).join(' + ');
  const at = (a.attackers || []).map(o => nome(s, o)).join(', '), bl = (a.blocks || []).map(([b, x]) => `${nome(s, b)}→${nome(s, x)}`).join(', ');
  return `${a.t}${a.oid ? ' ' + nome(s, a.oid) : ''}${alvos ? ' → ' + alvos : ''}${at ? ' [' + at + ']' : ''}${bl ? ' [' + bl + ']' : ''}`;
};

export function narra(seed, d0, d1, piloto) {
  const cards = {}; for (const d of [d0, d1]) for (const e of d.entries) cards[e.name] = d.cartas[e.name];
  let s = E.createGame({ format: 'pauper', seed, mode: 'full', manaCheck: true, cards, players: [{ name: 'P0', deck: d0.entries }, { name: 'P1', deck: d1.entries }] });
  const bots = [B.criaBot({ nivel: NIVEL, orcamentoMs: ORC }), B.criaBot({ nivel: NIVEL, orcamentoMs: ORC })];
  const linhas = []; let turno = 0;
  for (let i = 0; i < 1500 && s.status !== 'over'; i++) {
    const quem = s.status === 'mulligan' ? s.players.findIndex(pl => !pl.kept) : s.pending ? s.pending.p : s.turn.priority;
    if (quem < 0) break;
    if (s.status === 'mulligan') {
      const m = bots[quem].mulligan(s, quem);
      linhas.push(`${quem === piloto ? 'EU ' : 'ELE'} mulligan: ${m.acao.t} · mão: ${s.zones[quem].hand.map(o => nome(s, o)).join(', ')}`);
      s = E.apply(s, m.acao).state; continue;
    }
    if (s.turn.number !== turno) {
      turno = s.turn.number;
      const vez = s.turn.active === piloto ? 'MEU' : 'DELE';
      linhas.push(`— T${turno} (${vez}) · vida eu ${s.players[piloto].life} × ele ${s.players[1 - piloto].life} · mão eu ${s.zones[piloto].hand.length}: ${s.zones[piloto].hand.map(o => nome(s, o)).join(', ')} · mão dele ${s.zones[1 - piloto].hand.length}`);
      linhas.push(`   campo eu: ${campo(s, piloto)}`);
      linhas.push(`   campo ele: ${campo(s, 1 - piloto)}`);
    }
    const j = bots[quem].jogada(s, quem);
    if (!j || !j.acao) { linhas.push(`!! ${quem} sem jogada`); break; }
    if (j.acao.t !== 'pass' && j.acao.t !== 'tap_mana') linhas.push(`   ${quem === piloto ? 'EU ' : 'ELE'} ${s.turn.step}${s.stack.length ? '+pilha' : ''}: ${acaoTexto(s, j.acao)} · ${j.motivo || ''}`);
    try { s = E.apply(s, j.acao).state; } catch (e) { linhas.push(`!! ilegal: ${e.message}`); break; }
  }
  return { venceu: s.status === 'over' ? s.winner === piloto : null, turnos: s.turn.number, linhas };
}

if (process.argv[1] && process.argv[1].endsWith('bot.narra.mjs')) {
  const out = []; let v = 0, d = 0;
  const outras = L.map((_, i) => i).filter(i => i !== PIL);
  for (let k = 0; k < N; k++) {
    const b = outras[k % outras.length], assento = Math.floor(k / outras.length) % 2;
    const seed = BASE + k * 17;
    const r = assento === 0 ? narra(seed, L[PIL], L[b], 0) : narra(seed, L[b], L[PIL], 1);
    if (r.venceu) v++; else d++;
    if (!r.venceu || process.env.TODAS) out.push(`=== ${L[PIL].id} × ${L[b].id} · semente ${seed} · ${assento ? 'eu jogo depois' : 'eu começo'} · ${r.venceu ? 'VENCI' : r.venceu === false ? 'PERDI' : 'sem decisão'} em ${r.turnos} turnos`, ...r.linhas, '');
  }
  out.unshift(`piloto ${L[PIL].id} · ${NIVEL} · ${ORC} ms · ${v} vitórias, ${d} derrotas em ${N}`);
  if (SAIDA) writeFileSync(SAIDA, out.join('\n')); else console.log(out.join('\n'));
  console.log(out[0]);
}
