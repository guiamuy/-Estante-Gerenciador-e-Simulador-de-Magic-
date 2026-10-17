// M-437 · LT103 · Searing Blaze ("Searing Blaze deals 1 damage to target player or planeswalker and 1 damage to target creature that player or that
// planeswalker's controller controls. Landfall — If you had a land enter the battlefield under your control this turn, … 3 damage … and 3 damage … instead.")
// Texto da Scryfall de 17/10/2026 UTC (.listas/oficiais-revisadas.json); rulings de 01/03/2010 e 08/11/2024. Campo novo `doJogadorDoPrimeiro` (o segundo alvo
// depende do primeiro, também na resolução: 608.2b) e condição `landfall-turno`. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, J, act, poe, legais, passaAte, S, T } from './listas.mjs';
const OF = JSON.parse(readFileSync(new URL('./.listas/oficiais-revisadas.json', import.meta.url), 'utf8')).cartas;
const c0 = OF.find(x => x.name === 'Searing Blaze');
const C = { 'Searing Blaze': { name: c0.name, type_line: c0.type_line, mana_cost: c0.mana_cost, cmc: 2, keywords: [], oracle_text: c0.oracle_text, colors: ['R'] },
  Urso: { name: 'Urso', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, keywords: [], oracle_text: '', colors: ['G'], power: '2', toughness: '2' },
  Ogro: { name: 'Ogro', type_line: 'Creature — Ogre', mana_cost: '{2}{R}', cmc: 3, keywords: [], oracle_text: '', colors: ['R'], power: '3', toughness: '3' },
  Mountain: { name: 'Mountain', type_line: 'Basic Land — Mountain', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {R}.)', colors: [] } };
function mesa(seed = 46) {
  const b = ns => ns.map(name => ({ name, qty: name === 'Mountain' ? 20 : 6, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, first: 0, players: [{ name: 'A', deck: b(['Searing Blaze', 'Urso', 'Ogro', 'Mountain']) }, { name: 'B', deck: b(['Urso', 'Ogro', 'Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending, 40);
function cena({ comTerreno = false } = {}) {
  let s = mesa(), sb, meu, ou, oo; [s, sb] = poe(s, 0, 'Searing Blaze', 'hand'); for (let i = 0; i < 2; i++) [s] = poe(s, 0, 'Mountain');
  [s, meu] = poe(s, 0, 'Urso'); [s, ou] = poe(s, 1, 'Urso'); [s, oo] = poe(s, 1, 'Ogro');
  if (comTerreno) { let m; [s, m] = poe(s, 0, 'Mountain', 'hand'); s = act(s, legais(s, 0, a => a.t === 'play_land' && a.oid === m)[0]); }
  return { s, sb, meu, ou, oo };
}
const blaze = (s, sb, alvoJ, alvoC) => legais(s, 0, a => a.t === 'cast' && a.oid === sb && a.targets && a.targets[0].player === alvoJ && a.targets[1] && a.targets[1].oid === alvoC)[0];

test('LT103 · Searing Blaze joga pelo leitor aprovado', () => {
  assert.equal(S.coverage(C['Searing Blaze']).level, 'completo'); assert.equal(S.APROVADAS['Searing Blaze'].leva, 'M-437');
});

test('LT103 · os dois alvos: um jogador e uma criatura que ESSE jogador controla (todo par oferecido respeita)', () => {
  const { s, sb, meu, ou } = cena(); const as = legais(s, 0, a => a.t === 'cast' && a.oid === sb);
  assert.ok(as.length); for (const a of as) { const q = a.targets[0].player != null ? a.targets[0].player : s.objects[a.targets[0].oid].controller; assert.equal(s.objects[a.targets[1].oid].controller, q, JSON.stringify(a.targets)); }
  assert.ok(blaze(s, sb, 1, ou) && blaze(s, sb, 0, meu)); assert.ok(!blaze(s, sb, 1, meu), 'a sua criatura com o oponente como alvo não');
});

test('LT103 · sem terreno neste turno: 1 e 1; com terreno entrando sob seu controle neste turno: 3 e 3 (só o "instead")', () => {
  let { s, sb, ou } = cena(); let t = resolve(act(s, blaze(s, sb, 1, ou))); assert.equal(t.players[1].life, 19); assert.equal(t.objects[ou].damage, 1); assert.equal(t.objects[ou].zone, 'battlefield');
  ({ s, sb, ou } = cena({ comTerreno: true })); t = resolve(act(s, blaze(s, sb, 1, ou))); assert.equal(t.players[1].life, 17); assert.equal(t.objects[ou].zone, 'graveyard');
});

test('LT103 · o terreno do turno anterior não conta; o do oponente não conta', () => {
  let s = mesa(), sb, ou, m; [s, m] = poe(s, 0, 'Mountain', 'hand'); s = act(s, legais(s, 0, a => a.t === 'play_land' && a.oid === m)[0]);
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending); [s, m] = poe(s, 1, 'Mountain', 'hand'); s = act(s, legais(s, 1, a => a.t === 'play_land' && a.oid === m)[0]);
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  [s, sb] = poe(s, 0, 'Searing Blaze', 'hand'); for (let i = 0; i < 2; i++) [s] = poe(s, 0, 'Mountain'); [s, ou] = poe(s, 1, 'Ogro');
  // as Montanhas postas à mão não entram pelo caminho de jogo: a marca vem só do terreno jogado
  const vida = s.players[1].life; const t = resolve(act(s, blaze(s, sb, 1, ou))); assert.equal(t.players[1].life, vida - 1);
});

test('LT103 · a criatura muda de controlador antes de resolver: ela é alvo ilegal (608.2b) e só o jogador recebe dano', () => {
  let { s, sb, ou } = cena(); s = act(s, blaze(s, sb, 1, ou)); s = J(s); s.objects[ou].controller = 0;
  const t = resolve(s); assert.equal(t.players[1].life, 19); assert.equal(t.objects[ou].damage || 0, 0);
});

test('LT103 · sem criatura do jogador alvo, não há par: sem nenhuma criatura no campo, não conjura (ruling de 01/03/2010)', () => {
  let s = mesa(), sb; [s, sb] = poe(s, 0, 'Searing Blaze', 'hand'); for (let i = 0; i < 2; i++) [s] = poe(s, 0, 'Mountain');
  assert.equal(legais(s, 0, a => a.t === 'cast' && a.oid === sb).length, 0);
  let u; [s, u] = poe(s, 1, 'Urso'); assert.ok(legais(s, 0, a => a.t === 'cast' && a.oid === sb).every(a => a.targets[0].player === 1));
});
