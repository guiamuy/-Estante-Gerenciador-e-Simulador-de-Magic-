// B-188 · B25 fase 0 · a bateria profissional do Shark (bot.bateria.mjs): cada posição é montável, a jogada certa é legal
// nela (a bateria não pede o impossível), e a nota do Shark publicado não cai abaixo do piso. O piso só sobe.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
import { POSICOES, pontua } from './bot.bateria.mjs';
const { engine: E, bot: B } = loadModules();

const PISO = 24; // B-190 · 24 de 25 com o contra-ataque na nota do ataque (erra só a isca: `volta-isca`, a isca de dois lances que mediu 49 × 48 na B-184). Era 22 (B-188)

test('B-188 · toda posição da bateria monta, tem classe, porquê, e a jogada certa está entre as legais', () => {
  const ids = new Set();
  for (const P of POSICOES) {
    assert.ok(!ids.has(P.id), 'id repetido: ' + P.id); ids.add(P.id);
    assert.ok(P.classe && P.porque && typeof P.certo === 'function', P.id);
    const { s } = P.monta();
    assert.equal(s.status === 'mulligan' || s.status === 'playing', true, P.id + ': ' + s.status);
    const legais = P.mulligan ? [{ t: 'keep', p: 0, bottom: [] }, { t: 'mulligan', p: 0 }] : E.legalActions(s, 0).filter(a => a.t !== 'concede');
    assert.ok(legais.some(a => P.certo(s, { acao: a })), P.id + ': a jogada certa não é legal');
  }
  assert.ok(POSICOES.length >= 20);
});

test('B-188 · a nota do Shark publicado na bateria não cai abaixo do piso; o shark-v12 congelado acerta menos', () => {
  const novo = pontua('shark'), v12 = pontua('shark-v12');
  assert.ok(novo.certas >= PISO, `shark ${novo.certas}/${novo.total}: ` + novo.erradas.map(e => e.id).join(', '));
  assert.ok(v12.certas < novo.certas, `v12 ${v12.certas} × shark ${novo.certas}`);
});

test('B-190 · contra-ataque: com Tolarian Terror e Serpentes (ou o Avenging Hunter) do outro lado, o Shark publicado segura os Baleful Strix em casa; o shark-v18 congelado atacava', () => {
  for (const id of ['papel-strix-segura-serpentes', 'papel-strix-segura-hunter']) {
    const P = POSICOES.find(x => x.id === id), joga = nivel => { const { s } = P.monta(); const j = B.criaBot({ nivel, agora: () => 0 }).jogada(s, 0); return { ok: P.certo(s, j), j }; };
    const novo = joga('shark'), v18 = joga('shark-v18');
    assert.ok(novo.ok, id + ' · publicado: ' + novo.j.motivo); assert.ok(!v18.ok, id + ' · v18: ' + v18.j.motivo);
  }
});
