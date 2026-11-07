// M-609 · Sentinela do Pauper (cobertura/pauper.json de 07/11/2026 13:29 UTC: 666 de 671 listas a 100% no app, 8 cartas pendentes).
// Texto da API da Scryfall de 07/11/2026 (campo `texto` do relatório, guardado em .listas/oficiais-revisadas.json):
//   Bountiful Landscape — já lida; aprovada aqui
//   Deprive — custo adicional "return a land you control to its owner's hand" (601.2b/601.2h)
//   Ghitu Lavarunner — "As long as there are two or more instant and/or sorcery cards in your graveyard, this creature gets +1/+0 and has haste." (611.2b)
//   Guac & Marshmallow Pizza — "Untap it." depois do +2/+2 na criatura alvo (608.2c)
//   Perilous Research — "Draw two cards, then sacrifice a permanent." (701.21a)
//   No Admittance — "Empower Jace 1" pelo efeito da V-29 (701.71)
// Ficam manuais (ROADMAP): Retraction Helix (habilidade ativada concedida), Rites of Initiation (descarte aleatório em número escolhido).
// Falha no motor anterior: as seis ficavam fora do app (lida em revisão · manual · parcial).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, act, poe, legais, passaAte, limpaMao } from './listas.mjs';

const revisadas = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const de = n => revisadas.find(x => x.name === n);
const terreno = (n, c) => ({ name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${c}}.)`, colors: [] });
const NOMES = ['Bountiful Landscape', 'Deprive', 'Ghitu Lavarunner', 'Guac & Marshmallow Pizza', 'No Admittance', 'Perilous Research'];
const C = {
  'Bountiful Landscape': { keywords: ['Cycling'], colors: [], cmc: 0, ...de('Bountiful Landscape') },
  Deprive: { keywords: [], colors: ['U'], cmc: 2, ...de('Deprive') },
  'Ghitu Lavarunner': { keywords: [], colors: ['R'], cmc: 1, ...de('Ghitu Lavarunner') },
  'Guac & Marshmallow Pizza': { keywords: ['Flash'], colors: ['G'], cmc: 1, ...de('Guac & Marshmallow Pizza') },
  'No Admittance': { keywords: ['Surveil', 'Empower Jace'], colors: ['R'], cmc: 2, ...de('No Admittance') },
  'Perilous Research': { keywords: [], colors: ['U'], cmc: 2, ...de('Perilous Research') },
  Choque: { name: 'Choque', mana_cost: '{R}', cmc: 1, type_line: 'Instant', oracle_text: 'Choque deals 2 damage to any target.', keywords: [], colors: ['R'] },
  Urso: { name: 'Urso', mana_cost: '{1}{G}', cmc: 2, type_line: 'Creature — Bear', power: '2', toughness: '2', oracle_text: '', keywords: [], colors: ['G'] },
  Island: terreno('Island', 'U'), Forest: terreno('Forest', 'G'), Mountain: terreno('Mountain', 'R'),
};
function mesa() {
  const lista = [['Urso', 16], ['Choque', 8], ...NOMES.map(n => [n, 4]), ['Island', 8], ['Forest', 8], ['Mountain', 8]].map(([name, qty]) => ({ name, qty, zone: 'main' }));
  let s = E.createGame({ format: 'pauper', seed: 609, mode: 'full', cards: C, players: [{ name: 'A', deck: lista }, { name: 'B', deck: lista }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  return limpaMao(limpaMao(s, 0), 1);
}
const resolveTudo = (s, escolhe = ops => ops[0]) => {
  for (let i = 0; i < 80 && (s.stack.length || s.pending); i++) {
    if (!s.pending) { s = act(s, { t: 'pass', p: s.turn.priority }); continue; }
    s = act(s, escolhe(legais(s, s.pending.p), s.pending));
  }
  return s;
};

test('M-609 · as seis cartas jogam no app (lidas por inteiro e aprovadas)', () => {
  for (const n of NOMES) {
    assert.ok(S.APROVADAS[n], `${n} aprovada`);
    assert.equal(S.coverage(C[n]).level, 'completo', n);
  }
});

test('M-609 · leitor: custo de devolver terreno, maestria estática, "Untap it" e sacrificar uma permanente', () => {
  assert.equal(JSON.stringify(S.leitura(C.Deprive).script.additional), JSON.stringify({ returnLand: 'Land' }));
  assert.equal(JSON.stringify(S.leitura(C['Ghitu Lavarunner']).script.continuo), JSON.stringify([{ afetados: 'self', poder: 1, resistencia: 0, palavras: ['haste'], se: { maestria: true } }]));
  const g = S.leitura(C['Guac & Marshmallow Pizza']).script.abilities[0];
  assert.equal(g.when, 'etb'); assert.equal(JSON.stringify(g.effects[1]), JSON.stringify({ do: 'untap', target: 'first-target' }));
  const pr = S.leitura(C['Perilous Research']).script.effects;
  assert.equal(pr[0].do, 'draw'); assert.equal(pr[1].do, 'sacrificar'); assert.equal(pr[1].jogadores, 'voce');
  assert.ok(!pr[1].tipos.includes('instant') && pr[1].tipos.includes('land'), 'só tipos de permanente');
});

test('M-609 · Deprive: devolve um terreno seu à mão ao conjurar e anula a mágica (601.2h)', () => {
  let s = mesa(); let d, ch, m; const ilhas = [];
  for (let i = 0; i < 2; i++) { let x; [s, x] = poe(s, 0, 'Island'); ilhas.push(x); }
  [s, m] = poe(s, 0, 'Mountain');
  [s, d] = poe(s, 0, 'Deprive', 'hand');
  [s, ch] = poe(s, 0, 'Choque', 'hand');
  assert.equal(legais(s, 0, x => x.t === 'cast' && x.oid === d).length, 0, 'sem mágica na pilha, sem alvo');
  const lc = legais(s, 0, x => x.t === 'cast' && x.oid === ch); if (!lc.length) throw new Error('choque: ' + JSON.stringify(legais(s, 0).map(x => x.t)));
  s = act(s, lc.find(x => (x.targets || []).some(t => t.player === 1)) || lc[0]);
  const cast = legais(s, 0, x => x.t === 'cast' && x.oid === d)[0]; assert.ok(cast, 'Deprive pode anular o Choque');
  s = act(s, cast);
  assert.equal([...ilhas, m].filter(x => s.objects[x].zone === 'hand').length, 1, 'um terreno voltou para a mão como custo');
  const vidas = s.players.map(p => p.life);
  s = resolveTudo(s);
  assert.equal(s.objects[ch].zone, 'graveyard'); assert.deepEqual(s.players.map(p => p.life), vidas, 'o Choque foi anulado');
  assert.equal(s.objects[d].zone, 'graveyard');
});

test('M-609 · Ghitu Lavarunner: +1/+0 e ímpeto só com duas instantâneas e/ou feitiços no seu cemitério (611.2b)', () => {
  let s = mesa(); let g;
  [s, g] = poe(s, 0, 'Ghitu Lavarunner', 'battlefield', { sick: true });
  assert.equal(E.stats(s, s.objects[g]).power, 1); assert.equal(E.hasKeyword(s, s.objects[g], 'haste'), false);
  [s] = poe(s, 0, 'Choque', 'graveyard');
  assert.equal(E.stats(s, s.objects[g]).power, 1, 'uma só não basta');
  [s] = poe(s, 1, 'Choque', 'graveyard');
  assert.equal(E.stats(s, s.objects[g]).power, 1, 'a do cemitério do oponente não conta');
  [s] = poe(s, 0, 'Perilous Research', 'graveyard');
  assert.equal(E.stats(s, s.objects[g]).power, 2); assert.equal(E.hasKeyword(s, s.objects[g], 'haste'), true);
  assert.equal(E.stats(s, s.objects[g]).toughness, 2, 'resistência intacta');
});

test('M-609 · Guac & Marshmallow Pizza: +2/+2 e desvira a criatura alvo; {2}, {T}, sacrificar: 3 de vida', () => {
  let s = mesa(); let u, z;
  [s, u] = poe(s, 0, 'Urso', 'battlefield', { tapped: true });
  [s] = poe(s, 0, 'Forest');
  [s, z] = poe(s, 0, 'Guac & Marshmallow Pizza', 'hand');
  s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === z)[0]);
  s = resolveTudo(s, ops => ops.find(a => (a.targets || []).some(t => t.oid === u)) || ops[0]);
  assert.equal(s.objects[z].zone, 'battlefield');
  assert.equal(s.objects[u].tapped, false, 'desvirou');
  assert.equal(E.stats(s, s.objects[u]).power, 4);
});

test('M-609 · Perilous Research: compra duas e você escolhe a permanente que sacrifica (701.21a)', () => {
  let s = mesa(); let r, u;
  for (let i = 0; i < 2; i++) [s] = poe(s, 0, 'Island');
  [s, u] = poe(s, 0, 'Urso');
  [s, r] = poe(s, 0, 'Perilous Research', 'hand');
  const mao = s.zones[0].hand.length;
  s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === r)[0]);
  s = passaAte(s, x => !!x.pending || !x.stack.length);
  assert.ok(s.pending && s.pending.kind === 'sacrifice', 'pede a permanente');
  const op = legais(s, 0).find(a => JSON.stringify(a).includes(u)); assert.ok(op, 'pode escolher o Urso');
  s = resolveTudo(act(s, op));
  assert.equal(s.zones[0].hand.length, mao - 1 + 2, 'comprou duas');
  assert.equal(s.objects[u].zone, 'graveyard', 'sacrificou o Urso');
});

test('M-609 · Bountiful Landscape: busca Floresta, Ilha ou Montanha básica, virada', () => {
  const sc = S.leitura(C['Bountiful Landscape']).script;
  assert.equal(JSON.stringify(sc.abilities[0].effects[0].filter), JSON.stringify({ basic: true, types: ['land'], subtypes: ['Forest', 'Island', 'Mountain'] }));
  assert.equal(sc.abilities[0].effects[0].to, 'battlefield-tapped'); assert.equal(sc.cycling.mana, '{G}{U}{R}');
});

test('M-609 · No Admittance: 3 de dano e Empower Jace 1 cria a ficha Jace com 1 de lealdade (701.71)', () => {
  let s = mesa(); let n;
  for (let i = 0; i < 2; i++) [s] = poe(s, 0, 'Mountain');
  [s, n] = poe(s, 0, 'No Admittance', 'hand');
  const vida = s.players[1].life;
  s = act(s, legais(s, 0, x => x.t === 'cast' && x.oid === n && (x.targets || []).some(t => t.player === 1))[0]);
  s = resolveTudo(s);
  assert.equal(s.players[1].life, vida - 3);
  const jace = Object.values(s.objects).find(o => o.zone === 'battlefield' && o.controller === 0 && /Jace/.test(o.name));
  assert.ok(jace, 'ficha Jace sua no campo'); assert.equal(jace.loyalty ?? (jace.counters || {}).loyalty, 1);
});
