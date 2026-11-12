// I-331 · trem de produção: a Vercel (Hobby, 100 deployments por 24 h com as prévias) nunca mais barra a publicação.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { orcamento, ordemDoTrem, nomeDoTrem, vercelMonta, corpoDoTrem, levasDoCorpo, DIA_MS, LIMITE_VERCEL, RESERVA, CUSTO_DO_TREM } from './trem.mjs';
import { juntarEstado, juntarRodapes, caberNoTeto, TETO_ESTADO } from './estado-merge.mjs';

const ler = (f) => readFileSync(new URL(`./${f}`, import.meta.url), 'utf8');
const H = 3600000;

test('I-331 · ramo de leva não monta prévia; main e trem montam (vercel.json)', () => {
  const v = JSON.parse(ler('vercel.json'));
  for (const r of ['claude/G-378', 'claude/M-620', 'fila/G-1', 'recusada/B-186', 'wip/x', 'acumulado/commander']) assert.equal(vercelMonta(v, r), false, r);
  for (const r of ['main', 'trem/20261111-2000']) assert.equal(vercelMonta(v, r), true, r);
});

test('I-331 · leitura das regras da Vercel: regra true vence, "**" atravessa barras, sem regra monta', () => {
  assert.equal(vercelMonta({ git: { deploymentEnabled: { 'claude/**': false } } }, 'claude/a/b'), false);
  assert.equal(vercelMonta({ git: { deploymentEnabled: { 'claude/*': false } } }, 'claude/a/b'), true);
  assert.equal(vercelMonta({ git: { deploymentEnabled: { '**': false, main: true } } }, 'main'), true);
  assert.equal(vercelMonta({ git: { deploymentEnabled: false } }, 'main'), false);
  assert.equal(vercelMonta({}, 'qualquer'), true);
});

test('I-331 · orçamento da janela de 24 h: reserva de 30, trem custa 2, diz quando abre a vaga', () => {
  const agora = 10 * DIA_MS;
  assert.equal(orcamento([], agora).cabe, true);
  const cheio = Array.from({ length: LIMITE_VERCEL - RESERVA - 1 }, (_, i) => agora - DIA_MS + (i + 1) * H / 10);
  const o = orcamento(cheio, agora);
  assert.equal(o.usados, 69); assert.equal(o.livres, 1); assert.equal(o.cabe, false);
  assert.equal(RESERVA, 30, 'a Vercel barrou com 80 a 88 visíveis em 11/11');
  assert.equal(o.abreEm, cheio[0] + DIA_MS, 'abre quando o mais antigo sai da janela');
  assert.equal(orcamento([agora - DIA_MS - 1, agora - 5], agora).usados, 1, 'o que passou de 24 h não conta');
  assert.equal(CUSTO_DO_TREM, 2);
});

test('I-331 · ordem do trem: recusadas pela Vercel primeiro, depois a mais antiga; fora trem, rascunho e "segura"', () => {
  const prs = [
    { numero: 140, ramo: 'claude/G-378', criado: '2026-11-11T14:00:00Z' },
    { numero: 145, ramo: 'claude/J-70', criado: '2026-11-11T18:51:00Z', atrasada: true },
    { numero: 129, ramo: 'claude/M-617', criado: '2026-11-11T02:54:00Z' },
    { numero: 141, ramo: 'claude/G-379', criado: '2026-11-11T15:59:00Z', atrasada: true },
    { numero: 150, ramo: 'trem/20261111-2000', criado: '2026-11-11T20:00:00Z' },
    { numero: 151, ramo: 'claude/G-380', criado: '2026-11-11T20:01:00Z', rascunho: true },
    { numero: 152, ramo: 'claude/G-381', criado: '2026-11-11T20:02:00Z', etiquetas: ['segura'] },
    { numero: 153, ramo: 'claude/I-331', criado: '2026-11-11T20:03:00Z', etiquetas: ['primeiro'] },
  ];
  assert.deepEqual(ordemDoTrem(prs).map((p) => p.numero), [153, 141, 145, 129, 140]);
});

