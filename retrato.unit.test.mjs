// I-296 · S3 · retrato do GitHub gravado pelo CI (retrato.mjs + fluxo Retrato + tipo `retrato` da telemetria).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compactaRamos, compactaDetalhe, compactaExecucoes, compactaJobs, compactaFluxos, compactaCommits, tamanhoDaArvore, montaRetrato, mesmoRetrato, arquivosPorDia, rodada, semEmail, LIMITES, KIND } from './retrato.mjs';
import { valida, aplicar, gravar, privacidade, ARQUIVOS, RAMO } from './telemetria.mjs';

const RAIZ = dirname(fileURLToPath(import.meta.url));
const SHA = n => String(n).padStart(40, 'a');
const bruto = {
  ramos: [{ name: 'main', commit: { sha: SHA(1), url: 'x' }, protected: true }, { name: 'fila/R-28', commit: { sha: SHA(2) } }, { name: 'recusada/T-74', commit: { sha: SHA(3) } }, { name: 'sem-sha', commit: {} }],
  detalhe: { name: 'recusada/T-74', commit: { sha: SHA(3), commit: { message: 'recusada: CONFLITO ao pôr "Leva T-74" sobre o main\n\n- index.html\n\nTrilha: tipos\nCo-Authored-By: Claude <noreply@anthropic.com>\nClaude-Session: https://x', committer: { date: '2026-10-22T01:00:00Z', email: 'a@b.co' }, author: { date: '2026-10-21T23:00:00Z', name: 'Gui', email: 'gui@x.com' } }, author: { login: 'guiamuy' } } },
  rodadas: { total_count: 2, workflow_runs: [{ id: 9, name: 'Fila de publicação', workflow_id: 5, status: 'in_progress', conclusion: null, event: 'workflow_dispatch', run_attempt: 1, created_at: '2026-10-22T01:00:00Z', run_started_at: '2026-10-22T01:00:10Z', updated_at: '2026-10-22T01:05:00Z', display_title: 'Fila de publicação', html_url: 'https://github.com/x/y/actions/runs/9', actor: { login: 'guiamuy', email: 'gui@x.com' } }, { id: 8, name: 'Fila de publicação', workflow_id: 5, status: 'completed', conclusion: 'success', created_at: '2026-10-21T20:00:00Z', run_started_at: '2026-10-21T20:00:05Z', updated_at: '2026-10-21T20:40:00Z', display_title: 'Fila de publicação', html_url: 'https://github.com/x/y/actions/runs/8' }] },
  jobs: { total_count: 2, jobs: [{ id: 91, name: 'monta', status: 'completed', conclusion: 'success', started_at: '2026-10-22T01:00:20Z', completed_at: '2026-10-22T01:01:00Z', steps: [{ name: 'x' }], runner_name: 'r' }, { id: 92, name: 'portao', status: 'in_progress', conclusion: null, started_at: '2026-10-22T01:01:10Z', completed_at: null }] },
  execucoes: { workflow_runs: [{ id: 70, name: 'pages build and deployment', workflow_id: 2, status: 'completed', conclusion: 'success', event: 'dynamic', run_started_at: '2026-10-21T20:41:00Z', updated_at: '2026-10-21T20:42:00Z', html_url: 'https://github.com/x/y/actions/runs/70' }] },
  fluxos: { total_count: 1, workflows: [{ id: 5, node_id: 'n', name: 'Fila de publicação', path: '.github/workflows/fila.yml', state: 'active', badge_url: 'b' }] },
  commits: pagina => pagina === 1 ? Array.from({ length: 100 }, (_, i) => ({ sha: SHA(100 + i), commit: { message: `Leva M-${600 - i} · carta ${i}\n\nTrilha: motor\nCo-Authored-By: Claude <noreply@anthropic.com>`, committer: { date: `2026-10-2${i % 2}T10:00:00Z`, email: 'c@d.co' }, author: { date: '2026-10-20T09:00:00Z', email: 'gui@x.com' } }, author: { login: 'guiamuy' } })) : [{ sha: SHA(300), commit: { message: 'ajuste sem leva', committer: { date: '2026-10-01T10:00:00Z' }, author: { date: '2026-10-01T09:00:00Z' } } }],
  arvore: sha => ({ sha, tree: [{ path: 'README.md', type: 'blob', size: 10 }, { path: 'index.html', type: 'blob', size: 3900000 + Number(sha.replace(/a/g, '').slice(-3) || 0) }, { path: '.github', type: 'tree' }] })
};

