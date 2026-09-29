// Homologação (28/09/2026) · cada achado da revisão independente vira teste antes da correção.
// Os números seguem o relatório da revisão (H1…H15).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
import { CARDS, COMBAT_CARDS, combatSetup } from './fixtures.mjs';
const { engine: E, table: T, scanner: X, filter: F, platform: P, decks: D, cards: C, offline: O } = loadModules();
const J = x => JSON.parse(JSON.stringify(x));

/* ---- H1 · bloquear com ficha que morreria não pode travar a prévia ---- */
function inicio(seed) { let s = E.createGame(combatSetup(seed, { manaCheck: false })); for (let p = 0; p < 2; p++) s = E.apply(s, { t: 'keep', p, bottom: [] }).state; return s; }
function poe(s, p, name) { s = J(s); const src = ['library', 'hand'].map(z => s.zones[p][z]).find(z => z.some(o => s.objects[o].name === name)); const oid = src.find(o => s.objects[o].name === name); src.splice(src.indexOf(oid), 1); s.zones[p].battlefield.push(oid); Object.assign(s.objects[oid], { zone: 'battlefield', sick: false, tapped: false }); return [s, oid]; }
const ag = (s, a) => E.apply(s, a).state;
const ate = (s, step) => { for (let i = 0; i < 60 && s.turn.step !== step; i++) s = ag(s, { t: 'pass', p: s.turn.priority }); return s; };
test('H1 · prévia de bloqueio com ficha que morre (bloqueando ou atacando) devolve resultado, e bate com o real', () => {
  for (const fichaDe of ['defensor', 'atacante']) {
    let s = ate(inicio(12), 'main1');
    const a = s.turn.active, d = 1 - a; let k, e;
    [s, k] = poe(s, a, 'Leech Knight'); [s, e] = poe(s, d, 'Sky Pike');
    s = J(s); s.objects[fichaDe === 'defensor' ? e : k].token = true;
    s = ate(s, 'combat_attackers');
    s = ag(s, { t: 'attack', p: a, attackers: [k] });
    s = ate(s, 'combat_blockers');
    const pv = E.previewCombat(s, [[e, k]]);
    assert.ok(pv, `${fichaDe}: a prévia existe (antes: null → "bloqueio inválido")`);
    s = ag(s, { t: 'block', p: d, blocks: [[e, k]] });
    s = ate(s, 'combat_end');
    const vivos = [k, e].filter(o => s.objects[o] && s.objects[o].zone === 'battlefield');
    assert.deepEqual(J([...pv.died].sort()), J(['Leech Knight', 'Sky Pike'].filter((n, i) => ![k, e][i] || !vivos.includes([k, e][i])).sort()), `${fichaDe}: quem morre previsto = real`);
  }
});

/* ---- H2 · o link do recorte guarda todos os critérios, inclusive "&" no texto ---- */
test('H2 · link do recorte: vários critérios e texto com & sobrevivem à ida e volta pelo endereço', () => {
  const f = F.novoFiltro({ texto: 'Minsc & Boo', cores: ['R'], edicoes: ['m10', ''], cmcMax: 3 });
  const hash = '#/colecao' + F.linkDoFiltro(f);
  const qs = new URLSearchParams(hash.split('?')[1]);
  const volta = F.decodificaFiltro(qs.get('f'));
  assert.deepEqual(J(volta), J(f));
  assert.equal(F.linkDoFiltro(F.novoFiltro()), '', 'sem filtro, sem ?f=');
  // link antigo (sem codificar, um critério só) continua abrindo
  assert.equal(F.decodificaFiltro(new URLSearchParams('f=t=scry').get('f')).texto, 'scry');
});

/* ---- H3 · no automático, tirar a carta e pôr outra no mesmo lugar lê de novo ---- */
test('H3 · detector: carta, quadro vazio, outra carta no mesmo lugar → lê de novo', () => {
  const W = 80, H = 60;
  const quadro = comCarta => { const g = new Uint8ClampedArray(W * H).fill(30); if (comCarta) for (let y = 8; y < 8 + 44; y++) for (let x = 25; x < 25 + 32; x++) g[y * W + x] = 170 + ((x * 7 + y * 13) % 30); return g; };
  const det = X.criaDetector({ quadros: 3 });
  let prontos = 0;
  for (let i = 0; i < 4; i++) if (det.quadro(quadro(true), W, H).pronto) prontos++;
  assert.equal(prontos, 1, 'a primeira carta foi lida uma vez');
  for (let i = 0; i < 4; i++) det.quadro(quadro(false), W, H);
  let segunda = 0;
  for (let i = 0; i < 5; i++) if (det.quadro(quadro(true), W, H).pronto) segunda++;
  assert.equal(segunda, 1, 'depois do quadro vazio, a próxima carta no mesmo lugar é lida');
  // e a mesma carta parada, sem sair do quadro, continua sem repetir
  for (let i = 0; i < 5; i++) assert.equal(det.quadro(quadro(true), W, H).pronto, false);
});

