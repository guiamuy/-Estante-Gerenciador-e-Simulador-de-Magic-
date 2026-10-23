// G-278 · relatos #29 e #30 · a fila da Scryfall tem duas faixas: o que a pessoa tocou passa na frente do que roda por trás.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
const { scryfall: D1, fichas: FX, platform: P } = loadModules();
const J = x => JSON.parse(JSON.stringify(x));
const res = (status, body) => ({ status, ok: status >= 200 && status < 300, json: async () => body });
function fakeClock() { let t = 0; const sleeps = []; return { now: () => t, sleep: async ms => { sleeps.push(ms); t += ms; }, sleeps }; }

/** Um fetch que só responde quando o teste manda: devolve a ordem em que os pedidos chegaram à rede. */
function redeControlada() {
  const chegaram = [], presos = [];
  const fetch = (url, init) => new Promise(resolve => { chegaram.push(url.replace(/^https?:\/\/[^/]+/, '').split('?')[0] + (init && init.body ? ':' + JSON.parse(init.body).identifiers.length : '') + (url.includes('q=') ? ':' + decodeURIComponent(url.split('q=')[1].split('&')[0]) : '')); presos.push(resolve); });
  const libera = () => { const r = presos.shift(); if (r) r(res(200, { data: [], not_found: [], has_more: false })); return !!r; };
  return { fetch, chegaram, libera, presos };
}
const tick = () => new Promise(r => setImmediate(r));

test('G-278 · prioridade alta entra na frente das chamadas normais que ainda esperam a vez; sem prioridade, a ordem é a de chegada; o intervalo mínimo continua valendo', async () => {
  const clk = fakeClock(), rede = redeControlada();
  const sf = D1.createScryfall({ now: clk.now, sleep: clk.sleep, fetch: rede.fetch });
  // três lotes de cartas das listas (por trás) entram primeiro: 160 nomes = 3 pedidos
  const fundo = sf.collection(Array.from({ length: 160 }, (_, i) => 'Carta ' + i));
  await tick(); assert.equal(rede.chegaram.length, 1, 'o primeiro lote já está na rede'); assert.equal(sf.esperando(), 0, 'o segundo lote só é enfileirado quando o primeiro responde');
  // a pessoa abre a ficha: a busca de artes é alta prioridade
  const artes = sf.search('!"Plant" t:token', { prioridade: 'alta' });
  await tick(); assert.equal(sf.esperando(), 1);
  rede.libera(); await tick(); await tick(); await tick();
  assert.equal(rede.chegaram[1], '/cards/search:!"Plant" t:token', 'a busca da ficha passa na frente do segundo lote');
  rede.libera(); await tick(); await tick(); await tick();
  assert.equal(rede.chegaram[2], '/cards/collection:75', 'depois dela, os lotes seguem na ordem');
  rede.libera(); await tick(); await tick(); await tick(); rede.libera();
  await Promise.all([fundo, artes]);
  assert.deepEqual(J(rede.chegaram.map(x => x.split(':')[0])), ['/cards/collection', '/cards/search', '/cards/collection', '/cards/collection']);
  assert.ok(clk.sleeps.length >= 3 && clk.sleeps.every(ms => ms >= D1.MIN_INTERVAL_MS), 'intervalo mínimo entre todas, inclusive a prioritária');
  // sem prioridade: ordem de chegada, como sempre foi
  const r2 = redeControlada(); const sf2 = D1.createScryfall({ now: clk.now, sleep: clk.sleep, fetch: r2.fetch });
  const a = sf2.search('a'), b = sf2.search('b'), c = sf2.collection(['x']);
  await tick(); r2.libera(); await tick(); await tick(); await tick(); r2.libera(); await tick(); await tick(); await tick(); r2.libera(); await Promise.all([a, b, c]);
  assert.deepEqual(J(r2.chegaram.map(x => x.split(':').slice(0, 2).join(':'))), ['/cards/search:a', '/cards/search:b', '/cards/collection:1']);
  // erro numa chamada não trava a fila: a seguinte roda
  let n = 0; const sf3 = D1.createScryfall({ now: clk.now, sleep: clk.sleep, fetch: async () => (++n === 1 ? res(400, { details: 'x' }) : res(200, { data: [], has_more: false })) });
  await assert.rejects(sf3.search('ruim')); assert.deepEqual(J(await sf3.search('boa')), []);
});

test('G-278 · as artes da ficha são pedidas em prioridade alta, e duas chamadas ao mesmo tempo (a troca de rota) fazem uma busca só', async () => {
  const pedidos = [];
  const carta = id => ({ id, name: 'Plant', type_line: 'Token Creature — Plant', colors: ['G'], power: '0', toughness: '1', set: 'c21', collector_number: id, images: { small: id + '/s', normal: id + '/n', large: id + '/l', art: id + '/a' } });
  let libera; const chegou = new Promise(r => { libera = r; });
  const scryfall = { async search(q, o) { pedidos.push([q, o && o.prioridade]); await chegou; return [carta('1'), carta('2')]; }, async collection() { return { found: [], missing: [] }; } };
  const fx = FX.createFichas({ store: P.memoryStore(), scryfall, temRede: () => true });
  const plant = { name: 'Plant', types: ['creature'], colors: ['G'], power: 0, toughness: 1 };
  const p1 = fx.buscar(plant), p2 = fx.buscar(plant); await tick(); await tick();
  assert.deepEqual(J(pedidos), [['!"Plant" t:token pow=0 tou=1 c=g', 'alta']], 'uma busca só, em prioridade alta');
  libera(); const [a, b] = await Promise.all([p1, p2]);
  assert.deepEqual(J(a.map(o => o.id)), ['1', '2']); assert.deepEqual(J(b.map(o => o.id)), ['1', '2']);
  assert.equal(pedidos.length, 1, 'a segunda chamada esperou a mesma busca');
});

test('G-278 · pedido sem resposta estoura em `timeoutMs` como falha de rede (sem retentativa) e a fila segue; resposta a tempo não estoura', async () => {
  const clk = fakeClock(); let abortado = false;
  const nunca = (url, init) => new Promise(() => { if (init && init.signal) init.signal.addEventListener('abort', () => { abortado = true; }); });
  const sf = D1.createScryfall({ now: clk.now, sleep: clk.sleep, timeoutMs: 40, AbortController, fetch: async (url, init) => (url.includes('q=trava') ? nunca(url, init) : res(200, { data: [], has_more: false })) });
  const t0 = Date.now();
  await assert.rejects(sf.search('trava'), e => e.kind === 'network' && /não respondeu a tempo/.test(e.message));
  assert.ok(Date.now() - t0 < 2000, 'estourou pelo limite, não pelo relógio do teste'); assert.equal(abortado, true, 'a conexão é abortada');
  assert.equal(sf.stats.retries, 0, 'sem retentativa'); assert.equal(sf.stats.failures, 1);
  assert.deepEqual(J(await sf.search('boa')), [], 'a fila não ficou presa');
  assert.ok(D1.TIMEOUT_MS >= 10000 && D1.TIMEOUT_MS <= 30000, 'limite entre 10 e 30 s no app');
});
