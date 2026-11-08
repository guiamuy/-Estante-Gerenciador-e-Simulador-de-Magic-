// I-329 · ponte das coleções (github.io → Vercel): a conversa entre as duas janelas, com janelas de mentira.
// O que importa aqui é quem o endereço novo escuta (só a origem do antigo e a janela que o abriu) e que nada é gravado
// sem o "Trazer". A tela inteira, com duas origens de verdade, está no e2e "I-329".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
const { ponte: P } = loadModules();

const ANTIGO = 'https://guiamuy.github.io', NOVO = 'https://estante-magic.vercel.app';
const backup = (decks = 2, itens = [['Island', 4], ['Counterspell', 3]]) => JSON.stringify({ kind: 'estante.backup', version: 3,
  decks: Array.from({ length: decks }, (_, i) => ({ id: 'd' + i, entries: [] })), items: itens.map(([name, qty]) => ({ name, qty })) });

/** Janela de mentira: guarda ouvintes e o que recebeu; `entrega(dado, origem, fonte)` simula uma mensagem chegando. */
function janela(origem) {
  const ouvintes = new Set(), recebeu = [];
  const w = { origem, recebeu, opener: null, abertas: [],
    addEventListener: (t, f) => { if (t === 'message') ouvintes.add(f); }, removeEventListener: (t, f) => { if (t === 'message') ouvintes.delete(f); },
    ouvindo: () => ouvintes.size,
    entrega: async (data, origin, source) => { for (const f of [...ouvintes]) await f({ data, origin, source }); },
    postMessage: (m, alvo) => recebeu.push({ m, alvo }) };
  return w;
}

test('I-329 · endereços: os de verdade por padrão; window.__PONTE troca os dois (testes)', () => {
  assert.deepEqual({ ...P.enderecos({}) }, { antigo: ANTIGO, novo: NOVO });
  assert.deepEqual({ ...P.enderecos({ __PONTE: { antigo: 'http://127.0.0.1:1', novo: 'http://localhost:1' } }) }, { antigo: 'http://127.0.0.1:1', novo: 'http://localhost:1' });
  assert.deepEqual({ ...P.enderecos({ __PONTE: { antigo: 1 } }) }, { antigo: ANTIGO, novo: NOVO }, 'meia troca não vale');
  const e = P.enderecos({});
  assert.equal(P.papel(ANTIGO, e), 'antigo'); assert.equal(P.papel(NOVO, e), 'novo');
  assert.equal(P.papel('https://estante-magic-previa.vercel.app', e), null);
  assert.equal(P.papel('https://guiamuy.github.io.mal.com', e), null);
});

test('I-329 · resumo do backup: listas e cópias da coleção; o que não é backup da Estante é recusado', () => {
  assert.deepEqual({ ...P.resumoDoBackup(backup()) }, { listas: 2, cartas: 7 });
  assert.deepEqual({ ...P.resumoDoBackup(JSON.stringify({ kind: 'estante.backup', decks: [{ id: 'a', entries: [] }, { id: 'b' }], owned: { island: 2, bolt: '1' } })) }, { listas: 1, cartas: 3 }, 'v1 por nome; lista sem cartas não conta');
  assert.equal(P.resumoDoBackup('{"kind":"outra"}'), null);
  assert.equal(P.resumoDoBackup('não é json'), null);
  assert.equal(P.resumoDoBackup(null), null);
  assert.equal(P.fraseDoResumo({ listas: 1, cartas: 1 }), '1 lista e 1 carta da coleção');
  assert.equal(P.fraseDoResumo({ listas: 3, cartas: 120 }), '3 listas e 120 cartas da coleção');
});

test('I-329 · ponta a ponta com janelas de mentira: pronta → backup → Trazer → recebida', async () => {
  const e = P.enderecos({});
  const antigo = janela(ANTIGO), novo = janela(NOVO);
  antigo.open = (url, nome) => { antigo.abertas.push([url, nome]); return novo; };
  const texto = backup();
  const indo = P.levar({ janela: antigo, texto, e });
  assert.deepEqual(antigo.abertas, [[NOVO + '/#/ponte', '_blank']]);
  // o novo abre, avisa que está pronto e espera
  novo.opener = antigo;
  let perguntou = null;
  assert.equal(P.receber({ janela: novo, e, confirma: async (r, t) => { perguntou = { r: { ...r }, t }; return true; } }), true);
  assert.deepEqual(antigo.recebeu.map(x => [x.m.tipo, x.alvo]), [[P.TIPO.pronta, ANTIGO]], 'o novo só fala com a origem do antigo');
  // o aviso chega ao antigo, que entrega o backup só para a origem do novo
  await antigo.entrega(antigo.recebeu[0].m, NOVO, novo);
  assert.deepEqual(novo.recebeu.map(x => [x.m.tipo, x.alvo]), [[P.TIPO.backup, NOVO]]);
  await novo.entrega(novo.recebeu[0].m, ANTIGO, antigo);
  assert.deepEqual(perguntou, { r: { listas: 2, cartas: 7 }, t: texto }, 'a pessoa vê o que chegou');
  assert.equal(novo.ouvindo(), 0, 'um backup por abertura');
  const resposta = antigo.recebeu[1];
  assert.deepEqual([resposta.m.tipo, resposta.m.listas, resposta.m.cartas, resposta.alvo], [P.TIPO.recebida, 2, 7, ANTIGO]);
  await antigo.entrega(resposta.m, NOVO, novo);
  assert.deepEqual({ ...(await indo) }, { ok: true, listas: 2, cartas: 7 });
  assert.equal(antigo.ouvindo(), 0);
});

