// E50 P3 · fichas: quais os scripts criam, como o repositório as busca (t:token) e guarda, e o que acontece sem rede.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
const { scripts: S, cards: C, platform: P } = loadModules();
const J = x => JSON.parse(JSON.stringify(x));

test('E50 P3 · fichasDasCartas acha toda ficha do script (efeitos, gatilhos, habilidades, alternativas), sem repetir', () => {
  const defs = S.fichasDasCartas(['Thraben Inspector', 'Novice Inspector', 'Battle Screech', 'Lys Alana Huntmaster', 'Island', 'Carta Inexistente']);
  const chaves = J(defs.map(S.chaveDaFicha)).sort();
  assert.deepEqual(chaves, ['bird 1/1', 'clue', 'elf warrior 1/1']);
  assert.ok(defs.every(t => t.name && Array.isArray(t.types)));
  assert.equal(S.fichasDasCartas([]).length, 0);
  // percorre estruturas aninhadas
  const sc = { name: 'X', effects: [{ do: 'modal', modes: [{ effects: [{ do: 'token', amount: 1, token: { name: 'Goblin', types: ['creature'], power: 1, toughness: 1 } }] }] }],
    abilities: [{ effects: [{ do: 'token', token: { name: 'Goblin', types: ['creature'], power: 2, toughness: 2 } }] }] };
  assert.deepEqual(J(S.fichasDoScript(sc).map(S.chaveDaFicha)), ['goblin 1/1', 'goblin 2/2']);
});

test('E50 P3 · o repositório busca a ficha como "!nome t:token pow tou", fixa para sempre e, sem rede, responde do cache', async () => {
  const pedidos = [];
  const clue = { name: 'Clue', type_line: 'Token Artifact — Clue', images: { small: 's', normal: 'n' } };
  const scryfall = { async search(q) { pedidos.push(q); return /clue/i.test(q) ? [clue] : []; }, async collection() { return { found: [], missing: [] }; } };
  const store = P.memoryStore();
  const repo = C.createCardRepo({ store, scryfall, now: () => 1000 });
  const defs = [{ name: 'Clue', types: ['artifact'] }, { name: 'Elf Warrior', types: ['creature'], colors: ['G'], power: 1, toughness: 1 }];
  const r = await repo.fichas(defs);
  assert.equal(r.get('ficha:clue'), clue);
  assert.equal(r.get('ficha:elf warrior 1/1'), null, 'ficha que a rede não achou fica nula');
  assert.deepEqual(J(pedidos), ['!"Clue" t:token', '!"Elf Warrior" t:token pow=1 tou=1 c=g', '!"Elf Warrior" t:token pow=1 tou=1'], 'sem cor na segunda tentativa');
  // segunda chamada: a ficha achada não volta à rede; a não achada volta (vence rápido)
  pedidos.length = 0;
  const repo2 = C.createCardRepo({ store, scryfall, now: () => 1000 + 2 * 24 * 3600 * 1000 });
  const r2 = await repo2.fichas(defs);
  assert.equal(r2.get('ficha:clue').name, 'Clue');
  assert.deepEqual(J(pedidos), ['!"Elf Warrior" t:token pow=1 tou=1 c=g', '!"Elf Warrior" t:token pow=1 tou=1']);
  // sem rede: só o que está guardado, sem chamar a rede
  pedidos.length = 0;
  const r3 = await repo2.fichas(defs, { onlineOnly: true });
  assert.equal(r3.get('ficha:clue').name, 'Clue'); assert.equal(r3.get('ficha:elf warrior 1/1'), null);
  assert.deepEqual(J(pedidos), []);
  // rede quebrada: não derruba, devolve o cache
  const repo3 = C.createCardRepo({ store, scryfall: { async search() { throw new Error('offline'); } }, now: () => 1000 });
  const r4 = await repo3.fichas(defs);
  assert.equal(r4.get('ficha:clue').name, 'Clue'); assert.equal(r4.get('ficha:elf warrior 1/1'), null);
});

