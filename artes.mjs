#!/usr/bin/env node
/* =====================================================================
   X12 · S-595 · BASE DE IMPRESSÕES DA ARTE
   Gera, fora do app, a base que o scanner usa para reconhecer a carta pela
   arte: uma impressão perceptual de 192 bits por ilustração (impressaoDaArte,
   a MESMA função do app, lida do index.html). Fonte: os dados em massa
   "Unique Artwork" da Scryfall (uma carta por ilustração) e a imagem pequena
   de cada uma (cards.scryfall.io). A política da Scryfall (rate-limits,
   consultada em 01/11/2026) pede os dados em massa para "um número grande de
   imagens" e diz que os servidores *.scryfall.io não têm limite de taxa;
   mesmo assim, no máximo 8 imagens ao mesmo tempo e cabeçalho identificando
   o app. As imagens não são guardadas: só a impressão e o nome/edição.

     node artes.mjs --saida <pasta> [--limite N] [--autoteste N] [--idiomas pt,es,it,fr,de,ja,zhs,zht,ko,ru]

   Escreve na pasta: artes.json (índice), artes.bin (impressões) e
   medida.json (autoteste: a base reconhece as próprias imagens degradadas
   como a câmera degrada — só números, nenhuma imagem). Reaproveita a base
   que já estiver na pasta: só baixa a imagem de ilustração nova ou mudada.
   ===================================================================== */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { Readable } from 'node:stream';
import { createGunzip } from 'node:zlib';

const RAIZ = dirname(fileURLToPath(import.meta.url));
const BULK = 'https://api.scryfall.com/bulk-data/unique-artwork';
const CABECALHOS = { 'User-Agent': 'Estante/1.0 (+https://github.com/guiamuy/-Estante-Gerenciador-e-Simulador-de-Magic-)', Accept: 'application/json;q=0.9,*/*;q=0.8' };
const LAYOUTS_FORA = new Set(['art_series', 'emblem', 'vanguard', 'scheme', 'planar']);

/** As funções do scanner, do próprio index.html (fonte única). */
export async function scanner() {
  const { loadModules } = await import(join(RAIZ, '_load.mjs'));
  return loadModules().scanner;
}

/** Cartas da Scryfall que entram na base: papel, com imagem pequena da frente. */
export function cartasDaBase(lista) {
  const out = [];
  for (const c of lista || []) {
    if (!c || c.digital || LAYOUTS_FORA.has(c.layout)) continue;
    const img = (c.image_uris && c.image_uris.small) || (c.card_faces && c.card_faces[0] && c.card_faces[0].image_uris && c.card_faces[0].image_uris.small);
    if (!img || typeof img !== 'string' || !img.startsWith('https://cards.scryfall.io/')) continue;
    const ilustracao = c.illustration_id || (c.card_faces && c.card_faces[0] && c.card_faces[0].illustration_id) || c.id;
    const versao = (/\?(\d+)$/.exec(img) || [])[1] || '';
    out.push({ nome: String(c.name || '').slice(0, 160), set: String(c.set || '').slice(0, 10), numero: String(c.collector_number || '').slice(0, 12), ilustracao: String(ilustracao).slice(0, 40), versao, img });
  }
  return out;
}

/** A base que já existe na pasta (para não baixar de novo a mesma ilustração). Map ilustracao|versao → impressão. */
export async function baseAnterior(pasta, X) {
  const mapa = new Map();
  try {
    if (!existsSync(join(pasta, 'artes.json')) || !existsSync(join(pasta, 'artes.bin'))) return mapa;
    const b = X.abreBaseDeArtes(JSON.parse(await readFile(join(pasta, 'artes.json'), 'utf8')), await readFile(join(pasta, 'artes.bin')));
    for (let i = 0; i < b.total; i++) { const c = b.carta(i); mapa.set(c.ilustracao + '|' + c.versao, b.hashes.slice(i * X.BITS_ARTE / 32, (i + 1) * X.BITS_ARTE / 32)); }
  } catch (e) { /* base velha ilegível: refaz tudo */ }
  return mapa;
}

