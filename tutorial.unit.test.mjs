// Tour de boas-vindas e destaque guiado (src/app/tutorial.js, __m45): a parte pura, sem navegador.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';

const { tutorial } = loadModules();

// G-336 · relato #51 fatia 3 · onde ficam o foco e o balão do guia, dado o alvo e a tela
test('G-336 · posicaoDoGuia: o foco envolve o alvo com margem; o balão vai para baixo quando cabe, senão para cima; a seta aponta o centro do alvo e fica presa dentro do balão', () => {
  const tela = { width: 360, height: 780 };
  // alvo no alto: o balão cabe abaixo
  const a = tutorial.posicaoDoGuia({ left: 100, top: 120, width: 140, height: 44 }, tela, { balao: 200 });
  assert.equal(JSON.stringify(a.foco), JSON.stringify({ left: 94, top: 114, width: 152, height: 56 })); // objeto de outro contexto (vm): compara por valor
  assert.equal(a.lado, 'abaixo'); assert.equal(a.top, 114 + 56 + 12); assert.equal(a.bottom, null);
  assert.equal(a.seta, 170 - 16, 'seta no centro do alvo, relativa à esquerda do balão (calha de 16)');
  // alvo no pé da tela (o botão de ação): não cabe abaixo, vai para cima
  const b = tutorial.posicaoDoGuia({ left: 300, top: 700, width: 56, height: 56 }, tela, { balao: 200 });
  assert.equal(b.lado, 'acima'); assert.equal(b.top, null); assert.equal(b.bottom, 780 - 694 + 12);
  assert.equal(b.seta, 360 - 16 - 24 - 16, 'seta presa a 24 px da borda do balão');
  // alvo colado à esquerda: a seta não sai do balão
  const c = tutorial.posicaoDoGuia({ left: 0, top: 300, width: 20, height: 44 }, tela, { balao: 200 });
  assert.equal(c.seta, 24);
  // tela baixa com alvo no meio: fica do lado onde cabe
  const d = tutorial.posicaoDoGuia({ left: 100, top: 400, width: 100, height: 44 }, { width: 360, height: 600 }, { balao: 220 });
  assert.equal(d.lado, 'acima', 'abaixo sobram 150 px, acima 394');
  // alvo alto (o campo da lista): não cabe nem abaixo nem acima — o balão pousa no pé, por cima, sem seta
  const f = tutorial.posicaoDoGuia({ left: 16, top: 120, width: 328, height: 420 }, { width: 360, height: 697 }, { balao: 200 });
  assert.equal(f.lado, 'sobre'); assert.equal(f.top, null); assert.equal(f.bottom, 16);
  // balão centrado numa tela larga: a seta é relativa à esquerda do balão
  const e = tutorial.posicaoDoGuia({ left: 400, top: 100, width: 40, height: 40 }, { width: 800, height: 900 }, { balao: 200, esquerda: 190, largura: 420 });
  assert.equal(e.seta, 420 - 190);
});

