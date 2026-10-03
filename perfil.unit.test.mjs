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
