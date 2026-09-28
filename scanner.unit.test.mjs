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