/** Decodifica a imagem (JPEG ou PNG) em RGBA. */
export function decodifica(buf) {
  const require = createRequire(import.meta.url);
  const b = Buffer.from(buf);
  if (b[0] === 0x89 && b[1] === 0x50) { const { PNG } = require('pngjs'); const p = PNG.sync.read(b); return { data: p.data, width: p.width, height: p.height }; }
  return require('jpeg-js').decode(b, { useTArray: true, formatAsRGBA: true, maxMemoryUsageInMB: 256, maxResolutionInMP: 4 });   // a imagem pequena tem 0,03 MP: maior que isso é recusada
}
const cantosDaImagem = (w, h) => [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }];

/** Baixa com tempo-limite e duas novas tentativas (recuo de 1 e 3 s). */
async function busca(fetchFn, url, tipo = 'json', { tentativas = 3, ms = 30000 } = {}) {
  let erro;
  for (let t = 0; t < tentativas; t++) {
    try {
      const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), ms);
      try {
        const r = await fetchFn(url, { headers: CABECALHOS, signal: ctl.signal });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return tipo === 'json' ? await r.json() : await r.arrayBuffer();
      } finally { clearTimeout(timer); }
    } catch (e) { erro = e; if (t < tentativas - 1) await new Promise(ok => setTimeout(ok, t ? 3000 : 1000)); }
  }
  throw erro;
}

/** Gera a base. Devolve { total, novas, reaproveitadas, falhas, medida }. */
/* S-597 · nomes impressos em outro idioma. A base de nomes do app é a da Scryfall, em inglês: carta impressa em português
   ("Beledros Murchaflor") não casava com nada. A busca da Scryfall com lang:pt devolve cada impressão em português com o
   nome impresso (`printed_name`) e o nome em inglês (`name`); o par vai para nomes-pt.json, que o app junta à base de
   nomes. Política da Scryfall (rate-limits, 01/11/2026): busca a no máximo 2 por segundo — aqui, uma página a cada 600 ms. */
/** Os pares (nome impresso → nome em inglês) de uma carta, faces das duplas incluídas. */
export function juntaPares(pares, c) {
  const faces = Array.isArray(c.card_faces) && c.card_faces.length ? c.card_faces : [c];
  for (const f of faces) {
    const impresso = String(f.printed_name || '').trim().slice(0, 160), nome = String(c.name || '').trim().slice(0, 160);
    if (impresso && nome && impresso.toLowerCase() !== String(f.name || nome).toLowerCase() && !pares.has(impresso)) pares.set(impresso, nome);
  }
}

export async function nomesNoIdioma(fetchFn, idioma = 'pt', { pausa = 600, maxPaginas = 400, log = () => {} } = {}) {
  const pares = new Map();
  let url = 'https://api.scryfall.com/cards/search?' + new URLSearchParams({ q: 'lang:' + idioma, unique: 'prints', include_multilingual: 'true', order: 'name' }).toString();
  for (let pag = 0; url && pag < maxPaginas; pag++) {
    const r = await busca(fetchFn, url);
    for (const c of (r && r.data) || []) juntaPares(pares, c);
    url = r && r.has_more && typeof r.next_page === 'string' && r.next_page.startsWith('https://api.scryfall.com/') ? r.next_page : null;
    if (url && pausa) await new Promise(ok => setTimeout(ok, pausa));
    if (pag % 50 === 49) log(`  nomes em ${idioma}: ${pares.size} (página ${pag + 1})`);
  }
  return [...pares].sort((a, b) => a[0].localeCompare(b[0]));
}

