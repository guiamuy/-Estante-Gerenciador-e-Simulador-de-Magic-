// X12 · S-595 · impressão digital da arte e o gerador da base (artes.mjs), sem rede: Scryfall falsa com cartas desenhadas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { gzipSync } from 'node:zlib';
import { loadModules } from './_load.mjs';
import { gera, cartasDaBase, autotesteDaBase } from './artes.mjs';

const X = loadModules().scanner;
const require = createRequire(import.meta.url);
const jpeg = require('jpeg-js');

/** Carta de 146 × 204 (o tamanho "small" da Scryfall): borda preta, barra do título e caixa de texto iguais em todas;
    a arte é um desenho aleatório de 6 a 10 formas coloridas (semente = a carta). */
function carta(semente, w = 146, h = 204) {
  let s = semente * 7919 + 13; const r = () => (s = (s * 1103515245 + 12345) >>> 0) / 4294967296;
  const d = new Uint8ClampedArray(w * h * 4);
  const pinta = (x0, y0, x1, y1, cor) => { for (let y = Math.max(0, y0 | 0); y < Math.min(h, y1); y++) for (let x = Math.max(0, x0 | 0); x < Math.min(w, x1); x++) { const i = (y * w + x) * 4; d[i] = cor[0]; d[i + 1] = cor[1]; d[i + 2] = cor[2]; d[i + 3] = 255; } };
  pinta(0, 0, w, h, [12, 12, 12]); pinta(6, 7, w - 6, 20, [225, 215, 190]); pinta(9, 116, w - 9, 126, [225, 215, 190]); pinta(9, 128, w - 9, 186, [235, 228, 210]);
  const ax0 = 11, ay0 = 22, ax1 = w - 11, ay1 = 114;
  pinta(ax0, ay0, ax1, ay1, [r() * 255, r() * 255, r() * 255]);
  const n = 6 + Math.floor(r() * 5);
  for (let k = 0; k < n; k++) {
    const cx = ax0 + r() * (ax1 - ax0), cy = ay0 + r() * (ay1 - ay0), rx = 6 + r() * 30, ry = 6 + r() * 25, cor = [r() * 255, r() * 255, r() * 255];
    for (let y = Math.max(ay0, cy - ry | 0); y < Math.min(ay1, cy + ry); y++) for (let x = Math.max(ax0, cx - rx | 0); x < Math.min(ax1, cx + rx); x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) { const i = (y * w + x) * 4; d[i] = cor[0]; d[i + 1] = cor[1]; d[i + 2] = cor[2]; }
  }
  return { data: d, width: w, height: h };
}
const reta = img => [{ x: 0, y: 0 }, { x: img.width, y: 0 }, { x: img.width, y: img.height }, { x: 0, y: img.height }];
const imp = (img, cantos = reta(img)) => X.impressaoDaArte(img.data, img.width, img.height, cantos);
/** A carta como a câmera a vê: dentro de uma foto maior, em perspectiva, com fundo de mesa. */
function naFoto(img, { escala = 4, inclina = 0.05 } = {}) {
  const W = img.width * escala + 200, H = img.height * escala + 200, d = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < W * H; i++) { d[i * 4] = 90; d[i * 4 + 1] = 70; d[i * 4 + 2] = 50; d[i * 4 + 3] = 255; }
  const cantos = [{ x: 100 + inclina * img.width * escala, y: 100 }, { x: 100 + img.width * escala, y: 100 + inclina * img.height * escala }, { x: 100 + img.width * escala - inclina * img.width * escala, y: 100 + img.height * escala }, { x: 100, y: 100 + img.height * escala - inclina * img.height * escala }];
  // a carta é "pintada" na foto ponto a ponto, mais denso que os pixels da foto (sem buracos)
  const H1 = X.homografia(cantos), nu = img.width * escala * 1.5, nv = img.height * escala * 1.5;
  for (let a = 0; a < nv; a++) for (let b = 0; b < nu; b++) {
    const u = (b + 0.5) / nu, v = (a + 0.5) / nv, p = H1(u, v), x = p.x | 0, y = p.y | 0;
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    const i = ((Math.min(img.height - 1, v * img.height | 0)) * img.width + Math.min(img.width - 1, u * img.width | 0)) * 4, o = (y * W + x) * 4;
    d[o] = img.data[i]; d[o + 1] = img.data[i + 1]; d[o + 2] = img.data[i + 2];
  }
  return { img: { data: d, width: W, height: H }, cantos };
}

test('S-595 · impressão da arte: 192 bits (189 usados), determinística, e só a arte conta (título e texto iguais não aproximam cartas diferentes)', () => {
  const a = carta(1), b = carta(2);
  const ha = imp(a), hb = imp(b);
  assert.equal(ha.length, 6); assert.equal(X.BITS_ARTE, 192);
  assert.equal(X.distanciaDaArte(ha, imp(carta(1))), 0, 'a mesma carta dá a mesma impressão');
  assert.ok(X.distanciaDaArte(ha, hb) > 70, 'cartas com arte diferente ficam longe: ' + X.distanciaDaArte(ha, hb));
});

test('S-595 · a impressão aguenta o que a câmera faz: carta grande em perspectiva numa foto, contorno 3% torto, protetor (contorno 4% maior)', () => {
  let pior = 0;
  for (const k of [3, 4, 5]) {
    const c = carta(k), h = imp(c);
    const f = naFoto(c);
    pior = Math.max(pior, X.distanciaDaArte(h, X.impressaoDaArte(f.img.data, f.img.width, f.img.height, f.cantos)));
    const torto = [{ x: 3, y: -4 }, { x: c.width + 2, y: 3 }, { x: c.width - 4, y: c.height + 5 }, { x: -2, y: c.height - 3 }];
    pior = Math.max(pior, X.distanciaDaArte(h, imp(c, torto)));
    const dx = c.width * 0.02, dy = c.height * 0.02;
    pior = Math.max(pior, X.distanciaDaArte(h, imp(c, [{ x: -dx, y: -dy }, { x: c.width + dx, y: -dy }, { x: c.width + dx, y: c.height + dy }, { x: -dx, y: c.height + dy }])));
  }
  assert.ok(pior <= 45, 'a mesma carta fica perto em todas as variações (pior: ' + pior + ' de 189 bits)');
});

test('S-595 · busca: entre 2.000 artes, a carta degradada (borrada, protetor, contorno torto) é a primeira em quase todas, e rápido', () => {
  const N = 2000, imagens = [], lista = [];
  for (let i = 0; i < N; i++) { const c = carta(100 + i); if (i < 40) imagens.push(c); lista.push(imp(c)); }
  const bin = X.binDasArtes(lista);
  const base = X.abreBaseDeArtes({ versao: 1, bits: 192, cartas: lista.map((_, i) => ['c' + i, 'tst', String(i), 'il' + i, '1']) }, bin);
  assert.equal(base.total, N); assert.equal(base.carta(7).nome, 'c7');
  const r = autotesteDaBase(X, base, imagens.map((img, j) => ({ img, j })));
  for (const [nome, m] of Object.entries(r.variacoes)) assert.ok(m.certas >= m.casos - 1, `${nome}: ${m.certas}/${m.casos} ${JSON.stringify(m)}`);
  // custo da busca: varredura linear de 50 mil artes cabe no orçamento de uma passada (projeção a partir de 2.000)
  const t0 = performance.now(); for (let k = 0; k < 20; k++) X.buscaArte(base.hashes, lista[k]);
  const porBusca50k = (performance.now() - t0) / 20 * 25;
  assert.ok(porBusca50k < 60, 'busca em 50 mil artes ≈ ' + porBusca50k.toFixed(1) + ' ms');
});

