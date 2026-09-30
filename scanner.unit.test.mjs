// Camadas 1 e 2 · scanner (C6, X1, X2, X4): base de nomes, correspondência
// de OCR ruidoso, lote com leitura automática e região da moldura.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
const { scanner: X, platform: P } = loadModules();

const REAL = ['Sol Ring', 'Counterspell', 'Lightning Bolt', 'Island', 'Islandwalk Ranger', 'Malcolm, Alluring Scoundrel', 'Fire // Ice',
  'Delver of Secrets', 'Spellstutter Sprite', 'Preordain', 'Brainstorm', 'Ponder', 'Arcane Signet', 'Sol Talisman', 'Soul Ring', 'Counterbalance'];
// Catálogo com o tamanho real (~30 mil nomes): o que importa é acertar no meio de muitos parecidos.
const rnd = (() => { let s = 7; return () => (s = (s * 1103515245 + 12345) >>> 0) / 4294967296; })();
const syll = ['ka', 'lo', 'mer', 'thi', 'on', 'dra', 'sol', 'ring', 'is', 'land', 'bolt', 'ven', 'gar', 'u', 'rix', 'spel'];
const word = () => Array.from({ length: 2 + Math.floor(rnd() * 3) }, () => syll[Math.floor(rnd() * syll.length)]).join('');
const DECOYS = Array.from({ length: 30000 }, () => word()[0].toUpperCase() + word().slice(1) + (rnd() < 0.5 ? ' ' + word() : ''));
const INDEX = X.buildIndex([...REAL, ...DECOYS]);
const top = t => (X.matchName(INDEX, t)[0] || {}).name;

test('X2 · OCR ruidoso vira o nome certo', () => {
  assert.equal(top('Sol Rinq'), 'Sol Ring');
  assert.equal(top('S0l Ring'), 'Sol Ring');
  assert.equal(top('Counterspel1'), 'Counterspell');
  assert.equal(top('Malcolm, Alluring Scoundre|'), 'Malcolm, Alluring Scoundrel');
  assert.equal(top('Delver ot Secrets'), 'Delver of Secrets');
});

test('X2 · lixo do custo de mana no fim da linha não atrapalha', () => {
  assert.equal(top('Lightning Bolt @®'), 'Lightning Bolt');
  assert.equal(top('Counterspell 00 ee'), 'Counterspell');
  assert.equal(top('Preordain O'), 'Preordain');
});

test('X2 · carta dividida responde pela primeira metade; nomes parecidos não se confundem', () => {
  assert.equal(top('Fire'), 'Fire // Ice');
  assert.equal(top('Island'), 'Island');
  assert.equal(top('Soul Ring'), 'Soul Ring');
  assert.equal(top('Sol Talisman'), 'Sol Talisman');
});

test('X2 · texto sem carta não sugere nada; segunda linha vazia é ignorada', () => {
  assert.deepEqual([...X.matchName(INDEX, 'xq')], []);
  assert.deepEqual([...X.matchName(INDEX, '')], []);
  assert.equal(top('\n  \nBrainstorm\n'), 'Brainstorm');
  assert.ok(X.matchName(INDEX, 'Sol Ring')[0].score >= X.ACCEPT, 'leitura limpa passa do limiar automático');
});

test('X2 · desempenho: casar contra 30 mil nomes cabe numa leitura automática', () => {
  const t0 = performance.now();
  for (const q of ['Sol Rinq', 'Malcolm, Alluring Scoundre|', 'Lightning Bolt @®', 'Delver ot Secrets', 'Counterspel1']) X.matchName(INDEX, q);
  const per = (performance.now() - t0) / 5;
  assert.ok(per < 100, `${per.toFixed(0)} ms por leitura`);
});

test('C6 · base de nomes: baixa na primeira vez, usa a salva sem rede, atualiza quando velha', async () => {
  let t = 0, calls = 0, fail = false;
  const scryfall = { catalogNames: async () => { calls++; if (fail) throw new Error('rede'); return REAL; } };
  const store = P.memoryStore();
  const a = X.createNameIndex({ store, scryfall, now: () => t });
  assert.equal(await a.ensure({ online: false }), null, 'sem base e sem rede');
  const meta = await a.ensure({ online: true });
  assert.equal(meta.count, REAL.length); assert.ok(meta.bytes > 0); assert.equal(calls, 1);
  const b = X.createNameIndex({ store, scryfall, now: () => t });
  await b.ensure({ online: false });
  assert.equal(b.match('Sol Rinq')[0].name, 'Sol Ring', 'outra sessão, sem rede, usa a base salva');
  t = 31 * 24 * 3600 * 1000; fail = true;
  await b.ensure({ online: true });
  assert.equal(calls, 2, 'velha: tenta atualizar');
  assert.equal(b.match('Counterspell')[0].name, 'Counterspell', 'falhou: segue com a antiga');
});

