// Leva 128 · U13 fase 1 · perfil local: nome, avatar, preferências e backup completo (v3) sem quebrar o v2.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
const { perfil: PF, platform: P, decks: D } = loadModules();
const J = x => JSON.parse(JSON.stringify(x));
const FOTO = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';

test('Leva 128 · nome limpo e limitado; inicial; avatar só como data URL de imagem', () => {
  assert.equal(PF.limpaNome('  Gui   Amuy  '), 'Gui Amuy');
  assert.equal(PF.limpaNome('a'.repeat(40)).length, PF.NOME_MAX);
  assert.equal(PF.limpaNome(null), '');
  assert.equal(PF.inicialDe('  guilherme'), 'G'); assert.equal(PF.inicialDe(''), '');
  assert.equal(PF.avatarValido(FOTO), true);
  assert.equal(PF.avatarValido('https://x/y.png'), false, 'URL externa não é avatar: a foto mora no aparelho');
  assert.equal(PF.avatarValido('data:text/html;base64,AAAA'), false);
  assert.equal(PF.avatarValido('data:image/png;base64,' + 'A'.repeat(500000)), false, 'foto grande demais não entra');
});

test('Leva 128 · recorte quadrado central: paisagem, retrato e quadrado', () => {
  assert.deepEqual(J(PF.quadradoCentral(400, 300)), { sx: 50, sy: 0, lado: 300 });
  assert.deepEqual(J(PF.quadradoCentral(300, 400)), { sx: 0, sy: 50, lado: 300 });
  assert.deepEqual(J(PF.quadradoCentral(200, 200)), { sx: 0, sy: 0, lado: 200 });
  assert.deepEqual(J(PF.quadradoCentral(0, 0)), { sx: 0, sy: 0, lado: 1 }, 'nunca lado zero');
});

test('Leva 128 · perfil guarda nome e foto, remove a foto com null e nunca lança sem store', async () => {
  const store = P.memoryStore(); let t = 100;
  const p = PF.createPerfil({ store, agora: () => t });
  assert.deepEqual(J(await p.get()), { nome: '', avatar: null, atualizadoEm: 0 }, 'vazio no começo');
  assert.equal(await p.nomeNaMesa(), 'Você');
  await p.set({ nome: '  Gui ', avatar: FOTO });
  let g = await p.get(); assert.equal(g.nome, 'Gui'); assert.equal(g.avatar, FOTO); assert.equal(g.atualizadoEm, 100);
  assert.equal(await p.nomeNaMesa(), 'Gui');
  t = 200; await p.set({ avatar: null });
  g = await p.get(); assert.equal(g.nome, 'Gui', 'remover a foto não apaga o nome'); assert.equal(g.avatar, null); assert.equal(g.atualizadoEm, 200);
  await p.set({ avatar: 'lixo' }); assert.equal((await p.get()).avatar, null, 'avatar inválido vira nenhum');
  // store quebrado: get devolve vazio em vez de lançar (a mesa não pode travar por causa do perfil)
  const quebrado = PF.createPerfil({ store: { get: async () => { throw new Error('idb'); }, set: async () => {} } });
  assert.deepEqual(J(await quebrado.get()), { nome: '', avatar: null, atualizadoEm: 0 });
});

test('Leva 128 · preferências: exporta só o que existe e importa só as chaves conhecidas', async () => {
  const a = P.memoryStore(), b = P.memoryStore();
  await a.set('ui.theme', 'light'); await a.set('mesa.maoRecolhida', true); await a.set('deck.x', { id: 'x' });
  const pa = PF.createPerfil({ store: a }), pb = PF.createPerfil({ store: b });
  const prefs = await pa.exportaPreferencias();
  assert.deepEqual(J(prefs), { 'ui.theme': 'light', 'mesa.maoRecolhida': true }, 'listas não vão nas preferências');
  assert.equal(await pb.importaPreferencias({ ...prefs, 'deck.y': 1, 'ui.theme': 'dark' }), 2);
  assert.equal(await b.get('ui.theme'), 'dark'); assert.equal(await b.get('mesa.maoRecolhida'), true); assert.equal(await b.get('deck.y'), null, 'o store devolve null para o que não existe');
  assert.equal(await pb.importaPreferencias(null), 0);
});

