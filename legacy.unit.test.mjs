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

test('S58 · básico sem rede vem da tabela embutida, e "não encontrada" vale um dia', async () => {
  let t = 0, calls = 0;
  const scryfall = { collection: async () => { calls++; throw new Error('rede'); } };
  const repo = D2.createCardRepo({ store: F2.memoryStore(), scryfall, now: () => t });
  const r = await repo.byNames(['Plains', 'Mountain', 'Carta Que Não Existe']);
  assert.equal(r.get('plains').type_line, 'Basic Land — Plains', 'o básico volta mesmo com a rede fora');
  assert.match(r.get('mountain').oracle_text, /Add \{R\}/, 'e com a mana certa, que o motor precisa');
  assert.equal(r.get('carta que não existe') || null, null, 'o que não é básico segue desconhecido');

  // "não encontrada" guardada no cache não pode valer uma semana
  const sf2 = { collection: async names => { calls++; return { found: [], missing: names }; } };
  const repo2 = D2.createCardRepo({ store: F2.memoryStore(), scryfall: sf2, now: () => t });
  calls = 0;
  await repo2.byNames(['Fantasma']);
  await repo2.byNames(['Fantasma']);
  assert.equal(calls, 1, 'no mesmo dia, não insiste na rede');
  t = 2 * 24 * 3600 * 1000;
  await repo2.byNames(['Fantasma']);
  assert.equal(calls, 2, 'no dia seguinte, tenta de novo em vez de repetir "desconhecida"');
});

test('S64 · carta guardada para jogar sem internet não vence, mesmo com a rede fora', async () => {
  let t = 0, chamadas = 0, rede = true;
  const scryfall = { collection: async names => { chamadas++; if (!rede) throw new Error('sem rede');
    return { found: names.filter(n => n !== 'Fantasma').map(n => ({ name: n, faces: [] })), missing: names.filter(n => n === 'Fantasma') }; } };
  const repo = D2.createCardRepo({ store: F2.memoryStore(), scryfall, now: () => t });
  const r = await repo.pin(['Sol Ring', 'Fantasma']);
  assert.deepEqual([...r.fixadas], ['sol ring'], 'guardou o que a rede trouxe');
  assert.deepEqual([...r.faltando], ['fantasma'], 'e diz o que não veio');
  assert.equal(await repo.pinned(['Sol Ring']), 1);

  // um mês depois, sem rede: a carta guardada continua valendo e não chama a rede
  t = 30 * 24 * 3600 * 1000; rede = false; chamadas = 0;
  const m = await repo.byNames(['Sol Ring']);
  assert.equal(m.get('sol ring').name, 'Sol Ring', 'a carta guardada responde sem internet');
  assert.equal(chamadas, 0, 'e nem tenta a rede');
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

/* ---------------- Q10 · sem internet de verdade, sem retentar nem confundir ---------------- */
test('Q10 · 503 marcado pelo service worker (sem rede, sem cópia) é falha de rede: sem retentativa, sem "erro 503"', async () => {
  let n = 0; const clk = fakeClock();
  const offline = { status: 503, ok: false, headers: { get: k => (k === 'X-Estante-Offline' ? '1' : null) }, json: async () => ({ object: 'error' }) };
  const sf = D1.createScryfall({ now: clk.now, sleep: clk.sleep, fetch: async () => { n++; return offline; } });
  await assert.rejects(sf.named('Sol Ring'), e => e.kind === 'network' && /sem internet/.test(e.message));
  assert.equal(n, 1, 'uma tentativa só');
  assert.ok(clk.sleeps.every(ms => ms <= 100), 'só o intervalo mínimo entre chamadas (D1), nenhuma espera de retentativa: ' + clk.sleeps.join(','));
  // 503 comum (servidor de verdade fora) continua retentando como antes
  let m = 0;
  const sf2 = D1.createScryfall({ now: clk.now, sleep: clk.sleep, fetch: async () => { m++; return m < 2 ? res(503, {}) : res(200, { id: 'x', name: 'Sol Ring' }); } });
  assert.equal((await sf2.named('Sol Ring')).name, 'Sol Ring'); assert.equal(m, 2);
});

test('Q10 · Wi-Fi sem internet: o navegador diz online, nada responde → "sem conexão", não "visualizador restrito"', async () => {
  const { detectEnvironment: det, ENVIRONMENTS: ENV } = loadModules().env;
  const loc = { protocol: 'https:' };
  const abort = () => { const e = new Error('aborted'); e.name = 'AbortError'; throw e; };
  assert.equal((await det({ location: loc, navigator: { onLine: true }, fetch: async () => { throw new TypeError('Failed to fetch'); } })).id, 'offline', 'falha de rede numa página https é sem conexão');
  assert.equal((await det({ location: loc, navigator: { onLine: true }, fetch: abort, timeoutMs: 1 })).id, 'offline', 'tempo esgotado é sem conexão');
  const offline503 = { status: 503, ok: false, headers: { get: k => (k === 'X-Estante-Offline' ? '1' : null) } };
  assert.equal((await det({ location: loc, navigator: { onLine: true }, fetch: async () => offline503 })).id, 'offline', 'o service worker respondeu que está sem rede');
  assert.equal((await det({ location: loc, navigator: { onLine: true }, fetch: async () => ({ status: 200, ok: true, headers: { get: () => null } }) })).id, 'online');
  assert.equal((await det({ location: loc, navigator: { onLine: false }, fetch: async () => ({ ok: true }) })).id, 'offline');
  assert.equal((await det({ location: { protocol: 'file:' }, navigator: { onLine: true }, fetch: async () => ({ ok: true }) })).id, 'file');
  // origem que não é http (visualizador embutido) sem resposta continua sendo tratada como restrita
  assert.equal((await det({ location: { protocol: 'blob:' }, navigator: { onLine: true }, fetch: async () => { throw new TypeError('x'); } })).id, ENV.sandboxed.id);
});