test('X4 · leitura automática soma uma vez por carta e rearma quando ela sai do quadro', async () => {
  const lot = X.createLot({ store: P.memoryStore() });
  const sol = { name: 'Sol Ring', score: 0.95 };
  assert.equal(await lot.observe(sol), 'Sol Ring');
  assert.equal(await lot.observe(sol), null, 'mesma carta parada não soma de novo');
  assert.equal(await lot.observe({ name: 'Sol Ring', score: 0.5 }), null, 'leitura fraca não entra');
  assert.equal(await lot.observe(sol), 'Sol Ring', 'saiu e voltou: segunda cópia');
  assert.equal(await lot.observe({ name: 'Island', score: 0.9 }), 'Island', 'carta diferente entra direto');
  assert.equal(await lot.total(), 3);
  lot.rearm();
  assert.equal(await lot.observe({ name: 'Island', score: 0.9 }), 'Island', 'rearmar libera a mesma carta');
});

test('X4 · desfazer, corrigir (funde com igual) e o lote sobrevive a fechar o app', async () => {
  const store = P.memoryStore();
  const lot = X.createLot({ store });
  await lot.add('Sol Rng'); await lot.add('Sol Ring'); await lot.add('Island'); await lot.add('Island');
  assert.equal(await lot.undo(), 'Island');
  await lot.rename('Sol Rng', 'Sol Ring');
  const again = X.createLot({ store });
  assert.deepEqual(JSON.parse(JSON.stringify(await again.list())).map(({ name, qty }) => ({ name, qty })), [{ name: 'Sol Ring', qty: 2 }, { name: 'Island', qty: 1 }]);
  await again.setQty('Island', 0);
  assert.equal(await again.total(), 2);
});

test('X1 · moldura na tela vira a região certa do quadro da câmera (object-fit: cover)', () => {
  // vídeo retrato 1080x1920 numa área 300x400: sobra altura, corta em cima e embaixo
  const r = X.coverRegion(300, 400, 1080, 1920, { x: 0, y: 0, w: 300, h: 400 });
  assert.equal(r.x, 0); assert.equal(Math.round(r.w * 1000), 1000);
  assert.ok(r.y > 0.05 && r.h < 0.9, 'recorte vertical centralizado');
  const full = X.coverRegion(300, 400, 300, 400, { x: 30, y: 40, w: 150, h: 20 });
  assert.deepEqual([full.x, full.y, full.w, full.h].map(v => Math.round(v * 100)), [10, 10, 50, 5]);
});

/* ---------------- X3 · impressão ---------------- */
test('X3 · linha de coleção: formato antigo, formato novo, ruído e sem leitura', () => {
  const r = t => { const x = X.parseCollectorLine(t); return `${x.number}|${x.set}|${x.lang}`; };
  assert.equal(r('267/303 U\nMH2 • EN'), '267|mh2|en');
  assert.equal(r('0045 C\nDMR • PT'), '45|dmr|pt');
  assert.equal(r('063 R\nLCI * EN'), '63|lci|en');
  assert.equal(r('12/2O9 C'), '12||', 'só número quando a edição não aparece');
  assert.equal(r('SLD • JP'), '|sld|ja');
  assert.equal(r(''), '||');
});

const PRINTS = [
  { set: 'mh2', collector_number: '267', set_name: 'Modern Horizons 2', id: 'a' },
  { set: 'dmr', collector_number: '45', set_name: 'Dominaria Remastered', id: 'b' },
  { set: 'tmp', collector_number: '57', set_name: 'Tempest', id: 'c' },
  { set: 'ema', collector_number: '45', set_name: 'Eternal Masters', id: 'd' }
];
test('X3 · casa a leitura com as impressões: exata, só número, ambígua e desconhecida', () => {
  assert.equal(X.resolvePrinting(PRINTS, { set: 'mh2', number: '267' }).exact.id, 'a');
  assert.equal(X.resolvePrinting(PRINTS, { set: '', number: '0057' }).exact.id, 'c', 'zeros à esquerda não atrapalham');
  const amb = X.resolvePrinting(PRINTS, { set: '', number: '45' });
  assert.equal(amb.exact, null);
  assert.deepEqual([...amb.candidates.map(c => c.set)], ['dmr', 'ema'], 'número repetido em duas edições: oferece as duas');
  assert.equal(X.resolvePrinting(PRINTS, { set: 'dmr', number: '999' }).exact.id, 'b', 'número ilegível, edição única');
  const none = X.resolvePrinting(PRINTS, { set: 'xyz', number: '' });
  assert.equal(none.exact, null); assert.equal(none.candidates.length, 0);
});

