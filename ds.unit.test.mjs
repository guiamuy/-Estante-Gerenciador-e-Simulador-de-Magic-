// leva 123 · dívidas do design system: vibração pela plataforma, aviso de nova versão e tons de Badge/Note.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
const { platform: F2, pwa: W1, components: F5 } = loadModules();

test('leva 123 · vibração faz parte do contrato da plataforma e nunca lança', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(F2.PLATFORM_CONTRACT.haptics)), ['vibrate']);
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
