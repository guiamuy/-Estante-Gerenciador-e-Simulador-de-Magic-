// Z2 · catálogo de listas no app: recorte, imagem, lista para salvar e o serviço (cache do índice, sem rede, lista guardada).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
const { catalogo: K, platform: P } = loadModules();
const J = x => JSON.parse(JSON.stringify(x));
const L = (id, nome, formato, extra = {}) => ({ id: 'mtgjson-' + id, nome, formato, tipo: 'Commander Deck', data: '2026-10-02', codigo: 'FDC', fonte: 'mtgjson', cores: 'W', destaque: 'X', destaqueId: null, comandante: [], cartas: 100, ...extra });
const INDICE = { versao: 1, geradoEm: '2026-10-09T00:00:00.000Z', fontes: [], formatos: [], total: 4, pendentes: 0,
  listas: [L('anjos', 'Calling All Angels', 'commander', { comandante: ['Giada, Font of Hope'] }), L('desafio', 'Pioneer Challenger: Ãnimo', 'construido', { tipo: 'Pioneer Challenger Deck' }), L('boas', 'Welcome Deck 2017', 'iniciante', { codigo: 'W17' }), { id: '../fora', nome: 'quebrada', formato: 'commander' }, L('x', 'Formato desconhecido', 'premodern')] };

test('Z2 · listasDoIndice e filtraCatalogo: só as válidas; formato, e busca por nome, comandante e código sem acento', () => {
  const ls = K.listasDoIndice(INDICE);
  assert.deepEqual(J(ls.map(l => l.id)), ['mtgjson-anjos', 'mtgjson-desafio', 'mtgjson-boas']);
  assert.deepEqual(K.listasDoIndice({ versao: 2, listas: INDICE.listas }).length, 0);
  const ids = f => J(K.filtraCatalogo(ls, f).map(l => l.id));
  assert.deepEqual(ids({ formato: 'commander' }), ['mtgjson-anjos']);
  assert.deepEqual(ids({ texto: 'giada' }), ['mtgjson-anjos']);
  assert.deepEqual(ids({ texto: 'animo' }), ['mtgjson-desafio']);
  assert.deepEqual(ids({ texto: 'w17' }), ['mtgjson-boas']);
  assert.deepEqual(ids({ formato: 'pauper' }), []);
  assert.deepEqual(ids({}), ['mtgjson-anjos', 'mtgjson-desafio', 'mtgjson-boas']);
});

test('Z2 · imagem pela Scryfall, lista para salvar com a origem e "já na estante"', () => {
  assert.equal(K.imagemDaCarta('4ebc7622-08a1-4f43-92dd-8675d395e8f6'), 'https://cards.scryfall.io/small/front/4/e/4ebc7622-08a1-4f43-92dd-8675d395e8f6.jpg');
  assert.equal(K.imagemDaCarta('../x'), null); assert.equal(K.imagemDaCarta(null), null);
  const lista = { ...L('anjos', 'Calling All Angels', 'commander'), entradas: [{ name: 'Giada, Font of Hope', qty: 1, zone: 'commander' }, { name: 'Plains', qty: 30, zone: 'main' }, { name: '', qty: 1, zone: 'main' }, { name: 'X', qty: 0, zone: 'main' }, { name: 'Y', qty: 1, zone: 'maybe' }] };
  assert.deepEqual(J(K.listaParaSalvar(lista)), { name: 'Calling All Angels', format: 'commander', entries: [{ name: 'Giada, Font of Hope', qty: 1, zone: 'commander' }, { name: 'Plains', qty: 30, zone: 'main' }], origem: { fonte: 'mtgjson', id: 'mtgjson-anjos' } });
  assert.equal(K.listaParaSalvar({ ...lista, formato: 'brawl' }).format, 'livre');
  assert.equal(K.jaNaEstante(lista, [{ name: 'outra', origem: { id: 'mtgjson-anjos' } }]), true);
  assert.equal(K.jaNaEstante(lista, [{ name: 'calling all angels' }]), true);
  assert.equal(K.jaNaEstante(lista, [{ name: 'Outra' }]), false);
});