test('X3 · o lote separa impressões da mesma carta e corrigir a impressão funde com igual', async () => {
  const lot = X.createLot({ store: P.memoryStore() });
  await lot.add('Counterspell', 1, { set: 'mh2', number: '267', verified: true });
  await lot.add('Counterspell', 1, { set: 'mh2', number: '267', verified: true });
  const k = await lot.add('Counterspell');
  await lot.add('Counterspell', 1, { set: 'dmr', number: '45' });
  let list = JSON.parse(JSON.stringify(await lot.list()));
  assert.deepEqual(list.map(x => `${x.set || '-'}:${x.qty}`), ['mh2:2', '-:1', 'dmr:1']);
  await lot.rename(k, 'Counterspell', { set: 'mh2', number: '267' });
  list = JSON.parse(JSON.stringify(await lot.list()));
  assert.deepEqual(list.map(x => `${x.set || '-'}:${x.qty}`), ['mh2:3', 'dmr:1']);
  assert.equal(await lot.undo(), 'Counterspell');
  assert.equal(await lot.total(), 3);
});

/* ---------------- X7 · achar a carta no quadro, sem moldura ---------------- */
const QW = 80, QH = 110;
/** Quadro de teste: fundo liso e uma carta com textura dentro dele. */
function quadro({ x0 = 12, y0 = 10, larg = 56, alt = 78, fundo = 30, carta = 150, textura = 40, ruido = 0 } = {}) {
  const g = new Uint8ClampedArray(QW * QH).fill(fundo);
  for (let y = y0; y < Math.min(QH, y0 + alt); y++) {
    for (let x = x0; x < Math.min(QW, x0 + larg); x++) {
      g[y * QW + x] = carta + (textura ? (x * 7 + y * 13) % textura : 0);
    }
  }
  if (ruido) for (let i = 0; i < g.length; i++) g[i] = Math.max(0, Math.min(255, g[i] + ((i * 37) % ruido) - ruido / 2));
  return g;
}
const perto = (a, b, tol = 0.06) => Math.abs(a - b) <= tol;

test('X7 · acha a carta no meio do quadro e também deslocada, sem moldura', () => {
  const meio = X.detectaCarta(quadro(), QW, QH);
  assert.ok(meio, 'achou a carta');
  assert.equal(perto(meio.x, 12 / QW) && perto(meio.y, 10 / QH), true, 'no lugar certo');
  assert.equal(perto(meio.w, 56 / QW) && perto(meio.h, 78 / QH), true, 'do tamanho certo');

  const canto = X.detectaCarta(quadro({ x0: 4, y0: 4 }), QW, QH);
  assert.ok(canto, 'achou a carta deslocada para o canto');
  assert.equal(perto(canto.x, 4 / QW), true);

  const menor = X.detectaCarta(quadro({ x0: 20, y0: 20, larg: 40, alt: 56 }), QW, QH);
  assert.ok(menor, 'achou a carta mais afastada');
  assert.equal(perto(menor.w, 40 / QW), true);
});

test('X7 · não inventa carta: quadro liso, carta cortada e objeto quadrado dão nulo', () => {
  const liso = new Uint8ClampedArray(QW * QH).fill(120);
  assert.equal(X.detectaCarta(liso, QW, QH), null, 'quadro liso não tem carta');

  const cortada = quadro({ x0: 40, y0: 10, larg: 56, alt: 78 }); // metade fora do quadro
  const r = X.detectaCarta(cortada, QW, QH);
  assert.equal(r, null, 'carta cortada não conta como carta inteira');

  const quadrado = quadro({ x0: 15, y0: 20, larg: 50, alt: 50 });
  assert.equal(X.detectaCarta(quadrado, QW, QH), null, 'proporção errada não é carta');
});

test('X7 · brilho e nitidez medem o que prometem', () => {
  const claro = quadro(), escuro = quadro({ carta: 25, fundo: 10, textura: 8 });
  const rClaro = X.detectaCarta(claro, QW, QH);
  assert.equal(X.brilho(claro, QW, QH, rClaro) > 120, true, 'carta iluminada tem brilho alto');
  assert.equal(X.brilho(escuro, QW, QH, null) < 40, true, 'quadro escuro tem brilho baixo');

  const nitido = quadro({ textura: 60 }), borrado = quadro({ textura: 0 });
  const rn = X.detectaCarta(nitido, QW, QH);
  assert.equal(X.nitidez(nitido, QW, QH, rn) > X.nitidez(borrado, QW, QH, rn), true, 'textura nítida bate a lisa');
});

