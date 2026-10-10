// Y5 · do app ao GitHub e de volta: o endereço do registro preenchido, os dados no corpo, as etiquetas e a tabela.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadModules } from './_load.mjs';
import * as T from './relatos-tabela.mjs';
const { relatos: R } = loadModules();

const relato = (extra = {}) => R.novoRelato({ tipo: 'visual', urgencia: 'alta', descricao: 'O botão "Mostrar mais 30" ficou colado\nna última lista.', hash: '#/listas/prontas?x=1',
  contexto: { motor: 95, tema: 'escuro', tela: '360×697', app: '2026-10-09 18:00 UTC', online: true }, tela: { cabecalho: 'Listas prontas', rolagem: 80 }, ...extra }, Date.UTC(2026, 9, 9, 14, 5), extra.id || 'r1').relato;

test('Y5 · tipos novos: Melhoria e Infraestrutura', () => {
  assert.deepEqual(R.TIPOS.map(t => t[1]).join('|'), 'Erro|Regra ou carta|Visual|Melhoria|Ideia|Lentidão|Infraestrutura|Outro');
  assert.equal(R.confere({ tipo: 'infra', urgencia: 'baixa', descricao: 'Banco de dados por perfil' }).tipo, undefined);
});

test('Y5 · o endereço do registro: página de novo registro do repositório, título curto, texto e os dados que a tabela lê', () => {
  const u = new URL(R.enderecoDoRegistro(relato()));
  assert.equal(u.origin + u.pathname, 'https://github.com/guiamuy/-Estante-Gerenciador-e-Simulador-de-Magic-/issues/new');
  assert.equal(u.searchParams.get('labels'), 'relato');
  assert.equal(u.searchParams.get('title'), '[Visual · Alta] Listas · Listas prontas — O botão "Mostrar mais 30" ficou colado na última lista.');
  const corpo = u.searchParams.get('body');
  assert.match(corpo, /^### Visual · Alta · Listas · Listas prontas\n- Quando: /);
  const d = T.leDados(corpo);
  assert.equal(d.id, 'r1'); assert.equal(d.endereco, '/listas/prontas?x=1'); assert.equal(d.tela.cabecalho, 'Listas prontas'); assert.equal(d.motor, 95); assert.equal(d.viewport, '360×697');
  assert.equal(T.leDescricao(corpo), 'O botão "Mostrar mais 30" ficou colado\nna última lista.');
  // texto longo: cortado com aviso, os dados continuam inteiros; título com reticências
  const longo = relato({ descricao: 'x'.repeat(1990) + ' fim' });
  const u2 = new URL(R.enderecoDoRegistro({ ...longo, descricao: 'palavra '.repeat(400) }));
  assert.ok(u2.searchParams.get('body').includes('…(texto cortado: o relato inteiro está no aparelho)'));
  assert.ok(T.leDados(u2.searchParams.get('body')));
  assert.ok(u2.searchParams.get('title').endsWith('…'));
  assert.ok(u2.toString().length < 12000, 'cabe no endereço');
});

test('Y5 · tabela: só os registros do app, etiquetas, situação pelo registro fechado, ordem e CSV', () => {
  const corpo = r => new URL(R.enderecoDoRegistro(r)).searchParams.get('body');
  const issues = [
    { number: 3, html_url: 'u3', state: 'open', created_at: '2026-10-09T15:00:00Z', body: corpo(relato({ urgencia: 'baixa', id: 'r3' })), labels: [] },
    { number: 4, html_url: 'u4', state: 'closed', closed_at: '2026-10-10T10:00:00Z', created_at: '2026-10-09T16:00:00Z', body: corpo(relato({ tipo: 'infra', urgencia: 'bloqueia', id: 'r4' })), labels: [{ name: 'relato' }] },
    { number: 5, html_url: 'u5', state: 'open', created_at: '2026-10-09T17:00:00Z', body: corpo(relato({ tipo: 'erro', urgencia: 'alta', id: 'r5' })), labels: [] },
    { number: 6, html_url: 'u6', state: 'open', created_at: '2026-10-09T17:00:00Z', body: 'registro escrito à mão, sem dados', labels: [] },
    { number: 7, pull_request: {}, state: 'open', body: corpo(relato()) }];
  const t = T.tabela(issues);
  assert.deepEqual(t.map(l => [l.numero, l.situacao, l.urgencia]), [[5, 'aberto', 'alta'], [3, 'aberto', 'baixa'], [4, 'resolvido', 'bloqueia']]);
  assert.equal(t[2].resolvidoEm, '2026-10-10T10:00:00Z'); assert.equal(t[0].titulo_da_tela, 'Listas prontas'); assert.equal(t[0].endereco, '/listas/prontas?x=1');
  assert.deepEqual(T.etiquetasDe({ tipo: 'infra', urgencia: 'bloqueia', area: 'Perfil' }).map(e => e.nome), ['relato', 'tipo: Infraestrutura', 'urgência: Impede o uso', 'área: Perfil']);
  const c = T.csv(t);
  assert.ok(c.startsWith('﻿numero,situacao,tipo,urgencia,area,titulo_da_tela,endereco,'));
  assert.ok(c.includes('5,aberto,Erro,Alta,Listas,Listas prontas,/listas/prontas?x=1,'));
  assert.ok(c.includes('"O botão ""Mostrar mais 30"" ficou colado\nna última lista."'));
});

test('Y5 · atualiza: cria as etiquetas que faltam, etiqueta só o que falta e grava relatos.json e relatos.csv', async () => {
  const corpo = r => new URL(R.enderecoDoRegistro(r)).searchParams.get('body');
  const issues = [{ number: 1, html_url: 'u1', state: 'open', created_at: '2026-10-09T15:00:00Z', body: corpo(relato()), labels: [{ name: 'relato' }] }];
  const pedidos = [];
  const busca = async (url, op = {}) => {
    const caminho = url.replace('https://api.github.com', ''); pedidos.push([op.method || 'GET', caminho.replace(/[?&]per_page.*$/, ''), op.body ? JSON.parse(op.body) : null]);
    assert.equal(op.headers.Authorization, 'Bearer t0k');
    if (caminho.startsWith('/repos/d/r/issues?')) return { ok: true, status: 200, json: async () => (caminho.includes('page=1') ? issues : []) };
    if (caminho.startsWith('/repos/d/r/labels?')) return { ok: true, status: 200, json: async () => [{ name: 'relato' }, { name: 'tipo: Visual' }] };
    return { ok: true, status: 201, json: async () => ({}) };
  };
  const pasta = await mkdtemp(join(tmpdir(), 'relatos-'));
  try {
    const linhas = await T.atualiza(pasta, { token: 't0k', repo: 'd/r', busca });
    assert.equal(linhas.length, 1);
    const escritas = pedidos.filter(p => p[0] === 'POST');
    assert.deepEqual(escritas.map(p => [p[1], p[2].name || p[2].labels]), [
      ['/repos/d/r/labels', 'urgência: Alta'], ['/repos/d/r/labels', 'área: Listas'], ['/repos/d/r/issues/1/labels', ['tipo: Visual', 'urgência: Alta', 'área: Listas']]]);
    const j = JSON.parse(await readFile(join(pasta, 'relatos.json'), 'utf8'));
    assert.equal(j.total, 1); assert.equal(j.abertos, 1); assert.equal(j.relatos[0].numero, 1);
    assert.ok((await readFile(join(pasta, 'relatos.csv'), 'utf8')).includes('1,aberto,Visual,Alta,Listas'));
  } finally { await rm(pasta, { recursive: true, force: true }); }
});

test('T1 · relato corrigido e reenviado: a tabela fica com o registro mais novo e guarda os outros números', () => {
  const corpo = r => new URL(R.enderecoDoRegistro(r)).searchParams.get('body');
  const antes = relato({ id: 'rX' }), depois = { ...antes, tipo: 'melhoria', editadoEm: '2026-10-09T14:30:00.000Z' };
  const t = T.tabela([
    { number: 8, html_url: 'u8', state: 'open', created_at: '2026-10-09T14:10:00Z', body: corpo(antes) },
    { number: 11, html_url: 'u11', state: 'open', created_at: '2026-10-09T14:31:00Z', body: corpo(depois) },
    { number: 9, html_url: 'u9', state: 'open', created_at: '2026-10-09T14:20:00Z', body: corpo(antes) }]);
  assert.equal(t.length, 1);
  assert.deepEqual([t[0].numero, t[0].tipo, t[0].editadoEm, t[0].reenvios], [11, 'melhoria', '2026-10-09T14:30:00.000Z', [8, 9]]);
});

test('G-243 · situação para o app: id, número, endereço e situação (sem texto); id copiado por outra conta não fecha o relato de ninguém; reenvio da mesma conta continua valendo', async () => {
  const corpo = r => new URL(R.enderecoDoRegistro(r)).searchParams.get('body');
  const meu = relato({ id: 'rA' }), outro = relato({ id: 'rB', urgencia: 'baixa' });
  const issues = [
    { number: 20, html_url: 'u20', state: 'open', created_at: '2026-10-10T12:00:00Z', user: { login: 'dono' }, body: corpo(meu) },
    { number: 22, html_url: 'u22', state: 'closed', closed_at: '2026-10-10T13:00:00Z', created_at: '2026-10-10T12:50:00Z', user: { login: 'intruso' }, body: corpo(meu) },
    { number: 21, html_url: 'u21', state: 'closed', closed_at: '2026-10-10T14:00:00Z', created_at: '2026-10-10T12:10:00Z', user: { login: 'dono' }, body: corpo(outro) },
    { number: 23, html_url: 'u23', state: 'open', created_at: '2026-10-10T15:00:00Z', user: { login: 'dono' }, body: corpo(outro) }];
  const t = T.tabela(issues);
  const doId = id => t.filter(l => l.id === id);
  assert.deepEqual(doId('rA').map(l => [l.numero, l.situacao]), [[20, 'aberto']], 'o registro da outra conta não conta para rA');
  assert.ok(t.some(l => l.numero === 22 && l.id === '' && l.autor === 'intruso'), 'continua na tabela, solto');
  assert.deepEqual(doId('rB').map(l => [l.numero, l.situacao, l.reenvios]), [[23, 'aberto', [21]]], 'reenvio da mesma conta: vale o mais novo');
  const sit = T.situacoes(t, new Date('2026-10-10T16:00:00Z'));
  assert.equal(sit.versao, 1); assert.equal(sit.geradoEm, '2026-10-10T16:00:00.000Z');
  assert.deepEqual(sit.relatos.map(r => Object.keys(r).sort().join()), ['id,numero,reenvios,resolvidoEm,situacao,url', 'id,numero,reenvios,resolvidoEm,situacao,url'], 'sem texto, sem autor');
  assert.ok(!JSON.stringify(sit).includes('Mostrar mais'), 'o texto do relato não vai');
  const pasta = await mkdtemp(join(tmpdir(), 'relatos-'));
  try {
    const busca = async (url) => ({ ok: true, status: 200, json: async () => (url.includes('/issues?') && url.includes('page=1') ? issues : url.includes('/labels?') ? [{ name: 'relato' }] : []) });
    await T.atualiza(pasta, { token: 't', repo: 'd/r', busca });
    const j = JSON.parse(await readFile(join(pasta, 'situacao.json'), 'utf8'));
    assert.deepEqual(j.relatos.map(r => [r.id, r.numero, r.situacao]).sort(), [['rA', 20, 'aberto'], ['rB', 23, 'aberto']]);
  } finally { await rm(pasta, { recursive: true, force: true }); }
});
