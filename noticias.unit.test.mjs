// N1 · coletor de notícias: tudo aqui roda sem rede, sobre feeds de exemplo guardados em `.noticias/`.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as N from './noticias.mjs';

const RSS = await readFile(new URL('./.noticias/rss.xml', import.meta.url), 'utf8');
const ATOM = await readFile(new URL('./.noticias/atom.xml', import.meta.url), 'utf8');
const AGORA = Date.parse('2026-10-07T18:00:00Z');
const A = { id: 'a', nome: 'Exemplo RSS', site: 'https://exemplo.test', feed: 'https://exemplo.test/feed/', idioma: 'en', temas: [] };
const B = { id: 'b', nome: 'Exemplo Atom', site: 'https://atom.test', feed: 'https://atom.test/feed', idioma: 'en', temas: ['arena'] };
const item = (n, dia, extra = {}) => ({ id: 'x' + n, titulo: 'Notícia ' + n, resumo: '', url: 'https://exemplo.test/n' + n, fonte: 'a', autor: '', data: new Date(AGORA - dia * 86400e3 - n * 1000).toISOString(), imagem: '', idioma: 'en', temas: [], ...extra });

test('N1 · RSS: lê os itens com título, endereço, autor, data, categorias e a capa (mídia declarada, ou a primeira imagem do texto que não é pixel)', () => {
  const crus = N.leFeed(RSS);
  assert.equal(crus.length, 8);
  assert.equal(crus[0].url, 'https://exemplo.test/budget-lifegain/?utm_source=rss&utm_medium=feed');
  assert.equal(crus[0].autor, 'Ana Autora'); assert.deepEqual(crus[0].categorias, ['Articles', 'Deck Techs']);
  assert.equal(crus[0].imagem, 'https://exemplo.test/capa-lifegain.jpg', 'o pixel de 1×1 não é capa');
  assert.equal(crus[1].imagem, 'https://exemplo.test/capa-pauper.png'); assert.equal(crus[2].imagem, '');
  assert.equal(crus[7].imagem, '', 'capa em http não entra (quebraria no app em https)');
});

test('N1 · Atom: endereço pelo link alternate, data por published (ou updated), autor, categoria e a imagem de dentro do conteúdo', () => {
  const crus = N.leFeed(ATOM);
  assert.equal(crus.length, 2);
  assert.deepEqual({ ...crus[0], resumoHtml: undefined }, { titulo: 'When Every Card You Mill Is Card Draw | Against the Odds', url: 'https://atom.test/articles/mill-is-card-draw', data: '2026-10-07T15:00:03Z', autor: 'Carla', resumoHtml: undefined, imagem: 'https://atom.test/capa-mill.jpg', categorias: ['Against the Odds'] });
  assert.equal(crus[1].data, '2026-10-06T12:00:00Z'); assert.equal(crus[1].url, 'https://atom.test/articles/set-preview#comentarios');
  assert.throws(() => N.leFeed('<html><body>fora do ar</body></html>'), /não é RSS nem Atom/);
});

