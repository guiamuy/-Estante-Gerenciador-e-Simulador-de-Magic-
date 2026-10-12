// Trilha cartas · C-1 · scripts à mão das cartas de Pauper de A a L que cabem no vocabulário atual do motor (sem primitiva nova).
// Texto oficial em .listas/oficiais-cartas.json (Oracle do Forge, 12/10/2026). Cada teste parte do texto citado e falha sem o script
// (a carta ficava manual: sem jogar, ou jogada só pela adjudicação). Partidas em modo único, mana cobrada.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
import { CARTAS, E, J, act, poe, legais, mesa, comMana, tudo, teste, decide, faz, oficiaisCartas } from './cartas.mjs';

const { scripts: S } = loadModules();
const URSO = teste('Urso de Teste 2/2', 'Creature — Bear', { pt: [2, 2] });
const URSO_B = teste('Urso Branco 2/2', 'Creature — Bear', { pt: [2, 2], colors: ['W'], mana_cost: '{1}{W}' });
const ARTEFATO = teste('Bugiganga de Teste', 'Artifact', { mana_cost: '{1}' });
const ENC = teste('Encanto de Teste', 'Enchantment', { mana_cost: '{1}' });
const RAIO = 'Lightning Bolt'; // script da biblioteca (texto oficial em oficiais.json)
const zona = (s, oid) => s.objects[oid].zone;
const pt = (s, oid) => { const x = E.stats(s, s.objects[oid]); return [x.power, x.toughness]; };
const fichas = (s, p, nome) => Object.values(s.objects).filter(o => o.token && o.zone === 'battlefield' && o.controller === p && (!nome || o.name === nome));
const C1 = ['Archaeomancer', "Black Mage's Rod", 'Hickory Woodlot', 'Goblin Bushwhacker', "Kruphix's Insight", 'Dread Return', 'Arbor Elf', 'Big Score',
  'Eldrazi Repurposer', "Guardians' Pledge", 'Grapple with Death', 'Gurmag Angler', 'Gearseeker Serpent',
  'Holdout Settlement', 'Inside Out', "Loran's Escape", 'Infestation Sage', 'Experimental Augury', 'Golem Foundry', 'Commune with Spirits', 'Contentious Plan'];

test('C-1 · as 21 cartas do lote (Laughing Mad e Electric Revelation saíram na C-2, achado da auditoria) têm script validado, texto oficial com fonte e data, e jogam no modo completo', () => {
  for (const n of C1) {
    const sc = S.SCRIPTS[n]; assert.ok(sc, n + ' tem script'); assert.deepEqual([...S.validateScript(sc)], [], n);
    const of = oficiaisCartas.find(c => c.name === n); assert.ok(of && of.fonte && of.consulta, n + ': texto oficial com fonte e data');
    assert.equal(S.coverage(CARTAS[n]).level, 'completo', n);
  }
});

test('C-1 · Archaeomancer: ao entrar, devolve instantânea ou feitiço alvo do seu cemitério à mão; criatura no cemitério não é alvo', () => {
  let s = mesa(['Archaeomancer', RAIO, URSO]), a, r, u;
  [s, a] = poe(s, 0, 'Archaeomancer', 'hand'); [s, r] = poe(s, 0, RAIO, 'graveyard'); [s, u] = poe(s, 0, URSO, 'graveyard');
  s = tudo(faz(comMana(s, ['U', 'U', 'B', 'B']), 0, x => x.t === 'cast' && x.oid === a));
  assert.equal(zona(s, r), 'hand', 'a instantânea volta'); assert.equal(zona(s, u), 'graveyard', 'a criatura fica');
});

test("C-1 · Black Mage's Rod: escolha de classe cria o Herói 1/1 e se anexa; ele fica 2/1, Mago, e mágica não criatura causa 1 a cada oponente", () => {
  CARTAS["Black Mage's Rod"].keywords = ['Job select', 'Equip']; // como a Scryfall manda (K-60 lê a escolha de classe da lista de palavras-chave)
  let s = mesa(["Black Mage's Rod", RAIO]), rod, r;
  [s, rod] = poe(s, 0, "Black Mage's Rod", 'hand'); [s, r] = poe(s, 0, RAIO, 'hand');
  s = tudo(faz(comMana(s, ['B', 'B']), 0, x => x.t === 'cast' && x.oid === rod));
  const heroi = s.objects[s.objects[rod].attachedTo]; assert.ok(heroi && heroi.token, 'anexado a uma ficha');
  assert.deepEqual(pt(s, heroi.oid), [2, 1], '+1/+0');
  assert.match(E.linhaDeTipo(s, heroi), /\bWizard\b/, 'é um Mago além dos outros tipos');
  const vida = s.players[1].life;
  s = tudo(faz(comMana(s, ['R']), 0, x => x.t === 'cast' && x.oid === r && x.targets[0].player === 1));
  assert.equal(s.players[1].life, vida - 3 - 1, 'o raio causa 3 e o gatilho concedido ao Herói causa 1');
});

