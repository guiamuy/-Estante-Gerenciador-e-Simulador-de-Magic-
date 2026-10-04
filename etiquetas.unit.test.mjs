// G2 · etiquetas: agrupamento livre de cartas e listas. O modelo é puro; o serviço só guarda.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
const { etiquetas: E, filter: FL, perfil: PF } = loadModules();
const J = x => JSON.parse(JSON.stringify(x));
const memoria = (inicial = {}) => { const m = new Map(Object.entries(inicial)); return { get: async k => m.get(k), set: async (k, v) => { m.set(k, J(v)); }, m }; };

test('G2 · criar, renomear, recolorir e apagar: nome limpo e único, cor válida, estado recebido intocado', () => {
  const e0 = E.vazio(); const copia = J(e0);
  let r = E.cria(e0, { nome: '  Para   trocar  ', cor: 'jade' }, 'a');
  assert.deepEqual(J(r.etiqueta), { id: 'a', nome: 'Para trocar', cor: 'jade' });
  assert.deepEqual(J(e0), copia, 'o estado recebido não muda');
  assert.equal(E.cria(r.estado, { nome: 'para TROCAR' }, 'b').erro, 'nome-repetido');
  assert.equal(E.cria(r.estado, { nome: '   ' }, 'b').erro, 'nome-vazio');
  assert.equal(E.cria(r.estado, { nome: 'x'.repeat(60) }, 'b').etiqueta.nome.length, E.NOME_MAX);
  // sem cor pedida (ou cor estranha), a nova pega a menos usada: nasce diferente das que já existem
  const r2 = E.cria(r.estado, { nome: 'Pauper', cor: 'rosa-choque' }, 'b');
  assert.notEqual(r2.etiqueta.cor, 'jade'); assert.ok(E.CORES.some(c => c[0] === r2.etiqueta.cor));
  const r3 = E.edita(r2.estado, 'b', { nome: 'Pauper pronto', cor: 'rubi' });
  assert.deepEqual(J(r3.etiqueta), { id: 'b', nome: 'Pauper pronto', cor: 'rubi' });
  assert.equal(E.edita(r3.estado, 'b', { nome: 'Para trocar' }).erro, 'nome-repetido');
  assert.equal(E.edita(r3.estado, 'b', { nome: 'Pauper pronto' }).erro, undefined, 'salvar sem mudar o nome não é repetição');
  assert.equal(E.edita(r3.estado, 'zz', { nome: 'x' }).erro, 'nao-existe');
  // limite
  let cheio = E.vazio(); for (let i = 0; i < E.LIMITE; i++) cheio = E.cria(cheio, { nome: 'e' + i }, 'i' + i).estado;
  assert.equal(E.cria(cheio, { nome: 'mais uma' }, 'x').erro, 'limite');
});

test('G2 · marcar várias de uma vez, três estados na seleção, contagem, e apagar leva as marcas junto', () => {
  let e = E.cria(E.vazio(), { nome: 'Troca', cor: 'cobre' }, 't').estado;
  e = E.cria(e, { nome: 'Pauper', cor: 'azul' }, 'p').estado;
  e = E.marca(e, 'cartas', ['sol ring', 'island'], 't', true).estado;
  e = E.marca(e, 'cartas', ['sol ring'], 'p', true).estado;
  e = E.marca(e, 'cartas', ['sol ring'], 'p', true).estado; // marcar de novo não duplica
  e = E.marca(e, 'listas', ['d1'], 'p', true).estado;
  assert.deepEqual(J(e.cartas), { 'sol ring': ['t', 'p'], island: ['t'] });
  assert.deepEqual(J(E.de(e, 'cartas', 'sol ring').map(t => t.nome)), ['Troca', 'Pauper']);
  assert.deepEqual(J(E.de(e, 'cartas', 'counterspell')), []);
  assert.equal(E.estadoNaSelecao(e, 'cartas', ['sol ring', 'island'], 't'), 'todas');
  assert.equal(E.estadoNaSelecao(e, 'cartas', ['sol ring', 'island'], 'p'), 'algumas');
  assert.equal(E.estadoNaSelecao(e, 'cartas', ['counterspell'], 'p'), 'nenhuma');
  assert.equal(E.estadoNaSelecao(e, 'cartas', [], 'p'), 'nenhuma');
  assert.deepEqual(J([...E.contagem(e, 'cartas')]), [['t', 2], ['p', 1]]);
  assert.deepEqual(J([...E.contagem(e, 'cartas', new Set(['island']))]), [['t', 1], ['p', 0]], 'só conta carta que ainda está na coleção');
  assert.deepEqual(J([...E.contagem(e, 'listas')]), [['t', 0], ['p', 1]]);
  assert.equal(E.marca(e, 'cartas', ['island'], 'nao-existe', true).erro, 'nao-existe');
  assert.equal(E.marca(e, 'pastas', ['island'], 't', true).erro, 'nao-existe');
  // desligar tira a chave quando ela fica sem etiqueta
  assert.deepEqual(J(E.marca(e, 'cartas', ['island', 'sol ring'], 't', false).estado.cartas), { 'sol ring': ['p'] });
  // apagar: some da lista e de tudo o que a tinha
  const semP = E.apaga(e, 'p').estado;
  assert.deepEqual(J(semP), { lista: [{ id: 't', nome: 'Troca', cor: 'cobre' }], cartas: { 'sol ring': ['t'], island: ['t'] }, listas: {} });
  assert.deepEqual(J(E.esquece(e, 'listas', 'd1').estado.listas), {});
});

