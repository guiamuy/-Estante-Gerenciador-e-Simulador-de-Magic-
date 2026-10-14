// T-95 · CR5 · Recomeçar o jogo (Comprehensive Rules 727.1 a 727.5, com 103, 607.2a e 400.7).
// Texto da regra: .regras/cr-2026-09-25.txt. Carta com o texto oficial de .listas/oficiais-tipos.json (Oracle do Forge, clone de 13/10/2026,
// conferido no master em 14/10/2026): Karn Liberated. "Urso", "Muralha", "Choque" e "Bênção" são cartas de teste.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { E, S as SC, T, J, act, poe, legais, passaAte, valorDeMana } from './listas.mjs';

const L = n => JSON.parse(readFileSync(new URL('./.listas/' + n, import.meta.url), 'utf8')).cartas;
const KL = 'Karn Liberated';
const C = {};
for (const c of L('oficiais-tipos.json').filter(x => x.name === KL)) C[c.name] = { name: c.name, type_line: c.type_line, mana_cost: c.mana_cost, cmc: valorDeMana(c.mana_cost), keywords: [], oracle_text: c.oracle_text, colors: [], loyalty: c.loyalty };
C.Wastes = { name: 'Wastes', type_line: 'Basic Land', mana_cost: '', cmc: 0, keywords: [], oracle_text: '{T}: Add {C}.', colors: [] };
const carta = (name, type_line, extra = {}) => { C[name] = { name, type_line, mana_cost: '{1}', cmc: 1, keywords: [], oracle_text: '', colors: [], ...extra }; };
carta('Urso', 'Creature — Bear', { power: '2', toughness: '2' }); carta('Muralha', 'Artifact Creature — Wall', { power: '0', toughness: '4' }); carta('Choque', 'Instant'); carta('Bênção', 'Enchantment — Aura');
const EX = { example: { target: 'none', expect: { selfLife: 0 } } };
const SCRIPTS = {
  'Choque': { name: 'Choque', effects: [{ do: 'damage', amount: 2, target: 'any' }], ...EX },
  'Bênção': { name: 'Bênção', aura: { enchant: 'creature' }, grants: { power: 1, toughness: 1 }, example: { target: 'own-creature', expect: { attached: true } } }, // "Enchant creature · Enchanted creature gets +1/+1."
};
const DECK = [{ name: KL, qty: 2, zone: 'main' }, { name: 'Urso', qty: 6, zone: 'main' }, { name: 'Muralha', qty: 4, zone: 'main' }, { name: 'Choque', qty: 4, zone: 'main' }, { name: 'Bênção', qty: 4, zone: 'main' }, { name: 'Wastes', qty: 20, zone: 'main' }];
function mesa(seed = 1) {
  let s = E.createGame({ format: 'livre', seed, mode: 'full', cards: C, scripts: SCRIPTS, players: [{ name: 'A', deck: DECK }, { name: 'B', deck: DECK }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const eq = (a, b, m) => assert.deepStrictEqual(J(a), J(b), m);
const lealdade = (s, oid, n) => { s = J(s); s.objects[oid].counters.loyalty = n; return s; };
const resolve = s => { for (let i = 0; i < 30; i++) { s = passaAte(s, x => !x.stack.length || !!x.pending); if (!s.pending) return s; const os = legais(s, s.pending.p); s = act(s, os.find(a => a.t === 'pick') || os.find(a => a.t === 'pick_done') || os[0]); } return s; };
const ult = (s, karn) => { s = lealdade(s, karn, 14); const a = legais(s, 0, x => x.t === 'activate' && x.oid === karn && !(x.targets || []).length).slice(-1)[0]; assert.ok(a, '−14'); return resolve(act(s, a)); };
const donos = (s, p) => Object.values(s.objects).filter(o => o.owner === p && !o.ability && !o.token);

test('CR 727.1 / 727.1a / 727.2 · Karn Liberated (texto oficial), −14: o jogo recomeça — todas as cartas no grimório do dono, sete na mão, vida inicial, quem ativou começa; fichas e estado da partida antiga somem', () => {
  let s = mesa(); let k, u; [s, k] = poe(s, 0, KL, 'battlefield'); [s, u] = poe(s, 1, 'Urso', 'graveyard');
  s = J(s); s.players[0].life = 7; s.players[1].life = 3; s.monarca = 1; s.players[1].poison = 4;
  const total = [donos(s, 0).length, donos(s, 1).length];
  const fresco = Object.keys(E.createGame({ format: 'livre', seed: 3, mode: 'full', cards: C, scripts: SCRIPTS, players: [{ name: 'A', deck: DECK }, { name: 'B', deck: DECK }] })).sort();
  s = ult(s, k);
  eq([s.status, s.turn.active, s.turn.number], ['mulligan', 0, 0], 'um jogo novo, com A começando');
  eq(Object.keys(s).sort(), fresco, 'só as chaves de uma partida recém-criada (o monarca não sobrevive)');
  eq([s.zones[0].hand.length, s.zones[1].hand.length], [7, 7]);
  eq([0, 1].map(p => s.zones[p].library.length + s.zones[p].hand.length), total, 'cada carta no grimório ou na mão do dono');
  eq([s.players[0].life, s.players[1].life, s.players[1].poison || 0], [20, 20, 0]);
  eq([s.objects[u].zone, s.objects[u].owner], [s.zones[1].hand.includes(u) ? 'hand' : 'library', 1], 'o Urso do cemitério de B voltou para B');
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  eq([s.status, s.turn.active, s.turn.number], ['playing', 0, 1]);
});

test('CR 727.5 / 727.4 · as cartas de permanente que não são Aura exiladas com o Karn ficam fora do grimório e entram no campo de quem o controla logo antes do primeiro desvirar; a Aura e a instantânea exiladas com ele voltam ao grimório', () => {
  let s = mesa(); let k, u, b, c; [s, k] = poe(s, 0, KL, 'battlefield'); [s, u] = poe(s, 1, 'Urso', 'battlefield');
  s = lealdade(s, k, 6);
  s = resolve(act(s, legais(s, 0, x => x.t === 'activate' && x.oid === k && x.targets && x.targets[0] && x.targets[0].oid === u)[0]));
  eq([s.objects[u].zone, J(s.objects[u].exiladaPorT)], ['exile', { oid: k, z: s.objects[k].zc || 0 }], '−3: o Urso de B exilado com o Karn');
  [s, b] = poe(s, 1, 'Bênção', 'exile'); [s, c] = poe(s, 1, 'Choque', 'exile'); s = J(s); s.objects[b].exiladaPorT = { oid: k, z: s.objects[k].zc || 0 }; s.objects[c].exiladaPorT = { oid: k, z: s.objects[k].zc || 0 };
  s = passaAte(s, x => x.turn.active === 0 && x.turn.number > s.turn.number && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  s = ult(s, k);
  eq([s.objects[u].zone, s.zones[1].library.includes(b) || s.zones[1].hand.includes(b), s.zones[1].library.includes(c) || s.zones[1].hand.includes(c)], ['exile', true, true], 'durante os mulligans o Urso segue no exílio');
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  eq([s.objects[u].zone, s.objects[u].controller, s.objects[u].owner], ['battlefield', 0, 1], 'no campo de A, ainda de B (727.2)');
});

test('CR 607.2a / 400.7 · "exiled with Karn Liberated" é só deste Karn: a carta exilada por outro Karn (ou por este numa vida anterior) volta ao grimório', () => {
  let s = mesa(); let k, u, w; [s, k] = poe(s, 0, KL, 'battlefield'); [s, u] = poe(s, 1, 'Urso', 'exile'); [s, w] = poe(s, 1, 'Muralha', 'exile');
  s = J(s); s.objects[u].exiladaPorT = { oid: k, z: (s.objects[k].zc || 0) + 7 }; s.objects[w].exiladaPorT = { oid: 'outro', z: 0 };
  s = ult(s, k);
  eq([s.objects[u].zone === 'exile', s.objects[w].zone === 'exile'], [false, false]);
});

test('Karn Liberated +4 (texto oficial): o jogador alvo escolhe uma carta da própria mão e a exila; ela fica marcada como exilada com o Karn', () => {
  let s = mesa(); let k; [s, k] = poe(s, 0, KL, 'battlefield'); s = lealdade(s, k, 6);
  const a = legais(s, 0, x => x.t === 'activate' && x.oid === k && x.targets && x.targets[0] && x.targets[0].player === 1)[0];
  assert.ok(a, '+4 no jogador B');
  s = passaAte(act(s, a), x => !!x.pending || !x.stack.length);
  eq([s.pending && s.pending.kind, s.pending && s.pending.p], ['pick', 1], 'quem escolhe é B');
  const escolhida = s.pending.from[0]; s = resolve(act(s, { t: 'pick', p: 1, oid: escolhida }));
  if (s.pending && s.pending.kind === 'pick') s = resolve(act(s, { t: 'pick_done', p: 1 }));
  eq([s.objects[escolhida].zone, (s.objects[escolhida].exiladaPorT || {}).oid], ['exile', k]);
});

test('CR 727.3 · quem tem menos de sete cartas no grimório no jogo novo perde na primeira conferência de ações de estado do primeiro turno', () => {
  const deckB = [{ name: 'Choque', qty: 4, zone: 'main' }, { name: 'Wastes', qty: 20, zone: 'main' }];
  let s = E.createGame({ format: 'livre', seed: 1, mode: 'full', cards: C, scripts: SCRIPTS, players: [{ name: 'A', deck: DECK }, { name: 'B', deck: deckB }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  let k; [s, k] = poe(s, 0, KL, 'battlefield');
  s = J(s); const terrenos = donos(s, 1).filter(o => o.name === 'Wastes').slice(0, 18); // 18 terrenos de B exilados com o Karn: no jogo novo B tem 6 cartas
  for (const o of terrenos) { const z = s.zones[1][o.zone]; z.splice(z.indexOf(o.oid), 1); o.zone = 'exile'; s.zones[1].exile.push(o.oid); o.exiladaPorT = { oid: k, z: s.objects[k].zc || 0 }; }
  s = ult(s, k);
  eq([s.status, s.players[1].lost, s.zones[1].hand.length + s.zones[1].library.length], ['mulligan', false, 6], 'nos mulligans ainda não perdeu');
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  eq(s.players[1].lost, true, 'perdeu no primeiro turno');
});

test('CR 727 · validador e pilha explicada', () => {
  const v = sc => J(SC.validateScript({ name: 'X', ...sc, example: { action: 'etb', target: 'none', expect: { attached: false } } }));
  eq(v({ loyalty: [{ cost: -14, label: 'x', effects: [{ do: 'recomeca_jogo' }] }] }), []);
  assert.match(T.descreveEfeitos([{ do: 'recomeca_jogo' }]), /recomeça/);
});
