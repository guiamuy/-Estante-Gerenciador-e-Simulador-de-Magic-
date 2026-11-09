// G-364 · relatos sem GitHub: Enviar vai sempre pela fila com a conta da Estante. Sem a sessão, tenta retomá-la em silêncio;
// se não der, o relato fica "Aguardando conexão" (ou "Sem internet") e segue sozinho quando a conta conecta ou a rede volta,
// sem duplicar. A linha de estado mostra cada passo até a produção, lida da tabela de situação (nova e velha).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadModules, HTML } from './_load.mjs';
const { relatos: R, platform: P } = loadModules();
const J = x => JSON.parse(JSON.stringify(x));
const RELATO = { id: 'rmvCONEX1', criadoEm: '2026-11-09T10:00:00.000Z', tipo: 'erro', urgencia: 'alta', descricao: 'O botão some na mesa.', area: 'Mesa', rota: '/partida', endereco: '/partida', tela: null, contexto: {}, partida: null, status: 'aberto' };
const filaFalsa = (enviados = []) => ({ enfileira: async r => { enviados.push(r.id); return { conferido: true, enviadoEm: '2026-11-09T10:05:00.000Z' }; } });

/** O trecho do módulo de relatos entre dois marcadores (o código das telas de envio). */
const trecho = (de, ate) => { const i = HTML.indexOf(de), j = HTML.indexOf(ate, i); assert.ok(i > 0 && j > i, `${de} … ${ate}`); return HTML.slice(i, j); };

