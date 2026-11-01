// P-6 · SEG5 · "O que sai do aparelho" (Perfil › Dados) e a política de conteúdo dizem a mesma coisa: todo serviço que a
// política libera aparece na tela, com o que vai, quando e como evitar; e a tela não lista serviço que a política barra.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadModules } from './_load.mjs';
const { saida: S } = loadModules();
const FONTE = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const politica = Object.fromEntries(FONTE.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/)[1]
  .split(';').map(x => x.trim()).filter(Boolean).map(x => { const [k, ...v] = x.split(/\s+/); return [k, v]; }));
const ehOrigem = v => /^(https|wss):\/\//.test(v);

test('P-6 · todo serviço que a política de conteúdo libera para script e conexão está na tela, e a tela não inventa serviço', () => {
  const liberadas = new Set(['connect-src', 'script-src', 'frame-src', 'style-src'].flatMap(d => (politica[d] || []).filter(ehOrigem)));
  const naTela = new Set(S.DESTINOS.flatMap(d => d.origens));
  assert.deepEqual([...liberadas].filter(o => !naTela.has(o)).sort(), [], 'serviço liberado na política sem explicação na tela: acrescente em DESTINOS (src/app/saida.js)');
  assert.deepEqual([...naTela].filter(o => !liberadas.has(o)).sort(), [], 'serviço na tela que a política não libera: tire da tela ou libere na política');
  const links = S.LINKS.flatMap(l => l.origens);
  assert.ok(links.every(o => !liberadas.has(o)), 'link que o app só abre não precisa estar na política');
});

test('P-6 · cada serviço diz o que vai, quando e como evitar; cada link diz o que acontece ao tocar', () => {
  for (const d of S.DESTINOS) {
    for (const k of ['nome', 'icone', 'vai', 'quando', 'evitar']) assert.ok(typeof d[k] === 'string' && d[k].length >= 3, `${d.id}.${k}`);
    assert.ok(d.origens.length >= 1 && d.origens.every(ehOrigem), d.id + ' com origens');
  }
  for (const l of S.LINKS) for (const k of ['nome', 'icone', 'vai']) assert.ok(typeof l[k] === 'string' && l[k].length >= 3, `${l.id}.${k}`);
  assert.equal(JSON.stringify(S.DESTINOS.filter(d => d.liga).map(d => [d.id, d.liga])), JSON.stringify([['google', 'google'], ['firebase', 'firebase']]), 'conta e online dizem se estão em uso');
  assert.match(S.DESTINOS.find(d => d.id === 'leitor').vai, /imagens da câmera não saem do aparelho/);
});

test('G-320 · o que sai pelo navegador (sem endereço do app) também está na tela: o ditado do relato', () => {
  assert.equal(JSON.stringify(S.PELO_NAVEGADOR.map(d => d.id)), '["fala"]');
  for (const d of S.PELO_NAVEGADOR) {
    for (const k of ['nome', 'icone', 'vai', 'quando', 'evitar']) assert.ok(typeof d[k] === 'string' && d[k].length >= 3, `${d.id}.${k}`);
    assert.equal(d.origens.length, 0, 'é o navegador que fala com o serviço dele; a política de conteúdo não muda');
  }
  const fala = S.PELO_NAVEGADOR[0];
  assert.match(fala.vai, /Só quando você toca em Ditar/); assert.match(fala.vai, /não grava nem guarda áudio/);
  assert.match(FONTE, /PLATFORM_CONTRACT = \{[\s\S]*?fala: \['available'/, 'quem lista o ditado é quem tem o ditado (G-319)');
});

test('P-6 · a rota e o atalho do Perfil existem', () => {
  assert.match(FONTE, /path: '\/perfil\/saida', title: 'O que sai do aparelho'/);
  assert.match(FONTE, /id: 'perfil-saida', onClick: \(\) => go\('\/perfil\/saida'\)/);
});
