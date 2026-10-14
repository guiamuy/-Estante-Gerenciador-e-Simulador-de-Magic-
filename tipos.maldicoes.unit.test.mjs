// T-94 · CR5 · Aura que encanta um jogador — Maldições (Comprehensive Rules 303.4a–c, com 704.5m, 400.7 e 603.2).
// Texto da regra: .regras/cr-2026-09-25.txt. Cartas com o texto oficial de .listas/oficiais-tipos.json (Oracle do Forge, clone de 13/10/2026,
// conferido no master em 14/10/2026): Curse of the Bloody Tome, Curse of Thirst e Curse of Oblivion. "Urso" e "Volta" são cartas de teste.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S as SC, T, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const NOMES = ['Curse of the Bloody Tome', 'Curse of Thirst', 'Curse of Oblivion'];
const C = {};
for (const c of L('oficiais-tipos.json').filter(x => NOMES.includes(x.name)))
  C[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: [] };
C.Swamp = { name: 'Swamp', type_line: 'Basic Land — Swamp', mana_cost: '', cmc: 0, keywords: [], oracle_text: '({T}: Add {B}.)', colors: [] };
const carta = (name, type_line, extra = {}) => { C[name] = { name, type_line, mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra }; };
carta('Urso', 'Creature — Bear', { power: '2', toughness: '2' }); carta('Volta', 'Instant');
const SCRIPTS = { 'Volta': { name: 'Volta', effects: [{ do: 'bounce', target: 'permanent' }], example: { target: 'none', expect: { selfLife: 0 } } } }; // "Return target permanent to its owner's hand."
const BT = 'Curse of the Bloody Tome', TH = 'Curse of Thirst', OB = 'Curse of Oblivion';
function mesa(seed = 1) {
  const deck = [...Object.keys(C).filter(n => n !== 'Swamp').map(name => ({ name, qty: 3, zone: 'main' })), { name: 'Swamp', qty: 16, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SCRIPTS, players: [{ name: 'A', deck }, { name: 'B', deck }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const mana = (s, p = 0, n = 9) => { s = J(s); for (const c of 'WUBRGC') s.players[p].pool[c] += n; return s; };
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const resolve = s => { for (let i = 0; i < 30; i++) { s = passaAte(s, x => !x.stack.length || !!x.pending); if (!s.pending) return s; const os = legais(s, s.pending.p); s = act(s, os.find(a => a.t === 'pick_done') || os[0]); } return s; };
const amaldicoa = (s, nome, jogador = 1) => { let o; [s, o] = poe(s, 0, nome, 'hand'); s = mana(s); const a = legais(s, 0, x => x.t === 'cast' && x.oid === o && x.targets && x.targets[0] && x.targets[0].player === jogador)[0]; assert.ok(a, 'conjurar ' + nome + ' no jogador ' + jogador); return [resolve(act(s, a)), o]; };
const manutencaoDe = (s, p) => resolve(passaAte(s, x => x.turn.active === p && x.turn.step === 'upkeep' && x.turn.number > s.turn.number && (!!x.stack.length || !!x.pending)));

test('CR 303.4a–b · Curse of the Bloody Tome (texto oficial): a mágica mira um jogador; ao resolver, fica no campo de quem conjurou encantando o jogador', () => {
  let s = mesa(); let o; [s, o] = poe(s, 0, BT, 'hand'); s = mana(s);
  const alvos = legais(s, 0, x => x.t === 'cast' && x.oid === o).map(x => J(x.targets));
  eq(alvos.sort(), [[{ player: 0 }], [{ player: 1 }]].sort(), 'mira qualquer jogador, e só jogador');
  [s, o] = amaldicoa(s, BT);
  eq([s.objects[o].zone, s.objects[o].controller, E.jogadorEncantadoT(s, s.objects[o]), s.objects[o].attachedTo || null], ['battlefield', 0, 1, null]);
});

test('CR 303.4b / 603.2 · "at the beginning of enchanted player’s upkeep, that player mills two cards": na manutenção de B, B mói; na de A, nada', () => {
  let s = mesa(); [s] = amaldicoa(s, BT);
  const libA = s.zones[0].library.length, libB = s.zones[1].library.length;
  s = manutencaoDe(s, 1);
  eq(libB - s.zones[1].library.length, 2 + 0, 'B moeu duas (a compra de B vem depois da manutenção)');
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1');
  eq(libA - s.zones[0].library.length, 1, 'A só comprou');
});

test('Curse of Thirst (texto oficial): dano igual ao número de Maldições no jogador; a Maldição no outro jogador não conta', () => {
  let s = mesa(); [s] = amaldicoa(s, TH); [s] = amaldicoa(s, BT); [s] = amaldicoa(s, OB, 0);
  const v = s.players[1].life;
  s = manutencaoDe(s, 1);
  eq(v - s.players[1].life, 2, 'Thirst e Bloody Tome em B: 2');
});

test('Curse of Oblivion (texto oficial): o jogador encantado exila duas cartas do próprio cemitério', () => {
  let s = mesa(); [s] = amaldicoa(s, OB); let u1, u2, u3; [s, u1] = poe(s, 1, 'Urso', 'graveyard'); [s, u2] = poe(s, 1, 'Urso', 'graveyard'); [s, u3] = poe(s, 1, 'Urso', 'graveyard');
  s = manutencaoDe(s, 1);
  eq([u1, u2, u3].filter(o => s.objects[o].zone === 'exile').length, 2);
});

test('CR 303.4c / 704.5m · o jogador que sai do jogo leva a Maldição ao cemitério; a Maldição que sai e volta ao campo sem ser conjurada não encanta ninguém (400.7)', () => {
  let s = mesa(); let o; [s, o] = amaldicoa(s, BT);
  let t = J(s); t.players[1].lost = true;
  t = act(t, { t: 'pass', p: t.turn.priority });
  eq(t.objects[o].zone === 'battlefield' && E.jogadorEncantadoT(t, t.objects[o]) != null, false, 'jogador fora do jogo: não encanta mais');
  let v; [s, v] = poe(s, 0, 'Volta', 'hand'); s = mana(s);
  s = resolve(act(s, legais(s, 0, x => x.t === 'cast' && x.oid === v && x.targets[0].oid === o)[0]));
  eq(s.objects[o].zone, 'hand', 'voltou para a mão');
  t = J(s); const z = t.zones[0]; z.hand.splice(z.hand.indexOf(o), 1); z.battlefield.push(o); t.objects[o].zone = 'battlefield'; t.objects[o].zc = (t.objects[o].zc || 0) + 1;
  t = act(t, { t: 'pass', p: t.turn.priority });
  eq(t.objects[o].zone, 'graveyard', 'sem ser conjurada e sem jogador: cai (704.5m)');
});

test('CR 303.4b · a mesa mostra quem está encantado; a pilha explicada fala do jogador encantado', () => {
  let s = mesa(); [s] = amaldicoa(s, BT);
  eq(E.encantamentosDoJogadorT(s, 1), 'Encantado por ' + BT);
  eq(E.encantamentosDoJogadorT(s, 0), null);
  assert.match(T.descreveEfeitos([{ do: 'mill', amount: 2, target: 'enchanted-player' }]), /jogador encantado/);
});

test('CR 303.4 · validador: "Enchant player" e o alvo enchanted-player', () => {
  const v = sc => J(SC.validateScript({ name: 'X', ...sc, example: { target: 'opponent', expect: { attached: false } } }));
  eq(v({ aura: { enchant: 'player' }, abilities: [{ kind: 'triggered', when: 'enchanted-player-upkeep', effects: [{ do: 'mill', amount: 2, target: 'enchanted-player' }] }] }), []);
  assert.ok(v({ aura: { enchant: 'jogador' }, abilities: [{ kind: 'triggered', when: 'upkeep', effects: [{ do: 'gain', amount: 1 }] }] }).some(e => /anexar/.test(e)));
});
