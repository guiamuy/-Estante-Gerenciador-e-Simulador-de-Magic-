// Z1 · coletor do catálogo de listas (MTGJSON → ramo `catalogo`). Amostra sintética no formato do MTGJSON v5.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as C from './catalogo.mjs';

const carta = (name, extra = {}) => ({ name, count: 1, colorIdentity: [], types: ['Creature'], rarity: 'common', identifiers: { scryfallId: '0000aaaa-1111-2222-3333-444455556666' }, ...extra });
const DECK = { data: { name: 'Ânimo de Teste', code: 'tst', type: 'Commander Deck', releaseDate: '2026-09-26',
  commander: [carta('Teste, the Leader', { colorIdentity: ['G', 'W'], rarity: 'mythic', identifiers: { scryfallId: 'abcdef01-2345-6789-abcd-ef0123456789' } })],
  mainBoard: [carta('Forest', { count: 10, types: ['Land'] }), carta('Plains', { count: 9, types: ['Land'] }), carta('Sol Ring', { types: ['Artifact'], rarity: 'uncommon' }),
    carta('Front // Back', { side: 'a', colorIdentity: ['G'] }), carta('Front // Back', { side: 'b', colorIdentity: ['G'] }), carta('Sol Ring', { types: ['Artifact'] })],
  sideBoard: [carta('Extra Card', { count: 2 })], tokens: [{ name: 'Soldier' }, { name: 'Soldier' }, { name: 'Treasure' }] } };

test('Z1 · formatoDoTipo: Commander, Brawl, Construído (desafio) e Iniciante; o resto fica de fora', () => {
  assert.equal(C.formatoDoTipo('Commander Deck'), 'commander');
  assert.equal(C.formatoDoTipo('Brawl Deck'), 'brawl');
  assert.equal(C.formatoDoTipo('Challenger Deck'), 'construido');
  for (const t of ['Starter Deck', 'Welcome Deck', 'Planeswalker Deck', 'Intro Pack', 'Theme Deck', 'Duel Deck', 'Starter Kit']) assert.equal(C.formatoDoTipo(t), 'iniciante', t);
  for (const t of ['Planechase Deck', 'Archenemy Deck', 'Box Set', 'Secret Lair Drop', 'Arena Starter Deck', 'MTGO Theme Deck', '', null]) assert.equal(C.formatoDoTipo(t), null, String(t));
});

test('Z1 · normalizaLista: zonas, soma por nome, face de trás não conta, cores do comandante, destaque, data, descrição e fichas', () => {
  const l = C.normalizaLista(DECK, { fileName: 'AnimoDeTeste_TST' });
  assert.equal(l.id, 'mtgjson-animodeteste-tst'); assert.equal(l.nome, 'Ânimo de Teste'); assert.equal(l.formato, 'commander'); assert.equal(l.codigo, 'TST');
  assert.deepEqual(l.entradas, [{ name: 'Teste, the Leader', qty: 1, zone: 'commander' }, { name: 'Forest', qty: 10, zone: 'main' }, { name: 'Plains', qty: 9, zone: 'main' },
    { name: 'Sol Ring', qty: 2, zone: 'main' }, { name: 'Front // Back', qty: 1, zone: 'main' }, { name: 'Extra Card', qty: 2, zone: 'side' }]);
  assert.equal(l.cartas, 23); assert.equal(l.reserva, 2);
  assert.equal(l.cores, 'WG'); assert.equal(l.destaque, 'Teste, the Leader'); assert.equal(l.destaqueId, 'abcdef01-2345-6789-abcd-ef0123456789');
  assert.deepEqual(l.comandante, ['Teste, the Leader']); assert.deepEqual(l.fichas, ['Soldier', 'Treasure']);
  assert.equal(l.descricao, 'Commander Deck lançada pela Wizards em 26/09/2026 (TST).');
  // sem comandante: cores das mágicas, destaque pela raridade
  const sem = C.normalizaLista({ data: { ...DECK.data, type: 'Challenger Deck', commander: [], mainBoard: [carta('Island', { types: ['Land'], colorIdentity: ['U'] }), carta('Opt', { colorIdentity: ['U'] }), carta('Big Rare', { rarity: 'rare', colorIdentity: ['R'] })] } }, { fileName: 'X_Y' });
  assert.equal(sem.formato, 'construido'); assert.equal(sem.cores, 'UR'); assert.equal(sem.destaque, 'Big Rare');
  assert.equal(C.normalizaLista({ data: { ...DECK.data, type: 'Planechase Deck' } }), null);
  assert.equal(C.normalizaLista({ data: { name: 'Vazia', type: 'Commander Deck', mainBoard: [] } }), null);
});

test('Z1 · candidatas: só formatos do catálogo, sem as já publicadas, da mais recente, com teto; índice por formato', () => {
  const lista = { data: [
    { name: 'A', fileName: 'A_1', type: 'Commander Deck', releaseDate: '2024-01-01' }, { name: 'B', fileName: 'B_2', type: 'Planechase Deck', releaseDate: '2025-01-01' },
    { name: 'C', fileName: 'C_3', type: 'Challenger Deck', releaseDate: '2025-06-01' }, { name: 'D', fileName: 'D_4', type: 'Commander Deck', releaseDate: '2026-02-02' }, { name: 'E', fileName: 'E_5', type: 'Theme Deck', releaseDate: null }] };
  assert.deepEqual(C.candidatas(lista).map(d => d.name), ['D', 'C', 'A', 'E']);
  assert.deepEqual(C.candidatas(lista, new Set(['mtgjson-d-4']), 2).map(d => d.name), ['C', 'A']);
  const idx = C.montaIndice([{ id: '1', nome: 'Um', formato: 'commander', data: '2020-01-01' }, { id: '2', nome: 'Dois', formato: 'iniciante', data: '2026-01-01' }, { id: '3', nome: 'Três', formato: 'commander', data: '2025-01-01' }], { agora: Date.UTC(2026, 9, 9), pendentes: 7 });
  assert.deepEqual(idx.formatos, [{ id: 'commander', nome: 'Commander', listas: 2 }, { id: 'iniciante', nome: 'Iniciante', listas: 1 }]);
  assert.deepEqual(idx.listas.map(l => l.id), ['2', '3', '1']); assert.equal(idx.total, 3); assert.equal(idx.pendentes, 7); assert.equal(idx.fontes[0].licenca, 'MIT');
  assert.equal(idx.geradoEm, '2026-10-09T00:00:00.000Z');
});

