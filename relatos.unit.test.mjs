// Y1 · relatos do usuário: o que o formulário exige, o carimbo de data e hora, a ordem, o texto para colar e o armazenamento.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
const { relatos: R, platform: P, perfil: PF } = loadModules();
const J = x => JSON.parse(JSON.stringify(x));

test('Y1 · confere: tipo e urgência vêm das listas, a descrição é obrigatória e tem limite', () => {
  assert.deepEqual(J(R.confere({})), { tipo: 'Escolha o tipo.', urgencia: 'Escolha a urgência.', descricao: 'Conte em poucas palavras o que aconteceu.' });
  assert.deepEqual(J(R.confere({ tipo: 'erro', urgencia: 'alta', descricao: 'A carta não virou.' })), {});
  assert.ok(R.confere({ tipo: 'erro', urgencia: 'alta', descricao: '  ok ' }).descricao, 'só espaço não conta');
  assert.ok(R.confere({ tipo: 'xyz', urgencia: 'alta', descricao: 'texto suficiente' }).tipo, 'tipo fora da lista');
  assert.match(R.confere({ tipo: 'erro', urgencia: 'alta', descricao: 'x'.repeat(R.DESCRICAO_MAX + 1) }).descricao, /Até 2000/);
  assert.deepEqual(J(R.TIPOS.map(t => t[1])), ['Erro', 'Regra ou carta', 'Visual', 'Ideia', 'Lentidão', 'Outro']);
  assert.deepEqual(J(R.URGENCIAS.map(t => t[1])), ['Impede o uso', 'Alta', 'Média', 'Baixa']);
});

test('Y1 · novoRelato: carimbo de data e hora do app em ISO, área pela rota, contexto e partida junto, aberto', () => {
  const agora = Date.UTC(2026, 9, 8, 23, 14, 5);
  const r = R.novoRelato({ tipo: 'regra', urgencia: 'media', descricao: '  Lurrus não deixou conjurar.  ', hash: '#/lista?id=abc', contexto: { motor: 92, tema: 'escuro' }, partida: { turno: 3 } }, agora, 'r1');
  assert.equal(r.ok, true);
  assert.deepEqual(J(r.relato), { id: 'r1', criadoEm: '2026-10-08T23:14:05.000Z', tipo: 'regra', urgencia: 'media', descricao: 'Lurrus não deixou conjurar.', area: 'Lista', rota: '/lista',
    contexto: { motor: 92, tema: 'escuro' }, partida: { turno: 3 }, status: 'aberto' });
  assert.equal(R.novoRelato({ tipo: 'erro' }).ok, false);
  assert.deepEqual(['#/', '', '#/listas', '#/listas/editar', '#/perfil/relatos', '#/perfil', '#/partida', '#/mesa', '#/xyz'].map(x => String(R.areaDaRota(x).nome)),
    ['Início', 'Início', 'Listas', 'Listas', 'Relatos', 'Perfil', 'Mesa', 'Jogar', 'Outra tela']);
});

test('Y1 · ordena: abertos antes dos resolvidos, depois a urgência maior, depois o mais recente; quebrado fica fora', () => {
  const mk = (id, urgencia, dia, status = 'aberto') => ({ id, tipo: 'erro', urgencia, descricao: 'algo', criadoEm: `2026-10-0${dia}T10:00:00.000Z`, status });
  const l = [mk('a', 'baixa', 8), mk('b', 'bloqueia', 1), mk('c', 'alta', 5, 'resolvido'), mk('d', 'alta', 3), mk('e', 'alta', 6), { id: 'x' }, null];
  assert.deepEqual(J(R.ordena(l).map(r => r.id)), ['b', 'e', 'd', 'a', 'c']);
});

test('Y1 · texto para colar: cabeçalho com tipo, urgência e área, data, tela, contexto e a descrição', () => {
  const r = R.novoRelato({ tipo: 'erro', urgencia: 'bloqueia', descricao: 'Tela travou\nao manter.', hash: '#/partida', contexto: { motor: 92, tema: 'claro', tela: '360×780', online: false } }, Date.UTC(2026, 9, 8, 12), 'r2').relato;
  const t = R.textoDoRelato(r);
  assert.match(t, /^### Erro · Impede o uso · Mesa\n- Quando: .+ \(2026-10-08T12:00:00\.000Z\)\n- Tela: \/partida\n- Contexto: motor v92 · tema claro · 360×780 · sem internet\n\nTela travou\nao manter\.$/);
  assert.equal(R.textoDosRelatos([r, r]).split('\n---\n').length, 2);
});

test('Y1 · armazenamento: salva com o relógio do app, muda o status, exclui e desfaz, avisa quem ouve; inválido não grava', async () => {
  let agora = Date.UTC(2026, 9, 8, 20, 0);
  const store = P.memoryStore(), S = R.createRelatos({ store, agora: () => agora });
  let avisos = 0; S.onMuda(() => avisos++);
  const bad = await S.salva({ tipo: 'erro', urgencia: '', descricao: 'abc' });
  assert.equal(bad.ok, false); assert.ok(bad.erros.urgencia && bad.erros.descricao); assert.deepEqual(J(await S.todos()), []);
  const a = await S.salva({ tipo: 'ideia', urgencia: 'baixa', descricao: 'Mostrar o placar da série', hash: '#/' });
  agora += 60000;
  const b = await S.salva({ tipo: 'erro', urgencia: 'alta', descricao: 'Imagem não aparece', hash: '#/cartas' });
  assert.equal(a.relato.criadoEm, '2026-10-08T20:00:00.000Z'); assert.equal(b.relato.criadoEm, '2026-10-08T20:01:00.000Z');
  assert.deepEqual(J((await S.todos()).map(r => r.area)), ['Cartas', 'Início']);
  assert.equal(await S.abertos(), 2);
  await S.muda(b.relato.id, { status: 'resolvido' }); assert.equal(await S.abertos(), 1);
  const tirado = await S.remove(a.relato.id); assert.equal((await S.todos()).length, 1);
  await S.restaura(tirado); await S.restaura(tirado); assert.equal((await S.todos()).length, 2, 'desfazer não duplica');
  assert.equal(avisos, 5);
  assert.ok(Array.isArray(await store.get(R.CHAVE)), 'guardado na chave que o backup leva');
});

test('Y1 · os relatos vão no backup completo', () => {
  assert.ok(PF.PREFERENCIAS.includes(R.CHAVE));
});
