// X10/X11 · acerto do scanner medido em fotos: o caminho inteiro do app, fora do navegador.
// Quadro em 320 px → achaQuadrilatero (quatro cantos) → recorteDaFaixa (o pedaço do quadro com o nome)
// → preparaNome (retifica, acha a linha do nome, binariza, limpa) → OCR de verdade (tesseract.js, modo
// "linha") → matchName. Sem contorno, vale a moldura guia, como no app. A edição sai da carta retificada
// (preparaColecao → OCR em bloco, modo "colecao" → resolveEdicao, S-604).
// Alvos: nome ≥ 90%, edição ≥ 90% (S-604; era 70%). Falhas saem no relatório, uma por foto.
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
async function leNome(worker, index, img, cantosFr, { podeAfiar = true, deitada = false } = {}) {
  const rec = X.recorteDaFaixa(cantosFr, X.FAIXA_NOME, img.width, img.height);
  if (!rec) return null;
  const pr = X.preparaNome(pedaco(img, rec), rec.w, rec.h, rec.cantos, { deitada });
  if (!pr) return null;
  if (process.env.FOTOS_DEBUG) (await import('node:fs')).writeFileSync(join(process.env.FOTOS_DEBUG, 'nome-' + nomeDebug + '-' + Math.round(cantosFr[0].x * 1000) + '.png'), paraPng(pr));
  await worker.setParameters(X.OCR_MODES.linha);
  let texto = (await worker.recognize(paraPng(pr))).data.text || '', found = X.matchName(index, texto), afiada = false;
  // S-594 · como lerUmaVez: linha borrada que não deu nome é lida de novo, realçada (uma vez por passada)
  if (podeAfiar && !(found[0] && found[0].score >= X.ACCEPT) && pr.nitidez < X.LIMIARES_LINHA.borrada) {
    const p2 = X.preparaNome(pedaco(img, rec), rec.w, rec.h, rec.cantos, { afia: true, deitada });
    if (p2) {
      const t2 = (await worker.recognize(paraPng(p2))).data.text || '', f2 = X.matchName(index, t2);
      if ((f2[0] ? f2[0].score : 0) > (found[0] ? found[0].score : 0)) { texto = t2; found = f2; afiada = true; }
    }
  }
  return { texto, found, nitidez: pr.nitidez, afiada, tentouAfiar: podeAfiar && pr.nitidez < X.LIMIARES_LINHA.borrada };
}
/** A linha de coleção, como identify() no app: preparaColecao (retifica, acha o bloco, binariza) e OCR em bloco. */
let nomeDebug = '';
// S-612 · `deitada`: a batalha, com os cantos já girados (cantosDeitada) — a faixa sai na proporção 88 × 63, como no app
async function leColecao(worker, img, cantosFr, op = {}, { deitada = false } = {}) {
  const rec = X.recorteDaFaixa(cantosFr, X.FAIXA_COLECAO, img.width, img.height);
  if (!rec) return '';
  const pr = X.preparaColecao(pedaco(img, rec), rec.w, rec.h, rec.cantos, X.larguraColecao(X.alturaDaCarta(cantosFr, img.width, img.height), { deitada }), { ...op, deitada });
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
async function mede(fotos = manifest.fotos, { degrada = null } = {}) {
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
      let img = decodifica(arquivo);
      if (degrada) img = degrada(img, f);
      const q = cinzaReduzido(img);
      const quad = X.achaQuadrilatero(q.cinza, q.w, q.h);
      const moldura = molduraDaFoto(f);
      if (quad) detectadas++;
      // como no app: o contorno primeiro; sem leitura, a moldura guia
      nomeDebug = f.arquivo.replace(/\.\w+$/, '');
      // S-612 · como lerUmaVez (S-608): com o contorno e sem nome em pé nem pela moldura, a carta deitada dos dois lados
      const caminhos = [...(quad ? [['carta', quad.cantos]] : []), ...(moldura ? [['moldura', cantosDe(moldura)]] : []), ...(quad ? [['deitada', X.cantosDeitada(quad.cantos, 1), 1], ['deitada', X.cantosDeitada(quad.cantos, -1), -1]] : [])];
      if (!caminhos.length) { linha.erro = 'carta não encontrada no quadro e foto sem moldura'; linhas.push(linha); continue; }
      let melhor = null, afiou = false;
      const t0 = Date.now();
      for (const [nome, cantos, lado] of caminhos) {
        const r = await leNome(worker, index, img, cantos, { podeAfiar: !afiou, deitada: nome === 'deitada' });
        if (r && r.tentouAfiar) afiou = true;
        if (r && (!melhor || nota(r) > nota(melhor))) melhor = { ...r, caminho: nome, cantos, lado: lado || 0 };
        if (nota(r) >= X.ACCEPT) break;
      }
      if (!melhor) { linha.erro = 'sem linha de nome'; linhas.push(linha); continue; }
      const cand = melhor.found;
      linha.caminho = melhor.caminho + (melhor.lado ? (melhor.lado > 0 ? ' →' : ' ←') : ''); linha.cantos = melhor.cantos; linha.nitidez = Math.round(melhor.nitidez * 10) / 10;
      // S-594 · a régua que pulava a leitura saiu (LIMIARES_LINHA.nitidezMin): se voltar, conta aqui como foto pulada
      if (X.LIMIARES_LINHA.nitidezMin != null && melhor.nitidez < X.LIMIARES_LINHA.nitidezMin) linha.pulada = true;
      linha.afiada = !!melhor.afiada;
      linha.lido = melhor.texto.trim(); linha.melhor = cand[0] ? `${cand[0].name} (${Math.round(cand[0].score * 100)}%)` : '—';
      linha.nomeOk = !!cand[0] && cand[0].name === f.nome && cand[0].score >= X.ACCEPT && !linha.pulada;
      if (linha.nomeOk) nomeOk++;
      // S-617 · entraria na primeira leitura no app (pelo contorno, carta parada): o que o porteiro aceita sem repetir
      linha.primeira = melhor.caminho === 'carta' && X.leituraConfiavel(cand, { peloContorno: true });
      nomeDebug = f.arquivo.replace(/\.\w+$/, '');
      // S-604 · como identify() no app: as variantes da leitura (de sempre, "livre", contraste invertido) sobre a mesma
      // cópia do quadro, somadas e casadas com as impressões da carta por evidências (resolveEdicao), até uma se separar
      const textos = [];
      let res = { exact: null, por: [] };
      for (const op of [{}, { livre: true }, { inverte: true }]) {
        textos.push(await leColecao(worker, img, melhor.cantos, op, { deitada: melhor.caminho === 'deitada' && X.cartaDeitada(melhor.cantos, img.width, img.height) }));
        res = X.resolveEdicao(f.impressoes || [], { textos });
        if (res.exact) break;
      }
      const col = textos.join(' | '), p = X.parseCollectorLine(textos[0]);
      linha.colecao = col.trim().replace(/\s+/g, ' '); linha.edicao = `${p.set || '?'} ${p.number || '?'}` + (res.exact ? ` → ${res.exact.set} ${res.exact.number} (${res.por.join(' + ')})` : ' → sem impressão');
      const semZero = v => String(v).toLowerCase().replace(/^0+(?=\d)/, '');
      linha.edOk = !!res.exact && res.exact.set === String(f.set).toLowerCase() && semZero(res.exact.number) === semZero(f.numero);
      if (linha.edOk) edOk++;
      linha.ms = Date.now() - t0;   // nome + edição, com o OCR de teste (não é o tempo do aparelho)
      linhas.push(linha);
    }
  } finally { await worker.terminate(); }
  const erradas = linhas.filter(l => !l.erro && !l.pulada && !l.nomeOk && /\((\d+)%\)$/.test(l.melhor || '') && +/\((\d+)%\)$/.exec(l.melhor)[1] >= X.ACCEPT * 100 && !l.melhor.startsWith(l.esperado + ' ('));
  return { linhas, n: fotos.length, nomeOk, edOk, detectadas, puladas: linhas.filter(l => l.pulada).length, erradas: erradas.length, afiadas: linhas.filter(l => l.afiada).length, primeira: linhas.filter(l => l.primeira).length, primeiraErrada: linhas.filter(l => l.primeira && !l.nomeOk).length };
}

