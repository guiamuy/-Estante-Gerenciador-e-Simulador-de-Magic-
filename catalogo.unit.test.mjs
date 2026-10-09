// Z1 · coletor do catálogo de listas (MTGJSON → ramo `catalogo`). Amostra sintética no formato do MTGJSON v5.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as C from './catalogo.mjs';

const carta = (name, extra = {}) => ({ name, count: 1, colorIdentity: [], types: ['Creature'], rarity: 'common', identifiers: { scryfallId: '0000aaaa-1111-2222-3333-444455556666' }, ...extra });
const DECK = { data: { name: 'Ânimo de Teste', code: 'tst', type: 'Commander Deck', releaseDate: '2026-09-26',
  commander: [carta('Teste, the Leader', { colorIdentity: ['G', 'W'], rarity: 'mythic', identifiers: { scryfallId: 'abcdef01-2345-6789-abcd-ef0123456789' } })],
  mainBoard: [carta('Forest', { count: 10, types: ['Land'] }), carta('Plains', { count: 9, types: ['Land'] }), carta('Sol Ring', { types: ['Artifact'], rarity: 'uncommon' }),
    carta('Front // Back', { side: 'a', colorIdentity: ['G'] }), carta('Front // Back', { side: 'b', colorIdentity: ['G'] }), carta('Sol Ring', { types: ['Artifact'] })],
  sideBoard: [carta('Extra Card', { count: 2 })], tokens: [{ name: 'Soldier' }, { name: 'Soldier' }, { name: 'Treasure' }] } };

test('Z1 · formatoDoTipo: Commander, Brawl, Construído (desafio) e Iniciante; o resto fica de fora', () => {
  assert.equal(C.formatoDoTipo('Commander Deck'), 'commander');
  assert.equal(C.formatoDoTipo('Brawl Deck'), 'brawl');
  assert.equal(C.formatoDoTipo('Challenger Deck'), 'construido');
  for (const t of ['Starter Deck', 'Welcome Deck', 'Planeswalker Deck', 'Intro Pack', 'Theme Deck', 'Duel Deck', 'Starter Kit']) assert.equal(C.formatoDoTipo(t), 'iniciante', t);
  for (const t of ['Planechase Deck', 'Archenemy Deck', 'Box Set', 'Secret Lair Drop', 'Arena Starter Deck', 'MTGO Theme Deck', '', null]) assert.equal(C.formatoDoTipo(t), null, String(t));
});

test('Z1 · normalizaLista: zonas, soma por nome, face de trás não conta, cores do comandante, destaque, data, descrição e fichas', () => {
  const l = C.normalizaLista(DECK, { fileName: 'AnimoDeTeste_TST' });
  assert.equal(l.id, 'mtgjson-animodeteste-tst'); assert.equal(l.nome, 'Ânimo de Teste'); assert.equal(l.formato, 'commander'); assert.equal(l.codigo, 'TST');
  assert.deepEqual(l.entradas, [{ name: 'Teste, the Leader', qty: 1, zone: 'commander' }, { name: 'Forest', qty: 10, zone: 'main' }, { name: 'Plains', qty: 9, zone: 'main' },
    { name: 'Sol Ring', qty: 2, zone: 'main' }, { name: 'Front // Back', qty: 1, zone: 'main' }, { name: 'Extra Card', qty: 2, zone: 'side' }]);
  assert.equal(l.cartas, 23); assert.equal(l.reserva, 2);
  assert.equal(l.cores, 'WG'); assert.equal(l.destaque, 'Teste, the Leader'); assert.equal(l.destaqueId, 'abcdef01-2345-6789-abcd-ef0123456789');
  assert.deepEqual(l.comandante, ['Teste, the Leader']); assert.deepEqual(l.fichas, ['Soldier', 'Treasure']);
  assert.equal(l.descricao, 'Commander Deck lançada pela Wizards em 26/09/2026 (TST).');
  // sem comandante: cores das mágicas, destaque pela raridade
  const sem = C.normalizaLista({ data: { ...DECK.data, type: 'Challenger Deck', commander: [], mainBoard: [carta('Island', { types: ['Land'], colorIdentity: ['U'] }), carta('Opt', { colorIdentity: ['U'] }), carta('Big Rare', { rarity: 'rare', colorIdentity: ['R'] })] } }, { fileName: 'X_Y' });
  assert.equal(sem.formato, 'construido'); assert.equal(sem.cores, 'UR'); assert.equal(sem.destaque, 'Big Rare');
  assert.equal(C.normalizaLista({ data: { ...DECK.data, type: 'Planechase Deck' } }), null);
  assert.equal(C.normalizaLista({ data: { name: 'Vazia', type: 'Commander Deck', mainBoard: [] } }), null);
});

