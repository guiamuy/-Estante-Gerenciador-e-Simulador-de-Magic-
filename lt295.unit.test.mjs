// M-616 · rotina Motor contínuo · CR 107.14 (energia) e 608.2d (a quantia é escolhida na resolução): "you may pay any amount of {E}"
// deixa de servir só ao dano (M-405, Galvanic Discharge) e passa a ser o teto de uma varredura por valor de mana. Efeito novo
// `energia_varre`: com energia, a resolução pergunta quanto pagar (de 0 até o que o jogador tem); sem energia, paga 0 e a varredura
// ainda leva o que tem valor de mana 0 (fichas, artefatos de {0}). A varredura é a de sempre (destroy_all: tudo sai junto,
// indestrutível fica). Wrath of the Skies (65 listas Modern na coleta de 10/11/2026) passa a jogar pelo script lido,
// com o texto da API da Scryfall (cobertura/modern.json do ramo catalogo de 10/11/2026, igual ao de 08/11, guardado em .listas/oficiais-revisadas.json).
// As partidas falham no motor anterior (o leitor não lia a frase e a carta não tinha script).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadModules } from './_load.mjs';

const M = loadModules(), E = M.engine, S = M.scripts, SF = M.scryfall;
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const N = 'Wrath of the Skies';
const ira = () => { const o = OF.find(x => x.name === N); assert.ok(o, `${N} em .listas/oficiais-revisadas.json`);
  return SF.normalizeCard({ object: 'card', layout: 'normal', ...o, cmc: 2, colors: ['W'] }); };

test(`M-616 · ${N} joga no app: texto da Scryfall de 10/11 guardado, assinatura de APROVADAS igual e cobertura completa`, () => {
  const c = ira(), o = OF.find(x => x.name === N);
  assert.match(o.fonte, /api\.scryfall\.com/); assert.equal(o.consulta, '2026-11-10');
  assert.equal(o.oracle_text, 'You get X {E} (energy counters), then you may pay any amount of {E}. Destroy each artifact, creature, and enchantment with mana value less than or equal to the amount of {E} paid this way.');
  assert.ok(S.APROVADAS[N], 'em APROVADAS'); assert.equal(S.APROVADAS[N].leva, 'M-616');
  assert.equal(S.APROVADAS[N].texto, S.assinaturaRevisao(c), 'a assinatura é a do texto revisado');
  assert.equal(S.coverage(c, S.SCRIPTS, N).level, 'completo');
  const sc = S.scriptLido(c); assert.ok(sc, 'joga pelo script lido');
  assert.deepEqual(JSON.parse(JSON.stringify(sc.effects)), [{ do: 'energia', amount: { per: 'x' } }, { do: 'energia_varre', types: ['artifact', 'creature', 'enchantment'] }]);
});

test('M-616 · o leitor só lê a varredura pela energia paga com tipos conhecidos (frase de outra forma fica sem ler)', () => {
  const le = t => M.leitor.ler(SF.normalizeCard({ name: 'Teste', type_line: 'Sorcery', mana_cost: '{X}{W}', oracle_text: t }));
  const r = le('You get X {E}, then you may pay any amount of {E}. Destroy each creature and planeswalker with mana value less than or equal to the amount of {E} paid this way.');
  assert.equal(r.completa, true); assert.deepEqual(JSON.parse(JSON.stringify(r.script.effects[1])), { do: 'energia_varre', types: ['creature', 'planeswalker'] });
  assert.equal(le('You get X {E}, then you may pay any amount of {E}. Destroy each land with mana value less than or equal to the amount of {E} paid this way.').completa, false, 'terreno não está no padrão');
});