function relatorio(r) {
  const falhas = r.linhas.filter(l => l.erro || !l.nomeOk || !l.edOk);
  const cab = `X10 · ${r.n} foto(s): contorno achado em ${r.detectadas}, nome ${r.nomeOk}/${r.n}, edição ${r.edOk}/${r.n}, na 1ª leitura ${r.primeira}/${r.n}`;
  const corpo = falhas.map(l => l.erro ? `  ✗ ${l.foto}: ${l.erro}` :
    `  ${l.nomeOk ? '·' : '✗'} ${l.foto} [${l.caminho}, nitidez ${l.nitidez}]: nome lido "${l.lido}" → ${l.melhor} (esperado ${l.esperado})${l.edOk ? '' : ` · edição lida "${l.colecao}" → ${l.edicao}`}`);
  return [cab, ...corpo].join('\n');
}

// a medida do conjunto inteiro, sem degradar, é a mesma para o X10 e a S-617: roda uma vez
let medidaPadrao = null;
const medePadrao = () => medidaPadrao || (medidaPadrao = mede());
test('X10 · o scanner acerta o nome em ≥ 90% e a edição em ≥ 90% das fotos do conjunto', { skip, timeout: 240000 }, async () => {
  assert.ok(manifest.fotos.length >= 10, 'o conjunto precisa de pelo menos 10 fotos para a medida valer alguma coisa');
  const r = await medePadrao();
  console.log(relatorio(r));
  assert.ok(r.nomeOk / r.n >= 0.9, `nome: ${r.nomeOk}/${r.n} (alvo ≥ 90%)\n${relatorio(r)}`);
  // Leva 112 · a régua de nitidez não descarta foto que o OCR lê certo
  assert.equal(r.puladas, 0, 'nenhuma foto legível descartada por nitidez: ' + JSON.stringify(r.linhas.map(l => [l.foto, l.nitidez])));
  // S-604 · alvo 70% → 90%: antes da edição por evidências o conjunto (com as duas sem borda) dava 24/29 (83%); com ela, 27/29
  assert.ok(r.edOk / r.n >= 0.9, `edição: ${r.edOk}/${r.n} (alvo ≥ 90%)\n${relatorio(r)}`);
});