test('Leva 128 · backup v3 leva perfil e preferências; v2 continua abrindo; o modelo de listas devolve os extras', async () => {
  const a = P.memoryStore(), b = P.memoryStore();
  const da = D.createDeckStore({ store: a }), ca = D.createCollection({ store: a }), pa = PF.createPerfil({ store: a });
  await da.save({ name: 'Elfos', format: 'pauper', entries: [{ name: 'Forest', qty: 1, zone: 'main' }] });
  await pa.set({ nome: 'Gui', avatar: FOTO }); await a.set('ui.theme', 'light');
  const texto = await da.exportAll(ca, { perfil: await pa.get(), prefs: await pa.exportaPreferencias() });
  const dados = JSON.parse(texto);
  assert.equal(dados.version, 3); assert.equal(dados.perfil.nome, 'Gui'); assert.equal(dados.prefs['ui.theme'], 'light');
  const db = D.createDeckStore({ store: b }), cb = D.createCollection({ store: b }), pb = PF.createPerfil({ store: b });
  const r = await db.importAll(texto, cb);
  assert.equal(r.decks, 1); assert.equal(r.perfil.nome, 'Gui'); assert.equal(r.prefs['ui.theme'], 'light');
  await pb.set({ nome: r.perfil.nome, avatar: r.perfil.avatar }); await pb.importaPreferencias(r.prefs);
  assert.equal((await pb.get()).avatar, FOTO); assert.equal(await b.get('ui.theme'), 'light');
  // v2 (sem extras): versão 2, e a importação não traz perfil nem preferências
  const v2 = JSON.parse(await da.exportAll(ca)); assert.equal(v2.version, 2); assert.equal('perfil' in v2, false);
  const r2 = await db.importAll(JSON.stringify(v2), cb); assert.equal(r2.perfil, null); assert.equal(r2.prefs, null);
});

test('Leva 149 · enquadrar a foto: zoom 1 é o quadrado central; o recorte nunca sai da foto', () => {
  const r = (q) => ({ sx: Math.round(q.sx), sy: Math.round(q.sy), lado: Math.round(q.lado) });
  assert.deepEqual(r(PF.enquadra(400, 300)), { sx: 50, sy: 0, lado: 300 }, 'sem ajuste, igual ao recorte central');
  assert.deepEqual(r(PF.enquadra(400, 300, { zoom: 2 })), { sx: 125, sy: 75, lado: 150 }, 'zoom 2 corta metade, no centro');
  assert.deepEqual(r(PF.enquadra(400, 300, { zoom: 1, cx: 0, cy: 0 })), { sx: 0, sy: 0, lado: 300 }, 'centro fora da foto encosta na borda');
  assert.deepEqual(r(PF.enquadra(400, 300, { zoom: 1, cx: 9999, cy: 9999 })), { sx: 100, sy: 0, lado: 300 });
  assert.equal(PF.enquadra(400, 300, { zoom: 99 }).zoom, PF.ZOOM_MAX, 'zoom limitado em cima');
  assert.equal(PF.enquadra(400, 300, { zoom: 0.2 }).zoom, 1, 'e em baixo: nunca sobra faixa vazia');
  assert.equal(PF.enquadra(400, 300, { zoom: NaN, cx: NaN }).zoom, 1, 'entrada inválida vira o padrão');
  assert.ok(PF.enquadra(0, 0).lado > 0, 'nunca lado zero');
  // propriedade: para qualquer entrada, o quadrado fica inteiro dentro da foto
  for (const [w, h] of [[400, 300], [300, 400], [200, 200], [3000, 17]]) for (const zoom of [1, 1.5, 2.7, 4, 9]) for (const cx of [-50, 0, w / 3, w, w + 50]) for (const cy of [-50, 0, h / 2, h + 50]) {
    const q = PF.enquadra(w, h, { zoom, cx, cy });
    assert.ok(q.sx >= -1e-9 && q.sy >= -1e-9 && q.sx + q.lado <= w + 1e-9 && q.sy + q.lado <= h + 1e-9, JSON.stringify({ w, h, zoom, cx, cy, q }));
  }
});

