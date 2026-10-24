// R-3 · BI1-2 · Telemetria das sessões (telemetria.mjs): esquema, privacidade, acréscimo por chave e o envio ao ramo
// `telemetria` com nova tentativa quando outra sessão gravou antes (remoto local, sem rede).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { valida, privacidade, aplicar, lerJsonl, upsert, gravar, preparaPasta, skillsJson, levaComPortao, rodadaDoResumo, padroesDeGravacao, SKILLS, ARQUIVOS, RAMO, SITUACOES } from './telemetria.mjs';

const RAIZ_TEL = dirname(fileURLToPath(import.meta.url));
const ISO_RX = /^\d{4}-\d{2}-\d{2}T/;
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

test('I-292 · rodadaDoResumo: o job da fila vira uma linha de rodada (levas sem o prefixo fila/, portão pelo resultado do job, sha, testes das duas fases, instáveis, telas como lista ou contagem, medidas, quedas de orçamento somadas); resumo ausente ou estranho dá só o essencial; passa no esquema; regrava por id', () => {
  const resumo = { kind: 'estante.portao', version: 1, rapido: { verde: true, minutos: 21.4, passaram: 3060, cairam: 0, quedasOrcamento: ['Q8 · orçamento'] },
    tela: { verde: true, minutos: 12.5, passaram: 318, cairam: 1, quedasOrcamento: [], instaveis: ['G-266 · nome de usuário'], telas: 818, medidas: { scanner: { detector_ms: 88 } } } };
  const plano = { aceitos: [{ nome: 'fila/R-24', sha: 'a'.repeat(40) }, { nome: 'M-410' }], recusados: [], vazios: [] };
  const r = rodadaDoResumo({ id: '18561234567', resumo, plano, portao: 'success', publicado: '62c1eb1', agora: '2026-10-17T20:00:00Z' });
  assert.deepEqual(r, { id: '18561234567', em: '2026-10-17T20:00:00Z', levas: ['R-24', 'M-410'], portao: 'verde', publicado: '62c1eb1', testes_rapido: 3060, minutos_rapido: 21.4,
    testes_tela: 318, minutos_tela: 12.5, instaveis: 1, instaveis_nomes: ['G-266 · nome de usuário'], telas_auditadas: 818, medidas: { scanner: { detector_ms: 88 } }, quedas_orcamento: 1 });
  assert.deepEqual(valida('rodada', r), []);
  assert.equal(rodadaDoResumo({ id: 1, resumo: { ...resumo, tela: { ...resumo.tela, telas: ['a', 'b'] } }, plano, portao: 'success' }).telas_auditadas, 2, 'telas como lista conta');
  const v = rodadaDoResumo({ id: 7, resumo: { kind: 'outro' }, plano: null, portao: 'failure', agora: '2026-10-17T20:00:00Z' });
  assert.deepEqual(v, { id: '7', em: '2026-10-17T20:00:00Z', levas: [], portao: 'vermelho', quedas_orcamento: 0 }, 'sem resumo válido: só id, levas, portão');
  assert.deepEqual(valida('rodada', v), []);
  assert.equal(rodadaDoResumo({ id: 8, portao: 'cancelled' }).portao, 'cancelado'); assert.equal(rodadaDoResumo({ id: 9, portao: 'skipped' }).portao, 'pulado');
  assert.equal(rodadaDoResumo({ id: 10, portao: 'success', plano: { aceitos: 'x' } }).levas.length, 0, 'plano com forma estranha não derruba');
  assert.ok(valida('rodada', { id: 'abc', levas: [], portao: 'verde' }).length, 'id só dígitos'); assert.ok(valida('rodada', { id: '1', levas: ['a b'], portao: 'verde' }).length, 'nome de leva com forma de ramo');
  assert.ok(valida('rodada', { id: '1', levas: [], portao: 'verde', publicado: 'zzz' }).length, 'sha hex'); assert.ok(valida('rodada', { id: '1', levas: [], portao: 'ok' }).length, 'portão do vocabulário');
  const duas = aplicar('rodada', aplicar('rodada', '', { id: '1', levas: ['R-1'], portao: 'vermelho' }, '2026-10-17T20:00:00Z'), { id: '1', levas: ['R-1'], portao: 'verde', publicado: 'abcdef1' }, '2026-10-17T20:05:00Z');
  assert.deepEqual(lerJsonl(duas).map(l => [l.id, l.portao, l.publicado]), [['1', 'verde', 'abcdef1']], 'mesma rodada regravada no lugar');
  assert.equal(ARQUIVOS.rodadas, 'rodadas.jsonl');
});