test('S-595 · formato da base: o que o gerador grava o app abre; base de outra versão ou cortada é recusada', () => {
  const lista = [imp(carta(1)), imp(carta(2))], bin = X.binDasArtes(lista);
  assert.equal(bin.byteLength, 2 * 24);
  const b = X.abreBaseDeArtes({ versao: 1, bits: 192, cartas: [['A', 'a', '1', 'x', ''], ['B', 'b', '2', 'y', '']] }, bin);
  assert.equal(X.distanciaDaArte(lista[1], b.hashes, 1), 0);
  assert.throws(() => X.abreBaseDeArtes({ versao: 2, bits: 192, cartas: [] }, new Uint8Array(0)), /invalida/);
  assert.throws(() => X.abreBaseDeArtes({ versao: 1, bits: 192, cartas: [['A']] }, bin.slice(0, 16)), /incompleta/);
});

test('S-595 · quais cartas entram: papel, com imagem pequena da frente na Scryfall; digital, série de arte e endereço estranho ficam de fora', () => {
  const c = cartasDaBase([
    { name: 'Counterspell', set: 'mh2', collector_number: '267', illustration_id: 'il-1', layout: 'normal', image_uris: { small: 'https://cards.scryfall.io/small/front/a/b/x.jpg?1625' } },
    { name: 'Delver of Secrets // Insectile Aberration', set: 'isd', collector_number: '51', layout: 'transform', card_faces: [{ illustration_id: 'il-2', image_uris: { small: 'https://cards.scryfall.io/small/front/c/d/y.jpg?7' } }, {}] },
    { name: 'Digital', digital: true, layout: 'normal', image_uris: { small: 'https://cards.scryfall.io/s.jpg' } },
    { name: 'Arte', layout: 'art_series', image_uris: { small: 'https://cards.scryfall.io/s.jpg' } },
    { name: 'Fora', layout: 'normal', image_uris: { small: 'https://exemplo.com/s.jpg' } },
    { name: 'Sem imagem', layout: 'normal' }
  ]);
  assert.equal(c.map(x => x.nome).join(' | '), 'Counterspell | Delver of Secrets // Insectile Aberration');
  assert.equal(c[0].versao, '1625'); assert.equal(c[1].ilustracao, 'il-2');
});

test('S-610 · relato #61: o verso da carta de duas faces entra na base com a própria imagem, respondendo pela carta (ilustração da frente, como nas impressões do app); face sem imagem própria (aventura, dividida) não entra duas vezes', () => {
  const c = cartasDaBase([
    { name: 'Invasion of Segovia // Caetus, Sea Tyrant of Segovia', set: 'mom', collector_number: '74', layout: 'battle', card_faces: [
      { name: 'Invasion of Segovia', illustration_id: 'il-f', image_uris: { small: 'https://cards.scryfall.io/small/front/a/a/z.jpg?1682' } },
      { name: 'Caetus, Sea Tyrant of Segovia', illustration_id: 'il-v', image_uris: { small: 'https://cards.scryfall.io/small/back/a/a/z.jpg?1682' } }] },
    { name: 'Bonecrusher Giant // Stomp', set: 'eld', collector_number: '115', layout: 'adventure', illustration_id: 'il-a', image_uris: { small: 'https://cards.scryfall.io/small/front/b/b/w.jpg?9' }, card_faces: [{ name: 'Bonecrusher Giant' }, { name: 'Stomp' }] },
    { name: 'Verso de fora', set: 'x', collector_number: '1', layout: 'transform', card_faces: [{ illustration_id: 'il-1', image_uris: { small: 'https://cards.scryfall.io/small/front/c/c/q.jpg?3' } }, { illustration_id: 'il-2', image_uris: { small: 'https://exemplo.com/back.jpg?3' } }] }
  ]);
  assert.deepEqual(c.map(x => [x.nome, x.set, x.numero, x.ilustracao, x.img.includes('/back/')]), [
    ['Invasion of Segovia // Caetus, Sea Tyrant of Segovia', 'mom', '74', 'il-f', false],
    ['Invasion of Segovia // Caetus, Sea Tyrant of Segovia', 'mom', '74', 'il-f', true],
    ['Bonecrusher Giant // Stomp', 'eld', '115', 'il-a', false],
    ['Verso de fora', 'x', '1', 'il-1', false]
  ]);
  // a chave da base anterior (ilustração|versão) não confunde frente e verso: o verso não herda a impressão da frente
  assert.equal(new Set(c.slice(0, 2).map(x => x.ilustracao + '|' + x.versao)).size, 2);
});

/** A carta girada 90° no sentido contrário ao do relógio: é como a Scryfall guarda a batalha (pede "girar 90° no sentido do relógio"). */
function giraAntiHorario(img) {
  const { width: w, height: h } = img, d = new Uint8ClampedArray(w * h * 4);
  // (x, y) da carta deitada vai para (y, w − 1 − x) da imagem em pé, de largura h e altura w
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4, o = ((w - 1 - x) * h + y) * 4; d.set(img.data.subarray(i, i + 4), o); }
  return { data: d, width: h, height: w };
}
test('S-612 · relato #61: a frente da batalha entra na base na proporção deitada (versão "d"), a mesma que a câmera lê; o verso e as outras cartas, como antes', () => {
  const c = cartasDaBase([
    { name: 'Invasion of Segovia // Caetus, Sea Tyrant of Segovia', set: 'mom', collector_number: '63', layout: 'transform', card_faces: [
      { name: 'Invasion of Segovia', type_line: 'Battle — Siege', illustration_id: 'il-f', image_uris: { small: 'https://cards.scryfall.io/small/front/9/d/z.jpg?1783917037' } },
      { name: 'Caetus, Sea Tyrant of Segovia', type_line: 'Legendary Creature — Serpent', illustration_id: 'il-v', image_uris: { small: 'https://cards.scryfall.io/small/back/9/d/z.jpg?1783917037' } }] },
    { name: 'Counterspell', set: 'mh2', collector_number: '267', layout: 'normal', type_line: 'Instant', illustration_id: 'il-c', image_uris: { small: 'https://cards.scryfall.io/small/front/c/c/c.jpg?5' } }
  ]);
  assert.deepEqual(c.map(x => [x.versao, !!x.deitada, x.img.includes('/back/')]), [['1783917037d', true, false], ['1783917037v', false, true], ['5', false, false]]);
  // a impressão da imagem guardada em pé (girada) com os cantos da base é a da carta deitada lida reta: a câmera, com os cantos
  // deitados, cai na mesma faixa da arte
  const deitada = carta(61, 204, 146), guardada = giraAntiHorario(deitada);
  const naBase = imp(guardada, X.cantosDaImagemDaArte(guardada.width, guardada.height, { batalha: true }));
  // medido: 6 bits (a amostragem da retificação em pé × deitada); a mesma carta degradada fica em 16 a 34
  assert.ok(X.distanciaDaArte(imp(deitada), naBase, 0) <= 10, `deitada × base: ${X.distanciaDaArte(imp(deitada), naBase, 0)}`);
  // antes (cantos em pé da imagem guardada): outra faixa da carta, longe
  assert.ok(X.distanciaDaArte(imp(deitada), imp(guardada), 0) > X.LIMIAR_ARTE.igual);
  assert.equal(JSON.stringify(X.cantosDaImagemDaArte(10, 20)), JSON.stringify(reta({ width: 10, height: 20 })), 'carta em pé: os cantos da imagem, como sempre');
});