test('Z2 · serviço: índice guardado no prazo, vencido busca, sem rede devolve o guardado marcado, ausente sem guardado, lista guardada ao abrir', async () => {
  let agora = 1000, falha = false, ausente = false; const pedidos = [];
  const busca = async url => { pedidos.push(url.replace(K.BASE, '')); if (falha) throw new TypeError('Failed to fetch'); if (ausente) return { ok: false, status: 404 };
    const corpo = url.endsWith('indice.json') ? INDICE : { ...L('anjos', 'Calling All Angels', 'commander'), entradas: [{ name: 'Plains', qty: 99, zone: 'main' }] };
    return { ok: true, status: 200, json: async () => corpo }; };
  const store = P.memoryStore(), C = K.createCatalogo({ store, busca, agora: () => agora });
  const r1 = await C.indice(); assert.equal(r1.origem, 'rede'); assert.equal(r1.em, 1000);
  agora += K.PRAZO_MS - 1; assert.equal((await C.indice()).origem, 'guardado'); assert.equal(pedidos.length, 1);
  agora += 2; falha = true;
  const r3 = await C.indice(); assert.equal(r3.origem, 'guardado'); assert.equal(r3.velho, true); assert.equal(r3.dados.listas.length, 5);
  assert.equal((await C.indice({ forcar: true })).velho, true);
  const vazio = K.createCatalogo({ store: P.memoryStore(), busca, agora: () => agora });
  await assert.rejects(vazio.indice());
  falha = false; ausente = true; assert.equal((await vazio.indice()).ausente, true);
  ausente = false;
  const l = await C.lista('mtgjson-anjos'); assert.equal(l.entradas[0].qty, 99);
  falha = true; assert.equal((await C.lista('mtgjson-anjos')).nome, 'Calling All Angels', 'guardada: abre sem rede');
  await assert.rejects(C.lista('../fora'));
});

test('Z3 · gruposPorTipo e gruposPorCusto: comandante, categorias da estante, custo 0 a 6+, terrenos, sem dados e reserva', () => {
  const cards = new Map([
    ['giada, font of hope', { name: 'Giada, Font of Hope', type_line: 'Legendary Creature — Angel', cmc: 2 }],
    ['sol ring', { name: 'Sol Ring', type_line: 'Artifact', cmc: 1 }],
    ['serra angel', { name: 'Serra Angel', type_line: 'Creature — Angel', cmc: 5 }],
    ['emeria shepherd', { name: 'Emeria Shepherd', type_line: 'Creature — Angel', cmc: 7 }],
    ['plains', { name: 'Plains', type_line: 'Basic Land — Plains', cmc: 0 }],
    ['swords to plowshares', { name: 'Swords to Plowshares', type_line: 'Instant', cmc: 1 }]]);
  const es = [{ name: 'Giada, Font of Hope', qty: 1, zone: 'commander' }, { name: 'Plains', qty: 30, zone: 'main' }, { name: 'Serra Angel', qty: 1, zone: 'main' },
    { name: 'Sol Ring', qty: 1, zone: 'main' }, { name: 'Emeria Shepherd', qty: 1, zone: 'main' }, { name: 'Swords to Plowshares', qty: 1, zone: 'main' }, { name: 'Carta Sem Dados', qty: 2, zone: 'main' }, { name: 'Sol Ring', qty: 1, zone: 'side' }];
  const tipo = K.gruposPorTipo(es, cards);
  assert.deepEqual(J(tipo.map(g => [g.chave, g.rotulo, g.n])), [['commander', 'Comandante', 1], ['creature', 'Criaturas', 2], ['instant', 'Instantâneas', 1], ['artifact', 'Artefatos', 1], ['land', 'Terrenos', 30], ['other', 'Outros', 2], ['side', 'Reserva', 1]]);
  assert.deepEqual(J(tipo[1].itens.map(i => i.name)), ['Serra Angel', 'Emeria Shepherd'], 'no grupo, do custo menor ao maior');
  assert.equal(tipo[1].itens[0].carta.cmc, 5);
  const custo = K.gruposPorCusto(es, cards);
  assert.deepEqual(J(custo.map(g => [g.chave, g.rotulo, g.n])), [['comandante', 'Comandante', 1], ['custo-1', 'Custo 1', 2], ['custo-5', 'Custo 5', 1], ['custo-6', 'Custo 6 ou mais', 1], ['terrenos', 'Terrenos', 30], ['sem-dados', 'Sem dados', 2], ['reserva', 'Reserva', 1]]);
  assert.deepEqual(J(K.gruposPorCusto(es, new Map()).map(g => g.chave)), ['comandante', 'sem-dados', 'reserva'], 'sem dados nenhum: tudo em "Sem dados"');
});

test('Z5 · listas de torneio no app: id da TopDeck.gg vale, busca por jogador e torneio, Pauper salva como Pauper', () => {
  const td = { id: 'topdeck-copa-teste-1-1', nome: '1º · Copa Teste', formato: 'pauper', fonte: 'topdeck', tipo: 'Torneio · 1º de 12', jogador: 'Fulana de Tal', torneio: 'Copa Teste', data: '2026-10-04' };
  const ls = K.listasDoIndice({ versao: 1, listas: [td, { ...td, id: 'topdeck-../x' }, { ...td, id: 'outra-fonte-1' }] });
  assert.deepEqual(J(ls.map(l => l.id)), ['topdeck-copa-teste-1-1']);
  assert.equal(K.filtraCatalogo(ls, { texto: 'fulana' }).length, 1); assert.equal(K.filtraCatalogo(ls, { texto: 'copa teste' }).length, 1);
  assert.equal(K.filtraCatalogo(ls, { formato: 'pauper' }).length, 1);
  const salvar = K.listaParaSalvar({ ...td, entradas: [{ name: 'Ponder', qty: 4, zone: 'main' }] });
  assert.equal(salvar.format, 'pauper'); assert.deepEqual(J(salvar.origem), { fonte: 'topdeck', id: 'topdeck-copa-teste-1-1' });
  assert.equal(K.listaParaSalvar({ ...td, formato: 'modern', entradas: [] }).format, 'livre');
});