test('I-296 · compactação: cada resposta fica só com o que o painel lê, na forma da API; e-mail nunca passa (committer, author, actor, rodapés); a mensagem do commit do main é a primeira linha; o detalhe do ramo guarda o corpo (motivo da recusa) sem os rodapés; a árvore devolve o tamanho do index.html', () => {
  assert.deepEqual(compactaRamos(bruto.ramos), [{ name: 'main', commit: { sha: SHA(1) } }, { name: 'fila/R-28', commit: { sha: SHA(2) } }, { name: 'recusada/T-74', commit: { sha: SHA(3) } }]);
  const d = compactaDetalhe(bruto.detalhe);
  assert.deepEqual(d, { name: 'recusada/T-74', commit: { sha: SHA(3), commit: { message: 'recusada: CONFLITO ao pôr "Leva T-74" sobre o main\n\n- index.html', committer: { date: '2026-10-22T01:00:00Z' }, author: { date: '2026-10-21T23:00:00Z' } } } });
  const r = compactaExecucoes(bruto.rodadas);
  assert.deepEqual(Object.keys(r.workflow_runs[0]).sort(), ['conclusion', 'created_at', 'display_title', 'event', 'html_url', 'id', 'name', 'run_attempt', 'run_started_at', 'status', 'updated_at', 'workflow_id']);
  assert.equal(r.workflow_runs[0].status, 'in_progress'); assert.equal(r.workflow_runs[1].conclusion, 'success');
  assert.deepEqual(compactaJobs(bruto.jobs), { jobs: [{ id: 91, name: 'monta', status: 'completed', conclusion: 'success', started_at: '2026-10-22T01:00:20Z', completed_at: '2026-10-22T01:01:00Z' }, { id: 92, name: 'portao', status: 'in_progress', conclusion: null, started_at: '2026-10-22T01:01:10Z', completed_at: null }] });
  assert.deepEqual(compactaFluxos(bruto.fluxos), { workflows: [{ id: 5, name: 'Fila de publicação', path: '.github/workflows/fila.yml', state: 'active' }] });
  const cs = compactaCommits(bruto.commits(1));
  assert.equal(cs.length, 100); assert.deepEqual(cs[0], { sha: SHA(100), commit: { message: 'Leva M-600 · carta 0', committer: { date: '2026-10-20T10:00:00Z' }, author: { date: '2026-10-20T09:00:00Z' } } });
  assert.equal(tamanhoDaArvore(bruto.arvore(SHA(100))), 3900100); assert.equal(tamanhoDaArvore({ tree: [{ path: 'a', type: 'blob', size: 1 }] }), null); assert.equal(tamanhoDaArvore(null), null);
  assert.equal(semEmail('Leva de gui@x.com e outro <a.b@c.org>'), 'Leva de [e-mail] e outro <[e-mail]>');
  for (const x of [d, r, compactaJobs(bruto.jobs), cs]) assert.equal(privacidade(x), null, 'nada identificável sobra');
  // data inválida vira null, não derruba
  assert.equal(compactaExecucoes({ workflow_runs: [{ id: 1, run_started_at: 'ontem' }] }).workflow_runs[0].run_started_at, null);
});

