// M-621 · rotina Motor contínuo · CR 118.9 + 111.1: o custo alternativo "You may sacrifice a nontoken <cor> creature rather than pay this
// spell's mana cost" (o ciclo Flare de Modern Horizons 3) — só criatura da cor, só a que não é ficha, sacrificada ao conjurar (601.2h), a
// mágica segue com o valor de mana impresso (118.9c). E o édito "Each opponent sacrifices a creature or planeswalker with the greatest
// mana value among creatures and planeswalkers they control" (701.21a + 202.3): cada oponente só pode escolher entre as de maior valor de
// mana; empate, o jogador escolhe entre elas. Flare of Malice (45 listas Modern; a única pendência de 29 delas depois da M-617/619/620) e
// Flare of Denial (6 Modern, 26 Commander) jogam pelo script lido, com o texto da API da Scryfall da coleta de 11/11/2026 (cobertura do
// ramo catalogo, guardado em .listas/oficiais-revisadas.json). As partidas falham no motor anterior (as duas cartas não eram lidas).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadModules } from './_load.mjs';

const M = loadModules(), E = M.engine, S = M.scripts, SF = M.scryfall;
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const MAL = 'Flare of Malice', DEN = 'Flare of Denial';
const oficial = (n, cmc, cor) => { const o = OF.find(x => x.name === n); assert.ok(o, `${n} em .listas/oficiais-revisadas.json`);
  return SF.normalizeCard({ object: 'card', layout: 'normal', ...o, cmc, colors: [cor] }); };

for (const [n, cmc, cor, texto] of [
  [MAL, 4, 'B', "You may sacrifice a nontoken black creature rather than pay this spell's mana cost.\nEach opponent sacrifices a creature or planeswalker with the greatest mana value among creatures and planeswalkers they control."],
  [DEN, 3, 'U', "You may sacrifice a nontoken blue creature rather than pay this spell's mana cost.\nCounter target spell."]]) {
  test(`M-621 · ${n} joga no app: texto da Scryfall de 11/11 guardado, assinatura de APROVADAS igual e cobertura completa`, () => {
    const c = oficial(n, cmc, cor), o = OF.find(x => x.name === n);
    assert.match(o.fonte, /api\.scryfall\.com/); assert.equal(o.consulta, '2026-11-11'); assert.equal(o.oracle_text, texto);
    assert.ok(S.APROVADAS[n], 'em APROVADAS'); assert.equal(S.APROVADAS[n].leva, 'M-621');
    assert.equal(S.APROVADAS[n].texto, S.assinaturaRevisao(c), 'a assinatura é a do texto revisado');
    assert.equal(S.coverage(c, S.SCRIPTS, n).level, 'completo'); assert.ok(S.scriptLido(c), 'joga pelo script lido');
    const sc = S.leitura(c).script;
    assert.deepEqual(J(sc.alt[0].cost), { sacrificeOther: { types: ['creature'], color: cor, naoFicha: true } }, '118.9: criatura da cor, que não seja ficha');
  });
}

