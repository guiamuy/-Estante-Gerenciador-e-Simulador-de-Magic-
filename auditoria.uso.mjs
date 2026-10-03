// B21 · auditoria de uso: em partidas do Shark contra ele mesmo nas listas Pauper, conta para cada habilidade de cada
// carta (e cada jeito de conjurar) quantas decisões a tiveram disponível e quantas vezes ele a usou.
// Uso: node auditoria.uso.mjs [nivel] [partidas] [semente]     ex.: node auditoria.uso.mjs shark 28 500
// Não é teste do portão (leva minutos). "Oferecida muito, usada nunca" é o que se investiga.
import { loadModules } from './_load.mjs';
import { cartasReais, listas } from './torneio.listas.mjs';
const { engine: E, bot: B } = loadModules();
const CR = cartasReais(new URL('.', import.meta.url).pathname.replace(/\/$/, ''));
const TIPOS = new Set(['activate', 'cycle', 'cast_madness', 'cast_free', 'ninjutsu', 'flashback', 'escape', 'transmute', 'plot', 'unmorph']);
const chave = (s, a) => {
  const o = a.oid ? s.objects[a.oid] : null; if (!o) return null;
  if (a.t === 'cast') return a.alt || a.mode != null || a.kicked || a.flashback ? `${o.name} · conjurar (${a.alt || (a.flashback ? 'lampejo' : a.kicked ? 'reforço' : 'modo ' + a.mode)})` : null;
  if (!TIPOS.has(a.t) && !/^(cycle|transmute|plot|unmorph|ninjutsu)/.test(a.t)) return null; // só habilidades e jeitos de conjurar; escolhas pendentes ficam de fora
  return `${o.name} · ${a.t}${a.index != null ? ' #' + a.index : ''}`;
};
export function audita(nivel = 'shark', partidas = 28, base = 500, orcamentoMs = 120) {
  const uso = new Map(); // chave -> { oferecida, usada, partidas:Set }
  for (let g = 0; g < partidas; g++) {
    const d0 = listas[g % 7], d1 = listas[(g + 1 + Math.floor(g / 7)) % 7];
    const cards = {}; for (const e of [...d0.entries, ...d1.entries]) if (CR[e.name]) cards[e.name] = CR[e.name];
    let s = E.createGame({ format: 'pauper', seed: base + g * 13, mode: 'full', manaCheck: true, cards, players: [{ name: 'P0', deck: d0.entries }, { name: 'P1', deck: d1.entries }] });
    const J = [B.criaBot({ nivel, orcamentoMs }), B.criaBot({ nivel, orcamentoMs })];
    for (let i = 0; i < 1500 && s.status !== 'over'; i++) {
      const q = s.status === 'mulligan' ? s.players.findIndex(pl => !pl.kept) : s.pending ? s.pending.p : s.turn.priority;
      if (q < 0) break;
      if (s.status === 'mulligan') { s = E.apply(s, J[q].mulligan(s, q).acao).state; continue; }
      const vistas = new Set();
      for (const a of E.legalActions(s, q)) { const k = chave(s, a); if (k && !vistas.has(k)) { vistas.add(k); const u = uso.get(k) || { oferecida: 0, usada: 0, partidas: new Set() }; u.oferecida++; u.partidas.add(g); uso.set(k, u); } }
      const j = J[q].jogada(s, q); if (!j || !j.acao) break;
      const k = chave(s, j.acao); if (k && uso.has(k)) uso.get(k).usada++;
      try { s = E.apply(s, j.acao).state; } catch (e) { break; }
    }
  }
  return [...uso.entries()].map(([k, u]) => ({ k, oferecida: u.oferecida, usada: u.usada, partidas: u.partidas.size })).sort((a, b) => (a.usada > 0) - (b.usada > 0) || b.oferecida - a.oferecida);
}
if (process.argv[1] && process.argv[1].endsWith('auditoria.uso.mjs')) {
  const r = audita(process.argv[2] || 'shark', +(process.argv[3] || 28), +(process.argv[4] || 500));
  console.log('habilidade · oferecida em N decisões · usada · partidas em que apareceu');
  for (const x of r) console.log(`${x.usada === 0 ? '✗' : ' '} ${x.k} · ${x.oferecida} · ${x.usada} · ${x.partidas}`);
  console.log(`\n${r.filter(x => x.usada === 0).length} nunca usadas de ${r.length}`);
}
