// Z2 · catálogo de listas no app: recorte, imagem, lista para salvar e o serviço (cache do índice, sem rede, lista guardada).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
const { catalogo: K, platform: P } = loadModules();
const J = x => JSON.parse(JSON.stringify(x));
const L = (id, nome, formato, extra = {}) => ({ id: 'mtgjson-' + id, nome, formato, tipo: 'Commander Deck', data: '2026-10-02', codigo: 'FDC', fonte: 'mtgjson', cores: 'W', destaque: 'X', destaqueId: null, comandante: [], cartas: 100, ...extra });
const INDICE = { versao: 1, geradoEm: '2026-10-09T00:00:00.000Z', fontes: [], formatos: [], total: 4, pendentes: 0,
  listas: [L('anjos', 'Calling All Angels', 'commander', { comandante: ['Giada, Font of Hope'] }), L('desafio', 'Pioneer Challenger: Ãnimo', 'construido', { tipo: 'Pioneer Challenger Deck' }), L('boas', 'Welcome Deck 2017', 'iniciante', { codigo: 'W17' }), { id: '../fora', nome: 'quebrada', formato: 'commander' }, L('x', 'Formato desconhecido', 'vintage')] };

test('Z2 · listasDoIndice e filtraCatalogo: só as válidas; formato, e busca por nome, comandante e código sem acento', () => {
  const ls = K.listasDoIndice(INDICE);
  assert.deepEqual(J(ls.map(l => l.id)), ['mtgjson-anjos', 'mtgjson-desafio', 'mtgjson-boas']);
  assert.deepEqual(K.listasDoIndice({ versao: 2, listas: INDICE.listas }).length, 0);
  const ids = f => J(K.filtraCatalogo(ls, f).map(l => l.id));
  assert.deepEqual(ids({ formato: 'commander' }), ['mtgjson-anjos']);
  assert.deepEqual(ids({ texto: 'giada' }), ['mtgjson-anjos']);
  assert.deepEqual(ids({ texto: 'animo' }), ['mtgjson-desafio']);
  assert.deepEqual(ids({ texto: 'w17' }), ['mtgjson-boas']);
  assert.deepEqual(ids({ formato: 'pauper' }), []);
  assert.deepEqual(ids({}), ['mtgjson-anjos', 'mtgjson-desafio', 'mtgjson-boas']);
});

test('Z2 · imagem pela Scryfall, lista para salvar com a origem e "já na estante"', () => {
  assert.equal(K.imagemDaCarta('4ebc7622-08a1-4f43-92dd-8675d395e8f6'), 'https://cards.scryfall.io/small/front/4/e/4ebc7622-08a1-4f43-92dd-8675d395e8f6.jpg');
  assert.equal(K.imagemDaCarta('../x'), null); assert.equal(K.imagemDaCarta(null), null);
  const lista = { ...L('anjos', 'Calling All Angels', 'commander'), entradas: [{ name: 'Giada, Font of Hope', qty: 1, zone: 'commander' }, { name: 'Plains', qty: 30, zone: 'main' }, { name: '', qty: 1, zone: 'main' }, { name: 'X', qty: 0, zone: 'main' }, { name: 'Y', qty: 1, zone: 'maybe' }] };
  assert.deepEqual(J(K.listaParaSalvar(lista)), { name: 'Calling All Angels', format: 'commander', entries: [{ name: 'Giada, Font of Hope', qty: 1, zone: 'commander' }, { name: 'Plains', qty: 30, zone: 'main' }], origem: { fonte: 'mtgjson', id: 'mtgjson-anjos' } });
  assert.equal(K.listaParaSalvar({ ...lista, formato: 'brawl' }).format, 'livre');
  assert.equal(K.jaNaEstante(lista, [{ name: 'outra', origem: { id: 'mtgjson-anjos' } }]), true);
  assert.equal(K.jaNaEstante(lista, [{ name: 'calling all angels' }]), true);
  assert.equal(K.jaNaEstante(lista, [{ name: 'Outra' }]), false);
});

test('Z2 · serviço: índice guardado no prazo, vencido busca, sem rede devolve o guardado marcado, ausente sem guardado, lista guardada ao abrir', async () => {
  let agora = 1000, falha = false, ausente = false; const pedidos = [];
  const busca = async url => { pedidos.push(url.replace(K.BASE, '')); if (falha) throw new TypeError('Failed to fetch'); if (ausente) return { ok: false, status: 404 };
    const corpo = url.endsWith('indice.json') ? INDICE : { ...L('anjos', 'Calling All Angels', 'commander'), entradas: [{ name: 'Plains', qty: 99, zone: 'main' }] };
    return { ok: true, status: 200, json: async () => corpo }; };
  const store = P.memoryStore(), C = K.createCatalogo({ store, busca, agora: () => agora });
  const r1 = await C.indice(); assert.equal(r1.origem, 'rede'); assert.equal(r1.em, 1000);
  agora += K.PRAZO_MS - 1; assert.equal((await C.indice()).origem, 'guardado'); assert.equal(pedidos.length, 1);
  agora += 2; falha = true;
  const r3 = await C.indice(); assert.equal(r3.origem, 'guardado'); assert.equal(r3.velho, true); assert.equal(r3.dados.listas.length, 5);
  assert.equal((await C.indice({ forcar: true })).velho, true);
  const vazio = K.createCatalogo({ store: P.memoryStore(), busca, agora: () => agora });
  await assert.rejects(vazio.indice());
  falha = false; ausente = true; assert.equal((await vazio.indice()).ausente, true);
  ausente = false;
  const l = await C.lista('mtgjson-anjos'); assert.equal(l.entradas[0].qty, 99);
  falha = true; assert.equal((await C.lista('mtgjson-anjos')).nome, 'Calling All Angels', 'guardada: abre sem rede');
  await assert.rejects(C.lista('../fora'));
});
