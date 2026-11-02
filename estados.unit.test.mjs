// J-48 (decisão do dono, 02/11/2026) · contrato da tabela única de estados da carta na mesa (MJ24.4 / MJ24.6).
// Toda marca que o modelo da mesa (`estadoDaCarta`) ou a tela põe numa carta tem uma entrada em ESTADOS, com ícone do
// conjunto do app, família com cor por token e rótulo em português. O motor pode crescer (marcadores novos, estados novos):
// quem acrescentar uma marca sem entrada cai aqui, antes de chegar à tela sem ícone.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules, HTML } from './_load.mjs';
const { mesaUi: U, components: C, table: T } = loadModules();

const fonteDoModelo = () => { const i = HTML.indexOf('function estadoDaCarta('); return HTML.slice(i, HTML.indexOf('\n}', i)); };

test('ESTADOS · toda marca do modelo da mesa tem entrada: ícone do conjunto, família conhecida, rótulo e explicação', () => {
  const marcas = [...new Set([...fonteDoModelo().matchAll(/marcas\.push\(\{ k: '([a-z-]+)'/g)].map(m => m[1]))];
  assert.ok(marcas.length >= 14, 'o modelo marca pelo menos 14 estados: ' + marcas.join(', '));
  for (const k of [...marcas, 'enjoo', 'virada']) assert.ok(U.ESTADOS[k], `a marca "${k}" tem entrada na tabela ESTADOS`);
  for (const [k, e] of Object.entries(U.ESTADOS)) {
    assert.ok(C.ICONES[e.icone], `${k}: ícone "${e.icone}" existe no conjunto do app`);
    assert.ok(U.FAMILIAS.includes(e.familia), `${k}: família "${e.familia}" conhecida`);
    assert.match(e.rotulo, /^[A-ZÀ-Ú+−]/, `${k}: rótulo em português, com maiúscula`);
    assert.ok(e.explica && e.explica.length > 3, `${k}: explicação curta para a folha`);
  }
  for (const k of ['mais', 'menos', 'contador', 'dano', 'enjoo', 'fase']) assert.ok(C.ICONES[k], `ícone ${k} do marcador/dano/enjoo/fase existe`);
});

test('ESTADOS · todo tipo de marcador que o motor usa vira um estado desenhável com número; +1/+1 e −1/−1 nas famílias ganho e perda', () => {
  const tipos = [...new Set([...HTML.matchAll(/counters\.([a-zA-Z0-9]+)\b/g)].map(m => m[1]))].filter(t => !['length'].includes(t));
  assert.ok(tipos.includes('p1p1') && tipos.includes('m1m1') && tipos.includes('lore'), 'tipos lidos do motor: ' + tipos.join(', '));
  for (const tipo of tipos) {
    const e = U.estadoDesenhavel({ k: 'marcador', tipo, qtd: 2, texto: `${tipo} 2` });
    assert.equal(e.qtd, 2, `${tipo}: o número vai junto`);
    assert.ok(C.ICONES[e.icone], `${tipo}: ícone ${e.icone}`);
    assert.ok(U.FAMILIAS.includes(e.familia));
  }
  assert.equal([U.estadoDesenhavel({ k: 'marcador', tipo: 'p1p1', qtd: 3 }).icone, U.estadoDesenhavel({ k: 'marcador', tipo: 'p1p1', qtd: 3 }).familia].join('|'), ['mais', 'ganho'].join('|'));
  assert.equal([U.estadoDesenhavel({ k: 'marcador', tipo: 'm1m1', qtd: 1 }).icone, U.estadoDesenhavel({ k: 'marcador', tipo: 'm1m1', qtd: 1 }).familia, U.estadoDesenhavel({ k: 'marcador', tipo: 'm1m1', qtd: 1 }).rotulo].join('|'), ['menos', 'perda', '−1/−1'].join('|'));
  assert.equal([U.estadoDesenhavel({ k: 'marcador', tipo: 'lore', qtd: 2, texto: 'capítulo II' }).icone, U.estadoDesenhavel({ k: 'marcador', tipo: 'lore', qtd: 2, texto: 'capítulo II' }).rotulo].join('|'), ['contador', 'capítulo II'].join('|'));
  assert.equal([U.estadoDesenhavel({ k: 'dano', qtd: 3, texto: '3 dano' }).familia, U.estadoDesenhavel({ k: 'dano', qtd: 3, texto: '3 dano' }).rotulo].join('|'), ['perda', '3 dano'].join('|'));
});

test('ESTADOS · marca sem entrada nunca some (vira neutro com o texto dela) e a ordem de relance põe combate e alvo antes de enjoo e marcadores', () => {
  const e = U.estadoDesenhavel({ k: 'inventada', texto: 'algo' });
  assert.equal([e.familia, e.rotulo, e.icone].join(' '), 'neutro algo info');
  const est = { sick: true, marcas: [{ k: 'marcador', tipo: 'p1p1', qtd: 1, texto: '+1/+1' }, { k: 'dano', qtd: 1, texto: '1 dano' }, { k: 'ataca', texto: 'ataca', icone: 'espada' }, { k: 'ficha', texto: 'ficha' }] };
  assert.equal(U.estadosDaCarta(est, {}).map(x => x.k).join(' '), 'ataca enjoo marcador dano ficha');
  // sem o modelo (carta de lista): o que a carta traz, mais as etiquetas da tela
  assert.equal(U.estadosDaCarta(null, { sick: true, counters: { p1p1: 2 }, damage: 1 }, { tags: ['virada'] }).map(x => x.k + ':' + x.qtd).join(' '), 'enjoo:null marcador:2 dano:1 virada:null');
});

test('ESTADOS · o estado real de uma partida só produz marcas com entrada (enjoo, marcador, anexo, dano) — a tabela cobre o modelo de ponta a ponta', () => {
  // monta a mesa pelas fixtures do projeto
  return import('./fixtures.mjs').then(F => {
    const t = T.createTable(T.buildSetup({ format: 'pauper', seed: 7, cards: F.CARDS, seats: [{ name: 'Você', deck: { entries: F.PAUPER_DECK } }, { name: 'Goldfish', dummy: true }] }));
    t.act({ t: 'keep', p: 0, bottom: [] });
    const s = t.state;
    for (const oid of [...s.zones[0].library].slice(0, 12)) { try { t.act({ t: 'move', p: 0, oid, to: 'battlefield' }); } catch (e) { /* o modo não move */ } }
    let vistos = 0;
    for (const oid of t.state.zones[0].battlefield) { const est = T.estadoDaCarta(t.state, t.state.objects[oid]); for (const m of est.marcas) { vistos++; assert.ok(U.ESTADOS[m.k], `marca "${m.k}" da partida tem entrada`); } if (est.sick) vistos++; }
    assert.ok(vistos > 0, 'a partida produziu estados');
  });
});