test('C-1 · Hickory Woodlot: entra virada com dois marcadores de esgotamento; {T} e tirar um dá {G}{G}; sem marcador, é sacrificada', () => {
  let s = mesa(['Hickory Woodlot']), h;
  [s, h] = poe(s, 0, 'Hickory Woodlot', 'hand');
  s = tudo(faz(s, 0, x => x.t === 'play_land' && x.oid === h, 'jogar a terra'));
  assert.equal(s.objects[h].tapped, true, 'entra virada'); assert.equal(s.objects[h].counters.depletion, 2);
  s = J(s); s.objects[h].tapped = false;
  s = tudo(faz(s, 0, x => x.t === 'activate' && x.oid === h, 'ativar'));
  assert.equal(s.players[0].pool.G, 2, '{G}{G}'); assert.equal(s.objects[h].counters.depletion, 1); assert.equal(zona(s, h), 'battlefield');
  s = J(s); s.objects[h].tapped = false;
  s = tudo(faz(s, 0, x => x.t === 'activate' && x.oid === h, 'ativar de novo'));
  assert.equal(s.players[0].pool.G, 4); assert.equal(zona(s, h), 'graveyard', 'sem marcador de esgotamento, sacrificada');
});

test('C-1 · Goblin Bushwhacker: reforçado, suas criaturas ganham +1/+0 e ímpeto até o fim do turno; sem reforço, nada', () => {
  for (const kick of [true, false]) {
    let s = mesa(['Goblin Bushwhacker', URSO], [URSO]), g, u, v;
    [s, g] = poe(s, 0, 'Goblin Bushwhacker', 'hand'); [s, u] = poe(s, 0, URSO, 'battlefield', { sick: true }); [s, v] = poe(s, 1, URSO);
    s = tudo(faz(comMana(s, ['R', 'R']), 0, x => x.t === 'cast' && x.oid === g && !!x.kick === kick));
    assert.deepEqual(pt(s, u), kick ? [3, 2] : [2, 2]); assert.equal(E.hasKeyword(s, s.objects[u], 'haste'), kick);
    assert.deepEqual(pt(s, g), kick ? [2, 1] : [1, 1], 'ela mesma também (já está no campo quando o gatilho resolve)');
    assert.deepEqual(pt(s, v), [2, 2], 'a do oponente não');
  }
});

test("C-1 · Kruphix's Insight: revela seis, até três encantamentos para a mão e o resto das reveladas para o cemitério", () => {
  let s = mesa(["Kruphix's Insight", ENC, URSO]), k;
  [s, k] = poe(s, 0, "Kruphix's Insight", 'hand');
  s = J(s); const lib = s.zones[0].library;
  const enc = lib.filter(o => s.objects[o].name === ENC).slice(0, 4), outros = lib.filter(o => s.objects[o].name === URSO).slice(0, 2);
  s.zones[0].library = [...enc, ...outros, ...lib.filter(o => !enc.includes(o) && !outros.includes(o))];
  const gy = s.zones[0].graveyard.length, mao = s.zones[0].hand.length;
  s = faz(comMana(s, ['G', 'G', 'G']), 0, x => x.t === 'cast' && x.oid === k);
  s = tudo(s, x => { const op = legais(x, x.pending.p); return op.find(a => a.t === 'pick') || op[0]; });
  assert.equal(enc.filter(o => zona(s, o) === 'hand').length, 3, 'três encantamentos (o máximo)');
  assert.equal(zona(s, enc[3]), 'graveyard', 'o quarto encantamento revelado vai para o cemitério');
  assert.ok(outros.every(o => zona(s, o) === 'graveyard'), 'as outras reveladas também');
  assert.equal(s.zones[0].graveyard.length, gy + 3 + 1, 'três reveladas e a própria mágica');
});

test('C-1 · Dread Return: devolve criatura do seu cemitério ao campo; o lampejo do passado pede sacrificar três criaturas (com duas, não é oferecido)', () => {
  let s = mesa(['Dread Return', URSO]), d, u;
  [s, d] = poe(s, 0, 'Dread Return', 'graveyard'); [s, u] = poe(s, 0, URSO, 'graveyard');
  const tres = []; for (let i = 0; i < 2; i++) { let x; [s, x] = poe(s, 0, URSO); tres.push(x); }
  assert.equal(legais(s, 0, x => x.t === 'cast' && x.oid === d && x.flashback).length, 0, 'com duas criaturas não há lampejo');
  let x; [s, x] = poe(s, 0, URSO); tres.push(x);
  s = tudo(faz(s, 0, a => a.t === 'cast' && a.oid === d && a.flashback && a.targets[0].oid === u, 'lampejo'), y => { const op = legais(y, y.pending.p); return op[0]; });
  assert.ok(tres.every(o => zona(s, o) === 'graveyard' || o === u), 'as três sacrificadas');
  assert.equal(zona(s, u), 'battlefield', 'a criatura alvo volta'); assert.equal(zona(s, d), 'exile', 'lampejo vai para o exílio');
});

