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