test('Leva 149 · arrastar segue o dedo e aproximar mantém parado o ponto sob o dedo', () => {
  // palco de 300 px mostrando 300 px da foto: 1 px de tela = 1 px de foto; arrastar para a direita mostra o que está à esquerda
  let q = PF.enquadra(400, 300);
  q = PF.enquadraMove(400, 300, q, 30, 0, 300); assert.equal(Math.round(q.sx), 20);
  q = PF.enquadraMove(400, 300, q, 500, 0, 300); assert.equal(Math.round(q.sx), 0, 'para na borda');
  q = PF.enquadraMove(400, 300, q, 0, 40, 300); assert.equal(Math.round(q.sy), 0, 'sem folga na vertical, não anda');
  // com zoom 2 o mesmo arrasto anda metade na foto
  q = PF.enquadraMove(400, 300, PF.enquadra(400, 300, { zoom: 2 }), 30, 0, 300); assert.equal(Math.round(q.sx), 110);
  // aproximar no canto de cima à esquerda do palco: aquele ponto da foto continua no canto
  const a = PF.enquadra(400, 300), b = PF.enquadraZoom(400, 300, a, 2, 0, 0);
  assert.equal(Math.round(b.sx), Math.round(a.sx)); assert.equal(Math.round(b.sy), Math.round(a.sy)); assert.equal(Math.round(b.lado), 150);
  // aproximar no centro mantém o centro
  const c = PF.enquadraZoom(400, 300, a, 3);
  assert.equal(Math.round(c.cx), 200); assert.equal(Math.round(c.cy), 150);
  // afastar de volta a 1 nunca deixa o recorte fora da foto
  const d = PF.enquadraZoom(400, 300, PF.enquadra(400, 300, { zoom: 4, cx: 390, cy: 290 }), 1);
  assert.ok(d.sx + d.lado <= 400 && d.sy + d.lado <= 300);
});

// ---------------------------------------------------------------------------------------------------------------
// Leva A-261 · T6a · documento de perfil (relato #6): registro de chaves, store vigiado, documento, backup.
import { HTML } from './_load.mjs';
/** As 18 preferências que o backup v3 levava ANTES desta leva. Lista congelada: existe para ser antiga. */
const PREFS_ANTES_DA_A261 = ['ui.theme', 'ui.aparencia', 'mesa.maoRecolhida', 'collection.prefs', 'collection.views', 'decks.reservaVista', 'etiquetas', 'mesa.som', 'mesa.verJogadas', 'mesa.manaManual', 'mesa.paradas', 'fichas.escolhas', 'partidas.historico', 'terrenos.escolhas', 'noticias.idiomas', 'noticias.filtro', 'noticias.guardadas', 'relatos.itens'];
/** Backup v3 feito por uma versão anterior a esta leva (formato congelado). */
const BACKUP_V3_ANTIGO = JSON.stringify({ kind: 'estante.backup', version: 3, decks: [{ id: 'd1', name: 'Elfos', format: 'pauper', entries: [{ name: 'Forest', qty: 1, zone: 'main' }] }], owned: {}, ownedNames: {}, items: [],
  perfil: { nome: 'Gui', avatar: null, atualizadoEm: 5 }, prefs: { 'ui.theme': 'light', 'mesa.som': { ligado: false }, 'etiquetas': [{ id: 'e1', nome: 'Troca' }] } });

