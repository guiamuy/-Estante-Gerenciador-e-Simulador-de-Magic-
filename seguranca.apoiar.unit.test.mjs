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

test('P-20 · ordem por região: todas as formas sempre aparecem; muda só a primeira e a sequência', () => {
  const todas = S.APOIO.formas.map(f => f.id).sort();
  for (const reg of ['br', 'latam', 'us', 'eu', 'outro']) {
    const o = S.ordemDoApoio(reg).map(f => f.id);
    assert.equal(js([...o].sort()), js(todas), 'nenhuma forma some em ' + reg);
  }
  assert.equal(S.ordemDoApoio('br')[0].id, 'pix');
  assert.equal(S.ordemDoApoio('latam')[0].id, 'paypal');
  assert.equal(S.ordemDoApoio('us')[0].id, 'kofi');
  assert.equal(S.ordemDoApoio('eu')[0].id, 'kofi');
  assert.equal(S.ordemDoApoio('latam').at(-1).id, 'pix', 'fora do Brasil o Pix vai para o fim');
});

test('P-20 · Pix copia e cola: o exemplo do manual do BR Code (Banco Central) sai igual, com o CRC certo', () => {
  const p = S.pixCopiaECola({ chave: '123e4567-e12b-12d1-a456-426655440000', nome: 'Fulano de Tal', cidade: 'BRASILIA' });
  assert.equal(p, '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D');
  // acento sai, tamanhos máximos do padrão (nome 25, cidade 15) e o CRC confere em qualquer texto
  const q = S.pixCopiaECola({ chave: 'apoio@exemplo.com', nome: 'José da Conceição Ribeiro Neto', cidade: 'São José dos Campos' });
  assert.match(q, /5925Jose da Conceicao Ribeiro6015/); assert.match(q, /6015Sao Jose dos Ca62/);
  assert.equal(q.slice(-4), S.crc16(q.slice(0, -4)));
  assert.equal(S.pixCopiaECola({ chave: '', nome: 'A', cidade: 'B' }), null, 'sem chave, sem código');
});

test('P-20 · trava dos dados de exemplo: com `exemplo`, nada copia nem abre e o Perfil não mostra a entrada', () => {
  assert.equal(S.APOIO.exemplo, true, 'esta leva publica só a prévia; os dados reais entram numa leva própria');
  assert.equal(S.apoioPronto(), false);
  for (const f of S.APOIO.formas) {
    assert.equal(S.acaoDaForma(f), null, 'forma de exemplo sem ação: ' + f.id);
    if (f.url) assert.fail('dado de exemplo não leva endereço: ' + f.id);
  }
  assert.ok(!/@|^\d{11}$/.test(S.APOIO.formas.find(f => f.id === 'pix').chave), 'a chave de exemplo não tem forma de chave Pix (e-mail, CPF): ninguém paga para ela por engano');
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
  assert.equal(js(S.origensDoApoio(S.APOIO)), js([]), 'a prévia não cita origem nenhuma');
  const faltam = S.origensDoApoio(S.APOIO).filter(o => !S.ORIGENS.includes(o));
  assert.equal(js(faltam), '[]', 'origem de apoio fora de LINKS: acrescente em LINKS (src/app/saida.js) na mesma leva');
});
