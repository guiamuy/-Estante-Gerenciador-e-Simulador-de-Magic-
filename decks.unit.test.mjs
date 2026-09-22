// Camada 1 · unidade do épico L: leitura de texto, validação, exportação e backup.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
const { decks: D, platform: P } = loadModules();

const card = (name, type_line, ci, extra = {}) => ({ name, type_line, color_identity: ci, cmc: 2, oracle_text: '', legalities: { commander: 'legal', pauper: 'legal' }, ...extra });
const CARDS = new Map([
  ['malcolm, alluring scoundrel', card('Malcolm', 'Legendary Creature — Siren Pirate', ['U'])],
  ['sol ring', card('Sol Ring', 'Artifact', [])],
  ['island', card('Island', 'Basic Land — Island', ['U'])],
  ['pyroblast', card('Pyroblast', 'Instant', ['R'])],
  ['counterspell', card('Counterspell', 'Instant', ['U'])],
  ['mana crypt', card('Mana Crypt', 'Artifact', [], { legalities: { commander: 'banned', pauper: 'not_legal' } })]
]);

test('L2 · lê Moxfield, Arena e MTGO: quantidade, x, (SET) nº, SB:, *CMDR* e cabeçalhos', () => {
  const r = D.parseDeckText('Commander\n1 Malcolm, Alluring Scoundrel (LCI) 63 *F*\n\nDeck\n1x Sol Ring (CMM) 400\n1 Island\n1 Island\nSB: 2 Pyroblast\n// comentário\nSideboard\n1 Counterspell [MH2]');
  const j = JSON.parse(JSON.stringify(r.entries));
  assert.deepEqual(j, [
    { name: 'Malcolm, Alluring Scoundrel', qty: 1, zone: 'commander' },
    { name: 'Sol Ring', qty: 1, zone: 'main' },
    { name: 'Island', qty: 2, zone: 'main' },
    { name: 'Pyroblast', qty: 2, zone: 'side' },
    { name: 'Counterspell', qty: 1, zone: 'side' }
  ]);
});

test('L2 · carta dividida "Fire // Ice" não vira comentário; entrada vazia não quebra', () => {
  assert.equal(D.parseDeckText('1 Fire // Ice').entries[0].name, 'Fire // Ice');
  assert.equal(D.parseDeckText('').entries.length, 0);
  assert.equal(D.parseDeckText(null).entries.length, 0);
});

test('L5 · Commander: tamanho, singleton, identidade de cor, banida e carta desconhecida', () => {
  const deck = { format: 'commander', entries: [
    { name: 'Malcolm, Alluring Scoundrel', qty: 1, zone: 'commander' }, { name: 'Island', qty: 30, zone: 'main' },
    { name: 'Counterspell', qty: 2, zone: 'main' }, { name: 'Pyroblast', qty: 1, zone: 'main' },
    { name: 'Mana Crypt', qty: 1, zone: 'main' }, { name: 'Carta Inventada', qty: 1, zone: 'main' }] };
  const msgs = D.validateDeck(deck, CARDS).map(i => i.message).join('\n');
  assert.match(msgs, /não reconhecida.*Carta Inventada/);
  assert.match(msgs, /Fora do Commander: Mana Crypt/);
  assert.match(msgs, /36 de 100/);
  assert.match(msgs, /Mais de uma cópia: Counterspell/);
  assert.doesNotMatch(msgs, /cópia: .*Island/, 'básico é isento do singleton');
  assert.match(msgs, /identidade de cor.*Pyroblast/);
});

test('L5 · Commander sem comandante e Pauper com mais de 4 cópias e reserva acima de 15', () => {
  assert.match(D.validateDeck({ format: 'commander', entries: [{ name: 'Island', qty: 100, zone: 'main' }] }, CARDS)[0].message, /comandante/);
  const msgs = D.validateDeck({ format: 'pauper', entries: [{ name: 'Counterspell', qty: 5, zone: 'main' }, { name: 'Pyroblast', qty: 16, zone: 'side' }] }, CARDS).map(i => i.message).join('\n');
  assert.match(msgs, /Mais de 4 cópias: Counterspell/);
  assert.match(msgs, /Reserva com 16/);
});

