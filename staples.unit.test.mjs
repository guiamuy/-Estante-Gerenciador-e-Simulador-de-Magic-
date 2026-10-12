// M-335 · staples de remoção, descarte e "olhar o topo" lidos pelo leitor: Thoughtseize e Inquisition of Kozilek (descarte escolhido com
// filtro), Swords to Plowshares (608.2h: o poder como era no campo), Wasteland ("target nonbasic land"), Stock Up e Augur of Bolas (olhar o
// topo, pegar, o resto no fundo). Texto oficial em .listas/oficiais-revisadas.json (Oracle do Forge, 12/10/2026). Cada teste falha antes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, comMana, tudo, CARTAS } from './cmd.mjs';
import { loadModules } from './_load.mjs';

const { leitor: L } = loadModules();
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const mv = m => [...m.matchAll(/\{([^}]+)\}/g)].reduce((n, x) => n + (/^\d+$/.test(x[1]) ? +x[1] : 1), 0);
const carta = n => { const c = OF.find(x => x.name === n); assert.ok(c, n); return { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: mv(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: [...new Set(c.mana_cost.match(/[WUBRG]/g) || [])], ...(c.power ? { power: c.power, toughness: c.toughness } : {}) }; };
const NOMES = ['Thoughtseize', 'Inquisition of Kozilek', 'Swords to Plowshares', 'Wasteland', 'Stock Up', 'Augur of Bolas'];
const cards = Object.fromEntries(NOMES.map(n => [n, carta(n)]));
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: mv(mana_cost), keywords: [], oracle_text: '', colors: [...new Set(mana_cost.match(/[WUBRG]/g) || [])], ...extra });
Object.assign(cards, { Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2' }), Gigante: c0('Gigante', 'Creature — Giant', '{4}{G}', { power: '5', toughness: '5' }),
  Raio: c0('Raio', 'Instant', '{R}'), Forca: c0('Forca', 'Instant', '{G}'), 'Terra Rara': c0('Terra Rara', 'Land', '') });
const ex = { target: 'none', expect: { picked: true } };
const scripts = Object.fromEntries(NOMES.map(n => [n, { ...L.ler(carta(n)).script, example: n === 'Swords to Plowshares' ? { target: 'enemy-creature', expect: { exiled: true } } : n === 'Wasteland' || n === 'Augur of Bolas' ? { action: 'etb', target: 'none', expect: { attached: false } } : ex }]));
Object.assign(scripts, { Raio: { name: 'Raio', effects: [{ do: 'damage', amount: 1, target: 'any' }], example: { target: 'opponent', expect: { opponentLife: -1 } } },
  Forca: { name: 'Forca', effects: [{ do: 'pump', power: 3, toughness: 3, target: 'creature' }], example: { target: 'own-creature', expect: { pump: [3, 3] } } } });
