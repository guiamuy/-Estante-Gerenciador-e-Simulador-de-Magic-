// M-631 · rotina Motor contínuo · campanha Modern, ordem gulosa (coleta de 13/11/2026 16h40 UTC; com Kaito no main e M-625/M-626/M-629/M-630
// na fila do trem, Cling to Dust (15 listas Modern) e Drown in the Loch (12) são as próximas: com o Kaito, fecham listas Sultai/Dimir).
// Regras novas: 608.2h · "If it was a creature card, you gain 3 life. Otherwise, you draw a card." — o tipo da carta alvo como estava antes
// de exilar (onlyIf alvo-era-criatura / alvo-nao-era-criatura; criatura encantamento conta como criatura, ruling de 24/01/2020; alvo ilegal:
// a mágica não resolve, 608.2b); 601.2c/608.2b · alvo "with mana value less than or equal to the number of cards in its controller's
// graveyard" (targetMvAteCemiterioM: o cemitério de quem controla o alvo, na conjuração e de novo na resolução). Fuga (702.138) já existia.
// Texto da API da Scryfall de 13/11/2026 (.listas/oficiais-revisadas.json). Tudo falha no motor anterior: as cartas não tinham script.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadModules } from './_load.mjs';

const M = loadModules(), E = M.engine, S = M.scripts, SF = M.scryfall, T = M.table;
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const CD = 'Cling to Dust', DL = 'Drown in the Loch';
const oficial = (n, extra) => { const o = OF.find(x => x.name === n); assert.ok(o, `${n} em .listas/oficiais-revisadas.json`);
  return SF.normalizeCard({ object: 'card', layout: 'normal', ...o, ...extra }); };
const J = x => JSON.parse(JSON.stringify(x));

test('M-631 · texto da Scryfall de 13/11 guardado; scripts à mão válidos e cobertura completa', () => {
  const c = OF.find(x => x.name === CD), d = OF.find(x => x.name === DL);
  for (const o of [c, d]) { assert.match(o.fonte, /api\.scryfall\.com/); assert.equal(o.consulta, '2026-11-13'); }
  assert.equal(c.oracle_text, 'Exile target card from a graveyard. If it was a creature card, you gain 3 life. Otherwise, you draw a card.\nEscape—{3}{B}, Exile five other cards from your graveyard. (You may cast this card from your graveyard for its escape cost.)');
  assert.equal(d.oracle_text, 'Choose one —\n• Counter target spell with mana value less than or equal to the number of cards in its controller\'s graveyard.\n• Destroy target creature with mana value less than or equal to the number of cards in its controller\'s graveyard.');
  for (const [n, x] of [[CD, { cmc: 1, colors: ['B'] }], [DL, { cmc: 2, colors: ['B', 'U'] }]]) {
    assert.ok(S.SCRIPTS[n]); assert.equal(S.validateScript(S.SCRIPTS[n]).length, 0);
    assert.equal(S.coverage(oficial(n, x), S.SCRIPTS, n).level, 'completo', n);
  }
  assert.ok(S.validateScript({ name: 'Teste', effects: [{ do: 'gain', amount: 1, onlyIf: 'alvo-era-criaturas' }], example: { target: 'none', expect: { selfLife: 1 } } }).length, 'condição desconhecida');
});

// ── partidas ──
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: [...mana_cost.matchAll(/\{([^}]+)\}/g)].reduce((n, [, x]) => n + (/^\d+$/.test(x) ? +x : 1), 0), keywords: [], oracle_text: '', colors: [], ...extra });
const C = {
  [CD]: oficial(CD, { cmc: 1, colors: ['B'] }), [DL]: oficial(DL, { cmc: 2, colors: ['B', 'U'] }),
  Island: c0('Island', 'Basic Land — Island', '', { oracle_text: '({T}: Add {U}.)' }),
  Swamp: c0('Swamp', 'Basic Land — Swamp', '', { oracle_text: '({T}: Add {B}.)' }),
  Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2', colors: ['G'] }),
  Ninfa: c0('Ninfa', 'Enchantment Creature — Nymph', '{2}{W}', { power: '2', toughness: '2', colors: ['W'] }),
  Ideia: c0('Ideia', 'Sorcery', '{U}', { oracle_text: 'Draw a card.', colors: ['U'] }),
};
const ex = { example: { target: 'none', expect: { selfLife: 0 } } };
const SCR = { Urso: { name: 'Urso', ...ex }, Ninfa: { name: 'Ninfa', ...ex },
  Ideia: { name: 'Ideia', effects: [{ do: 'draw', amount: 1 }], example: { target: 'none', expect: { handDelta: 1 } } } };
