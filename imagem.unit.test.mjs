// G-277 · relato #26 · a carta ampliada abre na hora: o `srcset` da carta (nítida para a tela) nunca oferece o PNG
// (745 px, 1 a 2 MB); a "large" (672 px) é a maior candidata. O comportamento no navegador (primeiro quadro pela
// guardada sem srcset; a nítida entra depois da carga; sem ela fica a guardada) está no e2e "O1" e no "H1".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';

test('G-277 · srcsetDaCarta: small, normal e large com as larguras da Scryfall; o PNG fica fora; url repetida entra uma vez; sem imagens, vazio', () => {
  const { srcsetDaCarta } = loadModules().components;
  assert.equal(srcsetDaCarta({ small: 's', normal: 'n', large: 'l', png: 'p' }), 's 146w, n 488w, l 672w');
  assert.equal(srcsetDaCarta({ png: 'p' }), '', 'só o PNG: nenhuma candidata (ele fica como reserva do src)');
  assert.equal(srcsetDaCarta({ small: 'x', normal: 'x', large: 'l' }), 'x 146w, l 672w', 'a mesma url não entra duas vezes');
  assert.equal(srcsetDaCarta(null), '');
});
