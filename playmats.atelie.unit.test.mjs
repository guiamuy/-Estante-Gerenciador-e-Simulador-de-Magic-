// MK3-P4 (J-76, trilha jogabilidade) · ateliê dos playmats, sem tela: o pedido à função (api/playmat, MK3-P3) com o acesso da
// conta, a leitura de cada resposta (códigos da função e do aparelho), a cota do dia como frase e os playmats guardados no
// aparelho (até 8; renomear; apagar com Desfazer na mesma posição). Nenhum teste vai à internet: o fetch é simulado.
// Falhava no main de antes (o módulo src/app/playmats.js não existia).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
const { playmats: P, platform } = loadModules();

const IMG = 'data:image/webp;base64,' + 'A'.repeat(64);
const J = v => JSON.parse(JSON.stringify(v)); // objetos do index.html vêm de outro contexto (vm): compara pelo conteúdo
const resposta = (status, { json = null, tipo = 'application/json', cab = {}, corpo = 'x' } = {}) => ({
  status, headers: { get: k => ({ 'content-type': tipo, ...cab })[k.toLowerCase()] ?? null },
  json: async () => { if (json === null) throw new Error('sem corpo'); return json; },
  blob: async () => ({ size: corpo.length, type: tipo }) });

test('J-76 MK3-P4 · texto limpo como o servidor limpa, nome de partida do playmat e hora curta da renovação', () => {
  assert.equal(P.limpaTexto('  couro\tverde <b>com</b>\n fio  '), 'couro verde b com /b fio');
  assert.equal(P.limpaTexto('x'.repeat(250)).length, 200);
  assert.equal(P.limpaTexto(null), '');
  assert.equal(P.nomeDoTexto('mapa antigo em sépia'), 'Mapa antigo em sépia');
  assert.equal(P.nomeDoTexto('a'.repeat(60)).length, 40);
  assert.equal(P.nomeDoTexto('   '), 'Meu playmat');
  assert.match(P.horaCurta('2026-11-14T00:00:00Z'), /^\d{1,2}h(\d{2})?$/);
  assert.equal(P.horaCurta('lixo'), '');
  assert.deepEqual(J(P.EXEMPLOS), ['couro verde com fio de latão', 'mapa antigo em sépia', 'mármore negro'], 'os três exemplos da especificação');
});

test('J-76 MK3-P4 · cada resposta da função vira a frase certa; só o que adianta oferece Tentar de novo', () => {
  assert.deepEqual(J(P.leResposta({ status: 200, restam: '1', renova: '2026-11-14T00:00:00Z' })), { ok: true, restam: 1, renova: '2026-11-14T00:00:00Z' });
  assert.equal(P.leResposta({ status: 200 }).restam, null, 'sem cabeçalho, a cota segue desconhecida');
  const nl = P.leResposta({ status: 503, corpo: { erro: 'nao-liberada' } });
  assert.equal(nl.codigo, 'nao-liberada'); assert.equal(nl.mensagem, 'Criação ainda não liberada'); assert.equal(nl.deNovo, false);
  assert.equal(P.leResposta({ status: 401, corpo: null }).codigo, 'sem-conta');
  const rec = P.leResposta({ status: 422, corpo: { erro: 'recusado', motivo: 'marca' } });
  assert.equal(rec.mensagem, 'Esse pedido não pode virar playmat: marca ou logotipo'); assert.equal(rec.deNovo, false);
  assert.equal(P.leResposta({ status: 422, corpo: { erro: 'recusado', motivo: 'inventado' } }).motivo, 'outro', 'motivo desconhecido vira o genérico');
  const cota = P.leResposta({ status: 429, corpo: { erro: 'cota-dia', renova: '2026-11-14T00:00:00Z' } });
  assert.equal(cota.restam, 0); assert.match(cota.mensagem, /^A criação de hoje acabou para todo mundo\. Volte amanhã, a partir das \d{1,2}h/);
  for (const [status, corpo] of [[502, { erro: 'provedor' }], [500, null], [418, { erro: 'qualquer' }], [503, { erro: 'prazo' }]]) {
    const r = P.leResposta({ status, corpo }); assert.equal(r.codigo, 'provedor', `${status} ${JSON.stringify(corpo)}`); assert.equal(r.deNovo, true); }
});

test('J-76 MK3-P4 · cota do dia: sem saber, o limite; sabendo, quantas restam; zerada, quando volta; vencida, volta a não se saber', () => {
  assert.equal(P.fraseDaCota(null), '2 criações por dia');
  assert.equal(P.fraseDaCota({ restam: 1, renova: null }), 'Restam 1 de 2 hoje');
  assert.match(P.fraseDaCota({ restam: 0, renova: '2026-11-14T00:00:00Z' }), /^Nenhuma criação restante hoje\. Volte amanhã, a partir das \d{1,2}h/);
  const renova = '2026-11-14T00:00:00Z', antes = Date.parse(renova) - 1000;
  assert.deepEqual(J(P.cotaVigente({ restam: 0, renova }, antes)), { restam: 0, renova });
  assert.equal(P.cotaVigente({ restam: 0, renova }, Date.parse(renova)), null, 'passou da renovação');
  assert.equal(P.cotaVigente({ restam: 'x' }, antes), null);
  assert.equal(P.cotaVigente({ restam: 9, renova }, antes).restam, 2, 'nunca mais que o limite');
});

