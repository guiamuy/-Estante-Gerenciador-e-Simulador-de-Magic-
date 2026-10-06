// O1 · guardião offline: listas salvas e coleção ficam com dados e imagens no
// aparelho sem ninguém pedir; "preparar tudo" cobre base de nomes e leitor;
// o status conta o que já funciona sem internet.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
const { offline: O, decks: D, cards: C, platform: P } = loadModules();

const CARD = n => ({ name: n, faces: [], images: { small: `https://img/${n}/s.jpg`, normal: `https://img/${n}/n.jpg` } });
/** Scryfall falsa: conhece tudo menos "Fantasma"; conta chamadas; pode ficar sem rede. */
function scryfallFalsa() {
  const st = { chamadas: 0, rede: true };
  return { st, api: { collection: async names => { st.chamadas++; if (!st.rede) throw new Error('sem rede');
    return { found: names.filter(n => n.toLowerCase() !== 'fantasma').map(CARD), missing: names.filter(n => n.toLowerCase() === 'fantasma') }; } } };
}
function imagensFalsas() { const aquecidas = []; return { available: true, aquecidas, async warm(urls) { aquecidas.push(...urls); return urls.length; } }; }
async function mundo({ rede = true } = {}) {
  const store = P.memoryStore();
  const { st, api: scryfall } = scryfallFalsa(); st.rede = rede;
  const cardRepo = C.createCardRepo({ store, scryfall });
  const decks = D.createDeckStore({ store });
  const collection = D.createCollection({ store });
  const images = imagensFalsas();
  let baseInfo = null;
  const names = { info: () => baseInfo, load: async () => baseInfo, ensure: async () => { baseInfo = { count: 30000 }; return baseInfo; } };
  const ocr = { warm: async () => true };
  const online = () => st.rede;
  const keeper = O.createOfflineKeeper({ cardRepo, decks, collection, images, names, ocr, store, online, agora: () => 123 });
  return { store, st, cardRepo, decks, collection, images, names, keeper };
}

test('O1 · nomes da lista e URLs de imagem: todas as zonas, frente e verso, sem repetir', () => {
  const deck = { entries: [{ name: 'Sol Ring', qty: 1, zone: 'main' }, { name: 'Sol Ring', qty: 1, zone: 'side' }, { name: 'Malcolm', qty: 1, zone: 'commander' }, { name: '', qty: 1, zone: 'main' }] };
  assert.deepEqual(JSON.parse(JSON.stringify(O.nomesDaLista(deck))), ['Sol Ring', 'Malcolm']);
  const dupla = { images: { normal: 'a', small: 'as' }, faces: [{ images: { normal: 'f1' } }, { images: { normal: 'f2', small: 'f2s' } }] };
  assert.deepEqual(JSON.parse(JSON.stringify(O.urlsDeImagem(dupla, 'normal'))), ['a', 'f1', 'f2']);
  assert.deepEqual(JSON.parse(JSON.stringify(O.urlsDeImagem(dupla, 'small'))), ['as', 'f2s']);
  assert.deepEqual(JSON.parse(JSON.stringify(O.urlsDeImagem(null))), []);
});

test('O1 · lista salva é guardada sozinha: dados fixados e imagens do jogo aquecidas (U12: pequena e grande)', async () => {
  const m = await mundo();
  m.keeper.vigiar({ atraso: 0, timer: fn => { fn(); return 0; }, cancela: () => {} });
  await m.decks.save({ name: 'Delver', format: 'pauper', entries: [{ name: 'Delver of Secrets', qty: 4, zone: 'main' }, { name: 'Island', qty: 20, zone: 'main' }] });
  for (let i = 0; i < 50 && (await m.cardRepo.pinned(['Delver of Secrets', 'Island'])) < 2; i++) await new Promise(r => setTimeout(r, 10));
  assert.equal(await m.cardRepo.pinned(['Delver of Secrets', 'Island']), 2, 'as duas guardadas para sempre');
  assert.ok(m.images.aquecidas.includes('https://img/Delver of Secrets/n.jpg'), 'imagem grande da carta');
  // U12 (leva 86) · expectativa mudou de propósito: antes a lista NÃO aquecia a miniatura, e sem rede o campo
  // da mesa (que usa a pequena) ficava sem imagem. Agora aquece as duas, a pequena primeiro.
  assert.ok(m.images.aquecidas.includes('https://img/Delver of Secrets/s.jpg'), 'imagem pequena da carta (campo da mesa)');
  assert.ok(m.images.aquecidas.indexOf('https://img/Delver of Secrets/s.jpg') < m.images.aquecidas.indexOf('https://img/Delver of Secrets/n.jpg'), 'pequena primeiro');
});

