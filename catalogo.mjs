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
export const FORMATOS = [['commander', 'Commander'], ['pauper', 'Pauper'], ['modern', 'Modern'], ['standard', 'Standard'], ['pioneer', 'Pioneer'], ['legacy', 'Legacy'],
  ['vintage', 'Vintage'], ['brawl', 'Brawl'], ['construido', 'Desafio'], ['iniciante', 'Iniciante']]; // G-241 · Vintage entra com o Magic Online
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
export const resumoDaLista = l => ({ id: l.id, nome: l.nome, formato: l.formato, tipo: l.tipo, data: l.data, codigo: l.codigo, fonte: l.fonte, cores: l.cores, destaque: l.destaque, destaqueId: l.destaqueId, comandante: l.comandante, cartas: l.cartas, ...(l.jogador ? { jogador: l.jogador, posicao: l.posicao, jogadores: l.jogadores, torneio: l.torneio } : {}), arquivo: `listas/${l.id}.json` });
/** Candidatas da DeckList: só os formatos do catálogo, ainda não publicadas, da mais recente para a mais antiga. */
export function candidatas(deckList, publicadas = new Set(), max = MAX_POR_COLETA) {
  const dados = deckList && Array.isArray(deckList.data) ? deckList.data : [];
  return dados.filter(d => d && d.fileName && formatoDoTipo(d.type) && !publicadas.has(idDaLista(d.fileName)))
    .sort((a, b) => String(b.releaseDate || '').localeCompare(String(a.releaseDate || '')) || String(a.name).localeCompare(String(b.name))).slice(0, max);
}
/** O índice: listas por formato (mais recente primeiro), contagens e as fontes presentes, com licença ou crédito. */
export function montaIndice(resumos, { agora = Date.now(), pendentes = 0 } = {}) {
  const ordem = [...resumos].sort((a, b) => String(b.data || '').localeCompare(String(a.data || '')) || a.nome.localeCompare(b.nome));
  const formatos = FORMATOS.map(([id, nome]) => ({ id, nome, listas: ordem.filter(l => l.formato === id).length })).filter(f => f.listas);
  const fontes = [FONTE, FONTE_TOPDECK, FONTE_MTGO].filter(f => f === FONTE || ordem.some(l => l.fonte === f.id));
  return { versao: VERSAO, geradoEm: new Date(agora).toISOString(), fontes, formatos, total: ordem.length, pendentes, listas: ordem };
}

/* ---------------- Z5 · listas de torneio (TopDeck.gg) ----------------
   Com a chave (segredo TOPDECK_KEY do repositório), cada coleta traz as oito primeiras de cada um dos torneios recentes
   (30 dias, 16 jogadores ou mais) por formato. A TopDeck.gg exige crédito visível com link: o índice leva a fonte e o
   app mostra. As cores e a carta de destaque vêm da Scryfall (a TopDeck.gg só dá os nomes). Listas de torneio ficam
   60 dias no catálogo; as mais velhas saem. */
