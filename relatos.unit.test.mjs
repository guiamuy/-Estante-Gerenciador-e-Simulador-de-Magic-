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
  assert.deepEqual(J(R.TIPOS.map(t => t[1])), ['Erro', 'Regra ou carta', 'Visual', 'Melhoria', 'Ideia', 'Lentidão', 'Infraestrutura', 'Outro']); // Y5 · tipos novos
  assert.deepEqual(J(R.URGENCIAS.map(t => t[1])), ['Impede o uso', 'Alta', 'Média', 'Baixa']);
});

test('Y1 · novoRelato: carimbo de data e hora do app em ISO, área pela rota, contexto e partida junto, aberto', () => {
  const agora = Date.UTC(2026, 9, 8, 23, 14, 5);
  const r = R.novoRelato({ tipo: 'regra', urgencia: 'media', descricao: '  Lurrus não deixou conjurar.  ', hash: '#/lista?id=abc', contexto: { motor: 92, tema: 'escuro' }, partida: { turno: 3 } }, agora, 'r1');
  assert.equal(r.ok, true);
  assert.deepEqual(J(r.relato), { id: 'r1', criadoEm: '2026-10-08T23:14:05.000Z', tipo: 'regra', urgencia: 'media', descricao: 'Lurrus não deixou conjurar.', area: 'Lista', rota: '/lista',
    endereco: '/lista?id=abc', tela: null, // Y4 · o endereço inteiro (com a lista aberta) vai junto
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
  assert.match(t, /^### Erro · Impede o uso · Mesa\n- Quando: .+ \(2026-10-08T12:00:00\.000Z\)\n- Tela: Mesa \(\/partida\)\n- Contexto: motor v92 · tema claro · 360×780 · sem internet\n\nTela travou\nao manter\.$/);
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

test('G-222 · copiar com a área de transferência negada devolve false (a tela avisa) em vez de recusar a promessa', async () => {
  const nega = P.createPlatform({ window: {}, indexedDB: null, document: null, navigator: { clipboard: { writeText: async () => { throw new Error('NotAllowedError'); } } } });
  assert.equal(await nega.share.copy('x'), false);
  const ok = P.createPlatform({ window: {}, indexedDB: null, document: null, navigator: { clipboard: { writeText: async () => {} } } });
  assert.equal(await ok.share.copy('x'), true);
  const sem = P.createPlatform({ window: {}, indexedDB: null, document: null, navigator: {} });
  assert.equal(await sem.share.copy('x'), false);
});

test('Y2 · contextoDaPartida: modo, turno, etapa traduzida, de quem é a vez e a prioridade, vida, decisão e as oito últimas linhas', () => {
  const s = { status: 'playing', turn: { number: 4, step: 'main1', active: 0, priority: 1 }, players: [{ life: 17 }, { life: 12 }], pending: { kind: 'blockers' } };
  const entradas = Array.from({ length: 10 }, (_, i) => ({ texto: 'linha ' + (i + 1) }));
  const c = R.contextoDaPartida({ s, v: 0, entradas, options: { bot: 'shark' }, etapas: { main1: 'Principal 1' } });
  assert.deepEqual(J(c), { modo: 'contra o Shark', turno: 4, etapa: 'Principal 1', vez: 'sua', prioridade: 'do oponente', vida: '17 × 12', decisao: 'blockers',
    registro: ['linha 3', 'linha 4', 'linha 5', 'linha 6', 'linha 7', 'linha 8', 'linha 9', 'linha 10'] });
  assert.equal(R.contextoDaPartida({ s: { ...s, status: 'mulligan' }, setup: { players: [{}, { dummy: true }] } }).etapa, 'mão inicial');
  assert.equal(R.contextoDaPartida({ s, setup: { players: [{}, { dummy: true }] } }).modo, 'goldfish');
  assert.equal(R.contextoDaPartida({ s, options: { online: true, bot: 'x' } }).modo, 'online');
  assert.equal(R.contextoDaPartida({ s }).modo, 'a dois');
  assert.deepEqual(J(R.contextoDaPartida({})), {});
});

test('Y2 · o texto do relato da mesa diz a partida e as últimas jogadas, e se ela foi anexada', () => {
  const partida = { kind: 'estante.match', setup: { seed: 9 }, log: [] };
  const r = R.novoRelato({ tipo: 'regra', urgencia: 'alta', descricao: 'O bloqueio não valeu.', hash: '#/partida', partida,
    contexto: { motor: 94, partida: { modo: 'contra o Shark', turno: 3, etapa: 'Combate', vez: 'do oponente', prioridade: 'sua', vida: '20 × 18', decisao: 'blockers', registro: ['Shark ataca com Grizzly Bears'] } } }, Date.UTC(2026, 9, 9), 'r3').relato;
  assert.equal(r.area, 'Mesa'); assert.equal(r.partida, partida);
  const t = R.textoDoRelato(r);
  assert.match(t, /- Partida: contra o Shark · turno 3 · Combate · vez do oponente · prioridade sua · vida 20 × 18 · decisão blockers · partida anexada\n- Últimas jogadas:\n  - Shark ataca com Grizzly Bears\n/);
});

const AMOSTRA = () => {
  const mk = (id, tipo, urgencia, area, status, descricao, extra = {}) => ({ id, tipo, urgencia, area, rota: '/x', status, descricao, criadoEm: `2026-10-0${id.length}T10:00:00.000Z`, contexto: {}, ...extra });
  return [mk('a', 'erro', 'alta', 'Mesa', 'aberto', 'Um, com "aspas"\ne quebra', { contexto: { motor: 95, tema: 'escuro', tela: '360×780', online: false, partida: { modo: 'contra o Shark', turno: 3, etapa: 'Combate' } }, partida: { kind: 'estante.match', engine: 95 } }),
    mk('bb', 'ideia', 'baixa', 'Listas', 'aberto', 'Dois'), mk('ccc', 'erro', 'media', 'Listas', 'resolvido', 'Três')];
};

test('Y3 · filtra: situação, tipo, urgência e área, juntos; contaFiltros e áreas do que existe', () => {
  const l = AMOSTRA();
  const ids = f => J(R.filtra(l, { ...R.FILTRO_VAZIO, ...f }).map(r => r.id));
  assert.deepEqual(ids({}), ['a', 'bb', 'ccc']);
  assert.deepEqual(ids({ situacao: 'aberto' }), ['a', 'bb']);
  assert.deepEqual(ids({ situacao: 'resolvido' }), ['ccc']);
  assert.deepEqual(ids({ tipo: 'erro' }), ['a', 'ccc']);
  assert.deepEqual(ids({ tipo: 'erro', area: 'Listas' }), ['ccc']);
  assert.deepEqual(ids({ urgencia: 'baixa', situacao: 'resolvido' }), []);
  assert.equal(R.contaFiltros(R.FILTRO_VAZIO), 0); assert.equal(R.contaFiltros({ situacao: 'aberto', tipo: 'erro', urgencia: '', area: 'Mesa' }), 3);
  assert.deepEqual(J(R.areasDe(l)), ['Listas', 'Mesa']);
});

test('Y3 · exportar: CSV com cabeçalho, aspas e BOM; JSON com a partida; texto pela ordem de sempre', () => {
  const l = AMOSTRA();
  const csv = R.csvDosRelatos(l);
  assert.ok(csv.startsWith('﻿criado_em,tipo,urgencia,area,titulo_da_tela,endereco,dialogo,situacao,descricao,motor,tema,tela,online,partida_modo,partida_turno,partida_etapa,partida_anexada\r\n'));
  assert.ok(csv.includes('Erro,Alta,Mesa,,/x,,aberto,"Um, com ""aspas""\ne quebra",95,escuro,360×780,não,contra o Shark,3,Combate,sim\r\n'), csv);
  assert.equal(csv.trim().split('\r\n').length, 4);
  const j = JSON.parse(R.jsonDosRelatos(l, Date.UTC(2026, 9, 9)));
  assert.equal(j.kind, 'estante.relatos'); assert.equal(j.exportadoEm, '2026-10-09T00:00:00.000Z'); assert.equal(j.relatos.length, 3); assert.equal(j.relatos[0].partida.engine, 95);
});

test('Y3 · partida anexada só abre no mesmo motor; o motivo vem antes do toque', () => {
  const [a, b] = AMOSTRA();
  assert.deepEqual(J(R.partidaAbrivel(a, 95)), { ok: true, motivo: '' });
  assert.deepEqual(J(R.partidaAbrivel(a, 96)), { ok: false, motivo: 'Gravada no motor v95; o motor agora é v96.' });
  assert.deepEqual(J(R.partidaAbrivel(b, 95)), { ok: false, motivo: '' });
});

test('Y4 · a tela do relato: endereço inteiro, título da tela, diálogo aberto e rolagem; nome para ler e texto para colar', () => {
  const r = R.novoRelato({ tipo: 'visual', urgencia: 'baixa', descricao: 'O nome quebrou em três linhas.', hash: '#/lista?id=xyz',
    tela: { titulo: 'Lista', cabecalho: '  Pauper   Mono Blue Faeries ', dialogo: 'Impressões · Delver of Secrets', rolagem: 37.4 }, contexto: { app: '2026-10-09 14:02 UTC', motor: 95 } }, Date.UTC(2026, 9, 9), 'r9').relato;
  assert.equal(r.endereco, '/lista?id=xyz'); assert.equal(r.rota, '/lista');
  assert.deepEqual(J(r.tela), { titulo: 'Lista', cabecalho: 'Pauper Mono Blue Faeries', dialogo: 'Impressões · Delver of Secrets', rolagem: 37 });
  assert.equal(R.nomeDaTela(r), 'Lista · Pauper Mono Blue Faeries');
  assert.equal(R.nomeDaTela({ area: 'Início', tela: { cabecalho: 'Início' } }), 'Início', 'título igual à área não repete');
  const t = R.textoDoRelato(r);
  assert.match(t, /^### Visual · Baixa · Lista · Pauper Mono Blue Faeries\n/);
  assert.match(t, /\n- Tela: Lista · Pauper Mono Blue Faeries \(\/lista\?id=xyz\)\n- Na tela: diálogo "Impressões · Delver of Secrets" aberto · rolada 37%\n- Contexto: app de 2026-10-09 14:02 UTC · motor v95\n/);
  assert.equal(R.limpaTela(null), null); assert.equal(R.limpaTela({}), null);
  assert.equal(R.limpaTela({ cabecalho: 'x'.repeat(300) }).cabecalho.length, 120);
});

test('T1 · editar até uma hora: tipo, urgência e texto mudam; data, tela, contexto e partida ficam; depois da hora, não', async () => {
  let agora = Date.UTC(2026, 9, 9, 20, 0);
  const store = P.memoryStore(), S = R.createRelatos({ store, agora: () => agora });
  const { relato: r } = await S.salva({ tipo: 'ideia', urgencia: 'baixa', descricao: 'Editar o relato depois', hash: '#/perfil/relatos', tela: { cabecalho: 'Relatos' }, contexto: { motor: 95 } });
  assert.equal(R.podeEditar(r, agora + 59 * 60000), true);
  assert.equal(R.podeEditar(r, agora + 60 * 60000), false, 'a hora fecha');
  assert.equal(R.editavelAte(r), '2026-10-09T21:00:00.000Z');
  agora += 30 * 60000;
  const ruim = await S.edita(r.id, { tipo: 'melhoria', urgencia: '', descricao: 'x' });
  assert.equal(ruim.ok, false); assert.ok(ruim.erros.urgencia && ruim.erros.descricao, 'o formulário confere igual');
  const ok = await S.edita(r.id, { tipo: 'melhoria', urgencia: 'alta', descricao: '  Editar tipo, urgência e texto  ' });
  assert.equal(ok.ok, true);
  const [g] = await S.todos();
  assert.deepEqual(J({ tipo: g.tipo, urgencia: g.urgencia, descricao: g.descricao, editadoEm: g.editadoEm, criadoEm: g.criadoEm, endereco: g.endereco, tela: g.tela, motor: g.contexto.motor, id: g.id }),
    { tipo: 'melhoria', urgencia: 'alta', descricao: 'Editar tipo, urgência e texto', editadoEm: '2026-10-09T20:30:00.000Z', criadoEm: '2026-10-09T20:00:00.000Z', endereco: '/perfil/relatos', tela: { titulo: '', cabecalho: 'Relatos', dialogo: '', rolagem: null }, motor: 95, id: r.id });
  assert.match(R.textoDoRelato(g), /- Quando: .+ · editado /);
  assert.equal(R.dadosDoRelato(g).editadoEm, '2026-10-09T20:30:00.000Z');
  agora += 31 * 60000;
  const tarde = await S.edita(r.id, { tipo: 'erro', urgencia: 'alta', descricao: 'Tarde demais para mudar' });
  assert.equal(tarde.ok, false); assert.equal(tarde.prazo, true);
  assert.equal((await S.todos())[0].tipo, 'melhoria', 'fora da hora nada muda');
});

test('G-243 · relato #11: a situação dos registros volta do GitHub — resolvido sozinho uma vez por fechamento, reabrir no app é respeitado, reaberto no GitHub volta a aberto; arquivo inválido e endereço de fora ignorados; sem rede nada muda', async () => {
  // validação: só linhas bem formadas; o endereço é montado pelo app
  const m = R.situacaoDosRegistros({ versao: 1, relatos: [
    { id: 'rmv2d168pihzr', numero: 11, situacao: 'resolvido', resolvidoEm: '2026-10-10T14:00:00Z', url: 'https://evil.example/x' },
    { id: '<img src=x>', numero: 3, situacao: 'aberto' }, { id: 'ok1234', numero: 0, situacao: 'aberto' }, { id: 'ok5678', numero: 4, situacao: 'talvez' }, null] });
  assert.deepEqual(J([...m]), [['rmv2d168pihzr', { numero: 11, situacao: 'resolvido', resolvidoEm: '2026-10-10T14:00:00Z' }]]);
  assert.equal(R.urlDoRegistro(11), `https://github.com/${R.REPOSITORIO}/issues/11`);
  assert.equal(R.situacaoDosRegistros({ versao: 2, relatos: [] }).size, 0); assert.equal(R.situacaoDosRegistros('lixo').size, 0);

  let agora = Date.UTC(2026, 9, 10, 12); let resposta = null, pedidos = 0;
  const busca = async url => { pedidos++; assert.equal(url, R.URL_SITUACAO); if (resposta === 'rede') throw new TypeError('Failed to fetch'); if (resposta === 404) return { ok: false, status: 404 }; return { ok: true, status: 200, json: async () => resposta }; };
  const store = P.memoryStore(), S = R.createRelatos({ store, agora: () => agora, busca });
  const a = (await S.salva({ tipo: 'melhoria', urgencia: 'alta', descricao: 'Resolver sozinho.' })).relato;
  const b = (await S.salva({ tipo: 'erro', urgencia: 'alta', descricao: 'Outro relato.' })).relato;
  const arquivo = (sa, em = null, sb = 'aberto') => ({ versao: 1, geradoEm: 'x', relatos: [{ id: a.id, numero: 11, situacao: sa, resolvidoEm: em, url: 'u', reenvios: [] }, { id: b.id, numero: 12, situacao: sb, resolvidoEm: null, url: 'u', reenvios: [] }] });
  const um = async id => (await S.todos()).find(r => r.id === id);

  // sem rede e sem arquivo: nada muda
  resposta = 'rede'; assert.equal((await S.sincroniza()).estado, 'sem-rede'); assert.equal((await um(a.id)).status, 'aberto');
  resposta = 404; assert.equal((await S.sincroniza({ forcar: true })).estado, 'ausente');
  // registrado e aberto: ganha o número
  resposta = arquivo('aberto'); let r = await S.sincroniza({ forcar: true });
  assert.deepEqual([r.estado, r.mudados, r.resolvidos], ['ok', 2, 0]); assert.deepEqual(J((await um(a.id)).registro), { numero: 11 }); assert.equal((await um(a.id)).status, 'aberto');
  // a busca respeita o intervalo de 10 minutos
  const antes = pedidos; assert.equal((await S.sincroniza()).estado, 'recente'); assert.equal(pedidos, antes);
  // fechado no GitHub: resolvido, com a data; de novo não muda nada
  resposta = arquivo('resolvido', '2026-10-10T14:00:00Z'); agora += R.BUSCA_SITUACAO_MS;
  r = await S.sincroniza(); assert.deepEqual([r.mudados, r.resolvidos], [1, 1]);
  assert.deepEqual([(await um(a.id)).status, (await um(a.id)).resolvidoEm], ['resolvido', '2026-10-10T14:00:00Z']); assert.equal((await um(b.id)).status, 'aberto');
  assert.equal((await S.sincroniza({ forcar: true })).mudados, 0, 'idempotente');
  // quem reabre no app é respeitado enquanto o fechamento for o mesmo
  await S.muda(a.id, { status: 'aberto' }); assert.equal((await S.sincroniza({ forcar: true })).mudados, 0); assert.equal((await um(a.id)).status, 'aberto');
  // reaberto no GitHub e fechado de novo: resolve outra vez
  resposta = arquivo('aberto'); await S.sincroniza({ forcar: true }); resposta = arquivo('resolvido', '2026-10-11T09:00:00Z'); await S.sincroniza({ forcar: true });
  assert.equal((await um(a.id)).status, 'resolvido');
  // reaberto no GitHub depois de o registro ter resolvido: volta a aberto; resolvido à mão continua resolvido
  await S.muda(b.id, { status: 'resolvido' }); resposta = arquivo('aberto'); await S.sincroniza({ forcar: true });
  assert.deepEqual([(await um(a.id)).status, (await um(a.id)).resolvidoEm], ['aberto', undefined]); assert.equal((await um(b.id)).status, 'resolvido');
  // o que a conciliação guarda vai no backup com o relato (a chave é a mesma)
  assert.ok((await store.get(R.CHAVE)).every(x => x.registro && x.registro.numero));
});
