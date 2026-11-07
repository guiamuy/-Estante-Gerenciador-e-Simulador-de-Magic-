// Leva G-350 · relato #65 (parte "arte da edição"): a miniatura da pilha do scanner e a arte da Coleção mostravam a arte
// padrão do nome (ou a de uma impressão qualquer, list[0]), não a da edição escolhida; e trocar a edição na pilha deixava
// a miniatura da leitura antiga. Agora a arte vem da impressão da cópia, e a cópia sem edição não leva arte nenhuma.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
const { scanner: X, platform: P, decks: D, cards: C } = loadModules();
const js = v => JSON.parse(JSON.stringify(v));

test('G-350 · chave e identificador da impressão: id, coleção+número, coleção+nome; sem coleção, nada', () => {
  assert.equal(D.chaveDaImpressao({ id: 'ABC-1', set: 'mh2', number: '1' }), 'id:abc-1');
  assert.equal(D.chaveDaImpressao({ set: 'MH2', number: '267' }), 'mh2|267');
  assert.equal(D.chaveDaImpressao({ set: 'mh2', collector_number: '267' }), 'mh2|267');
  assert.equal(D.chaveDaImpressao({ set: 'mh2', name: 'Sol  Ring' }), D.chaveDaImpressao({ set: 'MH2', name: 'sol ring' }));
  assert.equal(D.chaveDaImpressao({ name: 'Sol Ring' }), '', 'sem coleção não há impressão');
  assert.equal(D.chaveDaImpressao(null), '');
  assert.deepEqual(js(D.identDaImpressao({ id: 'abc', set: 'mh2' })), { id: 'abc' });
  assert.deepEqual(js(D.identDaImpressao({ set: 'MH2', number: '267' })), { set: 'mh2', collector_number: '267' });
  assert.deepEqual(js(D.identDaImpressao({ set: 'mh2', name: 'Island' })), { set: 'mh2', name: 'Island' });
  assert.equal(D.identDaImpressao({ name: 'Island' }), null);
});

test('G-350 · capa do nome na Coleção: a cópia com edição de mais cópias; empate, a mais recente; nenhuma com edição, nada', () => {
  const sem = { name: 'Island', qty: 9, added: 9 };
  const a = { name: 'Island', set: 'mh2', number: '1', qty: 2, added: 1 };
  const b = { name: 'Island', set: 'dmu', number: '2', qty: 2, added: 5 };
  const c = { name: 'Island', set: 'neo', number: '3', qty: 1, added: 9 };
  assert.equal(D.copiaDaCapa([sem, a, b, c]), b, 'a sem edição não conta, mesmo com mais cópias');
  assert.equal(D.copiaDaCapa([sem]), null, 'só sem edição: a arte é a desconhecida');
  assert.equal(D.copiaDaCapa([]), null);
});

test('G-350 · imagem da impressão na pilha: a da edição escolhida, por id ou coleção+número; sem edição ou sem achar, nada (nunca a primeira da lista)', () => {
  const prints = [
    { id: 'p1', set: 'lea', collector_number: '270', images: { normal: 'https://i/lea.jpg' } },
    { id: 'p2', set: 'cmm', collector_number: '400', images: { normal: 'https://i/cmm.jpg', small: 'https://i/cmm-s.jpg' } },
    { id: 'p3', set: 'mom', collector_number: '9', faces: [{ images: { normal: 'https://i/mom-f1.jpg' } }] },
  ];
  assert.equal(X.imagemDaImpressao(prints, { set: 'cmm', number: '400' }), 'https://i/cmm.jpg');
  assert.equal(X.imagemDaImpressao(prints, { set: 'CMM', id: 'P2' }), 'https://i/cmm.jpg');
  assert.equal(X.imagemDaImpressao(prints, { set: 'mom', number: '9' }), 'https://i/mom-f1.jpg', 'dupla face: a frente');
  assert.equal(X.imagemDaImpressao(prints, null), '', 'sem edição: arte desconhecida, não a primeira impressão');
  assert.equal(X.imagemDaImpressao(prints, { set: 'neo', number: '1' }), '', 'impressão que não está na lista: nada');
});