test('L4/L6 · exportar só o que falta desconta a coleção', () => {
  const deck = { entries: [{ name: 'Island', qty: 30, zone: 'main' }, { name: 'Sol Ring', qty: 1, zone: 'main' }] };
  assert.equal(D.exportText(deck, { onlyMissing: true, owned: { island: 28, 'sol ring': 1 } }), 'Deck\n2 Island');
});

test('L1 · backup exporta e restaura listas e coleção em outro aparelho', async () => {
  const a = P.memoryStore(), b = P.memoryStore();
  const da = D.createDeckStore({ store: a }), ca = D.createCollection({ store: a });
  await da.save({ name: 'Malcolm v3', format: 'commander', entries: [{ name: 'Sol Ring', qty: 1, zone: 'main' }] });
  await ca.set('Sol Ring', 1);
  const db = D.createDeckStore({ store: b }), cb = D.createCollection({ store: b });
  const r = await db.importAll(await da.exportAll(ca), cb);
  assert.equal(r.decks, 1);
  assert.equal((await db.list())[0].name, 'Malcolm v3');
  assert.equal(await cb.qty('sol ring'), 1);
  await assert.rejects(db.importAll('{"kind":"outra-coisa"}', cb), /formato-desconhecido/);
});

/* ---------------- C2, C7, C8, C9 · coleção ---------------- */
test('C7 · toque duplo alterna entre 0 e o alvo e nunca apaga cópias acima do alvo', async () => {
  const col = D.createCollection({ store: P.memoryStore() });
  let r = await col.toggle('Sol Ring', 1);
  assert.equal(r.after, 1); assert.equal(await col.qty('sol ring'), 1);
  r = await col.toggle('Sol Ring', 1);
  assert.equal(r.after, 0); assert.equal(await col.qty('Sol Ring'), 0);
  await col.set('Island', 30);
  r = await col.toggle('Island', 20);
  assert.equal(r.changed, false, '30 cópias com lista pedindo 20: não mexe');
  assert.equal(await col.qty('Island'), 30);
  r = await col.toggle('Counterspell', 4);
  assert.equal(r.after, 4, 'na lista, marca a quantidade que a lista pede');
});

test('C8 · marcar lista inteira garante a quantidade da lista, somando zonas, sem reduzir o que já existe', async () => {
  const col = D.createCollection({ store: P.memoryStore() });
  await col.set('Island', 40);
  const changed = await col.markOwned([{ name: 'Island', qty: 30, zone: 'main' }, { name: 'Pyroblast', qty: 2, zone: 'main' }, { name: 'Pyroblast', qty: 2, zone: 'side' }]);
  assert.equal(changed, 1);
  assert.equal(await col.qty('Island'), 40);
  assert.equal(await col.qty('Pyroblast'), 4);
});

test('C9 · editar quantidade, remover e listar com nome de exibição', async () => {
  const col = D.createCollection({ store: P.memoryStore() });
  await col.set('Malcolm, Alluring Scoundrel', 1);
  await col.set('Sol Ring', 3);
  await col.set('Sol Ring', 2);
  await col.remove('Malcolm, Alluring Scoundrel');
  const e = JSON.parse(JSON.stringify(await col.entries()));
  assert.deepEqual(e.map(({ key, name, qty }) => ({ key, name, qty })), [{ key: 'sol ring', name: 'Sol Ring', qty: 2 }]);
  await col.set('Counterspell', -3);
  assert.equal(await col.qty('Counterspell'), 0, 'quantidade negativa vira zero');
});

test('C2 · coleção antiga (só números) continua legível e o backup leva os nomes', async () => {
  const store = P.memoryStore();
  await store.set('collection.owned', { 'sol ring': 2 });
  const col = D.createCollection({ store });
  assert.equal((await col.entries())[0].name, 'sol ring', 'sem nome salvo, usa a chave');
  await col.set('Counterspell', 1);
  const decks = D.createDeckStore({ store });
  const b = JSON.parse(await decks.exportAll(col));
  assert.equal(b.ownedNames.counterspell, 'Counterspell');
  const other = P.memoryStore(); const col2 = D.createCollection({ store: other });
  await D.createDeckStore({ store: other }).importAll(JSON.stringify(b), col2);
  assert.equal((await col2.entries()).find(x => x.key === 'counterspell').name, 'Counterspell');
});