/* ---------------- I4 · fichas do seu jeito ---------------- */
const { fichas: FX } = loadModules();
test('I4 · lista de fichas: todas as que os scripts criam, com ícone, cores e descrição; as das listas do usuário primeiro', () => {
  const l = FX.listaDeFichas(['Thraben Inspector', 'Battle Screech']);
  assert.ok(l.length >= 15, 'todas as fichas do motor: ' + l.length);
  assert.equal(new Set(l.map(x => x.chave)).size, l.length, 'sem repetir');
  assert.deepEqual(J(l.filter(x => x.suaLista).map(x => x.chave)), ['ficha:bird 1/1', 'ficha:clue'], 'as das suas listas vêm primeiro, por nome');
  const de = k => l.find(x => x.chave === k);
  assert.deepEqual(J([de('ficha:clue').icone, de('ficha:clue').cores, de('ficha:clue').descricao]), ['gema', ['C'], 'Artefato — Clue']);
  assert.deepEqual(J([de('ficha:bird 1/1').icone, de('ficha:bird 1/1').cores, de('ficha:bird 1/1').descricao, de('ficha:bird 1/1').pt]), ['garras', ['W'], 'Criatura — Bird · 1/1', '1/1']);
  assert.deepEqual(J(de('ficha:elemental 4/4').cores), ['U', 'R'], 'duas cores, na ordem WUBRG');
  assert.equal(FX.listaDeFichas().filter(x => x.suaLista).length, 0);
  assert.equal(FX.iconeDaFicha({ types: ['enchantment'] }), 'ficha'); assert.equal(FX.iconeDaFicha({ types: ['artifact', 'creature'] }), 'garras', 'criatura artefato é criatura');
  assert.equal(FX.chaveDaFicha({ name: 'Bird', power: 1, toughness: 1 }), 'ficha:bird 1/1', 'a mesma chave do repositório de cartas');
});
test('I4 · consulta e opções de arte: nome exato com força e cor; só o que tem imagem, uma por arte, com teto', () => {
  assert.equal(FX.consultaDaFicha({ name: 'Bird', power: 2, toughness: 2, colors: ['U'] }), '!"Bird" t:token pow=2 tou=2 c=u');
  assert.equal(FX.consultaDaFicha({ name: 'Bird', power: 2, toughness: 2, colors: ['U'] }, { comCor: false }), '!"Bird" t:token pow=2 tou=2');
  assert.equal(FX.consultaDaFicha({ name: 'Clue', colors: [] }), '!"Clue" t:token');
  const c = (id, arte, set, n) => ({ id, name: 'Clue', type_line: 'Token Artifact — Clue', set, collector_number: n, prices: { usd: '1' }, legalities: { pauper: 'legal' }, images: arte ? { small: arte + '/s', normal: arte + '/n', large: arte + '/l', art: arte } : null });
  const ops = FX.opcoesDeArte([c('a', 'x1', 'soi', '11'), c('b', 'x1', 'mh2', '14'), c('c', null, 'xyz', '1'), c('d', 'x2', 'inr', '45')]);
  assert.deepEqual(J(ops.map(o => o.id)), ['a', 'd'], 'mesma arte não repete; sem imagem fica fora');
  assert.equal(ops[0].prices, undefined, 'só o que a mesa precisa'); assert.equal(ops[0].images.normal, 'x1/n');
  assert.equal(FX.rotuloDaOpcao(ops[0]), 'SOI · #11'); assert.equal(FX.rotuloDaOpcao({}), 'sem edição');
  assert.equal(FX.opcoesDeArte(Array.from({ length: 80 }, (_, i) => c('k' + i, 'art' + i, 's', String(i)))).length, FX.OPCOES_MAX);
  assert.deepEqual(J(FX.opcoesDeArte(null)), []);
});
test('I4 · serviço: buscar só com internet, guarda opções e imagens; escolher fica guardado e a mesa usa a escolha antes do cache; voltar ao padrão', async () => {
  const pedidos = [], aquecidas = [];
  const carta = (id, arte) => ({ id, name: 'Clue', type_line: 'Token Artifact — Clue', set: 'soi', collector_number: id, images: { small: arte + '/s', normal: arte + '/n', large: arte + '/l', art: arte } });
  const scryfall = { async search(q) { pedidos.push(q); return /clue/i.test(q) ? [carta('1', 'a1'), carta('2', 'a2')] : []; }, async collection() { return { found: [], missing: [] }; } };
  const store = P.memoryStore(); let rede = true;
  const images = { available: true, async warm(urls) { aquecidas.push(...urls); return urls.length; } };
  const fx = FX.createFichas({ store, scryfall, images, temRede: () => rede });
  const clue = { name: 'Clue', types: ['artifact'], colors: [] };
  const ops = await fx.buscar(clue);
  assert.deepEqual(J(ops.map(o => o.id)), ['1', '2']); assert.deepEqual(J(pedidos), ['!"Clue" t:token']);
  // I7 (leva 206) · expectativa mudou de propósito: liberar o lote não baixa mais nada (a tela baixa ao mostrar, a pequena
  // primeiro); `guardar` confirma no aparelho depois, em segundo plano
  assert.deepEqual(J(aquecidas), [], 'liberar as artes não espera download nenhum');
  await fx.guardar(ops); assert.deepEqual(J(aquecidas), ['a1/s', 'a1/n', 'a2/s', 'a2/n'], 'as imagens das opções ficam guardadas');
  assert.deepEqual(J((await fx.estado()).opcoes['ficha:clue'].map(o => o.id)), ['1', '2'], 'as opções ficam no aparelho');
  // sem internet: buscar recusa; o que já foi baixado continua à mão
  rede = false; await assert.rejects(fx.buscar(clue), /sem-rede/); assert.equal((await fx.estado()).opcoes['ficha:clue'].length, 2);
  // escolher: guardado, com a imagem grande; o repositório de cartas devolve a escolha sem ir à rede
  aquecidas.length = 0; await fx.escolher(clue, ops[1]);
  assert.equal((await fx.estado()).escolhas['ficha:clue'].id, '2'); assert.ok(aquecidas.includes('a2/l'));
  const repo = C.createCardRepo({ store, scryfall, now: () => 1000 }); pedidos.length = 0;
  const r = await repo.fichas([clue]);
  assert.equal(r.get('ficha:clue').id, '2', 'a mesa recebe a arte escolhida'); assert.deepEqual(J(pedidos), [], 'sem ir à rede');
  // padrão de volta: a escolha sai e o repositório volta ao caminho de antes
  rede = true; await fx.escolher(clue, null);
  assert.equal((await fx.estado()).escolhas['ficha:clue'], undefined);
  assert.equal((await repo.fichas([clue])).get('ficha:clue').id, '1', 'sem escolha, a primeira que a busca acha');
  // segunda tentativa sem cor quando a primeira não acha
  pedidos.length = 0; await fx.buscar({ name: 'Elf Warrior', types: ['creature'], colors: ['G'], power: 1, toughness: 1 });
  assert.deepEqual(J(pedidos), ['!"Elf Warrior" t:token pow=1 tou=1 c=g', '!"Elf Warrior" t:token pow=1 tou=1']);
});

