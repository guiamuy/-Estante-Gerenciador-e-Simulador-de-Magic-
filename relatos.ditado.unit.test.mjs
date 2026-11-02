// G-319 · relato #43: ditar o relato em português, inglês ou espanhol pelo reconhecimento de fala do aparelho.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
const { relatos: R, platform: P } = loadModules();
const J = x => JSON.parse(JSON.stringify(x));

test('G-319 · idioma do ditado começa pelo do aparelho; o que não é inglês nem espanhol fica em português', () => {
  assert.equal(R.idiomaDoDitado('pt-BR'), 'pt-BR');
  assert.equal(R.idiomaDoDitado('en-GB'), 'en-US');
  assert.equal(R.idiomaDoDitado('es-419'), 'es-ES');
  assert.equal(R.idiomaDoDitado('fr-FR'), 'pt-BR');
  assert.equal(R.idiomaDoDitado(''), 'pt-BR');
  assert.deepEqual(J(R.IDIOMAS_DO_DITADO.map(i => i[1])), ['PT', 'EN', 'ES']);
});

test('G-319 · juntaDitado: o falado entra no cursor, com espaço e maiúscula de começo de frase, sem passar do limite', () => {
  assert.deepEqual(J(R.juntaDitado('', 0, 'a carta não virou')), { texto: 'A carta não virou', cursor: 17, cortado: false });
  assert.deepEqual(J(R.juntaDitado('A carta', 7, 'não virou')), { texto: 'A carta não virou', cursor: 17, cortado: false }, 'espaço antes');
  assert.equal(R.juntaDitado('Travou. ', 8, 'depois voltou').texto, 'Travou. Depois voltou', 'maiúscula depois de ponto');
  assert.equal(R.juntaDitado('Linha um\n', 9, 'linha dois').texto, 'Linha um\nLinha dois', 'maiúscula em linha nova');
  assert.equal(R.juntaDitado('A  na mesa.', 2, 'carta').texto, 'A carta na mesa.', 'no meio: sem espaço duplo');
  assert.equal(R.juntaDitado('Fim.', 0, 'começo').texto, 'Começo Fim.', 'espaço depois quando o resto começa com letra');
  assert.equal(R.juntaDitado('Ok', 2, '   ').texto, 'Ok', 'só espaço não muda nada');
  assert.equal(R.juntaDitado('abc', undefined, 'd').texto, 'abc d', 'sem cursor: no fim');
  const cheio = 'x'.repeat(1995);
  const r = R.juntaDitado(cheio, 1995, 'uma frase longa demais', 2000);
  assert.ok(r.texto.length <= 2000 && r.texto.startsWith(cheio + ' uma')); assert.equal(r.cortado, true);
  assert.deepEqual(J(R.juntaDitado('x'.repeat(2000), 2000, 'mais', 2000)), { texto: 'x'.repeat(2000), cursor: 2000, cortado: true });
});

test('G-319 · falhas do ditado viram frase de usuário', () => {
  assert.match(R.textoDaFalhaDoDitado('not-allowed'), /microfone/);
  assert.match(R.textoDaFalhaDoDitado('network'), /internet/);
  assert.match(R.textoDaFalhaDoDitado('qualquer-outra'), /Toque em Ditar/);
});

// Reconhecimento de mentira: cada instância anota o que recebeu e o teste dita os eventos.
function falsoReconhecimento() {
  const criadas = [];
  class Rec {
    constructor() { criadas.push(this); this.iniciado = false; this.parado = false; this.abortado = false; }
    start() { this.iniciado = true; }
    stop() { this.parado = true; }
    abort() { this.abortado = true; }
    fala(textos, final = true) { this.onresult({ resultIndex: 0, results: textos.map(t => Object.assign([{ transcript: t }], { isFinal: final })) }); }
    termina(erro) { if (erro) this.onerror({ error: erro }); this.onend(); }
  }
  return { Rec, criadas };
}

test('G-319 · plataforma: fala entra no contrato e só existe quando o aparelho tem reconhecimento', () => {
  assert.deepEqual(J(P.PLATFORM_CONTRACT.fala), ['available', 'start', 'stop', 'ouvindo']);
  assert.equal(P.webFala({}).available(), false);
  const erros = []; assert.equal(P.webFala({}).start({ aoErro: e => erros.push(e) }), false); assert.deepEqual(erros, ['sem-suporte']);
  const { Rec } = falsoReconhecimento();
  assert.equal(P.webFala({ webkitSpeechRecognition: Rec }).available(), true, 'prefixo do Chrome');
});