test('I-296 · montaRetrato: respostas pelo nome que o painel usa (ramos, rodadas, pages, fluxos, commits, tamanhos, ramo.<sha>, jobs.<id>); passa no esquema `retrato` da telemetria; sha ou tamanho fora da forma não entra; mesmoRetrato ignora carimbo, id e pedidos; o tipo `retrato` regrava o arquivo inteiro', () => {
  const ramos = compactaRamos(bruto.ramos), detalhes = { [SHA(3)]: compactaDetalhe(bruto.detalhe), zz: { x: 1 } };
  const r = montaRetrato({ id: 123, agora: '2026-10-22T01:10:00Z', ramos, detalhes, rodadas: compactaExecucoes(bruto.rodadas), jobs: { id: 9, ...compactaJobs(bruto.jobs) }, execucoes: compactaExecucoes(bruto.execucoes), fluxos: compactaFluxos(bruto.fluxos), commits: compactaCommits(bruto.commits(1)), tamanhos: { [SHA(100)]: 3900100, [SHA(101)]: 0, abc: 5, [SHA(102)]: 'x' }, pedidos: 7, avisos: ['um aviso com gui@x.com'] });
  assert.equal(r.kind, KIND); assert.equal(r.version, 1); assert.equal(r.id, '123'); assert.equal(r.pedidos, 7);
  assert.deepEqual(Object.keys(r.respostas).sort(), ['commits', 'fluxos', 'jobs.9', 'pages', 'ramo.' + SHA(3), 'ramos', 'rodadas', 'tamanhos'].sort());
  assert.deepEqual(r.respostas.tamanhos, { [SHA(100)]: 3900100 });
  assert.deepEqual(r.cobertura, { commits: 100, commitsDesde: '2026-10-20T10:00:00Z', ramos: 3, rodadas: 2, dias: [] });
  assert.deepEqual(montaRetrato({ dias: ['2026-10-22', 'x', '2026-10-21', '2026-10-22'] }).cobertura.dias, ['2026-10-21', '2026-10-22']);
  assert.deepEqual(r.avisos, ['um aviso com [e-mail]']);
  assert.deepEqual(valida('retrato', r), []);
  assert.deepEqual(valida('retrato', { ...r, respostas: { ...r.respostas, 'ramo.curto': {} } }), ['respostas fora da forma']);
  assert.deepEqual(valida('retrato', { ...r, kind: 'outro' }), ['kind fora da forma']);
  assert.ok(valida('retrato', { ...r, respostas: { ...r.respostas, commits: [{ sha: 'x', commit: { message: 'gui@x.com' } }] } }).some(e => /e-mail/.test(e)), 'e-mail recusa');
  const r2 = montaRetrato({ ...{ id: 124, agora: '2026-10-22T01:40:00Z', ramos, detalhes, rodadas: compactaExecucoes(bruto.rodadas), jobs: { id: 9, ...compactaJobs(bruto.jobs) }, execucoes: compactaExecucoes(bruto.execucoes), fluxos: compactaFluxos(bruto.fluxos), commits: compactaCommits(bruto.commits(1)), tamanhos: { [SHA(100)]: 3900100 }, pedidos: 2, avisos: ['um aviso com gui@x.com'] } });
  assert.equal(mesmoRetrato(r, r2), true); assert.equal(mesmoRetrato(r, { ...r2, respostas: { ...r2.respostas, ramos: [] } }), false); assert.equal(mesmoRetrato(null, r2), false);
  const txt = aplicar('retrato', '{"kind":"velho"}\n', r);
  assert.deepEqual(JSON.parse(txt), r); assert.equal(txt.split('\n').length, 2, 'uma linha e quebra final');
});

