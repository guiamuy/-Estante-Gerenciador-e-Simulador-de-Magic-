// CR2b.5 · correções achadas pela auditoria independente da fase CR2b (gatilhos e estáticas, 11/10/2026): a escolha aberta por um gatilho
// para a fila e a ordem APNAP se mantém (603.3b); quem põe a permanente no campo controla os gatilhos de entrada dela (603.3a); gatilhos que
// lembram cartas diferentes não são iguais e o controlador escolhe a ordem (603.3b); a face de trás dispara o "morre" dela (603.10a).
// Cada teste falha no motor v106.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { E, J, act, poe, legais, passaAte, comMana, tudo, CARTAS } from './cmd.mjs';

const c = (name, type_line, mana_cost, extra = {}) => ({ name, type_line, mana_cost, cmc: 0, keywords: [], oracle_text: '', colors: [...new Set((mana_cost.match(/[WUBRG]/g) || []))], ...extra });
function mesaX(a = [], b = [], { cards = {}, scripts = {} } = {}) {
  const baralho = ns => [...new Set(ns)].map(name => ({ name, qty: 12, zone: 'main' }));
  let s = E.createGame({ format: 'livre', seed: 1, mode: 'full', cards: { ...CARTAS, ...cards }, scripts, first: 0, players: [{ name: 'A', deck: baralho([...a, 'Plains', 'Swamp']) }, { name: 'B', deck: baralho([...b, 'Island', 'Mountain']) }] });
  for (let p = 0; p < 2; p++) s = act(s, { t: 'keep', p, bottom: [] });
  return passaAte(s, x => x.turn.active === 0 && x.turn.step === 'main1' && !x.stack.length && !x.pending);
}
const pilha = s => Array.from(s.stack, o => s.objects[o].name + '(' + s.objects[o].controller + ')');
const EX = { action: 'etb', target: 'none', expect: { attached: false } };
const sc = (name, abilities, extra = {}) => ({ name, abilities, example: EX, ...extra });

test('CR 603.3 · APNAP com escolha aberta: o gatilho do jogador ativo que pede alvo fica embaixo do gatilho do outro (antes ficava em cima)', () => {
  const cards = { Pingador: c('Pingador', 'Enchantment', '{R}'), Curador: c('Curador', 'Enchantment', '{W}'), Leitor: c('Leitor', 'Enchantment', '{U}'), Ursa: c('Ursa', 'Creature — Bear', '{G}', { power: '2', toughness: '2' }) };
  const scripts = { Pingador: sc('Pingador', [{ kind: 'triggered', when: 'each-upkeep', effects: [{ do: 'damage', amount: 1, target: 'any' }] }]),
    Curador: sc('Curador', [{ kind: 'triggered', when: 'each-upkeep', effects: [{ do: 'gain', amount: 1 }] }]),
    Leitor: sc('Leitor', [{ kind: 'triggered', when: 'each-upkeep', effects: [{ do: 'draw', amount: 1 }] }]) };
  for (const comLeitor of [false, true]) {
    let s = mesaX(['Pingador', 'Ursa'], ['Curador', 'Leitor', 'Ursa'], { cards, scripts });
    [s] = poe(s, 0, 'Pingador'); [s] = poe(s, 1, 'Curador'); if (comLeitor) [s] = poe(s, 1, 'Leitor'); [s] = poe(s, 0, 'Ursa'); [s] = poe(s, 1, 'Ursa');
    for (const vez of [1, 0]) { // primeiro o turno de B (o de A pede alvo, mas B é o ativo), depois o de A
      for (let i = 0; i < 10; i++) { s = passaAte(s, x => !!x.pending); if (s.pending.kind === 'pick_target') break; s = act(s, legais(s, s.pending.p)[0]); } // a ordem dos gatilhos de B, se B é o ativo
      assert.equal(s.turn.active, vez);
      s = act(s, legais(s, 0)[0]);
      if (s.pending && s.pending.kind === 'triggers') s = act(s, legais(s, 1)[0]);
      const base = vez === 0 ? 'Pingador(0)' : 'Curador(1)';
      assert.equal(pilha(s)[0], base, `o do jogador ativo na base${comLeitor ? ' (com dois gatilhos do outro, antes o de A sumia)' : ''}: ${pilha(s).join(', ')}`);
      assert.equal(s.stack.length, comLeitor ? 3 : 2);
      for (let i = 0; i < 20 && s.stack.length; i++) { if (s.pending) { const a = legais(s, s.pending.p).filter(x => x.t !== 'concede')[0]; assert.ok(a, 'decisão sem ação: ' + s.pending.kind); s = act(s, a); } else s = act(s, { t: 'pass', p: s.turn.priority }); }
    }
  }
});

