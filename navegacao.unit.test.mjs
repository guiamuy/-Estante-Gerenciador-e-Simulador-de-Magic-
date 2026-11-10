// DS-K3 MV-1 (G-366) · navegação com direção: avançar afasta, voltar aproxima, troca de aba desliza no sentido da barra.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
const { router: R } = loadModules();
const d = (a, b, ant = null) => { const x = R.direcaoDaNavegacao(a, b, ant); return x.tipo + (x.sentido > 0 ? '+' : x.sentido < 0 ? '-' : ''); };

test('MV-1 · os cinco destinos na ordem da barra: Início · Listas · Jogar · Coleção · Scanner', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(R.ABAS.map(a => a[0]))), ['/', '/listas', '/mesa', '/colecao', '/scanner']);
});

test('MV-1 · troca de aba: para a raiz de outro destino, no sentido da ordem da barra (também saindo de uma subtela)', () => {
  assert.equal(d('#/', '#/listas'), 'aba+');
  assert.equal(d('#/colecao', '#/listas'), 'aba-');
  assert.equal(d('#/listas', '#/scanner'), 'aba+');
  assert.equal(d('#/lista?id=abc', '#/colecao'), 'aba+', 'da lista aberta para a Coleção');
  assert.equal(d('#/noticias', '#/mesa'), 'aba+', 'notícias moram no Início');
  assert.equal(d('#/cartas', '#/'), 'aba-', 'cartas moram na Coleção');
});

test('MV-1 · avançar: abrir uma subtela (mais funda, ou fora dos destinos)', () => {
  assert.equal(d('#/listas', '#/lista?id=x'), 'avanca+');
  assert.equal(d('#/', '#/perfil'), 'avanca+');
  assert.equal(d('#/perfil', '#/perfil/fichas'), 'avanca+');
  assert.equal(d('#/listas', '#/listas/catalogo'), 'avanca+');
});

test('MV-1 · voltar: o endereço anterior da pilha, ou uma tela mais rasa', () => {
  assert.equal(d('#/lista?id=x', '#/listas', '#/listas'), 'volta-', 'anterior da pilha');
  assert.equal(d('#/perfil/fichas', '#/perfil'), 'volta-', 'mais rasa');
  assert.equal(d('#/perfil', '#/'), 'volta-', 'do Perfil ao Início');
  assert.equal(d('#/perfil/fichas', '#/lista?id=y', '#/lista?id=y'), 'volta-', 'voltar pelo navegador para a lista aberta antes');
});

test('MV-1 · nenhuma: primeira tela, mesmo endereço, mesma tela com outra consulta, e a mesa e a porta (movimento próprio)', () => {
  assert.equal(d(null, '#/'), 'nenhuma');
  assert.equal(d('#/listas', '#/listas'), 'nenhuma');
  assert.equal(d('#/colecao?q=a', '#/colecao?q=b'), 'nenhuma');
  assert.equal(d('#/mesa', '#/partida'), 'nenhuma', 'Jogar → mesa é da MV-9');
  assert.equal(d('#/partida', '#/'), 'nenhuma');
  assert.equal(d('#/entrar', '#/'), 'nenhuma', 'a porta tem a saída dela (G-274)');
});

// DS-K3 K3-3 (G-367) · a barra que recolhe ao rolar
const rola = ys => ys.reduce((e, y) => R.barraAoRolar(e, y), null);
test('K3-3 · rolar para baixo além do limiar (12 px acumulados) recolhe a barra; perto do topo ela fica', () => {
  assert.equal(rola([0, 40, 50]).recolhida, false, 'até o topo (64 px), sempre à vista');
  assert.equal(rola([100, 105, 110]).recolhida, false, '10 px acumulados: ainda não');
  assert.equal(rola([100, 105, 110, 113]).recolhida, true, '13 px acumulados: recolhe');
  assert.equal(rola([100, 400]).recolhida, true, 'um salto grande recolhe de uma vez');
});
test('K3-3 · o primeiro gesto para cima (4 px ou mais) traz de volta; o repique menor não', () => {
  assert.equal(rola([100, 400, 396]).recolhida, false, '4 px para cima: volta');
  assert.equal(rola([100, 400, 398]).recolhida, true, '2 px para cima (repique do fim da página): fica recolhida');
  assert.equal(rola([100, 400, 380, 390]).recolhida, false, 'depois de voltar, precisa de 12 px de novo para recolher');
  assert.equal(rola([100, 400, 380, 390, 395]).recolhida, true);
  assert.equal(rola([100, 400, 30]).recolhida, false, 'no topo, à vista');
});

// DS-K3 K3-4 (G-375) · o cabeçalho editorial recolhe na proporção da rolagem
test('K3-4 · cabecalhoAoRolar: 0 no topo, a metade em 20 px, 1 a partir de 40 px; Reduzido troca direto nos 40 px', () => {
  assert.deepEqual([0, 10, 20, 40, 400, -30].map(y => R.cabecalhoAoRolar(y)), [0, 0.25, 0.5, 1, 1, 0]);
  assert.deepEqual([0, 20, 39, 40, 400].map(y => R.cabecalhoAoRolar(y, { parado: true })), [0, 0, 0, 1, 1]);
  assert.equal(R.cabecalhoAoRolar(30, { faixa: 60 }), 0.5, 'a faixa é parâmetro');
});
