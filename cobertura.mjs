// H-15 · Sentinela de cobertura do Pauper. Roda no fluxo "Catálogo", logo depois da coleta, com rede: mede cada lista Pauper do
// catálogo como o APP mede (`deckCoverage`, a mesma função da tela, sobre o texto que o aparelho baixa da Scryfall) e grava
// `cobertura/<formato>.json` no ramo `catalogo`. Nasceu do achado de 23/10/2026: a prova de partida lia o Forge e dava 514 de 517;
// o app, com o texto da Scryfall, mostrava 420 — quatro cartas aprovadas tinham mudado de redação e duas eram novas.
//
// O arquivo é a fila de trabalho do motor: cada carta pendente vem classificada e com o texto da Scryfall do dia, para quem
// cobre a carta não precisar buscar de novo.
//   texto-mudou · aprovada (APROVADAS) com outro texto: a redação mudou na Scryfall; reaprovar se o leitor chega ao mesmo script
//   lida        · o leitor lê a carta inteira, falta a revisão por lote
//   nova        · nem script nem leitura: frase ou mecânica que o motor ainda não tem
//   parcial     · script à mão declarado parcial (o que falta está na nota)
//   sem-dados   · a Scryfall não devolveu a carta (nome diferente ou falha da rede): repetir na próxima coleta
// Não é teste do portão e nunca derruba a coleta: falha da Scryfall vira "parcial" no relatório (ou mantém o anterior).
//
// Uso: node cobertura.mjs --catalogo <pasta do ramo catalogo> [--formato pauper]
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadModules } from './_load.mjs';

const M = loadModules();
const S = M.scripts, SF = M.scryfall, norm = M.cards.norm, BASIC = M.cards.BASIC_CARDS;
export const UA = 'estante-catalogo (+https://github.com/guiamuy/-Estante-Gerenciador-e-Simulador-de-Magic-)';
export const CLASSES = ['texto-mudou', 'lida', 'nova', 'parcial', 'sem-dados'];