test('I-331 · nome do trem e corpo que o "partir" lê de volta', () => {
  assert.equal(nomeDoTrem(new Date('2026-11-11T20:13:00Z')), 'trem/20261111-2013');
  const corpo = corpoDoTrem([{ numero: 145, ramo: 'claude/J-70', titulo: 'Leva J-70' }, { numero: 129, ramo: 'claude/M-617', titulo: 'Leva M-617' }], [{ numero: 140, ramo: 'claude/G-378', motivo: 'CONFLITO em index.html' }], 'https://x');
  assert.deepEqual(levasDoCorpo(corpo), [{ numero: 145, ramo: 'claude/J-70' }, { numero: 129, ramo: 'claude/M-617' }]);
  assert.match(corpo, /Ficaram para o próximo trem:\n- #140 claude\/G-378: CONFLITO/);
});

const ESTADO = (motor, geral, rodape, extra = '') => `# Estante\n\n| Trilha | Prefixo | Foco atual | Última leva | Próximo |\n|---|---|---|---|---|\n| \`geral\` | G | g | ${geral} · 11/11 | x |\n| \`motor\` | M | m | ${motor} · 11/11 | y |\n\n${extra}texto fixo\n\nAtualizado: ${rodape}\n`;

test('I-331 · ESTADO.md: duas levas de trilhas diferentes juntam sem conflito', () => {
  const base = ESTADO('M-618', 'G-377', '10/11/2026 · I-328 · M-618');
  const nosso = ESTADO('M-619', 'G-377', '11/11/2026 · I-328 · M-618 · M-619');
  const deles = ESTADO('M-618', 'G-378', '11/11/2026 · I-328 · M-618 · G-378');
  const { texto, limpo } = juntarEstado(base, nosso, deles);
  assert.equal(limpo, true);
  assert.match(texto, /\| `motor` \| M \| m \| M-619/);
  assert.match(texto, /\| `geral` \| G \| g \| G-378/);
  assert.match(texto, /Atualizado: 11\/11\/2026 · I-328 · M-618 · M-619 · G-378\n/);
  assert.doesNotMatch(texto, /<<<<<<<|>>>>>>>/);
});

test('I-331 · ESTADO.md: mesma trilha nos dois lados fica a leva mais nova, nunca a antiga por cima', () => {
  const base = ESTADO('M-616', 'G-377', '10/11/2026 · M-616');
  const nosso = ESTADO('M-619', 'G-377', '11/11/2026 · M-616 · M-619'); // main já tem a M-619
  const deles = ESTADO('M-617', 'G-377', '11/11/2026 · M-616 · M-617'); // a leva antiga chega depois no trem
  const { texto } = juntarEstado(base, nosso, deles);
  assert.match(texto, /\| `motor` \| M \| m \| M-619/);
  assert.doesNotMatch(texto, /\| `motor` \| M \| m \| M-617/);
});

test('I-331 · ESTADO.md: rodapé longo perde as levas mais antigas para caber em 8 KB', () => {
  const grande = 'x'.repeat(TETO_ESTADO - 300) + '\n';
  const base = ESTADO('M-1', 'G-1', '10/11/2026 · I-1', grande);
  const itens = Array.from({ length: 40 }, (_, i) => `G-${100 + i}`).join(' · ');
  const nosso = ESTADO('M-1', 'G-1', `11/11/2026 · I-1 · ${itens}`, grande);
  const deles = ESTADO('M-2', 'G-1', '11/11/2026 · I-1 · M-2', grande);
  const { texto, limpo } = juntarEstado(base, nosso, deles);
  assert.equal(limpo, true);
  assert.ok(Buffer.byteLength(texto) <= TETO_ESTADO);
  assert.match(texto, /Atualizado: 11\/11\/2026 · [A-Z]-\d+.* · M-2\n/, 'a leva que chegou fica; o começo segue uma leva');
  assert.equal(juntarRodapes('Atualizado: 09/11/2026 · A-1', 'Atualizado: 11/11/2026 · A-1 · B-2'), 'Atualizado: 11/11/2026 · A-1 · B-2');
  assert.equal(caberNoTeto('abc'), 'abc');
});

test('I-331 · o git usa o juntador no ESTADO.md (cherry-pick do trem e rebase das conversas)', () => {
  assert.match(ler('.gitattributes'), /^ESTADO\.md merge=estado$/m);
  assert.match(ler('.gitattributes'), /^ROADMAP\.md merge=union$/m);
  const pkg = JSON.parse(ler('package.json'));
  assert.match(pkg.scripts.prepare, /merge\.estado\.driver "node estado-merge\.mjs %O %A %B"/);
  assert.match(pkg.scripts.prepare, /core\.hooksPath \.githooks/);
  // ponta a ponta num repositório de verdade: duas levas do mesmo main, cherry-pick sem conflito
  const d = mkdtempSync(join(tmpdir(), 'trem-'));
  const g = (...a) => execFileSync('git', a, { cwd: d, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  g('init', '-q', '-b', 'main'); g('config', 'user.email', 't@t'); g('config', 'user.name', 't'); g('config', 'commit.gpgsign', 'false');
  g('config', 'merge.estado.driver', `node ${JSON.stringify(new URL('./estado-merge.mjs', import.meta.url).pathname).slice(1, -1)} %O %A %B`);
  writeFileSync(join(d, '.gitattributes'), 'ESTADO.md merge=estado\n');
  writeFileSync(join(d, 'ESTADO.md'), ESTADO('M-618', 'G-377', '10/11/2026 · M-618')); g('add', '.'); g('commit', '-qm', 'base');
  g('switch', '-qc', 'a'); writeFileSync(join(d, 'ESTADO.md'), ESTADO('M-619', 'G-377', '11/11/2026 · M-618 · M-619')); g('commit', '-qam', 'Leva M-619');
  g('switch', '-q', 'main'); g('switch', '-qc', 'b'); writeFileSync(join(d, 'ESTADO.md'), ESTADO('M-618', 'G-378', '11/11/2026 · M-618 · G-378')); g('commit', '-qam', 'Leva G-378');
  const sb = g('rev-parse', 'HEAD'); g('switch', '-q', 'a'); g('cherry-pick', sb);
  const fim = readFileSync(join(d, 'ESTADO.md'), 'utf8');
  assert.match(fim, /M-619 · 11\/11/); assert.match(fim, /G-378 · 11\/11/); assert.match(fim, /M-619 · G-378\n/);
});

test('I-331 · CLAUDE.md manda a publicação pelo trem e proíbe o merge avulso de leva', () => {
  const regras = ler('CLAUDE.md');
  const secao = (regras.split('## Trem de produção')[1] || '').split('\n## ')[0];
  assert.ok(secao, 'seção "Trem de produção" no CLAUDE.md');
  for (const t of ['node trem.mjs montar', 'node trem.mjs partir', 'node trem.mjs orcamento', '100 deployments', 'claude/*', 'segura']) assert.ok(secao.includes(t), t);
  assert.match(secao, /nunca faz merge do PR da própria leva/i);
});

test('I-331 · trem e publicar falam com o GitHub só pela API REST (o GraphQL é barrado nas sessões de nuvem)', () => {
  for (const f of ['trem.mjs', 'publicar.mjs']) {
    const src = ler(f);
    assert.doesNotMatch(src, /gh\(\s*'pr'|\[\s*'pr',/, `${f} ainda usa "gh pr" (GraphQL)`);
    assert.match(src, /delete \w+\.GH_TOKEN/, `${f} tenta de novo sem o GH_TOKEN vencido`);
  }
});

test('I-331 · a guarda deixa o rodapé rolante do ESTADO.md ser resumido, e só ele', async () => {
  const { conferir, rodapeDoEstado } = await import('./agregacao.mjs');
  assert.equal(rodapeDoEstado('ESTADO.md', 'Atualizado: 11/11/2026 · G-378'), true);
  assert.equal(rodapeDoEstado('ESTADO.md', '| `geral` | G | x | G-378 · 11/11 | y |'), false);
  assert.equal(rodapeDoEstado('ROADMAP.md', 'Atualizado: 11/11/2026 · G-378'), false);
  const agora = Date.now();
  const outra = { sha: 'a'.repeat(40), trilha: 'geral', data: agora - 1000, diff: new Map([['ESTADO.md', { mais: new Set(['Atualizado: 11/11/2026 · I-1 · G-378', '| `geral` | G | x | G-378 · 11/11 | y |']), menos: new Set() }]]) };
  const minha = { sha: 'b'.repeat(40), trilha: 'infra', sobrescreve: [], data: agora, diff: new Map([['ESTADO.md', { mais: new Set(['Atualizado: 11/11/2026 · G-378 · I-331']), menos: new Set(['Atualizado: 11/11/2026 · I-1 · G-378', '| `geral` | G | x | G-378 · 11/11 | y |']) }]]) };
  const { achados } = { achados: conferir({ novos: [minha], janela: [outra], linhasDe: () => new Set(['Atualizado: 11/11/2026 · G-378 · I-331']) }) };
  const lista = Array.isArray(achados) ? achados : achados.achados || [];
  const sob = lista.filter((a) => a.tipo === 'sobrescrita');
  assert.equal(sob.length, 1, 'a linha da trilha de outra conversa apagada continua barrada');
  assert.deepEqual(sob[0].apagadas.map((x) => x.linha), ['| `geral` | G | x | G-378 · 11/11 | y |'], 'o rodapé resumido não conta');
});

test('I-332 · "Canceled by Ignored Build Step" não é prévia pronta (o trem #153 recebeu success sem prévia nenhuma)', async () => {
  const { previaPronta, previaCancelada } = await import('./trem.mjs');
  const cancelada = [{ context: 'Vercel', state: 'success', description: 'Canceled by Ignored Build Step' }];
  assert.equal(previaPronta(cancelada), false);
  assert.equal(previaCancelada(cancelada), true);
  assert.equal(previaPronta([{ context: 'Vercel', state: 'success', description: 'Deployment has completed' }]), true);
  assert.equal(previaPronta([{ context: 'Vercel', state: 'pending', description: 'Vercel is deploying your app' }]), false);
  assert.equal(previaPronta([]), false);
  assert.match(ler('trem.mjs'), /if \(!previaPronta\(previa\)\)/, 'o partir usa a conferência nova');
});
