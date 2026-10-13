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

test('G-244 · relato #10: as fichas que as cartas das listas criam, pela Scryfall — o campo `fichas` da carta, a ficha de cada parte, "Nas suas listas" sem repetir, carta guardada antes da leva buscada de novo uma vez, sem rede só o guardado', async () => {
  const { scryfall: SF, fichas: F } = loadModules();
  // a carta guarda as partes "token" (não a si mesma, não emblema)
  const bruta = { id: 'necro', name: 'Fake Necromancer', type_line: 'Creature — Zombie Wizard', all_parts: [
    { component: 'combo_piece', id: 'necro', name: 'Fake Necromancer', type_line: 'Creature — Zombie Wizard' },
    { component: 'token', id: 'tok-z', name: 'Zombie', type_line: 'Token Creature — Zombie' },
    { component: 'token', id: 'emb', name: 'Fake Emblem', type_line: 'Emblem — Fake' }] };
  assert.deepEqual(J(SF.normalizeCard(bruta).fichas), [{ id: 'tok-z', name: 'Zombie' }]);
  assert.deepEqual(J(SF.normalizeCard({ id: 'x', name: 'Island', type_line: 'Basic Land — Island' }).fichas), [], 'sem partes: lista vazia (sabe que não cria)');
  // a ficha que a carta-ficha descreve
  assert.deepEqual(J(F.fichaDaCarta({ name: 'Zombie', type_line: 'Token Creature — Zombie', colors: ['B'], power: '2', toughness: '2' })), { name: 'Zombie', types: ['creature'], subtypes: ['Zombie'], colors: ['B'], power: '2', toughness: '2' });
  assert.deepEqual(J(F.fichaDaCarta({ name: 'Treasure', type_line: 'Token Artifact — Treasure', colors: [] })), { name: 'Treasure', types: ['artifact'], subtypes: ['Treasure'], colors: [] });
  assert.equal(F.fichaDaCarta({ name: 'Incubator // Phyrexian', type_line: 'Token Artifact — Incubator // Token Artifact Creature — Phyrexian' }), null, 'duas faces fora');
  // o serviço
  const store = P.memoryStore();
  const carta = (name, fichas) => ({ name, type_line: 'Creature', ...(fichas ? { fichas } : {}) });
  let guardadas = new Map([['fake necromancer', carta('Fake Necromancer')], ['fake builder', carta('Fake Builder', [{ id: 'tok-t', name: 'Treasure' }])]]); // a do necromante é de antes da leva (sem o campo)
  const pedidosNomes = [], pedidosIds = [];
  const cardRepo = { async cached(ns) { return new Map(ns.map(n => [n.toLowerCase(), guardadas.get(n.toLowerCase())]).filter(([, c]) => c)); },
    async byNames(ns, _p, { exige }) { pedidosNomes.push(...ns); const out = new Map(); for (const n of ns) { const c = carta(n, n === 'Fake Necromancer' ? [{ id: 'tok-z', name: 'Zombie' }, { id: 'tok-z2', name: 'Zombie' }] : []); assert.ok(exige(c)); guardadas.set(n.toLowerCase(), c); out.set(n.toLowerCase(), c); } return out; } };
  const tokens = { 'tok-z': { id: 'tok-z', name: 'Zombie', type_line: 'Token Creature — Zombie', colors: ['B'], power: '2', toughness: '2' }, 'tok-z2': { id: 'tok-z2', name: 'Zombie', type_line: 'Token Creature — Zombie', colors: ['B'], power: '2', toughness: '2' },
    'tok-t': { id: 'tok-t', name: 'Treasure', type_line: 'Token Artifact — Treasure', colors: [] } };
  let semRede = false;
  const scryfall = { async porIds(ids) { pedidosIds.push(...ids); if (semRede) throw new TypeError('Failed to fetch'); return { found: ids.filter(i => tokens[i]).map(i => tokens[i]), missing: ids.filter(i => !tokens[i]) }; } };
  const svc = F.createFichas({ store, scryfall, temRede: () => !semRede });
  const nomes = ['Fake Necromancer', 'Fake Builder', 'Island'];
  // sem rede: só o guardado (a Treasure do construtor ainda não tem a ficha guardada; o necromante não sabe as dele)
  assert.deepEqual(J(await svc.dasListas(nomes, { cardRepo })), []);
  // com rede: busca de novo a carta sem o campo, uma vez, e as fichas pelo id (duas impressões do mesmo Zombie viram uma)
  const defs = await svc.dasListas(nomes, { cardRepo, rede: true });
  assert.deepEqual(J(defs.map(F.chaveDaFicha)).sort(), ['ficha:treasure', 'ficha:zombie 2/2']);
  assert.deepEqual(pedidosNomes.sort(), ['Fake Necromancer', 'Island']); assert.deepEqual(pedidosIds.sort(), ['tok-t', 'tok-z', 'tok-z2']);
  // de novo: nada vai à rede (a carta já tem o campo; as fichas estão guardadas), e sem rede o mesmo resultado
  pedidosNomes.length = 0; pedidosIds.length = 0;
  assert.deepEqual(J((await svc.dasListas(nomes, { cardRepo, rede: true })).map(F.chaveDaFicha)).sort(), ['ficha:treasure', 'ficha:zombie 2/2']);
  assert.deepEqual([pedidosNomes.length, pedidosIds.length], [0, 0], 'nada vai à rede: as cartas já têm o campo e as fichas estão guardadas');
  semRede = true; assert.deepEqual(J((await svc.dasListas(nomes, { cardRepo, rede: true })).map(F.chaveDaFicha)).sort(), ['ficha:treasure', 'ficha:zombie 2/2']);
  // a lista da tela: as das listas em "Nas suas listas" (a Treasure é do app; o Zombie entra), sem repetir; sem a lista, saem do grupo
  const comLista = F.listaDeFichas(['Fake Necromancer'], [], defs);
  const z = comLista.filter(x => x.chave === 'ficha:zombie 2/2'); assert.equal(z.length, 1); assert.ok(z[0].suaLista);
  assert.ok(comLista.find(x => x.chave === 'ficha:treasure').suaLista, 'ficha do app marcada pela carta da lista');
  assert.ok(comLista.findIndex(x => !x.suaLista) > comLista.findIndex(x => x.chave === 'ficha:zombie 2/2'), 'as das listas vêm primeiro');
  const semLista = F.listaDeFichas([], [], []);
  assert.equal(semLista.filter(x => x.chave === 'ficha:zombie 2/2').length, 0, 'tirou a lista: o Zombie sai daqui (fica no grupo do catálogo)');
  assert.ok(!semLista.find(x => x.chave === 'ficha:treasure').suaLista);
});