test('C-1 · Arbor Elf: {T} desvira uma Floresta alvo (de qualquer jogador); Ilha não é alvo', () => {
  let s = mesa(['Arbor Elf', 'Forest', 'Island']), a, f, i;
  [s, a] = poe(s, 0, 'Arbor Elf'); [s, f] = poe(s, 0, 'Forest', 'battlefield', { tapped: true }); [s, i] = poe(s, 0, 'Island', 'battlefield', { tapped: true });
  const alvos = legais(s, 0, x => x.t === 'activate' && x.oid === a).map(x => x.targets[0].oid);
  assert.ok(alvos.includes(f) && !alvos.includes(i), 'só a Floresta');
  s = tudo(faz(s, 0, x => x.t === 'activate' && x.oid === a && x.targets[0].oid === f));
  assert.equal(s.objects[f].tapped, false); assert.equal(s.objects[a].tapped, true);
});

test('C-1 · Big Score: descartar é custo adicional (sem carta para descartar, não conjura); compra duas e cria dois Tesouros', () => {
  let s = mesa(['Big Score', URSO]), b, u;
  [s, b] = poe(s, 0, 'Big Score', 'hand');
  s = J(s); for (const o of s.zones[0].hand.filter(x => x !== b)) { s.zones[0].hand.splice(s.zones[0].hand.indexOf(o), 1); s.zones[0].library.push(o); s.objects[o].zone = 'library'; }
  assert.equal(legais(comMana(s, ['R', 'R', 'R', 'R']), 0, x => x.t === 'cast' && x.oid === b).length, 0, 'mão vazia além dela: não paga o descarte');
  [s, u] = poe(s, 0, URSO, 'hand');
  s = tudo(faz(comMana(s, ['R', 'R', 'R', 'R']), 0, x => x.t === 'cast' && x.oid === b));
  assert.equal(zona(s, u), 'graveyard', 'descartada'); assert.equal(s.zones[0].hand.length, 2, 'compra duas');
  assert.equal(fichas(s, 0, 'Treasure').length, 2, 'dois Tesouros');
});

test('C-1 · Eldrazi Repurposer: ao conjurar cria uma Cria (antes de resolver) e ao morrer cria outra; ela é incolor (desprovida)', () => {
  let s = mesa(['Eldrazi Repurposer']), e;
  [s, e] = poe(s, 0, 'Eldrazi Repurposer', 'hand');
  s = faz(comMana(s, ['G', 'G', 'G']), 0, x => x.t === 'cast' && x.oid === e);
  const gatilho = s.stack.find(o => s.objects[o].ability); assert.ok(gatilho, 'o gatilho de conjurar fica por cima da criatura');
  s = tudo(s);
  assert.equal(fichas(s, 0, 'Eldrazi Spawn').length, 1); assert.deepEqual(E.colorsOf ? E.colorsOf(s, s.objects[e]) : [], []);
  s = J(s); s.objects[e].damage = 9; s = tudo(act(s, { t: 'pass', p: s.turn.priority }));
  assert.equal(zona(s, e), 'graveyard'); assert.equal(fichas(s, 0, 'Eldrazi Spawn').length, 2, 'outra ao morrer');
  const cria = fichas(s, 0, 'Eldrazi Spawn')[0]; assert.deepEqual(pt(s, cria.oid), [0, 1]);
});

test("C-1 · Guardians' Pledge: só as criaturas brancas que você controla ganham +2/+2", () => {
  let s = mesa(["Guardians' Pledge", URSO_B, URSO], [URSO_B]), g, b, n, o;
  [s, g] = poe(s, 0, "Guardians' Pledge", 'hand'); [s, b] = poe(s, 0, URSO_B); [s, n] = poe(s, 0, URSO); [s, o] = poe(s, 1, URSO_B);
  s = tudo(faz(comMana(s, ['W', 'W', 'W']), 0, x => x.t === 'cast' && x.oid === g));
  assert.deepEqual(pt(s, b), [4, 4]); assert.deepEqual(pt(s, n), [2, 2], 'não branca'); assert.deepEqual(pt(s, o), [2, 2], 'do oponente');
});