/* S-617 · relato #65 (velocidade do nome): o OCR arrasta lixo de uma ou duas letras na frente da linha (a curva da barra do
   título vira "l", "i", "f", "'") e essa leitura, idêntica ao nome depois de limpa, esperava a segunda passada. Medido em
   07/11/2026 neste conjunto: 14 de 32 entravam na primeira leitura; com a marca `frente`, 20 — nenhuma com o nome errado. */
test('S-617 · mais fotos entram na primeira leitura (lixo na frente não segura a carta), nenhuma com o nome errado', { skip, timeout: 240000 }, async () => {
  const r = await medePadrao();
  const lista = r.linhas.filter(l => l.primeira).map(l => l.foto).join(', ');
  console.log(`# medida · scanner · S-617 na_primeira=${r.primeira}/${r.n}`);
  assert.equal(r.primeiraErrada, 0, 'nenhuma foto entra na primeira leitura com o nome errado: ' + JSON.stringify(r.linhas.filter(l => l.primeira && !l.nomeOk).map(l => [l.foto, l.melhor])));
  assert.ok(r.primeira >= 20, `na primeira leitura: ${r.primeira}/${r.n} (eram 14 antes da S-617; alvo ≥ 20): ${lista}`);
  for (const foto of ['counterspell-torta.jpg', 'delver-borrada.jpg', 'arcane-signet-canto.jpg', 'sol-talisman-foco.jpg'])
    assert.ok(r.linhas.find(l => l.foto === foto)?.primeira, foto + ' (lixo de uma letra na frente) entra na primeira leitura');
});

