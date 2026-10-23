// I-298 · S4: as regras do banco do main vão para o Firebase pelo CI, só quando mudaram, com guarda antes de enviar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generateKeyPairSync } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonico, impressao, problemas, precisaPublicar, rodada, LIMITE_BYTES } from './regras-banco.mjs';

const RAIZ = dirname(fileURLToPath(import.meta.url));
const REGRAS = readFileSync(join(RAIZ, 'database.rules.json'), 'utf8');
const BANCO = 'https://teste-default-rtdb.firebaseio.com';
const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
const CONTA = { type: 'service_account', client_email: 'robo@teste.iam.gserviceaccount.com', private_key: privateKey, project_id: 'teste' };
const TOKEN = 'ya29.tokenDeMentira';

/** Rede de mentira: token do Google, GET/PUT das regras; guarda cada pedido para conferir. */
function rede({ publicadas, put = 200, getFalha = 0 }) {
  let atual = publicadas; const pedidos = [];
  const busca = async (url, opt = {}) => {
    pedidos.push({ url, metodo: opt.method || 'GET', cabecalhos: opt.headers || {}, corpo: opt.body });
    if (url.startsWith('https://oauth2.googleapis.com/token')) return { ok: true, status: 200, json: async () => ({ access_token: TOKEN }) };
    if (url === BANCO + '/.settings/rules.json') {
      if ((opt.method || 'GET') === 'GET') return getFalha ? { ok: false, status: getFalha, text: async () => '' } : { ok: true, status: 200, text: async () => atual };
      if (opt.method === 'PUT') { if (put !== 200) return { ok: false, status: put, json: async () => ({ error: 'Permission denied' }) }; atual = opt.body; return { ok: true, status: 200, json: async () => ({ status: 'ok' }) }; }
    }
    throw new Error('pedido inesperado: ' + url);
  };
  return { busca, pedidos, get atual() { return atual; } };
}

test('I-298 · guarda antes de enviar: as regras do main passam; JSON quebrado, sem "rules", raiz aberta, chave a mais na raiz e tamanho acima do limite são recusados', () => {
  assert.deepEqual(problemas(REGRAS), [], 'o database.rules.json do main pode ser publicado');
  assert.deepEqual(problemas('{ "rules": '), ['não é JSON válido']);
  assert.deepEqual(problemas('{"regras": {}}'), ['sem o objeto "rules"']);
  assert.deepEqual(problemas('{"rules": {".read": true, ".write": false}}'), ['a raiz precisa de ".read": false (o banco inteiro ficaria aberto)']);
  assert.deepEqual(problemas('{"rules": {".read": false}}'), ['a raiz precisa de ".write": false (o banco inteiro ficaria aberto)']);
  assert.deepEqual(problemas('{"rules": {".read": false, ".write": false}, "x": 1}'), ['chaves além de "rules" na raiz']);
  const grande = JSON.stringify({ rules: { '.read': false, '.write': false, x: { '.validate': 'a'.repeat(LIMITE_BYTES) } } });
  assert.ok(problemas(grande).some(p => /maior que/.test(p)));
});

test('I-298 · comparação pelo texto canônico: espaços e quebras de linha não contam; uma regra diferente conta; o que não é JSON sempre publica', () => {
  const compacto = JSON.stringify(JSON.parse(REGRAS));
  assert.equal(canonico(REGRAS), compacto);
  assert.equal(precisaPublicar(REGRAS, compacto), false);
  assert.equal(precisaPublicar(REGRAS, compacto.replace('"auth != null', '"true || auth != null')), true);
  assert.equal(precisaPublicar(REGRAS, '// comentário do console\n' + REGRAS), true);
  assert.equal(impressao(REGRAS), impressao(compacto)); assert.match(impressao(REGRAS), /^[0-9a-f]{12}$/);
});

