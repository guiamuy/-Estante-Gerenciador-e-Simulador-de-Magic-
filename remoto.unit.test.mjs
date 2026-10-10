// Leva A-262 · T6b · forma do perfil e da fila de relatos no Firebase (relatos #6 e #13). Sem navegador e sem rede:
// o transporte é o de memória da sala (mesmo contrato do Firebase por REST) ou um `fetch` de mentira.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
const { perfil: PF, platform: P, remoto: R, online: O } = loadModules();
const J = x => JSON.parse(JSON.stringify(x));
const FOTO = 'data:image/jpeg;base64,' + 'A'.repeat(2000);
/** Um aparelho: store vigiado com relógio próprio e o perfil por cima. */
function aparelho(relogio) { const store = PF.vigiaStore(P.memoryStore(), { agora: () => relogio.t }); return { store, perfil: PF.createPerfil({ store, agora: () => relogio.t }) }; }
/** Transporte que conta o que passa (para provar que nada sobe à toa e que a foto só é lida quando muda). */
function contado(tr) { const n = { ler: [], escrever: [], atualizar: [] }; return { n, tr: { ...tr, ler: c => { n.ler.push(c); return tr.ler(c); }, escrever: (c, v) => { n.escrever.push(c); return tr.escrever(c, v); }, atualizar: (c, v) => { n.atualizar.push([c, Object.keys(v)]); return tr.atualizar(c, v); } } }; }
/** Valores difíceis para um banco em árvore: vazio, lista dentro de lista, chave com ponto e barra, texto com aspas. */
const DIFICEIS = { 'ui.theme': 'dark', 'collection.views': [], 'ui.aparencia': {}, 'fichas.escolhas': { 'ficha:goblin 1/1': 'abc.def', 'a.b$c#d[e]': [[], [1, [2]]] }, 'mesa.paradas': [0, false, '', 'fim "do" turno'], 'mesa.relatarY': 0.5, 'decks.estatisticas': false };

