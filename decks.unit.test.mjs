// Camada 1 · unidade do épico L: leitura de texto, validação, exportação e backup.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
const { decks: D, platform: P, starter: S } = loadModules();

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

/* ---------------- L11 · companheiro ---------------- */
const cc = (name, type_line, cmc, ci, extra = {}) => [name.toLowerCase(), { name, type_line, cmc, color_identity: ci, mana_cost: extra.mana_cost || '', oracle_text: extra.oracle_text || '', legalities: { commander: 'legal', pauper: 'legal' } }];
const LURRUS_TXT = 'Companion — Each permanent card in your starting deck has mana value 2 or less.\nLifelink';
const CC = new Map([
  cc('Lurrus of the Dream-Den', 'Legendary Creature — Cat Nightmare', 3, ['W', 'B'], { oracle_text: LURRUS_TXT }),
  cc('Kaheera, the Orphanguard', 'Legendary Creature — Cat Beast', 3, ['G', 'W'], { oracle_text: 'Companion — Each creature card in your starting deck is a Cat, Elemental, Nightmare, Dinosaur, or Beast card.' }),
  cc('Jegantha, the Wellspring', 'Legendary Creature — Elemental Elk', 5, ['R', 'G'], { oracle_text: 'Companion — No card in your starting deck has more than one of the same mana symbol in its mana cost.' }),
  cc('Unknown Pal', 'Legendary Creature — Human', 2, ['W'], { oracle_text: 'Companion — Something new.' }),
  cc('Thalia, Guardian of Thraben', 'Legendary Creature — Human Soldier', 2, ['W', 'B']), // identidade W/B só para o teste
  cc('Mentor', 'Creature — Human', 1, ['W']),
  cc('Big Guy', 'Creature — Giant', 4, ['W']),
  cc('Wrath', 'Sorcery', 4, ['W']),
  cc('Plains', 'Basic Land — Plains', 0, []),
  cc('Swamp', 'Basic Land — Swamp', 0, []),
  cc('Doublecost', 'Creature — Elemental', 2, ['R'], { mana_cost: '{R}{R}' })
]);
const cmdDeck = extra => ({ format: 'commander', entries: [
  { name: 'Thalia, Guardian of Thraben', qty: 1, zone: 'commander' }, { name: 'Lurrus of the Dream-Den', qty: 1, zone: 'companion' },
  { name: 'Mentor', qty: 1, zone: 'main' }, { name: 'Wrath', qty: 1, zone: 'main' }, { name: 'Plains', qty: 97, zone: 'main' }, ...(extra || [])] });
const msgs = d => [...D.validateDeck(d, CC).map(i => `${i.level}: ${i.message}`)].join('\n');

test('L11 · companheiro fica fora das 100 do Commander', () => {
  const m = msgs(cmdDeck());
  assert.doesNotMatch(m, /de 100/, 'comandante + 99 = 100, companheiro não conta');
  assert.doesNotMatch(m, /Lurrus/, 'Lurrus cumprida: permanentes com valor 2 ou menos; mágica de valor 4 não conta');
  const st = D.deckStats(cmdDeck(), CC, {});
  assert.equal(st.main, 100); assert.equal(st.companion, 1);
});

test('L11 · condição do Lurrus quebrada, identidade de cor e só um companheiro', () => {
  assert.match(msgs(cmdDeck([{ name: 'Big Guy', qty: 1, zone: 'main' }])), /Condição de Lurrus.*Big Guy/);
  const offColor = cmdDeck(); offColor.entries[0] = { name: 'Mentor', qty: 1, zone: 'commander' };
  CC.get('mentor').type_line = 'Legendary Creature — Human'; // vira comandante válido mono-W
  assert.match(msgs(offColor), /fora da identidade de cor do comandante/);
  CC.get('mentor').type_line = 'Creature — Human';
  assert.match(msgs(cmdDeck([{ name: 'Kaheera, the Orphanguard', qty: 1, zone: 'companion' }])), /Só pode haver um companheiro/);
});

test('L11 · Kaheera e Jegantha checam tipo e símbolos; companheiro desconhecido pede conferência; carta sem Companion é recusada', () => {
  const pauper = (comp, main) => ({ format: 'pauper', entries: [{ name: comp, qty: 1, zone: 'companion' }, ...main] });
  assert.match(msgs(pauper('Kaheera, the Orphanguard', [{ name: 'Mentor', qty: 4, zone: 'main' }, { name: 'Plains', qty: 56, zone: 'main' }])), /Condição de Kaheera.*Mentor/);
  assert.match(msgs(pauper('Jegantha, the Wellspring', [{ name: 'Doublecost', qty: 4, zone: 'main' }, { name: 'Plains', qty: 56, zone: 'main' }])), /Condição de Jegantha.*Doublecost/);
  assert.match(msgs(pauper('Unknown Pal', [{ name: 'Plains', qty: 60, zone: 'main' }])), /warning: Condição do companheiro Unknown Pal não é verificada/);
  assert.match(msgs(pauper('Mentor', [{ name: 'Plains', qty: 60, zone: 'main' }])), /Mentor não tem a habilidade Companheiro/);
});

test('L11 · Pauper: companheiro fora das 60, mas ocupa vaga da reserva', () => {
  const d = { format: 'pauper', entries: [{ name: 'Unknown Pal', qty: 1, zone: 'companion' }, { name: 'Plains', qty: 60, zone: 'main' }, { name: 'Mentor', qty: 15, zone: 'side' }] };
  const m = msgs(d);
  assert.doesNotMatch(m, /de 60/);
  assert.match(m, /Reserva com 16 cartas \(máximo 15, companheiro incluído\)/);
});