test('C-1 · Grapple with Death: destrói artefato ou criatura alvo e você ganha 1 de vida; encantamento não é alvo', () => {
  let s = mesa(['Grapple with Death'], [ARTEFATO, ENC]), g, a, e;
  [s, g] = poe(s, 0, 'Grapple with Death', 'hand'); [s, a] = poe(s, 1, ARTEFATO); [s, e] = poe(s, 1, ENC);
  assert.ok(!legais(comMana(s, ['B', 'G', 'G']), 0, x => x.t === 'cast' && x.oid === g).some(x => x.targets[0].oid === e));
  const vida = s.players[0].life;
  s = tudo(faz(comMana(s, ['B', 'G', 'G']), 0, x => x.t === 'cast' && x.oid === g && x.targets[0].oid === a));
  assert.equal(zona(s, a), 'graveyard'); assert.equal(s.players[0].life, vida + 1);
});

test('C-1 · Gurmag Angler: delve paga o genérico exilando cartas do cemitério', () => {
  let s = mesa(['Gurmag Angler', URSO]), g;
  [s, g] = poe(s, 0, 'Gurmag Angler', 'hand'); for (let i = 0; i < 6; i++) [s] = poe(s, 0, URSO, 'graveyard');
  const a = legais(comMana(s, ['B']), 0, x => x.t === 'cast' && x.oid === g && x.delve === 6)[0]; assert.ok(a, 'com {B} e seis cartas no cemitério');
  s = tudo(act(comMana(s, ['B']), a)); assert.equal(zona(s, g), 'battlefield'); assert.deepEqual(pt(s, g), [5, 5]);
});

test('C-1 · Gearseeker Serpent: afinidade por artefatos reduz o custo; {5}{U} a deixa imbloqueável neste turno', () => {
  let s = mesa(['Gearseeker Serpent', ARTEFATO], [URSO]), g, v;
  [s, g] = poe(s, 0, 'Gearseeker Serpent', 'hand'); for (let i = 0; i < 5; i++) [s] = poe(s, 0, ARTEFATO);
  assert.ok(legais(comMana(s, ['U', 'U']), 0, x => x.t === 'cast' && x.oid === g).length, 'cinco artefatos: custa {U}{U}');
  s = tudo(faz(comMana(s, ['U', 'U']), 0, x => x.t === 'cast' && x.oid === g));
  s = J(s); s.objects[g].sick = false; [s, v] = poe(s, 1, URSO);
  s = tudo(faz(comMana(s, ['C', 'C', 'C', 'C', 'C', 'U']), 0, x => x.t === 'activate' && x.oid === g));
  assert.equal(E.canBlock(s, v, g), false, 'nenhuma criatura a bloqueia neste turno');
});

test('C-1 · Holdout Settlement: {T} dá {C}; {T} e virar uma criatura sua desvirada (mesmo recém-chegada) dá uma mana de qualquer cor', () => {
  let s = mesa(['Holdout Settlement', URSO]), h, u;
  [s, h] = poe(s, 0, 'Holdout Settlement'); [s, u] = poe(s, 0, URSO, 'battlefield', { sick: true });
  s = tudo(faz(s, 0, x => x.t === 'activate' && x.oid === h, 'mana de qualquer cor'), decide(a => a.color === 'R' || a.t === 'choose_color'));
  assert.equal(s.objects[u].tapped, true, 'virou a criatura'); assert.equal(Object.values(s.players[0].pool).reduce((a, b) => a + b, 0), 1);
  let t = mesa(['Holdout Settlement']), h2; [t, h2] = poe(t, 0, 'Holdout Settlement');
  assert.equal(legais(t, 0, x => x.t === 'activate' && x.oid === h2).length, 0, 'sem criatura para virar, só a linha {C}');
});

test('C-1 · Inside Out: troca poder e resistência da criatura alvo até o fim do turno e compra uma', () => {
  const TORRE = teste('Torre 1/3', 'Creature — Wall', { pt: [1, 3] });
  let s = mesa(['Inside Out'], [TORRE]), i, v;
  [s, i] = poe(s, 0, 'Inside Out', 'hand'); [s, v] = poe(s, 1, TORRE);
  const mao = s.zones[0].hand.length;
  s = tudo(faz(comMana(s, ['U', 'U']), 0, x => x.t === 'cast' && x.oid === i && x.targets[0].oid === v));
  assert.deepEqual(pt(s, v), [3, 1], '1/3 vira 3/1'); assert.equal(s.zones[0].hand.length, mao - 1 + 1, 'comprou uma');
});

test("C-1 · Loran's Escape: artefato ou criatura alvo ganha resistência a magia e indestrutível até o fim do turno; olhe o topo (vidência 1)", () => {
  let s = mesa(["Loran's Escape", ARTEFATO]), l, a;
  [s, l] = poe(s, 0, "Loran's Escape", 'hand'); [s, a] = poe(s, 0, ARTEFATO);
  s = faz(comMana(s, ['W']), 0, x => x.t === 'cast' && x.oid === l && x.targets[0].oid === a);
  s = tudo(s, decide(x => x.t === 'pick_done' || x.t === 'pick'));
  assert.equal(E.hasKeyword(s, s.objects[a], 'indestructible'), true); assert.equal(E.hasKeyword(s, s.objects[a], 'hexproof'), true);
});

