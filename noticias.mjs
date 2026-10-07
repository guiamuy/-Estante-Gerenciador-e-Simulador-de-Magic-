// N1 · Coletor de notícias (ADR-08). Lê os feeds públicos (RSS e Atom) das fontes, normaliza, junta com o que já
// estava publicado, tira repetidos, guarda os últimos 30 dias e corta em páginas de 20 — JSON pronto para o app ler.
// Roda no fluxo agendado `.github/workflows/noticias.yml`, que publica o resultado no ramo `noticias` (o `main` não
// recebe esses commits). Sem dependência: só Node. As funções são puras e têm teste em `noticias.unit.test.mjs`;
// só `coleta` (rede) e a linha de comando (disco) tocam o mundo.
//
//   node noticias.mjs --saida <pasta>     lê as fontes e grava <pasta>/indice.json e <pasta>/pagina-N.json
//
// Direito autoral: sai só título, fonte, autor, data, endereço da capa (na própria fonte) e um resumo de até 280
// caracteres em texto puro. O texto da matéria nunca é guardado; o app abre a matéria no site da fonte.
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const VERSAO = 1;
export const POR_PAGINA = 20;
export const DIAS = 30;
export const RESUMO_MAX = 280;
export const HORAS_SEM_MUDANCA = 6; // sem notícia nova, o índice só é regravado depois disso (não vira um commit por hora)

/** Fontes conferidas uma a uma em 07/10/2026 (feed público, respondendo, com os campos abaixo).
    Fora, por não terem feed público localizável nessa data: Wizards of the Coast (o endereço antigo de RSS dá 404),
    Cards Realm e LigaMagic (português). `temas` fixos são os que valem para tudo o que a fonte publica. */
export const FONTES = [
  { id: 'mtggoldfish', nome: 'MTGGoldfish', site: 'https://www.mtggoldfish.com', feed: 'https://www.mtggoldfish.com/feed', idioma: 'en', temas: [] },
  { id: 'edhrec', nome: 'EDHREC', site: 'https://edhrec.com', feed: 'https://edhrec.com/articles/feed', idioma: 'en', temas: ['commander'] },
  { id: 'scg', nome: 'Star City Games', site: 'https://articles.starcitygames.com', feed: 'https://articles.starcitygames.com/magic-the-gathering/feed/', idioma: 'en', temas: [] },
  { id: 'cardkingdom', nome: 'Card Kingdom', site: 'https://blog.cardkingdom.com', feed: 'https://blog.cardkingdom.com/feed/', idioma: 'en', temas: [] },
  { id: 'hipsters', nome: 'Hipsters of the Coast', site: 'https://www.hipstersofthecoast.com', feed: 'https://www.hipstersofthecoast.com/feed/', idioma: 'en', temas: [] },
  { id: 'mtgazone', nome: 'MTG Arena Zone', site: 'https://mtgazone.com', feed: 'https://mtgazone.com/feed/', idioma: 'en', temas: ['arena'] },
];

/* ---------------- texto ---------------- */
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', eacute: 'é', copy: '©', reg: '®', trade: '™' };
export function desfazEntidades(s) {
  return String(s == null ? '' : s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d*);/gi, (m, e) => {
    if (e[0] === '#') { const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : ''; }
    const k = e.toLowerCase(); return Object.hasOwn(ENT, k) ? ENT[k] : m;
  });
}
/** HTML → texto puro numa linha: sem script/estilo, sem etiquetas, entidades desfeitas, espaços juntos. */
export function textoSemHtml(html) {
  const s = String(html == null ? '' : html).replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]*>/g, ' ');
  // duas voltas: feed de WordPress manda "&amp;#8217;" (a entidade da entidade)
  return desfazEntidades(desfazEntidades(s)).replace(/<[^>]*>/g, ' ').replace(/[\u0000-\u001f\u007f\u00a0\u200b\u2028\u2029]+/g, ' ').replace(/ {2,}/g, ' ').trim();
}
/** Resumo de até `max` caracteres, cortado em palavra, com reticências; sem os rodapés automáticos dos feeds. */
export function resume(html, max = RESUMO_MAX) {
  let t = textoSemHtml(html)
    .replace(/\s*The post .{0,200}? (appeared first on|first appeared on) .{0,120}$/i, '')
    .replace(/\s*(\[(…|\.\.\.|&hellip;)\]|Continue reading.*|Read more.*)\s*$/i, '').trim();
  if (t.length <= max) return t;
  const corte = t.slice(0, max - 1); const esp = corte.lastIndexOf(' ');
  return (esp > max * 0.6 ? corte.slice(0, esp) : corte).replace(/[\s.,;:!?–—-]+$/, '') + '…';
}