test('X7 · a instrução diz o que corrigir, uma coisa de cada vez', () => {
  const base = { carta: { x: 0.1, y: 0.1, w: 0.7, h: 0.7 }, brilho: 140, nitidez: 30, parada: true };
  assert.equal(X.prontoParaLer({ ...base, carta: null }).motivo, 'Mostre a carta inteira no quadro.');
  assert.match(X.prontoParaLer({ ...base, brilho: 20 }).motivo, /escuro/);
  assert.match(X.prontoParaLer({ ...base, brilho: 250 }).motivo, /reflexo/);
  assert.match(X.prontoParaLer({ ...base, nitidez: 2 }).motivo, /tremida/);
  assert.match(X.prontoParaLer({ ...base, parada: false }).motivo, /segure firme/i);
  const ok = X.prontoParaLer(base);
  assert.equal(ok.pronto, true);
  assert.match(ok.motivo, /Lendo/);
  for (const caso of [{ carta: null }, { brilho: 20 }, { nitidez: 2 }, { parada: false }])
    assert.equal(X.prontoParaLer({ ...base, ...caso }).pronto, false, 'qualquer problema impede a leitura');
});

test('X7 · o detector só dispara com a carta parada, e não lê a mesma carta duas vezes', () => {
  const det = X.criaDetector();
  const q = quadro();
  assert.equal(det.quadro(q, QW, QH).pronto, false, 'no primeiro quadro ainda não');
  assert.equal(det.quadro(q, QW, QH).pronto, false, 'no segundo também não');
  const terceiro = det.quadro(q, QW, QH);
  assert.equal(terceiro.pronto, true, 'com três quadros iguais, dispara');
  assert.ok(terceiro.carta, 'e devolve o contorno para desenhar na tela');

  // parada de novo no mesmo lugar: não conta de novo
  assert.equal(det.quadro(q, QW, QH).pronto, false, 'a mesma carta parada não entra duas vezes');
  assert.match(det.quadro(q, QW, QH).motivo, /próxima/);

  // carta se movendo não dispara
  const movel = X.criaDetector();
  movel.quadro(quadro({ x0: 8 }), QW, QH);
  movel.quadro(quadro({ x0: 12 }), QW, QH);
  const mexendo = movel.quadro(quadro({ x0: 16 }), QW, QH);
  assert.equal(mexendo.pronto, false, 'carta em movimento não dispara');
  assert.match(mexendo.motivo, /segure firme/i);

  // depois de rearmar, a próxima carta parada vale
  det.rearmar();
  det.quadro(q, QW, QH); det.quadro(q, QW, QH);
  assert.equal(det.quadro(q, QW, QH).pronto, true, 'rearmado, lê de novo');
});

test('X7 · decidir um quadro custa menos de 60 ms', () => {
  const det = X.criaDetector();
  const q = quadro({ ruido: 30 });
  det.quadro(q, QW, QH); // aquecimento
  const t0 = Date.now();
  for (let i = 0; i < 30; i++) det.quadro(q, QW, QH);
  const porQuadro = (Date.now() - t0) / 30;
  assert.equal(porQuadro < 60, true, `cada quadro levou ${porQuadro.toFixed(1)} ms`);
});

test('X7 · o contorno cai em cima da carta: ida e volta entre quadro e tela', () => {
  // vídeo 1280×720 mostrado em object-fit: cover num palco 390×520
  const elW = 390, elH = 520, vidW = 1280, vidH = 720;
  const naTela = { x: 40, y: 60, w: 200, h: 280 };
  const noQuadro = X.coverRegion(elW, elH, vidW, vidH, naTela);
  const volta = X.screenRect(elW, elH, vidW, vidH, noQuadro);
  for (const k of ['x', 'y', 'w', 'h']) assert.equal(Math.abs(volta[k] - naTela[k]) < 1, true, `${k} voltou ao mesmo lugar`);
});

/* ---------------- X8 · pilha de leitura ---------------- */
test('X8 · a pilha guarda confiança e miniatura, e a leitura mais recente manda', async () => {
  const lot = X.createLot({ store: P.memoryStore() });
  await lot.add('Sol Ring', 1, null, { score: 0.88, img: 'a.jpg' });
  let list = await lot.list();
  assert.equal(list[0].score, 0.88, 'guardou a confiança');
  assert.equal(list[0].img, 'a.jpg', 'guardou a miniatura');
  await lot.add('Sol Ring', 1, null, { score: 0.97, img: 'b.jpg' });
  list = await lot.list();
  assert.equal(list.length, 1, 'a mesma carta continua sendo uma linha');
  assert.equal(list[0].qty, 2, 'somou a quantidade');
  assert.equal(list[0].score, 0.97, 'a leitura mais recente é a que a pilha mostra');
  assert.equal(list[0].img, 'b.jpg');
});