test('Z1 · publica: baixa só o que falta, grava a lista e o índice, continua de onde parou, e não regrava sem novidade', async () => {
  const pasta = await mkdtemp(join(tmpdir(), 'catalogo-'));
  try {
    const pedidos = [];
    const deckList = { data: [{ name: 'Novo', fileName: 'Novo_N1', type: 'Commander Deck', releaseDate: '2026-09-01' }, { name: 'Velho', fileName: 'Velho_V1', type: 'Theme Deck', releaseDate: '2001-01-01' }] };
    const busca = async url => { pedidos.push(url.replace(C.BASE, '')); const corpo = url.endsWith('DeckList.json') ? deckList : { data: { ...DECK.data, name: url.includes('Novo') ? 'Novo' : 'Velho', type: url.includes('Novo') ? 'Commander Deck' : 'Theme Deck' } }; return { ok: true, status: 200, json: async () => corpo }; };
    const r1 = await C.publica(pasta, { busca, max: 1, pausa: 0, agora: Date.UTC(2026, 9, 9), mtgo: false, fichas: false, completar: false }); // (o Magic Online, as fichas e os nomes e valores têm teste próprio: G-241, G-242 e G-248)
    assert.equal(r1.gravou, true); assert.equal(r1.novas, 1); assert.equal(r1.indice.pendentes, 1);
    assert.deepEqual(pedidos, ['DeckList.json', 'decks/Novo_N1.json']);
    const lista = JSON.parse(await readFile(join(pasta, 'listas', 'mtgjson-novo-n1.json'), 'utf8')); assert.equal(lista.nome, 'Novo'); assert.ok(lista.entradas.length > 3);
    const r2 = await C.publica(pasta, { busca, max: 5, pausa: 0, mtgo: false, fichas: false, completar: false });
    assert.equal(r2.novas, 1); assert.equal(r2.indice.total, 2); assert.equal(r2.indice.pendentes, 0);
    assert.deepEqual(pedidos.slice(2), ['DeckList.json', 'decks/Velho_V1.json'], 'o que já foi publicado não é baixado de novo');
    const r3 = await C.publica(pasta, { busca, pausa: 0, mtgo: false, fichas: false, completar: false });
    assert.equal(r3.gravou, false, 'sem lista nova, nada é regravado (sem commit à toa)');
  } finally { await rm(pasta, { recursive: true, force: true }); }
});

test('Z5 · TopDeck.gg: texto e estrutura da lista (metadado não é carta), oito primeiras por torneio, cores e destaque pela Scryfall, nova tentativa no limite de pedidos e retenção de 60 dias', async () => {
  assert.deepEqual(C.leDecklist('~~Commanders~~\nAtraxa, Grand Unifier\n~~Mainboard~~\n4 Lightning Bolt\n1x Sol Ring (CMM) 400\n4 Lightning Bolt\n~~Sideboard~~\n2 Pyroblast\n~~Maybeboard~~\n1 Talvez'),
    [{ name: 'Atraxa, Grand Unifier', qty: 1, zone: 'commander' }, { name: 'Lightning Bolt', qty: 8, zone: 'main' }, { name: 'Sol Ring', qty: 1, zone: 'main' }, { name: 'Pyroblast', qty: 2, zone: 'side' }]);
  assert.deepEqual(C.leDecklist('https://moxfield.com/decks/abc'), []);
  assert.deepEqual(C.leDeckObj({ Mainboard: { 'Ponder': { id: 'x', count: 4 }, 'Island': 16 }, Sideboard: { 'Hydroblast': { count: 2 } }, metadata: { game: 'Magic', format: 'Pauper', importedFrom: 'x' }, game: 'Magic' }),
    [{ name: 'Ponder', qty: 4, zone: 'main' }, { name: 'Island', qty: 16, zone: 'main' }, { name: 'Hydroblast', qty: 2, zone: 'side' }]);
  const torneio = { TID: 'Copa Teste #1', tournamentName: 'Copa Teste', startDate: Date.UTC(2026, 9, 4) / 1000, eventData: { city: 'Curitiba', state: 'PR' },
    standings: Array.from({ length: 12 }, (_, i) => ({ name: 'Jogador ' + (i + 1), wins: 5 - Math.min(i, 5), losses: Math.min(i, 5), draws: 0,
      deckObj: i === 2 ? null : { Mainboard: { 'Ponder': 4, 'Island': 16, 'Lightning Bolt': 4 }, Sideboard: { 'Pyroblast': 2 } }, decklist: i === 2 ? 'https://moxfield.com/x' : '' })) };
  const ls = C.listasDoTorneio(torneio, 'pauper');
  assert.deepEqual(ls.map(l => l.posicao), [1, 2, 4, 5, 6, 7, 8], 'oito primeiras; a de lista só por link fica de fora');
  assert.equal(ls[0].id, 'topdeck-copa-teste-1-1'); assert.equal(ls[0].nome, '1º · Copa Teste'); assert.equal(ls[0].tipo, 'Torneio · 1º de 12'); assert.equal(ls[0].data, '2026-10-04');
  assert.equal(ls[0].descricao, '1º lugar entre 12 jogadores em Copa Teste (Curitiba, PR), em 04/10/2026. Lista de Jogador 1.'); assert.equal(ls[0].campanha, '5-0-0'); assert.equal(ls[0].cartas, 24); assert.equal(ls[0].reserva, 2);
  const dados = new Map([['ponder', { id: '11111111-2222-3333-4444-555555555555', color_identity: ['U'], rarity: 'common', type_line: 'Sorcery' }], ['island', { color_identity: [], type_line: 'Basic Land — Island' }],
    ['lightning bolt', { id: '66666666-7777-8888-9999-000000000000', color_identity: ['R'], rarity: 'uncommon', type_line: 'Instant' }]]);
  const e = C.enriquece(ls[0], dados);
  assert.equal(e.cores, 'UR'); assert.equal(e.destaque, 'Lightning Bolt', 'empate em cópias: a mais rara'); assert.equal(e.destaqueId, '66666666-7777-8888-9999-000000000000');
  // coleta: 429 numa consulta tenta de novo; a Scryfall dá as cores
  let chamadas = 0;
  const busca = async (url, op) => {
    if (url.includes('scryfall')) return { ok: true, status: 200, json: async () => ({ data: [...dados.entries()].map(([k, v]) => ({ name: k.replace(/\b\w/g, c => c.toUpperCase()), ...v })) }) };
    chamadas++; const corpo = JSON.parse(op.body); assert.equal(op.headers.Authorization, 'chave-falsa'); assert.equal(corpo.game, 'Magic: The Gathering');
    if (corpo.format === 'Modern' && chamadas < 3) return { ok: false, status: 429, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => (corpo.format === 'Pauper' ? [torneio] : []) };
  };
  const r = await C.coletaTopdeck('chave-falsa', { busca, pausa: 0 });
  assert.equal(r.falhas, 0); assert.equal(r.listas.length, 7); assert.equal(r.listas[0].cores, 'UR');
  assert.deepEqual(r.porFormato.map(f => [f.formato, f.listas]), [['Pauper', 7], ['Modern', 0], ['Standard', 0], ['Pioneer', 0], ['Legacy', 0], ['EDH', 0]]);
  // publicação: as de torneio entram no índice com a fonte; as de mais de 60 dias saem
  const pasta = await mkdtemp(join(tmpdir(), 'catalogo-td-'));
  try {
    const { writeFile } = await import('node:fs/promises');
    await writeFile(join(pasta, 'indice.json'), JSON.stringify(C.montaIndice([{ id: 'topdeck-velha-1', nome: 'Velha', formato: 'pauper', fonte: 'topdeck', data: '2026-01-01' }], { agora: Date.UTC(2026, 9, 1) })));
    const buscaTudo = async (url, op) => (url.includes('DeckList') ? { ok: true, status: 200, json: async () => ({ data: [] }) } : busca(url, op));
    const p = await C.publica(pasta, { busca: buscaTudo, pausa: 0, agora: Date.UTC(2026, 9, 9), chaveTopdeck: 'chave-falsa', mtgo: false, fichas: false, completar: false });
    assert.equal(p.gravou, true); assert.equal(p.novasTd, 7);
    assert.ok(!p.indice.listas.some(l => l.id === 'topdeck-velha-1'), 'a de janeiro saiu');
    assert.deepEqual(p.indice.fontes.map(f => f.id), ['mtgjson', 'topdeck']); assert.equal(p.indice.listas[0].jogador, 'Jogador 1');
    assert.ok(JSON.parse(await readFile(join(pasta, 'coleta.json'), 'utf8')).topdeck.length === 6);
  } finally { await rm(pasta, { recursive: true, force: true }); }
});

