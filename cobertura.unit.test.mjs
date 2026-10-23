// H-15 · sentinela de cobertura do Pauper (cobertura.mjs): mede as listas do catálogo como o app (deckCoverage sobre o texto da
// Scryfall) e classifica cada carta pendente. Caso real de 23/10/2026: Extract a Confession aprovada com o texto do Forge
// ("Each opponent sacrifices a creature.") e a Scryfall com "a creature of their choice" — no app, "em revisão" em 75 listas.
// Falha antes da H-15 (o módulo não existia).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as C from './cobertura.mjs';

const EXTRACT_NOVO = 'As an additional cost to cast this spell, you may collect evidence 6. (Exile cards with total mana value 6 or greater from your graveyard.)\nEach opponent sacrifices a creature of their choice. If evidence was collected, instead each opponent sacrifices a creature with the greatest power among creatures they control.';
const TABELA = {
  'Lightning Bolt': { name: 'Lightning Bolt', mana_cost: '{R}', type_line: 'Instant', oracle_text: 'Lightning Bolt deals 3 damage to any target.', keywords: [], layout: 'normal' },
  'Extract a Confession': { name: 'Extract a Confession', mana_cost: '{1}{B}', type_line: 'Sorcery', oracle_text: EXTRACT_NOVO, keywords: [], layout: 'normal' },
  'Carta Lida': { name: 'Carta Lida', mana_cost: '{U}', type_line: 'Instant', oracle_text: 'Draw two cards.', keywords: [], layout: 'normal' },
  'Carta Nova': { name: 'Carta Nova', mana_cost: '{G}', type_line: 'Sorcery', oracle_text: 'Venture into the unknown realm of untested mechanics, then do something no rule describes.', keywords: [], layout: 'normal' },
};
const scryfall = (tabela, { falha = false, chamadas = [] } = {}) => async (url, { body } = {}) => {
  chamadas.push(JSON.parse(body).identifiers.map(i => i.name));
  if (falha) return { ok: false, status: 503, json: async () => ({}) };
  const data = JSON.parse(body).identifiers.map(i => tabela[i.name]).filter(Boolean);
  return { ok: true, status: 200, json: async () => ({ data }) };
};
const L = (id, nomes) => ({ id, nome: id, entradas: nomes.map(([name, qty]) => ({ name, qty, zone: 'main' })).concat([{ name: 'Island', qty: 20, zone: 'main' }, { name: 'Sideboard Qualquer', qty: 2, zone: 'side' }]) });

test('H-15 · classifica: joga (null), texto-mudou, lida, nova e sem-dados', () => {
  assert.equal(C.classifica('Lightning Bolt', TABELA['Lightning Bolt']), null, 'script à mão');
  assert.equal(C.classifica('Extract a Confession', TABELA['Extract a Confession']), null, 'aprovada com o texto atual da Scryfall');
  const velho = { ...TABELA['Extract a Confession'], oracle_text: EXTRACT_NOVO.replace(' of their choice', '') };
  assert.equal(C.classifica('Extract a Confession', velho).classe, 'texto-mudou');
  assert.equal(C.classifica('Carta Lida', TABELA['Carta Lida']).classe, 'lida');
  assert.equal(C.classifica('Carta Nova', TABELA['Carta Nova']).classe, 'nova');
  assert.equal(C.classifica('Carta Sumida', null).classe, 'sem-dados');
});

test('H-15 · mede: conta as listas a 100% como o app (reserva fora, básicos sempre) e põe o texto da Scryfall em cada pendente', async () => {
  const { cartas, falhas } = await C.cartasDaScryfall(Object.keys(TABELA), { busca: scryfall(TABELA), pausa: 0 });
  assert.equal(falhas, 0);
  const rel = C.mede([L('a', [['Lightning Bolt', 4], ['Extract a Confession', 4]]), L('b', [['Lightning Bolt', 4], ['Carta Nova', 2]]), L('c', [['Carta Lida', 4], ['Carta Nova', 1]])], cartas, { agora: '2026-10-23T00:00:00Z' });
  assert.equal(rel.listas, 3); assert.equal(rel.listas100, 1);
  assert.deepEqual(rel.pendentes.map(p => [p.name, p.classe, p.listas]), [['Carta Nova', 'nova', 2], ['Carta Lida', 'lida', 1]]);
  assert.equal(rel.pendentes[0].texto.oracle_text, TABELA['Carta Nova'].oracle_text);
  assert.deepEqual(rel.porClasse, { 'texto-mudou': 0, lida: 1, nova: 1, parcial: 0, 'sem-dados': 0 });
  assert.deepEqual(rel.listasIncompletas.map(x => x.id), ['b', 'c']);
});

test('H-15 · cartasDaScryfall: lotes de 75, sem básicos, nome da frente para carta de duas faces', async () => {
  const chamadas = []; const nomes = [...Array.from({ length: 160 }, (_, i) => `Carta ${i}`), 'Island', 'Frente // Verso'];
  await C.cartasDaScryfall(nomes, { busca: scryfall({}, { chamadas }), pausa: 0 });
  assert.deepEqual(chamadas.map(c => c.length), [75, 75, 11]);
  assert.ok(!chamadas.flat().includes('Island')); assert.ok(chamadas.flat().includes('Frente'));
});

test('H-15 · executa: grava cobertura/pauper.json no ramo, diz o que é novo desde a coleta anterior; Scryfall fora mantém o anterior', async () => {
  const pasta = await mkdtemp(join(tmpdir(), 'cobertura-h15-'));
  try {
    await mkdir(join(pasta, 'listas'), { recursive: true });
    const listas = [L('x', [['Lightning Bolt', 4]]), L('y', [['Carta Lida', 4]])];
    await writeFile(join(pasta, 'indice.json'), JSON.stringify({ listas: [...listas.map(l => ({ id: l.id, formato: 'pauper' })), { id: 'z', formato: 'modern' }] }));
    for (const l of listas) await writeFile(join(pasta, 'listas', `${l.id}.json`), JSON.stringify(l));
    const r1 = await C.executa({ pasta, busca: scryfall(TABELA), pausa: 0, log: () => {}, agora: 'T1' });
    assert.ok(r1.gravado); const f1 = JSON.parse(await readFile(join(pasta, 'cobertura', 'pauper.json'), 'utf8'));
    assert.equal(f1.listas, 2); assert.equal(f1.listas100, 1); assert.deepEqual(f1.novasDesdeAnterior, []);
    await writeFile(join(pasta, 'listas', 'x.json'), JSON.stringify(L('x', [['Lightning Bolt', 4], ['Carta Nova', 1]]))); // lista antiga alterada
    const r2 = await C.executa({ pasta, busca: scryfall(TABELA), pausa: 0, log: () => {}, agora: 'T2' });
    assert.deepEqual(r2.relatorio.novasDesdeAnterior, ['Carta Nova']); assert.equal(r2.relatorio.listas100, 0);
    const r3 = await C.executa({ pasta, busca: scryfall(TABELA, { falha: true }), pausa: 0, log: () => {}, agora: 'T3' });
    assert.equal(r3.gravado, false);
    assert.equal(JSON.parse(await readFile(join(pasta, 'cobertura', 'pauper.json'), 'utf8')).geradoEm, 'T2', 'o relatório anterior fica');
  } finally { await rm(pasta, { recursive: true, force: true }); }
});