test('G-319 · plataforma: uma frase por sessão, a seguinte abre sozinha; Parar entrega o que estava no ar', () => {
  const { Rec, criadas } = falsoReconhecimento();
  const finais = [], parciais = [], fins = [];
  const f = P.webFala({ SpeechRecognition: Rec }, { setTimeout: () => {} });
  assert.equal(f.start({ idioma: 'es-ES', aoFinal: t => finais.push(t), aoParcial: t => parciais.push(t), aoFim: m => fins.push(m) }), true);
  const a = criadas[0];
  assert.equal(a.lang, 'es-ES'); assert.equal(a.continuous, true, 'G-333: contínuo (menos cortes); o final repetido do Android é filtrado por trechoNovo'); assert.equal(a.interimResults, true); assert.ok(a.iniciado);
  assert.equal(f.ouvindo(), true);
  a.fala(['la carta'], false); a.fala([' la carta no gira ']); a.termina();
  assert.deepEqual(finais, ['la carta no gira']); assert.equal(parciais[0], 'la carta');
  assert.equal(criadas.length, 2, 'abriu a sessão seguinte'); assert.equal(fins.length, 0);
  const b = criadas[1]; b.fala(['y se queda'], false);
  f.stop(); assert.ok(b.parado, 'Parar usa stop (entrega), não abort'); b.termina();
  assert.deepEqual(finais, ['la carta no gira', 'y se queda'], 'o parcial no ar não se perde');
  assert.deepEqual(fins, ['parou']); assert.equal(f.ouvindo(), false); assert.equal(criadas.length, 2);
});

test('G-319 · plataforma: três sessões sem fala, ou um erro de verdade, desligam o microfone', () => {
  const { Rec, criadas } = falsoReconhecimento();
  const fins = [], erros = [];
  const f = P.webFala({ SpeechRecognition: Rec }, { setTimeout: () => {} });
  f.start({ aoFim: m => fins.push(m), aoErro: e => erros.push(e) });
  criadas[0].termina('no-speech'); criadas[1].termina(); criadas[2].termina('no-speech');
  assert.deepEqual(fins, ['silencio']); assert.equal(criadas.length, 3); assert.deepEqual(erros, []);
  f.start({ aoFim: m => fins.push(m), aoErro: e => erros.push(e) });
  criadas[3].termina('not-allowed');
  assert.deepEqual(erros, ['not-allowed']); assert.deepEqual(fins, ['silencio', 'erro']); assert.equal(criadas.length, 4, 'erro não reabre');
  let t = 0; const g = P.webFala({ SpeechRecognition: Rec }, { setTimeout: () => {} });
  g.start({ agora: () => t, limiteMs: 1000, aoFim: m => fins.push(m) });
  criadas[4].fala(['oi']); t = 1000; criadas[4].termina();
  assert.equal(fins.at(-1), 'tempo', 'teto de tempo');
});

test('G-319 · plataforma: Parar sem resposta do navegador solta o microfone pelo relógio', () => {
  const { Rec, criadas } = falsoReconhecimento();
  const fins = []; let solta = null;
  const f = P.webFala({ SpeechRecognition: Rec }, { setTimeout: fn => { solta = fn; } });
  f.start({ aoFim: m => fins.push(m) });
  f.stop(); assert.ok(solta); solta();
  assert.deepEqual(fins, ['parou']); assert.ok(criadas[0].abortado); assert.equal(f.ouvindo(), false);
  f.stop(); assert.deepEqual(fins, ['parou'], 'parar de novo não faz nada');
});

/* ---------------- G-333 · relato #49: fala corrida sem perda e texto pontuado ---------------- */
test('G-333 · pontuaDitado: comandos falados viram sinais em PT, EN e ES; espaço certo e maiúscula depois de . ? !', () => {
  const p = R.pontuaDitado;
  assert.equal(p('a carta não virou vírgula depois voltou ponto de interrogação sim ponto final', 'pt-BR'), 'a carta não virou, depois voltou? Sim.');
  assert.equal(p('travou exclamação dois pontos a mesa inteira', 'pt-BR'), 'travou! A mesa inteira', 'sem dupla pontuação');
  assert.equal(p('primeiro nova linha segundo parágrafo terceiro', 'pt-BR'), 'primeiro\nSegundo\n\nTerceiro');
  assert.equal(p('tenho 20 pontos de vida e um ponto de mana ponto', 'pt-BR'), 'tenho 20 pontos de vida e um ponto de mana.', '"ponto de" é palavra');
  assert.equal(p('ponto e vírgula reticências', 'pt-BR'), '…', 'sinais seguidos viram um (o mais forte)');
  assert.equal(p('Virgula ok Ponto', 'pt-BR'), ', ok.', 'sem acento e com maiúscula também valem');
  assert.equal(p('the card did not untap comma then it came back question mark yes period', 'en-US'), 'the card did not untap, then it came back? Yes.');
  assert.equal(p('a period of time exclamation point new line done', 'en-US'), 'a period of time!\nDone');
  assert.equal(p('la carta no gira coma luego volvió signo de interrogación sí punto', 'es-ES'), 'la carta no gira, luego volvió? Sí.');
  assert.equal(p('dos puntos de daño dos puntos nada nueva línea fin', 'es-ES'), 'dos puntos de daño: nada\nFin');
  assert.equal(p('versão 3.5 e motor v112', 'pt-BR'), 'versão 3.5 e motor v112', 'números e palavras normais intactos');
  assert.equal(p('já veio pontuado , com espaço errado .e assim', 'pt-BR'), 'já veio pontuado, com espaço errado. E assim');
  assert.equal(p('', 'pt-BR'), '');
  assert.equal(p('vírgula', 'en-US'), 'vírgula', 'comando de outro idioma não vale');
});