/* ---------------- G-257 · relato #20: a ficha de duas faces não empresta a arte da outra face ---------------- */
// Na Scryfall há fichas de duas faces (ex.: "Dinosaur // Treasure"): a busca exata "!Treasure" também as acha, e a
// primeira face é o Dinossauro verde 3/3. A ficha só vale pela face com o nome dela (e a mesma força e resistência).
const { terrenos: TR257 } = loadModules();
const tesouro = (id, arte) => ({ id, name: 'Treasure', type_line: 'Token Artifact — Treasure', layout: 'token', set: 'ltr', collector_number: id, power: null, toughness: null, faces: [], images: { small: arte + '/s', normal: arte + '/n', large: arte + '/l', art: arte } });
const duasFaces = id => ({ id, name: 'Dinosaur // Treasure', type_line: 'Token Creature — Dinosaur // Token Artifact — Treasure', layout: 'double_faced_token', set: 'tlci', collector_number: id, power: '3', toughness: '3', images: null,
  faces: [{ name: 'Dinosaur', type_line: 'Token Creature — Dinosaur', power: '3', toughness: '3', colors: ['G'], oracle_text: 'Trample', images: { small: 'dino/s', normal: 'dino/n', large: 'dino/l', art: 'dino' } },
    { name: 'Treasure', type_line: 'Token Artifact — Treasure', power: null, toughness: null, colors: [], oracle_text: 'T, Sacrifice this token: Add one mana of any color.', images: { small: 'tes2/s', normal: 'tes2/n', large: 'tes2/l', art: 'tes2' } }] });
const TESOURO = { name: 'Treasure', types: ['artifact'], subtypes: ['Treasure'], colors: [] };
const DINO = { name: 'Dinosaur', types: ['creature'], subtypes: ['Dinosaur'], colors: ['G'], power: 3, toughness: 3 };

test('G-257 · faceDaFicha: carta de uma face só com o mesmo nome (e P/T); de duas faces, a face com o nome da ficha', () => {
  const t = tesouro('1', 'tes1');
  assert.equal(C.faceDaFicha(t, TESOURO), t, 'uma face com o mesmo nome: a própria carta');
  assert.equal(C.faceDaFicha({ ...t, name: 'Clue' }, TESOURO), null);
  const f = C.faceDaFicha(duasFaces('d1'), TESOURO);
  assert.deepEqual(J([f.name, f.type_line, f.images.normal, f.power, f.faces.length]), ['Treasure', 'Token Artifact — Treasure', 'tes2/n', null, 0], 'a face de trás, com a arte dela');
  assert.equal(C.faceDaFicha(duasFaces('d1'), DINO).images.normal, 'dino/n', 'o Dinossauro 3/3 pela face da frente');
  assert.equal(C.faceDaFicha(duasFaces('d1'), { ...DINO, power: 1, toughness: 1 }), null, 'força e resistência diferentes: não serve');
  assert.equal(C.faceDaFicha({ ...duasFaces('d1'), faces: [], images: { normal: 'dino/n' } }, TESOURO), null, 'opção de duas faces guardada antes desta leva (sem as faces): não serve');
  assert.equal(C.faceDaFicha(null, TESOURO), null); assert.equal(C.faceDaFicha(t, null), null);
});

