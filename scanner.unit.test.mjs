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

// Leva 112 · o porteiro: nunca registrar errado; a mesma carta não entra duas vezes seguidas
test('Leva 112 · porteiro: exata entra na 2ª leitura igual, aproximada na 3ª; nome trocado zera a contagem', () => {
  let t = 0; const p = X.criaPorteiro({ agora: () => t });
  const ex = n => [{ name: n, score: 1 }], ap = n => [{ name: n, score: 0.88 }];
  assert.equal(p.voto(ex('Sol Ring')).aceito, null, 'uma leitura exata sozinha não entra (antes: entrava na hora)');
  assert.equal(p.voto(ex('Sol Ring')).aceito, 'Sol Ring');
  t += 5000; p.voto([]); p.voto([]); p.voto([]);
  assert.equal(p.voto(ap('Counterspell')).aceito, null); assert.equal(p.voto(ap('Counterspell')).aceito, null);
  assert.equal(p.voto(ap('Counterspell')).aceito, 'Counterspell', 'aproximada: três seguidas');
  t += 5000; p.voto([]); p.voto([]); p.voto([]);
  p.voto(ap('Island')); p.voto(ap('Islandwalk Ranger'));
  assert.equal(p.voto(ap('Island')).aceito, null, 'nome que pula entre dois não acumula');
});

test('Leva 112 · porteiro: candidatos colados são ambíguos e nunca entram; leitura fraca não entra', () => {
  const p = X.criaPorteiro({ agora: () => 0 });
  const amb = [{ name: 'Soul Ring', score: 0.9 }, { name: 'Sol Ring', score: 0.87 }];
  for (let i = 0; i < 6; i++) { const v = p.voto(amb); assert.equal(v.aceito, null); assert.equal(v.motivo, 'ambígua'); }
  for (let i = 0; i < 6; i++) assert.equal(p.voto([{ name: 'Sol Ring', score: 0.7 }]).aceito, null, 'abaixo do aceite');
});

test('Leva 112 · porteiro: a mesma carta parada não entra de novo; sai do quadro e passa o tempo, entra; toque soma outra', () => {
  let t = 0; const p = X.criaPorteiro({ agora: () => t });
  const ex = [{ name: 'Sol Ring', score: 1 }];
  p.voto(ex); assert.equal(p.voto(ex).aceito, 'Sol Ring');
  for (let i = 0; i < 10; i++) { t += 100; assert.equal(p.voto(ex).aceito, null, 'carta parada: frações de segundo depois não repete'); }
  for (let i = 0; i < 10; i++) { t += 2000; assert.equal(p.voto(ex).aceito, null, 'parada há muito tempo também não: precisa sair do quadro'); }
  t = 100000; const base = t;
  assert.equal(p.voto(ex).motivo, 'repetida');
  // aceita de novo depois de sair e voltar (base do cooldown)
  p.voto([]); p.voto([]); p.voto([]); p.voto(ex); assert.equal(p.voto(ex).aceito, 'Sol Ring');
  p.voto([]); p.voto([]); p.voto([]);           // saiu do quadro
  t = base + 100; p.voto(ex); assert.equal(p.voto(ex).aceito, null, 'voltou rápido demais (cooldown)');
  t += 3000; p.voto([]); p.voto([]); p.voto([]); p.voto(ex);
  assert.equal(p.voto(ex).aceito, 'Sol Ring', 'saiu, passou o tempo e voltou: é outra cópia');
  assert.equal(p.maisUma(), 'Sol Ring', 'toque na tela: a mesma de novo, por vontade da pessoa');
});

test('Leva 112 · nitidez da faixa separa texto nítido de borrado, sem depender da luz; movimento mede a diferença', () => {
  const w = 120, h = 30;
  const faz = (borra, luz = 1) => { const d = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let v = ((Math.floor(x / 3) + Math.floor(y / 5)) % 2) ? 230 : 30;
      if (borra) v = 130 + 100 * Math.sin(x / 6) * Math.cos(y / 6) * 0.4; const i = (y * w + x) * 4; d[i] = d[i + 1] = d[i + 2] = v * luz; d[i + 3] = 255; }
    return d; };
  const nitida = X.nitidezDaFaixa(faz(false), w, h), escura = X.nitidezDaFaixa(faz(false, 0.4), w, h), borrada = X.nitidezDaFaixa(faz(true), w, h);
  assert.ok(nitida > X.LIMIARES_FAIXA.nitidezMin * 3, 'nítida: ' + nitida);
  assert.ok(escura > X.LIMIARES_FAIXA.nitidezMin * 3, 'nítida no escuro também: ' + escura);
  assert.ok(borrada < X.LIMIARES_FAIXA.nitidezMin, 'borrada: ' + borrada);
  const a = new Uint8ClampedArray(100).fill(100), b = new Uint8ClampedArray(100).fill(130);
  assert.equal(X.movimentoEntre(a, a), 0); assert.equal(X.movimentoEntre(a, b), 30); assert.equal(X.movimentoEntre(null, a), 255, 'sem quadro anterior conta como movimento');
});

// Leva 112 · o porteiro: nunca registrar errado, nunca repetir a carta parada, toque soma outra.
test('Leva 112 · porteiro: exata precisa de 2 iguais, aproximada de 3; quadro sem nome zera a sequência', () => {
  let t = 0; const P = X.criaPorteiro({ agora: () => t });
  const exata = [{ name: 'Sol Ring', score: 1 }], aprox = [{ name: 'Counterspell', score: 0.86 }];
  assert.equal(P.voto(exata).aceito, null, 'uma exata sozinha não basta (antes: entrava na hora)');
  assert.equal(P.voto(exata).aceito, 'Sol Ring');
  t += 5000; for (let i = 0; i < 3; i++) P.voto([]);
  assert.equal(P.voto(aprox).aceito, null); assert.equal(P.voto(aprox).aceito, null);
  assert.equal(P.voto([]).aceito, null, 'quadro vazio no meio');
  assert.equal(P.voto(aprox).aceito, null); assert.equal(P.voto(aprox).aceito, null);
  assert.equal(P.voto(aprox).aceito, 'Counterspell', 'três seguidas iguais');
});

