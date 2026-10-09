// leva 123 · dívidas do design system: vibração pela plataforma, aviso de nova versão e tons de Badge/Note.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
const { platform: F2, pwa: W1, components: F5 } = loadModules();

test('leva 123 · vibração faz parte do contrato da plataforma e nunca lança', () => {
  // D2 · a vibração ganhou liga/desliga (Ajustes › Aparência): o contrato cresceu de propósito
  // D10 · vibração por evento (toque, confirmação, alerta, turno): o contrato cresceu de novo, de propósito
  assert.deepEqual(JSON.parse(JSON.stringify(F2.PLATFORM_CONTRACT.haptics)), ['vibrate', 'evento', 'ligar', 'ligada']);
  const h = F2.webHaptics({ vibrate: () => true }); assert.equal(h.ligada(), true); assert.equal(h.vibrate(5), true);
  assert.equal(h.ligar(false), false); assert.equal(h.vibrate(5), false, 'desligada, não vibra nem chama o aparelho'); h.ligar(true); assert.equal(h.vibrate(5), true);
  const chamadas = [];
  const p = F2.createPlatform({ window: {}, indexedDB: null, document: null, navigator: { vibrate: ms => { chamadas.push(ms); return true; } } });
  assert.equal(p.haptics.vibrate(12), true); assert.deepEqual(chamadas, [12]);
  assert.equal(F2.webHaptics(null).vibrate(8), false, 'sem navigator: não faz nada');
  assert.equal(F2.webHaptics({}).vibrate(8), false, 'sem suporte: não faz nada');
  assert.equal(F2.webHaptics({ vibrate: () => { throw new Error('bloqueado'); } }).vibrate(8), false, 'erro do navegador é engolido');
  assert.equal(typeof F2.haptics.vibrate, 'function', 'instância padrão para módulos sem a plataforma');
});

/** Registro falso de service worker, com os eventos que o navegador dispara. */
function registroFalso({ controller = null, waiting = null } = {}) {
  const ouvintes = {};
  const worker = () => { const o = {}; return { state: 'installing', addEventListener: (ev, f) => { o[ev] = f; }, muda(st) { this.state = st; o.statechange && o.statechange(); } }; };
  const reg = { waiting, installing: null, addEventListener: (ev, f) => { ouvintes[ev] = f; },
    novoWorker() { const w = worker(); this.installing = w; ouvintes.updatefound && ouvintes.updatefound(); return w; } };
  const nav = { serviceWorker: { controller, register: async () => reg } };
  return { reg, nav };
}

test('leva 123 · depois de um deploy, a página avisa uma vez que há versão nova; na primeira instalação não avisa', async () => {
  // página já controlada pelo worker antigo: o novo instala → aviso
  const avisos = []; const { reg, nav } = registroFalso({ controller: {} });
  const r = await W1.registerServiceWorker({ navigator: nav, location: { protocol: 'https:', hostname: 'guiamuy.github.io' }, onNovaVersao: () => avisos.push(1) });
  assert.equal(r.ok, true);
  const w = reg.novoWorker(); w.muda('installed'); w.muda('activated');
  assert.equal(avisos.length, 1, 'avisa uma vez só');
  const w2 = reg.novoWorker(); w2.muda('installed');
  assert.equal(avisos.length, 1, 'não repete o aviso');
  // primeira visita: nada controla a página ainda → o worker instala em silêncio
  const silencio = []; const f = registroFalso({ controller: null });
  await W1.registerServiceWorker({ navigator: f.nav, location: { protocol: 'https:', hostname: 'guiamuy.github.io' }, onNovaVersao: () => silencio.push(1) });
  f.reg.novoWorker().muda('installed');
  assert.equal(silencio.length, 0);
  // worker já esperando quando a página abre (deploy entre duas visitas) → avisa na hora
  const jaEspera = []; const g = registroFalso({ controller: {}, waiting: {} });
  await W1.registerServiceWorker({ navigator: g.nav, location: { protocol: 'https:', hostname: 'guiamuy.github.io' }, onNovaVersao: () => jaEspera.push(1) });
  assert.equal(jaEspera.length, 1);
  // sem callback nem registro válido, nada quebra
  W1.observaAtualizacao(null, nav, () => {}); W1.observaAtualizacao({}, nav, null);
});

