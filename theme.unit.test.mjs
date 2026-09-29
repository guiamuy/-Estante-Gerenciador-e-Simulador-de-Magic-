// U1 · tema em dois estados: escuro ou claro, sem "automático" que parecia não fazer nada.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
const { theme: T, platform: P } = loadModules();

/** Documento mínimo: raiz com atributo e um botão de tema. */
function documento() {
  const attrs = {}; const botao = { textContent: '', attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, title: '' };
  return { root: { attrs, setAttribute(k, v) { attrs[k] = v; }, removeAttribute(k) { delete attrs[k]; } }, botao };
}
const janela = pref => ({ matchMedia: q => ({ matches: q.includes(pref) }) });

test('U1 · só dois temas: alternar vai e volta, e cada toque fica guardado', async () => {
  assert.deepEqual(JSON.parse(JSON.stringify(T.THEMES.map(t => t.id))), ['dark', 'light']);
  const store = P.memoryStore(); await store.set('ui.theme', 'dark');
  const th = T.createTheme(store, janela('light'));
  assert.equal(await th.init(), 'dark', 'o guardado vence o sistema');
  assert.equal(await th.cycle(), 'light'); assert.equal(await store.get('ui.theme'), 'light');
  assert.equal(await th.cycle(), 'dark'); assert.equal(await store.get('ui.theme'), 'dark');
});

test('U1 · primeira abertura segue o sistema; "auto" guardado por versão antiga vira o tema do sistema', async () => {
  assert.equal(T.doSistema(janela('light')), 'light');
  assert.equal(T.doSistema(janela('dark')), 'dark');
  assert.equal(T.doSistema({}), 'dark', 'sem matchMedia: escuro');
  assert.equal(T.resolve('auto', janela('light')), 'light');
  assert.equal(T.resolve('auto', janela('dark')), 'dark');
  assert.equal(T.resolve('roxo', janela('dark')), 'dark', 'valor desconhecido não quebra');
  const store = P.memoryStore(); await store.set('ui.theme', 'auto');
  assert.equal(await T.createTheme(store, janela('light')).init(), 'light');
  assert.equal(await T.createTheme(P.memoryStore(), janela('dark')).init(), 'dark', 'nada guardado: sistema');
});

test('U1 · a escolha sempre vai para o documento (nunca fica sem data-theme) e o botão diz o próximo passo', async () => {
  // Q10 · documento falso injetado: agora o teste confere de verdade o data-theme e o botão
  const d = documento();
  const th = T.createTheme(P.memoryStore(), janela('dark'), { documentElement: d.root, querySelectorAll: () => [d.botao] });
  await th.init();
  assert.equal(d.root.attrs['data-theme'], 'dark', 'a raiz recebe o tema');
  // U2 (leva 92) · expectativa mudou: o botão deixou de ser o caractere ☾/☀ e passou a ter os dois
  // ícones SVG do app; o tema só escolhe qual aparece (data-icone-tema) e nunca reescreve o conteúdo.
  assert.equal(d.botao.attrs['data-icone-tema'], 'lua'); assert.equal(d.botao.attrs['aria-pressed'], 'false');
  assert.equal(d.botao.textContent, '', 'o conteúdo (os SVGs) não é trocado por texto');
  await th.cycle();
  assert.equal(d.root.attrs['data-theme'], 'light'); assert.equal(d.botao.attrs['data-icone-tema'], 'sol'); assert.equal(d.botao.attrs['aria-pressed'], 'true');
  assert.ok(T.THEMES.every(t => !/[\u2600-\u27BF]/.test(JSON.stringify(t))), 'nenhum tema carrega caractere de símbolo');
  assert.match(d.botao.attrs['aria-label'], /claro · toque para o escuro/);
  const falho = { get: async () => { throw new Error('x'); }, set: async () => { throw new Error('x'); } };
  const th2 = T.createTheme(falho, janela('light'));
  assert.equal(await th2.init(), 'light', 'armazenamento quebrado não derruba o tema');
  assert.equal(await th2.cycle(), 'dark');
});