test('A-261 · registro: toda chave tem uma classe conhecida, sem repetição; a chave exata vence o prefixo', () => {
  const classes = new Set(['preferencia', 'conteudo', 'aparelho', 'derivado']);
  const nomes = PF.REGISTRO.map(r => r[0]);
  assert.equal(new Set(nomes).size, nomes.length, 'chave repetida no registro');
  for (const [k, c, b] of PF.REGISTRO) { assert.ok(classes.has(c), `${k}: classe ${c}`); assert.equal(typeof b, 'boolean'); if (c === 'aparelho' || c === 'derivado') assert.equal(b, false, `${k} é do aparelho ou derivada: não vai no backup`); if (c === 'preferencia') assert.equal(b, true, `${k} é preferência: vai no backup`); }
  assert.equal(PF.classeDe('ui.theme'), 'preferencia'); assert.equal(PF.classeDe('deck.abc'), 'conteudo'); assert.equal(PF.classeDe('deck.__ids'), 'conteudo');
  assert.equal(PF.classeDe('card.__all'), 'derivado'); assert.equal(PF.classeDe('catalogo.lista.x1'), 'derivado'); assert.equal(PF.classeDe('match.current'), 'aparelho');
  assert.equal(PF.classeDe('perfil'), 'conteudo'); assert.equal(PF.classeDe('perfil.carimbos'), 'aparelho', 'os carimbos viajam dentro do documento, não como chave');
  assert.equal(PF.classeDe('qualquer.coisa'), null); assert.equal(PF.classeDe('decks'), null);
});

test('A-261 · nenhuma preferência que o backup já levava saiu; as que ficavam de fora entraram', () => {
  for (const k of PREFS_ANTES_DA_A261) assert.ok(PF.PREFERENCIAS.includes(k), `${k} saiu do backup`);
  for (const k of ['lista.visao', 'catalogo.visao', 'decks.estatisticas', 'catalogo.estatisticas', 'cartas.rulings', 'mesa.relatarY', 'ui.apresentacao', 'decks.reservaVista.v2']) {
    assert.ok(PF.PREFERENCIAS.includes(k), `${k} continua fora do backup`); assert.ok(PF.DO_DOCUMENTO.includes(k));
  }
  for (const k of ['etiquetas', 'partidas.historico', 'noticias.guardadas', 'relatos.itens']) assert.equal(PF.DO_DOCUMENTO.includes(k), false, `${k} é conteúdo: não entra no documento de preferências`);
});