test('G-241 · listas do Magic Online no app: id `mtgo-…` vale, Vintage é formato da grade, é lista de jogador (busca por jogador e evento), salva como Livre, e o crédito diz cada fonte presente', () => {
  const mo = { id: 'mtgo-pauper-challenge-32-2026-10-0512855502-1', nome: '1º · Pauper Challenge 32', formato: 'pauper', fonte: 'mtgo', tipo: 'Desafio · 1º de 52', jogador: 'sai199orz', torneio: 'Pauper Challenge 32', data: '2026-10-05', cartas: 60 };
  const vt = { ...mo, id: 'mtgo-vintage-league-2026-10-0511140-2', nome: '5-0 · Vintage League', formato: 'vintage', tipo: 'Liga · 5-0', jogador: 'outra', torneio: 'Vintage League' };
  const ls = K.listasDoIndice({ versao: 1, listas: [mo, vt, { ...mo, id: 'mtgo-../x' }] });
  assert.deepEqual(J(ls.map(l => l.id)), [mo.id, vt.id]);
  assert.ok(K.FORMATOS.some(([id]) => id === 'vintage'));
  assert.equal(K.filtraCatalogo(ls, { formato: 'vintage' }).length, 1); assert.equal(K.filtraCatalogo(ls, { texto: 'sai199' }).length, 1); assert.equal(K.filtraCatalogo(ls, { texto: 'challenge 32' }).length, 1);
  assert.equal(K.deTorneio(mo), true);
  assert.equal(K.listaParaSalvar({ ...vt, entradas: [{ name: 'Black Lotus', qty: 1, zone: 'main' }] }).format, 'livre');
  assert.equal(K.listaParaSalvar({ ...mo, entradas: [{ name: 'Ponder', qty: 4, zone: 'main' }] }).format, 'pauper');
  assert.deepEqual(Object.keys(K.FONTES_DO_CATALOGO), ['mtgjson', 'topdeck', 'mtgo']);
  assert.match(K.FONTES_DO_CATALOGO.mtgo.fim, /Fan Content Policy/); assert.equal(K.FONTES_DO_CATALOGO.topdeck.link[0], 'https://topdeck.gg');
});

test('G-242 · fichas do catálogo no app: só as bem formadas; guardadas por uma semana; sem rede, as guardadas marcadas; sem nada, erro; arquivo ausente', async () => {
  const bruto = { versao: 1, fichas: [{ name: 'Zombie', types: ['creature'], subtypes: ['Zombie'], colors: ['B'], power: 2, toughness: 2 }, { name: 'Treasure', types: ['artifact'], colors: [] },
    { name: 'Torta', types: ['creature'], colors: ['W'], power: '1' }, { name: '', types: [], colors: [] }, { name: 'x'.repeat(81), types: [], colors: [] }, { name: 'Estranha', types: ['creature'], colors: ['Z', 'G'], power: '1000', toughness: '1' }] };
  assert.deepEqual(J(K.fichasDoCatalogo(bruto)), [{ name: 'Zombie', types: ['creature'], subtypes: ['Zombie'], colors: ['B'], power: '2', toughness: '2' }, { name: 'Treasure', types: ['artifact'], subtypes: [], colors: [] }]);
  assert.deepEqual(J(K.fichasDoCatalogo({ versao: 2, fichas: bruto.fichas })), []);
  let agora = 1000, falha = false, ausente = false; const pedidos = [];
  const busca = async url => { pedidos.push(url.replace(K.BASE, '')); if (falha) throw new TypeError('Failed to fetch'); if (ausente) return { ok: false, status: 404 }; return { ok: true, status: 200, json: async () => bruto }; };
  const store = P.memoryStore(), C = K.createCatalogo({ store, busca, agora: () => agora });
  const r1 = await C.fichas(); assert.equal(r1.origem, 'rede'); assert.equal(r1.fichas.length, 2); assert.deepEqual(pedidos, ['fichas.json']);
  agora += 6 * 86400e3; assert.equal((await C.fichas()).origem, 'guardado'); assert.equal(pedidos.length, 1, 'dentro da semana não busca');
  agora += 2 * 86400e3; falha = true; const r3 = await C.fichas(); assert.equal(r3.velho, true); assert.equal(r3.fichas.length, 2);
  const vazio = K.createCatalogo({ store: P.memoryStore(), busca, agora: () => agora });
  await assert.rejects(vazio.fichas());
  falha = false; ausente = true; assert.equal((await vazio.fichas()).ausente, true);
});

