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
  assert.ok(m.images.aquecidas.includes('https://img/Sol Ring/s.jpg') && !m.images.aquecidas.some(u => u.endsWith('/n.jpg')), 'coleção aquece só a miniatura');
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
  assert.deepEqual(JSON.parse(JSON.stringify(st.imagens)), { total: 2, guardadas: 2 }, 'Island e Delver, cada uma uma vez, mesmo em duas listas');
  assert.equal(m.st.chamadas, depoisDePreparar, 'contar não chama a Scryfall');
  // imagem apagada do cache (navegador limpou) aparece como faltando
  m.images.guardadas.delete('https://img/Island/s.jpg');
  st = await m.keeper.status();
  assert.deepEqual(JSON.parse(JSON.stringify(st.imagens)), { total: 2, guardadas: 1 });
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
  assert.deepEqual(JSON.parse(JSON.stringify((await m.keeper.status()).imagens)), { total: 1, guardadas: 1 });
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