test('G-364 · nenhum caminho do Enviar (tela de relatos, pedido de cobertura, Conectar e enviar) monta ou abre o endereço de novo registro do GitHub', async () => {
  const telas = [trecho('async function conectaEEnvia(conectar)', '/* ---------------- G-313 · relato #36'),
    trecho('function createCobertura({ relatos', '/** A folha "Pedir cobertura"'), trecho('function abrePedidoDeCobertura(', '\nreturn { estadoDoEnvio')];
  for (const t of telas) {
    assert.doesNotMatch(t, /enderecoDoRegistro|registroDoApp\(|window\.open\(|issues\/new|Pelo GitHub|peloGitHub|github\.com/, t.slice(0, 60));
    assert.doesNotMatch(t, /innerHTML|html:\s/, 'texto de relato nunca vira HTML');
  }
  // o pedido de cobertura sem conta fica guardado e não devolve endereço nenhum; não há mais "pelo GitHub"
  const relatos = R.createRelatos({ store: P.memoryStore(), busca: null });
  const C = R.createCobertura({ relatos, fila: R.createEnvioPelaFila({ filaDe: () => null, busca: null }) });
  assert.equal('peloGitHub' in C, false);
  const x = await C.pede({ listaId: 'd1', formato: 'pauper', rotuloFormato: 'Pauper', total: 60, pct: 93, cartas: ['Carta Nova'], motor: 112 });
  assert.deepEqual([x.ok, x.motivo, 'github' in x], [false, 'sem-conta', false]);
  assert.doesNotMatch(JSON.stringify(x), /github\.com/);
  // o endereço de novo registro saiu do app; o registro (título e corpo) é só do fluxo da fila (relatos-fila.mjs), nunca de tela
  assert.equal('enderecoDoRegistro' in R, false); assert.doesNotMatch(HTML, /issues\/new\?/);
  assert.match(readFileSync(new URL('./relatos-fila.mjs', import.meta.url), 'utf8'), /R\.registroDoApp\(/);
});

test('G-364 · sessão inativa: Enviar retoma a conta em silêncio e, se der, vai pela fila; se não der, "Aguardando conexão"; sem rede, nem tenta', async () => {
  let conectada = false, tentativas = 0, rede = true; const enviados = [];
  const E = R.createEnvioPelaFila({ filaDe: () => (conectada ? filaFalsa(enviados) : null), busca: null, haRede: () => rede,
    conecta: async () => { tentativas++; conectada = true; } });
  assert.deepEqual(J(await E.envia(RELATO)), { ok: true, enviadoEm: '2026-11-09T10:05:00.000Z' });
  assert.deepEqual([tentativas, enviados], [1, ['rmvCONEX1']], 'retomou uma vez e enviou');
  assert.deepEqual(J(await E.envia(RELATO)), { ok: true, enviadoEm: '2026-11-09T10:05:00.000Z' }); assert.equal(tentativas, 1, 'conectada: não retoma de novo');

  // a retomada não dá (sem sessão guardada, Google pede toque): fica aguardando a conexão
  const F = R.createEnvioPelaFila({ filaDe: () => null, busca: null, haRede: () => rede, conecta: async () => { tentativas++; throw new Error('recusado'); } });
  const x = await F.envia(RELATO); assert.deepEqual(J(x), { ok: false, motivo: 'sem-conta' });
  const relatos = R.createRelatos({ store: P.memoryStore(), busca: null });
  const r = (await relatos.salva({ tipo: 'erro', urgencia: 'alta', descricao: 'Ficou guardado.' })).relato;
  await R.registraEnvio(relatos, r.id, x);
  const guardado = (await relatos.todos())[0];
  assert.equal(R.etapaDoRelato(guardado), 'aguarda-conexao'); assert.equal(R.foiEnviado(guardado), false);
  assert.deepEqual(J(R.estadoDoEnvio(guardado)), { icone: 'pessoa', titulo: 'Aguardando conexão', linha: 'Conecte a conta e ele segue sozinho.', tom: 'atencao', situacao: 'aguarda-conexao' });

  // sem rede: "Sem internet", sem abrir tela de login
  rede = false; const antes = tentativas;
  assert.deepEqual(J(await F.envia(RELATO)), { ok: false, motivo: 'sem-rede' }); assert.equal(tentativas, antes, 'sem rede não tenta conectar');
  assert.equal(R.etapaDoRelato({ ...RELATO, envioFalhou: { motivo: 'sem-rede' } }), 'sem-internet');
  // o envio automático não abre tela de login (conectar: false)
  rede = true; await F.envia(RELATO, { conectar: false }); assert.equal(tentativas, antes, 'automático não chama a retomada com Google');
});

test('G-364 · ao conectar, os pendentes seguem sozinhos pela fila, um envio por relato: o que já tem enviadoEm/pelaFila/registro, o rascunho e o grande demais ficam', async () => {
  const store = P.memoryStore(), relatos = R.createRelatos({ store, busca: null });
  const salva = async (descricao, campos) => { const r = (await relatos.salva({ tipo: 'erro', urgencia: 'alta', descricao })).relato; if (campos) await relatos.muda(r.id, campos); return r.id; };
  const ids = {
    semConta: await salva('Pendente sem conta.', { envioFalhou: { em: 'x', motivo: 'sem-conta' } }),
    semRede: await salva('Pendente sem rede.', { envioFalhou: { em: 'x', motivo: 'sem-rede' } }),
    erro: await salva('Pendente com erro da fila.', { envioFalhou: { em: 'x', motivo: 'erro' } }),
    naFila: await salva('Já na fila.', { enviadoEm: 'x', pelaFila: true }),
    noGithub: await salva('Aberto no GitHub antigo.', { enviadoEm: 'x' }),
    registrado: await salva('Já registrado.', { registro: { numero: 9 }, envioFalhou: { em: 'x', motivo: 'erro' } }),
    grande: await salva('Grande demais.', { envioFalhou: { em: 'x', motivo: 'grande' } }),
    rascunho: await salva('Rascunho que ninguém mandou enviar.')
  };
  assert.deepEqual(J(R.pendentesDeEnvio(await relatos.todos()).map(r => r.id).sort()), [ids.semConta, ids.semRede, ids.erro].sort());

  let conectada = false; const enviados = [];
  const fila = R.createEnvioPelaFila({ filaDe: () => (conectada ? filaFalsa(enviados) : null), busca: null, haRede: () => true, conecta: async () => { throw new Error('não deve ser chamada'); } });
  const A = R.createEnvioAutomatico({ relatos, fila });
  // desconectada: para no primeiro, nada vai, e o motivo continua
  assert.equal(await A.envia(), 0); assert.deepEqual(enviados, []);
  // conectou: duas chamadas juntas (abertura + login) viram uma; cada pendente vai uma vez
  conectada = true;
  const [a, b] = await Promise.all([A.envia(), A.envia()]);
  assert.deepEqual([a, b], [3, 3]); assert.deepEqual([...enviados].sort(), [ids.semConta, ids.semRede, ids.erro].sort());
  const depois = await relatos.todos(), um = id => depois.find(r => r.id === id);
  for (const k of ['semConta', 'semRede', 'erro']) assert.deepEqual(J([R.situacaoDoEnvio(um(ids[k])), um(ids[k]).envioFalhou]), ['na-fila', null], k);
  assert.equal(R.situacaoDoEnvio(um(ids.rascunho)), 'nao-enviado'); assert.equal(R.situacaoDoEnvio(um(ids.grande)), 'falhou');
  // de novo (o app volta ao primeiro plano, a rede volta): nada se reenvia
  assert.equal(await A.envia(), 0); assert.equal(enviados.length, 3);
});

test('G-364 · a linha de estado de cada situação: no aparelho, na fila, registrado, em atuação, aguarda você (com o motivo), entregue em produção (com a data) e descartado (juntado a)', () => {
  const reg = (etapa, extra = {}, raiz = {}) => R.estadoDoEnvio({ ...RELATO, registro: { numero: 77, etapa, ...extra }, ...raiz });
  const curto = e => e && [e.situacao, e.icone, e.titulo, e.linha, e.tom];
  assert.deepEqual(curto(R.estadoDoEnvio({ ...RELATO, envioFalhou: { motivo: 'sem-conta' } })), ['aguarda-conexao', 'pessoa', 'Aguardando conexão', 'Conecte a conta e ele segue sozinho.', 'atencao']);
  assert.deepEqual(curto(R.estadoDoEnvio({ ...RELATO, envioFalhou: { motivo: 'sem-rede' } })), ['sem-internet', 'semRede', 'Sem internet', 'Segue sozinho quando a rede voltar.', 'atencao']);
  assert.deepEqual(curto(R.estadoDoEnvio({ ...RELATO, enviadoEm: 'x', pelaFila: true })), ['na-fila', 'subir', 'Na fila', 'O registro sai em até 1 hora.', 'andamento']);
  assert.deepEqual(curto(reg('registrado')), ['registrado', 'registro', 'Registrado #77', 'Esperando a vez de ser atendido.', 'andamento']);
  assert.deepEqual(curto(reg('em-atuacao')), ['em-atuacao', 'editar', 'Em atuação #77', 'A correção está sendo feita.', 'andamento']);
  assert.deepEqual(curto(reg('aguarda-dono')), ['aguarda-dono', 'conversa', 'Aguarda você #77', 'Há uma pergunta para você.', 'atencao']);
  assert.deepEqual(curto(reg('aguarda-dono', { motivo: 'O texto da carta vem impresso ou traduzido?' })).slice(2, 4), ['Aguarda você #77', 'O texto da carta vem impresso ou traduzido?']);
  const entregue = reg('resolvido', {}, { status: 'resolvido', resolvidoPeloRegistro: '2026-11-09T15:20:00Z', resolvidoEm: '2026-11-09T15:20:00Z' });
  assert.deepEqual(curto(entregue).slice(0, 3).concat(curto(entregue)[4]), ['resolvido', 'marcar', 'Entregue em produção', 'feito']);
  assert.match(entregue.linha, /^Em 09\/11\/2026 \d\d:20\.$/);
  assert.deepEqual(curto(reg('descartado', { juntadoA: 53 })).slice(2, 4), ['Descartado #77', 'Juntado a #53.']);
  assert.deepEqual(curto(reg('descartado')).slice(2, 4), ['Descartado #77', 'Não vai ser feito.']);
  // sem etapa (veio da tabela velha): aberto = registrado; fechado pelo registro = entregue
  assert.equal(R.estadoDoEnvio({ ...RELATO, registro: { numero: 5 } }).situacao, 'registrado');
  assert.equal(R.estadoDoEnvio({ ...RELATO, registro: { numero: 5 }, status: 'resolvido', resolvidoPeloRegistro: '2026-11-09T15:20:00Z' }).situacao, 'resolvido');
  // texto curto, sem jargão de implementação nem GitHub
  for (const k of Object.keys(R.ESTADO_DO_ENVIO)) {
    const e = R.ESTADO_DO_ENVIO[k];
    assert.ok(e.titulo.split(' ').length <= 4, k); assert.doesNotMatch(`${e.titulo} ${e.linha || ''}`, /GitHub|Firebase|workflow|issue|token|uid/i, k);
  }
});

test('G-364 · a tabela de situação: a velha (só aberto/resolvido) ainda vale; a nova traz a etapa, o motivo limpo e o "juntado a"; etapa que contradiz a situação ou estranha cai na da situação', () => {
  const velha = R.situacaoDosRegistros({ versao: 1, relatos: [{ id: 'rVELHA1', numero: 3, situacao: 'aberto', resolvidoEm: null }, { id: 'rVELHA2', numero: 4, situacao: 'resolvido', resolvidoEm: '2026-11-01T10:00:00Z' }] });
  assert.deepEqual(J([...velha]), [['rVELHA1', { numero: 3, situacao: 'aberto', resolvidoEm: null, etapa: 'registrado' }], ['rVELHA2', { numero: 4, situacao: 'resolvido', resolvidoEm: '2026-11-01T10:00:00Z', etapa: 'resolvido' }]]);
  const nova = R.situacaoDosRegistros({ versao: 1, relatos: [
    { id: 'rNOVA1', numero: 10, situacao: 'aberto', etapa: 'em-atuacao' },
    { id: 'rNOVA2', numero: 11, situacao: 'aberto', etapa: 'aguarda-dono', motivo: '  Oficial\nou\u0007 traduzido?  ' + 'x'.repeat(300) },
    { id: 'rNOVA3', numero: 12, situacao: 'resolvido', resolvidoEm: '2026-11-09T12:00:00Z', etapa: 'descartado', juntadoA: 53 },
    { id: 'rNOVA4', numero: 13, situacao: 'aberto', etapa: 'resolvido' },
    { id: 'rNOVA5', numero: 14, situacao: 'resolvido', resolvidoEm: '2026-11-09T12:00:00Z', etapa: 'em-atuacao' },
    { id: 'rNOVA6', numero: 15, situacao: 'aberto', etapa: '<img src=x onerror=1>', motivo: 'só vale em aguarda' },
    { id: 'rNOVA7', numero: 16, situacao: 'resolvido', resolvidoEm: '2026-11-09T12:00:00Z', etapa: 'descartado', juntadoA: 'cinquenta' }] });
  assert.equal(nova.get('rNOVA1').etapa, 'em-atuacao');
  const m = nova.get('rNOVA2').motivo; assert.ok(m.startsWith('Oficial ou traduzido? xx')); assert.ok(m.length <= 160 && m.endsWith('…')); assert.doesNotMatch(m, /[\u0000-\u001f]/);
  assert.deepEqual([nova.get('rNOVA3').etapa, nova.get('rNOVA3').juntadoA], ['descartado', 53]);
  assert.equal(nova.get('rNOVA4').etapa, 'registrado', 'aberto não é entregue'); assert.equal(nova.get('rNOVA5').etapa, 'resolvido', 'fechado não está em atuação');
  assert.deepEqual(J(nova.get('rNOVA6')), { numero: 15, situacao: 'aberto', resolvidoEm: null, etapa: 'registrado' });
  assert.equal('juntadoA' in nova.get('rNOVA7'), false);
  // concilia guarda a etapa no registro e muda quando a etapa muda (a tela repinta sozinha)
  const r0 = { ...RELATO, enviadoEm: 'x', pelaFila: true };
  const r1 = R.concilia(r0, nova.get('rNOVA1')); assert.deepEqual(J(r1.registro), { numero: 10, etapa: 'em-atuacao' });
  assert.equal(R.concilia(r1, nova.get('rNOVA1')), r1, 'nada muda: o mesmo objeto');
  const r2 = R.concilia(r1, { ...nova.get('rNOVA2'), numero: 10 }); assert.equal(r2.registro.etapa, 'aguarda-dono'); assert.ok(r2.registro.motivo);
  const r3 = R.concilia(r2, { numero: 10, situacao: 'resolvido', resolvidoEm: '2026-11-09T15:20:00Z', etapa: 'resolvido' });
  assert.deepEqual([r3.status, R.estadoDoEnvio(r3).titulo], ['resolvido', 'Entregue em produção']);
});
