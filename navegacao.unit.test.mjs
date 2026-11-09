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
