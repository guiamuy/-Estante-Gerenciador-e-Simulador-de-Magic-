// G-365 · T-IDIOMA fatia 3 (relatos #53/#66): a tradução precisa da carta que nunca saiu impressa no idioma.
// O conferidor (idioma-cartas.mjs) barra tradução que muda símbolo, número, palavra-chave ou o nome; os pacotes
// idiomas/cartas-pt.json e cartas-es.json passam inteiros por ele; o app só mostra a tradução do Oracle atual da carta.
// Textos de carta abaixo marcados "teste" são dados de teste.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadModules } from './_load.mjs';
import { confere, confereTexto, conferePacote, palavrasDe, lePacote, faltam, IDIOMAS } from './idioma-cartas.mjs';
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