test('G-257 · a ficha padrão da mesa: o Tesouro não vem com a arte do Dinossauro, nem pelo que ficou guardado antes', async () => {
  // a busca devolve a de duas faces primeiro (é o que a Scryfall pode devolver): a de uma face vence; sem ela, a face certa
  const store = P.memoryStore();
  let resposta = [duasFaces('d1'), tesouro('1', 'tes1')];
  const scryfall = { async search() { return resposta; }, async collection() { return { found: [], missing: [] }; } };
  const repo = C.createCardRepo({ store, scryfall, now: () => 1000 });
  assert.equal((await repo.fichas([TESOURO])).get('ficha:treasure').images.normal, 'tes1/n', 'a de uma face primeiro');
  const store2 = P.memoryStore(); resposta = [duasFaces('d1')];
  const repo2 = C.createCardRepo({ store: store2, scryfall, now: () => 1000 });
  const t2 = (await repo2.fichas([TESOURO])).get('ficha:treasure');
  assert.deepEqual(J([t2.name, t2.images.normal]), ['Treasure', 'tes2/n'], 'só a de duas faces: vale a face do Tesouro');
  // o que ficou guardado antes desta leva (a carta de duas faces, fixada para sempre): com rede, busca de novo; sem rede, não mostra o Dinossauro
  const store3 = P.memoryStore(); resposta = [tesouro('1', 'tes1')];
  await store3.set('card.ficha:treasure', { ts: 1000, card: { ...duasFaces('d1'), faces: [], images: { normal: 'dino/n' } }, pin: true });
  const repo3 = C.createCardRepo({ store: store3, scryfall, now: () => 2000 });
  const sem = (await repo3.fichas([TESOURO], { onlineOnly: true })).get('ficha:treasure');
  assert.ok(!sem || sem.images.normal !== 'dino/n', 'sem rede: nada de Dinossauro');
  assert.equal((await repo3.fichas([TESOURO])).get('ficha:treasure').images.normal, 'tes1/n', 'com rede: troca pela certa');
  // a escolha guardada antes desta leva (opção de duas faces sem as faces) não vale: a mesa usa o padrão
  await store3.set('fichas.escolhas', { 'ficha:treasure': { id: 'd1', name: 'Dinosaur // Treasure', images: { normal: 'dino/n' }, faces: [] } });
  assert.equal((await repo3.fichas([TESOURO])).get('ficha:treasure').images.normal, 'tes1/n');
});

test('G-257 · Perfil › Fichas e a mesa: opções de arte só da face certa; opção e escolha antigas de duas faces somem', async () => {
  const ops = FX.opcoesDeArte([duasFaces('d1'), tesouro('1', 'tes1'), duasFaces('d2')], FX.OPCOES_MAX, TESOURO);
  assert.deepEqual(J(ops.map(o => [o.id, o.name, o.images.normal])), [['1', 'Treasure', 'tes1/n'], ['d1', 'Treasure', 'tes2/n']], 'uma face primeiro; a de duas faces pela face do Tesouro, sem repetir a mesma arte');
  assert.ok(FX.opcoesDeArte([duasFaces('d1')], FX.OPCOES_MAX, DINO).every(o => o.images.normal === 'dino/n'));
  // guardadas antes desta leva: opções, candidatas da fila e escolha com o nome de duas faces
  const store = P.memoryStore(), velha = { id: 'd9', name: 'Dinosaur // Treasure', images: { small: 'dino/s', normal: 'dino/n' }, faces: [] };
  await store.set('fichas.opcoes', { 'ficha:treasure': [velha, tesouro('1', 'tes1')] });
  await store.set('fichas.opcoes.fila', { 'ficha:treasure': [velha, tesouro('1', 'tes1')] });
  await store.set('fichas.escolhas', { 'ficha:treasure': velha });
  const fx = FX.createFichas({ store, scryfall: { async search() { return []; } }, temRede: () => true });
  const st = await fx.estado();
  assert.deepEqual(J(st.opcoes['ficha:treasure'].map(o => o.id)), ['1']); assert.equal(st.escolhas['ficha:treasure'], undefined);
  assert.ok((await fx.mais(TESOURO)).every(o => !o.name.includes(' // ')), 'pedir mais não traz a velha de volta');
  // a mesa (arte escolhida na partida que já começou) também ignora a escolha antiga
  const naMesa = { name: 'Treasure', type_line: 'Token Artifact — Treasure', layout: 'token', images: { normal: 'padrao/n' } };
  assert.equal(TR257.cartaComFicha(naMesa, { 'ficha:treasure': velha }).images.normal, 'padrao/n');
});
