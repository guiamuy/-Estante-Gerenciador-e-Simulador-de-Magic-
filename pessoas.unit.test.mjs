// I-293 · BI2-3 Pessoas (D13): o fluxo conta contas, perfis e salas por dia e grava só totais no ramo telemetria.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generateKeyPairSync } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contagens, rodada, carimbosDasContas, doBanco, diaDe, DIA_MS, ESCOPOS, semSegredo } from './pessoas.mjs';
import { valida, aplicar, lerJsonl, privacidade } from './telemetria.mjs';

const RAIZ = dirname(fileURLToPath(import.meta.url));
const AGORA = Date.parse('2026-10-21T15:00:00Z');
const d = n => AGORA - n * DIA_MS;

test('I-293 · contagens: uma linha por dia (UTC), contas e salas acumuladas até o fim do dia e as novas do dia; perfis só no dia de hoje; contas null quando a API não respondeu (obs); carimbo inválido não conta; linhas passam no esquema e não carregam nada identificável', () => {
  const linhas = contagens({ contas: [d(40), d(2) + 10, AGORA - 1000, NaN], salas: [{ criadaEm: AGORA - 3000 }, { criadaEm: d(5) }, { criadaEm: 'x' }, null], perfis: 2, agora: AGORA, dias: 3 });
  assert.deepEqual(linhas.map(l => [l.dia, l.contas, l.contas_novas, l.salas_criadas, l.salas_total, l.perfis]), [['2026-10-19', 2, 1, 0, 1, undefined], ['2026-10-20', 2, 0, 0, 1, undefined], ['2026-10-21', 3, 1, 1, 2, 2]]);
  assert.ok(linhas.every(l => l.em === new Date(AGORA).toISOString()));
  assert.deepEqual(valida('pessoas', linhas), []);
  const sem = contagens({ contas: null, salas: [], agora: AGORA, dias: 2, obs: 'contas indisponíveis: HTTP 403' });
  assert.deepEqual(sem.map(l => [l.contas, l.contas_novas, l.salas_total, l.obs]), [[null, null, 0, 'contas indisponíveis: HTTP 403'], [null, null, 0, 'contas indisponíveis: HTTP 403']]);
  assert.deepEqual(valida('pessoas', sem), []);
  assert.equal(diaDe(Date.parse('2026-10-21T23:59:59Z')), '2026-10-21'); assert.equal(diaDe(Date.parse('2026-10-22T00:00:00Z')), '2026-10-22');
  for (const l of linhas) for (const k of Object.keys(l)) assert.ok(['dia', 'em', 'contas', 'contas_novas', 'perfis', 'salas_criadas', 'salas_total', 'obs'].includes(k), 'só totais: ' + k);
  assert.equal(privacidade(linhas), null);
});

test('I-293 · esquema `pessoas` e gravação por dia: lista ou um dia só; o mesmo dia é regravado no lugar; ordem por dia; dia fora da forma, chave desconhecida, uid ou e-mail recusam a lista inteira', () => {
  const a = aplicar('pessoas', '', [{ dia: '2026-10-20', salas_criadas: 0, salas_total: 1 }, { dia: '2026-10-21', salas_criadas: 1, salas_total: 2, contas: 3, contas_novas: 1 }], '2026-10-21T15:00:00Z');
  const b = aplicar('pessoas', a, { dia: '2026-10-21', salas_criadas: 2, salas_total: 3, contas: 4, contas_novas: 2, perfis: 1 }, '2026-10-22T01:00:00Z');
  const c = aplicar('pessoas', b, [{ dia: '2026-10-19', salas_criadas: 0, salas_total: 1 }], '2026-10-22T01:00:00Z');
  assert.deepEqual(lerJsonl(c).map(l => [l.dia, l.salas_total, l.contas, l.em]), [['2026-10-19', 1, undefined, '2026-10-22T01:00:00Z'], ['2026-10-20', 1, undefined, '2026-10-21T15:00:00Z'], ['2026-10-21', 3, 4, '2026-10-22T01:00:00Z']]);
  assert.ok(valida('pessoas', [{ dia: '21/10/2026', salas_criadas: 0, salas_total: 0 }]).length);
  assert.ok(valida('pessoas', [{ dia: '2026-10-21', salas_criadas: 0, salas_total: 0, uid: 'abc' }]).length, 'chave proibida');
  assert.ok(valida('pessoas', [{ dia: '2026-10-21', salas_criadas: 0, salas_total: 0, obs: 'x@y.com' }]).length, 'e-mail no obs');
  assert.ok(valida('pessoas', []).length, 'lista vazia');
  assert.ok(valida('pessoas', [{ dia: '2026-10-21', salas_criadas: -1, salas_total: 0 }]).length);
  assert.deepEqual(valida('pessoas', { dia: '2026-10-21', salas_criadas: 0, salas_total: 0, contas: null, contas_novas: null }), []);
});