test('O1 · coleção alterada é guardada sozinha, com miniatura, uma vez por rajada de mudanças', async () => {
  const m = await mundo();
  let agendados = 0, pendente = null;
  m.keeper.vigiar({ atraso: 0, timer: fn => { agendados++; pendente = fn; return 1; }, cancela: () => { pendente = null; } });
  await m.collection.set('Sol Ring', 1);
  await m.collection.set('Sol Ring', 2);
  await m.collection.addPrinting({ name: 'Counterspell', set: 'mh2', number: '267' }, 1);
  assert.equal(agendados, 3, 'cada gravação reagenda');
  await pendente();                                        // só o último agendamento roda (devolve a promessa)
  assert.equal(await m.cardRepo.pinned(['Sol Ring', 'Counterspell']), 2);
  // leva 102 · expectativa mudou: a coleção guarda a imagem "normal" (488 px), nítida no celular; a "small" (146 px) ficava borrada
  assert.ok(m.images.aquecidas.includes('https://img/Sol Ring/n.jpg') && !m.images.aquecidas.some(u => u.endsWith('/s.jpg')), 'coleção aquece a imagem nítida');
});

test('O1 · sem rede nada é tentado; com rede, guardar de novo não volta à Scryfall', async () => {
  const m = await mundo({ rede: false });
  m.keeper.vigiar({ atraso: 0, timer: fn => { fn(); return 0; }, cancela: () => {} });
  await m.decks.save({ name: 'X', entries: [{ name: 'Island', qty: 1, zone: 'main' }] });
  await new Promise(r => setTimeout(r, 10));
  assert.equal(m.st.chamadas, 0, 'offline: nenhuma chamada');
  assert.equal(await m.keeper.manter(), null, 'manter() sem rede não faz nada');
  m.st.rede = true;
  const r1 = await m.keeper.guardarLista({ entries: [{ name: 'Island', qty: 1, zone: 'main' }, { name: 'Fantasma', qty: 1, zone: 'main' }] });
  assert.deepEqual(JSON.parse(JSON.stringify([r1.fixadas, r1.faltando])), [['island'], ['fantasma']]);
  const antes = m.st.chamadas;
  const r2 = await m.keeper.guardarLista({ entries: [{ name: 'Island', qty: 1, zone: 'main' }] });
  assert.equal(r2.novas, 0, 'já guardada: nada novo');
  assert.equal(m.st.chamadas, antes, 'e nenhuma chamada à rede');
});

