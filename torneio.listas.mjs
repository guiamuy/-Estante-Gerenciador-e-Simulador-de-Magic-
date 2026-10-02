// Leva 115 · torneio do Shark com as listas Pauper de verdade (não é teste do portão: leva minutos).
// Uso: node torneio.listas.mjs <forte> <fraco> <rodadas> <semente>   ex.: node torneio.listas.mjs shark shark-v2 4 20000
// Cada confronto entre as sete listas é jogado nos dois lados e nos dois assentos. Os dados das cartas vêm de
// .listas/oficiais.json (texto oficial); cor, valor de mana e palavras-chave são derivados do texto.
// Níveis: 'shark' (v4, informação justa; 'shark:N' muda o número de mundos), 'shark-v3', 'shark-v2', 'shark-v1', 'amador', ou 'x:mull,av3,projeta,corrida,sub,valor,desdobra' para ligar peças do v3 uma a uma.
import { readFileSync } from 'node:fs';
import { loadModules } from './_load.mjs';
const { engine: E, bot: B, starter: ST, decks: D } = loadModules();
const VOCAB = ['flying', 'haste', 'reach', 'trample', 'vigilance', 'deathtouch', 'lifelink', 'first strike', 'double strike', 'menace', 'defender', 'flash', 'hexproof', 'indestructible', 'shroud', 'changeling', 'devoid', 'storm', 'ward', 'prowess'];
function cartasReais(raiz = '.') {
  const of = JSON.parse(readFileSync(raiz + '/.listas/oficiais.json', 'utf8')).cartas;
  const out = {};
  for (const c of of) {
    const custo = c.mana_cost || '';
    const simbolos = [...custo.matchAll(/\{([^}]+)\}/g)].map(m => m[1]);
    const cmc = simbolos.reduce((n, x) => n + (/^\d+$/.test(x) ? +x : x === 'X' ? 0 : 1), 0);
    const colors = [...new Set(simbolos.flatMap(x => x.split('/')).filter(x => 'WUBRG'.includes(x) && x.length === 1))];
    const kws = new Set();
    for (const linha of String(c.oracle_text || '').split('\n')) {
      const limpa = linha.replace(/\(.*?\)/g, '').trim().toLowerCase();
      const partes = limpa.split(/[,;]/).map(x => x.trim()).filter(Boolean);
      if (partes.length && partes.every(x => VOCAB.some(v => x === v || x.startsWith(v + ' ')))) partes.forEach(x => kws.add(VOCAB.find(v => x === v || x.startsWith(v + ' '))));
    }
    out[c.name] = { name: c.name, type_line: c.type_line, mana_cost: custo, cmc, colors, color_identity: colors, oracle_text: c.oracle_text || '', keywords: [...kws].map(k => k.replace(/\b\w/g, m => m.toUpperCase())),
      ...(c.power != null && c.power !== '' ? { power: String(c.power), toughness: String(c.toughness) } : {}) };
  }
  for (const [n, cor] of Object.entries({ Island: 'U', Mountain: 'R', Forest: 'G', Plains: 'W', Swamp: 'B' })) out[n] = { name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, colors: [], color_identity: [cor], keywords: [], oracle_text: `({T}: Add {${cor}}.)` };
  return out;
}