/* ---------------- G-241 · Magic Online (relato #8) ---------------- */
const PAGINA_MES = `<html><body><ul class="decklists-list">
<li class="decklists-item"><a href="/decklist/pauper-challenge-32-2026-10-0512855502"><div><h3>Pauper Challenge 32</h3></div><time datetime="2026-10-05T17:00:00Z">October 5</time></a></li>
<li class="decklists-item"><a href="/decklist/standard-league-2026-10-0511129"><div><h3>Standard League</h3></div><time datetime="2026-10-05">October 5</time></a></li>
<li class="decklists-item"><a href="/decklist/pauper-league-2026-10-0311130"><div><h3>Pauper League</h3></div><time datetime="2026-10-03">October 3</time></a></li>
<li class="decklists-item"><a href="/decklist/pauper-challenge-32-2026-08-2012855000"><div><h3>Pauper Challenge 32</h3></div><time datetime="2026-08-20">August 20</time></a></li>
<li class="decklists-item"><a href="/decklist/limited-super-qualifier-2026-10-0412845"><div><h3>Limited Super Qualifier</h3></div><time datetime="2026-10-04">October 4</time></a></li>
<li class="decklists-item"><a href="/decklist/duel-commander-league-2026-10-0111217"><div><h3>Duel Commander League</h3></div><time datetime="2026-10-01">October 1</time></a></li>
<li class="decklists-item"><a href="/decklist/vintage-showcase-challenge-2026-10-0412855600"><div><h3>Vintage Showcase Challenge</h3></div><time datetime="2026-10-04">October 4</time></a></li>
</ul></body></html>`;
const cartaMo = (name, qty = 4) => ({ qty: String(qty), sideboard: 'false', card_attributes: { card_name: name, cost: '1' } });
const deckMo = (player, loginid, extra = {}) => ({ player, loginid, main_deck: [cartaMo('Slippery Bogle'), cartaMo('Island', 20), cartaMo('Ancestral Mask', 3)], sideboard_deck: [cartaMo('Hydroblast', 2)], wins: null, ...extra });
const paginaEvento = dados => `<html><head><script>window.MTGO = window.MTGO || {}; window.MTGO.decklists = {}; window.MTGO.decklists.data = ${JSON.stringify(dados)};\nwindow.MTGO.outra = 1;</script></head><body>"}"</body></html>`;
const DESAFIO = { site_name: 'pauper-challenge-32-2026-10-0512855502', description: 'Pauper Challenge 32', starttime: '2026-10-05 17:00:00.0', format: 'CPAUPER', type: 'TOURNAMENT', player_count: { players: '52' },
  final_rank: [{ loginid: '2', rank: '1' }, { loginid: '1', rank: '2' }, { loginid: '3', rank: '3' }],
  decklists: [deckMo('primeiro-na-lista', '1'), deckMo('campeao "aspas" & cia', '2'), deckMo('terceiro', '3'), deckMo('sem-ranking', '9'), { player: 'vazio', loginid: '4', main_deck: [], sideboard_deck: [] }] };
const LIGA = { site_name: 'standard-league-2026-10-0511129', publish_date: '2026-10-05', format: 'CSTANDARD', type: 'LEAGUE', player_count: null,
  decklists: Array.from({ length: 10 }, (_, i) => deckMo('liga' + i, String(100 + i), { wins: { wins: '5', losses: '0' } })) };