test('leva 123 · Note e Badge aceitam o tom em texto ou em objeto; "danger" vira "negative"', () => {
  // DOM mínimo: só o que h() precisa
  const el = () => ({ attrs: {}, children: [], style: {}, dataset: {}, className: '', setAttribute(k, v) { this.attrs[k] = v; }, appendChild(c) { this.children.push(c); return c; }, addEventListener() {} });
  // os módulos vivem numa vm: o `document` deles é o do realm da vm, alcançado pelo construtor de função
  const realm = F5.h.constructor('return this')();
  const antes = realm.document; realm.document = { createElement: el, createTextNode: t => ({ text: t }) };
  try {
    assert.equal(F5.Note('x', 'warning').className, 'ds-note ds-note--warning');
    assert.equal(F5.Note('x', { tone: 'warning' }).className, 'ds-note ds-note--warning');
    assert.equal(F5.Note('x', { tone: 'danger' }).className, 'ds-note ds-note--negative');
    assert.equal(F5.Note('x').className, 'ds-note');
    assert.equal(F5.Badge('x', { tone: 'warning' }).className, 'ds-badge ds-badge--warning');
    assert.equal(F5.Badge('x', { tone: 'danger' }).className, 'ds-badge ds-badge--negative');
    assert.equal(F5.Badge('x').className, 'ds-badge');
  } finally { realm.document = antes; }
});

test('D10 · vibração por evento: um padrão por significado, sequência para a troca de vez, nada quando desligada ou sem evento', () => {
  const chamadas = [];
  const h = F2.webHaptics({ vibrate: p => { chamadas.push(p); return true; } });
  assert.equal(h.evento('toque'), true); assert.equal(h.evento('confirmacao'), true); assert.equal(h.evento('alerta'), true); assert.equal(h.evento('turno'), true);
  assert.deepEqual(JSON.parse(JSON.stringify(chamadas)), [8, 12, 30, [12, 40, 12]]);
  assert.equal(h.evento('inexistente'), false, 'evento desconhecido não vibra'); assert.equal(chamadas.length, 4);
  h.ligar(false); assert.equal(h.evento('alerta'), false); assert.equal(chamadas.length, 4, 'desligada: não chama o aparelho');
  assert.deepEqual(Object.keys(F2.EVENTOS_HAPTICOS), ['toque', 'confirmacao', 'alerta', 'turno']);
});

/* ---------------- J1 · ficar onde está ---------------- */
test('J1 · a âncora do toque só compensa quando faz sentido: mesma tela, sem o app levar de propósito, sem a pessoa rolar', () => {
  const base = { tela: 'perfil', rotaAntes: '#/perfil', rotaDepois: '#/perfil', levou: false, rolouNaMao: false, delta: 40 };
  assert.equal(F5.deveAncorar(base), true);
  assert.equal(F5.deveAncorar({ ...base, delta: -40 }), true, 'para cima ou para baixo');
  assert.equal(F5.deveAncorar({ ...base, delta: 1 }), false, 'dentro da tolerância não mexe');
  assert.equal(F5.deveAncorar({ ...base, rotaDepois: '#/listas' }), false, 'trocou de tela');
  assert.equal(F5.deveAncorar({ ...base, levou: true }), false, 'o app levou o olhar de propósito');
  assert.equal(F5.deveAncorar({ ...base, rolouNaMao: true }), false, 'a pessoa rolou');
  // J2 (leva 197) · expectativa mudou de propósito: a âncora passou a valer também na partida
  assert.equal(F5.deveAncorar({ ...base, tela: 'partida' }), true, 'na mesa também');
  assert.equal(F5.deveAncorar(), false);
});

