// G-325 · Convidar amigos (Perfil › Convidar amigos): o QR guardado no código é lido de volta aqui, módulo a módulo,
// e precisa dar exatamente o endereço que a tela compartilha. Endereço trocado sem gerar o QR de novo derruba este teste.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadModules } from './_load.mjs';
const { saida: S } = loadModules();
const FONTE = readFileSync(new URL('./index.html', import.meta.url), 'utf8');

/** Leitor mínimo de QR versão 5, correção M (2 blocos de 43 bytes de dados), modo byte, para a máscara dada. */
function leQrV5M(m, mascara) {
  const n = m.length; assert.equal(n, 37, 'versão 5 tem 37 módulos de lado');
  const reservado = (r, c) => (r <= 8 && c <= 8) || (r <= 8 && c >= n - 8) || (r >= n - 8 && c <= 8) || r === 6 || c === 6 || (r >= 28 && r <= 32 && c >= 28 && c <= 32);
  const inverte = [(r, c) => (r + c) % 2 === 0, r => r % 2 === 0, (r, c) => c % 3 === 0, (r, c) => (r + c) % 3 === 0,
    (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0, (r, c) => (r * c) % 2 + (r * c) % 3 === 0,
    (r, c) => ((r * c) % 2 + (r * c) % 3) % 2 === 0, (r, c) => ((r + c) % 2 + (r * c) % 3) % 2 === 0][mascara];
  const bits = []; let subindo = true;
  for (let x = n - 1; x > 0; x -= 2) {
    if (x === 6) x = 5;
    for (let k = 0; k < n; k++) {
      const r = subindo ? n - 1 - k : k;
      for (const c of [x, x - 1]) if (!reservado(r, c)) bits.push(m[r][c] !== inverte(r, c) ? 1 : 0);
    }
    subindo = !subindo;
  }
  const bytes = []; for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8).join(''), 2));
  assert.ok(bytes.length >= 134, 'versão 5 tem 134 bytes');
  const dados = [0, 1].flatMap(b => Array.from({ length: 43 }, (_, i) => bytes[i * 2 + b]));
  const fluxo = dados.map(b => b.toString(2).padStart(8, '0')).join('');
  assert.equal(fluxo.slice(0, 4), '0100', 'modo byte');
  const tam = parseInt(fluxo.slice(4, 12), 2);
  return new TextDecoder().decode(Uint8Array.from({ length: tam }, (_, i) => parseInt(fluxo.slice(12 + i * 8, 20 + i * 8), 2)));
}

test('G-325 · o QR guardado lê exatamente o endereço que a tela compartilha', () => {
  const m = S.modulosDoQr();
  assert.equal(S.QR_DO_APP.endereco, S.ENDERECO_DO_APP);
  assert.equal(m.length, S.QR_DO_APP.lado); assert.ok(m.every(f => f.length === S.QR_DO_APP.lado));
  // três localizadores 7 × 7 (anel escuro, anel claro, miolo 3 × 3 escuro) e as linhas de sincronia alternadas
  const localizador = (r0, c0) => { for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) {
    const borda = r === 0 || r === 6 || c === 0 || c === 6, miolo = r >= 2 && r <= 4 && c >= 2 && c <= 4;
    assert.equal(m[r0 + r][c0 + c], borda || miolo, `localizador em ${r0},${c0}`); } };
  localizador(0, 0); localizador(0, 30); localizador(30, 0);
  for (let i = 8; i <= 28; i++) { assert.equal(m[6][i], i % 2 === 0, 'sincronia na fileira 6'); assert.equal(m[i][6], i % 2 === 0, 'sincronia na coluna 6'); }
  assert.equal(m[29][8], true, 'módulo escuro fixo da versão 5');
  assert.equal(leQrV5M(m, 6), S.ENDERECO_DO_APP);
});

test('G-325 · o desenho do QR tem a zona de silêncio e um retângulo por sequência escura', () => {
  const d = S.caminhoDoQr();
  const rets = [...d.matchAll(/M(\d+) (\d+)h(\d+)v1h-(\d+)z/g)];
  assert.equal(rets.map(x => x[0]).join(''), d, 'o caminho só tem retângulos de uma fileira');
  const escuros = S.modulosDoQr().flat().filter(Boolean).length;
  assert.equal(rets.reduce((t, x) => t + Number(x[3]), 0), escuros, 'cada módulo escuro desenhado uma vez');
  assert.ok(rets.every(x => Number(x[1]) >= 4 && Number(x[2]) >= 4 && Number(x[1]) + Number(x[3]) <= 41 && Number(x[2]) <= 40), 'quatro módulos de margem em volta');
});

test('G-325 · o passo a passo do aparelho vem primeiro', () => {
  assert.equal(S.aparelhoProvavel('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'), 'iphone');
  assert.equal(S.aparelhoProvavel('Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36'), 'android');
  assert.equal(S.aparelhoProvavel('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0 Safari/537.36'), 'outro');
  assert.deepEqual(JSON.parse(JSON.stringify(S.ordemDeInstalar('iphone'))), ['iphone', 'android']);
  assert.deepEqual(JSON.parse(JSON.stringify(S.ordemDeInstalar('android'))), ['android', 'iphone']);
  assert.deepEqual(JSON.parse(JSON.stringify(S.ordemDeInstalar('outro'))), ['android', 'iphone']);
  for (const q of ['android', 'iphone']) assert.ok(S.PASSOS_DE_INSTALAR[q].passos.length >= 3, q);
  assert.match(S.PASSOS_DE_INSTALAR.iphone.passos.join(' '), /Safari/);
  assert.match(S.PASSOS_DE_INSTALAR.iphone.passos.join(' '), /Adicionar à Tela de Início/);
  assert.match(S.PASSOS_DE_INSTALAR.android.passos.join(' '), /Instalar/);
  assert.ok(S.mensagemDoConvite().endsWith(S.ENDERECO_DO_APP), 'o convite termina no endereço, para virar link na conversa');
});

test('G-325 · a rota e a entrada no Perfil existem, e a tela não fala com nenhum serviço', () => {
  assert.match(FONTE, /path: '\/perfil\/convidar', title: 'Convidar amigos'/);
  assert.match(FONTE, /id: 'perfil-convidar', onClick: \(\) => go\('\/perfil\/convidar'\)/);
  const corpo = FONTE.slice(FONTE.indexOf('function createConvidarScreen'), FONTE.indexOf('return { DESTINOS, LINKS', FONTE.indexOf('function createConvidarScreen')));
  assert.doesNotMatch(corpo, /fetch\(|XMLHttpRequest|window\.open/, 'convidar só usa a folha do sistema e a área de transferência');
});

test('G-354 · o convite e o QR levam ao endereço da Vercel, onde o app é publicado', () => {
  assert.equal(S.ENDERECO_DO_APP, 'https://estante-magic.vercel.app/');
  assert.equal(S.QR_DO_APP.endereco, S.ENDERECO_DO_APP);
  assert.equal(leQrV5M(S.modulosDoQr(), 6), 'https://estante-magic.vercel.app/');
  assert.ok(S.mensagemDoConvite().endsWith('https://estante-magic.vercel.app/'));
  assert.doesNotMatch(FONTE.slice(FONTE.indexOf('const ENDERECO_DO_APP'), FONTE.indexOf('function modulosDoQr')), /github\.io/, 'o convite não manda mais para o endereço antigo');
});
