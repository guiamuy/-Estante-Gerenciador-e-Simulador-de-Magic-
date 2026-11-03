// G-340 (trilha geral) · relato #59 · todo ícone do app ganha um movimento curto, no toque, que lembra o que ele é
// (o sino balança, a lixeira tomba a tampa, atualizar gira, as setas andam no sentido delas). Um mapa só, ao lado de
// ICONES; cada movimento é um @keyframes ds-ic-<nome> usado por uma regra do .ds-icon[data-anima]; durações e curvas por
// token; com menos movimento não há animação. A porta do Sair (G-334) tem o movimento dela e fica fora do mapa geral.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HTML, loadModules } from './_load.mjs';

const C = loadModules().components;
const css = HTML.slice(HTML.indexOf('<style>'), HTML.indexOf('</style>'));

test('G-340 · todo ícone de ICONES tem movimento no mapa, e o mapa não cita ícone que não existe', () => {
  const nomes = Object.keys(C.ICONES), mapa = C.MOVIMENTO_DO_ICONE;
  assert.ok(Object.isFrozen(mapa), 'mapa congelado');
  assert.deepEqual(nomes.filter(n => !(n in mapa)), [], 'ícones sem movimento');
  assert.deepEqual(Object.keys(mapa).filter(n => !(n in C.ICONES)), [], 'movimento de ícone que não existe');
  for (const [n, m] of Object.entries(mapa)) assert.ok(m === 'proprio' || C.MOVIMENTOS_DE_ICONE.includes(m), `${n}: movimento ${m} desconhecido`);
});

test('G-340 · os movimentos do pedido: sino balança, lixeira tomba, atualizar gira, setas no sentido delas; a porta é própria', () => {
  const m = C.MOVIMENTO_DO_ICONE;
  assert.equal(m.sino, 'balanca'); assert.equal(m.alerta, 'balanca');
  assert.equal(m.lixeira, 'tomba'); assert.equal(m.atualizar, 'gira'); assert.equal(m.desfazer, 'giraVolta');
  assert.equal(m.voltar, 'esquerda'); assert.equal(m.seguir, 'direita'); assert.equal(m.subir, 'sobe'); assert.equal(m.descer, 'desce');
  assert.equal(m.fechar, 'sacode'); assert.equal(m.camera, 'obturador'); assert.equal(m.buscar, 'varre'); assert.equal(m.porta, 'proprio');
  // o genérico é escolha declarada, não o padrão: a maioria tem metáfora própria
  const pulso = Object.values(m).filter(x => x === 'pulso').length;
  assert.ok(pulso < Object.keys(m).length / 3, `pulso genérico em ${pulso} ícones`);
});

test('G-340 · cada movimento tem @keyframes ds-ic-<nome> usado pela regra do ícone, por token, só com transform; e some com menos movimento', () => {
  for (const m of C.MOVIMENTOS_DE_ICONE) {
    const k = css.match(new RegExp(`@keyframes ds-ic-${m} \\{([^@]*?)\\}\\s*(?=@|\\.|:|\\n)`));
    assert.ok(css.includes(`@keyframes ds-ic-${m} {`), `@keyframes ds-ic-${m}`);
    const regra = css.match(new RegExp(`\\.ds-icon\\[data-anima="${m}"\\] > svg \\{[^}]*animation: ds-ic-${m} var\\(--dur-[a-z0-9-]+\\) var\\(--ease-[a-z-]+\\)`));
    assert.ok(regra, `regra do movimento ${m} por token`);
    if (k) assert.doesNotMatch(k[1], /\b(width|height|top|left|margin|padding)\s*:/, `${m}: só transform e opacity`);
  }
  assert.match(css, /\.ds-icon > svg \{[^}]*transform-origin: 50% 50%/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ \.ds-icon\[data-anima\] > svg \{ animation: none; \} \}/);
  assert.match(css, /:root\[data-movimento="reduzido"\] \.ds-icon\[data-anima\] > svg \{ animation: none !important; \}/);
});

test('G-340 · a receita "icone" entra no contrato de animação, dona design, com os cinco campos', () => {
  const r = C.RECEITAS_DE_ANIMACAO.find(x => x.id === 'icone');
  assert.ok(r, 'receita icone');
  assert.equal(r.dona, 'design');
  for (const campo of ['plano', 'luz', 'curva', 'etapas', 'reduzido']) assert.ok(r[campo], campo);
});

test('G-340 · movimentoDoToque escolhe o ícone do controle tocado e respeita desligado e menos movimento', () => {
  const f = C.movimentoDoToque;
  assert.equal(f({ icone: 'sino' }), 'balanca');
  assert.equal(f({ icone: 'porta' }), null, 'a porta anima sozinha');
  assert.equal(f({ icone: 'sino', desligado: true }), null, 'controle desligado não mexe');
  assert.equal(f({ icone: 'sino', reduzido: true }), null, 'menos movimento');
  assert.equal(f({ icone: 'naoExiste' }), null);
  assert.equal(f({}), null);
});