test('A-262 · caminhos: um ramo por pessoa; uid estranho é recusado; chave codificada não tem caractere proibido', () => {
  assert.deepEqual(J(R.caminhos('Ab_c-1')), { doc: 'perfis/Ab_c-1/doc', avatar: 'perfis/Ab_c-1/avatar', fila: 'relatos/fila/Ab_c-1' });
  for (const ruim of ['', null, 'a/b', '../x', 'a.b', 'a b', 'x'.repeat(129), '$uid']) assert.throws(() => R.caminhos(ruim), /uid-invalido/, String(ruim));
  for (const k of PF.DO_DOCUMENTO) { const c = R.codifica(k); assert.equal(/[.$#\[\]\/\x00-\x1f\x7f]/.test(c), false, c); assert.equal(R.decodifica(c), k); assert.ok(Buffer.byteLength(c) <= 768); }
  assert.equal(new Set(PF.DO_DOCUMENTO.map(R.codifica)).size, PF.DO_DOCUMENTO.length, 'duas chaves não viram a mesma');
});

test('A-262 · ida e volta da forma: o que volta é exatamente o que foi, a foto não vai no documento', () => {
  const doc = { kind: 'estante.perfil', version: 1, atualizadoEm: 90, pessoa: { nome: 'Gui', avatar: FOTO, atualizadoEm: 80 }, preferencias: DIFICEIS, carimbos: { 'ui.theme': 90, 'collection.views': 10, 'ui.aparencia': 0, 'fichas.escolhas': 5, 'mesa.paradas': 7, 'mesa.relatarY': 3, 'decks.estatisticas': 2, 'lista.visao': 44 } };
  const { remoto, fora } = R.paraRemoto(doc);
  assert.deepEqual(J(fora), []); assert.equal(remoto.kind, 'estante.perfil.remoto'); assert.equal(remoto.version, 1); assert.equal(remoto.nome, 'Gui'); assert.equal(remoto.pessoaEm, 80);
  assert.equal(JSON.stringify(remoto).includes('data:image'), false, 'a foto mora em nó próprio');
  assert.deepEqual(J(remoto.p['lista:visao']), { t: 44 }, 'escolha apagada sobe só com o instante');
  for (const no of Object.values(remoto.p)) if ('v' in no) assert.equal(typeof no.v, 'string');
  const volta = R.doRemoto(J(remoto), { dado: FOTO, em: 80 });
  assert.deepEqual(J(volta.doc.preferencias), DIFICEIS); assert.deepEqual(J(volta.doc.carimbos), doc.carimbos); assert.deepEqual(J(volta.doc.pessoa), doc.pessoa); assert.deepEqual(J(volta.ignoradas), []);
  assert.equal(R.doRemoto(J(remoto)).doc.pessoa, null, 'sem ler a foto, a pessoa não é tocada');
  assert.equal(R.doRemoto(J(remoto), null).doc.pessoa.avatar, null, 'foto lida e ausente = sem foto');
  assert.equal(R.doRemoto(null), null);
  assert.throws(() => R.paraRemoto({ kind: 'estante.backup', version: 3 }), /formato-desconhecido/);
});

test('A-262 · o que vem do banco é dado: chave desconhecida, texto que não é JSON e instante estranho ficam de fora', () => {
  const r = R.doRemoto({ kind: 'estante.perfil.remoto', version: 1, atualizadoEm: 5, nome: '  Gui   A  ', pessoaEm: 5, p: {
    'ui:theme': { v: '"dark"', t: 9 }, 'deck:x': { v: '{"id":"x"}', t: 9 }, 'conta': { v: '{}', t: 9 }, 'mesa:som': { v: '{nao json', t: 9 }, 'mesa:verJogadas': { v: 'true', t: -1 },
    'lista:visao': { v: { densa: 1 }, t: 9 }, 'catalogo:visao': 'lista', 'mesa:manaManual': { v: 'null', t: 9 }, 'cartas:rulings': { v: '"' + 'x'.repeat(R.VALOR_MAX) + '"', t: 9 }, 'decks:estatisticas': { v: 'true', t: '12' } } }, { dado: 'https://fora/x.png', em: 5 });
  assert.deepEqual(J(r.doc.preferencias), { 'ui.theme': 'dark', 'decks.estatisticas': true }); assert.deepEqual(J(r.doc.carimbos), { 'ui.theme': 9, 'decks.estatisticas': 12 });
  assert.deepEqual(J(r.ignoradas).sort(), ['cartas.rulings', 'catalogo.visao', 'conta', 'deck.x', 'lista.visao', 'mesa.manaManual', 'mesa.som', 'mesa.verJogadas']);
  assert.equal(r.doc.pessoa.nome, 'Gui A'); assert.equal(r.doc.pessoa.avatar, null, 'endereço de fora não é foto');
  assert.throws(() => R.doRemoto({ kind: 'estante.perfil', version: 1 }), /formato-desconhecido/);
  assert.throws(() => R.doRemoto({ kind: 'estante.perfil.remoto', version: 2 }), /versao-desconhecida/);
});

test('A-262 · valor grande demais não sobe e é dito; o documento típico sem a foto cabe em 16 KB', () => {
  const grande = { kind: 'estante.perfil', version: 1, atualizadoEm: 1, pessoa: { nome: '', avatar: null, atualizadoEm: 0 }, preferencias: { 'ui.theme': 'dark', 'fichas.escolhas': { x: 'y'.repeat(R.VALOR_MAX) } }, carimbos: { 'ui.theme': 1, 'fichas.escolhas': 1 } };
  const g = R.paraRemoto(grande); assert.deepEqual(J(g.fora), ['fichas.escolhas']); assert.deepEqual(Object.keys(g.remoto.p), ['ui:theme']);
  // perfil de uso real: 30 artes de ficha e 10 de terreno escolhidas, 6 visões salvas da coleção, o resto ligado
  const prefs = {}; for (const k of PF.DO_DOCUMENTO) prefs[k] = true;
  prefs['fichas.escolhas'] = Object.fromEntries(Array.from({ length: 30 }, (_, i) => ['ficha:nome da ficha ' + i + ' 1/1', '0123abcd-0000-4000-8000-00000000' + String(i).padStart(4, '0')]));
  prefs['terrenos.escolhas'] = Object.fromEntries(Array.from({ length: 10 }, (_, i) => ['terreno ' + i, '0123abcd-0000-4000-8000-00000000' + String(i).padStart(4, '0')]));
  prefs['collection.views'] = Array.from({ length: 6 }, (_, i) => ({ id: 'v' + i, nome: 'Visão ' + i, filtro: { cores: ['W', 'U'], raridade: 'rare', texto: 'voar' } }));
  const tip = R.paraRemoto({ kind: 'estante.perfil', version: 1, atualizadoEm: 1, pessoa: { nome: 'Guilherme', avatar: FOTO, atualizadoEm: 1 }, preferencias: prefs, carimbos: Object.fromEntries(PF.DO_DOCUMENTO.map(k => [k, 1760000000000])) });
  const bytes = Buffer.byteLength(JSON.stringify(tip.remoto));
  assert.ok(bytes < 16 * 1024, `documento sem foto com ${bytes} bytes`);
});

test('A-262 · dois aparelhos: cada um leva o que tem de mais novo, os dois terminam iguais, e repetir não escreve nada', async () => {
  const banco = O.transporteMemoria(), ra = { t: 100 }, rb = { t: 100 };
  const A = aparelho(ra), B = aparelho(rb), ca = contado(banco), cb = contado(banco);
  const remA = R.createPerfilRemoto({ transporte: ca.tr, uid: 'u1' }), remB = R.createPerfilRemoto({ transporte: cb.tr, uid: 'u1' });
  for (const [k, v] of Object.entries(DIFICEIS)) await A.store.set(k, v);
  await A.perfil.set({ nome: 'Gui', avatar: FOTO });
  const s1 = await remA.sincroniza(A.perfil);
  assert.deepEqual(J(s1.desceu), []); assert.deepEqual(J(s1.subiu).sort(), Object.keys(DIFICEIS).sort()); assert.equal(s1.pessoaSubiu, true); assert.equal(s1.conferido, true);
  // B chega com uma escolha mais nova (tema) e uma só dele
  rb.t = 300; await B.store.set('ui.theme', 'light'); await B.store.set('lista.visao', 'pilhas');
  const s2 = await remB.sincroniza(B.perfil);
  assert.deepEqual(J(s2.desceu).sort(), Object.keys(DIFICEIS).filter(k => k !== 'ui.theme').sort(), 'o tema mais novo de B fica');
  assert.deepEqual(J(s2.subiu).sort(), ['lista.visao', 'ui.theme']); assert.equal(s2.pessoaDesceu, true); assert.equal(s2.pessoaSubiu, false); assert.equal(s2.conferido, true);
  assert.deepEqual(J(await B.store.get('fichas.escolhas')), DIFICEIS['fichas.escolhas']); assert.deepEqual(J(await B.store.get('collection.views')), []); assert.deepEqual(J(await B.store.get('ui.aparencia')), {});
  assert.equal((await B.perfil.get()).avatar, FOTO);
  const s3 = await remA.sincroniza(A.perfil);
  assert.deepEqual(J(s3.desceu).sort(), ['lista.visao', 'ui.theme']); assert.deepEqual(J(s3.subiu), []); assert.equal(await A.store.get('ui.theme'), 'light');
  assert.deepEqual(J((await A.perfil.documento()).preferencias), J((await B.perfil.documento()).preferencias)); assert.deepEqual(J((await A.perfil.documento()).carimbos), J((await B.perfil.documento()).carimbos));
  // repetir: nada desce, nada sobe, nenhuma escrita no banco, e a foto não é lida de novo
  ca.n.escrever.length = ca.n.atualizar.length = ca.n.ler.length = 0; cb.n.escrever.length = cb.n.atualizar.length = cb.n.ler.length = 0;
  const s4 = await remA.sincroniza(A.perfil), s5 = await remB.sincroniza(B.perfil);
  assert.deepEqual(J([s4.desceu, s4.subiu, s5.desceu, s5.subiu]), [[], [], [], []]);
  assert.deepEqual(J([ca.n.escrever, ca.n.atualizar, cb.n.escrever, cb.n.atualizar]), [[], [], [], []], 'encontro sem novidade não escreve');
  assert.deepEqual(J(ca.n.ler), ['perfis/u1/doc']); assert.deepEqual(J(cb.n.ler), ['perfis/u1/doc'], 'uma leitura por encontro; a foto só quando muda');
  // escolha apagada num aparelho apaga no outro; uma só escolha mudada sobe um só nó
  ra.t = 500; await A.store.remove('lista.visao'); await A.store.set('mesa.relatarY', 0.3); ca.n.atualizar.length = 0;
  await remA.sincroniza(A.perfil);
  assert.deepEqual(J(ca.n.atualizar[0][1]).filter(k => k.startsWith('p/')).sort(), ['p/lista:visao', 'p/mesa:relatarY']);
  await remB.sincroniza(B.perfil); assert.equal(await B.store.get('lista.visao'), null); assert.equal(await B.store.get('mesa.relatarY'), 0.3);
  // tirar a foto num aparelho tira no outro
  ra.t = 600; await A.perfil.set({ avatar: null }); await remA.sincroniza(A.perfil); await remB.sincroniza(B.perfil);
  assert.equal((await B.perfil.get()).avatar, null); assert.equal(await banco.ler('perfis/u1/avatar'), null);
  // outra pessoa não vê nada disso
  assert.equal((await R.createPerfilRemoto({ transporte: banco, uid: 'u2' }).ler()).doc, null);
});

test('A-262 · sem rede o encontro falha com nome e o aparelho fica como estava; banco que engole a escrita é denunciado', async () => {
  const banco = O.transporteMemoria(), r = { t: 10 }, A = aparelho(r);
  await A.store.set('ui.theme', 'dark'); const antes = J(await A.perfil.documento());
  banco._rede(false);
  await assert.rejects(() => R.createPerfilRemoto({ transporte: banco, uid: 'u1' }).sincroniza(A.perfil), /sem-rede/);
  assert.deepEqual(J(await A.perfil.documento()), antes);
  banco._rede(true);
  const surdo = { ...banco, atualizar: async () => {} };
  const s = await R.createPerfilRemoto({ transporte: surdo, uid: 'u1' }).sincroniza(A.perfil);
  assert.deepEqual(J(s.subiu), ['ui.theme']); assert.equal(s.conferido, false, '"enviado" só vale depois de ler de volta');
  // apagar tudo o que é da pessoa
  const rem = R.createPerfilRemoto({ transporte: banco, uid: 'u1' }); await A.perfil.set({ nome: 'Gui', avatar: FOTO }); await rem.sincroniza(A.perfil);
  assert.ok(await banco.ler('perfis/u1/doc')); assert.ok(await banco.ler('perfis/u1/avatar'));
  assert.equal(await rem.apagarTudo(), true); assert.equal(await banco.ler('perfis/u1'), null);
  assert.equal(await A.store.get('ui.theme'), 'dark', 'apagar no banco não apaga no aparelho');
});

test('A-262 · fila de relatos: um nó por relato, mandar de novo não duplica, e o que sai da fila é lido como dado', async () => {
  const banco = O.transporteMemoria(); let t = Date.parse('2026-10-10T18:00:00Z');
  const fila = R.createFilaDeRelatos({ transporte: banco, uid: 'u1', agora: () => t });
  const relato = { id: 'rmv2cz1ba71ub', criadoEm: '2026-10-10T12:16:24.934Z', tipo: 'melhoria', urgencia: 'bloqueia', descricao: 'O envio abre o GitHub. "Aspas", <b>marcação</b> e\nquebra de linha.', area: 'Relatos', rota: '/perfil/relatos', endereco: '/perfil/relatos', tela: null, contexto: { motor: 96, tema: 'escuro', lista: [] }, partida: null, status: 'aberto' };
  const r1 = await fila.enfileira(relato); assert.equal(r1.conferido, true); assert.equal(r1.enviadoEm, '2026-10-10T18:00:00.000Z');
  t += 60000; const r2 = await fila.enfileira(relato); assert.equal(r2.conferido, true);
  assert.deepEqual(J(await fila.pendentes()), ['rmv2cz1ba71ub'], 'o mesmo relato duas vezes é um nó só');
  const no = await banco.ler('relatos/fila/u1/rmv2cz1ba71ub');
  assert.equal(no.kind, 'estante.relato'); assert.equal(no.version, 1); assert.equal(typeof no.dado, 'string');
  assert.deepEqual(J(R.relatoDaFila(no)), relato, 'volta igual, com lista vazia e tudo');
  assert.deepEqual(J(await R.createFilaDeRelatos({ transporte: banco, uid: 'u2' }).pendentes()), [], 'a fila é por pessoa');
  for (const ruim of [null, {}, { id: 'a/b' }, { id: '../x' }, { id: 'a.b' }, { id: '' }]) await assert.rejects(() => fila.enfileira(ruim), /relato-invalido/);
  await assert.rejects(() => fila.enfileira({ id: 'grande', descricao: 'x'.repeat(R.RELATO_MAX) }), /relato-grande/);
  for (const ruim of [null, {}, { kind: 'estante.relato', version: 1, dado: '{' }, { kind: 'estante.relato', version: 1, dado: '"texto"' }, { kind: 'estante.relato', version: 2, dado: '{"id":"a"}' }, { kind: 'outro', version: 1, dado: '{"id":"a"}' }, { kind: 'estante.relato', version: 1, dado: '{"id":"a/b"}' }, { kind: 'estante.relato', version: 1, dado: { id: 'a' } }])
    assert.equal(R.relatoDaFila(ruim), null);
  const semBanco = O.transporteMemoria(); semBanco._rede(false);
  await assert.rejects(() => R.createFilaDeRelatos({ transporte: semBanco, uid: 'u1' }).enfileira(relato), /sem-rede/);
});

test('A-262 · Firebase por REST: com conta o pedido leva o token; sem conta nada muda; o encontro inteiro passa pelo REST', async () => {
  const pedidos = []; const arvore = {};
  const no = (seg, cria) => { let o = arvore; for (const k of seg) { if (o[k] === undefined) { if (!cria) return undefined; o[k] = {}; } o = o[k]; } return o; };
  const grava = (seg, v) => { const pai = no(seg.slice(0, -1), true), u = seg[seg.length - 1]; if (v === null || v === undefined) delete pai[u]; else pai[u] = JSON.parse(JSON.stringify(v)); };
  const fetchFalso = async (url, init = {}) => {
    const u = new URL(url); pedidos.push({ metodo: init.method || 'GET', caminho: u.pathname, auth: u.searchParams.get('auth') });
    const seg = u.pathname.replace(/\.json$/, '').split('/').filter(Boolean), corpo = init.body ? JSON.parse(init.body) : undefined;
    if (init.method === 'PUT') grava(seg, corpo);
    else if (init.method === 'PATCH') for (const [k, v] of Object.entries(corpo)) grava([...seg, ...k.split('/')], v); // PATCH com caminho no nome da chave, como o Realtime Database aceita
    else if (init.method === 'DELETE') grava(seg, null);
    const v = init.method && init.method !== 'GET' ? null : no(seg);
    return { ok: true, status: 200, text: async () => JSON.stringify(v === undefined ? null : v) };
  };
  let tok = 'tok en+/='; 
  const tr = O.transporteFirebase({ url: 'https://x.firebaseio.com/', fetch: fetchFalso, EventSource: class { addEventListener() {} close() {} }, token: async () => tok });
  const r = { t: 50 }, A = aparelho(r), B = aparelho(r);
  for (const [k, v] of Object.entries(DIFICEIS)) await A.store.set(k, v);
  await A.perfil.set({ nome: 'Gui', avatar: FOTO });
  const s = await R.createPerfilRemoto({ transporte: tr, uid: 'u1' }).sincroniza(A.perfil); assert.equal(s.conferido, true);
  assert.ok(pedidos.length >= 3); for (const p of pedidos) { assert.equal(p.auth, 'tok en+/=', 'o token vai codificado e volta inteiro'); assert.ok(p.caminho.startsWith('/perfis/u1/'), p.caminho); }
  assert.deepEqual(pedidos.map(p => p.metodo), ['GET', 'PUT', 'PATCH', 'GET'], 'ler, foto, um PATCH com tudo, ler de volta');
  const s2 = await R.createPerfilRemoto({ transporte: tr, uid: 'u1' }).sincroniza(B.perfil);
  assert.deepEqual(J((await B.perfil.documento()).preferencias), DIFICEIS); assert.equal((await B.perfil.get()).avatar, FOTO); assert.deepEqual(J(s2.subiu), []);
  // token que falha ou não existe: o pedido sai sem `auth` (as regras do banco é que recusam), e o transporte da sala de hoje não muda
  pedidos.length = 0; tok = null; await tr.ler('perfis/u1/doc'); assert.equal(pedidos[0].auth, null);
  const quebra = O.transporteFirebase({ url: 'https://x.firebaseio.com', fetch: fetchFalso, token: async () => { throw new Error('expirou'); } }); pedidos.length = 0; await quebra.ler('salas/ESTA-AAAA'); assert.equal(pedidos[0].auth, null);
  const antigo = O.transporteFirebase({ url: 'https://x.firebaseio.com', fetch: async (url) => { pedidos.push(url); return { ok: true, status: 200, text: async () => 'null' }; } }); await antigo.ler('salas/ESTA-AAAA');
  assert.equal(pedidos[pedidos.length - 1], 'https://x.firebaseio.com/salas/ESTA-AAAA.json');
});

test('A-262 · o token nunca vai para cache: o service worker deixa passar todo pedido ao Firebase e às contas do Google', async () => {
  const { readFileSync } = await import('node:fs'); const vm = (await import('node:vm')).default; const { ROOT } = await import('./_load.mjs'); const { join } = await import('node:path');
  const ctx = vm.createContext({ self: { location: { origin: 'https://guiamuy.github.io' }, addEventListener() {}, skipWaiting() {}, clients: { claim() {} } }, caches: {}, URL, console, fetch: async () => { throw new Error('rede'); }, Response, Request, Promise, setTimeout });
  vm.runInContext(readFileSync(join(ROOT, 'sw.js'), 'utf8') + '\n;globalThis.__pick = pickStrategy;', ctx);
  for (const url of ['https://x-default-rtdb.firebaseio.com/perfis/u1/doc.json?auth=TOKEN', 'https://x-default-rtdb.europe-west1.firebasedatabase.app/relatos/fila/u1/r1.json?auth=TOKEN',
    'https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=K', 'https://securetoken.googleapis.com/v1/token?key=K'])
    for (const method of ['GET', 'POST', 'PUT', 'PATCH']) assert.equal(ctx.__pick({ url, method }).strategy, 'passthrough', `${method} ${url}`);
  assert.notEqual(ctx.__pick({ url: 'https://guiamuy.github.io/index.html', method: 'GET' }).strategy, 'passthrough', 'a sonda enxerga o classificador de verdade');
});