test('I-293 · rodada com rede de mentira: token com os três escopos (banco + contas), contas em páginas (só os carimbos ficam), salas e perfis pelo cabeçalho Authorization (nunca na URL); contas indisponíveis (403) não derrubam a rodada: contas null e obs; banco indisponível derruba', async () => {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const conta = { type: 'service_account', project_id: 'estante-teste', client_email: 'robo@estante-teste.iam.gserviceaccount.com', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) };
  const pedidos = []; let auth403 = false, banco500 = false;
  const busca = async (url, init = {}) => {
    pedidos.push({ url, init });
    const ok = (json) => ({ ok: true, status: 200, json: async () => json });
    if (url.startsWith('https://oauth2.googleapis.com/token')) {
      const corpo = new URLSearchParams(init.body); const jwt = corpo.get('assertion').split('.')[1];
      const reivind = JSON.parse(Buffer.from(jwt.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
      assert.equal(reivind.scope, ESCOPOS); assert.ok(reivind.scope.includes('identitytoolkit') && reivind.scope.includes('firebase.database'));
      return ok({ access_token: 'tok-teste' });
    }
    assert.equal(init.headers && init.headers.Authorization, 'Bearer tok-teste', 'token no cabeçalho'); assert.doesNotMatch(url, /tok-teste|access_token/, 'nunca na URL');
    if (url.includes('identitytoolkit')) {
      if (auth403) return { ok: false, status: 403, json: async () => ({}) };
      if (!url.includes('nextPageToken')) return ok({ users: [{ localId: 'u1', email: 'a@b.c', createdAt: String(d(1)) }, { localId: 'u2', createdAt: String(d(30)) }], nextPageToken: 'p2' });
      return ok({ users: [{ localId: 'u3', createdAt: String(AGORA - 10) }] });
    }
    if (url.endsWith('/salas.json?shallow=false')) { if (banco500) return { ok: false, status: 500, json: async () => ({}) }; return ok({ 'ESTA-AAAA': { criadaEm: AGORA - 100, anfitriao: { uid: 'u1' } }, 'ESTA-BBBB': { criadaEm: d(1) + 5 } }); }
    if (url.endsWith('/perfis.json?shallow=true')) return ok({ u1: true, u3: true });
    throw new Error('pedido inesperado: ' + url);
  };
  const linhas = await rodada({ conta, banco: 'https://estante-teste-default-rtdb.firebaseio.com', busca, agora: AGORA, dias: 2 });
  assert.deepEqual(linhas.map(l => [l.dia, l.contas, l.contas_novas, l.salas_criadas, l.salas_total, l.perfis, l.obs]), [['2026-10-20', 2, 1, 1, 1, undefined, undefined], ['2026-10-21', 3, 1, 1, 2, 2, undefined]]);
  assert.equal(pedidos.filter(p => p.url.includes('identitytoolkit')).length, 2, 'duas páginas');
  assert.equal(JSON.stringify(linhas).includes('u1'), false); assert.equal(JSON.stringify(linhas).includes('a@b.c'), false); assert.equal(JSON.stringify(linhas).includes('ESTA-'), false);
  auth403 = true;
  const semContas = await rodada({ conta, banco: 'https://x.firebaseio.com', busca, agora: AGORA, dias: 1 });
  assert.deepEqual([semContas[0].contas, semContas[0].contas_novas, semContas[0].salas_total], [null, null, 2]); assert.match(semContas[0].obs, /contas indisponíveis: contas: HTTP 403/);
  assert.deepEqual(valida('pessoas', semContas), []);
  banco500 = true;
  await assert.rejects(() => rodada({ conta, banco: 'https://x.firebaseio.com', busca, agora: AGORA }), /salas: HTTP 500/);
  assert.deepEqual(await carimbosDasContas({ projeto: 'p', token: 't', busca: async () => ({ ok: true, json: async () => ({ users: [] }) }) }), []);
  assert.deepEqual(await doBanco({ banco: 'https://x', token: 't', busca: async (u) => ({ ok: true, json: async () => (u.includes('salas') ? null : null) }) }), { salas: [], perfis: 0 });
});

test('I-293 · o fluxo Pessoas: agendado + à mão, só escrita em conteúdo, ações fixadas por SHA, segredo só no passo que grava, token do git pelo cabeçalho (nunca na URL do remoto), sem npm, sem push no main; a fila dispara o fluxo a cada avanço, sem derrubar a rodada', () => {
  const yml = readFileSync(join(RAIZ, '.github/workflows/pessoas.yml'), 'utf8');
  assert.match(yml, /^on:\n  schedule:\n    - cron: '[^']+'\n  workflow_dispatch:/m, 'agendado e à mão, sem push');
  assert.match(yml, /^permissions:\n  contents: write/m); assert.doesNotMatch(yml, /issues: write|actions: write|statuses: write/);
  for (const u of yml.matchAll(/uses: ([^\s]+)/g)) assert.match(u[1], /@[0-9a-f]{40}/, 'ação fixada por SHA: ' + u[1]);
  assert.match(yml, /persist-credentials: false/);
  const passos = yml.split('\n      - ');
  const comSegredo = passos.filter(p => /secrets\.FIREBASE_SERVICE_ACCOUNT/.test(p));
  assert.equal(comSegredo.length, 1, 'o segredo entra num passo só'); assert.match(comSegredo[0], /node pessoas\.mjs --remoto "\$\{GITHUB_SERVER_URL\}\/\$\{GITHUB_REPOSITORY\}\.git" --pasta "\$RUNNER_TEMP\/telemetria"/);
  assert.match(comSegredo[0], /git config --global "http\.\$\{GITHUB_SERVER_URL\}\/\.extraheader"/);
  assert.doesNotMatch(yml, /npm (ci|install|run|test)|npx |--force|push -f|origin main/);
  const fila = readFileSync(join(RAIZ, '.github/workflows/fila.yml'), 'utf8');
  const avanca = (fila.match(/\n  avanca:\n([\s\S]*?)(?=\n  [a-z]+:\n|$)/) || [])[1] || '';
  const passo = avanca.split('\n      - ').find(p => /gh workflow run pessoas\.yml/.test(p));
  assert.ok(passo, 'a fila dispara pessoas.yml'); assert.match(passo, /if: steps\.avanca\.outputs\.publicado != ''/);
  assert.match(passo, /gh workflow run pessoas\.yml --repo "\$GITHUB_REPOSITORY" --ref main \|\| echo "::warning::/);
});

test('I-294 · anotação sem segredo: token do Google, JWT e credencial em URL viram [oculto]; o código HTTP e o nome da etapa ficam; no máximo 300 caracteres', () => {
  assert.equal(semSegredo('contas: HTTP 403'), 'contas: HTTP 403');
  assert.equal(semSegredo('erro ya29.a0AfH6SMB-xyz_123 na chamada'), 'erro [oculto] na chamada');
  assert.equal(semSegredo('jwt eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ4In0.assinatura'), 'jwt [oculto]');
  assert.equal(semSegredo('fatal: https://x-access-token:ghp_abc@github.com/a/b.git'), 'fatal: https[oculto]github.com/a/b.git');
  assert.equal(semSegredo('x'.repeat(500)).length, 300); assert.equal(semSegredo(null), '');
});
