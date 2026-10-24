// G-301 · relato #32 · quanto de cada lista roda no motor, no selo da linha de toda listagem (Minhas listas, escolha de lista do Jogar).
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';

const M = loadModules(), L = M.listas, norm = M.cards.norm;
const carta = (name, type_line, oracle_text = '') => ({ name, type_line, oracle_text, mana_cost: '', cmc: 0, colors: [] });
const mapa = (...cs) => new Map(cs.map(c => [norm(c.name), c]));
const J = v => JSON.parse(JSON.stringify(v));

test('G-301 · motorDaLista: 100% só com tudo resolvido; o que não joga baixa a conta (por cópia, só o principal); carta sem dado no aparelho conta como "não joga" (igual à tela Jogar) e a fala diz quantas', () => {
  const cards = mapa(carta('Grizzly Bears', 'Creature — Bear'), carta('Mistério Total', 'Sorcery', 'Do something the engine cannot read in any way whatsoever.'));
  const ok = L.motorDaLista([{ name: 'Grizzly Bears', qty: 4, zone: 'main' }, { name: 'Island', qty: 16, zone: 'main' }, { name: 'Mistério Total', qty: 3, zone: 'side' }], cards);
  assert.deepEqual(J(ok), { estado: 'completo', pct: 100, total: 20, semDados: 0, faltam: [] }, 'a reserva não entra; básico é sempre conhecido');
  const meio = L.motorDaLista([{ name: 'Grizzly Bears', qty: 6, zone: 'main' }, { name: 'Mistério Total', qty: 4, zone: 'main' }], cards);
  assert.deepEqual(J(meio), { estado: 'incompleto', pct: 60, total: 10, semDados: 0, faltam: ['Mistério Total'] });
  const quase = L.motorDaLista([{ name: 'Grizzly Bears', qty: 299, zone: 'main' }, { name: 'Mistério Total', qty: 1, zone: 'main' }], cards);
  assert.equal(quase.pct, 99, '99,7% não pode virar "100%"');
  const sem = L.motorDaLista([{ name: 'Grizzly Bears', qty: 4, zone: 'main' }, { name: 'Carta Nunca Guardada', qty: 4, zone: 'main' }], cards);
  assert.deepEqual(J([sem.estado, sem.pct, sem.semDados, sem.faltam]), ['incompleto', 50, 4, ['Carta Nunca Guardada']], 'sem dado no aparelho conta como "não joga", como na tela Jogar');
  assert.equal(L.motorDaLista([], cards).estado, 'vazia');
  assert.equal(L.motorDaLista([{ name: 'Lightning Bolt', qty: 4, zone: 'main' }], new Map()).estado, 'completo', 'carta com script à mão joga mesmo sem dado guardado');
});

test('G-301 · motorDaLista é a mesma conta da tela Jogar (deckCoverage) quando todas as cartas estão guardadas', () => {
  const cards = mapa(carta('Grizzly Bears', 'Creature — Bear'), carta('Mistério Total', 'Sorcery', 'Do something the engine cannot read in any way whatsoever.'), carta('Llanowar Elves', 'Creature — Elf Druid', '{T}: Add {G}.'));
  const lista = [{ name: 'Grizzly Bears', qty: 4, zone: 'main' }, { name: 'Mistério Total', qty: 2, zone: 'main' }, { name: 'Llanowar Elves', qty: 4, zone: 'main' }, { name: 'Forest', qty: 10, zone: 'main' }];
  const tela = M.scripts.deckCoverage(lista.map(e => ({ ...e, key: norm(e.name) })), cards);
  const linha = L.motorDaLista(lista, cards);
  assert.equal(linha.pct, tela.pct); assert.deepEqual(J(linha.faltam), J([...new Set(tela.pending.map(p => p.name))]));
});

test('G-301 · contaMotor guarda a conta: a mesma lista com as mesmas cartas não é contada de novo; mudar uma entrada conta de novo', () => {
  const cards = mapa(carta('Grizzly Bears', 'Creature — Bear'));
  const d = { id: 'x1', entries: [{ name: 'Grizzly Bears', qty: 4, zone: 'main' }] };
  const a = L.contaMotor(d, cards), b = L.contaMotor({ ...d, entries: [...d.entries] }, cards);
  assert.equal(a, b, 'a mesma conta volta (guardada)');
  const c = L.contaMotor({ ...d, entries: [{ name: 'Grizzly Bears', qty: 3, zone: 'main' }] }, cards);
  assert.notEqual(c, a); assert.equal(c.total, 3);
});
