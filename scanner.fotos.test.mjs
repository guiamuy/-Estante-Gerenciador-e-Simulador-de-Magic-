// X10/X11 · acerto do scanner medido em fotos: o caminho inteiro do app, fora do navegador.
// Quadro em 320 px → achaQuadrilatero (quatro cantos) → recorteDaFaixa (o pedaço do quadro com o nome)
// → preparaNome (retifica, acha a linha do nome, binariza, limpa) → OCR de verdade (tesseract.js, modo
// "linha") → matchName. Sem contorno, vale a moldura guia, como no app. A edição sai da carta retificada
// (preparaColecao → OCR em bloco, modo "colecao" → parseCollectorLine → resolvePrinting).
// Alvos: nome ≥ 90%, edição ≥ 70%. Falhas saem no relatório, uma por foto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { loadModules } from './_load.mjs';

const { scanner: X } = loadModules();
const require = createRequire(import.meta.url);
const dir = join(dirname(fileURLToPath(import.meta.url)), 'fotos');
const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));

let deps = null, skip = false;
try { deps = { tesseract: require('tesseract.js'), jpeg: require('jpeg-js'), png: require('pngjs').PNG, langPath: dirname(require.resolve('@tesseract.js-data/eng/package.json')) + '/4.0.0' }; }
catch (e) { skip = 'OCR de teste não instalado (npm i -D tesseract.js jpeg-js pngjs @tesseract.js-data/eng)'; }

/* ---------------- imagem: decodificar, reduzir, recortar, codificar ---------------- */
function decodifica(arquivo) {
  const buf = readFileSync(arquivo);
  if (/\.png$/i.test(arquivo)) { const p = deps.png.sync.read(buf); return { data: p.data, width: p.width, height: p.height }; }
  return deps.jpeg.decode(buf, { useTArray: true, formatAsRGBA: true });
}
/** Tons de cinza com o lado maior em 320 px, como quadroPequeno() faz no app. */
function cinzaReduzido(img, lado = 320) {
  const e = lado / Math.max(img.width, img.height), w = Math.max(1, Math.round(img.width * e)), h = Math.max(1, Math.round(img.height * e));
  const g = new Uint8ClampedArray(w * h);
  const sx = img.width / w, sy = img.height / h;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let soma = 0, n = 0;
    for (let yy = Math.floor(y * sy); yy < Math.min(img.height, Math.floor((y + 1) * sy)); yy++)
      for (let xx = Math.floor(x * sx); xx < Math.min(img.width, Math.floor((x + 1) * sx)); xx++) {
        const i = (yy * img.width + xx) * 4; soma += 0.299 * img.data[i] + 0.587 * img.data[i + 1] + 0.114 * img.data[i + 2]; n++;
      }
    g[y * w + x] = n ? soma / n : 0;
  }
  return { cinza: g, w, h };
}
/** O pedaço do quadro que o app copia do vídeo (camera.capture de uma região), em RGBA. */
function pedaco(img, rec) {
  const x0 = Math.round(rec.regiao.x * img.width), y0 = Math.round(rec.regiao.y * img.height);
  const d = new Uint8ClampedArray(rec.w * rec.h * 4);
  for (let y = 0; y < rec.h; y++) d.set(img.data.subarray(((y0 + y) * img.width + x0) * 4, ((y0 + y) * img.width + x0 + rec.w) * 4), y * rec.w * 4);
  return d;
}
const paraPng = t => deps.png.sync.write(Object.assign(new deps.png({ width: t.w, height: t.h }), { data: Buffer.from(t.data.buffer, t.data.byteOffset, t.data.length) }));
/** A moldura guia para a foto: onde a pessoa teria posto a carta. Vem do manifest (`moldura`, em frações do
    quadro) ou, nas sintéticas, da posição em que a carta foi desenhada, com um erro de enquadramento fixo. */
