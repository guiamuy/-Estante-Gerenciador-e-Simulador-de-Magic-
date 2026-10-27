// G-314 · relato #36, fatia 4: central de notificações; a primeira é a de cobertura atendida.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
const { notificacoes: N, relatos: R, platform: P } = loadModules();
const J = x => JSON.parse(JSON.stringify(x));

test('G-314 · modelo: só a forma certa entra; não lidas; filtros; dia (Hoje, Ontem, data); a notificação de cobertura aponta para a lista', () => {
  const ok = { id: 'a', tipo: 'cobertura', titulo: 'Delver já joga', texto: 'x', criadaEm: '2026-10-27T02:00:00Z', lidaEm: null, rota: '/mesa' };
  assert.equal(N.valida(ok), true);
  for (const ruim of [{ ...ok, tipo: 'spam' }, { ...ok, titulo: ' ' }, { ...ok, criadaEm: 'ontem' }, { ...ok, rota: 'https://fora' }, null]) assert.equal(N.valida(ruim), false);
  const l = [ok, { ...ok, id: 'b', lidaEm: '2026-10-27T03:00:00Z' }, { ...ok, id: 'c', tipo: 'aviso' }];
  assert.equal(N.contaNaoLidas(l), 2);
  assert.deepEqual(J(N.filtra(l, 'nao-lidas').map(n => n.id)), ['a', 'c']); assert.deepEqual(J(N.filtra(l, 'cobertura').map(n => n.id)), ['a', 'b']); assert.equal(N.filtra(l, 'todas').length, 3);
  const agora = new Date(2026, 9, 27, 12).getTime();
  assert.equal(N.diaDe(new Date(2026, 9, 27, 1).toISOString(), agora), 'Hoje'); assert.equal(N.diaDe(new Date(2026, 9, 26, 23).toISOString(), agora), 'Ontem');
  assert.equal(N.diaDe(new Date(2026, 9, 20, 9).toISOString(), agora), new Date(2026, 9, 20).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' }));
  const p = { id: 'rcob1', cartas: ['Nettle Sentinel', 'Carta B'] };
  const n1 = N.notificacaoDeCobertura(p, { id: 'd 7', name: 'Elfos' }, Date.parse('2026-10-27T05:00:00Z'));
  assert.deepEqual([n1.id, n1.titulo, n1.rota, N.valida(n1)], ['cobertura:rcob1', 'Elfos já joga', '/mesa?lista=d%207', true]); assert.match(n1.texto, /as 2 cartas que você pediu/);
  const n2 = N.notificacaoDeCobertura({ id: 'r2', cartas: ['X'] }, null);
  assert.deepEqual([n2.titulo, n2.rota], ['As cartas que você pediu já jogam', '/mesa']); assert.match(n2.texto, /a carta que você pediu\.$/);
});

test('G-314 · serviço: adiciona sem repetir, marca uma e todas, avisa quem ouve; cópia ilegível no aparelho não derruba', async () => {
  const store = P.memoryStore(); let t = Date.parse('2026-10-27T06:00:00Z');
  const S = N.createNotificacoes({ store, agora: () => t }); let avisos = 0; S.onMuda(() => avisos++);
  const n = id => ({ id, tipo: 'cobertura', titulo: 'T ' + id, texto: '', criadaEm: new Date(t++).toISOString(), lidaEm: null, rota: '/mesa' });
  assert.equal(await S.adiciona([n('a'), n('b')]), 2); assert.equal(await S.adiciona([n('a')]), 0, 'mesmo id não repete');
  assert.equal(await S.naoLidas(), 2); assert.deepEqual(J((await S.todas()).map(x => x.id)), ['b', 'a'], 'mais nova primeiro');
  await S.marcaLida('a'); assert.equal(await S.naoLidas(), 1); assert.equal(await S.marcaTodas(), 1); assert.equal(await S.naoLidas(), 0); assert.ok(avisos >= 3);
  await store.set(N.CHAVE, 'estragado'); assert.deepEqual(J(await S.todas()), []);
});

test('G-314 · confereCoberturas: pedido enviado cujas cartas o motor já joga vira notificação (uma vez); não enviado ou ainda sem regra, não', async () => {
  const store = P.memoryStore();
  const relatos = R.createRelatos({ store, busca: null });
  const C = R.createCobertura({ relatos, fila: { disponivel: async () => true, envia: async () => ({ ok: true, enviadoEm: '2026-10-27T02:00:09Z' }) } });
  await C.pede({ listaId: 'd1', formato: 'pauper', rotuloFormato: 'Pauper', total: 60, pct: 93, cartas: ['Island'], motor: 113 }); // terreno básico: o motor já joga
  await C.pede({ listaId: 'd2', formato: 'pauper', rotuloFormato: 'Pauper', total: 60, pct: 93, cartas: ['Carta Que Não Existe'], motor: 113 });
  const S = N.createNotificacoes({ store });
  const decks = { list: async () => [{ id: 'd1', name: 'Ilhas', format: 'pauper', entries: [] }] };
  const cardRepo = { cached: async nomes => new Map() };
  assert.equal(await N.confereCoberturas({ notificacoes: S, cobertura: C, decks, cardRepo }), 1);
  const [x] = await S.todas(); assert.deepEqual([x.titulo, x.rota], ['Ilhas já joga', '/mesa?lista=d1']);
  assert.equal(await N.confereCoberturas({ notificacoes: S, cobertura: C, decks, cardRepo }), 0, 'não repete');
});
