// R-3 · BI1-2 · Telemetria das sessões (telemetria.mjs): esquema, privacidade, acréscimo por chave e o envio ao ramo
// `telemetria` com nova tentativa quando outra sessão gravou antes (remoto local, sem rede).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { valida, privacidade, aplicar, lerJsonl, upsert, gravar, preparaPasta, skillsJson, levaComPortao, SKILLS, ARQUIVOS, RAMO, SITUACOES } from './telemetria.mjs';

const leva = (extra = {}) => ({ id: 'R-3', trilha: 'radar', conversa: 'radar · Painel Estante · 13/10', situacao: 'editando', ...extra });

test('R-3 · esquema da leva: obrigatórios, formas, chave desconhecida; situação e portão só do vocabulário', () => {
  assert.deepEqual(valida('leva', leva()), []);
  assert.deepEqual(valida('leva', leva({ skills: ['mtg-bi-specialist', 'mtg-app-design-architect'], modelo: 'Fable 5.1', inicio: '2026-10-13T18:40:00-03:00', fim: '2026-10-13T19:30:00-03:00', testes_antes: 2738, testes_depois: 2752, instaveis: 0, portao: 'verde', tentativas_fila: 1, golden_regravado: false, bugs_achados: 0, sha: '1b5f14e', plano: 'BI1', estimativa_levas: 12, tokens_estimados: 90000, tamanho: '1' })), []);
  assert.deepEqual(valida('leva', { trilha: 'radar', conversa: 'x', situacao: 'editando' }), ['falta id']);
  assert.deepEqual(valida('leva', leva({ id: 'r3' })), ['id fora da forma']);
  assert.deepEqual(valida('leva', leva({ situacao: 'pronta' })), ['situacao fora da forma']);
  assert.deepEqual(valida('leva', leva({ portao: 'amarelo' })), ['portao fora da forma']);
  assert.deepEqual(valida('leva', leva({ cor: 'azul' })), ['chave desconhecida: cor']);
  assert.deepEqual(valida('leva', leva({ testes_depois: -1 })), ['testes_depois fora da forma']);
  assert.deepEqual(valida('leva', leva({ inicio: 'ontem' })), ['inicio fora da forma']);
  assert.deepEqual(valida('leva', 'texto'), ['o registro precisa ser um objeto JSON']);
  assert.deepEqual(valida('coisa', {}), ['tipo desconhecido: coisa']);
  assert.ok(SITUACOES.includes('na-fila') && SITUACOES.includes('publicada'));
});