test('O1 · status conta listas prontas, coleção guardada, base de nomes e leitor', async () => {
  const m = await mundo();
  const d1 = await m.decks.save({ name: 'Pronta', entries: [{ name: 'Island', qty: 1, zone: 'main' }] });
  const d2 = await m.decks.save({ name: 'Com fantasma', entries: [{ name: 'Island', qty: 1, zone: 'main' }, { name: 'Fantasma', qty: 1, zone: 'main' }] });
  await m.collection.set('Sol Ring', 1);
  let st = await m.keeper.status();
  assert.deepEqual(JSON.parse(JSON.stringify({ l: [st.listas.total, st.listas.prontas], c: [st.colecao.cartas, st.colecao.guardadas], n: st.nomes, o: st.leitor })), { l: [2, 0], c: [1, 0], n: false, o: false });
  const rel = await m.keeper.prepararTudo();
  assert.equal(rel.nomes, true); assert.equal(rel.leitor, true);
  assert.deepEqual(JSON.parse(JSON.stringify([rel.listas.prontas, rel.listas.total, rel.listas.faltando])), [1, 2, ['Com fantasma: fantasma']]);
  assert.equal(rel.colecao.fixadas, 1);
  assert.equal(await m.store.get('ocr.ready'), 123); assert.equal(await m.store.get('offline.preparado'), 123);
  st = await m.keeper.status();
  assert.equal(st.listas.prontas, 1); assert.equal(st.colecao.pronta, true); assert.equal(st.nomes, true); assert.equal(st.leitor, true);
  assert.equal(st.listas.detalhe.find(l => l.id === d2.id).guardadas, 1, 'a lista com fantasma tem 1 de 2');
  assert.equal(st.listas.detalhe.find(l => l.id === d1.id).pronta, true);
  // sem rede, preparar devolve o relato vazio em vez de fingir
  m.st.rede = false;
  const vazio = await m.keeper.prepararTudo();
  assert.equal(vazio.rede, false); assert.equal(vazio.listas.total, 0);
});

test('O1 · preparar em curso não roda em paralelo: a segunda chamada espera a primeira', async () => {
  const m = await mundo();
  await m.decks.save({ name: 'A', entries: [{ name: 'Island', qty: 1, zone: 'main' }] });
  const [a, b] = await Promise.all([m.keeper.prepararTudo(), m.keeper.prepararTudo()]);
  assert.equal(a, b, 'mesmo relato');
  assert.equal(m.st.chamadas, 1, 'uma passagem pela rede');
});

/* ---------------- O3 · espaço e proteção ---------------- */
test('O3 · estimativa de espaço: adaptador web, leitura humana e aviso perto do limite', async () => {
  const nav = { storage: { estimate: async () => ({ usage: 12_400_000, quota: 1_200_000_000 }), persisted: async () => false, persist: async () => true } };
  const per = P.webPersistence(nav);
  assert.deepEqual(JSON.parse(JSON.stringify(await per.estimate())), { usado: 12_400_000, cota: 1_200_000_000 });
  assert.equal(await per.status(), 'vulneravel');
  assert.equal(await P.webPersistence({}).estimate(), null, 'navegador sem estimate: null, sem quebrar');
  assert.equal(await P.webPersistence({ storage: { estimate: async () => { throw new Error('x'); } } }).estimate(), null);
  const d = P.descreveEspaco({ usado: 12_400_000, cota: 1_200_000_000 });
  assert.equal(d.texto, '12,4 MB de 1,2 GB'); assert.equal(d.apertado, false);
  assert.equal(P.descreveEspaco({ usado: 900, cota: 1000 }).apertado, true, '90%: apertado');
  assert.equal(P.descreveEspaco({ usado: 500, cota: 900_000 }).texto, '1 KB de 900 KB');
  assert.equal(P.descreveEspaco(null), null);
});

test('O3 · o status do guardião traz espaço e proteção; sem adaptador, diz indisponível', async () => {
  const m = await mundo();
  let st = await m.keeper.status();
  assert.equal(st.espaco, null); assert.equal(st.protecao, 'indisponivel');
  const persistence = { status: async () => 'protegido', request: async () => 'protegido', estimate: async () => ({ usado: 10, cota: 100 }) };
  const k = O.createOfflineKeeper({ cardRepo: m.cardRepo, decks: m.decks, collection: m.collection, images: m.images, names: m.names, ocr: {}, store: m.store, persistence, online: () => true });
  st = await k.status();
  assert.deepEqual(JSON.parse(JSON.stringify(st.espaco)), { usado: 10, cota: 100 }); assert.equal(st.protecao, 'protegido');
  const quebrado = O.createOfflineKeeper({ cardRepo: m.cardRepo, decks: m.decks, collection: m.collection, images: m.images, names: m.names, ocr: {}, store: m.store,
    persistence: { status: async () => { throw new Error('x'); }, estimate: async () => { throw new Error('x'); } }, online: () => true });
  st = await quebrado.status();
  assert.equal(st.espaco, null); assert.equal(st.protecao, 'indisponivel', 'falha do navegador não derruba o painel');
});