/** Um corpo de resposta em pedaços de `n` bytes. */
const pedacos = (buf, n) => (async function* () { for (let i = 0; i < buf.length; i += n) yield new Uint8Array(buf.subarray(i, i + n)); })();

/** Scryfall falsa: os dados em massa com `n` cartas e as imagens JPEG desenhadas; conta as imagens pedidas. */
function scryfallFalsa(n, { falha = new Set(), versao = () => '1' } = {}) {
  const pedidas = [];
  const cartas = Array.from({ length: n }, (_, i) => ({ name: 'Carta ' + String(i).padStart(3, '0'), set: 'tst', collector_number: String(i + 1), illustration_id: 'il-' + i, layout: 'normal', image_uris: { small: `https://cards.scryfall.io/small/${i}.jpg?${versao(i)}` } }));
  const resp = (corpo, tipo) => ({ ok: true, status: 200, json: async () => corpo, arrayBuffer: async () => corpo });
  const fetchFn = async (url, opts) => {
    assert.match(opts.headers['User-Agent'], /^Estante\//, 'identifica o app para a Scryfall');
    // S-600 · o formato que a Scryfall anuncia desde 01/11/2026: só jsonl_download_uri, uma carta por linha, em gzip
    if (url === 'https://api.scryfall.com/bulk-data/unique-artwork') return resp({ jsonl_download_uri: 'https://data.scryfall.io/unique-artwork/x.jsonl.gz', updated_at: '2026-11-01T09:00:00Z' });
    if (url === 'https://data.scryfall.io/unique-artwork/x.jsonl.gz') return { ok: true, status: 200, body: pedacos(gzipSync(cartas.map(c => JSON.stringify(c)).join('\n')), 4096) };
    const m = /\/small\/(\d+)\.jpg/.exec(url); if (!m) throw new Error('url inesperada ' + url);
    const i = +m[1]; pedidas.push(i);
    if (falha.has(i)) return { ok: false, status: 404 };
    const img = carta(500 + i);
    return resp(jpeg.encode({ data: Buffer.from(img.data), width: img.width, height: img.height }, 92).data.buffer.slice(0));
  };
  return { fetchFn, pedidas };
}

test('S-595 · gerador: grava índice e impressões, imagem que falha fica de fora (contada), segunda vez só baixa a ilustração nova ou mudada', async () => {
  const pasta = await mkdtemp(join(tmpdir(), 'artes-'));
  const um = scryfallFalsa(12, { falha: new Set([4]) });
  const r1 = await gera({ saida: pasta, fetchFn: um.fetchFn, X, log: () => {}, paralelo: 3 });
  assert.equal(r1.total, 11); assert.equal(r1.falhas, 1); assert.equal(r1.novas, 11);
  const indice = JSON.parse(await readFile(join(pasta, 'artes.json'), 'utf8')), bin = await readFile(join(pasta, 'artes.bin'));
  const base = X.abreBaseDeArtes(indice, bin);
  assert.equal(base.total, 11); assert.equal(indice.dadosDe, '2026-11-01T09:00:00Z'); assert.equal(indice.bits, 192);
  assert.ok(!indice.cartas.some(c => c[0] === 'Carta 004'), 'a que falhou não entra');
  // a impressão gravada é a da imagem (JPEG) da carta: reconhece a carta desenhada
  const c7 = indice.cartas.findIndex(c => c[0] === 'Carta 007');
  assert.equal(X.buscaArte(base.hashes, imp(carta(507)))[0].i, c7);
  // segunda execução: nada mudou → nenhuma imagem baixada; a ilustração 2 ganhou versão nova → só ela
  const dois = scryfallFalsa(12, { versao: i => (i === 2 ? '2' : '1') });
  const r2 = await gera({ saida: pasta, fetchFn: dois.fetchFn, X, log: () => {}, paralelo: 3 });
  assert.deepEqual(dois.pedidas.sort((a, b) => a - b), [2, 4], 'só a mudada e a que faltava');
  assert.equal(r2.total, 12); assert.equal(r2.reaproveitadas, 10);
  // terceira: nada mudou → nada baixado e nada regravado (o ramo não cresce à toa)
  const tres = scryfallFalsa(12, { versao: i => (i === 2 ? '2' : '1') });
  const r3 = await gera({ saida: pasta, fetchFn: tres.fetchFn, X, log: () => {} });
  assert.equal(tres.pedidas.length, 0); assert.equal(r3.igual, true); assert.equal(r2.igual, false);
});

test('S-595 · gerador com autoteste: grava medida.json só com números (acerto por variação e distâncias), sem imagem', async () => {
  const pasta = await mkdtemp(join(tmpdir(), 'artes-'));
  const f = scryfallFalsa(60);
  const r = await gera({ saida: pasta, fetchFn: f.fetchFn, X, log: () => {}, autoteste: 10 });
  const m = JSON.parse(await readFile(join(pasta, 'medida.json'), 'utf8'));
  assert.equal(m.total, 60);
  assert.deepEqual(Object.keys(m.variacoes), ['reta', 'torta', 'borrada', 'protetor', 'tudo']);
  assert.equal(m.variacoes.reta.certas, 10);
  assert.ok(m.variacoes.tudo.certas >= 9, JSON.stringify(m.variacoes.tudo));
  assert.ok(!/data:image|base64/.test(JSON.stringify(m)));
  assert.equal(r.medida.variacoes.reta.casos, 10);
});

/* ---------------- S-596 · a base no aparelho e a decisão nome + arte ---------------- */
test('S-596 · decisão: arte confirma o nome (aproximado sobe a exato, edição vem da arte); arte de outra carta deixa "confira"; sem nome, só arte inequívoca responde; nome exato nunca é trocado', () => {
  const L = X.LIMIAR_ARTE, A = 0.85, E = 0.97;
  const sol = { i: 3, d: 12, nome: 'Sol Ring', set: 'cmr', numero: '472' }, outra = { i: 9, d: 10, nome: 'Arcane Signet', set: 'cmr', numero: '297' };
  let r = X.decideArte({ found: [{ name: 'Sol Ring', score: 0.88 }], doNome: sol, top: [], aceite: A, exata: E });
  assert.equal(r.confere, true); assert.equal(r.found[0].score, E); assert.equal(r.arte.set, 'cmr');
  r = X.decideArte({ found: [{ name: 'Sol Ring', score: 1 }], doNome: { ...sol, d: L.igual + 1 }, top: [outra], aceite: A, exata: E });
  assert.equal(r.discorda, false); assert.equal(r.found[0].name, 'Sol Ring', 'nome exato não é trocado pela arte');
  r = X.decideArte({ found: [{ name: 'Sol Ring', score: 0.88 }], doNome: { ...sol, d: 90 }, top: [outra], aceite: A, exata: E });
  assert.equal(r.discorda, true); assert.equal(r.found[0].score, r.found[1].score, 'as duas coladas: o porteiro marca ambígua');
  r = X.decideArte({ found: [], top: [outra, { i: 1, d: 80, nome: 'X' }], aceite: A, exata: E });
  assert.equal(r.found[0].name, 'Arcane Signet'); assert.equal(r.found[0].score, E); assert.equal(r.found[0].viaArte, true);
  r = X.decideArte({ found: [], top: [{ ...outra, d: 25 }, { i: 1, d: 80, nome: 'X' }], aceite: A, exata: E });
  assert.ok(r.found[0].score >= A && r.found[0].score < E, 'perto mas não tanto: aceita como aproximada (precisa repetir)');
  r = X.decideArte({ found: [], top: [outra, { i: 1, d: outra.d + 5, nome: 'Y' }], aceite: A, exata: E });
  assert.equal(r.found.length, 0, 'duas artes quase iguais: a arte não responde');
  r = X.decideArte({ found: [], top: [{ ...outra, d: L.soArte + 1 }], aceite: A, exata: E });
  assert.equal(r.found.length, 0, 'longe demais: não responde');
});

function serveBase(lista, nomes, { ok = true } = {}) {
  const indice = { versao: 1, geradoEm: '2026-11-02T08:00:00Z', bits: 192, campos: ['nome', 'set', 'numero', 'ilustracao', 'versao'], cartas: nomes.map((n, i) => [n[0], n[1], n[2], 'il' + i, '1']) };
  const bin = X.binDasArtes(lista);
  const pedidos = [];
  const fetchFn = async (url) => { pedidos.push(url); if (!ok) return { ok: false, status: 503 };
    return { ok: true, json: async () => JSON.parse(JSON.stringify(indice)), arrayBuffer: async () => bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength) }; };
  return { fetchFn, pedidos };
}
function lojaMemoria() { const m = new Map(); return { m, get: async k => (m.has(k) ? m.get(k) : null), set: async (k, v) => { m.set(k, v); return true; } }; }

