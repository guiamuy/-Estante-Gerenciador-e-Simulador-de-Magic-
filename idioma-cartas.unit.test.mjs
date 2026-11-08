// G-356 · T-IDIOMA fatia 2 (relatos #53/#66): o texto impresso da carta em português, da Scryfall, guardado no aparelho.
// Textos abaixo são dados de teste (não o texto oficial de nenhuma carta).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
const { platform: P, scryfall: SF, cards: C } = loadModules();
const J = x => JSON.parse(JSON.stringify(x));

const PT = { object: 'card', lang: 'pt', set: 'm11', collector_number: '149', name: 'Teste Bolt', oracle_text: 'Deals 3 damage to any target.',
  printed_name: 'Raio de Teste', printed_type_line: 'Mágica Instantânea', printed_text: 'Causa 3 pontos de dano a qualquer alvo.' };

test('G-356 · textoImpressoDe: a primeira impressão no idioma com o texto impresso; sem texto impresso não conta; carta sem regras basta o nome; duas faces por face', () => {
  assert.deepEqual(J(SF.textoImpressoDe([PT], 'pt')), { lang: 'pt', nome: 'Raio de Teste', tipo: 'Mágica Instantânea', texto: 'Causa 3 pontos de dano a qualquer alvo.', faces: [], set: 'm11', numero: '149' });
  // a Scryfall às vezes tem a impressão em português só com a imagem: sem printed_text, fica de fora (melhor o inglês)
  const soImagem = { ...PT, collector_number: '1', printed_text: undefined };
  assert.equal(SF.textoImpressoDe([soImagem], 'pt'), null);
  assert.equal(SF.textoImpressoDe([soImagem, PT], 'pt').numero, '149', 'a seguinte, com texto, vale');
  // impressão de outro idioma não vale
  assert.equal(SF.textoImpressoDe([{ ...PT, lang: 'en' }], 'pt'), null);
  assert.equal(SF.textoImpressoDe([PT], 'es'), null);
  // terreno básico: sem regras, o nome impresso basta
  assert.equal(SF.textoImpressoDe([{ lang: 'pt', name: 'Island', oracle_text: '', printed_name: 'Ilha', printed_type_line: 'Terreno Básico — Ilha' }], 'pt').nome, 'Ilha');
  // duas faces: nome e texto de cada face, e o nome inteiro com //
  const dfc = { lang: 'pt', name: 'A // B', card_faces: [
    { name: 'A', oracle_text: 'Flying.', printed_name: 'Face A', printed_type_line: 'Criatura — Teste', printed_text: 'Voar.' },
    { name: 'B', oracle_text: 'Trample.', printed_name: 'Face B', printed_type_line: 'Criatura — Teste', printed_text: 'Atropelar.' }] };
  const r = SF.textoImpressoDe([dfc], 'pt');
  assert.equal(r.nome, 'Face A // Face B');
  assert.deepEqual(J(r.faces), [{ nome: 'Face A', tipo: 'Criatura — Teste', texto: 'Voar.' }, { nome: 'Face B', tipo: 'Criatura — Teste', texto: 'Atropelar.' }]);
  assert.equal(SF.textoImpressoDe(null, 'pt'), null);
});

test('G-356 · cliente Scryfall: busca pelo oracle_id no idioma, mais nova primeiro; nunca impressa no idioma (404) dá null', async () => {
  const urls = [];
  const res = (status, body) => ({ status, ok: status < 300, headers: { get: () => null }, json: async () => body });
  const sf = SF.createScryfall({ sleep: async () => {}, fetch: async url => { urls.push(url); return url.includes('nunca') ? res(404, { object: 'error' }) : res(200, { object: 'list', data: [PT] }); } });
  assert.equal((await sf.textoImpresso('o-1', 'pt')).nome, 'Raio de Teste');
  const u = new URL(urls[0]);
  assert.equal(u.pathname, '/cards/search');
  assert.equal(u.searchParams.get('q'), 'oracleid:o-1 lang:pt');
  assert.equal(u.searchParams.get('unique'), 'prints');
  assert.equal(u.searchParams.get('order'), 'released');
  assert.equal(u.searchParams.get('dir'), 'desc');
  assert.equal(await sf.textoImpresso('nunca', 'pt'), null);
  assert.equal(await sf.textoImpresso('', 'pt'), null, 'sem oracle_id não pergunta');
  assert.equal(urls.length, 2);
});

test('G-356 · serviço: guarda por oracle_id e idioma (vale para outra impressão), "nunca saiu" também guardado por menos tempo, vencido busca de novo, sem rede usa a cópia velha e sem cópia repassa o erro', async () => {
  let agora = 1000, chamadas = 0, falha = false;
  const scryfall = { textoImpresso: async (k, lang) => { chamadas++; if (falha) throw new SF.ScryfallError('network', 'sem rede'); return k === 'o-nunca' ? null : SF.textoImpressoDe([PT], lang); } };
  const store = P.memoryStore();
  const T = C.createTextoImpresso({ store, scryfall, agora: () => agora });
  const bolt = { id: 'imp-1', oracle_id: 'o-1', name: 'Teste Bolt' };
  assert.equal(T.temChave(bolt), true);
  assert.equal(T.temChave({ id: 'basic-island', name: 'Island' }), false, 'básico embutido não tem oracle_id');
  assert.equal(await T.guardado(bolt, 'pt'), null);
  const r1 = await T.busca(bolt, 'pt');
  assert.equal(r1.origem, 'rede'); assert.equal(r1.dado.nome, 'Raio de Teste'); assert.equal(chamadas, 1);
  // outra impressão: do aparelho, sem rede
  agora += C.TEXTO_IMPRESSO_PRAZO_MS - 1;
  const r2 = await T.busca({ id: 'imp-2', oracle_id: 'o-1' }, 'pt');
  assert.equal(r2.origem, 'guardado'); assert.equal(chamadas, 1);
  assert.equal((await T.guardado({ oracle_id: 'o-1' }, 'pt')).dado.texto, 'Causa 3 pontos de dano a qualquer alvo.');
  // outro idioma é outra chave
  assert.equal(await T.guardado(bolt, 'es'), null);
  // nunca saiu em português: guardado como null, não pergunta de novo dentro de 7 dias, pergunta depois
  const n1 = await T.busca({ oracle_id: 'o-nunca' }, 'pt');
  assert.equal(n1.dado, null); assert.equal(chamadas, 2);
  agora += C.TEXTO_IMPRESSO_NENHUM_MS - 1;
  assert.equal((await T.busca({ oracle_id: 'o-nunca' }, 'pt')).origem, 'guardado'); assert.equal(chamadas, 2);
  agora += 2;
  assert.equal((await T.busca({ oracle_id: 'o-nunca' }, 'pt')).origem, 'rede'); assert.equal(chamadas, 3);
  // vencido e sem rede: a cópia velha, marcada
  agora += C.TEXTO_IMPRESSO_PRAZO_MS + 1; falha = true;
  const r3 = await T.busca(bolt, 'pt');
  assert.equal(r3.velho, true); assert.equal(r3.dado.nome, 'Raio de Teste');
  // sem cópia e sem rede: erro para a tela
  await assert.rejects(T.busca({ oracle_id: 'o-9' }, 'pt'), e => e.kind === 'network');
  // forçar busca de novo
  falha = false; const c0 = chamadas; await T.busca(bolt, 'pt', { forcar: true }); assert.equal(chamadas, c0 + 1);
  // sem oracle_id: não busca
  const s = await T.busca({ id: 'basic-island' }, 'pt'); assert.equal(s.semChave, true); assert.equal(chamadas, c0 + 1);
});