// ---------------------------------------------------------------------------------------------------------------
// G-248 · relato #15 · o nome é o da lista, o evento vem à parte e o valor aparece.
const J248 = x => JSON.parse(JSON.stringify(x));
const TAXAS = { BRL: 5, EUR: 0.9, em: 0 };
const NOVA = { id: 'mtgo-modern-challenge-1', nome: 'Izzet Murktide Regent', evento: '1º · Modern Challenge 16', nv: 1, formato: 'modern', fonte: 'mtgo', cores: 'UR', comandante: [], jogador: 'Venom01', torneio: 'Modern Challenge 16', posicao: 1, data: '2026-10-10', valorUsd: 412.35, semPreco: 2 };
const ANTIGA = { id: 'mtgo-modern-league-3', nome: '5-0 · Modern League', formato: 'modern', fonte: 'mtgo', cores: 'BG', comandante: [], jogador: 'Fulano', torneio: 'Modern League', data: '2026-10-09' };

test('G-248 · linhas do cartão: evento à parte, quem jogou e a data; índice antigo desenha como antes', () => {
  assert.deepEqual(J248(K.linhasDoCartao(NOVA)), { evento: '1º · Modern Challenge 16', sub: 'Venom01 · 10/10/2026', subEmIngles: false });
  assert.deepEqual(J248(K.linhasDoCartao(ANTIGA)), { evento: '', sub: 'Fulano · 09/10/2026', subEmIngles: false }, 'sem `evento`, o título ainda é o evento e nada se repete');
  // Commander de torneio: o título é quem comanda, então a linha de baixo é quem jogou
  const cedh = { id: 'topdeck-x-1', nome: 'Kraum + Tymna the Weaver', evento: '1º · AP9 x Dice City cEDH 1k', fonte: 'topdeck', formato: 'commander', comandante: ['Kraum, Ludevic\'s Opus', 'Tymna the Weaver'], jogador: 'Simon Bigger', data: '2026-10-10' };
  assert.deepEqual(J248(K.linhasDoCartao(cedh)), { evento: '1º · AP9 x Dice City cEDH 1k', sub: 'Simon Bigger · 10/10/2026', subEmIngles: false });
  assert.equal(K.linhasDoCartao({ ...cedh, nome: 'Kinnan, Bonder Prodigy', comandante: ['Kinnan, Bonder Prodigy'] }).sub, 'Simon Bigger · 10/10/2026');
  // Commander de torneio do índice antigo (título = evento): quem comanda continua embaixo, em inglês
  assert.deepEqual(J248(K.linhasDoCartao({ ...cedh, nome: '1º · AP9 x Dice City cEDH 1k', evento: undefined })), { evento: '', sub: 'Kraum, Ludevic\'s Opus + Tymna the Weaver', subEmIngles: true });
  // produto oficial: tipo e código como evento; quem comanda embaixo; sem comandante, a data
  const oficial = { id: 'mtgjson-anjos-fdc', nome: 'Calling All Angels', evento: 'Commander Deck · FDC', fonte: 'mtgjson', formato: 'commander', tipo: 'Commander Deck', codigo: 'FDC', comandante: ['Giada, Font of Hope'], data: '2026-10-02' };
  assert.deepEqual(J248(K.linhasDoCartao(oficial)), { evento: 'Commander Deck · FDC', sub: 'Giada, Font of Hope', subEmIngles: true });
  assert.deepEqual(J248(K.linhasDoCartao({ ...oficial, comandante: [], formato: 'iniciante' })), { evento: 'Commander Deck · FDC', sub: '02/10/2026', subEmIngles: false });
  assert.deepEqual(J248(K.linhasDoCartao({ ...oficial, comandante: [], evento: undefined })), { evento: '', sub: 'Commander Deck · 02/10/2026', subEmIngles: false }, 'índice antigo: tipo e data, como era');
  // o que vem do índice é dado: evento igual ao nome não se repete; texto enorme é cortado; tipo estranho não quebra
  assert.equal(K.linhasDoCartao({ ...NOVA, evento: 'izzet  murktide regent' }).evento, '');
  assert.equal(K.linhasDoCartao({ ...NOVA, evento: 'x'.repeat(500) }).evento.length, 120);
  assert.equal(K.linhasDoCartao({ ...NOVA, evento: { a: 1 }, jogador: 42 }).evento, ''); assert.equal(K.linhasDoCartao({ ...NOVA, evento: { a: 1 }, jogador: 42 }).sub, '10/10/2026');
});

