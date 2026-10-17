// M-485 · LT151 · correções da revisão independente de M-476…M-484: (1) o efeito na própria fonte depois de uma escolha, no caminho
// do "sim" (gatilho opcional ou "pode pagar"), voltou a acontecer (regressão da M-475); (2) 400.7 também depois da escolha — a
// permanente que saiu e voltou não recebe o efeito, inclusive no gatilho obrigatório (Norn's Wellspring piscada depois da vidência);
// (3) o nome curto da lendária não casa com "Nome the Outro" de outro objeto. Cartas de teste com script declarado. Falha no motor anterior.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadModules } from './_load.mjs';
import { E, J, act, poe, legais, passaAte } from './listas.mjs';
const { leitor: L } = loadModules();
const EX = { action: 'etb', target: 'none', expect: { attached: false } };
const DEF = {
  OptScry: [{ optional: true }, [{ do: 'scry', amount: 1 }, { do: 'counters', amount: 1, target: 'self-source' }]],
  OptDisc: [{ optional: true }, [{ do: 'draw', amount: 1 }, { do: 'discard', amount: 1 }, { do: 'continuo', target: 'self-source', poder: 2, resistencia: 2 }]],
  PayScry: [{ mayPay: { mana: '{1}' } }, [{ do: 'scry', amount: 1 }, { do: 'counters', amount: 1, target: 'self-source' }]],
  ObScry: [{}, [{ do: 'scry', amount: 1 }, { do: 'counters', amount: 1, target: 'self-source' }]] };
const carta = (name, tl, x = {}) => ({ name, type_line: tl, mana_cost: '{0}', cmc: 0, keywords: [], oracle_text: '', colors: [], ...x });
const C = { Urso: carta('Urso', 'Creature — Bear', { power: '2', toughness: '2' }), Island: carta('Island', 'Basic Land — Island', { mana_cost: '', oracle_text: '({T}: Add {U}.)' }) };
const SCR = {};
for (const [n, [x, e]] of Object.entries(DEF)) { C[n] = carta(n, 'Creature — Golem', { power: '1', toughness: '1' }); SCR[n] = { name: n, example: EX, abilities: [{ kind: 'triggered', when: 'other-dies', filter: { types: ['creature'] }, ...x, effects: e }] }; }
function mesa() {
  const b = ns => ns.map(name => ({ name, qty: name === 'Island' ? 12 : 4, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 155, mode: 'full', cards: C, scripts: SCR, first: 0, players: [{ name: 'A', deck: b([...Object.keys(DEF), 'Urso', 'Island']) }, { name: 'B', deck: b(['Urso', 'Island']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const comSim = s => { for (let i = 0; i < 60 && (s.stack.length || s.pending); i++) { const pk = s.pending; const l = legais(s, pk ? pk.p : s.turn.priority); s = act(s, l.find(x => x.t === 'pay') || l.find(x => x.t === 'pass') || l[0]); } return s; };
const roda = (n, pisca) => {
  let s = mesa(), d, u; [s, d] = poe(s, 0, n); [s, u] = poe(s, 0, 'Urso'); for (let i = 0; i < 2; i++) [s] = poe(s, 0, 'Island');
  s = J(s); s.objects[u].damage = 9; s = act(s, { t: 'pass', p: 0 });
  if (pisca) { s = J(s); E.moveObject(s, d, 'hand'); E.moveObject(s, d, 'battlefield', { controller: 0 }); }
  s = comSim(s); return n === 'OptDisc' ? E.stats(s, s.objects[d]).power === 3 : ((s.objects[d].counters || {}).p1p1 || 0) === 1;
};

for (const n of Object.keys(DEF)) {
  test(`LT151 · ${n}: o efeito na fonte depois da escolha acontece com a fonte parada`, () => { assert.ok(roda(n, false)); });
  test(`LT151 · ${n}: a fonte que saiu e voltou não recebe o efeito (400.7)`, () => { assert.ok(!roda(n, true)); });
}

test('LT151 · nome curto da lendária não casa com "Nome the Outro" de outro objeto', () => {
  const base = { mana_cost: '{3}', cmc: 3, keywords: [], colors: [], power: '1', toughness: '1' };
  const tuk = L.ler({ ...base, name: 'Zed the Bold', type_line: 'Legendary Creature — Human', oracle_text: 'When Zed enters, create a token named Zed the Returned.' });
  assert.ok(!JSON.stringify(tuk).includes('~ the Returned'), JSON.stringify(tuk).slice(0, 200));
});