test('Leva 112 · porteiro: leitura ambígua (dois nomes colados) nunca entra; nome alternando nunca soma', () => {
  const P = X.criaPorteiro({ agora: () => 0 });
  const amb = [{ name: 'Sol Ring', score: 0.88 }, { name: 'Soul Ring', score: 0.86 }];
  for (let i = 0; i < 6; i++) assert.equal(P.voto(amb).motivo, 'ambígua');
  const a = [{ name: 'Ponder', score: 0.9 }], b = [{ name: 'Preordain', score: 0.9 }];
  for (let i = 0; i < 6; i++) assert.equal(P.voto(i % 2 ? a : b).aceito, null, 'carta mal posicionada lida de um jeito e de outro: nada');
});

test('Leva 112 · porteiro: a mesma carta parada não entra de novo; sai do quadro e passa o tempo, entra; toque soma na hora', () => {
  let t = 0; const P = X.criaPorteiro({ agora: () => t });
  const sol = [{ name: 'Sol Ring', score: 1 }];
  P.voto(sol); assert.equal(P.voto(sol).aceito, 'Sol Ring');
  for (let i = 0; i < 10; i++) { t += 300; assert.notEqual(P.voto(sol).aceito, 'Sol Ring', 'parada no quadro: não repete'); }
  for (let i = 0; i < 3; i++) P.voto([]);  // saiu do quadro
  t += 100; P.voto(sol); assert.equal(P.voto(sol).aceito, 'Sol Ring', 'trocou por outra cópia: entra');
  assert.equal(P.maisUma(), 'Sol Ring', 'toque na tela soma outra');
  // saiu e voltou rápido demais (dentro do cooldown): não repete, evita a mesma carta 2x em fração de segundo
  for (let i = 0; i < 3; i++) P.voto([]);
  P.voto(sol); assert.equal(P.voto(sol).aceito, null);
});

test('Leva 112 · nitidez da faixa separa texto nítido de borrado, sem depender da luz; movimento mede a diferença', () => {
  const w = 120, h = 30;
  const faixa = (borrada, escura) => { const d = new Uint8ClampedArray(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = ((x >> 2) % 2 && y > 8 && y < 22) ? 20 : 230;
    if (escura) v = v * 0.4; const i = (y * w + x) * 4; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
    if (borrada) for (let k = 0; k < 3; k++) caixa(d, 4); // desfoque de câmera: três passadas de média 9×9 ≈ gaussiana
    return d; };
  const caixa = (d, r) => { const s = Float64Array.from({ length: w * h }, (_, p) => d[p * 4]); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let soma = 0, n = 0;
    for (let yy = Math.max(0, y - r); yy <= Math.min(h - 1, y + r); yy++) for (let xx = Math.max(0, x - r); xx <= Math.min(w - 1, x + r); xx++) { soma += s[yy * w + xx]; n++; }
    const i = (y * w + x) * 4; d[i] = d[i + 1] = d[i + 2] = soma / n; } };
  const nit = X.nitidezDaFaixa(faixa(false, false), w, h), nitEscura = X.nitidezDaFaixa(faixa(false, true), w, h), bor = X.nitidezDaFaixa(faixa(true, false), w, h);
  assert.ok(nit > X.LIMIARES_FAIXA.nitidezMin * 3, 'nítida passa com folga: ' + nit);
  assert.ok(nitEscura > X.LIMIARES_FAIXA.nitidezMin * 3, 'nítida escura também: ' + nitEscura);
  assert.ok(bor < X.LIMIARES_FAIXA.nitidezMin, 'borrada fica de fora: ' + bor);
  const a = new Uint8ClampedArray(100).fill(100), b = new Uint8ClampedArray(100).fill(130);
  assert.equal(X.movimentoEntre(a, a), 0); assert.equal(X.movimentoEntre(a, b), 30); assert.equal(X.movimentoEntre(null, a), 255);
});

/* ---------------- X11 · contorno da carta, retificação e linha do nome ---------------- */
/** Quadro em tons de cinza com uma "carta" (retângulo 63×88 girado) e, dentro dela, a caixa da arte. */
function quadroComCarta({ w = 240, h = 320, cx = 0.5, cy = 0.5, alt = 0.6, rot = 0, fundo = 60, carta = 200, arte = true, ruido = 0 } = {}) {
  const g = new Uint8ClampedArray(w * h).fill(fundo);
  const H = h * alt, W = H * 63 / 88, c = Math.cos(rot * Math.PI / 180), s = Math.sin(rot * Math.PI / 180);
  let seed = 5; const rnd = () => (seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = x - w * cx, dy = y - h * cy, u = (dx * c + dy * s) / W + 0.5, v = (-dx * s + dy * c) / H + 0.5;
    let p = fundo;
    if (u >= 0 && u <= 1 && v >= 0 && v <= 1) { p = carta; if (arte && u > 0.08 && u < 0.92 && v > 0.12 && v < 0.55) p = 110; }
    g[y * w + x] = Math.max(0, Math.min(255, p + (ruido ? (rnd() - 0.5) * ruido : 0)));
  }
  const canto = (u, v) => ({ x: cx + ((u - 0.5) * W * c - (v - 0.5) * H * s) / w, y: cy + ((u - 0.5) * W * s + (v - 0.5) * H * c) / h });
  return { g, w, h, cantos: [canto(0, 0), canto(1, 0), canto(1, 1), canto(0, 1)] };
}
const distCantos = (a, b) => Math.max(...a.map((p, i) => Math.hypot(p.x - b[i].x, p.y - b[i].y)));