test('G-248 · valor do cartão: real com cotação, dólar sem ela, nada quando o índice não traz (ou traz lixo)', () => {
  assert.deepEqual(J248(K.valorDoResumo(NOVA, TAXAS)), { usd: 412.35, brl: 2061.75, texto: 'R$ 2.061,75', semPreco: 2, fala: 'Valor estimado da lista: R$ 2.061,75' });
  assert.equal(K.valorDoResumo(NOVA, null).texto, 'US$ 412,35'); assert.equal(K.valorDoResumo(NOVA).brl, null);
  for (const ruim of [undefined, null, '412', NaN, Infinity, -3, 0, 1e9]) assert.equal(K.valorDoResumo({ ...NOVA, valorUsd: ruim }, TAXAS), null, String(ruim));
  assert.equal(K.valorDoResumo(ANTIGA, TAXAS), null); assert.equal(K.valorDoResumo(null, TAXAS), null);
  assert.equal(K.valorDoResumo({ ...NOVA, semPreco: 'muitas' }, TAXAS).semPreco, 0);
});

test('G-248 · busca acha pelo evento; "já na estante" de lista de torneio vale só pela origem', () => {
  const outra = { ...NOVA, id: 'mtgo-modern-league-9', evento: '5-0 · Modern League', torneio: 'Modern League', jogador: 'Beltrano' };
  assert.deepEqual(K.filtraCatalogo([NOVA, outra, ANTIGA], { texto: 'challenge' }).map(l => l.id), ['mtgo-modern-challenge-1']);
  assert.deepEqual(K.filtraCatalogo([NOVA, outra, ANTIGA], { texto: 'murktide' }).map(l => l.id), ['mtgo-modern-challenge-1', 'mtgo-modern-league-9']);
  assert.deepEqual(K.filtraCatalogo([NOVA, outra, ANTIGA], { texto: 'modern league' }).map(l => l.id), ['mtgo-modern-league-9', 'mtgo-modern-league-3'], 'evento novo e título antigo');
  const minhas = [{ id: 'd1', name: 'Izzet Murktide Regent', origem: { fonte: 'mtgo', id: 'mtgo-modern-challenge-1' } }];
  assert.equal(K.jaNaEstante(NOVA, minhas), true); assert.equal(K.jaNaEstante(outra, minhas), false, 'mesmo arquétipo, outra lista: ainda não está na estante');
  assert.equal(K.jaNaEstante({ id: 'mtgjson-anjos-fdc', nome: 'Calling All Angels', fonte: 'mtgjson' }, [{ id: 'd2', name: 'calling all angels' }]), true, 'produto oficial continua valendo pelo nome');
  assert.equal(K.listaParaSalvar({ ...NOVA, entradas: [{ name: 'Island', qty: 1, zone: 'main' }] }).name, 'Izzet Murktide Regent');
});

test('G-248 · lista guardada antes do nome novo recebe nome, evento e valor do índice; preço da carta na moeda da tela', () => {
  const guardada = { id: NOVA.id, nome: '1º · Modern Challenge 16', descricao: 'd', entradas: [{ name: 'Island', qty: 1, zone: 'main' }] };
  const r = K.comResumo(guardada, NOVA);
  assert.equal(r.nome, 'Izzet Murktide Regent'); assert.equal(r.evento, '1º · Modern Challenge 16'); assert.equal(r.valorUsd, 412.35); assert.equal(r.descricao, 'd'); assert.equal(r.entradas.length, 1);
  assert.equal(guardada.nome, '1º · Modern Challenge 16', 'não muta a guardada');
  assert.equal(K.comResumo(guardada, { ...NOVA, id: 'mtgo-outra-1' }), guardada, 'resumo de outra lista não é aplicado'); assert.equal(K.comResumo(guardada, null), guardada);
  assert.equal(K.comResumo(guardada, { id: NOVA.id, nome: '   ' }).nome, '1º · Modern Challenge 16', 'nome vazio no índice não apaga o da lista');
  assert.equal(K.precoDaCarta({ prices: { usd: '1.50' } }, TAXAS), 'R$ 7,50'); assert.equal(K.precoDaCarta({ prices: { usd: '1.50' } }, null), 'US$ 1,50');
  assert.equal(K.precoDaCarta({ prices: { usd: null, usd_foil: '3.00' } }, null), 'US$ 3,00', 'só há foil: vale o foil');
  assert.equal(K.precoDaCarta({ prices: {} }, TAXAS), null); assert.equal(K.precoDaCarta(null, TAXAS), null);
});