/* S-598 · os nomes de TODAS as línguas num download só: os dados em massa "All Cards" da Scryfall trazem cada impressão em
   cada língua, com `lang`, `printed_name` e `name`. É o caminho que a política da Scryfall pede para muitos dados (em vez de
   centenas de páginas de busca por língua) e cobre também japonês, chinês, coreano e russo, que o app vai ler depois (X20).
   O arquivo é grande (gigabytes sem compressão): é lido em fluxo, um objeto por vez, sem guardar o arquivo. */
const BULK_TODAS = 'https://api.scryfall.com/bulk-data/all-cards';

/** Separa um fluxo de texto JSON (lista de objetos) em objetos, pedaço a pedaço, sem depender de quebra de linha. */
export function separaObjetos() {
  let prof = 0, emTexto = false, escape = false, atual = '';
  return pedaco => {
    const out = []; let ini = prof > 0 ? 0 : -1;
    for (let i = 0; i < pedaco.length; i++) {
      const ch = pedaco.charCodeAt(i);
      if (emTexto) { if (escape) escape = false; else if (ch === 92) escape = true; else if (ch === 34) emTexto = false; continue; }
      if (ch === 34) { if (prof > 0) emTexto = true; }
      else if (ch === 123) { if (prof++ === 0) ini = i; }
      else if (ch === 125 && prof > 0 && --prof === 0) { out.push(atual + pedaco.slice(ini, i + 1)); atual = ''; ini = -1; }
    }
    if (prof > 0) atual += pedaco.slice(ini);
    return out;
  };
}

/* S-600 · a Scryfall passou a anunciar os dados em massa só em JSON Lines comprimido (`jsonl_download_uri`, .jsonl.gz;
   01/11/2026, sem `download_uri`): a primeira corrida do fluxo parou em "sem endereço". Aceita os dois formatos — lista JSON
   ou uma carta por linha, com ou sem gzip (reconhecido pelos dois primeiros bytes) — e lê sempre em fluxo. */
/** O endereço do arquivo de dados em massa, só se for da Scryfall. */
export function enderecoDaMassa(meta) {
  for (const u of [meta && meta.jsonl_download_uri, meta && meta.download_uri]) if (typeof u === 'string' && /^https:\/\/data\.scryfall\.io\//.test(u)) return u;
  throw new Error('dados em massa sem endereço da Scryfall');
}

/** O corpo de uma resposta como texto, pedaço a pedaço; descomprime se vier em gzip. */
export async function* textoDoCorpo(body) {
  const it = body[Symbol.asyncIterator]();
  const primeiro = await it.next();
  if (primeiro.done) return;
  const bytes = v => (typeof v === 'string' ? Buffer.from(v) : v);
  const p0 = bytes(primeiro.value);
  const resto = (async function* () { yield p0; for (let x = await it.next(); !x.done; x = await it.next()) yield bytes(x.value); })();
  const fonte = p0[0] === 0x1f && p0[1] === 0x8b ? Readable.from(resto, { objectMode: false }).pipe(createGunzip()) : resto;
  const texto = new TextDecoder();
  for await (const p of fonte) yield texto.decode(p, { stream: true });
  const fim = texto.decode(); if (fim) yield fim;
}

/** Baixa um arquivo de dados em massa e entrega cada objeto (texto JSON cru) a `usa`; devolve quantos leu. */
async function lerMassa(fetchFn, url, usa, { ms, log = () => {} } = {}) {
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), ms);
  let lidos = 0;
  try {
    const r = await fetchFn(url, { headers: CABECALHOS, signal: ctl.signal });
    if (!r.ok || !r.body) throw new Error('HTTP ' + r.status);
    const separa = separaObjetos();
    for await (const pedaco of textoDoCorpo(r.body)) {
      for (const obj of separa(pedaco)) { lidos++; usa(obj); }
      if (lidos && lidos % 100000 < 50) log(`  dados em massa: ${lidos} impressões lidas`);
    }
  } finally { clearTimeout(timer); }
  if (!lidos) throw new Error('dados em massa vazios');
  return lidos;
}