const CARTAS = cartasReais(new URL('.', import.meta.url).pathname.replace(/\/$/, ''));
const listas = ST.STARTER_DECKS.filter(d => d.format === 'pauper').map(d => ({ name: d.name, entries: D.parseDeckText(d.text).entries.filter(e => e.zone !== 'side') }));
export { cartasReais, listas, partida };
const cria = nivel => {
  if (/^shark:\d+$/.test(nivel)) return B.criaBot({ nivel: 'shark', orcamentoMs: 250, mundos: +nivel.split(':')[1] }); // leva 117 · 'shark:5' = Shark com 5 mundos
  if (!nivel.startsWith('x:')) return B.criaBot({ nivel, orcamentoMs: 250 });
  const f = new Set(nivel.slice(2).split(',').filter(Boolean));
  const opts = { orcamentoMs: 250, agora: () => Date.now(), av: f.has('av3') ? B.avaliaV3 : B.avaliaV2, bloqueioForte: true, duplo: true, projeta: f.has('projeta'), corrida: f.has('corrida'), subconjuntos: f.has('sub'), valor: f.has('valor'), desdobra: f.has('desdobra') };
  return { nivel, mulligan: f.has('mull') ? (s, p) => B.decideMulligan(s, p) : null, jogada: (s, p) => B.jogadaProfissional(s, p, opts) };
};
function partida(seed, n0, n1, d0, d1, max = 1500) {
  const cards = {}; for (const e of [...d0.entries, ...d1.entries]) if (CARTAS[e.name]) cards[e.name] = CARTAS[e.name];
  let s = E.createGame({ format: 'pauper', seed, mode: 'full', manaCheck: true, cards, players: [{ name: 'P0', deck: d0.entries }, { name: 'P1', deck: d1.entries }] });
  const J = [cria(n0), cria(n1)]; let ilegal = null, pior = 0, acoes = 0;
  for (let i = 0; i < max && s.status !== 'over'; i++) {
    const quem = s.status === 'mulligan' ? s.players.findIndex(pl => !pl.kept) : s.pending ? s.pending.p : s.turn.priority;
    if (quem < 0) break;
    try {
      if (s.status === 'mulligan') { const m = J[quem].mulligan ? J[quem].mulligan(s, quem) : { acao: { t: 'keep', p: quem, bottom: [] } }; s = E.apply(s, m.acao).state; continue; }
      const t = Date.now(); const j = J[quem].jogada(s, quem); pior = Math.max(pior, Date.now() - t);
      if (!j || !j.acao) { ilegal = `${quem} sem jogada (pend ${s.pending && s.pending.kind})`; break; }
      s = E.apply(s, j.acao).state; acoes++;
    } catch (e) { ilegal = `${quem}: ${e.message} (pend ${s.pending && s.pending.kind})`; break; }
  }
  return { v: s.status === 'over' ? s.winner : null, ilegal, pior, turnos: s.turn.number, acoes };
}
if (process.argv[1] && process.argv[1].endsWith('torneio.listas.mjs')) {
const [forte, fraco, rodadas, base] = [process.argv[2] || 'shark', process.argv[3] || 'shark-v2', +(process.argv[4] || 2), +(process.argv[5] || 100)];
let F = 0, R = 0, sem = 0, pior = 0; const ilegais = []; let k = 0;
const t0 = Date.now();
for (let a = 0; a < listas.length; a++) for (let b = a; b < listas.length; b++) for (let r = 0; r < rodadas; r++) for (const troca of [0, 1]) {
  // os dois lados de cada confronto e os dois assentos
  const fd = troca ? listas[b] : listas[a], rd = troca ? listas[a] : listas[b];
  const forteP0 = (r + troca) % 2 === 0;
  const g = partida(base + (k++) * 17, forteP0 ? forte : fraco, forteP0 ? fraco : forte, forteP0 ? fd : rd, forteP0 ? rd : fd);
  pior = Math.max(pior, g.pior);
  if (g.ilegal) ilegais.push(`${fd.name} × ${rd.name}: ${g.ilegal}`);
  if (g.v == null) { sem++; continue; }
  if ((g.v === 0) === forteP0) F++; else R++;
}
console.log(`${forte} × ${fraco} (listas Pauper): ${F}–${R} em ${F + R} decididas de ${k} · ${(100 * F / Math.max(1, F + R)).toFixed(0)}% · sem decisão ${sem} · pior jogada ${pior} ms · ${Math.round((Date.now() - t0) / 1000)} s`);
console.log('ilegais', ilegais.length, [...new Set(ilegais.map(x => x.split(': ').slice(1).join(': ')))].slice(0, 8));
}
