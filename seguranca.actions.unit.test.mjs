// P-2 · fluxos do GitHub com o mínimo (auditoria de segurança de 09/10/2026): toda Action declara permissões, toda ação de
// terceiro é fixada por SHA (uma tag pode passar a apontar para outro código), o portão instala pelo lockfile, e o fluxo
// Relatos — que qualquer conta do GitHub dispara abrindo um registro — só cria etiquetas de listas fechadas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { loadModules } from './_load.mjs';
import * as T from './relatos-tabela.mjs';
const PASTA = new URL('./.github/workflows/', import.meta.url);
const FLUXOS = readdirSync(PASTA).filter(f => f.endsWith('.yml')).map(f => [f, readFileSync(new URL(f, PASTA), 'utf8')]);

test('P-2 · toda Action declara permissões; toda ação de terceiro é fixada por SHA; o portão instala pelo lockfile', () => {
  assert.ok(FLUXOS.length >= 4, 'achou os fluxos: ' + FLUXOS.map(f => f[0]));
  const ruins = [];
  for (const [nome, yml] of FLUXOS) {
    if (!/^permissions:\s*$/m.test(yml)) ruins.push(`${nome}: sem permissions no topo`);
    for (const m of yml.matchAll(/^\s*-?\s*uses:\s*(\S+)(.*)$/gm)) if (!/^[\w.-]+\/[\w.-]+@[0-9a-f]{40}$/.test(m[1])) ruins.push(`${nome}: ${m[1]} não está fixada por SHA`);
  }
  assert.deepEqual(ruins, []);
  const gate = FLUXOS.find(f => f[0] === 'gate.yml')[1];
  assert.match(gate, /^permissions:\s*\n\s+contents: read\s*$/m, 'o portão só lê o repositório');
  assert.match(gate, /run: npm ci\b/, 'o portão instala exatamente o lockfile');
  assert.doesNotMatch(gate, /run: npm install\b/);
});

test('P-2 · Relatos: só etiquetas de listas fechadas (área desconhecida não vira etiqueta), áreas iguais às do app, e o CSV não executa fórmula', () => {
  const nomes = d => T.etiquetasDe(d).map(e => e.nome);
  assert.deepEqual(nomes({ tipo: 'erro', urgencia: 'alta', area: 'Mesa' }), ['relato', 'tipo: Erro', 'urgência: Alta', 'área: Mesa']);
  assert.deepEqual(nomes({ tipo: 'erro', urgencia: 'alta', area: '<b>spam</b> qualquer coisa' }), ['relato', 'tipo: Erro', 'urgência: Alta'], 'área inventada não cria etiqueta');
  assert.deepEqual(nomes({ tipo: 'hack', urgencia: 'xx', area: 'Perfil' }), ['relato', 'área: Perfil']);
  const { relatos: R } = loadModules();
  assert.deepEqual([...T.AREAS].sort(), [...R.AREAS.map(a => a[1])].sort(), 'a lista do coletor é a do app');
  const linha = { numero: 1, situacao: 'aberto', tipoRotulo: 'Erro', urgenciaRotulo: 'Alta', area: 'Mesa', titulo_da_tela: '=HYPERLINK("http://x")', endereco: '+1', criadoEm: '@agora', resolvidoEm: '', motor: '-2', app: '', viewport: '', descricao: '=1+1', url: 'u' };
  const csv = T.csv([linha]);
  for (const ruim of ['=HYPERLINK', '+1', '@agora', '-2', '=1+1']) assert.ok(!csv.includes(',' + ruim) && !csv.includes(',"' + ruim), `célula começando com ${ruim[0]} vira texto`);
  assert.ok(csv.includes(`,'+1,`) && csv.includes(`"'=HYPERLINK(""http://x"")"`));
});
