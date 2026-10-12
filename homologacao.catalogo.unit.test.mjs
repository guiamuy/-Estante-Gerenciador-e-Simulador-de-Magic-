// Trilha homologacao · achados da prova de partida do catálogo (catalogo.prova.mjs). Cada achado vira teste aqui antes da correção.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, limpaMao, legais, passaAte } from './listas.mjs';

// Texto oficial: Oracle do Forge (forge-gui/res/cardsfolder), consultado em 12/10/2026.
const CARTAS = {
  Daze: { name: 'Daze', type_line: 'Instant', mana_cost: '{1}{U}', cmc: 2, colors: ['U'], keywords: [],
    oracle_text: "You may return an Island you control to its owner's hand rather than pay this spell's mana cost.\nCounter target spell unless its controller pays {1}." },
  Tundra: { name: 'Tundra', type_line: 'Land — Plains Island', mana_cost: '', cmc: 0, colors: [], keywords: [], oracle_text: '({T}: Add {W} or {U}.)' },
  'Snow-Covered Island': { name: 'Snow-Covered Island', type_line: 'Basic Snow Land — Island', mana_cost: '', cmc: 0, colors: [], keywords: [], oracle_text: '({T}: Add {U}.)' },
  'Lightning Bolt': { name: 'Lightning Bolt', type_line: 'Instant', mana_cost: '{R}', cmc: 1, colors: ['R'], keywords: [], oracle_text: 'Lightning Bolt deals 3 damage to any target.' },
  Mountain: { name: 'Mountain', type_line: 'Basic Land — Mountain', mana_cost: '', cmc: 0, colors: [], keywords: [], oracle_text: '({T}: Add {R}.)' },
  Plains: { name: 'Plains', type_line: 'Basic Land — Plains', mana_cost: '', cmc: 0, colors: [], keywords: [], oracle_text: '({T}: Add {W}.)' }
};

/** B conjura Lightning Bolt em A; A tem Daze na mão e `terreno` no campo, sem mana sobrando. */
function mesaDaze(terreno) {
  let s = E.createGame({ format: 'livre', seed: 3, mode: 'full', cards: CARTAS, players: [
    { name: 'A', deck: [{ name: 'Daze', qty: 4 }, { name: terreno, qty: 4 }, { name: 'Plains', qty: 30 }] },
    { name: 'B', deck: [{ name: 'Lightning Bolt', qty: 4 }, { name: 'Mountain', qty: 36 }] }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 1 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
  s = limpaMao(limpaMao(s, 0), 1);
  let daze, terra, bolt, mont;
  [s, daze] = poe(s, 0, 'Daze', 'hand'); [s, terra] = poe(s, 0, terreno); [s, bolt] = poe(s, 1, 'Lightning Bolt', 'hand'); [s, mont] = poe(s, 1, 'Mountain');
  s = act(s, legais(s, 1, a => a.t === 'cast' && a.oid === bolt && (a.targets || []).some(t => t.player === 0))[0]);
  s = act(s, { t: 'pass', p: 1 }); // a prioridade passa para A, com o raio na pilha
  return { s, daze, terra, bolt, mont };
}

for (const terreno of ['Tundra', 'Snow-Covered Island'])
  test(`H-2 · Daze devolvendo ${terreno} (tem o tipo Ilha, 205.3i/305.6): a oferta da mesa é aceita e anula o raio`, () => {
    const { s, daze, terra, bolt } = mesaDaze(terreno);
    const oferta = legais(s, 0, a => a.t === 'cast' && a.oid === daze && a.alt != null && a.pay && a.pay.land === terra);
    assert.equal(oferta.length, 1, 'a mesa oferece Daze pelo custo de devolver o terreno com o tipo Ilha');
    let t = act(s, oferta[0]); // antes: "devolva um Island que você controla" (o pagamento conferia o NOME, a oferta conferia o TIPO)
    assert.equal(t.objects[terra].zone, 'hand', `${terreno} voltou para a mão de A como custo`);
    t = passaAte(t, x => !x.stack.length || !!x.pending);
    while (t.pending && t.pending.kind !== 'priority') { const op = legais(t, t.pending.p).find(a => /decline|recusa|nao|não/i.test(JSON.stringify(a))) || legais(t, t.pending.p).at(-1); t = act(t, op); t = passaAte(t, x => !x.stack.length || !!x.pending); }
    assert.equal(t.players[0].life, 20, 'o raio foi anulado: B não tinha {1} para pagar');
    assert.equal(t.objects[bolt].zone, 'graveyard');
  });

test('H-2 · Daze não aceita devolver terreno sem o tipo Ilha (Plains), nem pela ação montada à mão', () => {
  const { s, daze } = mesaDaze('Tundra');
  const plains = s.zones[0].library.find(o => s.objects[o].name === 'Plains');
  const [t] = poe(s, 0, 'Plains');
  const ofertas = legais(t, 0, a => a.t === 'cast' && a.oid === daze && a.alt != null);
  assert.ok(ofertas.every(a => a.pay.land !== plains), 'Plains não é oferecida');
  const montada = { ...ofertas[0], pay: { land: plains } };
  assert.throws(() => E.apply(t, montada), /Island/);
});
