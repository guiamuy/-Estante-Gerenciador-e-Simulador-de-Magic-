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

test('Z3 · gruposPorTipo e gruposPorCusto: comandante, categorias da estante, custo 0 a 6+, terrenos, sem dados e reserva', () => {
  const cards = new Map([
    ['giada, font of hope', { name: 'Giada, Font of Hope', type_line: 'Legendary Creature — Angel', cmc: 2 }],
    ['sol ring', { name: 'Sol Ring', type_line: 'Artifact', cmc: 1 }],
    ['serra angel', { name: 'Serra Angel', type_line: 'Creature — Angel', cmc: 5 }],
    ['emeria shepherd', { name: 'Emeria Shepherd', type_line: 'Creature — Angel', cmc: 7 }],
    ['plains', { name: 'Plains', type_line: 'Basic Land — Plains', cmc: 0 }],
    ['swords to plowshares', { name: 'Swords to Plowshares', type_line: 'Instant', cmc: 1 }]]);
  const es = [{ name: 'Giada, Font of Hope', qty: 1, zone: 'commander' }, { name: 'Plains', qty: 30, zone: 'main' }, { name: 'Serra Angel', qty: 1, zone: 'main' },
    { name: 'Sol Ring', qty: 1, zone: 'main' }, { name: 'Emeria Shepherd', qty: 1, zone: 'main' }, { name: 'Swords to Plowshares', qty: 1, zone: 'main' }, { name: 'Carta Sem Dados', qty: 2, zone: 'main' }, { name: 'Sol Ring', qty: 1, zone: 'side' }];
  const tipo = K.gruposPorTipo(es, cards);
  assert.deepEqual(J(tipo.map(g => [g.chave, g.rotulo, g.n])), [['commander', 'Comandante', 1], ['creature', 'Criaturas', 2], ['instant', 'Instantâneas', 1], ['artifact', 'Artefatos', 1], ['land', 'Terrenos', 30], ['other', 'Outros', 2], ['side', 'Reserva', 1]]);
  assert.deepEqual(J(tipo[1].itens.map(i => i.name)), ['Serra Angel', 'Emeria Shepherd'], 'no grupo, do custo menor ao maior');
  assert.equal(tipo[1].itens[0].carta.cmc, 5);
  const custo = K.gruposPorCusto(es, cards);
  assert.deepEqual(J(custo.map(g => [g.chave, g.rotulo, g.n])), [['comandante', 'Comandante', 1], ['custo-1', 'Custo 1', 2], ['custo-5', 'Custo 5', 1], ['custo-6', 'Custo 6 ou mais', 1], ['terrenos', 'Terrenos', 30], ['sem-dados', 'Sem dados', 2], ['reserva', 'Reserva', 1]]);
  assert.deepEqual(J(K.gruposPorCusto(es, new Map()).map(g => g.chave)), ['comandante', 'sem-dados', 'reserva'], 'sem dados nenhum: tudo em "Sem dados"');
});