test('X11 · contorno: acha os quatro cantos da carta reta, inclinada e fora do centro, na ordem TE, TD, BD, BE', () => {
  for (const o of [{ rot: 0 }, { rot: 14 }, { rot: -11 }, { rot: 8, cx: 0.42, cy: 0.44, alt: 0.5 }, { rot: -6, fundo: 215, carta: 40 }]) {
    const q = quadroComCarta(o), r = X.achaQuadrilatero(q.g, q.w, q.h);
    assert.ok(r, 'achou: ' + JSON.stringify(o));
    assert.ok(distCantos(r.cantos, q.cantos) < 0.025, `cantos no lugar (${JSON.stringify(o)}): erro ${distCantos(r.cantos, q.cantos).toFixed(3)}`);
    assert.ok(Math.abs(r.proporcao - 63 / 88) < 0.05);
  }
});

test('X11 · contorno: a caixa da arte e meia carta não ganham da carta inteira; quadrado e quadro vazio não são carta', () => {
  const q = quadroComCarta({ rot: 5 }), r = X.achaQuadrilatero(q.g, q.w, q.h);
  assert.ok(r.area > 0.2, 'a carta inteira, não a arte: área ' + r.area.toFixed(2));
  const vazio = new Uint8ClampedArray(240 * 320).fill(90);
  assert.equal(X.achaQuadrilatero(vazio, 240, 320), null, 'quadro liso');
  const quad = new Uint8ClampedArray(240 * 320).fill(50);
  for (let y = 100; y < 220; y++) for (let x = 60; x < 180; x++) quad[y * 240 + x] = 210;
  assert.equal(X.achaQuadrilatero(quad, 240, 320), null, 'objeto quadrado');
  // carta cortada pela borda do quadro: sem as quatro bordas, não é contorno
  const cortada = quadroComCarta({ cy: 0.12, arte: false });
  assert.equal(X.achaQuadrilatero(cortada.g, cortada.w, cortada.h), null, 'carta cortada');
});

test('X11 · contorno: com ruído de câmera continua achando, e custa menos de 25 ms por quadro', () => {
  const q = quadroComCarta({ rot: 9, ruido: 30 });
  assert.ok(distCantos(X.achaQuadrilatero(q.g, q.w, q.h).cantos, q.cantos) < 0.03);
  const t0 = performance.now(); for (let i = 0; i < 20; i++) X.achaQuadrilatero(q.g, q.w, q.h);
  const ms = (performance.now() - t0) / 20;
  assert.ok(ms < 25, `detector lento: ${ms.toFixed(1)} ms`);
});

test('X11 · homografia e retificação: endireitam uma carta inclinada e levam cada canto ao seu lugar', () => {
  const cantos = [{ x: 30, y: 20 }, { x: 150, y: 40 }, { x: 140, y: 190 }, { x: 15, y: 170 }];
  const H = X.homografia(cantos);
  [[0, 0, 0], [1, 0, 1], [1, 1, 2], [0, 1, 3]].forEach(([u, v, i]) => { const p = H(u, v); assert.ok(Math.hypot(p.x - cantos[i].x, p.y - cantos[i].y) < 1e-6); });
  // imagem: metade de cima da "carta" (no espaço da carta) clara, metade de baixo escura; fora, cinza
  const w = 180, h = 210, src = new Uint8ClampedArray(w * h * 4).fill(128);
  const inv = (x, y) => { let u = 0.5, v = 0.5; for (let k = 0; k < 30; k++) { const p = H(u, v), a = H(u + 1e-3, v), b = H(u, v + 1e-3); const j11 = (a.x - p.x) / 1e-3, j21 = (a.y - p.y) / 1e-3, j12 = (b.x - p.x) / 1e-3, j22 = (b.y - p.y) / 1e-3, det = j11 * j22 - j12 * j21; const ex = x - p.x, ey = y - p.y; u += (j22 * ex - j12 * ey) / det; v += (-j21 * ex + j11 * ey) / det; } return [u, v]; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [u, v] = inv(x, y); if (u >= 0 && u <= 1 && v >= 0 && v <= 1) { const c = v < 0.5 ? 230 : 30; src[(y * w + x) * 4] = src[(y * w + x) * 4 + 1] = src[(y * w + x) * 4 + 2] = c; } }
  const r = X.retifica(src, w, h, cantos, 60, 80);
  assert.ok(r.data[(10 * 60 + 30) * 4] > 200, 'topo claro'); assert.ok(r.data[(70 * 60 + 30) * 4] < 60, 'base escura');
  assert.ok(r.data[(20 * 60 + 3) * 4] > 200 && r.data[(20 * 60 + 56) * 4] > 200, 'de borda a borda, sem o cinza de fora');
  // faixa da carta que passa da borda (y negativo) sai do lado de fora, sem estourar
  const f = X.cantosDaFaixa(cantos, { x: 0, y: -0.1, w: 1, h: 0.2 });
  assert.ok(f[0].y < cantos[0].y && f[3].y > cantos[0].y);
});