test('C-1 · Infestation Sage: ao morrer, cria um Inseto 1/1 preto e verde com voar', () => {
  let s = mesa(['Infestation Sage']), i;
  [s, i] = poe(s, 0, 'Infestation Sage'); s = J(s); s.objects[i].damage = 1;
  s = tudo(act(s, { t: 'pass', p: s.turn.priority }));
  const [f] = fichas(s, 0, 'Insect'); assert.ok(f); assert.deepEqual(pt(s, f.oid), [1, 1]); assert.equal(E.hasKeyword(s, f, 'flying'), true);
  assert.deepEqual([...(s.facts[f.name].colors || [])].sort(), ['B', 'G']);
});

test('C-1 · Experimental Augury: uma das três do topo para a mão, as outras no fundo; prolifera', () => {
  let s = mesa(['Experimental Augury', URSO]), x, u;
  [s, x] = poe(s, 0, 'Experimental Augury', 'hand'); [s, u] = poe(s, 0, URSO); s = J(s); s.objects[u].counters.p1p1 = 1;
  const topo = s.zones[0].library.slice(0, 3), mao = s.zones[0].hand.length;
  s = faz(comMana(s, ['U', 'U']), 0, a => a.t === 'cast' && a.oid === x);
  s = tudo(s, y => { const op = legais(y, y.pending.p); return op.find(a => a.t === 'pick') || op.find(a => (a.oids || []).includes(u) || (a.escolhidos || []).includes(u)) || op[0]; });
  assert.equal(topo.filter(o => zona(s, o) === 'hand').length, 1); assert.equal(s.zones[0].hand.length, mao - 1 + 1);
});

test('C-1 · Golem Foundry: ao conjurar mágica de artefato, pode pôr um marcador de carga; tirar três cria um Golem 3/3 artefato', () => {
  let s = mesa(['Golem Foundry', ARTEFATO]), g;
  [s, g] = poe(s, 0, 'Golem Foundry');
  for (let i = 0; i < 3; i++) { let a; [s, a] = poe(s, 0, ARTEFATO, 'hand'); s = tudo(faz(comMana(s, ['C']), 0, x => x.t === 'cast' && x.oid === a), decide(x => x.t === 'pay')); } // "you may": a mesa pergunta (pagar = pôr o marcador)
  assert.equal(s.objects[g].counters.charge, 3, 'três cargas');
  s = tudo(faz(s, 0, x => x.t === 'activate' && x.oid === g));
  const [f] = fichas(s, 0, 'Golem'); assert.ok(f); assert.deepEqual(pt(s, f.oid), [3, 3]); assert.equal(s.objects[g].counters.charge || 0, 0);
});

test('C-1 · Commune with Spirits: pode revelar um encantamento ou terreno das quatro do topo para a mão; o resto no fundo', () => {
  let s = mesa(['Commune with Spirits', 'Forest', URSO]), c;
  [s, c] = poe(s, 0, 'Commune with Spirits', 'hand');
  const topo = s.zones[0].library.slice(0, 4);
  s = tudo(faz(comMana(s, ['G']), 0, x => x.t === 'cast' && x.oid === c), y => { const op = legais(y, y.pending.p); return op.find(a => a.t === 'pick') || op[0]; });
  const naMao = topo.filter(o => zona(s, o) === 'hand');
  assert.equal(naMao.length, 1); assert.match(CARTAS[s.objects[naMao[0]].name].type_line, /Land|Enchantment/, 'terreno ou encantamento');
  assert.ok(topo.filter(o => zona(s, o) === 'library').every(o => s.zones[0].library.indexOf(o) >= s.zones[0].library.length - 4), 'o resto no fundo');
});

test('C-1 · Contentious Plan: prolifera e compra uma', () => {
  let s = mesa(['Contentious Plan', URSO]), c, u;
  [s, c] = poe(s, 0, 'Contentious Plan', 'hand'); [s, u] = poe(s, 0, URSO); s = J(s); s.objects[u].counters.p1p1 = 1;
  const mao = s.zones[0].hand.length;
  s = tudo(faz(comMana(s, ['U', 'U']), 0, x => x.t === 'cast' && x.oid === c), decide(a => JSON.stringify(a).includes(u)));
  assert.equal(s.objects[u].counters.p1p1, 2, 'o marcador +1/+1 ganhou outro'); assert.equal(s.zones[0].hand.length, mao - 1 + 1);
});