test('A-261 · contrato: toda chave de armazenamento escrita no index.html está no registro', () => {
  const achadas = new Set();
  // (a) literal direto numa chamada do store ou dos leitores locais
  for (const m of HTML.matchAll(/(?:[sS]tore|\bst|\ble|\bgrava)\.?(?:get|set|remove|keys)?\(\s*'([a-z]+(?:\.[A-Za-z0-9_]+)+\.?)'/g)) achadas.add(m[1]);
  // (b) constante de chave: NOME = '…' ou NOME = x => '…' + x
  for (const m of HTML.matchAll(/\b[A-Z_]*(?:KEY|CHAVE|ESCOLHAS|OPCOES|INDEX|ALL|IDS|OWNED|NAMES|ITEMS|PENDING|VIEWS|PREFS|PARTES|APAR|RULINGS|RULINGS_ABERTO|DECK)[A-Z_]*\s*=\s*(?:\w+\s*=>\s*)?'([a-z]+(?:\.[A-Za-z0-9_]+)*\.?)'/g)) achadas.add(m[1]);
  const NAO_E_DO_STORE = new Set(['estante.abertura']); // sessionStorage da abertura (src/ui/brand.js)
  assert.ok(achadas.size >= 45, `a varredura achou só ${achadas.size} chaves: a expressão deixou de casar com o código`);
  for (const k of ['ui.theme', 'deck.', 'card.__all', 'mesa.relatarY', 'catalogo.lista.', 'perfil', 'conta', 'etiquetas', 'noticias.colecoes', 'scanner.zoom']) assert.ok(achadas.has(k), `a varredura não achou ${k}`);
  const fora = [...achadas].filter(k => !NAO_E_DO_STORE.has(k) && !PF.classeDe(k.endsWith('.') ? k + 'x' : k));
  assert.deepEqual(J(fora), [], 'chave nova sem classe: registre em REGISTRO (src/data/perfil.js) e diga se vai no backup');
});

test('A-261 · store vigiado cumpre o contrato da plataforma e carimba só preferência', async () => {
  let t = 1000; const avisos = [];
  const cru = P.memoryStore(), s = PF.vigiaStore(cru, { agora: () => t, aoDesconhecer: k => avisos.push(k) });
  for (const m of P.PLATFORM_CONTRACT.store) assert.equal(typeof s[m], 'function', m);
  assert.equal(s.kind, 'memory');
  await s.set('ui.theme', 'dark'); await s.set('deck.a', { id: 'a' }); await s.set('card.forest', { ts: 1 }); await s.set('match.current', { kind: 'estante.match' });
  assert.deepEqual(J(await s.carimbos()), { 'ui.theme': 1000 }, 'listas, cache e partida não carimbam');
  assert.equal(await s.get('ui.theme'), 'dark'); assert.deepEqual(J(await s.keys('deck.')), ['deck.a']);
  await s.set('ui.theme', 'light'); assert.equal((await s.carimbos())['ui.theme'], 1001, 'mesmo instante do relógio: o carimbo ainda cresce');
  t = 2000; await s.remove('ui.theme'); assert.equal(await s.get('ui.theme'), null); assert.equal((await s.carimbos())['ui.theme'], 2000, 'apagar também é uma mudança');
  // escritas ao mesmo tempo não perdem carimbo
  t = 3000; await Promise.all(['mesa.som', 'mesa.verJogadas', 'lista.visao', 'catalogo.visao'].map(k => s.set(k, 1)));
  const c = await s.carimbos(); for (const k of ['mesa.som', 'mesa.verJogadas', 'lista.visao', 'catalogo.visao']) assert.equal(c[k], 3000, k);
  assert.deepEqual(J(await cru.get('perfil.carimbos')), J(c), 'os carimbos ficam guardados');
  // chave sem classe: avisa uma vez, e a escrita acontece mesmo assim (nunca se perde dado por causa do aviso)
  await s.set('nova.coisa', 1); await s.set('nova.coisa', 2); await s.remove('outra.coisa');
  assert.deepEqual(J(avisos), ['nova.coisa', 'outra.coisa']); assert.equal(await s.get('nova.coisa'), 2); assert.deepEqual(J(s.semClasse()), ['nova.coisa', 'outra.coisa']);
  // um segundo vigia sobre o mesmo store lê os carimbos guardados
  assert.equal((await PF.vigiaStore(cru).carimbos())['mesa.som'], 3000);
  // store que falha ao guardar o carimbo não derruba a escrita da preferência
  const manco = { ...P.memoryStore() }; const setDeFato = manco.set; manco.set = async (k, v) => { if (k === 'perfil.carimbos') throw new Error('cota'); return setDeFato(k, v); };
  const sm = PF.vigiaStore(manco); assert.equal(await sm.set('ui.theme', 'dark'), true); assert.equal(await sm.get('ui.theme'), 'dark');
});

test('A-261 · migração: aparelho de antes desta leva (preferências sem carimbo) vira documento sem perder nada, e repetir não muda', async () => {
  const cru = P.memoryStore();
  // estado de um aparelho publicado antes da A-261: escrito direto no store, sem carimbos
  await cru.set('perfil', { nome: 'Gui', avatar: FOTO, atualizadoEm: 50 }); await cru.set('ui.theme', 'light'); await cru.set('ui.aparencia', { destaque: 'latao', vibracao: false });
  await cru.set('collection.views', [{ id: 'v1', nome: 'Raras' }]); await cru.set('lista.visao', 'densa'); await cru.set('deck.a', { id: 'a' }); await cru.set('relatos.itens', [{ id: 'r1' }]);
  const antes = J(Object.fromEntries(await Promise.all((await cru.keys()).map(async k => [k, await cru.get(k)]))));
  const p = PF.createPerfil({ store: PF.vigiaStore(cru, { agora: () => 900 }) });
  const d1 = J(await p.documento()), d2 = J(await p.documento());
  assert.deepEqual(d1, d2, 'montar o documento duas vezes dá o mesmo');
  assert.equal(d1.kind, 'estante.perfil'); assert.equal(d1.version, 1);
  assert.deepEqual(d1.pessoa, { nome: 'Gui', avatar: FOTO, atualizadoEm: 50 });
  assert.deepEqual(d1.preferencias, { 'ui.theme': 'light', 'ui.aparencia': { destaque: 'latao', vibracao: false }, 'collection.views': [{ id: 'v1', nome: 'Raras' }], 'lista.visao': 'densa' }, 'só as escolhas; lista e relato ficam de fora');
  assert.deepEqual(d1.carimbos, { 'ui.theme': 0, 'ui.aparencia': 0, 'collection.views': 0, 'lista.visao': 0 }, 'escolha anterior à leva vale 0: qualquer mudança datada vence, e nada é chutado');
  assert.equal(d1.atualizadoEm, 50);
  const depois = J(Object.fromEntries(await Promise.all((await cru.keys()).map(async k => [k, await cru.get(k)]))));
  assert.deepEqual(depois, antes, 'montar o documento não escreve nada no aparelho');
});

test('A-261 · aplicar documento: por chave vence a escolha mais nova, empate fica com o aparelho, e o resto é ignorado', async () => {
  let ta = 100, tb = 100;
  const a = PF.vigiaStore(P.memoryStore(), { agora: () => ta }), b = PF.vigiaStore(P.memoryStore(), { agora: () => tb });
  const pa = PF.createPerfil({ store: a, agora: () => ta }), pb = PF.createPerfil({ store: b, agora: () => tb });
  await a.set('ui.theme', 'light'); await a.set('mesa.som', { ligado: false }); await pa.set({ nome: 'Gui' });           // A em 100
  tb = 200; await b.set('ui.theme', 'dark'); tb = 50; await b.set('mesa.som', { ligado: true }); await b.set('lista.visao', 'pilhas'); // B: tema mais novo, som mais velho
  const docA = J(await pa.documento());
  const r = await pb.aplicaDocumento({ ...docA, preferencias: { ...docA.preferencias, 'deck.x': { id: 'x' }, 'conta': { email: 'x@y' } }, carimbos: { ...docA.carimbos, 'deck.x': 999 } });
  assert.deepEqual(J(r.aplicadas), ['mesa.som']); assert.deepEqual(J(r.mantidas), ['ui.theme']); assert.deepEqual(J(r.ignoradas).sort(), ['conta', 'deck.x']);
  assert.equal(r.pessoa, true); assert.equal(r.conferido, true);
  assert.equal(await b.get('ui.theme'), 'dark', 'a escolha mais nova do aparelho fica'); assert.deepEqual(J(await b.get('mesa.som')), { ligado: false });
  assert.equal(await b.get('lista.visao'), 'pilhas', 'o que o documento não traz não é apagado');
  assert.equal(await b.get('deck.x'), null, 'documento não escreve lista'); assert.equal(await b.get('conta'), null);
  assert.equal((await b.carimbos())['mesa.som'], 100, 'guarda o instante de quem escolheu, não o da aplicação');
  assert.equal((await pb.get()).nome, 'Gui');
  // aplicar de novo não muda nada (idempotente); e a volta B → A leva só o que B tem de mais novo
  const r2 = await pb.aplicaDocumento(docA); assert.deepEqual(J(r2.aplicadas), []); assert.equal(r2.pessoa, false);
  const r3 = await pa.aplicaDocumento(J(await pb.documento())); assert.deepEqual(J(r3.aplicadas).sort(), ['lista.visao', 'ui.theme']);
  assert.deepEqual(J((await pa.documento()).preferencias), J((await pb.documento()).preferencias), 'depois da ida e da volta os dois aparelhos têm as mesmas escolhas');
  // escolha apagada (carimbo sem valor) apaga do outro lado
  ta = 500; await a.remove('lista.visao'); await pb.aplicaDocumento(J(await pa.documento())); assert.equal(await b.get('lista.visao'), null);
  // formato estranho é recusado sem tocar em nada
  await assert.rejects(() => pb.aplicaDocumento({ kind: 'estante.backup', version: 1 }), /formato-desconhecido/);
  await assert.rejects(() => pb.aplicaDocumento({ kind: 'estante.perfil', version: 2 }), /versao-desconhecida/);
  await assert.rejects(() => pb.aplicaDocumento(null), /formato-desconhecido/);
  assert.equal(await b.get('ui.theme'), 'dark');
});

test('A-261 · "guardou" precisa ser verdade: store que engole a escrita é denunciado por `conferido`', async () => {
  const cru = P.memoryStore(); const surdo = { ...cru, set: async (k, v) => (k === 'ui.theme' ? true : cru.set(k, v)) };
  const p = PF.createPerfil({ store: PF.vigiaStore(surdo) });
  const r = await p.aplicaDocumento({ kind: 'estante.perfil', version: 1, preferencias: { 'ui.theme': 'dark', 'mesa.som': { ligado: true } }, carimbos: { 'ui.theme': 10, 'mesa.som': 10 } });
  assert.deepEqual(J(r.aplicadas).sort(), ['mesa.som', 'ui.theme']); assert.equal(r.conferido, false);
});

test('A-261 · backup: todas as preferências vão e voltam; o backup v3 antigo continua restaurando', async () => {
  const a = PF.vigiaStore(P.memoryStore()), b = PF.vigiaStore(P.memoryStore());
  const da = D.createDeckStore({ store: a }), ca = D.createCollection({ store: a }), pa = PF.createPerfil({ store: a });
  let i = 0; for (const k of PF.PREFERENCIAS) await a.set(k, { n: ++i, de: k });
  await pa.set({ nome: 'Gui', avatar: FOTO });
  const texto = await da.exportAll(ca, { perfil: await pa.get(), prefs: await pa.exportaPreferencias() });
  assert.equal(JSON.parse(texto).version, 3, 'o formato do arquivo não muda: `prefs` continua um mapa chave → valor, só com mais chaves');
  assert.deepEqual(Object.keys(JSON.parse(texto).prefs).sort(), [...PF.PREFERENCIAS].sort());
  const db = D.createDeckStore({ store: b }), cb = D.createCollection({ store: b }), pb = PF.createPerfil({ store: b });
  const r = await db.importAll(texto, cb); await pb.set({ nome: r.perfil.nome, avatar: r.perfil.avatar });
  assert.equal(await pb.importaPreferencias(r.prefs), PF.PREFERENCIAS.length);
  for (const k of PF.PREFERENCIAS) assert.deepEqual(J(await b.get(k)), J(await a.get(k)), k);
  assert.deepEqual(J((await pb.documento()).preferencias), J((await pa.documento()).preferencias));
  assert.deepEqual(J(b.semClasse()), [], 'o backup não escreve chave fora do registro');
  // arquivo antigo num aparelho novo
  const c = PF.vigiaStore(P.memoryStore()), dc = D.createDeckStore({ store: c }), cc = D.createCollection({ store: c }), pc = PF.createPerfil({ store: c });
  const rc = await dc.importAll(BACKUP_V3_ANTIGO, cc); assert.equal(rc.decks, 1); assert.equal(await pc.importaPreferencias(rc.prefs), 3);
  assert.equal(await c.get('ui.theme'), 'light'); assert.deepEqual(J(await c.get('etiquetas')), [{ id: 'e1', nome: 'Troca' }]); assert.deepEqual(J(c.semClasse()), []);
});
