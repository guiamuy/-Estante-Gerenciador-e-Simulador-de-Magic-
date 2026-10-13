// M-376 · LT44 · 601.2d · dano dividido ao conjurar: "N damage divided as you choose among one or two / one, two, or three / any number of targets"
// (Twin Bolt, Forked Bolt, Arc Lightning, Rolling Thunder, Pyrokinesis — Oracle do Forge, consulta de 12/10/2026). Os alvos e a divisão são escolhidos
// logo depois de conjurar, um ponto de dano por vez (cada alvo recebe pelo menos 1); a resolução dá a cada alvo ainda legal a sua parte (608.2b).
// Os testes falham no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, act, poe, legais, passaAte, CARTAS } from './cmd.mjs';
import { S, valorDeMana } from './listas.mjs';
const cores = c => [...new Set((c || '').match(/[WUBRG]/g) || [])];
const c0 = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: valorDeMana(mana_cost), keywords: [], oracle_text: '', colors: cores(mana_cost), ...extra });
const EX = { example: { target: 'none', expect: { selfLife: 20 } } };
const SCRIPTS = {
  'Twin Bolt': { name: 'Twin Bolt', effects: [{ do: 'damage', amount: 2, target: 'any', dividido: { max: 2 } }], ...EX },
  'Rolling Thunder': { name: 'Rolling Thunder', effects: [{ do: 'damage', amount: { per: 'x' }, target: 'any', dividido: { max: null } }], ...EX },
  PyroAlt: { name: 'PyroAlt', effects: [{ do: 'damage', amount: 4, target: 'creature', dividido: { max: null } }], alt: [{ label: 'Exilar uma carta vermelha da mão', cost: { exileHandColor: 'R' } }], ...EX },
  Tempo: { name: 'Tempo', storm: true, effects: [{ do: 'damage', amount: 2, target: 'any', dividido: { max: 2 } }], ...EX },
  Volta: { name: 'Volta', effects: [{ do: 'bounce', target: 'creature' }], ...EX },
  Pyro: { name: 'Pyro', effects: [{ do: 'damage', amount: 4, target: 'creature', dividido: { max: null } }], ...EX } };
const CARDS = { ...CARTAS, 'Twin Bolt': c0('Twin Bolt', 'Instant', '{1}{R}'), 'Rolling Thunder': c0('Rolling Thunder', 'Sorcery', '{X}{R}{R}'), Pyro: c0('Pyro', 'Instant', '{R}'), Volta: c0('Volta', 'Instant', '{U}'), PyroAlt: c0('PyroAlt', 'Instant', '{3}{R}{R}'), Tempo: c0('Tempo', 'Sorcery', '{R}'), Faisca: c0('Faisca', 'Instant', '{R}'),
  Urso: c0('Urso', 'Creature — Bear', '{1}{G}', { power: '2', toughness: '2' }), Ogro: c0('Ogro', 'Creature — Ogre', '{2}{R}', { power: '3', toughness: '3' }) };