// ---------------------------------------------------------------------------------------------------------------
// G-249 · a cópia do índice guardada no aparelho no formato antigo escondia os nomes novos (relato #15, de novo).
test('G-249 · índice antigo: tem lista de torneio e nenhuma com evento; só oficiais, vazio ou novo não são antigos', () => {
  const idx = listas => ({ versao: 1, listas });
  const oficial = { id: 'mtgjson-anjos-fdc', nome: 'Calling All Angels', formato: 'commander', fonte: 'mtgjson' };
  assert.equal(K.indiceAntigo(idx([ANTIGA, oficial])), true);
  assert.equal(K.indiceAntigo(idx([NOVA, ANTIGA])), false, 'uma lista ainda sem nome (a Scryfall falhou naquela coleta) não torna o índice antigo');
  assert.equal(K.indiceAntigo(idx([oficial])), false); assert.equal(K.indiceAntigo(idx([])), false); assert.equal(K.indiceAntigo(null), false);
  assert.equal(K.indiceAntigo(idx([{ ...ANTIGA, evento: '   ' }])), true, 'evento vazio não conta');
  assert.equal(K.PRAZO_MS, 3600 * 1000, 'a cópia do aparelho vale uma hora');
});

test('G-249 · serviço: cópia antiga dentro do prazo é buscada de novo; cópia nova no prazo não; sem rede fica a guardada, marcada', async () => {
  const store = P.memoryStore(); let agora = 1e12, cai = false, remoto = { versao: 1, listas: [ANTIGA] }; const pedidos = [];
  const busca = async url => { pedidos.push(url); if (cai) throw new Error('rede'); return { ok: true, status: 200, json: async () => JSON.parse(JSON.stringify(remoto)) }; };
  const C = K.createCatalogo({ store, busca, base: 'https://x/', agora: () => agora });
  assert.equal((await C.indice()).origem, 'rede'); assert.equal(pedidos.length, 1);
  // a coleta nova saiu um minuto depois: sem esta leva o aparelho ficava 12 horas com os títulos de evento
  remoto = { versao: 1, listas: [NOVA] }; agora += 60000;
  const r = await C.indice(); assert.equal(r.origem, 'rede'); assert.equal(pedidos.length, 2); assert.equal(K.listasDoIndice(r.dados)[0].nome, 'Izzet Murktide Regent');
  agora += 60000; assert.equal((await C.indice()).origem, 'guardado'); assert.equal(pedidos.length, 2, 'cópia no formato novo, dentro da hora: não busca');
  agora += K.PRAZO_MS; assert.equal((await C.indice()).origem, 'rede'); assert.equal(pedidos.length, 3, 'passou da hora: busca');
  assert.equal((await C.indice({ forcar: true })).origem, 'rede'); assert.equal(pedidos.length, 4, 'Atualizar busca sempre');
  // cópia antiga e sem rede: mostra a guardada, marcada como velha (nunca tela de erro por causa do formato)
  await store.set(K.CHAVE_INDICE, { em: agora, dados: { versao: 1, listas: [ANTIGA] } }); cai = true;
  const v = await C.indice(); assert.equal(v.origem, 'guardado'); assert.equal(v.velho, true); assert.equal(K.listasDoIndice(v.dados)[0].nome, '5-0 · Modern League');
});