test('R-3 · privacidade: e-mail, token, chave de API ou chave proibida (uid, token, relato) recusam o registro inteiro', () => {
  assert.match(privacidade({ conversa: 'gui.amuy@gmail.com' }), /parece e-mail/);
  assert.match(privacidade({ nota: 'ya29.a0AfH6SMBx' }), /parece token/);
  assert.match(privacidade({ nota: 'AIzaSyD6WvzlsJ4KZ9b5QZOEdQnd-liaNeJ0xRk' }), /parece token/);
  assert.match(privacidade({ nota: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjEifQ.eyJzdWIiOiIxIn0.x' }), /parece token/);
  assert.match(privacidade({ uid: 'abc' }), /uid: chave que nunca entra/);
  assert.match(privacidade({ skills: ['ok', 'mtg@x.com'] }), /skills\[1\]: parece e-mail/);
  assert.equal(privacidade(leva({ skills: ['mtg-bi-specialist'] })), null);
  assert.deepEqual(valida('leva', leva({ historia: 'conta de fulano@x.com' })), ['historia: parece e-mail']);
  assert.deepEqual(valida('trilha', { conversa: 'x', trilha: 'radar', situacao: 'editando', relato: 'texto' }), ['relato: chave que nunca entra na telemetria', 'chave desconhecida: relato']);
});

test('R-3 · trilha, rotina e placar: esquemas próprios', () => {
  assert.deepEqual(valida('trilha', { conversa: 'motor · frases do Pauper · 11/10', trilha: 'motor', leva: 'M-390', historia: 'Ethereal Haze (615.1)', modulos: 'src/engine/core.js', contrato: 'ENGINE_VERSION 112', situacao: 'na-fila', depende_de: 'nada', estimativa: '2 levas' }), []);
  assert.deepEqual(valida('trilha', { conversa: 'x', trilha: 'Motor', situacao: 'editando' }), ['trilha fora da forma']);
  assert.deepEqual(valida('rotina', { id: 'trig_01', nome: 'Trilha listas: retomada', quando: '2026-10-13T21:51:00Z', status: 'agendada', periodicidade: 'uma vez' }), []);
  assert.deepEqual(valida('rotina', { id: 'trig_01', nome: 'x', quando: 'amanhã', status: 'rodando' }), ['status fora da forma']);
  assert.deepEqual(valida('placar', { trilha: 'homologacao', motor: 112, formato: 'pauper', listas_total: 341, listas_jogam: 272, falhas: 0, partidas: 272 }), []);
  assert.deepEqual(valida('placar', { trilha: 'homologacao', motor: 'v112' }), ['motor fora da forma']);
});

test('R-3 · acréscimo por chave: a leva com o mesmo id é regravada no lugar (situação nova, campos antigos ficam); placar sempre acrescenta; trilha por conversa; rotina por id', () => {
  const a = aplicar('leva', '', leva({ inicio: '2026-10-13T18:40:00Z' }), '2026-10-13T18:40:00Z');
  const b = aplicar('leva', a, leva({ situacao: 'na-fila', testes_depois: 2752 }), '2026-10-13T19:30:00Z');
  const c = aplicar('leva', b, leva({ id: 'R-4', situacao: 'editando' }), '2026-10-13T19:31:00Z');
  const linhas = lerJsonl(c);
  assert.equal(linhas.length, 2);
  assert.deepEqual(linhas[0], { id: 'R-3', trilha: 'radar', conversa: 'radar · Painel Estante · 13/10', situacao: 'na-fila', inicio: '2026-10-13T18:40:00Z', testes_depois: 2752, em: '2026-10-13T19:30:00Z' });
  assert.equal(linhas[1].id, 'R-4');
  const p1 = aplicar('placar', '', { trilha: 'homologacao', motor: 112, listas_jogam: 262 }, '2026-10-13T17:00:00Z');
  const p2 = aplicar('placar', p1, { trilha: 'homologacao', motor: 112, listas_jogam: 272 }, '2026-10-13T20:00:00Z');
  assert.equal(lerJsonl(p2).length, 2, 'placar é histórico: nunca substitui');
  const t1 = aplicar('trilha', '', { conversa: 'c1', trilha: 'motor', situacao: 'editando' }, '2026-10-13T18:00:00Z');
  const t2 = aplicar('trilha', t1, { conversa: 'c1', trilha: 'motor', situacao: 'na-fila', leva: 'M-390' }, '2026-10-13T19:00:00Z');
  assert.deepEqual(JSON.parse(t2), [{ conversa: 'c1', trilha: 'motor', situacao: 'na-fila', leva: 'M-390', atualizado: '2026-10-13T19:00:00Z' }]);
  const r1 = aplicar('rotina', '[]', { id: 'trig_1', nome: 'n', quando: 'x', status: 'agendada' }, '2026-10-13T18:00:00Z');
  assert.equal(JSON.parse(r1).length, 1);
  assert.deepEqual(upsert([{ id: 1, a: 1 }], { id: 1, b: 2 }, 'id'), [{ id: 1, a: 1, b: 2 }]);
  const s = JSON.parse(skillsJson('2026-10-13T18:00:00Z'));
  assert.equal(s.kind, 'estante.telemetria.skills'); assert.equal(s.skills.length, SKILLS.length); assert.ok(s.skills.length >= 15);
  for (const sk of SKILLS) assert.ok(sk.nome && sk.papel && Array.isArray(sk.atalhos), sk.nome);
});

/* ---------- envio ao ramo, com remoto local (sem rede) ---------- */
function remotoLocal() {
  const base = mkdtempSync(join(tmpdir(), 'telemetria-'));
  const bare = join(base, 'remoto.git');
  execFileSync('git', ['init', '-q', '--bare', '-b', 'main', bare]);
  return { base, bare };
}
const conteudo = (bare, arquivo) => execFileSync('git', ['-C', bare, 'show', `${RAMO}:${arquivo}`], { encoding: 'utf8' });

test('R-3 · gravar cria o ramo `telemetria` quando não existe, envia, e a segunda gravação acrescenta sem perder a primeira', { timeout: 60000 }, t => {
  const { base, bare } = remotoLocal(); t.after(() => rmSync(base, { recursive: true, force: true }));
  const pasta = join(base, 'p1');
  const r1 = gravar({ tipo: 'leva', registro: leva(), remoto: bare, pasta, agora: () => '2026-10-13T18:40:00Z' });
  assert.deepEqual(r1, { arquivo: ARQUIVOS.levas, tentativa: 1, estado: 'novo', enviado: true });
  assert.equal(lerJsonl(conteudo(bare, ARQUIVOS.levas)).length, 1);
  assert.ok(conteudo(bare, 'README.md').includes('Nenhum e-mail'));
  const r2 = gravar({ tipo: 'leva', registro: leva({ id: 'R-4' }), remoto: bare, pasta, agora: () => '2026-10-13T18:41:00Z' });
  assert.equal(r2.estado, 'atualizado'); assert.equal(r2.tentativa, 1);
  assert.deepEqual(lerJsonl(conteudo(bare, ARQUIVOS.levas)).map(l => l.id), ['R-3', 'R-4']);
  gravar({ tipo: 'skills', registro: {}, remoto: bare, pasta });
  assert.equal(JSON.parse(conteudo(bare, ARQUIVOS.skills)).skills.length, SKILLS.length);
  assert.equal(execFileSync('git', ['-C', bare, 'branch', '--list', 'main'], { encoding: 'utf8' }).trim(), '', 'o ramo main do remoto não é tocado');
});

test('R-3 · duas sessões gravando ao mesmo tempo: a segunda tem o push recusado, refaz sobre o ramo novo e as duas linhas ficam', { timeout: 60000 }, t => {
  const { base, bare } = remotoLocal(); t.after(() => rmSync(base, { recursive: true, force: true }));
  const p1 = join(base, 'p1'), p2 = join(base, 'p2');
  gravar({ tipo: 'leva', registro: leva(), remoto: bare, pasta: p1 });
  // a sessão 2 clona o ramo; a sessão 1 grava de novo antes de a 2 enviar
  assert.equal(preparaPasta({ remoto: bare, pasta: p2 }), 'clonado');
  gravar({ tipo: 'leva', registro: leva({ id: 'R-4' }), remoto: bare, pasta: p1 });
  // a pasta p2 está velha: o gravar lê de novo (fetch) antes de aplicar, então a linha entra sobre o ramo novo
  const r = gravar({ tipo: 'trilha', registro: { conversa: 'c2', trilha: 'motor', situacao: 'editando' }, remoto: bare, pasta: p2 });
  assert.equal(r.enviado, true);
  assert.deepEqual(lerJsonl(conteudo(bare, ARQUIVOS.levas)).map(l => l.id), ['R-3', 'R-4']);
  assert.equal(JSON.parse(conteudo(bare, ARQUIVOS.trilhas))[0].conversa, 'c2');
  // registro recusado nunca chega ao git
  assert.throws(() => gravar({ tipo: 'leva', registro: leva({ conversa: 'x@y.com' }), remoto: bare, pasta: p1 }), /registro recusado: conversa: parece e-mail/);
  assert.ok(existsSync(join(p1, '.git')));
  assert.equal(execFileSync('git', ['-C', p1, 'status', '--porcelain'], { encoding: 'utf8' }).trim(), '');
});

test('R-21 · levaComPortao: o resumo do portão entra na leva (testes, instáveis com nomes, telas auditadas, duração, portão, quedas de orçamento só das corridas depois do último consumo); campo já informado fica; sem resumo nada muda; o registro passa no esquema', () => {
  const resumo = { kind: 'estante.portao', version: 1, em: '2026-10-17T01:00:00Z', consumidoEm: '2026-10-16T22:00:00Z',
    rapido: { em: '2026-10-17T00:50:00Z', verde: true, minutos: 15.2, passaram: 3063, cairam: 0, quedasOrcamento: [] },
    tela: { em: '2026-10-17T01:00:00Z', verde: true, minutos: 9.9, passaram: 246, cairam: 1, quedasOrcamento: [], instaveis: ['e2e · X11 scanner'], telas: ['custo 360', 'acervo 360'], medidas: { scanner: { detector_ms: 88, confirmacao_ms: 132, leituras_s: 3 } } },
    historico: [{ em: '2026-10-16T21:00:00Z', fase: 'rapido', verde: false, quedasOrcamento: 2, instaveis: 0 }, { em: '2026-10-16T23:00:00Z', fase: 'rapido', verde: false, quedasOrcamento: 1, instaveis: 0 }, { em: '2026-10-17T00:50:00Z', fase: 'rapido', verde: true, quedasOrcamento: 0, instaveis: 0 }, { em: '2026-10-17T01:00:00Z', fase: 'tela', verde: true, quedasOrcamento: 0, instaveis: 1 }] };
  const base = { id: 'R-21', trilha: 'radar', conversa: 'c', situacao: 'na-fila', bugs_achados: 0 };
  const { registro, consumidoEm } = levaComPortao(base, resumo);
  assert.equal(consumidoEm, '2026-10-17T01:00:00Z');
  assert.deepEqual(registro, { ...base, testes_depois: 3309, testes_tela: 246, instaveis: 1, instaveis_nomes: ['e2e · X11 scanner'], telas_auditadas: 2, quedas_orcamento: 1, portao_min: 25.1, portao: 'verde', medidas: { scanner: { detector_ms: 88, confirmacao_ms: 132, leituras_s: 3 } } });
  assert.ok(valida('leva', { ...base, medidas: { scanner: { 'Detector': 1 } } }).length, 'chave de medida fora da forma é recusada');
  assert.ok(valida('leva', { ...base, medidas: { scanner: { detector_ms: 'x' } } }).length, 'medida tem de ser número');
  assert.deepEqual(valida('leva', registro), [], 'o registro carregado passa no esquema');
  // campo informado pela conversa vence; resumo só da fase rápida não inventa tela
  const r2 = levaComPortao({ ...base, testes_depois: 10, portao: 'vermelho' }, { ...resumo, tela: null, historico: [] }).registro;
  assert.equal(r2.testes_depois, 10); assert.equal(r2.portao, 'vermelho'); assert.equal(r2.testes_tela, undefined); assert.equal(r2.instaveis, undefined); assert.equal(r2.quedas_orcamento, 0); assert.equal(r2.portao_min, 15.2);
  assert.deepEqual(levaComPortao(base, null), { registro: base, consumidoEm: null });
  assert.deepEqual(levaComPortao(base, { kind: 'outro' }), { registro: base, consumidoEm: null });
  assert.ok(valida('leva', { ...base, instaveis_nomes: new Array(11).fill('x') }).length, 'mais de 10 nomes é recusado');
});