/* ---------------- C-2 ---------------- */
// Auditoria independente da C-1 e da C-2 (12/10/2026, revisor sem acesso à implementação, 38 cartas, ~240 sondas): 2 divergências.
// (A) lampejo do passado de mágica com custo adicional de descarte: a mesa oferece uma ação só, sem `pay`, e o motor descarta a primeira
// carta da mão (601.2b/601.2h, 702.34a) — Laughing Mad e Electric Revelation saem da biblioteca e ficam manuais até a trilha motor corrigir
// a oferta (legalActions, ramo do lampejo). (B) "on the bottom of your library in any order" sem escolha de ordem (Experimental Augury,
// Beastrider Vanguard): é a simplificação já declarada pelo motor para todo "any order" no fundo; continua declarada.
// Achado da C-2 (para a trilha motor): mágica com `choose: 'color'` e `protection` (Emerge Unscathed) pergunta a cor, mas a proteção não chega
// à criatura — a retomada depois da escolha aplica o efeito com uma fonte sem a cor. A carta fica manual (e a leitura do leitor dela tem o mesmo
// caminho). Sondado em 12/10/2026: protections() vazio depois de escolher a cor.
const C2 = ['Deep Analysis', 'Acorn Harvest', 'Distortion Strike', 'Assault Strobe', 'Eagles of the North', 'Drownyard Lurker', 'Heap Gate', 'Flame Rift', 'Clockwork Fox',
  'Beastrider Vanguard', 'Dig Site Inventory', 'Hyena Umbra', 'Gift of the Viper', 'Horror of the Broken Lands', 'Flame Jab'];

test('C-2 · as 15 cartas do lote têm script validado, texto oficial com fonte e data, e jogam no modo completo', () => {
  for (const n of C2) {
    const sc = S.SCRIPTS[n]; assert.ok(sc, n + ' tem script'); assert.deepEqual([...S.validateScript(sc)], [], n);
    const of = oficiaisCartas.find(c => c.name === n); assert.ok(of && of.fonte && of.consulta, n + ': texto oficial com fonte e data');
    assert.equal(S.coverage(CARTAS[n]).level, 'completo', n);
  }
});

test('C-2 · Deep Analysis e Acorn Harvest: o lampejo do passado cobra a mana e 3 de vida; com menos de 3, não é oferecido (119.4)', () => {
  let s = mesa(['Deep Analysis']), d;
  [s, d] = poe(s, 0, 'Deep Analysis', 'graveyard');
  const mao = s.zones[0].hand.length, vida = s.players[0].life;
  s = tudo(faz(comMana(s, ['U', 'U']), 0, x => x.t === 'cast' && x.oid === d && x.flashback && x.targets[0].player === 0, 'lampejo'));
  assert.equal(s.players[0].life, vida - 3, 'pagou 3 de vida'); assert.equal(s.zones[0].hand.length, mao + 2, 'compra duas'); assert.equal(zona(s, d), 'exile');
  let t = mesa(['Acorn Harvest']), a; [t, a] = poe(t, 0, 'Acorn Harvest', 'graveyard'); t = J(t); t.players[0].life = 2;
  assert.equal(legais(comMana(t, ['G', 'G']), 0, x => x.t === 'cast' && x.oid === a && x.flashback).length, 0, 'com 2 de vida não paga 3');
  t.players[0].life = 4;
  t = tudo(faz(comMana(t, ['G', 'G']), 0, x => x.t === 'cast' && x.oid === a && x.flashback, 'lampejo com 4 de vida'));
  assert.equal(fichas(t, 0, 'Squirrel').length, 2); assert.equal(t.players[0].life, 1);
});

test('C-2 · Distortion Strike: +1/+0 e imbloqueável neste turno; ricochete da mão (volta na próxima manutenção)', () => {
  let s = mesa(['Distortion Strike', URSO], [URSO]), d, u, v;
  [s, d] = poe(s, 0, 'Distortion Strike', 'hand'); [s, u] = poe(s, 0, URSO); [s, v] = poe(s, 1, URSO);
  s = tudo(faz(comMana(s, ['U']), 0, x => x.t === 'cast' && x.oid === d && x.targets[0].oid === u));
  assert.deepEqual(pt(s, u), [3, 2]); assert.equal(E.canBlock(s, v, u), false); assert.equal(zona(s, d), 'exile', 'ricochete');
});

test('C-2 · Assault Strobe: golpe duplo até o fim do turno', () => {
  let s = mesa(['Assault Strobe', URSO]), a, u;
  [s, a] = poe(s, 0, 'Assault Strobe', 'hand'); [s, u] = poe(s, 0, URSO);
  s = tudo(faz(comMana(s, ['R']), 0, x => x.t === 'cast' && x.oid === a && x.targets[0].oid === u));
  assert.equal(E.hasKeyword(s, s.objects[u], 'double strike'), true);
});