/* ---------------- G-242 · todas as fichas (relato #9) ---------------- */
test('G-242 · lista de fichas com o catálogo: as do app primeiro, as do catálogo depois sem repetir chave, marcadas; busca por nome, subtipo, tipo e P/T', () => {
  const cat = [{ name: 'Bird', types: ['creature'], subtypes: ['Bird'], colors: ['W'], power: '1', toughness: '1' }, // já existe no app: não repete
    { name: 'Zombie', types: ['creature'], subtypes: ['Zombie'], colors: ['B'], power: '2', toughness: '2' }, { name: 'Gold', types: ['artifact'], subtypes: ['Gold'], colors: [] },
    { name: 'Ângelo', types: ['creature'], subtypes: ['Angel'], colors: ['W'], power: '4', toughness: '4' }];
  const l = FX.listaDeFichas(['Battle Screech'], cat);
  assert.equal(l.filter(x => x.chave === 'ficha:bird 1/1').length, 1, 'a mesma ficha do app não entra duas vezes');
  const doCat = l.filter(x => x.catalogo); assert.deepEqual(J(doCat.map(x => x.chave)), ['ficha:angelo 4/4', 'ficha:gold', 'ficha:zombie 2/2']);
  assert.ok(l.findIndex(x => x.catalogo) > l.filter(x => !x.catalogo).length - 1, 'as do app vêm antes das do catálogo');
  assert.equal(l[0].chave, 'ficha:bird 1/1', 'as das suas listas continuam primeiro');
  assert.deepEqual(J([doCat[2].icone, doCat[2].cores, doCat[2].descricao, doCat[2].pt]), ['garras', ['B'], 'Criatura — Zombie · 2/2', '2/2']);
  assert.deepEqual(J(FX.filtraFichas(doCat, 'zomb').map(x => x.nome)), ['Zombie']);
  assert.deepEqual(J(FX.filtraFichas(doCat, 'angel').map(x => x.nome)), ['Ângelo'], 'subtipo e nome sem acento');
  assert.deepEqual(J(FX.filtraFichas(doCat, 'artefato').map(x => x.nome)), ['Gold'], 'tipo em português');
  assert.deepEqual(J(FX.filtraFichas(doCat, '4/4').map(x => x.nome)), ['Ângelo']);
  assert.equal(FX.filtraFichas(doCat, '  ').length, 3);
});
