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

// I-300 · Commander na sentinela: a ordem gulosa diz que cartas fecham mais listas primeiro, e `textos` limita o texto do dia às
// primeiras cartas dessa ordem (o Commander tem milhares de pendentes). Falha antes da I-300 (sem `gulosa`, `curva` nem `textos`).
test('I-300 · mede: ordem gulosa (lista com menos cartas faltando primeiro), curva de marcos e texto só nas N primeiras', async () => {
  const T = { ...TABELA, 'Carta Nova B': { ...TABELA['Carta Nova'], name: 'Carta Nova B' }, 'Carta Nova C': { ...TABELA['Carta Nova'], name: 'Carta Nova C' } };
  const { cartas } = await C.cartasDaScryfall(Object.keys(T), { busca: scryfall(T), pausa: 0 });
  const listas = [L('a', [['Lightning Bolt', 4]]), L('b', [['Carta Nova B', 1], ['Carta Nova C', 1], ['Carta Lida', 1]]), L('c', [['Carta Nova', 1]]), L('d', [['Carta Nova', 1], ['Carta Nova C', 1]])];
  const rel = C.mede(listas, cartas, { formato: 'commander', agora: 'T', textos: 2 });
  const g = Object.fromEntries(rel.pendentes.map(p => [p.name, p.gulosa]));
  assert.deepEqual(g, { 'Carta Nova': 1, 'Carta Nova C': 2, 'Carta Nova B': 3, 'Carta Lida': 3 }, 'c (1 carta) → d (+1) → b (+2)');
  assert.equal(JSON.stringify(rel.curva), JSON.stringify([{ listas: 2, cartas: 1 }, { listas: 4, cartas: 4 }]), 'marco 1 e o fim, contando a lista já a 100%');
  // H-16 · a Carta Lida (fila de revisão) leva o texto mesmo fora das 2 primeiras da ordem; antes da H-16 eram só as duas
  assert.deepEqual(rel.pendentes.filter(p => p.texto).map(p => p.name).sort(), ['Carta Lida', 'Carta Nova', 'Carta Nova C']);
  assert.equal(rel.textos, 2);
  const tudo = C.mede(listas, cartas, { agora: 'T' });
  assert.ok(tudo.pendentes.every(p => p.texto), 'sem --textos, todo pendente leva o texto (Pauper como antes)'); assert.equal(tudo.textos, null);
});

// Q10-7b · relato #32, fatia 2: Listas prontas também dizem quanto roda no motor. O app não tem as cartas das listas do
// catálogo; a sentinela mede com o texto da Scryfall, pela mesma conta do selo de Minhas listas, e grava cobertura/motor.json.
test('Q10-7b · porcentagens: a mesma conta do selo do app (cópias do principal; reserva e "talvez" fora; 100 só com tudo coberto)', async () => {
  const { cartas } = await C.cartasDaScryfall(Object.keys(TABELA), { busca: scryfall(TABELA), pausa: 0 });
  const comTalvez = L('d', [['Lightning Bolt', 4]]); comTalvez.entradas.push({ name: 'Carta Nova', qty: 3, zone: 'maybe' });
  const pct = C.porcentagens([L('a', [['Lightning Bolt', 4], ['Extract a Confession', 4]]), L('b', [['Lightning Bolt', 4], ['Carta Nova', 2]]), L('c', [['Carta Nova', 30]]), comTalvez, { id: 'vazia', entradas: [] }], cartas);
  assert.deepEqual(pct, { a: [100, 0], b: [92, 1], c: [40, 1], d: [100, 0] }); // b: 24 de 26 cópias; c: 20 ilhas de 50
});

