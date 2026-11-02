// J-40 · relato #45 · a masmorra na mesa: o modelo puro do mapa (níveis, colunas, caminhos, quem está onde, por onde passou,
// próximas, iniciativa) e o texto de cada sala por extenso. A tela (selo e folha) é provada no e2e.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';

const { mesaUi: M, scripts: S } = loadModules();
const J = x => JSON.parse(JSON.stringify(x)); // o módulo roda em outro contexto (vm): compara pelo valor
const reg = (...linhas) => linhas.map(texto => ({ texto }));
const estado = (a, b, iniciativa = null) => ({ iniciativa, players: [{ name: 'Você', dungeon: a }, { name: 'Shark', dungeon: b }] });

test('J-40 · sem masmorra nem iniciativa não há selo; com a iniciativa e fora da masmorra, o mapa é o da Cidade Baixa sem sala', () => {
  assert.equal(M.modeloDaMasmorra(estado(null, null), 0, 0, []), null);
  const m = M.modeloDaMasmorra(estado(null, null, 0), 0, 0, []);
  assert.equal(m.titulo, 'Cidade Baixa');
  assert.equal(m.dono.sala, null); assert.equal(m.dono.iniciativa, true);
  assert.deepEqual(J(m.salas.filter(r => r.estado === 'proxima').map(r => r.id)), ['entrada-secreta'], 'a primeira sala é a próxima');
  assert.ok(m.textoDaIniciativa && /aventure-se na Cidade Baixa/.test(m.textoDaIniciativa));
  assert.equal(M.modeloDaMasmorra(estado({ name: 'Nada', room: 'x' }, null), 0, 0, []).erro, true, 'masmorra fora do mapa: erro, não desenho inventado');
});

test('J-40 · Cidade Baixa no Poço Perdido (o caso do relato): cinco níveis, três colunas, caminho percorrido, próximas, o outro jogador na Entrada', () => {
  const st = estado({ name: 'Undercity', room: 'poco-perdido', done: false }, { name: 'Undercity', room: 'entrada-secreta', done: false }, 1);
  const r = reg('Você se aventurou na masmorra: Cidade Baixa — Entrada Secreta', 'Shark se aventurou na masmorra: Cidade Baixa — Entrada Secreta', 'Você se aventurou na masmorra: Cidade Baixa — Poço Perdido');
  const m = M.modeloDaMasmorra(st, 0, 0, r);
  assert.equal(m.niveis, 5); assert.equal(m.colunas, 3); assert.equal(m.salas.length, 9);
  const por = Object.fromEntries(m.salas.map(x => [x.id, x]));
  assert.deepEqual([por['entrada-secreta'].nivel, por.forja.nivel, por['poco-perdido'].nivel, por.arena.nivel, por.arquivos.nivel, por.trono.nivel], [0, 1, 1, 2, 3, 4]);
  // colunas em doze avos: nada se sobrepõe na mesma fileira e tudo cabe na grade
  for (let n = 0; n < m.niveis; n++) { const l = m.salas.filter(x => x.nivel === n).sort((a, b) => a.coluna - b.coluna);
    l.forEach((x, k) => { assert.ok(x.coluna >= 0 && x.coluna + m.larg <= 12, x.id); if (k) assert.ok(x.coluna >= l[k - 1].coluna + m.larg, `${x.id} sobrepõe ${l[k - 1].id}`); }); }
  assert.equal(por['poco-perdido'].estado, 'atual'); assert.equal(por['entrada-secreta'].estado, 'atual', 'o Shark está na Entrada: sala atual dele');
  assert.deepEqual(J(m.salas.filter(x => x.estado === 'proxima').map(x => x.id).sort()), ['arena', 'esconderijo']);
  assert.deepEqual(J(por['poco-perdido'].aqui), [{ nome: 'Você', marca: 'eu' }]); assert.deepEqual(J(por['entrada-secreta'].aqui), [{ nome: 'Shark', marca: 'oponente' }]);
  assert.deepEqual(J(m.vias.filter(v => v.feita).map(v => `${v.de}>${v.para}`)), ['entrada-secreta>poco-perdido'], 'o caminho percorrido acende');
  assert.equal(m.iniciativa.nome, 'Shark'); assert.equal(m.iniciativa.marca, 'oponente');
  assert.equal(por['poco-perdido'].texto, 'Vidência 2.');
  assert.equal(M.falaDaMasmorra(m), 'Masmorra: Cidade Baixa, sala Poço Perdido');
  assert.equal(M.falaDaMasmorra(M.modeloDaMasmorra(st, 1, 0, r)), 'Masmorra: Cidade Baixa, sala Entrada Secreta. Tem a iniciativa');
});

test('J-40 · o caminho só vale se cada passo é uma ligação do mapa; registro incoerente mostra só a sala atual', () => {
  const d = S.dungeonByName('Undercity');
  assert.deepEqual(J(M.caminhoNaMasmorra(reg('Você se aventurou na masmorra: Cidade Baixa — Entrada Secreta', 'Você se aventurou na masmorra: Cidade Baixa — Forja'), 'Você', d, 'forja')), ['entrada-secreta', 'forja']);
  assert.deepEqual(J(M.caminhoNaMasmorra(reg('Você se aventurou na masmorra: Cidade Baixa — Entrada Secreta', 'Você se aventurou na masmorra: Cidade Baixa — Arquivos'), 'Você', d, 'arquivos')), ['arquivos']);
  assert.deepEqual(J(M.caminhoNaMasmorra([], 'Você', d, 'forja')), ['forja']);
  // completou e entrou de novo: o caminho recomeça na primeira sala
  const de2 = reg('Você se aventurou na masmorra: Cidade Baixa — Entrada Secreta', 'Você se aventurou na masmorra: Cidade Baixa — Forja', 'Você se aventurou na masmorra: Cidade Baixa — Entrada Secreta');
  assert.deepEqual(J(M.caminhoNaMasmorra(de2, 'Você', d, 'entrada-secreta')), ['entrada-secreta']);
});

test('J-40 · toda sala das quatro masmorras tem o efeito por extenso, e o mapa cabe na grade sem sobrepor', () => {
  for (const d of S.DUNGEONS) {
    const textos = M.TEXTO_DAS_SALAS[d.name]; assert.ok(textos, d.name);
    for (const r of d.rooms) assert.ok(textos[r.id] && textos[r.id].length > 5, `${d.name} · ${r.id} sem texto`);
    const m = M.modeloDaMasmorra({ iniciativa: null, players: [{ name: 'A', dungeon: { name: d.name, room: d.rooms[0].id, done: false } }] }, 0, 0, []);
    for (let n = 0; n < m.niveis; n++) { const l = m.salas.filter(x => x.nivel === n).sort((a, b) => a.coluna - b.coluna);
      l.forEach((x, k) => { assert.ok(x.coluna >= 0 && x.coluna + m.larg <= 12, `${d.name} · ${x.id}`); if (k) assert.ok(x.coluna >= l[k - 1].coluna + m.larg, `${d.name} · ${x.id} sobrepõe`); }); }
  }
  const tumba = M.modeloDaMasmorra({ players: [{ name: 'A', dungeon: { name: 'Tomb of Annihilation', room: 'berco', done: true }, dungeonsDone: 1 }] }, 0, 0, []);
  assert.equal(tumba.dono.completa, true); assert.equal(tumba.dono.sala, null); assert.equal(tumba.dono.feitas, 1);
  assert.equal(M.falaDaMasmorra(tumba), 'Masmorra: Tumba da Aniquilação completa');
});