test('X8 · dá para tirar uma leitura do meio da pilha sem mexer nas outras', async () => {
  const lot = X.createLot({ store: P.memoryStore() });
  const k1 = await lot.add('Sol Ring', 2);
  const k2 = await lot.add('Island', 1);
  const k3 = await lot.add('Counterspell', 3);
  const saiu = await lot.remove(k2);
  assert.equal(saiu, 'Island', 'devolve o nome de quem saiu');
  const list = await lot.list();
  assert.deepEqual(JSON.parse(JSON.stringify(list.map(x => x.name))), ['Sol Ring', 'Counterspell'], 'as outras ficam onde estavam');
  assert.equal(await lot.total(), 5, 'o total desconta as cópias da carta removida');
  // e desfazer não ressuscita o que foi removido
  const desfeito = await lot.undo();
  assert.equal(desfeito, 'Counterspell', 'o desfazer segue na última leitura viva');
  assert.equal(await lot.remove('chave-que-nao-existe'), null, 'remover o que não existe não quebra');
  assert.equal(k1 !== k3, true);
});

test('X8 · o resumo da pilha conta itens, cópias e quantas têm edição', async () => {
  const lot = X.createLot({ store: P.memoryStore() });
  await lot.add('Sol Ring', 2, { set: 'mh2', number: '267' });
  await lot.add('Island', 3);
  const r = await lot.resumo();
  assert.deepEqual(JSON.parse(JSON.stringify(r)), { itens: 2, total: 5, comEdicao: 1, semEdicao: 1, conferir: 0 });
  assert.deepEqual(JSON.parse(JSON.stringify(await X.createLot({ store: P.memoryStore() }).resumo())), { itens: 0, total: 0, comEdicao: 0, semEdicao: 0, conferir: 0 });
});

test('X8 · a pilha sobrevive a fechar o app', async () => {
  const store = P.memoryStore();
  const lot = X.createLot({ store });
  await lot.add('Sol Ring', 2, null, { score: 0.9, img: 'x.jpg' });
  await lot.add('Island', 1);
  const volta = X.createLot({ store });
  const list = await volta.list();
  assert.equal(list.length, 2, 'as duas leituras voltaram');
  assert.equal(list[0].score, 0.9, 'com a confiança');
  assert.equal(list[0].img, 'x.jpg', 'e com a miniatura');
  assert.equal(await volta.total(), 3);
});

/* ---------------- X9 · validação ágil ---------------- */
test('X9 · confiança alta entra confirmada; a mediana fica marcada para conferir, com alternativas', async () => {
  const lot = X.createLot({ store: P.memoryStore() });
  await lot.add('Sol Ring', 1, null, { score: 0.97 });
  await lot.add('Island', 1, null, { score: 0.85, alternativas: ['Islet', 'Isolate', 'Isamaru', 'Ignorada'] });
  const [ring, ilha] = await lot.list();
  assert.equal(ring.conferir, false, 'acima do limiar alto, entra confirmada');
  assert.equal(ilha.conferir, true, 'entre os dois limiares, pede conferência');
  assert.deepEqual(JSON.parse(JSON.stringify(ilha.alternativas)), ['Islet', 'Isolate', 'Isamaru'], 'até três alternativas ficam no item');
  assert.equal((await lot.resumo()).conferir, 1, 'o resumo diz quantas faltam conferir');
  assert.equal(X.ALTA > X.ACCEPT, true, 'o limiar alto fica acima do de aceite');
});

test('X9 · confirmar e corrigir tiram a marca; a leitura só sai conferida pela sua mão', async () => {
  const lot = X.createLot({ store: P.memoryStore() });
  const k1 = await lot.add('Island', 1, null, { score: 0.85, alternativas: ['Islet'] });
  const k2 = await lot.add('Forest', 1, null, { score: 0.86, alternativas: ['Fores'] });
  assert.equal(await lot.confirmar(k1), 'Island');
  let list = await lot.list();
  assert.equal(list[0].conferir, undefined, 'confirmada: sem marca');
  assert.equal(list[0].alternativas, undefined, 'e sem alternativas sobrando');
  await lot.rename(k2, 'Plains');
  list = await lot.list();
  const plains = list.find(x => x.name === 'Plains');
  assert.ok(plains, 'corrigiu o nome');
  assert.equal(plains.conferir, undefined, 'corrigir também confirma');
  assert.equal((await lot.resumo()).conferir, 0);
  assert.equal(await lot.confirmar('nada'), null, 'confirmar o que não existe não quebra');
  // leitura nova da mesma carta, com confiança baixa, volta a pedir conferência
  await lot.add('Island', 1, null, { score: 0.84, alternativas: ['Islet'] });
  assert.equal((await lot.list()).find(x => x.name === 'Island').conferir, true, 'a leitura mais recente manda na marca');
  // corrigir escolhendo o mesmo nome também é conferir (o nome passou pela mão do usuário)
  assert.equal(await lot.rename(k1, 'Island'), k1, 'mesmo nome devolve a mesma chave');
  const island = (await lot.list()).find(x => x.name === 'Island');
  assert.equal(island.conferir, undefined, 'a marca sai');
  assert.equal(island.qty, 2, 'sem duplicar nem perder cópias');
});