test('G-241 · Magic Online: a página do mês vira eventos (só os formatos do catálogo), o JSON da página do evento é lido com chaves equilibradas, desafio sai pela colocação e liga pelas 5-0', () => {
  const evs = C.leEventosMtgo(PAGINA_MES);
  assert.deepEqual(evs.map(e => [e.slug, e.formato, e.tipo, e.data]), [
    ['pauper-challenge-32-2026-10-0512855502', 'pauper', 'desafio', '2026-10-05'], ['standard-league-2026-10-0511129', 'standard', 'liga', '2026-10-05'],
    ['pauper-league-2026-10-0311130', 'pauper', 'liga', '2026-10-03'], ['pauper-challenge-32-2026-08-2012855000', 'pauper', 'desafio', '2026-08-20'],
    ['vintage-showcase-challenge-2026-10-0412855600', 'vintage', 'desafio', '2026-10-04']], 'Limited e Duel Commander ficam de fora');
  assert.equal(evs[0].url, 'https://www.mtgo.com/decklist/pauper-challenge-32-2026-10-0512855502');
  assert.equal(C.leDadosMtgo('<html>sem nada</html>'), null);
  const d = C.leDadosMtgo(paginaEvento(DESAFIO)); assert.equal(d.description, 'Pauper Challenge 32'); assert.equal(d.decklists[1].player, 'campeao "aspas" & cia');
  // desafio: pela colocação do final_rank, as `top` primeiras; quem não está no ranking e lista vazia ficam de fora
  const ls = C.listasDoEventoMtgo(d, evs[0], { top: 2 });
  assert.deepEqual(ls.map(l => [l.id, l.nome, l.posicao, l.jogador, l.tipo, l.jogadores, l.cartas, l.reserva]), [
    ['mtgo-pauper-challenge-32-2026-10-0512855502-1', '1º · Pauper Challenge 32', 1, 'campeao "aspas" & cia', 'Desafio · 1º de 52', 52, 27, 2],
    ['mtgo-pauper-challenge-32-2026-10-0512855502-2', '2º · Pauper Challenge 32', 2, 'primeiro-na-lista', 'Desafio · 2º de 52', 52, 27, 2]]);
  assert.equal(ls[0].fonte, 'mtgo'); assert.equal(ls[0].formato, 'pauper'); assert.equal(ls[0].data, '2026-10-05'); assert.match(ls[0].descricao, /^1º lugar entre 52 jogadores no Pauper Challenge 32 do Magic Online, em 05\/10\/2026\. Lista de campeao "aspas" & cia\.$/);
  assert.deepEqual(ls[0].entradas.find(e => e.zone === 'side'), { name: 'Hydroblast', qty: 2, zone: 'side' });
  // dado de terceiro é dado: nome de jogador ou de carta com HTML fica como texto no JSON (o app desenha por texto) e o id só leva [a-z0-9-]
  const hostil = C.listasDoEventoMtgo({ ...LIGA, decklists: [deckMo('<img src=x onerror=alert(1)>', '7', { main_deck: [cartaMo('<script>x</script>', 60)], wins: { wins: '5', losses: '0' } })] }, { ...evs[1], slug: 'standard-league-2026-10-05<b>', titulo: 'Standard League' });
  assert.equal(hostil[0].jogador, '<img src=x onerror=alert(1)>'); assert.equal(hostil[0].entradas[0].name, '<script>x</script>'); assert.match(hostil[0].id, /^mtgo-[a-z0-9-]+-1$/);
  // liga: as 5-0 na ordem publicada, até `maxLiga`
  const lg = C.listasDoEventoMtgo(LIGA, evs[1], { maxLiga: 3 });
  assert.deepEqual(lg.map(l => [l.nome, l.tipo, l.campanha, l.posicao]), [['5-0 · Standard League', 'Liga · 5-0', '5-0', 1], ['5-0 · Standard League', 'Liga · 5-0', '5-0', 2], ['5-0 · Standard League', 'Liga · 5-0', '5-0', 3]]);
  assert.match(lg[0].descricao, /^5-0 na Standard League do Magic Online, em 05\/10\/2026\. Lista de liga0\.$/);
  // escolha: dentro de 30 dias, desafios e ligas mais recentes por formato, pulando os já publicados
  const esc = C.escolheEventosMtgo(evs, { agora: Date.UTC(2026, 9, 9), publicados: new Set(['pauper-league-2026-10-0311130']), ligas: 1 });
  assert.deepEqual(esc.map(e => e.slug), ['standard-league-2026-10-0511129', 'vintage-showcase-challenge-2026-10-0412855600', 'pauper-challenge-32-2026-10-0512855502'], 'o desafio de agosto está fora da janela; a liga de Pauper já foi colhida');
});

test('G-241 · coleta e publicação do Magic Online: lê este mês e o anterior, baixa só os eventos novos, cores pela Scryfall, retenção de 30 dias e Vintage no índice', async () => {
  const pedidos = [];
  const busca = async (url, op) => { pedidos.push(url);
    if (url.includes('/decklists/2026/10')) return { ok: true, status: 200, text: async () => PAGINA_MES };
    if (url.includes('/decklists/2026/09')) return { ok: true, status: 200, text: async () => '<ul></ul>' };
    if (url.endsWith('pauper-challenge-32-2026-10-0512855502')) return { ok: true, status: 200, text: async () => paginaEvento(DESAFIO) };
    if (url.endsWith('standard-league-2026-10-0511129')) return { ok: true, status: 200, text: async () => paginaEvento(LIGA) };
    if (url.endsWith('pauper-league-2026-10-0311130')) return { ok: true, status: 200, text: async () => '<html>sem dados</html>' };
    if (url.endsWith('vintage-showcase-challenge-2026-10-0412855600')) return { ok: false, status: 503 };
    if (url.includes('scryfall')) { const ids = JSON.parse(op.body).identifiers; return { ok: true, status: 200, json: async () => ({ data: ids.map(i => ({ id: '0000aaaa-1111-2222-3333-444444444444', name: i.name, color_identity: i.name === 'Island' ? ['U'] : i.name === 'Slippery Bogle' ? ['G', 'U'] : ['G'], rarity: 'common', type_line: i.name === 'Island' ? 'Basic Land — Island' : 'Creature' })) }) }; }
    if (url.includes('DeckList')) return { ok: true, status: 200, json: async () => ({ data: [] }) };
    throw new Error('inesperado ' + url); };
  const r = await C.coletaMtgo({ busca, pausa: 0, agora: Date.UTC(2026, 9, 9) });
  assert.equal(r.falhas, 1, 'o Vintage caiu (503) e não derruba o resto');
  assert.equal(r.listas.length, 3 + 8, 'desafio: as 8 primeiras pela colocação (só 3 classificadas aqui) · liga: 8 de 10');
  assert.equal(r.listas.filter(l => l.formato === 'pauper').length, 3); assert.equal(r.listas.filter(l => l.formato === 'standard').length, 8);
  assert.equal(r.listas[0].cores, 'UG'); assert.equal(r.listas[0].destaque, 'Slippery Bogle');
  assert.deepEqual(r.porFormato.filter(f => f.listas).map(f => [f.formato, f.eventos, f.colhidos, f.listas]), [['Standard', 1, 1, 8], ['Pauper', 3, 2, 3]]);
  const pasta = await mkdtemp(join(tmpdir(), 'catalogo-mo-'));
  try {
    const { writeFile } = await import('node:fs/promises');
    await writeFile(join(pasta, 'indice.json'), JSON.stringify(C.montaIndice([{ id: 'mtgo-modern-league-2026-08-0111000-1', nome: 'Velha', formato: 'modern', fonte: 'mtgo', data: '2026-08-01' }], { agora: Date.UTC(2026, 9, 1) })));
    pedidos.length = 0;
    const p = await C.publica(pasta, { busca, pausa: 0, agora: Date.UTC(2026, 9, 9), fichas: false, completar: false });
    assert.equal(p.gravou, true); assert.equal(p.novasMo, 11);
    assert.ok(!p.indice.listas.some(l => l.id.startsWith('mtgo-modern-league-2026-08')), 'a liga de agosto saiu (30 dias)');
    assert.deepEqual(p.indice.fontes.map(f => f.id), ['mtgjson', 'mtgo']);
    assert.deepEqual(p.indice.formatos.map(f => [f.id, f.listas]), [['pauper', 3], ['standard', 8]]);
    assert.ok(JSON.parse(await readFile(join(pasta, 'listas', 'mtgo-pauper-challenge-32-2026-10-0512855502-1.json'), 'utf8')).entradas.length === 4);
    const coleta = JSON.parse(await readFile(join(pasta, 'coleta.json'), 'utf8')); assert.equal(coleta.mtgo.length, 6); assert.equal(coleta.topdeck, null);
    // segunda coleta: os eventos já publicados não são baixados de novo; sem novidade nada é regravado
    pedidos.length = 0;
    const p2 = await C.publica(pasta, { busca, pausa: 0, agora: Date.UTC(2026, 9, 9), fichas: false, completar: false });
    assert.equal(p2.novasMo, 0); assert.equal(p2.gravou, false);
    assert.ok(!pedidos.some(u => u.endsWith('0512855502') || u.endsWith('0511129')), 'páginas já colhidas não são pedidas: ' + pedidos.filter(u => u.includes('mtgo')).join());
  } finally { await rm(pasta, { recursive: true, force: true }); }
});