const act = (s, a) => { const r = E.apply(s, a); if (r.error) throw new Error(JSON.stringify(r.error)); return r.state; };
function passaAte(s, fim, max = 400) {
  for (let i = 0; i < max && !fim(s); i++) { const pd = s.pending;
    if (pd && pd.kind === 'discard' && pd.reason !== 'effect') s = act(s, { t: 'discard', p: pd.p, oid: s.zones[pd.p].hand[0] });
    else if (pd && pd.kind === 'attackers') s = act(s, { t: 'attack', p: pd.p, attackers: [] });
    else if (pd && pd.kind === 'blockers') s = act(s, { t: 'block', p: pd.p, blocks: [] });
    else if (pd) return s; else s = act(s, { t: 'pass', p: s.turn.priority }); }
  return s;
}
/** Tira uma carta com esse nome do grimório (ou mão/cemitério) de `p` e a põe na zona pedida. */
function poe(s, p, name, zone = 'battlefield') {
  s = J(s);
  const from = ['library', 'hand', 'graveyard'].map(z => s.zones[p][z]).find(z => z.some(o => s.objects[o].name === name && o !== undefined));
  if (!from) throw new Error(name + ' ausente');
  const oid = from.find(o => s.objects[o].name === name); from.splice(from.indexOf(oid), 1); s.zones[p][zone].push(oid);
  Object.assign(s.objects[oid], { zone, sick: false, tapped: false, controller: p });
  return [s, oid];
}
const limpa = (s, p) => { s = J(s); for (const z of ['hand', 'graveyard']) for (const oid of s.zones[p][z].slice()) { s.zones[p][z].splice(s.zones[p][z].indexOf(oid), 1); s.zones[p].library.unshift(oid); s.objects[oid].zone = 'library'; } return s; };
const resolve = s => { for (let i = 0; i < 60 && (s.stack.length || s.pending); i++) { if (s.pending) return s; s = act(s, { t: 'pass', p: s.turn.priority }); } return s; };
const terras = (s, p, nomes) => { let o; for (const n of nomes) [s, o] = poe(s, p, n); return s; };
const enterra = (s, p, nomes) => { const oids = []; let o; for (const n of nomes) { [s, o] = poe(s, p, n, 'graveyard'); oids.push(o); } return [s, oids]; };
function mesa(seed = 631) {
  const d = ns => ns.map(name => ({ name, qty: 8, zone: 'main' }));
  const todos = [CD, DL, 'Island', 'Swamp', 'Urso', 'Ninfa', 'Ideia'];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SCR, first: 0, players: [{ name: 'A', deck: d(todos) }, { name: 'B', deck: d(todos) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  return limpa(limpa(s, 0), 1);
}
const temAlvo = (a, oid) => JSON.stringify(a.targets || []).includes(`"${oid}"`);
const conjura = (s, p, oid, alvo, extra = x => true) => { const a = E.legalActions(s, p).find(x => x.t === 'cast' && x.oid === oid && (alvo == null || temAlvo(x, alvo)) && extra(x)); assert.ok(a, `conjurar ${s.objects[oid].name}${alvo ? ' mirando ' + s.objects[alvo].name : ''}`); return act(s, a); };

test('M-631 · Cling to Dust numa carta de criatura: exila, você ganha 3 e não compra', () => {
  let s = mesa(), cd, ur; [s, cd] = poe(s, 0, CD, 'hand'); [s, [ur]] = enterra(s, 1, ['Urso']); s = terras(s, 0, ['Swamp']);
  const vida = s.players[0].life, mao = s.zones[0].hand.length;
  s = resolve(conjura(s, 0, cd, ur));
  assert.equal(s.objects[ur].zone, 'exile'); assert.equal(s.players[0].life, vida + 3); assert.equal(s.zones[0].hand.length, mao - 1, 'só a Cling saiu da mão');
  assert.equal(s.objects[cd].zone, 'graveyard');
});

test('M-631 · Cling to Dust numa carta que não é criatura: exila e compra uma, sem ganhar vida', () => {
  let s = mesa(), cd, id; [s, cd] = poe(s, 0, CD, 'hand'); [s, [id]] = enterra(s, 1, ['Ideia']); s = terras(s, 0, ['Swamp']);
  const vida = s.players[0].life, mao = s.zones[0].hand.length;
  s = resolve(conjura(s, 0, cd, id));
  assert.equal(s.objects[id].zone, 'exile'); assert.equal(s.players[0].life, vida); assert.equal(s.zones[0].hand.length, mao - 1 + 1);
});

test('M-631 · criatura encantamento conta como criatura (ruling): ganha 3, não compra; mira o próprio cemitério também', () => {
  let s = mesa(), cd, ni; [s, cd] = poe(s, 0, CD, 'hand'); [s, [ni]] = enterra(s, 0, ['Ninfa']); s = terras(s, 0, ['Swamp']);
  const vida = s.players[0].life, mao = s.zones[0].hand.length;
  s = resolve(conjura(s, 0, cd, ni));
  assert.equal(s.objects[ni].zone, 'exile'); assert.equal(s.players[0].life, vida + 3); assert.equal(s.zones[0].hand.length, mao - 1);
});

test('M-631 · alvo que saiu do cemitério antes de resolver: a Cling não resolve (nem vida, nem compra)', () => {
  let s = mesa(), cd, ur; [s, cd] = poe(s, 0, CD, 'hand'); [s, [ur]] = enterra(s, 1, ['Urso']); s = terras(s, 0, ['Swamp']);
  s = conjura(s, 0, cd, ur);
  s = J(s); s.zones[1].graveyard.splice(s.zones[1].graveyard.indexOf(ur), 1); s.zones[1].library.push(ur); s.objects[ur].zone = 'library'; s.objects[ur].zc = (s.objects[ur].zc || 0) + 1;
  const vida = s.players[0].life, mao = s.zones[0].hand.length;
  s = resolve(s);
  assert.equal(s.players[0].life, vida); assert.equal(s.zones[0].hand.length, mao); assert.equal(s.objects[cd].zone, 'graveyard');
});

test('M-631 · fuga: do cemitério por {3}{B} exilando cinco outras; só com cinco outras; depois de resolver volta ao cemitério', () => {
  let s = mesa(), cd, outras; [s, [cd]] = enterra(s, 0, [CD]); [s, outras] = enterra(s, 0, ['Urso', 'Ideia', 'Island', 'Swamp']);
  let alvo; [s, [alvo]] = enterra(s, 1, ['Urso']); s = terras(s, 0, ['Swamp', 'Swamp', 'Island', 'Island']);
  assert.ok(!E.legalActions(s, 0).some(a => a.t === 'cast' && a.oid === cd), 'quatro outras não bastam');
  let quinta; [s, [quinta]] = enterra(s, 0, ['Ninfa']);
  const fuga = E.legalActions(s, 0).find(a => a.t === 'cast' && a.oid === cd && a.escape && temAlvo(a, alvo));
  assert.ok(fuga, 'fuga oferecida com cinco outras');
  const vida = s.players[0].life;
  s = resolve(act(s, fuga));
  for (const o of [...outras, quinta]) assert.equal(s.objects[o].zone, 'exile', 'as cinco outras foram exiladas como custo');
  assert.equal(s.objects[alvo].zone, 'exile'); assert.equal(s.players[0].life, vida + 3);
  assert.equal(s.objects[cd].zone, 'graveyard', 'mágica fugida que não é permanente volta ao cemitério (ruling)');
});

test('M-631 · Drown in the Loch anula só mágica de valor até o cemitério de quem a controla (na conjuração e na resolução)', () => {
  let s = mesa(), dl, id; [s, dl] = poe(s, 0, DL, 'hand'); s = terras(s, 0, ['Island', 'Swamp']);
  [s, id] = poe(s, 1, 'Ideia', 'hand'); s = terras(s, 1, ['Island']);
  s = act(s, { t: 'pass', p: 0 }); s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  const cI = E.legalActions(s, 1).find(a => a.t === 'cast' && a.oid === id); assert.ok(cI, 'B conjura a Ideia (valor 1)'); s = act(s, cI);
  s = act(s, { t: 'pass', p: 1 }); assert.equal(s.turn.priority, 0);
  // cemitério de B vazio: valor 1 > 0, não mira
  assert.ok(!E.legalActions(s, 0).some(a => a.t === 'cast' && a.oid === dl && temAlvo(a, id)), 'cemitério de B vazio: não mira a Ideia');
  // o cemitério de quem conjura não conta
  let s2; [s2] = enterra(s, 0, ['Urso', 'Urso', 'Urso']);
  assert.ok(!E.legalActions(s2, 0).some(a => a.t === 'cast' && a.oid === dl && temAlvo(a, id)), 'o cemitério de A não conta');
  // com uma carta no cemitério de B, mira e anula
  let s3; [s3] = enterra(s, 1, ['Island']);
  const mao = s3.zones[1].hand.length;
  s3 = resolve(conjura(s3, 0, dl, id));
  assert.equal(s3.objects[id].zone, 'graveyard', 'anulada'); assert.ok(!s3.stack.includes(id)); assert.equal(s3.zones[1].hand.length, mao, 'B não comprou');
  // na resolução o cemitério de B ficou vazio: o alvo ficou ilegal e a Drown não resolve (608.2b)
  let s4; [s4] = enterra(s, 1, ['Island']); s4 = conjura(s4, 0, dl, id);
  s4 = J(s4); const sai = s4.zones[1].graveyard.pop(); s4.zones[1].library.push(sai); s4.objects[sai].zone = 'library';
  s4 = act(s4, { t: 'pass', p: s4.turn.priority }); s4 = act(s4, { t: 'pass', p: s4.turn.priority });
  assert.equal(s4.objects[dl].zone, 'graveyard'); assert.ok(s4.stack.includes(id), 'a Ideia segue na pilha');
  assert.match(T.descreveEfeito(S.SCRIPTS[DL].modes[0].effects[0]), /anula uma mágica com valor de mana até o número de cartas no cemitério de quem a controla/);
});

test('M-631 · Drown in the Loch destrói criatura de valor até o cemitério de quem a controla', () => {
  let s = mesa(), dl, ur; [s, dl] = poe(s, 0, DL, 'hand'); s = terras(s, 0, ['Island', 'Swamp']); [s, ur] = poe(s, 1, 'Urso');
  assert.ok(!E.legalActions(s, 0).some(a => a.t === 'cast' && a.oid === dl && temAlvo(a, ur)), 'cemitério de B vazio');
  [s] = enterra(s, 1, ['Ideia', 'Island']);
  s = resolve(conjura(s, 0, dl, ur));
  assert.equal(s.objects[ur].zone, 'graveyard');
  assert.match(T.descreveEfeito(S.SCRIPTS[DL].modes[1].effects[0]), /destrói uma criatura com valor de mana até/);
  assert.match(T.descreveEfeitos(S.SCRIPTS[CD].effects), /ganha 3 de vida \(se o alvo era uma carta de criatura\).*compra.*\(se o alvo não era uma carta de criatura\)/);
});

test('M-631 · 115.5: conjurada do cemitério pela fuga, a Cling não mira a si mesma (achado da revisão independente)', () => {
  let s = mesa(), cd; [s, [cd]] = enterra(s, 0, [CD]); [s] = enterra(s, 0, ['Urso', 'Ideia', 'Island', 'Swamp', 'Ninfa', 'Urso']);
  s = terras(s, 0, ['Swamp', 'Swamp', 'Island', 'Island']);
  const fugas = E.legalActions(s, 0).filter(a => a.t === 'cast' && a.oid === cd && a.escape);
  assert.ok(fugas.length, 'fuga oferecida mirando as outras');
  assert.ok(!fugas.some(a => temAlvo(a, cd)), 'nenhuma oferta mira a própria Cling');
  const uma = fugas[0];
  assert.throws(() => { const r = E.apply(s, { ...uma, targets: [{ oid: cd }] }); if (r.error) throw new Error(r.error.message || r.error.code); }, /si mesma/);
});