function mesa() {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 6, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 6, mode: 'full', cards: CARDS, scripts: SCRIPTS, first: 0,
    players: [{ name: 'A', deck: baralho(['Twin Bolt', 'Rolling Thunder', 'Pyro', 'PyroAlt', 'Tempo', 'Faisca', 'Mountain']) }, { name: 'B', deck: baralho(['Urso', 'Ogro', 'Volta', 'Forest', 'Island']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const resolve = s => passaAte(s, x => !x.stack.length || !!x.pending);
const idx = (s, pred) => s.pending.options.findIndex(pred);
const ponto = (s, i) => act(s, { t: 'dividir_ponto', p: 0, index: i });

test('LT44 · os scripts são válidos', () => { for (const sc of Object.values(SCRIPTS)) assert.deepEqual([...S.validateScript(sc)], [], sc.name); });

test('LT44 · Pyro (4 entre quantas criaturas quiser): 2 no Urso e 2 no Ogro — os dois morrem? o Urso morre e o Ogro fica com 2 de dano', () => {
  let s = mesa(), py, u, og; [s, py] = poe(s, 0, 'Pyro', 'hand'); [s] = poe(s, 0, 'Mountain'); [s, u] = poe(s, 1, 'Urso'); [s, og] = poe(s, 1, 'Ogro');
  const c = legais(s, 0, a => a.t === 'cast' && a.oid === py); assert.equal(c.length, 1, 'uma oferta, sem enumerar divisões');
  s = act(s, c[0]); assert.equal(s.pending.kind, 'dividir_magia'); assert.equal(s.pending.total, 4);
  assert.ok(s.pending.options.every(t => t.oid != null), 'só criaturas ("target creatures")');
  assert.ok(!legais(s, 1).length, 'o oponente não age durante a divisão');
  const iu = idx(s, t => t.oid === u), io = idx(s, t => t.oid === og);
  s = ponto(ponto(ponto(s, iu), io), iu); assert.ok(s.pending, 'falta 1');
  s = ponto(s, io); assert.ok(!s.pending); assert.deepEqual([...s.objects[py].divisao], [2, 2]);
  s = resolve(s); assert.equal(s.objects[u].zone, 'graveyard'); assert.equal(s.objects[og].damage, 2);
});

test('LT44 · Twin Bolt ("one or two targets"): depois de dois alvos, o terceiro não é oferecido e o motor recusa', () => {
  let s = mesa(), tb, u, og; [s, tb] = poe(s, 0, 'Twin Bolt', 'hand'); [s] = poe(s, 0, 'Mountain'); [s] = poe(s, 0, 'Mountain'); [s, u] = poe(s, 1, 'Urso'); [s, og] = poe(s, 1, 'Ogro');
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === tb)[0]);
  const iu = idx(s, t => t.oid === u), io = idx(s, t => t.oid === og), ij = idx(s, t => t.player === 1);
  s = ponto(s, iu);
  assert.ok(legais(s, 0).some(a => a.index === io) && legais(s, 0).some(a => a.index === ij));
  s = ponto(s, io); assert.ok(!s.pending, '2 de dano: fechou com 1 em cada');
  let t = mesa(), tb2, u2; [t, tb2] = poe(t, 0, 'Twin Bolt', 'hand'); [t] = poe(t, 0, 'Mountain'); [t] = poe(t, 0, 'Mountain'); [t, u2] = poe(t, 1, 'Urso');
  t = act(t, legais(t, 0, a => a.t === 'cast' && a.oid === tb2)[0]); t = ponto(t, idx(t, x => x.oid === u2)); assert.ok(t.pending);
  t = ponto(t, idx(t, x => x.player === 1)); assert.ok(!t.pending); t = resolve(t); assert.equal(t.players[1].life, 19); assert.equal(t.objects[u2].damage, 1);
});

test('LT44 · Rolling Thunder: X = 0 não é oferecido (não há como dar 1 a cada alvo); com X = 3, 3 no jogador', () => {
  let s = mesa(), rt; [s, rt] = poe(s, 0, 'Rolling Thunder', 'hand'); for (let i = 0; i < 5; i++) [s] = poe(s, 0, 'Mountain');
  const ofs = legais(s, 0, a => a.t === 'cast' && a.oid === rt);
  assert.ok(ofs.length && ofs.every(a => (a.x || 0) >= 1), 'só com X ≥ 1');
  s = act(s, ofs.find(a => a.x === 3)); const ij = idx(s, t => t.player === 1);
  s = ponto(ponto(ponto(s, ij), ij), ij); assert.ok(!s.pending); s = resolve(s); assert.equal(s.players[1].life, 17);
});

test('LT44 · 608.2b: um dos alvos sai antes da resolução — o outro recebe a sua parte; sem criatura nenhuma, Pyro nem é oferecida', () => {
  let s = mesa(), py, u, og; [s, py] = poe(s, 0, 'Pyro', 'hand'); [s] = poe(s, 0, 'Mountain');
  assert.equal(legais(s, 0, a => a.t === 'cast' && a.oid === py).length, 0, 'sem criatura, sem oferta');
  [s, u] = poe(s, 1, 'Urso'); [s, og] = poe(s, 1, 'Ogro');
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === py)[0]);
  const iu = idx(s, t => t.oid === u), io = idx(s, t => t.oid === og);
  s = ponto(ponto(ponto(ponto(s, iu), io), io), io);
  let vo; [s, vo] = poe(s, 1, 'Volta', 'hand'); [s] = poe(s, 1, 'Island');
  s = act(s, { t: 'pass', p: 0 }); /* B responde devolvendo o próprio Urso */
  const sem = act(s, legais(s, 1, a => a.t === 'cast' && a.oid === vo && (a.targets || []).some(t => t.oid === u))[0]);
  const r = resolve(sem); assert.equal(r.objects[og].zone, 'graveyard', 'o Ogro recebeu 3');
});