test('I-292 · `node telemetria.mjs rodada --ci`: tudo vem do ambiente (plano, resultado e resumo do portão, sha, número da execução), nada da linha de comando; grava rodadas.jsonl no ramo telemetria e recusa registro com dado proibido', { timeout: 60000 }, t => {
  const { base, bare } = remotoLocal(); t.after(() => rmSync(base, { recursive: true, force: true }));
  const env = { ...process.env, GITHUB_RUN_ID: '18561234567', FILA_PORTAO: 'success', FILA_PUBLICADO: '62c1eb1',
    FILA_PLANO: JSON.stringify({ aceitos: [{ nome: 'fila/R-24' }], recusados: [] }),
    FILA_RESUMO: JSON.stringify({ kind: 'estante.portao', rapido: { passaram: 3060, minutos: 21.4, quedasOrcamento: [] }, tela: { passaram: 318, minutos: 12.5, instaveis: [], telas: 818, medidas: {} } }) };
  const saida = execFileSync('node', ['telemetria.mjs', 'rodada', '--ci', '--remoto', bare, '--pasta', join(base, 'p')], { cwd: RAIZ_TEL, env, encoding: 'utf8' });
  assert.match(saida, /✓ rodada 18561234567 \(1 leva\(s\), portão verde\) gravada em telemetria\/rodadas\.jsonl \(enviado\)/);
  const linhas = lerJsonl(conteudo(bare, ARQUIVOS.rodadas));
  assert.equal(linhas.length, 1); assert.equal(linhas[0].levas[0], 'R-24'); assert.equal(linhas[0].publicado, '62c1eb1'); assert.equal(linhas[0].testes_rapido, 3060); assert.equal(linhas[0].telas_auditadas, 818);
  assert.ok(ISO_RX.test(linhas[0].em), 'em preenchido pelo script');
  // resumo com nome de instável que parece e-mail: a privacidade recusa a linha inteira e o script sai com erro (o fluxo só avisa)
  const ruim = { ...env, FILA_RESUMO: JSON.stringify({ kind: 'estante.portao', tela: { passaram: 1, instaveis: ['alguem@exemplo.com'] } }) };
  const r = spawnSync('node', ['telemetria.mjs', 'rodada', '--ci', '--remoto', bare, '--pasta', join(base, 'p')], { cwd: RAIZ_TEL, env: ruim, encoding: 'utf8' });
  assert.notEqual(r.status, 0); assert.match(r.stderr + r.stdout, /parece e-mail/);
  assert.equal(lerJsonl(conteudo(bare, ARQUIVOS.rodadas)).length, 1, 'nada a mais no ramo');
});

test('I-295 · gravar `pessoas` (lista de dias) chega ao ramo como pessoas.jsonl — a primeira corrida do fluxo caiu porque o nome do arquivo era derivado por "+s" e `pessoas` já é o nome', { timeout: 60000 }, t => {
  const { base, bare } = remotoLocal(); t.after(() => rmSync(base, { recursive: true, force: true }));
  const dias = [{ dia: '2026-10-21', salas_criadas: 1, salas_total: 3, contas: 5, contas_novas: 1, perfis: 2 }, { dia: '2026-10-22', salas_criadas: 0, salas_total: 3, contas: 6, contas_novas: 1 }];
  const r = gravar({ tipo: 'pessoas', registro: dias, remoto: bare, pasta: join(base, 'p'), agora: () => '2026-10-22T03:00:00Z' });
  assert.equal(r.arquivo, ARQUIVOS.pessoas); assert.equal(r.enviado, true);
  assert.deepEqual(lerJsonl(conteudo(bare, ARQUIVOS.pessoas)).map(l => [l.dia, l.contas, l.em]), [['2026-10-21', 5, '2026-10-22T03:00:00Z'], ['2026-10-22', 6, '2026-10-22T03:00:00Z']]);
  const r2 = gravar({ tipo: 'pessoas', registro: { dia: '2026-10-22', salas_criadas: 2, salas_total: 5, contas: 7, contas_novas: 2 }, remoto: bare, pasta: join(base, 'p'), agora: () => '2026-10-23T03:00:00Z' });
  assert.equal(r2.tentativa, 1); assert.deepEqual(lerJsonl(conteudo(bare, ARQUIVOS.pessoas)).map(l => [l.dia, l.contas]), [['2026-10-21', 5], ['2026-10-22', 7]]);
  for (const tipo of ['leva', 'trilha', 'rotina', 'placar', 'rodada', 'pessoas']) assert.ok(ARQUIVOS[tipo] || ARQUIVOS[tipo + (tipo === 'placar' ? 'es' : 's')], 'todo tipo tem arquivo: ' + tipo);
});