test('G-336 · GUIAS: o capítulo Listas leva à primeira lista — cada passo tem alvo, título curto, texto de uma frase, e só um passo faz o gesto (abre o editor)', () => {
  const g = tutorial.GUIAS.listas;
  assert.equal(g.length, 4);
  for (const p of g) { assert.ok(p.alvo && p.titulo && p.texto, JSON.stringify(p)); assert.ok(p.titulo.split(' ').length <= 5, p.titulo); assert.ok(p.texto.length <= 90, p.texto); }
  assert.equal(JSON.stringify(g.map(p => !!p.acao)), '[false,true,false,false]');
  assert.equal(g[1].acao.rota, '/listas/editar');
  assert.match(g[2].alvo, /#deck-text/); assert.match(g[3].alvo, /#deck-save/);
  assert.equal(typeof g[0].quando, 'function', 'a lista pronta só é apontada na estante vazia');
  assert.equal(typeof tutorial.abreGuia, 'function');
  assert.ok(tutorial.CAPITULOS.some(c => c.id === 'listas' && tutorial.GUIAS[c.id]), 'o capítulo que tem guia existe no tour');
});

// G-338 · relato #51 fatia 5 · destaque guiado em Coleção, Notícias e Perfil; o encerramento diz o que falta experimentar
test('G-338 · GUIAS: Coleção, Notícias e Perfil têm guia — cada passo com alvo, título curto e uma frase; nenhum faz gesto de navegar; a tela chegou antes do primeiro', () => {
  for (const [id, n] of [['colecao', 4], ['noticias', 3], ['perfil', 4]]) {
    const g = tutorial.GUIAS[id];
    assert.ok(Array.isArray(g) && g.length === n, `${id}: ${g && g.length} passos`);
    for (const p of g) { assert.ok(p.alvo && p.titulo && p.texto, JSON.stringify(p)); assert.ok(p.titulo.split(' ').length <= 5, p.titulo); assert.ok(p.texto.length <= 90, p.texto); assert.ok(!p.acao, `${id}: só aponta, não navega`); }
    assert.ok(g[0].espera, `${id}: o primeiro passo espera a tela`);
    assert.ok(tutorial.CAPITULOS.some(c => c.id === id), `${id} é capítulo do tour`);
  }
  assert.match(tutorial.GUIAS.colecao[0].alvo, /#col-scan-vazio/); assert.match(tutorial.GUIAS.colecao[0].alvo, /#col-fab-abrir/);
  assert.match(tutorial.GUIAS.noticias.map(p => p.alvo).join(' '), /#noticias-idiomas.*#noticias-filtros.*#noticias-guardadas/);
  assert.match(tutorial.GUIAS.perfil[3].alvo, /#perfil-apresentacao/);
});

test('G-338 · faltaExperimentar: o encerramento lista, na ordem do tour, os capítulos que ainda não foram experimentados', () => {
  assert.equal(JSON.stringify(tutorial.faltaExperimentar(new Set()).map(c => c.id)), JSON.stringify(tutorial.CAPITULOS.map(c => c.id)));
  assert.equal(JSON.stringify(tutorial.faltaExperimentar(new Set(['perfil', 'colecao', 'noticias'])).map(c => c.id)), '["jogar","listas","scanner"]');
  assert.equal(tutorial.faltaExperimentar(new Set(tutorial.CAPITULOS.map(c => c.id))).length, 0);
  assert.equal(tutorial.faltaExperimentar(['listas']).length, 5, 'aceita lista também');
});

// G-341 · relato #51 fatia 6 · os capítulos experimentados ficam guardados na marca do tour (ui.apresentacao)
test('G-341 · experimentadosDe: lê da marca só ids de capítulo, sem repetir, na ordem do tour; marca antiga ou estragada não tem nenhum', () => {
  const ids = v => JSON.stringify(tutorial.experimentadosDe(v));
  assert.equal(ids({ vista: true, em: 1 }), '[]', 'marca da D4b/G-331, sem a lista');
  assert.equal(ids(null), '[]'); assert.equal(ids('x'), '[]'); assert.equal(ids({ experimentados: 'listas' }), '[]');
  assert.equal(ids({ experimentados: ['perfil', 'listas', 'listas', 'mesa', 7, null, 'colecao'] }), '["listas","colecao","perfil"]');
});

test('G-341 · marcaDoTour: soma o guardado com o daqui (nada marcado se perde), continua "vista" e guarda o resto da marca', () => {
  const m = tutorial.marcaDoTour({ vista: true, em: 5, experimentados: ['noticias'], outro: 1 }, new Set(['listas']), 99);
  assert.equal(m.vista, true); assert.equal(m.em, 99); assert.equal(m.outro, 1);
  assert.equal(JSON.stringify(m.experimentados), '["listas","noticias"]');
  assert.equal(JSON.stringify(tutorial.marcaDoTour(null, [], 1)), JSON.stringify({ vista: true, em: 1, experimentados: [] }), 'primeira abertura: vista, nenhum experimentado');
  assert.equal(JSON.stringify(tutorial.marcaDoTour({ experimentados: ['jogar'] }, ['zzz'], 1).experimentados), '["jogar"]', 'id desconhecido não entra');
  assert.ok(JSON.stringify(m).length < 400, 'cabe folgado no valor da preferência sincronizada');
});

// G-342 · relato #51 fatia 4 · Scanner guiado: o pedido da câmera tem retorno (texto vivo por estado) e caminho sem câmera
test('G-342 · GUIAS.scanner: licença da câmera com texto vivo, depois "aponte" só com a câmera ligada ou "sem câmera" só bloqueada/ausente; Digitar e a pilha valem sempre; só aponta', () => {
  const g = tutorial.GUIAS.scanner;
  assert.ok(Array.isArray(g) && g.length === 5, `scanner: ${g && g.length} passos`);
  assert.equal(g.map(p => p.alvo).join(' '), '#scan-stage #scan-stage #scan-status #scan-manual-open #scan-lot'); // array de outro contexto (vm): compara por valor
  assert.ok(g[0].espera, 'o primeiro passo espera a tela'); assert.equal(typeof g[0].texto, 'function', 'o primeiro passo responde ao pedido da câmera');
  for (const p of g) { assert.ok(p.titulo.split(' ').length <= 5, p.titulo); assert.ok(!p.acao, 'só aponta, não navega'); if (typeof p.texto === 'string') assert.ok(p.texto.length <= 90, p.texto); }
  // um texto por estado que a tela do Scanner publica em #scan[data-camera], cada um em até duas linhas (≤ 90 caracteres)
  for (const est of ['idle', 'starting', 'on', 'denied', 'unavailable']) { const t = tutorial.TEXTO_DA_CAMERA[est]; assert.ok(t && t.length <= 90, `${est}: ${t}`); }
  assert.notEqual(tutorial.TEXTO_DA_CAMERA.starting, tutorial.TEXTO_DA_CAMERA.on); assert.match(tutorial.TEXTO_DA_CAMERA.denied, /digitar/i); assert.match(tutorial.TEXTO_DA_CAMERA.unavailable, /digitar/i);
  // sem a tela (o módulo fora do navegador): o passo condicional não se aplica e o texto vivo cai no "pede licença"
  assert.equal(g[1].quando(), false); assert.equal(g[2].quando(), false);
});

test('G-342 · textoDoPasso: frase fixa como está; função vira o texto do estado; função que falha não derruba o balão', () => {
  assert.equal(tutorial.textoDoPasso({ texto: 'fixo' }), 'fixo');
  assert.equal(tutorial.textoDoPasso({ texto: () => 'vivo' }), 'vivo');
  assert.equal(tutorial.textoDoPasso({ texto: () => { throw new Error('x'); } }), '');
});

// G-343 · relato #51 fatia 4 · Jogar guiado: a lista, o Shark, Começar (o guia toca o botão de verdade) e o primeiro turno na mesa
test('G-343 · GUIAS.jogar: lista → Shark → "falta uma lista" (ou Começar) → mão inicial → mão → Passar; os gestos tocam botões de verdade e nenhum navega por rota', () => {
  const g = tutorial.GUIAS.jogar;
  assert.ok(Array.isArray(g) && g.length === 7, `jogar: ${g && g.length} passos`);
  assert.equal(g.map(p => p.alvo).join(' | '), '#mesa-hero, #mesa-sem-formato | [data-opponent="shark"] | #mesa-hero, #mesa-sem-formato | #mesa-start | #tb-keep | #tb-hand | #tb-pass');
  for (const p of g) { assert.ok(p.titulo && p.titulo.split(' ').length <= 5, p.titulo); assert.ok(typeof p.texto === 'string' && p.texto.length <= 90, p.texto); if (p.acao) { assert.ok(p.acao.clica && !p.acao.rota, 'o gesto toca o botão da tela'); assert.equal(p.acao.clica, p.alvo, 'toca o que aponta'); } }
  assert.equal(g.filter(p => p.acao).length, 3, 'Shark, Começar e Manter');
  assert.ok(g[0].espera, 'o primeiro passo espera a tela');
  assert.ok(g[4].espera === '#tb' && g[4].esperaMs >= 10000, 'a mesa pode demorar a montar: espera mais');
  // "falta uma lista" e Começar são as duas faces do mesmo momento (a falta vem antes: depois do toque o Começar fica ocupado); fora do navegador, Começar não está pronto
  assert.equal(g[2].quando(), true); assert.equal(g[3].quando(), false);
});