/** { idioma: [[impresso, nome], …] } das línguas pedidas, lidas dos dados em massa All Cards. */
export async function nomesDosDadosEmMassa(fetchFn, idiomas, { log = () => {}, ms = 45 * 60000 } = {}) {
  const quer = new Set(idiomas), pares = new Map(idiomas.map(i => [i, new Map()]));
  const url = enderecoDaMassa(await busca(fetchFn, BULK_TODAS));
  await lerMassa(fetchFn, url, obj => {
    const m = /"lang"\s*:\s*"([a-z]+)"/.exec(obj);   // só abre (JSON.parse) o objeto de uma língua pedida
    if (!m || !quer.has(m[1])) return;
    let c; try { c = JSON.parse(obj); } catch (e) { return; }
    if (c && c.lang === m[1]) juntaPares(pares.get(m[1]), c);
  }, { ms, log });
  return Object.fromEntries([...pares].map(([i, m]) => [i, [...m].sort((a, b) => a[0].localeCompare(b[0]))]));
}

export async function gera({ saida, limite = 0, autoteste = 0, idiomas = [], pausaNomes = 600, fetchFn = globalThis.fetch, paralelo = 8, log = console.log, X = null } = {}) {
  X = X || await scanner();
  await mkdir(saida, { recursive: true });
  const meta = await busca(fetchFn, BULK);
  const endereco = enderecoDaMassa(meta);
  let cartas;
  for (let t = 0; ; t++) {   // três tentativas, como as outras leituras
    try { cartas = []; await lerMassa(fetchFn, endereco, obj => { try { cartas.push(...cartasDaBase([JSON.parse(obj)])); } catch (e) {} }, { ms: 600000 }); break; }
    catch (e) { if (t >= 2) throw e; await new Promise(ok => setTimeout(ok, 3000)); }
  }
  cartas.sort((a, b) => a.nome.localeCompare(b.nome) || a.set.localeCompare(b.set) || a.numero.localeCompare(b.numero, undefined, { numeric: true }));
  if (limite > 0) cartas = cartas.slice(0, limite);
  const antes = await baseAnterior(saida, X);
  const hashes = new Array(cartas.length).fill(null);
  const amostra = new Set();
  if (autoteste > 0) { let s = 7; const rnd = () => (s = (s * 1103515245 + 12345) >>> 0) / 4294967296; while (amostra.size < Math.min(autoteste, cartas.length)) amostra.add(Math.floor(rnd() * cartas.length)); }
  const imagens = new Map();   // só as da amostra do autoteste, e só até o fim desta execução
  let novas = 0, reaproveitadas = 0, falhas = 0, feitas = 0, prox = 0;
  const trabalha = async () => {
    while (prox < cartas.length) {
      const i = prox++, c = cartas[i], chave = c.ilustracao + '|' + c.versao;
      if (antes.has(chave) && !amostra.has(i)) { hashes[i] = antes.get(chave); reaproveitadas++; }
      else {
        try {
          const img = decodifica(await busca(fetchFn, c.img, 'binario', { ms: 20000 }));
          hashes[i] = X.impressaoDaArte(img.data, img.width, img.height, cantosDaImagem(img.width, img.height));
          if (amostra.has(i)) imagens.set(i, img);
          if (antes.has(chave)) reaproveitadas++; else novas++;
        } catch (e) { falhas++; }
      }
      if (++feitas % 2000 === 0) log(`  ${feitas}/${cartas.length} (novas ${novas}, reaproveitadas ${reaproveitadas}, falhas ${falhas})`);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, paralelo) }, trabalha));
  const ok = cartas.map((c, i) => [c, hashes[i]]).filter(([, h]) => h);
  const indice = { versao: 1, geradoEm: new Date().toISOString(), fonte: 'Scryfall · Unique Artwork', dadosDe: meta.updated_at || null, bits: X.BITS_ARTE, faixa: X.FAIXA_ARTE,
    campos: ['nome', 'set', 'numero', 'ilustracao', 'versao'], cartas: ok.map(([c]) => [c.nome, c.set, c.numero, c.ilustracao, c.versao]) };
  // base igual à publicada (mesmas cartas, mesmas impressões): não regrava, para o ramo não crescer toda semana à toa
  const bin = X.binDasArtes(ok.map(([, h]) => h));
  let igual = false;
  try {
    const velho = JSON.parse(await readFile(join(saida, 'artes.json'), 'utf8')), binVelho = await readFile(join(saida, 'artes.bin'));
    igual = JSON.stringify(velho.cartas) === JSON.stringify(indice.cartas) && Buffer.compare(binVelho, Buffer.from(bin)) === 0;
  } catch (e) { /* sem base anterior */ }
  if (!igual) { await writeFile(join(saida, 'artes.json'), JSON.stringify(indice) + '\n'); await writeFile(join(saida, 'artes.bin'), bin); }
  let medida = null;
  if (imagens.size) {
    const base = X.abreBaseDeArtes(indice, X.binDasArtes(ok.map(([, h]) => h)));
    const posicao = new Map(); ok.forEach(([c], j) => posicao.set(c, j));
    medida = autotesteDaBase(X, base, [...imagens].map(([i, img]) => ({ img, j: posicao.get(cartas[i]) })).filter(x => x.j != null));
    await writeFile(join(saida, 'medida.json'), JSON.stringify({ geradoEm: indice.geradoEm, total: ok.length, ...medida }, null, 1) + '\n');
  }
  log(`base: ${ok.length} artes (novas ${novas}, reaproveitadas ${reaproveitadas}, falhas ${falhas})${igual ? ' · igual à publicada' : ''}`);
  // S-597 · S-598 · nomes impressos em outras línguas (uma falha aqui não derruba a base de artes). Primeiro pelos dados em
  // massa (todas as línguas num download); se falharem, pela busca, uma língua por vez.
  const nomes = {};
  let todas = null, fonte = 'Scryfall · dados em massa All Cards';
  if (idiomas.length) { try { todas = await nomesDosDadosEmMassa(fetchFn, idiomas, { log }); } catch (e) { log(`dados em massa dos nomes: falhou (${String(e && e.message || e).slice(0, 80)}); segue pela busca`); } }
  for (const idioma of idiomas) {
    try {
      const pares = todas && todas[idioma] && todas[idioma].length ? todas[idioma] : await nomesNoIdioma(fetchFn, idioma, { log, pausa: pausaNomes });
      const de = todas && todas[idioma] && todas[idioma].length ? fonte : 'Scryfall · busca lang:' + idioma;
      if (pares.length) { await writeFile(join(saida, `nomes-${idioma}.json`), JSON.stringify({ versao: 1, idioma, geradoEm: new Date().toISOString(), fonte: de, total: pares.length, pares }) + '\n'); nomes[idioma] = pares.length; }
      log(`nomes em ${idioma}: ${pares.length}`);
    } catch (e) { log(`nomes em ${idioma}: falhou (${String(e && e.message || e).slice(0, 80)})`); }
  }
  return { total: ok.length, novas, reaproveitadas, falhas, medida, igual, nomes };
}