test('S-604 · carta sem borda (texto claro sobre a arte, como o Malcolm SPG #2 do dono): a edição sai da linha de coleção', { skip, timeout: 240000 }, async () => {
  const semBorda = manifest.fotos.filter(f => f.estilo === 'semBorda');
  assert.ok(semBorda.length >= 2, 'o conjunto precisa das cartas sem borda');
  const r = await mede(semBorda);
  console.log('S-604 · sem borda · ' + relatorio(r));
  // antes: a leitura só procurava a linha sobre a borda preta e as duas saíam sem edição (0/2)
  assert.equal(r.edOk, semBorda.length, relatorio(r));
});

/* S-612 · relato #61 · a batalha deitada (Invasion of Segovia, MOM #63; dados da Scryfall de 05/11/2026), girada 90° para os dois
   lados e segurada deitada: o nome sai ao longo do lado comprido (S-608); a linha de coleção, no lado comprido de baixo da carta
   deitada, é lida na proporção 88 × 63; a arte é comparada na proporção deitada com a imagem da batalha como a Scryfall guarda
   (em pé, girada), pelo mesmo caminho da base de artes (cantosDaImagemDaArte). */
test('S-612 · batalha deitada (girada para os dois lados e segurada deitada): nome, edição e arte saem como numa carta comum', { skip, timeout: 240000 }, async () => {
  const batalhas = manifest.fotos.filter(f => f.estilo === 'batalha');
  assert.ok(batalhas.length >= 3 && new Set(batalhas.map(f => f.giro)).size >= 3, 'o conjunto precisa da batalha girada para os dois lados e deitada');
  const r = await mede(batalhas);
  console.log('S-612 · batalha · ' + relatorio(r) + '\n' + r.linhas.map(l => `  ${l.foto}: ${l.caminho} · ${l.ms} ms`).join('\n'));
  assert.equal(r.nomeOk, batalhas.length, relatorio(r));
  // antes: a linha de coleção saía na proporção da carta em pé e a edição não fechava (S-608, simplificação declarada)
  assert.equal(r.edOk, batalhas.length, relatorio(r));
  // a arte: a base guarda a batalha pela imagem da Scryfall, girada para ficar deitada; a câmera, pelos cantos deitados lidos
  const scan = decodifica(join(dir, batalhas[0].scan));
  const naBase = X.impressaoDaArte(scan.data, scan.width, scan.height, X.cantosDaImagemDaArte(scan.width, scan.height, { batalha: true }));
  let conferem = 0;
  for (const l of r.linhas) {
    const f = batalhas.find(b => b.arquivo === l.foto), img = decodifica(join(dir, f.arquivo)), px = c => c.map(p => ({ x: p.x * img.width, y: p.y * img.height }));
    const deitada = X.distanciaDaArte(X.impressaoDaArte(img.data, img.width, img.height, px(l.cantos)), naBase, 0);
    const emPe = X.distanciaDaArte(X.impressaoDaArte(img.data, img.width, img.height, px(X.cantosDeitada(l.cantos, 1))), naBase, 0);
    console.log(`  ${l.foto}: arte deitada ${deitada} bits · na proporção em pé ${emPe} bits (igual ≤ ${X.LIMIAR_ARTE.igual})`);
    if (deitada <= X.LIMIAR_ARTE.igual) conferem++;
    // longe da arte de qualquer outra carta (cartas diferentes: p5 84) e mais perto que a leitura em pé, que é a de antes
    assert.ok(deitada < X.LIMIAR_ARTE.diferente && deitada < emPe, `${l.foto}: a arte deitada (${deitada}) fica mais perto que a lida em pé (${emPe}) e abaixo de ${X.LIMIAR_ARTE.diferente}`);
  }
  // medido em 05/11/2026: 16 (deitada, papel) e 22 (playmat) conferem; na mesa de madeira o contorno para na moldura de dentro
  // e a faixa da arte desloca (54 bits): a edição ainda sai pela linha de coleção — declarado parcial no ROADMAP
  assert.ok(conferem >= batalhas.length - 1, `arte deitada confere em ${conferem}/${batalhas.length}`);
});

