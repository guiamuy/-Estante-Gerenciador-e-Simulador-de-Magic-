// G-313 · relato #36, fatia 3: a lista que vale no formato e não joga inteira pede a cobertura num toque, sem caixa de texto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
const { relatos: R, platform: P } = loadModules();
const J = x => JSON.parse(JSON.stringify(x));
const DADOS = { listaId: 'd7', formato: 'pauper', rotuloFormato: 'Pauper', total: 60, pct: 87, cartas: ['Nettle Sentinel', 'Abc, the <b>Bold</b>', 'Nettle Sentinel'], motor: 113 };

test('G-313 · relatoDeCobertura: relato pronto (Regra ou carta, alta), as cartas sem repetir e em ordem, sem o nome da lista; passa na conferência do formulário', () => {
  const r = R.relatoDeCobertura(DADOS);
  assert.deepEqual([r.tipo, r.urgencia, r.hash], ['regra', 'alta', '#/mesa']);
  assert.match(r.descricao, /^Pedido de cobertura do motor: uma lista de Pauper com 60 cartas joga 87% no motor v113\.\n/);
  assert.match(r.descricao, /Cartas que faltam \(2\): Abc, the <b>Bold<\/b>; Nettle Sentinel\./);
  assert.deepEqual(J(r.contexto.cobertura), { v: 1, listaId: 'd7', formato: 'pauper', cartas: ['Abc, the <b>Bold</b>', 'Nettle Sentinel'] });
  assert.deepEqual(J(R.confere(r)), {}, 'o relato montado passa nas regras do formulário');
  const novo = R.novoRelato(r, Date.parse('2026-10-27T02:00:00Z'), 'rcob1'); assert.equal(novo.ok, true); assert.equal(novo.relato.area, 'Jogar');
  const muitas = R.relatoDeCobertura({ ...DADOS, cartas: Array.from({ length: 95 }, (_, i) => `Carta ${String(i).padStart(2, '0')}`) });
  assert.match(muitas.descricao, /; e mais 15\./); assert.ok(muitas.descricao.length <= R.DESCRICAO_MAX);
  // nomes longos (até 80 caracteres cada): o texto continua cabendo no relato e o formulário aceita; o contexto leva todas
  const longas = R.relatoDeCobertura({ ...DADOS, cartas: Array.from({ length: 60 }, (_, i) => `Carta de nome bem comprido para encher a linha numero ${String(i).padStart(2, '0')} xxxxxxxxxxxxxxxx`) });
  assert.ok(longas.descricao.length <= R.DESCRICAO_MAX, String(longas.descricao.length)); assert.deepEqual(J(R.confere(longas)), {}); assert.equal(longas.contexto.cobertura.cartas.length, 60);
  assert.match(longas.descricao, /; e mais \d+\./);
});

test('G-313 · pedidosDeCobertura, pedidoDaLista e etapaDoPedido: o pedido é o relato guardado; vale enquanto cobre as cartas que faltam; etapas 0 a 3', () => {
  const base = R.novoRelato(R.relatoDeCobertura(DADOS), Date.parse('2026-10-27T02:00:00Z'), 'rcob1').relato;
  const comum = R.novoRelato({ tipo: 'erro', urgencia: 'baixa', descricao: 'outra coisa qualquer', hash: '#/' }, Date.parse('2026-10-27T03:00:00Z'), 'rx').relato;
  let ps = R.pedidosDeCobertura([comum, base]);
  assert.deepEqual(J(ps.map(p => [p.id, p.listaId, p.envio])), [['rcob1', 'd7', 'nao-enviado']]);
  assert.equal(R.pedidoDaLista(ps, 'd7', ['Nettle Sentinel']), null, 'não enviado não conta');
  ps = R.pedidosDeCobertura([{ ...base, pelaFila: true, enviadoEm: '2026-10-27T02:00:05Z' }]);
  assert.equal(R.pedidoDaLista(ps, 'd7', ['Nettle Sentinel']).id, 'rcob1');
  assert.equal(R.pedidoDaLista(ps, 'd7', ['Nettle Sentinel', 'Carta Nova']), null, 'lista ganhou carta sem regra: pede de novo');
  assert.equal(R.pedidoDaLista(ps, 'd8', ['Nettle Sentinel']), null, 'outra lista');
  assert.deepEqual([R.etapaDoPedido(null), R.etapaDoPedido(ps[0]), R.etapaDoPedido({ ...ps[0], envio: 'registrado' }), R.etapaDoPedido(ps[0], true)], [0, 1, 2, 3]);
  assert.equal(R.ETAPAS_DO_PEDIDO.length, 3);
});

test('G-313 · createCobertura: com a fila, salva e envia (lê de volta pelo relato); sem conta, guarda e devolve o GitHub preenchido; falha da fila fica no relato', async () => {
  const relatos = R.createRelatos({ store: P.memoryStore(), busca: null });
  const enviados = []; let ligada = true, falha = false;
  const fila = { disponivel: async () => ligada, envia: async r => { enviados.push(r.id); return falha ? { ok: false, motivo: 'erro' } : { ok: true, enviadoEm: '2026-10-27T02:00:09Z' }; } };
  const C = R.createCobertura({ relatos, fila });
  const a = await C.pede(DADOS); assert.equal(a.ok, true); assert.equal(enviados.length, 1);
  let ps = await C.pedidos(); assert.deepEqual(J(ps.map(p => p.envio)), ['na-fila']);
  ligada = false; const b = await C.pede({ ...DADOS, listaId: 'd9' }); assert.deepEqual([b.ok, b.motivo], [false, 'sem-conta']);
  assert.match(b.github, /^https:\/\/github\.com\/.+\/issues\/new\?/); assert.equal(enviados.length, 1, 'sem conta não vai à fila');
  ligada = true; falha = true; const c = await C.pede({ ...DADOS, listaId: 'd10' }); assert.deepEqual([c.ok, c.motivo], [false, 'erro']);
  ps = await C.pedidos(); assert.equal(ps.find(p => p.listaId === 'd10').envio, 'falhou');
  assert.equal((await relatos.todos()).length, 3, 'os três pedidos ficam em Relatos');
});
