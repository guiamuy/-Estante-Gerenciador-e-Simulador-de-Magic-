// H-16 · sentinela de cobertura, plano do dono de 24/10 (competitivos primeiro; revisão em lote da classe "lida"). Falham antes da H-16:
// a fila de revisão ficava sem o texto do dia fora das N primeiras da ordem, a Scryfall era consultada de novo para nomes já
// respondidos e não havia `cobertura/resumo.json`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as C from './cobertura.mjs';

const EXTRACT = 'As an additional cost to cast this spell, you may collect evidence 6. (Exile cards with total mana value 6 or greater from your graveyard.)\nEach opponent sacrifices a creature of their choice. If evidence was collected, instead each opponent sacrifices a creature with the greatest power among creatures they control.';
const TABELA = {
  'Lightning Bolt': { name: 'Lightning Bolt', mana_cost: '{R}', type_line: 'Instant', oracle_text: 'Lightning Bolt deals 3 damage to any target.', keywords: [], layout: 'normal' },
  'Extract a Confession': { name: 'Extract a Confession', mana_cost: '{1}{B}', type_line: 'Sorcery', oracle_text: EXTRACT.replace(' of their choice', ''), keywords: [], layout: 'normal' }, // redação antiga: texto-mudou
  'Carta Lida': { name: 'Carta Lida', mana_cost: '{U}', type_line: 'Instant', oracle_text: 'Draw two cards.', keywords: [], layout: 'normal' },
  'Carta Nova': { name: 'Carta Nova', mana_cost: '{G}', type_line: 'Sorcery', oracle_text: 'Venture into the unknown realm of untested mechanics, then do something no rule describes.', keywords: [], layout: 'normal' },
};
const scryfall = (tabela, { falha = false, chamadas = [] } = {}) => async (url, { body } = {}) => {
  chamadas.push(JSON.parse(body).identifiers.map(i => i.name));
  if (falha) return { ok: false, status: 503, json: async () => ({}) };
  return { ok: true, status: 200, json: async () => ({ data: JSON.parse(body).identifiers.map(i => tabela[i.name]).filter(Boolean) }) };
};
const L = (id, nomes) => ({ id, nome: id, entradas: nomes.map(([name, qty]) => ({ name, qty, zone: 'main' })).concat([{ name: 'Island', qty: 20, zone: 'main' }]) });
async function pastaCom(ls) {
  const pasta = await mkdtemp(join(tmpdir(), 'cobertura-h16-'));
  await mkdir(join(pasta, 'listas'), { recursive: true });
  await writeFile(join(pasta, 'indice.json'), JSON.stringify({ listas: ls.map(([id, formato]) => ({ id, formato })) }));
  for (const [id, , nomes] of ls) await writeFile(join(pasta, 'listas', `${id}.json`), JSON.stringify(L(id, nomes)));
  return pasta;
}

test('H-16 · mede: toda carta lida ou texto-mudou leva o texto do dia, mesmo com --textos 0; a nova fora das N primeiras não', async () => {
  const { cartas } = await C.cartasDaScryfall(Object.keys(TABELA), { busca: scryfall(TABELA), pausa: 0 });
  const rel = C.mede([L('a', [['Carta Lida', 1], ['Carta Nova', 1], ['Extract a Confession', 1]])], cartas, { formato: 'modern', agora: 'T', textos: 0 });
  assert.deepEqual(Object.fromEntries(rel.pendentes.map(p => [p.name, [p.classe, !!p.texto]])),
    { 'Carta Lida': ['lida', true], 'Carta Nova': ['nova', false], 'Extract a Confession': ['texto-mudou', true] });
  assert.equal(rel.pendentes.find(p => p.name === 'Carta Lida').texto.oracle_text, 'Draw two cards.');
});

test('H-16 · cartasDaScryfall com cache: nome já respondido não é pedido de novo; lote que falhou é pedido na próxima vez', async () => {
  const cache = C.novoCache(), ch = [];
  const a = await C.cartasDaScryfall(['Lightning Bolt', 'Carta Lida', 'Island'], { busca: scryfall(TABELA, { chamadas: ch }), pausa: 0, cache });
  const b = await C.cartasDaScryfall(['Carta Lida', 'Carta Nova', 'Carta Sumida'], { busca: scryfall(TABELA, { chamadas: ch }), pausa: 0, cache });
  assert.deepEqual(ch, [['Lightning Bolt', 'Carta Lida'], ['Carta Nova', 'Carta Sumida']]);
  assert.equal(a.cartas.size, 2); assert.deepEqual([...b.cartas.keys()].length, 2, 'a Carta Lida vem do cache e a Carta Nova da Scryfall');
  const c = await C.cartasDaScryfall(['Carta Sumida'], { busca: scryfall(TABELA, { chamadas: ch }), pausa: 0, cache });
  assert.equal(ch.length, 2, 'a Carta Sumida já foi respondida (não existe): não pede de novo'); assert.equal(c.cartas.size, 0);
  const cache2 = C.novoCache(), ch2 = [];
  await C.cartasDaScryfall(['Carta Nova'], { busca: scryfall(TABELA, { falha: true, chamadas: ch2 }), pausa: 0, cache: cache2 });
  await C.cartasDaScryfall(['Carta Nova'], { busca: scryfall(TABELA, { chamadas: ch2 }), pausa: 0, cache: cache2 });
  assert.deepEqual(ch2, [['Carta Nova'], ['Carta Nova']], 'o lote que falhou não entra no cache');
});

