// C12 · motor de filtro da coleção: cada critério, as combinações, carta sem dados,
// opções que existem na coleção, descrição do recorte e desempenho.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
const { filter: F } = loadModules();

const carta = (name, o = {}) => ({ name, colors: o.colors || [], color_identity: o.ci || o.colors || [], type_line: o.type || 'Creature — Elf', rarity: o.rarity || 'common',
  cmc: o.cmc ?? 2, oracle_text: o.oracle || '', legalities: o.legal || { pauper: 'legal', commander: 'legal' } });
const it = (o = {}) => ({ set: o.set || '', number: o.number || '', finish: o.finish || '', lang: o.set ? (o.lang || 'en') : '', qty: o.qty ?? 1 });
const grupo = (name, items) => ({ key: name.toLowerCase(), name, qty: items.reduce((s, x) => s + x.qty, 0), items });

const CARDS = new Map([
  ['llanowar elves', carta('Llanowar Elves', { colors: ['G'], oracle: '{T}: Add {G}.' })],
  ['counterspell', carta('Counterspell', { colors: ['U'], type: 'Instant', oracle: 'Counter target spell.', cmc: 2 })],
  ['sol ring', carta('Sol Ring', { type: 'Artifact', rarity: 'uncommon', cmc: 1, oracle: '{T}: Add {C}{C}.', legal: { commander: 'legal', pauper: 'not_legal' } })],
  ['boros charm', carta('Boros Charm', { colors: ['R', 'W'], type: 'Instant', rarity: 'uncommon', cmc: 2 })],
  ['island', carta('Island', { type: 'Basic Land — Island', cmc: 0, ci: ['U'] })],
  ['gray merchant of asphodel', carta('Gray Merchant of Asphodel', { colors: ['B'], type: 'Creature — Zombie', cmc: 5, oracle: 'each opponent loses X life' })]
]);
const GRUPOS = [
  grupo('Llanowar Elves', [it({ qty: 4 })]),
  grupo('Counterspell', [it({ set: 'mh2', number: '267', qty: 2 }), it({ set: 'cmm', number: '81', finish: 'foil', lang: 'pt', qty: 1 })]),
  grupo('Sol Ring', [it({ set: 'cmm', number: '400', qty: 1 }), it({ qty: 1 })]),
  grupo('Boros Charm', [it({ set: 'gtc', number: '148', qty: 3 })]),
  grupo('Island', [it({ qty: 20 })]),
  grupo('Gray Merchant of Asphodel', [it({ set: 'thb', number: '99', qty: 4 })]),
  grupo('Carta Misteriosa', [it({ set: 'xyz', number: '1', qty: 2 })])   // sem dados guardados
];
const USADO = new Map([['counterspell', ['Delver']], ['island', ['Delver']]]);
const nomes = r => JSON.parse(JSON.stringify(r.itens.map(g => g.name)));
const filtra = f => F.filtraColecao(GRUPOS, F.novoFiltro(f), { cards: CARDS, usadoEm: USADO });

test('C12 · sem filtro tudo passa, com contagem de cópias; texto procura no nome e no texto da carta', () => {
  const tudo = filtra({});
  assert.equal(tudo.total, 7); assert.equal(tudo.copias, 38); assert.equal(tudo.semDados, 0);
  assert.deepEqual(nomes(filtra({ texto: 'sol' })), ['Sol Ring']);
  assert.deepEqual(nomes(filtra({ texto: 'add' })), ['Llanowar Elves', 'Sol Ring'], 'texto de regras');
  assert.deepEqual(nomes(filtra({ texto: 'loses x' })), ['Gray Merchant of Asphodel']);
  assert.deepEqual(nomes(filtra({ texto: 'MISTERIOSA' })), ['Carta Misteriosa'], 'sem dados, o nome ainda responde');
});

test('C12 · cor: qualquer uma das escolhidas, incolor, e identidade dentro das escolhidas', () => {
  assert.deepEqual(nomes(filtra({ cores: ['G'] })), ['Llanowar Elves']);
  assert.deepEqual(nomes(filtra({ cores: ['R', 'U'] })), ['Counterspell', 'Boros Charm'], 'qualquer: bate em uma das cores');
  assert.deepEqual(nomes(filtra({ cores: ['C'] })), ['Sol Ring', 'Island'], 'incolor: sem cor');
  assert.deepEqual(nomes(filtra({ cores: ['R'], modoCor: 'identidade' })), [], 'Boros Charm tem branco na identidade');
  assert.deepEqual(nomes(filtra({ cores: ['R', 'W'], modoCor: 'identidade' })), ['Boros Charm']);
  assert.deepEqual(nomes(filtra({ cores: ['U', 'C'], modoCor: 'identidade' })), ['Counterspell', 'Sol Ring', 'Island'], 'identidade azul inclui a ilha e o incolor');
  assert.equal(filtra({ cores: ['G'] }).semDados, 1, 'a carta sem dados não pode ser julgada por cor');
});

test('C12 · tipo (palavra inteira, subtipo também), raridade, custo, formato', () => {
  assert.deepEqual(nomes(filtra({ tipos: ['Instant'] })), ['Counterspell', 'Boros Charm']);
  assert.deepEqual(nomes(filtra({ tipos: ['Elf'] })), ['Llanowar Elves'], 'subtipo');
  assert.deepEqual(nomes(filtra({ tipos: ['Land'] })), ['Island'], '"Island" não vira "Land" por conter letras');
  assert.deepEqual(nomes(filtra({ tipos: ['Artifact', 'Land'] })), ['Sol Ring', 'Island']);
  assert.deepEqual(nomes(filtra({ raridades: ['uncommon'] })), ['Sol Ring', 'Boros Charm']);
  assert.deepEqual(nomes(filtra({ cmcMin: 2, cmcMax: 2 })), ['Llanowar Elves', 'Counterspell', 'Boros Charm']);
  assert.deepEqual(nomes(filtra({ cmcMin: 5 })), ['Gray Merchant of Asphodel']);
  assert.deepEqual(nomes(filtra({ cmcMax: 0 })), ['Island']);
  assert.deepEqual(nomes(filtra({ formato: 'pauper' })), ['Llanowar Elves', 'Counterspell', 'Boros Charm', 'Island', 'Gray Merchant of Asphodel']);
});

