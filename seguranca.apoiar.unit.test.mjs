// P-20 · MON1 · Apoiar a Estante: todas as formas de doar numa tela, a da região provável em primeiro lugar (fuso e
// idioma do aparelho, sem rede); Pix com chave e "copia e cola" (BR Code do Banco Central, montado no aparelho); dados
// de exemplo travados — com `exemplo`, nenhum botão copia chave nem abre link e a entrada do Perfil fica escondida;
// com dado real, toda origem de link está em LINKS ("O que sai do aparelho" e a política de conteúdo leem a mesma lista).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
const { saida: S } = loadModules();
const js = v => JSON.stringify(v);

test('P-20 · região provável pelo fuso e pelo idioma (sem rede)', () => {
  const r = (fuso, idioma) => S.regiaoProvavel({ fuso, idioma });
  assert.equal(r('America/Sao_Paulo', 'en-US'), 'br', 'fuso do Brasil vence o idioma');
  assert.equal(r('America/Manaus', 'pt-BR'), 'br');
  assert.equal(r('America/Argentina/Buenos_Aires', 'es-AR'), 'latam');
  assert.equal(r('America/Mexico_City', 'en-US'), 'latam');
  assert.equal(r('America/Bogota', 'es-CO'), 'latam');
  assert.equal(r('America/New_York', 'en-US'), 'us');
  assert.equal(r('America/Los_Angeles', 'es-US'), 'us', 'fuso dos EUA com idioma espanhol continua EUA');
  assert.equal(r('Europe/Lisbon', 'pt-PT'), 'eu');
  assert.equal(r('Europe/Berlin', 'de-DE'), 'eu');
  assert.equal(r('Atlantic/Canary', 'es-ES'), 'eu');
  assert.equal(r('', 'pt-BR'), 'br', 'sem fuso, o idioma decide');
  assert.equal(r('', 'es-419'), 'latam');
  assert.equal(r('Asia/Tokyo', 'ja-JP'), 'outro');
  assert.equal(r(undefined, undefined), 'outro');
});

// P-21: a prévia (`exemplo`) mostra todas; com dados reais, só as formas que têm ação — PayPal e GitHub Sponsors sem
// link saem da tela em vez de mostrar um botão que não faz nada.
const PREVIA = { exemplo: true, formas: S.APOIO.formas };
test('P-20 · ordem por região: na prévia todas as formas aparecem; muda só a primeira e a sequência', () => {
  const todas = S.APOIO.formas.map(f => f.id).sort();
  for (const reg of ['br', 'latam', 'us', 'eu', 'outro']) {
    const o = S.ordemDoApoio(reg, PREVIA).map(f => f.id);
    assert.equal(js([...o].sort()), js(todas), 'nenhuma forma some em ' + reg);
  }
  assert.equal(S.ordemDoApoio('br', PREVIA)[0].id, 'pix');
  assert.equal(S.ordemDoApoio('latam', PREVIA)[0].id, 'paypal');
  assert.equal(S.ordemDoApoio('us', PREVIA)[0].id, 'kofi');
  assert.equal(S.ordemDoApoio('eu', PREVIA)[0].id, 'kofi');
  assert.equal(S.ordemDoApoio('latam', PREVIA).at(-1).id, 'pix', 'fora do Brasil o Pix vai para o fim');
});

test('P-21 · com os dados reais: só Pix e Ko-fi na tela (as formas sem link somem), na ordem da região', () => {
  assert.equal(js(S.ordemDoApoio('br').map(f => f.id)), js(['pix', 'kofi']));
  assert.equal(js(S.ordemDoApoio('us').map(f => f.id)), js(['kofi', 'pix']));
  assert.equal(js(S.ordemDoApoio('latam').map(f => f.id)), js(['kofi', 'pix']), 'sem PayPal, a América Latina começa pelo Ko-fi');
  assert.equal(js(S.ordemDoApoio('eu').map(f => f.id)), js(['kofi', 'pix']));
});