test('X10 · o conjunto declara a origem de cada foto e as reais têm o que o leitor deve achar', () => {
  for (const f of manifest.fotos) {
    assert.ok(['sintetica', 'real'].includes(f.origem), `${f.arquivo}: origem precisa ser "sintetica" ou "real"`);
    assert.ok(f.nome && f.set && f.numero, `${f.arquivo}: nome, set e numero são obrigatórios`);
    assert.ok(Array.isArray(f.impressoes) && f.impressoes.some(i => i.set === f.set && i.number === f.numero), `${f.arquivo}: impressoes precisa incluir a esperada`);
    assert.ok(existsSync(join(dir, f.arquivo)), `${f.arquivo}: arquivo ausente na pasta fotos/`);
  }
});

/* ---------------- S-594 · foto um pouco borrada e carta com protetor ---------------- */
/** Desfoque gaussiano (separável) com sigma em px de uma carta de 600 px de altura: a mesma conta da medida da leva. */
function borra(img, f, sigmaCarta) {
  const alt = (f.alturaCarta || 0.6) * Math.max(img.width, img.height), s = sigmaCarta * alt / 600;
  const r = Math.ceil(s * 3), k = []; let soma = 0; for (let i = -r; i <= r; i++) { const v = Math.exp(-i * i / (2 * s * s)); k.push(v); soma += v; } for (let i = 0; i < k.length; i++) k[i] /= soma;
  const { width: w, height: h } = img, a = img.data, t = new Float32Array(w * h * 3), o = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 3; c++) { let v = 0; for (let i = -r; i <= r; i++) v += a[(y * w + Math.min(w - 1, Math.max(0, x + i))) * 4 + c] * k[i + r]; t[(y * w + x) * 3 + c] = v; }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { for (let c = 0; c < 3; c++) { let v = 0; for (let i = -r; i <= r; i++) v += t[(Math.min(h - 1, Math.max(0, y + i)) * w + x) * 3 + c] * k[i + r]; o[(y * w + x) * 4 + c] = v; } o[(y * w + x) * 4 + 3] = 255; }
  return { data: o, width: w, height: h };
}
/** Protetor: véu claro sobre o quadro todo e um reflexo em faixa no alto da foto (onde fica o nome). */
function protetor(img) {
  const { width: w, height: h } = img, o = new Uint8ClampedArray(img.data);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4, faixa = Math.exp(-(((y / h + x / w * 0.3) - 0.32) ** 2) / (2 * 0.04 ** 2)); for (let c = 0; c < 3; c++) { let v = o[i + c]; v += (235 - v) * 0.16; v += (255 - v) * 0.45 * faixa; o[i + c] = v; } }
  return { data: o, width: w, height: h };
}
// S-604 · as cartas sem borda ficam fora da amostra: com elas no fim do conjunto, "uma em cada três" passou a pegar o Malcolm
// sem borda e mudou a amostra (9 → 10 fotos) sem ninguém pedir; a amostra continua sendo as mesmas 9 da S-594
// S-612 · as batalhas também ficam fora, pelo mesmo motivo
const AMOSTRA = manifest.fotos.filter(f => f.estilo !== 'semBorda' && f.estilo !== 'batalha').filter((f, i) => i % 3 === 0);   // 9 fotos, das duas famílias do conjunto

test('S-594 · foto um pouco borrada (desfoque de 1,5 px numa carta de 600 px) é lida: nenhuma pulada, nenhum nome errado', { skip, timeout: 240000 }, async () => {
  const r = await mede(AMOSTRA, { degrada: (img, f) => borra(img, f, 1.5) });
  console.log('S-594 · borrada · ' + relatorio(r));
  assert.equal(r.puladas, 0, 'a régua de nitidez não pode pular foto borrada que o leitor lê');
  assert.ok(r.nomeOk >= AMOSTRA.length - 1, `nome ${r.nomeOk}/${AMOSTRA.length} (antes da S-594: a régua pulava 2 de cada 3)\n${relatorio(r)}`);
  assert.equal(r.erradas, 0, 'nenhum nome errado com nota de aceite');
});

test('S-594 · protetor com reflexo e desfoque de 2 px: a segunda leitura realçada devolve o nome, sem nome errado', { skip, timeout: 240000 }, async () => {
  const r = await mede(AMOSTRA, { degrada: (img, f) => borra(protetor(img), f, 2) });
  console.log('S-594 · protetor + borrada · ' + relatorio(r));
  assert.equal(r.puladas, 0);
  assert.ok(r.nomeOk >= AMOSTRA.length - 2, `nome ${r.nomeOk}/${AMOSTRA.length}\n${relatorio(r)}`);
  assert.equal(r.erradas, 0, 'nenhum nome errado com nota de aceite');
});