test('N1 · normaliza: campos do contrato, título e resumo em texto puro (sem HTML, sem script, sem rodapé do feed), resumo ≤ 280 cortado em palavra', () => {
  const crus = N.leFeed(RSS);
  const it = N.normaliza(crus[0], A, { agora: AGORA });
  assert.deepEqual(Object.keys(it), ['id', 'titulo', 'resumo', 'url', 'fonte', 'autor', 'data', 'imagem', 'idioma', 'temas']);
  assert.equal(it.titulo, 'Budget Lifegain – A Commander Deck Tech', 'entidade dentro de entidade vira o caractere');
  assert.equal(it.resumo, 'Gaining life is fun & cheap. Here’s how to build it.');
  assert.doesNotMatch(JSON.stringify(it), /<|alert|appeared first|Texto inteiro/, 'nada de HTML, script, rodapé nem o corpo da matéria');
  assert.equal(it.data, '2026-10-06T10:30:59.000Z'); assert.equal(it.fonte, 'a'); assert.equal(it.idioma, 'en'); assert.equal(it.autor, 'Ana Autora');
  assert.match(it.id, /^[0-9a-f]{12}$/); assert.deepEqual(it.temas, ['commander']);
  const longo = N.normaliza(crus[1], A, { agora: AGORA });
  assert.ok(longo.resumo.length <= 280 && longo.resumo.endsWith('…') && !/\s…$/.test(longo.resumo), longo.resumo);
  assert.deepEqual(longo.temas, ['pauper', 'competitivo']);
  const pobre = N.normaliza(crus[2], A, { agora: AGORA });
  assert.equal(pobre.imagem, ''); assert.equal(pobre.autor, ''); assert.deepEqual(pobre.temas, []);
  // Atom com título em HTML e tema fixo da fonte
  const at = N.normaliza(N.leFeed(ATOM)[1], B, { agora: AGORA });
  assert.equal(at.titulo, 'New Set Preview: First Look'); assert.equal(at.resumo, 'A first look at the next set.'); assert.deepEqual(at.temas, ['arena', 'lancamentos']);
});

test('N1 · o que não entra, com o motivo: data inválida, data no futuro, outro jogo, endereço que não é http(s), sem título', () => {
  const crus = N.leFeed(RSS); const motivos = [];
  const tenta = c => N.normaliza(c, A, { agora: AGORA, aoDescartar: m => motivos.push(m) });
  assert.equal(tenta(crus[3]), null); assert.equal(tenta(crus[4]), null); assert.equal(tenta(crus[6]), null);
  assert.equal(tenta({ titulo: '  ', url: 'https://exemplo.test/x', data: '2026-10-06T00:00:00Z' }), null);
  assert.equal(tenta({ titulo: 'Do futuro', url: 'https://exemplo.test/f', data: '2026-10-20T00:00:00Z' }), null);
  assert.deepEqual(motivos, ['data inválida', 'outro jogo', 'sem endereço', 'sem título', 'data no futuro']);
  // relógio da fonte um pouco adiantado: entra, com a hora da coleta (nunca "daqui a 2 h" na tela)
  assert.equal(N.normaliza({ titulo: 'Adiantada', url: 'https://exemplo.test/a', data: '2026-10-07T20:00:00Z' }, A, { agora: AGORA }).data, '2026-10-07T18:00:00.000Z');
  assert.equal(N.enderecoSeguro('data:text/html,x'), ''); assert.equal(N.enderecoSeguro('/relativo'), ''); assert.equal(N.enderecoSeguro('http://a.test/x', { soHttps: true }), '');
});

test('N1 · repetidos: mesmo endereço (com rastreio, âncora ou barra a mais) e mesmo título no mesmo dia saem; o primeiro fica; o id não muda com o rastreio', () => {
  assert.equal(N.idDe('https://Exemplo.test/a/?utm_source=x#topo'), N.idDe('https://exemplo.test/a'));
  assert.notEqual(N.idDe('https://exemplo.test/a?p=1'), N.idDe('https://exemplo.test/a?p=2'));
  const a = item(1, 0), b = item(2, 0, { url: a.url + '/?utm_campaign=z' }), c = item(3, 0, { titulo: 'NOTÍCIA 1!' }), d = item(4, 3, { titulo: 'Notícia 1' });
  assert.deepEqual(N.semRepetidos([a, b, c, d]).map(x => x.id), ['x1', 'x4'], 'mesmo título em outro dia é outra notícia');
});

test('N1 · linha do tempo: junta o publicado com o novo, mantém 30 dias, ordena da mais nova para a mais antiga e corta em páginas de 20', () => {
  const antigos = [item(1, 2), item(2, 29), item(3, 31)], novos = [item(4, 0), item(1, 2, { titulo: 'Notícia 1 (editada)' })];
  const linha = N.linhaDoTempo(antigos, novos, { agora: AGORA });
  assert.deepEqual(linha.map(x => x.id), ['x4', 'x1', 'x2']); assert.equal(linha[1].titulo, 'Notícia 1', 'o que já foi publicado não muda de texto');
  const muitos = Array.from({ length: 45 }, (_, i) => item(i + 10, 1));
  assert.deepEqual(N.emPaginas(N.linhaDoTempo([], muitos, { agora: AGORA })).map(p => p.length), [20, 20, 5]);
  assert.deepEqual(N.emPaginas([]), []);
});

