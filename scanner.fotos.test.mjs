// X10 · acerto do scanner medido em fotos: o caminho inteiro do app, fora do navegador.
// Achar a carta (detectaCarta) → recortar a faixa do nome e a linha de coleção
// (NAME_BAND / COLLECTOR_BAND, faixaDaCarta) → tratar como o app (trataFaixa,
// escalaOcr, OCR_ALTURA_MIN) → OCR de verdade (tesseract.js, mesmos OCR_MODES) → casar com
// a base de nomes (matchName / ACCEPT) e ler a edição (parseCollectorLine).
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
/** Tons de cinza reduzidos, como quadroCinza() faz no app (80 px de largura). */
function cinzaReduzido(img, alvo = 80) {
  const w = alvo, h = Math.max(8, Math.round(alvo * (img.height / img.width)));
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
/** Recorte de uma região (coordenadas do quadro), ampliado até OCR_ALTURA_MIN e realçado como no app. */
function recorte(img, r, escalaCarta = 1, modo = 'name') {
  const x0 = Math.max(0, Math.round(r.x)), y0 = Math.max(0, Math.round(r.y));
  const w0 = Math.min(img.width - x0, Math.round(r.w)), h0 = Math.min(img.height - y0, Math.round(r.h));
  const escala = Math.max(escalaCarta, X.OCR_ALTURA_MIN / Math.max(1, h0));
  const w = Math.round(w0 * escala), h = Math.round(h0 * escala);
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    // bilinear: o app amplia com drawImage, que também interpola
    const fx = x0 + x / escala, fy = y0 + y / escala;
    const xa = Math.min(img.width - 1, Math.floor(fx)), ya = Math.min(img.height - 1, Math.floor(fy));
    const xb = Math.min(img.width - 1, xa + 1), yb = Math.min(img.height - 1, ya + 1);
    const tx = fx - xa, ty = fy - ya;
    for (let c = 0; c < 3; c++) {
      const a = img.data[(ya * img.width + xa) * 4 + c], b = img.data[(ya * img.width + xb) * 4 + c];
      const cc = img.data[(yb * img.width + xa) * 4 + c], d = img.data[(yb * img.width + xb) * 4 + c];
      out[(y * w + x) * 4 + c] = (a * (1 - tx) + b * tx) * (1 - ty) + (cc * (1 - tx) + d * tx) * ty;
    }
    out[(y * w + x) * 4 + 3] = 255;
  }
  const t = X.trataFaixa(out, w, h, modo);
  return deps.png.sync.write(Object.assign(new deps.png({ width: t.w, height: t.h }), { data: Buffer.from(t.data.buffer, t.data.byteOffset, t.data.length) }));
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
async function mede() {
  const index = X.buildIndex(baseDeNomes());
  const worker = await deps.tesseract.createWorker('eng', 1, { langPath: deps.langPath, gzip: true, cacheMethod: 'none' });
  const linhas = [];
  let nomeOk = 0, edOk = 0, detectadas = 0;
  try {
    for (const f of manifest.fotos) {
      const arquivo = join(dir, f.arquivo);
      const linha = { foto: f.arquivo, esperado: f.nome };
      if (!existsSync(arquivo)) { linha.erro = 'arquivo ausente'; linhas.push(linha); continue; }
      const img = decodifica(arquivo);
      const { carta } = X.detectaEmEscalas(X.ESCALAS_DETECTOR.map(alvo => cinzaReduzido(img, alvo)));
      if (!carta) { linha.erro = 'carta não encontrada no quadro'; linhas.push(linha); continue; }
      detectadas++;
      // detectaCarta devolve frações do quadro: vira pixels da foto inteira
      const full = { x: carta.x * img.width, y: carta.y * img.height, w: carta.w * img.width, h: carta.h * img.height };
      await worker.setParameters(X.OCR_MODES.name);
      const nome = (await worker.recognize(recorte(img, X.faixaDaCarta(full, X.NAME_BAND), X.escalaOcr(full.h)))).data.text || '';
      const cand = X.matchName(index, nome);
      linha.lido = nome.trim(); linha.melhor = cand[0] ? `${cand[0].name} (${Math.round(cand[0].score * 100)}%)` : '—';
      linha.nomeOk = !!cand[0] && cand[0].name === f.nome && cand[0].score >= X.ACCEPT;
      if (linha.nomeOk) nomeOk++;
      await worker.setParameters(X.OCR_MODES.collector);
      const col = (await worker.recognize(recorte(img, X.faixaDaCarta(full, X.COLLECTOR_BAND), X.escalaOcr(full.h), 'collector'))).data.text || '';
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
  return { linhas, n: manifest.fotos.length, nomeOk, edOk, detectadas };
}

function relatorio(r) {
  const falhas = r.linhas.filter(l => l.erro || !l.nomeOk || !l.edOk);
  const cab = `X10 · ${r.n} foto(s): carta achada em ${r.detectadas}, nome ${r.nomeOk}/${r.n}, edição ${r.edOk}/${r.n}`;
  const corpo = falhas.map(l => l.erro ? `  ✗ ${l.foto}: ${l.erro}` :
    `  ${l.nomeOk ? '·' : '✗'} ${l.foto}: nome lido "${l.lido}" → ${l.melhor} (esperado ${l.esperado})${l.edOk ? '' : ` · edição lida "${l.colecao}" → ${l.edicao}`}`);
  return [cab, ...corpo].join('\n');
}

test('X10 · o scanner acerta o nome em ≥ 90% e a edição em ≥ 70% das fotos do conjunto', { skip, timeout: 240000 }, async () => {
  assert.ok(manifest.fotos.length >= 10, 'o conjunto precisa de pelo menos 10 fotos para a medida valer alguma coisa');
  const r = await mede();
  console.log(relatorio(r));
  assert.ok(r.nomeOk / r.n >= 0.9, `nome: ${r.nomeOk}/${r.n} (alvo ≥ 90%)\n${relatorio(r)}`);
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