test('L11 · texto: cabeçalho Companion vira zona própria e a exportação preserva', () => {
  const r = D.parseDeckText('Commander\n1 Thalia, Guardian of Thraben\n\nCompanion\n1 Lurrus of the Dream-Den\n\nDeck\n1 Mentor');
  assert.equal(r.entries.find(e => e.name === 'Lurrus of the Dream-Den').zone, 'companion');
  assert.match(D.exportText({ entries: r.entries }), /Commander\n1 Thalia, Guardian of Thraben\n\nCompanion\n1 Lurrus of the Dream-Den\n\nDeck\n1 Mentor/);
});

/* ---------------- A12 · listas prontas ---------------- */
test('A12 · as nove listas prontas leem sem sobra, com formato e contagem certos', () => {
  const todas = S.STARTER_DECKS;
  assert.equal(todas.length, 9, 'sete do Pauper e duas de Commander');
  assert.equal(todas.filter(x => x.format === 'pauper').length, 7);
  assert.equal(todas.filter(x => x.format === 'commander').length, 2);
  const nomes = new Set();
  for (const d of todas) {
    assert.ok(d.name && d.name.trim(), 'lista sem nome');
    assert.equal(nomes.has(d.name), false, `nome repetido: ${d.name}`);
    nomes.add(d.name);
    const { entries, skipped } = D.parseDeckText(d.text);
    assert.deepEqual(JSON.parse(JSON.stringify(skipped)), [], `${d.name}: linha ignorada na leitura`);
    const total = entries.reduce((n, e) => n + e.qty, 0);
    // no Commander o companheiro fica fora das 100, como manda a regra
    const jogando = entries.filter(e => e.zone === 'main' || e.zone === 'commander').reduce((n, e) => n + e.qty, 0);
    if (d.format === 'pauper') assert.equal(total, 75, `${d.name}: ${total} cartas`);
    else assert.equal(jogando, 100, `${d.name}: ${jogando} cartas (comandante incluído)`);
    assert.ok(entries.every(e => D.ZONES.includes(e.zone)), `${d.name}: zona desconhecida`);
  }
});

test('A12 · as duas de Commander trazem comandante, e uma delas companheiro', () => {
  const cmds = S.STARTER_DECKS.filter(x => x.format === 'commander').map(d => D.parseDeckText(d.text).entries);
  for (const entries of cmds) {
    const cmd = entries.filter(e => e.zone === 'commander');
    assert.ok(cmd.length >= 1 && cmd.length <= 2, 'um ou dois comandantes');
    assert.ok(cmd.every(e => e.qty === 1), 'uma cópia de cada comandante');
  }
  const comCompanheiro = cmds.filter(entries => entries.some(e => e.zone === 'companion'));
  assert.equal(comCompanheiro.length, 1, 'só a lista do Killian tem companheiro');
});

test('A12 · nenhuma lista pronta do Pauper passa de 4 cópias de uma carta que não é básico', () => {
  const BASICOS = new Set(['plains', 'island', 'swamp', 'mountain', 'forest', 'wastes']);
  for (const d of S.STARTER_DECKS.filter(x => x.format === 'pauper')) {
    const soma = new Map();
    for (const e of D.parseDeckText(d.text).entries) {
      const k = e.name.toLowerCase();
      soma.set(k, (soma.get(k) || 0) + e.qty);
    }
    for (const [k, n] of soma) if (!BASICOS.has(k)) assert.ok(n <= 4, `${d.name}: ${k} com ${n} cópias`);
  }
});

/* ---------------- C10 · coleção em texto de lista ---------------- */
const ITENS = [
  { name: 'Lightning Bolt', set: 'cmm', number: '141', finish: '', lang: 'en', cond: 'NM', qty: 3 },
  { name: 'Lightning Bolt', set: 'cmm', number: '141', finish: 'foil', lang: 'en', cond: 'NM', qty: 1 },
  { name: 'Lightning Bolt', set: '', number: '', finish: '', lang: '', cond: '', qty: 2 },
  { name: "Ulamog's Crusher", set: '', number: '', finish: '', lang: '', cond: '', qty: 1 },
  { name: 'Fire // Ice', set: 'mh3', number: '285', finish: 'etched', lang: 'en', cond: 'NM', qty: 1 },
  { name: 'Jötun Grunt', set: 'csp', number: '10', finish: '', lang: 'pt', cond: 'LP', qty: 2 },
  { name: 'Sem cópia', set: '', number: '', finish: '', lang: '', cond: '', qty: 0 }
];

test('C10 · formato simples soma as impressões numa linha por nome, em ordem alfabética, com cabeçalho', () => {
  const r = D.exportCollectionText(ITENS, { formato: 'simples', agora: '2026-09-28' });
  assert.equal(r.text, [
    '// Estante · coleção · 4 carta(s) · 10 cópia(s) · 2026-09-28',
    '2 Fire // Ice', '2 Jötun Grunt', '6 Lightning Bolt', "1 Ulamog's Crusher", ''].join('\n').replace('2 Fire // Ice', '1 Fire // Ice'));
  assert.equal(r.cartas, 4); assert.equal(r.copias, 10); assert.equal(r.genericas, 3); assert.equal(r.linhas, 4);
  // o que sai volta a entrar como lista: acentos, apóstrofo e carta de duas faces intactos
  const back = D.parseDeckText(r.text);
  assert.deepEqual(JSON.parse(JSON.stringify(back.entries.map(e => [e.qty, e.name]))), [[1, 'Fire // Ice'], [2, 'Jötun Grunt'], [6, 'Lightning Bolt'], [1, "Ulamog's Crusher"]]);
  assert.equal(back.skipped.length, 0, 'o cabeçalho é comentário, não linha ignorada');
});