export const FONTE_TOPDECK = { id: 'topdeck', nome: 'TopDeck.gg', url: 'https://topdeck.gg', licenca: 'crédito obrigatório', descricao: 'Listas de torneio' };
export const TOPDECK_API = 'https://topdeck.gg/api/v2/tournaments';
export const FORMATOS_TOPDECK = [['Pauper', 'pauper'], ['Modern', 'modern'], ['Standard', 'standard'], ['Pioneer', 'pioneer'], ['Legacy', 'legacy'], ['EDH', 'commander']];
// G-241 · mais largo (relato #8): 60 dias, torneios de 8 jogadores ou mais, até 20 por formato
export const TOP_POR_TORNEIO = 8, TORNEIOS_POR_FORMATO = 20, DIAS_TOPDECK = 60, MIN_JOGADORES = 8, DIAS_RETENCAO = 60;
const ZONA_DA_SECAO = s => (/^(meta|metadata|info|dados)$/i.test(String(s).trim()) ? null : /command|leader|lider/i.test(s) ? 'commander' : /side|reserva/i.test(s) ? 'side' : /companion/i.test(s) ? 'side' : /maybe|considering/i.test(s) ? null : 'main');
/** A lista em texto da TopDeck.gg ("~~Mainboard~~", "4 Lightning Bolt" ou só o nome): entradas por zona. URL não é lista. */
export function leDecklist(texto) {
  const t = String(texto || '').trim();
  if (!t || /^https?:\/\//i.test(t)) return [];
  const m = new Map(); let zona = 'main';
  for (const cru of t.split(/\r?\n/)) {
    const linha = cru.trim(); if (!linha) continue;
    const sec = linha.match(/^~~\s*(.+?)\s*~~$/) || linha.match(/^\/\/\s*(.+)$/);
    if (sec) { zona = ZONA_DA_SECAO(sec[1]); continue; }
    if (!zona) continue;
    const q = linha.match(/^(\d+)\s*x?\s+(.+)$/i);
    const nome = (q ? q[2] : linha).replace(/\s+\([A-Za-z0-9]{2,6}\)\s*[\w★-]*\s*$/, '').trim(), qtd = q ? Number(q[1]) : 1;
    if (!nome || !(qtd > 0)) continue;
    const k = zona + '|' + nome.toLowerCase();
    if (m.has(k)) m.get(k).qty += qtd; else m.set(k, { name: nome, qty: qtd, zone: zona });
  }
  return [...m.values()];
}
/** A lista estruturada (deckObj): seções com cartas por nome; o valor é a quantidade ou um objeto com `count`. */
export function leDeckObj(obj) {
  if (!obj || typeof obj !== 'object') return [];
  const out = [];
  for (const [secao, cartas] of Object.entries(obj)) {
    const zona = ZONA_DA_SECAO(secao); if (!zona || !cartas || typeof cartas !== 'object') continue;
    const itens = Array.isArray(cartas) ? cartas.map(c => [c && (c.name || c.cardName), c]) : Object.entries(cartas);
    for (const [nome, v] of itens) {
      // carta é número (quantidade) ou objeto com a quantidade; texto solto (game, format, importedFrom…) é metadado, não carta
      const qtd = typeof v === 'number' ? v : v && typeof v === 'object' ? Number(v.count ?? v.quantity ?? v.qty ?? 1) : NaN;
      if (nome && Number.isInteger(qtd) && qtd > 0) out.push({ name: String(nome), qty: qtd, zone: zona });
    }
  }
  return out;
}
const slug = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
/** As oito primeiras de um torneio, no formato do catálogo (sem cores nem destaque: vêm da Scryfall depois). */
export function listasDoTorneio(t, formato, { top = TOP_POR_TORNEIO } = {}) {
  if (!t || !t.TID || !Array.isArray(t.standings)) return [];
  const data = Number.isFinite(t.startDate) ? new Date(t.startDate * 1000).toISOString().slice(0, 10) : null;
  const jogadores = t.standings.length, onde = t.eventData && (t.eventData.city || t.eventData.address) ? ` (${[t.eventData.city, t.eventData.state].filter(Boolean).join(', ') || t.eventData.address})` : '';
  const out = [];
  t.standings.slice(0, top).forEach((s, i) => {
    if (!s) return;
    let entradas = leDeckObj(s.deckObj); if (!entradas.length) entradas = leDecklist(s.decklist);
    if (!entradas.some(e => e.zone !== 'side')) return;
    const pos = i + 1, nomeDoTorneio = String(t.tournamentName || 'Torneio').trim();
    const comandante = entradas.filter(e => e.zone === 'commander').map(e => e.name);
    out.push({
      id: `topdeck-${slug(t.TID)}-${pos}`, nome: `${pos}º · ${nomeDoTorneio}`, formato, tipo: `Torneio · ${pos}º de ${jogadores}`, data, codigo: '', fonte: FONTE_TOPDECK.id,
      descricao: `${pos}º lugar entre ${jogadores} jogadores em ${nomeDoTorneio}${onde}${data ? ', em ' + data.split('-').reverse().join('/') : ''}. Lista de ${String(s.name || 'jogador sem nome').trim()}.`,
      jogador: String(s.name || '').trim(), posicao: pos, jogadores, torneio: nomeDoTorneio, campanha: [s.wins, s.losses, s.draws].every(Number.isFinite) ? `${s.wins}-${s.losses}-${s.draws}` : '',
      cores: '', destaque: comandante[0] || null, destaqueId: null, comandante, cartas: entradas.filter(e => e.zone !== 'side').reduce((n, e) => n + e.qty, 0),
      reserva: entradas.filter(e => e.zone === 'side').reduce((n, e) => n + e.qty, 0), fichas: [], entradas
    });
  });
  return out;
}
/** Cores e carta de destaque pelos dados da Scryfall: comandante; senão a mágica com mais cópias (empate: a mais rara). */
export function enriquece(l, dados) {
  const d = n => dados.get(String(n).toLowerCase()) || null;
  const naoTerreno = e => { const c = d(e.name); return c && !/\bLand\b/.test((c.type_line || '').split('//')[0]); };
  const cmd = l.entradas.filter(e => e.zone === 'commander');
  const base = cmd.length ? cmd : l.entradas.filter(e => e.zone === 'main' && naoTerreno(e));
  const cores = [...'WUBRG'].filter(x => base.some(e => ((d(e.name) || {}).color_identity || []).includes(x))).join('');
  const RAR = { mythic: 4, rare: 3, uncommon: 2, common: 1 };
  const dest = cmd[0] || l.entradas.filter(e => e.zone === 'main' && naoTerreno(e)).sort((a, b) => b.qty - a.qty || (RAR[(d(b.name) || {}).rarity] || 0) - (RAR[(d(a.name) || {}).rarity] || 0))[0] || null;
  const cd = dest ? d(dest.name) : null;
  return { ...l, cores, destaque: dest ? dest.name : l.destaque, destaqueId: cd && /^[0-9a-f-]{36}$/.test(cd.id || '') ? cd.id : null };
}
async function enviaJson(url, corpo, { busca, cabecalhos = {}, prazo = 30000 }) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), prazo);
  try {
    const r = await busca(url, { method: 'POST', signal: ctl.signal, body: JSON.stringify(corpo), headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': 'estante-catalogo (+https://github.com/guiamuy/-Estante-Gerenciador-e-Simulador-de-Magic-)', ...cabecalhos } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}
/** Busca os torneios recentes de cada formato e devolve as listas (já com cores e destaque). */
export async function coletaTopdeck(chave, { busca = globalThis.fetch, pausa = 700, log = () => {} } = {}) {
  const listas = []; let falhas = 0; const porFormato = [];
  for (const [nomeTd, formato] of FORMATOS_TOPDECK) {
    try {
      const pede = () => enviaJson(TOPDECK_API, { game: 'Magic: The Gathering', format: nomeTd, last: DIAS_TOPDECK, participantMin: MIN_JOGADORES, columns: ['name', 'decklist', 'wins', 'draws', 'losses'] }, { busca, cabecalhos: { Authorization: chave } });
      // limite de pedidos (429): espera e tenta uma vez mais — a consulta de EDH é a mais pesada da TopDeck.gg
      const ts = await pede().catch(async e => { if (!/429/.test(e.message)) throw e; log(`  TopDeck · ${nomeTd}: limite de pedidos, nova tentativa`); if (pausa) await new Promise(r => setTimeout(r, 45000)); return pede(); });
      const recentes = (Array.isArray(ts) ? ts : []).filter(t => t && Array.isArray(t.standings)).sort((a, b) => (b.startDate || 0) - (a.startDate || 0)).slice(0, TORNEIOS_POR_FORMATO);
      const deste = recentes.flatMap(t => listasDoTorneio(t, formato));
      log(`  TopDeck · ${nomeTd}: ${recentes.length} torneio(s), ${deste.length} lista(s)`);
      porFormato.push({ formato: nomeTd, torneios: (Array.isArray(ts) ? ts : []).length, recentes: recentes.length, listas: deste.length,
        semLista: recentes.reduce((n, t) => n + t.standings.slice(0, TOP_POR_TORNEIO).filter(x => x && !leDeckObj(x.deckObj).length && !leDecklist(x.decklist).length).length, 0) });
      listas.push(...deste);
    } catch (e) { falhas++; porFormato.push({ formato: nomeTd, erro: e.message }); log(`✗ TopDeck · ${nomeTd}: ${e.message}`); }
    if (pausa) await new Promise(r => setTimeout(r, pausa));
  }
  const dados = await dadosDaScryfall(listas, { busca, pausa, log });
  return { listas: listas.map(l => enriquece(l, dados)), falhas, formatos: FORMATOS_TOPDECK.length, porFormato };
}

/* ---------------- G-241 · listas do Magic Online (relato #8) ----------------
   O site do Magic Online publica todo dia as listas 5-0 das ligas e as classificadas dos desafios de cada formato
   construído (Standard, Modern, Pioneer, Legacy, Vintage, Pauper). O coletor lê a página do mês
   (https://www.mtgo.com/decklists/AAAA/MM: uma <li class="decklists-item"> por evento) e, em cada evento ainda não
   publicado, o JSON que a própria página embute (`window.MTGO.decklists.data = {…};`). Dado de terceiro é dado: nomes de
   carta e de jogador entram como texto, nunca como HTML. Uso sob a Fan Content Policy da Wizards; o crédito aparece no
   app. Os eventos já colhidos não são baixados de novo (a lista publicada não muda); a janela é de 30 dias. */
export const FONTE_MTGO = { id: 'mtgo', nome: 'Magic Online', url: 'https://www.mtgo.com/decklists', licenca: 'Fan Content Policy', descricao: 'Listas 5-0 das ligas e classificadas dos desafios' };
export const MTGO_BASE = 'https://www.mtgo.com';
export const FORMATOS_MTGO = [['Standard', 'standard'], ['Modern', 'modern'], ['Pioneer', 'pioneer'], ['Legacy', 'legacy'], ['Vintage', 'vintage'], ['Pauper', 'pauper']];
export const DIAS_MTGO = 30, DESAFIOS_POR_FORMATO = 8, LIGAS_POR_FORMATO = 4, LISTAS_POR_LIGA = 8;
const semTags = h => String(h || '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
/** A página do mês: um evento por <li class="decklists-item"> (endereço, título, data). Só os formatos do catálogo;
    Limited, Contraption, Premodern e Duel Commander ficam de fora. */
export function leEventosMtgo(html) {
  const out = [];
  const re = /<li[^>]*class="[^"]*\bdecklists-item\b[^"]*"[^>]*>([\s\S]*?)<\/li>/g;
  let m;
  while ((m = re.exec(String(html || '')))) {
    const bloco = m[1];
    const href = (bloco.match(/<a[^>]*href="([^"]+)"/) || [])[1], h3 = (bloco.match(/<h3[^>]*>([\s\S]*?)<\/h3>/) || [])[1], data = (bloco.match(/<time[^>]*datetime="([^"]+)"/) || [])[1];
    if (!href || !h3) continue;
    const titulo = semTags(h3), primeira = titulo.split(/\s+/)[0] || '';
    const fmt = FORMATOS_MTGO.find(([nome]) => nome.toLowerCase() === primeira.toLowerCase());
    if (!fmt) continue;
    const dia = /^\d{4}-\d{2}-\d{2}/.test(data || '') ? data.slice(0, 10) : ((href.match(/(\d{4}-\d{2}-\d{2})/) || [])[1] || null);
    const slugEv = href.split('/').pop().split('?')[0];
    out.push({ url: /^https?:/.test(href) ? href : MTGO_BASE + (href.startsWith('/') ? '' : '/') + href, slug: slugEv, titulo, formato: fmt[1], data: dia, tipo: /\bleague\b/i.test(titulo) ? 'liga' : 'desafio' });
  }
  return out;
}
/** O JSON que a página do evento embute em `window.MTGO.decklists.data = {…};` (chaves equilibradas, texto respeitado). */
export function leDadosMtgo(html) {
  const h = String(html || ''), marca = h.indexOf('window.MTGO.decklists.data');
  if (marca < 0) return null;
  const ini = h.indexOf('{', marca); if (ini < 0) return null;
  let prof = 0, emTexto = false, esc = false;
  for (let i = ini; i < h.length; i++) {
    const c = h[i];
    if (emTexto) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') emTexto = false; continue; }
    if (c === '"') emTexto = true; else if (c === '{') prof++; else if (c === '}') { prof--; if (!prof) { try { return JSON.parse(h.slice(ini, i + 1)); } catch (e) { return null; } } }
  }
  return null;
}
const dataMtgo = d => { const m = String(d || '').match(/^(\d{4}-\d{2}-\d{2})/); return m ? m[1] : null; };
/** As cartas de uma lista do Magic Online (qty e card_attributes.card_name), por zona. */
function entradasMtgo(deck) {
  const m = new Map();
  const le = (lista, zona) => { for (const it of Array.isArray(lista) ? lista : []) { const nome = String((it && it.card_attributes && it.card_attributes.card_name) || '').trim(), qtd = Number(it && it.qty);
    if (!nome || !Number.isInteger(qtd) || qtd <= 0) continue; const k = zona + '|' + nome.toLowerCase(); if (m.has(k)) m.get(k).qty += qtd; else m.set(k, { name: nome, qty: qtd, zone: zona }); } };
  le(deck && deck.main_deck, 'main'); le(deck && deck.sideboard_deck, 'side');
  return [...m.values()];
}
/** As listas de um evento no formato do catálogo: desafio pela colocação (final_rank), as `top` primeiras; liga as
    `maxLiga` primeiras 5-0 publicadas. Sem cores nem destaque (vêm da Scryfall depois). */
export function listasDoEventoMtgo(dados, evento, { top = TOP_POR_TORNEIO, maxLiga = LISTAS_POR_LIGA } = {}) {
  if (!dados || !evento || !Array.isArray(dados.decklists)) return [];
  const liga = evento.tipo === 'liga';
  const data = evento.data || dataMtgo(dados.publish_date) || dataMtgo(dados.starttime);
  const jogadores = Number((dados.player_count && dados.player_count.players) || 0) || null;
  let decks = dados.decklists.filter(d => d && entradasMtgo(d).some(e => e.zone === 'main'));
  if (!liga) {
    const rank = new Map((Array.isArray(dados.final_rank) ? dados.final_rank : []).map(r => [String(r.loginid), Number(r.rank)]));
    decks = decks.map((d, i) => ({ d, pos: rank.get(String(d.loginid)) || (rank.size ? Infinity : i + 1) })).filter(x => Number.isFinite(x.pos)).sort((a, b) => a.pos - b.pos).slice(0, top).map(x => ({ ...x.d, posicao: x.pos }));
  } else decks = decks.slice(0, maxLiga).map((d, i) => ({ ...d, posicao: i + 1 }));
  const titulo = String(evento.titulo || 'Evento').trim(), base = slug(evento.slug || titulo);
  return decks.map(d => {
    const entradas = entradasMtgo(d), jogador = String(d.player || '').trim() || 'jogador sem nome';
    const w = d.wins && typeof d.wins === 'object' ? d.wins : null, campanha = w && w.wins != null ? `${w.wins}-${w.losses ?? 0}` : liga ? '5-0' : '';
    const pos = d.posicao, quando = data ? ', em ' + data.split('-').reverse().join('/') : '';
    return {
      id: `mtgo-${base}-${pos}`, nome: liga ? `${campanha} · ${titulo}` : `${pos}º · ${titulo}`, formato: evento.formato, tipo: liga ? `Liga · ${campanha}` : `Desafio · ${pos}º${jogadores ? ' de ' + jogadores : ''}`,
      data, codigo: '', fonte: FONTE_MTGO.id,
      descricao: liga ? `${campanha} na ${titulo} do Magic Online${quando}. Lista de ${jogador}.` : `${pos}º lugar${jogadores ? ` entre ${jogadores} jogadores` : ''} no ${titulo} do Magic Online${quando}. Lista de ${jogador}.`,
      jogador, posicao: pos, jogadores: jogadores || (liga ? null : undefined), torneio: titulo, campanha,
      cores: '', destaque: null, destaqueId: null, comandante: [], cartas: entradas.filter(e => e.zone !== 'side').reduce((n, e) => n + e.qty, 0),
      reserva: entradas.filter(e => e.zone === 'side').reduce((n, e) => n + e.qty, 0), fichas: [], entradas
    };
  });
}
/** Quais eventos colher: dentro da janela, por formato os desafios mais recentes e as ligas mais recentes, pulando
    os já publicados (`publicados` = eventos cujas listas já estão no catálogo). Puro. */
export function escolheEventosMtgo(eventos, { agora = Date.now(), publicados = new Set(), desafios = DESAFIOS_POR_FORMATO, ligas = LIGAS_POR_FORMATO } = {}) {
  const limite = new Date(agora - DIAS_MTGO * 86400e3).toISOString().slice(0, 10);
  const vistos = new Set(), out = [];
  for (const [, formato] of FORMATOS_MTGO) {
    const deste = eventos.filter(e => e.formato === formato && e.data && e.data >= limite && !vistos.has(e.slug) && (vistos.add(e.slug), true)).sort((a, b) => b.data.localeCompare(a.data));
    for (const e of [...deste.filter(e => e.tipo === 'desafio').slice(0, desafios), ...deste.filter(e => e.tipo === 'liga').slice(0, ligas)]) if (!publicados.has(slug(e.slug))) out.push(e);
  }
  return out;
}
async function baixaTexto(url, { busca, prazo = 30000 }) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), prazo);
  try {
    const r = await busca(url, { signal: ctl.signal, headers: { 'User-Agent': 'estante-catalogo (+https://github.com/guiamuy/-Estante-Gerenciador-e-Simulador-de-Magic-)', Accept: 'text/html' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.text();
  } finally { clearTimeout(t); }
}
/** Lê as páginas deste mês e do anterior, escolhe os eventos e baixa cada um. Devolve as listas (com cores e destaque). */
export async function coletaMtgo({ busca = globalThis.fetch, agora = Date.now(), publicados = new Set(), pausa = 250, log = () => {} } = {}) {
  const meses = [new Date(agora), new Date(agora - 31 * 86400e3)].map(d => `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  let eventos = [], falhas = 0;
  for (const m of [...new Set(meses)]) {
    try { eventos.push(...leEventosMtgo(await baixaTexto(`${MTGO_BASE}/decklists/${m}`, { busca }))); } catch (e) { falhas++; log(`✗ MTGO · ${m}: ${e.message}`); }
    if (pausa) await new Promise(r => setTimeout(r, pausa));
  }
  const escolhidos = escolheEventosMtgo(eventos, { agora, publicados });
  const listas = [], porEvento = [];
  for (const ev of escolhidos) {
    try {
      const dados = leDadosMtgo(await baixaTexto(ev.url, { busca }));
      const deste = dados ? listasDoEventoMtgo(dados, ev) : [];
      if (!dados) log(`✗ MTGO · ${ev.slug}: sem dados na página`);
      porEvento.push({ slug: ev.slug, formato: ev.formato, tipo: ev.tipo, listas: deste.length }); listas.push(...deste);
    } catch (e) { falhas++; porEvento.push({ slug: ev.slug, erro: e.message }); log(`✗ MTGO · ${ev.slug}: ${e.message}`); }
    if (pausa) await new Promise(r => setTimeout(r, pausa));
  }
  const porFormato = FORMATOS_MTGO.map(([nome, formato]) => ({ formato: nome, eventos: eventos.filter(e => e.formato === formato).length, colhidos: escolhidos.filter(e => e.formato === formato).length, listas: listas.filter(l => l.formato === formato).length }));
  log(`  MTGO: ${eventos.length} evento(s) nas páginas, ${escolhidos.length} novo(s) colhido(s), ${listas.length} lista(s)`);
  const dados = await dadosDaScryfall(listas, { busca, pausa, log });
  return { listas: listas.map(l => enriquece(l, dados)), falhas, porFormato, porEvento };
}
/** Cores e destaque: a Scryfall em lotes de 75 nomes (o limite da /cards/collection). */
async function dadosDaScryfall(listas, { busca, pausa, log }) {
  const nomes = [...new Set(listas.flatMap(l => l.entradas.map(e => e.name)))], dados = new Map();
  for (let i = 0; i < nomes.length; i += 75) {
    try {
      const r = await enviaJson('https://api.scryfall.com/cards/collection', { identifiers: nomes.slice(i, i + 75).map(name => ({ name })) }, { busca });
      for (const c of (r && r.data) || []) { const v = { id: c.id, color_identity: c.color_identity || [], rarity: c.rarity, type_line: c.type_line || (c.card_faces && c.card_faces[0] && c.card_faces[0].type_line) || '' };
        dados.set(String(c.name).toLowerCase(), v); if (c.name.includes(' // ')) dados.set(c.name.split(' // ')[0].toLowerCase(), v); }
    } catch (e) { log(`✗ Scryfall: ${e.message}`); }
    if (pausa) await new Promise(r => setTimeout(r, 120));
  }
  return dados;
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
/** Lê o que está publicado em `pasta`, baixa as listas novas e grava. Com `chaveTopdeck`, renova as de torneio. */
export async function publica(pasta, { busca = globalThis.fetch, agora = Date.now(), max = MAX_POR_COLETA, pausa = 150, log = () => {}, chaveTopdeck = '', mtgo = true } = {}) {
  await mkdir(join(pasta, 'listas'), { recursive: true });
  const antes = await leJson(join(pasta, 'indice.json'));
  const anteriores = antes && Array.isArray(antes.listas) ? antes.listas.slice() : [];
  const resumos = anteriores.filter(l => l.fonte !== FONTE_TOPDECK.id && l.fonte !== FONTE_MTGO.id);
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
  // Z5 · torneios: as desta coleta somadas às de antes ainda dentro de 60 dias (uma falha da fonte não esvazia o catálogo)
  const tdAntes = anteriores.filter(l => l.fonte === FONTE_TOPDECK.id), limite = new Date(agora - DIAS_RETENCAO * 86400e3).toISOString().slice(0, 10);
  let td = tdAntes.filter(l => (l.data || '') >= limite), novasTd = 0;
  let relatorio = null;
  if (chaveTopdeck) {
    const r = await coletaTopdeck(chaveTopdeck, { busca, log, pausa: pausa ? 700 : 0 });
    falhas += r.falhas; relatorio = r.porFormato;
    const porId = new Map(td.map(l => [l.id, l]));
    for (const l of r.listas) { await writeFile(join(pasta, 'listas', `${l.id}.json`), JSON.stringify(l) + '\n'); if (!porId.has(l.id)) novasTd++; porId.set(l.id, resumoDaLista(l)); }
    td = [...porId.values()].filter(l => (l.data || '') >= limite);
  }
  // G-241 · Magic Online: só os eventos novos; as listas de antes ficam enquanto estão na janela
  const moAntes = anteriores.filter(l => l.fonte === FONTE_MTGO.id), limiteMo = new Date(agora - DIAS_MTGO * 86400e3).toISOString().slice(0, 10);
  let mo = moAntes.filter(l => (l.data || '') >= limiteMo), novasMo = 0, relatorioMo = null;
  if (mtgo) {
    const publicados = new Set(mo.map(l => l.id.replace(/^mtgo-/, '').replace(/-\d+$/, '')));
    const r = await coletaMtgo({ busca, agora, publicados, pausa: pausa ? 250 : 0, log });
    falhas += r.falhas; relatorioMo = r.porFormato;
    for (const l of r.listas) { await writeFile(join(pasta, 'listas', `${l.id}.json`), JSON.stringify(l) + '\n'); mo.push(resumoDaLista(l)); novasMo++; }
  }
  const mesmasMo = moAntes.length === mo.length && moAntes.every(l => mo.some(x => x.id === l.id));
  // com a chave, as listas de torneio foram regravadas (podem ter mudado por dentro): o índice é regravado também
  const mesmasTd = !chaveTopdeck && tdAntes.length === td.length && tdAntes.every(l => td.some(x => x.id === l.id));
  if (relatorio || relatorioMo) await writeFile(join(pasta, 'coleta.json'), JSON.stringify({ em: new Date(agora).toISOString(), topdeck: relatorio, mtgo: relatorioMo }, null, 1) + '\n');
  if (!novas && mesmasTd && mesmasMo && antes && antes.pendentes === pendentes) return { gravou: false, novas, novasTd, novasMo, falhas, indice: antes };
  const indice = montaIndice([...resumos, ...td, ...mo], { agora, pendentes });
  await writeFile(join(pasta, 'indice.json'), JSON.stringify(indice) + '\n');

  return { gravou: true, novas, novasTd, novasMo, falhas, indice };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const i = process.argv.indexOf('--saida'); const pasta = i > 0 ? process.argv[i + 1] : '';
  if (!pasta) { console.error('uso: node catalogo.mjs --saida <pasta>'); process.exit(2); }
  const chaveTopdeck = process.env.TOPDECK_KEY || '';
  console.log(chaveTopdeck ? 'TopDeck.gg: com chave' : 'TopDeck.gg: sem chave (só as listas oficiais)');
  const r = await publica(pasta, { log: m => console.log(m), chaveTopdeck });
  console.log(r.gravou ? `gravado: ${r.indice.total} lista(s) · ${r.novas} oficial(is) nova(s) · ${r.novasTd || 0} de torneio nova(s) · ${r.novasMo || 0} do Magic Online nova(s) · ${r.falhas} falha(s) · ${r.indice.pendentes} para a próxima coleta` : 'sem mudança: nada gravado');
  for (const f of r.indice.formatos || []) console.log(`  ${f.nome}: ${f.listas}`);
  // só acusa quando nada veio de nenhuma fonte (uma fonte de torneio fora do ar não derruba a coleta)
  if (r.falhas && !r.novas && !r.novasTd && !r.novasMo && !r.gravou) process.exit(1);
}
