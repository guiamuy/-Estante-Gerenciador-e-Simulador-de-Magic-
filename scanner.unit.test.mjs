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
  assert.deepEqual(JSON.parse(JSON.stringify(await again.list())), [{ name: 'Sol Ring', qty: 2 }, { name: 'Island', qty: 1 }]);
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