test('C10 · formato arena: uma linha por impressão, sem comentários, só a frente da carta de duas faces', () => {
  const r = D.exportCollectionText(ITENS, { formato: 'arena' });
  assert.equal(r.text, ['1 Fire (MH3) 285', '2 Jötun Grunt (CSP) 10', '2 Lightning Bolt', '3 Lightning Bolt (CMM) 141', '1 Lightning Bolt (CMM) 141', "1 Ulamog's Crusher", ''].join('\n'), 'genérica antes das impressões; normal antes de foil');
  assert.ok(!/^\/\//m.test(r.text), 'sem cabeçalho: o Arena rejeita');
  // o que a Estante lê de volta perde a edição (L2) mas não a quantidade
  const back = D.parseDeckText(r.text);
  assert.equal(back.entries.find(e => e.name === 'Lightning Bolt').qty, 6);
});

test('C10 · formato completo: edição, número, *F*/*E* e cabeçalho que declara as cópias sem edição', () => {
  const r = D.exportCollectionText(ITENS, { formato: 'completo' });
  const linhas = r.text.split('\n');
  assert.match(linhas[0], /^\/\/ Estante · coleção · 4 carta\(s\) · 10 cópia\(s\)$/);
  assert.equal(linhas[1], '// 3 cópia(s) sem edição definida saem só com o nome');
  assert.ok(linhas.includes('1 Fire // Ice (MH3) 285 *E*'), 'etched marcado e nome inteiro');
  assert.ok(linhas.includes('1 Lightning Bolt (CMM) 141 *F*'), 'foil marcado');
  assert.ok(linhas.includes('3 Lightning Bolt (CMM) 141'), 'normal sem marca');
  assert.ok(linhas.includes('2 Lightning Bolt'), 'genérica só com o nome');
  const semCab = D.exportCollectionText(ITENS, { formato: 'completo', cabecalho: false });
  assert.ok(!semCab.text.startsWith('//'));
});

test('C10 · seleção manual exporta só os nomes escolhidos, e coleção vazia dá texto vazio', () => {
  const r = D.exportCollectionText(ITENS, { formato: 'simples', selecao: new Set(['lightning bolt', 'fire // ice']), cabecalho: true });
  assert.equal(r.text, '// Estante · seleção da coleção · 2 carta(s) · 7 cópia(s)\n1 Fire // Ice\n6 Lightning Bolt\n');
  assert.equal(r.cartas, 2);
  const vazio = D.exportCollectionText([], { formato: 'simples', cabecalho: false });
  assert.equal(vazio.text, ''); assert.equal(vazio.linhas, 0);
  assert.equal(D.exportCollectionText(ITENS, { selecao: new Set(['nada']) }).linhas, 0, 'seleção que não casa nada');
});

/* ---------------- C11 · importar por lista ---------------- */
test('C11 · o leitor de lista guarda edição, número e foil, e tolera numeração, cabeçalhos, comentários e lixo', () => {
  const texto = [
    '// Estante · coleção · 3 carta(s)', '', 'Deck', '1. Sol Ring', '2) Counterspell (MH2) 267 *F*', '3x Lightning Bolt [CMM] 141',
    'Fire // Ice (MH3) 285 *E*', 'SB: 1 Pyroblast', '0 Nada', '4', '4 ', '1000 Island', 'Jötun Grunt', "2 Ulamog's Crusher (ROE) 9"
  ].join('\n');
  const r = D.parseCollectionText(texto);
  const plain = JSON.parse(JSON.stringify(r.items.map(({ name, qty, set, number, finish, line }) => ({ name, qty, set, number, finish, line }))));
  assert.deepEqual(plain, [
    { name: 'Sol Ring', qty: 1, set: '', number: '', finish: '', line: 4 },
    { name: 'Counterspell', qty: 1, set: 'mh2', number: '267', finish: 'foil', line: 5 },   // "2)" é numeração, não quantidade
    { name: 'Lightning Bolt', qty: 3, set: 'cmm', number: '141', finish: '', line: 6 },
    { name: 'Fire // Ice', qty: 1, set: 'mh3', number: '285', finish: 'etched', line: 7 },
    { name: 'Pyroblast', qty: 1, set: '', number: '', finish: '', line: 8 },
    { name: 'Jötun Grunt', qty: 1, set: '', number: '', finish: '', line: 13 },
    { name: "Ulamog's Crusher", qty: 2, set: 'roe', number: '9', finish: '', line: 14 }
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(r.skipped.map(x => [x.line, x.reason]))), [[9, 'quantidade zero'], [10, 'sem nome'], [11, 'sem nome'], [12, 'quantidade acima de 999']]);
  assert.equal(r.skipped[0].raw, '0 Nada', 'a linha original vai junto para a conferência mostrar');
});

test('C11 · o que a C10 exporta volta inteiro pela C11, nos três formatos', () => {
  const itens = [
    { name: 'Lightning Bolt', set: 'cmm', number: '141', finish: 'foil', lang: 'en', cond: 'NM', qty: 1 },
    { name: 'Lightning Bolt', set: '', number: '', finish: '', lang: '', cond: '', qty: 2 },
    { name: 'Fire // Ice', set: 'mh3', number: '285', finish: 'etched', lang: 'en', cond: 'NM', qty: 1 }
  ];
  const completo = D.parseCollectionText(D.exportCollectionText(itens, { formato: 'completo' }).text);
  assert.equal(completo.skipped.length, 0);
  assert.deepEqual(JSON.parse(JSON.stringify(completo.items.map(i => [i.qty, i.name, i.set, i.number, i.finish]))),
    [[1, 'Fire // Ice', 'mh3', '285', 'etched'], [2, 'Lightning Bolt', '', '', ''], [1, 'Lightning Bolt', 'cmm', '141', 'foil']]);
  const simples = D.parseCollectionText(D.exportCollectionText(itens, { formato: 'simples' }).text);
  assert.deepEqual(JSON.parse(JSON.stringify(simples.items.map(i => [i.qty, i.name]))), [[1, 'Fire // Ice'], [3, 'Lightning Bolt']]);
  const arena = D.parseCollectionText(D.exportCollectionText(itens, { formato: 'arena' }).text);
  assert.equal(arena.items.find(i => i.set === 'cmm').finish, '', 'arena não leva foil');
});

test('C11 · a conferência separa o que soma, o que é novo e o que fica pendente, com sugestão', () => {
  const { items } = D.parseCollectionText('2 Sol Ring\n1 Counterspel\n3 island\n1 Xyzzy');
  const existentes = new Set(['sol ring']);
  const conhecidos = new Map([['sol ring', 'Sol Ring'], ['island', 'Island']]);
  const sugestoes = new Map([['counterspel', 'Counterspell']]);
  const plano = D.planCollectionImport(items, { existentes, conhecidos, sugestoes });
  assert.deepEqual(JSON.parse(JSON.stringify(plano.somam.map(x => [x.qty, x.name]))), [[2, 'Sol Ring']]);
  assert.deepEqual(JSON.parse(JSON.stringify(plano.novas.map(x => [x.qty, x.name]))), [[3, 'Island']], 'nome canônico no lugar do digitado');
  assert.deepEqual(JSON.parse(JSON.stringify(plano.pendentes.map(x => [x.name, x.reason, x.sugestao]))), [['Counterspel', 'nome não encontrado', 'Counterspell'], ['Xyzzy', 'nome não encontrado', null]]);
  assert.deepEqual(JSON.parse(JSON.stringify(plano.copias)), { novas: 3, somam: 2, pendentes: 2 });
  assert.equal(plano.conferido, true);
  // sem como conferir (offline e sem base): nada fica pendente, tudo entra como foi escrito
  const cego = D.planCollectionImport(items, { existentes });
  assert.equal(cego.conferido, false); assert.equal(cego.pendentes.length, 0); assert.equal(cego.novas.length, 3);
});

test('C11 · pendências ficam guardadas na coleção até serem corrigidas ou descartadas', async () => {
  const c = D.createCollection({ store: P.memoryStore() });
  assert.equal((await c.pending()).length, 0);
  await c.addPending([{ name: 'Xyzzy', qty: 1, raw: '1 Xyzzy', reason: 'nome não encontrado' }, { name: 'Counterspel', qty: 2, set: 'mh2', number: '267', reason: 'nome não encontrado' }]);
  let p = await c.pending();
  assert.equal(p.length, 2); assert.equal(p[1].set, 'mh2');
  assert.equal(await c.removePending(0), 1);
  p = await c.pending(); assert.equal(p[0].name, 'Counterspel');
  await c.clearPending(); assert.equal((await c.pending()).length, 0);
});

/* ---------------- O2 · sem rede, carta sem dados é "não conferida" ---------------- */
test('O2 · validação: sem rede a carta sem dados guardados é aviso de "não conferida", não erro', () => {
  const deck = { format: 'pauper', entries: [{ name: 'Counterspell', qty: 4, zone: 'main' }, { name: 'Xyzzy', qty: 1, zone: 'main' }] };
  const comRede = D.validateDeck(deck, CARDS);
  assert.equal(comRede[0].level, 'error'); assert.match(comRede[0].message, /1 carta\(s\) não reconhecida\(s\): Xyzzy/);
  const semRede = D.validateDeck(deck, CARDS, { semRede: true });
  assert.equal(semRede[0].level, 'warning'); assert.match(semRede[0].message, /1 carta\(s\) ainda não conferida\(s\) \(sem internet; os dados não estão guardados\): Xyzzy/);
  assert.equal(semRede.some(i => i.level === 'error' && /reconhecida/.test(i.message)), false, 'sem erro de reconhecimento');
});

/* ---------------- C12b · visões salvas ---------------- */
test('C12b · visões salvas: nome + filtro, por aparelho, com apagar', async () => {
  const c = D.createCollection({ store: P.memoryStore() });
  assert.equal((await c.views()).length, 0);
  const v = await c.saveView({ nome: '  Meus verdes  ', filtro: { cores: ['G'], formato: 'pauper' } });
  assert.equal(v.nome, 'Meus verdes'); assert.ok(v.id);
  await c.saveView({ nome: 'Foils', filtro: { acabamentos: ['foil'] } });
  let views = await c.views();
  assert.deepEqual(JSON.parse(JSON.stringify(views.map(x => [x.nome, x.filtro]))), [['Meus verdes', { cores: ['G'], formato: 'pauper' }], ['Foils', { acabamentos: ['foil'] }]]);
  await c.removeView(v.id);
  views = await c.views(); assert.equal(views.length, 1); assert.equal(views[0].nome, 'Foils');
  const c2 = D.createCollection({ store: P.memoryStore() });
  assert.equal((await c2.views()).length, 0, 'outro aparelho não vê');
});

// E50 P5 · as listas prontas do Pauper separam a reserva; a partida só carrega o titular.
test('E50 P5 · toda lista pronta de Pauper tem principal com 60 ou mais e reserva de até 15, e a reserva não entra no grimório', () => {
  const { starter: S, engine: E } = loadModules();
  for (const d of S.STARTER_DECKS.filter(x => x.format === 'pauper')) {
    const es = D.parseDeckText(d.text).entries;
    const side = es.filter(e => e.zone === 'side').reduce((n, e) => n + e.qty, 0);
    const main = es.filter(e => e.zone !== 'side').reduce((n, e) => n + e.qty, 0);
    // leva 100 · expectativa apertada (antes aceitava 60–64 / 11–15, o que deixou passar o corte errado): exatamente 60 e 15
    assert.equal(main, 60, `${d.name}: principal ${main}`);
    assert.equal(side, 15, `${d.name}: reserva ${side}`);
    assert.equal(main + side, 75, `${d.name}: 75 no total`);
    // na mesa, o grimório tem só o principal
    const s = E.createGame({ format: 'pauper', seed: 1, players: [{ name: 'A', deck: es }, { name: 'B', deck: [], dummy: true }] });
    const lib = Object.values(s.objects).filter(o => o.owner === 0).length;
    assert.equal(lib, main, `${d.name}: ${lib} objetos na mesa`);
  }
  const elves = D.parseDeckText(S.STARTER_DECKS.find(x => x.name === 'Pauper Elves').text).entries;
  assert.deepEqual(JSON.parse(JSON.stringify(elves.filter(e => e.zone === 'side').map(e => e.name).slice(0, 3))), ['Hydroblast', 'Masked Vandal', "Nylea's Disciple"]);
});

// E51 · listas salvas antes da separação: migração automática segura, sugestão para lista editada, aviso e vistas.
test('E51 · lista pronta salva com 75 no principal recebe a reserva separada; lista editada não é tocada; Commander nunca', async () => {
  const { starter: S } = loadModules();
  const elves = S.STARTER_DECKS.find(x => x.name === 'Pauper Elves');
  const es = D.parseDeckText(elves.text).entries;
  const velha = { id: 'a', name: 'Pauper Elves', format: 'pauper', entries: es.map(e => ({ ...e, zone: 'main' })) };
  const m = S.migraReserva(velha);
  assert.ok(m, 'mesma lista, sem reserva → migra');
  assert.equal(m.filter(e => e.zone === 'side').reduce((n, e) => n + e.qty, 0), 15);
  assert.equal(m.filter(e => e.zone === 'main').reduce((n, e) => n + e.qty, 0), 60);
  // renomeada: continua reconhecida pelas cartas
  assert.ok(S.migraReserva({ ...velha, name: 'Meus Elfos' }));
  // já tem reserva → nada
  assert.equal(S.migraReserva({ ...velha, entries: m }), null);
  // editada (uma carta a mais) → não migra sozinha, mas a sugestão pela pronta de mesmo nome existe
  const editada = { ...velha, entries: [...velha.entries.map(e => ({ ...e })), { name: 'Forest', qty: 1, zone: 'main' }] };
  assert.equal(S.migraReserva(editada), null);
  const sug = S.sugereReserva(editada);
  assert.equal(sug.movidas, 15); assert.equal(sug.pronta, 'Pauper Elves');
  assert.equal(sug.entries.filter(e => e.zone === 'side').reduce((n, e) => n + e.qty, 0), 15);
  assert.equal(sug.entries.filter(e => e.zone === 'main').reduce((n, e) => n + e.qty, 0), 61);
  // sem pronta de mesmo nome: sem sugestão, mas o aviso aparece
  assert.equal(S.sugereReserva({ ...editada, name: 'Outra' }), null);
  assert.equal(S.reservaMisturada({ ...editada, name: 'Outra' }), true);
  assert.equal(S.reservaMisturada({ ...velha, entries: m }), false, 'com reserva, sem aviso');
  assert.equal(S.reservaMisturada({ format: 'pauper', entries: [{ name: 'Island', qty: 60, zone: 'main' }] }), false, '60 certinho, sem aviso');
  assert.equal(S.reservaMisturada({ format: 'commander', entries: [{ name: 'Island', qty: 99, zone: 'main' }] }), false);
  assert.equal(S.migraReserva({ ...velha, format: 'commander' }), null);
});

test('E51 · migraReservas passa por todas as listas salvas uma vez só: se o jogador juntar a reserva de volta, a escolha dele vale', async () => {
  const { starter: S } = loadModules();
  const store = P.memoryStore();
  const decks = D.createDeckStore({ store });
  const es = D.parseDeckText(S.STARTER_DECKS.find(x => x.name === 'Pauper Boros Bully').text).entries;
  const a = await decks.save({ name: 'Pauper Boros Bully', format: 'pauper', entries: es.map(e => ({ ...e, zone: 'main' })) });
  const b = await decks.save({ name: 'Minha', format: 'pauper', entries: [{ name: 'Island', qty: 60, zone: 'main' }] });
  assert.deepEqual(JSON.parse(JSON.stringify(await S.migraReservas(decks, store))), ['Pauper Boros Bully']);
  const depois = await decks.get(a.id);
  assert.equal(depois.entries.filter(e => e.zone === 'side').reduce((n, e) => n + e.qty, 0), 15);
  assert.equal((await decks.get(b.id)).entries.length, 1, 'lista sem pronta equivalente fica como está');
  // o jogador junta tudo de novo: a próxima abertura não separa outra vez
  await decks.save({ ...depois, entries: depois.entries.map(e => ({ ...e, zone: 'main' })) });
  assert.equal((await S.migraReservas(decks, store)).length, 0);
  assert.equal((await decks.get(a.id)).entries.some(e => e.zone === 'side'), false);
});

// E51 (leva 100) · guarda-corpo: cada lista pronta de Pauper é, zona a zona, a lista que o usuário enviou em 22/09
// (.listas/pauper.txt: as linhas até somar 60 são o principal; o resto, a reserva). Qualquer divergência falha aqui.
test('E51 · listas prontas de Pauper batem, carta a carta e zona a zona, com a lista original do usuário', async () => {
  const { starter: S } = loadModules();
  const { readFileSync } = await import('node:fs');
  const linhas = readFileSync(new URL('./.listas/pauper.txt', import.meta.url), 'utf8').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const originais = {}; let atual = null;
  for (const l of linhas) { const m = l.match(/^(\d+)\s+(.+)$/); if (m && atual) originais[atual].push([Number(m[1]), m[2]]); else { atual = l; originais[atual] = []; } }
  const soma = pares => { const o = {}; for (const [q, n] of pares) o[n] = (o[n] || 0) + q; return o; };
  const pauper = S.STARTER_DECKS.filter(d => d.format === 'pauper');
  assert.equal(pauper.length, 7);
  for (const d of pauper) {
    const o = originais[d.name]; assert.ok(o, `${d.name} está na lista original`);
    let acc = 0, corte = -1; o.forEach(([q], i) => { acc += q; if (acc === 60 && corte < 0) corte = i + 1; });
    assert.ok(corte > 0, `${d.name}: as primeiras linhas somam 60`);
    const es = D.parseDeckText(d.text).entries;
    const zona = z => soma(es.filter(e => e.zone === z).map(e => [e.qty, e.name]));
    assert.deepEqual(JSON.parse(JSON.stringify(zona('main'))), soma(o.slice(0, corte)), `${d.name}: principal`);
    assert.deepEqual(JSON.parse(JSON.stringify(zona('side'))), soma(o.slice(corte)), `${d.name}: reserva`);
  }
});

test('E51 · lista salva com o corte errado da leva 95 é corrigida ao abrir; editada depois, não é tocada', async () => {
  const { starter: S } = loadModules();
  assert.deepEqual(JSON.parse(JSON.stringify(Object.keys(S.CORTES_ERRADOS_L95).sort())), ['Pauper Jund Wildfire', 'Pauper Mono Blue Faeries', 'Pauper Rakdos Madness', 'Pauper Walls Combo']);
  const store = P.memoryStore(); const decks = D.createDeckStore({ store });
  const sd = S.STARTER_DECKS.find(x => x.name === 'Pauper Mono Blue Faeries');
  const certas = D.parseDeckText(sd.text).entries;
  // reconstrói a lista como a leva 95 deixou: reserva = corte errado, principal = o resto
  const errada = S.CORTES_ERRADOS_L95['Pauper Mono Blue Faeries'];
  const total = {}; for (const e of certas) total[e.name] = (total[e.name] || 0) + e.qty;
  const velha = [...Object.entries(total).map(([name, q]) => ({ name, qty: q - (errada[name] || 0), zone: 'main' })).filter(e => e.qty > 0), ...Object.entries(errada).map(([name, qty]) => ({ name, qty, zone: 'side' }))];
  const a = await decks.save({ name: 'Pauper Mono Blue Faeries', format: 'pauper', entries: velha });
  // já tinha sido "vista" pela passada da leva 98
  await store.set('decks.reservaVista', [a.id]);
  const corr = S.corrigeCorteErrado(await decks.get(a.id)); assert.ok(corr);
  assert.deepEqual(JSON.parse(JSON.stringify(await S.migraReservas(decks, store))), ['Pauper Mono Blue Faeries']);
  const d = await decks.get(a.id);
  const z = zn => d.entries.filter(e => e.zone === zn).reduce((n, e) => n + e.qty, 0);
  assert.equal(z('main'), 60); assert.equal(z('side'), 15);
  assert.equal(d.entries.find(e => e.zone === 'side' && e.name === 'Cryoshatter').qty, 1);
  // de novo: nada muda
  assert.equal((await S.migraReservas(decks, store)).length, 0);
  // lista com o corte errado mas editada (uma carta a mais na reserva): não mexe
  const editada = [...velha.map(e => ({ ...e })), { name: 'Island', qty: 1, zone: 'side' }];
  assert.equal(S.corrigeCorteErrado({ name: 'x', format: 'pauper', entries: editada }), null);
});

/* ---------------- M13b · dois comandantes (702.124, texto das regras de 07/06/2024, conferido em 30/09/2026) ---------------- */
// Linhas de palavra-chave no formato dos textos oficiais (conferidos em 30/09/2026: Vhal, Candlekeep Researcher
// "Choose a Background (You can have a Background as a second commander.)"; Raised by Giants "Legendary
// Enchantment — Background"; Rocksteady "Partner with Bebop, Skull & Crossbones (When this creature enters, …)").
// Os nomes são de teste: o que se valida é a regra, não a carta.
const par = (name, ci, texto, tipo = 'Legendary Creature — Human') => cc(name, tipo, 3, ci, { oracle_text: texto });
const PAR = new Map([
  par('Parceira Branca', ['W'], 'Flying\nPartner (You can have two commanders if both have partner.)'),
  par('Parceiro Azul', ['U'], 'Partner (You can have two commanders if both have partner.)'),
  par('Lenda Comum', ['G'], 'Trample'),
  par('Pir Teste', ['G'], 'Partner with Toothy Teste (When this creature enters, target player may put Toothy Teste into their hand from their library, then shuffle.)'),
  par('Toothy Teste', ['U'], 'Partner with Pir Teste (When this creature enters, target player may put Pir Teste into their hand from their library, then shuffle.)'),
  par('Outro Com', ['R'], 'Partner with Ninguém Teste (When this creature enters, target player may put Ninguém Teste into their hand from their library, then shuffle.)'),
  par('Amigo Um', ['W'], 'Friends forever (You can have two commanders if both have friends forever.)'),
  par('Amigo Dois', ['B'], 'Friends forever (You can have two commanders if both have friends forever.)'),
  par('Vhal Teste', ['G'], 'Vigilance\nChoose a Background (You can have a Background as a second commander.)', 'Legendary Creature — Human Wizard'),
  par('Criado por Gigantes', ['G'], 'Commander creatures you own have base power and toughness 10/10.', 'Legendary Enchantment — Background'),
  par('Antecedente Comum', ['B'], 'Commander creatures you own have menace.', 'Enchantment — Background'),
  par('Companheira Teste', ['W'], "Doctor's companion (You can have two commanders if the other is the Doctor.)"),
  par('Doutor Teste', ['U'], 'Vigilance', 'Legendary Creature — Time Lord Doctor'),
  par('Doutor Humano', ['U'], 'Vigilance', 'Legendary Creature — Time Lord Doctor Human'),
  par('Variante Nova', ['R'], 'Partner—Survivors (You can have two commanders if both have this ability.)'),
  par('Variante Nova 2', ['G'], 'Partner—Survivors (You can have two commanders if both have this ability.)'),
  cc('Carta Azul', 'Instant', 2, ['U']), cc('Carta Verde', 'Instant', 2, ['G']), cc('Wastes', 'Basic Land', 0, [])
]);
const dupla = (a, b, extra = []) => ({ format: 'commander', entries: [
  { name: a, qty: 1, zone: 'commander' }, ...(b ? [{ name: b, qty: 1, zone: 'commander' }] : []),
  ...extra, { name: 'Wastes', qty: 100 - (b ? 2 : 1) - extra.length, zone: 'main' }] });
const msgsPar = d => D.validateDeck(d, PAR).map(i => `${i.level}: ${i.message}`).join('\n');
const JUNTOS = /não podem ser comandantes juntos/;

test('M13b · Partner: os dois precisam ter; identidade soma as duas cores', () => {
  const ok = msgsPar(dupla('Parceira Branca', 'Parceiro Azul', [{ name: 'Carta Azul', qty: 1, zone: 'main' }]));
  assert.equal(ok, '', 'W + U com Partner nos dois: nenhuma pendência, carta azul dentro da identidade');
  assert.match(msgsPar(dupla('Parceira Branca', 'Lenda Comum')), JUNTOS, 'só um tem Partner');
  assert.match(msgsPar(dupla('Parceira Branca', 'Parceiro Azul', [{ name: 'Carta Verde', qty: 1, zone: 'main' }])), /Fora da identidade de cor do comandante: Carta Verde/);
  assert.equal(msgsPar(dupla('Parceira Branca')), '', 'um comandante só, com Partner: tudo certo');
  const off = D.validateDeck(dupla('Parceira Branca', 'Lenda Comum'), PAR, { semRede: true }).map(i => i.message).join('\n');
  assert.match(off, JUNTOS, 'sem internet a checagem é a mesma: roda só com os dados guardados');
});

test('M13b · Partner with: cada um nomeia o outro; misturar com Partner não vale (702.124f)', () => {
  assert.equal(msgsPar(dupla('Pir Teste', 'Toothy Teste')), '');
  assert.match(msgsPar(dupla('Pir Teste', 'Outro Com')), JUNTOS, 'Partner with de outro nome');
  assert.match(msgsPar(dupla('Pir Teste', 'Parceiro Azul')), JUNTOS, 'Partner with não combina com Partner');
});

test('M13b · Friends forever e Doctor\'s companion', () => {
  assert.equal(msgsPar(dupla('Amigo Um', 'Amigo Dois')), '');
  assert.match(msgsPar(dupla('Amigo Um', 'Parceiro Azul')), JUNTOS, 'Friends forever não combina com Partner');
  assert.equal(msgsPar(dupla('Companheira Teste', 'Doutor Teste')), '');
  assert.match(msgsPar(dupla('Companheira Teste', 'Doutor Humano')), JUNTOS, 'o Doutor não pode ter outro tipo de criatura');
  assert.match(msgsPar(dupla('Companheira Teste', 'Parceiro Azul')), JUNTOS);
});

test('M13b · Choose a Background: o Antecedente lendário vira segundo comandante; sozinho ou com outro, não', () => {
  assert.equal(msgsPar(dupla('Vhal Teste', 'Criado por Gigantes')), '', 'Antecedente com quem escolhe: vale, e não é "não pode ser comandante"');
  assert.equal(msgsPar(dupla('Criado por Gigantes', 'Vhal Teste')), '', 'a ordem não importa');
  assert.match(msgsPar(dupla('Criado por Gigantes')), /Criado por Gigantes não pode ser comandante/, 'Antecedente sozinho');
  const semEscolha = msgsPar(dupla('Parceira Branca', 'Criado por Gigantes'));
  assert.match(semEscolha, JUNTOS); assert.match(semEscolha, /Criado por Gigantes não pode ser comandante/);
  assert.match(msgsPar(dupla('Vhal Teste', 'Antecedente Comum')), JUNTOS, 'Antecedente que não é lendário');
  assert.match(msgsPar(dupla('Vhal Teste', 'Parceiro Azul')), JUNTOS, 'quem escolhe Antecedente não aceita Partner');
});

test('M13b · variante de parceria que o app não conhece: aviso para conferir, nunca aprovação silenciosa', () => {
  const m = msgsPar(dupla('Variante Nova', 'Variante Nova 2'));
  assert.match(m, /^warning: .*Partner—Survivors.*não é conferida/m);
  assert.doesNotMatch(m, /^error:/m);
  assert.match(msgsPar(dupla('Variante Nova', 'Lenda Comum')), /^warning: .*não é conferida/m, 'com uma variante desconhecida, o app não afirma nada: avisa');
});

test('Leva 110 · cores da lista: deck principal pelas cores das cartas, Commander pela identidade do comandante, sem dado não chuta', () => {
  const c = (name, colors, ci = colors, type_line = 'Instant') => [name.toLowerCase(), { name, colors, color_identity: ci, type_line }];
  const cartas = new Map([c('Lightning Bolt', ['R']), c('Counterspell', ['U']), c('Island', [], ['U'], 'Basic Land — Island'), c('Duress', ['B']), c('Kediss', ['R'], ['R']), c('Malcolm', ['U'], ['U'])]);
  const L = es => D.coresDaLista(es, cartas);
  assert.equal(L([{ name: 'Counterspell', qty: 4, zone: 'main' }, { name: 'Lightning Bolt', qty: 4, zone: 'main' }, { name: 'Island', qty: 20, zone: 'main' }, { name: 'Duress', qty: 2, zone: 'side' }]), 'UR',
    'na ordem WUBRG; terreno não pinta; a reserva não conta');
  assert.equal(L([{ name: 'Malcolm', qty: 1, zone: 'commander' }, { name: 'Kediss', qty: 1, zone: 'commander' }, { name: 'Duress', qty: 1, zone: 'main' }]), 'UR', 'Commander: identidade dos comandantes');
  assert.equal(L([{ name: 'Desconhecida', qty: 1, zone: 'commander' }]), null, 'comandante sem dado: nada');
  assert.equal(L([{ name: 'Island', qty: 1, zone: 'main' }]), null, 'só terreno guardado: sem cor (não "incolor")');
  assert.equal(L([{ name: 'Counterspell', qty: 4, zone: 'main' }, { name: 'Sem Dado', qty: 4, zone: 'main' }]), null, 'uma carta sem dado: não chuta a cor');
});
test('Leva 110 · cores da lista: nenhuma carta guardada não vira "incolor"', () => {
  assert.equal(D.coresDaLista([{ name: 'Nada Guardado', qty: 4, zone: 'main' }], new Map()), null);
});

/* ---------------- L7 · edição rápida ---------------- */
test('L7 · ajustaEntrada: soma, tira, remove no zero, cria na zona pedida e não mexe na lista recebida', () => {
  const { ajustaEntrada } = loadModules().decks;
  const J = x => JSON.parse(JSON.stringify(x));
  const lista = [{ name: 'Island', qty: 20, zone: 'main' }, { name: 'Counterspell', qty: 1, zone: 'main' }, { name: 'Counterspell', qty: 2, zone: 'side' }];
  const copia = J(lista);
  assert.deepEqual(J(ajustaEntrada(lista, 'Island', 'main', 1))[0], { name: 'Island', qty: 21, zone: 'main' });
  assert.deepEqual(J(ajustaEntrada(lista, 'counterspell', 'side', -1))[2], { name: 'Counterspell', qty: 1, zone: 'side' }, 'sem caixa; só a zona pedida');
  assert.equal(ajustaEntrada(lista, 'Counterspell', 'side', -1)[1].qty, 1, 'a do deck não muda');
  assert.deepEqual(J(ajustaEntrada(lista, 'Counterspell', 'main', -1)).map(e => e.name + ':' + e.zone), ['Island:main', 'Counterspell:side'], 'última cópia: a entrada sai');
  assert.deepEqual(J(ajustaEntrada(lista, 'Brainstorm', 'side', 1)).at(-1), { name: 'Brainstorm', qty: 1, zone: 'side' }, 'carta nova entra no fim, na zona pedida');
  assert.equal(ajustaEntrada(lista, 'Brainstorm', 'main', -1).length, 3, 'tirar o que não existe não cria nada');
  assert.equal(ajustaEntrada(lista, 'Brainstorm', 'zona-que-nao-existe', 1).at(-1).zone, 'main');
  assert.deepEqual(J(lista), copia, 'a lista recebida fica intacta');
  assert.deepEqual(J(ajustaEntrada([{ name: 'Sol Ring', qty: 1 }], 'Sol Ring', 'main', 1)), [{ name: 'Sol Ring', qty: 2 }], 'entrada antiga sem zona conta como deck');
});
test('L7 · sugereNomes: começa com o texto, depois palavra que começa, depois contém; curtos antes; sem acento e sem caixa', () => {
  const { sugereNomes } = loadModules().decks;
  const J = x => JSON.parse(JSON.stringify(x));
  const nomes = ['Counterspell', 'Counterbalance', 'Mana Counter', 'Encounter', 'Island', 'Lim-Dûl\'s Vault', 'Fire // Ice', 'Counter'];
  assert.deepEqual(J(sugereNomes(nomes, 'count')), ['Counter', 'Counterspell', 'Counterbalance', 'Mana Counter', 'Encounter']);
  assert.deepEqual(J(sugereNomes(nomes, 'COUNT', 2)), ['Counter', 'Counterspell'], 'limite');
  assert.deepEqual(J(sugereNomes(nomes, 'dul')), ['Lim-Dûl\'s Vault'], 'acento e hífen');
  assert.deepEqual(J(sugereNomes(nomes, 'ice')), ['Fire // Ice']);
  assert.deepEqual(J(sugereNomes(nomes, 'c')), [], 'uma letra não sugere');
  assert.deepEqual(J(sugereNomes(null, 'count')), []); assert.deepEqual(J(sugereNomes(nomes, 'zzz')), []);
});