/* ---------------- G-242 · catálogo de fichas (relato #9) ---------------- */
test('G-242 · fichas pela Scryfall: só fichas, uma por nome e P/T, tipos e subtipos lidos da linha de tipo, duas faces fora; páginas seguidas; arquivo renovado só depois de 7 dias', async () => {
  const c = (name, type_line, extra = {}) => ({ name, type_line, colors: [], ...extra });
  assert.deepEqual(C.fichaDaCarta(c('Bird', 'Token Creature — Bird', { power: '1', toughness: '1', colors: ['U'] })), { name: 'Bird', types: ['creature'], subtypes: ['Bird'], colors: ['U'], power: '1', toughness: '1' });
  assert.deepEqual(C.fichaDaCarta(c('Treasure', 'Token Artifact — Treasure')), { name: 'Treasure', types: ['artifact'], subtypes: ['Treasure'], colors: [] });
  assert.equal(C.fichaDaCarta(c('Elspeth, Sun\'s Champion Emblem', 'Emblem — Elspeth')), null);
  assert.equal(C.fichaDaCarta(c('Incubator // Phyrexian', 'Token Artifact // Token Artifact Creature — Phyrexian')), null, 'ficha de duas faces fica de fora');
  const todas = C.fichasDasCartas([c('Soldier', 'Token Creature — Soldier', { power: '1', toughness: '1', colors: ['W'] }), c('Soldier', 'Token Creature — Soldier', { power: '1', toughness: '1', colors: ['R'] }), c('Soldier', 'Token Creature — Soldier', { power: '2', toughness: '2', colors: ['W'] }), c('Bird', 'Token Creature — Bird', { power: '1', toughness: '1', colors: ['U'] })]);
  assert.deepEqual(todas.map(f => [f.name, f.power, f.colors.join('')]), [['Bird', '1', 'U'], ['Soldier', '1', 'W'], ['Soldier', '2', 'W']], 'a mesma chave (nome + P/T) vale uma vez');
  const pedidos = [];
  const busca = async url => { pedidos.push(url); const p2 = url.includes('page=2');
    return { ok: true, status: 200, json: async () => ({ object: 'list', has_more: !p2, next_page: p2 ? null : 'https://api.scryfall.com/cards/search?q=t%3Atoken&page=2', data: p2 ? [c('Zombie', 'Token Creature — Zombie', { power: '2', toughness: '2', colors: ['B'] })] : [c('Bird', 'Token Creature — Bird', { power: '1', toughness: '1', colors: ['U'] })] }) }; };
  const r = await C.coletaFichas({ busca, pausa: 0 });
  assert.equal(r.paginas, 2); assert.deepEqual(r.fichas.map(f => f.name), ['Bird', 'Zombie']);
  assert.ok(pedidos[0].includes('q=t%3Atoken+-t%3Aemblem') && pedidos[0].includes('include_extras=true') && pedidos[0].includes('unique=cards'));
  const pasta = await mkdtemp(join(tmpdir(), 'catalogo-fi-'));
  try {
    const a = await C.publicaFichas(pasta, { busca, pausa: 0, agora: Date.UTC(2026, 9, 10) });
    assert.deepEqual(a, { gravou: true, total: 2 });
    const f = JSON.parse(await readFile(join(pasta, 'fichas.json'), 'utf8')); assert.equal(f.versao, 1); assert.equal(f.fonte, 'scryfall'); assert.equal(f.fichas[1].name, 'Zombie');
    pedidos.length = 0;
    assert.deepEqual(await C.publicaFichas(pasta, { busca, pausa: 0, agora: Date.UTC(2026, 9, 12) }), { gravou: false, total: 2 }); assert.equal(pedidos.length, 0, 'dentro da semana não busca');
    const cai = async () => ({ ok: false, status: 503 });
    assert.deepEqual(await C.publicaFichas(pasta, { busca: cai, pausa: 0, agora: Date.UTC(2026, 9, 20) }), { gravou: false, total: 2, falhas: 1 }, 'fonte fora do ar: fica o de antes');
    assert.equal(JSON.parse(await readFile(join(pasta, 'fichas.json'), 'utf8')).fichas.length, 2);
  } finally { await rm(pasta, { recursive: true, force: true }); }
});

test('G-246 · TopDeck EDH: janela própria de 14 dias com prazo maior; se ainda estourar o prazo, tenta uma vez com 7 dias; os outros formatos ficam com 60 dias', async () => {
  const pedidos = [];
  const busca = async (url, op) => {
    if (url.includes('scryfall')) return { ok: true, status: 200, json: async () => ({ data: [] }) };
    const corpo = JSON.parse(op.body); pedidos.push([corpo.format, corpo.last]);
    if (corpo.format === 'EDH' && corpo.last > 7) return new Promise((_, rej) => op.signal.addEventListener('abort', () => rej(new Error('This operation was aborted'))));
    return { ok: true, status: 200, json: async () => [] };
  };
  const r = await C.coletaTopdeck('chave', { busca, pausa: 0, prazos: { padrao: 200, EDH: 50 } });
  assert.equal(r.falhas, 0, 'EDH não falha: a janela menor responde');
  assert.deepEqual(pedidos.filter(([f]) => f !== 'EDH').map(([, d]) => d), [60, 60, 60, 60, 60]);
  assert.deepEqual(pedidos.filter(([f]) => f === 'EDH'), [['EDH', 14], ['EDH', 7]]);
  assert.deepEqual(r.porFormato.find(f => f.formato === 'EDH'), { formato: 'EDH', torneios: 0, recentes: 0, listas: 0, semLista: 0, dias: 7 });
  // nada responde: o erro fica no relatório, sem derrubar os outros formatos
  const r2 = await C.coletaTopdeck('chave', { busca: async (url, op) => (url.includes('scryfall') ? { ok: true, status: 200, json: async () => ({ data: [] }) } : JSON.parse(op.body).format === 'EDH' ? new Promise((_, rej) => op.signal.addEventListener('abort', () => rej(new Error('This operation was aborted')))) : { ok: true, status: 200, json: async () => [] }), pausa: 0, prazos: { padrao: 200, EDH: 30 } });
  assert.equal(r2.falhas, 1); assert.match(r2.porFormato.find(f => f.formato === 'EDH').erro, /aborted/);
});

