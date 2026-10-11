// P-3 · SEG3 · política de conteúdo (CSP) do app: de onde ele aceita código e para onde conversa. Contrato estático
// sobre o index.html e o sw.js: a política existe, fecha o que não se usa e cobre toda origem de rede que o código cita.
// Origem nova de rede entra na meta do index.html; endereço que o app só ABRE (link) entra em LINKS abaixo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const FONTE = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const SW = readFileSync(new URL('./sw.js', import.meta.url), 'utf8');

const meta = FONTE.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/);
const politica = () => Object.fromEntries(meta[1].split(';').map(s => s.trim()).filter(Boolean).map(s => { const [k, ...v] = s.split(/\s+/); return [k, v]; }));
/** Endereços que o app só abre numa aba (window.open, href), sem buscar nada: não passam pela política. */
const LINKS = new Set(['https://github.com', 'https://guiamuy.github.io', 'https://topdeck.gg', 'https://www.mtgo.com', 'https://scryfall.com']);
const casa = (origem, fonte) => fonte === origem || (fonte.includes('*.') && origem.startsWith(fonte.split('*.')[0]) && origem.endsWith('.' + fonte.split('*.')[1]));

test('P-3 · a política está no <head>, antes de qualquer script, e fecha o que o app não usa', () => {
  assert.ok(meta, 'meta Content-Security-Policy no index.html');
  assert.ok(FONTE.indexOf(meta[0]) < FONTE.indexOf('<script'), 'a política vem antes do primeiro script (depois dele, não vale para ele)');
  const p = politica();
  assert.deepEqual(p['default-src'], ["'self'"]);
  assert.deepEqual(p['object-src'], ["'none'"]);
  assert.deepEqual(p['base-uri'], ["'none'"]);
  for (const d of ['script-src', 'connect-src', 'worker-src', 'frame-src']) {
    assert.ok(p[d], d + ' declarado');
    assert.ok(!p[d].includes('*') && !p[d].includes('https:') && !p[d].includes('http:'), d + ' sem curinga: só origens nomeadas');
  }
  assert.ok(!p['script-src'].includes("'unsafe-eval'"), 'sem eval de texto (o OCR só precisa de wasm-unsafe-eval)');
  assert.ok(p['script-src'].includes("'wasm-unsafe-eval'"), 'o leitor do scanner compila WebAssembly');
  assert.ok(p['worker-src'].includes('blob:'), 'o leitor do scanner roda num worker criado de blob');
});

test('P-3 · toda origem de rede citada no app ou no service worker está na política (ou é só um link que o app abre)', () => {
  const p = politica();
  const permitidas = [...p['connect-src'], ...p['script-src'], ...p['frame-src'], ...p['style-src']];
  const citadas = new Set([...(FONTE.replace(meta[0], '') + '\n' + SW).matchAll(/\b(?:https|wss):\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)+/gi)].map(m => m[0].toLowerCase()));
  const faltam = [...citadas].filter(o => !LINKS.has(o) && !permitidas.some(f => casa(o, f)));
  assert.deepEqual(faltam, [], 'origem nova: acrescente na meta Content-Security-Policy do index.html (connect-src para fetch, script-src para script) ou em LINKS se o app só abre o endereço');
});

test('P-3 · o que os serviços combinados precisam já está liberado: Scryfall, ramos de dados, câmbio, OCR, Google e Firebase', () => {
  const p = politica();
  const conecta = o => p['connect-src'].some(f => casa(o, f));
  for (const o of ['https://api.scryfall.com', 'https://cards.scryfall.io', 'https://raw.githubusercontent.com', 'https://cdn.jsdelivr.net',
    'https://economia.awesomeapi.com.br', 'https://api.frankfurter.dev', 'https://open.er-api.com', 'https://www.googleapis.com',
    'https://identitytoolkit.googleapis.com', 'https://securetoken.googleapis.com', 'https://lh3.googleusercontent.com' /* foto da conta, baixada para o perfil */, 'https://estante-default-rtdb.firebaseio.com',
    'https://estante-default-rtdb.europe-west1.firebasedatabase.app']) assert.ok(conecta(o), 'connect-src cobre ' + o);
  assert.ok(!conecta('https://exemplo.invalid'), 'e não cobre o resto');
  assert.ok(p['script-src'].includes('https://cdn.jsdelivr.net') && p['script-src'].includes('https://accounts.google.com'));
  assert.ok(p['img-src'].includes('https:'), 'imagens de qualquer origem https (cartas, notícias, foto da conta): só leitura');
});