test('N1 · monta: índice com total, páginas, hora da coleta e o estado de cada fonte; fonte fora do ar ou ilegível não derruba as outras e mantém o que já tinha', () => {
  const C = { id: 'c', nome: 'Fora do ar', site: 'https://c.test', feed: 'https://c.test/feed', idioma: 'en', temas: [] };
  const D = { id: 'd', nome: 'Ilegível', site: 'https://d.test', feed: 'https://d.test/feed', idioma: 'en', temas: [] };
  const daC = item(99, 1, { fonte: 'c' }), deFonteQueSaiu = item(98, 1, { fonte: 'zz' });
  const { indice, paginas } = N.monta({ fontes: [A, B, C, D], feeds: { a: { xml: RSS }, b: { xml: ATOM }, c: { erro: 'HTTP 503' }, d: { xml: '<html></html>' } }, anteriores: [daC, deFonteQueSaiu], agora: AGORA });
  assert.equal(indice.versao, 1); assert.equal(indice.coletadoEm, '2026-10-07T18:00:00.000Z'); assert.equal(indice.porPagina, 20); assert.equal(indice.dias, 30);
  assert.deepEqual(indice.temas, ['commander', 'pauper', 'arena', 'lancamentos', 'competitivo']);
  assert.deepEqual(indice.fontes.map(f => [f.id, f.ok, f.lidos, f.descartados, f.itens, f.erro]), [
    ['a', true, 5, 3, 3, ''], ['b', true, 2, 0, 2, ''], ['c', false, 0, 0, 1, 'HTTP 503'], ['d', false, 0, 0, 0, 'não é RSS nem Atom']]);
  // RSS: 8 no feed · 3 descartados (data, outro jogo, endereço) · 5 lidos · 1 repetido e 1 fora da janela → 3 na linha do tempo
  assert.equal(indice.total, 6); assert.equal(indice.paginas, 1); assert.equal(paginas.length, 1);
  assert.deepEqual(paginas[0].itens.map(i => i.titulo), ['When Every Card You Mill Is Card Draw | Against the Odds', 'Notícia 99', 'New Set Preview: First Look', 'Budget Lifegain – A Commander Deck Tech', 'Pauper Metagame Update', 'Sem imagem e sem autor']);
  assert.ok(!paginas[0].itens.some(i => i.fonte === 'zz'), 'notícia de fonte que saiu da lista não fica');
  assert.deepEqual([paginas[0].versao, paginas[0].pagina, paginas[0].paginas], [1, 1, 1]);
  // sem nenhuma fonte de pé e nada publicado: índice vazio, mas válido
  const vazio = N.monta({ fontes: [C], feeds: {}, agora: AGORA });
  assert.deepEqual([vazio.indice.total, vazio.indice.paginas, vazio.paginas.length, vazio.indice.fontes[0].erro], [0, 0, 0, 'sem resposta']);
});