// ---------------------------------------------------------------------------------------------------------------
// G-248 · relato #15 · nome da lista (o arquétipo, dado pelo coletor), evento à parte e valor somado.
import { writeFile as grava248, mkdir as pasta248 } from 'node:fs/promises';
/** Scryfall de mentira: responde /cards/collection com as cartas da tabela (nome → { tipo, usd, … }); o resto é "não encontrada". */
function scryfall248(tabela, { falha = () => false, pedidos = [] } = {}) {
  return async (url, init = {}) => {
    if (!String(url).includes('/cards/collection')) throw new Error('pedido inesperado: ' + url);
    const nomes = JSON.parse(init.body).identifiers.map(i => i.name); pedidos.push(nomes);
    if (falha()) return { ok: false, status: 503, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => ({ data: nomes.filter(n => tabela[n]).map(n => ({ id: '0000aaaa-1111-2222-3333-444455556666', name: n, color_identity: tabela[n].ci || [], rarity: tabela[n].rar || 'common', type_line: tabela[n].tipo, prices: tabela[n].precos || { usd: tabela[n].usd != null ? String(tabela[n].usd) : null } })) }) };
  };
}
const dados248 = t => new Map(Object.entries(t).map(([n, c]) => [n.toLowerCase(), { id: 'x', color_identity: c.ci || [], rarity: c.rar || 'common', type_line: c.tipo, usd: c.usd == null ? null : c.usd }]));
const E = (name, qty, zone = 'main') => ({ name, qty, zone });

test('G-248 · nome das cores e nome curto', () => {
  assert.equal(C.nomeDasCores('UR'), 'Izzet'); assert.equal(C.nomeDasCores('RU'), 'Izzet', 'a ordem das letras não importa'); assert.equal(C.nomeDasCores('BG'), 'Golgari');
  assert.equal(C.nomeDasCores('R'), 'Mono Red'); assert.equal(C.nomeDasCores(''), 'Incolor'); assert.equal(C.nomeDasCores('WUB'), 'Esper'); assert.equal(C.nomeDasCores('BRG'), 'Jund');
  assert.equal(C.nomeDasCores('WUBR'), 'Quatro cores'); assert.equal(C.nomeDasCores('WUBRG'), 'Cinco cores'); assert.equal(C.nomeDasCores(null), 'Incolor');
  for (const par of ['WU', 'UB', 'BR', 'RG', 'WG', 'WB', 'UR', 'BG', 'WR', 'UG', 'WUB', 'UBR', 'BRG', 'WRG', 'WUG', 'WBG', 'WUR', 'UBG', 'WBR', 'URG']) assert.ok(/^[A-Z][a-z]+$/.test(C.nomeDasCores(par)), par);
  assert.equal(C.nomeCurto('Yawgmoth, Thran Physician'), 'Yawgmoth'); assert.equal(C.nomeCurto('Murktide Regent'), 'Murktide Regent'); assert.equal(C.nomeCurto('Fable of the Mirror-Breaker // Reflection of Kiki-Jiki'), 'Fable of the Mirror-Breaker');
});

test('G-248 · nome da lista: quem comanda; tribo que domina; senão as cores e a carta que caracteriza a lista entre as do formato', () => {
  const T = { 'Kinnan, Bonder Prodigy': { tipo: 'Legendary Creature — Human Druid' }, 'Kraum, Ludevic\'s Opus': { tipo: 'Legendary Creature — Zombie Horror' }, 'Tymna the Weaver': { tipo: 'Legendary Creature — Human Cleric' },
    'Llanowar Elves': { tipo: 'Creature — Elf Druid' }, 'Elvish Mystic': { tipo: 'Creature — Elf Druid' }, 'Priest of Titania': { tipo: 'Creature — Elf Druid' }, 'Timberwatch Elf': { tipo: 'Creature — Elf' }, 'Quirion Ranger': { tipo: 'Creature — Elf Ranger' }, 'Lead the Stampede': { tipo: 'Sorcery' },
    'Forest': { tipo: 'Basic Land — Forest' }, 'Island': { tipo: 'Basic Land — Island' }, 'Mountain': { tipo: 'Basic Land — Mountain' }, 'Dryad Arbor': { tipo: 'Land Creature — Forest Dryad' },
    'Lightning Bolt': { tipo: 'Instant' }, 'Counterspell': { tipo: 'Instant' }, 'Murktide Regent': { tipo: 'Creature — Dragon', rar: 'mythic' }, 'Dragon\'s Rage Channeler': { tipo: 'Creature — Human Shaman' }, 'Grapeshot': { tipo: 'Sorcery' }, 'Ruby Medallion': { tipo: 'Artifact' },
    'Tech de Um Piloto': { tipo: 'Instant' }, 'Delver of Secrets // Insectile Aberration': { tipo: 'Creature — Human Wizard // Creature — Human Insect' } };
  const d = dados248(T);
  assert.equal(C.nomeDaLista({ comandante: ['Kinnan, Bonder Prodigy'], cores: 'UG', entradas: [E('Kinnan, Bonder Prodigy', 1, 'commander'), E('Forest', 30)] }, d), 'Kinnan, Bonder Prodigy');
  assert.equal(C.nomeDaLista({ comandante: ['Kraum, Ludevic\'s Opus', 'Tymna the Weaver'], cores: 'WUBR', entradas: [] }, d), 'Kraum + Tymna the Weaver', 'dois comandantes: o nome curto de cada um');
  const elfos = { cores: 'G', comandante: [], entradas: [E('Llanowar Elves', 4), E('Elvish Mystic', 4), E('Priest of Titania', 4), E('Timberwatch Elf', 4), E('Quirion Ranger', 4), E('Lead the Stampede', 4), E('Forest', 16), E('Dryad Arbor', 1), E('Lightning Bolt', 3, 'side')] };
  assert.equal(C.nomeDaLista(elfos, d), 'Tribal de Elfos');
  // três criaturas em quatro precisam ser da tribo, com 16 cópias ou mais: 12 elfos e 8 de outra coisa não é tribal
  const quase = { cores: 'G', comandante: [], entradas: [E('Llanowar Elves', 4), E('Elvish Mystic', 4), E('Priest of Titania', 4), E('Murktide Regent', 4), E('Dragon\'s Rage Channeler', 4), E('Forest', 20)] };
  assert.ok(!/Tribal/.test(C.nomeDaLista(quase, d)));
  // duas famílias nas mesmas cores, com uma mágica em comum (o raio) e uma técnica de um piloto só
  const murk = extra => ({ cores: 'UR', comandante: [], entradas: [E('Murktide Regent', 4), E('Dragon\'s Rage Channeler', 4), E('Lightning Bolt', 4), E('Counterspell', 4), E('Island', 10), E('Mountain', 8), ...extra] });
  const storm = () => ({ cores: 'UR', comandante: [], entradas: [E('Grapeshot', 4), E('Ruby Medallion', 4), E('Lightning Bolt', 4), E('Island', 8), E('Mountain', 10)] });
  const burn = () => ({ cores: 'R', comandante: [], entradas: [E('Lightning Bolt', 4), E('Mountain', 20)] });
  const piloto = murk([E('Tech de Um Piloto', 4)]);
  const corpus = [murk([]), murk([]), murk([]), piloto, storm(), storm(), burn(), burn(), burn()], est = C.estatisticasDoFormato(corpus);
  assert.equal(C.nomeDaLista(corpus[0], d, est), 'Izzet Murktide Regent');
  assert.equal(C.nomeDaLista(piloto, d, est), 'Izzet Murktide Regent', 'a técnica de um piloto não renomeia o arquétipo');
  assert.equal(C.nomeDaLista(corpus[4], d, est), 'Izzet Grapeshot', 'a outra família das mesmas cores tem outro nome');
  assert.equal(C.nomeDaLista(corpus[6], d, est), 'Mono Red Lightning Bolt');
  assert.equal(C.nomeDaLista(corpus[0], d, est), C.nomeDaLista(murk([]), d, C.estatisticasDoFormato(corpus.slice().reverse())), 'a ordem das listas não muda o nome');
  assert.equal(C.nomeDaLista({ cores: 'U', comandante: [], entradas: [E('Delver of Secrets // Insectile Aberration', 4), E('Island', 18)] }, d), 'Mono Blue Delver of Secrets', 'duas faces: o nome da frente');
  // sem dados das cartas (a Scryfall falhou) ou só com terrenos: não há nome a dar
  assert.equal(C.nomeDaLista(corpus[0], new Map(), est), null); assert.equal(C.nomeDaLista({ cores: '', comandante: [], entradas: [E('Forest', 60)] }, d), null);
});