/* ---------------- U12 · imagens do jogo baixadas sozinhas ---------------- */
function imagensContaveis() {
  const guardadas = new Set();
  return { available: true, guardadas, aquecidas: [], async warm(urls) { for (const u of urls) { this.aquecidas.push(u); guardadas.add(u); } return urls.length; }, async has(u) { return guardadas.has(u); } };
}
async function mundoU12({ rede = true } = {}) {
  const store = P.memoryStore();
  const { st, api: scryfall } = scryfallFalsa(); st.rede = rede;
  const cardRepo = C.createCardRepo({ store, scryfall });
  const decks = D.createDeckStore({ store }), collection = D.createCollection({ store });
  const images = imagensContaveis();
  const keeper = O.createOfflineKeeper({ cardRepo, decks, collection, images, names: { info: () => null, load: async () => null, ensure: async () => null }, ocr: {}, store, online: () => st.rede });
  return { st, cardRepo, decks, images, keeper };
}

test('U12 · status conta as imagens pequenas das listas, sem ir à rede para contar', async () => {
  const m = await mundoU12();
  await m.decks.save({ name: 'A', entries: [{ name: 'Island', qty: 20, zone: 'main' }, { name: 'Delver of Secrets', qty: 4, zone: 'main' }] });
  await m.decks.save({ name: 'B', entries: [{ name: 'Island', qty: 1, zone: 'main' }, { name: 'Fantasma', qty: 1, zone: 'main' }] });
  let st = await m.keeper.status();
  assert.deepEqual(JSON.parse(JSON.stringify(st.imagens)), { total: 0, guardadas: 0 }, 'sem dados guardados ainda, nada a contar');
  const chamadas = m.st.chamadas;
  await m.keeper.prepararTudo();
  assert.ok(m.st.chamadas > chamadas);
  const depoisDePreparar = m.st.chamadas;
  st = await m.keeper.status();
  // Q10 · a contagem passou a incluir a grande: 2 cartas × 2 tamanhos
  assert.deepEqual(JSON.parse(JSON.stringify(st.imagens)), { total: 4, guardadas: 4 }, 'Island e Delver, cada uma uma vez, mesmo em duas listas');
  assert.equal(m.st.chamadas, depoisDePreparar, 'contar não chama a Scryfall');
  // imagem apagada do cache (navegador limpou) aparece como faltando
  m.images.guardadas.delete('https://img/Island/s.jpg');
  st = await m.keeper.status();
  assert.deepEqual(JSON.parse(JSON.stringify(st.imagens)), { total: 4, guardadas: 3 });
});

test('U12 · sem rede nada é baixado; quando a rede volta, manter() baixa o que faltava', async () => {
  const m = await mundoU12();
  await m.decks.save({ name: 'A', entries: [{ name: 'Delver of Secrets', qty: 4, zone: 'main' }] });
  await m.keeper.guardarLista({ entries: [{ name: 'Delver of Secrets', qty: 4, zone: 'main' }] });
  m.images.guardadas.clear(); m.images.aquecidas.length = 0;
  m.st.rede = false;
  assert.equal(await m.keeper.manter(), null);
  assert.equal(m.images.aquecidas.length, 0, 'offline: nenhuma imagem pedida');
  m.st.rede = true;
  await m.keeper.manter();
  assert.ok(m.images.guardadas.has('https://img/Delver of Secrets/s.jpg') && m.images.guardadas.has('https://img/Delver of Secrets/n.jpg'));
  assert.deepEqual(JSON.parse(JSON.stringify((await m.keeper.status()).imagens)), { total: 2, guardadas: 2 }); // Q10 · pequena e grande
});