test('I-329 · o novo ignora mensagem de outra origem ou de outra janela, e não grava sem o Trazer', async () => {
  const e = P.enderecos({});
  const antigo = janela(ANTIGO), intruso = janela(ANTIGO), novo = janela(NOVO);
  novo.opener = antigo;
  let chamadas = 0;
  P.receber({ janela: novo, e, confirma: async () => { chamadas++; return false; } });
  const m = { tipo: P.TIPO.backup, texto: backup() };
  await novo.entrega(m, 'https://mal.example', antigo);
  await novo.entrega(m, NOVO, antigo);
  await novo.entrega(m, ANTIGO, intruso); // mesma origem, outra janela
  await novo.entrega({ tipo: 'outra coisa' }, ANTIGO, antigo);
  assert.equal(chamadas, 0); assert.equal(novo.ouvindo(), 1, 'continua esperando o backup de verdade');
  await novo.entrega(m, ANTIGO, antigo);
  assert.equal(chamadas, 1);
  assert.deepEqual(antigo.recebeu.map(x => x.m.tipo), [P.TIPO.pronta, P.TIPO.recusada], 'Cancelar responde recusada');
  assert.equal(antigo.recebeu[1].m.motivo, 'cancelou');
});

test('I-329 · arquivo que não é backup é recusado sem perguntar; aberto à mão (sem quem abriu) não espera nada', async () => {
  const e = P.enderecos({});
  const antigo = janela(ANTIGO), novo = janela(NOVO);
  novo.opener = antigo;
  let chamadas = 0;
  P.receber({ janela: novo, e, confirma: async () => { chamadas++; return true; } });
  await novo.entrega({ tipo: P.TIPO.backup, texto: '{"kind":"x"}' }, ANTIGO, antigo);
  assert.equal(chamadas, 0);
  assert.deepEqual({ ...antigo.recebeu[1].m }, { tipo: P.TIPO.recusada, motivo: 'formato' });
  const sozinho = janela(NOVO);
  assert.equal(P.receber({ janela: sozinho, e, confirma: async () => true }), false);
  assert.equal(sozinho.ouvindo(), 0);
});

test('I-329 · o antigo: janela bloqueada, resposta de outra origem ignorada, recusa e tempo esgotado', async () => {
  const e = P.enderecos({});
  const bloq = janela(ANTIGO); bloq.open = () => null;
  assert.deepEqual({ ...(await P.levar({ janela: bloq, texto: backup(), e })) }, { ok: false, motivo: 'bloqueada' });
  const antigo = janela(ANTIGO), novo = janela(NOVO), outra = janela(NOVO);
  antigo.open = () => novo;
  const indo = P.levar({ janela: antigo, texto: backup(), e });
  await antigo.entrega({ tipo: P.TIPO.pronta }, 'https://mal.example', novo);
  await antigo.entrega({ tipo: P.TIPO.pronta }, NOVO, outra);
  assert.equal(novo.recebeu.length, 0, 'o backup só vai para a janela aberta, na origem do novo');
  await antigo.entrega({ tipo: P.TIPO.pronta }, NOVO, novo);
  await antigo.entrega({ tipo: P.TIPO.pronta }, NOVO, novo);
  assert.equal(novo.recebeu.length, 1, 'entregue uma vez só');
  await antigo.entrega({ tipo: P.TIPO.recusada, motivo: 'cancelou' }, NOVO, novo);
  assert.deepEqual({ ...(await indo) }, { ok: false, motivo: 'recusada' });
  const lento = janela(ANTIGO); lento.open = () => janela(NOVO);
  assert.deepEqual({ ...(await P.levar({ janela: lento, texto: backup(), e, espera: 5 })) }, { ok: false, motivo: 'tempo' });
  assert.equal(lento.ouvindo(), 0);
});