test('G-248 · valor: soma todas as cópias (deck, comandante e reserva), conta as sem preço, e devolve null sem nenhum dado', () => {
  const d = dados248({ 'A': { tipo: 'Instant', usd: 1.5 }, 'B': { tipo: 'Creature', usd: 0.1 }, 'C': { tipo: 'Land', usd: null } });
  assert.deepEqual(C.valorDasEntradas([E('A', 4), E('B', 3), E('C', 20), E('A', 2, 'side'), E('B', 1, 'commander')], d), { valorUsd: 9.4, semPreco: 20 });
  // uma carta em dez sem dado ainda vale (nome que a Scryfall não achou); um buraco maior, não: o valor sairia pela metade
  const dez = Array.from({ length: 10 }, (_, i) => E(i < 9 ? 'A' : 'Desconhecida', 1));
  assert.deepEqual(C.valorDasEntradas(dez, d), { valorUsd: 13.5, semPreco: 1 }); assert.equal(C.valorDasEntradas([E('A', 4), E('Desconhecida', 1), E('Outra', 1)], d), null);
  assert.equal(C.valorDasEntradas([E('X', 4)], d), null, 'nenhuma carta com dado: o valor de antes é mantido por quem chama');
  assert.deepEqual(C.valorDasEntradas([E('C', 2)], d), { valorUsd: 0, semPreco: 2 });
});

test('G-248 · evento: lista de torneio antiga tinha o evento no nome; lista oficial usa tipo e código', () => {
  assert.equal(C.eventoDe({ fonte: 'mtgo', nome: '5-0 · Modern League', torneio: 'Modern League', posicao: 0 }), '5-0 · Modern League');
  assert.equal(C.eventoDe({ fonte: 'topdeck', nome: '1º · Copa X', torneio: 'Copa X', posicao: 1 }), '1º · Copa X');
  assert.equal(C.eventoDe({ fonte: 'mtgo', nome: 'Izzet Murktide Regent', evento: '1º · Modern Challenge 16', nv: 1 }), '1º · Modern Challenge 16', 'o evento já dado não se perde');
  assert.equal(C.eventoDe({ fonte: 'mtgo', nome: 'Izzet X', nv: 1, torneio: 'Liga', posicao: 3 }), '3º · Liga');
  assert.equal(C.eventoDe({ fonte: 'mtgjson', nome: 'Calling All Angels', tipo: 'Commander Deck', codigo: 'FDC' }), 'Commander Deck · FDC');
  assert.equal(C.eventoDe({ fonte: 'mtgjson', nome: 'X', tipo: 'Theme Deck', codigo: '' }), 'Theme Deck');
});

