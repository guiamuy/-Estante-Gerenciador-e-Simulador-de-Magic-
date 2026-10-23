// M-573 · nomes do Magic Online: as reimpressões de Universes Beyond em Through the Omenpaths (OM1) têm nome próprio no MTGO ("Darval, Whose Web Protects"
// é a carta Oracle "Spider-Man, Web-Slinger", conferido na Scryfall em 23/10/2026). A lista do catálogo guarda o nome Oracle: as novas já chegam assim e as
// publicadas antes são trocadas uma vez pela passada completa. Falha antes da M-573 (três listas Pauper ficavam "sem dados da carta").
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as C from './catalogo.mjs';

const E = (name, qty, zone = 'main') => ({ name, qty, zone });
const scryfall = tabela => async (url, { body } = {}) => {
  const nomes = JSON.parse(body || '{}').identifiers || [];
  const data = nomes.filter(i => tabela[i.name]).map(i => ({ id: i.name, name: i.name, type_line: tabela[i.name], color_identity: [], rarity: 'common', prices: { usd: '0.10' } }));
  return { ok: true, status: 200, json: async () => ({ data }) };
};

test('M-573 · nomeOracle: o nome do Magic Online vira o nome Oracle; os outros ficam como estão', () => {
  assert.equal(C.nomeOracle('Darval, Whose Web Protects'), 'Spider-Man, Web-Slinger');
  assert.equal(C.nomeOracle('darval, whose web protects '), 'Spider-Man, Web-Slinger');
  assert.equal(C.nomeOracle('Lightning Bolt'), 'Lightning Bolt');
});

test('M-573 · a lista do evento do Magic Online chega com o nome Oracle', () => {
  const deck = (login, cartas) => ({ loginid: login, player: login, main_deck: cartas.map(([n, q]) => ({ qty: q, card_attributes: { card_name: n } })), sideboard_deck: [] });
  const dados = { decklists: [deck('1', [['Darval, Whose Web Protects', 4], ['Plains', 56]])], final_rank: [{ loginid: '1', rank: 1 }], publish_date: '2026-10-13T00:00:00Z' };
  const ls = C.listasDoEventoMtgo(dados, { tipo: 'liga', formato: 'pauper', nome: 'Pauper League', data: '2026-10-13' });
  assert.ok(ls.length >= 1); const nomes = ls[0].entradas.map(e => e.name);
  assert.ok(nomes.includes('Spider-Man, Web-Slinger') && !nomes.includes('Darval, Whose Web Protects'), JSON.stringify(nomes));
});

test('M-573 · a passada completa troca o nome nas listas já publicadas, uma vez, juntando cópias repetidas', async () => {
  const pasta = await mkdtemp(join(tmpdir(), 'catalogo-573-'));
  try {
    await mkdir(join(pasta, 'listas'), { recursive: true });
    const l = { id: 'mtgo-x-1', nome: '5-0 · Pauper League', entradas: [E('Darval, Whose Web Protects', 3), E('Spider-Man, Web-Slinger', 1), E('Plains', 56)] };
    await writeFile(join(pasta, 'listas', 'mtgo-x-1.json'), JSON.stringify(l) + '\n');
    const resumos = [{ id: 'mtgo-x-1', nome: '5-0 · Pauper League', formato: 'pauper', fonte: 'mtgo', cores: 'W', comandante: [], torneio: 'Pauper League', posicao: 0, data: '2026-10-13' }];
    const T = { 'Spider-Man, Web-Slinger': 'Legendary Creature — Spider Human Hero', Plains: 'Basic Land — Plains' };
    const r = await C.completa(pasta, resumos, { busca: scryfall(T), pausa: 0 });
    assert.equal(r.renomeadas, 1);
    const novo = JSON.parse(await readFile(join(pasta, 'listas', 'mtgo-x-1.json'), 'utf8'));
    assert.deepEqual(novo.entradas.filter(e => /Spider|Darval/.test(e.name)), [E('Spider-Man, Web-Slinger', 4)]);
    const r2 = await C.completa(pasta, r.resumos, { busca: scryfall(T), pausa: 0 }); assert.equal(r2.renomeadas, 0, 'na segunda passada, nada a trocar');
  } finally { await rm(pasta, { recursive: true, force: true }); }
});