/* ---------------- C1 · coleção por impressão ---------------- */
test('C1 · migra a coleção por nome para cópias genéricas sem perder nada', async () => {
  const store = P.memoryStore();
  await store.set('collection.owned', { 'sol ring': 2, island: 30 });
  await store.set('collection.names', { 'sol ring': 'Sol Ring' });
  const col = D.createCollection({ store });
  assert.equal(await col.qty('Sol Ring'), 2);
  assert.equal(await col.qty('Island'), 30);
  const saved = await store.get('collection.items');
  assert.equal(saved.length, 2, 'migração gravada');
  assert.ok(saved.every(it => it.set === ''), 'sem impressão: cópia genérica');
});

test('C1 · impressões somam no total por nome; mesma impressão soma, diferente separa', async () => {
  const col = D.createCollection({ store: P.memoryStore() });
  await col.set('Counterspell', 1);
  await col.addPrinting({ name: 'Counterspell', set: 'MH2', number: '267', finish: 'foil', lang: 'en', cond: 'NM' }, 1);
  await col.addPrinting({ name: 'Counterspell', set: 'mh2', number: '267', finish: 'foil' }, 1);
  await col.addPrinting({ name: 'Counterspell', set: 'dmr', number: '45', lang: 'pt', cond: 'LP' }, 1);
  assert.equal(await col.qty('Counterspell'), 4);
  const g = (await col.entries())[0];
  assert.equal(g.items.length, 3, 'genérica + MH2 foil (x2) + DMR PT');
  assert.equal(g.items.find(i => i.set === 'mh2').qty, 2);
});

test('C1 · reduzir pelo nome consome a genérica primeiro e depois a impressão mais recente', async () => {
  const col = D.createCollection({ store: P.memoryStore() });
  await col.addPrinting({ name: 'Island', set: 'unf', number: '240' }, 2);
  await col.set('Island', 5); // +3 genéricas
  await col.addPrinting({ name: 'Island', set: 'sld', number: '1', finish: 'foil' }, 1);
  await col.set('Island', 3);
  const items = [...(await col.items()).map(i => `${i.set || 'gen'}:${i.qty}`)].sort();
  assert.deepEqual(items, ['sld:1', 'unf:2']);
  await col.set('Island', 2);
  assert.deepEqual([...(await col.items()).map(i => `${i.set}:${i.qty}`)], ['unf:2'], 'depois tira da impressão mais recente');
});

test('C1 · editar um item muda a chave e funde com um igual já existente', async () => {
  const col = D.createCollection({ store: P.memoryStore() });
  await col.addPrinting({ name: 'Sol Ring', set: 'cmm', number: '400' }, 1);
  const [a] = await col.items();
  await col.addPrinting({ name: 'Sol Ring', set: 'cmm', number: '400', finish: 'foil' }, 2);
  await col.updateItem(a.key, { finish: 'foil' });
  const items = await col.items();
  assert.equal(items.length, 1);
  assert.equal(items[0].qty, 3);
  await col.setItem(items[0].key, 0);
  assert.equal(await col.qty('Sol Ring'), 0);
});

/* ---------------- C3 · CSV ---------------- */
// Arquivos de exemplo montados a partir dos cabeçalhos públicos de exportação de cada app.
const CSV = {
  manabox: 'Name,Set code,Set name,Collector number,Foil,Rarity,Quantity,ManaBox ID,Scryfall ID,Purchase price,Misprint,Altered,Condition,Language,Purchase price currency\n' +
    'Sol Ring,CMM,Commander Masters,400,normal,uncommon,2,1,abc,1.5,false,false,near_mint,en,USD\n' +
    '"Malcolm, Alluring Scoundrel",LCI,The Lost Caverns of Ixalan,63,foil,rare,1,2,def,3,false,false,lightly_played,pt,USD\n',
  moxfield: 'Count,Tradelist Count,Name,Edition,Condition,Language,Foil,Tags,Last Modified,Collector Number,Alter,Proxy,Purchase Price\n' +
    '"4","0","Counterspell","mh2","Near Mint","English","foil","","2024-01-01 00:00:00.000000","267","False","False",""\n' +
    '"1","0","Island","unf","Moderately Played","Japanese","","","2024-01-01 00:00:00.000000","240","False","False",""\n',
  archidekt: 'Quantity,Name,Finish,Condition,Date Added,Language,Purchase Price,Tags,Edition Name,Edition Code,Multiverse Id,Scryfall ID,MTGO ID,Collector Number\n' +
    '3,Lightning Bolt,Normal,NM,2024-01-01,EN,,,Magic 2010,m10,1,xyz,1,146\n',
  semicolon: '\uFEFFQuantidade;Name;Set\n2;Preordain;m11\n0;Brainstorm;ice\n;;\n'
};

