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

/* ---------------- N4 · guardadas ---------------- */
test('N4 · guardadas: guardar põe no começo com o nome da fonte e a hora; guardar de novo só sobe; tirar; o que vem do disco passa pelo mesmo crivo da rede, sem repetir, até o teto', async () => {
  const a = N.comGuardada([], it(1), { fonteNome: 'Fonte Um', agora: 100 });
  assert.deepEqual(lista(a.map(g => [g.id, g.fonteNome, g.guardadaEm])), [['n1', 'Fonte Um', 100]]);
  const b = N.comGuardada(a, it(2, { imagem: 'http://f.test/x.jpg' }), { agora: 200 }); assert.deepEqual(lista(b.map(g => [g.id, g.fonteNome, g.imagem])), [['n2', 'f', ''], ['n1', 'Fonte Um', '']]);
  const c = N.comGuardada(b, it(1), { fonteNome: 'Fonte Um', agora: 300 }); assert.deepEqual(lista(c.map(g => [g.id, g.guardadaEm])), [['n1', 300], ['n2', 200]]);
  assert.deepEqual(lista(N.semGuardada(c, 'n1').map(g => g.id)), ['n2']); assert.equal(c.length, 2, 'a lista recebida não é mudada');
  assert.deepEqual(lista(N.guardadasValidas([it(1), it(1), it(3, { url: 'javascript:alert(1)' }), null, 'x', { ...it(4), fonteNome: 7 }]).map(g => [g.id, g.fonteNome])), [['n1', 'f'], ['n4', '7']]);
  for (const ruim of [null, undefined, 'x', {}]) assert.deepEqual(lista(N.guardadasValidas(ruim)), []);
  assert.equal(N.guardadasValidas(Array.from({ length: 260 }, (_, i) => it(i + 10))).length, N.GUARDADAS_MAX);
  // serviço: guarda, tira e repõe (para o Desfazer), tudo no aparelho
  const disco = new Map(); const s = N.createNoticias({ busca: async () => ({ ok: false, status: 500 }), store: { get: async k => disco.get(k), set: async (k, v) => { disco.set(k, v); } } });
  assert.deepEqual(lista(await s.guardadas()), []); await s.guardaNoticia(it(1), 'Fonte Um'); const dois = await s.guardaNoticia(it(2), 'Fonte Dois');
  assert.deepEqual(lista((await s.guardadas()).map(g => [g.id, g.fonteNome])), [['n2', 'Fonte Dois'], ['n1', 'Fonte Um']]); assert.equal(N.CHAVE_GUARDADAS, 'noticias.guardadas');
  assert.deepEqual(lista((await s.tiraNoticia('n2')).map(g => g.id)), ['n1']); assert.deepEqual(lista((await s.repoeGuardadas(dois)).map(g => g.id)), ['n2', 'n1']); assert.deepEqual(lista(disco.get('noticias.guardadas').map(g => g.id)), ['n2', 'n1']);
});