/** Faixa RGBA com uma barra de título (clara), "texto" escuro nela, linhas da moldura e arte embaixo. */
function faixaComTitulo({ w = 400, h = 140, y0 = 50, y1 = 78, claroNoEscuro = false, arte = true } = {}) {
  const d = new Uint8ClampedArray(w * h * 4);
  const fundo = claroNoEscuro ? 40 : 215, tinta = claroNoEscuro ? 230 : 25;
  const set = (x, y, v) => { const i = (y * w + x) * 4; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; };
  let seed = 3; const rnd = () => (seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let v = y < 20 ? 15 : fundo;                                       // borda preta em cima, depois a barra
    if (y === 38 || y === 92) v = 20;                                  // linhas da barra do título, de lado a lado
    if (arte && y > 96) v = 60 + ((x * 7 + y * 13) % 97) + rnd() * 40;  // arte: detalhe em todo lugar
    set(x, y, v);
  }
  for (let k = 0; k < 14; k++) for (let y = y0; y < y1; y++) for (let x = 30 + k * 16; x < 30 + k * 16 + 6; x++) set(x, y, tinta);  // "letras": traços verticais
  return { d, w, h };
}
test('X11 · linha do nome: acha o texto entre as linhas calmas da barra, e não a arte nem a borda', () => {
  const f = faixaComTitulo(), L = X.linhaDoNome(f.d, f.w, f.h);
  assert.ok(L.y0 >= 40 && L.y0 <= 54 && L.y1 >= 74 && L.y1 <= 90, `linha em ${L.y0}–${L.y1} (texto em 50–78)`);
  assert.ok(L.nota > 0);
  // a mesma barra em outra altura da faixa: a linha acompanha
  const g = faixaComTitulo({ y0: 60, y1: 86 }), L2 = X.linhaDoNome(g.d, g.w, g.h);
  assert.ok(L2.y0 >= 50 && L2.y1 <= 92 && L2.y1 >= 82);
});

test('X11 · binarizar a linha: texto escuro em fundo claro e texto claro em fundo escuro viram preto no branco', () => {
  for (const claroNoEscuro of [false, true]) {
    const f = faixaComTitulo({ claroNoEscuro, arte: false }), L = X.linhaDoNome(f.d, f.w, f.h);
    const b = X.binarizaLinha(L.cinza, f.w, f.h, L.y0, L.y1);
    assert.equal(b.claro, claroNoEscuro, 'polaridade');
    const px = (x, y) => b.data[(y * b.w + x) * 4], meio = Math.round(b.h / 2);
    assert.ok(px(33, meio) < 80, 'traço da letra fica escuro: ' + px(33, meio));
    assert.ok(px(42, meio) > 200, 'entre as letras fica branco: ' + px(42, meio));
    assert.ok(px(300, meio) > 200, 'fundo liso fica branco');
  }
});

test('X11 · limpar a linha: apaga o que encosta na margem, preserva as letras, e não apaga nada se o fundo é texturizado', () => {
  const w = 120, h = 40, d = new Uint8ClampedArray(w * h * 4).fill(255);
  const set = (x, y, v) => { const i = (y * w + x) * 4; d[i] = d[i + 1] = d[i + 2] = v; };
  for (let x = 0; x < w; x++) set(x, 2, 0);                       // linha da moldura de lado a lado
  for (let y = 0; y < 30; y++) set(4, y, 0);                      // a curva da barra, colada na margem
  for (let y = 12; y < 28; y++) for (let x = 40; x < 46; x++) set(x, y, 0);   // uma letra solta
  X.limpaLinha(d, w, h);
  assert.equal(d[(2 * w + 60) * 4], 255); assert.equal(d[(15 * w + 4) * 4], 255); assert.equal(d[(20 * w + 42) * 4], 0);
  const t = new Uint8ClampedArray(w * h * 4);
  for (let p = 0; p < w * h; p++) t[p * 4] = t[p * 4 + 1] = t[p * 4 + 2] = (p % 3 === 0 ? 255 : 0);  // quase tudo escuro e ligado à margem
  const antes = t.slice(); X.limpaLinha(t, w, h);
  assert.deepEqual([...t.slice(0, 400)], [...antes.slice(0, 400)], 'fundo texturizado fica como está');
});

test('X11 · nitidez da linha separa texto nítido de desfocado; deslocamento mede quanto a carta andou', () => {
  const f = faixaComTitulo({ arte: false }), L = X.linhaDoNome(f.d, f.w, f.h);
  const nitida = X.nitidezDaLinha(L.cinza, f.w, L.y0, L.y1);
  const borr = new Float32Array(L.cinza.length);
  for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) { let s = 0, n = 0; for (let k = -6; k <= 6; k++) { const xx = x + k; if (xx >= 0 && xx < f.w) { s += L.cinza[y * f.w + xx]; n++; } } borr[y * f.w + x] = s / n; }
  const desfocada = X.nitidezDaLinha(borr, f.w, L.y0, L.y1);
  assert.ok(nitida > X.LIMIARES_LINHA.nitidezMin * 4, 'nítida: ' + nitida.toFixed(2));
  assert.ok(desfocada < nitida / 10, `desfocada ${desfocada.toFixed(2)} × nítida ${nitida.toFixed(2)}`);
  const a = [{ x: 0.2, y: 0.2 }, { x: 0.8, y: 0.2 }, { x: 0.8, y: 0.9 }, { x: 0.2, y: 0.9 }];
  assert.equal(X.deslocamento(a, a), 0);
  assert.ok(Math.abs(X.deslocamento(a, a.map(p => ({ x: p.x + 0.06, y: p.y }))) - 0.06) < 1e-9);
  assert.equal(X.deslocamento(a, null), 1);
  // a ordem dos cantos pode girar entre quadros (carta deitada): a mesma carta não "andou"
  assert.equal(X.deslocamento(a, [a[1], a[2], a[3], a[0]]), 0);
});

