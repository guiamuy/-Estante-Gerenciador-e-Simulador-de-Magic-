// N2 · modelo puro da tela de Notícias (sem navegador): idiomas, série a ler, tempo relativo, junção de páginas.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';

const N = loadModules().noticias;
const lista = v => JSON.parse(JSON.stringify(v));
const it = (n, extra = {}) => ({ id: 'n' + n, titulo: 'Notícia ' + n, resumo: 'r', url: 'https://f.test/' + n, fonte: 'f', autor: '', data: '2026-10-07T12:00:00Z', imagem: '', idioma: 'en', temas: [], ...extra });

test('N2 · idiomas: a escolha guardada é limpa (só pt e en, na ordem da tela); vazia ou estragada vira os dois; o último ligado não desliga', () => {
  assert.deepEqual(lista(N.idiomasValidos(['en', 'pt'])), ['pt', 'en']); assert.deepEqual(lista(N.idiomasValidos(['en', 'xx'])), ['en']);
  for (const ruim of [null, undefined, [], 'pt', {}, ['zz']]) assert.deepEqual(lista(N.idiomasValidos(ruim)), ['pt', 'en']);
  assert.deepEqual(lista(N.alternaIdioma(['pt', 'en'], 'en')), ['pt']); assert.deepEqual(lista(N.alternaIdioma(['en'], 'pt')), ['pt', 'en']);
  const so = ['pt']; assert.equal(N.alternaIdioma(so, 'pt'), so, 'o último não desliga: a mesma lista volta'); assert.equal(N.alternaIdioma(so, 'xx'), so);
  assert.deepEqual(lista(N.IDIOMAS.map(i => [i[0], i[1], i[2]])), [['pt', 'Português', 'br'], ['en', 'English', 'us']]);
});

test('N2 · série a ler: os dois idiomas leem a geral; um só lê a série dele; índice antigo (sem séries) lê a geral e filtra no aparelho', () => {
  const indice = { total: 83, paginas: 5, idiomas: { pt: { total: 12, paginas: 1 }, en: { total: 71, paginas: 4 } } };
  assert.deepEqual(lista(N.planoDeLeitura(indice, ['pt', 'en'])), { prefixo: '', paginas: 5, total: 83, filtra: false });
  assert.deepEqual(lista(N.planoDeLeitura(indice, ['pt'])), { prefixo: 'pt-', paginas: 1, total: 12, filtra: false });
  assert.deepEqual(lista(N.planoDeLeitura({ total: 83, paginas: 5 }, ['en'])), { prefixo: '', paginas: 5, total: null, filtra: true });
  assert.deepEqual(lista(N.planoDeLeitura({ total: 0, paginas: 0, idiomas: { pt: { total: 0, paginas: 0 } } }, ['pt'])), { prefixo: 'pt-', paginas: 0, total: 0, filtra: false });
});

test('N2 · tempo relativo: agora, minutos, horas, ontem, dias e, depois de uma semana, a data; data ilegível não escreve nada', () => {
  const agora = Date.parse('2026-10-07T18:00:00Z'), ha = ms => new Date(agora - ms).toISOString();
  assert.deepEqual([ha(20e3), ha(12 * 60e3), ha(59 * 60e3), ha(3 * 3600e3), ha(23.9 * 3600e3), ha(30 * 3600e3), ha(4 * 86400e3)].map(d => N.tempoRelativo(d, agora)),
    ['agora', 'há 12 min', 'há 59 min', 'há 3 h', 'há 23 h', 'ontem', 'há 4 dias']);
  assert.match(N.tempoRelativo(ha(9 * 86400e3), agora), /^\d\d\/\d\d$/);
  assert.equal(N.tempoRelativo('ontem à tarde', agora), ''); assert.equal(N.tempoRelativo(new Date(agora + 3600e3).toISOString(), agora), 'agora', 'relógio adiantado não vira "há -60 min"');
});

