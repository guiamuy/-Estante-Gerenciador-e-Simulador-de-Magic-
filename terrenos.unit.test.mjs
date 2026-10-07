// I6 · terrenos do seu jeito e artes em lotes de 6 (fichas e terrenos usam a mesma galeria).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
const { terrenos: TR, fichas: FX, platform: P } = loadModules();
const J = x => JSON.parse(JSON.stringify(x));

test('I6 · lista de terrenos: os seis básicos e os seis nevados, na ordem WUBRG e incolor, com ícone, cor e descrição', () => {
  const l = TR.listaDeTerrenos(['Forest', 'snow-covered island', 'Sol Ring']);
  assert.deepEqual(J(l.map(x => x.nome)), ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes', 'Snow-Covered Plains', 'Snow-Covered Island', 'Snow-Covered Swamp', 'Snow-Covered Mountain', 'Snow-Covered Forest', 'Snow-Covered Wastes']);
  assert.deepEqual(J(l.slice(0, 6).map(x => [x.icone, x.cores[0]])), [['planicie', 'W'], ['ilha', 'U'], ['pantano', 'B'], ['montanha', 'R'], ['floresta', 'G'], ['ermo', 'C']]);
  assert.deepEqual(J(l.filter(x => x.suaLista).map(x => x.chave)), ['forest', 'snow-covered island'], 'os das minhas listas vêm marcados');
  assert.equal(l[4].descricao, 'Terreno básico · Floresta'); assert.equal(l[8].descricao, 'Terreno básico · Pântano nevado'); assert.equal(l[11].descricao, 'Terreno básico · Ermos nevados');
  assert.equal(TR.consultaDoTerreno(l[10].def), '!"Snow-Covered Forest"');
  assert.equal(new Set(l.map(x => x.chave)).size, 12);
});

test('I6 · lotes de 6: as próximas que ainda não baixei, sem repetir, até o teto; e quantas ficam para depois', () => {
  const c = n => Array.from({ length: n }, (_, i) => ({ id: 'a' + i }));
  let r = FX.proximoLote([], c(20));
  assert.deepEqual(J(r.novas.map(x => x.id)), ['a0', 'a1', 'a2', 'a3', 'a4', 'a5']); assert.equal(r.restam, 14);
  r = FX.proximoLote(c(6), c(20)); assert.deepEqual(J(r.novas.map(x => x.id)), ['a6', 'a7', 'a8', 'a9', 'a10', 'a11']); assert.equal(r.restam, 8);
  r = FX.proximoLote(c(18), c(20)); assert.equal(r.novas.length, 2); assert.equal(r.restam, 0, 'acabaram');
  r = FX.proximoLote(c(4), c(4)); assert.deepEqual([r.novas.length, r.restam], [0, 0]);
  r = FX.proximoLote(c(10), c(40), { teto: 12 }); assert.deepEqual([r.novas.length, r.restam], [2, 0], 'o teto corta o lote e encerra');
  r = FX.proximoLote([{ id: 'velha' }], [{ id: 'a0' }, { id: 'a0' }, null, { id: 'velha' }, { id: 'a1' }]); assert.deepEqual(J(r.novas.map(x => x.id)), ['a0', 'a1']);
  assert.deepEqual(J(FX.proximoLote(null, null)), { novas: [], restam: 0 }); assert.equal(FX.LOTE, 6);
});

test('I6 · serviço dos terrenos: uma busca, 6 artes por pedido, só com internet; o baixado fica; escolher guarda; a carta da partida usa a arte', async () => {
  const pedidos = [], aquecidas = [];
  const arte = i => ({ id: 'f' + i, name: 'Forest', set: 's' + i, set_name: 'Edição ' + i, collector_number: String(i), prices: { usd: '1' }, uri: 'u', images: { small: `i${i}/s`, normal: `i${i}/n`, large: `i${i}/l` }, faces: [] });
  const scryfall = { async search(q, o) { pedidos.push([q, o.unique, o.order]); return Array.from({ length: 14 }, (_, i) => arte(i)); } };
  const store = P.memoryStore(); let rede = true;
  const images = { available: true, async warm(urls) { aquecidas.push(...urls); return urls.length; } };
  const tr = TR.createTerrenos({ store, scryfall, images, temRede: () => rede });
  const forest = TR.TERRENOS.find(t => t.name === 'Forest');
  assert.equal(tr.temMais('forest', 0), true, 'antes de buscar, pode haver');
  let ops = await tr.mais(forest);
  assert.deepEqual(J(pedidos), [['!"Forest"', 'art', 'released']], 'uma por arte, da mais recente');
  // I7 (leva 206) · expectativa mudou: liberar o lote não baixa nada; a tela baixa ao mostrar e `guardar` confirma depois
  assert.equal(ops.length, 6); assert.equal(aquecidas.length, 0, 'liberar o lote não espera download');
  await tr.guardar(ops); assert.equal(aquecidas.length, 12, 'confirmar guarda só as 6 do lote (pequena e nítida)');
  assert.deepEqual(J(Object.keys(ops[0]).sort()), ['collector_number', 'faces', 'id', 'images', 'name', 'set', 'set_name'], 'só o que a mesa precisa fica guardado');
  assert.equal(tr.temMais('forest', 6), true);
  ops = await tr.mais(forest); assert.equal(ops.length, 12); assert.equal(pedidos.length, 1, 'o segundo lote não volta à Scryfall');
  ops = await tr.mais(forest); assert.equal(ops.length, 14); assert.equal(tr.temMais('forest', 14), false, 'acabaram as artes');
  await tr.guardar(ops.slice(6)); assert.equal(aquecidas.length, 28);
  // sem internet: pedir mais recusa; o que já foi baixado continua guardado
  rede = false; await assert.rejects(tr.mais(forest), /sem-rede/); assert.equal((await tr.estado()).opcoes.forest.length, 14);
  // escolher e voltar ao padrão
  aquecidas.length = 0; await tr.escolher(forest, ops[3]);
  const escolhas = (await tr.estado()).escolhas; assert.equal(escolhas.forest.id, 'f3'); assert.ok(aquecidas.includes('i3/l'), 'a grande da escolhida é baixada');
  const carta = { id: 'padrao', name: 'Forest', type_line: 'Basic Land — Forest', oracle_text: '({T}: Add {G}.)', images: { small: 'p/s', normal: 'p/n' }, faces: [] };
  const naMesa = TR.cartaComTerreno(carta, escolhas);
  assert.deepEqual([naMesa.images.normal, naMesa.images.small, naMesa.oracle_text, naMesa.name], ['i3/n', 'i3/s', '({T}: Add {G}.)', 'Forest']);
  assert.equal(TR.cartaComTerreno({ ...carta, name: 'Island' }, escolhas).images.normal, 'p/n', 'outro terreno segue no padrão');
  assert.equal(TR.cartaComTerreno(carta, null), carta); assert.equal(TR.cartaComTerreno(null, escolhas), null);
  await tr.escolher(forest, null); assert.equal((await tr.estado()).escolhas.forest, undefined);
});

test('I6 · as fichas também vêm de 6 em 6', async () => {
  const carta = i => ({ id: 'c' + i, name: 'Clue', type_line: 'Token Artifact — Clue', set: 's', collector_number: String(i), images: { small: `a${i}/s`, normal: `a${i}/n`, large: `a${i}/l`, art: 'a' + i } });
  const store = P.memoryStore(); const aquecidas = [];
  const fx = FX.createFichas({ store, scryfall: { async search() { return Array.from({ length: 9 }, (_, i) => carta(i)); } }, images: { available: true, async warm(u) { aquecidas.push(...u); } }, temRede: () => true });
  const clue = { name: 'Clue', types: ['artifact'], colors: [] };
  assert.equal((await fx.buscar(clue)).length, 6, 'o primeiro pedido traz 6'); assert.equal(aquecidas.length, 0); assert.equal(fx.temMais('ficha:clue', 6), true);
  assert.equal((await fx.mais(clue)).length, 9); assert.equal(fx.temMais('ficha:clue', 9), false);
});

test('I7 · rápido: a busca fica guardada (pedir mais depois de reabrir não volta à Scryfall) e escolher responde antes de a imagem descer, com prioridade', async () => {
  const arte = i => ({ id: 'f' + i, name: 'Forest', set: 's' + i, set_name: 'E' + i, collector_number: String(i), images: { small: `i${i}/s`, normal: `i${i}/n`, large: `i${i}/l` }, faces: [] });
  let buscas = 0; const scryfall = { async search() { buscas++; return Array.from({ length: 20 }, (_, i) => arte(i)); } };
  const store = P.memoryStore(); const pedidos = []; let solta = null;
  const images = { available: true, warm(urls, o) { pedidos.push({ urls, ja: !!(o && o.ja) }); return new Promise(r => { solta = r; }); } };
  const forest = TR.TERRENOS.find(t => t.name === 'Forest');
  const a = TR.createTerrenos({ store, scryfall, images, temRede: () => true });
  assert.equal((await a.mais(forest)).length, 6); assert.equal(buscas, 1); assert.equal(pedidos.length, 0, 'nenhum download segura a liberação do lote');
  // app reaberto: outra instância, mesmo aparelho
  const b = TR.createTerrenos({ store, scryfall, images, temRede: () => true });
  assert.equal((await b.mais(forest)).length, 12); assert.equal(buscas, 1, 'as candidatas vieram do aparelho');
  assert.equal(b.temMais('forest', 12), true);
  // escolher: a resposta chega com o download ainda em curso; o aviso de "guardada" só depois
  let guardada = false; const ops = (await b.estado()).opcoes.forest;
  const escolhas = await b.escolher(forest, ops[2], { aoGuardar: () => { guardada = true; } });
  assert.equal(escolhas.forest.id, 'f2'); assert.equal(guardada, false, 'respondeu sem esperar a imagem');
  assert.deepEqual(J(pedidos.at(-1)), { urls: ['i2/n', 'i2/l', 'i2/s'], ja: true }, 'a imagem da escolhida passa na frente da fila');
  solta(); await new Promise(r => setTimeout(r, 0)); assert.equal(guardada, true);
  // voltar ao padrão não baixa nada e avisa na hora
  let voltou = false; await b.escolher(forest, null, { aoGuardar: () => { voltou = true; } }); await new Promise(r => setTimeout(r, 0)); assert.equal(voltou, true);
});

test('I7 · na partida, a arte escolhida vale para terreno e para ficha, em qualquer lista: só a imagem muda', () => {
  const clue = { name: 'Clue', type_line: 'Token Artifact — Clue', layout: 'token', oracle_text: 'x', images: { normal: 'padrao/n' } };
  const bird = { name: 'Bird', type_line: 'Token Creature — Bird', power: '1', toughness: '1', images: { normal: 'b/n' } };
  const fichas = { 'ficha:clue': { id: 'c2', images: { normal: 'c2/n', small: 'c2/s' } }, 'ficha:bird 2/2': { id: 'b2', images: { normal: 'b22/n' } } };
  const a = TR.cartaComFicha(clue, fichas);
  assert.deepEqual([a.images.normal, a.oracle_text, a.name], ['c2/n', 'x', 'Clue']); assert.equal(clue.images.normal, 'padrao/n', 'não muda a carta recebida');
  assert.equal(TR.cartaComFicha(bird, fichas), bird, 'a ficha 1/1 não pega a arte escolhida para a 2/2');
  assert.equal(TR.cartaComFicha({ ...bird, power: '2', toughness: '2' }, fichas).images.normal, 'b22/n');
  assert.equal(TR.cartaComFicha({ name: 'Clue', type_line: 'Artifact', images: { normal: 'carta/n' } }, fichas).images.normal, 'carta/n', 'carta de verdade com o mesmo nome não é ficha');
  assert.equal(TR.cartaComFicha(clue, null), clue); assert.equal(TR.cartaComFicha(null, fichas), null);
  // as duas juntas, como a mesa usa
  const forest = { name: 'Forest', type_line: 'Basic Land — Forest', images: { normal: 'f/n' } };
  const artes = { terrenos: { forest: { id: 'f9', images: { normal: 'f9/n' } } }, fichas };
  assert.equal(TR.cartaComEscolhas(forest, artes).images.normal, 'f9/n'); assert.equal(TR.cartaComEscolhas(clue, artes).images.normal, 'c2/n');
  assert.equal(TR.cartaComEscolhas(forest, {}), forest); assert.equal(TR.cartaComEscolhas(null, artes), null);
});

test('J6 · a arte escolhida vale só para quem a escolheu: o bot e o oponente online ficam na arte padrão', () => {
  assert.equal(TR.valeArteDoUsuario(0, { assentoDoBot: 1 }), true, 'meu lado contra o bot');
  assert.equal(TR.valeArteDoUsuario(1, { assentoDoBot: 1 }), false, 'o bot joga com a arte padrão');
  assert.equal(TR.valeArteDoUsuario(0, { assentoDoBot: 0 }), false, 'em qualquer assento');
  assert.equal(TR.valeArteDoUsuario(1, {}), true, 'a dois no mesmo aparelho: os dois lados são do aparelho');
  assert.equal(TR.valeArteDoUsuario(1, { meuAssentoOnline: 1 }), true); assert.equal(TR.valeArteDoUsuario(0, { meuAssentoOnline: 1 }), false, 'online: só o meu assento');
  assert.equal(TR.valeArteDoUsuario(null, { assentoDoBot: 1 }), true, 'sem saber de quem é, vale'); assert.equal(TR.valeArteDoUsuario(undefined), true);
});