/* ---------------- X10 · o que o OCR recebe (medido em fotos, provado aqui) ---------------- */
/** Faixa RGBA sintética: fundo uniforme com um "texto" (bloco) de outra cor. */
function faixa(w, h, { fundo = 240, texto = 10, bloco = { x: 4, y: 4, w: 6, h: 4 }, linhaTopo = 0, degrade = 0 } = {}) {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = typeof fundo === 'function' ? fundo(x, y) : fundo;
    if (degrade) v = Math.max(0, Math.min(255, v + (x / w) * degrade));
    if (x >= bloco.x && x < bloco.x + bloco.w && y >= bloco.y && y < bloco.y + bloco.h) v = texto;
    if (y < linhaTopo) v = 0;
    const i = (y * w + x) * 4; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
  }
  return d;
}
const cinzaEm = (d, w, x, y) => d[(y * w + x) * 4];

test('X10 · escala do OCR sai da altura da carta: amplia carta pequena, não encolhe carta grande', () => {
  assert.equal(X.escalaOcr(3000), 1, 'carta já grande: sem ampliar');
  assert.ok(Math.abs(X.escalaOcr(700) - 2000 / 700) < 1e-9, 'carta de 700 px vai para 2000');
  assert.equal(X.escalaOcr(100), 4, 'teto de 4× para não estourar o canvas');
  assert.equal(X.escalaOcr(0), 1, 'sem carta: escala neutra');
  const r = X.faixaDaCarta({ x: 100, y: 50, w: 200, h: 300 }, { x: 0.1, y: 0.5, w: 0.5, h: 0.2 });
  assert.deepEqual(JSON.parse(JSON.stringify(r)), { x: 120, y: 200, w: 100, h: 60 });
  // as faixas passam da borda de propósito (o detector prende ora na borda, ora na moldura interna)
  assert.ok(X.NAME_BAND.y <= 0 && X.NAME_BAND.h >= 0.1, 'faixa do nome começa na borda de cima');
  assert.ok(X.COLLECTOR_BAND.y + X.COLLECTOR_BAND.h > 1, 'faixa da linha de coleção passa da borda de baixo');
});

test('X10 · níveis automáticos: foto escura e foto estourada viram texto preto sobre branco', () => {
  const w = 20, h = 10;
  const escura = X.realcaTexto(faixa(w, h, { fundo: 70, texto: 25 }));
  assert.equal(cinzaEm(escura, w, 0, 0), 255, 'fundo escuro vira branco');
  assert.equal(cinzaEm(escura, w, 5, 5), 0, 'texto vira preto');
  const clara = X.realcaTexto(faixa(w, h, { fundo: 250, texto: 200 }));
  assert.equal(cinzaEm(clara, w, 0, 0), 255); assert.equal(cinzaEm(clara, w, 5, 5), 0, 'mesmo com pouco contraste');
  const inv = X.realcaTexto(faixa(w, h, { fundo: 10, texto: 240 }), { inverter: true });
  assert.equal(cinzaEm(inv, w, 0, 0), 255, 'invertido: fundo preto vira branco');
  assert.equal(cinzaEm(inv, w, 5, 5), 0, 'e o texto branco vira preto');
  const lisa = X.realcaTexto(faixa(w, h, { fundo: 128, texto: 128 }));
  assert.ok(cinzaEm(lisa, w, 0, 0) >= 0 && cinzaEm(lisa, w, 0, 0) <= 255, 'faixa lisa não quebra (faixa mínima de 40 níveis)');
});

test('X10 · aplanar o fundo tira reflexo em degradê e deixa só o texto', () => {
  const w = 60, h = 20;
  const d = faixa(w, h, { fundo: 120, texto: 250, bloco: { x: 6, y: 8, w: 8, h: 5 }, degrade: 120 });
  X.realcaTexto(d, { inverter: true, w, h });
  assert.ok(cinzaEm(d, w, 2, 2) >= 200 && cinzaEm(d, w, 55, 15) >= 200, 'fundo em degradê vira claro nos dois lados');
  assert.ok(cinzaEm(d, w, 9, 10) <= 60, 'texto fica escuro');
});