test('X11 · recorte da faixa: a caixa contém a faixa inteira, com folga, e os cantos vêm nas coordenadas dela', () => {
  const cantos = [{ x: 0.3, y: 0.25 }, { x: 0.72, y: 0.3 }, { x: 0.68, y: 0.85 }, { x: 0.25, y: 0.8 }];
  const r = X.recorteDaFaixa(cantos, X.FAIXA_NOME, 1080, 1920);
  const f = X.cantosDaFaixa(cantos.map(p => ({ x: p.x * 1080, y: p.y * 1920 })), X.FAIXA_NOME);
  for (const p of f) {
    assert.ok(p.x >= r.regiao.x * 1080 && p.x <= (r.regiao.x + r.regiao.w) * 1080, 'x dentro');
    assert.ok(p.y >= r.regiao.y * 1920 && p.y <= (r.regiao.y + r.regiao.h) * 1920, 'y dentro');
  }
  assert.ok(Math.abs(r.cantos[0].x + r.regiao.x * 1080 - 0.3 * 1080) < 1 && Math.abs(r.cantos[0].y + r.regiao.y * 1920 - 0.25 * 1920) < 1);
  assert.ok(r.w * r.h < 1080 * 1920 * 0.2, 'só um pedaço do quadro é copiado, não o quadro inteiro');
  assert.equal(X.recorteDaFaixa([{ x: 0.5, y: 0.5 }, { x: 0.5, y: 0.5 }, { x: 0.5, y: 0.5 }, { x: 0.5, y: 0.5 }], X.FAIXA_NOME, 1080, 1920, 0), null, 'carta degenerada');
  assert.equal(X.recorteDaFaixa([{ x: NaN, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }], X.FAIXA_NOME, 1080, 1920), null, 'cantos sem número (palco sem tamanho) não viram recorte');
  assert.ok(Math.abs(X.alturaDaCarta(cantos, 1080, 1920) - 1056) < 12);
});

test('X11 · lixo no começo da linha (a curva da barra lida como letra) não atrapalha o nome', () => {
  const idx = X.buildIndex([...REAL, 'Armory of Iroas', 'Chasm Skulker', 'Gitaxian Probe', 'Go for the Throat', 'Ox of Agonas', ...DECOYS.slice(0, 3000)]);
  const m = t => X.matchName(idx, t)[0] || {};
  assert.equal(m('HL Chasm Skulker').name, 'Chasm Skulker'); assert.equal(m('HL Chasm Skulker').score, 1);
  assert.equal(m('fl Armory of lroas').name, 'Armory of Iroas'); assert.ok(m('fl Armory of lroas').score >= X.ACCEPT);
  assert.equal(m('ol Gitaxian Probe L').name, 'Gitaxian Probe'); assert.ok(m('ol Gitaxian Probe L').score >= X.ACCEPT);
  // nome que começa de verdade com palavra curta continua exato
  assert.equal(m('Go for the Throat').score, 1); assert.equal(m('Ox of Agonas').score, 1);
  // e continua rápido
  const t0 = performance.now(); for (let i = 0; i < 10; i++) X.matchName(INDEX, 'fl Counterspel1 oo');
  assert.ok((performance.now() - t0) / 10 < 100, 'casar contra 30 mil nomes em menos de 100 ms');
});

test('X11 · a linha de coleção só é procurada sobre a borda escura (textura da moldura não engana)', () => {
  const w = 400, h = 160, d = new Uint8ClampedArray(w * h * 4);
  const set = (x, y, v) => { const i = (y * w + x) * 4; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; };
  // moldura clara com uma faixa listrada (textura) entre duas faixas lisas; embaixo, a borda preta
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) set(x, y, y >= 60 ? 14 : y >= 16 && y < 52 ? ((x + y) % 8 < 4 ? 40 : 240) : 200);
  for (let k = 0; k < 10; k++) for (let y = 84; y < 118; y++) for (let x = 30 + k * 14; x < 30 + k * 14 + 5; x++) set(x, y, 235);   // texto claro na borda
  const semPeso = X.linhaDoNome(d, w, h, { altMin: 0.15, altMax: 0.3 });
  const comPeso = X.linhaDoNome(d, w, h, { altMin: 0.15, altMax: 0.3, sobreEscuro: true });
  assert.ok(semPeso.y1 <= 60, 'sem a regra, a textura da moldura ganha: ' + semPeso.y0 + '–' + semPeso.y1);
  assert.ok(comPeso.y0 >= 70 && comPeso.y1 <= 132, 'com a regra, o bloco fica sobre a borda preta: ' + comPeso.y0 + '–' + comPeso.y1);
  // carta de borda branca (nenhuma linha sobre fundo escuro): não há bloco, e nada vai para o OCR
  const branca = new Uint8ClampedArray(300 * 200 * 4).fill(230);
  assert.equal(X.preparaColecao(branca, 300, 200, [{ x: 20, y: 10 }, { x: 150, y: 10 }, { x: 150, y: 190 }, { x: 20, y: 190 }]), null);
});

test('X11 · câmera: copiar com redução e com canvas reaproveitado não cria canvas novo a cada leitura', async () => {
  let criados = 0; const desenhos = [];
  const canvas = () => { criados++; return { width: 0, height: 0, getContext: () => ({ drawImage: (...a) => desenhos.push(a) }) }; };
  const doc = { createElement: tag => (tag === 'canvas' ? canvas() : {}) };
  const video = { videoWidth: 2560, videoHeight: 1440, play: async () => {} };
  const nav = { mediaDevices: { getUserMedia: async () => ({ getVideoTracks: () => [], getTracks: () => [] }) } };
  const camera = P.webCamera(nav, doc);
  await camera.start(video);
  const meu = doc.createElement('canvas'); criados = 0;
  for (let i = 0; i < 5; i++) { const c = camera.capture(null, { maxLado: 320, canvas: meu }); assert.equal(c, meu); }
  assert.equal(criados, 0, 'nenhum canvas novo em cinco leituras');
  assert.equal(meu.width, 320); assert.equal(meu.height, 180);
  const pedaco = camera.capture({ x: 0.25, y: 0.5, w: 0.5, h: 0.1 });
  assert.equal(pedaco.width, 1280); assert.equal(pedaco.height, 144);
  assert.deepEqual(desenhos.at(-1).slice(1), [640, 720, 1280, 144, 0, 0, 1280, 144]);
});