test('S-596 · base no aparelho: baixa uma vez e guarda; abre da guardada sem rede; velha (> 7 dias) baixa de novo; base ruim não é guardada; sem nada, segue sem arte', async () => {
  const cartas = [carta(1), carta(2), carta(3)], lista = cartas.map(c => imp(c));
  const nomes = [['Sol Ring', 'cmr', '472'], ['Sol Ring', 'c21', '263'], ['Arcane Signet', 'cmr', '297']];
  const store = lojaMemoria(); let t = Date.UTC(2026, 10, 2);
  const s1 = serveBase(lista, nomes);
  const b1 = X.criaBaseDeArtes({ store, fetchFn: s1.fetchFn, agora: () => t, url: 'https://x/' });
  assert.equal(b1.pronta(), false);
  await b1.carrega();
  assert.equal(b1.pronta(), true); assert.equal(b1.info().total, 3); assert.equal(s1.pedidos.join(','), 'https://x/artes.json,https://x/artes.bin');
  // edição pelo nome: das duas Sol Ring, a da arte certa
  const r = b1.doNome(imp(cartas[1]), 'Sol Ring');
  assert.equal(r.set, 'c21'); assert.equal(r.d, 0);
  assert.equal(b1.top(imp(cartas[2]))[0].nome, 'Arcane Signet');
  // outra sessão, sem rede: abre a guardada
  const s2 = serveBase(lista, nomes, { ok: false });
  const b2 = X.criaBaseDeArtes({ store, fetchFn: s2.fetchFn, agora: () => t });
  await b2.carrega({ online: false });
  assert.equal(b2.pronta(), true); assert.equal(s2.pedidos.length, 0);
  // 8 dias depois, com rede: baixa de novo; se a rede falha, fica a guardada
  t += 8 * 24 * 3600 * 1000;
  const b3 = X.criaBaseDeArtes({ store, fetchFn: s2.fetchFn, agora: () => t });
  await b3.carrega();
  assert.equal(s2.pedidos.length, 1, 'tentou baixar'); assert.equal(b3.pronta(), true, 'a guardada continua valendo');
  // base cortada: não entra nem é guardada
  const loja2 = lojaMemoria();
  const ruim = { fetchFn: async u => ({ ok: true, json: async () => ({ versao: 1, bits: 192, cartas: [['A'], ['B']] }), arrayBuffer: async () => new ArrayBuffer(24) }) };
  const b4 = X.criaBaseDeArtes({ store: loja2, fetchFn: ruim.fetchFn });
  assert.equal(await b4.carrega(), null); assert.equal(loja2.m.size, 0);
  assert.equal(b4.doNome(imp(cartas[0]), 'Sol Ring'), null); assert.equal(b4.top(imp(cartas[0])).length, 0);
});

/* ---------------- S-597 · carta impressa em português e carta na mão ---------------- */
test('S-597 · nome impresso em português responde pelo nome da base em inglês (o caso do print: "Beledros Murchaflor")', () => {
  const sem = X.buildIndex(['Beledros Witherbloom', 'Melee', 'Counterspell']);
  assert.ok(!(X.matchName(sem, 'Beledros Murchaflor')[0]?.score >= X.ACCEPT), 'sem os nomes em português, a carta não casa (o defeito)');
  const com = X.buildIndex(['Beledros Witherbloom', 'Melee', 'Counterspell'], [['Beledros Murchaflor', 'Beledros Witherbloom'], ['Anular Feitiço', 'Counterspell']]);
  const r = X.matchName(com, 'Beledros Murchaflor');
  assert.equal(r[0].name, 'Beledros Witherbloom'); assert.equal(r[0].score, 1); assert.equal(r[0].exata, true);
  assert.equal(X.matchName(com, 'Beledros Murchafl0r')[0].name, 'Beledros Witherbloom', 'troca típica do OCR também casa');
  assert.equal(X.matchName(com, 'Anular Feitico')[0].name, 'Counterspell', 'acento lido sem acento');
  assert.equal(X.matchName(com, 'Counterspell')[0].name, 'Counterspell', 'o inglês continua');
});

test('S-597 · base de nomes: os nomes em português vêm do ramo artes, ficam guardados, e base estranha não entra', async () => {
  const store = lojaMemoria(); let t = Date.UTC(2026, 10, 2), pedidos = 0;
  const scryfall = { catalogNames: async () => ['Beledros Witherbloom', 'Counterspell'] };
  const fetchBom = async url => { pedidos++; assert.match(url, /\/artes\/nomes-[a-z]+\.json$/); if (!/nomes-pt\.json$/.test(url)) return { ok: false, status: 404 }; return { ok: true, json: async () => ({ versao: 1, idioma: 'pt', pares: [['Beledros Murchaflor', 'Beledros Witherbloom']] }) }; };
  const n1 = X.createNameIndex({ store, scryfall, now: () => t, fetchFn: fetchBom });
  await n1.ensure({ online: true, impressos: true });
  assert.equal(n1.match('Beledros Murchaflor')[0].name, 'Beledros Witherbloom'); assert.equal(n1.info().apelidos, 1);
  const feitos = pedidos;
  // sem rede, outra sessão: abre os guardados
  const n2 = X.createNameIndex({ store, scryfall, now: () => t, fetchFn: async () => { throw new Error('sem rede'); } });
  await n2.ensure({ online: false });
  assert.equal(n2.match('Beledros Murchaflor')[0].name, 'Beledros Witherbloom'); assert.equal(pedidos, feitos);
  // arquivo estranho: ignorado, a base em inglês segue
  const loja2 = lojaMemoria();
  const n3 = X.createNameIndex({ store: loja2, scryfall, now: () => t, fetchFn: async () => ({ ok: true, json: async () => ({ versao: 1, pares: [['<b>x</b>', 5]] }) }) });
  await n3.ensure({ online: true, impressos: true });
  assert.equal(n3.info().apelidos, 0); assert.equal(n3.match('Counterspell')[0].name, 'Counterspell'); assert.equal(loja2.m.has('names.pt'), false);
});