test('X10 · trecho escuro de baixo: acha a borda preta, tolera reflexo e ignora faixa sem borda', () => {
  const w = 40, h = 50;
  const claroEmCima = (x, y) => (y < 25 ? 220 : 20);
  const t = X.trechoEscuroEmbaixo(faixa(w, h, { fundo: claroEmCima, texto: 20, bloco: { x: 0, y: 0, w: 0, h: 0 } }), w, h);
  assert.ok(t, 'achou o trecho');
  assert.ok(t.y0 >= 25 && t.y0 <= 27 && t.y1 === h - 1, `começa logo abaixo da transição (${t.y0}) e vai até o fim`);
  const comReflexo = (x, y) => (y < 25 ? 230 : 130);   // borda clareada pelo reflexo
  const r = X.trechoEscuroEmbaixo(faixa(w, h, { fundo: comReflexo, bloco: { x: 0, y: 0, w: 0, h: 0 } }), w, h);
  assert.ok(r && r.y0 >= 25, 'limiar sobe quando o rodapé é claramente mais escuro que o topo');
  assert.equal(X.trechoEscuroEmbaixo(faixa(w, h, { fundo: 230, bloco: { x: 0, y: 0, w: 0, h: 0 } }), w, h), null, 'faixa toda clara: nada a recortar');
  const curto = (x, y) => (y < 46 ? 220 : 20);
  assert.equal(X.trechoEscuroEmbaixo(faixa(w, h, { fundo: curto, bloco: { x: 0, y: 0, w: 0, h: 0 } }), w, h), null, 'escuro curto demais não é borda');
});

test('X10 · limpar bordas apaga linha da moldura colada na margem e preserva o texto solto', () => {
  const w = 40, h = 20;
  const d = X.limpaBordas(faixa(w, h, { fundo: 255, texto: 0, bloco: { x: 10, y: 8, w: 8, h: 5 }, linhaTopo: 3 }), w, h);
  assert.equal(cinzaEm(d, w, 20, 1), 255, 'a linha preta do topo sumiu');
  assert.equal(cinzaEm(d, w, 12, 10), 0, 'o texto (que não encosta na margem) continua');
  // fundo cinza escuro conectado à margem também vira branco (é fundo, não texto)
  const g = X.limpaBordas(faixa(w, h, { fundo: 150, texto: 0 }), w, h);
  assert.equal(cinzaEm(g, w, 0, 0), 255);
  assert.equal(cinzaEm(g, w, 5, 5), 255, 'texto cercado por fundo escuro conectado à margem vai junto: por isso a faixa é aplanada antes');
});

test('X10 · tratar a faixa da linha de coleção recorta a borda, inverte e devolve texto preto sobre branco', () => {
  const w = 60, h = 40;
  const fundo = (x, y) => (y < 20 ? 225 : 15);                       // moldura clara em cima, borda preta embaixo
  const d = faixa(w, h, { fundo, texto: 245, bloco: { x: 8, y: 26, w: 10, h: 6 } });
  const t = X.trataFaixa(d, w, h, 'collector');
  assert.equal(t.w, w);
  assert.ok(t.h < h && t.h >= 20, `só a borda, com margem (${t.h})`);
  let pretos = 0, brancos = 0;
  for (let i = 0; i < t.data.length; i += 4) { if (t.data[i] < 40) pretos++; else if (t.data[i] > 215) brancos++; }
  assert.ok(pretos >= 40 && pretos <= 90, `o texto virou preto (${pretos} px)`);
  assert.ok(brancos > t.w * t.h * 0.85, 'o resto é branco');
  // faixa do nome: sem recorte nem inversão
  const n = X.trataFaixa(faixa(w, h, { fundo: 240, texto: 10 }), w, h, 'name');
  assert.equal(n.h, h); assert.equal(cinzaEm(n.data, w, 5, 5), 0); assert.equal(cinzaEm(n.data, w, 30, 30), 255);
});

test('X10 · detector em duas escalas: a primeira que acha manda; sem carta, devolve o primeiro quadro', () => {
  const vazio = { cinza: new Uint8ClampedArray(QW * QH).fill(30), w: QW, h: QH };
  const comCarta = { cinza: quadro(), w: QW, h: QH };
  const r = X.detectaEmEscalas([vazio, comCarta]);
  assert.ok(r.carta, 'achou na segunda escala');
  assert.equal(r.quadro, comCarta, 'e devolve o quadro em que achou');
  const nada = X.detectaEmEscalas([vazio, vazio]);
  assert.equal(nada.carta, null); assert.equal(nada.quadro, vazio);
  assert.deepEqual(JSON.parse(JSON.stringify(X.ESCALAS_DETECTOR)), [80, 120]);
  // o detector de estabilidade aceita a lista de escalas
  const det = X.criaDetector({ quadros: 1 });
  assert.ok(det.quadro([vazio, comCarta]).carta, 'quadro() com lista');
  assert.ok(det.quadro(comCarta.cinza, QW, QH).carta, 'e ainda com (cinza, w, h)');
});

