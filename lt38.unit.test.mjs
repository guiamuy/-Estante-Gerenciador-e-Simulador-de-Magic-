// M-355 · pedidos da trilha homologacao (prova de partida do catálogo, 13/10/2026): (1) 119.4 / 601.2g — no pagamento, a fonte de mana que cobra
// vida ("{T}, Pay 1 life", Mana Confluence) vira antes da que causa dano (terra de dor); com 1 de vida, a ordem inversa zerava a vida, a
// Confluence deixava de produzir e o motor recusava a conjuração que a mesa tinha oferecido. (2) 707.10 — `invariants` não conta cópia de mágica
// como carta. Os dois testes falham no motor anterior. (3) e (4), achados da revisão independente: a vida cobrada por várias fontes se soma e o
// phyrexiano pago com vida sai da vida que sobra depois das fontes (601.2g–h); os dois falham no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, comMana, tudo, CARTAS } from './cmd.mjs';

const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const conf = OF.find(x => x.name === 'Mana Confluence');
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: 2, keywords: [], oracle_text: '', colors: [...new Set((mana_cost.match(/[WUBRG]/g) || []))], ...extra });
const cards = { 'Mana Confluence': { name: conf.name, type_line: conf.type_line, mana_cost: '', cmc: 0, keywords: [], oracle_text: conf.oracle_text, colors: [] },
  'Costa de Dor': c0('Costa de Dor', 'Land', '', { oracle_text: '{T}: Add {C}.\n{T}: Add {G} or {U}. Costa de Dor deals 1 damage to you.' }),
  Sereia: c0('Sereia', 'Creature — Merfolk', '{G}{U}', { power: '2', toughness: '2' }), Faisca: c0('Faisca', 'Instant', '{R}'),
  Fera: c0('Fera', 'Creature — Beast', '{G/P}{U}', { power: '2', toughness: '2' }) };
const scripts = { Faisca: { name: 'Faisca', storm: true, effects: [{ do: 'damage', amount: 1, target: 'any' }], example: { target: 'enemy-player', expect: { selfLife: 0 } } } };
function mesaX(a = [], seed = 83) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 8, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: { ...CARTAS, ...cards }, scripts, first: 0, players: [{ name: 'A', deck: baralho([...a, 'Mountain']) }, { name: 'B', deck: baralho(['Plains', 'Island']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}

test('M-355 · 119.4: com 1 de vida, {G}{U} pago com terra de dor e Mana Confluence — a Confluence vira primeiro e a conjuração oferecida é aceita', () => {
  let s = mesaX(['Mana Confluence', 'Costa de Dor', 'Sereia']), mc, cd, se;
  s = J(s); for (const o of s.zones[0].battlefield.slice()) { s.zones[0].battlefield = s.zones[0].battlefield.filter(x => x !== o); s.zones[0].library.push(o); s.objects[o].zone = 'library'; }
  [s, cd] = poe(s, 0, 'Costa de Dor'); [s, mc] = poe(s, 0, 'Mana Confluence'); [s, se] = poe(s, 0, 'Sereia', 'hand');
  s = J(s); s.players[0].life = 1;
  const ofs = legais(s, 0, a => a.t === 'cast' && a.oid === se); assert.ok(ofs.length, 'a mesa oferece (vida 1 paga a Confluence)');
  let t; assert.doesNotThrow(() => { t = E.apply(s, ofs[0]).state; }, 'e o motor aceita');
  assert.equal(t.players[0].life, -1, 'pagou 1 de vida e levou 1 de dano (e perde o jogo pela ação de estado: escolha do jogador, 119.4)');
});

test('M-355 · 707.10: invariants não conta cópia de mágica como carta', () => {
  let s = mesaX(['Faisca']), f;
  const total = Object.values(s.objects).filter(o => !o.ability && !o.token).length;
  [s, f] = poe(s, 0, 'Faisca', 'hand');
  s = J(s); s.objects.copiaX = { ...s.objects[f], oid: 'copiaX', zone: 'stack', copiaDeMagia: true }; s.stack.push('copiaX');
  assert.deepEqual([...E.invariants(s, total)].filter(e => /cartas/.test(e)), [], 'a cópia na pilha não é carta');
});

const soComConfluence = (s, n) => { s = J(s); for (const o of s.zones[0].battlefield.slice()) { s.zones[0].battlefield = s.zones[0].battlefield.filter(x => x !== o); s.zones[0].library.push(o); s.objects[o].zone = 'library'; }
  for (let i = 0; i < n; i++) [s] = poe(s, 0, 'Mana Confluence'); return s; };

test('M-355 · 119.4: com 1 de vida e duas Mana Confluence, {G}{U} não é oferecido (a segunda pede 1 de vida com a vida já em 0) — e com 2 de vida é', () => {
  let s = soComConfluence(mesaX(['Mana Confluence', 'Sereia']), 2), se; [s, se] = poe(s, 0, 'Sereia', 'hand');
  s = J(s); s.players[0].life = 1;
  assert.equal(legais(s, 0, a => a.t === 'cast' && a.oid === se).length, 0, 'sem oferta que o motor recusaria');
  s = J(s); s.players[0].life = 2;
  const ofs = legais(s, 0, a => a.t === 'cast' && a.oid === se); assert.equal(ofs.length, 1);
  assert.equal(E.apply(s, ofs[0]).state.players[0].life, 0);
});

test('M-355 · 601.2g–h: phyrexiano pago com vida usa a vida que sobra depois da Mana Confluence', () => {
  let s = soComConfluence(mesaX(['Mana Confluence', 'Fera']), 1), fe; [s, fe] = poe(s, 0, 'Fera', 'hand');
  s = J(s); s.players[0].life = 2;
  assert.deepEqual([...legais(s, 0, a => a.t === 'cast' && a.oid === fe).map(a => a.vida)], [], 'com 2 de vida, 1 vai para a Confluence e não sobram 2 para o phyrexiano');
  assert.throws(() => E.apply(s, { t: 'cast', p: 0, oid: fe, vida: 1 }), /vida|mana/);
  s = J(s); s.players[0].life = 3;
  const ofs = legais(s, 0, a => a.t === 'cast' && a.oid === fe); assert.deepEqual([...ofs.map(a => a.vida)], [1]);
  assert.equal(E.apply(s, ofs[0]).state.players[0].life, 0, '3 − 1 (Confluence) − 2 (phyrexiano)');
});
