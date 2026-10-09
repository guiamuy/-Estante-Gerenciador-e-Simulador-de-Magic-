// Z1 · Catálogo de listas (ADR-09). Roda no GitHub Actions (fluxo "Catálogo", toda semana): lê as listas oficiais
// lançadas pela Wizards no MTGJSON (licença MIT) e publica JSON pronto no ramo `catalogo`, que o app lê pelo
// raw.githubusercontent.com (o navegador não alcança o MTGJSON direto: sem CORS). Sem dependência: Node 22.
// O que já está publicado não é baixado de novo (lista lançada não muda); cada coleta traz no máximo
// MAX_POR_COLETA listas novas, da mais recente para a mais antiga, e continua na semana seguinte.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const VERSAO = 1;
export const BASE = 'https://mtgjson.com/api/v5/';
export const MAX_POR_COLETA = 250;
export const FONTE = { id: 'mtgjson', nome: 'MTGJSON', url: 'https://mtgjson.com', licenca: 'MIT', descricao: 'Listas oficiais lançadas pela Wizards of the Coast' };
/** Formatos do catálogo, na ordem da tela. As listas oficiais não são de torneio: "Construído" são os decks de desafio
    (feitos para o Standard ou o Pioneer da época) e "Iniciante" os produtos de entrada. */
export const FORMATOS = [['commander', 'Commander'], ['brawl', 'Brawl'], ['construido', 'Construído'], ['iniciante', 'Iniciante']];
const TIPOS = [
  [/commander/i, 'commander'], [/brawl/i, 'brawl'], [/challenger/i, 'construido'],
  [/starter|welcome|planeswalker deck|intro pack|theme deck|duel deck|event deck|clash pack|guild kit|game night/i, 'iniciante']];