test('S-597 · carta na mão: tremor de até 12% do quadro não pula a leitura (antes, 5% já virava "Segure firme"); carta correndo pula; "Ler agora" nunca pula', () => {
  assert.equal(X.pulaPorMovimento(0.07), false, 'tremor da mão com zoom 2×: lê');
  assert.equal(X.pulaPorMovimento(0.11), false);
  assert.equal(X.pulaPorMovimento(0.2), true, 'carta entrando ou saindo: pula');
  assert.equal(X.pulaPorMovimento(0.2, { via: 'manual' }), false);
  assert.equal(X.pulaPorMovimento(0.2, { contorno: false }), false, 'sem contorno, não há como medir');
  assert.ok(X.LIMIARES_LINHA.deslocamentoMax < X.LIMIARES_LINHA.correndo, 'entre os dois a carta é lida, mas não conta como parada (nada entra na primeira)');
});

test('S-597 · gerador: nomes em português pela busca da Scryfall (lang:pt), páginas seguidas, faces das duplas, sem repetir', async () => {
  const { nomesNoIdioma } = await import('./artes.mjs');
  const urls = [];
  const fetchFn = async (url, opts) => {
    urls.push(url); assert.match(opts.headers['User-Agent'], /^Estante\//);
    if (urls.length === 1) { assert.match(url, /q=lang%3Apt/); assert.match(url, /include_multilingual=true/);
      return { ok: true, json: async () => ({ data: [{ name: 'Beledros Witherbloom', printed_name: 'Beledros Murchaflor', lang: 'pt' }, { name: 'Fire // Ice', card_faces: [{ name: 'Fire', printed_name: 'Fogo' }, { name: 'Ice', printed_name: 'Gelo' }] }], has_more: true, next_page: 'https://api.scryfall.com/cards/search?page=2' }) }; }
    return { ok: true, json: async () => ({ data: [{ name: 'Beledros Witherbloom', printed_name: 'Beledros Murchaflor' }, { name: 'Island', printed_name: 'Island' }], has_more: false }) };
  };
  const pares = await nomesNoIdioma(fetchFn, 'pt', { pausa: 0 });
  assert.equal(urls.length, 2);
  assert.equal(JSON.stringify(pares), JSON.stringify([['Beledros Murchaflor', 'Beledros Witherbloom'], ['Fogo', 'Fire // Ice'], ['Gelo', 'Fire // Ice']]), 'nome igual ao inglês não entra; repetido entra uma vez');
});

/* ---------------- S-598 · X20 fatia 2: espanhol, italiano, francês e alemão ---------------- */
/** Arquivos de nomes por língua, como o fluxo publica no ramo artes (pares de teste, não cartas reais). */
const NOMES_TESTE = {
  pt: [['Anular Feitiço', 'Counterspell']],
  es: [['Contrahechizo Prueba', 'Counterspell'], ['Señor de Prueba', 'Test Lord']],
  it: [['Controincantesimo Prova', 'Counterspell'], ['Città di Prova', 'Test City']],
  fr: [['Contresort Épreuve', 'Counterspell']],
  de: [['Gegenzauber Prüfung', 'Counterspell'], ['Straße der Probe', 'Test City']]
};
const fetchDosNomes = (pedidos = [], { falha = new Set(), idiomaErrado = new Set() } = {}) => async url => {
  const m = /\/artes\/nomes-([a-z]+)\.json$/.exec(url); assert.ok(m, 'só o ramo artes: ' + url);
  pedidos.push(m[1]);
  if (falha.has(m[1])) throw new Error('rede caiu');
  if (!NOMES_TESTE[m[1]]) return { ok: false, status: 404 };
  return { ok: true, json: async () => ({ versao: 1, idioma: idiomaErrado.has(m[1]) ? 'xx' : m[1], pares: NOMES_TESTE[m[1]] }) };
};

test('S-598 · nome impresso em espanhol, italiano, francês ou alemão responde pelo nome em inglês; sem a língua, não casa', async () => {
  const scryfall = { catalogNames: async () => ['Counterspell', 'Test Lord', 'Test City', 'Island'] };
  const so = X.createNameIndex({ store: lojaMemoria(), scryfall, fetchFn: fetchDosNomes(), idiomas: ['pt'] });
  await so.ensure({ online: true, impressos: true });
  assert.ok(!(so.match('Señor de Prueba')[0]?.score >= X.ACCEPT), 'só com o português, a carta em espanhol não casa (o defeito)');
  const loja = lojaMemoria();
  const n = X.createNameIndex({ store: loja, scryfall, fetchFn: fetchDosNomes() });
  await n.ensure({ online: true, impressos: true });
  assert.equal(n.match('Señor de Prueba')[0].name, 'Test Lord'); assert.equal(n.match('Senor de Prueba')[0].name, 'Test Lord', 'ñ lido como n');
  assert.equal(n.match('Citta di Prova')[0].name, 'Test City', 'à lido sem acento');
  assert.equal(n.match('Contresort Epreuve')[0].name, 'Counterspell');
  assert.equal(n.match('Gegenzauber Prufung')[0].name, 'Counterspell', 'ü lido como u');
  assert.equal(n.match('Strabe der Probe')[0].name, 'Test City', 'ß lido como b pelo leitor em inglês também casa');
  assert.equal(n.match('Anular Feitico')[0].name, 'Counterspell'); assert.equal(n.match('Island')[0].name, 'Island', 'o inglês continua');
  assert.equal(JSON.stringify(n.info().idiomas), JSON.stringify({ pt: 1, es: 2, it: 2, fr: 1, de: 2 }));
  for (const l of ['pt', 'es', 'it', 'fr', 'de']) assert.ok(loja.m.has('names.' + l), 'guardado por língua: names.' + l);
  assert.equal(X.IDIOMAS_DOS_NOMES.join(','), 'pt,es,it,fr,de', 'só escrita latina: o leitor de hoje lê; ja/zh/ko/ru vêm com leitor próprio');
});

test('S-598 · uma língua que falha não impede as outras; arquivo de outra língua não entra; só baixa de novo a língua velha', async () => {
  const scryfall = { catalogNames: async () => ['Counterspell', 'Test Lord', 'Test City'] };
  const loja = lojaMemoria(); let t = Date.UTC(2026, 10, 2); const pedidos = [];
  const n = X.createNameIndex({ store: loja, scryfall, now: () => t, fetchFn: fetchDosNomes(pedidos, { falha: new Set(['it']), idiomaErrado: new Set(['fr']) }) });
  await n.ensure({ online: true, impressos: true });
  assert.equal(n.match('Señor de Prueba')[0].name, 'Test Lord', 'o espanhol entrou mesmo com o italiano fora do ar');
  assert.equal(JSON.stringify(n.info().idiomas), JSON.stringify({ pt: 1, es: 2, de: 2 }), 'italiano falhou, francês veio com a língua errada');
  assert.equal(loja.m.has('names.fr'), false);
  // dia seguinte: só as que faltam são pedidas de novo
  t += 86400000; pedidos.length = 0;
  const n2 = X.createNameIndex({ store: loja, scryfall, now: () => t, fetchFn: fetchDosNomes(pedidos) });
  await n2.ensure({ online: true, impressos: true });
  assert.equal(pedidos.sort().join(','), 'fr,it');
  assert.equal(n2.match('Citta di Prova')[0].name, 'Test City');
  // 31 dias depois: todas velhas, todas pedidas de novo
  t += 31 * 86400000; pedidos.length = 0;
  const n3 = X.createNameIndex({ store: loja, scryfall, now: () => t, fetchFn: fetchDosNomes(pedidos) });
  await n3.ensure({ online: true, impressos: true });
  assert.equal(pedidos.length, 5);
});

test('S-598 · gerador: separa os objetos do fluxo dos dados em massa em qualquer corte (chaves e aspas dentro de texto)', async () => {
  const { separaObjetos } = await import('./artes.mjs');
  const objs = [{ a: 'x}{"', b: { c: [1, { d: '\\' }] } }, { lang: 'pt', printed_name: 'Feitiço {Ç}' }, { e: '' }];
  const texto = '[\n' + objs.map(o => JSON.stringify(o)).join(',\n') + '\n]';
  for (const passo of [1, 2, 3, 7, 50, texto.length]) {
    const f = separaObjetos(), out = [];
    for (let i = 0; i < texto.length; i += passo) out.push(...f(texto.slice(i, i + passo)));
    assert.equal(JSON.stringify(out.map(o => JSON.parse(o))), JSON.stringify(objs), 'corte de ' + passo);
  }
});

test('S-598 · gerador: nomes de todas as línguas num download só (All Cards), inglês ignorado, faces das duplas, letra partida entre pedaços', async () => {
  const { nomesDosDadosEmMassa, gera } = await import('./artes.mjs');
  const cartas = [
    { lang: 'en', name: 'Counterspell', printed_name: 'Counterspell' },
    { lang: 'pt', name: 'Counterspell', printed_name: 'Anular Feitiço' },
    { lang: 'it', name: 'Counterspell', printed_name: 'Controincantesimo Prova' },
    { lang: 'es', name: 'Fire // Ice', card_faces: [{ name: 'Fire', printed_name: 'Fuego' }, { name: 'Ice', printed_name: 'Hielo' }] },
    { lang: 'ja', name: 'Counterspell', printed_name: '対抗呪文' },
    { lang: 'pt', name: 'Counterspell', printed_name: 'Anular Feitiço' },
    { lang: 'de', name: 'Island', printed_name: 'Insel' },
    { lang: 'ru', name: 'Island', printed_name: 'Остров' }
  ];
  const bytes = new TextEncoder().encode(JSON.stringify(cartas, null, 0).replace(/},{/g, '},\n{'));
  const pedidas = [];
  const fetchFn = async (url, opts) => {
    pedidas.push(url); assert.match(opts.headers['User-Agent'], /^Estante\//);
    if (url === 'https://api.scryfall.com/bulk-data/all-cards') return { ok: true, json: async () => ({ download_uri: 'https://data.scryfall.io/all-cards/x.json' }) };
    if (url === 'https://data.scryfall.io/all-cards/x.json') {
      // pedaços de 5 bytes: "ç", "対" e "О" ficam partidos entre dois pedaços
      return { ok: true, body: (async function* () { for (let i = 0; i < bytes.length; i += 5) yield bytes.slice(i, i + 5); })() };
    }
    throw new Error('url inesperada ' + url);
  };
  const r = await nomesDosDadosEmMassa(fetchFn, ['pt', 'es', 'it', 'de', 'ja', 'ru']);
  assert.equal(JSON.stringify(r), JSON.stringify({
    pt: [['Anular Feitiço', 'Counterspell']], es: [['Fuego', 'Fire // Ice'], ['Hielo', 'Fire // Ice']], it: [['Controincantesimo Prova', 'Counterspell']],
    de: [['Insel', 'Island']], ja: [['対抗呪文', 'Counterspell']], ru: [['Остров', 'Island']] }));
  assert.equal(pedidas.length, 2, 'um pedido de endereço e um download: nenhuma busca paginada');
  // o gerador grava um arquivo por língua a partir dele
  const pasta = await mkdtemp(join(tmpdir(), 'artes-'));
  const art = scryfallFalsa(3);
  const tudo = async (url, opts) => (/all-cards/.test(url) ? fetchFn(url, opts) : art.fetchFn(url, opts));
  const g = await gera({ saida: pasta, fetchFn: tudo, X, log: () => {}, idiomas: ['pt', 'it', 'ja'] });
  assert.equal(JSON.stringify(g.nomes), JSON.stringify({ pt: 1, it: 1, ja: 1 }));
  const it = JSON.parse(await readFile(join(pasta, 'nomes-it.json'), 'utf8'));
  assert.equal(it.idioma, 'it'); assert.equal(it.versao, 1); assert.match(it.fonte, /All Cards/); assert.equal(it.pares[0][0], 'Controincantesimo Prova');
});

test('S-598 · gerador: dados em massa fora do ar → segue pela busca, uma língua por vez', async () => {
  const { gera } = await import('./artes.mjs');
  const pasta = await mkdtemp(join(tmpdir(), 'artes-'));
  const art = scryfallFalsa(3); const buscas = [];
  const fetchFn = async (url, opts) => {
    if (/bulk-data\/all-cards/.test(url)) return { ok: false, status: 503 };
    if (/cards\/search/.test(url)) { buscas.push(url); return { ok: true, json: async () => ({ data: [{ name: 'Island', printed_name: /lang%3Ait/.test(url) ? 'Isola' : 'Ilha' }], has_more: false }) }; }
    return art.fetchFn(url, opts);
  };
  const g = await gera({ saida: pasta, fetchFn, X, log: () => {}, idiomas: ['pt', 'it'], pausaNomes: 0 });
  assert.equal(buscas.length, 2); assert.equal(JSON.stringify(g.nomes), JSON.stringify({ pt: 1, it: 1 }));
  assert.match(JSON.parse(await readFile(join(pasta, 'nomes-it.json'), 'utf8')).fonte, /busca lang:it/);
});

test('S-598 · os nomes impressos só são baixados quando o scanner (ou o preparo sem internet) pede; língua que falhou espera uma hora', async () => {
  const scryfall = { catalogNames: async () => ['Counterspell', 'Test Lord'] };
  let t = Date.UTC(2026, 10, 2); const pedidos = [];
  const n = X.createNameIndex({ store: lojaMemoria(), scryfall, now: () => t, fetchFn: fetchDosNomes(pedidos, { falha: new Set(['it']) }) });
  await n.ensure({ online: true });
  assert.equal(pedidos.length, 0, 'outra tela (lista, fichas): nenhum arquivo de nomes pedido');
  await n.ensure({ online: true, impressos: true });
  assert.equal(pedidos.length, 5); assert.equal(n.match('Señor de Prueba')[0].name, 'Test Lord');
  await n.ensure({ online: true, impressos: true });
  assert.equal(pedidos.length, 5, 'na mesma hora, o italiano que falhou não é pedido de novo a cada leitura');
  t += 3600001; await n.ensure({ online: true, impressos: true });
  assert.equal(pedidos.join(','), 'pt,es,it,fr,de,it', 'uma hora depois, só ele');
});

test('S-600 · dados em massa no formato de 01/11/2026 (só jsonl_download_uri, uma carta por linha, gzip em pedaços pequenos): os nomes saem iguais; endereço fora da Scryfall é recusado', async () => {
  const { nomesDosDadosEmMassa, enderecoDaMassa } = await import('./artes.mjs');
  const cartas = [
    { lang: 'en', name: 'Counterspell' },
    { lang: 'pt', name: 'Counterspell', printed_name: 'Anular Feitiço', card_faces: undefined },
    { lang: 'ja', name: 'Counterspell', printed_name: '対抗呪文', oracle_text: 'Counter target spell. {U}{U} } { "' },
    { lang: 'es', name: 'Fire // Ice', card_faces: [{ name: 'Fire', printed_name: 'Fuego' }, { name: 'Ice', printed_name: 'Hielo' }] }
  ];
  const gz = gzipSync(cartas.map(c => JSON.stringify(c)).join('\n') + '\n');
  const fetchFn = async url => {
    if (url === 'https://api.scryfall.com/bulk-data/all-cards') return { ok: true, json: async () => ({ object: 'bulk_data', type: 'all_cards', jsonl_download_uri: 'https://data.scryfall.io/all-cards/all-cards-1.jsonl.gz' }) };
    if (url === 'https://data.scryfall.io/all-cards/all-cards-1.jsonl.gz') return { ok: true, body: pedacos(gz, 7) };
    throw new Error('url inesperada ' + url);
  };
  const r = await nomesDosDadosEmMassa(fetchFn, ['pt', 'ja', 'es']);
  assert.equal(JSON.stringify(r), JSON.stringify({ pt: [['Anular Feitiço', 'Counterspell']], ja: [['対抗呪文', 'Counterspell']], es: [['Fuego', 'Fire // Ice'], ['Hielo', 'Fire // Ice']] }));
  assert.equal(enderecoDaMassa({ download_uri: 'https://data.scryfall.io/a.json' }), 'https://data.scryfall.io/a.json', 'o formato antigo continua valendo');
  assert.throws(() => enderecoDaMassa({ jsonl_download_uri: 'https://exemplo.com/a.jsonl.gz' }), /sem endereço da Scryfall/);
  assert.throws(() => enderecoDaMassa({}), /sem endereço da Scryfall/);
});

/* ---------------- S-601 · X20 fatia 3: japonês e chinês ---------------- */
// Pares tirados dos arquivos nomes-ja/zhs/zht.json gerados pelo fluxo em 01/11/2026 (Scryfall, dados em massa All Cards).
const NOMES_CJK = {
  ja: [['稲妻', 'Lightning Bolt'], ['対抗呪文', 'Counterspell'], ['不動のアジャニ', 'Ajani Steadfast'], ['不撓のアジャニ', 'Ajani Unyielding'], ['ラノワールのエルフ', 'Llanowar Elves']],
  zhs: [['闪电击', 'Lightning Bolt'], ['反击咒语', 'Counterspell'], ['罗堰妖精', 'Llanowar Elves'], ['坚定的阿耶尼', 'Ajani Steadfast']],
  zht: [['閃電擊', 'Lightning Bolt'], ['反擊咒語', 'Counterspell'], ['羅堰妖精', 'Llanowar Elves']]
};

test('S-601 · nome impresso em japonês e chinês: casa pela escrita, com leitura partida, ruído e um ideograma trocado', () => {
  const ix = X.indiceCjk([...NOMES_CJK.ja, ...NOMES_CJK.zhs, ...NOMES_CJK.zht, ['Anular Feitiço', 'Counterspell']]);
  assert.equal(ix.entradas.length, 12, 'par latino não entra no índice da escrita');
  const top = t => X.matchCjk(ix, t)[0] || {};
  assert.deepEqual([top('稲妻').name, top('稲妻').exata], ['Lightning Bolt', true]);
  assert.equal(top('稲 妻').name, 'Lightning Bolt', 'o leitor põe espaço entre os ideogramas');
  assert.equal(top('ラノワール の エルフ\n').name, 'Llanowar Elves');
  assert.equal(top('ﾗﾉﾜｰﾙのｴﾙﾌ').name, 'Llanowar Elves', 'kana de meia largura (NFKC)');
  assert.equal(top('閃電擊').name, 'Lightning Bolt'); assert.equal(top('闪电击').name, 'Lightning Bolt');
  assert.equal(top('対抗呪文 1U').name, 'Counterspell', 'custo de mana lido como texto no fim');
  const um = X.matchCjk(ix, '坚定的阿耶尸')[0];
  assert.equal(um.name, 'Ajani Steadfast'); assert.ok(um.score >= X.ACCEPT && um.score < 1, 'um ideograma trocado em seis: aproximado, acima do aceite');
  // medida com o leitor de verdade (01/11/2026): 不撓 lido como 不擁 fica a uma troca dos dois Ajani — os dois vêm juntos, colados,
  // e o porteiro (margem) não deixa entrar nenhum: a arte decide ou a pessoa confere
  const dois = X.matchCjk(ix, '不擁のアジャニ');
  assert.deepEqual([...dois].map(d => d.name).sort(), ['Ajani Steadfast', 'Ajani Unyielding']);
  assert.ok(dois[0].score - dois[1].score < X.PORTEIRO.margem);
  assert.equal(X.matchCjk(ix, '稲').length, 0, 'um caractere só não basta');
  assert.equal(X.matchCjk(ix, 'Lightning Bolt').length, 0, 'texto latino não passa por aqui');
  assert.ok(X.temCjk('不撓') && !X.temCjk('Beledros'));
});

test('S-601 · a língua do leitor pede os nomes da sua escrita; o latino segue igual; sem pedir, nada de japonês é baixado', async () => {
  const scryfall = { catalogNames: async () => ['Counterspell', 'Lightning Bolt', 'Llanowar Elves', 'Ajani Steadfast', 'Ajani Unyielding'] };
  const pedidos = [], todos = { ...NOMES_TESTE, ...NOMES_CJK };
  const fetchFn = async url => {
    const m = /\/artes\/nomes-([a-z]+)\.json$/.exec(url); assert.ok(m, 'só o ramo artes: ' + url); pedidos.push(m[1]);
    return todos[m[1]] ? { ok: true, json: async () => ({ versao: 1, idioma: m[1], pares: todos[m[1]] }) } : { ok: false, status: 404 };
  };
  const loja = lojaMemoria(); let t = Date.UTC(2026, 10, 2);
  const n = X.createNameIndex({ store: loja, scryfall, now: () => t, fetchFn });
  await n.ensure({ online: true, impressos: true });
  assert.deepEqual(pedidos.sort(), ['de', 'es', 'fr', 'it', 'pt'], 'sem escolher japonês ou chinês, só as latinas');
  assert.equal(n.match('稲妻').length, 0, 'sem os nomes japoneses, a leitura em japonês não casa (o defeito)');
  n.usaLingua('ja'); pedidos.length = 0;
  await n.ensure({ online: true, impressos: true });
  assert.deepEqual(pedidos, ['ja'], 'só a língua nova é baixada');
  assert.equal(n.match('稲妻')[0].name, 'Lightning Bolt'); assert.equal(n.match('ラノワールのエルフ')[0].name, 'Llanowar Elves');
  assert.equal(n.match('Anular Feitico')[0].name, 'Counterspell', 'o latino continua'); assert.equal(n.match('Counterspell')[0].name, 'Counterspell');
  assert.equal(n.info().idiomas.ja, 5); assert.ok(loja.m.has('names.ja'));
  assert.ok(!n.match('闪电击')[0], 'chinês não veio junto');
  // reabrindo sem rede: os nomes japoneses guardados voltam com a base
  const n2 = X.createNameIndex({ store: loja, scryfall, now: () => t, fetchFn: async () => { throw new Error('sem rede'); } });
  await n2.ensure({ online: false, impressos: true });
  assert.equal(n2.match('稲妻')[0].name, 'Lightning Bolt');
  n.usaLingua('zht'); pedidos.length = 0; await n.ensure({ online: true, impressos: true });
  assert.deepEqual(pedidos, ['zht']); assert.equal(n.match('羅堰妖精')[0].name, 'Llanowar Elves');
  assert.equal(n.match('稲妻')[0].name, 'Lightning Bolt', 'o japonês já guardado continua valendo');
  n.usaLingua('xx'); pedidos.length = 0; await n.ensure({ online: true, impressos: true });
  assert.deepEqual(pedidos, [], 'língua desconhecida vira latino: nada novo');
  assert.equal(X.linguaDoLeitor('ja'), 'ja'); assert.equal(X.linguaDoLeitor('toString'), 'latino'); assert.equal(X.linguaDoLeitor(undefined), 'latino');
  assert.deepEqual(Object.fromEntries(Object.entries(X.LINGUAS_DO_LEITOR).map(([k, v]) => [k, v.ocr])), { latino: 'eng', ja: 'jpn', zhs: 'chi_sim', zht: 'chi_tra', ko: 'kor', ru: 'rus' });
});

/* ---------------- S-614 · X20 fatia 4: coreano e russo ---------------- */
// Pares tirados dos arquivos nomes-ko/ru.json gerados pelo fluxo em 04/11/2026 (Scryfall, dados em massa All Cards).
const NOMES_KO_RU = {
  ko: [['벼락', 'Lightning Bolt'], ['주문 무효화', 'Counterspell'], ['라노워 엘프', 'Llanowar Elves'], ['영웅의 스승 아자니', 'Ajani, Mentor of Heroes'], ['세라 천사', 'Serra Angel']],
  ru: [['Удар Молнии', 'Lightning Bolt'], ['Отмена Заклинания', 'Counterspell'], ['Лановарские эльфы', 'Llanowar Elves'], ['Лановарские Эльфы', 'Llanowar Elves'],
    ['Аджани, Наставник Героев', 'Ajani, Mentor of Heroes'], ['Златогривый Аджани', 'Ajani Goldmane'], ['Ангел Серры', 'Serra Angel'], ['Шиванский дракон', 'Shivan Dragon']]
};
test('S-614 · nome impresso em coreano e russo: hangul por sílaba, cirílico por pares de letras; caixa, "ё", espaço e uma letra trocada', () => {
  const ix = X.indiceCjk([...NOMES_KO_RU.ko, ...NOMES_KO_RU.ru, ['Anular Feitiço', 'Counterspell']]);
  assert.equal(ix.entradas.length, 13, 'o cirílico entra no índice da escrita; o latino, não');
  const top = t => X.matchCjk(ix, t)[0] || {};
  assert.deepEqual([top('벼락').name, top('벼락').exata], ['Lightning Bolt', true]);
  assert.equal(top('주문무효화').name, 'Counterspell', 'sem o espaço');
  assert.equal(top('라노워 엘프 G').name, 'Llanowar Elves');
  const ko = X.matchCjk(ix, '영웅의 스승 아자이')[0];
  assert.equal(ko.name, 'Ajani, Mentor of Heroes'); assert.ok(ko.score >= X.ACCEPT && ko.score < 1, 'uma sílaba trocada: aproximado, acima do aceite');
  assert.deepEqual([top('УДАР МОЛНИИ').name, top('УДАР МОЛНИИ').exata], ['Lightning Bolt', true], 'o título em caixa alta');
  assert.equal(top('Аджани Наставник Героев').name, 'Ajani, Mentor of Heroes', 'sem a vírgula');
  assert.equal(top('Златогрнвый Аджани').name, 'Ajani Goldmane', 'и lido como н (troca comum do leitor)');
  assert.equal(top('Лановарские эльфы').name, 'Llanowar Elves');
  const ru = X.matchCjk(ix, 'Шиванскии дракон')[0];
  assert.equal(ru.name, 'Shivan Dragon'); assert.ok(ru.score >= X.ACCEPT && ru.score < 1, 'й lido como и');
  assert.equal(X.chaveCjk('Ёлка'), X.chaveCjk('елка'), '"ё" e "е" são a mesma letra para o leitor');
  assert.equal(X.matchCjk(ix, 'Ж').length, 0, 'uma letra só não basta');
  assert.equal(X.matchCjk(ix, 'Lightning Bolt').length, 0, 'texto latino não passa por aqui');
  assert.ok(X.temCjk('Удар') && X.temCjk('벼락') && !X.temCjk('Udar'));
});
test('S-614 · escolher coreano ou russo baixa só os nomes daquela língua e o latino segue valendo', async () => {
  const scryfall = { catalogNames: async () => ['Counterspell', 'Lightning Bolt', 'Llanowar Elves', 'Serra Angel'] };
  const pedidos = [], todos = { ...NOMES_TESTE, ...NOMES_KO_RU };
  const fetchFn = async url => {
    const m = /\/artes\/nomes-([a-z]+)\.json$/.exec(url); assert.ok(m, 'só o ramo artes: ' + url); pedidos.push(m[1]);
    return todos[m[1]] ? { ok: true, json: async () => ({ versao: 1, idioma: m[1], pares: todos[m[1]] }) } : { ok: false, status: 404 };
  };
  const loja = lojaMemoria(); const t = Date.UTC(2026, 10, 7);
  const n = X.createNameIndex({ store: loja, scryfall, now: () => t, fetchFn });
  n.usaLingua('ru'); await n.ensure({ online: true, impressos: true });
  assert.ok(pedidos.includes('ru') && !pedidos.includes('ko'), 'só o russo além das latinas: ' + pedidos);
  assert.equal(n.match('Удар Молнии')[0].name, 'Lightning Bolt');
  assert.equal(n.match('Anular Feitico')[0].name, 'Counterspell', 'o latino continua');
  assert.ok(loja.m.has('names.ru'));
  n.usaLingua('ko'); pedidos.length = 0; await n.ensure({ online: true, impressos: true });
  assert.deepEqual(pedidos, ['ko']); assert.equal(n.match('세라 천사')[0].name, 'Serra Angel');
  assert.equal(n.match('Ангел Серры')[0].name, 'Serra Angel', 'o russo já guardado continua valendo');
});