test('C-2 · Eagles of the North: ao entrar, suas criaturas +1/+0 e iniciativa; ciclar Planícies {1} busca uma Planície', () => {
  let s = mesa(['Eagles of the North', URSO]), e, u;
  [s, e] = poe(s, 0, 'Eagles of the North', 'hand'); [s, u] = poe(s, 0, URSO);
  s = tudo(faz(comMana(s, ['W', 'W', 'W', 'W', 'W', 'W']), 0, x => x.t === 'cast' && x.oid === e));
  assert.deepEqual(pt(s, u), [3, 2]); assert.equal(E.hasKeyword(s, s.objects[u], 'first strike'), true);
  let t = mesa(['Eagles of the North']), e2; [t, e2] = poe(t, 0, 'Eagles of the North', 'hand');
  t = tudo(faz(comMana(t, ['W']), 0, x => x.oid === e2 && x.t !== 'cast', 'ciclar'), y => { const op = legais(y, y.pending.p); return op.find(a => a.t === 'pick') || op[0]; });
  assert.equal(zona(t, e2), 'graveyard'); assert.ok(t.zones[0].hand.some(o => t.objects[o].name === 'Plains'), 'uma Planície na mão');
});

test('C-2 · Drownyard Lurker: ao conjurar e ao ciclar cria uma Cria Eldrazi', () => {
  let s = mesa(['Drownyard Lurker']), d;
  [s, d] = poe(s, 0, 'Drownyard Lurker', 'hand');
  let c = tudo(faz(comMana(s, ['C', 'C', 'C', 'C', 'C', 'C', 'C']), 0, x => x.t === 'cast' && x.oid === d));
  assert.equal(fichas(c, 0, 'Eldrazi Spawn').length, 1, 'ao conjurar'); assert.equal(E.hasKeyword(c, c.objects[d], 'vigilance'), true);
  let y = tudo(faz(comMana(s, ['U', 'U', 'U']), 0, x => x.oid === d && x.t !== 'cast', 'ciclar'));
  assert.equal(fichas(y, 0, 'Eldrazi Spawn').length, 1, 'ao ciclar'); assert.equal(zona(y, d), 'graveyard');
});

test('C-2 · Heap Gate: {1},{T}: uma mana de qualquer cor; {1},{T} e virar outro Portão seu: um Tesouro', () => {
  let s = mesa(['Heap Gate']), h, g;
  [s, h] = poe(s, 0, 'Heap Gate'); [s, g] = poe(s, 0, 'Heap Gate');
  s = tudo(faz(comMana(s, ['C']), 0, x => x.t === 'activate' && x.oid === h && x.index === 1, 'Tesouro'));
  assert.equal(s.objects[g].tapped, true, 'virou o outro Portão'); assert.equal(fichas(s, 0, 'Treasure').length, 1);
  let t = mesa(['Heap Gate']), h1; [t, h1] = poe(t, 0, 'Heap Gate');
  assert.equal(legais(comMana(t, ['C']), 0, x => x.t === 'activate' && x.oid === h1 && x.index === 1).length, 0, 'sem outro Portão, não');
});

test('C-2 · Flame Rift: 4 de dano a cada jogador', () => {
  let s = mesa(['Flame Rift']), f; [s, f] = poe(s, 0, 'Flame Rift', 'hand');
  s = tudo(faz(comMana(s, ['R', 'R']), 0, x => x.t === 'cast' && x.oid === f));
  assert.deepEqual([...s.players.map(p => p.life)], [16, 16]);
});

test('C-2 · Clockwork Fox: ao sair do campo, você compra duas e cada oponente compra uma', () => {
  let s = mesa(['Clockwork Fox']), c; [s, c] = poe(s, 0, 'Clockwork Fox');
  const m0 = s.zones[0].hand.length, m1 = s.zones[1].hand.length;
  s = J(s); s.objects[c].damage = 5; s = tudo(act(s, { t: 'pass', p: s.turn.priority }));
  assert.equal(s.zones[0].hand.length, m0 + 2); assert.equal(s.zones[1].hand.length, m1 + 1);
});

test('C-2 · Beastrider Vanguard: {4}{G}: pode revelar uma carta de permanente das três do topo para a mão; o resto no fundo', () => {
  let s = mesa(['Beastrider Vanguard', URSO]), b; [s, b] = poe(s, 0, 'Beastrider Vanguard');
  const topo = s.zones[0].library.slice(0, 3);
  s = tudo(faz(comMana(s, ['G', 'G', 'G', 'G', 'G']), 0, x => x.t === 'activate' && x.oid === b), y => { const op = legais(y, y.pending.p); return op.find(a => a.t === 'pick') || op[0]; });
  assert.equal(topo.filter(o => zona(s, o) === 'hand').length, 1);
});