test('N2 · juntar páginas: não repete notícia, descarta a que não tem endereço http(s), título ou id, capa só https, e filtra por idioma quando pedido', () => {
  const a = N.junta([], [it(1), it(2, { idioma: 'pt' }), it(3, { url: 'javascript:alert(1)' }), it(4, { titulo: ' ' }), { ...it(5), id: '' }, null, 'x', it(6, { imagem: 'http://f.test/a.jpg' }), it(7, { imagem: 'https://f.test/a.jpg', idioma: 'zz' })]);
  assert.deepEqual(lista(a.map(i => [i.id, i.idioma, i.imagem])), [['n1', 'en', ''], ['n2', 'pt', ''], ['n6', 'en', ''], ['n7', 'en', 'https://f.test/a.jpg']]);
  const b = N.junta(a, [it(2), it(8), it(9, { idioma: 'pt' })]);
  assert.deepEqual(lista(b.map(i => i.id)), ['n1', 'n2', 'n6', 'n7', 'n8', 'n9']); assert.equal(a.length, 4, 'a lista recebida não é mudada');
  assert.deepEqual(lista(N.junta([], [it(1), it(2, { idioma: 'pt' })], { idiomas: ['pt'] }).map(i => i.id)), ['n2']);
  assert.deepEqual(lista(N.junta([it(1)], null).map(i => i.id)), ['n1']);
});

test('N2 · forma na coluna: a primeira é o destaque; a cada seis, uma com capa vira cartão cheio; o resto é linha', () => {
  const com = it(1, { imagem: 'https://f.test/a.jpg' }), sem = it(2);
  assert.deepEqual([0, 1, 5, 6, 12].map(i => N.formaDe(i, com)), ['destaque', 'linha', 'linha', 'cheio', 'cheio']);
  assert.deepEqual([0, 6].map(i => N.formaDe(i, sem)), ['destaque', 'linha']);
});

test('N2 · serviço: lê índice e páginas do ramo de notícias, recusa resposta ilegível, e guarda o idioma limpo', async () => {
  const pedidos = [], guardado = new Map();
  const respostas = { 'indice.json': { fontes: [], total: 0, paginas: 0 }, 'pt-pagina-2.json': { itens: [it(1)] }, 'pagina-1.json': { nada: true } };
  const busca = async url => { pedidos.push(url); const nome = url.split('/').pop(); return nome in respostas ? { ok: true, json: async () => respostas[nome] } : { ok: false, status: 404 }; };
  const s = N.createNoticias({ busca, base: 'https://b.test/n/', store: { get: async k => guardado.get(k), set: async (k, v) => { guardado.set(k, v); } } });
  assert.equal((await s.indice()).total, 0); assert.equal((await s.pagina('pt-', 2)).length, 1);
  assert.deepEqual(pedidos, ['https://b.test/n/indice.json', 'https://b.test/n/pt-pagina-2.json']);
  await assert.rejects(() => s.pagina('', 1), /ilegível/); await assert.rejects(() => s.pagina('', 9), /HTTP 404/);
  assert.deepEqual(lista(await s.idiomas()), ['pt', 'en']); await s.guardaIdiomas(['en', 'lixo']); assert.deepEqual(lista(guardado.get('noticias.idiomas')), ['en']); assert.deepEqual(lista(await s.idiomas()), ['en']);
  assert.match(N.BASE, /^https:\/\/raw\.githubusercontent\.com\/.+\/noticias\/$/);
});

/* ---------------- N3 · filtros, novas e atualizar ---------------- */
test('N3 · filtro: o guardado é limpo (temas conhecidos na ordem da tela, fontes sem repetir); passa quem tem algum tema ligado E é de alguma fonte ligada', () => {
  assert.deepEqual(lista(N.filtroValido({ temas: ['arena', 'xx', 'commander'], fontes: ['a', 'a', '', 7, 'b'] })), { temas: ['commander', 'arena'], fontes: ['a', 'b'] });
  for (const ruim of [null, undefined, 'x', {}, { temas: 'commander' }]) assert.deepEqual(lista(N.filtroValido(ruim)), { temas: [], fontes: [] });
  assert.equal(N.filtroVazio(N.filtroValido(null)), true); assert.equal(N.contaFiltro(N.filtroValido({ temas: ['pauper'], fontes: ['a', 'b'] })), 3);
  const a = it(1, { temas: ['commander'], fonte: 'x' }), b = it(2, { temas: ['pauper', 'competitivo'], fonte: 'y' }), c = it(3, { temas: [], fonte: 'x' });
  const quem = f => [a, b, c].filter(i => N.passa(i, N.filtroValido(f))).map(i => i.id);
  assert.deepEqual(quem(null), ['n1', 'n2', 'n3']); assert.deepEqual(quem({ temas: ['commander', 'pauper'] }), ['n1', 'n2']);
  assert.deepEqual(quem({ fontes: ['x'] }), ['n1', 'n3']); assert.deepEqual(quem({ temas: ['competitivo'], fontes: ['x'] }), []); assert.deepEqual(quem({ temas: ['commander'], fontes: ['x'] }), ['n1']);
  assert.deepEqual(lista(N.TEMAS.map(t => t[1])), ['Commander', 'Pauper', 'Lançamentos', 'Competitivo', 'Arena']);
});

