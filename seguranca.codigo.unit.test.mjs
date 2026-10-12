// P-16 · SEG9 · código de sala com 6 símbolos: com 4 (32^4 ≈ 1 milhão) quem tem conta e insiste acha salas esperando e lê
// nomes e listas; com 6 (32^6 ≈ 1,07 bilhão) a varredura fica impraticável. Códigos de 4 continuam valendo para entrar, e
// enquanto o console do Firebase tiver as regras antigas (que só aceitam 4) o app cai para 4 ao criar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
const { online: O } = loadModules();

test('P-16 · o código novo tem 6 símbolos do alfabeto sem letras ambíguas (≈ 1 bilhão de códigos)', () => {
  let n = 0; const cod = O.gerarCodigo(() => (n++ % 7) / 7);
  assert.match(cod, /^ESTA-[A-HJ-NP-Z2-9]{6}$/);
  assert.ok(O.ALFABETO.length ** 6 > 1e9);
  assert.match(O.gerarCodigo(Math.random, 4), /^ESTA-[A-HJ-NP-Z2-9]{4}$/, 'o curto continua existindo para o recuo');
});

test('P-16 · entrar aceita 6 e 4; o prefixo é opcional mesmo quando o código começa com as letras E S T A', () => {
  assert.equal(O.normalizaCodigo(' esta-4k7q9m '), 'ESTA-4K7Q9M');
  assert.equal(O.normalizaCodigo('4k7q9m'), 'ESTA-4K7Q9M');
  assert.equal(O.normalizaCodigo('ESTA-4K7Q'), 'ESTA-4K7Q', 'sala antiga de 4');
  assert.equal(O.normalizaCodigo('estab2'), 'ESTA-ESTAB2', 'código que começa com ESTA, digitado sem prefixo');
  assert.equal(O.normalizaCodigo('esta'), 'ESTA-ESTA', 'idem, com 4');
  assert.equal(O.normalizaCodigo('ESTA-ESTA'), 'ESTA-ESTA');
  assert.equal(O.normalizaCodigo('ESTA-ESTAB2'), 'ESTA-ESTAB2');
  for (const ruim of ['ESTA-4K7Q9', 'ESTA-4K7Q9MZ', '4K7', '']) assert.equal(O.normalizaCodigo(ruim), null, ruim);
});

test('P-16 · criar: com o banco recusando o código longo (regras antigas no console) a sala nasce com 4; sem rede, o erro sobe', async () => {
  const base = O.transporteMemoria();
  const antigo = { ...base, ler: base.ler, atualizar: base.atualizar, empurrar: base.empurrar, ouvir: base.ouvir,
    async escrever(c, v) { if (c.split('/').pop().length !== 9) throw Object.assign(new Error('api'), { status: 401 }); return base.escrever(c, v); } };
  const curto = await O.createSala({ transporte: antigo }).criar({ nome: 'A', deck: [], formato: 'pauper' });
  assert.match(curto, /^ESTA-[A-HJ-NP-Z2-9]{4}$/);
  const novo = await O.createSala({ transporte: base }).criar({ nome: 'A', deck: [], formato: 'pauper' });
  assert.match(novo, /^ESTA-[A-HJ-NP-Z2-9]{6}$/, 'regras novas: 6');
  const semRede = { ...base, ler: async () => null, async escrever() { throw new Error('sem-rede'); } };
  await assert.rejects(O.createSala({ transporte: semRede }).criar({ nome: 'A', deck: [], formato: 'pauper' }), /sem-rede/);
});