test('G-248 · passada completa: dá nome uma vez, refaz o valor sempre, não perde lista quando a Scryfall falha e não regrava arquivo à toa', async () => {
  const pasta = await mkdtemp(join(tmpdir(), 'catalogo-248-'));
  try {
    await pasta248(join(pasta, 'listas'), { recursive: true });
    const T = { 'Murktide Regent': { tipo: 'Creature — Dragon', usd: 20, rar: 'mythic' }, 'Lightning Bolt': { tipo: 'Instant', usd: 1 }, 'Island': { tipo: 'Basic Land — Island', usd: 0.1 }, 'Giada, Font of Hope': { tipo: 'Legendary Creature — Angel', usd: 3 }, 'Plains': { tipo: 'Basic Land — Plains', usd: 0.1 } };
    const arq = { 'mtgo-a-1': { id: 'mtgo-a-1', nome: '1º · Modern Challenge 16', entradas: [E('Murktide Regent', 4), E('Lightning Bolt', 4), E('Island', 20), E('Lightning Bolt', 2, 'side')] },
      'mtgjson-anjos-fdc': { id: 'mtgjson-anjos-fdc', nome: 'Calling All Angels', entradas: [E('Giada, Font of Hope', 1, 'commander'), E('Plains', 30)] } };
    for (const [id, l] of Object.entries(arq)) await grava248(join(pasta, 'listas', id + '.json'), JSON.stringify(l) + '\n');
    const resumos = [{ id: 'mtgo-a-1', nome: '1º · Modern Challenge 16', formato: 'modern', fonte: 'mtgo', cores: 'UR', comandante: [], torneio: 'Modern Challenge 16', posicao: 1, data: '2026-10-10' },
      { id: 'mtgjson-anjos-fdc', nome: 'Calling All Angels', formato: 'commander', fonte: 'mtgjson', tipo: 'Commander Deck', codigo: 'FDC', cores: 'W', comandante: ['Giada, Font of Hope'], data: '2026-10-02' },
      { id: 'mtgo-sem-arquivo-1', nome: '5-0 · Legacy League', formato: 'legacy', fonte: 'mtgo', cores: '', comandante: [], data: '2026-10-01' }];
    const r1 = await C.completa(pasta, resumos, { busca: scryfall248(T), pausa: 0 });
    const [a, b, c] = r1.resumos;
    assert.equal(a.nome, 'Izzet Murktide Regent'); assert.equal(a.evento, '1º · Modern Challenge 16'); assert.equal(a.nv, C.NOME_V); assert.equal(a.valorUsd, 88); assert.equal(a.semPreco, 0);
    assert.equal(b.nome, 'Calling All Angels', 'lista oficial fica com o nome do produto'); assert.equal(b.evento, 'Commander Deck · FDC'); assert.equal(b.nv, undefined); assert.equal(b.valorUsd, 6);
    assert.deepEqual(c, resumos[2], 'sem o arquivo das cartas o resumo fica como estava');
    assert.deepEqual([r1.nomeadas, r1.comValor, r1.regravadas], [1, 2, 2]);
    const fa = JSON.parse(await readFile(join(pasta, 'listas', 'mtgo-a-1.json'), 'utf8'));
    assert.equal(fa.nome, 'Izzet Murktide Regent'); assert.equal(fa.evento, '1º · Modern Challenge 16'); assert.equal(fa.entradas.length, 4, 'as cartas ficam intactas'); assert.equal('valorUsd' in fa, false, 'o valor mora só no índice');
    // segunda passada, com o preço do dia diferente: o nome não muda, o valor sim, nenhum arquivo é regravado
    const r2 = await C.completa(pasta, r1.resumos, { busca: scryfall248({ ...T, 'Murktide Regent': { tipo: 'Creature — Dragon', usd: 25, rar: 'mythic' }, 'Lightning Bolt': { tipo: 'Creature — Elf', usd: 1 } }), pausa: 0 });
    assert.equal(r2.resumos[0].nome, 'Izzet Murktide Regent'); assert.equal(r2.resumos[0].valorUsd, 108); assert.deepEqual([r2.nomeadas, r2.regravadas], [0, 0]);
    // a Scryfall fora do ar: nome, evento e valor de antes continuam
    const r3 = await C.completa(pasta, r2.resumos, { busca: scryfall248(T, { falha: () => true }), pausa: 0 });
    assert.deepEqual(r3.resumos, r2.resumos); assert.deepEqual([r3.nomeadas, r3.comValor, r3.regravadas], [0, 0, 0]);
    // lista nova sem dados na primeira vez fica com o evento como nome (sem `nv`) e ganha nome na coleta seguinte
    const nova = [{ id: 'mtgo-a-1', nome: '1º · Modern Challenge 16', formato: 'modern', fonte: 'mtgo', cores: 'UR', comandante: [], data: '2026-10-10' }];
    await grava248(join(pasta, 'listas', 'mtgo-a-1.json'), JSON.stringify(arq['mtgo-a-1']) + '\n');
    const r4 = await C.completa(pasta, nova, { busca: scryfall248(T, { falha: () => true }), pausa: 0 });
    assert.equal(r4.resumos[0].nome, '1º · Modern Challenge 16'); assert.equal(r4.resumos[0].nv, undefined); assert.equal(r4.resumos[0].evento, '1º · Modern Challenge 16'); assert.equal('valorUsd' in r4.resumos[0], false);
    const r5 = await C.completa(pasta, r4.resumos, { busca: scryfall248(T), pausa: 0 });
    assert.equal(r5.resumos[0].nome, 'Izzet Murktide Regent'); assert.equal(r5.resumos[0].evento, '1º · Modern Challenge 16');
    // um lote da Scryfall caiu e a lista ficou com metade das cartas sem dado: nem nome nem valor nesta coleta
    const metade = await C.completa(pasta, nova, { busca: scryfall248({ 'Island': T['Island'], 'Lightning Bolt': T['Lightning Bolt'] }), pausa: 0 });
    assert.equal(metade.resumos[0].nv, undefined); assert.equal('valorUsd' in metade.resumos[0], false); assert.equal(metade.resumos[0].nome, '1º · Modern Challenge 16');
    // arquivo estragado não derruba a passada
    await grava248(join(pasta, 'listas', 'mtgo-a-1.json'), '{ nao e json');
    const r6 = await C.completa(pasta, r5.resumos, { busca: scryfall248(T), pausa: 0 }); assert.deepEqual(r6.resumos, r5.resumos);
  } finally { await rm(pasta, { recursive: true, force: true }); }
});

test('G-248 · publica: o índice sai com nome, evento e valor; sem lista nova só é regravado quando o valor muda', async () => {
  const pasta = await mkdtemp(join(tmpdir(), 'catalogo-248p-'));
  try {
    const deckList = { data: [{ name: 'Novo', fileName: 'Novo_N1', type: 'Commander Deck', releaseDate: '2026-09-01' }] };
    let usd = 2; const pedidos = [];
    const nomesDoDeck = [...DECK.data.commander, ...DECK.data.mainBoard, ...(DECK.data.sideBoard || [])].map(c => c.name);
    const sf = () => scryfall248(Object.fromEntries(nomesDoDeck.map(n => [n, { tipo: /Forest|Plains/.test(n) ? 'Basic Land' : 'Instant', usd }])), { pedidos });
    const busca = async (url, init) => String(url).includes('scryfall') ? sf()(url, init) : { ok: true, status: 200, json: async () => (url.endsWith('DeckList.json') ? deckList : { data: { ...DECK.data, name: 'Novo' } }) };
    const op = { busca, pausa: 0, mtgo: false, fichas: false };
    const r1 = await C.publica(pasta, { ...op, agora: Date.UTC(2026, 9, 9) });
    assert.equal(r1.gravou, true); const l = r1.indice.listas[0];
    assert.equal(l.nome, 'Novo'); assert.equal(l.evento, 'Commander Deck · TST'); assert.ok(l.valorUsd > 0); assert.equal(typeof l.semPreco, 'number');
    assert.deepEqual(JSON.parse(await readFile(join(pasta, 'indice.json'), 'utf8')).listas[0], l);
    const r2 = await C.publica(pasta, op); assert.equal(r2.gravou, false, 'mesmo preço, nenhuma lista nova: sem commit à toa');
    usd = 3; const r3 = await C.publica(pasta, op); assert.equal(r3.gravou, true, 'o preço do dia mudou: o índice é regravado'); assert.ok(r3.indice.listas[0].valorUsd > l.valorUsd);
    assert.ok(pedidos.every(p => p.length <= 75), 'a Scryfall recebe lotes de até 75 nomes');
  } finally { await rm(pasta, { recursive: true, force: true }); }
});
