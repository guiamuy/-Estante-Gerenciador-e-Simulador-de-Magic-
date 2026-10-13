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

// H-4 · a C-2 publicou por engano o atalho `node_modules` (link para a pasta da sessão que a gravou): em qualquer outro clone ele vira
// um laço, o `npm install` não acha a pasta e o `npm run publicar` cai com ELOOP ao chamar o git. Nenhum arquivo do repositório é atalho.
test('H-4 · o repositório não guarda atalho (symlink): node_modules nem nenhum outro', async () => {
  const { execFileSync } = await import('node:child_process');
  let saida;
  try { saida = execFileSync('git', ['ls-files', '-s'], { encoding: 'utf8', maxBuffer: 1 << 26 }); } catch (e) { return; } // sem git (cópia solta do arquivo): nada a conferir
  const atalhos = saida.split('\n').filter(l => l.startsWith('120000 ')).map(l => l.split('\t')[1]);
  assert.deepEqual(atalhos, [], `atalhos versionados: ${atalhos.join(', ')}`);
});

// H-5 · a prova de partida (Pauper, Grixis Fiery Temper × Esper Springleaf Drum, Shark × Shark) achou o Shark quebrando ao decidir o
// ataque: "Cannot read properties of undefined (reading 'name')". Ao pensar no truque depois dos bloqueios, ele olhava o PRIMEIRO alvo
// da ação como se fosse a criatura atacante; com Sazacap's Brew prometendo o presente, o primeiro alvo é o jogador que compra e a
// criatura que ganha +2/+0 vem em segundo. Texto oficial: Oracle do Forge (s/sazacaps_brew.txt), consultado em 12/10/2026.
test('H-5 · o Shark decide o ataque com Sazacap\'s Brew na mão (primeiro alvo é o jogador, a criatura vem depois) sem quebrar', async () => {
  const { loadModules } = await import('./_load.mjs');
  const B = loadModules().bot;
  const cartas = {
    "Sazacap's Brew": { name: "Sazacap's Brew", type_line: 'Instant', mana_cost: '{1}{R}', cmc: 2, colors: ['R'], keywords: ['Gift'],
      oracle_text: "Gift a tapped Fish (You may promise an opponent a gift as you cast this spell. If you do, they create a tapped 1/1 blue Fish creature token before its other effects.)\nAs an additional cost to cast this spell, discard a card.\nTarget player draws two cards. If the gift was promised, target creature you control gets +2/+0 until end of turn." },
    'Grizzly Bears': { name: 'Grizzly Bears', type_line: 'Creature — Bear', mana_cost: '{1}{G}', cmc: 2, colors: ['G'], keywords: [], oracle_text: '', power: '2', toughness: '2' },
    Mountain: CARTAS.Mountain, Plains: CARTAS.Plains
  };
  let s = E.createGame({ format: 'livre', seed: 9, mode: 'full', cards: cartas, players: [
    { name: 'A', deck: [{ name: "Sazacap's Brew", qty: 4 }, { name: 'Grizzly Bears', qty: 8 }, { name: 'Mountain', qty: 28 }] },
    { name: 'B', deck: [{ name: 'Grizzly Bears', qty: 12 }, { name: 'Plains', qty: 28 }] }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  s = passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending && x.turn.number >= 3);
  s = limpaMao(limpaMao(s, 0), 1);
  for (const n of ['Grizzly Bears', 'Mountain', 'Mountain', 'Mountain']) [s] = poe(s, 0, n);
  [s] = poe(s, 1, 'Grizzly Bears');
  [s] = poe(s, 0, "Sazacap's Brew", 'hand'); [s] = poe(s, 0, 'Grizzly Bears', 'hand'); // a segunda carta paga o descarte do custo
  const brew = s.zones[0].hand.find(o => s.objects[o].name === "Sazacap's Brew");
  s = passaAte(s, x => x.pending && x.pending.kind === 'attackers');
  assert.equal(s.pending && s.pending.kind, 'attackers', 'chegou à declaração de atacantes de A');
  const shark = B.criaBot({ nivel: 'shark', orcamentoMs: 400 });
  let j;
  assert.doesNotThrow(() => { j = shark.jogada(s, 0); }, 'o Shark decide o ataque sem quebrar');
  assert.ok(j && j.acao && j.acao.t === 'attack', 'devolve uma declaração de ataque');
  assert.doesNotThrow(() => E.apply(s, j.acao), 'a jogada do Shark é legal');
  // a pista do achado: depois do ataque, a mágica do presente mira o jogador primeiro e a criatura atacante em segundo
  const depois = E.apply(s, { t: 'attack', p: 0, attackers: s.zones[0].battlefield.filter(o => s.objects[o].name === 'Grizzly Bears') }).state;
  const t2 = passaAte(depois, x => x.turn.step !== 'combat_attackers' && !x.pending && x.turn.priority === 0, 20);
  const ofertas = E.legalActions(t2, 0).filter(a => a.t === 'cast' && a.oid === brew && (a.targets || []).length > 1);
  assert.ok(ofertas.some(a => a.targets[0] && a.targets[0].oid == null), 'existe a forma com o jogador como primeiro alvo (o caso que quebrava)');
});