test('G-350 · pilha: escolher outra edição troca a miniatura pela da impressão escolhida (antes ficava a da leitura); desfazer volta a antiga', async () => {
  const lot = X.createLot({ store: P.memoryStore() });
  const k = await lot.add('Sol Ring', 1, { set: 'lea', number: '270' });
  await lot.enrich(k, { img: 'https://i/lea.jpg', imgDe: 'lea|270' });
  const r = await lot.escolhe(k, { set: 'cmm', number: '400', id: 'p2' }, 'nonfoil', 'https://i/cmm.jpg');
  let it = (await lot.list())[0];
  assert.equal(it.img, 'https://i/cmm.jpg');
  assert.equal(it.imgDe, 'id:p2', 'a miniatura sabe de que impressão é');
  await r.desfaz();
  it = (await lot.list())[0];
  assert.equal(it.img, 'https://i/lea.jpg'); assert.equal(it.set, 'lea');
  // sem a imagem da escolhida (impressões ainda não carregadas): a miniatura velha sai, a pilha busca a certa depois
  const r2 = await lot.escolhe(k, { set: 'cmm', number: '400' }, 'nonfoil');
  it = (await lot.list())[0];
  assert.equal(it.img, undefined, 'nada da edição antiga fica na miniatura');
  assert.equal(it.imgDe, '');
  await r2.desfaz();
  // juntar com a mesma impressão já na pilha: a miniatura certa fica
  const k3 = await lot.add('Island', 1, { set: 'mh2', number: '267' });
  await lot.enrich(k3, { img: 'https://i/velha.jpg', imgDe: 'lea|1' });
  await lot.add('Island', 1);
  await lot.escolhe('Island', { set: 'mh2', number: '267' }, 'nonfoil', 'https://i/mh2.jpg');
  const ilha = (await lot.list()).find(x => x.name === 'Island');
  assert.equal(ilha.qty, 2); assert.equal(ilha.img, 'https://i/mh2.jpg'); assert.equal(ilha.imgDe, 'mh2|267');
});