test('G-273 · relato #24 · filtros das listas prontas: cor nos três modos (incolor incluso), onde apareceu, ordem e as frases do recorte', () => {
  const T = (id, cores, extra = {}) => ({ id: 'mtgo-' + id, nome: id, formato: 'modern', tipo: 'Liga · 5-0', data: '2026-10-10', codigo: '', fonte: 'mtgo', cores, destaque: 'X', destaqueId: null, comandante: [], cartas: 60, ...extra });
  const ls = [T('dimir', 'UB', { valorUsd: 300, posicao: 2 }), T('mono-u', 'U', { tipo: 'Desafio · 1º de 40', valorUsd: 50, posicao: 1 }), T('esper', 'WUB', { fonte: 'topdeck', tipo: 'Torneio · 3º de 20', posicao: 3 }),
    T('rakdos', 'RB', { valorUsd: 120 }), T('eldrazi', ''), { ...L('oficial', 'Welcome Deck 2017', 'iniciante', { cores: 'U', valorUsd: 10 }) }];
  const ids = f => J(K.filtraCatalogo(ls, f).map(l => l.nome));
  // o índice traz as cores fora de ordem às vezes ("RB"): a lista sai em WUBRG
  assert.deepEqual(J(K.coresDaLista(ls[3])), ['B', 'R']); assert.deepEqual(J(K.coresDaLista(ls[4])), []);
  // qualquer uma delas: tem azul ou preto
  assert.deepEqual(ids({ cores: ['U', 'B'] }), ['dimir', 'mono-u', 'esper', 'rakdos', 'Welcome Deck 2017']);
  // só dentro delas: nenhuma cor fora de azul e preto
  assert.deepEqual(ids({ cores: ['U', 'B'], modoCor: 'identidade' }), ['dimir', 'mono-u', 'Welcome Deck 2017']);
  // exatamente estas: o conjunto Dimir
  assert.deepEqual(ids({ cores: ['B', 'U'], modoCor: 'exatas' }), ['dimir']);
  // incolor: a lista sem cor nenhuma, nos três modos
  for (const modoCor of ['qualquer', 'identidade', 'exatas']) assert.deepEqual(ids({ cores: ['C'], modoCor }), ['eldrazi'], modoCor);
  assert.deepEqual(ids({ cores: ['U', 'C'], modoCor: 'identidade' }), ['mono-u', 'eldrazi', 'Welcome Deck 2017']);
  // onde apareceu: pelo começo do tipo; MTGJSON é produto oficial
  assert.deepEqual(ls.map(l => K.origemDe(l)), ['liga', 'desafio', 'torneio', 'liga', 'liga', 'oficial']);
  assert.deepEqual(ids({ origens: ['desafio', 'oficial'] }), ['mono-u', 'Welcome Deck 2017']);
  // ordem: quem não tem o dado vai para o fim, na ordem do índice; sem filtro, a ordem do índice
  assert.deepEqual(ids({ ordem: 'barata' }), ['Welcome Deck 2017', 'mono-u', 'rakdos', 'dimir', 'esper', 'eldrazi']);
  assert.deepEqual(ids({ ordem: 'cara' }), ['dimir', 'rakdos', 'mono-u', 'Welcome Deck 2017', 'esper', 'eldrazi']);
  assert.deepEqual(ids({ ordem: 'colocacao' }), ['mono-u', 'dimir', 'esper', 'rakdos', 'eldrazi', 'Welcome Deck 2017']);
  assert.deepEqual(ids({}), ls.map(l => l.nome));
  // junto com formato e texto, como antes
  assert.deepEqual(ids({ formato: 'modern', texto: 'dim', cores: ['U'] }), ['dimir']);
  // frases
  assert.equal(K.descreveCores(['B', 'U'], 'exatas'), 'Dimir (azul e preto)');
  assert.equal(K.descreveCores(['W', 'U', 'B', 'R', 'G'], 'exatas'), 'Cinco cores (branco, azul, preto, vermelho e verde)');
  assert.equal(K.descreveCores(['U'], 'exatas'), 'mono-azul'); assert.equal(K.descreveCores(['C'], 'exatas'), 'incolor');
  assert.equal(K.descreveCores(['U', 'B'], 'qualquer'), 'com azul ou preto'); assert.equal(K.descreveCores(['U', 'B'], 'identidade'), 'só dentro de azul e preto');
  assert.equal(K.descreveFiltroDoCatalogo({ cores: ['U', 'B'], modoCor: 'exatas', origens: ['liga', 'desafio'], ordem: 'cara' }), 'Dimir (azul e preto) · Liga 5-0 ou Desafio · ordem: maior valor');
  assert.equal(K.filtrosDoCatalogoAtivos(K.novoFiltroDoCatalogo()), 0);
  assert.equal(K.filtrosDoCatalogoAtivos({ cores: ['U'], modoCor: 'qualquer', origens: ['liga'], ordem: 'cara' }), 3);
  // os vinte conjuntos de duas e três cores têm nome, e só eles (mais as cinco cores)
  assert.equal(Object.keys(K.NOME_DO_CONJUNTO).length, 21);
  assert.ok(Object.keys(K.NOME_DO_CONJUNTO).every(k => k === K.coresDaLista({ cores: k }).join('')), 'chaves em WUBRG');
});

// Q10-7b · relato #32, fatia 2: Listas prontas dizem quanto roda no motor, pelo arquivo da sentinela (cobertura/motor.json).
test('Q10-7b · leMotorDoCatalogo e medidaDoMotor: só a forma certa entra; medida vira completo/incompleto com a data; lista sem medida diz isso', () => {
  const dados = { versao: 1, geradoEm: '2026-10-24T05:00:00Z', formatos: { pauper: { geradoEm: '2026-10-24T05:00:00Z' }, xadrez: { geradoEm: 'x' } },
    pct: { 'topdeck-a-1': [100, 0], 'topdeck-b-2': [87, 3], 'mtgjson-c': [101, 0], '../x': [50, 1], 'mtgo-d': ['9', 1], 'mtgo-e': [12.5, 1] } };
  const m = K.leMotorDoCatalogo(dados);
  assert.deepEqual([...m.pct.keys()], ['topdeck-a-1', 'topdeck-b-2']); assert.deepEqual(Object.keys(m.formatos), ['pauper']);
  assert.equal(K.leMotorDoCatalogo({ versao: 2, pct: {} }), null); assert.equal(K.leMotorDoCatalogo(null), null);
  const a = K.medidaDoMotor(m, { id: 'topdeck-a-1', formato: 'pauper' }), b = K.medidaDoMotor(m, { id: 'topdeck-b-2', formato: 'pauper' });
  assert.deepEqual([a.estado, a.pct, b.estado, b.pct, b.faltam.length], ['completo', 100, 'incompleto', 87, 3]);
  assert.equal(a.medidoEm, new Date('2026-10-24T05:00:00Z').toLocaleDateString('pt-BR'));
  assert.equal(K.medidaDoMotor(m, { id: 'topdeck-z-9', formato: 'modern' }).estado, 'sem-medida');
  assert.equal(K.medidaDoMotor(null, { id: 'topdeck-a-1' }), null);
});