/* ---------------- X13 · câmera no máximo e cronômetro ---------------- */
const DE_IMAGEM = ['focusMode', 'exposureMode', 'whiteBalanceMode', 'zoom', 'torch', 'pointsOfInterest'];
/** Câmera falsa que se comporta como o Chrome: pedido que traz chave de imagem é tratado SÓ como pedido de imagem
    (largura e altura no mesmo pedido são ignoradas); pedido só de formato muda o formato. Registra o que lhe pedem. */
function cameraFalsa({ cap = {}, inicio = { width: 1920, height: 1080 }, fpsPorPedido = () => 30, rejeita = () => false, surda = false, suportados = {}, dispositivos = [], emPe = false } = {}) {
  const pedidos = [], abertas = [];
  let ajustes = { ...inicio, frameRate: 30 };
  const trilha = () => ({
    label: 'camera2 0, facing back', stop() {},
    getCapabilities: () => cap, getSettings: () => ({ ...ajustes }),
    applyConstraints: async c => {
      pedidos.push(JSON.parse(JSON.stringify(c)));
      if (rejeita(c)) { const e = new Error('nao da'); e.name = 'OverconstrainedError'; throw e; }
      const imagem = (c.advanced || []).some(a => Object.keys(a).some(k => DE_IMAGEM.includes(k)));
      if (imagem) { for (const a of c.advanced) ajustes = { ...ajustes, ...a }; return; }
      if (c.width && !surda) ajustes = { ...ajustes, width: c.width.ideal, height: c.height.ideal };
    }
  });
  const nav = { mediaDevices: {
    getUserMedia: async c => { abertas.push(JSON.parse(JSON.stringify(c.video))); if (c.video.deviceId && c.video.deviceId.exact === 'sumiu') { const e = new Error('x'); e.name = 'OverconstrainedError'; throw e; } const t = trilha(); return { getVideoTracks: () => [t], getTracks: () => [t] }; },
    getSupportedConstraints: () => suportados, enumerateDevices: async () => dispositivos } };
  const doc = { createElement: () => ({ width: 0, height: 0, getContext: () => ({ drawImage() {} }) }) };
  const video = emPe ? { videoWidth: 1080, videoHeight: 1920, play: async () => {} } : { videoWidth: 1920, videoHeight: 1080, play: async () => {} };
  let medidor = async () => fpsPorPedido(ajustes);
  const camera = P.webCamera(nav, doc, { medeFps: v => medidor(v) });
  return { camera, video, pedidos, abertas, ajustes: () => ajustes, medidor: f => { medidor = f; } };
}
const soFormato = p => p.width && !p.advanced;

test('X13 · escada de resolução: do maior formato declarado (teto 4K) para baixo; sem capacidade, nada', () => {
  const lista = c => JSON.parse(JSON.stringify(P.degrausDeResolucao(c))).map(d => d.width + 'x' + d.height);
  assert.deepEqual(lista({ width: { max: 4000 }, height: { max: 3000 } }), ['3840x2160', '2560x1440', '1920x1080', '1280x720'], 'acima de 4K não entra');
  // retrato: a câmera declara a altura maior que a largura; a escada é a mesma
  assert.deepEqual(lista({ width: { max: 2160 }, height: { max: 3840 } }).slice(0, 2), ['3840x2160', '2560x1440']);
  assert.deepEqual(lista({ width: { max: 1920 }, height: { max: 1080 } }), ['1920x1080', '1280x720']);
  assert.equal(P.degrausDeResolucao({}).length, 0);
  assert.equal(P.degrausDeResolucao(null).length, 0);
});

test('X13 · câmera sobe até a maior resolução que não arrasta: 4K a 8 qps é recusado, 1440p a 24 fica; o formato vai num pedido só dele', async () => {
  const f = cameraFalsa({ cap: { width: { max: 4000 }, height: { max: 3000 }, focusMode: ['continuous', 'single-shot'] }, fpsPorPedido: a => (a.width * a.height > 8e6 ? 8 : 24) });
  await f.camera.start(f.video);
  const m = await f.camera.melhorar();
  assert.equal(m.degrau, '2560×1440'); assert.equal(m.fps, 24);
  assert.equal(m.tentativas.map(t => t.pedido + (t.ok ? ' ok' : ' não')).join(', '), '3840×2160 não, 2560×1440 ok');
  assert.equal(f.ajustes().width, 2560, 'a câmera mudou de fato');
  // no Chrome, largura e altura no mesmo pedido do foco são ignoradas: precisa existir o pedido só de formato
  assert.ok(f.pedidos.some(p => soFormato(p) && p.width.ideal === 2560), 'pedido só de formato');
  // e o foco contínuo pedido na abertura continua valendo depois
  assert.equal(f.ajustes().focusMode, 'continuous');
  assert.equal(f.pedidos.at(-1).advanced[0].focusMode, 'continuous');
  const i = f.camera.info();
  assert.equal(i.maximo, '4000×3000'); assert.match(i.subida, /3840×2160 ✗ 8 qps, 2560×1440 ✓/);
});