test('G2 · o que vem do armazenamento (ou de um backup) é saneado: sem nome, id repetido, cor estranha e marca órfã saem', () => {
  const e = E.normaliza({ lista: [{ id: 'a', nome: ' Troca ', cor: 'neon' }, { id: 'a', nome: 'Repetida' }, { id: 'b', nome: '' }, { id: 'c,d', nome: 'vírgula no id' }, null, { id: 'e', nome: 'Ok', cor: 'rubi' }],
    cartas: { island: ['a', 'zz', 'a'], forest: ['zz'], swamp: 'x' }, listas: null });
  assert.deepEqual(J(e), { lista: [{ id: 'a', nome: 'Troca', cor: E.CORES[0][0] }, { id: 'e', nome: 'Ok', cor: 'rubi' }], cartas: { island: ['a'] }, listas: {} });
  assert.deepEqual(J(E.normaliza(null)), J(E.vazio())); assert.deepEqual(J(E.normaliza('lixo')), J(E.vazio()));
});

test('G2 · serviço: guarda no aparelho, relê depois de um backup restaurado, e as etiquetas viajam no backup', async () => {
  const store = memoria();
  let n = 0; const s = E.createEtiquetas({ store, novoId: () => 'id' + (++n) });
  const r = await s.cria({ nome: 'Troca' }); assert.equal(r.etiqueta.id, 'id1');
  await s.marca('cartas', ['island'], 'id1', true);
  assert.deepEqual(J(store.m.get(E.CHAVE)).cartas, { island: ['id1'] });
  assert.equal((await s.cria({ nome: 'troca' })).erro, 'nome-repetido');
  assert.equal(J(store.m.get(E.CHAVE)).lista.length, 1, 'erro não grava');
  // outro aparelho: o serviço novo lê o que estava guardado
  assert.deepEqual(J((await E.createEtiquetas({ store }).estado()).lista.map(t => t.nome)), ['Troca']);
  // backup restaurado por baixo: recarrega() faz a próxima leitura vir do armazenamento
  await store.set(E.CHAVE, { lista: [{ id: 'z', nome: 'Do backup', cor: 'jade' }], cartas: {}, listas: { d9: ['z'] } });
  assert.equal((await s.estado()).lista[0].nome, 'Troca'); s.recarrega();
  assert.deepEqual(J(await s.estado()), { lista: [{ id: 'z', nome: 'Do backup', cor: 'jade' }], cartas: {}, listas: { d9: ['z'] } });
  assert.ok(PF.PREFERENCIAS.includes(E.CHAVE), 'a chave das etiquetas está entre as preferências do backup');
  // armazenamento que falha: funciona na sessão, sem estourar
  const ruim = E.createEtiquetas({ store: { get: async () => { throw new Error('x'); }, set: async () => { throw new Error('x'); } } });
  assert.equal((await ruim.cria({ nome: 'Só agora' })).etiqueta.nome, 'Só agora'); assert.equal((await ruim.estado()).lista.length, 1);
});

test('G2 · filtro da coleção por etiqueta: qualquer uma das ligadas; conta como critério; vai e volta no link; descrito pelo nome', () => {
  const grupos = ['Island', 'Sol Ring', 'Counterspell'].map(name => ({ key: name.toLowerCase(), name, qty: 1, items: [{ qty: 1 }] }));
  const marcas = { island: ['t'], 'sol ring': ['t', 'p'] };
  const etiquetasDe = k => marcas[k];
  const f = FL.novoFiltro({ etiquetas: ['p'] });
  assert.deepEqual(J(FL.filtraColecao(grupos, f, { etiquetasDe }).itens.map(g => g.name)), ['Sol Ring']);
  assert.deepEqual(J(FL.filtraColecao(grupos, FL.novoFiltro({ etiquetas: ['p', 't'] }), { etiquetasDe }).itens.map(g => g.name)), ['Island', 'Sol Ring']);
  assert.equal(FL.filtraColecao(grupos, FL.novoFiltro({ etiquetas: ['nada'] }), { etiquetasDe }).total, 0);
  assert.equal(FL.filtraColecao(grupos, f).total, 3, 'sem quem informe as etiquetas (lista de um deck), o critério não se aplica');
  assert.equal(FL.filtrosAtivos(f), 1); assert.equal(FL.filtroVazio(FL.novoFiltro()), true);
  assert.equal(FL.codificaFiltro(f), 'x=p');
  assert.deepEqual(J(FL.decodificaFiltro('x=p,t').etiquetas), ['p', 't']);
  assert.ok(FL.mesmoFiltro(FL.decodificaFiltro(FL.codificaFiltro(f)), f));
  // visão salva antes das etiquetas existirem (sem o campo) continua valendo
  const antiga = { ...FL.novoFiltro({ texto: 'sol' }) }; delete antiga.etiquetas;
  assert.equal(FL.filtrosAtivos(antiga), 1); assert.equal(FL.descreveFiltro(antiga), '"sol"'); assert.equal(FL.filtraColecao(grupos, antiga, { etiquetasDe }).total, 1);
  assert.equal(FL.descreveFiltro(f), '1 etiqueta');
  assert.equal(FL.descreveFiltro(FL.novoFiltro({ etiquetas: ['p', 't'], texto: 'sol' }), { nomesEtiquetas: new Map([['p', 'Pauper'], ['t', 'Troca']]) }), 'Pauper/Troca · "sol"');
});
