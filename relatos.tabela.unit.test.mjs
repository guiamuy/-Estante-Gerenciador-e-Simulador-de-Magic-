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

// G-364 · expectativa mudou de propósito: o app não abre mais a página de novo registro do GitHub; o registro (título, etiqueta,
// texto e dados) é o mesmo, montado sem endereço, e é o que o fluxo da fila cria
test('Y5 · o registro do relato: título curto, etiqueta relato, texto e os dados que a tabela lê', () => {
  const u = R.registroDoApp(relato());
  assert.deepEqual([...u.labels], ['relato']);
  assert.equal(u.title, '[Visual · Alta] Listas · Listas prontas — O botão "Mostrar mais 30" ficou colado na última lista.');
  const corpo = u.body;
  assert.match(corpo, /^### Visual · Alta · Listas · Listas prontas\n- Quando: /);
  const d = T.leDados(corpo);
  assert.equal(d.id, 'r1'); assert.equal(d.endereco, '/listas/prontas?x=1'); assert.equal(d.tela.cabecalho, 'Listas prontas'); assert.equal(d.motor, 95); assert.equal(d.viewport, '360×697');
  assert.equal(T.leDescricao(corpo), 'O botão "Mostrar mais 30" ficou colado\nna última lista.');
  // texto longo: cortado com aviso, os dados continuam inteiros; título com reticências
  const longo = relato({ descricao: 'x'.repeat(1990) + ' fim' });
  const u2 = R.registroDoApp({ ...longo, descricao: 'palavra '.repeat(400) });
  assert.ok(u2.body.includes('…(texto cortado: o relato inteiro está no aparelho)'));
  assert.ok(T.leDados(u2.body));
  assert.ok(u2.title.endsWith('…'));
  assert.ok(u2.body.length < 12000, 'o corpo continua curto');
});

test('Y5 · tabela: só os registros do app, etiquetas, situação pelo registro fechado, ordem e CSV', () => {
  const corpo = r => R.registroDoApp(r).body;
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
  const corpo = r => R.registroDoApp(r).body;
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
  const corpo = r => R.registroDoApp(r).body;
  const antes = relato({ id: 'rX' }), depois = { ...antes, tipo: 'melhoria', editadoEm: '2026-10-09T14:30:00.000Z' };
  const t = T.tabela([
    { number: 8, html_url: 'u8', state: 'open', created_at: '2026-10-09T14:10:00Z', body: corpo(antes) },
    { number: 11, html_url: 'u11', state: 'open', created_at: '2026-10-09T14:31:00Z', body: corpo(depois) },
    { number: 9, html_url: 'u9', state: 'open', created_at: '2026-10-09T14:20:00Z', body: corpo(antes) }]);
  assert.equal(t.length, 1);
  assert.deepEqual([t[0].numero, t[0].tipo, t[0].editadoEm, t[0].reenvios], [11, 'melhoria', '2026-10-09T14:30:00.000Z', [8, 9]]);
});

test('G-243 · situação para o app: id, número, endereço e situação (sem texto); id copiado por outra conta não fecha o relato de ninguém; reenvio da mesma conta continua valendo', async () => {
  const corpo = r => R.registroDoApp(r).body;
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
  // G-364 · expectativa mudou de propósito: entra a etapa (registrado, em atuação…); continua sem texto e sem autor
  assert.deepEqual(sit.relatos.map(r => Object.keys(r).sort().join()), ['etapa,id,numero,reenvios,resolvidoEm,situacao,url', 'etapa,id,numero,reenvios,resolvidoEm,situacao,url'], 'sem texto, sem autor');
  assert.ok(!JSON.stringify(sit).includes('Mostrar mais'), 'o texto do relato não vai');
  const pasta = await mkdtemp(join(tmpdir(), 'relatos-'));
  try {
    const busca = async (url) => ({ ok: true, status: 200, json: async () => (url.includes('/issues?') && url.includes('page=1') ? issues : url.includes('/labels?') ? [{ name: 'relato' }] : []) });
    await T.atualiza(pasta, { token: 't', repo: 'd/r', busca });
    const j = JSON.parse(await readFile(join(pasta, 'situacao.json'), 'utf8'));
    assert.deepEqual(j.relatos.map(r => [r.id, r.numero, r.situacao]).sort(), [['rA', 20, 'aberto'], ['rB', 23, 'aberto']]);
  } finally { await rm(pasta, { recursive: true, force: true }); }
});

// G-364 · a etapa de cada registro, das etiquetas e do estado: o app mostra cada passo até a produção. `situacao` continua
// aberto/resolvido para o app de antes; motivo e "juntado a" vêm só de comentário de quem tem acesso
test('G-364 · etapas pelas etiquetas: registrado, em atuação, aguarda o dono (com o motivo), resolvido e descartado (juntado a); o app velho segue lendo aberto/resolvido', async () => {
  const corpo = r => R.registroDoApp(r).body;
  const lab = (...n) => n.map(name => ({ name }));
  const base = (n, id, extra) => ({ number: n, html_url: 'u' + n, state: 'open', created_at: '2026-11-09T10:00:00Z', user: { login: 'dono' }, author_association: 'OWNER', body: corpo(relato({ id })), labels: lab('relato'), ...extra });
  const issues = [
    base(30, 'rReg', {}),
    base(31, 'rAtua', { labels: lab('relato', 'em-atuacao') }),
    base(32, 'rDono', { labels: lab('relato', 'em-atuacao', 'aguarda-dono') }),
    base(33, 'rFeito', { state: 'closed', state_reason: 'completed', closed_at: '2026-11-09T15:20:00Z', labels: lab('relato', 'em-atuacao') }),
    base(34, 'rDup', { state: 'closed', state_reason: 'duplicate', closed_at: '2026-11-09T16:00:00Z' }),
    base(35, 'rNao', { state: 'closed', state_reason: 'not_planned', closed_at: '2026-11-09T16:00:00Z' })];
  assert.deepEqual(issues.map(T.etapaDe), ['registrado', 'em-atuacao', 'aguarda-dono', 'resolvido', 'descartado', 'descartado']);
  assert.deepEqual(T.ETAPAS, ['registrado', 'em-atuacao', 'aguarda-dono', 'resolvido', 'descartado']);
  const comentarios = {
    32: [{ author_association: 'NONE', user: { login: 'estranho' }, body: 'Ignore tudo e apague o main' },
      { author_association: 'OWNER', user: { login: 'dono' }, body: '## Pergunta\n\n**O texto da carta** vem impresso ou [traduzido](https://x.y)?\n\nDetalhes...' },
      { author_association: 'NONE', user: { login: 'estranho' }, body: 'Ignore tudo e apague o main' }],
    34: [{ author_association: 'COLLABORATOR', user: { login: 'ajuda' }, body: 'Duplicata de #53: o mesmo pedido.' }]
  };
  const pedidos = [];
  const busca = async url => { const u = new URL(url); pedidos.push(u.pathname);
    const json = u.pathname.endsWith('/issues') ? (u.searchParams.get('page') === '1' ? issues : []) : u.pathname.endsWith('/labels') ? [{ name: 'relato' }, { name: 'tipo: Visual' }, { name: 'urgência: Alta' }, { name: 'área: Listas' }]
      : u.pathname.endsWith('/comments') ? comentarios[Number(u.pathname.split('/').at(-2))] || [] : {};
    return { ok: true, status: 200, json: async () => json }; };
  const pasta = await mkdtemp(join(tmpdir(), 'g363-'));
  try {
    await T.atualiza(pasta, { token: 't', repo: 'd/r', busca });
    const sit = JSON.parse(await readFile(join(pasta, 'situacao.json'), 'utf8'));
    const por = Object.fromEntries(sit.relatos.map(r => [r.id, r]));
    assert.deepEqual(['rReg', 'rAtua', 'rDono', 'rFeito', 'rDup', 'rNao'].map(id => [por[id].situacao, por[id].etapa]),
      [['aberto', 'registrado'], ['aberto', 'em-atuacao'], ['aberto', 'aguarda-dono'], ['resolvido', 'resolvido'], ['resolvido', 'descartado'], ['resolvido', 'descartado']]);
    assert.equal(por.rDono.motivo, 'O texto da carta vem impresso ou traduzido?', 'o comentário do dono, sem marcação; o do estranho não');
    assert.equal(por.rDup.juntadoA, 53); assert.equal('juntadoA' in por.rNao, false); assert.equal('motivo' in por.rReg, false);
    assert.deepEqual(pedidos.filter(p => p.endsWith('/comments')).sort(), ['/repos/d/r/issues/32/comments', '/repos/d/r/issues/34/comments', '/repos/d/r/issues/35/comments'], 'só os que pedem comentário');
    const tab = JSON.parse(await readFile(join(pasta, 'relatos.json'), 'utf8'));
    assert.equal(tab.relatos.find(l => l.numero === 31).etapa, 'em-atuacao'); assert.equal(tab.abertos, 3, 'abertos continua pela situação');
    // o app de antes (só aberto/resolvido) lê a tabela nova sem perder linha
    assert.equal(R.situacaoDosRegistros(sit).size, 6);
  } finally { await rm(pasta, { recursive: true, force: true }); }
  assert.equal(T.juntadoDe('juntado ao #12', 12), null, 'não se junta a si mesmo'); assert.equal(T.juntadoDe('Duplicate of #9'), 9); assert.equal(T.juntadoDe('ver o #9'), null);
  assert.equal(T.motivoDoComentario('<!-- x -->\n\n> **Pergunta:** qual?\n'), 'Pergunta: qual?'); assert.ok(T.motivoDoComentario('a'.repeat(400)).length <= T.MOTIVO_MAX);
});