function mesaX(a = [], b = [], seed = 9) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: { ...CARTAS, ...cards }, scripts, first: 0, players: [{ name: 'A', deck: baralho([...a, 'Swamp', 'Plains', 'Island']) }, { name: 'B', deck: baralho([...b, 'Forest']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => { s = act(act(s, { t: 'pass', p: s.turn.priority }), { t: 'pass', p: 1 - s.turn.priority }); return s; };
const conjura = (s, oid, f = () => true) => { const a = legais(s, 0, x => x.t === 'cast' && x.oid === oid && f(x))[0]; assert.ok(a, 'conjurar ' + s.objects[oid].name); return act(s, a); };
const maoDeB = (s, nomes) => { s = J(s); for (const oid of s.zones[1].hand.slice()) E.moveObject(s, oid, 'library'); for (const n of nomes) [s] = poe(s, 1, n, 'hand'); return s; };

test('Thoughtseize: o jogador alvo revela a mão, você escolhe uma carta que não seja terreno (criatura vale), ele a descarta, e você perde 2', () => {
  let s = mesaX(['Thoughtseize'], ['Urso', 'Raio', 'Terra Rara']), t;
  [s, t] = poe(s, 0, 'Thoughtseize', 'hand'); s = maoDeB(s, ['Urso', 'Raio', 'Terra Rara']);
  s = resolve(conjura(comMana(s, 'B'), t, x => x.targets && x.targets[0].player === 1));
  assert.equal(s.pending && s.pending.kind, 'pick'); assert.equal(s.pending.p, 0, 'quem escolhe é você');
  const nomes = s.pending.from.map(o => s.objects[o].name).sort();
  assert.equal(JSON.stringify(nomes), JSON.stringify(['Raio', 'Urso']), 'o terreno não pode ser escolhido; a criatura pode');
  const urso = s.pending.from.find(o => s.objects[o].name === 'Urso'); const vida = s.players[0].life;
  s = tudo(act(s, { t: 'pick', p: 0, oid: urso }), x => legais(x, x.pending.p, y => y.t === 'pick_done')[0] || legais(x, x.pending.p)[0]);
  assert.equal(s.objects[urso].zone, 'graveyard', 'B descartou a Urso');
  assert.equal(s.players[0].life, vida - 2, 'você perde 2 depois do descarte');
});

test('Inquisition of Kozilek: só carta que não seja terreno com valor de mana 3 ou menos', () => {
  let s = mesaX(['Inquisition of Kozilek'], ['Urso', 'Gigante']), q;
  [s, q] = poe(s, 0, 'Inquisition of Kozilek', 'hand'); s = maoDeB(s, ['Urso', 'Gigante']);
  s = resolve(conjura(comMana(s, 'B'), q, x => x.targets && x.targets[0].player === 1));
  assert.equal(JSON.stringify(s.pending.from.map(o => s.objects[o].name)), JSON.stringify(['Urso']), 'o Gigante (5) não serve');
});

test('Swords to Plowshares: exila e quem controlava ganha vida igual ao poder dela no campo (aumento até o fim do turno incluso)', () => {
  let s = mesaX(['Swords to Plowshares'], ['Urso', 'Forca']), sw, u, f;
  [s, sw] = poe(s, 0, 'Swords to Plowshares', 'hand'); [s, u] = poe(s, 1, 'Urso'); [s, f] = poe(s, 1, 'Forca', 'hand');
  let t = J(s);
  const vB = s.players[1].life, vA = s.players[0].life;
  t = tudo(resolve(conjura(comMana(t, 'W'), sw, x => x.targets && x.targets[0].oid === u)));
  assert.equal(t.objects[u].zone, 'exile');
  assert.equal(t.players[1].life, vB + 2, 'B ganha 2 (poder da Urso)'); assert.equal(t.players[0].life, vA, 'você não ganha');
  let w = J(s); w = comMana(w, 'G', 1); w.turn.priority = 1;
  const pump = legais(w, 1, x => x.t === 'cast' && x.oid === f && x.targets && x.targets[0].oid === u)[0];
  w.turn.priority = 0; w = conjura(comMana(w, 'W'), sw, x => x.targets && x.targets[0].oid === u);
  w = act(w, { t: 'pass', p: 0 }); w = act(w, pump); w = tudo(w);
  assert.equal(w.objects[u].zone, 'exile');
  assert.equal(w.players[1].life, vB + 5, 'Força em resposta: 2 + 3 = 5 (608.2h: o poder como era ao ser exilada)');
});

test('Wasteland: só mira terreno não básico; vira e sacrifica, e destrói', () => {
  let s = mesaX(['Wasteland'], ['Terra Rara']), w, tr, fo;
  [s, w] = poe(s, 0, 'Wasteland'); [s, tr] = poe(s, 1, 'Terra Rara'); [s, fo] = poe(s, 1, 'Forest');
  const alvos = legais(s, 0, x => x.t === 'activate' && x.oid === w && x.targets).map(x => s.objects[x.targets[0].oid].name);
  assert.ok(alvos.includes('Terra Rara')); assert.ok(!alvos.includes('Forest'), 'a Floresta básica não é alvo');
  s = tudo(resolve(act(s, legais(s, 0, x => x.t === 'activate' && x.oid === w && x.targets && x.targets[0].oid === tr)[0])));
  assert.equal(s.objects[tr].zone, 'graveyard'); assert.equal(s.objects[w].zone, 'graveyard');
});

test('Stock Up pega duas das cinco de cima e põe o resto no fundo; Augur of Bolas pode revelar uma instantânea ou feitiço', () => {
  let s = mesaX(['Stock Up', 'Augur of Bolas', 'Raio']), su, au;
  [s, su] = poe(s, 0, 'Stock Up', 'hand'); [s, au] = poe(s, 0, 'Augur of Bolas', 'hand');
  const topo5 = s.zones[0].library.slice(0, 5), h = s.zones[0].hand.length;
  s = resolve(conjura(comMana(s, 'UUU'), su));
  assert.equal(s.pending.kind, 'pick'); assert.equal(s.pending.min, 2); assert.equal(s.pending.max, 2);
  s = act(act(s, { t: 'pick', p: 0, oid: topo5[0] }), { t: 'pick', p: 0, oid: topo5[1] }); s = tudo(s, x => legais(x, x.pending.p, y => y.t === 'pick_done')[0] || legais(x, x.pending.p)[0]);
  assert.equal(s.zones[0].hand.length, h - 1 + 2, 'duas para a mão');
  assert.equal(JSON.stringify(s.zones[0].library.slice(-3).sort()), JSON.stringify(topo5.slice(2).sort()), 'as outras três no fundo');
  let t = J(s); const r = t.zones[0].library.find(o => t.objects[o].name === 'Raio'); t.zones[0].library.splice(t.zones[0].library.indexOf(r), 1); t.zones[0].library.unshift(r);
  t = resolve(conjura(comMana(t, 'UU'), au));
  t = passaAte(t, x => !!x.pending || !x.stack.length);
  assert.equal(t.pending && t.pending.kind, 'pick'); assert.equal(t.pending.min, 0, '"you may": pode não pegar');
  assert.ok(t.pending.from.includes(r) && legais(t, 0, x => x.t === 'pick' && x.oid === r).length, 'o Raio pode ser escolhido');
  assert.ok(t.pending.from.every(o => o === r || legais(t, 0, x => x.t === 'pick' && x.oid === o).length === 0), 'só instantânea ou feitiço');
});

test('achado da revisão do lote IX · descarte com filtro fora do vocabulário (Coercion, Divest, Ostracize) não quebra a partida: a carta fica sem leitura', () => {
  // Texto oficial (Oracle do Forge, 12/10/2026): Coercion "You choose a card from it", Divest "an artifact or creature card", Ostracize "a creature card"
  const fora = [['Coercion', 'Target opponent reveals their hand. You choose a card from it. That player discards that card.', '{2}{B}'],
    ['Divest', 'Target player reveals their hand. You choose an artifact or creature card from it. That player discards that card.', '{B}'],
    ['Ostracize', 'Target opponent reveals their hand. You choose a creature card from it. That player discards that card.', '{B}']];
  for (const [name, oracle_text, mana_cost] of fora) {
    const card = c0(name, 'Sorcery', mana_cost, { oracle_text });
    assert.doesNotThrow(() => L.ler(card), name);
    let s; assert.doesNotThrow(() => { s = E.createGame({ format: 'livre', seed: 1, mode: 'full', cards: { ...CARTAS, [name]: card }, players: [{ name: 'A', deck: [{ name, qty: 20, zone: 'main' }, { name: 'Swamp', qty: 20, zone: 'main' }] }, { name: 'B', deck: [{ name: 'Forest', qty: 40, zone: 'main' }] }] }); }, name + ': a partida é criada');
  }
});

test('achado da revisão do lote IX · Augur of Bolas olha (não revela) as três; só a instantânea ou feitiço escolhida é revelada; "in a random order" vai ao fundo embaralhado', () => {
  const sc = L.ler(carta('Augur of Bolas')).script.abilities[0].effects[0];
  assert.equal(sc.revela, undefined, 'olhar não é revelar (701.20e)');
  assert.equal(sc.revelaEscolhida, true, '"You may reveal … and put it into your hand"');
  let s = mesaX(['Augur of Bolas', 'Raio']), au;
  [s, au] = poe(s, 0, 'Augur of Bolas', 'hand');
  const r = s.zones[0].library.find(o => s.objects[o].name === 'Raio'); s = J(s); s.zones[0].library.splice(s.zones[0].library.indexOf(r), 1); s.zones[0].library.unshift(r);
  let t = E.apply(comMana(s, 'UU'), legais(comMana(s, 'UU'), 0, x => x.t === 'cast' && x.oid === au)[0]).state;
  const evs = []; for (let i = 0; i < 12 && !(t.pending && t.pending.kind === 'pick'); i++) { const x = E.apply(t, { t: 'pass', p: t.turn.priority }); evs.push(...x.events); t = x.state; }
  assert.ok(!evs.some(e => e.kind === 'effect' && e.do === 'reveal'), 'nada revelado antes da escolha');
  const x1 = E.apply(t, { t: 'pick', p: 0, oid: r }); let t2 = x1.state; const evs2 = [...x1.events];
  if (t2.pending && t2.pending.kind === 'pick') { const x2 = E.apply(t2, { t: 'pick_done', p: 0 }); evs2.push(...x2.events); t2 = x2.state; }
  const rev = evs2.filter(e => e.kind === 'effect' && e.do === 'reveal');
  assert.equal(rev.length, 1, 'uma revelação'); assert.equal(rev[0].target, 'Raio', 'só a escolhida');
  const ast = L.ler(c0('Ancient Stirrings', 'Sorcery', '{G}', { oracle_text: 'Look at the top five cards of your library. You may reveal a colorless card from among them and put it into your hand. Then put the rest on the bottom of your library in any order.' }));
  void ast; // fora do vocabulário (incolor): só não pode quebrar
  const rnd = L.ler(c0('Teste Aleatorio', 'Sorcery', '{U}', { oracle_text: 'Look at the top four cards of your library. Put one of them into your hand and the rest on the bottom of your library in a random order.' }));
  assert.equal(rnd.script.effects[0].rest, 'library-bottom-random', '401.4: em ordem aleatória');
});

test('M-335 · as 11 do lote IX revisadas jogam (decisão A)', () => {
  const { scripts: S } = loadModules();
  for (const n of ['Thoughtseize', 'Wasteland', 'Swords to Plowshares', 'Stock Up', 'Augur of Bolas', 'Inquisition of Kozilek', 'Infernal Grasp', 'Prismatic Lens', 'Read the Bones', 'Firebolt', 'Seal of Fire'])
    assert.equal(S.coverage(carta(n)).level, 'completo', n + ' joga');
});
