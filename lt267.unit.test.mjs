// M-587 · Sentinela do Pauper (cobertura/pauper.json de 30/10/2026 13:25 UTC: 592 de 596 listas a 100% no app, 4 cartas pendentes).
// Texto da API da Scryfall de 30/10/2026 (campo `texto` do relatório, guardado em .listas/oficiais-revisadas.json):
//   Angelsong — "Prevent all combat damage that would be dealt this turn. / Cycling {2}" (lida; aprovada aqui)
//   Colossal Dreadmask — "Living weapon / Equipped creature gets +6/+6 and has trample. / Equip {3}{G}{G}" (lida; aprovada aqui)
//   Tectonic Hazard — "Tectonic Hazard deals 1 damage to each opponent and each creature they control." (leitor novo)
//   Unstable Experiment — "Target player draws a card, then up to one target creature you control connives." (leitor novo; 701.50 com alvo)
// Falham no motor anterior: as quatro ficavam fora do app (duas "lidas, em revisão", duas "mágica sem script").
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S, act, poe, legais, passaAte, limpaMao } from './listas.mjs';

const revisadas = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const CMC = { Angelsong: 2, 'Colossal Dreadmask': 6, 'Tectonic Hazard': 1, 'Unstable Experiment': 2 };
const COR = { Angelsong: ['W'], 'Colossal Dreadmask': ['G'], 'Tectonic Hazard': ['R'], 'Unstable Experiment': ['U'] };
const oficial = n => { const c = revisadas.find(x => x.name === n); assert.ok(c, `texto da Scryfall de ${n} em oficiais-revisadas.json`); return { keywords: [], colors: COR[n], cmc: CMC[n], ...c }; };
const terreno = (n, c) => ({ name: n, type_line: `Basic Land — ${n}`, mana_cost: '', cmc: 0, keywords: [], oracle_text: `({T}: Add {${c}}.)`, colors: [] });
const C = {
  ...Object.fromEntries(Object.keys(CMC).map(n => [n, oficial(n)])),
  Urso: { name: 'Urso', mana_cost: '{1}{G}', cmc: 2, type_line: 'Creature — Bear', power: '2', toughness: '2', oracle_text: '', keywords: [], colors: ['G'] },
  Elfo: { name: 'Elfo', mana_cost: '{G}', cmc: 1, type_line: 'Creature — Elf', power: '1', toughness: '1', oracle_text: '', keywords: [], colors: ['G'] },
  Plains: terreno('Plains', 'W'), Island: terreno('Island', 'U'), Mountain: terreno('Mountain', 'R'), Forest: terreno('Forest', 'G'),
};
function mesa(terrenos) {
  const dk = xs => xs.map(([name, qty]) => ({ name, qty, zone: 'main' }));
  const lista = dk([...Object.keys(CMC).map(n => [n, 4]), ['Urso', 6], ['Elfo', 6], ['Plains', 8], ['Island', 8], ['Mountain', 8], ['Forest', 8]]);
  let s = E.createGame({ format: 'pauper', seed: 587, mode: 'full', cards: C, players: [{ name: 'A', deck: lista }, { name: 'B', deck: lista }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  s = limpaMao(s, 0);
  for (const n of terrenos) [s] = poe(s, 0, n);
  return s;
}
/** Resolve a pilha respondendo às decisões com `resposta(pending)` (ou a primeira ação legal). */
function resolveTudo(s, resposta = () => null) {
  for (let i = 0; i < 80 && (s.stack.length || s.pending); i++) {
    const pd = s.pending;
    if (!pd) { s = act(s, { t: 'pass', p: s.turn.priority }); continue; }
    s = act(s, resposta(pd, s) || legais(s, pd.p)[0]);
  }
  return s;
}

test('M-587 · as quatro cartas jogam no app (lidas por inteiro e aprovadas)', () => {
  for (const n of Object.keys(CMC)) assert.equal(S.coverage(C[n]).level, 'completo', n);
});

test('M-587 · Tectonic Hazard: 1 de dano no oponente e em cada criatura dele; as suas ficam intactas', () => {
  let s = mesa(['Mountain']);
  let minha, elfo, urso, h;
  [s, minha] = poe(s, 0, 'Elfo'); [s, elfo] = poe(s, 1, 'Elfo'); [s, urso] = poe(s, 1, 'Urso');
  [s, h] = poe(s, 0, 'Tectonic Hazard', 'hand');
  const vida = s.players[1].life, minhaVida = s.players[0].life;
  const c = legais(s, 0, x => x.t === 'cast' && x.oid === h)[0]; assert.ok(c, 'conjura sem alvo');
  assert.equal((c.targets || []).length, 0);
  s = resolveTudo(act(s, c));
  assert.equal(s.players[1].life, vida - 1); assert.equal(s.players[0].life, minhaVida);
  assert.equal(s.objects[elfo].zone, 'graveyard', 'o Elfo do oponente morre');
  assert.equal(s.objects[urso].zone, 'battlefield'); assert.equal(s.objects[urso].damage, 1);
  assert.equal(s.objects[minha].zone, 'battlefield'); assert.ok(!s.objects[minha].damage, 'o seu Elfo não leva dano');
});

function experimento({ comCriatura = true, descarta = 'Urso' } = {}) {
  let s = mesa(['Island', 'Island']);
  let elfo = null, u, carta;
  if (comCriatura) [s, elfo] = poe(s, 0, 'Elfo');
  [s, carta] = poe(s, 0, descarta, 'hand');
  [s, u] = poe(s, 0, 'Unstable Experiment', 'hand');
  return [s, u, elfo, carta];
}
test('M-587 · Unstable Experiment: o oponente compra e a sua criatura conspira (descartou não terreno: marcador +1/+1 nela)', () => {
  let [s, u, elfo, urso] = experimento();
  const c = legais(s, 0, x => x.t === 'cast' && x.oid === u && x.targets && x.targets[0] && x.targets[0].player === 1 && x.targets[1] && x.targets[1].oid === elfo)[0];
  assert.ok(c, 'alvos: jogador B e o seu Elfo');
  const maoB = s.zones[1].hand.length, maoA = s.zones[0].hand.length - 1;
  let pedido = null;
  s = resolveTudo(act(s, c), (pd, st) => { if (pd.kind === 'discard') { pedido = pd; assert.equal(pd.p, 0); return legais(st, 0, x => x.t === 'discard' && x.oid === urso)[0]; } return null; });
  assert.ok(pedido, 'quem controla a criatura descarta');
  assert.equal(s.zones[1].hand.length, maoB + 1, 'B compra uma');
  assert.equal(s.zones[0].hand.length, maoA, 'A comprou uma e descartou uma');
  assert.equal(s.objects[urso].zone, 'graveyard'); assert.equal(s.objects[elfo].counters.p1p1, 1);
});

test('M-587 · descartou terreno: conspira sem marcador', () => {
  let [s, u, elfo, ilha] = experimento({ descarta: 'Forest' });
  const c = legais(s, 0, x => x.t === 'cast' && x.oid === u && x.targets && x.targets[1] && x.targets[1].oid === elfo)[0];
  s = resolveTudo(act(s, c), (pd, st) => pd.kind === 'discard' ? legais(st, 0, x => x.t === 'discard' && x.oid === ilha)[0] : null);
  assert.equal(s.objects[ilha].zone, 'graveyard'); assert.ok(!s.objects[elfo].counters.p1p1);
});

test('M-587 · "up to one" (115.3): sem criatura sua, conjura só com o jogador alvo; ninguém conspira', () => {
  let [s, u] = experimento({ comCriatura: false });
  const c = legais(s, 0, x => x.t === 'cast' && x.oid === u && x.targets && x.targets[0] && x.targets[0].player === 0)[0];
  assert.ok(c, 'conjura mirando só o jogador');
  const mao = s.zones[0].hand.length - 1;
  let descartou = false;
  s = resolveTudo(act(s, c), pd => { if (pd.kind === 'discard') descartou = true; return null; });
  assert.equal(descartou, false); assert.equal(s.zones[0].hand.length, mao + 1, 'A só compra');
});

test('M-587 · a criatura alvo saiu antes de resolver: o jogador compra, ninguém conspira (608.2b)', () => {
  let [s, u, elfo] = experimento();
  const c = legais(s, 0, x => x.t === 'cast' && x.oid === u && x.targets && x.targets[0] && x.targets[0].player === 1 && x.targets[1] && x.targets[1].oid === elfo)[0];
  s = act(s, c);
  s = JSON.parse(JSON.stringify(s)); // tira o Elfo do campo com a mágica na pilha
  s.zones[0].battlefield.splice(s.zones[0].battlefield.indexOf(elfo), 1); s.zones[0].graveyard.push(elfo); s.objects[elfo].zone = 'graveyard';
  const maoB = s.zones[1].hand.length;
  let descartou = false;
  s = resolveTudo(s, pd => { if (pd.kind === 'discard') descartou = true; return null; });
  assert.equal(s.zones[1].hand.length, maoB + 1); assert.equal(descartou, false);
});

test('M-587 · Colossal Dreadmask: arma viva — o Germe 0/0 entra equipado como 6/6 com atropelar', () => {
  let s = mesa(['Forest', 'Forest', 'Forest', 'Forest', 'Forest', 'Forest']);
  let d; [s, d] = poe(s, 0, 'Colossal Dreadmask', 'hand');
  s = resolveTudo(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === d)[0]));
  const germe = s.zones[0].battlefield.map(o => s.objects[o]).find(o => o.oid !== d && /Germ/.test(E.linhaDeTipo(s, o)));
  assert.ok(germe, 'Germe no campo'); assert.equal(s.objects[d].attachedTo, germe.oid);
  assert.equal(E.stats(s, germe).power, 6); assert.equal(E.stats(s, germe).toughness, 6);
  assert.ok(E.hasKeyword(s, germe, 'trample'));
});

test('M-587 · Angelsong: ciclar da mão e, conjurada, previne todo o dano de combate do turno', () => {
  let s = mesa(['Plains', 'Plains']);
  let a; [s, a] = poe(s, 0, 'Angelsong', 'hand');
  assert.ok(legais(s, 0, x => x.oid === a && x.t !== 'cast').length, 'ciclagem {2} oferecida');
  s = resolveTudo(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === a)[0]));
  assert.equal(s.fogged, true);
});