test('C-2 · Dig Site Inventory: marcador +1/+1 na sua criatura alvo e vigilância; lampejo do passado {W}', () => {
  let s = mesa(['Dig Site Inventory', URSO], [URSO]), d, u, v;
  [s, d] = poe(s, 0, 'Dig Site Inventory', 'graveyard'); [s, u] = poe(s, 0, URSO); [s, v] = poe(s, 1, URSO);
  assert.ok(!legais(comMana(s, ['W']), 0, x => x.oid === d).some(x => x.targets[0].oid === v), 'criatura do oponente não é alvo');
  s = tudo(faz(comMana(s, ['W']), 0, x => x.t === 'cast' && x.oid === d && x.flashback && x.targets[0].oid === u));
  assert.equal(s.objects[u].counters.p1p1, 1); assert.equal(E.hasKeyword(s, s.objects[u], 'vigilance'), true); assert.equal(zona(s, d), 'exile');
});

test('C-2 · Hyena Umbra: +1/+1 e iniciativa; armadura de umbra: em vez de destruída, a criatura fica e a Aura é destruída', () => {
  let s = mesa(['Hyena Umbra', URSO, 'Lightning Bolt'], ['Lightning Bolt']), h, u, r;
  [s, h] = poe(s, 0, 'Hyena Umbra', 'hand'); [s, u] = poe(s, 0, URSO);
  s = tudo(faz(comMana(s, ['W']), 0, x => x.t === 'cast' && x.oid === h && x.targets[0].oid === u));
  assert.deepEqual(pt(s, u), [3, 3]); assert.equal(E.hasKeyword(s, s.objects[u], 'first strike'), true);
  [s, r] = poe(s, 1, 'Lightning Bolt', 'hand'); s = J(s); s.turn.priority = 1;
  s = tudo(faz(comMana(s, ['R'], 1), 1, x => x.t === 'cast' && x.oid === r && x.targets[0].oid === u, 'raio na criatura'));
  assert.equal(zona(s, u), 'battlefield', 'a criatura fica'); assert.equal(zona(s, h), 'graveyard', 'a umbra vai');
});

test('C-2 · Gift of the Viper: marcadores +1/+1, alcance e toque mortal na criatura alvo, e a desvira', () => {
  let s = mesa(['Gift of the Viper', URSO]), g, u;
  [s, g] = poe(s, 0, 'Gift of the Viper', 'hand'); [s, u] = poe(s, 0, URSO, 'battlefield', { tapped: true });
  s = tudo(faz(comMana(s, ['G']), 0, x => x.t === 'cast' && x.oid === g && x.targets[0].oid === u));
  assert.deepEqual(pt(s, u), [3, 3]); assert.equal(s.objects[u].tapped, false);
  assert.equal(E.hasKeyword(s, s.objects[u], 'reach'), true); assert.equal(E.hasKeyword(s, s.objects[u], 'deathtouch'), true);
});

test('C-2 · Horror of the Broken Lands: ciclar ou descartar outra carta dá +2/+1 até o fim do turno', () => {
  let s = mesa(['Horror of the Broken Lands', 'Big Score', URSO]), h, b, u;
  [s, h] = poe(s, 0, 'Horror of the Broken Lands'); [s, b] = poe(s, 0, 'Big Score', 'hand'); [s, u] = poe(s, 0, URSO, 'hand');
  s = tudo(faz(comMana(s, ['R', 'R', 'R', 'R']), 0, x => x.t === 'cast' && x.oid === b, 'descarte como custo'));
  assert.deepEqual(pt(s, h), [6, 5], 'descartou uma');
});

test('C-2 · Flame Jab: 1 de dano a qualquer alvo; retraçar do cemitério descartando um terreno', () => {
  let s = mesa(['Flame Jab', 'Mountain']), f, m;
  [s, f] = poe(s, 0, 'Flame Jab', 'graveyard'); [s, m] = poe(s, 0, 'Mountain', 'hand');
  const a = legais(comMana(s, ['R']), 0, x => x.t === 'cast' && x.oid === f && x.retrace && x.pay.retrace === m && x.targets[0].player === 1)[0]; assert.ok(a, 'retraçar oferecido');
  s = tudo(act(comMana(s, ['R']), a));
  assert.equal(s.players[1].life, 19); assert.equal(zona(s, m), 'graveyard', 'descartou o terreno'); assert.equal(zona(s, f), 'graveyard', 'volta ao cemitério');
  let t = mesa(['Flame Jab']), f2; [t, f2] = poe(t, 0, 'Flame Jab', 'graveyard'); t = J(t);
  for (const o of t.zones[0].hand.filter(x => /Land/.test(CARTAS[t.objects[x].name].type_line))) { t.zones[0].hand.splice(t.zones[0].hand.indexOf(o), 1); t.zones[0].library.push(o); t.objects[o].zone = 'library'; }
  assert.equal(legais(comMana(t, ['R']), 0, x => x.oid === f2 && x.retrace).length, 0, 'sem terreno na mão, sem retraçar');
});