/** Formato do catálogo para o tipo de produto do MTGJSON, ou null (fica de fora: Planechase, Archenemy, caixas…). */
export function formatoDoTipo(tipo) {
  const t = String(tipo || '');
  if (/archenemy|planechase|box set|secret lair|sample|arena|mtgo|jumpstart|spellbook/i.test(t)) return null;
  const achado = TIPOS.find(([re]) => re.test(t));
  return achado ? achado[1] : null;
}
export const idDaLista = fileName => 'mtgjson-' + String(fileName || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const ORDEM_DAS_CORES = 'WUBRG';
const RARIDADE = { mythic: 4, rare: 3, uncommon: 2, common: 1 };
const ehTerreno = c => (c.types || []).includes('Land') || /\bLand\b/.test(c.type || '');
/** Cartas de uma zona do MTGJSON: somadas por nome; a face de trás de carta dupla (side "b") não conta de novo. */
function cartasDe(lista, zona) {
  const m = new Map();
  for (const c of Array.isArray(lista) ? lista : []) {
    if (!c || !c.name || c.side === 'b') continue;
    const qtd = Number.isInteger(c.count) && c.count > 0 ? c.count : 1;
    if (m.has(c.name)) m.get(c.name).qty += qtd; else m.set(c.name, { name: c.name, qty: qtd, zone: zona });
  }
  return [...m.values()];
}
/** Uma lista do MTGJSON no formato do catálogo (o mesmo das listas do app: entradas com nome, quantidade e zona). */
export function normalizaLista(deck, meta = {}) {
  const d = deck && deck.data ? deck.data : deck;
  if (!d || !d.name) return null;
  const tipo = d.type || meta.type || '';
  const formato = formatoDoTipo(tipo);
  if (!formato) return null;
  const cmd = Array.isArray(d.commander) ? d.commander.filter(c => c && c.side !== 'b') : [];
  const main = Array.isArray(d.mainBoard) ? d.mainBoard : [], side = Array.isArray(d.sideBoard) ? d.sideBoard : [];
  const entradas = [...cartasDe(cmd, 'commander'), ...cartasDe(main, 'main'), ...cartasDe(side, 'side')];
  if (!entradas.length) return null;
  const base = cmd.length ? cmd : main.filter(c => c && !ehTerreno(c));
  const cores = [...ORDEM_DAS_CORES].filter(x => base.some(c => (c.colorIdentity || []).includes(x))).join('');
  const destaque = cmd[0] || main.filter(c => c && !ehTerreno(c) && c.side !== 'b').sort((a, b) => (RARIDADE[b.rarity] || 0) - (RARIDADE[a.rarity] || 0))[0] || null;
  const fileName = meta.fileName || d.fileName || `${d.name}_${d.code || ''}`;
  const data = /^\d{4}-\d{2}-\d{2}$/.test(d.releaseDate || meta.releaseDate || '') ? (d.releaseDate || meta.releaseDate) : null;
  const total = entradas.filter(e => e.zone !== 'side').reduce((t, e) => t + e.qty, 0);
  return {
    id: idDaLista(fileName), nome: String(d.name), formato, tipo: String(tipo), data, codigo: String(d.code || meta.code || '').toUpperCase(), fonte: FONTE.id,
    descricao: `${tipo || 'Lista oficial'} lançada pela Wizards${data ? ' em ' + data.split('-').reverse().join('/') : ''}${d.code ? ` (${String(d.code).toUpperCase()})` : ''}.`,
    cores, destaque: destaque ? destaque.name : null, destaqueId: destaque && destaque.identifiers && /^[0-9a-f-]{36}$/.test(destaque.identifiers.scryfallId || '') ? destaque.identifiers.scryfallId : null,
    comandante: cmd.map(c => c.name), cartas: total, reserva: entradas.filter(e => e.zone === 'side').reduce((t, e) => t + e.qty, 0),
    fichas: Array.isArray(d.tokens) ? [...new Set(d.tokens.map(t => t && t.name).filter(Boolean))] : [],
    entradas
  };
}
/** O que vai no índice (sem as cartas): o suficiente para o catálogo desenhar o cartão. */
export const resumoDaLista = l => ({ id: l.id, nome: l.nome, formato: l.formato, tipo: l.tipo, data: l.data, codigo: l.codigo, fonte: l.fonte, cores: l.cores, destaque: l.destaque, destaqueId: l.destaqueId, comandante: l.comandante, cartas: l.cartas, arquivo: `listas/${l.id}.json` });
/** Candidatas da DeckList: só os formatos do catálogo, ainda não publicadas, da mais recente para a mais antiga. */
export function candidatas(deckList, publicadas = new Set(), max = MAX_POR_COLETA) {
  const dados = deckList && Array.isArray(deckList.data) ? deckList.data : [];
  return dados.filter(d => d && d.fileName && formatoDoTipo(d.type) && !publicadas.has(idDaLista(d.fileName)))
    .sort((a, b) => String(b.releaseDate || '').localeCompare(String(a.releaseDate || '')) || String(a.name).localeCompare(String(b.name))).slice(0, max);
}
/** O índice: listas por formato (mais recente primeiro), contagens e a fonte com a licença. */
export function montaIndice(resumos, { agora = Date.now(), pendentes = 0 } = {}) {
  const ordem = [...resumos].sort((a, b) => String(b.data || '').localeCompare(String(a.data || '')) || a.nome.localeCompare(b.nome));
  const formatos = FORMATOS.map(([id, nome]) => ({ id, nome, listas: ordem.filter(l => l.formato === id).length })).filter(f => f.listas);
  return { versao: VERSAO, geradoEm: new Date(agora).toISOString(), fontes: [FONTE], formatos, total: ordem.length, pendentes, listas: ordem };
}

async function leJson(caminho) { try { return JSON.parse(await readFile(caminho, 'utf8')); } catch (e) { return null; } }
async function baixa(url, { busca, prazo = 30000 }) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), prazo);
  try {
    const r = await busca(url, { signal: ctl.signal, headers: { 'User-Agent': 'estante-catalogo (+https://github.com/guiamuy/-Estante-Gerenciador-e-Simulador-de-Magic-)', Accept: 'application/json' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}
/** Lê o que está publicado em `pasta`, baixa as listas novas e grava. */
export async function publica(pasta, { busca = globalThis.fetch, agora = Date.now(), max = MAX_POR_COLETA, pausa = 150, log = () => {} } = {}) {
  await mkdir(join(pasta, 'listas'), { recursive: true });
  const antes = await leJson(join(pasta, 'indice.json'));
  const resumos = antes && Array.isArray(antes.listas) ? antes.listas.slice() : [];
  const publicadas = new Set(resumos.map(l => l.id));
  const deckList = await baixa(BASE + 'DeckList.json', { busca });
  const todas = candidatas(deckList, publicadas, Infinity), lote = todas.slice(0, max);
  let novas = 0, falhas = 0;
  for (const meta of lote) {
    try {
      const l = normalizaLista(await baixa(BASE + 'decks/' + encodeURIComponent(meta.fileName) + '.json', { busca }), meta);
      if (l) { await writeFile(join(pasta, 'listas', `${l.id}.json`), JSON.stringify(l) + '\n'); resumos.push(resumoDaLista(l)); novas++; }
    } catch (e) { falhas++; log(`✗ ${meta.fileName}: ${e.message}`); }
    if (pausa) await new Promise(r => setTimeout(r, pausa)); // educado com a fonte
  }
  const pendentes = Math.max(0, todas.length - lote.length);
  if (!novas && antes && antes.pendentes === pendentes) return { gravou: false, novas, falhas, indice: antes };
  const indice = montaIndice(resumos, { agora, pendentes });
  await writeFile(join(pasta, 'indice.json'), JSON.stringify(indice) + '\n');
  return { gravou: true, novas, falhas, indice };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const i = process.argv.indexOf('--saida'); const pasta = i > 0 ? process.argv[i + 1] : '';
  if (!pasta) { console.error('uso: node catalogo.mjs --saida <pasta>'); process.exit(2); }
  const r = await publica(pasta, { log: m => console.log(m) });
  console.log(r.gravou ? `gravado: ${r.indice.total} lista(s) · ${r.novas} nova(s) · ${r.falhas} falha(s) · ${r.indice.pendentes} para a próxima coleta` : 'sem mudança: nada gravado');
  for (const f of r.indice.formatos || []) console.log(`  ${f.nome}: ${f.listas}`);
  if (r.falhas && !r.novas) process.exit(1);
}
