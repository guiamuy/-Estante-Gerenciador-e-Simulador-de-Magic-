// G-365 · T-IDIOMA fatia 3 (relatos #53/#66): a tradução precisa da carta que nunca saiu impressa no idioma.
// O conferidor (idioma-cartas.mjs) barra tradução que muda símbolo, número, palavra-chave ou o nome; os pacotes
// idiomas/cartas-pt.json e cartas-es.json passam inteiros por ele; o app só mostra a tradução do Oracle atual da carta.
// Textos de carta abaixo marcados "teste" são dados de teste.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { loadModules } from './_load.mjs';
import { confere, confereTexto, conferePacote, palavrasDe, lePacote, faltam, IDIOMAS, registraTexto, juntaTextos, textosDoIdioma, formatosDe, FORMATOS_PADRAO } from './idioma-cartas.mjs';
import { ARQUIVOS } from './vercel-publico.mjs';
const { platform: P, cards: C } = loadModules();
const J = x => JSON.parse(JSON.stringify(x));

test('G-365 · conferidor: passa a tradução fiel; barra símbolo, número, palavra-chave e nome trocados, vazia e igual ao inglês', () => {
  const en = 'Flying\nWhen Teste Bolt enters, it deals 3 damage to any target.\n{2}, {T}: Draw a card.';
  const bom = 'Voar\nQuando Teste Bolt entrar, ele causa 3 pontos de dano a qualquer alvo.\n{2}, {T}: Compre um card.';
  assert.deepEqual(confereTexto(en, bom, 'pt', 'Teste Bolt'), []);
  assert.match(confereTexto(en, bom.replace('{2}', '{3}'), 'pt', 'Teste Bolt').join(), /símbolos/);
  assert.match(confereTexto(en, bom.replace('{T}', ''), 'pt', 'Teste Bolt').join(), /símbolos/);
  assert.match(confereTexto(en, bom.replace('3 pontos', '2 pontos'), 'pt', 'Teste Bolt').join(), /números/);
  assert.match(confereTexto(en, bom.replace('um card', '1 card'), 'pt', 'Teste Bolt').join(), /números/, 'algarismo a mais também');
  assert.match(confereTexto(en, bom.replace('Voar', 'Voando'), 'pt', 'Teste Bolt').join(), /flying/);
  assert.match(confereTexto(en, bom.replace('Teste Bolt', 'Raio'), 'pt', 'Teste Bolt').join(), /nome "Teste Bolt" sumiu/);
  assert.deepEqual(confereTexto(en, '', 'pt'), ['tradução vazia']);
  assert.match(confereTexto(en, en, 'pt', 'Teste Bolt').join(), /igual ao inglês/);
  // espanhol, pelo glossário de lá
  assert.deepEqual(confereTexto('Trample, haste', 'Arrolla, prisa.', 'es'), []);
  assert.match(confereTexto('Trample, haste', 'Atropelar, prisa.', 'es').join(), /trample/);
  // palavra-chave dentro do lembrete ou do nome não conta; flashback não é flash
  assert.deepEqual(palavrasDe('Flashback {2}{U} (You may cast this card from your graveyard for its flashback cost.)'), ['flashback']);
  assert.deepEqual(palavrasDe('When Flash Flood enters, draw a card.', 'Flash Flood'), []);
  // entrada inteira: tipo obrigatório; duas faces conferidas por face
  assert.deepEqual(confere('X', { original: 'Draw a card.', tipo: 'Feitiço', texto: 'Compre um card.' }, 'pt'), []);
  assert.match(confere('X', { original: 'Draw a card.', texto: 'Compre um card.' }, 'pt').join(), /sem tipo/);
  assert.match(confere('X', { original: ['Flying', 'Trample'], faces: [{ tipo: 'Criatura', texto: 'Voar' }, { tipo: 'Criatura', texto: 'Voar' }] }, 'pt').join(), /face 2: palavra-chave "trample"/);
});