test('I-296 · rodada com rede de mentira: token só no cabeçalho (nunca na URL); lê ramos, detalhe só de fila/recusada, rodadas, jobs da rodada em curso, execuções, fluxos, commits em páginas (até a página curta) e a árvore de cada leva; o retrato anterior poupa pedidos (detalhe e tamanho já lidos); detalhe que falha vira aviso; limite de tamanhos por rodada', async () => {
  const chamadas = [];
  const busca = async (url, opts) => {
    chamadas.push(url);
    assert.equal(opts.headers.Authorization, 'Bearer ghp_TESTE'); assert.doesNotMatch(url, /ghp_|@/);
    const u = new URL(url); const p = u.pathname.replace('/repos/guiamuy/estante', ''), q = u.searchParams;
    const json = x => ({ ok: true, status: 200, json: async () => x });
    if (p === '/branches') return json(bruto.ramos);
    if (p === '/branches/recusada%2FT-74') return json(bruto.detalhe);
    if (p === '/branches/fila%2FR-28') return { ok: false, status: 500, json: async () => ({}) };
    if (p === '/actions/workflows/fila.yml/runs') return json(bruto.rodadas);
    if (p === '/actions/runs/9/jobs') return json(bruto.jobs);
    if (p === '/actions/runs') return json(bruto.execucoes);
    if (p === '/actions/workflows') return json(bruto.fluxos);
    if (p === '/commits') { assert.equal(q.get('sha'), 'main'); assert.ok(q.get('since')); return json(bruto.commits(Number(q.get('page')))); }
    if (p.startsWith('/git/trees/')) return json(bruto.arvore(p.slice('/git/trees/'.length)));
    throw new Error('pedido inesperado: ' + url);
  };
  const { retrato: r, extras } = await rodada({ repo: 'guiamuy/estante', token: 'ghp_TESTE', busca, agora: Date.parse('2026-10-22T01:10:00Z'), id: 55, limites: { ...LIMITES, tamanhosPorRodada: 10 } });
  assert.equal(r.id, '55'); assert.equal(r.em, '2026-10-22T01:10:00.000Z');
  assert.equal(r.respostas.ramos.length, 3); assert.ok(r.respostas['ramo.' + SHA(3)]); assert.ok(!r.respostas['ramo.' + SHA(1)], 'main não tem detalhe');
  assert.deepEqual(r.respostas['jobs.9'].jobs.map(j => j.name), ['monta', 'portao']);
  assert.equal(r.respostas.commits.length, 100, 'duas páginas lidas (100 + 1), o retrato guarda os 100 do `main`'); assert.equal(r.respostas.pages.workflow_runs[0].name, 'pages build and deployment');
  assert.deepEqual(Object.keys(extras).sort(), ['commits/2026-10-20.json', 'commits/2026-10-21.json', 'commits/2026-10-22.json'], 'hoje, ontem e o dia antigo inteiro (o 1/10 é o primeiro da lista: pode estar cortado)');
  assert.equal(JSON.parse(extras['commits/2026-10-21.json']).commits.length, 50); assert.deepEqual(JSON.parse(extras['commits/2026-10-22.json']).commits, []); assert.deepEqual(r.cobertura.dias, ['2026-10-20', '2026-10-21', '2026-10-22']);
  assert.equal(Object.keys(r.respostas.tamanhos).length, 10, 'limite por rodada'); assert.ok(r.avisos.some(a => /tamanhos/.test(a)) && r.avisos.some(a => /fila\/R-28: \/branches\/fila%2FR-28: HTTP 500/.test(a)));
  assert.equal(r.pedidos, chamadas.length); assert.equal(chamadas.filter(u => /git\/trees/.test(u)).length, 10);
  assert.deepEqual(valida('retrato', r), []);
  // segunda rodada com o retrato anterior: detalhe e tamanhos reaproveitados, só os 10 tamanhos seguintes são lidos
  chamadas.length = 0;
  const { retrato: r2, extras: e2 } = await rodada({ repo: 'guiamuy/estante', token: 'ghp_TESTE', busca, anterior: r, diasGravados: r.cobertura.dias, agora: Date.parse('2026-10-22T01:40:00Z'), limites: { ...LIMITES, tamanhosPorRodada: 10 } });
  assert.deepEqual(Object.keys(e2).sort(), ['commits/2026-10-21.json', 'commits/2026-10-22.json'], 'dia antigo já gravado não é regravado');
  assert.equal(chamadas.filter(u => /branches\//.test(u)).length, 1, 'só o ramo que falhou é lido de novo');
  assert.equal(Object.keys(r2.respostas.tamanhos).length, 20); assert.equal(chamadas.filter(u => /git\/trees/.test(u)).length, 10);
  assert.equal(privacidade(r2), null);
});

test('I-296 · arquivosPorDia (puro): hoje e ontem sempre (mesmo vazios); dia antigo só se ainda não gravado e inteiro na lista (o primeiro dia pode estar cortado pelo teto); `dias` junta os já gravados com os novos', () => {
  const c = (sha, data) => ({ sha, commit: { message: 'Leva X-1', committer: { date: data }, author: { date: data } } });
  const commits = [c(SHA(1), '2026-10-22T03:00:00Z'), c(SHA(2), '2026-10-21T23:30:00Z'), c(SHA(3), '2026-10-19T10:00:00Z'), c(SHA(4), '2026-10-18T10:00:00Z')];
  const r = arquivosPorDia({ commits, agora: Date.parse('2026-10-22T04:00:00Z'), diasGravados: ['2026-10-10'], em: '2026-10-22T04:00:00Z' });
  assert.deepEqual(Object.keys(r.arquivos).sort(), ['commits/2026-10-19.json', 'commits/2026-10-21.json', 'commits/2026-10-22.json'], '18/10 é o primeiro da lista: cortado; 19/10 inteiro');
  assert.deepEqual(JSON.parse(r.arquivos['commits/2026-10-22.json']), { dia: '2026-10-22', em: '2026-10-22T04:00:00Z', commits: [commits[0]] });
  assert.deepEqual(r.dias, ['2026-10-10', '2026-10-19', '2026-10-21', '2026-10-22']);
  const r2 = arquivosPorDia({ commits, agora: Date.parse('2026-10-22T04:00:00Z'), diasGravados: ['2026-10-19'] });
  assert.deepEqual(Object.keys(r2.arquivos).sort(), ['commits/2026-10-21.json', 'commits/2026-10-22.json']);
  assert.deepEqual(arquivosPorDia({ commits: [], agora: Date.parse('2026-10-22T04:00:00Z') }).dias, ['2026-10-21', '2026-10-22'], 'sem commit nenhum, hoje e ontem vazios');
});

const remotoLocal = () => { const base = mkdtempSync(join(tmpdir(), 'retrato-')); const bare = join(base, 'remoto.git'); execFileSync('git', ['init', '-q', '--bare', '-b', 'main', bare]); return { base, bare }; };
test('I-296 · gravar(retrato) de ponta a ponta num remoto local: cria o ramo, o arquivo é retrato.json com o JSON inteiro, e a gravação seguinte substitui (não acrescenta)', { timeout: 60000 }, t => {
  const { base, bare } = remotoLocal(); t.after(() => rmSync(base, { recursive: true, force: true }));
  const pasta = join(base, 'pasta');
  const r1 = montaRetrato({ agora: '2026-10-22T01:10:00Z', ramos: compactaRamos(bruto.ramos), commits: compactaCommits(bruto.commits(2)) });
  const g = gravar({ tipo: 'retrato', registro: r1, remoto: bare, pasta, agora: () => '2026-10-22T01:10:00Z', extras: { 'commits/2026-10-01.json': JSON.stringify({ dia: '2026-10-01', commits: compactaCommits(bruto.commits(2)) }) + '\n' } });
  assert.equal(g.arquivo, 'retrato.json'); assert.equal(ARQUIVOS.retrato, 'retrato.json'); assert.equal(g.enviado, true);
  const le = () => JSON.parse(execFileSync('git', ['-C', bare, 'show', `${RAMO}:retrato.json`], { encoding: 'utf8' }));
  assert.deepEqual(le(), r1);
  assert.equal(JSON.parse(execFileSync('git', ['-C', bare, 'show', `${RAMO}:commits/2026-10-01.json`], { encoding: 'utf8' })).commits.length, 1, 'o arquivo do dia foi no mesmo commit');
  assert.throws(() => gravar({ tipo: 'retrato', registro: r1, remoto: bare, pasta, extras: { 'commits/x.json': '{"a":"gui@x.com"}' } }), /parece e-mail/);
  assert.throws(() => gravar({ tipo: 'retrato', registro: r1, remoto: bare, pasta, extras: { '../fora.json': '{}' } }), /fora da forma/);
  const r2 = montaRetrato({ agora: '2026-10-22T01:40:00Z', ramos: [], commits: [] });
  gravar({ tipo: 'retrato', registro: r2, remoto: bare, pasta, agora: () => '2026-10-22T01:40:00Z' });
  assert.deepEqual(le(), r2);
  assert.match(execFileSync('git', ['-C', bare, 'log', '-1', '--format=%s', RAMO], { encoding: 'utf8' }), /^telemetria · retrato: 0 ramos · 0 rodadas · 0 commits/);
});

test('I-296 · o fluxo Retrato: dispara em push só de fila/* e recusada/*, ramo apagado, começo e fim da rodada da fila, a cada 30 min e à mão; contents write + actions read, nada mais; ações fixadas por SHA; token do git pelo cabeçalho (nunca na URL); sem npm, sem push no main; rajada cancela a corrida anterior', () => {
  const yml = readFileSync(join(RAIZ, '.github/workflows/retrato.yml'), 'utf8');
  assert.match(yml, /^on:\n  push:\n    branches:\n      - 'fila\/\*\*'\n      - 'recusada\/\*\*'\n  delete:\n  workflow_run:\n    workflows: \['Fila de publicação'\]\n    types: \[requested, completed\]\n  schedule:\n    - cron: '[^']+'\n  workflow_dispatch:/m);
  assert.match(yml, /^permissions:\n  contents: write[^\n]*\n  actions: read/m); assert.doesNotMatch(yml, /issues: write|actions: write|statuses: write|pull-requests/);
  for (const u of yml.matchAll(/uses: ([^\s]+)/g)) assert.match(u[1], /@[0-9a-f]{40}/, 'ação fixada por SHA: ' + u[1]);
  assert.match(yml, /persist-credentials: false/); assert.match(yml, /cancel-in-progress: true/);
  assert.match(yml, /git config --global "http\.\$\{GITHUB_SERVER_URL\}\/\.extraheader"/);
  assert.match(yml, /node retrato\.mjs --remoto "\$\{GITHUB_SERVER_URL\}\/\$\{GITHUB_REPOSITORY\}\.git" --pasta "\$RUNNER_TEMP\/telemetria"/);
  assert.doesNotMatch(yml, /npm (ci|install|run|test)|npx |--force|push -f|origin main|secrets\./);
  assert.match(readFileSync(join(RAIZ, '.github/workflows/fila.yml'), 'utf8'), /^name: Fila de publicação$/m, 'o nome que o workflow_run escuta');
});
