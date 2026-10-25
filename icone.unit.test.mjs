// E50 · ícone do app: fonte única (brand.js) para favicon, icon.svg e icon-512.png; aparência de botão.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadModules, HERE } from './_load.mjs';
import { join } from 'node:path';
const { brand: B } = loadModules();

test('E50 · icon.svg publicado é exatamente o que a fonte gera (rode `node gerar-icone.mjs` depois de mudar o ícone)', () => {
  const svg = readFileSync(join(HERE, 'icon.svg'), 'utf8').trim();
  assert.equal(svg, B.iconeDoApp({ tamanho: 512 }).trim());
});

test('E50 · o favicon usa a mesma fonte, e o ícone tem relevo: fundo em degradê, brilho, verniz e sombra na marca', () => {
  const href = B.faviconHref();
  assert.ok(href.startsWith('data:image/svg+xml,'));
  const svg = decodeURIComponent(href.slice('data:image/svg+xml,'.length));
  assert.equal(svg, B.iconeDoApp({ tamanho: 32 }));
  for (const parte of ['-fundo', '-brilho', '-verniz', '-latao', '-sombra', 'feDropShadow', 'rx="15"']) assert.ok(svg.includes(parte), parte);
  assert.doesNotMatch(svg, /var\(--/, 'sem variáveis de CSS: o data URI não as resolve');
  // marca dentro da zona segura do ícone mascarável (80% centrais de 64 → 6,4 a 57,6)
  for (const m of svg.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"[^>]*(?:marfim|latao|f1e8d7)/g)) {
    const [x, y, w, h] = m.slice(1).map(Number);
    assert.ok(x >= 6.4 && y >= 6.4 && x + w <= 57.6 && y + h <= 57.6, 'fora da zona segura: ' + m[0].slice(0, 60));
  }
});

test('E50 · o PNG de instalação existe em 512×512 e não é o antigo (gerado da mesma fonte)', () => {
  const png = readFileSync(join(HERE, 'icon-512.png'));
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], 'assinatura PNG');
  assert.equal(png.readUInt32BE(16), 512); assert.equal(png.readUInt32BE(20), 512);
  assert.ok(png.length > 20000, 'o ícone com relevo tem degradês e sombra; o antigo, chapado, tinha 3 KB');
});

/* ---------------- J5 · abertura ---------------- */
test('J5 · o ícone que a abertura monta é o mesmo ícone do app: só ganha um grupo com classe em volta de cada parte', () => {
  const parado = B.iconeDoApp({ tamanho: 112 }), animado = B.iconeDoApp({ tamanho: 112, animado: true });
  assert.notEqual(animado, parado);
  for (const c of ['ab-moldura', 'ab-tabua', 'ab-carta ab-carta--1', 'ab-carta ab-carta--2', 'ab-carta ab-carta--3']) assert.equal(animado.split(`<g class="${c}">`).length, 2, 'uma vez: ' + c);
  // tirando os grupos, sobra exatamente o ícone
  let limpo = animado; for (let i = 0; i < 5; i++) limpo = limpo.replace(/<g class="ab-[^"]*">(<rect[^>]*\/>)<\/g>/, '$1');
  // I7 (leva 206) · o ícone animado ganhou ids próprios e a sombra com região fixa (a região pela caixa do grupo mudava a
  // cada quadro e a sombra tremia embaixo): fora isso, é o ícone
  assert.match(animado, /<filter id="estante-abertura-sombra" filterUnits="userSpaceOnUse" x="0" y="0" width="64" height="64">/);
  assert.doesNotMatch(parado, /userSpaceOnUse/, 'o ícone do app e os arquivos gerados não mudam');
  limpo = limpo.replaceAll('estante-abertura', 'estante-icone').replace('filterUnits="userSpaceOnUse" x="0" y="0" width="64" height="64"', 'x="-20%" y="-20%" width="140%" height="160%"');
  assert.equal(limpo, parado, 'a geometria e as cores são as do ícone');
  assert.ok(animado.indexOf('ab-carta--3') > animado.indexOf('rotate(11 42 29)'), 'a carta de latão cai já dentro da inclinação dela');
});

test('G-306 · a abertura monta a cena da estante (fundo, laterais, topo, tábua, base, três livros com corpo, faces e sombra) antes do ícone, que é o primeiro e único svg', () => {
  const partes = [];
  const win = { document: { body: { appendChild(el) { partes.push(el); } }, documentElement: { getAttribute: () => null }, createElement: () => { const el = { dataset: {}, setAttribute(k, v) { el[k] = v; }, remove() {} }; return el; } }, sessionStorage: { getItem: () => null, setItem() {} }, matchMedia: () => ({ matches: false }), addEventListener() {}, removeEventListener() {}, setTimeout: () => 1, clearTimeout() {} };
  const r = B.mostraAbertura(win); assert.ok(r && r.el); const html = r.el.innerHTML;
  assert.ok(html.indexOf('<span class="abertura__cena"') < html.indexOf('<span class="abertura__ladrilho"'), 'a cena vem antes do ladrilho (o ícone cobre a cena ao chegar)');
  for (const c of ['ab-estante__fundo', 'ab-peca ab-estante__lado ab-estante__lado--esq', 'ab-peca ab-estante__lado ab-estante__lado--dir', 'ab-peca ab-estante__topo', 'ab-peca ab-estante__tabua', 'ab-peca ab-estante__base']) assert.equal(html.split(`class="${c}"`).length, 2, 'uma peça: ' + c);
  for (const n of [1, 2, 3]) { assert.equal(html.split(`class="ab-livro ab-livro--${n}"`).length, 2, 'livro ' + n); }
  assert.equal(html.split('class="ab-livro__corpo"').length, 4); assert.equal(html.split('class="ab-livro__sombra"').length, 4);
  assert.ok((html.match(/class="ab-face /g) || []).length >= 12, 'faces de volume');
  assert.equal((html.match(/<svg/g) || []).length, 1, 'a cena é feita de caixas e gradientes: o único svg é o ícone');
  assert.equal(r.el.dataset.parada, 'false');
});

test('J5 · a abertura aparece uma vez por sessão e dura a animação inteira, ou meio segundo com movimento reduzido', () => {
  assert.equal(B.deveAbrir({}), true); assert.equal(B.deveAbrir({ jaAbriu: true }), false, 'recarregar não repete');
  assert.equal(B.deveAbrir({ desligada: true }), false); assert.equal(B.deveAbrir(), true);
  // I7 (leva 206) · de 1,2 s para 2 s, a pedido; G-306 (relato #35) · 2,4 s: a estante se monta em 3D, pausa de leitura e vira o ícone
  assert.equal(B.duracaoDaAbertura(false), 2400); assert.equal(B.duracaoDaAbertura(true), 500); assert.equal(B.ABERTURA_MS, 2400);
  assert.equal(B.ABERTURA_MS, Math.round(1300 * 24 / 13), 'o mesmo valor que o CSS deriva de --dur-abertura (24/13)');
  assert.equal(B.mostraAbertura(null), null, 'sem janela (teste, servidor) não faz nada');
});