test('G-333 · juntaDitado com sinais: sinal cola na palavra, nada de dupla pontuação, linha nova entra', () => {
  assert.equal(R.juntaDitado('A carta virou', 13, ', depois voltou').texto, 'A carta virou, depois voltou');
  assert.equal(R.juntaDitado('A carta virou ', 14, '. depois voltou').texto, 'A carta virou. Depois voltou', 'tira o espaço antes do sinal e põe maiúscula');
  assert.equal(R.juntaDitado('Virou.', 6, '. depois').texto, 'Virou. Depois', 'sem ponto duplo');
  assert.equal(R.juntaDitado('Virou.', 6, '.').texto, 'Virou.', 'só o sinal repetido não muda nada');
  assert.equal(R.juntaDitado('Linha um', 8, '\nlinha dois').texto, 'Linha um\nLinha dois');
  assert.equal(R.juntaDitado('Fim', 3, 'mesmo\n').texto, 'Fim mesmo\n');
});

test('G-333 · fechaDitado: ponto final ao parar quando a frase não termina em sinal; no meio do texto, não', () => {
  assert.deepEqual(J(R.fechaDitado('A carta não virou', 17)), { texto: 'A carta não virou.', cursor: 18 });
  assert.deepEqual(J(R.fechaDitado('A carta não virou?', 18)), { texto: 'A carta não virou?', cursor: 18 });
  assert.deepEqual(J(R.fechaDitado('Linha\n', 6)), { texto: 'Linha\n', cursor: 6 });
  assert.deepEqual(J(R.fechaDitado('', 0)), { texto: '', cursor: 0 });
  assert.equal(R.fechaDitado('A carta na mesa.', 7).texto, 'A carta na mesa.', 'ditou no meio: o resto continua a frase');
  assert.equal(R.fechaDitado('Uma frase\nOutra', 9).texto, 'Uma frase.\nOutra');
});

test('G-333 · dica de pontuação por idioma, com as palavras inteiras', () => {
  for (const [l] of R.IDIOMAS_DO_DITADO) { const d = R.DICA_DE_PONTUACAO[l]; assert.ok(d.length >= 5); assert.ok(d.every(([fala, sinal]) => fala.length > 2 && sinal)); }
  assert.equal(R.DICA_DE_PONTUACAO['pt-BR'][0][0], 'vírgula');
  // toda palavra da dica é comando de verdade
  for (const [l] of R.IDIOMAS_DO_DITADO) for (const [fala, sinal] of R.DICA_DE_PONTUACAO[l]) {
    const saida = R.pontuaDitado('x ' + fala + ' y', l);
    assert.notEqual(saida, 'x ' + fala + ' y', `${l}: ${fala}`);
  }
});

test('G-333 · trechoNovo: final cumulativo (Android) não repete; repetição de verdade fica', () => {
  const t = P.trechoNovo;
  assert.deepEqual(J(t('', 'a carta')), { novo: 'a carta', acumulado: 'a carta' });
  assert.deepEqual(J(t('a carta não', 'a carta não virou de novo')), { novo: 'virou de novo', acumulado: 'a carta não virou de novo' });
  assert.deepEqual(J(t('a carta não', 'A Carta Não virou')), { novo: 'virou', acumulado: 'a carta não virou' }, 'sem diferença de maiúscula');
  assert.deepEqual(J(t('não', 'não')), { novo: 'não', acumulado: 'não não' }, 'repetiu a palavra: entra');
  assert.deepEqual(J(t('então', 'então eu cliquei')), { novo: 'então eu cliquei', acumulado: 'então então eu cliquei' }, 'uma palavra só não basta para cortar');
});

