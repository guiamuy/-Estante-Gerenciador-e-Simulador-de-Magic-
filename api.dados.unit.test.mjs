// I-324 · /dados/ na Vercel: a função lê só os ramos de dados do app, com cache, e o app aponta para ela fora do github.io.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { GET, RAMOS, REPO, alvo } from './api/dados.js';

const pede = (caminho) => GET(new Request('https://estante-magic.vercel.app/api/dados?caminho=' + encodeURIComponent(caminho)));
async function comFetch(falso, fn) {
  const antes = globalThis.fetch; globalThis.fetch = falso;
  try { return await fn(); } finally { globalThis.fetch = antes; }
}

test('I-324 · só os ramos do app passam; telemetria, caminho com .. e arquivo escondido não', () => {
  assert.deepEqual(alvo('catalogo/listas/x-1.json'), { ramo: 'catalogo', arquivo: 'listas/x-1.json' });
  assert.deepEqual(alvo('artes/artes.bin'), { ramo: 'artes', arquivo: 'artes.bin' });
  for (const ruim of ['telemetria/pessoas.json', 'main/index.html', 'catalogo', 'catalogo/', 'catalogo/../main/x', 'catalogo/a/../../x', 'artes/.env', 'relatos/a b.json', '', 'constructor/x', '__proto__/x']) {
    assert.equal(alvo(ruim), null, ruim);
  }
  assert.deepEqual(Object.keys(RAMOS).sort(), ['artes', 'catalogo', 'noticias', 'relatos']);
});

test('I-324 · lê o arquivo do ramo no GitHub, devolve com o tipo certo e cache na Vercel; token só quando existe', async () => {
  const pedidos = [];
  const falso = async (url, opc) => { pedidos.push({ url, opc }); return new Response('{"ok":1}', { status: 200 }); };
  delete process.env.GITHUB_DADOS_TOKEN;
  let r = await comFetch(falso, () => pede('catalogo/listas/x.json'));
  assert.equal(r.status, 200);
  assert.equal(await r.text(), '{"ok":1}');
  assert.equal(pedidos[0].url, `https://raw.githubusercontent.com/${REPO}/catalogo/listas/x.json`);
  assert.deepEqual(pedidos[0].opc.headers, {});
  assert.match(r.headers.get('content-type'), /^application\/json/);
  assert.match(r.headers.get('cache-control'), /s-maxage=1800/);
  assert.match(r.headers.get('cache-control'), /max-age=0/, 'o navegador sempre pergunta; quem guarda é a Vercel e o app');
  process.env.GITHUB_DADOS_TOKEN = 'segredo-de-teste';
  try {
    r = await comFetch(falso, () => pede('artes/artes.bin'));
    assert.equal(pedidos[1].opc.headers.authorization, 'Bearer segredo-de-teste');
    assert.equal(r.headers.get('content-type'), 'application/octet-stream');
  } finally { delete process.env.GITHUB_DADOS_TOKEN; }
});

test('I-324 · não achou é 404 (com cache curto); GitHub com problema é 502 sem cache; fora da lista nem pergunta ao GitHub', async () => {
  let n = 0;
  const r404 = await comFetch(async () => { n++; return new Response('', { status: 404 }); }, () => pede('noticias/nada.json'));
  assert.equal(r404.status, 404); assert.match(r404.headers.get('cache-control'), /s-maxage=60/);
  const r500 = await comFetch(async () => { n++; return new Response('', { status: 500 }); }, () => pede('noticias/indice.json'));
  assert.equal(r500.status, 502); assert.equal(r500.headers.get('cache-control'), 'no-store');
  const caiu = await comFetch(async () => { n++; throw new TypeError('rede'); }, () => pede('relatos/fila.json'));
  assert.equal(caiu.status, 502);
  const fora = await comFetch(async () => { n++; return new Response('x'); }, () => pede('telemetria/pessoas.json'));
  assert.equal(fora.status, 404); assert.equal(n, 3);
});

test('I-324 · o app lê os dados em /dados/ na Vercel e no raw do GitHub no github.io, no clone e nos testes', () => {
  const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
  const linha = html.slice(html.indexOf('const baseDosDados ='), html.indexOf("+ ramo + '/';") + "+ ramo + '/';".length);
  const base = (href) => vm.runInNewContext(linha + '\nbaseDosDados("catalogo")', href ? { location: new URL(href) } : {});
  const RAW = `https://raw.githubusercontent.com/${REPO}/catalogo/`;
  assert.equal(base('https://estante-magic.vercel.app/'), 'https://estante-magic.vercel.app/dados/catalogo/');
  assert.equal(base('https://estante-magic-previa.vercel.app/#/listas'), 'https://estante-magic-previa.vercel.app/dados/catalogo/');
  assert.equal(base('https://estante.com.br/'), 'https://estante.com.br/dados/catalogo/', 'domínio próprio também');
  assert.equal(base('https://guiamuy.github.io/-Estante-Gerenciador-e-Simulador-de-Magic-/'), RAW);
  assert.equal(base('http://localhost:5173/index.html'), RAW);
  assert.equal(base(null), RAW);
  // nenhum dado dos robôs é lido do raw por fora do baseDosDados
  const app = html.slice(html.indexOf('<script>'));
  const rawDeDados = [...app.matchAll(/raw\.githubusercontent\.com\/[^'"`\s]*\/(noticias|catalogo|artes|relatos)\//g)];
  assert.deepEqual(rawDeDados.map((m) => m[0]), [], 'leitura de dados fora do baseDosDados');
});