test('C12 · edição, idioma e acabamento filtram as impressões e recontam as cópias', () => {
  const cmm = filtra({ edicoes: ['cmm'] });
  assert.deepEqual(nomes(cmm), ['Counterspell', 'Sol Ring']);
  assert.equal(cmm.copias, 2, 'só as cópias da edição');
  assert.equal(cmm.itens[0].items.length, 1);
  assert.deepEqual(nomes(filtra({ idiomas: ['pt'] })), ['Counterspell']);
  assert.deepEqual(nomes(filtra({ acabamentos: ['foil'] })), ['Counterspell']);
  assert.deepEqual(nomes(filtra({ acabamentos: [''] })).length, 7, 'normal inclui todas as genéricas');
  assert.deepEqual(nomes(filtra({ edicoes: [''] })), ['Llanowar Elves', 'Sol Ring', 'Island'], 'edição vazia = cópia genérica');
});

test('C12 · quantidade, em lista / fora de lista, sem edição definida, e tudo combinado', () => {
  assert.deepEqual(nomes(filtra({ qtdMin: 4 })), ['Llanowar Elves', 'Island', 'Gray Merchant of Asphodel']);
  assert.deepEqual(nomes(filtra({ qtdMax: 2 })), ['Sol Ring', 'Carta Misteriosa']);
  assert.deepEqual(nomes(filtra({ emLista: 'sim' })), ['Counterspell', 'Island']);
  assert.deepEqual(nomes(filtra({ emLista: 'nao' })), ['Llanowar Elves', 'Sol Ring', 'Boros Charm', 'Gray Merchant of Asphodel', 'Carta Misteriosa']);
  assert.deepEqual(nomes(filtra({ semEdicao: true })), ['Llanowar Elves', 'Sol Ring', 'Island']);
  const combo = filtra({ tipos: ['Instant'], cores: ['U'], emLista: 'sim', edicoes: ['mh2'] });
  assert.deepEqual(nomes(combo), ['Counterspell']); assert.equal(combo.copias, 2);
  assert.equal(filtra({ tipos: ['Instant'], raridades: ['mythic'] }).total, 0);
});

test('C12 · contagem de filtros ativos, limpar, opções que existem e descrição do recorte', () => {
  assert.equal(F.filtrosAtivos(F.novoFiltro()), 0); assert.equal(F.filtroVazio(F.novoFiltro()), true);
  const f = F.novoFiltro({ texto: 'x', cores: ['G'], cmcMax: 3, emLista: 'sim', semEdicao: true });
  assert.equal(F.filtrosAtivos(f), 5);
  assert.equal(F.descreveFiltro(f), '"x" · verde · custo ≤ 3 · em lista · sem edição definida');
  assert.equal(F.descreveFiltro(F.novoFiltro({ cores: ['R', 'W'], modoCor: 'identidade', tipos: ['Creature'], cmcMin: 1, cmcMax: 3, formato: 'pauper', edicoes: ['cmm'], acabamentos: ['foil'], qtdMin: 4 })),
    'identidade vermelho/branco · criatura · custo 1–3 · Pauper · CMM · foil · ≥ 4 cópias');
  const op = F.opcoesDeFiltro(GRUPOS);
  assert.deepEqual(JSON.parse(JSON.stringify(op.edicoes.slice(0, 3))), [{ valor: 'thb', copias: 4 }, { valor: 'gtc', copias: 3 }, { valor: 'cmm', copias: 2 }], 'edições por cópias');
  assert.deepEqual(JSON.parse(JSON.stringify(op.idiomas)), [{ valor: 'en', copias: 12 }, { valor: 'pt', copias: 1 }]);
  assert.deepEqual(JSON.parse(JSON.stringify(op.acabamentos)), [{ valor: '', copias: 37 }, { valor: 'foil', copias: 1 }]);
  assert.equal(op.semEdicao, 25);   // 4 elfos + 1 Sol Ring + 20 ilhas
});

test('C12 · desempenho: 5 000 cartas com filtro combinado em menos de 100 ms', () => {
  const grupos = [], cards = new Map();
  const cores = [['G'], ['U'], ['B'], ['R'], ['W'], []];
  for (let i = 0; i < 5000; i++) {
    const name = `Carta ${i}`; const k = name.toLowerCase();
    grupos.push(grupo(name, [it({ set: i % 3 ? 'cmm' : '', qty: 1 + (i % 4) })]));
    cards.set(k, carta(name, { colors: cores[i % 6], type: i % 2 ? 'Creature — Elf' : 'Instant', cmc: i % 7, rarity: ['common', 'uncommon', 'rare'][i % 3], oracle: 'draw a card ' + i }));
  }
  const f = F.novoFiltro({ texto: 'draw', cores: ['G', 'U'], tipos: ['Creature'], cmcMin: 1, cmcMax: 5, formato: 'pauper', edicoes: ['cmm'], qtdMin: 2 });
  const t0 = performance.now();
  const r = F.filtraColecao(grupos, f, { cards });
  const dt = performance.now() - t0;
  assert.ok(r.total > 0 && r.total < 5000);
  assert.ok(dt < 100, `levou ${dt.toFixed(1)} ms`);
});
