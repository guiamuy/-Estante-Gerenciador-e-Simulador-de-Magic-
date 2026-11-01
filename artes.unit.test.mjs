// X12 · S-595 · impressão digital da arte e o gerador da base (artes.mjs), sem rede: Scryfall falsa com cartas desenhadas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
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

/** Scryfall falsa: os dados em massa com `n` cartas e as imagens JPEG desenhadas; conta as imagens pedidas. */
function scryfallFalsa(n, { falha = new Set(), versao = () => '1' } = {}) {
  const pedidas = [];
  const cartas = Array.from({ length: n }, (_, i) => ({ name: 'Carta ' + String(i).padStart(3, '0'), set: 'tst', collector_number: String(i + 1), illustration_id: 'il-' + i, layout: 'normal', image_uris: { small: `https://cards.scryfall.io/small/${i}.jpg?${versao(i)}` } }));
  const resp = (corpo, tipo) => ({ ok: true, status: 200, json: async () => corpo, arrayBuffer: async () => corpo });
  const fetchFn = async (url, opts) => {
    assert.match(opts.headers['User-Agent'], /^Estante\//, 'identifica o app para a Scryfall');
    if (url === 'https://api.scryfall.com/bulk-data/unique-artwork') return resp({ download_uri: 'https://data.scryfall.io/unique-artwork/x.json', updated_at: '2026-11-01T09:00:00Z' });
    if (url === 'https://data.scryfall.io/unique-artwork/x.json') return resp(cartas);
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
  const fetchBom = async url => { pedidos++; assert.match(url, /\/artes\/nomes-pt\.json$/); return { ok: true, json: async () => ({ versao: 1, idioma: 'pt', pares: [['Beledros Murchaflor', 'Beledros Witherbloom']] }) }; };
  const n1 = X.createNameIndex({ store, scryfall, now: () => t, fetchFn: fetchBom });
  await n1.ensure({ online: true });
  assert.equal(n1.match('Beledros Murchaflor')[0].name, 'Beledros Witherbloom'); assert.equal(n1.info().apelidos, 1);
  // sem rede, outra sessão: abre os guardados
  const n2 = X.createNameIndex({ store, scryfall, now: () => t, fetchFn: async () => { throw new Error('sem rede'); } });
  await n2.ensure({ online: false });
  assert.equal(n2.match('Beledros Murchaflor')[0].name, 'Beledros Witherbloom'); assert.equal(pedidos, 1);
  // arquivo estranho: ignorado, a base em inglês segue
  const loja2 = lojaMemoria();
  const n3 = X.createNameIndex({ store: loja2, scryfall, now: () => t, fetchFn: async () => ({ ok: true, json: async () => ({ versao: 1, pares: [['<b>x</b>', 5]] }) }) });
  await n3.ensure({ online: true });
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
