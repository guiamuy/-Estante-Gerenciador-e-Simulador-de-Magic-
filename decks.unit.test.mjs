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