test('C3 · ManaBox: formato reconhecido, acabamento, condição e idioma normalizados', () => {
  const r = D.parseCollectionCSV(CSV.manabox);
  assert.equal(r.format, 'ManaBox');
  const [sol, mal] = JSON.parse(JSON.stringify(r.items));
  assert.deepEqual({ n: sol.name, q: sol.qty, s: sol.set, f: sol.finish, c: sol.cond, l: sol.lang, num: sol.number }, { n: 'Sol Ring', q: 2, s: 'cmm', f: '', c: 'NM', l: 'en', num: '400' });
  assert.deepEqual({ n: mal.name, f: mal.finish, c: mal.cond, l: mal.lang }, { n: 'Malcolm, Alluring Scoundrel', f: 'foil', c: 'LP', l: 'pt' });
});

test('C3 · Moxfield e Archidekt: colunas diferentes, mesmo resultado', () => {
  const m = D.parseCollectionCSV(CSV.moxfield);
  assert.equal(m.format, 'Moxfield');
  assert.deepEqual([...m.items.map(i => `${i.qty} ${i.name} ${i.set} ${i.finish || '-'} ${i.cond} ${i.lang}`)], ['4 Counterspell mh2 foil NM en', '1 Island unf - MP ja']);
  const a = D.parseCollectionCSV(CSV.archidekt);
  assert.equal(a.format, 'Archidekt');
  assert.equal(`${a.items[0].qty} ${a.items[0].set} ${a.items[0].number} ${a.items[0].finish || '-'}`, '3 m10 146 -');
});

test('C3 · separador ponto e vírgula, BOM, quantidade inválida e arquivo sem nome', () => {
  const r = D.parseCollectionCSV(CSV.semicolon);
  assert.equal(r.items.length, 1);
  assert.equal(r.items[0].name, 'Preordain');
  assert.match(r.skipped[0].reason, /quantidade inválida em Brainstorm/);
  assert.match(D.parseCollectionCSV('Qty,Set\n1,m10').error, /sem coluna de nome/);
  assert.match(D.parseCollectionCSV('').error, /vazio/);
});

test('C3 · exportar e importar de volta preserva impressão, acabamento, idioma e condição', async () => {
  const a = D.createCollection({ store: P.memoryStore() });
  await a.importItems(D.parseCollectionCSV(CSV.manabox).items);
  await a.set('Island', 10);
  const csv = D.exportCollectionCSV(await a.items());
  assert.match(csv, /^Count,Name,Edition,Condition,Language,Foil,Collector Number/);
  assert.match(csv, /"Malcolm, Alluring Scoundrel"/);
  const b = D.createCollection({ store: P.memoryStore() });
  await b.importItems(D.parseCollectionCSV(csv).items);
  const key = i => [i.name, i.set, i.number, i.finish, i.lang, i.cond, i.qty].join('|');
  assert.deepEqual([...(await b.items()).map(key)].sort(), [...(await a.items()).map(key)].sort());
});

test('C3 · substituir troca a coleção inteira; somar acumula', async () => {
  const col = D.createCollection({ store: P.memoryStore() });
  await col.set('Island', 5);
  await col.importItems([{ name: 'Island', qty: 2 }], 'add');
  assert.equal(await col.qty('Island'), 7);
  await col.importItems([{ name: 'Sol Ring', qty: 1 }], 'replace');
  assert.equal(await col.qty('Island'), 0);
  assert.equal(await col.qty('Sol Ring'), 1);
});

test('C5 · backup v2 leva as impressões e registra a data do último backup', async () => {
  const store = P.memoryStore();
  const col = D.createCollection({ store }); const decks = D.createDeckStore({ store, now: () => 1234 });
  await col.addPrinting({ name: 'Sol Ring', set: 'cmm', number: '400', finish: 'foil' }, 1);
  const b = JSON.parse(await decks.exportAll(col));
  assert.equal(b.version, 2);
  assert.equal(await decks.lastBackup(), 1234);
  const other = P.memoryStore(); const col2 = D.createCollection({ store: other });
  await D.createDeckStore({ store: other }).importAll(JSON.stringify(b), col2);
  assert.equal((await col2.items())[0].finish, 'foil');
});
