// Q7 · dívida de testes das histórias F2, D1, D2 e W1.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { loadModules, ROOT } from './_load.mjs';
const { platform: F2, scryfall: D1, cards: D2 } = loadModules();

const res = (status, body) => ({ status, ok: status >= 200 && status < 300, json: async () => body });
function fakeClock() { let t = 0; const sleeps = []; return { now: () => t, sleep: async ms => { sleeps.push(ms); t += ms; }, sleeps }; }

test('F2 · plataforma cumpre o contrato e cai para memória sem IndexedDB', async () => {
  const p = F2.createPlatform({ window: {}, indexedDB: null, navigator: null, document: null });
  for (const [cap, methods] of Object.entries(F2.PLATFORM_CONTRACT)) for (const m of methods) assert.equal(typeof p[cap][m], 'function', `${cap}.${m}`);
  assert.equal(p.store.kind, 'memory');
  await p.store.set('deck.a', 1); await p.store.set('card.b', 2);
  assert.deepEqual([...(await p.store.keys('deck.'))], ['deck.a']);
});

test('D1 · lotes de 75, cabeçalho Accept e intervalo mínimo entre chamadas', async () => {
  const calls = []; const clk = fakeClock();
  const sf = D1.createScryfall({ now: clk.now, sleep: clk.sleep, fetch: async (url, init) => {
    calls.push({ url, init }); const ids = JSON.parse(init.body).identifiers;
    return res(200, { data: ids.map(i => ({ id: i.name, name: i.name })), not_found: [] });
  } });
  const names = Array.from({ length: 160 }, (_, i) => 'Carta ' + i);
  const r = await sf.collection(names);
  assert.equal(calls.length, 3);
  assert.equal(r.found.length, 160);
  assert.match(calls[0].init.headers.Accept, /application\/json/);
  assert.ok(clk.sleeps.every(ms => ms >= D1.MIN_INTERVAL_MS) && clk.sleeps.length >= 2);
});

test('D1 · retenta em 429 e 5xx, 404 é "não encontrado", 400 traz o detalhe', async () => {
  const clk = fakeClock(); let n = 0;
  const sf = D1.createScryfall({ now: clk.now, sleep: clk.sleep, fetch: async () => (++n < 3 ? res(n === 1 ? 429 : 503, {}) : res(200, { id: 'x', name: 'Sol Ring' })) });
  assert.equal((await sf.named('Sol Ring')).name, 'Sol Ring');
  assert.equal(sf.stats.retries, 2);
  const nf = D1.createScryfall({ now: clk.now, sleep: clk.sleep, fetch: async () => res(404, {}) });
  assert.equal(await nf.named('Nada'), null);
  const bad = D1.createScryfall({ now: clk.now, sleep: clk.sleep, fetch: async () => res(400, { details: 'consulta inválida' }) });
  await assert.rejects(bad.search('x'), e => e.kind === 'bad_request' && /consulta inválida/.test(e.message));
});

test('D1 · falha de rede vira erro classificado, não exceção genérica', async () => {
  const sf = D1.createScryfall({ now: () => 0, sleep: async () => {}, fetch: async () => { throw new TypeError('Failed to fetch'); } });
  await assert.rejects(sf.named('x'), e => e.kind === 'network');
});

test('D2 · cache primeiro, TTL de 7 dias e degradação para cache vencido', async () => {
  let t = 0, calls = 0, fail = false;
  const scryfall = { collection: async names => { calls++; if (fail) throw new Error('rede'); return { found: names.map(n => ({ name: n, faces: [] })), missing: [] }; } };
  const repo = D2.createCardRepo({ store: F2.memoryStore(), scryfall, now: () => t });
  await repo.byNames(['Sol Ring']);
  await repo.byNames(['sol ring']);
  assert.equal(calls, 1, 'segunda consulta sai do cache, sem diferenciar maiúsculas');
  t = 8 * 24 * 3600 * 1000; fail = true;
  const r = await repo.byNames(['Sol Ring']);
  assert.equal(calls, 2, 'vencido: tenta a rede');
  assert.equal(r.get('sol ring').name, 'Sol Ring', 'rede falhou: devolve o cache vencido');
  assert.equal(repo.stats.degraded, true);
});

test('W1 · estratégia de cache do service worker por tipo de requisição', () => {
  const code = readFileSync(join(ROOT, 'sw.js'), 'utf8') + '\n;globalThis.__pick = pickStrategy;';
  const ctx = vm.createContext({ self: { location: { origin: 'https://guiamuy.github.io' }, addEventListener() {} }, URL, caches: {}, Request: class {}, Response: class {}, Headers: class {} });
  vm.runInContext(code, ctx);
  const pick = (url, extra = {}) => ctx.__pick({ url, method: 'GET', ...extra }).strategy;
  assert.equal(pick('https://api.scryfall.com/cards/named?exact=x'), 'network-first');
  assert.equal(pick('https://cards.scryfall.io/normal/front/a.jpg'), 'cache-first');
  assert.equal(pick('https://guiamuy.github.io/repo/index.html', { mode: 'navigate' }), 'network-first');
  assert.equal(pick('https://guiamuy.github.io/repo/icon.svg'), 'stale-while-revalidate');
  assert.equal(pick('https://fonts.example.com/x.css'), 'passthrough');
  // X6: motor de OCR guardado para uso offline, inclusive resposta opaca de <script>
  const ocr = ctx.__pick({ url: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js', method: 'GET' });
  assert.equal(ocr.strategy, 'cache-first'); assert.equal(ocr.opaque, true);
  assert.equal(pick('https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.0/tesseract-core-simd-lstm.wasm.js'), 'cache-first');
  assert.equal(pick('https://tessdata.projectnaptha.com/4.0.0/eng.traineddata.gz'), 'cache-first');
  assert.equal(pick('https://cdn.jsdelivr.net/npm/outra-lib@1/x.js'), 'passthrough');
  assert.equal(ctx.__pick({ url: 'https://api.scryfall.com/x', method: 'DELETE' }).strategy, 'passthrough');
});