test('G-365 · pacotes do robô: cartas-pt e cartas-es existem, são publicados e passam inteiros pelo conferidor', () => {
  for (const lang of IDIOMAS) {
    const p = lePacote(lang);
    assert.equal(p.idioma, lang);
    const n = Object.keys(p.cartas).length;
    assert.ok(n >= (lang === 'pt' ? 100 : 15), `${lang}: ${n} traduções`);
    assert.deepEqual(conferePacote(p, lang), {}, `${lang}: tradução reprovada pelo conferidor`);
    for (const [nome, e] of Object.entries(p.cartas)) assert.ok(typeof e.original === 'string' || Array.isArray(e.original), `${nome}: sem o Oracle traduzido`);
    assert.ok(ARQUIVOS.includes(`idiomas/cartas-${lang}.json`), 'a Vercel publica o pacote');
  }
  // as cartas do Shark que nunca saíram em português têm tradução
  for (const nome of ['Rancor', 'Lembas', 'Razortrap Gorge', 'Twisted Landscape']) assert.ok(lePacote('pt').cartas[nome], nome);
});

test('G-365 · faltam: só a carta das listas sem impressão no idioma e sem tradução, com o Oracle conhecido', () => {
  const r = faltam('pt', { impressos: ['Island', 'Delver of Secrets'], listas: ['Island', 'Nova', 'Já', 'Delver of Secrets // Insectile Aberration', 'Nova'],
    textos: new Map([['Nova', { oracle_text: 'Draw a card.' }]]), pacote: { cartas: { 'Já': {} } } });
  assert.deepEqual(J(r), [{ nome: 'Nova', oracle: { oracle_text: 'Draw a card.' } }]);
});

test('G-365 · app: a tradução só vale para o Oracle que ela traduziu; uma face vale para a primeira face', () => {
  const pacote = { cartas: { 'Teste Bolt': { original: 'Deals 3 damage to any target.', tipo: 'Mágica Instantânea', texto: 'Causa 3 pontos de dano a qualquer alvo.' },
    'Teste DFC': { original: 'Flying', tipo: 'Criatura — Teste', texto: 'Voar' } } };
  const d = C.traducaoDaCarta(pacote, { name: 'Teste Bolt', oracle_text: 'Deals 3 damage to any  target.' }, 'pt');
  assert.deepEqual(J(d), { lang: 'pt', nome: '', traducao: true, tipo: 'Mágica Instantânea', texto: 'Causa 3 pontos de dano a qualquer alvo.', faces: [] });
  assert.equal(C.traducaoDaCarta(pacote, { name: 'Teste Bolt', oracle_text: 'Deals 4 damage to any target.' }, 'pt'), null, 'regra mudou: fica em inglês');
  assert.equal(C.traducaoDaCarta(pacote, { name: 'Outra', oracle_text: 'x' }, 'pt'), null);
  assert.equal(C.traducaoDaCarta(pacote, { name: 'constructor', oracle_text: 'x' }, 'pt'), null, 'só chave própria do pacote');
  const dfc = C.traducaoDaCarta(pacote, { name: 'Teste DFC', faces: [{ oracle_text: 'Flying' }, { oracle_text: 'Trample' }] }, 'pt');
  assert.equal(dfc.faces[0].texto, 'Voar'); assert.equal(dfc.faces[1], null);
});