test('X13 · câmera: nada serve → volta ao formato de antes; câmera que finge aceitar não conta como subida; recusa, aba escondida e câmera sem capacidades não derrubam o vídeo', async () => {
  const lenta = cameraFalsa({ cap: { width: { max: 3840 }, height: { max: 2160 } }, inicio: { width: 2560, height: 1440 }, fpsPorPedido: a => (a.width > 2560 ? 9 : 30) });
  await lenta.camera.start(lenta.video);
  const m = await lenta.camera.melhorar();
  assert.equal(m.degrau, null, 'ficou como estava');
  assert.equal(lenta.ajustes().width, 2560, 'o formato de antes foi pedido de volta');
  assert.equal(lenta.pedidos.filter(soFormato).at(-1).width.ideal, 2560);
  // aceita o pedido e não muda nada (o defeito que o pedido misturado causava no Chrome): não é subida
  const surda = cameraFalsa({ cap: { width: { max: 3840 }, height: { max: 2160 } }, surda: true });
  await surda.camera.start(surda.video);
  const s = await surda.camera.melhorar();
  assert.equal(s.degrau, null); assert.match(surda.camera.info().subida, /3840×2160 ✗ a câmera não mudou/);
  const teimosa = cameraFalsa({ cap: { width: { max: 3840 }, height: { max: 2160 } }, rejeita: c => !!c.width && c.width.ideal > 1920 });
  await teimosa.camera.start(teimosa.video);
  const r = await teimosa.camera.melhorar();
  assert.equal(r.degrau, null); assert.match(r.tentativas[0].erro, /Overconstrained/);
  // aba escondida: não chegou quadro para contar; ninguém decide nada e o formato volta
  const escondida = cameraFalsa({ cap: { width: { max: 3840 }, height: { max: 2160 } }, fpsPorPedido: () => NaN });
  await escondida.camera.start(escondida.video);
  const e = await escondida.camera.melhorar();
  assert.equal(e.degrau, null); assert.equal(e.tentativas.length, 1); assert.match(e.tentativas[0].erro, /sem quadros/);
  assert.equal(escondida.ajustes().width, 1920);
  const muda = cameraFalsa({ cap: {} });
  await muda.camera.start(muda.video);
  assert.equal((await muda.camera.melhorar()).tentativas.length, 0);
  assert.equal(muda.pedidos.length, 0, 'câmera sem capacidades declaradas: nenhum pedido');
  // sem jeito de contar quadros (navegador sem requestVideoFrameCallback), vale o que a trilha declara
  assert.equal(await P.medeFpsDoVideo({}), null);
  assert.ok(Number.isNaN(await P.medeFpsDoVideo({ requestVideoFrameCallback() {} }, 50, { hidden: true })), 'aba escondida não mede');
});

test('X13 · câmera: parar ou trocar de lente no meio da subida cancela a subida (não marca degrau em câmera parada)', async () => {
  const f = cameraFalsa({ cap: { width: { max: 3840 }, height: { max: 2160 } } });
  await f.camera.start(f.video);
  let solta; f.medidor(() => new Promise(r => { solta = r; }));
  const subindo = f.camera.melhorar();
  await new Promise(r => setTimeout(r, 10));
  f.camera.stop();
  solta(30);
  const m = await subindo;
  assert.equal(m.degrau, null); assert.equal(m.tentativas[0].ok, false); assert.equal(m.tentativas[0].erro, 'cancelada');
});

test('X13 · contagem de quadros: espera o primeiro quadro e mede o intervalo entre os seguintes', async () => {
  // vídeo falso que entrega um quadro a cada 40 ms (25 por segundo), com o primeiro atrasado 200 ms (câmera reconfigurando)
  let t = 0; const video = { requestVideoFrameCallback(cb) { const atraso = t === 0 ? 200 : 40; t += atraso; setTimeout(() => cb(t), 1); } };
  const fps = await P.medeFpsDoVideo(video, 400, { hidden: false });
  assert.ok(Math.abs(fps - 25) < 0.5, 'o atraso do primeiro quadro não entra na conta: ' + fps);
  // vídeo parado: nenhum quadro chega
  assert.ok(Number.isNaN(await P.medeFpsDoVideo({ requestVideoFrameCallback() {} }, 20, { hidden: false })));
});

test('X13 · zoom preso ao que a câmera aceita, lanterna só quando existe, e um pedido não desfaz o outro', async () => {
  const f = cameraFalsa({ cap: { zoom: { min: 1, max: 2.5, step: 0.1 }, torch: true, focusMode: ['continuous'] } });
  await f.camera.start(f.video);
  assert.deepEqual([...f.camera.zooms()], [1, 1.5, 2]);
  assert.equal(await f.camera.zoom(1.5), 1.5, 'sem resto de ponto flutuante');
  assert.equal(await f.camera.zoom(9), 2.5, 'acima do máximo fica no máximo');
  assert.equal(await f.camera.lanterna(true), true);
  const ult = f.pedidos.at(-1).advanced[0];
  assert.deepEqual([ult.zoom, ult.torch, ult.focusMode], [2.5, true, 'continuous'], 'zoom, lanterna e foco no mesmo pedido');
  const i = f.camera.info();
  assert.equal(i.pode.zoom, true); assert.equal(i.pode.lanterna, true); assert.equal(i.lanterna, true); assert.equal(i.zoom, 2.5);
  // câmera que recusa a lanterna: o zoom que já valia continua valendo
  const g = cameraFalsa({ cap: { zoom: { min: 1, max: 4, step: 0.1 }, torch: true }, rejeita: c => (c.advanced || []).some(a => a.torch) });
  await g.camera.start(g.video);
  await g.camera.zoom(2);
  assert.equal(await g.camera.lanterna(true), false);
  assert.equal(await g.camera.zoom(3), 3);
  assert.equal(g.pedidos.at(-1).advanced[0].torch, undefined, 'a lanterna recusada não fica no pedido seguinte');
  const simples = cameraFalsa({ cap: {} });
  await simples.camera.start(simples.video);
  assert.equal(await simples.camera.zoom(2), 1); assert.equal(await simples.camera.lanterna(true), false);
  assert.equal(simples.camera.zooms().length, 0); assert.equal(simples.camera.info().pode.zoom, false);
});