test('P-20 · Pix copia e cola: o exemplo do manual do BR Code (Banco Central) sai igual, com o CRC certo', () => {
  const p = S.pixCopiaECola({ chave: '123e4567-e12b-12d1-a456-426655440000', nome: 'Fulano de Tal', cidade: 'BRASILIA' });
  assert.equal(p, '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D');
  // acento sai, tamanhos máximos do padrão (nome 25, cidade 15) e o CRC confere em qualquer texto.
  // P-21 (expectativa mudada com motivo): antes o texto era cortado seco ("Jose da Conceicao Ribeiro", "Sao Jose dos Ca");
  // agora cabe sem cortar palavra ao meio — tira "de/da/do/dos" do meio e vira inicial as palavras do meio
  const q = S.pixCopiaECola({ chave: 'apoio@exemplo.com', nome: 'José da Conceição Ribeiro Neto', cidade: 'São José dos Campos' });
  assert.match(q, /5919Jose C Ribeiro Neto6015Sao Jose Campos62/);
  assert.equal(q.slice(-4), S.crc16(q.slice(0, -4)));
  assert.equal(S.cabeNoBr('Fulano de Tal', 25), 'Fulano de Tal', 'o que já cabe não muda (partícula fica)');
  assert.equal(S.cabeNoBr('Guilherme de Aguiar Schmidt Amuy', 25), 'Guilherme A Schmidt Amuy');
  assert.equal(S.cabeNoBr('São José do Rio Preto', 15), 'Sao J Rio Preto');
  assert.equal(S.cabeNoBr('Pindamonhangabainha', 15), 'Pindamonhangaba', 'uma palavra só e longa: corte seco, último recurso');
  for (const [t, m] of [['Maria das Graças Xavier de Souza Lima Albuquerque', 25], ['Santa Rita do Passa Quatro', 15], ['  a  ', 25]]) {
    const r = S.cabeNoBr(t, m); assert.ok(r.length <= m, t + ' cabe em ' + m); assert.doesNotMatch(r, /^\s|\s$|\s\s/, 'sem espaço sobrando');
  }
  assert.equal(S.pixCopiaECola({ chave: '', nome: 'A', cidade: 'B' }), null, 'sem chave, sem código');
});

test('P-20 · trava dos dados de exemplo: com `exemplo`, nada copia nem abre e o Perfil não mostra a entrada', () => {
  assert.equal(S.apoioPronto(PREVIA), false);
  for (const f of PREVIA.formas) assert.equal(S.acaoDaForma(f, PREVIA), null, 'forma de prévia sem ação: ' + f.id);
});

test('P-21 · dados reais fixados: chave e link só mudam com leva (o portão confere o valor, não só a forma)', () => {
  assert.equal(S.APOIO.exemplo, false); assert.equal(S.apoioPronto(), true);
  const pix = S.APOIO.formas.find(f => f.id === 'pix'), kofi = S.APOIO.formas.find(f => f.id === 'kofi');
  // decisão D9 do dono (25/10/2026): chave aleatória (nunca CPF, telefone ou e-mail, que ficariam públicos)
  assert.equal(pix.chave, '918fb776-df41-4cfd-bbcc-07a03db58f87');
  assert.match(pix.chave, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/, 'forma de chave aleatória (EVP)');
  assert.equal(pix.titular, 'Guilherme de Aguiar Schmidt Amuy'); assert.equal(pix.cidade, 'São José do Rio Preto');
  assert.equal(kofi.url, 'https://ko-fi.com/theshelf'); assert.equal(kofi.endereco, 'ko-fi.com/theshelf');
  const a = S.acaoDaForma(pix);
  assert.equal(a.tipo, 'copiar'); assert.equal(a.chave, pix.chave);
  assert.equal(a.codigo, '00020126580014br.gov.bcb.pix0136918fb776-df41-4cfd-bbcc-07a03db58f8752040000530398658' +
    '02BR5924Guilherme A Schmidt Amuy6015Sao J Rio Preto62070503***6304' + S.crc16(a.codigo.slice(0, -4)));
  assert.equal(a.codigo.length, 4 + a.codigo.slice(0, -4).length);
  assert.equal(js(S.acaoDaForma(kofi)), js({ tipo: 'abrir', url: 'https://ko-fi.com/theshelf' }));
  for (const id of ['paypal', 'github']) assert.equal(S.acaoDaForma(S.APOIO.formas.find(f => f.id === id)), null, id + ' sem link não age');
});

test('P-20 · com dados reais: o link abre fora e a origem dele está em LINKS (o que sai do aparelho e a política)', () => {
  const real = { exemplo: false, formas: [
    { id: 'pix', tipo: 'pix', chave: 'apoio@estante.dev', nome: 'Gui', cidade: 'SAO PAULO' },
    { id: 'kofi', tipo: 'link', url: 'https://ko-fi.com/estante' }] };
  const kofi = S.acaoDaForma(real.formas[1], real);
  assert.equal(kofi.tipo, 'abrir'); assert.equal(kofi.url, 'https://ko-fi.com/estante');
  assert.equal(S.acaoDaForma(real.formas[0], real).tipo, 'copiar');
  assert.equal(S.acaoDaForma({ id: 'x', tipo: 'link', url: 'javascript:alert(1)' }, real), null, 'só https');
  // o contrato que a leva dos dados reais precisa cumprir: toda origem de link de apoio em LINKS
  assert.equal(js(S.origensDoApoio(real)), js(['https://ko-fi.com']));
  assert.equal(js(S.origensDoApoio(PREVIA)), js([]), 'a prévia não cita origem nenhuma');
  assert.equal(js(S.origensDoApoio(S.APOIO)), js(['https://ko-fi.com']), 'P-21: os dados reais abrem só o Ko-fi');
  const faltam = S.origensDoApoio(S.APOIO).filter(o => !S.ORIGENS.includes(o));
  assert.equal(js(faltam), '[]', 'origem de apoio fora de LINKS: acrescente em LINKS (src/app/saida.js) na mesma leva');
});