test('G-333 · plataforma: sessão contínua; o mesmo final repetido não duplica; final cumulativo entra só o novo', () => {
  const { Rec, criadas } = falsoReconhecimento();
  const finais = [];
  const f = P.webFala({ SpeechRecognition: Rec }, { setTimeout: () => {} });
  f.start({ aoFinal: t => finais.push(t) });
  const a = criadas[0];
  assert.equal(a.continuous, true, 'contínuo: menos cortes entre frases');
  const ev = lista => a.onresult({ resultIndex: 0, results: lista.map(([t, fin]) => Object.assign([{ transcript: t }], { isFinal: fin })) });
  ev([['a carta não virou', true]]);
  ev([['a carta não virou', true], ['depois', false]]);
  ev([['a carta não virou', true], ['a carta não virou depois voltou', true]]);
  assert.deepEqual(finais, ['a carta não virou', 'depois voltou']);
});

test('G-333 · plataforma: queda de rede passageira e sessão abortada reabrem sozinhas; três quedas seguidas param', () => {
  const { Rec, criadas } = falsoReconhecimento();
  const fins = [], erros = [], finais = []; const fila = [];
  const f = P.webFala({ SpeechRecognition: Rec }, { setTimeout: (fn, ms) => { if (ms === 400) fila.push(fn); } });
  f.start({ aoFim: m => fins.push(m), aoErro: e => erros.push(e), aoFinal: t => finais.push(t) });
  criadas[0].fala(['primeira parte'], false); criadas[0].termina('network');
  assert.deepEqual(finais, ['primeira parte'], 'o que estava no ar entra');
  assert.deepEqual(erros, []); assert.equal(fila.length, 1); fila.shift()();
  assert.equal(criadas.length, 2, 'reabriu depois da queda');
  criadas[1].termina('aborted'); assert.equal(criadas.length, 3, 'abortada pelo navegador reabre');
  criadas[2].termina('network'); fila.shift()(); criadas[3].termina('network'); fila.shift()(); criadas[4].termina('network');
  assert.deepEqual(erros, ['network']); assert.deepEqual(fins, ['erro']); assert.equal(f.ouvindo(), false);
});

test('G-333 · plataforma: avisa quando há voz (pulso) e usa o reconhecimento no aparelho só quando ele diz que tem', async () => {
  const { Rec, criadas } = falsoReconhecimento();
  const vozes = [];
  let pedido = null;
  class Local extends Rec { constructor() { super(); this.processLocally = false; } }
  Local.available = async o => { pedido = o; return 'available'; };
  const f = P.webFala({ SpeechRecognition: Local }, { setTimeout: () => {} });
  f.start({ idioma: 'es-ES', aoVoz: v => vozes.push(v) });
  criadas[0].onspeechstart(); criadas[0].onspeechend();
  assert.deepEqual(vozes, [true, false]);
  assert.deepEqual(J(pedido), { langs: ['es-ES'], processLocally: true });
  assert.equal(criadas[0].processLocally, false, 'a primeira sessão não espera a resposta');
  await new Promise(r => setTimeout(r, 0));
  criadas[0].termina(); assert.equal(criadas[1].processLocally, true, 'a seguinte já é no aparelho');
  // sem o recurso (ou se a consulta falha), nada muda
  const { Rec: Simples, criadas: c2 } = falsoReconhecimento();
  Simples.available = async () => { throw new Error('não'); };
  P.webFala({ SpeechRecognition: Simples }, { setTimeout: () => {} }).start({});
  await new Promise(r => setTimeout(r, 0)); c2[0].termina();
  assert.equal('processLocally' in c2[1], false);
});

test('G-333 · plataforma: o teto de tempo vale no meio de uma sessão contínua (o microfone não fica aberto)', () => {
  const { Rec, criadas } = falsoReconhecimento();
  const fins = [], relogios = [];
  const f = P.webFala({ SpeechRecognition: Rec }, { setTimeout: (fn, ms) => relogios.push([ms, fn]) });
  f.start({ limiteMs: 180000, aoFim: m => fins.push(m) });
  const teto = relogios.find(([ms]) => ms === 180000); assert.ok(teto, 'o teto é marcado ao começar');
  teto[1](); assert.ok(criadas[0].parado, 'pede para parar (entrega o que ouviu)');
  criadas[0].termina();
  assert.deepEqual(fins, ['tempo']); assert.equal(f.ouvindo(), false); assert.equal(criadas.length, 1);
});
