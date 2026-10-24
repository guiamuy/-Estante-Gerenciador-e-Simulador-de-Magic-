// R-31 · F · força do Shark por lista: a medida da trilha bot vai para o Painel Estante (sub-aba Jogo, R-32).
// Reusa `partida` e `listasDoShark` do torneio.listas.mjs com as MESMAS sementes do `MODO=confrontos` (B-174): cada par
// de listas joga `rodadas` sementes nos dois assentos, um nível só nos dois lados — a força de cada LISTA com o Shark de hoje.
// O método é da trilha bot; este arquivo só mede com ele e grava `telemetria/forca.jsonl` (tipo `forca`; só contagens e arquétipos).
// Uso: node forca.mjs [--nivel shark] [--rodadas 2] [--semente 100] [--sem-telemetria] [--nota "…"]
//   --sem-telemetria (e CI) só imprime. Falha de envio nunca derruba a medida. Leva minutos (não é teste do portão).
import { gravar } from './telemetria.mjs';

export const SEMENTE_PADRAO = 100, RODADAS_PADRAO = 2, PASSO_DA_SEMENTE = 17;

/** Todos contra todos, `rodadas` sementes por par, dois assentos cada (a mesma ordem e as mesmas sementes do torneio: `base + k*17`). */
export function confrontos({ listas, nivel = 'shark', rodadas = RODADAS_PADRAO, base = SEMENTE_PADRAO, joga }) {
  if (!Array.isArray(listas) || listas.length < 2) throw new Error('forca: preciso de pelo menos duas listas');
  if (typeof joga !== 'function') throw new Error('forca: faltou a função partida');
  const campo = listas.map(() => [0, 0]); const ilegais = []; let pior = 0, k = 0, partidas = 0, decididas = 0;
  for (let a = 0; a < listas.length; a++) for (let b = a + 1; b < listas.length; b++) for (let r = 0; r < rodadas; r++) for (const assento of [0, 1]) {
    const seed = base + (k++) * PASSO_DA_SEMENTE; partidas++;
    const g = assento === 0 ? joga(seed, nivel, nivel, listas[a], listas[b]) : joga(seed, nivel, nivel, listas[b], listas[a]);
    pior = Math.max(pior, g.pior || 0); if (g.ilegal) ilegais.push(String(g.ilegal));
    if (g.v == null) continue;
    decididas++;
    const venceuA = (g.v === 0) === (assento === 0);
    campo[venceuA ? a : b][0]++; campo[venceuA ? b : a][1]++;
  }
  const nome = l => l.arquetipo || l.name || l.id || '?';
  return {
    listas: listas.map((l, i) => ({ lista: String(nome(l)).slice(0, 60), vitorias: campo[i][0], derrotas: campo[i][1], pct: campo[i][0] + campo[i][1] ? Math.round(1000 * campo[i][0] / (campo[i][0] + campo[i][1])) / 10 : null })),
    partidas, decididas, pior, ilegais
  };
}

/** O registro `forca` da telemetria: só números e arquétipos; `ilegais` vira contagem. */
export function registroDeForca(r, { trilha = 'radar', conversa = null, nivel = 'shark', motor, rodadas = RODADAS_PADRAO, semente = SEMENTE_PADRAO, segundos = null, nota = null, sha = null } = {}) {
  const reg = { trilha, nivel, motor, rodadas, semente, partidas: r.partidas, decididas: r.decididas, pior_jogada_ms: Math.round(r.pior || 0), ilegais: (r.ilegais || []).length, listas: r.listas };
  if (conversa) reg.conversa = conversa; if (segundos != null) reg.segundos = segundos; if (nota) reg.nota = nota; if (sha) reg.sha = sha;
  return reg;
}

/** Grava no ramo `telemetria` (fora da fila e do portão). Para a trilha bot chamar no fim do `MODO=confrontos`, se quiser. */
export function gravaForca(registro, opts = {}) { return gravar({ tipo: 'forca', registro, ...opts }); }

if (process.argv[1] && process.argv[1].endsWith('forca.mjs')) {
  const ARGS = {}; for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) { const prox = process.argv[i + 1]; if (prox && !prox.startsWith('--')) { ARGS[a.slice(2)] = prox; i++; } else ARGS[a.slice(2)] = true; } }
  const nivel = ARGS.nivel || 'shark', rodadas = +(ARGS.rodadas || RODADAS_PADRAO), base = +(ARGS.semente || SEMENTE_PADRAO);
  const { partida, listasDoShark } = await import('./torneio.listas.mjs');
  const { loadModules } = await import('./_load.mjs');
  const motor = loadModules().engine.ENGINE_VERSION;
  const listas = listasDoShark();
  console.log(`forca · nível ${nivel} · motor v${motor} · ${listas.length} listas · ${rodadas} rodada(s) · semente ${base}`);
  const t0 = Date.now();
  const r = confrontos({ listas, nivel, rodadas, base, joga: partida });
  const segundos = Math.round((Date.now() - t0) / 1000);
  for (const l of r.listas) console.log(`contra o campo · ${l.lista}: ${l.vitorias}–${l.derrotas} (${l.pct == null ? '-' : l.pct}%)`);
  console.log(`pior jogada ${r.pior} ms · ilegais ${r.ilegais.length} ${JSON.stringify([...new Set(r.ilegais)].slice(0, 4))} · ${r.decididas} decididas de ${r.partidas} · ${segundos} s`);
  const registro = registroDeForca(r, { nivel, motor, rodadas, semente: base, segundos, nota: typeof ARGS.nota === 'string' ? ARGS.nota : null });
  if (ARGS['sem-telemetria'] || process.env.CI) console.log('telemetria desligada: ' + JSON.stringify(registro));
  else {
    try { const g = gravaForca(registro); console.log(`telemetria: força gravada em ${g.arquivo} (${g.enviado ? 'enviado ao ramo telemetria' : 'só na pasta'})`); }
    catch (e) { console.log(`telemetria não gravada (${String(e && e.message).split('\n')[0].slice(0, 120)}); a medida vale do mesmo jeito`); }
  }
}