test('U12 · navegador sem cache de imagens: status diz null em vez de mentir', async () => {
  const m = await mundoU12();
  const k = O.createOfflineKeeper({ cardRepo: m.cardRepo, decks: m.decks, collection: D.createCollection({ store: P.memoryStore() }), images: { available: false }, names: {}, ocr: {}, store: P.memoryStore(), online: () => true });
  assert.equal((await k.status()).imagens, null);
});

test('U12 · cache de imagens: uma por vez, com folga só depois de download de verdade', async () => {
  const pausas = []; const pedidos = [];
  const cacheMem = new Map();
  const caches = { open: async () => ({ match: async u => cacheMem.get(u), put: async (u, r) => { cacheMem.set(u, r); } }) };
  const fetch = async u => { pedidos.push(u); return { ok: true, clone() { return this; } }; };
  const { createImageCache } = loadModules().imagesMod;
  const c = createImageCache({ caches, fetch, pausa: 50, espera: async ms => { pausas.push(ms); } });
  await c.warm(['a', 'b', 'a']);
  assert.deepEqual(pedidos, ['a', 'b']); assert.deepEqual(pausas, [50, 50]);
  await c.warm(['a', 'b']);
  assert.deepEqual(pausas, [50, 50], 'o que já está guardado não espera nem baixa');
});

/* ---------------- Q10 · auditoria offline ---------------- */
test('Q10 · fila única de imagens: duas passadas ao mesmo tempo não baixam a mesma URL duas vezes', async () => {
  const { createImageCache } = loadModules().imagesMod;
  const cacheMem = new Map(); const pedidos = [];
  const caches = { open: async () => ({ match: async u => cacheMem.get(u), put: async (u, r) => { cacheMem.set(u, r); } }) };
  const fetch = async u => { pedidos.push(u); await new Promise(r => setTimeout(r, 5)); return { ok: true, clone() { return this; } }; };
  const c = createImageCache({ caches, fetch, pausa: 0 });
  const [a, b] = await Promise.all([c.warm(['x', 'y']), c.warm(['y', 'z'])]);
  assert.deepEqual(pedidos, ['x', 'y', 'z'], 'em série, sem repetir a que a outra passada já guardou');
  assert.deepEqual([a, b], [2, 2]);
});

test('Q10 · manter() roda uma passada por vez, baixa a base de nomes e os dados das listas prontas uma vez por versão', async () => {
  const m = await mundoU12();
  let ensures = 0;
  const names = { info: () => null, load: async () => null, ensure: async () => { ensures++; return { count: 1 }; } };
  const k = O.createOfflineKeeper({ cardRepo: m.cardRepo, decks: m.decks, collection: D.createCollection({ store: P.memoryStore() }), images: m.images, names, ocr: {}, store: P.memoryStore(), online: () => m.st.rede,
    prontas: () => ['Island', 'Delver of Secrets', 'Island'] });
  const antes = m.st.chamadas;
  const [r1, r2] = await Promise.all([k.manter(), k.manter()]);
  assert.equal(r1, r2, 'a segunda chamada espera a primeira, não abre outra passada');
  assert.equal(ensures, 1, 'base de nomes pedida uma vez');
  assert.equal(r1.prontas, 2, 'as duas cartas únicas das listas prontas foram guardadas');
  assert.equal(await m.cardRepo.pinned(['Island', 'Delver of Secrets']), 2);
  const depois = m.st.chamadas;
  assert.ok(depois > antes);
  const r3 = await k.manter();
  assert.equal(r3.prontas, 0, 'na passada seguinte as prontas já estão feitas');
  assert.equal(m.st.chamadas, depois, 'e nada volta à rede');
  m.st.rede = false;
  assert.equal(await k.manter(), null);
});