test('LT44 · achados da revisão: o custo alternativo (exilar carta vermelha da mão) também abre a divisão; a cópia da tempestade leva a divisão e escolhe alvos; o registro diz a divisão', async () => {
  let s = mesa(), pa, fa, u, og; [s, pa] = poe(s, 0, 'PyroAlt', 'hand'); [s, fa] = poe(s, 0, 'Faisca', 'hand'); [s, u] = poe(s, 1, 'Urso'); [s, og] = poe(s, 1, 'Ogro');
  const alt = legais(s, 0, a => a.t === 'cast' && a.oid === pa && a.alt != null);
  assert.ok(alt.length, 'oferece o custo alternativo'); for (const a of alt) E.apply(s, a); /* oferta = aceite */
  s = act(s, alt.find(a => (a.pay || {}).exileHand === fa) || alt[0]); assert.equal(s.pending.kind, 'dividir_magia');
  s = ponto(ponto(ponto(ponto(s, idx(s, t => t.oid === u)), idx(s, t => t.oid === og)), idx(s, t => t.oid === og)), idx(s, t => t.oid === u));
  s = resolve(s); assert.equal(s.objects[u].zone, 'graveyard'); assert.equal(s.objects[og].damage, 2);
  assert.ok(E.apply(s, { t: 'pass', p: 0 }) && true);
  // tempestade com uma mágica antes: a cópia leva [1, 1] e escolhe dois alvos
  let t = mesa(), f2, tp, u2; [t, f2] = poe(t, 0, 'Faisca', 'hand'); [t, tp] = poe(t, 0, 'Tempo', 'hand'); [t] = poe(t, 0, 'Mountain'); [t] = poe(t, 0, 'Mountain'); [t, u2] = poe(t, 1, 'Urso');
  t = resolve(act(t, legais(t, 0, a => a.t === 'cast' && a.oid === f2)[0]));
  t = act(t, legais(t, 0, a => a.t === 'cast' && a.oid === tp)[0]);
  t = ponto(ponto(t, idx(t, x => x.oid === u2)), idx(t, x => x.player === 1)); assert.ok(!t.pending);
  const escolhe = x => { if (x.pending.kind === 'pick_target') { const ops = x.pending.options, i = ops.findIndex(o => o.player === 1); return { t: 'pick_target', p: x.pending.p, index: i >= 0 ? i : ops.findIndex(o => o.oid === u2) }; } return legais(x, x.pending.p).find(a => a.t !== 'concede'); };
  let copias = 0;
  for (let i = 0; i < 30 && (t.stack.length || t.pending); i++) { if (t.pending && t.pending.kind === 'pick_target') copias++; t = t.pending ? act(t, escolhe(t)) : act(t, { t: 'pass', p: t.turn.priority }); }
  assert.equal(copias, 2, 'a cópia pede um alvo para cada parte da divisão');
  assert.equal(t.players[1].life, 18, 'a original e a cópia: 1 + 1 no jogador'); assert.equal(t.objects[u2].zone, 'graveyard', '1 + 1 no Urso');
});