/* ---------------- autoteste: a base reconhece as próprias cartas degradadas como a câmera degrada ---------------- */
function borra(img, s) {
  const r = Math.ceil(s * 3), k = []; let soma = 0; for (let i = -r; i <= r; i++) { const v = Math.exp(-i * i / (2 * s * s)); k.push(v); soma += v; } for (let i = 0; i < k.length; i++) k[i] /= soma;
  const { width: w, height: h, data: a } = img, t = new Float32Array(w * h * 3), o = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 3; c++) { let v = 0; for (let i = -r; i <= r; i++) v += a[(y * w + Math.min(w - 1, Math.max(0, x + i))) * 4 + c] * k[i + r]; t[(y * w + x) * 3 + c] = v; }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { for (let c = 0; c < 3; c++) { let v = 0; for (let i = -r; i <= r; i++) v += t[(Math.min(h - 1, Math.max(0, y + i)) * w + x) * 3 + c] * k[i + r]; o[(y * w + x) * 4 + c] = v; } o[(y * w + x) * 4 + 3] = 255; }
  return { data: o, width: w, height: h };
}
function veu(img, quanto = 0.16, reflexo = 0.5) {
  const { width: w, height: h } = img, o = new Uint8ClampedArray(img.data);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4, f = Math.exp(-(((y / h + x / w * 0.35) - 0.3) ** 2) / (2 * 0.05 ** 2)); for (let c = 0; c < 3; c++) { let v = o[i + c]; v += (235 - v) * quanto; v += (255 - v) * reflexo * f; o[i + c] = v; } }
  return { data: o, width: w, height: h };
}
/** Variações: carta reta; cantos tortos (contorno impreciso, até 3%); desfoque; protetor (véu + reflexo + contorno no
    protetor, 4% maior); tudo junto. Para cada uma: acerto na primeira posição e as distâncias (certa × melhor errada). */