test('Z1 · candidatas: só formatos do catálogo, sem as já publicadas, da mais recente, com teto; índice por formato', () => {
  const lista = { data: [
    { name: 'A', fileName: 'A_1', type: 'Commander Deck', releaseDate: '2024-01-01' }, { name: 'B', fileName: 'B_2', type: 'Planechase Deck', releaseDate: '2025-01-01' },
    { name: 'C', fileName: 'C_3', type: 'Challenger Deck', releaseDate: '2025-06-01' }, { name: 'D', fileName: 'D_4', type: 'Commander Deck', releaseDate: '2026-02-02' }, { name: 'E', fileName: 'E_5', type: 'Theme Deck', releaseDate: null }] };
  assert.deepEqual(C.candidatas(lista).map(d => d.name), ['D', 'C', 'A', 'E']);
  assert.deepEqual(C.candidatas(lista, new Set(['mtgjson-d-4']), 2).map(d => d.name), ['C', 'A']);
  const idx = C.montaIndice([{ id: '1', nome: 'Um', formato: 'commander', data: '2020-01-01' }, { id: '2', nome: 'Dois', formato: 'iniciante', data: '2026-01-01' }, { id: '3', nome: 'Três', formato: 'commander', data: '2025-01-01' }], { agora: Date.UTC(2026, 9, 9), pendentes: 7 });
  assert.deepEqual(idx.formatos, [{ id: 'commander', nome: 'Commander', listas: 2 }, { id: 'iniciante', nome: 'Iniciante', listas: 1 }]);
  assert.deepEqual(idx.listas.map(l => l.id), ['2', '3', '1']); assert.equal(idx.total, 3); assert.equal(idx.pendentes, 7); assert.equal(idx.fontes[0].licenca, 'MIT');
  assert.equal(idx.geradoEm, '2026-10-09T00:00:00.000Z');
});

test('Z1 · publica: baixa só o que falta, grava a lista e o índice, continua de onde parou, e não regrava sem novidade', async () => {
  const pasta = await mkdtemp(join(tmpdir(), 'catalogo-'));
  try {
    const pedidos = [];
    const deckList = { data: [{ name: 'Novo', fileName: 'Novo_N1', type: 'Commander Deck', releaseDate: '2026-09-01' }, { name: 'Velho', fileName: 'Velho_V1', type: 'Theme Deck', releaseDate: '2001-01-01' }] };
    const busca = async url => { pedidos.push(url.replace(C.BASE, '')); const corpo = url.endsWith('DeckList.json') ? deckList : { data: { ...DECK.data, name: url.includes('Novo') ? 'Novo' : 'Velho', type: url.includes('Novo') ? 'Commander Deck' : 'Theme Deck' } }; return { ok: true, status: 200, json: async () => corpo }; };
    const r1 = await C.publica(pasta, { busca, max: 1, pausa: 0, agora: Date.UTC(2026, 9, 9) });
    assert.equal(r1.gravou, true); assert.equal(r1.novas, 1); assert.equal(r1.indice.pendentes, 1);
    assert.deepEqual(pedidos, ['DeckList.json', 'decks/Novo_N1.json']);
    const lista = JSON.parse(await readFile(join(pasta, 'listas', 'mtgjson-novo-n1.json'), 'utf8')); assert.equal(lista.nome, 'Novo'); assert.ok(lista.entradas.length > 3);
    const r2 = await C.publica(pasta, { busca, max: 5, pausa: 0 });
    assert.equal(r2.novas, 1); assert.equal(r2.indice.total, 2); assert.equal(r2.indice.pendentes, 0);
    assert.deepEqual(pedidos.slice(2), ['DeckList.json', 'decks/Velho_V1.json'], 'o que já foi publicado não é baixado de novo');
    const r3 = await C.publica(pasta, { busca, pausa: 0 });
    assert.equal(r3.gravou, false, 'sem lista nova, nada é regravado (sem commit à toa)');
  } finally { await rm(pasta, { recursive: true, force: true }); }
});