test('G-365 · app: o pacote é baixado uma vez, guardado no aparelho, vale sem internet e renova depois do prazo', async () => {
  let agora = 1000, pedidos = 0, falha = false;
  const pacote = { v: 1, idioma: 'pt', cartas: { 'Teste Bolt': { original: 'Deals 3 damage to any target.', tipo: 'Mágica Instantânea', texto: 'Causa 3 pontos de dano.' } } };
  const fetch = async url => { pedidos++; assert.equal(url, 'idiomas/cartas-pt.json'); if (falha) throw new Error('sem rede'); return { ok: true, json: async () => pacote }; };
  const store = P.memoryStore();
  const carta = { name: 'Teste Bolt', oracle_text: 'Deals 3 damage to any target.' };
  const T = C.createTraducaoCartas({ store, fetch, agora: () => agora });
  assert.equal((await T.busca(carta, 'pt')).texto, 'Causa 3 pontos de dano.');
  await T.busca(carta, 'pt'); assert.equal(pedidos, 1, 'uma busca por sessão');
  // outra sessão, sem internet: do aparelho
  falha = true;
  const T2 = C.createTraducaoCartas({ store, fetch, agora: () => agora });
  assert.equal((await T2.busca(carta, 'pt')).texto, 'Causa 3 pontos de dano.'); assert.equal(pedidos, 1);
  // depois do prazo: mostra o guardado e renova em segundo plano
  agora += C.TRADUCAO_PRAZO_MS; falha = false;
  const T3 = C.createTraducaoCartas({ store, fetch, agora: () => agora });
  assert.ok(await T3.busca(carta, 'pt')); assert.equal(pedidos, 2);
  // sem internet e sem cópia: null (a folha fica em inglês com o aviso), e tenta de novo na próxima carta
  falha = true;
  const T4 = C.createTraducaoCartas({ store: P.memoryStore(), fetch, agora: () => agora });
  assert.equal(await T4.busca(carta, 'pt'), null); assert.equal(await T4.busca(carta, 'pt'), null); assert.equal(pedidos, 4);
  assert.equal(await C.createTraducaoCartas({ store: P.memoryStore() }).busca(carta, 'pt'), null, 'sem fetch');
});