test('Q10-7b · executa grava cobertura/motor.json: soma os formatos, troca só o formato medido, tira a lista que saiu do catálogo e não troca por medida pela metade', async () => {
  const pasta = await mkdtemp(join(tmpdir(), 'cobertura-q107b-'));
  try {
    await mkdir(join(pasta, 'listas'), { recursive: true });
    const pau = [L('p1', [['Lightning Bolt', 4]]), L('p2', [['Lightning Bolt', 2], ['Carta Nova', 2]])], cmd = [L('c1', [['Carta Lida', 1]])];
    const indice = ls => JSON.stringify({ listas: ls });
    await writeFile(join(pasta, 'indice.json'), indice([...pau.map(l => ({ id: l.id, formato: 'pauper' })), ...cmd.map(l => ({ id: l.id, formato: 'commander' }))]));
    for (const l of [...pau, ...cmd]) await writeFile(join(pasta, 'listas', `${l.id}.json`), JSON.stringify(l));
    const le = async () => JSON.parse(await readFile(join(pasta, 'cobertura', 'motor.json'), 'utf8'));
    await C.executa({ pasta, formato: 'pauper', busca: scryfall(TABELA), pausa: 0, log: () => {}, agora: 'T1' });
    let m = await le(); assert.equal(m.versao, 1); assert.deepEqual(m.pct, { p1: [100, 0], p2: [91, 1] });
    assert.deepEqual(Object.keys(m.formatos), ['pauper']); assert.equal(m.formatos.pauper.listas, 2); assert.equal(m.formatos.pauper.geradoEm, 'T1');
    await C.executa({ pasta, formato: 'commander', busca: scryfall(TABELA), pausa: 0, log: () => {}, agora: 'T2' });
    m = await le(); assert.deepEqual(m.pct, { c1: [95, 1], p1: [100, 0], p2: [91, 1] }); assert.deepEqual(Object.keys(m.formatos).sort(), ['commander', 'pauper']);
    // a p2 sai do catálogo e a p1 muda: só o Pauper é trocado, o Commander fica
    await writeFile(join(pasta, 'indice.json'), indice([{ id: 'p1', formato: 'pauper' }, { id: 'c1', formato: 'commander' }]));
    await writeFile(join(pasta, 'listas', 'p1.json'), JSON.stringify(L('p1', [['Lightning Bolt', 4], ['Carta Nova', 4]])));
    await C.executa({ pasta, formato: 'pauper', busca: scryfall(TABELA), pausa: 0, log: () => {}, agora: 'T3' });
    m = await le(); assert.deepEqual(m.pct, { c1: [95, 1], p1: [85, 1] }); assert.equal(m.formatos.commander.geradoEm, 'T2');
    // Scryfall fora (nada medido) e medida pela metade: o arquivo do app fica como estava
    await C.executa({ pasta, formato: 'pauper', busca: scryfall(TABELA, { falha: true }), pausa: 0, log: () => {}, agora: 'T4' });
    const p9 = L('p9', Array.from({ length: 80 }, (_, i) => [`Carta ${i}`, 1])); // 80 nomes: dois lotes na Scryfall
    await writeFile(join(pasta, 'listas', 'p9.json'), JSON.stringify(p9));
    await writeFile(join(pasta, 'indice.json'), indice([{ id: 'p1', formato: 'pauper' }, { id: 'p9', formato: 'pauper' }, { id: 'c1', formato: 'commander' }]));
    let n = 0; const meia = async (url, o) => (++n === 2 ? { ok: false, status: 503, json: async () => ({}) } : scryfall(TABELA)(url, o));
    await C.executa({ pasta, formato: 'pauper', busca: meia, pausa: 0, log: () => {}, agora: 'T5' });
    assert.equal(n, 2); assert.ok(JSON.parse(await readFile(join(pasta, 'cobertura', 'pauper.json'), 'utf8')).parcial, 'o relatório do formato diz que foi pela metade');
    assert.equal((await le()).formatos.pauper.geradoEm, 'T3'); assert.ok(!('p9' in (await le()).pct));
  } finally { await rm(pasta, { recursive: true, force: true }); }
});