function molduraDaFoto(f) {
  if (f.moldura) return f.moldura;
  if (f.alturaCarta == null && f.cx == null && f.origem !== 'sintetica') return null;
  const h = (f.alturaCarta || 0.7) * 1.05, w = h * f.altura * (63 / 88) / f.largura;
  return { x: (f.cx || 0.5) - w / 2 + 0.012, y: (f.cy || 0.5) - h / 2 - 0.012, w, h };
}
const cantosDe = r => [{ x: r.x, y: r.y }, { x: r.x + r.w, y: r.y }, { x: r.x + r.w, y: r.y + r.h }, { x: r.x, y: r.y + r.h }];
/** Uma leitura do nome por um caminho (contorno ou moldura), exatamente como lerUmaVez() no app. */
async function leNome(worker, index, img, cantosFr) {
  const rec = X.recorteDaFaixa(cantosFr, X.FAIXA_NOME, img.width, img.height);
  if (!rec) return null;
  const pr = X.preparaNome(pedaco(img, rec), rec.w, rec.h, rec.cantos);
  if (!pr) return null;
  if (process.env.FOTOS_DEBUG) (await import('node:fs')).writeFileSync(join(process.env.FOTOS_DEBUG, 'nome-' + nomeDebug + '-' + Math.round(cantosFr[0].x * 1000) + '.png'), paraPng(pr));
  await worker.setParameters(X.OCR_MODES.linha);
  const texto = (await worker.recognize(paraPng(pr))).data.text || '';
  return { texto, found: X.matchName(index, texto), nitidez: pr.nitidez };
}
/** A linha de coleção, como identify() no app: preparaColecao (retifica, acha o bloco, binariza) e OCR em bloco. */
let nomeDebug = '';
async function leColecao(worker, img, cantosFr) {
  const rec = X.recorteDaFaixa(cantosFr, X.FAIXA_COLECAO, img.width, img.height);
  if (!rec) return '';
  const pr = X.preparaColecao(pedaco(img, rec), rec.w, rec.h, rec.cantos, X.larguraColecao(X.alturaDaCarta(cantosFr, img.width, img.height)));
  if (!pr) return '';
  if (process.env.FOTOS_DEBUG) (await import('node:fs')).writeFileSync(join(process.env.FOTOS_DEBUG, 'col-' + nomeDebug + '.png'), paraPng(pr));
  await worker.setParameters(X.OCR_MODES.colecao);
  return (await worker.recognize(paraPng(pr))).data.text || '';
}

/* ---------------- base de nomes: as esperadas no meio de muitas parecidas ---------------- */
function baseDeNomes() {
  const rnd = (() => { let s = 11; return () => (s = (s * 1103515245 + 12345) >>> 0) / 4294967296; })();
  const syll = ['ka', 'lo', 'mer', 'thi', 'on', 'dra', 'sol', 'ring', 'is', 'land', 'bolt', 'ven', 'gar', 'u', 'rix', 'spel', 'ter', 'coun'];
  const cap = s => s[0].toUpperCase() + s.slice(1);
  const ruido = [];
  for (let i = 0; i < 6000; i++) { const n = 1 + Math.floor(rnd() * 3); ruido.push(Array.from({ length: n }, () => cap(syll[Math.floor(rnd() * syll.length)] + syll[Math.floor(rnd() * syll.length)])).join(' ')); }
  return [...new Set([...manifest.fotos.map(f => f.nome), ...(manifest.nomesExtras || []), ...ruido])];
}