/* ---------------- Leva 109 · scanner automático de verdade ---------------- */
test('Leva 109 · texto esparso do quadro inteiro: cada linha é casada e a melhor vence', () => {
  const r = X.matchLines(INDEX, 'Creature - Human\nS0l Rinq @®\n123/281 R\nArtifact');
  assert.equal(r[0].name, 'Sol Ring');
  assert.ok(r[0].score >= X.ACCEPT, 'a linha do nome dá a nota');
  assert.deepEqual(JSON.parse(JSON.stringify(X.matchLines(INDEX, ''))), []);
  assert.deepEqual(JSON.parse(JSON.stringify(X.matchLines(INDEX, 'ab\n\n1'))), [], 'linhas curtas não sugerem nada');
  // a linha certa vence mesmo depois de uma linha que casa fraco com outro nome
  assert.equal(X.matchLines(INDEX, 'Islandwalk Rangr\nCounterspell')[0].name, 'Counterspell');
});

test('Leva 109 · votos: leitura exata entra na hora; aproximada precisa de duas seguidas iguais; quadro vazio zera', () => {
  const v = X.criaVotacao();
  assert.equal(v.voto([{ name: 'Sol Ring', score: 1 }]), 'Sol Ring', 'exata entra de primeira');
  assert.equal(v.voto([{ name: 'Counterspell', score: 0.86 }]), null, 'aproximada espera a segunda');
  assert.equal(v.voto([{ name: 'Counterspell', score: 0.84 }]), 'Counterspell', 'duas seguidas iguais');
  assert.equal(v.voto([{ name: 'Island', score: 0.85 }]), null);
  assert.equal(v.voto([]), null, 'quadro vazio');
  assert.equal(v.voto([{ name: 'Island', score: 0.85 }]), null, 'o vazio zerou a contagem');
  assert.equal(v.voto([{ name: 'Island', score: 0.85 }]), 'Island');
  assert.equal(v.voto([{ name: 'Ponder', score: 0.7 }]), null, 'abaixo do aceite não vota');
  assert.equal(v.voto([{ name: 'Ponder', score: 0.7 }]), null);
  // o mesmo nome aceito continua sendo devolvido: quem decide "não somar de novo" é o lote
  assert.equal(v.voto([{ name: 'Island', score: 0.9 }]), null);
  assert.equal(v.voto([{ name: 'Island', score: 0.9 }]), 'Island');
});

test('Leva 109 · a pilha recebe a edição e a miniatura depois, sem perder a confiança nem a quantidade', async () => {
  const store = P.memoryStore();
  const lot = X.createLot({ store });
  const key = await lot.add('Sol Ring', 1, null, { score: 0.9, alternativas: ['Soul Ring'] });
  await lot.setQty(key, 2);
  const nova = await lot.enrich(key, { printing: { set: 'cmm', number: '400', set_name: 'Commander Masters', id: 'x', verified: true }, img: 'https://i/sol.jpg' });
  const [item] = await lot.list();
  assert.equal(item.key, nova, 'a chave passa a incluir a edição');
  assert.deepEqual([item.qty, item.score, item.set, item.img, item.conferir], [2, 0.9, 'cmm', 'https://i/sol.jpg', true]);
  assert.equal(await lot.enrich('nao-existe', { img: 'x' }), null, 'item que saiu da pilha: nada a fazer');
  // enriquecer com uma edição que já existe na pilha funde as duas
  const outra = await lot.add('Sol Ring', 1, { set: 'cmm', number: '400' });
  assert.equal(outra, nova);
  assert.equal((await lot.list()).length, 1); assert.equal((await lot.list())[0].qty, 3);
});

test('Leva 109 · diário do scanner: guarda as últimas leituras, com tempo e decisão, e vira texto para copiar', () => {
  const d = X.criaDiario({ maximo: 3, agora: (() => { let t = 1000; return () => (t += 250); })() });
  d.anota({ via: 'carta', texto: 'S0l Rinq', melhor: { name: 'Sol Ring', score: 0.86 }, ms: 310, decisao: 'espera' });
  d.anota({ via: 'quadro', texto: '', melhor: null, ms: 900, decisao: 'nada' });
  d.anota({ via: 'carta', texto: 'Sol Ring', melhor: { name: 'Sol Ring', score: 1 }, ms: 280, decisao: 'Sol Ring +1' });
  d.anota({ via: 'carta', texto: 'Island', melhor: { name: 'Island', score: 1 }, ms: 260, decisao: 'Island +1' });
  assert.equal(d.lista().length, 3, 'só as últimas');
  assert.equal(d.lista()[0].texto, 'Island', 'a mais recente primeiro');
  const txt = d.texto({ aparelho: 'teste', video: '1280×720' });
  assert.match(txt, /aparelho: teste/); assert.match(txt, /1280×720/);
  assert.match(txt, /carta · 280 ms · "Sol Ring" → Sol Ring 100% · Sol Ring \+1/);
  assert.match(txt, /quadro · 900 ms · "" → — · nada/);
});