// G-311 · relato #36, fatia 1: o Jogar só abre o formato em que o motor joga todas as listas prontas dele.
test('G-311 · estadoDoFormato: pronto só com todas as listas medidas a 100%; formato fora do catálogo fecha; arquivo sem a contagem (de antes) não fecha nada', () => {
  const dados = { versao: 1, formatos: { pauper: { geradoEm: '2026-10-27T06:23:00Z', motor: 113, listas: 595, medidas: 594, listas100: 594 },
    commander: { geradoEm: '2026-10-27T06:25:00Z', motor: 113, listas: 478, medidas: 478, listas100: 0 }, modern: { geradoEm: 'x', listas: 3, medidas: 3, listas100: 9 } }, pct: {} };
  const m = K.leMotorDoCatalogo(dados);
  assert.deepEqual(J(m.formatos.pauper), { geradoEm: '2026-10-27T06:23:00Z', motor: 113, listas: 595, medidas: 594, listas100: 594 });
  assert.equal(m.formatos.modern.listas100, undefined, 'contagem impossível (mais listas a 100% que medidas) é descartada');
  const p = K.estadoDoFormato(m, 'pauper'), c = K.estadoDoFormato(m, 'commander'), l = K.estadoDoFormato(m, 'livre'), mo = K.estadoDoFormato(m, 'modern');
  assert.deepEqual([p.estado, p.listas, p.listas100], ['pronto', 594, 594]);
  assert.deepEqual([c.estado, c.motivo, c.listas, c.listas100], ['fechado', 'incompleto', 478, 0]);
  assert.equal(c.medidoEm, new Date('2026-10-27T06:25:00Z').toLocaleDateString('pt-BR'));
  assert.deepEqual([l.estado, l.motivo], ['fechado', 'sem-catalogo']);
  assert.deepEqual([mo.estado, mo.motivo], ['fechado', 'sem-medida']);
  assert.deepEqual(J(K.formatosProntos(m)), ['pauper']);
  // arquivo de antes da contagem (nenhum formato com listas100) e arquivo ausente: a tela fica como era
  assert.equal(K.estadoDoFormato(K.leMotorDoCatalogo({ versao: 1, formatos: { pauper: { geradoEm: 'x', listas: 2, medidas: 2 } }, pct: {} }), 'livre'), null);
  assert.equal(K.estadoDoFormato(null, 'pauper'), null); assert.equal(K.formatosProntos(null), null);
});

test('Q10-7b · serviço: o arquivo do motor é guardado por uma hora; sem rede, o guardado; ausente ou ilegível, sem selo (null)', async () => {
  let agora = 1000, falha = false, corpo = { versao: 1, formatos: {}, pct: { 'topdeck-a-1': [90, 2] } }; const pedidos = [];
  const busca = async url => { pedidos.push(url.replace(K.BASE, '')); if (falha) throw new TypeError('Failed to fetch'); if (corpo === 404) return { ok: false, status: 404 };
    return { ok: true, status: 200, json: async () => corpo }; };
  const store = P.memoryStore(), C = K.createCatalogo({ store, busca, agora: () => agora });
  const r1 = await C.motor(); assert.equal(r1.origem, 'rede'); assert.deepEqual(r1.pct.get('topdeck-a-1'), [90, 2]); assert.deepEqual(pedidos, ['cobertura/motor.json']);
  agora += 60e3; assert.equal((await C.motor()).origem, 'guardado'); assert.equal(pedidos.length, 1);
  agora += K.PRAZO_MS; falha = true; const r3 = await C.motor(); assert.equal(r3.origem, 'guardado'); assert.equal(r3.velho, true);
  falha = false; corpo = { versao: 7 }; assert.equal((await C.motor()).velho, true, 'arquivo ilegível não apaga o guardado');
  const vazio = K.createCatalogo({ store: P.memoryStore(), busca, agora: () => agora }); corpo = 404;
  assert.equal(await vazio.motor(), null); falha = true; assert.equal(await vazio.motor(), null);
});
