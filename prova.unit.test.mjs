// R-17 · BI2-1 (fatia 1) · A prova de partida grava o placar na telemetria: o registro sai do JSON que `catalogo.prova.mjs`
// escreve (contagens, Shark × Shark, 10 culpadas), passa no esquema e na privacidade, e chega ao ramo `telemetria` por
// `gravar` (remoto local, sem rede). A prova em si não roda aqui (leva minutos e depende do catálogo).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { placarDaProva, valida, privacidade, gravar, lerJsonl, ARQUIVOS, RAMO } from './telemetria.mjs';

const detalhe = {
  placar: { formato: 'pauper', listas: 355, joga: 300, falha: 0, coberturaIncompleta: 52, semDados: 3, partidas: 1, acoesMax: 1500, semente: 1, motor: 112, segundos: 2140 },
  culpadas: [{ carta: 'Darval, Whose Web Protects', listas: 3, nivel: 'sem dados' }, { carta: 'Skyward Spider', listas: 2, nivel: 'manual' }],
  faltantes: [{ carta: 'X', listas: 9 }],
  ofertaQueSome: [{ carta: 'Y', podia: 4 }],
  listas: [
    { nome: 'Lista de Fulano', id: 'l1', situacao: 'joga', falhas: [], shark: [{ modo: 'shark', contra: 'Outra', semente: 7, ms: 3000, fim: true, acoes: 300, turnos: 30, piorMs: 612 }, { modo: 'shark', contra: 'Mais uma', semente: 8, ms: 1000, fim: false, acoes: 100, turnos: 50, piorMs: 3300 }] },
    { nome: 'Lista com erro', id: 'l2', situacao: 'falha', falhas: [{ erro: 'invariante' }], shark: [{ modo: 'shark', contra: 'Z', semente: 9, ms: 500, erro: 'invariante', acao: 40, turnos: 4, piorMs: 90 }] },
    { nome: 'Sem shark', id: 'l3', situacao: 'cobertura incompleta', falhas: [] }]
};

test('R-17 · placarDaProva: contagens, Shark (partidas, até o fim, falhas, pior jogada, tempo médio por jogada, turnos médios) e 10 culpadas; só o que o esquema aceita; nomes de lista e de jogador ficam de fora', () => {
  const r = placarDaProva(detalhe);
  assert.deepEqual(r, { trilha: 'homologacao', motor: 112, formato: 'pauper', listas_total: 355, listas_jogam: 300, falhas: 0, cobertura_incompleta: 52, sem_dados: 3, partidas: 1, semente: 1, acoes_max: 1500, segundos: 2140,
    shark_partidas: 3, shark_ate_fim: 1, shark_falhas: 1, pior_jogada_ms: 3300, tempo_medio_ms: 10, turnos_medios: 28,
    culpadas: [{ carta: 'Darval, Whose Web Protects', listas: 3 }, { carta: 'Skyward Spider', listas: 2 }] });
  assert.deepEqual(valida('placar', r), []);
  assert.equal(privacidade(r), null);
  assert.ok(!JSON.stringify(r).includes('Fulano'), 'nome de lista (pode ter nome de jogador) nunca entra');
  // sem Shark e sem culpadas: os campos somem; conversa opcional
  const so = placarDaProva({ placar: { formato: 'pauper', listas: 1, joga: 1, falha: 0, coberturaIncompleta: 0, semDados: 0, partidas: 2, acoesMax: 1000, semente: 1, motor: 112, segundos: 3 }, culpadas: [], listas: [{ shark: [] }] }, { conversa: 'homologacao · prova · 14/10' });
  assert.deepEqual(valida('placar', so), []); assert.equal(so.shark_partidas, undefined); assert.equal(so.culpadas, undefined); assert.equal(so.conversa, 'homologacao · prova · 14/10');
  // mais de 10 culpadas: só as 10 primeiras (a prova já ordena por listas)
  const muitas = placarDaProva({ ...detalhe, culpadas: Array.from({ length: 14 }, (_, i) => ({ carta: 'C' + i, listas: 14 - i })) });
  assert.equal(muitas.culpadas.length, 10); assert.deepEqual(valida('placar', muitas), []);
});

test('R-17 · esquema do placar ampliado: campo novo fora da forma é recusado (culpada sem contagem, chave estranha na culpada, tempo negativo)', () => {
  const base = placarDaProva(detalhe);
  assert.deepEqual(valida('placar', { ...base, culpadas: [{ carta: 'X' }] }), ['culpadas fora da forma']);
  assert.deepEqual(valida('placar', { ...base, culpadas: [{ carta: 'X', listas: 1, nivel: 'manual' }] }), ['culpadas fora da forma']);
  assert.deepEqual(valida('placar', { ...base, tempo_medio_ms: -1 }), ['tempo_medio_ms fora da forma']);
  assert.deepEqual(valida('placar', { ...base, turnos_medios: 'muitos' }), ['turnos_medios fora da forma']);
  assert.deepEqual(valida('placar', { ...base, culpadas: [{ carta: 'fulano@x.com', listas: 1 }] }), ['culpadas[0].carta: parece e-mail']);
});

test('R-17 · o placar da prova chega ao ramo telemetria por gravar (remoto local, sem rede) e é acrescentado, nunca substituído', { timeout: 60000 }, t => {
  const base = mkdtempSync(join(tmpdir(), 'prova-telemetria-'));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const bare = join(base, 'remoto.git'); execFileSync('git', ['init', '-q', '--bare', '-b', 'main', bare]);
  const pasta = join(base, 'clone');
  const r1 = gravar({ tipo: 'placar', registro: placarDaProva(detalhe), remoto: bare, pasta, agora: () => '2026-10-14T08:00:00Z' });
  assert.equal(r1.enviado, true); assert.equal(r1.arquivo, ARQUIVOS.placares);
  gravar({ tipo: 'placar', registro: placarDaProva({ ...detalhe, placar: { ...detalhe.placar, joga: 301 } }), remoto: bare, pasta, agora: () => '2026-10-14T09:00:00Z' });
  const linhas = lerJsonl(execFileSync('git', ['-C', bare, 'show', `${RAMO}:${ARQUIVOS.placares}`], { encoding: 'utf8' }));
  assert.deepEqual(linhas.map(l => [l.listas_jogam, l.em, l.shark_partidas]), [[300, '2026-10-14T08:00:00Z', 3], [301, '2026-10-14T09:00:00Z', 3]]);
});

test('R-17 · catalogo.prova.mjs chama a telemetria ao fim (e desliga com --sem-telemetria, --lista e no CI), sem derrubar a prova se o envio falhar', () => {
  const fonte = readFileSync(new URL('./catalogo.prova.mjs', import.meta.url), 'utf8');
  assert.match(fonte, /import \{ gravar, placarDaProva \} from '\.\/telemetria\.mjs'/);
  assert.match(fonte, /gravar\(\{ tipo: 'placar', registro: placarDaProva\(detalhe\) \}\)/);
  assert.match(fonte, /!ARGS\['sem-telemetria'\] && !ARGS\.lista && !process\.env\.CI/);
  assert.match(fonte, /catch \(e\) \{ console\.log\(`  telemetria não gravada/);
  assert.match(fonte, /ms: Date\.now\(\) - tS/, 'o tempo da partida do Shark entra no registro (tempo médio por jogada)');
});