// ── partidas pelo caminho do app (as duas sem script à mão) ──
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: [...mana_cost.matchAll(/\{([^}]+)\}/g)].reduce((n, [, x]) => n + (/^\d+$/.test(x) ? +x : 1), 0), keywords: [], oracle_text: '', colors: [], ...extra });
const C = {
  [MAL]: oficial(MAL, 4, 'B'), [DEN]: oficial(DEN, 3, 'U'),
  Swamp: c0('Swamp', 'Basic Land — Swamp', '', { oracle_text: '({T}: Add {B}.)' }),
  Forest: c0('Forest', 'Basic Land — Forest', '', { oracle_text: '({T}: Add {G}.)' }),
  Zumbi: c0('Zumbi', 'Creature — Zombie', '{1}{B}', { power: '2', toughness: '2', colors: ['B'] }),
  Fada: c0('Fada', 'Creature — Faerie', '{1}{U}', { power: '1', toughness: '1', colors: ['U'] }),
  Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2', colors: ['G'] }),
  Gigante: c0('Gigante', 'Creature — Giant', '{4}{G}', { power: '5', toughness: '5', colors: ['G'] }),
  Colosso: c0('Colosso', 'Creature — Giant', '{3}{G}{G}', { power: '6', toughness: '6', colors: ['G'] }),
  Heroi: c0('Heroi', 'Legendary Planeswalker — Test', '{3}', { loyalty: '3' }),
  Mestre: c0('Mestre', 'Legendary Planeswalker — Test', '{4}{G}{G}', { loyalty: '4' }),
};
const ex = { example: { target: 'none', expect: { selfLife: 0 } } };
const J = x => JSON.parse(JSON.stringify(x));
const act = (s, a) => { const r = E.apply(s, a); if (r.error) throw new Error(JSON.stringify(r.error)); return r.state; };
const legais = (s, p, f = () => true) => E.legalActions(s, p).filter(f);
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
  Object.assign(s.objects[oid], { zone, sick: false, tapped: false, controller: p });
  const lealdade = (s.facts[name] || {}).loyalty; if (zone === 'battlefield' && lealdade != null) s.objects[oid].counters = { ...(s.objects[oid].counters || {}), loyalty: +lealdade }; // 306.5b
  return [s, oid];
}
const limpaMao = (s, p) => { s = J(s); for (const oid of s.zones[p].hand.slice()) { s.zones[p].hand.splice(s.zones[p].hand.indexOf(oid), 1); s.zones[p].library.unshift(oid); s.objects[oid].zone = 'library'; } return s; };
const CRIATURAS = ['Zumbi', 'Fada', 'Urso', 'Gigante', 'Colosso', 'Heroi', 'Mestre'];
/** A no próprio main1 com `carta` na mão, sem terreno (só o custo alternativo paga), o que `deA` pede no campo; B com `deB`. */
function mesa(carta, deA, deB) {
  const scripts = Object.fromEntries(CRIATURAS.map(n => [n, { name: n, ...ex }]));
  const d = ns => ns.map(name => ({ name, qty: 6, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 621, mode: 'full', cards: C, scripts, first: 0,
    players: [{ name: 'A', deck: d([MAL, DEN, 'Swamp', 'Zumbi', 'Fada', 'Urso']) }, { name: 'B', deck: d(['Swamp', 'Forest', ...CRIATURAS]) }] });
  for (const n of [].concat(carta)) assert.ok(!S.SCRIPTS[n] && s.facts[n] && s.facts[n].script, `${n} joga pelo script lido`);
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  s = limpaMao(s, 0); s = limpaMao(s, 1);
  let e; for (const n of [].concat(carta)) { let o; [s, o] = poe(s, 0, n, 'hand'); e = e || o; }
  const a = {}, b = {}; for (const n of deA) [s, a[n]] = poe(s, 0, n); for (const n of deB) [s, b[n]] = poe(s, 1, n);
  return { s, e, a, b };
}
const resolve = s => { for (let i = 0; i < 40 && (s.stack.length || s.pending); i++) { if (s.pending) return s; s = act(s, { t: 'pass', p: s.turn.priority }); } return s; };
const naMesa = (s, oid) => !!s.objects[oid] && s.objects[oid].zone === 'battlefield';
const alt = (s, e) => legais(s, 0, x => x.t === 'cast' && x.oid === e && x.alt === 0);

const tudo = s => passaAte(resolve(s), x => !x.stack.length && !x.pending, 20);
const escolhe = (s, oid) => { assert.ok(s.pending && s.pending.kind === 'sacrifice', 'há escolha de sacrifício'); return resolve(act(s, legais(s, s.pending.p, x => x.t === 'sacrifice' && x.oid === oid)[0])); };

test('M-621 · 118.9: o custo alternativo só aceita criatura preta sua que não seja ficha', () => {
  let { s, e, a } = mesa(MAL, ['Zumbi', 'Urso'], ['Gigante']);
  assert.deepEqual(J(alt(s, e).map(x => x.pay.sacrifice)), [a.Zumbi], 'só o Zumbi (preto) paga; o Urso (verde) não');
  ({ s, e } = mesa(MAL, ['Urso'], ['Gigante']));
  assert.equal(alt(s, e).length, 0, 'sem criatura preta, não há custo alternativo (e sem mana, nada a conjurar)');
  assert.equal(legais(s, 0, x => x.t === 'cast' && x.oid === e).length, 0);
  ({ s, e, a } = mesa(MAL, ['Zumbi'], ['Gigante'])); s = J(s); s.objects[a.Zumbi].token = true;
  assert.equal(alt(s, e).length, 0, '111.1: o Zumbi ficha não serve ("nontoken")');
});

test('M-621 · 601.2h: o Zumbi sai ao conjurar, antes da resolução; a mágica na pilha segue valendo 4 (118.9c)', () => {
  let { s, e, a, b } = mesa(MAL, ['Zumbi'], ['Gigante']);
  s = act(s, alt(s, e)[0]);
  assert.equal(s.objects[a.Zumbi].zone, 'graveyard', 'o Zumbi foi sacrificado como custo');
  assert.equal(s.objects[e].zone, 'stack', 'Flare of Malice na pilha');
  assert.equal(s.facts[MAL].cmc, 4, 'valor de mana impresso');
  assert.equal(naMesa(s, b.Gigante), true, 'nada resolveu ainda');
});

test('M-621 · 202.3: o édito leva a de maior valor de mana sem perguntar; as menores e as suas ficam', () => {
  let { s, e, a, b } = mesa(MAL, ['Zumbi', 'Urso'], ['Urso', 'Gigante', 'Heroi']);
  s = tudo(act(s, alt(s, e)[0]));
  assert.ok(!s.pending, 'uma só de maior valor (Gigante, 5): sem escolha');
  assert.equal(naMesa(s, b.Gigante), false, 'o Gigante (5) foi sacrificado');
  assert.ok(s.zones[1].graveyard.includes(b.Gigante), 'no cemitério de B');
  assert.equal(naMesa(s, b.Urso), true, 'o Urso (2) fica'); assert.equal(naMesa(s, b.Heroi), true, 'o planeswalker de valor 3 fica');
  assert.equal(naMesa(s, a.Urso), true, '"each opponent": o Urso de A fica');
});

test('M-621 · 202.3: empate no maior valor — B escolhe só entre as duas de valor 5', () => {
  let { s, e, b } = mesa(MAL, ['Zumbi'], ['Gigante', 'Colosso', 'Urso']);
  s = resolve(act(s, alt(s, e)[0]));
  assert.ok(s.pending && s.pending.p === 1, 'B escolhe');
  assert.deepEqual(J(s.pending.options).sort(), [b.Gigante, b.Colosso].sort(), 'as opções são as duas de valor 5 (o Urso não)');
  s = escolhe(s, b.Colosso);
  assert.equal(naMesa(s, b.Colosso), false, 'o Colosso saiu'); assert.equal(naMesa(s, b.Gigante), true, 'o Gigante ficou'); assert.equal(naMesa(s, b.Urso), true);
});

test('M-621 · "creature or planeswalker": o planeswalker de valor 6 vai antes do Gigante de valor 5; terreno nunca', () => {
  let { s, e, b } = mesa(MAL, ['Zumbi'], ['Gigante', 'Mestre', 'Swamp']);
  s = tudo(act(s, alt(s, e)[0]));
  assert.equal(naMesa(s, b.Mestre), false, 'o planeswalker (6) foi sacrificado');
  assert.equal(naMesa(s, b.Gigante), true, 'o Gigante (5) fica'); assert.equal(naMesa(s, b.Swamp), true, 'o Pântano fica');
});

test('M-621 · B sem criatura nem planeswalker: nada a sacrificar; o custo de A já foi pago', () => {
  let { s, e, a, b } = mesa(MAL, ['Zumbi'], ['Swamp']);
  s = tudo(act(s, alt(s, e)[0]));
  assert.ok(!s.pending, 'nada a escolher'); assert.equal(naMesa(s, b.Swamp), true);
  assert.equal(s.objects[a.Zumbi].zone, 'graveyard'); assert.equal(s.objects[e].zone, 'graveyard', 'a mágica resolveu e foi ao cemitério');
});

test('M-621 · Flare of Denial: sacrificar a Fada (azul) paga o anula-mágica; anula a Flare of Malice na pilha e o Gigante fica', () => {
  let { s, a, b } = mesa([MAL, DEN], ['Zumbi', 'Fada', 'Urso'], ['Gigante']);
  const mal = s.zones[0].hand.find(o => s.objects[o].name === MAL), den = s.zones[0].hand.find(o => s.objects[o].name === DEN);
  s = act(s, alt(s, mal)[0]);
  assert.equal(s.turn.priority, 0, 'quem conjurou recebe a prioridade (117.3c)');
  const of = alt(s, den);
  assert.deepEqual(J([...new Set(of.map(x => x.pay.sacrifice))]), [a.Fada], 'só a Fada (azul) paga a Denial; o Urso e o Zumbi (já sacrificado) não');
  const contra = of.find(x => (x.targets || []).some(t => t && t.oid === mal)); assert.ok(contra, 'mira a Flare of Malice');
  s = tudo(act(s, contra));
  assert.equal(s.objects[a.Fada].zone, 'graveyard', 'a Fada pagou');
  assert.equal(s.objects[mal].zone, 'graveyard', 'Flare of Malice anulada');
  assert.equal(naMesa(s, b.Gigante), true, 'o édito não aconteceu: o Gigante fica');
});
