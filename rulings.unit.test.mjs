// V2 · rulings da Scryfall no visualizador: o que se guarda de cada ruling, cache por carta com prazo, sem internet.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
const { platform: P, scryfall: SF, cards: C } = loadModules();
const J = x => JSON.parse(JSON.stringify(x));

const DADOS = [
  { object: 'ruling', oracle_id: 'o1', source: 'wotc', published_at: '2021-03-19', comment: 'If the target is illegal, the spell does not resolve.' },
  { object: 'ruling', oracle_id: 'o1', source: 'scryfall', published_at: '2004-10-04', comment: '  Tapping {T} for mana is not an activated ability with a target.  ' },
  { object: 'ruling', oracle_id: 'o1', source: 'wotc', published_at: '2021-03-19', comment: 'Second ruling of the same day keeps its order.' },
  { object: 'ruling', comment: '' }, null, { object: 'ruling', source: 'wotc', published_at: 'ontem', comment: 'Bad date.' }];

test('V2 · limpaRulings: data, fonte e texto aparado, da mais antiga para a mais nova (mesmo dia mantém a ordem), vazio e quebrado ficam fora', () => {
  assert.deepEqual(J(C.limpaRulings(DADOS)), [
    { data: null, fonte: 'wotc', texto: 'Bad date.' },
    { data: '2004-10-04', fonte: 'scryfall', texto: 'Tapping {T} for mana is not an activated ability with a target.' },
    { data: '2021-03-19', fonte: 'wotc', texto: 'If the target is illegal, the spell does not resolve.' },
    { data: '2021-03-19', fonte: 'wotc', texto: 'Second ruling of the same day keeps its order.' }]);
  assert.deepEqual(J(C.limpaRulings(null)), []);
  assert.equal(C.temRulings({ id: 'abc' }), true);
  assert.equal(C.temRulings({ id: 'basic-forest' }), false, 'os básicos embutidos não têm id da Scryfall');
  assert.equal(C.temRulings({ name: 'Sem dados' }), false);
});

test('V2 · cliente Scryfall: GET /cards/<id>/rulings; carta inexistente dá lista vazia', async () => {
  const urls = [];
  const res = (status, body) => ({ status, ok: status < 300, headers: { get: () => null }, json: async () => body });
  const sf = SF.createScryfall({ sleep: async () => {}, fetch: async url => { urls.push(url); return url.includes('/nada/') ? res(404, {}) : res(200, { object: 'list', data: DADOS }); } });
  assert.equal((await sf.rulings('a b')).length, DADOS.length);
  assert.ok(urls[0].endsWith('/cards/a%20b/rulings'), urls[0]);
  assert.deepEqual(J(await sf.rulings('nada')), []);
});

test('V2 · serviço: busca e guarda por oracle_id (vale para outra impressão), no prazo não busca de novo, vencido busca, forçar busca, sem rede usa a cópia velha e sem cópia repassa o erro; aberto lembrado', async () => {
  let agora = 1000, chamadas = 0, falha = false;
  const scryfall = { rulings: async id => { chamadas++; if (falha) throw new SF.ScryfallError('network', 'sem rede'); return id === 'vazia' ? [] : DADOS.slice(0, 2); } };
  const store = P.memoryStore();
  const R = C.createRulings({ store, scryfall, agora: () => agora });
  const bolt = { id: 'imp-1', oracle_id: 'o1', name: 'Lightning Bolt' };
  assert.equal(await R.guardados(bolt), null);
  const r1 = await R.busca(bolt);
  assert.equal(r1.origem, 'rede'); assert.equal(r1.itens.length, 2); assert.equal(r1.em, 1000); assert.equal(chamadas, 1);
  // outra impressão da mesma carta: guardados, sem rede
  agora += C.RULINGS_PRAZO_MS - 1;
  const r2 = await R.busca({ id: 'imp-2', oracle_id: 'o1', name: 'Lightning Bolt' });
  assert.equal(r2.origem, 'guardados'); assert.equal(chamadas, 1);
  assert.equal((await R.guardados({ id: 'imp-2', oracle_id: 'o1' })).itens.length, 2);
  // forçar busca de novo
  await R.busca(bolt, { forcar: true }); assert.equal(chamadas, 2);
  // vencido e sem rede: a cópia velha, marcada
  agora += C.RULINGS_PRAZO_MS + 1; falha = true;
  const r3 = await R.busca(bolt);
  assert.equal(r3.velho, true); assert.equal(r3.origem, 'guardados'); assert.equal(r3.itens.length, 2); assert.equal(chamadas, 3);
  // sem cópia e sem rede: erro para a tela
  await assert.rejects(R.busca({ id: 'outra', oracle_id: 'o9' }), e => e.kind === 'network');
  // carta sem rulings fica guardada como lista vazia (não busca de novo a cada abertura)
  falha = false;
  assert.deepEqual(J((await R.busca({ id: 'vazia', oracle_id: 'o2' })).itens), []);
  assert.equal((await R.busca({ id: 'vazia', oracle_id: 'o2' })).origem, 'guardados');
  // básico embutido: não busca
  const n = chamadas; const b = await R.busca({ id: 'basic-island', name: 'Island' });
  assert.equal(b.semId, true); assert.equal(chamadas, n);
  // aberto ou fechado fica lembrado
  assert.equal(await R.aberto(), false); R.lembraAberto(true); await new Promise(r => setTimeout(r, 0)); assert.equal(await R.aberto(), true);
});