test('N1 · temas pelo título e pelas categorias; outro jogo fica fora; as fontes de verdade têm id único, feed e site em https', () => {
  assert.deepEqual(N.temasDe({ titulo: 'Top 10 cEDH staples' }), ['commander']);
  assert.deepEqual(N.temasDe({ titulo: 'Midweek Magic guide', categorias: ['Historic Pauper'] }), ['pauper', 'arena']);
  assert.deepEqual(N.temasDe({ titulo: 'Pro Tour spoilers' }), ['lancamentos', 'competitivo']);
  assert.deepEqual(N.temasDe({ titulo: 'A quiet week' }), []);
  assert.equal(N.foraDoTema({ titulo: 'Every card from Riftbound' }), true); assert.equal(N.foraDoTema({ titulo: 'x', categorias: ['Lorcana'] }), true);
  assert.equal(N.foraDoTema({ titulo: 'Commander precons ranked', categorias: ['Commander'] }), false);
  assert.equal(new Set(N.FONTES.map(f => f.id)).size, N.FONTES.length); assert.ok(N.FONTES.length >= 5);
  for (const f of N.FONTES) { assert.match(f.feed, /^https:\/\//); assert.match(f.site, /^https:\/\//); assert.ok(f.nome && f.idioma); assert.ok(f.temas.every(t => N.TEMAS_VALIDOS.includes(t))); }
});

test('N1 · coleta e publica (rede e disco falsos): uma fonte cai, as outras entram; grava índice e páginas; sem novidade não regrava; página que sobrou some', async t => {
  const pasta = await mkdtemp(join(tmpdir(), 'noticias-')); t.after(() => rm(pasta, { recursive: true, force: true }));
  const pedidos = [];
  const busca = feeds => async (url, opt) => { pedidos.push([url, opt.headers['user-agent']]); const r = feeds[url]; if (r === 'cai') throw new Error('rede caiu'); if (r == null) return { ok: false, status: 404, text: async () => '' }; return { ok: true, status: 200, text: async () => r }; };
  const C = { id: 'c', nome: 'C', site: 'https://c.test', feed: 'https://c.test/feed', idioma: 'en', temas: [] };
  const rede = { [A.feed]: RSS, [B.feed]: ATOM, [C.feed]: 'cai' };
  const col = await N.coleta([A, B, C, { ...C, id: 'e', feed: 'https://e.test/feed' }], { busca: busca(rede) });
  assert.deepEqual([!!col.a.xml, !!col.b.xml, col.c.erro, col.e.erro], [true, true, 'rede caiu', 'HTTP 404']);
  assert.match(pedidos[0][1], /^EstanteNoticias\//, 'o coletor se identifica para a fonte');
  // 1ª publicação
  const r1 = await N.publica(pasta, { fontes: [A, B, C], busca: busca(rede), agora: AGORA });
  assert.equal(r1.gravou, true); assert.deepEqual((await readdir(pasta)).sort(), ['en-pagina-1.json', 'indice.json', 'pagina-1.json']);
  const indice = JSON.parse(await readFile(join(pasta, 'indice.json'), 'utf8')), p1 = JSON.parse(await readFile(join(pasta, 'pagina-1.json'), 'utf8'));
  assert.equal(indice.total, 5); assert.equal(p1.itens.length, 5); assert.equal(indice.fontes.find(f => f.id === 'c').ok, false);
  // uma hora depois, nada novo: não regrava (não vira um commit por hora); seis horas depois, regrava a hora
  const r2 = await N.publica(pasta, { fontes: [A, B, C], busca: busca(rede), agora: AGORA + 3600e3 });
  assert.equal(r2.gravou, false); assert.equal(JSON.parse(await readFile(join(pasta, 'indice.json'), 'utf8')).coletadoEm, indice.coletadoEm);
  const r3 = await N.publica(pasta, { fontes: [A, B, C], busca: busca(rede), agora: AGORA + 6 * 3600e3 });
  assert.equal(r3.gravou, true); assert.equal(r3.indice.total, 5);
  // todas as fontes caem: o que estava publicado continua lá, e o índice diz que caíram
  const r4 = await N.publica(pasta, { fontes: [A, B, C], busca: busca({ [A.feed]: 'cai', [B.feed]: 'cai', [C.feed]: 'cai' }), agora: AGORA + 7 * 3600e3 });
  assert.equal(r4.gravou, true); assert.equal(r4.indice.total, 5); assert.ok(r4.indice.fontes.every(f => !f.ok));
  // 31 dias depois, com as fontes mudas: tudo sai da janela e a página que sobrou é apagada
  const r5 = await N.publica(pasta, { fontes: [A, B, C], busca: busca({}), agora: AGORA + 40 * 86400e3 });
  assert.equal(r5.indice.total, 0); assert.deepEqual(await readdir(pasta), ['indice.json']);
});

/* ---------------- N2 · português, séries por idioma e capa pela página ---------------- */
const PT = { id: 'p', nome: 'Fonte PT', site: 'https://pt.test', feed: 'https://pt.test/feed.rss', idioma: 'pt', temas: [], capaDaPagina: true };
const RSS_PT = `<?xml version="1.0"?><rss version="2.0"><channel><language>pt-br</language>
<item><title>Pauper: prévia da nova coleção</title><link>https://pt.test/articles/previa</link><pubDate>Wed, 07 Oct 2026 10:05:05 GMT</pubDate><author>Fonte PT</author><description>Tudo o que foi revelado até agora.</description><category>Magic: the Gathering</category></item>
<item><title>Funcionários de Dungeons &amp; Dragons e Magic de mesa anunciam sindicalização</title><link>https://pt.test/articles/sindicato</link><pubDate>Tue, 06 Oct 2026 22:50:15 GMT</pubDate><description>Notícia de Magic que cita outro jogo.</description></item>
<item><title>Torneio de Commander no sábado</title><link>https://pt.test/articles/torneio</link><pubDate>Mon, 05 Oct 2026 12:00:00 GMT</pubDate><description>Sem capa na página.</description></item>
</channel></rss>`;

test('N2 · fontes em português: entram com idioma pt, temas pelas palavras em português, autor igual ao nome da fonte some, e notícia de Magic que cita outro jogo fica', () => {
  const pt = N.FONTES.filter(f => f.idioma === 'pt'); assert.deepEqual(pt.map(f => f.id), ['cardsrealm', 'ovicio']);
  assert.deepEqual([...new Set(N.FONTES.map(f => f.idioma))].sort(), ['en', 'pt']); assert.deepEqual(N.IDIOMAS, ['pt', 'en']);
  const its = N.leFeed(RSS_PT).map(c => N.normaliza(c, PT, { agora: AGORA }));
  assert.deepEqual(its.map(i => i && [i.idioma, i.autor, i.temas.join()]), [['pt', '', 'pauper,lancamentos'], ['pt', '', ''], ['pt', '', 'commander,competitivo']]);
  assert.equal(N.foraDoTema({ titulo: 'Dungeons & Dragons e Magic anunciam' }), false); assert.equal(N.foraDoTema({ titulo: 'Dungeons & Dragons anuncia' }), true);
  assert.deepEqual(N.temasDe({ titulo: 'Relançamentos e prévias' }), ['lancamentos'], 'palavra com acento conta inteira');
  assert.deepEqual(N.temasDe({ titulo: 'Mundialmente famoso' }), [], 'pedaço de palavra não conta');
});

test('N2 · séries por idioma: o índice diz total e páginas de cada idioma e cada série tem as próprias páginas, na mesma ordem da série geral', () => {
  const muitos = Array.from({ length: 23 }, (_, i) => item(i + 200, 1, { idioma: i % 4 === 0 ? 'pt' : 'en', fonte: i % 4 === 0 ? 'p' : 'a' }));
  const { indice, paginas, porIdioma } = N.monta({ fontes: [A, PT], feeds: { a: { erro: 'x' }, p: { erro: 'x' } }, anteriores: muitos, agora: AGORA, porPagina: 5 });
  assert.deepEqual(indice.idiomas, { en: { total: 17, paginas: 4 }, pt: { total: 6, paginas: 2 } }); assert.equal(indice.total, 23); assert.equal(paginas.length, 5);
  assert.deepEqual(porIdioma.pt.map(p => [p.pagina, p.paginas, p.itens.length]), [[1, 2, 5], [2, 2, 1]]);
  const geral = paginas.flatMap(p => p.itens.map(i => i.id));
  for (const l of ['pt', 'en']) { const ids = porIdioma[l].flatMap(p => p.itens.map(i => i.id)); assert.deepEqual(ids, geral.filter(id => ids.includes(id))); assert.ok(porIdioma[l].every(p => p.itens.every(i => i.idioma === l))); }
});

test('N2 · capa pela página: og:image (ou twitter:image) em https; publica completa a capa uma vez por notícia, marca a que não tem e tenta de novo a que não respondeu', async t => {
  assert.equal(N.capaDaPagina('<head><meta property="og:image" content="https://cdn.test/a.jpg?w=1&amp;h=2"><meta name="twitter:image" content="https://cdn.test/b.jpg"></head>'), 'https://cdn.test/a.jpg?w=1&h=2');
  assert.equal(N.capaDaPagina("<meta content='https://cdn.test/b.jpg' name='twitter:image'>"), 'https://cdn.test/b.jpg');
  assert.equal(N.capaDaPagina('<meta property="og:image" content="http://cdn.test/inseguro.jpg">'), ''); assert.equal(N.capaDaPagina('<meta property="og:image" content="javascript:alert(1)">'), ''); assert.equal(N.capaDaPagina(''), '');
  const pasta = await mkdtemp(join(tmpdir(), 'noticias-pt-')); t.after(() => rm(pasta, { recursive: true, force: true }));
  const pedidos = [];
  const rede = { 'https://pt.test/feed.rss': RSS_PT, 'https://pt.test/articles/previa': '<meta property="og:image" content="https://cdn.test/previa.jpg">', 'https://pt.test/articles/torneio': '<html><head><title>sem capa</title></head></html>', [A.feed]: RSS };
  const busca = async url => { pedidos.push(url); const r = rede[url]; if (r == null) return { ok: false, status: 503, text: async () => '' }; return { ok: true, status: 200, text: async () => r }; };
  const r1 = await N.publica(pasta, { fontes: [A, PT], busca, agora: AGORA });
  assert.equal(r1.gravou, true); assert.deepEqual(r1.indice.idiomas, { en: { total: 3, paginas: 1 }, pt: { total: 3, paginas: 1 } });
  assert.deepEqual((await readdir(pasta)).sort(), ['en-pagina-1.json', 'indice.json', 'pagina-1.json', 'pt-pagina-1.json']);
  const le = async nome => JSON.parse(await readFile(join(pasta, nome), 'utf8')).itens;
  const pt1 = await le('pt-pagina-1.json');
  assert.deepEqual(pt1.map(i => [i.titulo.slice(0, 7), i.imagem, !!i.semCapa]), [['Pauper:', 'https://cdn.test/previa.jpg', false], ['Funcion', '', false], ['Torneio', '', true]]);
  assert.deepEqual((await le('pagina-1.json')).filter(i => i.idioma === 'pt'), pt1, 'a série geral e a do idioma levam a mesma notícia, com a mesma capa');
  assert.ok(!pedidos.some(u => u.startsWith('https://exemplo.test/') && u !== A.feed), 'fonte que não pede capa pela página não tem a matéria aberta');
  // coleta seguinte: só a matéria que não respondeu é pedida de novo; quando responde, a capa entra e o arquivo é regravado
  pedidos.length = 0; rede['https://pt.test/articles/sindicato'] = '<meta property="og:image" content="https://cdn.test/sindicato.jpg">';
  const r2 = await N.publica(pasta, { fontes: [A, PT], busca, agora: AGORA + 3600e3 });
  assert.deepEqual(pedidos.filter(u => u.includes('/articles/')), ['https://pt.test/articles/sindicato']); assert.equal(r2.gravou, true);
  assert.equal((await le('pt-pagina-1.json'))[1].imagem, 'https://cdn.test/sindicato.jpg');
  pedidos.length = 0; const r3 = await N.publica(pasta, { fontes: [A, PT], busca, agora: AGORA + 2 * 3600e3 });
  assert.deepEqual(pedidos.filter(u => u.includes('/articles/')), []); assert.equal(r3.gravou, false);
  // teto por coleta
  const muitos = Array.from({ length: 40 }, (_, i) => item(i + 300, 1, { fonte: 'p', idioma: 'pt' })); let n = 0;
  assert.equal(await N.completaCapas(muitos, [PT], { busca: async () => { n++; return { ok: true, text: async () => '' }; } }), N.CAPAS_POR_COLETA); assert.equal(n, N.CAPAS_POR_COLETA);
});