/* ---- H4 · desfazer do lote depois de tirar pelo "−" não devolve chave crua ---- */
test('H4 · lote: tirar um item pelo − ou × tira também do histórico do desfazer', async () => {
  const lot = X.createLot({ store: P.memoryStore() });
  const k1 = await lot.add('Island', 1);
  const k2 = await lot.add('Lightning Bolt', 1, { set: 'm10', number: '146' });
  await lot.setQty(k2, 0);
  const u = await lot.undo();
  assert.equal(u, 'Island', 'desfaz o que ainda existe, e devolve o nome, não a chave');
  assert.equal(await lot.total(), 0);
  const k3 = await lot.add('Counterspell', 1, { set: 'mh2', number: '267' });
  await lot.remove(k3);
  assert.equal(await lot.undo(), null, 'nada para desfazer');
});

/* ---- H9 · terrenos só empilham quando são iguais de verdade ---- */
test('H9 · pilha de terrenos: virados e desvirados separados; terreno com marcador ou anexo fica sozinho', () => {
  const s = { objects: {
    a: { oid: 'a', name: 'Forest', tapped: false, counters: {} }, b: { oid: 'b', name: 'Forest', tapped: true, counters: {} },
    c: { oid: 'c', name: 'Forest', tapped: false, counters: {} }, d: { oid: 'd', name: 'Forest', tapped: false, counters: { p1p1: 1 } },
    e: { oid: 'e', name: 'Forest', tapped: false, counters: {} }, aura: { oid: 'aura', name: 'Utopia Sprawl', attachedTo: 'e', counters: {} } },
    zones: [{ battlefield: ['a', 'b', 'c', 'd', 'e', 'aura'] }] };
  const pilhas = T.agrupaTerrenos(s, ['a', 'b', 'c', 'd', 'e']);
  assert.deepEqual(J(pilhas.map(p => [p.name, p.total, p.viradas])), [['Forest', 2, 0], ['Forest', 1, 1], ['Forest', 1, 0], ['Forest', 1, 0]]);
});

/* ---- H12 · o resumo do turno conta ficha que morreu e o que foi exilado ---- */
test('H12 · resumo do turno: ficha que sumiu e carta exilada aparecem', () => {
  const s = { players: [{ name: 'A', life: 20 }, { name: 'B', life: 20 }], objects: { x: { oid: 'x', name: 'Swords Target', zone: 'exile' } } };
  const inicio = { turno: 2, ativo: 0, vida: [20, 20], compradas: [0, 0], campo: [['tok', 'x'], []], nomes: { tok: 'Goblin', x: 'Swords Target' } };
  const fim = { turno: 2, ativo: 0, vida: [20, 20], compradas: [0, 0], campo: [[], []], nomes: {} };
  const r = T.resumoDoTurnoMesa(inicio, fim, s);
  assert.deepEqual(J(r.linhas), ['Saiu do campo: Goblin (ficha), Swords Target (exílio)']);
});

/* ---- H13 · ímpeto dado por efeito tira o selo de enjoo ---- */
test('H13 · enjoo respeita ímpeto temporário', () => {
  const facts = {}; for (const [n, c] of Object.entries({ ...CARDS, ...COMBAT_CARDS })) facts[n] = E.cardFacts(c);
  const s = { facts, objects: {}, stack: [], zones: [{ battlefield: ['o'] }, { battlefield: [] }], players: [{}, {}], turn: {} };
  s.objects.o = { oid: 'o', name: 'Sky Pike', zone: 'battlefield', controller: 0, sick: true, counters: {}, damage: 0, tempKeywords: ['haste'] };
  assert.equal(T.estadoDaCarta(s, s.objects.o).sick, false);
});

/* ---- H11 · o guardião não roda duas passadas da coleção ao mesmo tempo ---- */
test('H11 · guardar a coleção em curso: a segunda chamada espera e uma só passada extra roda no fim', async () => {
  let emCurso = 0, maximo = 0, passadas = 0;
  const cardRepo = { pin: async n => { emCurso++; maximo = Math.max(maximo, emCurso); passadas++; await new Promise(r => setTimeout(r, 20)); emCurso--; return { fixadas: n, faltando: [] }; }, byNames: async () => new Map(), pinned: async () => 0 };
  const collection = { entries: async () => [{ name: 'Island' }], onChange() { return () => {}; } };
  const k = O.createOfflineKeeper({ cardRepo, decks: { list: async () => [] }, collection, images: null, names: null, ocr: null, store: null, online: () => true });
  await Promise.all([k.guardarColecao(), k.guardarColecao(), k.guardarColecao()]);
  assert.equal(maximo, 1, 'nunca duas ao mesmo tempo');
  assert.ok(passadas <= 2, `no máximo a passada em curso + uma de recuperação (${passadas})`);
});