test('N3 · novas: conta o que é mais novo que a última visita (sem visita, nada é novo), acha a data mais nova e escreve "1 nova", "7 novas", "20+ novas"', () => {
  const its = [it(1, { data: '2026-10-07T12:00:00Z' }), it(2, { data: '2026-10-07T10:00:00Z' }), it(3, { data: '2026-10-06T10:00:00Z' }), it(4, { data: 'ruim' })];
  assert.equal(N.contaNovas(its, '2026-10-07T09:00:00Z'), 2); assert.equal(N.contaNovas(its, '2026-10-07T12:00:00Z'), 0); assert.equal(N.contaNovas(its, ''), 0); assert.equal(N.contaNovas(its, 'lixo'), 0);
  assert.equal(N.maisNova(its), '2026-10-07T12:00:00Z'); assert.equal(N.maisNova(its, '2026-10-08T00:00:00Z'), '2026-10-08T00:00:00Z'); assert.equal(N.maisNova([], 'lixo'), ''); assert.equal(N.maisNova([it(4, { data: 'ruim' })]), '');
  assert.deepEqual([0, 1, 7].map(n => N.rotuloNovas(n)), ['', '1 nova', '7 novas']); assert.equal(N.rotuloNovas(20, { mais: true }), '20+ novas'); assert.equal(N.rotuloNovas(1, { mais: true }), '1+ novas');
});

test('N3 · serviço: filtro e última visita guardados e limpos; atualizar pede sem a cópia do navegador; a Início sabe quantas são novas pela primeira página, nos idiomas e filtros escolhidos', async () => {
  const pedidos = [], guardado = new Map();
  const p1 = [it(1, { data: '2026-10-07T12:00:00Z', idioma: 'pt', temas: ['pauper'] }), it(2, { data: '2026-10-07T11:00:00Z' }), it(3, { data: '2026-10-07T08:00:00Z', idioma: 'pt' })];
  const respostas = { 'indice.json': { fontes: [], total: 3, paginas: 2, idiomas: { pt: { total: 2, paginas: 1 }, en: { total: 1, paginas: 1 } } }, 'pagina-1.json': { itens: p1 }, 'pt-pagina-1.json': { itens: p1.filter(i => i.idioma === 'pt') } };
  const busca = async (url, opt) => { const nome = url.split('/').pop(); pedidos.push([nome, (opt && opt.cache) || '']); return nome in respostas ? { ok: true, json: async () => respostas[nome] } : { ok: false, status: 404 }; };
  const s = N.createNoticias({ busca, base: 'https://b.test/n/', store: { get: async k => guardado.get(k), set: async (k, v) => { guardado.set(k, v); } } });
  assert.deepEqual(lista(await s.novas()), { n: 0, mais: false }); assert.deepEqual(pedidos, [], 'quem nunca abriu Notícias não pede nada à rede');
  assert.equal(await s.vista(), ''); await s.guardaVista('2026-10-07T09:00:00Z'); assert.equal(await s.vista(), '2026-10-07T09:00:00Z');
  guardado.set('noticias.vista', 'lixo'); assert.equal(await s.vista(), ''); await s.guardaVista('2026-10-07T09:00:00Z');
  assert.deepEqual(lista(await s.novas()), { n: 2, mais: false }); assert.deepEqual(pedidos, [['indice.json', ''], ['pagina-1.json', '']]);
  await s.guardaIdiomas(['pt']); assert.deepEqual(lista(await s.novas()), { n: 1, mais: false }); assert.equal(pedidos.at(-1)[0], 'pt-pagina-1.json');
  await s.guardaFiltro({ temas: ['commander', 'lixo'] }); assert.deepEqual(lista(await s.filtro()), { temas: ['commander'], fontes: [] }); assert.deepEqual(lista(await s.novas()), { n: 0, mais: false });
  await s.guardaFiltro(null); await s.guardaIdiomas(['pt', 'en']); await s.guardaVista('2026-10-01T00:00:00Z'); assert.deepEqual(lista(await s.novas()), { n: 3, mais: true }, 'a página inteira é nova e há mais páginas: "3+"');
  pedidos.length = 0; await s.indice({ fresco: true }); await s.pagina('', 1, { fresco: true }); assert.deepEqual(pedidos, [['indice.json', 'no-store'], ['pagina-1.json', 'no-store']]);
});