test('H-16 · resumo: uma linha por formato e a ordem gulosa somada dos competitivos (Pauper e Commander fora da soma)', () => {
  const rel = (formato, listas100, incompletas, pendentes) => ({ versao: 1, formato, geradoEm: 'T', motor: 112, listas: listas100 + incompletas.length, listas100,
    cartasPendentes: pendentes.length, porClasse: {}, parcial: false, pendentes, listasIncompletas: incompletas });
  const P = (name, classe, listas, texto = null) => ({ name, classe, listas, texto });
  const r = C.resumo([
    rel('modern', 2, [{ id: 'm1', faltam: ['A'] }, { id: 'm2', faltam: ['A', 'B', 'C'] }], [P('A', 'lida', 2, {}), P('B', 'nova', 1), P('C', 'nova', 1)]),
    rel('legacy', 1, [{ id: 'l1', faltam: ['B'] }, { id: 'l2', faltam: ['D', 'E'] }], [P('B', 'nova', 1), P('D', 'lida', 1), P('E', 'nova', 1)]),
    rel('pauper', 5, [], []), rel('commander', 0, [{ id: 'c1', faltam: ['Z'] }], [P('Z', 'nova', 1)]),
    { versao: 1, pct: {} }, null,
  ], { agora: 'R', top: 4 });
  assert.deepEqual(r.formatos.map(f => [f.formato, f.listas100, f.listas]), [['commander', 0, 1], ['legacy', 1, 3], ['modern', 2, 4], ['pauper', 5, 5]]);
  const c = r.competitivos;
  assert.deepEqual([c.formatos, c.listas, c.listas100, c.cartasPendentes], [['legacy', 'modern'], 7, 3, 5]);
  assert.deepEqual(c.ordem.map(x => [x.name, x.gulosa, x.listas, x.formatos.join('+')]), [['A', 1, 2, 'modern'], ['B', 2, 2, 'modern+legacy'], ['C', 3, 1, 'modern'], ['D', 4, 1, 'legacy']]);
  assert.equal(JSON.stringify(c.curva), JSON.stringify([{ listas: 4, cartas: 1 }, { listas: 7, cartas: 5 }]), 'm1 (A) · l1 (B) · m2 (C) · l2 (D, E)');
  assert.deepEqual(c.porClasse, { 'texto-mudou': 0, lida: 2, nova: 3, parcial: 0, 'sem-dados': 0 });
  assert.equal(c.ordem[0].texto, true);
});

test('H-16 · executa regrava cobertura/resumo.json com todos os relatórios da pasta (sem o motor.json); pasta sem relatórios não quebra', async () => {
  const pasta = await pastaCom([['m1', 'modern', [['Lightning Bolt', 4]]], ['m2', 'modern', [['Carta Lida', 4]]], ['p1', 'pauper', [['Carta Nova', 4]]]]);
  try {
    assert.equal(C.gravaResumo(pasta, { log: () => {} }), null);
    await C.executa({ pasta, formato: 'pauper', busca: scryfall(TABELA), pausa: 0, log: () => {}, agora: 'T1' });
    await mkdir(join(pasta, 'cobertura'), { recursive: true });
    await writeFile(join(pasta, 'cobertura', 'motor.json'), JSON.stringify({ versao: 1, pct: {}, formatos: {} }));
    await writeFile(join(pasta, 'cobertura', 'quebrado.json'), '{');
    const log = []; await C.executa({ pasta, formato: 'modern', busca: scryfall(TABELA), pausa: 0, log: x => log.push(x), agora: 'T2' });
    const f = JSON.parse(await readFile(join(pasta, 'cobertura', 'resumo.json'), 'utf8'));
    assert.equal(f.geradoEm, 'T2'); assert.deepEqual(f.formatos.map(x => x.formato), ['modern', 'pauper']);
    assert.deepEqual(f.competitivos.ordem.map(x => [x.name, x.classe, x.texto]), [['Carta Lida', 'lida', true]]);
    assert.match(log.join('\n'), /Resumo: modern 1\/2 · pauper 0\/1 · competitivos 1\/2/);
  } finally { await rm(pasta, { recursive: true, force: true }); }
});