test('J-76 MK3-P4 · guardados no aparelho: até 8, renomear, apagar com Desfazer na mesma posição, dado estranho ignorado, cota até a renovação', async () => {
  const store = platform.memoryStore(); let t = 1000;
  const C = P.createPlaymatsCriados({ store, agora: () => t++ });
  assert.deepEqual(J(await C.lista()), []);
  await assert.rejects(C.guarda({ texto: 'x', imagem: 'https://fora/img.png' }), /imagem/, 'só data: de imagem');
  await assert.rejects(C.guarda({ texto: 'x', imagem: 'data:image/webp;base64,' + 'A'.repeat(300 * 1024) }), /imagem/, 'acima de 200 KB não guarda');
  const a = await C.guarda({ texto: 'couro verde com fio de latão', imagem: IMG });
  const b = await C.guarda({ texto: 'mármore negro', imagem: IMG });
  assert.equal(a.nome, 'Couro verde com fio de latão'); assert.match(a.id, /^pm-/);
  assert.deepEqual(J((await C.lista()).map(p => p.id)), [b.id, a.id], 'o novo vem primeiro');
  assert.equal((await C.renomeia(a.id, '  Meu   couro  ')).nome, 'Meu couro');
  assert.equal((await C.renomeia(a.id, '   ')).nome, 'Meu couro', 'vazio não muda');
  assert.equal((await C.renomeia(a.id, 'n'.repeat(80))).nome.length, 40);
  const tirado = await C.apaga(b.id);
  assert.equal(tirado.pos, 0); assert.deepEqual(J((await C.lista()).map(p => p.id)), [a.id]);
  assert.equal(await C.restaura(tirado), true); assert.deepEqual(J((await C.lista()).map(p => p.id)), [b.id, a.id], 'volta ao lugar');
  assert.equal(await C.restaura(tirado), false, 'desfazer duas vezes não duplica');
  assert.equal(await C.apaga('pm-naoexiste'), null);
  for (let i = 0; i < 6; i++) await C.guarda({ texto: 'n' + i, imagem: IMG });
  await assert.rejects(C.guarda({ texto: 'nono', imagem: IMG }), /cheio/, 'o nono não cabe');
  assert.equal((await C.lista()).length, 8);
  await store.set(P.CHAVE, [...(await C.lista()), { id: 'lixo' }, null, { id: 'pm-abcd', nome: 'x', imagem: 'javascript:1' }]);
  assert.equal((await C.lista()).length, 8, 'item estranho no aparelho é ignorado');
  const renova = new Date(t + 60000).toISOString();
  await C.guardaCota({ restam: 1, renova });
  assert.deepEqual(J(await C.cota()), { restam: 1, renova });
  t += 120000; assert.equal(await C.cota(), null, 'passou da renovação');
});

test('J-76 MK3-P4 · pedido de criação: sem texto, sem rede ou sem conta nem chega à função; com conta, POST com o acesso; cada volta vira o resultado certo', async () => {
  const pedidos = [];
  const fetch = r => async (url, init) => { pedidos.push([url, init]); return typeof r === 'function' ? r(init) : r; };
  const token = async () => 'id-e2e';
  assert.equal((await P.criaPlaymat({ texto: '  ', token, fetch: fetch(resposta(200)) })).codigo, 'texto');
  assert.equal((await P.criaPlaymat({ texto: 'mármore', token, fetch: fetch(resposta(200)), online: false })).codigo, 'sem-rede');
  assert.equal((await P.criaPlaymat({ texto: 'mármore', token: async () => null, fetch: fetch(resposta(200)) })).codigo, 'sem-conta');
  assert.equal((await P.criaPlaymat({ texto: 'mármore', token: async () => { throw new Error('sem-rede'); }, fetch: fetch(resposta(200)) })).codigo, 'sem-rede', 'renovar o acesso sem rede');
  assert.equal(pedidos.length, 0, 'nada saiu do aparelho');
  const ok = await P.criaPlaymat({ texto: ' mármore <negro> ', token, fetch: fetch(resposta(200, { tipo: 'image/jpeg', cab: { 'x-playmat-restam': '1', 'x-playmat-renova': '2026-11-14T00:00:00Z' } })) });
  assert.equal(ok.ok, true); assert.equal(ok.restam, 1); assert.equal(ok.imagem.type, 'image/jpeg');
  const [url, init] = pedidos.at(-1);
  assert.equal(url, '/api/playmat'); assert.equal(init.method, 'POST'); assert.equal(init.headers.authorization, 'Bearer id-e2e');
  assert.deepEqual(JSON.parse(init.body), { texto: 'mármore negro' }, 'só o texto limpo vai; nada da conta além do acesso');
  assert.equal((await P.criaPlaymat({ texto: 'x', token, fetch: fetch(resposta(200, { tipo: 'text/html' })) })).codigo, 'imagem', 'o que não é imagem não passa');
  assert.equal((await P.criaPlaymat({ texto: 'x', token, fetch: fetch(resposta(429, { json: { erro: 'cota-conta', renova: '2026-11-14T00:00:00Z', restam: 0 } })) })).codigo, 'cota-conta');
  assert.equal((await P.criaPlaymat({ texto: 'x', token, fetch: async () => { throw new TypeError('Failed to fetch'); } })).codigo, 'sem-rede');
  const lento = init => new Promise((res, rej) => { if (init.signal) init.signal.addEventListener('abort', () => rej(new Error('abortado'))); }); // nunca responde
  const prazo = await P.criaPlaymat({ texto: 'x', token, fetch: fetch(lento), prazoMs: 20 });
  assert.equal(prazo.codigo, 'prazo'); assert.equal(prazo.deNovo, true);
});