export function autotesteDaBase(X, base, casos) {
  const W = (img) => img.width, H = (img) => img.height;
  const jitter = (img, f, s) => { const w = W(img), h = H(img); let k = s; const r = () => (k = (k * 16807) % 2147483647) / 2147483647 - 0.5; return [{ x: r() * f * w, y: r() * f * h }, { x: w + r() * f * w, y: r() * f * h }, { x: w + r() * f * w, y: h + r() * f * h }, { x: r() * f * w, y: h + r() * f * h }]; };
  const maior = (img, f) => { const w = W(img), h = H(img), dx = w * f / 2, dy = h * f / 2; return [{ x: -dx, y: -dy }, { x: w + dx, y: -dy }, { x: w + dx, y: h + dy }, { x: -dx, y: h + dy }]; };
  const variacoes = {
    reta: img => [img, cantosDaImagem(W(img), H(img))],
    torta: (img, s) => [img, jitter(img, 0.06, s)],
    borrada: img => [borra(img, 1.2), cantosDaImagem(W(img), H(img))],
    protetor: img => [veu(img), maior(img, 0.04)],
    tudo: (img, s) => [borra(veu(img), 1.2), jitter(img, 0.06, s)]
  };
  const out = {};
  for (const [nome, fn] of Object.entries(variacoes)) {
    let certas = 0; const dc = [], de = [];
    casos.forEach(({ img, j }, n) => {
      const [im, cantos] = fn(img, n + 1);
      const h = X.impressaoDaArte(im.data, W(im), H(im), cantos);
      const top = X.buscaArte(base.hashes, h, { quantas: 2 });
      if (top[0] && top[0].i === j) certas++;
      dc.push(X.distanciaDaArte(h, base.hashes, j));
      const errada = top.find(t => t.i !== j); if (errada) de.push(errada.d);
    });
    const q = (v, p) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : null; };
    out[nome] = { casos: casos.length, certas, distanciaCerta: { mediana: q(dc, 0.5), p95: q(dc, 0.95) }, melhorErrada: { p5: q(de, 0.05), mediana: q(de, 0.5) } };
  }
  return { variacoes: out };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
  const saida = arg('--saida', null);
  if (!saida) { console.error('uso: node artes.mjs --saida <pasta> [--limite N] [--autoteste N]'); process.exit(2); }
  gera({ saida, limite: +arg('--limite', 0), autoteste: +arg('--autoteste', 0), idiomas: String(arg('--idiomas', '')).split(',').filter(Boolean) })
    .then(r => { if (r.medida) console.log(JSON.stringify(r.medida)); if (r.total === 0) process.exit(1); })
    .catch(e => { console.error('::error::' + String(e && e.message || e).slice(0, 200)); process.exit(1); });
}