test('G-350 · repositório: arte por impressão em lote, guardada; sem rede, nada é guardado e a próxima tenta de novo', async () => {
  const store = P.memoryStore();
  let pedidos = [], rede = true;
  const scryfall = {
    collection: async () => ({ found: [], missing: [] }),
    porIdentificadores: async idents => {
      pedidos.push(js(idents));
      if (!rede) throw new Error('sem rede');
      const found = [];
      for (const i of idents) {
        if (i.id === 'p2') found.push({ id: 'p2', name: 'Sol Ring', set: 'cmm', set_name: 'Commander Masters', collector_number: '400', images: { normal: 'https://i/cmm.jpg' } });
        if (i.set === 'mh2' && i.collector_number === '267') found.push({ id: 'q', name: 'Island', set: 'mh2', collector_number: '267', images: { normal: 'https://i/mh2.jpg' } });
        if (i.set === 'mom' && i.name === 'Invasion of Ergamon') found.push({ id: 'z', name: 'Invasion of Ergamon // Truga Cliffcharger', set: 'mom', collector_number: '233', images: null,
          faces: [{ name: 'Invasion of Ergamon', images: { normal: 'https://i/f1.jpg' } }, { name: 'Truga Cliffcharger', images: { normal: 'https://i/f2.jpg' } }] });
      }
      return { found, missing: [] };
    },
  };
  const repo = C.createCardRepo({ store, scryfall });
  const copias = [{ name: 'Sol Ring', id: 'p2', set: 'cmm' }, { name: 'Island', set: 'mh2', number: '267' }, { name: 'Invasion of Ergamon', set: 'mom' },
    { name: 'Nada', set: 'xyz', number: '1' }, { name: 'Sem Edição' }];
  const m = await repo.impressoes(copias);
  assert.equal(pedidos.length, 1, 'um pedido para todas');
  assert.equal(pedidos[0].length, 4, 'a cópia sem edição não vai à rede');
  assert.equal(m.get('id:p2').images.normal, 'https://i/cmm.jpg');
  assert.equal(m.get('mh2|267').images.normal, 'https://i/mh2.jpg');
  assert.equal(m.get(D.chaveDaImpressao({ set: 'mom', name: 'Invasion of Ergamon' })).faces[0].images.normal, 'https://i/f1.jpg', 'dupla face achada pelo nome da face');
  assert.equal(m.get('xyz|1'), null, 'não achada: nada (sem arte inventada)');
  assert.equal(m.has(''), false);
  // de novo: tudo do armazenamento, sem rede
  rede = false; pedidos = [];
  const m2 = await repo.impressoes(copias.slice(0, 2));
  assert.equal(pedidos.length, 0, 'já guardadas');
  assert.equal(m2.get('mh2|267').images.normal, 'https://i/mh2.jpg');
  // sem rede com uma nova: volta nada e não guarda o "não achada"
  const m3 = await repo.impressoes([{ name: 'Forest', set: 'neo', number: '9' }]);
  assert.equal(m3.get('neo|9'), null);
  rede = true; pedidos = [];
  await repo.impressoes([{ name: 'Forest', set: 'neo', number: '9' }]);
  assert.equal(pedidos.length, 1, 'com a rede de volta, tenta de novo');
  // só o que está guardado (sem rede pedida)
  pedidos = [];
  const m4 = await repo.impressoes([{ name: 'Plains', set: 'dmu', number: '1' }], { onlineOnly: true });
  assert.equal(m4.get('dmu|1'), null); assert.equal(pedidos.length, 0);
});

// G-351 · o C13 caía no CI: 300 cópias importadas de uma vez e a arte das 150 com edição levava ~8 s para guardar — cada
// impressão era gravada no aparelho uma depois da outra (no IndexedDB de verdade, ~50 ms cada) —, e os dados das cartas
// (tipo, custo) esperavam atrás. A gravação das impressões vai junta, como a de byNames.
test('G-351 · as impressões pedidas de uma vez são guardadas juntas, não uma por uma', async () => {
  const mapa = new Map();
  let emVoo = 0, maxEmVoo = 0;
  const store = {
    get: async k => mapa.get(k),
    set: async (k, v) => { emVoo++; maxEmVoo = Math.max(maxEmVoo, emVoo); await new Promise(r => setTimeout(r, 20)); mapa.set(k, v); emVoo--; },
    del: async k => { mapa.delete(k); }, keys: async () => [...mapa.keys()],
  };
  const scryfall = { async porIdentificadores(idents) { return { found: idents.map((i, n) => ({ id: 'i' + n, name: 'Carta ' + i.collector_number, set: i.set, collector_number: i.collector_number, images: { normal: 'https://i/' + n + '.jpg' } })), missing: [] }; } };
  const repo = C.createCardRepo({ store, scryfall });
  const copias = Array.from({ length: 60 }, (_, n) => ({ name: 'Carta ' + n, set: 'abc', number: String(n) }));
  const t0 = Date.now();
  const m = await repo.impressoes(copias);
  const ms = Date.now() - t0;
  assert.equal([...m.values()].filter(Boolean).length, 60, 'as 60 voltam com a arte');
  assert.ok(maxEmVoo > 1, `gravações em paralelo (no máximo ${maxEmVoo} ao mesmo tempo)`);
  assert.ok(ms < 600, `60 impressões guardadas em ${ms} ms (uma por uma: ≥ 1200 ms)`);
  const m2 = await repo.impressoes(copias.slice(0, 3));
  assert.equal([...m2.values()].filter(Boolean).length, 3, 'guardadas: a segunda abertura não vai à rede e acha as três');
});