/* S-616 · relato #65 ("demora para reconhecer a versão") · a mesma carta em três quadros seguidos, com tremor diferente em cada
   um (desfoque de 1,5, 1,0 e 0,4 px numa carta de 600 px, em ordem que gira de foto para foto): a edição lê o mais nítido.
   Antes a linha de coleção era lida do quadro do aceite — com 1,5 px, edição 0/9 nesta amostra. */
test('S-616 · a edição lê o mais nítido de três quadros seguidos da mesma carta', { skip, timeout: 240000 }, async () => {
  assert.equal(typeof X.maisNitida, 'function', 'S-616 · falta a escolha do quadro mais nítido');
  assert.equal(X.maisNitida([]), -1); assert.equal(X.maisNitida([{ nitidez: 0.2 }, null, { nitidez: 0.9 }, { nitidez: 0.9 }]), 2);
  const worker = await deps.tesseract.createWorker('eng', 1, { langPath: deps.langPath, gzip: true, cacheMethod: 'none' });
  const sigmas = [1.5, 1.0, 0.4];
  let escolheu = 0, edOk = 0, edPrimeiro = 0, n = 0;
  const linhas = [];
  try {
    for (const [j, f] of AMOSTRA.entries()) {
      const arquivo = join(dir, f.arquivo); if (!existsSync(arquivo)) continue;
      const img = decodifica(arquivo), q = cinzaReduzido(img), quad = X.achaQuadrilatero(q.cinza, q.w, q.h);
      if (!quad) continue;
      n++;
      const ordem = sigmas.map((_, i) => sigmas[(i + j) % 3]);
      const rec = X.recorteDaFaixa(quad.cantos, X.FAIXA_COLECAO, img.width, img.height);
      const larg = X.larguraColecao(X.alturaDaCarta(quad.cantos, img.width, img.height));
      const quadros = ordem.map(sg => { const im = borra(img, f, sg); return { sg, im, pr: X.preparaColecao(pedaco(im, rec), rec.w, rec.h, rec.cantos, larg) }; });
      const k = X.maisNitida(quadros.map(x => x.pr));
      if (k >= 0 && quadros[k].sg === 0.4) escolheu++;
      const edicaoDe = async im => {
        const textos = []; let res = { exact: null };
        for (const op of [{}, { livre: true }, { inverte: true }]) { textos.push(await leColecao(worker, im, quad.cantos, op)); res = X.resolveEdicao(f.impressoes || [], { textos }); if (res.exact) break; }
        const semZero = v => String(v).toLowerCase().replace(/^0+(?=\d)/, '');
        return !!res.exact && res.exact.set === String(f.set).toLowerCase() && semZero(res.exact.number) === semZero(f.numero);
      };
      const ok = await edicaoDe(quadros[Math.max(0, k)].im);
      if (ok) edOk++;
      if (await edicaoDe(quadros[0].im)) edPrimeiro++;
      linhas.push(`  ${ok ? '·' : '✗'} ${f.arquivo}: nitidez ${quadros.map(x => `${x.sg}px=${x.pr ? x.pr.nitidez.toFixed(2) : '—'}`).join(' ')} → quadro ${k + 1}`);
    }
  } finally { await worker.terminate(); }
  console.log(`S-616 · ${n} carta(s) em três quadros: o mais nítido escolhido em ${escolheu}, edição ${edOk}/${n} (lendo o primeiro quadro, como antes: ${edPrimeiro}/${n})\n${linhas.join('\n')}`);
  assert.ok(n >= 8, 'a amostra precisa das cartas com contorno');
  assert.equal(escolheu, n, 'para a mesma carta no mesmo lugar, a nitidez da linha cai com o desfoque');
  assert.ok(edOk >= n - 2, `edição no quadro escolhido: ${edOk}/${n}`);
  assert.ok(edOk > edPrimeiro, 'escolher o quadro tem de acertar mais que ler o primeiro');
});
