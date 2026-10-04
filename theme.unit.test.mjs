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

/* ---------------- D1 · aparência: escala de texto e densidade ---------------- */
test('D1 · escala e densidade: atributos no <html>, valores inválidos caem no padrão, guardado volta no init', async () => {
  const store = P.memoryStore(); const d = documento();
  const doc = { documentElement: d.root, querySelectorAll: () => [] };
  const th = T.createTheme(store, janela('dark'), doc);
  await th.init();
  // D2 · a aparência ganhou acento, movimento e vibração; D7 · superfície, cor do oponente e verso (expectativa estendida de propósito)
  const MESA = { superficie: 'nogueira', oponente: 'azul', verso: 'estante' };
  assert.deepEqual(JSON.parse(JSON.stringify(th.aparencia)), { escala: 'media', densidade: 'confortavel', acento: 'latao', movimento: 'sistema', vibracao: true, ...MESA });
  assert.equal('data-escala' in d.root.attrs, false, 'padrão não marca o <html>');
  await th.setAparencia({ escala: 'grande' });
  assert.equal(d.root.attrs['data-escala'], 'grande'); assert.equal('data-densidade' in d.root.attrs, false);
  await th.setAparencia({ densidade: 'compacta' });
  assert.deepEqual(JSON.parse(JSON.stringify(await store.get('ui.aparencia'))), { escala: 'grande', densidade: 'compacta', acento: 'latao', movimento: 'sistema', vibracao: true, ...MESA });
  await th.setAparencia({ escala: 'enorme' });
  assert.equal('data-escala' in d.root.attrs, false, 'valor desconhecido volta ao padrão');
  assert.equal(d.root.attrs['data-densidade'], 'compacta');
  // outro "aparelho" com o mesmo store: o init reaplica
  const d2 = documento(); const th2 = T.createTheme(store, janela('dark'), { documentElement: d2.root, querySelectorAll: () => [] });
  await th2.init(); assert.equal(d2.root.attrs['data-densidade'], 'compacta'); assert.equal('data-escala' in d2.root.attrs, false);
  assert.deepEqual(JSON.parse(JSON.stringify([th.ESCALAS, th.DENSIDADES])), [['pequena', 'media', 'grande'], ['confortavel', 'compacta']]);
});

test('D2 · acento, movimento e vibração: atributos, validação, e quem ouve a aparência recebe a vibração', async () => {
  const store = P.memoryStore(); const d = documento(); const ouvidas = [];
  const th = T.createTheme(store, janela('dark'), { documentElement: d.root, querySelectorAll: () => [] }, { aoAparencia: a => ouvidas.push(a.vibracao) });
  await th.init();
  assert.deepEqual(JSON.parse(JSON.stringify([th.ACENTOS, th.MOVIMENTOS])), [['latao', 'cobre', 'prata', 'jade'], ['sistema', 'reduzido']]);
  await th.setAparencia({ acento: 'jade', movimento: 'reduzido', vibracao: false });
  assert.equal(d.root.attrs['data-acento'], 'jade'); assert.equal(d.root.attrs['data-movimento'], 'reduzido');
  assert.equal(ouvidas.at(-1), false, 'quem ouve soube que a vibração desligou');
  await th.setAparencia({ acento: 'neon', movimento: 'nenhum' });
  assert.equal('data-acento' in d.root.attrs, false, 'acento desconhecido volta ao latão'); assert.equal('data-movimento' in d.root.attrs, false);
  assert.equal(th.aparencia.vibracao, false, 'o que não veio no patch não muda');
  await th.setAparencia({ vibracao: true }); assert.equal(ouvidas.at(-1), true);
});

test('D7 · superfície, cor do oponente e verso: atributos no <html> só fora do padrão, valor inválido volta ao padrão, guardado volta no init', async () => {
  const store = P.memoryStore(); const d = documento();
  const doc = { documentElement: d.root, querySelectorAll: () => [] };
  const th = T.createTheme(store, janela('dark'), doc);
  await th.init();
  assert.deepEqual(JSON.parse(JSON.stringify([th.SUPERFICIES, th.OPONENTES, th.VERSOS])), [['nogueira', 'feltro', 'pedra', 'linho'], ['azul', 'rubi', 'ametista'], ['estante', 'selo', 'trama']]);
  for (const a of ['data-superficie', 'data-oponente', 'data-verso']) assert.equal(a in d.root.attrs, false, a + ' padrão não marca o <html>');
  await th.setAparencia({ superficie: 'feltro', oponente: 'rubi', verso: 'selo' });
  assert.equal(d.root.attrs['data-superficie'], 'feltro'); assert.equal(d.root.attrs['data-oponente'], 'rubi'); assert.equal(d.root.attrs['data-verso'], 'selo');
  await th.setAparencia({ superficie: 'veludo', oponente: 'azul' });
  assert.equal('data-superficie' in d.root.attrs, false, 'superfície desconhecida volta ao padrão'); assert.equal('data-oponente' in d.root.attrs, false); assert.equal(d.root.attrs['data-verso'], 'selo', 'o que não veio no patch não muda');
  const th2 = T.createTheme(store, janela('dark'), { documentElement: d.root, querySelectorAll: () => [] }); await th2.init();
  assert.equal(th2.aparencia.verso, 'selo', 'guardado volta no init');
});