/* ---------------- XML mínimo (RSS 2.0 e Atom) ---------------- */
const rx = nome => nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const cdata = s => /<!\[CDATA\[/.test(s) ? s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1') : desfazEntidades(s);
const blocos = (xml, nome) => { const out = []; const r = new RegExp(`<${rx(nome)}(?:\\s[^>]*)?>([\\s\\S]*?)</${rx(nome)}\\s*>`, 'gi'); let m; while ((m = r.exec(xml))) out.push(m[1]); return out; };
const pega = (xml, nome) => { const b = blocos(xml, nome); return b.length ? cdata(b[0]).trim() : ''; };
const atributos = s => { const o = {}; const r = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g; let m; while ((m = r.exec(s))) o[m[1].toLowerCase()] = desfazEntidades(m[2] != null ? m[2] : m[3]); return o; };
const vazias = (xml, nome) => { const out = []; const r = new RegExp(`<${rx(nome)}\\b([^>]*?)/?>`, 'gi'); let m; while ((m = r.exec(xml))) out.push(atributos(m[1])); return out; };

/** Só endereço http(s) absoluto; qualquer outra coisa (javascript:, data:, relativo) vira ''. */
export function enderecoSeguro(u, { soHttps = false } = {}) {
  try { const x = new URL(String(u || '').trim()); if (x.protocol !== 'https:' && (soHttps || x.protocol !== 'http:')) return ''; return x.href; } catch (e) { return ''; }
}
const NAO_E_CAPA = /gravatar\.com|s\.w\.org\/images\/core\/emoji|feedburner|\/pixel|spacer\.gif|doubleclick/i;
/** A capa: mídia declarada no feed; sem ela, a primeira imagem do texto. Só https (http quebraria no app publicado). */
function capaDe(bloco, htmls) {
  const cand = [];
  for (const a of vazias(bloco, 'media:content')) if (a.url && (!a.medium || a.medium === 'image') && (!a.type || /^image\//.test(a.type))) cand.push(a.url);
  for (const a of vazias(bloco, 'media:thumbnail')) if (a.url) cand.push(a.url);
  for (const a of vazias(bloco, 'enclosure')) if (a.url && /^image\//.test(a.type || '')) cand.push(a.url);
  for (const a of vazias(bloco, 'link')) if (a.rel === 'enclosure' && a.href && /^image\//.test(a.type || '')) cand.push(a.href);
  for (const h of htmls) for (const a of vazias(h, 'img')) if (a.src && a.width !== '1' && a.height !== '1') cand.push(a.src);
  for (const c of cand) { const u = enderecoSeguro(c, { soHttps: true }); if (u && !NAO_E_CAPA.test(u)) return u; }
  return '';
}
/** Um feed (texto) → itens crus: { titulo, url, data, autor, resumoHtml, imagem, categorias }. Aceita RSS 2.0 e Atom. */
export function leFeed(xml) {
  const s = String(xml || '');
  const atom = /<feed[\s>]/i.test(s) && !/<rss[\s>]/i.test(s);
  if (!atom && !/<(rss|rdf:RDF)[\s>]/i.test(s)) throw new Error('não é RSS nem Atom');
  return blocos(s, atom ? 'entry' : 'item').map(b => {
    if (atom) {
      const links = vazias(b, 'link'); const alt = links.find(l => (l.rel || 'alternate') === 'alternate' && l.href) || links.find(l => l.href) || {};
      const resumo = pega(b, 'summary'), corpo = pega(b, 'content');
      return { titulo: pega(b, 'title'), url: alt.href || '', data: pega(b, 'published') || pega(b, 'updated'), autor: pega(blocos(b, 'author')[0] || '', 'name'),
        resumoHtml: resumo || corpo, imagem: capaDe(b, [resumo, corpo]), categorias: vazias(b, 'category').map(c => c.term || c.label || '').filter(Boolean) };
    }
    const desc = pega(b, 'description'), corpo = pega(b, 'content:encoded');
    return { titulo: pega(b, 'title'), url: pega(b, 'link') || pega(b, 'guid'), data: pega(b, 'pubDate') || pega(b, 'dc:date'), autor: pega(b, 'dc:creator') || pega(b, 'author'),
      resumoHtml: desc || corpo, imagem: capaDe(b, [desc, corpo]), categorias: blocos(b, 'category').map(c => textoSemHtml(cdata(c))).filter(Boolean) };
  });
}

/* ---------------- normalização ---------------- */
/** O mesmo endereço escrito de dois jeitos é o mesmo: sem âncora, sem rastreio (utm_*, fbclid…), sem barra no fim. */
export function enderecoCanonico(u) {
  const s = enderecoSeguro(u); if (!s) return '';
  const x = new URL(s); x.hash = '';
  for (const k of [...x.searchParams.keys()]) if (/^(utm_|fbclid$|gclid$|mc_cid$|mc_eid$|ref$)/i.test(k)) x.searchParams.delete(k);
  return (x.origin + x.pathname.replace(/\/+$/, '') + (x.searchParams.size ? '?' + x.searchParams : '')).toLowerCase();
}
export const idDe = url => createHash('sha1').update(enderecoCanonico(url)).digest('hex').slice(0, 12);

const TEMAS = [
  ['commander', /\b(commander|c?edh|brawl)\b/],
  ['pauper', /\bpauper\b/],
  ['arena', /\b(arena|mtga|midweek magic|historic|alchemy|explorer|timeless)\b/],
  ['lancamentos', /\b(spoilers?|previews?|prerelease|set reviews?|revealed|first look|release notes|collecting)\b/],
  ['competitivo', /\b(pro tour|grand prix|regional championship|world championship|tournaments?|metagame|qualifiers?|standard|modern|pioneer|legacy|top 8)\b/],
];
export const TEMAS_VALIDOS = TEMAS.map(t => t[0]);
/** Temas pelo título e pelas categorias do feed, mais os fixos da fonte. Ordem estável; sem tema, lista vazia. */
export function temasDe({ titulo = '', categorias = [] } = {}, fixos = []) {
  const t = (titulo + ' | ' + categorias.join(' | ')).toLowerCase();
  return TEMAS.filter(([k, r]) => fixos.includes(k) || r.test(t)).map(([k]) => k);
}
// Sites de Magic também publicam sobre outros jogos; isso fica fora da linha do tempo. Limite declarado: matéria de
// Magic marcada com a categoria de outro jogo (uma coleção cruzada, por exemplo) sai junto.
const OUTRO_JOGO = /\b(riftbound|lorcana|pok[eé]mon|flesh and blood|star wars:? unlimited|one piece|dungeons (&|and) dragons|d&d|dnd|yu-?gi-?oh|digimon)\b/i;
export const foraDoTema = ({ titulo = '', categorias = [] } = {}) => OUTRO_JOGO.test(titulo) || categorias.some(c => OUTRO_JOGO.test(c));

/** Item cru → item publicado, ou `null` com o motivo em `aoDescartar` (sem título, sem endereço, data inválida ou no
    futuro, outro jogo). */
export function normaliza(cru, fonte, { agora = Date.now(), aoDescartar = () => {} } = {}) {
  const titulo = textoSemHtml(cru.titulo).slice(0, 200);
  const url = enderecoSeguro(cru.url);
  if (!titulo) { aoDescartar('sem título'); return null; }
  if (!url) { aoDescartar('sem endereço'); return null; }
  const ms = Date.parse(cru.data);
  if (!Number.isFinite(ms)) { aoDescartar('data inválida'); return null; }
  if (ms > agora + 24 * 3600e3) { aoDescartar('data no futuro'); return null; }
  const categorias = (cru.categorias || []).map(c => textoSemHtml(c)).filter(Boolean);
  if (foraDoTema({ titulo, categorias })) { aoDescartar('outro jogo'); return null; }
  let resumo = resume(cru.resumoHtml);
  if (resumo.toLowerCase() === titulo.toLowerCase()) resumo = '';
  return { id: idDe(url), titulo, resumo, url, fonte: fonte.id, autor: textoSemHtml(cru.autor).slice(0, 80), data: new Date(Math.min(ms, agora)).toISOString(),
    imagem: enderecoSeguro(cru.imagem, { soHttps: true }), idioma: fonte.idioma || 'en', temas: temasDe({ titulo, categorias }, fonte.temas || []) };
}

/* ---------------- linha do tempo ---------------- */
const porData = (a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
/** Tira repetidos: mesmo endereço, ou mesmo título no mesmo dia (a mesma notícia republicada). Fica o primeiro da lista. */
export function semRepetidos(itens) {
  const vistos = new Set(), out = [];
  for (const it of itens) {
    const ku = 'u:' + enderecoCanonico(it.url), kt = 't:' + it.titulo.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim() + '@' + it.data.slice(0, 10);
    if (vistos.has(ku) || vistos.has(kt)) continue;
    vistos.add(ku); vistos.add(kt); out.push(it);
  }
  return out;
}
export const naJanela = (itens, agora = Date.now(), dias = DIAS) => itens.filter(it => Date.parse(it.data) >= agora - dias * 86400e3);
/** O que já estava publicado + o que chegou agora → a linha do tempo: o publicado vem primeiro (o id e o texto de
    uma notícia já mostrada não mudam), sem repetidos, dentro da janela, da mais nova para a mais antiga. */
export function linhaDoTempo(anteriores, novos, { agora = Date.now(), dias = DIAS } = {}) {
  return naJanela(semRepetidos([...anteriores, ...novos]), agora, dias).sort(porData);
}
export function emPaginas(itens, porPagina = POR_PAGINA) {
  const out = []; for (let i = 0; i < itens.length; i += porPagina) out.push(itens.slice(i, i + porPagina)); return out;
}

/* ---------------- montagem ---------------- */
/** `feeds`: { [idDaFonte]: { xml } | { erro } }. Devolve { indice, paginas } prontos para gravar. Fonte que falhou ou
    veio ilegível não derruba nada: as outras entram, o que ela já tinha publicado continua, e a falha fica no índice. */
export function monta({ fontes = FONTES, feeds = {}, anteriores = [], agora = Date.now(), porPagina = POR_PAGINA, dias = DIAS } = {}) {
  const novos = [], relato = [];
  for (const f of fontes) {
    const r = feeds[f.id] || { erro: 'sem resposta' };
    const linha = { id: f.id, nome: f.nome, site: f.site, idioma: f.idioma || 'en', ok: false, lidos: 0, descartados: 0, erro: '' };
    if (r.erro) linha.erro = String(r.erro).slice(0, 160);
    else {
      try {
        const crus = leFeed(r.xml);
        for (const c of crus) { const it = normaliza(c, f, { agora, aoDescartar: () => { linha.descartados++; } }); if (it) { novos.push(it); linha.lidos++; } }
        linha.ok = true;
      } catch (e) { linha.erro = String((e && e.message) || e).slice(0, 160); }
    }
    relato.push(linha);
  }
  const conhecidas = new Set(fontes.map(f => f.id));
  const itens = linhaDoTempo(anteriores.filter(it => it && conhecidas.has(it.fonte)), novos, { agora, dias });
  const pags = emPaginas(itens, porPagina);
  for (const l of relato) l.itens = itens.filter(it => it.fonte === l.id).length;
  return {
    indice: { versao: VERSAO, coletadoEm: new Date(agora).toISOString(), total: itens.length, paginas: pags.length, porPagina, dias, temas: TEMAS_VALIDOS, fontes: relato },
    paginas: pags.map((p, i) => ({ versao: VERSAO, pagina: i + 1, paginas: pags.length, itens: p })),
  };
}
/** Vale regravar? Sim se a lista de notícias mudou, se o estado de alguma fonte mudou, ou se o índice publicado está
    velho. Sem isso, cada hora viraria um commit só com a hora nova. */
export function mudou(antes, depois, idsAntes, idsDepois, { horas = HORAS_SEM_MUDANCA } = {}) {
  if (!antes) return true;
  if (idsAntes.join() !== idsDepois.join()) return true;
  const estado = i => (i.fontes || []).map(f => f.id + ':' + (f.ok ? 1 : 0)).join();
  if (estado(antes) !== estado(depois)) return true;
  return Date.parse(depois.coletadoEm) - Date.parse(antes.coletadoEm) >= horas * 3600e3 || !Number.isFinite(Date.parse(antes.coletadoEm));
}

/* ---------------- rede e disco ---------------- */
const TETO_BYTES = 3 * 1024 * 1024;
/** Busca os feeds em paralelo; cada um tem 20 s e 3 MB. Nunca lança: a falha de uma fonte vira `{ erro }`. */
export async function coleta(fontes = FONTES, { busca = globalThis.fetch, prazo = 20000 } = {}) {
  const pares = await Promise.all(fontes.map(async f => {
    const c = new AbortController(); const t = setTimeout(() => c.abort(), prazo);
    try {
      const r = await busca(f.feed, { signal: c.signal, redirect: 'follow', headers: { 'user-agent': 'EstanteNoticias/1 (+https://github.com/guiamuy/-Estante-Gerenciador-e-Simulador-de-Magic-)', accept: 'application/atom+xml, application/rss+xml, application/xml;q=0.9, text/xml;q=0.8' } });
      if (!r.ok) return [f.id, { erro: 'HTTP ' + r.status }];
      const xml = await r.text();
      if (xml.length > TETO_BYTES) return [f.id, { erro: 'feed grande demais' }];
      return [f.id, { xml }];
    } catch (e) { return [f.id, { erro: e && e.name === 'AbortError' ? 'tempo esgotado' : String((e && e.message) || e) }]; }
    finally { clearTimeout(t); }
  }));
  return Object.fromEntries(pares);
}
async function leJson(caminho) { try { return JSON.parse(await readFile(caminho, 'utf8')); } catch (e) { return null; } }
/** Lê o que está publicado em `pasta`, coleta, monta e grava. Devolve o que fez (para o fluxo decidir se publica). */
export async function publica(pasta, { fontes = FONTES, busca = globalThis.fetch, agora = Date.now() } = {}) {
  await mkdir(pasta, { recursive: true });
  const antes = await leJson(join(pasta, 'indice.json'));
  const anteriores = [];
  for (let i = 1; antes && i <= (antes.paginas || 0); i++) { const p = await leJson(join(pasta, `pagina-${i}.json`)); if (p && Array.isArray(p.itens)) anteriores.push(...p.itens); }
  const { indice, paginas } = monta({ fontes, feeds: await coleta(fontes, { busca }), anteriores, agora });
  const ids = ps => ps.flatMap(p => (Array.isArray(p) ? p : p.itens).map(it => it.id));
  if (!mudou(antes, indice, ids([anteriores]), ids(paginas))) return { gravou: false, indice: antes };
  for (const p of paginas) await writeFile(join(pasta, `pagina-${p.pagina}.json`), JSON.stringify(p) + '\n');
  for (const nome of await readdir(pasta)) { const m = /^pagina-(\d+)\.json$/.exec(nome); if (m && Number(m[1]) > paginas.length) await rm(join(pasta, nome)); }
  await writeFile(join(pasta, 'indice.json'), JSON.stringify(indice, null, 1) + '\n');
  return { gravou: true, indice };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const i = process.argv.indexOf('--saida'); const pasta = i > 0 ? process.argv[i + 1] : '';
  if (!pasta) { console.error('uso: node noticias.mjs --saida <pasta>'); process.exit(2); }
  const { gravou, indice } = await publica(pasta);
  for (const f of indice.fontes) console.log(`${f.ok ? '✓' : '✗'} ${f.nome}: ${f.ok ? `${f.lidos} lidas, ${f.descartados} descartadas` : f.erro} · ${f.itens ?? 0} na linha do tempo`);
  console.log(gravou ? `gravado: ${indice.total} notícia(s) em ${indice.paginas} página(s)` : 'sem mudança: nada gravado');
  // todas as fontes falharam: o que estava publicado fica como está, e o fluxo acusa
  if (indice.fontes.every(f => !f.ok)) { console.error('nenhuma fonte respondeu'); process.exit(1); }
}