// ── partidas pelo caminho do app (a carta sem script à mão) ──
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: [...mana_cost.matchAll(/\{([^}]+)\}/g)].reduce((n, [, x]) => n + (/^\d+$/.test(x) ? +x : 1), 0), keywords: [], oracle_text: '', colors: [], ...extra });
const C = {
  [N]: ira(),
  Plains: c0('Plains', 'Basic Land — Plains', '', { oracle_text: '({T}: Add {W}.)' }),
  Forest: c0('Forest', 'Basic Land — Forest', '', { oracle_text: '({T}: Add {G}.)' }),
  Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2', colors: ['G'] }),
  Gigante: c0('Gigante', 'Creature — Giant', '{2}{G}', { power: '3', toughness: '3', colors: ['G'] }),
  Ornamento: c0('Ornamento', 'Artifact', '{0}'),
  Aura: c0('Aura', 'Enchantment', '{1}{W}', { colors: ['W'] }),
  Escudo: c0('Escudo', 'Artifact Creature — Golem', '{1}', { power: '1', toughness: '1', oracle_text: 'Indestructible', keywords: ['Indestructible'] }),
};
const ex = { example: { target: 'none', expect: { selfLife: 0 } } };
const J = x => JSON.parse(JSON.stringify(x));
const act = (s, a) => { const r = E.apply(s, a); if (r.error) throw new Error(JSON.stringify(r.error)); return r.state; };
function passaAte(s, fim, max = 400) {
  for (let i = 0; i < max && !fim(s); i++) { const pd = s.pending;
    if (pd && pd.kind === 'discard' && pd.reason !== 'effect') s = act(s, { t: 'discard', p: pd.p, oid: s.zones[pd.p].hand[0] });
    else if (pd && pd.kind === 'attackers') s = act(s, { t: 'attack', p: pd.p, attackers: [] });
    else if (pd && pd.kind === 'blockers') s = act(s, { t: 'block', p: pd.p, blocks: [] });
    else if (pd) return s; else s = act(s, { t: 'pass', p: s.turn.priority }); }
  return s;
}
function poe(s, p, name, zone = 'battlefield') {
  s = J(s);
  const from = ['library', 'hand', 'graveyard'].map(z => s.zones[p][z]).find(z => z.some(o => s.objects[o].name === name));
  if (!from) throw new Error(name + ' ausente');
  const oid = from.find(o => s.objects[o].name === name); from.splice(from.indexOf(oid), 1); s.zones[p][zone].push(oid);
  Object.assign(s.objects[oid], { zone, sick: false, tapped: false, controller: p }); return [s, oid];
}
const limpaMao = (s, p) => { s = J(s); for (const oid of s.zones[p].hand.slice()) { s.zones[p].hand.splice(s.zones[p].hand.indexOf(oid), 1); s.zones[p].library.unshift(oid); s.objects[oid].zone = 'library'; } return s; };
/** A no próprio main1 com a Ira na mão e `planicies` Planícies; B com `deB` no campo; A com `deA` no campo e `energia` guardada. */
function mesa({ deA = [], deB = [], planicies = 2, energia = 0 } = {}) {
  const scripts = Object.fromEntries(['Urso', 'Gigante', 'Ornamento', 'Aura', 'Escudo'].map(n => [n, { name: n, ...(n === 'Escudo' ? { self: { keywords: ['indestructible'] } } : {}), ...ex }]));
  const d = ns => ns.map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 616, mode: 'full', cards: C, scripts, first: 0,
    players: [{ name: 'A', deck: d([N, 'Plains', 'Urso', 'Ornamento']) }, { name: 'B', deck: d(['Urso', 'Gigante', 'Ornamento', 'Aura', 'Escudo', 'Forest']) }] });
  assert.ok(!S.SCRIPTS[N] && s.facts[N] && s.facts[N].script, `${N} joga pelo script lido`);
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  s = limpaMao(s, 0); s = limpaMao(s, 1);
  let w; [s, w] = poe(s, 0, N, 'hand'); for (let i = 0; i < planicies; i++) [s] = poe(s, 0, 'Plains');
  const a = {}, b = {}; for (const n of deA) [s, a[n]] = poe(s, 0, n); for (const n of deB) [s, b[n]] = poe(s, 1, n);
  s = J(s); s.players[0].energia = energia;
  return { s, w, a, b };
}
const resolve = s => { for (let i = 0; i < 40 && (s.stack.length || s.pending); i++) { if (s.pending) return s; s = act(s, { t: 'pass', p: s.turn.priority }); } return s; };
const naMesa = (s, oid) => !!s.objects[oid] && s.objects[oid].zone === 'battlefield';
const conjura = (s, w, x) => resolve(act(s, { t: 'cast', p: 0, oid: w, x }));