test('I-298 · rodada com rede de mentira: iguais não envia nada; diferentes envia por PUT e confere lendo de novo; o token vai só no cabeçalho, nunca na URL; "conferir" só compara; erro do banco derruba sem expor o token', async () => {
  const iguais = rede({ publicadas: JSON.stringify(JSON.parse(REGRAS)) });
  const r1 = await rodada({ conta: CONTA, banco: BANCO, regras: REGRAS, busca: iguais.busca });
  assert.equal(r1.mudou, false); assert.ok(!iguais.pedidos.some(p => p.metodo === 'PUT'), 'nada enviado');

  const velhas = '{"rules": {".read": false, ".write": false}}';
  const dif = rede({ publicadas: velhas });
  const r2 = await rodada({ conta: CONTA, banco: BANCO, regras: REGRAS, busca: dif.busca });
  assert.equal(r2.mudou, true); assert.equal(dif.atual, REGRAS);
  assert.deepEqual(dif.pedidos.filter(p => p.url.startsWith(BANCO)).map(p => p.metodo), ['GET', 'PUT', 'GET'], 'lê, envia, confere');
  for (const p of dif.pedidos.filter(p => p.url.startsWith(BANCO))) {
    assert.equal(p.cabecalhos.Authorization, 'Bearer ' + TOKEN); assert.ok(!p.url.includes(TOKEN) && !p.url.includes('access_token'), 'token fora da URL');
  }
  assert.equal(r2.depois, r2.local);

  const so = rede({ publicadas: velhas });
  const r3 = await rodada({ conta: CONTA, banco: BANCO, regras: REGRAS, conferir: true, busca: so.busca });
  assert.equal(r3.diferente, true); assert.equal(r3.mudou, false); assert.ok(!so.pedidos.some(p => p.metodo === 'PUT'));

  const negado = rede({ publicadas: velhas, put: 401 });
  await assert.rejects(rodada({ conta: CONTA, banco: BANCO, regras: REGRAS, busca: negado.busca }), e => /HTTP 401 · Permission denied/.test(e.message) && !e.message.includes(TOKEN));
  await assert.rejects(rodada({ conta: CONTA, banco: BANCO, regras: REGRAS, busca: rede({ publicadas: velhas, getFalha: 403 }).busca }), /ler as regras publicadas: HTTP 403/);
  const aberta = rede({ publicadas: velhas });
  await assert.rejects(rodada({ conta: CONTA, banco: BANCO, regras: '{"rules": {".read": true, ".write": true}}', busca: aberta.busca }), /recusadas/);
  assert.equal(aberta.pedidos.length, 0, 'regra recusada não chega a pedir token');
});

test('I-298 · o fluxo Regras do banco: só leitura do repositório, ações fixadas por SHA, segredo num passo só, sem npm e sem push; a fila dispara o fluxo a cada avanço, sem derrubar a rodada', () => {
  const yml = readFileSync(join(RAIZ, '.github/workflows/regras-banco.yml'), 'utf8');
  assert.match(yml, /^on:\n  schedule:\n    - cron: '[^']+'\n  workflow_dispatch:/m, 'agendado e à mão, sem push nem pull_request');
  assert.match(yml, /^permissions:\n  contents: read\s*$/m); assert.doesNotMatch(yml, /: write/);
  for (const u of yml.matchAll(/uses: ([^\s]+)/g)) assert.match(u[1], /@[0-9a-f]{40}$/, 'ação fixada por SHA: ' + u[1]);
  assert.match(yml, /persist-credentials: false/);
  const passos = yml.split('\n      - ');
  const comSegredo = passos.filter(p => /secrets\.FIREBASE_SERVICE_ACCOUNT/.test(p));
  assert.equal(comSegredo.length, 1, 'o segredo entra num passo só'); assert.match(comSegredo[0], /run: node regras-banco\.mjs \$CONFERIR$/m);
  assert.doesNotMatch(yml, /npm (ci|install|run|test)|npx |git push|--force/);
  const fila = readFileSync(join(RAIZ, '.github/workflows/fila.yml'), 'utf8');
  const avanca = (fila.match(/\n  avanca:\n([\s\S]*?)(?=\n  [a-z]+:\n|$)/) || [])[1] || '';
  const passo = avanca.split('\n      - ').find(p => /gh workflow run regras-banco\.yml/.test(p));
  assert.ok(passo, 'a fila dispara regras-banco.yml'); assert.match(passo, /if: steps\.avanca\.outputs\.publicado != ''/);
  assert.match(passo, /gh workflow run regras-banco\.yml --repo "\$GITHUB_REPOSITORY" --ref main \|\| echo "::warning::/);
});