test('Q10 · leitor do scanner: a bandeira só vale se os arquivos ainda estão no cache; sumiu, manter() baixa de novo', async () => {
  const m = await mundoU12();
  let noCache = true, warms = 0;
  const ocr = { warm: async () => { warms++; noCache = true; }, guardado: async () => noCache };
  const store = P.memoryStore(); await store.set('ocr.ready', 1);
  const k = O.createOfflineKeeper({ cardRepo: m.cardRepo, decks: m.decks, collection: D.createCollection({ store: P.memoryStore() }), images: m.images, names: {}, ocr, store, online: () => true });
  assert.equal((await k.status()).leitor, true);
  noCache = false;
  assert.equal((await k.status()).leitor, false, 'o navegador apagou o cache: o painel não mente');
  await k.manter();
  assert.equal(warms, 1, 'reaquecido sozinho porque já tinha sido preparado');
  assert.equal((await k.status()).leitor, true);
  // quem nunca preparou não recebe o download pesado sozinho
  const store2 = P.memoryStore(); let warms2 = 0;
  const k2 = O.createOfflineKeeper({ cardRepo: m.cardRepo, decks: m.decks, collection: D.createCollection({ store: P.memoryStore() }), images: m.images, names: {}, ocr: { warm: async () => { warms2++; }, guardado: async () => false }, store: store2, online: () => true });
  await k2.manter();
  assert.equal(warms2, 0);
  // navegador sem cache: null não derruba a bandeira
  const k3 = O.createOfflineKeeper({ cardRepo: m.cardRepo, decks: m.decks, collection: D.createCollection({ store: P.memoryStore() }), images: m.images, names: {}, ocr: { guardado: async () => null }, store, online: () => true });
  assert.equal((await k3.status()).leitor, true);
});

test('Q10 · a contagem de imagens do jogo inclui a grande (mão e zoom), não só a pequena', async () => {
  const m = await mundoU12();
  await m.decks.save({ name: 'A', entries: [{ name: 'Island', qty: 1, zone: 'main' }] });
  await m.keeper.manter();
  assert.deepEqual(JSON.parse(JSON.stringify((await m.keeper.status()).imagens)), { total: 2, guardadas: 2 });
  m.images.guardadas.delete('https://img/Island/n.jpg');
  assert.deepEqual(JSON.parse(JSON.stringify((await m.keeper.status()).imagens)), { total: 2, guardadas: 1 }, 'a grande sumiu: o painel diz');
});

test('Q10 · cache de imagens apagado pelo navegador com o app aberto: o app não escreve num cache fantasma', async () => {
  const { createImageCache } = loadModules().imagesMod;
  // simula o Cache Storage: apagar troca o objeto; um handle antigo fica desligado do nome
  let atual = new Map();
  const caches = { open: async () => { const mapa = atual; return { match: async u => mapa.get(u), put: async (u, r) => { mapa.set(u, r); } }; }, delete: async () => { atual = new Map(); return true; } };
  const c = createImageCache({ caches, fetch: async () => ({ ok: true, clone() { return this; } }), pausa: 0 });
  await c.warm(['a']);
  assert.equal(await c.has('a'), true);
  await caches.delete();
  assert.equal(await c.has('a'), false, 'apagado: o app vê que sumiu');
  await c.warm(['a']);
  assert.equal(atual.has('a'), true, 'guardado de novo no cache de verdade');
});