test('X13 · foco no ponto tocado: um pedido só, ponto girado com o vídeo em pé, e o ponto sai depois do foco', async () => {
  const f = cameraFalsa({ cap: { focusMode: ['continuous', 'single-shot'] }, suportados: { pointsOfInterest: true } });
  await f.camera.start(f.video);
  const antes = f.pedidos.length;
  assert.equal(await f.camera.focar({ x: 0.3, y: 1.4 }), true);
  assert.equal(f.pedidos.length, antes + 1, 'ponto e foco único no mesmo pedido');
  assert.deepEqual(f.pedidos.at(-1).advanced[0].pointsOfInterest, [{ x: 0.3, y: 1 }], 'vídeo deitado: ponto como tocado, preso ao quadro');
  assert.equal(f.pedidos.at(-1).advanced[0].focusMode, 'single-shot');
  await new Promise(r => setTimeout(r, 1600));
  const depois = f.pedidos.at(-1).advanced[0];
  assert.equal(depois.focusMode, 'continuous'); assert.equal(depois.pointsOfInterest, undefined, 'o ponto não fica pesando o foco pelo resto da sessão');
  // vídeo em pé (celular na vertical): o sensor é deitado, o ponto é girado
  const p = cameraFalsa({ cap: { focusMode: ['continuous', 'single-shot'] }, suportados: { pointsOfInterest: true }, emPe: true });
  await p.camera.start(p.video);
  await p.camera.focar({ x: 0.2, y: 0.7 });
  const pt = p.pedidos.at(-1).advanced[0].pointsOfInterest[0];
  assert.ok(Math.abs(pt.x - 0.7) < 1e-9 && Math.abs(pt.y - 0.8) < 1e-9, JSON.stringify(pt));
  // sem pontos de interesse: foco único comum
  const g = cameraFalsa({ cap: { focusMode: ['continuous', 'single-shot'] } });
  await g.camera.start(g.video);
  await g.camera.focar({ x: 0.5, y: 0.5 });
  assert.equal(g.pedidos.some(q => q.advanced && q.advanced[0].pointsOfInterest), false);
});

test('X13 · lentes: lista as traseiras e troca pela escolhida; lente que não abre lança (sem cair calada na padrão); lente guardada que sumiu, ao abrir, cai na padrão', async () => {
  const dispositivos = [{ kind: 'videoinput', deviceId: 'a', label: 'camera2 0, facing back' }, { kind: 'videoinput', deviceId: 'b', label: 'camera2 2, facing back' }, { kind: 'videoinput', deviceId: 'c', label: 'camera2 1, facing front' }, { kind: 'audioinput', deviceId: 'm', label: 'mic' }];
  const f = cameraFalsa({ dispositivos });
  await f.camera.start(f.video);
  assert.deepEqual((await f.camera.lentes()).map(l => l.id), ['a', 'b']);
  await f.camera.trocarLente('b');
  assert.deepEqual(f.abertas.at(-1).deviceId, { exact: 'b' });
  assert.equal(f.camera.info().lente, 'b');
  await assert.rejects(() => f.camera.trocarLente('sumiu'));
  assert.ok(f.abertas.every(a => !(a.facingMode && f.abertas.indexOf(a) > 1)), 'nenhuma abertura pela câmera padrão depois da troca que falhou');
  const g = cameraFalsa({ dispositivos });
  await g.camera.start(g.video, { lente: 'sumiu' });
  assert.equal(g.abertas.at(-1).facingMode, 'environment', 'sem a lente guardada, abre a traseira padrão');
});

test('X13 · cronômetro: mede da primeira leitura do nome até o aceite, e desde a entrada só quando o quadro estava vazio', () => {
  let t = 1000; const c = X.criaCronometro({ agora: () => t });
  c.quadro(false);
  t = 1100; c.quadro(true, 1100); c.leitura(null, 1100);          // carta entrou, leitura sem nome
  t = 1400; c.quadro(true, 1400); c.leitura('Sol Ring', 1400);    // primeira leitura com o nome
  t = 1600; c.quadro(false);                                      // uma passada borrada no meio não é "saiu do quadro"
  t = 1800; c.quadro(true, 1800); c.leitura('Sol Ring', 1800);    // segunda: o porteiro aceita em 2000
  t = 2000;
  assert.deepEqual(JSON.parse(JSON.stringify(c.aceite('Sol Ring'))), { nome: 'Sol Ring', confirmacao: 600, desdeEntrada: 900 });
  // a próxima carta entra sem o quadro esvaziar (pilha na mão): "desde a entrada" incluiria a mão da pessoa, então não vale
  t = 2500; c.quadro(true, 2500); c.leitura('Island', 2500);
  t = 2900;
  assert.deepEqual(JSON.parse(JSON.stringify(c.aceite('Island'))), { nome: 'Island', confirmacao: 400, desdeEntrada: null });
  // carta já aceita e parada: a tela manda leitura(null), e o tempo dela não entra em medida nenhuma
  t = 3000; c.quadro(true, 3000); c.leitura(null, 3000);
  // quadro vazio de verdade (duas passadas) e carta nova; nome que muda no meio zera a confirmação
  t = 6000; c.quadro(false); c.quadro(false); c.quadro(true, 6000); c.leitura('Counterspell', 6000); t = 6200; c.leitura('Ponder', 6200); t = 6300;
  assert.deepEqual(JSON.parse(JSON.stringify(c.aceite('Ponder'))), { nome: 'Ponder', confirmacao: 100, desdeEntrada: 300 });
  assert.deepEqual(JSON.parse(JSON.stringify(c.resumo())), { n: 3, confirmacao: 400, desdeEntrada: 300, nEntrada: 2 });
  assert.equal(X.criaCronometro().resumo().n, 0);
});

test('X13 · diário: a linha copiada traz o tempo por etapa e o tempo até aceitar', () => {
  const d = X.criaDiario({ agora: () => 0 });
  d.anota({ via: 'carta', texto: 'Sol Ring', melhor: { name: 'Sol Ring', score: 1 }, ms: 210, decisao: 'Sol Ring +1', tempos: { det: 12, prep: 30, ocr: 160, casa: 8 }, ateAceitar: 640 });
  const txt = d.texto({ aparelho: 'x' });
  assert.match(txt, /carta · 210 ms \[det 12 · prep 30 · ocr 160 · casa 8\]/); assert.match(txt, /até aceitar 640 ms/);
});