/* ---------------- a medição ---------------- */
async function mede(fotos = manifest.fotos) {
  const index = X.buildIndex(baseDeNomes());
  const worker = await deps.tesseract.createWorker('eng', 1, { langPath: deps.langPath, gzip: true, cacheMethod: 'none' });
  const linhas = [];
  let nomeOk = 0, edOk = 0, detectadas = 0;
  const nota = r => (r && r.found[0] ? r.found[0].score : 0);
  try {
    for (const f of fotos) {
      const arquivo = join(dir, f.arquivo);
      const linha = { foto: f.arquivo, esperado: f.nome };
      if (!existsSync(arquivo)) { linha.erro = 'arquivo ausente'; linhas.push(linha); continue; }
      const img = decodifica(arquivo);
      const q = cinzaReduzido(img);
      const quad = X.achaQuadrilatero(q.cinza, q.w, q.h);
      const moldura = molduraDaFoto(f);
      if (quad) detectadas++;
      // como no app: o contorno primeiro; sem leitura, a moldura guia
      nomeDebug = f.arquivo.replace(/\.\w+$/, '');
      const caminhos = [...(quad ? [['carta', quad.cantos]] : []), ...(moldura ? [['moldura', cantosDe(moldura)]] : [])];
      if (!caminhos.length) { linha.erro = 'carta não encontrada no quadro e foto sem moldura'; linhas.push(linha); continue; }
      let melhor = null;
      for (const [nome, cantos] of caminhos) {
        const r = await leNome(worker, index, img, cantos);
        if (r && (!melhor || nota(r) > nota(melhor))) melhor = { ...r, caminho: nome, cantos };
        if (nota(r) >= X.ACCEPT) break;
      }
      if (!melhor) { linha.erro = 'sem linha de nome'; linhas.push(linha); continue; }
      const cand = melhor.found;
      linha.caminho = melhor.caminho; linha.nitidez = Math.round(melhor.nitidez * 10) / 10;
      if (melhor.nitidez < X.LIMIARES_LINHA.nitidezMin) linha.pulada = true;
      linha.lido = melhor.texto.trim(); linha.melhor = cand[0] ? `${cand[0].name} (${Math.round(cand[0].score * 100)}%)` : '—';
      linha.nomeOk = !!cand[0] && cand[0].name === f.nome && cand[0].score >= X.ACCEPT && !linha.pulada;
      if (linha.nomeOk) nomeOk++;
      nomeDebug = f.arquivo.replace(/\.\w+$/, '');
      const col = await leColecao(worker, img, melhor.cantos);
      const p = X.parseCollectorLine(col);
      // como no app: a leitura é casada com as impressões conhecidas da carta (identify → resolvePrinting)
      const res = X.resolvePrinting(f.impressoes || [], p);
      linha.colecao = col.trim().replace(/\s+/g, ' '); linha.edicao = `${p.set || '?'} ${p.number || '?'}` + (res.exact ? ` → ${res.exact.set} ${res.exact.number}` : ' → sem impressão');
      const semZero = v => String(v).toLowerCase().replace(/^0+(?=\d)/, '');
      linha.edOk = !!res.exact && res.exact.set === String(f.set).toLowerCase() && semZero(res.exact.number) === semZero(f.numero);
      if (linha.edOk) edOk++;
      linhas.push(linha);
    }
  } finally { await worker.terminate(); }
  return { linhas, n: fotos.length, nomeOk, edOk, detectadas, puladas: linhas.filter(l => l.pulada).length };
}

function relatorio(r) {
  const falhas = r.linhas.filter(l => l.erro || !l.nomeOk || !l.edOk);
  const cab = `X10 · ${r.n} foto(s): contorno achado em ${r.detectadas}, nome ${r.nomeOk}/${r.n}, edição ${r.edOk}/${r.n}`;
  const corpo = falhas.map(l => l.erro ? `  ✗ ${l.foto}: ${l.erro}` :
    `  ${l.nomeOk ? '·' : '✗'} ${l.foto} [${l.caminho}, nitidez ${l.nitidez}]: nome lido "${l.lido}" → ${l.melhor} (esperado ${l.esperado})${l.edOk ? '' : ` · edição lida "${l.colecao}" → ${l.edicao}`}`);
  return [cab, ...corpo].join('\n');
}

test('X10 · o scanner acerta o nome em ≥ 90% e a edição em ≥ 70% das fotos do conjunto', { skip, timeout: 240000 }, async () => {
  assert.ok(manifest.fotos.length >= 10, 'o conjunto precisa de pelo menos 10 fotos para a medida valer alguma coisa');
  const r = await mede();
  console.log(relatorio(r));
  assert.ok(r.nomeOk / r.n >= 0.9, `nome: ${r.nomeOk}/${r.n} (alvo ≥ 90%)\n${relatorio(r)}`);
  // Leva 112 · a régua de nitidez não descarta foto que o OCR lê certo
  assert.equal(r.puladas, 0, 'nenhuma foto legível descartada por nitidez: ' + JSON.stringify(r.linhas.map(l => [l.foto, l.nitidez])));
  assert.ok(r.edOk / r.n >= 0.7, `edição: ${r.edOk}/${r.n} (alvo ≥ 70%)\n${relatorio(r)}`);
});

test('X10 · o conjunto declara a origem de cada foto e as reais têm o que o leitor deve achar', () => {
  for (const f of manifest.fotos) {
    assert.ok(['sintetica', 'real'].includes(f.origem), `${f.arquivo}: origem precisa ser "sintetica" ou "real"`);
    assert.ok(f.nome && f.set && f.numero, `${f.arquivo}: nome, set e numero são obrigatórios`);
    assert.ok(Array.isArray(f.impressoes) && f.impressoes.some(i => i.set === f.set && i.number === f.numero), `${f.arquivo}: impressoes precisa incluir a esperada`);
    assert.ok(existsSync(join(dir, f.arquivo)), `${f.arquivo}: arquivo ausente na pasta fotos/`);
  }
});