/* ---------------- H7 · imagem inteira ou nada: download cortado não fica guardado ---------------- */
const JPEG_H7 = n => { const b = new Uint8Array(n); b[0] = 0xFF; b[1] = 0xD8; for (let i = 2; i < n - 2; i++) b[i] = (i * 7) % 251; b[n - 2] = 0xFF; b[n - 1] = 0xD9; return b; };
const PNG_H7 = () => new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 1, 2, 3, 4, 0, 0, 0, 0, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82]);
test('H7 · imagemInteira: JPEG sem o fecho, PNG sem IEND, WebP menor que o cabeçalho diz e tamanho diferente do anunciado são cortadas', () => {
  const { imagemInteira } = loadModules().imagesMod;
  const j = JPEG_H7(4000);
  assert.equal(imagemInteira(j), true);
  assert.equal(imagemInteira(j.subarray(0, 1500)), false, 'JPEG cortado no meio (a tira do topo na tela)');
  assert.equal(imagemInteira(j, { tamanho: 4000 }), true);
  assert.equal(imagemInteira(j, { tamanho: 9000 }), false, 'menos bytes do que o servidor anunciou');
  const p = PNG_H7();
  assert.equal(imagemInteira(p), true); assert.equal(imagemInteira(p.subarray(0, 14)), false);
  const w = new Uint8Array(40); w.set([0x52, 0x49, 0x46, 0x46, 32, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
  assert.equal(imagemInteira(w), true); assert.equal(imagemInteira(w.subarray(0, 20)), false);
  assert.equal(imagemInteira(new Uint8Array(0)), false); assert.equal(imagemInteira(null), false);
  assert.equal(imagemInteira(new Uint8Array([1, 2, 3])), true, 'formato desconhecido não é barrado');
});

test('H7 · aquecer imagens: resposta cortada é pedida de novo sem o cache do navegador; cortada duas vezes não é guardada', async () => {
  const { createImageCache } = loadModules().imagesMod;
  const cacheMem = new Map(); const pedidos = [];
  const caches = { open: async () => ({ match: async u => cacheMem.get(u), put: async (u, r) => { cacheMem.set(u, r); } }) };
  const inteira = JPEG_H7(3000), cortada = inteira.subarray(0, 900);
  const resp = b => new Response(b, { status: 200, headers: { 'content-type': 'image/jpeg' } });
  const fetch = async (u, o) => { pedidos.push(u + ':' + (o.cache || 'normal')); if (u === 'ruim') return resp(cortada); if (u === 'volta') return resp(o.cache === 'reload' ? inteira : cortada); return resp(inteira); };
  const c = createImageCache({ caches, fetch, pausa: 0 });
  assert.equal(await c.warm(['boa', 'volta', 'ruim']), 2);
  assert.deepEqual(pedidos, ['boa:normal', 'volta:normal', 'volta:reload', 'ruim:normal', 'ruim:reload']);
  assert.deepEqual([...cacheMem.keys()], ['boa', 'volta'], 'a cortada não entra no cache');
  assert.equal(new Uint8Array(await cacheMem.get('volta').arrayBuffer()).length, 3000, 'o que ficou guardado é a imagem inteira');
});

import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = dirname(fileURLToPath(import.meta.url));
/** O service worker de verdade (sw.js) num contexto com cache e rede falsos. */
function workerH7({ rede }) {
  const ouvintes = {}; const guardado = new Map(); const pedidos = []; const esperas = [];
  const cache = { match: async k => { const r = guardado.get(k.url || k); return r ? r.clone() : undefined; }, put: async (k, r) => { guardado.set(k.url || k, r); }, delete: async k => guardado.delete(k.url || k) };
  const ctx = vm.createContext({ self: { location: { origin: 'https://guiamuy.github.io' }, addEventListener: (t, f) => { ouvintes[t] = f; }, skipWaiting() {}, clients: { claim() {} } },
    URL, Request, Response, Headers, Uint8Array, caches: { open: async () => cache, keys: async () => [], delete: async () => true },
    fetch: async req => { pedidos.push((req.mode || '') + ':' + (req.cache || '')); return rede(req, pedidos.length); } });
  vm.runInContext(readFileSync(join(ROOT, 'sw.js'), 'utf8'), ctx);
  const pede = async url => { let resposta; ouvintes.fetch({ request: new Request(url), respondWith: p => { resposta = p; }, waitUntil: p => esperas.push(p) }); const r = await resposta; await Promise.all(esperas); return r; };
  return { pede, guardado, pedidos };
}
test('H7 · service worker: imagem cortada na rede é buscada de novo e só a inteira é entregue e guardada', async () => {
  const inteira = JPEG_H7(5000);
  const sw = workerH7({ rede: async (req, n) => new Response(n === 1 ? inteira.subarray(0, 1200) : inteira, { status: 200, headers: { 'content-type': 'image/jpeg', 'content-length': '5000' } }) });
  const r = await sw.pede('https://cards.scryfall.io/normal/front/a/b/plains.jpg');
  assert.equal(new Uint8Array(await r.arrayBuffer()).length, 5000, 'a tela recebe a imagem inteira');
  assert.deepEqual(sw.pedidos, ['cors:default', 'cors:reload'], 'a segunda busca ignora o cache do navegador');
  assert.equal(new Uint8Array(await sw.guardado.get('https://cards.scryfall.io/normal/front/a/b/plains.jpg').clone().arrayBuffer()).length, 5000);
  await sw.pede('https://cards.scryfall.io/normal/front/a/b/plains.jpg');
  assert.equal(sw.pedidos.length, 2, 'guardada inteira: a próxima vez nem vai à rede');
});
test('H7 · service worker: cópia cortada que já estava no cache é apagada e trocada pela inteira; cortada sempre, nada é guardado', async () => {
  const inteira = JPEG_H7(5000), url = 'https://cards.scryfall.io/normal/front/a/b/hawk.jpg';
  const sw = workerH7({ rede: async () => new Response(inteira, { status: 200, headers: { 'content-type': 'image/jpeg' } }) });
  sw.guardado.set(url, new Response(inteira.subarray(0, 800), { status: 200, headers: { 'content-type': 'image/jpeg' } }));
  const r = await sw.pede(url);
  assert.equal(new Uint8Array(await r.arrayBuffer()).length, 5000, 'não serve a tira guardada');
  assert.equal(new Uint8Array(await sw.guardado.get(url).clone().arrayBuffer()).length, 5000, 'o cache se conserta');
  const ruim = workerH7({ rede: async () => new Response(inteira.subarray(0, 800), { status: 200, headers: { 'content-type': 'image/jpeg' } }) });
  await ruim.pede(url);
  assert.equal(ruim.guardado.size, 0, 'cortada duas vezes: não guarda, a próxima abertura tenta de novo');
});
test('H7 · tamanho da imagem da mesa pela densidade da tela: o menor que cobre os pixels; nunca o PNG; sem tamanho que cubra, o maior', () => {
  const { fonteParaLargura } = loadModules().mesaUi;
  const im = { small: 's', normal: 'n', large: 'l', png: 'p' };
  assert.equal(fonteParaLargura(im, 92, 1), 's', 'campo em tela 1×: 92 px cabem na pequena (146)');
  assert.equal(fonteParaLargura(im, 92, 3), 'n', 'campo no celular 3×: 276 px pedem a normal (488)');
  assert.equal(fonteParaLargura(im, 110, 2.625), 'n', 'mão no Galaxy (2,6×)');
  assert.equal(fonteParaLargura(im, 240, 3), 'l', 'nada cobre 720 px: a maior, sem ir ao PNG');
  assert.equal(fonteParaLargura(im, 110, 8), 'n', 'densidade absurda é tratada como 3×');
  assert.equal(fonteParaLargura({ normal: 'n' }, 60, 1), 'n'); assert.equal(fonteParaLargura({ png: 'p' }, 60, 1), 'p');
  assert.equal(fonteParaLargura(null, 92, 3), null);
});

test('V1 · a impressão escolhida numa carta da lista também é baixada (pequena e grande, frente e verso)', async () => {
  const m = await mundo();
  const print = { id: 'p2', set: 'mid', images: { small: 'https://img/p2/s.jpg', normal: 'https://img/p2/n.jpg' }, faces: [{ images: { small: null, normal: 'https://img/p2/f.jpg' } }, { images: { small: null, normal: 'https://img/p2/v.jpg' } }] };
  await m.keeper.guardarLista({ entries: [{ name: 'Delver of Secrets', qty: 4, zone: 'main', print }, { name: 'Delver of Secrets', qty: 2, zone: 'side', print }, { name: 'Island', qty: 16, zone: 'main' }] });
  for (const u of ['https://img/p2/s.jpg', 'https://img/p2/n.jpg', 'https://img/p2/v.jpg', 'https://img/Delver of Secrets/n.jpg']) assert.ok(m.images.aquecidas.includes(u), 'aquecida: ' + u);
  assert.equal(m.images.aquecidas.filter(u => u === 'https://img/p2/n.jpg').length, 1, 'uma vez por impressão');
});