test('G-365 · a folha da carta usa a tradução só quando a carta nunca saiu impressa, com o selo "Tradução" e o original a um toque', () => {
  const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
  assert.match(html, /__m12\.usaTraducaoCartas\(__m7\.createTraducaoCartas\(/);
  assert.match(html, /if \(!r\.dado\) traduz\(run\)/);
  assert.match(html, /`Tradução para o \$\{nomeLang\}`/);
});

// G-368 · lote 2 (relatos #53/#66): a carta de duas faces (aventura, presságio, preparar, Sala) é procurada no app pelo nome
// inteiro da Scryfall; o lote 1 tinha gravado três delas pela frente ("Sagu Wildling"), e a tradução nunca aparecia.
test('G-368 · Oracle de duas faces: frente + verso viram o nome inteiro com as faces; a frente aponta para ele; a Sala não dobra o nome', () => {
  const t = new Map();
  registraTexto(t, 'Teste Frente', { type_line: 'Creature — Teste', oracle_text: 'Flying', verso: { name: 'Teste Verso', types: 'Sorcery Omen', oracle_text: 'Draw a card.' } });
  const e = t.get('Teste Frente // Teste Verso');
  assert.equal(e.nome, 'Teste Frente // Teste Verso');
  assert.deepEqual(J(e.card_faces.map(f => [f.name, f.type_line, f.oracle_text])), [['Teste Frente', 'Creature — Teste', 'Flying'], ['Teste Verso', 'Sorcery Omen', 'Draw a card.']]);
  assert.equal(t.get('Teste Frente'), e, 'a frente aponta para o nome inteiro');
  registraTexto(t, 'Teste Sala // Teste Porta', { oracle_text: 'A.', verso: { name: 'Teste Porta', oracle_text: 'B.' } });
  assert.ok(t.has('Teste Sala // Teste Porta') && !t.has('Teste Sala // Teste Porta // Teste Porta'));
  // a primeira fonte vale; a cobertura do catálogo traz { name, texto } e o Forge do idioma, o formato das oficiais
  const j = juntaTextos([{ cartas: [{ name: 'Teste Um', oracle_text: 'Primeiro.' }] }, { pendentes: [{ name: 'Teste Um', texto: { oracle_text: 'Segundo.' } }, { name: 'Teste Dois', texto: { oracle_text: 'Da cobertura.', type_line: 'Sorcery' } }, { name: 'Teste Três', texto: null }] }]);
  assert.equal(j.get('Teste Um').oracle_text, 'Primeiro.');
  assert.equal(j.get('Teste Dois').oracle_text, 'Da cobertura.');
  assert.ok(!j.has('Teste Três'));
});

test('G-368 · faltam: a lista que cita a frente devolve o nome inteiro, com as faces; a tradução pelo nome inteiro tira a carta da fila', () => {
  const textos = new Map();
  registraTexto(textos, 'Teste Frente', { type_line: 'Creature', oracle_text: 'Flying', verso: { name: 'Teste Verso', type_line: 'Sorcery — Omen', oracle_text: 'Draw a card.' } });
  const r = faltam('pt', { impressos: [], listas: ['Teste Frente', 'Teste Frente // Teste Verso'], textos, pacote: { cartas: {} } });
  assert.equal(r.length, 1);
  assert.equal(r[0].nome, 'Teste Frente // Teste Verso');
  assert.deepEqual(J(r[0].oracle.card_faces.map(f => f.oracle_text)), ['Flying', 'Draw a card.']);
  assert.deepEqual(faltam('pt', { impressos: [], listas: ['Teste Frente'], textos, pacote: { cartas: { 'Teste Frente // Teste Verso': {} } } }), []);
  // impressa no idioma pelo nome inteiro (é o que artes:nomes-<idioma>.json traz): fora da fila
  assert.deepEqual(faltam('pt', { impressos: ['Teste Frente // Teste Verso'], listas: ['Teste Frente'], textos, pacote: { cartas: {} } }), []);
});

test('G-368 · pacotes: nenhuma tradução fica pela frente de uma carta de duas faces; o lote 2 está lá e vale no app', () => {
  const oficiais = readdirSync(new URL('./.listas/', import.meta.url)).filter(f => /^oficiais.*\.json$/.test(f)).map(f => JSON.parse(readFileSync(new URL(`./.listas/${f}`, import.meta.url), 'utf8')));
  const textos = juntaTextos([...oficiais, ...textosDoIdioma()]);
  for (const lang of IDIOMAS) for (const nome of Object.keys(lePacote(lang).cartas)) {
    const t = textos.get(nome);
    assert.ok(!t || t.nome === nome, `${lang} · "${nome}" é a frente de "${t && t.nome}": o app nunca acharia a tradução`);
  }
  const pt = lePacote('pt').cartas;
  for (const nome of ['Yip Yip!', 'Bestial Incursion', 'Waterbending Lesson', 'Holy Light', 'Elite Interceptor // Rejoinder']) assert.ok(pt[nome], nome);
  for (const nome of ['Flash Flood', 'Holy Light']) assert.ok(lePacote('es').cartas[nome], `es · ${nome}`);
  // a carta de presságio, como a Scryfall a entrega ao app (nome inteiro, duas faces), mostra as duas faces traduzidas
  const sagu = pt['Sagu Wildling // Roost Seek'];
  const card = { name: 'Sagu Wildling // Roost Seek', faces: sagu.original.map(o => ({ oracle_text: o })) };
  const d = C.traducaoDaCarta(lePacote('pt'), card, 'pt');
  assert.equal(d.faces.length, 2);
  assert.match(d.faces[0].texto, /^Voar/); assert.match(d.faces[1].texto, /grimório/); assert.equal(d.faces[1].tipo, 'Feitiço — Presságio');
});

// G-373 · lote 3 (relatos #53/#66/#108): as cartas das listas de Standard que nunca saíram impressas no idioma. O --faltam
// ganhou --formato (padrão: pauper, como antes), e o pacote traz o lote, todo pelo conferidor.
const AMOSTRA_G371_PT = ['Wild Ride', 'Impractical Joke', 'Cosmogrand Zenith', 'Fountainport Bell', 'Rewrite Regrets', 'Ashling, Rekindled // Ashling, Rimebound'];
const AMOSTRA_G371_ES = ["Agna Qel'a", 'Ashling, Rekindled // Ashling, Rimebound', 'Ba Sing Se'];
test('G-373 · --formato escolhe os formatos do catálogo; sem ele, só o Pauper', () => {
  assert.deepEqual(J(formatosDe([])), ['pauper']);
  assert.deepEqual(J(FORMATOS_PADRAO), ['pauper']);
  assert.deepEqual(J(formatosDe(['--formato', 'Standard, pioneer'])), ['standard', 'pioneer']);
  assert.deepEqual(J(formatosDe(['--formato'])), ['pauper']);
});

test('G-373 · pacotes: o lote de Standard está lá, passa no conferidor e vale no app', () => {
  const pt = lePacote('pt'), es = lePacote('es');
  assert.ok(Object.keys(pt.cartas).length >= 126 + 240, `pt: ${Object.keys(pt.cartas).length} traduções`);
  assert.ok(Object.keys(es.cartas).length >= 18 + 15, `es: ${Object.keys(es.cartas).length} traduções`);
  for (const lang of IDIOMAS) assert.deepEqual(conferePacote(lePacote(lang), lang), {}, lang);
  for (const nome of AMOSTRA_G371_PT) {
    const e = pt.cartas[nome]; assert.ok(e, `pt · ${nome}`);
    const card = Array.isArray(e.original) ? { name: nome, faces: e.original.map(o => ({ oracle_text: o })) } : { name: nome, oracle_text: e.original };
    assert.ok(C.traducaoDaCarta(pt, card, 'pt'), `pt · ${nome} aparece no app`);
  }
  for (const nome of AMOSTRA_G371_ES) assert.ok(es.cartas[nome], `es · ${nome}`);
});

// G-374 · lote 4 (relatos #53/#66): Pioneer e Modern. A carta de duas faces gravada pela frente nunca aparecia: o app
// procura pelo `name` da Scryfall ("Frente // Verso"). O conferidor barra a chave pela frente com as duas faces, as 11
// gravadas assim nos lotes 1 e 3 passam para o nome inteiro, e a tradução só da frente vale pela frente.
const AMOSTRA_G374_PT = ['Tarmogoyf', 'Griselbrand', 'Vivi Ornitier', "Artist's Talent", 'Jadzi, Steward of Fate // Oracle\'s Gift', 'Heartfire Hero', 'Screaming Nemesis'];
const AMOSTRA_G374_ES = ['Tarmogoyf', 'Griselbrand', 'Mirrex', 'Waterlogged Teachings'];
test('G-374 · conferidor: tradução de duas faces pela frente é barrada (o app nunca acha)', () => {
  const e = { original: ['Flying', 'Draw a card.'], faces: [{ tipo: 'Criatura', texto: 'Voar' }, { tipo: 'Feitiço', texto: 'Compre um card.' }] };
  assert.equal(confere('Teste Frente', e, 'pt').length, 1);
  assert.match(confere('Teste Frente', e, 'pt')[0], /nome inteiro/);
  assert.deepEqual(confere('Teste Frente // Teste Verso', e, 'pt'), []);
  for (const lang of IDIOMAS) for (const [nome, x] of Object.entries(lePacote(lang).cartas))
    if (Array.isArray(x.original)) assert.ok(nome.includes(' // '), `${lang} · "${nome}" tem duas faces e está pela frente`);
  assert.ok(lePacote('pt').cartas['Callous Sell-Sword // Burn Together']);
  assert.ok(lePacote('es').cartas['Ashling, Rekindled // Ashling, Rimebound']);
});

test('G-374 · app: a tradução só da frente vale para a carta "Frente // Verso" na primeira face; a de duas faces não cai na frente', () => {
  const pacote = { cartas: { 'Teste Pathway': { original: '{T}: Add {U}.', tipo: 'Terreno', texto: '{T}: Adicione {U}.' },
    'Teste Duas': { original: ['a', 'b'], faces: [{ tipo: 'x', texto: 'A' }, { tipo: 'y', texto: 'B' }] } } };
  const card = { name: 'Teste Pathway // Teste Verso', faces: [{ oracle_text: '{T}: Add {U}.' }, { oracle_text: '{T}: Add {R}.' }] };
  const d = C.traducaoDaCarta(pacote, card, 'pt');
  assert.ok(d, 'a frente traduzida aparece');
  assert.equal(d.faces[0].texto, '{T}: Adicione {U}.'); assert.equal(d.faces[1], null);
  assert.equal(C.traducaoDaCarta(pacote, { ...card, faces: [{ oracle_text: '{T}: Add {B}.' }, card.faces[1]] }, 'pt'), null, 'Oracle mudou');
  assert.equal(C.traducaoDaCarta(pacote, { name: 'Teste Duas // Outra', faces: [{ oracle_text: 'a' }, { oracle_text: 'b' }] }, 'pt'), null);
  assert.equal(C.traducaoDaCarta(pacote, { name: 'Teste Pathway', oracle_text: '{T}: Add {U}.' }, 'pt').texto, '{T}: Adicione {U}.');
  // a carta real do lote: Brazen Borrower // Petty Theft, como a Scryfall entrega
  const pt = lePacote('pt'); const bb = pt.cartas['Brazen Borrower'];
  assert.ok(bb, 'Brazen Borrower no pacote');
  const r = C.traducaoDaCarta(pt, { name: 'Brazen Borrower // Petty Theft', faces: [{ oracle_text: bb.original }, { oracle_text: 'Return target nonland permanent an opponent controls to its owner\'s hand.' }] }, 'pt');
  assert.match(r.faces[0].texto, /^Lampejo\nVoar/);
});

test('G-374 · pacotes: o lote de Pioneer e Modern está lá, passa no conferidor e vale no app', () => {
  const pt = lePacote('pt'), es = lePacote('es');
  assert.ok(Object.keys(pt.cartas).length >= 374 + 60, `pt: ${Object.keys(pt.cartas).length}`);
  assert.ok(Object.keys(es.cartas).length >= 37 + 20, `es: ${Object.keys(es.cartas).length}`);
  for (const lang of IDIOMAS) assert.deepEqual(conferePacote(lePacote(lang), lang), {}, lang);
  for (const [P, amostra, lang] of [[pt, AMOSTRA_G374_PT, 'pt'], [es, AMOSTRA_G374_ES, 'es']]) for (const nome of amostra) {
    const e = P.cartas[nome]; assert.ok(e, `${lang} · ${nome}`);
    const card = Array.isArray(e.original) ? { name: nome, faces: e.original.map(o => ({ oracle_text: o })) } : { name: nome, oracle_text: e.original };
    assert.ok(C.traducaoDaCarta(P, card, lang), `${lang} · ${nome} aparece no app`);
  }
});

// G-377 · lote 5 (relatos #53/#66): Legacy e Vintage (Black Lotus, Time Walk, Ancestral Recall, Bazaar of Baghdad,
// Barrowgoyf, a aventura do Most Decrepit Old Bird…), todo pelo conferidor. Falhava antes: nenhuma estava no pacote.
const AMOSTRA_G377_PT = ['Black Lotus', 'Time Walk', 'Ancestral Recall', 'Barrowgoyf', 'Comet, Stellar Pup', 'Most Decrepit Old Bird // Speak Secrets', 'Zack Fair'];
const AMOSTRA_G377_ES = ['Black Lotus', 'Balance', 'Ad Nauseam', 'Time Vault', 'Shuko'];
test('G-377 · pacotes: o lote de Legacy e Vintage está lá, passa no conferidor e vale no app', () => {
  const pt = lePacote('pt'), es = lePacote('es');
  assert.ok(Object.keys(pt.cartas).length >= 439 + 59, `pt: ${Object.keys(pt.cartas).length}`);
  assert.ok(Object.keys(es.cartas).length >= 60 + 29, `es: ${Object.keys(es.cartas).length}`);
  for (const lang of IDIOMAS) assert.deepEqual(conferePacote(lePacote(lang), lang), {}, lang);
  for (const [P, amostra, lang] of [[pt, AMOSTRA_G377_PT, 'pt'], [es, AMOSTRA_G377_ES, 'es']]) for (const nome of amostra) {
    const e = P.cartas[nome]; assert.ok(e, `${lang} · ${nome}`);
    const card = Array.isArray(e.original) ? { name: nome, faces: e.original.map(o => ({ oracle_text: o })) } : { name: nome, oracle_text: e.original };
    assert.ok(C.traducaoDaCarta(P, card, lang), `${lang} · ${nome} aparece no app`);
  }
});