/* ---------------- N5 · coleções na linha do tempo ---------------- */
const AGORA5 = Date.parse('2026-10-08T15:00:00Z');
const SETS = [
  { code: 'abc', name: 'Lançada Há Dois Dias', set_type: 'expansion', released_at: '2026-10-06', card_count: 281, icon_svg_uri: 'https://svgs.test/abc.svg' },
  { code: 'cmd', name: 'Commander Que Chega', set_type: 'commander', released_at: '2026-10-20', card_count: 100 },
  { code: 'far', name: 'Longe Demais', set_type: 'expansion', released_at: '2027-02-01' },
  { code: 'old', name: 'Velha', set_type: 'core', released_at: '2026-08-01' },
  { code: 'dig', name: 'Só Digital', set_type: 'expansion', released_at: '2026-10-01', digital: true },
  { code: 'tok', name: 'Fichas', set_type: 'token', released_at: '2026-10-06' },
  { code: 'mh9', name: 'Masters Hoje', set_type: 'masters', released_at: '2026-10-08', icon_svg_uri: 'http://inseguro.test/x.svg' },
  { code: 'f1', name: 'Futura 1', set_type: 'expansion', released_at: '2026-10-10' }, { code: 'f2', name: 'Futura 2', set_type: 'expansion', released_at: '2026-11-01' }, { code: 'f3', name: 'Futura 3', set_type: 'core', released_at: '2026-12-01' },
  null, { code: '', released_at: '2026-10-06', set_type: 'expansion' }, { code: 'bad', set_type: 'expansion', released_at: 'ontem' },
];
test('N5 · coleções: só papel e tipos que importam, lançadas nos últimos 30 dias ou chegando nos próximos 60 (no máximo três a caminho, a mais próxima primeiro), com tema, data de ordem e símbolo só em https', () => {
  const l = lista(N.lancamentosDe(SETS, AGORA5));
  assert.deepEqual(l.map(x => [x.codigo, x.futura, x.data.slice(0, 10)]), [['f1', true, '2026-10-08'], ['cmd', true, '2026-10-08'], ['f2', true, '2026-10-08'], ['mh9', false, '2026-10-08'], ['abc', false, '2026-10-06']]);
  const abc = l.find(x => x.codigo === 'abc'), cmd = l.find(x => x.codigo === 'cmd');
  assert.deepEqual([abc.tipo, abc.id, abc.nome, abc.tipoDeColecao, abc.cartas, abc.icone, abc.temas.join()], ['colecao', 'set:abc', 'Lançada Há Dois Dias', 'Expansão', 281, 'https://svgs.test/abc.svg', 'lancamentos']);
  assert.deepEqual(cmd.temas, ['lancamentos', 'commander']); assert.equal(l.find(x => x.codigo === 'mh9').icone, '', 'símbolo em http não entra');
  assert.deepEqual(lista(N.lancamentosDe(null, AGORA5)), []); assert.deepEqual(lista(N.lancamentosDe('x', AGORA5)), []);
  assert.deepEqual([N.quandoDaColecao(cmd, AGORA5), N.quandoDaColecao(abc, AGORA5), N.quandoDaColecao(l.find(x => x.codigo === 'mh9'), AGORA5)], ['chega em 20/10', 'lançada em 06/10', 'lançada hoje']);
});
test('N5 · mistura: cada coleção entra antes da primeira notícia mais velha que ela; o que é mais velho que a página fica para a seguinte, e entra no fim quando não há mais páginas', () => {
  const nt = (n, d) => it(n, { data: d });
  const pagina = [nt(1, '2026-10-08T10:00:00Z'), nt(2, '2026-10-07T10:00:00Z'), nt(3, '2026-10-05T10:00:00Z')];
  const sets = [{ id: 'set:a', data: '2026-10-08T15:00:00Z' }, { id: 'set:b', data: '2026-10-06T12:00:00Z' }, { id: 'set:c', data: '2026-09-20T12:00:00Z' }];
  const m = N.mesclaLancamentos(pagina, sets);
  assert.deepEqual(lista(m.itens.map(x => x.id)), ['set:a', 'n1', 'n2', 'set:b', 'n3']); assert.deepEqual(lista(m.pendentes.map(x => x.id)), ['set:c']);
  assert.deepEqual(lista(N.mesclaLancamentos([], m.pendentes, { fim: true }).itens.map(x => x.id)), ['set:c']);
  assert.equal(sets.length, 3, 'a lista recebida não é mudada');
  // coleção não conta como notícia nova nem move a marca da visita
  const comSet = [{ ...sets[0], tipo: 'colecao' }, nt(9, '2026-10-08T10:00:00Z')];
  assert.equal(N.contaNovas(comSet, '2026-10-01T00:00:00Z'), 1); assert.equal(N.maisNova(comSet), '2026-10-08T10:00:00Z');
});
test('N5 · serviço: busca as coleções na Scryfall uma vez, guarda por um dia no aparelho, e sem Scryfall (ou com falha) devolve nenhuma', async () => {
  let pedidas = 0, t = AGORA5; const disco = new Map();
  const scryfall = { sets: async () => { pedidas++; return SETS.filter(Boolean); } };
  const store = { get: async k => disco.get(k), set: async (k, v) => { disco.set(k, v); } };
  const s = N.createNoticias({ store, scryfall, agora: () => t });
  assert.equal((await s.lancamentos()).length, 5); await s.lancamentos(); assert.equal(pedidas, 1);
  const s2 = N.createNoticias({ store, scryfall, agora: () => t + 3600e3 }); await s2.lancamentos(); assert.equal(pedidas, 1, 'o que está guardado vale por um dia');
  const s3 = N.createNoticias({ store, scryfall, agora: () => t + 2 * 86400e3 }); await s3.lancamentos(); assert.equal(pedidas, 2, 'passado um dia, busca de novo');
  assert.deepEqual(lista(await N.createNoticias({ store: null }).lancamentos()), []);
  assert.deepEqual(lista(await N.createNoticias({ store: null, scryfall: { sets: async () => { throw new Error('fora do ar'); } } }).lancamentos()), []);
});
