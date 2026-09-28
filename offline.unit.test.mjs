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

test('O1 · lista salva é guardada sozinha: dados fixados e imagem grande aquecida', async () => {
  const m = await mundo();
  m.keeper.vigiar({ atraso: 0, timer: fn => { fn(); return 0; }, cancela: () => {} });
  await m.decks.save({ name: 'Delver', format: 'pauper', entries: [{ name: 'Delver of Secrets', qty: 4, zone: 'main' }, { name: 'Island', qty: 20, zone: 'main' }] });
  for (let i = 0; i < 50 && (await m.cardRepo.pinned(['Delver of Secrets', 'Island'])) < 2; i++) await new Promise(r => setTimeout(r, 10));
  assert.equal(await m.cardRepo.pinned(['Delver of Secrets', 'Island']), 2, 'as duas guardadas para sempre');
  assert.ok(m.images.aquecidas.includes('https://img/Delver of Secrets/n.jpg'), 'imagem grande da carta');
  assert.ok(!m.images.aquecidas.some(u => u.endsWith('/s.jpg')), 'lista não aquece miniatura');
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