/** Cartas da Scryfall por nome (lotes de 75, o limite da /cards/collection). Devolve { cartas: Map(norm(nome) → carta crua), falhas }. */
export async function cartasDaScryfall(nomes, { busca = globalThis.fetch, pausa = 120, log = () => {} } = {}) {
  const cartas = new Map(); let falhas = 0;
  const lista = [...new Set(nomes)].filter(n => !BASIC[norm(n)]);
  for (let i = 0; i < lista.length; i += 75) {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 30000);
    try {
      const r = await busca('https://api.scryfall.com/cards/collection', { method: 'POST', signal: ctl.signal, body: JSON.stringify({ identifiers: lista.slice(i, i + 75).map(name => ({ name: String(name).split(' // ')[0] })) }),
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': UA } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      for (const c of (j && j.data) || []) { cartas.set(norm(c.name), c); if (String(c.name).includes(' // ')) cartas.set(norm(c.name.split(' // ')[0]), c); }
    } catch (e) { falhas++; log(`✗ Scryfall (lote ${i / 75 + 1}): ${e.message}`); }
    finally { clearTimeout(t); }
    if (pausa && i + 75 < lista.length) await new Promise(r => setTimeout(r, pausa));
  }
  return { cartas, falhas };
}

/** Classe de uma carta pendente (null = joga). `crua` é a carta como a Scryfall devolve; o app a passa por normalizeCard. */
export function classifica(nome, crua) {
  if (!crua && !S.SCRIPTS[nome] && !BASIC[norm(nome)]) return { classe: 'sem-dados', nivel: 'manual', motivo: 'a Scryfall não devolveu a carta' };
  const c = crua ? SF.normalizeCard(crua) : { name: nome };
  const cv = S.coverage(c, S.SCRIPTS, nome);
  if (cv.level === 'completo') return null;
  if (S.SCRIPTS[nome] || S.SCRIPTS[String(nome).split(' // ')[0]]) return { classe: 'parcial', nivel: cv.level, motivo: cv.reason };
  const aprovada = S.APROVADAS[nome] || S.APROVADAS[String(nome).split(' // ')[0]];
  if (aprovada) return { classe: 'texto-mudou', nivel: cv.level, motivo: `aprovada na ${aprovada.leva} com outro texto` };
  if (cv.level === 'lida') return { classe: 'lida', nivel: cv.level, motivo: cv.reason };
  return { classe: 'nova', nivel: cv.level, motivo: cv.reason };
}

const textoDe = c => !c ? null : {
  mana_cost: c.mana_cost || '', type_line: c.type_line || '', oracle_text: c.oracle_text || '', keywords: c.keywords || [], layout: c.layout || 'normal',
  ...(c.power != null ? { power: c.power, toughness: c.toughness } : {}), ...(c.loyalty != null ? { loyalty: c.loyalty } : {}),
  ...(Array.isArray(c.card_faces) ? { card_faces: c.card_faces.map(f => ({ name: f.name, mana_cost: f.mana_cost || '', type_line: f.type_line || '', oracle_text: f.oracle_text || '', ...(f.power != null ? { power: f.power, toughness: f.toughness } : {}) })) } : {}) };

/** Mede as listas (forma do ramo catalogo: { id, nome, entradas: [{ name, qty, zone }] }) com as cartas da Scryfall. */
export function mede(listas, cartas, { formato = 'pauper', agora = new Date().toISOString(), falhas = 0, anterior = null } = {}) {
  const porNome = new Map(); let ok = 0; const incompletas = [];
  const mapa = new Map([...cartas].map(([k, c]) => [k, SF.normalizeCard(c)]));
  for (const l of listas) {
    const en = (l.entradas || []).filter(e => e.zone !== 'side' && e.zone !== 'maybe').map(e => ({ ...e, key: norm(e.name) }));
    const cv = S.deckCoverage(en, mapa);
    if (cv.completo === cv.total && cv.total > 0) { ok++; continue; }
    const faltam = [...new Set(cv.pending.map(x => x.name))];
    incompletas.push({ id: l.id, nome: l.nome || l.id, faltam });
    for (const n of faltam) porNome.set(n, (porNome.get(n) || 0) + 1);
  }
  const pendentes = [...porNome].map(([name, nListas]) => {
    const crua = cartas.get(norm(name)) || null; const k = classifica(name, crua) || { classe: 'nova', nivel: 'manual', motivo: 'sem cobertura' };
    return { name, ...k, listas: nListas, texto: textoDe(crua) };
  }).sort((a, b) => b.listas - a.listas || a.name.localeCompare(b.name));
  const antes = new Set(((anterior && anterior.pendentes) || []).map(p => p.name)), agoraSet = new Set(pendentes.map(p => p.name));
  return {
    versao: 1, formato, geradoEm: agora, motor: M.engine.ENGINE_VERSION, fonte: 'api.scryfall.com/cards/collection',
    listas: listas.length, listas100: ok, cartasPendentes: pendentes.length, parcial: falhas > 0, lotesComFalha: falhas,
    porClasse: Object.fromEntries(CLASSES.map(c => [c, pendentes.filter(p => p.classe === c).length])),
    novasDesdeAnterior: anterior ? pendentes.filter(p => !antes.has(p.name)).map(p => p.name) : [],
    resolvidasDesdeAnterior: anterior ? [...antes].filter(n => !agoraSet.has(n)) : [],
    pendentes, listasIncompletas: incompletas,
  };
}

/** Lê as listas de um formato na pasta do ramo catalogo (indice.json + listas/<id>.json). */
export function listasDoCatalogo(pasta, formato = 'pauper') {
  const idx = JSON.parse(readFileSync(join(pasta, 'indice.json'), 'utf8'));
  return (idx.listas || []).filter(r => r.formato === formato).map(r => {
    try { return JSON.parse(readFileSync(join(pasta, 'listas', `${r.id}.json`), 'utf8')); } catch { return null; }
  }).filter(Boolean);
}

export async function executa({ pasta, formato = 'pauper', busca = globalThis.fetch, pausa = 120, log = console.log, agora } = {}) {
  const listas = listasDoCatalogo(pasta, formato);
  const nomes = [...new Set(listas.flatMap(l => (l.entradas || []).filter(e => e.zone !== 'side' && e.zone !== 'maybe').map(e => e.name)))];
  const { cartas, falhas } = await cartasDaScryfall(nomes, { busca, pausa, log });
  const arq = join(pasta, 'cobertura', `${formato}.json`);
  const anterior = existsSync(arq) ? (() => { try { return JSON.parse(readFileSync(arq, 'utf8')); } catch { return null; } })() : null;
  if (!cartas.size && nomes.length) { log('✗ a Scryfall não respondeu: o relatório anterior fica como está'); return { gravado: false, anterior }; }
  const rel = mede(listas, cartas, { formato, agora, falhas, anterior });
  mkdirSync(join(pasta, 'cobertura'), { recursive: true });
  writeFileSync(arq, JSON.stringify(rel, null, 1) + '\n');
  log(`Cobertura ${formato} (texto da Scryfall, motor v${rel.motor}): ${rel.listas100} de ${rel.listas} listas a 100% · ${rel.cartasPendentes} carta(s) pendente(s) ${JSON.stringify(rel.porClasse)}${rel.parcial ? ` · ${falhas} lote(s) sem resposta` : ''}`);
  if (rel.novasDesdeAnterior.length) log(`  novas desde a coleta anterior: ${rel.novasDesdeAnterior.join(', ')}`);
  return { gravado: true, relatorio: rel };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const a = process.argv.slice(2), o = {};
  for (let i = 0; i < a.length; i++) if (a[i].startsWith('--')) o[a[i].slice(2)] = a[i + 1] && !a[i + 1].startsWith('--') ? a[++i] : true;
  if (!o.catalogo) { console.error('Informe --catalogo <pasta do ramo catalogo>'); process.exit(2); }
  executa({ pasta: o.catalogo, formato: o.formato || 'pauper' }).catch(e => { console.error('✗ sentinela:', e && e.message); }).finally(() => process.exit(0));
}