test('R-31 · forca: esquema (listas só com lista/vitorias/derrotas/pct, nada de pessoa), histórico como o placar e arquivo forca.jsonl no ramo', { timeout: 60000 }, t => {
  const reg = { trilha: 'radar', nivel: 'shark', motor: 112, rodadas: 2, semente: 100, partidas: 40, decididas: 36, pior_jogada_ms: 812, ilegais: 0, segundos: 300,
    listas: [{ lista: 'Mono Green Elves', vitorias: 10, derrotas: 6, pct: 62.5 }, { lista: 'Grixis Madness', vitorias: 12, derrotas: 4, pct: 75 }] };
  assert.deepEqual(valida('forca', reg), []);
  assert.ok(valida('forca', { ...reg, listas: [] }).some(e => /listas/.test(e)), 'sem listas não vale');
  assert.ok(valida('forca', { ...reg, listas: [{ lista: 'X', vitorias: 1, derrotas: 0, uid: 'abc' }] }).some(e => /listas/.test(e)), 'chave estranha dentro da lista é recusada');
  assert.ok(valida('forca', { ...reg, listas: [{ lista: 'fulano@exemplo.com', vitorias: 1, derrotas: 0 }] }).some(e => /e-mail/.test(e)), 'e-mail no nome da lista é recusado');
  assert.ok(valida('forca', { trilha: 'radar', nivel: 'shark', listas: reg.listas }).some(e => /falta motor|falta partidas/.test(e)), 'motor e partidas obrigatórios');
  const duas = lerJsonl(aplicar('forca', aplicar('forca', '', reg, '2026-10-24T17:00:00Z'), { ...reg, motor: 113 }, '2026-10-25T17:00:00Z'));
  assert.deepEqual(duas.map(l => [l.motor, l.em]), [[112, '2026-10-24T17:00:00Z'], [113, '2026-10-25T17:00:00Z']], 'força é histórico: nunca substitui');
  const { base, bare } = remotoLocal(); t.after(() => rmSync(base, { recursive: true, force: true }));
  const r = gravar({ tipo: 'forca', registro: reg, remoto: bare, pasta: join(base, 'f'), agora: () => '2026-10-24T17:00:00Z' });
  assert.equal(r.arquivo, 'forca.jsonl'); assert.equal(ARQUIVOS.forca, 'forca.jsonl'); assert.equal(r.enviado, true);
  assert.deepEqual(lerJsonl(conteudo(bare, ARQUIVOS.forca)).map(l => [l.nivel, l.listas.length]), [['shark', 2]]);
});

test('R-31 · padroesDeGravacao: sem `remoto`/`pasta`, o clone deste arquivo (.tmp/telemetria e o origin) — o catalogo.prova.mjs chamava `gravar` só com tipo e registro desde a R-17 e caía em "path undefined" dentro do try', () => {
  const p = padroesDeGravacao({ raiz: '/x/clone', origem: r => 'git@' + r });
  assert.deepEqual(p, { remoto: 'git@/x/clone', pasta: join('/x/clone', '.tmp', 'telemetria') });
  assert.deepEqual(padroesDeGravacao({ remoto: 'r', pasta: 'p', origem: () => { throw new Error('não devia consultar o git'); } }), { remoto: 'r', pasta: 'p' });
  assert.equal(padroesDeGravacao({ origem: () => 'o' }).pasta, join(RAIZ_TEL, '.tmp', 'telemetria'), 'o padrão é a pasta ao lado do telemetria.mjs');
});