test('CR 603.3 · Animate Dead na criatura do oponente: o "ao entrar" dela é de quem a pôs no campo, e o seu "outra criatura sua entra" dispara', () => {
  const cards = { Mensageiro: c('Mensageiro', 'Creature — Human', '{U}', { power: '1', toughness: '1' }), Vigia: c('Vigia', 'Enchantment', '{W}') };
  const scripts = { Mensageiro: sc('Mensageiro', [{ kind: 'triggered', when: 'etb', effects: [{ do: 'draw', amount: 1 }] }]),
    Vigia: sc('Vigia', [{ kind: 'triggered', when: 'other-etb', filter: { types: ['creature'] }, effects: [{ do: 'gain', amount: 3 }] }]) };
  let s = mesaX(['Animate Dead', 'Vigia'], ['Mensageiro'], { cards, scripts }), ad, m;
  [s, ad] = poe(s, 0, 'Animate Dead', 'hand'); [s, m] = poe(s, 1, 'Mensageiro', 'graveyard'); [s] = poe(s, 0, 'Vigia');
  s = comMana(s, 'BB');
  const c0 = s.zones[0].hand.length - 1, c1 = s.zones[1].hand.length, v0 = s.players[0].life;
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === ad && JSON.stringify(a.targets || []).includes(m))[0]);
  for (let i = 0; i < 30 && (s.stack.length || s.pending); i++) s = s.pending ? act(s, legais(s, s.pending.p)[0]) : act(s, { t: 'pass', p: s.turn.priority });
  assert.equal(s.objects[m].controller, 0);
  assert.equal(s.zones[0].hand.length - c0, 1, 'A compra (antes quem comprava era B)'); assert.equal(s.zones[1].hand.length - c1, 0);
  assert.equal(s.players[0].life - v0, 3, 'o Vigia de A vê a criatura entrar sob o controle de A');
});

test('CR 603.3 · gatilhos que lembram cartas diferentes (Angelic Renewal com duas criaturas morrendo juntas): o controlador escolhe a ordem', () => {
  const cards = { Ursa: c('Ursa', 'Creature — Bear', '{G}', { power: '2', toughness: '2' }), Lobo: c('Lobo', 'Creature — Wolf', '{G}', { power: '3', toughness: '3' }) };
  let s = mesaX(['Angelic Renewal', 'Ursa', 'Lobo'], [], { cards }), u, l;
  [s] = poe(s, 0, 'Angelic Renewal'); [s, u] = poe(s, 0, 'Ursa'); [s, l] = poe(s, 0, 'Lobo');
  s = J(s); s.objects[u].damage = 5; s.objects[l].damage = 5;
  s = E.apply(s, { t: 'pass', p: 0 }).state;
  assert.equal(s.pending && s.pending.kind, 'triggers', 'antes o motor punha os dois na pilha numa ordem escolhida por ele');
});

test('CR 603.10 · a permanente transformada que morre dispara o "morre" da face de trás, não o da frente', () => {
  const cards = { Frente: c('Frente', 'Creature — Human', '{G}', { power: '2', toughness: '2' }) };
  const scripts = { Frente: sc('Frente', [{ kind: 'triggered', when: 'dies', effects: [{ do: 'gain', amount: 5 }] }, { kind: 'activated', cost: { mana: '{0}' }, effects: [{ do: 'transform' }] }],
    { back: { name: 'Verso', types: ['creature'], subtypes: ['Werewolf'], colors: ['G'], power: 2, toughness: 2, abilities: [{ kind: 'triggered', when: 'dies', effects: [{ do: 'draw', amount: 1 }] }] } }) };
  let s = mesaX(['Frente', 'Lightning Bolt'], [], { cards, scripts }), f, b;
  [s, f] = poe(s, 0, 'Frente'); [s, b] = poe(s, 0, 'Lightning Bolt', 'hand');
  s = tudo(act(s, legais(s, 0, a => a.t === 'activate' && a.oid === f)[0]));
  assert.equal(s.objects[f].name, 'Verso');
  s = comMana(s, 'R'); const v0 = s.players[0].life, m0 = s.zones[0].hand.length;
  s = act(s, legais(s, 0, a => a.t === 'cast' && a.oid === b && a.targets && a.targets[0].oid === f)[0]);
  s = tudo(act(act(s, { t: 'pass', p: 0 }), { t: 'pass', p: 1 }));
  assert.equal(s.players[0].life - v0, 0, 'antes ganhava 5 (a frente)');
  assert.equal(s.zones[0].hand.length - (m0 - 1), 1, 'compra 1 (o verso)');
  assert.equal(s.objects[f].name, 'Frente', 'no cemitério a carta volta à frente');
});