test('J1 · contrato: o app só move a rolagem nos pontos declarados, cada um com o seu motivo', async () => {
  const { readFileSync } = await import('node:fs');
  const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
  // trecho que identifica a linha → por que ela pode mover a tela. Ponto novo precisa entrar aqui (ou usar `levaAte`).
  const DECLARADOS = [
    ['if (rolagem > 0 && window.scrollY !== rolagem) window.scrollTo(0, rolagem);', 'mount: devolve a rolagem depois de repintar a tela'],
    ['window.scrollTo(0, window.scrollY + delta);', 'âncora do toque: compensa o que mudou acima do controle'],
    ['window.scrollTo(0, window.scrollY + falta);', 'âncora do toque: fim da página'],
    ["if (el && el.scrollIntoView) el.scrollIntoView({ block, inline: 'nearest', behavior: parado ? 'auto' : 'smooth' });", 'levaAte: a ação pede uma decisão em outra região; a mesa só chega aqui por levaSeEscondido (J2)'],
    ["st.passo++; st.entregue = false; paint(); window.scrollTo(0, 0);", 'série: o passo seguinte da troca é uma tela nova'],
    ['    window.scrollTo(0, 0);', 'roteador: tela nova começa do topo'],
    ['if (ancora && alvo > 0) requestAnimationFrame(() => { if (root.isConnected) window.scrollTo(0, window.scrollY + root.getBoundingClientRect().top + alvo); });', 'notícias (N3, T2): voltar pela rota das notícias devolve o ponto da leitura'],
    ["if (ancora) requestAnimationFrame(() => { if (root.isConnected) root.scrollIntoView({ block: 'start' }); });", 'notícias (T2): a rota das notícias abre a Início já na seção'],
    ["onClick: () => { window.scrollTo({ top: 0, behavior: parado() ? 'auto' : 'smooth' }); topo.hidden = true; }", 'notícias (T2): o botão Topo, pedido pelo toque'],
  ];
  const linhas = html.split('\n').filter(l => /\.scrollIntoView\(|\bscrollTo\(|\bscrollBy\(|\.scrollTop\s*=[^=]/.test(l) && !/^\s*(\/\/|\*|\/\*)/.test(l) && !/lista\.scrollTop = lista\.scrollHeight/.test(l));
  const semMotivo = linhas.filter(l => !DECLARADOS.some(([trecho]) => l.includes(trecho)));
  assert.deepEqual(semMotivo.map(l => l.trim().slice(0, 140)), [], 'rolagem movida sem declaração');
  for (const [trecho] of DECLARADOS) assert.ok(html.includes(trecho), 'declarado e não existe mais: ' + trecho);
});

/* ---------------- J2 · a mesa só anda para mostrar o que está escondido ---------------- */
test('J2 · à vista ou escondido: dentro da janela, acima da bandeja e dentro da fileira que rola de lado', () => {
  const caixa = (top, left = 100, h = 100, w = 76) => ({ top, bottom: top + h, left, right: left + w });
  const J = { alturaDaJanela: 780, topoDaDoca: 600, fileira: { left: 20, right: 340 } };
  const e = (c, o = J) => { const r = F5.oQueEsconde(c, o); return [r.vertical, r.lateral, r.escondido]; };
  assert.deepEqual(e(caixa(300)), [false, false, false], 'à vista: a mesa não se move');
  assert.deepEqual(e(caixa(520)), [true, false, true], 'atrás da bandeja conta como escondido');
  assert.deepEqual(e(caixa(-40)), [true, false, true], 'acima da janela');
  assert.deepEqual(e(caixa(300, 300)), [false, true, true], 'fora da fileira, à direita: só a fileira rola');
  assert.deepEqual(e(caixa(300, -10)), [false, true, true], 'fora da fileira, à esquerda');
  assert.deepEqual(e(caixa(650), { ...J, naDoca: true }), [false, false, false], 'o que mora na bandeja se mede pela janela');
  assert.deepEqual(e(caixa(650), { alturaDaJanela: 780 }), [false, false, false], 'tela sem bandeja nem fileira');
  assert.deepEqual(e(caixa(700), { alturaDaJanela: 780 }), [true, false, true]);
});

/* ---------------- I7 · acabamento ---------------- */
test('I7 · contrato: o toque não mostra realce do navegador, e toda camada de tela inteira com fundo se estende além da caixa', async () => {
  const { readFileSync } = await import('node:fs');
  const css = readFileSync(new URL('./index.html', import.meta.url), 'utf8').split('</style>')[0];
  assert.match(css, /\nhtml \{ -webkit-tap-highlight-color: transparent; \}/, 'realce de toque desligado na raiz (a propriedade é herdada)');
  assert.match(css, /:focus:not\(:focus-visible\) \{ outline: none; \}/, 'tocar não desenha contorno; o teclado desenha');
  // camada fixa que cobre a tela e tem fundo: sem a sombra de 100vmax sobra uma faixa do app embaixo quando a barra do
  // navegador recolhe. Camada sem fundo (efeitos da mesa) não precisa.
  const regras = css.match(/[^{}\n]+\{[^{}]*position: fixed; inset: 0;[^{}]*\}/g) || [];
  assert.ok(regras.length >= 4, 'camadas de tela inteira encontradas: ' + regras.length);
  const semSangria = regras.filter(r => /background(-color)?:/.test(r) && !/box-shadow: 0 0 0 100vmax/.test(r)).map(r => r.split('{')[0].trim());
  assert.deepEqual(semSangria, [], 'camada com fundo e sem a sangria');
});
