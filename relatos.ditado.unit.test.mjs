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
  assert.equal(a.lang, 'es-ES'); assert.equal(a.continuous, false, 'no Android o contínuo repete o que já ouviu'); assert.equal(a.interimResults, true); assert.ok(a.iniciado);
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