test('M-616 · X = 2: ganha 2 de energia, paga 2 e destrói cada artefato, criatura e encantamento de valor 2 ou menos, dos dois lados', () => {
  let { s, w, a, b } = mesa({ planicies: 4, deA: ['Urso'], deB: ['Urso', 'Gigante', 'Ornamento', 'Aura', 'Forest'] });
  s = conjura(s, w, 2);
  assert.ok(s.pending && s.pending.kind === 'quantia', 'a resolução pergunta quanto pagar');
  assert.equal(s.pending.p, 0); assert.equal(s.pending.min, 0); assert.equal(s.pending.max, 2, 'até a energia que A tem (os 2 que ganhou)');
  assert.deepEqual(J(E.legalActions(s, 0).filter(x => x.t === 'quantia').map(x => x.n)), [0, 1, 2]);
  s = resolve(act(s, { t: 'quantia', p: 0, n: 2 }));
  assert.equal(s.players[0].energia || 0, 0, 'a energia paga saiu');
  for (const [nome, oid] of [['Urso de A', a.Urso], ['Urso de B', b.Urso], ['Ornamento', b.Ornamento], ['Aura', b.Aura]]) assert.equal(naMesa(s, oid), false, `${nome} foi destruído`);
  assert.equal(naMesa(s, b.Gigante), true, 'o Gigante (valor 3) fica');
  assert.equal(naMesa(s, b.Forest), true, 'terreno não é varrido');
  assert.ok(s.zones[0].graveyard.includes(w), 'a Ira vai para o cemitério depois de resolver');
});

test('M-616 · pagar menos do que tem: paga 0 com 2 de energia e só o que vale 0 sai; a energia que sobrou fica', () => {
  let { s, w, b } = mesa({ planicies: 4, deB: ['Urso', 'Ornamento'] });
  s = conjura(s, w, 2);
  s = resolve(act(s, { t: 'quantia', p: 0, n: 0 }));
  assert.equal(s.players[0].energia, 2, 'os 2 de energia ficam com A');
  assert.equal(naMesa(s, b.Ornamento), false, 'o artefato de {0} sai'); assert.equal(naMesa(s, b.Urso), true, 'o Urso (valor 2) fica');
});

test('M-616 · sem energia nenhuma (X = 0): não há o que perguntar, paga 0 e a varredura leva só o que vale 0', () => {
  let { s, w, b } = mesa({ planicies: 2, deB: ['Urso', 'Ornamento'] });
  s = conjura(s, w, 0);
  assert.ok(!s.pending, 'nada a escolher'); assert.equal(s.stack.length, 0);
  assert.equal(naMesa(s, b.Ornamento), false, 'o artefato de {0} sai'); assert.equal(naMesa(s, b.Urso), true, 'o Urso fica');
});

test('M-616 · a energia guardada de antes conta: X = 0 com 3 guardados, paga 3 e o Gigante (valor 3) sai; indestrutível fica', () => {
  let { s, w, b } = mesa({ planicies: 2, energia: 3, deB: ['Gigante', 'Escudo'] });
  s = conjura(s, w, 0);
  assert.equal(s.pending && s.pending.max, 3, 'pode pagar até os 3 guardados');
  assert.throws(() => act(s, { t: 'quantia', p: 0, n: 4 }), /escolha um número de 0 a 3/);
  s = resolve(act(s, { t: 'quantia', p: 0, n: 3 }));
  assert.equal(s.players[0].energia, 0);
  assert.equal(naMesa(s, b.Gigante), false, 'o Gigante foi destruído'); assert.equal(naMesa(s, b.Escudo), true, 'o indestrutível fica');
});

test('M-616 · a carta explicada no app: "X marcadores de energia" (não "[object Object]") e a varredura com os tipos por extenso', () => {
  assert.equal(M.table.descreveEfeito({ do: 'energia', amount: { per: 'x' } }), 'você ganha X marcadores de energia');
  assert.equal(M.table.descreveEfeito({ do: 'energia', amount: 2 }), 'você ganha 2 marcadores de energia', 'o caminho de antes não muda');
  assert.equal(M.table.descreveEfeito({ do: 'energia_varre', types: ['artifact', 'creature', 'enchantment'] }), 'paga quanta energia quiser e destrói cada artefato, criatura e encantamento com valor de mana até o que pagou');
});
